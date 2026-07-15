import { useCallback, useState } from "react";
import { api } from "../api/api";
import { decryptJson } from "../crypto/aead";
import { derivePairAesKey } from "../crypto/sharedKey";
import {
  computeMatchViews,
  type MatchQuestionInput,
  type MatchView
} from "../domain/matches/computeMatchViews";
import type { Identity } from "../state/identity";
import type { AnswerChoice, DecryptedQuestion, PairView, QuestionView } from "../types";

type ApiClient = ReturnType<typeof api>;

export type { MatchView } from "../domain/matches/computeMatchViews";

function isAnswerChoice(value: unknown): value is AnswerChoice {
  return value === "yes" || value === "no" || value === "maybe";
}

type UseMatchesResult = {
  matches: MatchView[];
  isLoadingMatches: boolean;
  clearMatches: () => void;
  computeMatches: (
    pairOverride?: PairView,
    rawQuestionsOverride?: QuestionView[],
    decryptedQuestionsOverride?: DecryptedQuestion[]
  ) => Promise<void>;
};

export function useMatches(opts: {
  apiClient: ApiClient | null;
  identity: Identity | null;
  pair: PairView | null;
  minLoadingMs?: number;
}) {
  const { apiClient, identity, pair, minLoadingMs = 1500 } = opts;
  const [matches, setMatches] = useState<MatchView[]>([]);
  const [isLoadingMatches, setIsLoadingMatches] = useState(false);

  const clearMatches = useCallback(() => setMatches([]), []);

  const computeMatches = useCallback(
    async (
      pairOverride?: PairView,
      rawQuestionsOverride?: QuestionView[],
      decryptedQuestionsOverride?: DecryptedQuestion[]
    ) => {
      const currentPair = pairOverride ?? pair;
      if (!apiClient || !currentPair || !identity?.userId) return;
      const startedAt = Date.now();
      setIsLoadingMatches(true);
      try {
        const aes = await derivePairAesKey(
          identity.keys.ecdhPrivateKey,
          currentPair,
          identity.userId
        );
        const allAnswers = await apiClient.answers.listByPair(currentPair.id);
        const answersByQuestion: Record<string, typeof allAnswers> = {};
        for (const a of allAnswers) (answersByQuestion[a.questionId] ??= []).push(a);

        const questionSource = rawQuestionsOverride?.length
          ? rawQuestionsOverride
          : await apiClient.questions.list(currentPair.id);
        const matchQuestions: MatchQuestionInput[] = [];
        for (const q of questionSource) {
          const answers = answersByQuestion[q.id] ?? [];
          const decoded: AnswerChoice[] = [];
          let hasInvalidAnswer = false;
          for (const a of answers) {
            try {
              const payload = await decryptJson<{ answer?: unknown }>(aes, a.blob);
              if (!isAnswerChoice(payload.answer)) {
                hasInvalidAnswer = true;
                break;
              }
              decoded.push(payload.answer);
            } catch {
              hasInvalidAnswer = true;
              break;
            }
          }
          if (hasInvalidAnswer) continue;

          let questionText: string =
            decryptedQuestionsOverride?.find((x) => x.id === q.id)?.text ?? "";
          if (!questionText) {
            try {
              const payload = await decryptJson<{ text?: unknown }>(aes, q.blob);
              questionText = typeof payload?.text === "string" ? payload.text : "[?]";
            } catch {
              questionText = "[?]";
            }
          }
          matchQuestions.push({
            id: q.id,
            text: questionText,
            createdAt: q.createdAt,
            answers: decoded
          });
        }
        setMatches(computeMatchViews(matchQuestions));
      } finally {
        const elapsed = Date.now() - startedAt;
        if (elapsed < minLoadingMs)
          await new Promise((resolve) => window.setTimeout(resolve, minLoadingMs - elapsed));
        setIsLoadingMatches(false);
      }
    },
    [apiClient, identity, minLoadingMs, pair]
  );

  return { matches, isLoadingMatches, clearMatches, computeMatches } satisfies UseMatchesResult;
}
