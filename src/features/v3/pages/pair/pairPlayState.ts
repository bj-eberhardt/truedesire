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

export type PartnerWeeklyProgressMessage = {
  count: number | null;
  leadingText: string;
  trailingText: string;
};

export function buildPartnerWeeklyProgressMessage(input: {
  answeredThisWeek: number;
  isUnlimited: boolean;
  partnerAnsweredThisWeek: number;
  weeklyLimit: number;
}): PartnerWeeklyProgressMessage {
  const { answeredThisWeek, isUnlimited, partnerAnsweredThisWeek, weeklyLimit } = input;
  if (!isUnlimited && answeredThisWeek >= weeklyLimit && partnerAnsweredThisWeek < weeklyLimit) {
    return {
      count: null,
      leadingText:
        "Du hast alle Wochenfragen beantwortet, dein Partner aber nicht. Lass ihn es wissen und ermuntere ihn, auch Fragen zu beantworten.",
      trailingText: ""
    };
  }
  if (partnerAnsweredThisWeek === 0) {
    return {
      count: null,
      leadingText:
        "Dein Partner hat noch nichts geantwortet. Deine Chance, der Erste zu sein und Fragen zu beantworten.",
      trailingText: ""
    };
  }
  if (answeredThisWeek === partnerAnsweredThisWeek) {
    return {
      count: null,
      leadingText:
        !isUnlimited && answeredThisWeek < weeklyLimit
          ? "Ihr seid gleichauf. Wenn du noch mindestens eine Frage beantwortest, bist du besser als dein Partner."
          : "Ihr seid gleichauf.",
      trailingText: ""
    };
  }
  if (!isUnlimited && partnerAnsweredThisWeek >= weeklyLimit) {
    return {
      count: null,
      leadingText: "Du musst dich ranhalten, dein Partner hat bereits alle Wochenfragen beantwortet.",
      trailingText: ""
    };
  }
  if (!isUnlimited && partnerAnsweredThisWeek === weeklyLimit - 1) {
    return {
      count: null,
      leadingText:
        "Du musst dich ranhalten, dein Partner hat schon fast alle Wochenfragen beantwortet.",
      trailingText: ""
    };
  }

  const answerDelta = partnerAnsweredThisWeek - answeredThisWeek;
  if (answerDelta > 0) {
    return {
      count: answerDelta,
      leadingText: "Du musst noch mindestens",
      trailingText:
        answerDelta === 1
          ? "Frage beantworten, damit du gleich viele Fragen wie dein Partner beantwortet hast."
          : "Fragen beantworten, damit du gleich viele Fragen wie dein Partner beantwortet hast."
    };
  }

  if (partnerAnsweredThisWeek === 1) {
    return {
      count: 1,
      leadingText: "Dein Partner hat diese Woche",
      trailingText: "Frage beantwortet."
    };
  }

  return {
    count: partnerAnsweredThisWeek,
    leadingText: "Dein Partner hat diese Woche",
    trailingText: "Fragen beantwortet."
  };
}

export function buildPairPlayState(input: PairPlayStateInput) {
  const { answerSummary, cardIndex, flash, identityUserId, pair, pairId, questions } = input;
  const pairReady = !!pair && pair.id === pairId;
  const weeklyLimit = pairReady ? (pair.usage?.weeklyLimit ?? pair.weeklyLimit) : 0;
  const isUnlimited = weeklyLimit === 0;
  const answeredThisWeek = pairReady ? (pair.usage?.answeredThisWeek ?? 0) : 0;
  const partnerAnsweredThisWeek = pairReady ? (pair.usage?.partnerAnsweredThisWeek ?? 0) : 0;
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
    partnerWeeklyProgressMessage: pairReady
      ? buildPartnerWeeklyProgressMessage({
          answeredThisWeek,
          isUnlimited,
          partnerAnsweredThisWeek,
          weeklyLimit
        })
      : null,
    playedPending,
    remainingNew,
    safeIndex,
    showLimitNotice,
    showSavedOnlyCard,
    visibleQuestionId,
    visibleQuestionText
  };
}
