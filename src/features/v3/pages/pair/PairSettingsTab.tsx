import { PairSettingsHeader, PairSettingsLoading, PairSettingsPanel } from "./PairSettingsViews";
import { usePairSettingsModel } from "./usePairSettingsModel";

export function PairSettingsTab() {
  const model = usePairSettingsModel();

  if (!model.pair) return null;

  return (
    <>
      <div className="divider" />
      <PairSettingsHeader onRefresh={model.refreshGroupSettings} />
      <PairSettingsLoading isLoading={model.isLoadingGroupSettings} />
      <PairSettingsPanel
        allowAllQuestions={model.allowAllQuestions}
        canProposeSettings={model.canProposeSettings}
        isLoadingGroupSettings={model.isLoadingGroupSettings}
        isOwnPendingRequest={Boolean(model.isOwnPendingRequest)}
        pair={model.pair}
        weeklyLimitDraft={model.weeklyLimitDraft}
        onProposeGroupSettings={model.proposeGroupSettings}
        onRespondGroupSettings={model.respondGroupSettings}
        onSetQuestionsUnlimited={model.setQuestionsUnlimited}
        onUpdateWeeklyLimitDraft={model.updateWeeklyLimitDraft}
      />
    </>
  );
}
