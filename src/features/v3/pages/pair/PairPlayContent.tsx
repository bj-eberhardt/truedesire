import { V3RevealContent } from "../../components";
import { PairPlayCard } from "./PairPlayCard";
import {
  PairPlayEmptyState,
  PairPlayIntro,
  PairPlayLimitNotice
} from "./PairPlayStates";
import { PairPlayToolbar } from "./PairPlayToolbar";
import type { PairPlayModel } from "./usePairPlayModel";

export function PairPlayContent({ model }: { model: PairPlayModel }) {
  if (!model.pair) return null;

  return (
    <V3RevealContent
      isLoading={model.isLoadingPairData}
      loading={
        <div className="hint" data-testid="pair-loading-indicator">
          Fragen werden geladen...
        </div>
      }
    >
      <PairPlayIntro
        showLimitNotice={model.showLimitNotice}
        isUnlimited={model.isUnlimited}
        remainingNew={model.remainingNew}
      />
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
    </V3RevealContent>
  );
}
