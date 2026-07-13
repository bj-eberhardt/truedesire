import { query, transaction } from "../db/pool.js";
import type { ActivePairFailure } from "../domain/results.js";
import type { AnswerRecord, EncryptedBlob } from "../storage/db.js";
import { getQuestionAccess } from "./accessRepository.js";
import { mapAnswer, mapPair, type AnswerRow, type PairRow } from "./rowMapping.js";

type AnswerWriteMode = "create" | "upsert";

type AnswerWriteResult =
  | { kind: "ok"; answer?: AnswerRecord; updated?: boolean }
  | { kind: ActivePairFailure }
  | { kind: "already_answered" }
  | { kind: "partner_answered" }
  | { kind: "weekly_limit" };

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
        "update answers set blob = $3, updated_at = $4 where question_id = $1 and user_id = $2",
        [opts.questionId, opts.userId, opts.blob, opts.now]
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
      `insert into answers(id, question_id, pair_id, user_id, created_at, blob)
       values ($1,$2,$3,$4,$5,$6)
       returning *`,
      [opts.answerId, opts.questionId, data.pair.id, opts.userId, opts.now, opts.blob]
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
    "select * from answers where question_id = $1 order by created_at",
    [questionId]
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
    "select * from answers where pair_id = $1 order by created_at",
    [pairId]
  );
  return result.rows.map(mapAnswer);
}
