import type { Request, Response } from "express";

export function getClientIp(req: Request): string {
  const forwarded = String(req.headers["x-forwarded-for"] ?? "").trim();
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.socket?.remoteAddress || "unknown";
}

export function getUserId(res: Response): string {
  return res.locals.userId as string;
}

export function getValidatedBody<T>(res: Response): T {
  return res.locals.validated.body as T;
}

export function getValidatedParams<T>(res: Response): T {
  return res.locals.validated.params as T;
}

export function getRawBody(res: Response): Buffer {
  return res.locals.rawBody as Buffer;
}
