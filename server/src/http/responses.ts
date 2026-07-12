import type { Response } from "express";
import { ApiErrorCode } from "../errors/apiErrorCode.js";

type Json = unknown;

function setCorsHeaders(res: Response) {
  res.set({
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "content-type,x-user-id,x-timestamp,x-nonce,x-signature",
    "access-control-allow-methods": "GET,POST,OPTIONS"
  });
}

export function json(res: Response, status: number, body: Json) {
  setCorsHeaders(res);
  return res.status(status).json(body);
}

export function text(res: Response, status: number, body: string) {
  setCorsHeaders(res);
  return res.status(status).type("text/plain; charset=utf-8").send(body);
}

export function bad(res: Response, code: ApiErrorCode, status = 400) {
  return json(res, status, { error: code });
}
