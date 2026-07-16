import type { PointerEventHandler } from "react";
import type { AnswerChoice, DecryptedQuestion } from "../../../../types";
import { AnswerChoiceGroup } from "../../components";
import { ChevronLeftIcon } from "../../components/icons/ChevronLeftIcon";
import { ChevronRightIcon } from "../../components/icons/ChevronRightIcon";

type PairPlayCardProps = {
  orderedCount: number;
  showSavedOnlyCard: boolean;
  visibleQuestionId: string;
  visibleQuestionText: string;
  currentQuestion: DecryptedQuestion | null;
  safeIndex: number;
  canAnswerNew: boolean;
  canPrev: boolean;
  canNext: boolean;
  flash: {
    showSaved: boolean;
    isSaving: boolean;
  };
  swipe: {
    onPointerDown: PointerEventHandler<HTMLDivElement>;
    onPointerMove: PointerEventHandler<HTMLDivElement>;
    onPointerUp: PointerEventHandler<HTMLDivElement>;
    onPointerCancel: PointerEventHandler<HTMLDivElement>;
  };
  onAnswerQuestion: (
    questionId: string,
    answer: AnswerChoice,
    questionText: string
  ) => Promise<void> | void;
  onPrev: () => void;
  onNext: () => void;
};

export function PairPlayCard(props: PairPlayCardProps) {
  if (!props.orderedCount && !props.showSavedOnlyCard) return null;

  return (
    <div className="v3-play-panel">
      <div
        className="v3-play-card"
        data-testid="play-card"
        data-question-id={props.visibleQuestionId}
        data-saved={props.flash.showSaved ? "true" : "false"}
        onPointerDown={props.swipe.onPointerDown}
        onPointerMove={props.swipe.onPointerMove}
        onPointerUp={props.swipe.onPointerUp}
        onPointerCancel={props.swipe.onPointerCancel}
      >
        <div className="v3-play-card-top">
          <div className="pill mono">
            {props.currentQuestion
              ? `Frage ${props.safeIndex + 1}/${props.orderedCount}`
              : "Gespeichert"}
          </div>
        </div>
        <div className="v3-play-question" data-testid="play-question-text">
          {props.visibleQuestionText}
        </div>
        <AnswerChoiceGroup
          onSelect={(answer) =>
            props.currentQuestion &&
            props.onAnswerQuestion(props.currentQuestion.id, answer, props.currentQuestion.text)
          }
          disabled={!props.currentQuestion || !props.canAnswerNew || props.flash.isSaving}
        />
        <PairPlayCardNav
          canPrev={props.canPrev}
          canNext={props.canNext}
          showSaved={props.flash.showSaved}
          onPrev={props.onPrev}
          onNext={props.onNext}
        />
      </div>
    </div>
  );
}

function PairPlayCardNav({
  canPrev,
  canNext,
  showSaved,
  onPrev,
  onNext
}: {
  canPrev: boolean;
  canNext: boolean;
  showSaved: boolean;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="v3-play-nav">
      <div className="v3-play-nav-slot v3-play-nav-slot-prev">
        {canPrev ? (
          <button
            className="secondary v3-play-prev"
            data-testid="play-prev-button"
            onClick={onPrev}
            title="Vorige Frage"
            aria-label="Vorige Frage"
          >
            <ChevronLeftIcon />
          </button>
        ) : null}
      </div>
      <div className="v3-play-nav-message">
        {showSaved ? (
          <div className="v3-answer-saved v3-answer-saved-nav" data-testid="answer-saved-indicator">
            Frage wurde beantwortet.
          </div>
        ) : null}
      </div>
      <div className="v3-play-nav-slot v3-play-nav-slot-next">
        {canNext ? (
          <button
            className="secondary v3-play-next"
            data-testid="play-next-button"
            onClick={onNext}
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
