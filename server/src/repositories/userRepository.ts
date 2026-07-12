import { query, transaction } from "../db/pool.js";
import type { UserRecord } from "../storage/db.js";
import { mapUser, type UserRow } from "./rowMapping.js";

export type CreateUserInput = Omit<UserRecord, "createdAt" | "deletedAt">;

export async function createUser(input: CreateUserInput): Promise<UserRecord> {
  const createdAt = Date.now();
  const result = await query<UserRow>(
    `insert into users(id, code, nickname, deleted_at, sign_public_jwk, ecdh_public_raw_b64, created_at)
     values ($1, $2, $3, null, $4, $5, $6)
     returning *`,
    [
      input.id,
      input.code,
      input.nickname,
      input.signPublicJwk,
      input.ecdhPublicRawB64,
      createdAt
    ]
  );
  return mapUser(result.rows[0]);
}

export async function getUserById(userId: string): Promise<UserRecord | undefined> {
  const result = await query<UserRow>("select * from users where id = $1", [userId]);
  return result.rows[0] ? mapUser(result.rows[0]) : undefined;
}

export async function getActiveUserByCode(code: string): Promise<UserRecord | undefined> {
  const result = await query<UserRow>(
    "select * from users where code = $1 and deleted_at is null",
    [code]
  );
  return result.rows[0] ? mapUser(result.rows[0]) : undefined;
}

export async function listUserCodes(): Promise<string[]> {
  const result = await query<{ code: string }>("select code from users where code <> ''");
  return result.rows.map((row) => row.code);
}

export async function reserveUserNonce(
  userId: string,
  nonce: string,
  now: number
): Promise<UserRecord | null> {
  return transaction(async (client) => {
    await client.query("delete from auth_nonces where user_id = $1 and expires_at <= $2", [
      userId,
      now
    ]);
    const userResult = await client.query<UserRow>(
      "select * from users where id = $1 and deleted_at is null",
      [userId]
    );
    if (!userResult.rows[0]) return null;

    try {
      await client.query(
        `insert into auth_nonces(user_id, nonce, expires_at)
         values ($1, $2, $3)`,
        [userId, nonce, now + 10 * 60 * 1000]
      );
    } catch (err) {
      if (err instanceof Error && "code" in err && err.code === "23505") return null;
      throw err;
    }

    await client.query(
      `delete from auth_nonces
       where ctid in (
         select ctid from auth_nonces
         where user_id = $1
         order by expires_at desc
         offset 500
       )`,
      [userId]
    );

    return mapUser(userResult.rows[0]);
  });
}

export async function markUserDeleted(userId: string, deletedNickname: string): Promise<boolean> {
  return transaction(async (client) => {
    const now = Date.now();
    const userResult = await client.query(
      `update users
       set deleted_at = $2, nickname = $3, code = ''
       where id = $1
       returning id`,
      [userId, now, deletedNickname]
    );
    if (userResult.rowCount === 0) return false;

    await client.query(
      "delete from pair_requests where from_user_id = $1 or to_user_id = $1",
      [userId]
    );
    await client.query(
      `update pairs
       set status = 'ended', updated_at = $2
       where user_a = $1 or user_b = $1`,
      [userId, now]
    );
    await client.query("delete from auth_nonces where user_id = $1", [userId]);
    return true;
  });
}
