import type { Request, RequestHandler } from "express";
import { verifyRequestSignature } from "../crypto/auth.js";
import { ApiErrorCode } from "../errors/apiErrorCode.js";
import { bad } from "../http/responses.js";
import { getRawBody } from "../http/request.js";
import { reserveUserNonce } from "../repositories/userRepository.js";

async function requireAuth(req: Request, rawBody: Uint8Array): Promise<{ userId: string } | null> {
  const userId = String(req.headers["x-user-id"] ?? "");
  const timestamp = String(req.headers["x-timestamp"] ?? "");
  const nonce = String(req.headers["x-nonce"] ?? "");
  const signatureB64 = String(req.headers["x-signature"] ?? "");

  if (!userId || !timestamp || !nonce || !signatureB64) return null;
  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return null;

  const now = Date.now();
  if (Math.abs(now - ts) > 5 * 60 * 1000) return null;

  const user = await reserveUserNonce(userId, nonce, now);
  if (!user) return null;

  const ok = await verifyRequestSignature({
    signPublicJwk: user.signPublicJwk,
    method: req.method,
    pathWithQuery: req.originalUrl,
    timestamp,
    nonce,
    rawBody,
    signatureB64
  });

  return ok ? { userId } : null;
}

export const authenticate: RequestHandler = async (req, res, next) => {
  try {
    const auth = await requireAuth(req, getRawBody(res));
    if (!auth) {
      bad(res, ApiErrorCode.Unauthorized, 401);
      return;
    }

    res.locals.userId = auth.userId;
    next();
  } catch (err) {
    next(err);
  }
};
