import { useCallback, useEffect, useState } from "react";
import type { api } from "../../../../api/api";
import type { MatchPolicy, PairView } from "../../../../types";

type ApiClient = ReturnType<typeof api>;

export function useMatchPolicySettings(
  apiClient: ApiClient | null,
  pair: PairView | null,
  refreshPair: () => Promise<void>
) {
  const pairId = pair?.id ?? null;
  const [matchPolicy, setMatchPolicyState] = useState<MatchPolicy>("allowMutualMaybe");
  const [matchPolicyDraft, setMatchPolicyDraft] = useState<MatchPolicy>("allowMutualMaybe");
  const [isLoadingMatchPolicy, setIsLoadingMatchPolicy] = useState(false);

  const reloadMatchPolicy = useCallback(async () => {
    if (!apiClient || !pairId) {
      setMatchPolicyState("allowMutualMaybe");
      setMatchPolicyDraft("allowMutualMaybe");
      return;
    }

    setIsLoadingMatchPolicy(true);
    try {
      const result = await apiClient.pair.getMatchPolicy(pairId);
      setMatchPolicyState(result.policy);
      setMatchPolicyDraft(result.policy);
    } catch {
      setMatchPolicyState("allowMutualMaybe");
      setMatchPolicyDraft("allowMutualMaybe");
    } finally {
      setIsLoadingMatchPolicy(false);
    }
  }, [apiClient, pairId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (cancelled) return;
      await reloadMatchPolicy();
    })();

    return () => {
      cancelled = true;
    };
  }, [reloadMatchPolicy]);

  const proposeMatchPolicy = useCallback(async () => {
    if (!apiClient || !pairId) return;
    if (matchPolicyDraft === matchPolicy) return;
    await apiClient.pair.proposeMatchPolicy(pairId, matchPolicyDraft);
    await refreshPair();
  }, [apiClient, matchPolicy, matchPolicyDraft, pairId, refreshPair]);

  const respondMatchPolicy = useCallback(
    async (action: "accept" | "reject" | "cancel") => {
      if (!apiClient || !pair?.matchPolicyPending) return;
      await apiClient.pair.respondMatchPolicy(pair.id, pair.matchPolicyPending.id, action);
      await refreshPair();
      await reloadMatchPolicy();
    },
    [apiClient, pair, refreshPair, reloadMatchPolicy]
  );

  return {
    isLoadingMatchPolicy,
    matchPolicy,
    matchPolicyDraft,
    reloadMatchPolicy,
    updateMatchPolicyDraft: setMatchPolicyDraft,
    proposeMatchPolicy,
    respondMatchPolicy
  };
}
