import { useCallback, useState } from "react";
import { api } from "../api/api";
import { decryptJson } from "../crypto/aead";
import { derivePairAesKey } from "../crypto/sharedKey";
import type { Identity } from "../state/identity";
import type { AnswerChoice, DecryptedQuestion, PairView, QuestionView } from "../types";

type ApiClient = ReturnType<typeof api>;

export type MatchView = {
  id: string;
  question: string;
  grade: "perfect" | "maybe" | "ok";
  answers: AnswerChoice[];
};

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
        const next: Array<{
          id: string;
          question: string;
          grade: "perfect" | "maybe" | "ok";
          answers: AnswerChoice[];
          createdAt: number;
        }> = [];
        const allAnswers = await apiClient.answers.listByPair(currentPair.id);
        const answersByQuestion: Record<string, typeof allAnswers> = {};
        for (const a of allAnswers) (answersByQuestion[a.questionId] ??= []).push(a);

        const questionSource = rawQuestionsOverride?.length
          ? rawQuestionsOverride
          : await apiClient.questions.list(currentPair.id);
        for (const q of questionSource) {
          const answers = answersByQuestion[q.id] ?? [];
          const decoded: AnswerChoice[] = [];
          for (const a of answers) {
            try {
              const payload = await decryptJson<{ answer: AnswerChoice }>(aes, a.blob);
              decoded.push(payload.answer);
            } catch {
              decoded.push("maybe");
            }
          }
          if (decoded.length < 2) continue;
          if (decoded.includes("no")) continue;

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
          let grade: "perfect" | "maybe" | "ok" = "ok";
          if (decoded.every((x) => x === "yes")) grade = "perfect";
          else if (decoded.some((x) => x === "maybe")) grade = "maybe";
          next.push({
            id: q.id,
            question: questionText,
            answers: decoded,
            grade,
            createdAt: q.createdAt
          });
        }
        next.sort((a, b) => b.createdAt - a.createdAt);
        setMatches(
          next.map((m) => ({ id: m.id, question: m.question, grade: m.grade, answers: m.answers }))
        );
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
