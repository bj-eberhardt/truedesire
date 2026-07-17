import { query, transaction } from "../db/pool.js";
import type { ActivePairFailure } from "../domain/results.js";
import type {
  AnswerRecord,
  EncryptedBlob,
  MatchPolicy,
  MatchTokenSet,
  PairRecord
} from "../storage/db.js";
import { getPairAccess, getQuestionAccess } from "./accessRepository.js";
import { mapAnswer, mapPair, type AnswerRow, type PairRow } from "./rowMapping.js";

type AnswerWriteMode = "create" | "upsert";

type AnswerWriteResult =
  | { kind: "ok"; answer?: AnswerRecord; updated?: boolean }
  | { kind: ActivePairFailure }
  | { kind: "already_answered" }
  | { kind: "partner_answered" }
  | { kind: "weekly_limit" };

const DEFAULT_MATCH_POLICY: MatchPolicy = "allowMutualMaybe";

function filterTokensByPolicy(tokens: MatchTokenSet, policy: MatchPolicy): MatchTokenSet {
  if (policy === "perfectOnly") {
    return { perfect: tokens.perfect, mixedMaybe: [], mutualMaybe: [] };
  }
  if (policy === "allowMixedMaybe") {
    return { perfect: tokens.perfect, mixedMaybe: tokens.mixedMaybe, mutualMaybe: [] };
  }
  return tokens;
}

function jsonMatchTokens(tokens: MatchTokenSet): string {
  return JSON.stringify(tokens);
}

async function upsertMatchPolicyInClient(
  client: { query: typeof query },
  pairId: string,
  userId: string,
  policy: MatchPolicy,
  now: number
) {
  await client.query(
    `insert into pair_match_policies(pair_id, user_id, policy, updated_at)
     values ($1, $2, $3, $4)
     on conflict (pair_id, user_id)
     do update set policy = excluded.policy, updated_at = excluded.updated_at`,
    [pairId, userId, policy, now]
  );
}

async function pruneAnswerTokensForPolicyInClient(
  client: { query: typeof query },
  pairId: string,
  userId: string,
  policy: MatchPolicy
) {
  await client.query(
    `update answers
     set match_tokens = jsonb_build_object(
       'perfect', coalesce(match_tokens->'perfect', '[]'::jsonb),
       'mixedMaybe', case when $3 in ('allowMixedMaybe', 'allowMutualMaybe')
         then coalesce(match_tokens->'mixedMaybe', '[]'::jsonb)
         else '[]'::jsonb
       end,
       'mutualMaybe', case when $3 = 'allowMutualMaybe'
         then coalesce(match_tokens->'mutualMaybe', '[]'::jsonb)
         else '[]'::jsonb
       end
     )
     where pair_id = $1 and user_id = $2`,
    [pairId, userId, policy]
  );
}

export async function countWeeklyAnswers(
  pairId: string,
  userId: string,
  weekStart: number,
  weekEnd: number
): Promise<number> {
  const result = await query<{ count: string }>(
    `select count(*)::text
     from answers a
     left join questions q on q.id = a.question_id
     where a.pair_id = $1
       and a.user_id = $2
       and a.created_at >= $3
       and a.created_at < $4
       and (q.created_by is null or q.created_by <> $2)`,
    [pairId, userId, weekStart, weekEnd]
  );
  return Number(result.rows[0]?.count ?? 0);
}

export async function createAnswerIfAllowed(
  questionId: string,
  userId: string,
  blob: EncryptedBlob,
  matchTokens: MatchTokenSet,
  policyVersion: number,
  maybeCountsAsMatch: boolean | undefined,
  answerId: string,
  now: number,
  weekStart: number,
  weekEnd: number
): Promise<
  | { kind: "ok"; answer: AnswerRecord }
  | { kind: ActivePairFailure }
  | { kind: "already_answered" }
  | { kind: "weekly_limit" }
> {
  const result = await writeAnswer({
    mode: "create",
    questionId,
    userId,
    blob,
    matchTokens,
    policyVersion,
    maybeCountsAsMatch,
    answerId,
    now,
    weekStart,
    weekEnd
  });
  if (result.kind === "ok" && result.answer) return { kind: "ok", answer: result.answer };
  return result as
    { kind: ActivePairFailure } | { kind: "already_answered" } | { kind: "weekly_limit" };
}

