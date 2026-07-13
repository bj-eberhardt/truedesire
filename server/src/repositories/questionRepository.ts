import { query, transaction } from "../db/pool.js";
import type { ActivePairFailure, QuestionDeleteResult } from "../domain/results.js";
import type { QuestionRecord } from "../storage/db.js";
import { getPairAccess } from "./accessRepository.js";
import { mapPair, mapQuestion, type PairRow, type QuestionRow } from "./rowMapping.js";

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
  | { kind: ActivePairFailure }
> {
  return transaction(async (client) => {
    const access = await getPairAccess(client, question.pairId, userId);
    if (access.kind === "missing") return { kind: "forbidden" };
    if (access.kind === "forbidden") return { kind: "forbidden" };
    if (access.pair.status !== "active") return { kind: "pair_not_active" };
    if (access.partnerDeleted) return { kind: "partner_deleted" };

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
): Promise<QuestionDeleteResult> {
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
  const access = await getPairAccess(null, pairId, userId);
  if (access.kind !== "ok") return "forbidden";
  if (access.partnerDeleted) return "partner_deleted";
  return listQuestionsByPair(pairId);
}
