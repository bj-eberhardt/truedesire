import { newId } from "../crypto/auth.js";
import { ApiErrorCode } from "../errors/apiErrorCode.js";
import {
  createAnswerIfAllowed,
  listAnswersForPairIfAllowed,
  listAnswersForQuestionIfAllowed,
  upsertAnswerIfAllowed
} from "../repositories/answerRepository.js";
import type { AnswerRecord, EncryptedBlob } from "../storage/db.js";
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
  blob: EncryptedBlob
): Promise<ServiceResult<AnswerRecord>> {
  const now = Date.now();
  const week = isoWeekBounds(now);
  const result = await createAnswerIfAllowed(
    questionId,
    userId,
    blob,
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
  blob: EncryptedBlob
): Promise<ServiceResult<{ ok: true; updated: boolean }>> {
  const now = Date.now();
  const week = isoWeekBounds(now);
  const result = await upsertAnswerIfAllowed(
    questionId,
    userId,
    blob,
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
