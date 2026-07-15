import { useMemo } from "react";
import { RefreshButton } from "../../../../components/RefreshButton";
import {
  useGroupSettingsContext,
  usePairWorkspaceContext,
  useSessionContext
} from "../../../../app/state";

export function PairSettingsTab() {
  const { identity } = useSessionContext();
  const { pair } = usePairWorkspaceContext();
  const groupSettings = useGroupSettingsContext();

  const canProposeSettings = useMemo(() => {
    if (!pair) return false;
    if (pair.weeklyLimitPending) return false;
    if (groupSettings.isLoadingGroupSettings) return false;
    const nextLimit = groupSettings.allowAllQuestions
      ? 0
      : Number(groupSettings.weeklyLimitDraft);
    if (!Number.isFinite(nextLimit) || nextLimit < 0 || nextLimit > 50) return false;
    const currentLimit = pair.usage?.weeklyLimit ?? pair.weeklyLimit;
    if (nextLimit === currentLimit) return false;
    return true;
  }, [
    groupSettings.allowAllQuestions,
    groupSettings.isLoadingGroupSettings,
    groupSettings.weeklyLimitDraft,
    pair
  ]);

  if (!pair) return null;

  return (
    <>
      <div className="divider" />
      <div className="row">
        <h2 style={{ margin: 0 }}>Gruppen-Einstellungen</h2>
        <RefreshButton
          testId="settings-refresh-button"
          onClick={groupSettings.refreshGroupSettings}
          title="Gruppen-Einstellungen neu laden"
        />
      </div>
      {groupSettings.isLoadingGroupSettings ? (
        <div className="hint">⏳ Gruppen-Einstellungen werden geladen…</div>
      ) : (
        <div className="settings-panel" data-testid="settings-panel">
          <div className="settings-item">
            <div className="settings-item-title">Fragenlimit pro Woche</div>
            <p className="settings-text">
              Wenn aktiviert können pro Spieler nur {groupSettings.weeklyLimitDraft || "0"} Fragen
              pro Woche beantwortet werden, erst in der darauf folgenden Woche gibt es weitere
              Fragen. So ist die Spannung jede Woche groß, ob es ein weiteres Match gibt.
            </p>
            <div className="row settings-limit-controls">
              <div className="settings-limit-group">
                <label className="toggle settings-toggle">
                  <span>Limit aktivieren</span>
                  <input
                    type="checkbox"
                    data-testid="weekly-limit-toggle"
                    checked={!groupSettings.allowAllQuestions}
                    onChange={(e) => groupSettings.setQuestionsUnlimited(!e.target.checked)}
                    disabled={!!pair.weeklyLimitPending || groupSettings.isLoadingGroupSettings}
                  />
                </label>
                {groupSettings.allowAllQuestions ? (
                  <div className="settings-unlimited-state">Alle Fragen erlaubt</div>
                ) : (
                  <div className="settings-number-field">
                    <input
                      data-testid="weekly-limit-input"
                      type="number"
                      inputMode="numeric"
                      min="0"
                      max="50"
                      step="1"
                      aria-label="Fragen pro Woche"
                      value={groupSettings.weeklyLimitDraft}
                      onChange={(e) =>
                        groupSettings.updateWeeklyLimitDraft(e.target.value.replace(/\D/g, ""))
                      }
                      disabled={!!pair.weeklyLimitPending || groupSettings.isLoadingGroupSettings}
                    />
                    <span className="settings-number-suffix">Fragen/Woche</span>
                  </div>
                )}
              </div>
            </div>
            <div className="settings-current-row">
              <div className="settings-current" data-testid="weekly-limit-current">
                <span className="settings-current-label">Aktuell</span>
                <span className="settings-current-value">
                  {pair.weeklyLimit === 0
                    ? "Alle Fragen erlaubt"
                    : `${pair.weeklyLimit} Fragen pro Woche`}
                </span>
              </div>
              <button
                className="primary settings-propose-button"
                data-testid="weekly-limit-propose-button"
                onClick={groupSettings.proposeGroupSettings}
                disabled={!canProposeSettings}
              >
                Änderung vorschlagen
              </button>
            </div>
          </div>

          {pair.weeklyLimitPending ? (
            <div className="settings-pending-block" data-testid="weekly-limit-pending-block">
              <div className="settings-item-title">Offene Einstellungsanfrage</div>
              {pair.weeklyLimitPending.proposedBy === identity?.userId ? (
                <div className="request request-panel">
                  <div className="row request-panel-head settings-request-head">
                    <div>
                      <div className="pair-card-name">Fragenlimit pro Woche</div>
                      <div className="pair-card-code mono">
                        {pair.weeklyLimitPending.limit === 0
                          ? "Alle Fragen erlauben"
                          : `${pair.weeklyLimitPending.limit} Fragen/Woche`}
                      </div>
                    </div>
                    <button
                      className="secondary action-cancel"
                      data-testid="weekly-limit-cancel-button"
                      onClick={() => groupSettings.respondGroupSettings("cancel")}
                      disabled={groupSettings.isLoadingGroupSettings}
                      title="Eigenen Vorschlag zurückziehen"
                    >
                      Zurückziehen
                    </button>
                  </div>
                </div>
              ) : (
                <div className="request request-panel">
                  <div className="row request-panel-head settings-request-head">
                    <div>
                      <div className="pair-card-name">Fragenlimit pro Woche</div>
                      <div className="pair-card-code mono">
                        {pair.weeklyLimitPending.limit === 0
                          ? "Alle Fragen erlauben"
                          : `${pair.weeklyLimitPending.limit} Fragen/Woche`}
                      </div>
                    </div>
                  </div>
                  <div className="row request-actions">
                    <button
                      className="action-accept"
                      data-testid="weekly-limit-accept-button"
                      onClick={() => groupSettings.respondGroupSettings("accept")}
                      disabled={groupSettings.isLoadingGroupSettings}
                    >
                      ✓ Annehmen
                    </button>
                    <button
                      className="action-reject"
                      data-testid="weekly-limit-reject-button"
                      onClick={() => groupSettings.respondGroupSettings("reject")}
                      disabled={groupSettings.isLoadingGroupSettings}
                    >
                      ✕ Ablehnen
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}
    </>
  );
}
