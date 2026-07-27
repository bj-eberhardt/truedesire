import { ApiErrorCode } from "../errors/apiErrorCode.js";
import {
  listLatestSystemQuestions,
  listSystemQuestionVerificationCatalog,
  type SystemQuestionRecord,
  type SystemQuestionVerificationRecord
} from "../repositories/systemQuestionRepository.js";
import { getOrCreateWeeklyQuestionSetForPair } from "../repositories/weeklyQuestionSetRepository.js";
import { isoWeekBounds } from "../utils/week.js";

type ReadSystemQuestionsResult =
  | {
      ok: true;
      catalogVersion: number;
      questions: SystemQuestionRecord[];
      verificationCatalog: SystemQuestionVerificationRecord[];
    }
  | {
      ok: false;
      error: ApiErrorCode.BadSystemQuestions | ApiErrorCode.SystemQuestionsUnavailable;
    };

type ReadWeeklySystemQuestionsResult =
  | {
      ok: true;
      weekStart: number;
      catalogVersion: number;
      questions: SystemQuestionRecord[];
      ownQuestionIds: string[];
      verificationCatalog: SystemQuestionVerificationRecord[];
    }
  | {
      ok: false;
      error:
        | ApiErrorCode.BadSystemQuestions
        | ApiErrorCode.SystemQuestionsUnavailable
        | ApiErrorCode.Forbidden
        | ApiErrorCode.NotFound
        | ApiErrorCode.PairNotActive
        | ApiErrorCode.PartnerDeleted;
      status: number;
    };

export async function readSystemQuestions(): Promise<ReadSystemQuestionsResult> {
  try {
    const latest = await listLatestSystemQuestions();
    if (!latest.catalogVersion || latest.questions.length === 0) {
      return { ok: false, error: ApiErrorCode.BadSystemQuestions };
    }

    return {
      ok: true,
      catalogVersion: latest.catalogVersion,
      questions: latest.questions,
      verificationCatalog: await listSystemQuestionVerificationCatalog()
    };
  } catch {
    return { ok: false, error: ApiErrorCode.SystemQuestionsUnavailable };
  }
}

export async function readWeeklySystemQuestions(
  pairId: string,
  userId: string,
  now = Date.now()
): Promise<ReadWeeklySystemQuestionsResult> {
  const week = isoWeekBounds(now);
  const result = await getOrCreateWeeklyQuestionSetForPair(pairId, userId, week.start, now);
  switch (result.kind) {
    case "missing":
      return { ok: false, error: ApiErrorCode.NotFound, status: 404 };
    case "forbidden":
      return { ok: false, error: ApiErrorCode.Forbidden, status: 403 };
    case "pair_not_active":
      return { ok: false, error: ApiErrorCode.PairNotActive, status: 409 };
    case "partner_deleted":
      return { ok: false, error: ApiErrorCode.PartnerDeleted, status: 409 };
    case "system_questions_unavailable":
      return { ok: false, error: ApiErrorCode.SystemQuestionsUnavailable, status: 500 };
    case "ok":
      break;
  }

  const selectedIds = new Set(result.set.systemQuestionIds);
  const selectedQuestions = result.questions.filter((question) => selectedIds.has(question.id));
  if (selectedQuestions.length !== result.set.systemQuestionIds.length) {
    return { ok: false, error: ApiErrorCode.BadSystemQuestions, status: 500 };
  }

  return {
    ok: true,
    weekStart: result.set.weekStart,
    catalogVersion: result.set.catalogVersion,
    questions: selectedQuestions,
    ownQuestionIds: result.set.ownQuestionIds,
    verificationCatalog: await listSystemQuestionVerificationCatalog()
  };
}
