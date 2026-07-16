import { useCallback } from "react";
import type { AnswerChoice } from "../../../../types";
import { ANSWER_SAVED_FLASH_TIMEOUT_MS, useSavedFlash } from "../../hooks/useSavedFlash";

type UsePairPlayAnswerFlowOptions = {
  answerQuestion: (questionId: string, choice: AnswerChoice) => Promise<void>;
};

export function usePairPlayAnswerFlow({ answerQuestion }: UsePairPlayAnswerFlowOptions) {
  const flash = useSavedFlash({ timeoutMs: ANSWER_SAVED_FLASH_TIMEOUT_MS });

  const answerCurrentQuestion = useCallback(
    async (questionId: string, choice: AnswerChoice, questionText: string) => {
      if (flash.isSaving) return;
      try {
        flash.begin(questionId, questionText);
        await answerQuestion(questionId, choice);
        flash.success();
      } catch {
        flash.fail();
      }
    },
    [answerQuestion, flash]
  );

  return { answerQuestion: answerCurrentQuestion, flash };
}
