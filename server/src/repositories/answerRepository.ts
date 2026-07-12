import { query, transaction } from "../db/pool.js";
import type { AnswerRecord, EncryptedBlob, PairRecord, QuestionRecord } from "../storage/db.js";
import { mapAnswer, mapPair, mapQuestion, type AnswerRow, type PairRow } from "./rowMapping.js";

async function getQuestionAndPair(
  questionId: string,
  userId: string,
  clientQuery: typeof query
): Promise<
  | { kind: "missing" }
  | { kind: "forbidden" }
  | { kind: "partner_deleted" }
  | { kind: "ok"; question: QuestionRecord; pair: PairRecord }
> {
  const result = await clientQuery<
    PairRow & {
      q_id: string;
      pair_id: string;
      created_by: string;
      q_created_at: string | number;
      q_blob: EncryptedBlob;
      partner_deleted_at: string | number | null;
    }
  >(
    `select
       q.id as q_id, q.pair_id, q.created_by, q.created_at as q_created_at, q.blob as q_blob,
       p.*,
       partner.deleted_at as partner_deleted_at
     from questions q
     join pairs p on p.id = q.pair_id
     left join users partner on partner.id = case when p.user_a = $2 then p.user_b else p.user_a end
     where q.id = $1`,
    [questionId, userId]
  );
  const row = result.rows[0];
  if (!row) return { kind: "missing" };
  const pair = mapPair(row);
  if (![pair.userA, pair.userB].includes(userId)) return { kind: "forbidden" };
  if (row.partner_deleted_at !== null) return { kind: "partner_deleted" };
  return {
    kind: "ok",
    pair,
    question: mapQuestion({
      id: row.q_id,
      pair_id: row.pair_id,
      created_by: row.created_by,
      created_at: row.q_created_at,
      blob: row.q_blob
    })
  };
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
  answerId: string,
  now: number,
  weekStart: number,
  weekEnd: number
): Promise<
  | { kind: "ok"; answer: AnswerRecord }
  | { kind: "missing" }
  | { kind: "forbidden" }
  | { kind: "pair_not_active" }
  | { kind: "partner_deleted" }
  | { kind: "already_answered" }
  | { kind: "weekly_limit" }
> {
  return transaction(async (client) => {
    const data = await getQuestionAndPair(questionId, userId, client.query.bind(client));
    if (data.kind !== "ok") return data;
    if (data.pair.status !== "active") return { kind: "pair_not_active" };
    const existing = await client.query(
      "select 1 from answers where question_id = $1 and user_id = $2 limit 1",
      [questionId, userId]
    );
    if (existing.rows[0]) return { kind: "already_answered" };
    const weeklyCount = await countWeeklyAnswersInClient(
      client,
      data.pair.id,
      userId,
      weekStart,
      weekEnd
    );
    if (
      data.question.createdBy !== userId &&
      data.pair.weeklyLimit > 0 &&
      weeklyCount >= data.pair.weeklyLimit
    ) {
      return { kind: "weekly_limit" };
    }
    const result = await client.query<AnswerRow>(
      `insert into answers(id, question_id, pair_id, user_id, created_at, blob)
       values ($1,$2,$3,$4,$5,$6)
       returning *`,
      [answerId, questionId, data.pair.id, userId, now, blob]
    );
    return { kind: "ok", answer: mapAnswer(result.rows[0]) };
  });
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
  | { kind: "missing" }
  | { kind: "forbidden" }
  | { kind: "pair_not_active" }
  | { kind: "partner_deleted" }
  | { kind: "partner_answered" }
  | { kind: "weekly_limit" }
> {
  return transaction(async (client) => {
    const data = await getQuestionAndPair(questionId, userId, client.query.bind(client));
    if (data.kind !== "ok") return data;
    if (data.pair.status !== "active") return { kind: "pair_not_active" };
    const existing = await client.query<AnswerRow>(
      "select * from answers where question_id = $1 and user_id = $2",
      [questionId, userId]
    );
    if (existing.rows[0]) {
      const partnerAnswer = await client.query(
        "select 1 from answers where question_id = $1 and user_id <> $2 limit 1",
        [questionId, userId]
      );
      if (partnerAnswer.rows[0]) return { kind: "partner_answered" };
      await client.query(
        "update answers set blob = $3, updated_at = $4 where question_id = $1 and user_id = $2",
        [questionId, userId, blob, now]
      );
      return { kind: "ok", updated: true };
    }
    const weeklyCount = await countWeeklyAnswersInClient(
      client,
      data.pair.id,
      userId,
      weekStart,
      weekEnd
    );
    if (
      data.question.createdBy !== userId &&
      data.pair.weeklyLimit > 0 &&
      weeklyCount >= data.pair.weeklyLimit
    ) {
      return { kind: "weekly_limit" };
    }
    await client.query(
      `insert into answers(id, question_id, pair_id, user_id, created_at, blob)
       values ($1,$2,$3,$4,$5,$6)`,
      [answerId, questionId, data.pair.id, userId, now, blob]
    );
    return { kind: "ok", updated: false };
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
  const data = await getQuestionAndPair(questionId, userId, query);
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
