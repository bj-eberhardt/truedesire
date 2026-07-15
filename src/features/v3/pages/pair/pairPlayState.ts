import type { AnswerChoice, DecryptedQuestion, PairView } from "../../../../types";
import { getOpenQuestions, sortByCreatedAtDesc } from "../../lib/questions";

export type PairPlayFlashState = {
  savedId: string | null;
  savedText: string | null;
  showSaved: boolean;
};

export type PairPlayStateInput = {
  answerSummary: Record<string, { total: number; mine?: AnswerChoice }>;
  cardIndex: number;
  flash: PairPlayFlashState;
  identityUserId: string;
  pair: PairView | null;
  pairId: string;
  questions: DecryptedQuestion[];
  weeklyResetDateText?: string;
};

export function nextWeeklyResetDateText(now = new Date()): string {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0=Sun..6=Sat
  const daysUntilMonday = (8 - (day === 0 ? 7 : day)) % 7 || 7;
  d.setDate(d.getDate() + daysUntilMonday);
  return d.toLocaleDateString();
}

export function buildPairPlayState(input: PairPlayStateInput) {
  const { answerSummary, cardIndex, flash, identityUserId, pair, pairId, questions } = input;
  const pairReady = !!pair && pair.id === pairId;
  const weeklyLimit = pairReady ? (pair.usage?.weeklyLimit ?? pair.weeklyLimit) : 0;
  const isUnlimited = weeklyLimit === 0;
  const answeredThisWeek = pairReady ? (pair.usage?.answeredThisWeek ?? 0) : 0;
  const remainingNew = isUnlimited
    ? Number.POSITIVE_INFINITY
    : Math.max(0, weeklyLimit - answeredThisWeek);

  const baseOpen = pairReady ? getOpenQuestions(questions, answerSummary) : [];
  const unansweredAll = baseOpen.filter((question) => !answerSummary[question.id]?.mine);
  const openNonOwn = unansweredAll.filter(
    (question) => question.createdBy !== identityUserId
  ).length;
  const playedPending = baseOpen.filter((question) => !!answerSummary[question.id]?.mine);

  const unanswered =
    remainingNew > 0
      ? unansweredAll
      : unansweredAll.filter((question) => question.createdBy === identityUserId);
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
  const resetDate = input.weeklyResetDateText ?? nextWeeklyResetDateText();
  const limitNoticeText =
    openNonOwn > 0
      ? `Wochenlimit erreicht. Nach dem Wochenreset am ${resetDate} kannst du wieder neue Fragen beantworten. Es warten dann noch ${openNonOwn} offene Fragen auf dich.`
      : `Wochenlimit erreicht. Nach dem Wochenreset am ${resetDate} kannst du wieder neue Fragen beantworten.`;

  return {
    allCurrentAnswered,
    canAnswerNew,
    canNext,
    canPrev,
    currentQuestion,
    isUnlimited,
    limitNoticeText,
    ordered,
    pairReady,
    playedPending,
    remainingNew,
    safeIndex,
    showLimitNotice,
    showSavedOnlyCard,
    visibleQuestionId,
    visibleQuestionText
  };
}
