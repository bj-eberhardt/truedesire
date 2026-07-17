import type { PairView } from "../../../../types";

type GroupSettingsAction = "accept" | "reject" | "cancel";

export type PairSettingsLimitCardProps = {
  allowAllQuestions: boolean;
  canProposeWeeklyLimit: boolean;
  isLoadingGroupSettings: boolean;
  isOwnWeeklyLimitPending: boolean;
  pair: PairView;
  weeklyLimitDraft: string;
  onProposeGroupSettings: () => Promise<void> | void;
  onRespondGroupSettings: (action: GroupSettingsAction) => Promise<void> | void;
  onSetQuestionsUnlimited: (unlimited: boolean) => void;
  onUpdateWeeklyLimitDraft: (value: string) => void;
};

export function PairSettingsLimitCard(props: PairSettingsLimitCardProps) {
  return (
    <>
      <div className="settings-item">
        <div className="settings-item-title">Fragenlimit pro Woche</div>
        <p className="settings-text">
          Wenn aktiviert können pro Spieler nur {props.weeklyLimitDraft || "0"} Fragen pro Woche
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
                checked={!props.allowAllQuestions}
                onChange={(e) => props.onSetQuestionsUnlimited(!e.target.checked)}
                disabled={!!props.pair.weeklyLimitPending || props.isLoadingGroupSettings}
              />
            </label>
            {props.allowAllQuestions ? (
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
                  value={props.weeklyLimitDraft}
                  onChange={(e) =>
                    props.onUpdateWeeklyLimitDraft(e.target.value.replace(/\D/g, ""))
                  }
                  disabled={!!props.pair.weeklyLimitPending || props.isLoadingGroupSettings}
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
              {props.pair.weeklyLimit === 0
                ? "Alle Fragen erlaubt"
                : `${props.pair.weeklyLimit} Fragen pro Woche`}
            </span>
          </div>
          <button
            className="primary settings-propose-button"
            data-testid="weekly-limit-propose-button"
            onClick={props.onProposeGroupSettings}
            disabled={!props.canProposeWeeklyLimit}
          >
            Änderung vorschlagen
          </button>
        </div>
        <PairSettingsLimitPendingRequest {...props} />
      </div>
    </>
  );
}

function PairSettingsLimitPendingRequest(props: PairSettingsLimitCardProps) {
  const pending = props.pair.weeklyLimitPending;
  if (!pending) return null;

  return (
    <div
      className="settings-pending-block"
      data-pending-owner={props.isOwnWeeklyLimitPending ? "own" : "partner"}
      data-testid="weekly-limit-pending-block"
    >
      <PendingRequestHeader
        title={
          props.isOwnWeeklyLimitPending ? "Warte auf Zustimmung" : "Deine Zustimmung ist gefragt"
        }
        label="Offene Anfrage"
      />
      {props.isOwnWeeklyLimitPending ? (
        <div className="request request-panel">
          <div className="row request-panel-head settings-request-head">
            <PendingRequestSummary limit={pending.limit} />
            <button
              className="secondary action-cancel"
              data-testid="weekly-limit-cancel-button"
              onClick={() => props.onRespondGroupSettings("cancel")}
              disabled={props.isLoadingGroupSettings}
              title="Eigenen Vorschlag zurückziehen"
            >
              Zurückziehen
            </button>
          </div>
        </div>
      ) : (
        <div className="request request-panel">
          <div className="row request-panel-head settings-request-head">
            <PendingRequestSummary limit={pending.limit} />
          </div>
          <div className="row request-actions">
            <button
              className="action-accept"
              data-testid="weekly-limit-accept-button"
              onClick={() => props.onRespondGroupSettings("accept")}
              disabled={props.isLoadingGroupSettings}
            >
              Annehmen
            </button>
            <button
              className="action-reject"
              data-testid="weekly-limit-reject-button"
              onClick={() => props.onRespondGroupSettings("reject")}
              disabled={props.isLoadingGroupSettings}
            >
              Ablehnen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function PendingRequestHeader(props: { title: string; label: string }) {
  return (
    <div className="settings-pending-head">
      <div className="settings-pending-title-group">
        <span className="settings-pending-badge">{props.label}</span>
        <div className="settings-item-title settings-pending-title">{props.title}</div>
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
