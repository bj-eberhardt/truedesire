import { useCallback, useState, type RefObject } from "react";
import { sha256Base64 } from "../../../../crypto/sign";
import type { Identity } from "../../../../state/identity";
import type { AnswerChoice, DecryptedQuestion, PairView, QuestionView } from "../../../../types";
import {
  decryptAnswerPayload,
  decryptQuestionPayload,
  deriveQuestionKey
} from "./questionCrypto";
import type { AnswerSummary, ApiClient, SystemQuestionHashes } from "./types";

export function useQuestionList(opts: {
  apiClient: ApiClient | null;
  identity: Identity | null;
  pair: PairView | null;
  systemQuestionHashesRef: RefObject<SystemQuestionHashes>;
}) {
  const { apiClient, identity, pair, systemQuestionHashesRef } = opts;
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
      const list = await apiClient.questions.list(currentPair.id);
      setRawQuestions(list);

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
      setQuestions(decoded.sort((a, b) => b.createdAt - a.createdAt));

      const allAnswers = await apiClient.answers.listByPair(currentPair.id);
      const answersByQuestion: Record<string, typeof allAnswers> = {};
      for (const answer of allAnswers) (answersByQuestion[answer.questionId] ??= []).push(answer);

      const summary: AnswerSummary = {};
      for (const question of list) {
        const answers = answersByQuestion[question.id] ?? [];
        const total = answers.length;
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
    [apiClient, identity, pair, systemQuestionHashesRef]
  );

  return { questions, rawQuestions, answerSummary, clearQuestions, loadQuestionsAndDecrypt };
}