export async function upsertAnswerIfAllowed(
  questionId: string,
  userId: string,
  blob: EncryptedBlob,
  matchTokens: MatchTokenSet,
  policyVersion: number,
  maybeCountsAsMatch: boolean | undefined,
  answerId: string,
  now: number,
  weekStart: number,
  weekEnd: number
): Promise<
  | { kind: "ok"; updated: boolean }
  | { kind: ActivePairFailure }
  | { kind: "partner_answered" }
  | { kind: "weekly_limit" }
> {
  const result = await writeAnswer({
    mode: "upsert",
    questionId,
    userId,
    blob,
    matchTokens,
    policyVersion,
    maybeCountsAsMatch,
    answerId,
    now,
    weekStart,
    weekEnd
  });
  if (result.kind === "ok") return { kind: "ok", updated: !!result.updated };
  return result as
    { kind: ActivePairFailure } | { kind: "partner_answered" } | { kind: "weekly_limit" };
}

async function writeAnswer(opts: {
  mode: AnswerWriteMode;
  questionId: string;
  userId: string;
  blob: EncryptedBlob;
  matchTokens: MatchTokenSet;
  policyVersion: number;
  maybeCountsAsMatch: boolean | undefined;
  answerId: string;
  now: number;
  weekStart: number;
  weekEnd: number;
}): Promise<AnswerWriteResult> {
  return transaction(async (client) => {
    const data = await getQuestionAccess(client.query.bind(client), opts.questionId, opts.userId);
    if (data.kind === "missing") return { kind: "missing" };
    if (data.kind === "forbidden") return { kind: "forbidden" };
    if (data.partnerDeleted) return { kind: "partner_deleted" };
    if (data.pair.status !== "active") return { kind: "pair_not_active" };
    const policy = await getMatchPolicyInClient(client, data.pair.id, opts.userId);
    const allowedMatchTokens = filterTokensByPolicy(opts.matchTokens, policy);

    const existing = await client.query<AnswerRow>(
      "select * from answers where question_id = $1 and user_id = $2",
      [opts.questionId, opts.userId]
    );
    if (existing.rows[0]) {
      if (opts.mode === "create") return { kind: "already_answered" };
      const partnerAnswer = await client.query(
        "select 1 from answers where question_id = $1 and user_id <> $2 limit 1",
        [opts.questionId, opts.userId]
      );
      if (partnerAnswer.rows[0]) return { kind: "partner_answered" };
      await client.query(
        `update answers
         set blob = $3,
             updated_at = $4,
             match_tokens = $5::jsonb,
             policy_version = $6,
             maybe_counts_as_match = $7
         where question_id = $1 and user_id = $2`,
        [
          opts.questionId,
          opts.userId,
          opts.blob,
          opts.now,
          jsonMatchTokens(allowedMatchTokens),
          opts.policyVersion,
          opts.maybeCountsAsMatch ?? null
        ]
      );
      return { kind: "ok", updated: true };
    }

    const weeklyCount = await countWeeklyAnswersInClient(
      client,
      data.pair.id,
      opts.userId,
      opts.weekStart,
      opts.weekEnd
    );
    if (
      data.question.createdBy !== opts.userId &&
      data.pair.weeklyLimit > 0 &&
      weeklyCount >= data.pair.weeklyLimit
    ) {
      return { kind: "weekly_limit" };
    }
    const inserted = await client.query<AnswerRow>(
      `insert into answers(
         id, question_id, pair_id, user_id, created_at, blob,
         match_tokens, policy_version, maybe_counts_as_match
       )
       values ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9)
       returning *`,
      [
        opts.answerId,
        opts.questionId,
        data.pair.id,
        opts.userId,
        opts.now,
        opts.blob,
        jsonMatchTokens(allowedMatchTokens),
        opts.policyVersion,
        opts.maybeCountsAsMatch ?? null
      ]
    );
    return opts.mode === "create"
      ? { kind: "ok", answer: mapAnswer(inserted.rows[0]) }
      : { kind: "ok", updated: false };
  });
}

async function countWeeklyAnswersInClient(
  client: { query: typeof query },
  pairId: string,
  userId: string,
  weekStart: number,
  weekEnd: number
): Promise<number> {
  const result = await client.query<{ count: string }>(
    `select count(*)::text
     from answers a
     left join questions q on q.id = a.question_id
     where a.pair_id = $1
       and a.user_id = $2
       and a.created_at >= $3
       and a.created_at < $4
       and (q.created_by is null or q.created_by <> $2)`,
    [pairId, userId, weekStart, weekEnd]
  );
  return Number(result.rows[0]?.count ?? 0);
}

