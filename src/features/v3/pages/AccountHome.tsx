import { V3Notice } from "../components/V3Notice";
import { InfoIcon } from "../components/icons/InfoIcon";
import { PairingForm } from "./account/PairingForm";
import { PairingGuide } from "./account/PairingGuide";
import { PairingRequestsPanel } from "./account/PairingRequestsPanel";
import { PartnersPanel } from "./account/PartnersPanel";
import { useAccountHomeModel } from "./account/useAccountHomeModel";

export function AccountHomePage() {
  const {
    clearInlineError,
    copyPairingCode,
    groupedRequests,
    hasPairs,
    hasRequests,
    inlineError,
    openPairRoute,
    pairingCode,
    pairingRequestRefresh,
    partnerCodeInput,
    requestsPanelRef,
    respondPairing,
    scrollToRequests,
    sendPairRequest,
    setPartnerCodeInput,
    visiblePairs
  } = useAccountHomeModel();

  return (
    <div className="v3-home-stack" data-testid="home-view">
      {hasRequests ? (
        <V3Notice
          icon={<InfoIcon />}
          title="Offene Verknüpfungen vorhanden"
          hint="Tippe hier, um die Anfragen anzusehen."
          onClick={scrollToRequests}
        />
      ) : null}

      {hasPairs ? (
        <PartnersPanel pairs={visiblePairs} onOpenPair={openPairRoute} />
      ) : null}

      {!hasPairs ? (
        <PairingGuide pairingCode={pairingCode} onCopyPairingCode={copyPairingCode} />
      ) : null}

      <PairingForm
        inlineError={inlineError}
        partnerCodeInput={partnerCodeInput}
        onClearInlineError={clearInlineError}
        onPartnerCodeInputChange={setPartnerCodeInput}
        onSendPairRequest={sendPairRequest}
      />

      <PairingRequestsPanel
        groupedRequests={groupedRequests}
        isRefreshing={pairingRequestRefresh.isRefreshing}
        lastCheckedLabel={pairingRequestRefresh.lastCheckedLabel}
        onOpenPairRoute={openPairRoute}
        onRefresh={pairingRequestRefresh.refreshNow}
        ref={requestsPanelRef}
        respondPairing={respondPairing}
        secondsUntilRefresh={pairingRequestRefresh.secondsUntilRefresh}
      />
    </div>
  );
}
