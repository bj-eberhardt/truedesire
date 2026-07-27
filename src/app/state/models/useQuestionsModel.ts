import { useCallback } from "react";
import type { api } from "../../../api/api";
import { acknowledgePairWelcome } from "../../../features/v3/pages/pair/pairWelcomePersistence";
import type { Identity } from "../../../state/identity";
import type { AnswerChoice, MatchPolicy, PairView } from "../../../types";
import type { QuestionsContextValue } from "../AppContexts";
import { useQuestions } from "./questions/useQuestions";

type ApiClient = ReturnType<typeof api>;

type UseQuestionsModelOptions = {
  apiClient: ApiClient | null;
  identity: Identity | null;
  pair: PairView | null;
  matchPolicy: MatchPolicy;
  clearGlobalError: () => void;
  setGlobalError: (message: string | null) => void;
  refreshCurrentPair: () => Promise<void>;
};

export function useQuestionsModel(opts: UseQuestionsModelOptions) {
  const {
    apiClient,
    identity,
    pair,
    matchPolicy,
    clearGlobalError,
    setGlobalError,
    refreshCurrentPair
  } = opts;
  const questionState = useQuestions({
    apiClient,
    identity,
    pair,
    matchPolicy,
    onAnswerLimitReached: () => {},
    refreshCurrentPair
  });
  const identityUserId = identity?.userId ?? "";
  const pairId = pair?.id ?? "";

  const answerQuestion = useCallback(
    async (questionId: string, choice: AnswerChoice) => {
      clearGlobalError();
      try {
        await questionState.answer(questionId, choice);
        if (identityUserId && pairId) {
          try {
            await acknowledgePairWelcome(identityUserId, pairId);
          } catch {
            // The answer was saved; a local UI acknowledgement failure should not undo that flow.
          }
        }
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
    [clearGlobalError, identityUserId, pairId, questionState, refreshCurrentPair, setGlobalError]
  );

  const addQuestion = useCallback(
    async (text: string, selfAnswer: AnswerChoice) => {
      clearGlobalError();
      await questionState.addQuestion(text, selfAnswer);
      if (identityUserId && pairId) {
        try {
          await acknowledgePairWelcome(identityUserId, pairId);
        } catch {
          // The question was saved; a local UI acknowledgement failure should not undo that flow.
        }
      }
    },
    [clearGlobalError, identityUserId, pairId, questionState]
  );

  const ensureSystemQuestionsSeeded = useCallback(
    async (targetPair: PairView) => {
      try {
        await questionState.ensureSystemQuestionsSeeded(targetPair);
      } catch (e: unknown) {
        setGlobalError(e instanceof Error ? e.message : String(e));
        throw e;
      }
    },
    [questionState, setGlobalError]
  );

  const loadQuestionsAndDecrypt = useCallback(
    async (pairOverride?: PairView) => {
      try {
        await questionState.loadQuestionsAndDecrypt(pairOverride);
      } catch (e: unknown) {
        setGlobalError(e instanceof Error ? e.message : String(e));
        throw e;
      }
    },
    [questionState, setGlobalError]
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
      ensureSystemQuestionsSeeded,
      loadQuestionsAndDecrypt,
      clearQuestions: questionState.clearQuestions
    },
    questions
  };
}
