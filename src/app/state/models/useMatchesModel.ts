import type { api } from "../../../api/api";
import type { Identity } from "../../../state/identity";
import type { PairView } from "../../../types";
import type { MatchesContextValue } from "../AppContexts";
import { useHiddenMatchesModel } from "./matches/useHiddenMatchesModel";
import { useMatchComputationModel } from "./matches/useMatchComputationModel";
import { useMatchVisibilityActions } from "./matches/useMatchVisibilityActions";

type ApiClient = ReturnType<typeof api>;

type UseMatchesModelOptions = {
  apiClient: ApiClient | null;
  identity: Identity | null;
  pair: PairView | null;
};

export function useMatchesModel(opts: UseMatchesModelOptions) {
  const { apiClient, identity, pair } = opts;
  const { matchActions, matchState } = useMatchComputationModel({ apiClient, identity, pair });
  const { hiddenMatches, visibleMatchesCount } = useHiddenMatchesModel({
    pairId: pair?.id ?? null,
    matches: matchState.matches
  });
  const { hideMatch, restoreMatch, toggleHiddenMatchesView } = useMatchVisibilityActions({
    hiddenMatches
  });

  const matches: MatchesContextValue = {
    matches: matchState.matches,
    isLoadingMatches: matchState.isLoadingMatches,
    hiddenMatchIds: hiddenMatches.hiddenMatchIds,
    showHiddenMatches: hiddenMatches.showHiddenMatches,
    visibleMatchesCount,
    computeMatches: matchState.computeCurrentMatches,
    hideMatch,
    restoreMatch,
    toggleHiddenMatchesView
  };

  return {
    matchActions,
    matches
  };
}
