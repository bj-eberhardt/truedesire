import { assertStaticDirReady, createApp } from "./app.js";
import { PORT, STATIC_DIR } from "./config.js";
import { initializeDatabase } from "./db/migrations.js";
import { ACTIVE_LOG_LEVEL, REQUEST_LOGS, log } from "./logger.js";

async function start() {
  assertStaticDirReady();
  await initializeDatabase();

  createApp().listen(PORT, () =>
    log("info", "server listening", {
      url: `http://localhost:${PORT}`,
      logLevel: ACTIVE_LOG_LEVEL,
      requestLogs: REQUEST_LOGS,
      staticDir: STATIC_DIR || undefined
    })
  );
}

start().catch((err) => {
  log("error", "server startup failed", { error: err instanceof Error ? err.message : String(err) });
  process.exit(1);
});
