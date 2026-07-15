import { ApiErrorCode } from "../errors/apiErrorCode.js";
import {
  listLatestSystemQuestions,
  listSystemQuestionVerificationCatalog,
  type SystemQuestionRecord,
  type SystemQuestionVerificationRecord
} from "../repositories/systemQuestionRepository.js";

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
