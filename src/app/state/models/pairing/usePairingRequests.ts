import { useCallback, useState } from "react";
import type { Identity } from "../../../../state/identity";
import type { ApiClient, PairingIncoming, PairingOutgoing } from "./types";

type GetPairingClient = (identityOverride?: Identity) => ApiClient | null;

type PairingRequestsResult = {
  incoming: PairingIncoming;
  outgoing: PairingOutgoing;
};

export function usePairingRequests(getClient: GetPairingClient) {
  const [pairingIncoming, setPairingIncoming] = useState<PairingIncoming>([]);
  const [pairingOutgoing, setPairingOutgoing] = useState<PairingOutgoing>([]);

  const refreshPairingRequests = useCallback(
    async (identityOverride?: Identity): Promise<PairingRequestsResult | null> => {
      const client = getClient(identityOverride);
      if (!client) return null;
      const reqs = await client.pairing.requests();
      setPairingIncoming(reqs.incoming);
      setPairingOutgoing(reqs.outgoing);
      return reqs;
    },
    [getClient]
  );

  return {
    pairingIncoming,
    pairingOutgoing,
    refreshPairingRequests
  };
}

