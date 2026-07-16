import { useCallback } from "react";
import type { PairView } from "../../../../types";
import { getEffectiveWeeklyLimit, validateWeeklyLimitDraft } from "./groupSettingsState";
import type { ApiClient } from "./types";

export function useGroupSettingsActions(opts: {
  allowAllQuestions: boolean;
  apiClient: ApiClient | null;
  minLoadingMs: number;
  pair: PairView | null;
  refreshCurrentPair: () => Promise<void>;
  selectPair: (pairId: string) => Promise<PairView | null>;
  setIsLoadingGroupSettings: (loading: boolean) => void;
  weeklyLimitInput: string;
}) {
  const {
    allowAllQuestions,
    apiClient,
    minLoadingMs,
    pair,
    refreshCurrentPair,
    selectPair,
    setIsLoadingGroupSettings,
    weeklyLimitInput
  } = opts;

  const refreshGroupSettingsPanel = useCallback(async () => {
    if (!pair?.id) return;
    const startedAt = Date.now();
    setIsLoadingGroupSettings(true);
    try {
      await refreshCurrentPair();
    } finally {
      const elapsed = Date.now() - startedAt;
      if (elapsed < minLoadingMs)
        await new Promise((resolve) => window.setTimeout(resolve, minLoadingMs - elapsed));
      setIsLoadingGroupSettings(false);
    }
  }, [minLoadingMs, pair?.id, refreshCurrentPair, setIsLoadingGroupSettings]);

  const proposeWeeklyLimit = useCallback(async () => {
    if (!apiClient || !pair) return;
    const validation = validateWeeklyLimitDraft({
      allowAllQuestions: false,
      weeklyLimitDraft: weeklyLimitInput
    });
    if (!validation.ok) return;
    await apiClient.pair.proposeWeeklyLimit(pair.id, validation.limit);
    await selectPair(pair.id);
  }, [apiClient, pair, selectPair, weeklyLimitInput]);

  const proposeGroupSettings = useCallback(async () => {
    if (!apiClient || !pair) return;
    const validation = validateWeeklyLimitDraft({
      allowAllQuestions,
      weeklyLimitDraft: weeklyLimitInput
    });
    if (!validation.ok) return;
    const currentLimit = getEffectiveWeeklyLimit(pair);
    if (validation.limit === currentLimit) return;
    await apiClient.pair.proposeWeeklyLimit(pair.id, validation.limit);
    await refreshGroupSettingsPanel();
  }, [allowAllQuestions, apiClient, pair, refreshGroupSettingsPanel, weeklyLimitInput]);

  const respondWeeklyLimit = useCallback(
    async (action: "accept" | "reject" | "cancel") => {
      if (!apiClient || !pair?.weeklyLimitPending) return;
      await apiClient.pair.respondWeeklyLimit(pair.id, pair.weeklyLimitPending.id, action);
      await selectPair(pair.id);
    },
    [apiClient, pair, selectPair]
  );

  const respondGroupSettings = useCallback(
    async (action: "accept" | "reject" | "cancel") => {
      if (!apiClient || !pair?.weeklyLimitPending) return;
      await apiClient.pair.respondWeeklyLimit(pair.id, pair.weeklyLimitPending.id, action);
      await refreshGroupSettingsPanel();
    },
    [apiClient, pair, refreshGroupSettingsPanel]
  );

  return {
    proposeGroupSettings,
    proposeWeeklyLimit,
    refreshGroupSettingsPanel,
    respondGroupSettings,
    respondWeeklyLimit
  };
}
