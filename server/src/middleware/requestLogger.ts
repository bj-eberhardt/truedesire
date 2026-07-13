import type { RequestHandler } from "express";
import { newId } from "../crypto/auth.js";
import { getClientIp } from "../http/request.js";
import { log, REQUEST_LOGS, type LogLevel } from "../logger.js";

export const requestLogger: RequestHandler = (req, res, next) => {
  const startedAt = Date.now();
  const requestId = newId().slice(0, 8);
  const ip = getClientIp(req);

  res.locals.requestId = requestId;
  res.locals.startedAt = startedAt;
  res.locals.clientIp = ip;

  res.once("finish", () => {
    if (!REQUEST_LOGS) return;
    const level: LogLevel =
      res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info";
    log(level, "request", {
      requestId,
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs: Date.now() - startedAt,
      ip,
      userId: req.headers["x-user-id"] ? String(req.headers["x-user-id"]) : undefined
    });
  });

  next();
};
