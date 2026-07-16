import { ProfileAvatar } from "../../../components/ProfileAvatar";
import { RefreshButton } from "../../../components/RefreshButton";
import { PairStatusBadge, V3LoadingState, V3Notice } from "../components";
import { SettingsIcon } from "../components/icons/SettingsIcon";
import { PairMatchesTab } from "./pair/PairMatchesTab";
import { PairPlayTab } from "./pair/PairPlayTab";
import { PairSettingsTab } from "./pair/PairSettingsTab";
import { usePairPageModel } from "./pair/usePairPageModel";

export function PairPage() {
  const model = usePairPageModel();

  if (!model.pairReady || !model.pair) {
    return (
      <section className="card v3-card" data-testid="pair-loading-view">
        <div className="row">
          <button
            className="secondary"
            data-testid="pair-loading-back-button"
            onClick={model.goBack}
            title="Zurück zur Partnerübersicht"
          >
            ← Zurück
          </button>
          <RefreshButton
            testId="pair-loading-refresh-button"
            onClick={model.refreshPairView}
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

  const pair = model.pair;

  return (
    <section className="card v3-card v3-pair" data-testid="pair-view" data-pair-id={model.pairId}>
      <div className="v3-pair-topbar">
        <button
          className="secondary v3-pair-back"
          data-testid="pair-back-button"
          onClick={model.goBack}
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
                <PairStatusBadge status={pair.status} partnerDeleted={pair.partnerDeleted} />
              </div>
            </div>
          </div>
        </div>
        <div className="v3-pair-actions">
          <RefreshButton
            testId="pair-refresh-button"
            onClick={model.refreshPairView}
            disabled={model.isLoadingPairData}
            title="Ansicht neu laden"
          />
        </div>
      </div>

      {model.pendingSettingsCount ? (
        <V3Notice
          icon={<SettingsIcon />}
          title="Offene Einstellungsanfrage"
          hint="Tippe hier, um sie in den Einstellungen zu prüfen."
          onClick={model.openSettingsNotice}
        />
      ) : null}

      {pair.partnerDeleted ? (
        <div className="notice">Partner ist gelöscht. Keine weitere Interaktion möglich.</div>
      ) : null}

      <div className="v3-pair-tabs" role="tablist" aria-label="Bereiche">
        <button
          type="button"
          className="v3-pair-tab"
          data-active={model.showPlay ? "true" : "false"}
          role="tab"
          data-testid="pair-tab-play"
          aria-selected={model.showPlay}
          onClick={model.switchToPlay}
        >
          Fragen
        </button>
        <button
          type="button"
          className="v3-pair-tab"
          data-active={model.showMatches ? "true" : "false"}
          role="tab"
          data-testid="pair-tab-matches"
          aria-selected={model.showMatches}
          onClick={model.switchToMatches}
        >
          Matches
        </button>
        <button
          type="button"
          className="v3-pair-tab"
          data-active={model.showSettings ? "true" : "false"}
          role="tab"
          data-testid="pair-tab-settings"
          aria-selected={model.showSettings}
          onClick={model.switchToSettings}
        >
          Einstellungen{model.pendingSettingsCount ? ` (${model.pendingSettingsCount})` : ""}
        </button>
      </div>

      {model.showPlay ? <PairPlayTab /> : null}
      {model.showMatches ? <PairMatchesTab /> : null}
      {model.showSettings ? <PairSettingsTab /> : null}
    </section>
  );
}
