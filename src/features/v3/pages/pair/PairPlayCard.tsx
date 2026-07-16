import { ChevronLeftIcon } from "../../components/icons/ChevronLeftIcon";
import { ChevronRightIcon } from "../../components/icons/ChevronRightIcon";
import type { PairPlayModel } from "./usePairPlayModel";

type PairPlayModelProps = {
  model: PairPlayModel;
};

export function PairPlayCard({ model }: PairPlayModelProps) {
  if (!model.ordered.length && !model.showSavedOnlyCard) return null;

  return (
    <div className="v3-play-panel">
      <div
        className="v3-play-card"
        data-testid="play-card"
        data-question-id={model.visibleQuestionId}
        data-saved={model.flash.showSaved ? "true" : "false"}
        onPointerDown={model.swipe.onPointerDown}
        onPointerMove={model.swipe.onPointerMove}
        onPointerUp={model.swipe.onPointerUp}
        onPointerCancel={model.swipe.onPointerCancel}
      >
        <div className="v3-play-card-top">
          <div className="pill mono">
            {model.currentQuestion
              ? `Frage ${model.safeIndex + 1}/${model.ordered.length}`
              : "Gespeichert"}
          </div>
        </div>
        <div className="v3-play-question" data-testid="play-question-text">
          {model.visibleQuestionText}
        </div>
        <div className="v3-choice-row">
          <button
            className="choice yes"
            data-testid="answer-yes-button"
            onClick={() =>
              model.currentQuestion &&
              model.answerQuestion(model.currentQuestion.id, "yes", model.currentQuestion.text)
            }
            disabled={!model.currentQuestion || !model.canAnswerNew || model.flash.isSaving}
          >
            Ja
          </button>
          <button
            className="choice maybe"
            data-testid="answer-maybe-button"
            onClick={() =>
              model.currentQuestion &&
              model.answerQuestion(model.currentQuestion.id, "maybe", model.currentQuestion.text)
            }
            disabled={!model.currentQuestion || !model.canAnswerNew || model.flash.isSaving}
          >
            Vielleicht
          </button>
          <button
            className="choice no"
            data-testid="answer-no-button"
            onClick={() =>
              model.currentQuestion &&
              model.answerQuestion(model.currentQuestion.id, "no", model.currentQuestion.text)
            }
            disabled={!model.currentQuestion || !model.canAnswerNew || model.flash.isSaving}
          >
            Nein
          </button>
        </div>
        <PairPlayCardNav model={model} />
      </div>
    </div>
  );
}

function PairPlayCardNav({ model }: PairPlayModelProps) {
  return (
    <div className="v3-play-nav">
      <div className="v3-play-nav-slot v3-play-nav-slot-prev">
        {model.canPrev ? (
          <button
            className="secondary v3-play-prev"
            data-testid="play-prev-button"
            onClick={model.goPrev}
            title="Vorige Frage"
            aria-label="Vorige Frage"
          >
            <ChevronLeftIcon />
          </button>
        ) : null}
      </div>
      <div className="v3-play-nav-message">
        {model.flash.showSaved ? (
          <div className="v3-answer-saved v3-answer-saved-nav" data-testid="answer-saved-indicator">
            Frage wurde beantwortet.
          </div>
        ) : null}
      </div>
      <div className="v3-play-nav-slot v3-play-nav-slot-next">
        {model.canNext ? (
          <button
            className="secondary v3-play-next"
            data-testid="play-next-button"
            onClick={model.goNext}
            title="Nächste Frage"
            aria-label="Nächste Frage"
          >
            <ChevronRightIcon />
          </button>
        ) : null}
      </div>
    </div>
  );
}
