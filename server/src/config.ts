import { z } from "zod";

const envNumber = (fallback: number) =>
  z
    .string()
    .optional()
    .transform((value) => (value === undefined || value === "" ? fallback : Number(value)))
    .pipe(z.number().finite());

const envBoolean = (fallback: boolean) =>
  z
    .string()
    .optional()
    .transform((value) => {
      if (value === undefined || value === "") return fallback;
      if (value === "true") return true;
      if (value === "false") return false;
      return value;
    })
    .pipe(z.boolean());

const envSchema = z.object({
  WEEKLY_LIMIT_DEFAULT: envNumber(15),
  STATIC_DIR: z.string().optional(),
  PORT: envNumber(3001),
  DATABASE_URL: z
    .string()
    .url()
    .default("postgres://truedesire:truedesire@localhost:5432/truedesire"),
  DB_SSL: envBoolean(false),
  DB_MIGRATIONS_LOCK_TIMEOUT_MS: envNumber(10000),
  PAIRING_LIMIT_USER_PER_MIN: envNumber(10),
  PAIRING_LIMIT_USER_PER_HOUR: envNumber(50),
  PAIRING_LIMIT_IP_PER_MIN: envNumber(30),
  PAIRING_LIMIT_IP_PER_HOUR: envNumber(200)
});

export function parseConfig(env: NodeJS.ProcessEnv) {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "env"}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid server configuration: ${details}`);
  }

  return {
    defaultWeeklyLimit: parsed.data.WEEKLY_LIMIT_DEFAULT,
    staticDir: parsed.data.STATIC_DIR || "",
    port: parsed.data.PORT,
    databaseUrl: parsed.data.DATABASE_URL,
    dbSsl: parsed.data.DB_SSL,
    dbMigrationsLockTimeoutMs: parsed.data.DB_MIGRATIONS_LOCK_TIMEOUT_MS,
    pairingLimits: {
      userPerMinute: parsed.data.PAIRING_LIMIT_USER_PER_MIN,
      userPerHour: parsed.data.PAIRING_LIMIT_USER_PER_HOUR,
      ipPerMinute: parsed.data.PAIRING_LIMIT_IP_PER_MIN,
      ipPerHour: parsed.data.PAIRING_LIMIT_IP_PER_HOUR
    }
  };
}

const config = parseConfig(process.env);

export const DEFAULT_WEEKLY_LIMIT = config.defaultWeeklyLimit;
export const STATIC_DIR = config.staticDir;
export const PORT = config.port;
export const DATABASE_URL = config.databaseUrl;
export const DB_SSL = config.dbSsl;
export const DB_MIGRATIONS_LOCK_TIMEOUT_MS = config.dbMigrationsLockTimeoutMs;
export const PAIRING_LIMITS = config.pairingLimits;
