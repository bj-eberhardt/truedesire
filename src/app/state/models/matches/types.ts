import type { Dispatch, SetStateAction } from "react";
import type { MatchView } from "../../../../domain/matches/computeMatchViews";
import type { PairView } from "../../../../types";

export type MatchActions = {
  matches: MatchView[];
  clearMatches: () => void;
  computeMatches: (pairOverride?: PairView) => Promise<void>;
};

export type HiddenMatchesState = {
  hiddenMatchIds: string[];
  setHiddenMatchIds: Dispatch<SetStateAction<string[]>>;
  showHiddenMatches: boolean;
  setShowHiddenMatches: Dispatch<SetStateAction<boolean>>;
  visibleMatchesCount: (matchIds: string[]) => number;
};
