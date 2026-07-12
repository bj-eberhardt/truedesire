import { query, transaction } from "../db/pool.js";
import type { QuestionRecord } from "../storage/db.js";
import { mapPair, mapQuestion, type PairRow, type QuestionRow } from "./rowMapping.js";

export async function getQuestionById(questionId: string): Promise<QuestionRecord | undefined> {
  const result = await query<QuestionRow>("select * from questions where id = $1", [questionId]);
  return result.rows[0] ? mapQuestion(result.rows[0]) : undefined;
}

export async function listQuestionsByPair(pairId: string): Promise<QuestionRecord[]> {
  const result = await query<QuestionRow>("select * from questions where pair_id = $1 order by created_at", [
    pairId
  ]);
  return result.rows.map(mapQuestion);
}

export async function createQuestionIfAllowed(
  question: QuestionRecord,
  userId: string
): Promise<
  | { kind: "ok"; question: QuestionRecord }
  | { kind: "forbidden" }
  | { kind: "pair_not_active" }
  | { kind: "partner_deleted" }
> {
  return transaction(async (client) => {
    const access = await client.query<PairRow & { partner_deleted_at: string | number | null }>(
      `select p.*, partner.deleted_at as partner_deleted_at
       from pairs p
       left join users partner on partner.id = case when p.user_a = $2 then p.user_b else p.user_a end
       where p.id = $1`,
      [question.pairId, userId]
    );
    if (!access.rows[0]) return { kind: "forbidden" };
    const pair = mapPair(access.rows[0]);
    if (![pair.userA, pair.userB].includes(userId)) return { kind: "forbidden" };
    if (pair.status !== "active") return { kind: "pair_not_active" };
    if (access.rows[0].partner_deleted_at !== null) return { kind: "partner_deleted" };

    const result = await client.query<QuestionRow>(
      `insert into questions(id, pair_id, created_by, created_at, blob)
       values ($1,$2,$3,$4,$5)
       returning *`,
      [question.id, question.pairId, question.createdBy, question.createdAt, question.blob]
    );
    return { kind: "ok", question: mapQuestion(result.rows[0]) };
  });
}

export async function deleteQuestionIfAllowed(
  questionId: string,
  userId: string
): Promise<"missing" | "forbidden" | "partner_answered" | "deleted"> {
  return transaction(async (client) => {
    const result = await client.query<QuestionRow>("select * from questions where id = $1", [
      questionId
    ]);
    const question = result.rows[0] ? mapQuestion(result.rows[0]) : null;
    if (!question) return "missing";

    const pairResult = await client.query<PairRow>("select * from pairs where id = $1", [
      question.pairId
    ]);
    const pair = pairResult.rows[0] ? mapPair(pairResult.rows[0]) : null;
    if (!pair || ![pair.userA, pair.userB].includes(userId) || question.createdBy !== userId) {
      return "forbidden";
    }

    const partnerAnswer = await client.query(
      "select 1 from answers where question_id = $1 and user_id <> $2 limit 1",
      [questionId, userId]
    );
    if (partnerAnswer.rows[0]) return "partner_answered";

    await client.query("delete from questions where id = $1", [questionId]);
    return "deleted";
  });
}

export async function listQuestionsIfAllowed(
  pairId: string,
  userId: string
): Promise<"forbidden" | "partner_deleted" | QuestionRecord[]> {
  const access = await query<PairRow & { partner_deleted_at: string | number | null }>(
    `select p.*, partner.deleted_at as partner_deleted_at
     from pairs p
     left join users partner on partner.id = case when p.user_a = $2 then p.user_b else p.user_a end
     where p.id = $1`,
    [pairId, userId]
  );
  if (!access.rows[0]) return "forbidden";
  const pair = mapPair(access.rows[0]);
  if (![pair.userA, pair.userB].includes(userId)) return "forbidden";
  if (access.rows[0].partner_deleted_at !== null) return "partner_deleted";
  return listQuestionsByPair(pairId);
}
