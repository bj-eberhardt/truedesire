import type { Request } from "express";
import { PAIRING_LIMITS } from "../config.js";
import { newId } from "../crypto/auth.js";
import { ApiErrorCode } from "../errors/apiErrorCode.js";
import { getClientIp } from "../http/request.js";
import { log } from "../logger.js";
import {
  listPairRequestsForUser,
  requestPairingTransaction,
  respondToPairingTransaction
} from "../repositories/pairRepository.js";
import type { PairRequestRecord } from "../storage/db.js";
import { createPairRecordForUsers } from "./pairService.js";
import { consumeRateLimit } from "./rateLimit.js";
import { fail, ok, type ServiceResult } from "./serviceResult.js";

const pairingReqTimestampsByUser = new Map<string, number[]>();
const pairingReqTimestampsByIp = new Map<string, number[]>();

function isPairingAllowed(userId: string, ip: string, now: number): boolean {
  const okUserLimit = consumeRateLimit(
    pairingReqTimestampsByUser,
    userId,
    now,
    PAIRING_LIMITS.userPerMinute,
    PAIRING_LIMITS.userPerHour
  );
  const okIpLimit = consumeRateLimit(
    pairingReqTimestampsByIp,
    ip,
    now,
    PAIRING_LIMITS.ipPerMinute,
    PAIRING_LIMITS.ipPerHour
  );
  return okUserLimit && okIpLimit;
}

function createPairRequest(userId: string, partnerId: string, now: number): PairRequestRecord {
  return {
    id: newId(),
    fromUserId: userId,
    toUserId: partnerId,
    status: "pending",
    createdAt: now,
    updatedAt: now
  };
}

export async function requestPairingWithCode(
  req: Request,
  userId: string,
  partnerCode: string
): Promise<
  ServiceResult<{
    ok: true;
    requestId: string;
    pairId?: string;
    repaired?: boolean;
  }>
> {
  const now = Date.now();
  if (!isPairingAllowed(userId, getClientIp(req), now)) {
    return fail(ApiErrorCode.RateLimited, 429);
  }

  const result = await requestPairingTransaction(
    userId,
    partnerCode,
    (partnerId) => createPairRequest(userId, partnerId, now),
    createPairRecordForUsers
  );

  if (result.kind === "unknown_user") return fail(ApiErrorCode.UnknownUser, 401);
  if (result.kind === "unknown_partner") return fail(ApiErrorCode.UnknownPartnerCode, 404);
  if (result.kind === "self") return fail(ApiErrorCode.CannotPairSelf, 400);
  if (result.kind === "already_linked") return fail(ApiErrorCode.AlreadyLinked, 409);

  log("info", "pair request handled", {
    userId,
    requestId: result.requestId,
    pairId: result.pairId,
    repaired: result.repaired
  });
  return ok({
    ok: true,
    requestId: result.requestId,
    pairId: result.pairId,
    repaired: result.repaired
  });
}

export async function respondToPairingRequest(
  userId: string,
  requestId: string,
  action: "accept" | "reject" | "cancel"
): Promise<ServiceResult<{ ok: true; pairId: string | null }>> {
  const result = await respondToPairingTransaction(
    userId,
    requestId,
    action,
    createPairRecordForUsers
  );
  if (result === "missing") return fail(ApiErrorCode.NotFound, 404);
  if (result === "forbidden") return fail(ApiErrorCode.Forbidden, 403);

  log("info", "pair request responded", {
    requestId,
    action,
    userId,
    pairId: result.pairId
  });
  return ok({ ok: true, pairId: result.pairId });
}

export async function listPendingPairingRequests(userId: string): Promise<
  ServiceResult<{
    incoming: {
      id: string;
      from: { id: string | undefined; code: string | undefined; nickname: string | undefined };
      createdAt: number;
    }[];
    outgoing: {
      id: string;
      to: { id: string | undefined; code: string | undefined; nickname: string | undefined };
      createdAt: number;
    }[];
  }>
> {
  const { requests, usersById } = await listPairRequestsForUser(userId);
  const incoming = requests
    .filter((request) => request.toUserId === userId)
    .map((request) => {
      const from = usersById.get(request.fromUserId);
      return {
        id: request.id,
        from: { id: from?.id, code: from?.code, nickname: from?.nickname },
        createdAt: request.createdAt
      };
    });
  const outgoing = requests
    .filter((request) => request.fromUserId === userId)
    .map((request) => {
      const to = usersById.get(request.toUserId);
      return {
        id: request.id,
        to: { id: to?.id, code: to?.code, nickname: to?.nickname },
        createdAt: request.createdAt
      };
    });

  return ok({ incoming, outgoing });
}
