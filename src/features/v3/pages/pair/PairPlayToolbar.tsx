import type { PairPlayModel } from "./usePairPlayModel";

type PairPlayToolbarProps = {
  model: PairPlayModel;
};

export function PairPlayToolbar({ model }: PairPlayToolbarProps) {
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
