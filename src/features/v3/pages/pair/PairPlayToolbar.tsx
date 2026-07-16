import type { PairView } from "../../../../types";

type PairPlayToolbarProps = {
  pairStatus: PairView["status"];
  partnerDeleted?: boolean;
  playedPendingCount: number;
  onAsk: () => void;
  onPlayed: () => void;
};

export function PairPlayToolbar({
  pairStatus,
  partnerDeleted,
  playedPendingCount,
  onAsk,
  onPlayed
}: PairPlayToolbarProps) {
  const disabled = pairStatus !== "active" || !!partnerDeleted;

  return (
    <div className="v3-play-toolbar" data-testid="play-summary">
      <div className="v3-play-actions">
        <div className="v3-play-action-card">
          <button
            className="primary"
            data-testid="ask-question-button"
            onClick={onAsk}
            disabled={disabled}
          >
            Neue Frage stellen
          </button>
          <div className="v3-action-hint">
            Du möchtest eigene Fragen stellen und beantwortet haben?
          </div>
        </div>
        {playedPendingCount ? (
          <div className="v3-play-action-card">
            <button
              className="secondary"
              data-testid="played-answers-button"
              onClick={onPlayed}
              disabled={disabled}
              title="Deine bereits abgegebenen Antworten anpassen (solange dein Partner noch nicht geantwortet hat)."
            >
              Antworten anpassen ({playedPendingCount})
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
