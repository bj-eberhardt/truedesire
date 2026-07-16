import { useMemo } from "react";
import {
  useGroupSettingsContext,
  usePairWorkspaceContext,
  useSessionContext
} from "../../../../app/state";

export function usePairSettingsModel() {
  const { identity } = useSessionContext();
  const { pair } = usePairWorkspaceContext();
  const groupSettings = useGroupSettingsContext();

  const canProposeSettings = useMemo(() => {
    if (!pair) return false;
    if (pair.weeklyLimitPending) return false;
    if (groupSettings.isLoadingGroupSettings) return false;
    const nextLimit = groupSettings.allowAllQuestions ? 0 : Number(groupSettings.weeklyLimitDraft);
    if (!Number.isFinite(nextLimit) || nextLimit < 0 || nextLimit > 50) return false;
    const currentLimit = pair.usage?.weeklyLimit ?? pair.weeklyLimit;
    return nextLimit !== currentLimit;
  }, [
    groupSettings.allowAllQuestions,
    groupSettings.isLoadingGroupSettings,
    groupSettings.weeklyLimitDraft,
    pair
  ]);

  return {
    allowAllQuestions: groupSettings.allowAllQuestions,
    canProposeSettings,
    isLoadingGroupSettings: groupSettings.isLoadingGroupSettings,
    isOwnPendingRequest: pair?.weeklyLimitPending?.proposedBy === identity?.userId,
    pair,
    proposeGroupSettings: groupSettings.proposeGroupSettings,
    refreshGroupSettings: groupSettings.refreshGroupSettings,
    respondGroupSettings: groupSettings.respondGroupSettings,
    setQuestionsUnlimited: groupSettings.setQuestionsUnlimited,
    updateWeeklyLimitDraft: groupSettings.updateWeeklyLimitDraft,
    weeklyLimitDraft: groupSettings.weeklyLimitDraft
  };
}

export type PairSettingsModel = ReturnType<typeof usePairSettingsModel>;
