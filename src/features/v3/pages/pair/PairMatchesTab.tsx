import { RefreshButton } from "../../../../components/RefreshButton";
import { V3RevealContent, V3SectionHeader } from "../../components";
import { PairMatchCard } from "./PairMatchCard";
import { usePairMatchesModel } from "./usePairMatchesModel";

export function PairMatchesTab() {
  const model = usePairMatchesModel();

  return (
    <>
      <div className="divider" />
      <V3SectionHeader
        className="v3-matches-head"
        title={
          model.showHiddenMatches
            ? `Ausgeblendete Matches (${model.visibleMatchesCount})`
            : `Matches (${model.visibleMatchesCount})`
        }
        subtitle={
          model.showHiddenMatches
            ? "Hier findest du Matches, die du ausgeblendet hast."
            : "Hier findest du Matches, bei denen Ihr beide grundsätzlich dafür seid. Nutzt die Gelegenheit und sprecht drüber."
        }
        action={
          <RefreshButton
            testId="matches-refresh-button"
            onClick={model.computeMatches}
            title="Matches neu berechnen"
          />
        }
      />

      <V3RevealContent
        isLoading={model.isLoadingMatches}
        loading={<div className="hint">Matches werden geladen...</div>}
      >
        {model.matches.length ? (
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
      </V3RevealContent>
    </>
  );
}
