import { useCallback, useMemo } from "react";
import type { api } from "../../../api/api";
import { useHiddenMatches } from "../../../hooks/useHiddenMatches";
import { useMatches } from "../../../hooks/useMatches";
import type { Identity } from "../../../state/identity";
import type { PairView } from "../../../types";
import type { MatchesContextValue } from "../AppContexts";
import { MIN_LOADING_MS } from "./constants";

type ApiClient = ReturnType<typeof api>;

type UseMatchesModelOptions = {
  apiClient: ApiClient | null;
  identity: Identity | null;
  pair: PairView | null;
};

export function useMatchesModel(opts: UseMatchesModelOptions) {
  const { apiClient, identity, pair } = opts;
  const matchState = useMatches({ apiClient, identity, pair, minLoadingMs: MIN_LOADING_MS });
  const hiddenMatches = useHiddenMatches(pair?.id ?? null);
  const visibleMatchesCount = useMemo(
    () => hiddenMatches.visibleMatchesCount(matchState.matches.map((match) => match.id)),
    [hiddenMatches, matchState.matches]
  );

  const computeCurrentMatches = useCallback(async () => {
    await matchState.computeMatches(pair ?? undefined);
  }, [matchState, pair]);

  const hideMatch = useCallback(
    (matchId: string) => {
      hiddenMatches.setHiddenMatchIds((prev) =>
        prev.includes(matchId) ? prev : [...prev, matchId]
      );
    },
    [hiddenMatches]
  );

  const restoreMatch = useCallback(
    (matchId: string) => {
      hiddenMatches.setHiddenMatchIds((prev) => prev.filter((id) => id !== matchId));
    },
    [hiddenMatches]
  );

  const toggleHiddenMatchesView = useCallback(() => {
    hiddenMatches.setShowHiddenMatches((prev) => !prev);
  }, [hiddenMatches]);

  const matches: MatchesContextValue = {
    matches: matchState.matches,
    isLoadingMatches: matchState.isLoadingMatches,
    hiddenMatchIds: hiddenMatches.hiddenMatchIds,
    showHiddenMatches: hiddenMatches.showHiddenMatches,
    visibleMatchesCount,
    computeMatches: computeCurrentMatches,
    hideMatch,
    restoreMatch,
    toggleHiddenMatchesView
  };

  return {
    hiddenMatches,
    matchActions: {
      matches: matchState.matches,
      clearMatches: matchState.clearMatches,
      computeMatches: matchState.computeMatches
    },
    matches
  };
}
