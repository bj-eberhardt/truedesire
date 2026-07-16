import { useCallback } from "react";
import type { MatchesApi, OpenPairWorkflow, PairSelectionApi, QuestionsApi } from "./types";

type UseOpenPairWorkflowOptions = Pick<PairSelectionApi, "selectPair"> &
  QuestionsApi &
  Pick<MatchesApi, "clearMatches" | "computeMatches">;

export function useOpenPairWorkflow({
  selectPair,
  refreshSystemQuestionHashes,
  ensureSystemQuestionsSeeded,
  loadQuestionsAndDecrypt,
  clearQuestions,
  clearMatches,
  computeMatches
}: UseOpenPairWorkflowOptions): OpenPairWorkflow {
  return useCallback(
    async (pairId, options) => {
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
}
