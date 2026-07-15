import type { Identity } from "../../../../state/identity";
import type { PairView } from "../../../../types";
import { useCurrentPair } from "./useCurrentPair";
import { useGroupSettingsActions } from "./useGroupSettingsActions";
import { useGroupSettingsDraft } from "./useGroupSettingsDraft";
import { usePairLoader } from "./usePairLoader";
import type { ApiClient } from "./types";

type UsePairSelectionResult = {
  pair: PairView | null;
  setPair: (p: PairView | null) => void;
  weeklyLimitInput: string;
  setWeeklyLimitInput: (v: string) => void;
  allowAllQuestions: boolean;
  setAllowAllQuestions: (v: boolean) => void;
  answerLimitReached: boolean;
  isLoadingPairData: boolean;
  isLoadingGroupSettings: boolean;
  selectPair: (pairId: string) => Promise<PairView | null>;
  refreshCurrentPair: () => Promise<void>;
  refreshGroupSettingsPanel: () => Promise<void>;
  proposeWeeklyLimit: () => Promise<void>;
  respondWeeklyLimit: (action: "accept" | "reject" | "cancel") => Promise<void>;
  proposeGroupSettings: () => Promise<void>;
  respondGroupSettings: (action: "accept" | "reject" | "cancel") => Promise<void>;
  loadLastPairIfAny: (identityOverride?: Identity | null) => Promise<void>;
};

export function usePairSelection(opts: {
  apiClient: ApiClient | null;
  identity: Identity | null;
  refreshPairing: (identityOverride?: Identity) => Promise<void>;
  minLoadingMs?: number;
}): UsePairSelectionResult {
  const { apiClient, identity, refreshPairing, minLoadingMs = 1500 } = opts;
  const currentPair = useCurrentPair();
  const pairLoader = usePairLoader({
    apiClient,
    identity,
    minLoadingMs,
    pair: currentPair.pair,
    refreshPairing,
    setPair: currentPair.setPair,
    syncGroupSettingsFromPair: currentPair.syncGroupSettingsFromPair
  });
  const groupSettingsDraft = useGroupSettingsDraft();
  const groupSettingsActions = useGroupSettingsActions({
    allowAllQuestions: currentPair.allowAllQuestions,
    apiClient,
    minLoadingMs,
    pair: currentPair.pair,
    refreshCurrentPair: pairLoader.refreshCurrentPair,
    selectPair: pairLoader.selectPair,
    setIsLoadingGroupSettings: groupSettingsDraft.setIsLoadingGroupSettings,
    weeklyLimitInput: currentPair.weeklyLimitInput
  });

  return {
    pair: currentPair.pair,
    setPair: currentPair.setPair,
    weeklyLimitInput: currentPair.weeklyLimitInput,
    setWeeklyLimitInput: currentPair.setWeeklyLimitInput,
    allowAllQuestions: currentPair.allowAllQuestions,
    setAllowAllQuestions: currentPair.setAllowAllQuestions,
    answerLimitReached: currentPair.answerLimitReached,
    isLoadingPairData: pairLoader.isLoadingPairData,
    isLoadingGroupSettings: groupSettingsDraft.isLoadingGroupSettings,
    selectPair: pairLoader.selectPair,
    refreshCurrentPair: pairLoader.refreshCurrentPair,
    refreshGroupSettingsPanel: groupSettingsActions.refreshGroupSettingsPanel,
    proposeWeeklyLimit: groupSettingsActions.proposeWeeklyLimit,
    respondWeeklyLimit: groupSettingsActions.respondWeeklyLimit,
    proposeGroupSettings: groupSettingsActions.proposeGroupSettings,
    respondGroupSettings: groupSettingsActions.respondGroupSettings,
    loadLastPairIfAny: pairLoader.loadLastPairIfAny
  };
}
