export function PairingForm(props: {
  inlineError: string | null;
  partnerCodeInput: string;
  onClearInlineError: () => void;
  onPartnerCodeInputChange: (value: string) => void;
  onSendPairRequest: () => Promise<void>;
}) {
  return (
    <section className="card v3-card v3-panel" data-testid="pairing-panel">
      <h2>Mit Partner verknüpfen</h2>
      <p className="hint">
        Gib den Code deines Partners ein und sende die Anfrage. Sobald dein Partner sie annimmt, ist
        die Verknüpfung aktiv.
      </p>
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
    </section>
  );
}
