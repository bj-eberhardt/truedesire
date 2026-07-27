import { useCallback, useEffect, useState } from "react";
import { goV3, goV3Pair, goV3PairMatches, goV3PairSettings } from "../../../../app/routes";
import {
  useGroupSettingsContext,
  useMatchesContext,
  usePairWorkspaceContext,
  useSessionContext
} from "../../../../app/state";
import { acknowledgePairWelcome, hasAcknowledgedPairWelcome } from "./pairWelcomePersistence";

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
  const identityUserId = identity?.userId ?? "";
  const [welcomeAckState, setWelcomeAckState] = useState<{
    key: string;
    loaded: boolean;
    acknowledged: boolean;
  }>({ key: "", loaded: false, acknowledged: true });
  const activeTab: PairPageTab =
    routeMode === "pairMatches" ? "matches" : routeMode === "pairSettings" ? "settings" : "play";
  const pendingSettingsCount = pairReady
    ? [pair.weeklyLimitPending?.proposedBy, pair.matchPolicyPending?.proposedBy].filter(
        (proposedBy) => proposedBy && proposedBy !== (identity?.userId ?? "")
      ).length
    : 0;
  const welcomeAckKey = pairReady && identityUserId ? `${identityUserId}:${pairId}` : "";

  useEffect(() => {
    let cancelled = false;
    if (!welcomeAckKey || !identityUserId || !pairReady) {
      setWelcomeAckState({ key: "", loaded: false, acknowledged: true });
      return;
    }

    setWelcomeAckState((current) =>
      current.key === welcomeAckKey
        ? current
        : { key: welcomeAckKey, loaded: false, acknowledged: true }
    );

    void hasAcknowledgedPairWelcome(identityUserId, pairId)
      .then((acknowledged) => {
        if (!cancelled) {
          setWelcomeAckState({ key: welcomeAckKey, loaded: true, acknowledged });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setWelcomeAckState({ key: welcomeAckKey, loaded: true, acknowledged: false });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [identityUserId, pairId, pairReady, welcomeAckKey]);

  const acknowledgeWelcomePanel = useCallback(() => {
    if (!identityUserId || !pairReady) return;
    setWelcomeAckState({ key: welcomeAckKey, loaded: true, acknowledged: true });
    void acknowledgePairWelcome(identityUserId, pairId);
  }, [identityUserId, pairId, pairReady, welcomeAckKey]);

  const showWelcomePanel =
    pairReady &&
    !workspace.isLoadingPairData &&
    welcomeAckState.key === welcomeAckKey &&
    welcomeAckState.loaded &&
    !welcomeAckState.acknowledged;

  return {
    acknowledgeWelcomePanel,
    activeTab,
    goBack: goV3,
    matchPolicy: groupSettings.matchPolicy,
    isLoadingPairData: workspace.isLoadingPairData,
    openSettingsNotice: () => goV3PairSettings(pairId),
    pair,
    pairId,
    pairReady,
    pendingSettingsCount,
    refreshPairView: workspace.refreshPairView,
    showWelcomePanel,
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
