import { transaction } from "../db/pool.js";
import type { PairRecord, PairRequestRecord, UserRecord } from "../storage/db.js";
import { findPairForUsers, insertPair } from "./pairRepository.js";
import { mapPairRequest, mapUser, type PairRequestRow, type UserRow } from "./rowMapping.js";

export async function listPairRequestsForUser(userId: string): Promise<{
  requests: PairRequestRecord[];
  usersById: Map<string, UserRecord>;
}> {
  const result = await transaction((client) =>
    client.query<
      PairRequestRow & { from_user_record: UserRow | null; to_user_record: UserRow | null }
    >(
      `select pr.*, row_to_json(from_user.*) as from_user_record, row_to_json(to_user.*) as to_user_record
       from pair_requests pr
       left join users from_user on from_user.id = pr.from_user_id
       left join users to_user on to_user.id = pr.to_user_id
       where (pr.from_user_id = $1 or pr.to_user_id = $1) and pr.status = 'pending'
       order by pr.created_at desc`,
      [userId]
    )
  );
  const usersById = new Map<string, UserRecord>();
  for (const row of result.rows) {
    if (row.from_user_record) usersById.set(row.from_user_record.id, mapUser(row.from_user_record));
    if (row.to_user_record) usersById.set(row.to_user_record.id, mapUser(row.to_user_record));
  }
  return { requests: result.rows.map(mapPairRequest), usersById };
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

    const accepted = await findAcceptedRequestWithoutPair(client, userId, partner.id);
    if (accepted) {
      const pair = await insertPair(client, createPair(userId, partner.id));
      return { kind: "ok", requestId: accepted.id, pairId: pair.id, repaired: true };
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
    const pair =
      existingPair ?? (await insertPair(client, createPair(request.fromUserId, request.toUserId)));
    return { pairId: pair.id };
  });
}

async function findAcceptedRequestWithoutPair(
  client: Parameters<typeof findPairForUsers>[0],
  userId: string,
  partnerId: string
): Promise<PairRequestRecord | null> {
  const accepted = await client.query<PairRequestRow>(
    `select * from pair_requests
     where status = 'accepted'
       and least(from_user_id, to_user_id) = least($1::text, $2::text)
       and greatest(from_user_id, to_user_id) = greatest($1::text, $2::text)
     limit 1`,
    [userId, partnerId]
  );
  return accepted.rows[0] ? mapPairRequest(accepted.rows[0]) : null;
}
