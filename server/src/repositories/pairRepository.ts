import { query, transaction, type DbClient } from "../db/pool.js";
import type { PairRecord, PairRequestRecord, QuestionRecord, UserRecord } from "../storage/db.js";
import {
  mapPair,
  mapPairRequest,
  mapUser,
  type PairRequestRow,
  type PairRow,
  type UserRow
} from "./rowMapping.js";

type PairWithUsers = {
  pair: PairRecord;
  userA: UserRecord | null;
  userB: UserRecord | null;
};

function pairValues(pair: PairRecord) {
  return [
    pair.id,
    pair.userA,
    pair.userB,
    pair.confirmA,
    pair.confirmB,
    pair.status,
    pair.weeklyLimit,
    pair.weeklyLimitPending,
    pair.seededSystemQuestionsAt,
    pair.createdAt,
    pair.updatedAt
  ];
}

async function insertPair(client: DbClient, pair: PairRecord): Promise<PairRecord> {
  const result = await client.query<PairRow>(
    `insert into pairs(
       id, user_a, user_b, confirm_a, confirm_b, status, weekly_limit, weekly_limit_pending,
       seeded_system_questions_at, created_at, updated_at
     )
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     returning *`,
    pairValues(pair)
  );
  return mapPair(result.rows[0]);
}

async function findPairForUsers(
  client: DbClient,
  userId: string,
  partnerId: string
): Promise<PairRecord | undefined> {
  const result = await client.query<PairRow>(
    `select * from pairs
     where user_b is not null
       and least(user_a, user_b) = least($1::text, $2::text)
       and greatest(user_a, user_b) = greatest($1::text, $2::text)
     limit 1`,
    [userId, partnerId]
  );
  return result.rows[0] ? mapPair(result.rows[0]) : undefined;
}

export async function getPairById(pairId: string): Promise<PairRecord | undefined> {
  const result = await query<PairRow>("select * from pairs where id = $1", [pairId]);
  return result.rows[0] ? mapPair(result.rows[0]) : undefined;
}

export async function getPairWithUsers(pairId: string): Promise<PairWithUsers | null> {
  const result = await query<
    PairRow & { user_a_record: UserRow | null; user_b_record: UserRow | null }
  >(
    `select
       p.*,
       row_to_json(ua.*) as user_a_record,
       row_to_json(ub.*) as user_b_record
     from pairs p
     left join users ua on ua.id = p.user_a
     left join users ub on ub.id = p.user_b
     where p.id = $1`,
    [pairId]
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    pair: mapPair(row),
    userA: row.user_a_record ? mapUser(row.user_a_record) : null,
    userB: row.user_b_record ? mapUser(row.user_b_record) : null
  };
}

export async function listPairsWithUsersForUser(userId: string): Promise<PairWithUsers[]> {
  const result = await query<
    PairRow & { user_a_record: UserRow | null; user_b_record: UserRow | null }
  >(
    `select
       p.*,
       row_to_json(ua.*) as user_a_record,
       row_to_json(ub.*) as user_b_record
     from pairs p
     left join users ua on ua.id = p.user_a
     left join users ub on ub.id = p.user_b
     where p.user_a = $1 or p.user_b = $1
     order by p.updated_at desc`,
    [userId]
  );
  return result.rows.map((row) => ({
    pair: mapPair(row),
    userA: row.user_a_record ? mapUser(row.user_a_record) : null,
    userB: row.user_b_record ? mapUser(row.user_b_record) : null
  }));
}

export async function createPair(pair: PairRecord): Promise<PairRecord> {
  return transaction((client) => insertPair(client, pair));
}

export async function createPairForUsers(pair: PairRecord): Promise<PairRecord> {
  return transaction(async (client) => {
    const existing = await findPairForUsers(client, pair.userA, pair.userB ?? "");
    if (existing) return existing;
    return insertPair(client, pair);
  });
}

