import {
  PairPlayCard,
  PairPlayEmptyState,
  PairPlayIntro,
  PairPlayLimitNotice,
  PairPlayLoading,
  PairPlayToolbar
} from "./PairPlayViews";
import { usePairPlayModel } from "./usePairPlayModel";

export function PairPlayTab() {
  const model = usePairPlayModel();

  if (!model.pair) return null;

  return (
    <>
      <PairPlayIntro model={model} />
      <PairPlayLoading model={model} />
      <PairPlayLimitNotice model={model} />
      <PairPlayEmptyState model={model} />
      <PairPlayCard model={model} />
      <PairPlayToolbar model={model} />
    </>
  );
}
