import { CalendarIcon } from "../../components/icons/CalendarIcon";
import { ChevronLeftIcon } from "../../components/icons/ChevronLeftIcon";
import { ChevronRightIcon } from "../../components/icons/ChevronRightIcon";
import { ClockIcon } from "../../components/icons/ClockIcon";
import { nextWeeklyResetDateText, type PairPlayModel } from "./usePairPlayModel";

type PairPlayModelProps = {
  model: PairPlayModel;
};

export function PairPlayIntro({ model }: PairPlayModelProps) {
  if (model.showLimitNotice) return null;

  return (
    <div className="v3-play-intro">
      <h2>Fragen spielen</h2>
      <p className="hint">
        Du und dein Partner habt jetzt Fragen zum Spielen. Beantworte offene Fragen, um neue
        Matches zu entdecken.
        {!model.isUnlimited ? (
          <span className="v3-weekly-hint">
            Du kannst diese Woche noch
            <span
              className={`pill mono v3-inline-count-pill ${
                model.remainingNew < 3 ? "v3-inline-count-low" : ""
              }`}
            >
              {model.remainingNew}
            </span>
            neue Antworten geben. Wochenreset am {nextWeeklyResetDateText()}.{" "}
            <CalendarIcon className="v3-weekly-calendar-icon" />
          </span>
        ) : null}
      </p>
    </div>
  );
}

export function PairPlayLoading({ model }: PairPlayModelProps) {
  if (!model.isLoadingPairData) return null;

  return (
    <div className="hint" data-testid="pair-loading-indicator">
      Fragen werden geladen...
    </div>
  );
}

export function PairPlayLimitNotice({ model }: PairPlayModelProps) {
  if (!model.showLimitNotice) return null;

  return (
    <div className="notice v3-limit-notice" data-testid="weekly-limit-notice">
      <ClockIcon />
      <div>{model.limitNoticeText}</div>
    </div>
  );
}

export function PairPlayEmptyState({ model }: PairPlayModelProps) {
  if (model.ordered.length || model.showSavedOnlyCard) return null;

  if (model.allCurrentAnswered) {
    return (
      <div className="v3-success" data-testid="all-answered-state">
        <strong>Alles beantwortet</strong>
        <div className="hint">
          Für den Moment gibt es hier nichts zu tun. Du kannst eine neue Frage stellen und direkt
          selbst beantworten. Danach erscheint sie bei deinem Partner und kann auch von ihm
          beantwortet werden.
        </div>
      </div>
    );
  }

  return (
    <div className="empty" data-testid="no-open-questions">
      Keine offenen Fragen für dich.
    </div>
  );
}

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

export function PairPlayToolbar({ model }: PairPlayModelProps) {
  const pair = model.pair;
  if (!pair) return null;

  return (
    <div className="v3-play-toolbar" data-testid="play-summary">
      <div className="v3-play-actions">
        <div className="v3-play-action-card">
          <button
            className="primary"
            data-testid="ask-question-button"
            onClick={model.goAsk}
            disabled={pair.status !== "active" || !!pair.partnerDeleted}
          >
            Neue Frage stellen
          </button>
          <div className="v3-action-hint">
            Du möchtest eigene Fragen stellen und beantwortet haben?
          </div>
        </div>
        {model.playedPending.length ? (
          <div className="v3-play-action-card">
            <button
              className="secondary"
              data-testid="played-answers-button"
              onClick={model.goPlayed}
              disabled={pair.status !== "active" || !!pair.partnerDeleted}
              title="Deine bereits abgegebenen Antworten anpassen (solange dein Partner noch nicht geantwortet hat)."
            >
              Antworten anpassen ({model.playedPending.length})
            </button>
            <div className="v3-action-hint">
              Solange dein Partner die Frage nicht beantwortet hat, kannst du deine Meinung gerne
              ändern.
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
