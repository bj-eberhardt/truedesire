import { useCallback, useEffect, useState } from "react";
import { goV3Ask, goV3Played } from "../../../../app/routes";
import {
  usePairWorkspaceContext,
  useQuestionsContext,
  useSessionContext
} from "../../../../app/state";
import type { AnswerChoice, DecryptedQuestion, PairView } from "../../../../types";
import { ANSWER_SAVED_FLASH_TIMEOUT_MS, useSavedFlash } from "../../hooks/useSavedFlash";
import { useSwipeNav } from "../../hooks/useSwipeNav";
import { buildPairPlayState } from "./pairPlayState";

export { nextWeeklyResetDateText } from "./pairPlayState";

export function usePairPlayModel() {
  const { identity } = useSessionContext();
  const workspace = usePairWorkspaceContext();
  const questionsContext = useQuestionsContext();
  const pairId = workspace.route.route.pairId ?? "";
  const identityUserId = identity?.userId ?? "";
  const [cardIndex, setCardIndex] = useState(0);
  const flash = useSavedFlash({ timeoutMs: ANSWER_SAVED_FLASH_TIMEOUT_MS });
  const [stablePlayState, setStablePlayState] = useState<{
    pair: PairView;
    questions: DecryptedQuestion[];
    answerSummary: Record<string, { total: number; mine?: AnswerChoice }>;
  } | null>(null);

  useEffect(() => setCardIndex(0), [pairId]);

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
    setCardIndex(Math.max(0, playState.safeIndex - 1));
  }, [playState.safeIndex]);

  const goNext = useCallback(() => {
    setCardIndex(Math.min(playState.ordered.length - 1, playState.safeIndex + 1));
  }, [playState.ordered.length, playState.safeIndex]);

  const swipe = useSwipeNav({
    enabled: playState.pairReady,
    blocked: flash.isSaving || flash.showSaved,
    canPrev: playState.canPrev,
    canNext: playState.canNext,
    onPrev: goPrev,
    onNext: goNext
  });

  const answerQuestion = useCallback(
    async (questionId: string, choice: AnswerChoice, questionText: string) => {
      if (flash.isSaving) return;
      try {
        flash.begin(questionId, questionText);
        await questionsContext.answerQuestion(questionId, choice);
        flash.success();
      } catch (_e: unknown) {
        flash.fail();
      }
    },
    [flash, questionsContext]
  );

  return {
    allCurrentAnswered: playState.allCurrentAnswered,
    answerQuestion,
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
