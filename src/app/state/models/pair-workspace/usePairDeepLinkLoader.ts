import { useEffect, useRef } from "react";
import { idbGet } from "../../../../storage/idb";
import type {
  ApiClient,
  OpenPairWorkflow,
  PairingApi,
  PairSelectionApi,
  PairWorkspaceRoute
} from "./types";

type UsePairDeepLinkLoaderOptions = {
  apiClient: ApiClient | null;
  route: PairWorkspaceRoute;
  pair: PairSelectionApi["pair"];
  refreshCurrentPairing: PairingApi["refreshCurrentPairing"];
  openPair: OpenPairWorkflow;
};

function isPairRouteMode(mode: PairWorkspaceRoute["pairRouteMode"]) {
  return (
    mode === "pair" ||
    mode === "pairMatches" ||
    mode === "pairSettings" ||
    mode === "ask" ||
    mode === "played"
  );
}

export function usePairDeepLinkLoader({
  apiClient,
  route,
  pair,
  refreshCurrentPairing,
  openPair
}: UsePairDeepLinkLoaderOptions) {
  const { pairRouteMode, pairRoutePairId } = route;
  const initialPreloadDoneRef = useRef(false);

  useEffect(() => {
    if (!apiClient) return;
    if (initialPreloadDoneRef.current) return;
    initialPreloadDoneRef.current = true;
    (async () => {
      try {
        await refreshCurrentPairing();
        const routeTargetPairId =
          pairRoutePairId && isPairRouteMode(pairRouteMode) ? pairRoutePairId : null;
        const last = await idbGet<string>("ui:lastPairId");
        const targetPairId = routeTargetPairId ?? last;
        if (targetPairId) await openPair(targetPairId);
      } catch {
        // ignore initial preload errors
      }
    })();
  }, [apiClient, openPair, refreshCurrentPairing, pairRouteMode, pairRoutePairId]);

  useEffect(() => {
    if (!apiClient) return;
    if (!pairRoutePairId) return;
    if (!isPairRouteMode(pairRouteMode)) return;
    if (pair?.id === pairRoutePairId) return;
    (async () => {
      try {
        await openPair(pairRoutePairId);
      } catch {
        // ignore deep-link load errors
      }
    })();
  }, [apiClient, openPair, pair?.id, pairRouteMode, pairRoutePairId]);
}
