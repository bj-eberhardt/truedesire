import { useCallback, useState } from "react";
import { api } from "../api/api";
import { decryptJson, encryptJson } from "../crypto/aead";
import { derivePairAesKey } from "../crypto/sharedKey";
import { sha256Base64 } from "../crypto/sign";
import type { Identity } from "../state/identity";
import type { AnswerChoice, DecryptedQuestion, PairView, QuestionView } from "../types";

type ApiClient = ReturnType<typeof api>;

type AnswerSummary = Record<string, { total: number; mine?: AnswerChoice }>;

type UseQuestionsResult = {
  questions: DecryptedQuestion[];
  rawQuestions: QuestionView[];
  answerSummary: AnswerSummary;
  systemQuestionHashes: Record<string, string>;
  refreshSystemQuestionHashes: () => Promise<void>;
  ensureSystemQuestionsSeeded: (pair: PairView) => Promise<void>;
  loadQuestionsAndDecrypt: (pairOverride?: PairView) => Promise<void>;
  addQuestion: (text: string, selfAnswer: AnswerChoice) => Promise<void>;
  deleteQuestion: (questionId: string) => Promise<void>;
  answer: (questionId: string, choice: AnswerChoice) => Promise<void>;
  isPartnerAnswered: (questionId: string) => boolean;
  clearQuestions: () => void;
};

