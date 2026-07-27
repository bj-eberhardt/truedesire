import { useCallback, useState, type RefObject } from "react";
import { sha256Base64 } from "../../../../crypto/sign";
import type { Identity } from "../../../../state/identity";
import type { AnswerChoice, DecryptedQuestion, PairView, QuestionView } from "../../../../types";
import { decryptAnswerPayload, decryptQuestionPayload, deriveQuestionKey } from "./questionCrypto";
import type { AnswerSummary, ApiClient, SystemQuestionHashes, WeeklyQuestionAccess } from "./types";

export const WEEKLY_QUESTIONS_UNAVAILABLE_MESSAGE =
  "Die Wochenfragen konnten nicht geladen werden. Bitte lade die Ansicht neu.";

type QuestionAnswerStatus = { total: number; mine: boolean };

export function isQuestionVisibleForWeeklyAccess(
  question: QuestionView,
  weeklyAccess: WeeklyQuestionAccess | null,
  answerStatus?: QuestionAnswerStatus
): boolean {
  if (!weeklyAccess) return true;
  if (
    question.systemQuestionId &&
    question.systemWeekStart === weeklyAccess.weekStart &&
    weeklyAccess.systemQuestionIds.includes(question.systemQuestionId)
  ) {
    return true;
  }
  if (weeklyAccess.ownQuestionIds.includes(question.id)) return true;
  return (answerStatus?.total ?? 0) > 0 && !answerStatus?.mine;
}

export function useQuestionList(opts: {
  apiClient: ApiClient | null;
  identity: Identity | null;
  pair: PairView | null;
  systemQuestionHashesRef: RefObject<SystemQuestionHashes>;
  weeklyQuestionAccessRef: RefObject<WeeklyQuestionAccess | null>;
}) {
  const { apiClient, identity, pair, systemQuestionHashesRef, weeklyQuestionAccessRef } = opts;
  const [questions, setQuestions] = useState<DecryptedQuestion[]>([]);
  const [rawQuestions, setRawQuestions] = useState<QuestionView[]>([]);
  const [answerSummary, setAnswerSummary] = useState<AnswerSummary>({});

  const clearQuestions = useCallback(() => {
    setQuestions([]);
    setRawQuestions([]);
    setAnswerSummary({});
  }, []);

  const loadQuestionsAndDecrypt = useCallback(
    async (pairOverride?: PairView) => {
      const currentPair = pairOverride ?? pair;
      if (!apiClient || !currentPair || !identity?.userId) return;
      const weeklyAccess = weeklyQuestionAccessRef.current;
      if (currentPair.status === "active" && currentPair.partner && !weeklyAccess) {
        setQuestions([]);
        setRawQuestions([]);
        setAnswerSummary({});
        throw new Error(WEEKLY_QUESTIONS_UNAVAILABLE_MESSAGE);
      }
      const list = await apiClient.questions.list(currentPair.id);
      setRawQuestions(list);
      const allAnswers = await apiClient.answers.listByPair(currentPair.id);
      const answerStatuses = await apiClient.answers.statusByPair(currentPair.id);
      const statusByQuestion = new Map(
        answerStatuses.map((status) => [status.questionId, status] as const)
      );

      const aes = await deriveQuestionKey(identity, currentPair);
      const decoded: DecryptedQuestion[] = [];
      for (const question of list) {
        try {
          const payload = await decryptQuestionPayload(question.blob, aes);
          const text = typeof payload?.text === "string" ? payload.text : "[?]";
          let textSuffix = "";
          if (payload?.systemId && payload?.systemHash) {
            const systemId = String(payload.systemId);
            const version =
              typeof payload.systemVersion === "number" && Number.isInteger(payload.systemVersion)
                ? payload.systemVersion
                : null;
            const verificationHashes = systemQuestionHashesRef.current;
            const expected = version
              ? (verificationHashes[`${systemId}:${version}`] ?? [])
              : (verificationHashes[systemId] ?? []);
            const actual = await sha256Base64(text);
            const hash = String(payload.systemHash);
            const ok = expected.includes(hash) && hash === actual;
            textSuffix = ok ? "" : " (nicht verifiziert)";
          }
          decoded.push({ ...question, text: text + textSuffix });
        } catch {
          decoded.push({ ...question, text: "[Entschlüsselung fehlgeschlagen]" });
        }
      }
      const weeklyQuestions = weeklyAccess
        ? decoded.filter((question) =>
            isQuestionVisibleForWeeklyAccess(
              question,
              weeklyAccess,
              statusByQuestion.get(question.id)
            )
          )
        : decoded;
      setQuestions(weeklyQuestions.sort((a, b) => b.createdAt - a.createdAt));

      const answersByQuestion: Record<string, typeof allAnswers> = {};
      for (const answer of allAnswers) (answersByQuestion[answer.questionId] ??= []).push(answer);

      const summary: AnswerSummary = {};
      for (const question of list) {
        const answers = answersByQuestion[question.id] ?? [];
        const total = statusByQuestion.get(question.id)?.total ?? answers.length;
        let mine: AnswerChoice | undefined;
        for (const answer of answers) {
          if (answer.userId !== identity.userId) continue;
          try {
            mine = await decryptAnswerPayload(answer.blob, aes);
          } catch {
            // ignore
          }
        }
        summary[question.id] = { total, mine };
      }
      setAnswerSummary(summary);
    },
    [apiClient, identity, pair, systemQuestionHashesRef, weeklyQuestionAccessRef]
  );

  return { questions, rawQuestions, answerSummary, clearQuestions, loadQuestionsAndDecrypt };
}