export async function seedPairQuestions(
  pairId: string,
  userId: string,
  questions: QuestionRecord[],
  now: number
): Promise<{ pair: PairRecord | null; forbidden: boolean; alreadySeeded: boolean }> {
  return transaction(async (client) => {
    const pairResult = await client.query<PairRow>(
      "select * from pairs where id = $1 for update",
      [pairId]
    );
    const pair = pairResult.rows[0] ? mapPair(pairResult.rows[0]) : null;
    if (!pair) return { pair: null, forbidden: false, alreadySeeded: false };
    if (![pair.userA, pair.userB].includes(userId)) {
      return { pair, forbidden: true, alreadySeeded: false };
    }
    if (pair.status !== "active") return { pair, forbidden: false, alreadySeeded: false };
    if (pair.seededSystemQuestionsAt) return { pair, forbidden: false, alreadySeeded: true };

    for (const question of questions) {
      await client.query(
        `insert into questions(id, pair_id, created_by, created_at, blob)
         values ($1,$2,$3,$4,$5)`,
        [question.id, question.pairId, question.createdBy, question.createdAt, question.blob]
      );
    }
    const updated = await client.query(
      `update pairs set seeded_system_questions_at = $2, updated_at = $2
       where id = $1 returning *`,
      [pairId, now]
    );
    return {
      pair: mapPair(updated.rows[0]),
      forbidden: false,
      alreadySeeded: false
    };
  });
}

export async function removePairForUser(pairId: string, userId: string): Promise<"missing" | "forbidden" | "removed"> {
  return transaction(async (client) => {
    const pairResult = await client.query<PairRow>("select * from pairs where id = $1", [
      pairId
    ]);
    const pair = pairResult.rows[0] ? mapPair(pairResult.rows[0]) : null;
    if (!pair) return "missing";
    if (![pair.userA, pair.userB].includes(userId)) return "forbidden";
    await client.query("delete from pairs where id = $1", [pairId]);
    return "removed";
  });
}

