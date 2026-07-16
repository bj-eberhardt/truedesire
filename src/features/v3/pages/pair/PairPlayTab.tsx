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
      <PairPlayIntro
        showLimitNotice={model.showLimitNotice}
        isUnlimited={model.isUnlimited}
        remainingNew={model.remainingNew}
      />
      <PairPlayLoading isLoading={model.isLoadingPairData} />
      <PairPlayLimitNotice
        showLimitNotice={model.showLimitNotice}
        limitNoticeText={model.limitNoticeText}
      />
      <PairPlayEmptyState
        orderedCount={model.ordered.length}
        showSavedOnlyCard={model.showSavedOnlyCard}
        allCurrentAnswered={model.allCurrentAnswered}
      />
      <PairPlayCard
        orderedCount={model.ordered.length}
        showSavedOnlyCard={model.showSavedOnlyCard}
        visibleQuestionId={model.visibleQuestionId}
        visibleQuestionText={model.visibleQuestionText}
        currentQuestion={model.currentQuestion}
        safeIndex={model.safeIndex}
        canAnswerNew={model.canAnswerNew}
        canPrev={model.canPrev}
        canNext={model.canNext}
        flash={model.flash}
        swipe={model.swipe}
        onAnswerQuestion={model.answerQuestion}
        onPrev={model.goPrev}
        onNext={model.goNext}
      />
      <PairPlayToolbar
        pairStatus={model.pair.status}
        partnerDeleted={model.pair.partnerDeleted}
        playedPendingCount={model.playedPending.length}
        onAsk={model.goAsk}
        onPlayed={model.goPlayed}
      />
    </>
  );
}
