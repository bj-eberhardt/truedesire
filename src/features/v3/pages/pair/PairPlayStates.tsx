import { CalendarIcon } from "../../components/icons/CalendarIcon";
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
        Du und dein Partner habt jetzt Fragen zum Spielen. Beantworte offene Fragen, um neue Matches
        zu entdecken.
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
