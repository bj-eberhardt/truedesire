import { useCallback, useRef, useState } from "react";
import { encryptJson } from "../../../../crypto/aead";
import type { Identity } from "../../../../state/identity";
import type { PairView } from "../../../../types";
import { deriveQuestionKey } from "./questionCrypto";
import type { ApiClient, SystemQuestionCatalogItem, SystemQuestionHashes } from "./types";

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
      try {
        if (pair.seededSystemQuestionsAt) return;
        const aes = await deriveQuestionKey(identity, pair);
        const system = await apiClient.system.questions();
        updateSystemQuestionHashes(toSystemQuestionHashes(system.verificationCatalog));
        const items = await Promise.all(
          system.questions.map(async (question) => ({
            systemId: question.id,
            systemVersion: question.version,
            blob: await encryptJson(
              aes,
              {
                text: question.text,
                systemId: question.id,
                systemVersion: question.version,
                systemHash: question.sha256B64
              },
              `love-interests|pair:${pair.id}|question|system:${question.id}:v${question.version}`
            )
          }))
        );
        await apiClient.pairs.seedSystemQuestions(pair.id, items);
      } catch {
        // ignore seeding errors
      }
    },
    [apiClient, identity, updateSystemQuestionHashes]
  );

  return {
    systemQuestionHashes,
    systemQuestionHashesRef,
    refreshSystemQuestionHashes,
    ensureSystemQuestionsSeeded
  };
}
