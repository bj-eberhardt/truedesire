import { useCallback } from "react";
import type { api } from "../../../api/api";
import type { useHiddenMatches } from "../../../hooks/useHiddenMatches";
import type { MatchView } from "../../../hooks/useMatches";
import type { PairView } from "../../../types";
import { useAppRoute } from "../../hooks/useAppRoute";
import { usePairWorkspace } from "../../hooks/usePairWorkspace";
import type { PairWorkspaceContextValue } from "../AppContexts";

type ApiClient = ReturnType<typeof api>;
type HiddenMatchesModel = ReturnType<typeof useHiddenMatches>;

type UsePairWorkspaceModelOptions = {
  apiClient: ApiClient | null;
  pair: PairView | null;
  selectPair: (pairId: string) => Promise<PairView | null>;
  isLoadingPairData: boolean;
  refreshPairing: () => Promise<void>;
  questionActions: {
    refreshSystemQuestionHashes: () => Promise<void>;
    ensureSystemQuestionsSeeded: (pair: PairView) => Promise<void>;
    loadQuestionsAndDecrypt: (pairOverride?: PairView) => Promise<void>;
    clearQuestions: () => void;
  };
  matchActions: {
    matches: MatchView[];
    clearMatches: () => void;
    computeMatches: (pairOverride?: PairView) => Promise<void>;
  };
  hiddenMatches: HiddenMatchesModel;
};

export type PairWorkspaceModel = {
  pairWorkspace: PairWorkspaceContextValue;
  visiblePairMatchesCount: number;
};

export function usePairWorkspaceModel(opts: UsePairWorkspaceModelOptions): PairWorkspaceModel {
  const {
    apiClient,
    pair,
    selectPair,
    isLoadingPairData,
    refreshPairing,
    questionActions,
    matchActions,
    hiddenMatches
  } = opts;
  const { route, pairRouteMode, pairRoutePairId } = useAppRoute();

  const { openPair, refreshPairView, isRefreshingPairView, visiblePairMatchesCount } =
    usePairWorkspace({
      apiClient,
      route: { pairRouteMode, pairRoutePairId },
      pairSelection: { pair, selectPair },
      pairing: { refreshCurrentPairing: refreshPairing },
      questions: questionActions,
      matches: matchActions,
      hiddenMatches
    });

  const openPairRoute = useCallback((pairId: string) => {
    window.location.hash = `#/v3/pair/${encodeURIComponent(pairId)}`;
  }, []);

  return {
    pairWorkspace: {
      route,
      pair,
      isLoadingPairData: isLoadingPairData || isRefreshingPairView,
      openPair,
      openPairRoute,
      refreshPairView
    },
    visiblePairMatchesCount
  };
}
