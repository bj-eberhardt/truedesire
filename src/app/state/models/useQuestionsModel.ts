import { useCallback } from "react";
import type { api } from "../../../api/api";
import { useQuestions } from "../../../hooks/useQuestions";
import type { Identity } from "../../../state/identity";
import type { AnswerChoice, PairView } from "../../../types";
import type { QuestionsContextValue } from "../AppContexts";

type ApiClient = ReturnType<typeof api>;

type UseQuestionsModelOptions = {
  apiClient: ApiClient | null;
  identity: Identity | null;
  pair: PairView | null;
  clearGlobalError: () => void;
  setGlobalError: (message: string | null) => void;
  refreshCurrentPair: () => Promise<void>;
};

export function useQuestionsModel(opts: UseQuestionsModelOptions) {
  const {
    apiClient,
    identity,
    pair,
    clearGlobalError,
    setGlobalError,
    refreshCurrentPair
  } = opts;
  const questionState = useQuestions({
    apiClient,
    identity,
    pair,
    onAnswerLimitReached: () => {},
    refreshCurrentPair
  });

  const answerQuestion = useCallback(
    async (questionId: string, choice: AnswerChoice) => {
      clearGlobalError();
      try {
        await questionState.answer(questionId, choice);
      } catch (e: unknown) {
        setGlobalError(e instanceof Error ? e.message : String(e));
        try {
          await refreshCurrentPair();
          await questionState.loadQuestionsAndDecrypt();
        } catch {
          // ignore refresh errors after answer failure
        }
        throw e;
      }
    },
    [clearGlobalError, questionState, refreshCurrentPair, setGlobalError]
  );

  const addQuestion = useCallback(
    async (text: string, selfAnswer: AnswerChoice) => {
      clearGlobalError();
      await questionState.addQuestion(text, selfAnswer);
    },
    [clearGlobalError, questionState]
  );

  const questions: QuestionsContextValue = {
    questions: questionState.questions,
    answerSummary: questionState.answerSummary,
    answerQuestion,
    addQuestion
  };

  return {
    questionActions: {
      refreshSystemQuestionHashes: questionState.refreshSystemQuestionHashes,
      ensureSystemQuestionsSeeded: questionState.ensureSystemQuestionsSeeded,
      loadQuestionsAndDecrypt: questionState.loadQuestionsAndDecrypt,
      clearQuestions: questionState.clearQuestions
    },
    questions
  };
}
