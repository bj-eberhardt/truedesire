import express from "express";
import fs from "node:fs";
import path from "node:path";
import { STATIC_DIR } from "./config.js";
import { ApiErrorCode } from "./errors/apiErrorCode.js";
import { bad } from "./http/responses.js";
import { parseBody } from "./middleware/bodyParser.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { requestLogger } from "./middleware/requestLogger.js";
import { createStaticFallbackRateLimit } from "./middleware/staticFallbackRateLimit.js";
import { registerRoutes } from "./routes/registerRoutes.js";

const fallbackHtmlCache = new Map<string, string>();

export function readStaticFallbackIndex(staticDir: string): string {
  if (!staticDir) return "";
  const indexFile = path.join(staticDir, "index.html");
  const cached = fallbackHtmlCache.get(indexFile);
  if (cached !== undefined) return cached;
  const html = fs.readFileSync(indexFile, "utf8");
  fallbackHtmlCache.set(indexFile, html);
  return html;
}

export function assertStaticDirReady() {
  if (!STATIC_DIR) return;
  const indexFile = path.join(STATIC_DIR, "index.html");
  if (!fs.existsSync(indexFile)) {
    throw new Error("Static frontend index not found: " + indexFile);
  }
}

export function createApp() {
  const app = express();
  app.set("etag", false);

  app.use(requestLogger);
  app.use("/api", (_req, res, next) => {
    res.set("cache-control", "no-store");
    next();
  });
  app.use(parseBody);
  registerRoutes(app);

  if (STATIC_DIR) {
    app.use(createStaticFallbackRateLimit());
    app.use(express.static(STATIC_DIR));
    app.get(/.*/, (_req, res, next) => {
      const fallback = readStaticFallbackIndex(STATIC_DIR);
      if (!fallback) return next(new Error("Static frontend index not found"));
      res.send(fallback);
    });
  }

  app.use((_req, res) => bad(res, ApiErrorCode.NotFound, 404));
  app.use(errorHandler);

  return app;
}
