import { DEFAULT_WEEKLY_LIMIT } from "../config.js";
import { newId } from "../crypto/auth.js";
import { ApiErrorCode } from "../errors/apiErrorCode.js";
import { log } from "../logger.js";
import { countWeeklyAnswers } from "../repositories/answerRepository.js";
import {
  confirmPair,
  createPair,
  joinPair,
  removePairForUser,
  respondWeeklyLimitProposal,
  seedPairQuestions,
  setWeeklyLimitProposal
} from "../repositories/pairMutationRepository.js";
import { getPairWithUsers, listPairsWithUsersForUser } from "../repositories/pairRepository.js";
import type { EncryptedBlob, PairRecord, QuestionRecord, UserRecord } from "../storage/db.js";
import { isoWeekBounds } from "../utils/week.js";
import { isPairMember, isPartnerDeletedFromUsers } from "./database.js";
import { fail, ok, type ServiceResult } from "./serviceResult.js";

type PairListItem = {
  id: string;
  status: PairRecord["status"];
  weeklyLimit: number;
  partnerDeleted: boolean;
  partner: { id: string; nickname: string; code: string } | null;
  updatedAt: number;
};

type PairDetails = {
  id: string;
  status: PairRecord["status"];
  weeklyLimit: number;
  weeklyLimitPending: PairRecord["weeklyLimitPending"];
  matchPolicyPending: PairRecord["matchPolicyPending"];
  seededSystemQuestionsAt: number | null;
  usage: { answeredThisWeek: number; weeklyLimit: number };
  partnerDeleted: boolean;
  confirmA: boolean;
  confirmB: boolean;
  userA: PublicPairUser | null;
  userB: PublicPairUser | null;
};

type PublicPairUser = {
  id: string;
  nickname: string;
  code: string;
  ecdhPublicRawB64: string;
};

function createActivePair(user1: string, user2: string): PairRecord {
  const [a, b] = [user1, user2].sort();
  const now = Date.now();
  return {
    id: newId().slice(0, 8),
    userA: a,
    userB: b,
    confirmA: true,
    confirmB: true,
    status: "active",
    weeklyLimit: DEFAULT_WEEKLY_LIMIT,
    weeklyLimitProposals: {},
    weeklyLimitPending: null,
    matchPolicyPending: null,
    seededSystemQuestionsAt: null,
    createdAt: now,
    updatedAt: now
  };
}

export function createPairRecordForUsers(user1: string, user2: string): PairRecord {
  return createActivePair(user1, user2);
}

export function createPendingPair(userId: string): PairRecord {
  const now = Date.now();
  return {
    id: newId().slice(0, 8),
    userA: userId,
    userB: null,
    confirmA: false,
    confirmB: false,
    status: "pending",
    weeklyLimit: DEFAULT_WEEKLY_LIMIT,
    weeklyLimitProposals: {},
    weeklyLimitPending: null,
    matchPolicyPending: null,
    seededSystemQuestionsAt: null,
    createdAt: now,
    updatedAt: now
  };
}

function serializePairListItem(
  pair: PairRecord,
  userId: string,
  userA: UserRecord | null,
  userB: UserRecord | null
): PairListItem {
  const other = pair.userA === userId ? userB : userA;
  const partnerDeleted = !!other?.deletedAt;
  return {
    id: pair.id,
    status: partnerDeleted ? "ended" : pair.status,
    weeklyLimit: pair.weeklyLimit,
    partnerDeleted,
    partner: other
      ? {
          id: other.id,
          nickname: partnerDeleted ? "Gelöscht" : other.nickname,
          code: partnerDeleted ? "" : other.code
        }
      : null,
    updatedAt: pair.updatedAt
  };
}

function serializePairUser(user: UserRecord | undefined | null): PublicPairUser | null {
  if (!user) return null;
  return {
    id: user.id,
    nickname: user.nickname,
    code: user.code,
    ecdhPublicRawB64: user.ecdhPublicRawB64
  };
}

export async function listPairsForUser(userId: string): Promise<PairListItem[]> {
  const rows = await listPairsWithUsersForUser(userId);
  return rows.map(({ pair, userA, userB }) => serializePairListItem(pair, userId, userA, userB));
}

export async function seedQuestionsForPair(
  pairId: string,
  userId: string,
  items: { blob: EncryptedBlob }[]
): Promise<ServiceResult<{ ok: true; alreadySeeded: boolean }>> {
  const now = Date.now();
  const questions: QuestionRecord[] = items.map((item) => ({
    id: newId(),
    pairId,
    createdBy: "computer",
    createdAt: now,
    blob: item.blob
  }));
  const result = await seedPairQuestions(pairId, userId, questions, now);
  if (result.kind === "missing") return fail(ApiErrorCode.NotFound, 404);
  if (result.kind === "forbidden") return fail(ApiErrorCode.Forbidden, 403);
  if (result.kind === "pair_not_active") return fail(ApiErrorCode.PairNotActive, 409);
  return ok({ ok: true, alreadySeeded: result.alreadySeeded });
}