export async function listAnswersForQuestionIfAllowed(
  questionId: string,
  userId: string
): Promise<"missing" | "forbidden" | AnswerRecord[]> {
  const data = await getQuestionAccess(query, questionId, userId);
  if (data.kind === "missing") return "missing";
  if (data.kind !== "ok") return "forbidden";
  const result = await query<AnswerRow>(
    "select * from answers where question_id = $1 and user_id = $2 order by created_at",
    [questionId, userId]
  );
  return result.rows.map(mapAnswer);
}

export async function listAnswersForPairIfAllowed(
  pairId: string,
  userId: string
): Promise<"missing" | "forbidden" | AnswerRecord[]> {
  const pairResult = await query<PairRow>("select * from pairs where id = $1", [pairId]);
  const pair = pairResult.rows[0] ? mapPair(pairResult.rows[0]) : null;
  if (!pair) return "missing";
  if (![pair.userA, pair.userB].includes(userId)) return "forbidden";
  const result = await query<AnswerRow>(
    "select * from answers where pair_id = $1 and user_id = $2 order by created_at",
    [pairId, userId]
  );
  return result.rows.map(mapAnswer);
}

export async function listMatchesForPairIfAllowed(
  pairId: string,
  userId: string
): Promise<
  "missing" | "forbidden" | Array<{ questionId: string; createdAt: number; grade: "perfect" | "maybe" | "mutualMaybe" }>
> {
  const pairResult = await query<PairRow>("select * from pairs where id = $1", [pairId]);
  const pair = pairResult.rows[0] ? mapPair(pairResult.rows[0]) : null;
  if (!pair) return "missing";
  if (![pair.userA, pair.userB].includes(userId)) return "forbidden";

  const result = await query<{
    question_id: string;
    created_at: string | number;
    perfect_count: string;
    mixed_maybe_count: string;
    mutual_maybe_count: string;
  }>(
    `select q.id as question_id,
            q.created_at,
            count(distinct partner_perfect.token)::text as perfect_count,
            count(distinct partner_mixed.token)::text as mixed_maybe_count,
            count(distinct partner_mutual.token)::text as mutual_maybe_count
     from questions q
     join answers a on a.question_id = q.id
     join answers b on b.question_id = q.id and b.user_id <> a.user_id
     left join lateral jsonb_array_elements_text(coalesce(a.match_tokens->'perfect', '[]'::jsonb)) own_perfect(token) on true
     left join lateral jsonb_array_elements_text(coalesce(b.match_tokens->'perfect', '[]'::jsonb)) partner_perfect(token)
       on partner_perfect.token = own_perfect.token
     left join lateral jsonb_array_elements_text(coalesce(a.match_tokens->'mixedMaybe', '[]'::jsonb)) own_mixed(token) on true
     left join lateral jsonb_array_elements_text(coalesce(b.match_tokens->'mixedMaybe', '[]'::jsonb)) partner_mixed(token)
       on partner_mixed.token = own_mixed.token
     left join lateral jsonb_array_elements_text(coalesce(a.match_tokens->'mutualMaybe', '[]'::jsonb)) own_mutual(token) on true
     left join lateral jsonb_array_elements_text(coalesce(b.match_tokens->'mutualMaybe', '[]'::jsonb)) partner_mutual(token)
       on partner_mutual.token = own_mutual.token
     where q.pair_id = $1
       and a.user_id = $2
       and (
         partner_perfect.token is not null
         or partner_mixed.token is not null
         or partner_mutual.token is not null
       )
     group by q.id, q.created_at
     order by q.created_at desc`,
    [pairId, userId]
  );
  return result.rows.map((row) => ({
    questionId: row.question_id,
    createdAt: Number(row.created_at),
    grade:
      Number(row.perfect_count) > 0
        ? "perfect"
        : Number(row.mixed_maybe_count) > 0
          ? "maybe"
          : "mutualMaybe"
  }));
}

async function getMatchPolicyInClient(
  client: { query: typeof query },
  pairId: string,
  userId: string
): Promise<MatchPolicy> {
  const result = await client.query<{ policy: MatchPolicy }>(
    "select policy from pair_match_policies where pair_id = $1 and user_id = $2",
    [pairId, userId]
  );
  return result.rows[0]?.policy ?? DEFAULT_MATCH_POLICY;
}

export async function getMatchPolicyIfAllowed(
  pairId: string,
  userId: string
): Promise<"missing" | "forbidden" | MatchPolicy> {
  const pairResult = await query<PairRow>("select * from pairs where id = $1", [pairId]);
  const pair = pairResult.rows[0] ? mapPair(pairResult.rows[0]) : null;
  if (!pair) return "missing";
  if (![pair.userA, pair.userB].includes(userId)) return "forbidden";
  return getMatchPolicyInClient({ query }, pairId, userId);
}

