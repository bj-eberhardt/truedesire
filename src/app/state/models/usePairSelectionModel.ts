import type { api } from "../../../api/api";
import { usePairSelection } from "../../../hooks/usePairSelection";
import type { Identity } from "../../../state/identity";
import type { GroupSettingsContextValue } from "../AppContexts";
import { MIN_LOADING_MS } from "./constants";

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

  const groupSettings: GroupSettingsContextValue = {
    weeklyLimitDraft: pairSelection.weeklyLimitInput,
    allowAllQuestions: pairSelection.allowAllQuestions,
    isLoadingGroupSettings: pairSelection.isLoadingGroupSettings,
    updateWeeklyLimitDraft: pairSelection.setWeeklyLimitInput,
    setQuestionsUnlimited: pairSelection.setAllowAllQuestions,
    refreshGroupSettings: pairSelection.refreshGroupSettingsPanel,
    proposeGroupSettings: pairSelection.proposeGroupSettings,
    respondGroupSettings: pairSelection.respondGroupSettings
  };

  return { pairSelection, groupSettings };
}
