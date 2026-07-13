import { DB_MIGRATIONS_LOCK_TIMEOUT_MS } from "../config.js";
import { log } from "../logger.js";
import { transaction } from "./pool.js";

const MIGRATION_LOCK_ID = 7_774_337;

const migrations = [
  {
    version: "001_initial_postgres_schema",
    sql: `
      create table if not exists schema_migrations (
        version text primary key,
        applied_at timestamptz not null default now()
      );

      create table if not exists users (
        id text primary key,
        code text not null,
        nickname text not null,
        deleted_at bigint null,
        sign_public_jwk jsonb not null,
        ecdh_public_raw_b64 text not null,
        created_at bigint not null
      );

      create table if not exists pairs (
        id text primary key,
        user_a text not null references users(id),
        user_b text null references users(id),
        confirm_a boolean not null,
        confirm_b boolean not null,
        status text not null check (status in ('pending', 'active', 'ended')),
        weekly_limit integer not null,
        weekly_limit_pending jsonb null,
        seeded_system_questions_at bigint null,
        created_at bigint not null,
        updated_at bigint not null
      );

      create table if not exists pair_requests (
        id text primary key,
        from_user_id text not null references users(id),
        to_user_id text not null references users(id),
        status text not null check (status in ('pending', 'accepted', 'rejected', 'canceled')),
        created_at bigint not null,
        updated_at bigint not null
      );

      create table if not exists questions (
        id text primary key,
        pair_id text not null references pairs(id) on delete cascade,
        created_by text not null,
        created_at bigint not null,
        blob jsonb not null
      );

      create table if not exists answers (
        id text primary key,
        question_id text not null references questions(id) on delete cascade,
        pair_id text not null references pairs(id) on delete cascade,
        user_id text not null references users(id),
        created_at bigint not null,
        updated_at bigint null,
        blob jsonb not null
      );

      create table if not exists auth_nonces (
        user_id text not null references users(id) on delete cascade,
        nonce text not null,
        expires_at bigint not null,
        primary key (user_id, nonce)
      );

      create index if not exists users_active_code_idx on users(code) where deleted_at is null;
      create index if not exists pairs_user_a_updated_idx on pairs(user_a, updated_at desc);
      create index if not exists pairs_user_b_updated_idx on pairs(user_b, updated_at desc) where user_b is not null;
      create unique index if not exists pairs_unique_two_users_idx on pairs(
        least(user_a, user_b),
        greatest(user_a, user_b)
      ) where user_b is not null;
      create index if not exists pair_requests_to_status_created_idx on pair_requests(to_user_id, status, created_at desc);
      create index if not exists pair_requests_from_status_created_idx on pair_requests(from_user_id, status, created_at desc);
      create index if not exists questions_pair_created_idx on questions(pair_id, created_at);
      create unique index if not exists answers_question_user_idx on answers(question_id, user_id);
      create index if not exists answers_question_idx on answers(question_id);
      create index if not exists answers_pair_user_created_idx on answers(pair_id, user_id, created_at);
      create index if not exists answers_pair_idx on answers(pair_id);
      create index if not exists auth_nonces_user_expires_idx on auth_nonces(user_id, expires_at);
    `
  }
] as const;

export async function initializeDatabase(): Promise<void> {
  await transaction(async (client) => {
    await client.query(`set lock_timeout = '${DB_MIGRATIONS_LOCK_TIMEOUT_MS}ms'`);
    await client.query("select pg_advisory_lock($1)", [MIGRATION_LOCK_ID]);
    try {
      await client.query(`
        create table if not exists schema_migrations (
          version text primary key,
          applied_at timestamptz not null default now()
        )
      `);
      const applied = await client.query<{ version: string }>(
        "select version from schema_migrations"
      );
      const appliedVersions = new Set(applied.rows.map((row) => row.version));

      for (const migration of migrations) {
        if (appliedVersions.has(migration.version)) continue;
        await client.query(migration.sql);
        await client.query("insert into schema_migrations(version) values ($1)", [
          migration.version
        ]);
        log("info", "database migration applied", { version: migration.version });
      }
    } finally {
      await client.query("select pg_advisory_unlock($1)", [MIGRATION_LOCK_ID]);
    }
  });
}
