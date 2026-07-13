import type { Response } from "express";
import { bad, json } from "./responses.js";
import type { ServiceResult } from "../services/serviceResult.js";

export function sendServiceResult<T>(res: Response, result: ServiceResult<T>) {
  if (!result.ok) return bad(res, result.error.code, result.error.status);
  return json(res, 200, result.value);
}
