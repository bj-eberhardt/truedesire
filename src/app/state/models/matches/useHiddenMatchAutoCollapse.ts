import { useEffect } from "react";
import type { HiddenMatchesState, MatchActions } from "./types";

type UseHiddenMatchAutoCollapseOptions = Pick<MatchActions, "matches"> &
  Pick<HiddenMatchesState, "hiddenMatchIds" | "showHiddenMatches" | "setShowHiddenMatches">;

export function useHiddenMatchAutoCollapse({
  matches,
  hiddenMatchIds,
  showHiddenMatches,
  setShowHiddenMatches
}: UseHiddenMatchAutoCollapseOptions) {
  useEffect(() => {
    if (!showHiddenMatches) return;
    const hiddenCount = matches.filter((match) => hiddenMatchIds.includes(match.id)).length;
    if (hiddenCount > 0) return;

    const timeoutId = window.setTimeout(() => setShowHiddenMatches(false), 150);
    return () => window.clearTimeout(timeoutId);
  }, [showHiddenMatches, matches, hiddenMatchIds, setShowHiddenMatches]);
}
