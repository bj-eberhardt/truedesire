import { useCallback, useMemo, useRef, useState } from "react";
import { api } from "../../../../api/api";
import { getApiBaseUrl } from "../../../../api/baseUrl";
import type { Identity } from "../../../../state/identity";
import { idbGet, idbSet } from "../../../../storage/idb";
import type { PairView } from "../../../../types";
import type { ApiClient } from "./types";

export function usePairLoader(opts: {
  apiClient: ApiClient | null;
  identity: Identity | null;
  minLoadingMs: number;
  pair: PairView | null;
  refreshPairing: (identityOverride?: Identity) => Promise<void>;
  setPair: (pair: PairView | null) => void;
  syncGroupSettingsFromPair: (pair: PairView) => void;
}) {
  const {
    apiClient,
    identity,
    minLoadingMs,
    pair,
    refreshPairing,
    setPair,
    syncGroupSettingsFromPair
  } = opts;
  const [isLoadingPairData, setIsLoadingPairData] = useState(false);
  const inFlightRef = useRef(false);
  const baseUrl = useMemo(() => getApiBaseUrl(), []);

  const refreshCurrentPair = useCallback(async () => {
    if (!apiClient || !pair) return;
    try {
      const nextPair = await apiClient.pair.get(pair.id);
      setPair(nextPair);
      syncGroupSettingsFromPair(nextPair);
    } catch {
      // ignore
    }
  }, [apiClient, pair, setPair, syncGroupSettingsFromPair]);

  const loadLastPairIfAny = useCallback(
    async (identityOverride?: Identity | null) => {
      const last = await idbGet<string>("ui:lastPairId");
      if (!last) return;
      const id = identityOverride ?? identity;
      if (!id?.userId) return;
      const client =
        apiClient ??
        api({
          baseUrl,
          getAuthMaterial: async () => id.auth
        });
      try {
        const nextPair = await client.pair.get(last);
        setPair(nextPair);
        syncGroupSettingsFromPair(nextPair);
      } catch {
        // ignore
      }
    },
    [apiClient, baseUrl, identity, setPair, syncGroupSettingsFromPair]
  );

  const selectPair = useCallback(
    async (pairId: string) => {
      if (!apiClient) return null;
      if (inFlightRef.current) return null;
      inFlightRef.current = true;
      const startedAt = Date.now();
      setIsLoadingPairData(true);
      try {
        const nextPair = await apiClient.pair.get(pairId);
        setPair(nextPair);
        syncGroupSettingsFromPair(nextPair);
        await idbSet("ui:lastPairId", pairId);
        await refreshPairing();
        return nextPair;
      } finally {
        const elapsed = Date.now() - startedAt;
        if (elapsed < minLoadingMs)
          await new Promise((resolve) => window.setTimeout(resolve, minLoadingMs - elapsed));
        setIsLoadingPairData(false);
        inFlightRef.current = false;
      }
    },
    [apiClient, minLoadingMs, refreshPairing, setPair, syncGroupSettingsFromPair]
  );

  return { isLoadingPairData, loadLastPairIfAny, refreshCurrentPair, selectPair };
}
