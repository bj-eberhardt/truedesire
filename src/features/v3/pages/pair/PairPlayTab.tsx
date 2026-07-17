import { PairPlayContent } from "./PairPlayViews";
import { usePairPlayModel } from "./usePairPlayModel";

export function PairPlayTab() {
  const model = usePairPlayModel();
  if (!model.pair) return null;

  return <PairPlayContent model={model} />;
}
