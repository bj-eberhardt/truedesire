const LOG_LEVELS = ["debug", "info", "warn", "error"] as const;

export type LogLevel = (typeof LOG_LEVELS)[number];

const configuredLogLevel = String(process.env.LOG_LEVEL ?? "info").toLowerCase();

export const REQUEST_LOGS = String(process.env.REQUEST_LOGS ?? "true").toLowerCase() !== "false";

export const ACTIVE_LOG_LEVEL: LogLevel | "silent" =
  configuredLogLevel === "silent"
    ? "silent"
    : LOG_LEVELS.includes(configuredLogLevel as LogLevel)
      ? (configuredLogLevel as LogLevel)
      : "info";

function shouldLog(level: LogLevel): boolean {
  if (ACTIVE_LOG_LEVEL === "silent") return false;
  return LOG_LEVELS.indexOf(level) >= LOG_LEVELS.indexOf(ACTIVE_LOG_LEVEL);
}

export function log(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  if (!shouldLog(level)) return;
  const payload = meta && Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
  const line = `${new Date().toISOString()} ${level.toUpperCase()} ${message}${payload}`;
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}
