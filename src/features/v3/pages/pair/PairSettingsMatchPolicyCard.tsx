import type { MatchPolicy, PairView } from "../../../../types";
import { MATCH_POLICY_OPTIONS, matchPolicyLabel } from "./matchPolicyOptions";

type GroupSettingsAction = "accept" | "reject" | "cancel";

export type PairSettingsMatchPolicyCardProps = {
  canProposeMatchPolicy: boolean;
  isLoadingGroupSettings: boolean;
  isOwnMatchPolicyPending: boolean;
  matchPolicy: MatchPolicy;
  matchPolicyDraft: MatchPolicy;
  pair: PairView;
  onProposeMatchPolicy: () => Promise<void> | void;
  onRespondMatchPolicy: (action: GroupSettingsAction) => Promise<void> | void;
  onUpdateMatchPolicyDraft: (policy: MatchPolicy) => void;
};

export function PairSettingsMatchPolicyCard(props: PairSettingsMatchPolicyCardProps) {
  return (
    <>
      <div className="settings-item">
        <div className="settings-item-title">Match-Regel</div>
        <p className="settings-text">
          Diese gemeinsame Einstellung entscheidet, ab welcher Antwortkombination ein Match sichtbar
          wird. Nein zählt nie als Match.
        </p>
        <label className="settings-control-label" htmlFor="match-policy-select">
          Match anzeigen ab
        </label>
        <select
          id="match-policy-select"
          className="settings-select"
          data-testid="match-policy-select"
          value={props.matchPolicyDraft}
          onChange={(e) => props.onUpdateMatchPolicyDraft(e.target.value as MatchPolicy)}
          disabled={!!props.pair.matchPolicyPending || props.isLoadingGroupSettings}
        >
          {MATCH_POLICY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <div className="settings-current-row">
          <div className="settings-current" data-testid="match-policy-current">
            <span className="settings-current-label">Aktuell</span>
            <span className="settings-current-value">{matchPolicyLabel(props.matchPolicy)}</span>
          </div>
          <button
            className="primary settings-propose-button"
            data-testid="match-policy-propose-button"
            onClick={props.onProposeMatchPolicy}
            disabled={!props.canProposeMatchPolicy}
          >
            Änderung vorschlagen
          </button>
        </div>
        <PairSettingsMatchPolicyPendingRequest {...props} />
      </div>
    </>
  );
}

function PairSettingsMatchPolicyPendingRequest(props: PairSettingsMatchPolicyCardProps) {
  const pending = props.pair.matchPolicyPending;
  if (!pending) return null;

  return (
    <div
      className="settings-pending-block"
      data-pending-owner={props.isOwnMatchPolicyPending ? "own" : "partner"}
      data-testid="match-policy-pending-block"
    >
      <PendingRequestHeader
        title={
          props.isOwnMatchPolicyPending ? "Warte auf Zustimmung" : "Deine Zustimmung ist gefragt"
        }
        label="Offene Match-Regel-Anfrage"
      />
      {props.isOwnMatchPolicyPending ? (
        <div className="request request-panel">
          <div className="row request-panel-head settings-request-head">
            <PendingRequestSummary policy={pending.policy} />
            <button
              className="secondary action-cancel"
              data-testid="match-policy-cancel-button"
              onClick={() => props.onRespondMatchPolicy("cancel")}
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
            <PendingRequestSummary policy={pending.policy} />
          </div>
          <div className="row request-actions">
            <button
              className="action-accept"
              data-testid="match-policy-accept-button"
              onClick={() => props.onRespondMatchPolicy("accept")}
              disabled={props.isLoadingGroupSettings}
            >
              Annehmen
            </button>
            <button
              className="action-reject"
              data-testid="match-policy-reject-button"
              onClick={() => props.onRespondMatchPolicy("reject")}
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

function PendingRequestSummary({ policy }: { policy: MatchPolicy }) {
  return (
    <div>
      <div className="pair-card-name">{matchPolicyLabel(policy)}</div>
    </div>
  );
}
