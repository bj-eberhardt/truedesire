import { PairSettingsHeader, PairSettingsLoading, PairSettingsPanel } from "./PairSettingsViews";
import { usePairSettingsModel } from "./usePairSettingsModel";

export function PairSettingsTab() {
  const model = usePairSettingsModel();

  if (!model.pair) return null;

  return (
    <>
      <div className="divider" />
      <PairSettingsHeader model={model} />
      <PairSettingsLoading model={model} />
      <PairSettingsPanel model={model} />
    </>
  );
}
