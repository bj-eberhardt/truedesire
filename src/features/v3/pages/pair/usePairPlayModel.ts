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
import { getOpenQuestions, sortByCreatedAtDesc } from "../../lib/questions";

export function nextWeeklyResetDateText(now = new Date()): string {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0=Sun..6=Sat
  const daysUntilMonday = (8 - (day === 0 ? 7 : day)) % 7 || 7;
  d.setDate(d.getDate() + daysUntilMonday);
  return d.toLocaleDateString();
}

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
  const pairReady = !!pair && pair.id === pairId;

  const weeklyLimit = pairReady ? (pair.usage?.weeklyLimit ?? pair.weeklyLimit) : 0;
  const isUnlimited = weeklyLimit === 0;
  const answeredThisWeek = pairReady ? (pair.usage?.answeredThisWeek ?? 0) : 0;
  const remainingNew = isUnlimited
    ? Number.POSITIVE_INFINITY
    : Math.max(0, weeklyLimit - answeredThisWeek);

  const baseOpen = pairReady ? getOpenQuestions(questions, answerSummary) : [];
  const unansweredAll = baseOpen.filter((q) => !answerSummary[q.id]?.mine);
  const openNonOwn = unansweredAll.filter((q) => q.createdBy !== identityUserId).length;
  const playedPending = baseOpen.filter((q) => !!answerSummary[q.id]?.mine);

  const unanswered =
    remainingNew > 0 ? unansweredAll : unansweredAll.filter((q) => q.createdBy === identityUserId);
  const ordered = sortByCreatedAtDesc(unanswered);

  const safeIndex = Math.min(cardIndex, Math.max(0, ordered.length - 1));
  const currentQuestion = ordered[safeIndex];
  const showSavedOnlyCard = flash.showSaved && !currentQuestion && !!flash.savedId;
  const visibleQuestionId = currentQuestion?.id ?? flash.savedId ?? "";
  const visibleQuestionText = currentQuestion
    ? flash.showSaved
      ? (flash.savedText ?? currentQuestion.text)
      : currentQuestion.text
    : (flash.savedText ?? "");
  const canAnswerNew = currentQuestion
    ? currentQuestion.createdBy === identityUserId || remainingNew > 0
    : false;
  const canPrev = !!currentQuestion && safeIndex > 0;
  const canNext = !!currentQuestion && safeIndex < ordered.length - 1;

  const showLimitNotice = !flash.showSaved && !isUnlimited && remainingNew === 0 && openNonOwn > 0;
  const allCurrentAnswered = questions.length > 0 && unansweredAll.length === 0 && openNonOwn === 0;
  const limitNoticeText =
    openNonOwn > 0
      ? `Wochenlimit erreicht. Nach dem Wochenreset am ${nextWeeklyResetDateText()} kannst du wieder neue Fragen beantworten. Es warten dann noch ${openNonOwn} offene Fragen auf dich.`
      : `Wochenlimit erreicht. Nach dem Wochenreset am ${nextWeeklyResetDateText()} kannst du wieder neue Fragen beantworten.`;

  const goPrev = useCallback(() => {
    setCardIndex(Math.max(0, safeIndex - 1));
  }, [safeIndex]);

  const goNext = useCallback(() => {
    setCardIndex(Math.min(ordered.length - 1, safeIndex + 1));
  }, [ordered.length, safeIndex]);

  const swipe = useSwipeNav({
    enabled: pairReady,
    blocked: flash.isSaving || flash.showSaved,
    canPrev,
    canNext,
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
    allCurrentAnswered,
    answerQuestion,
    canAnswerNew,
    canNext,
    canPrev,
    currentQuestion,
    flash,
    goAsk: () => goV3Ask(pairId),
    goNext,
    goPlayed: () => goV3Played(pairId),
    goPrev,
    isLoadingPairData: workspace.isLoadingPairData,
    isUnlimited,
    limitNoticeText,
    ordered,
    pair,
    pairReady,
    playedPending,
    remainingNew,
    safeIndex,
    showLimitNotice,
    showSavedOnlyCard,
    swipe,
    visibleQuestionId,
    visibleQuestionText
  };
}
