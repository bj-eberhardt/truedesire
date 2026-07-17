import { newId } from "../crypto/auth.js";
import { ApiErrorCode } from "../errors/apiErrorCode.js";
import {
  createAnswerIfAllowed,
  getMatchPolicyIfAllowed,
  listAnswerStatusesForPairIfAllowed,
  listAnswersForPairIfAllowed,
  listAnswersForQuestionIfAllowed,
  listMatchesForPairIfAllowed,
  respondMatchPolicyProposal,
  setMatchPolicyProposal,
  setMatchPolicyIfAllowed,
  upsertAnswerIfAllowed
} from "../repositories/answerRepository.js";
import type { AnswerRecord, EncryptedBlob, MatchPolicy, MatchTokenSet } from "../storage/db.js";
import { isoWeekBounds } from "../utils/week.js";
import { fail, ok, type ServiceResult } from "./serviceResult.js";

function mapAnswerWriteFailure(kind: string) {
  if (kind === "missing") return fail(ApiErrorCode.NotFound, 404);
  if (kind === "pair_not_active") return fail(ApiErrorCode.PairNotActive, 409);
  if (kind === "partner_deleted") return fail(ApiErrorCode.PartnerDeleted, 409);
  if (kind === "already_answered") return fail(ApiErrorCode.AlreadyAnswered, 409);
  if (kind === "partner_answered") return fail(ApiErrorCode.CannotUpdateAfterPartnerAnswer, 409);
  if (kind === "weekly_limit") return fail(ApiErrorCode.WeeklyLimitReached, 429);
  return fail(ApiErrorCode.Forbidden, 403);
}

export async function createAnswerForQuestion(
  questionId: string,
  userId: string,
  blob: EncryptedBlob,
  matchTokens: MatchTokenSet = { perfect: [], mixedMaybe: [], mutualMaybe: [] },
  policyVersion = 1,
  maybeCountsAsMatch?: boolean
): Promise<ServiceResult<AnswerRecord>> {
  const now = Date.now();
  const week = isoWeekBounds(now);
  const result = await createAnswerIfAllowed(
    questionId,
    userId,
    blob,
    matchTokens,
    policyVersion,
    maybeCountsAsMatch,
    newId(),
    now,
    week.start,
    week.end
  );
  if (result.kind === "ok") return ok(result.answer);
  return mapAnswerWriteFailure(result.kind);
}

export async function upsertAnswerForQuestion(
  questionId: string,
  userId: string,
  blob: EncryptedBlob,
  matchTokens: MatchTokenSet = { perfect: [], mixedMaybe: [], mutualMaybe: [] },
  policyVersion = 1,
  maybeCountsAsMatch?: boolean
): Promise<ServiceResult<{ ok: true; updated: boolean }>> {
  const now = Date.now();
  const week = isoWeekBounds(now);
  const result = await upsertAnswerIfAllowed(
    questionId,
    userId,
    blob,
    matchTokens,
    policyVersion,
    maybeCountsAsMatch,
    newId(),
    now,
    week.start,
    week.end
  );
  if (result.kind === "ok") return ok({ ok: true, updated: result.updated });
  return mapAnswerWriteFailure(result.kind);
}

export async function listAnswersForQuestion(
  questionId: string,
  userId: string
): Promise<ServiceResult<AnswerRecord[]>> {
  const result = await listAnswersForQuestionIfAllowed(questionId, userId);
  if (result === "missing") return fail(ApiErrorCode.NotFound, 404);
  if (result === "forbidden") return fail(ApiErrorCode.Forbidden, 403);
  return ok(result);
}

export async function listAnswersForPair(
  pairId: string,
  userId: string
): Promise<ServiceResult<AnswerRecord[]>> {
  const result = await listAnswersForPairIfAllowed(pairId, userId);
  if (result === "missing") return fail(ApiErrorCode.NotFound, 404);
  if (result === "forbidden") return fail(ApiErrorCode.Forbidden, 403);
  return ok(result);
}

export async function listPrivateMatchesForPair(
  pairId: string,
  userId: string
): Promise<
  ServiceResult<Array<{ questionId: string; createdAt: number; grade: "perfect" | "maybe" | "mutualMaybe" }>>
> {
  const result = await listMatchesForPairIfAllowed(pairId, userId);
  if (result === "missing") return fail(ApiErrorCode.NotFound, 404);
  if (result === "forbidden") return fail(ApiErrorCode.Forbidden, 403);
  return ok(result);
}

export async function getMatchPolicyForPair(
  pairId: string,
  userId: string
): Promise<ServiceResult<{ policy: MatchPolicy }>> {
  const result = await getMatchPolicyIfAllowed(pairId, userId);
  if (result === "missing") return fail(ApiErrorCode.NotFound, 404);
  if (result === "forbidden") return fail(ApiErrorCode.Forbidden, 403);
  return ok({ policy: result });
}

export async function setMatchPolicyForPair(
  pairId: string,
  userId: string,
  policy: MatchPolicy
): Promise<ServiceResult<{ policy: MatchPolicy }>> {
  const result = await setMatchPolicyIfAllowed(pairId, userId, policy, Date.now());
  if (result === "missing") return fail(ApiErrorCode.NotFound, 404);
  if (result === "forbidden") return fail(ApiErrorCode.Forbidden, 403);
  return ok(result);
}

export async function proposeMatchPolicyForPair(
  pairId: string,
  userId: string,
  policy: MatchPolicy
): Promise<
  ServiceResult<{
    ok: true;
    policy: MatchPolicy;
    pending: { id: string; proposedBy: string; policy: MatchPolicy; createdAt: number };
  }>
> {
  const pending = { id: newId(), proposedBy: userId, policy, createdAt: Date.now() };
  const result = await setMatchPolicyProposal(pairId, userId, pending);
  if (result === "missing") return fail(ApiErrorCode.NotFound, 404);
  if (result === "forbidden") return fail(ApiErrorCode.Forbidden, 403);
  if (result === "partner_deleted") return fail(ApiErrorCode.PartnerDeleted, 409);
  return ok({ ok: true, policy, pending });
}

export async function respondMatchPolicyForPair(
  pairId: string,
  userId: string,
  proposalId: string,
  action: "accept" | "reject" | "cancel"
): Promise<ServiceResult<{ ok: true; policy?: MatchPolicy }>> {
  const result = await respondMatchPolicyProposal(pairId, userId, proposalId, action);
  if (result === "missing") return fail(ApiErrorCode.NotFound, 404);
  if (result === "forbidden") return fail(ApiErrorCode.Forbidden, 403);
  if (result === "partner_deleted") return fail(ApiErrorCode.PartnerDeleted, 409);
  if (result === "no_pending") return fail(ApiErrorCode.NoPendingProposal, 409);
  if (result === "own_response") return fail(ApiErrorCode.CannotRespondOwnProposal, 403);
  return ok({ ok: true, policy: "policy" in result ? result.policy : undefined });
}

export async function listAnswerStatusesForPair(
  pairId: string,
  userId: string
): Promise<
  ServiceResult<Array<{ questionId: string; total: number; mine: boolean; mineAnswerId?: string }>>
> {
  const result = await listAnswerStatusesForPairIfAllowed(pairId, userId);
  if (result === "missing") return fail(ApiErrorCode.NotFound, 404);
  if (result === "forbidden") return fail(ApiErrorCode.Forbidden, 403);
  return ok(result);
}
