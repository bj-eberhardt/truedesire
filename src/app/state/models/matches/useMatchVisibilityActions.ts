import { useCallback } from "react";
import type { HiddenMatchesState } from "./types";

type UseMatchVisibilityActionsOptions = {
  hiddenMatches: HiddenMatchesState;
};

export function useMatchVisibilityActions({ hiddenMatches }: UseMatchVisibilityActionsOptions) {
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

  return { hideMatch, restoreMatch, toggleHiddenMatchesView };
}