export function useQuestions(opts: {
  apiClient: ApiClient | null;
  identity: Identity | null;
  pair: PairView | null;
  onAnswerLimitReached?: (reached: boolean) => void;
  refreshCurrentPair?: () => Promise<void>;
}): UseQuestionsResult {
  const { apiClient, identity, pair, onAnswerLimitReached, refreshCurrentPair } = opts;
  const [questions, setQuestions] = useState<DecryptedQuestion[]>([]);
  const [rawQuestions, setRawQuestions] = useState<QuestionView[]>([]);
  const [answerSummary, setAnswerSummary] = useState<AnswerSummary>({});
  const [systemQuestionHashes, setSystemQuestionHashes] = useState<Record<string, string>>({});

  const clearQuestions = useCallback(() => {
    setQuestions([]);
    setRawQuestions([]);
    setAnswerSummary({});
  }, []);

  const refreshSystemQuestionHashes = useCallback(async () => {
    if (!apiClient) return;
    try {
      const system = await apiClient.system.questions();
      setSystemQuestionHashes(Object.fromEntries(system.questions.map((q) => [q.id, q.sha256B64])));
    } catch {
      setSystemQuestionHashes({});
    }
  }, [apiClient]);

  const ensureSystemQuestionsSeeded = useCallback(
    async (p: PairView) => {
      if (!apiClient || !identity?.userId) return;
      if (p.status !== "active" || !p.partner) return;
      try {
        if (p.seededSystemQuestionsAt) return;
        const aes = await derivePairAesKey(identity.keys.ecdhPrivateKey, p, identity.userId);
        const system = await apiClient.system.questions();
        setSystemQuestionHashes(
          Object.fromEntries(system.questions.map((q) => [q.id, q.sha256B64]))
        );
        const items = await Promise.all(
          system.questions.map(async (q) => ({
            systemId: q.id,
            blob: await encryptJson(
              aes,
              { text: q.text, systemId: q.id, systemHash: q.sha256B64 },
              `love-interests|pair:${p.id}|question|system:${q.id}`
            )
          }))
        );
        await apiClient.pairs.seedSystemQuestions(p.id, items);
      } catch {
        // ignore seeding errors
      }
    },
    [apiClient, identity?.keys.ecdhPrivateKey, identity?.userId]
  );

  const loadQuestionsAndDecrypt = useCallback(
    async (pairOverride?: PairView) => {
      const p = pairOverride ?? pair;
      if (!apiClient || !p || !identity?.userId) return;
      const list = await apiClient.questions.list(p.id);
      setRawQuestions(list);

      const aes = await derivePairAesKey(identity.keys.ecdhPrivateKey, p, identity.userId);
      const decoded: DecryptedQuestion[] = [];
      for (const q of list) {
        try {
          const payload = await decryptJson<{
            text?: unknown;
            systemId?: unknown;
            systemHash?: unknown;
          }>(aes, q.blob);
          const text = typeof payload?.text === "string" ? payload.text : "[?]";
          let textSuffix = "";
          if (payload?.systemId && payload?.systemHash) {
            const expected = systemQuestionHashes[String(payload.systemId)];
            const actual = await sha256Base64(text);
            const ok = expected && expected === String(payload.systemHash) && expected === actual;
            textSuffix = ok ? "" : " (nicht verifiziert)";
          }
          decoded.push({ ...q, text: text + textSuffix });
        } catch {
          decoded.push({ ...q, text: "[Entschlüsselung fehlgeschlagen]" });
        }
      }
      setQuestions(decoded.sort((a, b) => b.createdAt - a.createdAt));

      const allAnswers = await apiClient.answers.listByPair(p.id);
      const answersByQuestion: Record<string, typeof allAnswers> = {};
      for (const a of allAnswers) (answersByQuestion[a.questionId] ??= []).push(a);

      const summary: AnswerSummary = {};
      for (const q of list) {
        const answers = answersByQuestion[q.id] ?? [];
        const total = answers.length;
        let mine: AnswerChoice | undefined;
        for (const a of answers) {
          if (a.userId !== identity.userId) continue;
          try {
            const payload = await decryptJson<{ answer: AnswerChoice }>(aes, a.blob);
            mine = payload.answer;
          } catch {
            // ignore
          }
        }
        summary[q.id] = { total, mine };
      }
      setAnswerSummary(summary);
    },
    [apiClient, identity, pair, systemQuestionHashes]
  );

  const addQuestion = useCallback(
    async (text: string, selfAnswer: AnswerChoice) => {
      if (!apiClient || !pair || !identity?.userId) return;
      const trimmed = text.trim();
      if (!trimmed) return;
      const aes = await derivePairAesKey(identity.keys.ecdhPrivateKey, pair, identity.userId);
      const blob = await encryptJson(
        aes,
        { text: trimmed },
        `love-interests|pair:${pair.id}|question`
      );
      const created = await apiClient.questions.create(pair.id, blob);

      try {
        const answerBlob = await encryptJson(
          aes,
          { answer: selfAnswer },
          `love-interests|pair:${pair.id}|answer|q:${created.id}`
        );
        await apiClient.answers.create(created.id, answerBlob);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg === "weekly_limit_reached") {
          throw new Error(
            "Frage erstellt, aber Wochenlimit fürs Antworten erreicht (deine Antwort wurde nicht gespeichert)."
          );
        }
        if (msg !== "already_answered") {
          throw new Error(`Frage erstellt, aber Antwort konnte nicht gespeichert werden: ${msg}`);
        }
      }

      await refreshCurrentPair?.();
      await loadQuestionsAndDecrypt();
    },
    [apiClient, identity, loadQuestionsAndDecrypt, pair, refreshCurrentPair]
  );

  const deleteQuestion = useCallback(
    async (questionId: string) => {
      if (!apiClient) return;
      await apiClient.questions.delete(questionId);
      await loadQuestionsAndDecrypt();
    },
    [apiClient, loadQuestionsAndDecrypt]
  );

  const answer = useCallback(
    async (questionId: string, choice: AnswerChoice) => {
      if (!apiClient || !pair || !identity?.userId) return;
      const aes = await derivePairAesKey(identity.keys.ecdhPrivateKey, pair, identity.userId);
      const blob = await encryptJson(
        aes,
        { answer: choice },
        `love-interests|pair:${pair.id}|answer|q:${questionId}`
      );
      try {
        await apiClient.answers.upsert(questionId, blob);
        onAnswerLimitReached?.(false);
        await refreshCurrentPair?.();
        await loadQuestionsAndDecrypt();
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg === "weekly_limit_reached") {
          onAnswerLimitReached?.(true);
          throw new Error(
            "Wochenlimit fürs Antworten erreicht. Du kannst diese Woche keine weiteren Antworten abgeben."
          );
        }
        if (msg === "cannot_update_after_partner_answer") {
          throw new Error(
            "Dein Partner hat bereits geantwortet. Deine Antwort ist jetzt gesperrt und kann nicht mehr geändert werden."
          );
        }
        throw new Error(msg);
      }
    },
    [apiClient, identity, loadQuestionsAndDecrypt, onAnswerLimitReached, pair, refreshCurrentPair]
  );

  const isPartnerAnswered = useCallback(
    (questionId: string): boolean => {
      const s = answerSummary[questionId];
      if (!s) return false;
      if (s.total >= 2) return true;
      if (s.total === 1 && !s.mine) return true;
      return false;
    },
    [answerSummary]
  );

  return {
    questions,
    rawQuestions,
    answerSummary,
    systemQuestionHashes,
    refreshSystemQuestionHashes,
    ensureSystemQuestionsSeeded,
    loadQuestionsAndDecrypt,
    addQuestion,
    deleteQuestion,
    answer,
    isPartnerAnswered,
    clearQuestions
  };
}
