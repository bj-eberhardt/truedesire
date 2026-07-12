import type { RequestHandler } from "express";
import type { ZodType } from "zod";
import { ApiErrorCode } from "../errors/apiErrorCode.js";
import { bad } from "../http/responses.js";
import { log } from "../logger.js";

export type RouteSchemas = {
  body?: ZodType;
  params?: ZodType;
  query?: ZodType;
};

export const validateRequest =
  (schemas: RouteSchemas): RequestHandler =>
  (req, res, next) => {
    const body = schemas.body?.safeParse(res.locals.parsedBody);
    if (body && !body.success) {
      log("warn", "request body validation failed", {
        path: req.originalUrl,
        issues: body.error.issues
      });
      bad(res, ApiErrorCode.BadRequest, 400);
      return;
    }

    const params = schemas.params?.safeParse(req.params);
    if (params && !params.success) {
      log("warn", "request params validation failed", {
        path: req.originalUrl,
        issues: params.error.issues
      });
      bad(res, ApiErrorCode.BadRequest, 400);
      return;
    }

    const query = schemas.query?.safeParse(req.query);
    if (query && !query.success) {
      log("warn", "request query validation failed", {
        path: req.originalUrl,
        issues: query.error.issues
      });
      bad(res, ApiErrorCode.BadRequest, 400);
      return;
    }

    res.locals.validated = {
      body: body?.data,
      params: params?.data,
      query: query?.data
    };
    next();
  };
