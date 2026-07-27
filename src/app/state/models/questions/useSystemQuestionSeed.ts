import { useCallback, useRef, useState } from "react";
import { encryptJson } from "../../../../crypto/aead";
import type { Identity } from "../../../../state/identity";
import type { PairView } from "../../../../types";
import { deriveQuestionKey } from "./questionCrypto";
import type {
  ApiClient,
  SystemQuestionCatalogItem,
  SystemQuestionHashes,
  WeeklyQuestionAccess
} from "./types";
import { WEEKLY_QUESTIONS_UNAVAILABLE_MESSAGE } from "./useQuestionList";

function toSystemQuestionHashes(catalog: SystemQuestionCatalogItem[]): SystemQuestionHashes {
  const hashes: SystemQuestionHashes = {};
  for (const item of catalog) {
    const key = `${item.id}:${item.version}`;
    hashes[key] = [item.sha256B64];
    (hashes[item.id] ??= []).push(item.sha256B64);
  }
  return hashes;
}

export function useSystemQuestionSeed(opts: {
  apiClient: ApiClient | null;
  identity: Identity | null;
}) {
  const { apiClient, identity } = opts;
  const [systemQuestionHashes, setSystemQuestionHashes] = useState<SystemQuestionHashes>({});
  const systemQuestionHashesRef = useRef<SystemQuestionHashes>({});
  const weeklyQuestionAccessRef = useRef<WeeklyQuestionAccess | null>(null);

  const updateSystemQuestionHashes = useCallback((next: SystemQuestionHashes) => {
    systemQuestionHashesRef.current = next;
    setSystemQuestionHashes(next);
  }, []);

  const refreshSystemQuestionHashes = useCallback(async () => {
    if (!apiClient) return;
    try {
      const system = await apiClient.system.questions();
      updateSystemQuestionHashes(toSystemQuestionHashes(system.verificationCatalog));
    } catch {
      updateSystemQuestionHashes({});
    }
  }, [apiClient, updateSystemQuestionHashes]);

  const ensureSystemQuestionsSeeded = useCallback(
    async (pair: PairView) => {
      if (!apiClient || !identity?.userId) return;
      if (pair.status !== "active" || !pair.partner) return;
      weeklyQuestionAccessRef.current = null;
      const aes = await deriveQuestionKey(identity, pair);
      let system: Awaited<ReturnType<ApiClient["system"]["weeklyQuestions"]>>;
      try {
        system = await apiClient.system.weeklyQuestions(pair.id);
      } catch {
        throw new Error(WEEKLY_QUESTIONS_UNAVAILABLE_MESSAGE);
      }
      weeklyQuestionAccessRef.current = {
        weekStart: system.weekStart,
        systemQuestionIds: system.questions.map((question) => question.id),
        ownQuestionIds: system.ownQuestionIds
      };
      updateSystemQuestionHashes(toSystemQuestionHashes(system.verificationCatalog));
      const items = await Promise.all(
        system.questions.map(async (question) => ({
          systemId: question.id,
          systemVersion: question.version,
          intensityLevel: question.intensityLevel,
          blob: await encryptJson(
            aes,
            {
              text: question.text,
              systemId: question.id,
              systemVersion: question.version,
              systemHash: question.sha256B64,
              weekStart: system.weekStart,
              intensityLevel: question.intensityLevel
            },
            `love-interests|pair:${pair.id}|question|system:${question.id}:v${question.version}|week:${system.weekStart}`
          )
        }))
      );
      try {
        await apiClient.pairs.seedWeeklySystemQuestions(pair.id, system.weekStart, items);
      } catch {
        // ignore seeding errors
      }
    },
    [apiClient, identity, updateSystemQuestionHashes]
  );

  return {
    systemQuestionHashes,
    systemQuestionHashesRef,
    weeklyQuestionAccessRef,
    refreshSystemQuestionHashes,
    ensureSystemQuestionsSeeded
  };
}
