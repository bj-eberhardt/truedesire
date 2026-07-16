import { RefreshButton } from "../../../../components/RefreshButton";
import type { PairSettingsModel } from "./usePairSettingsModel";

type PairSettingsModelProps = {
  model: PairSettingsModel;
};

export function PairSettingsHeader({ model }: PairSettingsModelProps) {
  return (
    <div className="row">
      <h2 style={{ margin: 0 }}>Gruppen-Einstellungen</h2>
      <RefreshButton
        testId="settings-refresh-button"
        onClick={model.refreshGroupSettings}
        title="Gruppen-Einstellungen neu laden"
      />
    </div>
  );
}

export function PairSettingsLoading({ model }: PairSettingsModelProps) {
  if (!model.isLoadingGroupSettings) return null;

  return <div className="hint">Gruppen-Einstellungen werden geladen...</div>;
}

export function PairSettingsPanel({ model }: PairSettingsModelProps) {
  if (model.isLoadingGroupSettings || !model.pair) return null;

  return (
    <div className="settings-panel" data-testid="settings-panel">
      <PairSettingsLimitForm model={model} />
      <PairSettingsPendingRequest model={model} />
    </div>
  );
}

function PairSettingsLimitForm({ model }: PairSettingsModelProps) {
  const pair = model.pair;
  if (!pair) return null;

  return (
    <div className="settings-item">
      <div className="settings-item-title">Fragenlimit pro Woche</div>
      <p className="settings-text">
        Wenn aktiviert können pro Spieler nur {model.weeklyLimitDraft || "0"} Fragen pro Woche
        beantwortet werden, erst in der darauf folgenden Woche gibt es weitere Fragen. So ist die
        Spannung jede Woche groß, ob es ein weiteres Match gibt.
      </p>
      <div className="row settings-limit-controls">
        <div className="settings-limit-group">
          <label className="toggle settings-toggle">
            <span>Limit aktivieren</span>
            <input
              type="checkbox"
              data-testid="weekly-limit-toggle"
              checked={!model.allowAllQuestions}
              onChange={(e) => model.setQuestionsUnlimited(!e.target.checked)}
              disabled={!!pair.weeklyLimitPending || model.isLoadingGroupSettings}
            />
          </label>
          {model.allowAllQuestions ? (
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
                value={model.weeklyLimitDraft}
                onChange={(e) => model.updateWeeklyLimitDraft(e.target.value.replace(/\D/g, ""))}
                disabled={!!pair.weeklyLimitPending || model.isLoadingGroupSettings}
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
          onClick={model.proposeGroupSettings}
          disabled={!model.canProposeSettings}
        >
          Änderung vorschlagen
        </button>
      </div>
    </div>
  );
}

function PairSettingsPendingRequest({ model }: PairSettingsModelProps) {
  const pending = model.pair?.weeklyLimitPending;
  if (!pending) return null;

  return (
    <div className="settings-pending-block" data-testid="weekly-limit-pending-block">
      <div className="settings-item-title">Offene Einstellungsanfrage</div>
      {model.isOwnPendingRequest ? (
        <OwnPendingRequest model={model} />
      ) : (
        <PartnerPendingRequest model={model} />
      )}
    </div>
  );
}

function OwnPendingRequest({ model }: PairSettingsModelProps) {
  const pending = model.pair?.weeklyLimitPending;
  if (!pending) return null;

  return (
    <div className="request request-panel">
      <div className="row request-panel-head settings-request-head">
        <PendingRequestSummary limit={pending.limit} />
        <button
          className="secondary action-cancel"
          data-testid="weekly-limit-cancel-button"
          onClick={() => model.respondGroupSettings("cancel")}
          disabled={model.isLoadingGroupSettings}
          title="Eigenen Vorschlag zurückziehen"
        >
          Zurückziehen
        </button>
      </div>
    </div>
  );
}

function PartnerPendingRequest({ model }: PairSettingsModelProps) {
  const pending = model.pair?.weeklyLimitPending;
  if (!pending) return null;

  return (
    <div className="request request-panel">
      <div className="row request-panel-head settings-request-head">
        <PendingRequestSummary limit={pending.limit} />
      </div>
      <div className="row request-actions">
        <button
          className="action-accept"
          data-testid="weekly-limit-accept-button"
          onClick={() => model.respondGroupSettings("accept")}
          disabled={model.isLoadingGroupSettings}
        >
          Annehmen
        </button>
        <button
          className="action-reject"
          data-testid="weekly-limit-reject-button"
          onClick={() => model.respondGroupSettings("reject")}
          disabled={model.isLoadingGroupSettings}
        >
          Ablehnen
        </button>
      </div>
    </div>
  );
}

function PendingRequestSummary({ limit }: { limit: number }) {
  return (
    <div>
      <div className="pair-card-name">Fragenlimit pro Woche</div>
      <div className="pair-card-code mono">
        {limit === 0 ? "Alle Fragen erlauben" : `${limit} Fragen/Woche`}
      </div>
    </div>
  );
}
