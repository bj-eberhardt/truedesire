import { useCallback, useRef, useState } from "react";
import {
  useAccountContext,
  usePairingContext,
  usePairWorkspaceContext,
  useSessionContext
} from "../../../../app/state";
import { groupPairingRequests } from "./groupPairingRequests";
import { usePairingRequestRefresh } from "./usePairingRequestRefresh";

function scrollToSection(ref: React.RefObject<HTMLElement | null>) {
  const el = ref.current;
  if (!el) return;
  try {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  } catch {
    // fall back to window scrolling
  }
  const top = el.getBoundingClientRect().top + window.scrollY - 92;
  window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
}

export function useAccountHomeModel() {
  const { identity } = useSessionContext();
  const account = useAccountContext();
  const pairing = usePairingContext();
  const workspace = usePairWorkspaceContext();
  const [partnerCodeInput, setPartnerCodeInput] = useState("");
  const requestsPanelRef = useRef<HTMLElement | null>(null);
  const groupedRequests = groupPairingRequests(pairing.incoming, pairing.outgoing);
  const pairingRequestRefresh = usePairingRequestRefresh({
    enabled: !!identity?.userId,
    refreshRequests: pairing.refreshRequests
  });
  const visiblePairs = pairing.myPairs.filter((pair) => !pair.partnerDeleted);

  const copyPairingCode = useCallback(() => {
    void account.copyPairingCode();
  }, [account]);

  const scrollToRequests = useCallback(() => {
    scrollToSection(requestsPanelRef);
  }, []);

  const sendPairRequest = useCallback(async () => {
    await pairing.sendPairRequest(partnerCodeInput);
    setPartnerCodeInput("");
  }, [pairing, partnerCodeInput]);

  return {
    clearInlineError: pairing.clearInlineError,
    copyPairingCode,
    groupedRequests,
    hasPairs: visiblePairs.length > 0,
    hasRequests: groupedRequests.length > 0,
    inlineError: pairing.inlineError,
    openPairRoute: workspace.openPairRoute,
    pairingCode: identity?.code,
    pairingRequestRefresh,
    partnerCodeInput,
    requestsPanelRef,
    respondPairing: pairing.respondPairing,
    scrollToRequests,
    sendPairRequest,
    setPartnerCodeInput,
    visiblePairs
  };
}

export type AccountHomeModel = ReturnType<typeof useAccountHomeModel>;
