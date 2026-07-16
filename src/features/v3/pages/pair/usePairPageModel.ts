import { goV3, goV3Pair, goV3PairMatches, goV3PairSettings } from "../../../../app/routes";
import {
  useGroupSettingsContext,
  useMatchesContext,
  usePairWorkspaceContext,
  useSessionContext
} from "../../../../app/state";

export type PairPageTab = "play" | "matches" | "settings";

export function usePairPageModel() {
  const { identity } = useSessionContext();
  const workspace = usePairWorkspaceContext();
  const matchesContext = useMatchesContext();
  const groupSettings = useGroupSettingsContext();
  const pairId = workspace.route.route.pairId ?? "";
  const routeMode = workspace.route.route.mode;
  const pair = workspace.pair;
  const pairReady = !!pair && pair.id === pairId;
  const activeTab: PairPageTab =
    routeMode === "pairMatches" ? "matches" : routeMode === "pairSettings" ? "settings" : "play";
  const pendingSettingsCount =
    pairReady &&
    pair.weeklyLimitPending &&
    pair.weeklyLimitPending.proposedBy !== (identity?.userId ?? "")
      ? 1
      : 0;

  return {
    activeTab,
    goBack: goV3,
    isLoadingPairData: workspace.isLoadingPairData,
    openSettingsNotice: () => goV3PairSettings(pairId),
    pair,
    pairId,
    pairReady,
    pendingSettingsCount,
    refreshPairView: workspace.refreshPairView,
    showMatches: activeTab === "matches",
    showPlay: activeTab === "play",
    showSettings: activeTab === "settings",
    switchToMatches: () => {
      goV3PairMatches(pairId);
      void matchesContext.computeMatches();
    },
    switchToPlay: () => {
      goV3Pair(pairId);
      void workspace.refreshPairView();
    },
    switchToSettings: () => {
      goV3PairSettings(pairId);
      void groupSettings.refreshGroupSettings();
    }
  };
}

export type PairPageModel = ReturnType<typeof usePairPageModel>;
