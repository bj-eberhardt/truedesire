import { useCallback, useEffect, useState } from "react";
import { goV3Ask, goV3Played } from "../../../../app/routes";
import {
  usePairWorkspaceContext,
  useQuestionsContext,
  useSessionContext
} from "../../../../app/state";
import type { AnswerChoice, DecryptedQuestion, PairView } from "../../../../types";
import { useSwipeNav } from "../../hooks/useSwipeNav";
import { buildPairPlayState } from "./pairPlayState";
import { usePairPlayAnswerFlow } from "./usePairPlayAnswerFlow";
import { usePairPlayNavigation } from "./usePairPlayNavigation";

export { nextWeeklyResetDateText } from "./pairPlayState";

export function usePairPlayModel() {
  const { identity } = useSessionContext();
  const workspace = usePairWorkspaceContext();
  const questionsContext = useQuestionsContext();
  const pairId = workspace.route.route.pairId ?? "";
  const identityUserId = identity?.userId ?? "";
  const answerFlow = usePairPlayAnswerFlow({
    answerQuestion: questionsContext.answerQuestion
  });
  const flash = answerFlow.flash;
  const {
    cardIndex,
    goNext: setNextCardIndex,
    goPrev: setPrevCardIndex
  } = usePairPlayNavigation(pairId);
  const [stablePlayState, setStablePlayState] = useState<{
    pair: PairView;
    questions: DecryptedQuestion[];
    answerSummary: Record<string, { total: number; mine?: AnswerChoice }>;
  } | null>(null);

  const routePairReady = !!workspace.pair && workspace.pair.id === pairId;

  useEffect(() => {
    if (!workspace.isLoadingPairData && routePairReady && workspace.pair) {
      setStablePlayState({
        pair: workspace.pair,
        questions: questionsContext.questions,
        answerSummary: questionsContext.answerSummary
      });
    }
  }, [
    questionsContext.answerSummary,
    questionsContext.questions,
    routePairReady,
    workspace.isLoadingPairData,
    workspace.pair
  ]);

  const stablePlay = workspace.isLoadingPairData ? stablePlayState : null;
  const pair = stablePlay?.pair ?? workspace.pair;
  const questions = stablePlay?.questions ?? questionsContext.questions;
  const answerSummary = stablePlay?.answerSummary ?? questionsContext.answerSummary;
  const playState = buildPairPlayState({
    answerSummary,
    cardIndex,
    flash: {
      savedId: flash.savedId,
      savedText: flash.savedText,
      showSaved: flash.showSaved
    },
    identityUserId,
    pair,
    pairId,
    questions
  });
  const goPrev = useCallback(() => {
    setPrevCardIndex(playState.safeIndex);
  }, [playState.safeIndex, setPrevCardIndex]);

  const goNext = useCallback(() => {
    setNextCardIndex(playState.safeIndex, playState.ordered.length);
  }, [playState.ordered.length, playState.safeIndex, setNextCardIndex]);

  const swipe = useSwipeNav({
    enabled: playState.pairReady,
    blocked: flash.isSaving || flash.showSaved,
    canPrev: playState.canPrev,
    canNext: playState.canNext,
    onPrev: goPrev,
    onNext: goNext
  });

  return {
    allCurrentAnswered: playState.allCurrentAnswered,
    answerQuestion: answerFlow.answerQuestion,
    canAnswerNew: playState.canAnswerNew,
    canNext: playState.canNext,
    canPrev: playState.canPrev,
    currentQuestion: playState.currentQuestion,
    flash,
    goAsk: () => goV3Ask(pairId),
    goNext,
    goPlayed: () => goV3Played(pairId),
    goPrev,
    isLoadingPairData: workspace.isLoadingPairData,
    isUnlimited: playState.isUnlimited,
    limitNoticeText: playState.limitNoticeText,
    ordered: playState.ordered,
    pair,
    pairReady: playState.pairReady,
    playedPending: playState.playedPending,
    remainingNew: playState.remainingNew,
    safeIndex: playState.safeIndex,
    showLimitNotice: playState.showLimitNotice,
    showSavedOnlyCard: playState.showSavedOnlyCard,
    swipe,
    visibleQuestionId: playState.visibleQuestionId,
    visibleQuestionText: playState.visibleQuestionText
  };
}

export type PairPlayModel = ReturnType<typeof usePairPlayModel>;