export async function setMatchPolicyIfAllowed(
  pairId: string,
  userId: string,
  policy: MatchPolicy,
  now: number
): Promise<"missing" | "forbidden" | { policy: MatchPolicy }> {
  return transaction(async (client) => {
    const pairResult = await client.query<PairRow>("select * from pairs where id = $1", [pairId]);
    const pair = pairResult.rows[0] ? mapPair(pairResult.rows[0]) : null;
    if (!pair) return "missing";
    if (![pair.userA, pair.userB].includes(userId)) return "forbidden";

    await upsertMatchPolicyInClient(client, pairId, userId, policy, now);
    await pruneAnswerTokensForPolicyInClient(client, pairId, userId, policy);

    return { policy };
  });
}

type MatchPolicyPending = NonNullable<PairRecord["matchPolicyPending"]>;
type MatchPolicyProposalResult =
  | "missing"
  | "forbidden"
  | "partner_deleted"
  | "no_pending"
  | "own_response"
  | PairRecord
  | { policy: MatchPolicy };

export async function setMatchPolicyProposal(
  pairId: string,
  userId: string,
  pending: MatchPolicyPending
): Promise<PairRecord | "missing" | "forbidden" | "partner_deleted"> {
  return transaction(async (client) => {
    const access = await getPairAccess(client, pairId, userId, { forUpdate: true });
    if (access.kind === "missing") return "missing";
    if (access.kind === "forbidden") return "forbidden";
    if (access.partnerDeleted) return "partner_deleted";
    const result = await client.query<PairRow>(
      `update pairs set match_policy_pending = $2, updated_at = $3 where id = $1 returning *`,
      [pairId, pending, Date.now()]
    );
    return mapPair(result.rows[0]);
  });
}

export async function respondMatchPolicyProposal(
  pairId: string,
  userId: string,
  proposalId: string,
  action: "accept" | "reject" | "cancel"
): Promise<MatchPolicyProposalResult> {
  return transaction(async (client) => {
    const access = await getPairAccess(client, pairId, userId, { forUpdate: true });
    if (access.kind === "missing") return "missing";
    if (access.kind === "forbidden") return "forbidden";
    if (access.partnerDeleted) return "partner_deleted";
    const pending = access.pair.matchPolicyPending;
    if (!pending || pending.id !== proposalId) return "no_pending";
    const proposedByMe = pending.proposedBy === userId;
    if ((action === "accept" || action === "reject") && proposedByMe) return "own_response";
    if (action === "cancel" && !proposedByMe) return "forbidden";

    if (action === "accept") {
      const now = Date.now();
      await upsertMatchPolicyInClient(client, pairId, access.pair.userA, pending.policy, now);
      await pruneAnswerTokensForPolicyInClient(client, pairId, access.pair.userA, pending.policy);
      if (access.pair.userB) {
        await upsertMatchPolicyInClient(client, pairId, access.pair.userB, pending.policy, now);
        await pruneAnswerTokensForPolicyInClient(client, pairId, access.pair.userB, pending.policy);
      }
    }

    const result = await client.query<PairRow>(
      `update pairs
       set match_policy_pending = null, updated_at = $2
       where id = $1 returning *`,
      [pairId, Date.now()]
    );
    return action === "accept" ? { policy: pending.policy } : mapPair(result.rows[0]);
  });
}

export async function listAnswerStatusesForPairIfAllowed(
  pairId: string,
  userId: string
): Promise<
  | "missing"
  | "forbidden"
  | Array<{ questionId: string; total: number; mine: boolean; mineAnswerId?: string }>
> {
  const pairResult = await query<PairRow>("select * from pairs where id = $1", [pairId]);
  const pair = pairResult.rows[0] ? mapPair(pairResult.rows[0]) : null;
  if (!pair) return "missing";
  if (![pair.userA, pair.userB].includes(userId)) return "forbidden";

  const result = await query<{
    question_id: string;
    total: string;
    mine_answer_id: string | null;
  }>(
    `select q.id as question_id,
            count(a.id)::text as total,
            max(a.id) filter (where a.user_id = $2) as mine_answer_id
     from questions q
     left join answers a on a.question_id = q.id
     where q.pair_id = $1
     group by q.id, q.created_at
     order by q.created_at desc`,
    [pairId, userId]
  );
  return result.rows.map((row) => ({
    questionId: row.question_id,
    total: Number(row.total),
    mine: row.mine_answer_id !== null,
    mineAnswerId: row.mine_answer_id ?? undefined
  }));
}
