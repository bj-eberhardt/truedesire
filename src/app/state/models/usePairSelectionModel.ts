import { useCallback } from "react";
import type { api } from "../../../api/api";
import type { Identity } from "../../../state/identity";
import type { GroupSettingsContextValue } from "../AppContexts";
import { MIN_LOADING_MS } from "./constants";
import { usePairSelection } from "./pair-selection/usePairSelection";
import { useMatchPolicySettings } from "./pair-selection/usePersonalMatchSettings";

type ApiClient = ReturnType<typeof api>;

type UsePairSelectionModelOptions = {
  apiClient: ApiClient | null;
  identity: Identity | null;
  refreshPairing: (identityOverride?: Identity) => Promise<void>;
};

export function usePairSelectionModel(opts: UsePairSelectionModelOptions) {
  const pairSelection = usePairSelection({
    apiClient: opts.apiClient,
    identity: opts.identity,
    refreshPairing: opts.refreshPairing,
    minLoadingMs: MIN_LOADING_MS
  });
  const matchPolicySettings = useMatchPolicySettings(
    opts.apiClient,
    pairSelection.pair,
    pairSelection.refreshGroupSettingsPanel
  );

  const refreshGroupSettings = useCallback(async () => {
    await pairSelection.refreshGroupSettingsPanel();
    await matchPolicySettings.reloadMatchPolicy();
  }, [matchPolicySettings, pairSelection]);

  const groupSettings: GroupSettingsContextValue = {
    weeklyLimitDraft: pairSelection.weeklyLimitInput,
    allowAllQuestions: pairSelection.allowAllQuestions,
    matchPolicy: matchPolicySettings.matchPolicy,
    matchPolicyDraft: matchPolicySettings.matchPolicyDraft,
    isLoadingGroupSettings:
      pairSelection.isLoadingGroupSettings || matchPolicySettings.isLoadingMatchPolicy,
    updateWeeklyLimitDraft: pairSelection.setWeeklyLimitInput,
    setQuestionsUnlimited: pairSelection.setAllowAllQuestions,
    updateMatchPolicyDraft: matchPolicySettings.updateMatchPolicyDraft,
    refreshGroupSettings,
    proposeGroupSettings: pairSelection.proposeGroupSettings,
    respondGroupSettings: pairSelection.respondGroupSettings,
    proposeMatchPolicy: matchPolicySettings.proposeMatchPolicy,
    respondMatchPolicy: matchPolicySettings.respondMatchPolicy
  };

  return { pairSelection, groupSettings };
}
