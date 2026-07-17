import { useCallback } from "react";
import type { Identity } from "../../../../state/identity";
import type { AnswerChoice, MatchPolicy, PairView } from "../../../../types";
import { derivePairHmacKey } from "../../../../crypto/sharedKey";
import { createMatchTokens, MATCH_POLICY_VERSION } from "../../../../domain/matches/matchTokens";
import { deriveQuestionKey, encryptAnswerBlob, encryptQuestionBlob } from "./questionCrypto";
import type { ApiClient } from "./types";

export function useQuestionActions(opts: {
  apiClient: ApiClient | null;
  identity: Identity | null;
  pair: PairView | null;
  matchPolicy: MatchPolicy;
  loadQuestionsAndDecrypt: (pairOverride?: PairView) => Promise<void>;
  onAnswerLimitReached?: (reached: boolean) => void;
  refreshCurrentPair?: () => Promise<void>;
}) {
  const {
    apiClient,
    identity,
    pair,
    matchPolicy,
    loadQuestionsAndDecrypt,
    onAnswerLimitReached,
    refreshCurrentPair
  } = opts;

  const addQuestion = useCallback(
    async (text: string, selfAnswer: AnswerChoice) => {
      if (!apiClient || !pair || !identity?.userId) return;
      if (!pair.partner) throw new Error("pair_not_complete");
      const trimmed = text.trim();
      if (!trimmed) return;
      const aes = await deriveQuestionKey(identity, pair);
      const hmacKey = await derivePairHmacKey(identity.keys.ecdhPrivateKey, pair, identity.userId);
      const blob = await encryptQuestionBlob({ aes, pairId: pair.id, text: trimmed });
      const created = await apiClient.questions.create(pair.id, blob);

      try {
        const answerBlob = await encryptAnswerBlob({
          aes,
          pairId: pair.id,
          questionId: created.id,
          answer: selfAnswer
        });
        const matchTokens = await createMatchTokens({
          hmacKey,
          pairId: pair.id,
          questionId: created.id,
          myUserId: identity.userId,
          partnerUserId: pair.partner.id,
          answer: selfAnswer,
          matchPolicy
        });
        await apiClient.answers.create(created.id, answerBlob, {
          matchTokens,
          policyVersion: MATCH_POLICY_VERSION,
          maybeCountsAsMatch: matchPolicy !== "perfectOnly"
        });
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
    [apiClient, identity, loadQuestionsAndDecrypt, matchPolicy, pair, refreshCurrentPair]
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
      if (!pair.partner) throw new Error("pair_not_complete");
      const aes = await deriveQuestionKey(identity, pair);
      const hmacKey = await derivePairHmacKey(identity.keys.ecdhPrivateKey, pair, identity.userId);
      const blob = await encryptAnswerBlob({
        aes,
        pairId: pair.id,
        questionId,
        answer: choice
      });
      const matchTokens = await createMatchTokens({
        hmacKey,
        pairId: pair.id,
        questionId,
        myUserId: identity.userId,
        partnerUserId: pair.partner.id,
        answer: choice,
        matchPolicy
      });
      try {
        await apiClient.answers.upsert(questionId, blob, {
          matchTokens,
          policyVersion: MATCH_POLICY_VERSION,
          maybeCountsAsMatch: matchPolicy !== "perfectOnly"
        });
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
    [
      apiClient,
      identity,
      loadQuestionsAndDecrypt,
      matchPolicy,
      onAnswerLimitReached,
      pair,
      refreshCurrentPair
    ]
  );

  return { addQuestion, deleteQuestion, answer };
}
