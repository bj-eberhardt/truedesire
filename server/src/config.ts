import path from "node:path";

export const DEFAULT_WEEKLY_LIMIT = Number(process.env.WEEKLY_LIMIT_DEFAULT ?? 15);
export const SYSTEM_QUESTIONS_FILE =
  process.env.SYSTEM_QUESTIONS_FILE || path.join(process.cwd(), "data", "system-questions.json");
export const STATIC_DIR = process.env.STATIC_DIR || "";
export const PORT = Number(process.env.PORT ?? 3001);
export const DATABASE_URL =
  process.env.DATABASE_URL || "postgres://truedesire:truedesire@localhost:5432/truedesire";
export const DB_SSL = process.env.DB_SSL === "true";
export const DB_MIGRATIONS_LOCK_TIMEOUT_MS = Number(
  process.env.DB_MIGRATIONS_LOCK_TIMEOUT_MS ?? 10000
);

export const PAIRING_LIMITS = {
  userPerMinute: Number(process.env.PAIRING_LIMIT_USER_PER_MIN ?? 10),
  userPerHour: Number(process.env.PAIRING_LIMIT_USER_PER_HOUR ?? 50),
  ipPerMinute: Number(process.env.PAIRING_LIMIT_IP_PER_MIN ?? 30),
  ipPerHour: Number(process.env.PAIRING_LIMIT_IP_PER_HOUR ?? 200)
};
