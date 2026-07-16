import { CalendarIcon } from "../../components/icons/CalendarIcon";
import { ClockIcon } from "../../components/icons/ClockIcon";
import { nextWeeklyResetDateText } from "./usePairPlayModel";

type PairPlayIntroProps = {
  showLimitNotice: boolean;
  isUnlimited: boolean;
  remainingNew: number;
};

type PairPlayLoadingProps = {
  isLoading: boolean;
};

type PairPlayLimitNoticeProps = {
  showLimitNotice: boolean;
  limitNoticeText: string | null;
};

type PairPlayEmptyStateProps = {
  orderedCount: number;
  showSavedOnlyCard: boolean;
  allCurrentAnswered: boolean;
};

export function PairPlayIntro({ isUnlimited, remainingNew, showLimitNotice }: PairPlayIntroProps) {
  if (showLimitNotice) return null;

  return (
    <div className="v3-play-intro">
      <h2>Fragen spielen</h2>
      <p className="hint">
        Du und dein Partner habt jetzt Fragen zum Spielen. Beantworte offene Fragen, um neue Matches
        zu entdecken.
        {!isUnlimited ? (
          <span className="v3-weekly-hint">
            Du kannst diese Woche noch
            <span
              className={`pill mono v3-inline-count-pill ${
                remainingNew < 3 ? "v3-inline-count-low" : ""
              }`}
            >
              {remainingNew}
            </span>
            neue Antworten geben. Wochenreset am {nextWeeklyResetDateText()}.{" "}
            <CalendarIcon className="v3-weekly-calendar-icon" />
          </span>
        ) : null}
      </p>
    </div>
  );
}

export function PairPlayLoading({ isLoading }: PairPlayLoadingProps) {
  if (!isLoading) return null;

  return (
    <div className="hint" data-testid="pair-loading-indicator">
      Fragen werden geladen...
    </div>
  );
}

export function PairPlayLimitNotice({
  limitNoticeText,
  showLimitNotice
}: PairPlayLimitNoticeProps) {
  if (!showLimitNotice) return null;

  return (
    <div className="notice v3-limit-notice" data-testid="weekly-limit-notice">
      <ClockIcon />
      <div>{limitNoticeText}</div>
    </div>
  );
}

export function PairPlayEmptyState({
  allCurrentAnswered,
  orderedCount,
  showSavedOnlyCard
}: PairPlayEmptyStateProps) {
  if (orderedCount || showSavedOnlyCard) return null;

  if (allCurrentAnswered) {
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
