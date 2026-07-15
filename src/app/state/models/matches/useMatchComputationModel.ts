import { useCallback } from "react";
import type { api } from "../../../../api/api";
import type { Identity } from "../../../../state/identity";
import type { PairView } from "../../../../types";
import { MIN_LOADING_MS } from "../constants";
import type { MatchActions } from "./types";
import { useMatches } from "./useMatches";

type ApiClient = ReturnType<typeof api>;

type UseMatchComputationModelOptions = {
  apiClient: ApiClient | null;
  identity: Identity | null;
  pair: PairView | null;
};

export function useMatchComputationModel({
  apiClient,
  identity,
  pair
}: UseMatchComputationModelOptions) {
  const matchState = useMatches({ apiClient, identity, pair, minLoadingMs: MIN_LOADING_MS });

  const computeCurrentMatches = useCallback(async () => {
    await matchState.computeMatches(pair ?? undefined);
  }, [matchState, pair]);

  const matchActions: MatchActions = {
    matches: matchState.matches,
    clearMatches: matchState.clearMatches,
    computeMatches: matchState.computeMatches
  };

  return {
    matchActions,
    matchState: {
      matches: matchState.matches,
      isLoadingMatches: matchState.isLoadingMatches,
      computeCurrentMatches
    }
  };
}
