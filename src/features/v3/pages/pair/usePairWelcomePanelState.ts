import { useCallback, useEffect, useState } from "react";
import { acknowledgePairWelcome, hasAcknowledgedPairWelcome } from "./pairWelcomePersistence";

type PairWelcomePanelState = {
  acknowledgeWelcomePanel: () => void;
  showWelcomePanel: boolean;
};

export function usePairWelcomePanelState(opts: {
  identityUserId: string;
  isLoadingPairData: boolean;
  pairId: string;
  pairReady: boolean;
}): PairWelcomePanelState {
  const { identityUserId, isLoadingPairData, pairId, pairReady } = opts;
  const [welcomeAckState, setWelcomeAckState] = useState<{
    key: string;
    loaded: boolean;
    acknowledged: boolean;
  }>({ key: "", loaded: false, acknowledged: true });
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
        if (!cancelled) setWelcomeAckState({ key: welcomeAckKey, loaded: true, acknowledged });
      })
      .catch(() => {
        if (!cancelled)
          setWelcomeAckState({ key: welcomeAckKey, loaded: true, acknowledged: false });
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

  return {
    acknowledgeWelcomePanel,
    showWelcomePanel:
      pairReady &&
      !isLoadingPairData &&
      welcomeAckState.key === welcomeAckKey &&
      welcomeAckState.loaded &&
      !welcomeAckState.acknowledged
  };
}
