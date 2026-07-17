import { useCallback } from "react";
import type { api } from "../../../../api/api";
import type { Identity } from "../../../../state/identity";
import type {
  AnswerChoice,
  DecryptedQuestion,
  MatchPolicy,
  PairView,
  QuestionView
} from "../../../../types";
import { useQuestionActions } from "./useQuestionActions";
import { useQuestionList } from "./useQuestionList";
import { useSystemQuestionSeed } from "./useSystemQuestionSeed";
import type { AnswerSummary, SystemQuestionHashes } from "./types";

type ApiClient = ReturnType<typeof api>;

type UseQuestionsResult = {
  questions: DecryptedQuestion[];
  rawQuestions: QuestionView[];
  answerSummary: AnswerSummary;
  systemQuestionHashes: SystemQuestionHashes;
  refreshSystemQuestionHashes: () => Promise<void>;
  ensureSystemQuestionsSeeded: (pair: PairView) => Promise<void>;
  loadQuestionsAndDecrypt: (pairOverride?: PairView) => Promise<void>;
  addQuestion: (text: string, selfAnswer: AnswerChoice) => Promise<void>;
  deleteQuestion: (questionId: string) => Promise<void>;
  answer: (questionId: string, choice: AnswerChoice) => Promise<void>;
  isPartnerAnswered: (questionId: string) => boolean;
  clearQuestions: () => void;
};

export function useQuestions(opts: {
  apiClient: ApiClient | null;
  identity: Identity | null;
  pair: PairView | null;
  matchPolicy: MatchPolicy;
  onAnswerLimitReached?: (reached: boolean) => void;
  refreshCurrentPair?: () => Promise<void>;
}): UseQuestionsResult {
  const { apiClient, identity, pair, matchPolicy, onAnswerLimitReached, refreshCurrentPair } = opts;
  const systemQuestions = useSystemQuestionSeed({ apiClient, identity });
  const questionList = useQuestionList({
    apiClient,
    identity,
    pair,
    systemQuestionHashesRef: systemQuestions.systemQuestionHashesRef
  });
  const questionActions = useQuestionActions({
    apiClient,
    identity,
    pair,
    matchPolicy,
    loadQuestionsAndDecrypt: questionList.loadQuestionsAndDecrypt,
    onAnswerLimitReached,
    refreshCurrentPair
  });

  const isPartnerAnswered = useCallback(
    (questionId: string): boolean => {
      const summary = questionList.answerSummary[questionId];
      if (!summary) return false;
      if (summary.total >= 2) return true;
      if (summary.total === 1 && !summary.mine) return true;
      return false;
    },
    [questionList.answerSummary]
  );

  return {
    questions: questionList.questions,
    rawQuestions: questionList.rawQuestions,
    answerSummary: questionList.answerSummary,
    systemQuestionHashes: systemQuestions.systemQuestionHashes,
    refreshSystemQuestionHashes: systemQuestions.refreshSystemQuestionHashes,
    ensureSystemQuestionsSeeded: systemQuestions.ensureSystemQuestionsSeeded,
    loadQuestionsAndDecrypt: questionList.loadQuestionsAndDecrypt,
    addQuestion: questionActions.addQuestion,
    deleteQuestion: questionActions.deleteQuestion,
    answer: questionActions.answer,
    isPartnerAnswered,
    clearQuestions: questionList.clearQuestions
  };
}
