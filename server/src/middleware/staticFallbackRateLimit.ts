import type { RequestHandler } from "express";
import { PAIRING_LIMITS } from "../config.js";
import { ApiErrorCode } from "../errors/apiErrorCode.js";
import { bad } from "../http/responses.js";
import { consumeRateLimit } from "../services/rateLimit.js";

export function createStaticFallbackRateLimit(
  perMin = PAIRING_LIMITS.ipPerMinute,
  perHour = PAIRING_LIMITS.ipPerHour
): RequestHandler {
  const requestsByIp = new Map<string, number[]>();

  return (req, res, next) => {
    const ip = req.socket.remoteAddress ?? "unknown";
    if (!consumeRateLimit(requestsByIp, ip, Date.now(), perMin, perHour)) {
      return bad(res, ApiErrorCode.RateLimited, 429);
    }
    next();
  };
}