export async function removePair(
  pairId: string,
  userId: string
): Promise<ServiceResult<{ ok: true }>> {
  const result = await removePairForUser(pairId, userId);
  if (result === "missing") return fail(ApiErrorCode.NotFound, 404);
  if (result === "forbidden") return fail(ApiErrorCode.Forbidden, 403);
  log("info", "pair removed", { pairId, userId });
  return ok({ ok: true });
}

export async function createPairForUser(userId: string): Promise<{ pairId: string }> {
  const pair = await createPair(createPendingPair(userId));
  return { pairId: pair.id };
}

export async function joinPairById(
  pairId: string,
  userId: string
): Promise<ServiceResult<{ ok: true }>> {
  const result = await joinPair(pairId, userId);
  if (result === "missing") return fail(ApiErrorCode.NotFound, 404);
  if (result === "own") return fail(ApiErrorCode.CannotJoinOwnPair, 400);
  if (result === "full") return fail(ApiErrorCode.PairFull, 409);
  return ok({ ok: true });
}

export async function confirmPairById(
  pairId: string,
  userId: string
): Promise<ServiceResult<{ ok: true; status: PairRecord["status"] }>> {
  const result = await confirmPair(pairId, userId);
  if (result === "missing") return fail(ApiErrorCode.NotFound, 404);
  if (result === "forbidden") return fail(ApiErrorCode.Forbidden, 403);
  return ok({ ok: true, status: result.status });
}

export async function proposeWeeklyLimitForPair(
  pairId: string,
  userId: string,
  limit: number
): Promise<
  ServiceResult<{
    ok: true;
    weeklyLimit: number;
    pending: NonNullable<PairRecord["weeklyLimitPending"]>;
  }>
> {
  const pending = { id: newId(), proposedBy: userId, limit, createdAt: Date.now() };
  const result = await setWeeklyLimitProposal(pairId, userId, pending);
  if (result === "missing") return fail(ApiErrorCode.NotFound, 404);
  if (result === "forbidden") return fail(ApiErrorCode.Forbidden, 403);
  if (result === "partner_deleted") return fail(ApiErrorCode.PartnerDeleted, 409);
  return ok({ ok: true, weeklyLimit: result.weeklyLimit, pending });
}

export async function respondWeeklyLimitForPair(
  pairId: string,
  userId: string,
  proposalId: string,
  action: "accept" | "reject" | "cancel"
): Promise<ServiceResult<{ ok: true; weeklyLimit: number }>> {
  const result = await respondWeeklyLimitProposal(pairId, userId, proposalId, action);
  if (result === "missing") return fail(ApiErrorCode.NotFound, 404);
  if (result === "forbidden") return fail(ApiErrorCode.Forbidden, 403);
  if (result === "partner_deleted") return fail(ApiErrorCode.PartnerDeleted, 409);
  if (result === "no_pending") return fail(ApiErrorCode.NoPendingProposal, 409);
  if (result === "own_response") return fail(ApiErrorCode.CannotRespondOwnProposal, 403);
  return ok({ ok: true, weeklyLimit: result.weeklyLimit });
}

export async function getPairDetails(
  pairId: string,
  userId: string
): Promise<ServiceResult<PairDetails>> {
  const data = await getPairWithUsers(pairId);
  if (!data) return fail(ApiErrorCode.NotFound, 404);
  if (!isPairMember(data.pair, userId)) return fail(ApiErrorCode.Forbidden, 403);
  const week = isoWeekBounds(Date.now());
  const answeredThisWeek = await countWeeklyAnswers(data.pair.id, userId, week.start, week.end);
  return ok({
    id: data.pair.id,
    status: data.pair.status,
    weeklyLimit: data.pair.weeklyLimit,
    weeklyLimitPending: data.pair.weeklyLimitPending ?? null,
    matchPolicyPending: data.pair.matchPolicyPending ?? null,
    seededSystemQuestionsAt: data.pair.seededSystemQuestionsAt ?? null,
    usage: { answeredThisWeek, weeklyLimit: data.pair.weeklyLimit },
    partnerDeleted: isPartnerDeletedFromUsers(data.pair, userId, {
      userA: data.userA,
      userB: data.userB
    }),
    confirmA: data.pair.confirmA,
    confirmB: data.pair.confirmB,
    userA: serializePairUser(data.userA),
    userB: serializePairUser(data.userB)
  });
}
