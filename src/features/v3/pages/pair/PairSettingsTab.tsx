import { V3RevealContent } from "../../components";
import { PairSettingsHeader, PairSettingsPanel } from "./PairSettingsViews";
import { usePairSettingsModel } from "./usePairSettingsModel";

export function PairSettingsTab() {
  const model = usePairSettingsModel();

  if (!model.pair) return null;

  return (
    <>
      <div className="divider" />
      <PairSettingsHeader onRefresh={model.refreshGroupSettings} />
      <V3RevealContent
        isLoading={model.isLoadingGroupSettings}
        loading={<div className="hint">Gruppen-Einstellungen werden geladen...</div>}
      >
        <PairSettingsPanel
          allowAllQuestions={model.allowAllQuestions}
          canProposeMatchPolicy={model.canProposeMatchPolicy}
          canProposeWeeklyLimit={model.canProposeWeeklyLimit}
          isLoadingGroupSettings={model.isLoadingGroupSettings}
          isOwnMatchPolicyPending={Boolean(model.isOwnMatchPolicyPending)}
          isOwnWeeklyLimitPending={Boolean(model.isOwnWeeklyLimitPending)}
          matchPolicy={model.matchPolicy}
          matchPolicyDraft={model.matchPolicyDraft}
          pair={model.pair}
          weeklyLimitDraft={model.weeklyLimitDraft}
          onProposeGroupSettings={model.proposeGroupSettings}
          onProposeMatchPolicy={model.proposeMatchPolicy}
          onRespondGroupSettings={model.respondGroupSettings}
          onRespondMatchPolicy={model.respondMatchPolicy}
          onSetQuestionsUnlimited={model.setQuestionsUnlimited}
          onUpdateMatchPolicyDraft={model.updateMatchPolicyDraft}
          onUpdateWeeklyLimitDraft={model.updateWeeklyLimitDraft}
        />
      </V3RevealContent>
    </>
  );
}
