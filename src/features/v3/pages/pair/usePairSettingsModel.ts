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

  const canProposeWeeklyLimit = useMemo(() => {
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

  const canProposeMatchPolicy = useMemo(() => {
    if (!pair) return false;
    if (pair.matchPolicyPending) return false;
    if (groupSettings.isLoadingGroupSettings) return false;
    return groupSettings.matchPolicyDraft !== groupSettings.matchPolicy;
  }, [
    groupSettings.isLoadingGroupSettings,
    groupSettings.matchPolicy,
    groupSettings.matchPolicyDraft,
    pair
  ]);

  return {
    allowAllQuestions: groupSettings.allowAllQuestions,
    canProposeMatchPolicy,
    canProposeWeeklyLimit,
    isLoadingGroupSettings: groupSettings.isLoadingGroupSettings,
    isOwnMatchPolicyPending: pair?.matchPolicyPending?.proposedBy === identity?.userId,
    isOwnWeeklyLimitPending: pair?.weeklyLimitPending?.proposedBy === identity?.userId,
    matchPolicy: groupSettings.matchPolicy,
    matchPolicyDraft: groupSettings.matchPolicyDraft,
    pair,
    proposeGroupSettings: groupSettings.proposeGroupSettings,
    proposeMatchPolicy: groupSettings.proposeMatchPolicy,
    refreshGroupSettings: groupSettings.refreshGroupSettings,
    respondGroupSettings: groupSettings.respondGroupSettings,
    respondMatchPolicy: groupSettings.respondMatchPolicy,
    setQuestionsUnlimited: groupSettings.setQuestionsUnlimited,
    updateMatchPolicyDraft: groupSettings.updateMatchPolicyDraft,
    updateWeeklyLimitDraft: groupSettings.updateWeeklyLimitDraft,
    weeklyLimitDraft: groupSettings.weeklyLimitDraft
  };
}

export type PairSettingsModel = ReturnType<typeof usePairSettingsModel>;
