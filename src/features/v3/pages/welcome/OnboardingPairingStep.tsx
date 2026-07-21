import { V3Notice } from "../../components";
import { ClipboardIcon } from "../../components/icons/ClipboardIcon";
import { InfoIcon } from "../../components/icons/InfoIcon";

export function OnboardingPairingStep({
  clearInlineError,
  copyPairingCode,
  inlineError,
  isSendingPairRequest,
  partnerCodeInput,
  pairingCode,
  requestSent,
  sendPairRequest,
  setPartnerCodeInput
}: {
  clearInlineError: () => void;
  copyPairingCode: () => Promise<void>;
  inlineError: string | null;
  isSendingPairRequest: boolean;
  partnerCodeInput: string;
  pairingCode: string | null | undefined;
  requestSent: boolean;
  sendPairRequest: () => Promise<void>;
  setPartnerCodeInput: (value: string) => void;
}) {
  return (
    <>
      <p className="v3-onboard-question">Pairing</p>
      <p className="hint">
        Hast du von deinem Partner schon seinen Partner-Code bekommen? Dann kannst du ihn hier
        eingeben und Euch beide gleich verbinden.
      </p>

      <div className="v3-onboard-form v3-onboard-pairing-form">
        <label className="field v3-field">
          <span>Anfrage zum Paaren</span>
          <input
            data-testid="onboarding-partner-code-input"
            value={partnerCodeInput}
            onChange={(event) => {
              clearInlineError();
              setPartnerCodeInput(event.target.value);
            }}
            placeholder="Partner-Code"
          />
        </label>
        <button
          className="primary"
          data-testid="onboarding-send-pair-request-button"
          disabled={!partnerCodeInput.trim() || isSendingPairRequest}
          onClick={() => void sendPairRequest()}
        >
          {isSendingPairRequest ? "Sendet..." : "Anfrage senden"}
        </button>
        {inlineError ? (
          <div className="inline-error" data-testid="onboarding-pairing-inline-error">
            {inlineError}
          </div>
        ) : null}
      </div>

      <p className="hint v3-onboard-share-hint">
        Falls nicht, und sich dein Partner noch anmelden muss, teile ihm deinen Pairing-Code mit:
      </p>

      <div className="v3-next-step-card" data-testid="onboarding-next-step-card">
        <div>
          <span className="hint">Dein Pairing-Code</span>
          <strong className="mono v3-next-step-code">{pairingCode ?? "Noch nicht geladen"}</strong>
        </div>
        <button
          type="button"
          className="secondary v3-next-step-copy"
          data-testid="onboarding-copy-pairing-code-button"
          disabled={!pairingCode}
          onClick={() => void copyPairingCode()}
        >
          <ClipboardIcon /> Code teilen
        </button>
      </div>

      {requestSent ? (
        <V3Notice
          className="v3-notice-info"
          icon={<InfoIcon />}
          title="Anfrage gesendet"
          hint="Dein Partner muss sie noch annehmen. Auf der Home-Seite siehst du den Status später bei den offenen Anfragen."
          testId="onboarding-pair-request-sent"
        />
      ) : null}
    </>
  );
}
