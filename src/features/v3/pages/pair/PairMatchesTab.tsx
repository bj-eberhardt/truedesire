import { MatchVisibilityIcon } from "../../../../components/MatchVisibilityIcon";
import { RefreshButton } from "../../../../components/RefreshButton";
import { useMatchesContext } from "../../../../app/state";

export function PairMatchesTab() {
  const matchesContext = useMatchesContext();
  const hiddenCount = matchesContext.matches.filter((m) =>
    matchesContext.hiddenMatchIds.includes(m.id)
  ).length;
  const showHiddenMatchesDisabled = hiddenCount === 0;

  return (
    <>
      <div className="divider" />
      <div className="v3-matches-head">
        <div>
          <h2>
            {matchesContext.showHiddenMatches
              ? `Ausgeblendete Matches (${matchesContext.visibleMatchesCount})`
              : `Matches (${matchesContext.visibleMatchesCount})`}
          </h2>
          <p className="hint v3-matches-subtitle">
            {matchesContext.showHiddenMatches
              ? "Hier findest du Matches, die du ausgeblendet hast."
              : "Hier findest du Matches, bei denen Ihr beide grundsätzlich dafür seid. Nutzt die Gelegenheit und sprecht drüber."}
          </p>
        </div>
        <RefreshButton
          testId="matches-refresh-button"
          onClick={matchesContext.computeMatches}
          title="Matches neu berechnen"
        />
      </div>
      {matchesContext.isLoadingMatches ? (
        <div className="hint">⏳ Matches werden geladen…</div>
      ) : matchesContext.matches.length ? (
        <div className="match-grid" data-testid="matches-grid">
          {matchesContext.matches
            .filter((m) =>
              matchesContext.showHiddenMatches
                ? matchesContext.hiddenMatchIds.includes(m.id)
                : !matchesContext.hiddenMatchIds.includes(m.id)
            )
            .map((m) => (
              <div
                className={`match-card ${m.grade}`}
                data-testid="match-card"
                data-match-id={m.id}
                data-match-grade={m.grade}
                key={m.id}
              >
                <div className="match-head">
                  <div className={`badge ${m.grade}`}>
                    <svg className="match-grade-icon" viewBox="0 0 24 24" aria-hidden="true">
                      {m.grade === "perfect" ? (
                        <path
                          d="M12 21s-7-4.4-9.2-9A5.7 5.7 0 0 1 12 5.7 5.7 5.7 0 0 1 21.2 12C19 16.6 12 21 12 21Z"
                          fill="currentColor"
                        />
                      ) : m.grade === "maybe" ? (
                        <path
                          d="M12 3.5 14.7 9l6 .9-4.3 4.2 1 6-5.4-2.9-5.4 2.9 1-6L3.3 9l6-.9L12 3.5Z"
                          fill="currentColor"
                        />
                      ) : (
                        <circle cx="12" cy="12" r="7" fill="currentColor" />
                      )}
                    </svg>
                    <span className="match-grade-copy">
                      <span className="match-grade-kicker">
                        {m.grade === "perfect"
                          ? "Starkes Match"
                          : m.grade === "maybe"
                            ? "Interessante Nähe"
                            : "Guter Start"}
                      </span>
                      <span className="match-grade-label">
                        {m.grade === "perfect"
                          ? "Perfekt"
                          : m.grade === "maybe"
                            ? "Vielleicht"
                            : "Okay"}
                      </span>
                    </span>
                  </div>
                  <div className="match-title" data-testid="match-question-text">
                    {m.question}
                  </div>
                </div>
                <div className="match-card-actions">
                  <button
                    className="secondary icon-btn mini"
                    data-testid="match-visibility-button"
                    title={
                      matchesContext.showHiddenMatches
                        ? "Match wieder anzeigen"
                        : "Match ausblenden"
                    }
                    onClick={() =>
                      matchesContext.showHiddenMatches
                        ? matchesContext.restoreMatch(m.id)
                        : matchesContext.hideMatch(m.id)
                    }
                  >
                    <MatchVisibilityIcon hidden={!matchesContext.showHiddenMatches} />
                  </button>
                </div>
              </div>
            ))}
        </div>
      ) : (
        <div className="empty" data-testid="no-matches-state">
          Noch keine Matches.
        </div>
      )}

      {matchesContext.hiddenMatchIds.length ? (
        <div className="row" style={{ marginTop: 8 }}>
          <button
            className="secondary small-btn"
            data-testid="toggle-hidden-matches-button"
            onClick={() => matchesContext.toggleHiddenMatchesView()}
            disabled={!matchesContext.showHiddenMatches && showHiddenMatchesDisabled}
            title={
              matchesContext.showHiddenMatches
                ? "Zur normalen Match-Ansicht wechseln"
                : "Ausgeblendete Matches anzeigen"
            }
          >
            {matchesContext.showHiddenMatches
              ? "✣ Matches anzeigen"
              : "✣ Ausgeblendete Matches anzeigen"}
          </button>
        </div>
      ) : null}
    </>
  );
}
