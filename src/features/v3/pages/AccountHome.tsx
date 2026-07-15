import { useRef, useState } from "react";
import {
  useAccountContext,
  usePairingContext,
  usePairWorkspaceContext,
  useSessionContext
} from "../../../app/state";
import { V3Notice } from "../components/V3Notice";
import { InfoIcon } from "../components/icons/InfoIcon";
import { groupPairingRequests } from "./account/groupPairingRequests";
import { PairingForm } from "./account/PairingForm";
import { PairingGuide } from "./account/PairingGuide";
import { PairingRequestsPanel } from "./account/PairingRequestsPanel";
import { PartnersPanel } from "./account/PartnersPanel";
import { usePairingRequestRefresh } from "./account/usePairingRequestRefresh";

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

export function AccountHomePage() {
  const { identity } = useSessionContext();
  const account = useAccountContext();
  const pairing = usePairingContext();
  const workspace = usePairWorkspaceContext();
  const [partnerCodeInput, setPartnerCodeInput] = useState("");

  const groupedRequests = groupPairingRequests(pairing.incoming, pairing.outgoing);
  const pairingRequestRefresh = usePairingRequestRefresh({
    enabled: !!identity?.userId,
    refreshRequests: pairing.refreshRequests
  });
  const requestsPanelRef = useRef<HTMLElement | null>(null);
  const visiblePairs = pairing.myPairs.filter((pair) => !pair.partnerDeleted);
  const hasPairs = visiblePairs.length > 0;
  const hasRequests = groupedRequests.length > 0;

  async function sendPairRequest() {
    await pairing.sendPairRequest(partnerCodeInput);
    setPartnerCodeInput("");
  }

  return (
    <div className="v3-home-stack" data-testid="home-view">
      {hasRequests ? (
        <V3Notice
          icon={<InfoIcon />}
          title="Offene Verknüpfungen vorhanden"
          hint="Tippe hier, um die Anfragen anzusehen."
          onClick={() => scrollToSection(requestsPanelRef)}
        />
      ) : null}

      {hasPairs ? (
        <PartnersPanel pairs={visiblePairs} onOpenPair={workspace.openPairRoute} />
      ) : null}

      {!hasPairs ? (
        <PairingGuide
          pairingCode={identity?.code}
          onCopyPairingCode={() => {
            void account.copyPairingCode();
          }}
        />
      ) : null}

      <PairingForm
        inlineError={pairing.inlineError}
        partnerCodeInput={partnerCodeInput}
        onClearInlineError={pairing.clearInlineError}
        onPartnerCodeInputChange={setPartnerCodeInput}
        onSendPairRequest={sendPairRequest}
      />

      <PairingRequestsPanel
        groupedRequests={groupedRequests}
        isRefreshing={pairingRequestRefresh.isRefreshing}
        lastCheckedLabel={pairingRequestRefresh.lastCheckedLabel}
        onOpenPairRoute={workspace.openPairRoute}
        onRefresh={pairingRequestRefresh.refreshNow}
        ref={requestsPanelRef}
        respondPairing={pairing.respondPairing}
        secondsUntilRefresh={pairingRequestRefresh.secondsUntilRefresh}
      />
    </div>
  );
}
