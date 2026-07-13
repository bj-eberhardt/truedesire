import { transaction } from "../db/pool.js";
import type {
  AccessFailure,
  PairJoinResult,
  PairRemoveResult,
  WeeklyLimitResult
} from "../domain/results.js";
import type { PairRecord, QuestionRecord } from "../storage/db.js";
import { getPairAccess } from "./accessRepository.js";
import { insertPair } from "./pairRepository.js";
import { mapPair, type PairRow } from "./rowMapping.js";

export async function createPair(pair: PairRecord): Promise<PairRecord> {
  return transaction((client) => insertPair(client, pair));
}

export async function seedPairQuestions(
  pairId: string,
  userId: string,
  questions: QuestionRecord[],
  now: number
): Promise<
  | { kind: "ok"; pair: PairRecord; alreadySeeded: boolean }
  | { kind: "missing" }
  | { kind: "forbidden" }
  | { kind: "pair_not_active" }
> {
  return transaction(async (client) => {
    const access = await getPairAccess(client, pairId, userId, { forUpdate: true });
    if (access.kind === "missing") return { kind: "missing" };
    if (access.kind === "forbidden") return { kind: "forbidden" };
    if (access.pair.status !== "active") return { kind: "pair_not_active" };
    if (access.pair.seededSystemQuestionsAt) {
      return { kind: "ok", pair: access.pair, alreadySeeded: true };
    }

    for (const question of questions) {
      await client.query(
        `insert into questions(id, pair_id, created_by, created_at, blob)
         values ($1,$2,$3,$4,$5)`,
        [question.id, question.pairId, question.createdBy, question.createdAt, question.blob]
      );
    }
    const updated = await client.query<PairRow>(
      `update pairs set seeded_system_questions_at = $2, updated_at = $2
       where id = $1 returning *`,
      [pairId, now]
    );
    return { kind: "ok", pair: mapPair(updated.rows[0]), alreadySeeded: false };
  });
}

export async function removePairForUser(pairId: string, userId: string): Promise<PairRemoveResult> {
  return transaction(async (client) => {
    const access = await getPairAccess(client, pairId, userId);
    if (access.kind === "missing") return "missing";
    if (access.kind === "forbidden") return "forbidden";
    await client.query("delete from pairs where id = $1", [pairId]);
    return "removed";
  });
}

export async function joinPair(pairId: string, userId: string): Promise<PairJoinResult> {
  return transaction(async (client) => {
    const pairResult = await client.query<PairRow>("select * from pairs where id = $1 for update", [
      pairId
    ]);
    const pair = pairResult.rows[0] ? mapPair(pairResult.rows[0]) : null;
    if (!pair) return "missing";
    if (pair.userA === userId) return "own";
    if (pair.userB && pair.userB !== userId) return "full";
    await client.query("update pairs set user_b = $2, updated_at = $3 where id = $1", [
      pairId,
      userId,
      Date.now()
    ]);
    return "joined";
  });
}

export async function confirmPair(
  pairId: string,
  userId: string
): Promise<{ status: PairRecord["status"] } | Extract<AccessFailure, "missing" | "forbidden">> {
  return transaction(async (client) => {
    const access = await getPairAccess(client, pairId, userId, { forUpdate: true });
    if (access.kind === "missing") return "missing";
    if (access.kind === "forbidden") return "forbidden";

    const confirmA = access.pair.userA === userId ? true : access.pair.confirmA;
    const confirmB = access.pair.userB === userId ? true : access.pair.confirmB;
    const status =
      access.pair.userA && access.pair.userB && confirmA && confirmB
        ? "active"
        : access.pair.status;
    await client.query(
      `update pairs set confirm_a = $2, confirm_b = $3, status = $4, updated_at = $5 where id = $1`,
      [pairId, confirmA, confirmB, status, Date.now()]
    );
    return { status };
  });
}

export async function setWeeklyLimitProposal(
  pairId: string,
  userId: string,
  pending: NonNullable<PairRecord["weeklyLimitPending"]>
): Promise<PairRecord | Extract<WeeklyLimitResult, "missing" | "forbidden" | "partner_deleted">> {
  return transaction(async (client) => {
    const access = await getPairAccess(client, pairId, userId, { forUpdate: true });
    if (access.kind === "missing") return "missing";
    if (access.kind === "forbidden") return "forbidden";
    if (access.partnerDeleted) return "partner_deleted";
    const result = await client.query<PairRow>(
      `update pairs set weekly_limit_pending = $2, updated_at = $3 where id = $1 returning *`,
      [pairId, pending, Date.now()]
    );
    return mapPair(result.rows[0]);
  });
}

export async function respondWeeklyLimitProposal(
  pairId: string,
  userId: string,
  proposalId: string,
  action: "accept" | "reject" | "cancel"
): Promise<PairRecord | WeeklyLimitResult> {
  return transaction(async (client) => {
    const access = await getPairAccess(client, pairId, userId, { forUpdate: true });
    if (access.kind === "missing") return "missing";
    if (access.kind === "forbidden") return "forbidden";
    if (access.partnerDeleted) return "partner_deleted";
    const pending = access.pair.weeklyLimitPending;
    if (!pending || pending.id !== proposalId) return "no_pending";
    const proposedByMe = pending.proposedBy === userId;
    if ((action === "accept" || action === "reject") && proposedByMe) return "own_response";
    if (action === "cancel" && !proposedByMe) return "forbidden";
    const weeklyLimit = action === "accept" ? pending.limit : access.pair.weeklyLimit;
    const result = await client.query<PairRow>(
      `update pairs
       set weekly_limit = $2, weekly_limit_pending = null, updated_at = $3
       where id = $1 returning *`,
      [pairId, weeklyLimit, Date.now()]
    );
    return mapPair(result.rows[0]);
  });
}
