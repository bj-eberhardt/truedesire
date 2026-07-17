import { query, type DbClient } from "../db/pool.js";
import type { PairRecord, UserRecord } from "../storage/db.js";
import { mapPair, mapUser, type PairRow, type UserRow } from "./rowMapping.js";

type PairWithUsers = {
  pair: PairRecord;
  userA: UserRecord | null;
  userB: UserRecord | null;
};

export function pairValues(pair: PairRecord) {
  return [
    pair.id,
    pair.userA,
    pair.userB,
    pair.confirmA,
    pair.confirmB,
    pair.status,
    pair.weeklyLimit,
    pair.weeklyLimitPending,
    pair.matchPolicyPending,
    pair.seededSystemQuestionsAt,
    pair.createdAt,
    pair.updatedAt
  ];
}

export async function insertPair(client: DbClient, pair: PairRecord): Promise<PairRecord> {
  const result = await client.query<PairRow>(
    `insert into pairs(
       id, user_a, user_b, confirm_a, confirm_b, status, weekly_limit, weekly_limit_pending,
       match_policy_pending,
       seeded_system_questions_at, created_at, updated_at
     )
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     returning *`,
    pairValues(pair)
  );
  return mapPair(result.rows[0]);
}

export async function findPairForUsers(
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
