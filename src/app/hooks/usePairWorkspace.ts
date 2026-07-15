import { useCallback, useState } from "react";
import { useOpenPairWorkflow } from "./pair-workspace/useOpenPairWorkflow";
import { usePairDeepLinkLoader } from "./pair-workspace/usePairDeepLinkLoader";
import type {
  ApiClient,
  MatchesApi,
  PairingApi,
  PairSelectionApi,
  PairWorkspaceRoute,
  QuestionsApi
} from "./pair-workspace/types";

type UsePairWorkspaceOptions = {
  apiClient: ApiClient | null;
  route: PairWorkspaceRoute;
  pairSelection: PairSelectionApi;
  pairing: PairingApi;
  questions: QuestionsApi;
  matches: MatchesApi;
};

type UsePairWorkspaceResult = {
  openPair: (pairId: string, opts?: { preserveCurrent?: boolean }) => Promise<void>;
  refreshPairView: () => Promise<void>;
  isRefreshingPairView: boolean;
};

export function usePairWorkspace(opts: UsePairWorkspaceOptions): UsePairWorkspaceResult {
  const { apiClient, route, pairSelection, pairing, questions, matches } = opts;
  const { pairRoutePairId } = route;
  const { pair, selectPair } = pairSelection;
  const { refreshCurrentPairing } = pairing;
  const {
    refreshSystemQuestionHashes,
    ensureSystemQuestionsSeeded,
    loadQuestionsAndDecrypt,
    clearQuestions
  } = questions;
  const { clearMatches, computeMatches } = matches;
  const [isRefreshingPairView, setIsRefreshingPairView] = useState(false);

  const openPair = useOpenPairWorkflow({
    selectPair,
    refreshSystemQuestionHashes,
    ensureSystemQuestionsSeeded,
    loadQuestionsAndDecrypt,
    clearQuestions,
    clearMatches,
    computeMatches
  });

  usePairDeepLinkLoader({ apiClient, route, pair, refreshCurrentPairing, openPair });

  const refreshPairView = useCallback(async () => {
    const targetPairId = pairRoutePairId ?? pair?.id;
    if (!targetPairId) return;
    setIsRefreshingPairView(true);
    try {
      await refreshCurrentPairing();
      await openPair(targetPairId, { preserveCurrent: true });
    } catch {
      // ignore
    } finally {
      setIsRefreshingPairView(false);
    }
  }, [openPair, pair?.id, refreshCurrentPairing, pairRoutePairId]);

  return { openPair, refreshPairView, isRefreshingPairView };
}
