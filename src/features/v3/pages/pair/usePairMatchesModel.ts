import { useMemo } from "react";
import { useMatchesContext } from "../../../../app/state";

export function usePairMatchesModel() {
  const matchesContext = useMatchesContext();
  const hiddenMatchIdSet = useMemo(
    () => new Set(matchesContext.hiddenMatchIds),
    [matchesContext.hiddenMatchIds]
  );
  const visibleMatches = useMemo(
    () =>
      matchesContext.matches.filter((match) =>
        matchesContext.showHiddenMatches
          ? hiddenMatchIdSet.has(match.id)
          : !hiddenMatchIdSet.has(match.id)
      ),
    [hiddenMatchIdSet, matchesContext.matches, matchesContext.showHiddenMatches]
  );
  const hiddenCount = useMemo(
    () => matchesContext.matches.filter((match) => hiddenMatchIdSet.has(match.id)).length,
    [hiddenMatchIdSet, matchesContext.matches]
  );

  return {
    computeMatches: matchesContext.computeMatches,
    hiddenCount,
    isLoadingMatches: matchesContext.isLoadingMatches,
    matches: matchesContext.matches,
    restoreMatch: matchesContext.restoreMatch,
    hideMatch: matchesContext.hideMatch,
    showHiddenMatches: matchesContext.showHiddenMatches,
    showHiddenMatchesDisabled: hiddenCount === 0,
    toggleHiddenMatchesView: matchesContext.toggleHiddenMatchesView,
    visibleMatches,
    visibleMatchesCount: matchesContext.visibleMatchesCount
  };
}

export type PairMatchesModel = ReturnType<typeof usePairMatchesModel>;
