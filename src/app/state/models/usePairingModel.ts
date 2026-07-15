import { useCallback } from "react";
import type { api } from "../../../api/api";
import type { Identity } from "../../../state/identity";
import type { PairingContextValue } from "../AppContexts";
import { usePairing } from "./pairing/usePairing";

type ApiClient = ReturnType<typeof api>;

type UsePairingModelOptions = {
  apiClient: ApiClient | null;
  identity: Identity | null;
  clearGlobalError: () => void;
};

export type PairingModel = {
  pairing: PairingContextValue;
  refreshPairing: (identityOverride?: Identity) => Promise<void>;
};

export function usePairingModel(opts: UsePairingModelOptions): PairingModel {
  const { apiClient, identity, clearGlobalError } = opts;
  const {
    pairingIncoming,
    pairingOutgoing,
    myPairs,
    pairingInlineError,
    clearPairingInlineError,
    refreshPairing,
    refreshPairingRequests,
    sendPairRequest,
    respond
  } = usePairing(apiClient, identity);

  const sendPairRequestAndClearError = useCallback(
    async (code: string) => {
      clearGlobalError();
      await sendPairRequest(code);
    },
    [clearGlobalError, sendPairRequest]
  );

  const respondPairingAndClearError = useCallback(
    async (requestId: string, action: "accept" | "reject" | "cancel") => {
      clearGlobalError();
      return await respond(requestId, action);
    },
    [clearGlobalError, respond]
  );

  return {
    refreshPairing,
    pairing: {
      incoming: pairingIncoming,
      outgoing: pairingOutgoing,
      myPairs,
      inlineError: pairingInlineError,
      clearInlineError: clearPairingInlineError,
      refreshRequests: refreshPairingRequests,
      sendPairRequest: sendPairRequestAndClearError,
      respondPairing: respondPairingAndClearError
    }
  };
}
