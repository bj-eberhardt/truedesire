import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction
} from "react";
import type { api } from "../../api/api";
import type { MatchView } from "../../hooks/useMatches";
import { idbGet } from "../../storage/idb";
import type { PairView } from "../../types";
import type { V3Route } from "../routes";

type ApiClient = ReturnType<typeof api>;

type UsePairWorkspaceOptions = {
  apiClient: ApiClient | null;
  pair: PairView | null;
  pairRouteMode: V3Route["mode"] | null;
  pairRoutePairId: string | null;
  matches: MatchView[];
  hiddenMatchIds: string[];
  showHiddenMatches: boolean;
  setShowHiddenMatches: Dispatch<SetStateAction<boolean>>;
  visibleMatchesCount: (matchIds: string[]) => number;
  selectPair: (pairId: string) => Promise<PairView | null>;
  refreshCurrentPairing: () => Promise<void>;
  refreshSystemQuestionHashes: () => Promise<void>;
  ensureSystemQuestionsSeeded: (pair: PairView) => Promise<void>;
  loadQuestionsAndDecrypt: (pairOverride?: PairView) => Promise<void>;
  clearQuestions: () => void;
  clearMatches: () => void;
  computeMatches: (pairOverride?: PairView) => Promise<void>;
};

type UsePairWorkspaceResult = {
  openPair: (pairId: string, opts?: { preserveCurrent?: boolean }) => Promise<void>;
  refreshPairView: () => Promise<void>;
  isRefreshingPairView: boolean;
  visiblePairMatchesCount: number;
};

export function usePairWorkspace(opts: UsePairWorkspaceOptions): UsePairWorkspaceResult {
  const {
    apiClient,
    pair,
    pairRouteMode,
    pairRoutePairId,
    matches,
    hiddenMatchIds,
    showHiddenMatches,
    setShowHiddenMatches,
    visibleMatchesCount,
    selectPair,
    refreshCurrentPairing,
    refreshSystemQuestionHashes,
    ensureSystemQuestionsSeeded,
    loadQuestionsAndDecrypt,
    clearQuestions,
    clearMatches,
    computeMatches
  } = opts;
  const [isRefreshingPairView, setIsRefreshingPairView] = useState(false);
  const initialPreloadDoneRef = useRef(false);

  useEffect(() => {
    if (!showHiddenMatches) return;
    const hiddenCount = matches.filter((m) => hiddenMatchIds.includes(m.id)).length;
    if (hiddenCount === 0) setShowHiddenMatches(false);
  }, [showHiddenMatches, matches, hiddenMatchIds, setShowHiddenMatches]);

  const openPair = useCallback(
    async (pairId: string, options?: { preserveCurrent?: boolean }) => {
      const selectedPair = await selectPair(pairId);
      if (!options?.preserveCurrent) {
        clearMatches();
        clearQuestions();
      }
      if (!selectedPair) return;
      await refreshSystemQuestionHashes();
      await ensureSystemQuestionsSeeded(selectedPair);
      await loadQuestionsAndDecrypt(selectedPair);
      await computeMatches(selectedPair);
    },
    [
      clearMatches,
      clearQuestions,
      computeMatches,
      ensureSystemQuestionsSeeded,
      loadQuestionsAndDecrypt,
      refreshSystemQuestionHashes,
      selectPair
    ]
  );

  useEffect(() => {
    if (!apiClient) return;
    if (initialPreloadDoneRef.current) return;
    initialPreloadDoneRef.current = true;
    (async () => {
      try {
        await refreshCurrentPairing();
        const routeTargetPairId =
          pairRoutePairId &&
          (pairRouteMode === "pair" ||
            pairRouteMode === "pairMatches" ||
            pairRouteMode === "pairSettings" ||
            pairRouteMode === "ask" ||
            pairRouteMode === "played")
            ? pairRoutePairId
            : null;
        const last = await idbGet<string>("ui:lastPairId");
        const targetPairId = routeTargetPairId ?? last;
        if (targetPairId) await openPair(targetPairId);
      } catch {
        // ignore
      }
    })();
  }, [apiClient, openPair, refreshCurrentPairing, pairRouteMode, pairRoutePairId]);

  useEffect(() => {
    if (!apiClient) return;
    if (!pairRoutePairId) return;
    if (
      pairRouteMode !== "pair" &&
      pairRouteMode !== "pairMatches" &&
      pairRouteMode !== "pairSettings" &&
      pairRouteMode !== "ask" &&
      pairRouteMode !== "played"
    )
      return;
    if (pair?.id === pairRoutePairId) return;
    (async () => {
      try {
        await openPair(pairRoutePairId);
      } catch {
        // ignore deep-link load errors
      }
    })();
  }, [apiClient, openPair, pair?.id, pairRouteMode, pairRoutePairId]);

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

  const visiblePairMatchesCount = useMemo(
    () => visibleMatchesCount(matches.map((m) => m.id)),
    [matches, visibleMatchesCount]
  );

  return { openPair, refreshPairView, isRefreshingPairView, visiblePairMatchesCount };
}
