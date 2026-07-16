import { RefreshButton } from "../../../../components/RefreshButton";
import { PairMatchCard } from "./PairMatchCard";
import { usePairMatchesModel } from "./usePairMatchesModel";

export function PairMatchesTab() {
  const model = usePairMatchesModel();

  return (
    <>
      <div className="divider" />
      <div className="v3-matches-head">
        <div>
          <h2>
            {model.showHiddenMatches
              ? `Ausgeblendete Matches (${model.visibleMatchesCount})`
              : `Matches (${model.visibleMatchesCount})`}
          </h2>
          <p className="hint v3-matches-subtitle">
            {model.showHiddenMatches
              ? "Hier findest du Matches, die du ausgeblendet hast."
              : "Hier findest du Matches, bei denen Ihr beide grundsätzlich dafür seid. Nutzt die Gelegenheit und sprecht drüber."}
          </p>
        </div>
        <RefreshButton
          testId="matches-refresh-button"
          onClick={model.computeMatches}
          title="Matches neu berechnen"
        />
      </div>

      {model.isLoadingMatches ? (
        <div className="hint">Matches werden geladen...</div>
      ) : model.matches.length ? (
        <div className="match-grid" data-testid="matches-grid">
          {model.visibleMatches.map((match) => (
            <PairMatchCard
              key={match.id}
              match={match}
              onHide={model.hideMatch}
              onRestore={model.restoreMatch}
              showHiddenMatches={model.showHiddenMatches}
            />
          ))}
        </div>
      ) : (
        <div className="empty" data-testid="no-matches-state">
          Noch keine Matches.
        </div>
      )}

      {model.hiddenCount ? (
        <div className="row" style={{ marginTop: 8 }}>
          <button
            className="secondary small-btn"
            data-testid="toggle-hidden-matches-button"
            onClick={model.toggleHiddenMatchesView}
            disabled={!model.showHiddenMatches && model.showHiddenMatchesDisabled}
            title={
              model.showHiddenMatches
                ? "Zur normalen Match-Ansicht wechseln"
                : "Ausgeblendete Matches anzeigen"
            }
          >
            {model.showHiddenMatches ? "Matches anzeigen" : "Ausgeblendete Matches anzeigen"}
          </button>
        </div>
      ) : null}
    </>
  );
}
