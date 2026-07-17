import { useCallback, useState } from "react";
import type { api } from "../../../../api/api";
import { decryptJson } from "../../../../crypto/aead";
import { derivePairAesKey } from "../../../../crypto/sharedKey";
import {
  computeMatchViews,
  type MatchQuestionInput,
  type MatchView
} from "../../../../domain/matches/computeMatchViews";
import type { Identity } from "../../../../state/identity";
import type { DecryptedQuestion, PairView, QuestionView } from "../../../../types";

type ApiClient = ReturnType<typeof api>;

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
        const matchResults = await apiClient.matches.list(currentPair.id);
        const matchesByQuestionId = new Map(
          matchResults.map((match) => [match.questionId, match] as const)
        );

        const questionSource = rawQuestionsOverride?.length
          ? rawQuestionsOverride
          : await apiClient.questions.list(currentPair.id);
        const matchQuestions: MatchQuestionInput[] = [];
        for (const question of questionSource) {
          const matchResult = matchesByQuestionId.get(question.id);
          if (!matchResult) continue;

          let questionText: string =
            decryptedQuestionsOverride?.find((item) => item.id === question.id)?.text ?? "";
          if (!questionText) {
            try {
              const payload = await decryptJson<{ text?: unknown }>(aes, question.blob);
              questionText = typeof payload?.text === "string" ? payload.text : "[?]";
            } catch {
              questionText = "[?]";
            }
          }
          matchQuestions.push({
            id: question.id,
            text: questionText,
            createdAt: question.createdAt,
            grade: matchResult.grade
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
