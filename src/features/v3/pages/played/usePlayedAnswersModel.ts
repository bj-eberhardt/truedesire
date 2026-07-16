import { useEffect, useState } from "react";
import { goV3Pair } from "../../../../app/routes";
import { usePairWorkspaceContext, useQuestionsContext } from "../../../../app/state";
import type { AnswerChoice } from "../../../../types";
import { ANSWER_SAVED_FLASH_TIMEOUT_MS, useSavedFlash } from "../../hooks/useSavedFlash";
import { toUserMessage } from "../../lib/errors";
import { getOpenQuestions, sortByCreatedAtDesc } from "../../lib/questions";

export function usePlayedAnswersModel() {
  const { route, pair } = usePairWorkspaceContext();
  const { questions, answerSummary, answerQuestion } = useQuestionsContext();
  const pairId = route.route.pairId ?? "";
  const flash = useSavedFlash({ timeoutMs: ANSWER_SAVED_FLASH_TIMEOUT_MS });
  const [pageError, setPageError] = useState<string | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const openQuestions = getOpenQuestions(questions, answerSummary);
  const pendingQuestions = openQuestions.filter((q) => !!answerSummary[q.id]?.mine);
  const orderedPendingQuestions = sortByCreatedAtDesc(pendingQuestions);

  async function answerPendingQuestion(
    questionId: string,
    questionText: string,
    choice: AnswerChoice
  ) {
    if (flash.isSaving) return;
    try {
      setPageError(null);
      flash.begin(questionId, questionText);
      await answerQuestion(questionId, choice);
      flash.success();
    } catch (e: unknown) {
      flash.fail();
      setPageError(toUserMessage(e));
    }
  }

  return {
    answerPendingQuestion,
    answerSummary,
    flash,
    goBack: () => goV3Pair(pairId),
    isPairReady: !!pair && pair.id === pairId,
    orderedPendingQuestions,
    pageError
  };
}

