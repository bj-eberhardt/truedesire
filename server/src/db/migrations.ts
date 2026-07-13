import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DB_MIGRATIONS_LOCK_TIMEOUT_MS } from "../config.js";
import { log } from "../logger.js";
import { transaction } from "./pool.js";

const MIGRATION_LOCK_ID = 7_774_337;
const MIGRATIONS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "migrations");

type MigrationFile = {
  version: string;
  fileName: string;
  sql: string;
};

async function loadMigrationFiles(): Promise<MigrationFile[]> {
  const entries = await fs.readdir(MIGRATIONS_DIR, { withFileTypes: true });
  const fileNames = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  const migrations: MigrationFile[] = [];
  for (const fileName of fileNames) {
    migrations.push({
      version: fileName.replace(/\.sql$/u, ""),
      fileName,
      sql: await fs.readFile(path.join(MIGRATIONS_DIR, fileName), "utf8")
    });
  }
  return migrations;
}

export async function initializeDatabase(): Promise<void> {
  const migrations = await loadMigrationFiles();

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
        log("info", "database migration applied", {
          version: migration.version,
          fileName: migration.fileName
        });
      }
    } finally {
      await client.query("select pg_advisory_unlock($1)", [MIGRATION_LOCK_ID]);
    }
  });
}
