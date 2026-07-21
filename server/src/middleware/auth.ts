import type { Request, RequestHandler } from "express";
import { verifyRequestSignature } from "../crypto/auth.js";
import { ApiErrorCode } from "../errors/apiErrorCode.js";
import { bad } from "../http/responses.js";
import { getRawBody } from "../http/request.js";
import { getActiveUserById, reserveUserNonce } from "../repositories/userRepository.js";

const NONCE_PATTERN = /^[0-9a-f]{24}$/;
const canonicalBase64Pattern = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

function isCanonicalBase64(value: string): boolean {
  if (!value || value.length % 4 !== 0 || !canonicalBase64Pattern.test(value)) return false;
  const decoded = Buffer.from(value, "base64");
  return decoded.byteLength > 0 && decoded.toString("base64") === value;
}

async function requireAuth(req: Request, rawBody: Uint8Array): Promise<{ userId: string } | null> {
  const userId = String(req.headers["x-user-id"] ?? "");
  const timestamp = String(req.headers["x-timestamp"] ?? "");
  const nonce = String(req.headers["x-nonce"] ?? "");
  const signatureB64 = String(req.headers["x-signature"] ?? "");

  if (!userId || !timestamp || !nonce || !signatureB64) return null;
  const ts = Number(timestamp);
  if (!Number.isInteger(ts)) return null;
  if (!NONCE_PATTERN.test(nonce)) return null;
  if (!isCanonicalBase64(signatureB64)) return null;

  const now = Date.now();
  if (Math.abs(now - ts) > 5 * 60 * 1000) return null;

  const user = await getActiveUserById(userId);
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

  if (!ok) return null;
  const nonceReserved = await reserveUserNonce(userId, nonce, now);
  return nonceReserved ? { userId } : null;
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
