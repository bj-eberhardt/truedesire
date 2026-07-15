import type { api } from "../../../api/api";
import type { MatchView } from "../../../domain/matches/computeMatchViews";
import type { PairView } from "../../../types";
import type { V3Route } from "../../routes";

export type ApiClient = ReturnType<typeof api>;

export type PairWorkspaceRoute = {
  pairRouteMode: V3Route["mode"] | null;
  pairRoutePairId: string | null;
};

export type PairSelectionApi = {
  pair: PairView | null;
  selectPair: (pairId: string) => Promise<PairView | null>;
};

export type PairingApi = {
  refreshCurrentPairing: () => Promise<void>;
};

export type QuestionsApi = {
  refreshSystemQuestionHashes: () => Promise<void>;
  ensureSystemQuestionsSeeded: (pair: PairView) => Promise<void>;
  loadQuestionsAndDecrypt: (pairOverride?: PairView) => Promise<void>;
  clearQuestions: () => void;
};

export type MatchesApi = {
  matches: MatchView[];
  clearMatches: () => void;
  computeMatches: (pairOverride?: PairView) => Promise<void>;
};

export type OpenPairWorkflow = (
  pairId: string,
  opts?: { preserveCurrent?: boolean }
) => Promise<void>;
