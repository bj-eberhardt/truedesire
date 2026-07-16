import { useMemo } from "react";
import type { MatchView } from "../../../../domain/matches/computeMatchViews";
import { useHiddenMatches } from "./useHiddenMatches";
import { useHiddenMatchAutoCollapse } from "./useHiddenMatchAutoCollapse";

type UseHiddenMatchesModelOptions = {
  pairId: string | null;
  matches: MatchView[];
};

export function useHiddenMatchesModel({ pairId, matches }: UseHiddenMatchesModelOptions) {
  const hiddenMatches = useHiddenMatches(pairId);
  const matchIds = useMemo(() => matches.map((match) => match.id), [matches]);
  const visibleMatchesCount = useMemo(
    () => hiddenMatches.visibleMatchesCount(matchIds),
    [hiddenMatches, matchIds]
  );

  useHiddenMatchAutoCollapse({
    matches,
    hiddenMatchIds: hiddenMatches.hiddenMatchIds,
    showHiddenMatches: hiddenMatches.showHiddenMatches,
    setShowHiddenMatches: hiddenMatches.setShowHiddenMatches
  });

  return { hiddenMatches, visibleMatchesCount };
}
