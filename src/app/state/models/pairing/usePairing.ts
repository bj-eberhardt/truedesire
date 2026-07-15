import { useCallback, useEffect } from "react";
import type { Identity } from "../../../../state/identity";
import { usePairingActions } from "./usePairingActions";
import { usePairingClient } from "./usePairingClient";
import { usePairingPartners } from "./usePairingPartners";
import { usePairingRequests } from "./usePairingRequests";
import type { ApiClient, MyPairs, PairingIncoming, PairingOutgoing } from "./types";

export type { MyPairs, PairingIncoming, PairingOutgoing } from "./types";

type UsePairingResult = {
  pairingIncoming: PairingIncoming;
  pairingOutgoing: PairingOutgoing;
  myPairs: MyPairs;
  pairingInlineError: string | null;
  clearPairingInlineError: () => void;
  refreshPairing: (identityOverride?: Identity) => Promise<void>;
  refreshPairingRequests: (identityOverride?: Identity) => Promise<void>;
  sendPairRequest: (partnerCodeInput: string) => Promise<void>;
  respond: (
    requestId: string,
    action: "accept" | "reject" | "cancel"
  ) => Promise<{ pairId?: string | null }>;
};

export function usePairing(
  apiClient: ApiClient | null,
  identity: Identity | null
): UsePairingResult {
  const getClient = usePairingClient(apiClient, identity);
  const {
    pairingIncoming,
    pairingOutgoing,
    refreshPairingRequests: loadPairingRequests
  } = usePairingRequests(getClient);
  const { myPairs, refreshPairingPartners } = usePairingPartners(getClient);

  const refreshPairing = useCallback(
    async (identityOverride?: Identity) => {
      await loadPairingRequests(identityOverride);
      await refreshPairingPartners(identityOverride);
    },
    [loadPairingRequests, refreshPairingPartners]
  );

  const refreshPairingRequests = useCallback(
    async (identityOverride?: Identity) => {
      const reqs = await loadPairingRequests(identityOverride);
      if (!reqs || reqs.incoming.length || reqs.outgoing.length) return;
      await refreshPairingPartners(identityOverride);
    },
    [loadPairingRequests, refreshPairingPartners]
  );

  const pairingActions = usePairingActions({
    apiClient,
    refreshPairing
  });

  useEffect(() => {
    if (!identity?.userId) return;
    (async () => {
      try {
        await refreshPairing(identity);
      } catch {
        // ignore initial refresh errors
      }
    })();
  }, [identity, refreshPairing]);

  return {
    pairingIncoming,
    pairingOutgoing,
    myPairs,
    pairingInlineError: pairingActions.pairingInlineError,
    clearPairingInlineError: pairingActions.clearPairingInlineError,
    refreshPairing,
    refreshPairingRequests,
    sendPairRequest: pairingActions.sendPairRequest,
    respond: pairingActions.respond
  };
}
