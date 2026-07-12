import type { ErrorRequestHandler } from "express";
import { ApiErrorCode } from "../errors/apiErrorCode.js";
import { bad } from "../http/responses.js";
import { log } from "../logger.js";

export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  log("error", "unhandled request error", {
    requestId: res.locals.requestId,
    method: req.method,
    path: req.originalUrl,
    ip: res.locals.clientIp,
    error: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined
  });

  if (res.headersSent) return next(err);
  bad(res, ApiErrorCode.InternalError, 500);
};
