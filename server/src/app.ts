import express from "express";
import fs from "node:fs";
import path from "node:path";
import { STATIC_DIR } from "./config.js";
import { ApiErrorCode } from "./errors/apiErrorCode.js";
import { bad } from "./http/responses.js";
import { parseBody } from "./middleware/bodyParser.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { requestLogger } from "./middleware/requestLogger.js";
import { registerRoutes } from "./routes/registerRoutes.js";

export function assertStaticDirReady() {
  if (!STATIC_DIR) return;
  const indexFile = path.join(STATIC_DIR, "index.html");
  if (!fs.existsSync(indexFile)) {
    throw new Error("Static frontend index not found: " + indexFile);
  }
}

export function createApp() {
  const app = express();

  app.use(requestLogger);
  app.use(parseBody);
  registerRoutes(app);

  if (STATIC_DIR) {
    app.use(express.static(STATIC_DIR));
    app.get(/.*/, (_req, res, next) => {
      res.sendFile(path.join(STATIC_DIR, "index.html"), (err) => {
        if (err) next(err);
      });
    });
  }

  app.use((_req, res) => bad(res, ApiErrorCode.NotFound, 404));
  app.use(errorHandler);

  return app;
}
