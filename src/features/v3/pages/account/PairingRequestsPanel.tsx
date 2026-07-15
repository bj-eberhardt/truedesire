import { forwardRef } from "react";
import { ProfileAvatar } from "../../../../components/ProfileAvatar";
import { RefreshButton } from "../../../../components/RefreshButton";
import type { PairingContextValue } from "../../../../app/state";
import type { GroupedPairingRequest } from "./groupPairingRequests";

type PairingRequestsPanelProps = {
  groupedRequests: GroupedPairingRequest[];
  isRefreshing: boolean;
  lastCheckedLabel: string;
  onOpenPairRoute: (pairId: string) => void;
  onRefresh: () => Promise<void>;
  respondPairing: PairingContextValue["respondPairing"];
  secondsUntilRefresh: number;
};

export const PairingRequestsPanel = forwardRef<HTMLElement, PairingRequestsPanelProps>(
  function PairingRequestsPanel(props, ref) {
    const {
      groupedRequests,
      isRefreshing,
      lastCheckedLabel,
      onOpenPairRoute,
      onRefresh,
      respondPairing,
      secondsUntilRefresh
    } = props;

    return (
      <section ref={ref} className="card v3-card v3-panel" data-testid="pairing-requests-panel">
        <div className="row v3-pairing-refresh-row">
          <h2>Offene Verknüpfungsanfragen</h2>
          <div className="v3-pairing-refresh-meta">
            <span className="hint">
              Nächste Prüfung in {secondsUntilRefresh}s · zuletzt: {lastCheckedLabel}
            </span>
            <RefreshButton
              testId="pairing-requests-refresh-button"
              onClick={onRefresh}
              disabled={isRefreshing}
              title="Neue Pair-Anfragen prüfen"
            />
          </div>
        </div>
        {!groupedRequests.length ? (
          <div className="empty" data-testid="pairing-requests-empty">
            Keine offenen Anfragen.
          </div>
        ) : null}
        <div className="v3-request-list">
          {groupedRequests.map((row) => (
            <div
              className="v3-request"
              data-testid="pairing-request-row"
              data-request-code={row.code}
              data-request-name={row.nickname}
              key={`${row.code}|${row.nickname}`}
            >
              <div className="v3-request-head">
                <ProfileAvatar name={row.nickname} />
                <div className="v3-request-meta">
                  <div className="v3-request-name">{row.nickname}</div>
                  <div className="mono v3-request-code">{row.code}</div>
                </div>
              </div>
              <div className="v3-request-actions">
                {row.incomingIds.length ? (
                  <>
                    <button
                      className="secondary"
                      data-testid="pairing-request-accept-button"
                      onClick={async () => {
                        const result = await respondPairing(row.incomingIds[0], "accept");
                        if (result?.pairId) onOpenPairRoute(result.pairId);
                      }}
                    >
                      <span className="v3-action-ok">✓</span> Annehmen
                    </button>
                    <button
                      className="secondary"
                      data-testid="pairing-request-reject-button"
                      onClick={() => respondPairing(row.incomingIds[0], "reject")}
                    >
                      <span className="v3-action-bad">✕</span> Ablehnen
                    </button>
                  </>
                ) : null}
                {row.outgoingIds.length ? (
                  <button
                    className="secondary"
                    data-testid="pairing-request-cancel-button"
                    onClick={() => respondPairing(row.outgoingIds[0], "cancel")}
                  >
                    Zurückziehen
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }
);