export async function joinPair(pairId: string, userId: string): Promise<"missing" | "own" | "full" | "joined"> {
  return transaction(async (client) => {
    const pairResult = await client.query<PairRow>(
      "select * from pairs where id = $1 for update",
      [pairId]
    );
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

export async function confirmPair(pairId: string, userId: string): Promise<{ status: PairRecord["status"] } | "missing" | "forbidden"> {
  return transaction(async (client) => {
    const pairResult = await client.query<PairRow>(
      "select * from pairs where id = $1 for update",
      [pairId]
    );
    const pair = pairResult.rows[0] ? mapPair(pairResult.rows[0]) : null;
    if (!pair) return "missing";
    if (![pair.userA, pair.userB].includes(userId)) return "forbidden";
    const confirmA = pair.userA === userId ? true : pair.confirmA;
    const confirmB = pair.userB === userId ? true : pair.confirmB;
    const status = pair.userA && pair.userB && confirmA && confirmB ? "active" : pair.status;
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
): Promise<PairRecord | "missing" | "forbidden" | "partner_deleted"> {
  return transaction(async (client) => {
    const data = await getPairAndPartnerDeleted(client, pairId, userId);
    if (!data.pair) return "missing";
    if (!data.member) return "forbidden";
    if (data.partnerDeleted) return "partner_deleted";
    const result = await client.query(
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
): Promise<PairRecord | "missing" | "forbidden" | "partner_deleted" | "no_pending" | "own_response"> {
  return transaction(async (client) => {
    const data = await getPairAndPartnerDeleted(client, pairId, userId);
    if (!data.pair) return "missing";
    if (!data.member) return "forbidden";
    if (data.partnerDeleted) return "partner_deleted";
    const pending = data.pair.weeklyLimitPending;
    if (!pending || pending.id !== proposalId) return "no_pending";
    const proposedByMe = pending.proposedBy === userId;
    if ((action === "accept" || action === "reject") && proposedByMe) return "own_response";
    if (action === "cancel" && !proposedByMe) return "forbidden";
    const weeklyLimit = action === "accept" ? pending.limit : data.pair.weeklyLimit;
    const result = await client.query(
      `update pairs
       set weekly_limit = $2, weekly_limit_pending = null, updated_at = $3
       where id = $1 returning *`,
      [pairId, weeklyLimit, Date.now()]
    );
    return mapPair(result.rows[0]);
  });
}

export async function listPairRequestsForUser(userId: string): Promise<{
  requests: PairRequestRecord[];
  usersById: Map<string, UserRecord>;
}> {
  const result = await query<
    PairRequestRow & { from_user_record: UserRow | null; to_user_record: UserRow | null }
  >(
    `select pr.*, row_to_json(from_user.*) as from_user_record, row_to_json(to_user.*) as to_user_record
     from pair_requests pr
     left join users from_user on from_user.id = pr.from_user_id
     left join users to_user on to_user.id = pr.to_user_id
     where (pr.from_user_id = $1 or pr.to_user_id = $1) and pr.status = 'pending'
     order by pr.created_at desc`,
    [userId]
  );
  const usersById = new Map<string, UserRecord>();
  for (const row of result.rows) {
    if (row.from_user_record) usersById.set(row.from_user_record.id, mapUser(row.from_user_record));
    if (row.to_user_record) usersById.set(row.to_user_record.id, mapUser(row.to_user_record));
  }
  return { requests: result.rows.map(mapPairRequest), usersById };
}

async function getPairAndPartnerDeleted(client: DbClient, pairId: string, userId: string) {
  const result = await client.query<PairRow & { partner_deleted_at: string | number | null }>(
    `select p.*, partner.deleted_at as partner_deleted_at
     from pairs p
     left join users partner on partner.id = case when p.user_a = $2 then p.user_b else p.user_a end
     where p.id = $1
     for update of p`,
    [pairId, userId]
  );
  if (!result.rows[0]) return { pair: null, member: false, partnerDeleted: false };
  const pair = mapPair(result.rows[0]);
  return {
    pair,
    member: [pair.userA, pair.userB].includes(userId),
    partnerDeleted: result.rows[0].partner_deleted_at !== null
  };
}

export async function requestPairingTransaction(
  userId: string,
  partnerCode: string,
  createRequest: (partnerId: string) => PairRequestRecord,
  createPair: (user1: string, user2: string) => PairRecord
): Promise<
  | { kind: "unknown_user" }
  | { kind: "unknown_partner" }
  | { kind: "self" }
  | { kind: "already_linked" }
  | { kind: "ok"; requestId: string; pairId?: string; repaired?: boolean }
> {
  return transaction(async (client) => {
    const me = await client.query<UserRow>("select * from users where id = $1", [userId]);
    if (!me.rows[0]) return { kind: "unknown_user" };
    const partnerResult = await client.query<UserRow>(
      "select * from users where code = $1 and deleted_at is null",
      [partnerCode]
    );
    const partner = partnerResult.rows[0] ? mapUser(partnerResult.rows[0]) : null;
    if (!partner) return { kind: "unknown_partner" };
    if (partner.id === userId) return { kind: "self" };

    const existingPair = await findPairForUsers(client, userId, partner.id);
    if (existingPair) return { kind: "already_linked" };

    const accepted = await client.query<PairRequestRow>(
      `select * from pair_requests
       where status = 'accepted'
         and least(from_user_id, to_user_id) = least($1::text, $2::text)
         and greatest(from_user_id, to_user_id) = greatest($1::text, $2::text)
       limit 1`,
      [userId, partner.id]
    );
    if (accepted.rows[0]) {
      const pair = await insertPair(client, createPair(userId, partner.id));
      return { kind: "ok", requestId: accepted.rows[0].id, pairId: pair.id, repaired: true };
    }

    const existingRequest = await client.query<PairRequestRow>(
      `select * from pair_requests
       where from_user_id = $1 and to_user_id = $2 and status = 'pending'
       limit 1`,
      [userId, partner.id]
    );
    if (existingRequest.rows[0]) return { kind: "ok", requestId: existingRequest.rows[0].id };

    const request = createRequest(partner.id);
    await client.query(
      `insert into pair_requests(id, from_user_id, to_user_id, status, created_at, updated_at)
       values ($1,$2,$3,$4,$5,$6)`,
      [
        request.id,
        request.fromUserId,
        request.toUserId,
        request.status,
        request.createdAt,
        request.updatedAt
      ]
    );
    return { kind: "ok", requestId: request.id };
  });
}

export async function respondToPairingTransaction(
  userId: string,
  requestId: string,
  action: "accept" | "reject" | "cancel",
  createPair: (user1: string, user2: string) => PairRecord
): Promise<"missing" | "forbidden" | { pairId: string | null }> {
  return transaction(async (client) => {
    const requestResult = await client.query<PairRequestRow>(
      "select * from pair_requests where id = $1 for update",
      [requestId]
    );
    const request = requestResult.rows[0] ? mapPairRequest(requestResult.rows[0]) : null;
    if (!request) return "missing";
    const isIncoming = request.toUserId === userId;
    const isOutgoing = request.fromUserId === userId;
    if (action === "cancel" && !isOutgoing) return "forbidden";
    if ((action === "accept" || action === "reject") && !isIncoming) return "forbidden";

    const status = action === "accept" ? "accepted" : action === "reject" ? "rejected" : "canceled";
    await client.query("update pair_requests set status = $2, updated_at = $3 where id = $1", [
      requestId,
      status,
      Date.now()
    ]);

    if (status !== "accepted") return { pairId: null };
    const existingPair = await findPairForUsers(client, request.fromUserId, request.toUserId);
    const pair = existingPair ?? (await insertPair(client, createPair(request.fromUserId, request.toUserId)));
    return { pairId: pair.id };
  });
}
