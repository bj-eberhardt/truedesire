import { V3Panel } from "../../components";

export function PairingForm(props: {
  inlineError: string | null;
  partnerCodeInput: string;
  onClearInlineError: () => void;
  onPartnerCodeInputChange: (value: string) => void;
  onSendPairRequest: () => Promise<void>;
}) {
  return (
    <V3Panel
      testId="pairing-panel"
      title="Partner-Code eingeben"
      hint="Sende die Anfrage. Sobald dein Partner annimmt, könnt ihr die erste Runde starten."
    >
      <div className="row v3-pairing-form">
        <input
          className="v3-partner-code-input"
          data-testid="partner-code-input"
          value={props.partnerCodeInput}
          onChange={(event) => {
            props.onClearInlineError();
            props.onPartnerCodeInputChange(event.target.value);
          }}
          placeholder="Partner-Code"
        />
        <button
          className="primary"
          data-testid="send-pair-request-button"
          disabled={!props.partnerCodeInput.trim()}
          onClick={props.onSendPairRequest}
        >
          Anfrage senden
        </button>
      </div>
      {props.inlineError ? (
        <div className="inline-error" data-testid="pairing-inline-error">
          {props.inlineError}
        </div>
      ) : null}
    </V3Panel>
  );
}
