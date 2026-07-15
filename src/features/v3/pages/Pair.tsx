import {
  useGroupSettingsContext,
  useMatchesContext,
  usePairWorkspaceContext,
  useSessionContext
} from "../../../app/state";
import { ProfileAvatar } from "../../../components/ProfileAvatar";
import { RefreshButton } from "../../../components/RefreshButton";
import { goV3, goV3Pair, goV3PairMatches, goV3PairSettings } from "../../../app/routes";
import { V3LoadingState } from "../components/V3PageState";
import { V3Notice } from "../components/V3Notice";
import { SettingsIcon } from "../components/icons/SettingsIcon";
import { PairMatchesTab } from "./pair/PairMatchesTab";
import { PairPlayTab } from "./pair/PairPlayTab";
import { PairSettingsTab } from "./pair/PairSettingsTab";

export function PairPage() {
  const { identity } = useSessionContext();
  const workspace = usePairWorkspaceContext();
  const matchesContext = useMatchesContext();
  const groupSettings = useGroupSettingsContext();
  const pairId = workspace.route.route.pairId ?? "";
  const routeMode = workspace.route.route.mode;
  const pair = workspace.pair;
  const pairReady = !!pair && pair.id === pairId;

  const activeTab =
    routeMode === "pairMatches" ? "matches" : routeMode === "pairSettings" ? "settings" : "play";
  const showPlay = activeTab === "play";
  const showMatches = activeTab === "matches";
  const showSettings = activeTab === "settings";
  const pendingSettingsCount =
    pairReady &&
    pair.weeklyLimitPending &&
    pair.weeklyLimitPending.proposedBy !== (identity?.userId ?? "")
      ? 1
      : 0;

  if (!pairReady) {
    return (
      <section className="card v3-card" data-testid="pair-loading-view">
        <div className="row">
          <button
            className="secondary"
            data-testid="pair-loading-back-button"
            onClick={goV3}
            title="Zurück zur Partnerübersicht"
          >
            ← Zurück
          </button>
          <RefreshButton
            testId="pair-loading-refresh-button"
            onClick={workspace.refreshPairView}
            disabled
            title="Ansicht neu laden"
          />
          <button className="primary" disabled>
            Eine Frage stellen
          </button>
        </div>
        <V3LoadingState>Verknüpfung wird geladen…</V3LoadingState>
      </section>
    );
  }

  return (
    <section className="card v3-card v3-pair" data-testid="pair-view" data-pair-id={pairId}>
      <div className="v3-pair-topbar">
        <button
          className="secondary v3-pair-back"
          data-testid="pair-back-button"
          onClick={goV3}
          title="Zurück zur Partnerübersicht"
        >
          ← Zurück
        </button>
        <div className="v3-pair-head">
          <div className="v3-pair-head-main">
            <ProfileAvatar name={pair.partner?.nickname ?? "??"} />
            <div className="v3-pair-meta">
              <h2>{pair.partner?.nickname ?? pair.id}</h2>
              <div className="v3-pair-sub">
                <span className="pill mono v3-pair-code">{pair.partner?.code ?? "—"}</span>
                {pair.partnerDeleted || pair.status !== "active" ? (
                  <span
                    className={`pill status ${pair.status === "active" ? "ok" : pair.status === "ended" ? "ended" : "pending"}`}
                  >
                    {pair.partnerDeleted
                      ? "gelöscht"
                      : pair.status === "ended"
                        ? "beendet"
                        : "ausstehend"}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </div>
        <div className="v3-pair-actions">
          <RefreshButton
            testId="pair-refresh-button"
            onClick={workspace.refreshPairView}
            disabled={workspace.isLoadingPairData}
            title="Ansicht neu laden"
          />
        </div>
      </div>

      {pendingSettingsCount ? (
        <V3Notice
          icon={<SettingsIcon />}
          title="Offene Einstellungsanfrage"
          hint="Tippe hier, um sie in den Einstellungen zu prüfen."
          onClick={() => goV3PairSettings(pairId)}
        />
      ) : null}

      {pair.partnerDeleted ? (
        <div className="notice">Partner ist gelöscht. Keine weitere Interaktion möglich.</div>
      ) : null}

      <div className="v3-pair-tabs" role="tablist" aria-label="Bereiche">
        <button
          type="button"
          className="v3-pair-tab"
          data-active={showPlay ? "true" : "false"}
          role="tab"
          data-testid="pair-tab-play"
          aria-selected={showPlay}
          onClick={() => {
            goV3Pair(pairId);
            void workspace.refreshPairView();
          }}
        >
          Fragen
        </button>
        <button
          type="button"
          className="v3-pair-tab"
          data-active={showMatches ? "true" : "false"}
          role="tab"
          data-testid="pair-tab-matches"
          aria-selected={showMatches}
          onClick={() => {
            goV3PairMatches(pairId);
            void matchesContext.computeMatches();
          }}
        >
          Matches
        </button>
        <button
          type="button"
          className="v3-pair-tab"
          data-active={showSettings ? "true" : "false"}
          role="tab"
          data-testid="pair-tab-settings"
          aria-selected={showSettings}
          onClick={() => {
            goV3PairSettings(pairId);
            void groupSettings.refreshGroupSettings();
          }}
        >
          Einstellungen{pendingSettingsCount ? ` (${pendingSettingsCount})` : ""}
        </button>
      </div>

      {showPlay ? <PairPlayTab /> : null}
      {showMatches ? <PairMatchesTab /> : null}
      {showSettings ? <PairSettingsTab /> : null}
    </section>
  );
}
