import { newId } from "../crypto/auth.js";
import { ApiErrorCode } from "../errors/apiErrorCode.js";
import {
  createQuestionIfAllowed,
  deleteQuestionIfAllowed,
  listQuestionsIfAllowed
} from "../repositories/questionRepository.js";
import type { EncryptedBlob, QuestionRecord } from "../storage/db.js";
import { fail, ok, type ServiceResult } from "./serviceResult.js";

export async function createQuestionForPair(
  pairId: string,
  userId: string,
  blob: EncryptedBlob
): Promise<ServiceResult<QuestionRecord>> {
  const result = await createQuestionIfAllowed(
    {
      id: newId(),
      pairId,
      createdBy: userId,
      createdAt: Date.now(),
      blob
    },
    userId
  );
  if (result.kind === "ok") return ok(result.question);
  if (result.kind === "pair_not_active") return fail(ApiErrorCode.PairNotActive, 409);
  if (result.kind === "partner_deleted") return fail(ApiErrorCode.PartnerDeleted, 409);
  return fail(ApiErrorCode.Forbidden, 403);
}

export async function deleteQuestionById(
  questionId: string,
  userId: string
): Promise<ServiceResult<{ ok: true }>> {
  const result = await deleteQuestionIfAllowed(questionId, userId);
  if (result === "deleted") return ok({ ok: true });
  if (result === "missing") return fail(ApiErrorCode.NotFound, 404);
  if (result === "partner_answered") {
    return fail(ApiErrorCode.CannotDeleteAfterPartnerAnswer, 409);
  }
  return fail(ApiErrorCode.Forbidden, 403);
}

export async function listQuestionsForPair(
  pairId: string,
  userId: string
): Promise<ServiceResult<QuestionRecord[]>> {
  const result = await listQuestionsIfAllowed(pairId, userId);
  if (result === "forbidden") return fail(ApiErrorCode.Forbidden, 403);
  if (result === "partner_deleted") return fail(ApiErrorCode.PartnerDeleted, 409);
  return ok(result);
}
