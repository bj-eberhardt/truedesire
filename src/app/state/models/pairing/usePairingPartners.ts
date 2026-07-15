import { useCallback, useState } from "react";
import type { Identity } from "../../../../state/identity";
import type { ApiClient, MyPairs } from "./types";

type GetPairingClient = (identityOverride?: Identity) => ApiClient | null;

export function usePairingPartners(getClient: GetPairingClient) {
  const [myPairs, setMyPairs] = useState<MyPairs>([]);

  const refreshPairingPartners = useCallback(
    async (identityOverride?: Identity) => {
      const client = getClient(identityOverride);
      if (!client) return;
      const pairs = await client.pairs.list();
      setMyPairs(pairs.pairs);
    },
    [getClient]
  );

  return {
    myPairs,
    refreshPairingPartners
  };
}
