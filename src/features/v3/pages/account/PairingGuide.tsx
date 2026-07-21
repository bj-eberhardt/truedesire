import { ClipboardIcon } from "../../components/icons/ClipboardIcon";
import { CodeExchangeIcon } from "../../components/icons/CodeExchangeIcon";

export function PairingGuide(props: {
  pairingCode: string | null | undefined;
  onCopyPairingCode: () => void;
}) {
  return (
    <section className="card v3-card v3-panel v3-guide">
      <div className="v3-guide-head">
        <CodeExchangeIcon />
        <div className="v3-guide-text">
          <h2>Partner verknüpfen</h2>
          <p className="hint">
            Teilt einen Code, nehmt die Anfrage an und startet danach eure erste Runde.
          </p>
        </div>
      </div>

      <div className="v3-guide-code-card" data-testid="own-pairing-code-card">
        <div>
          <span className="hint">Dein Pairing-Code</span>
          <strong className="v3-guide-code mono">{props.pairingCode ?? "Noch nicht geladen"}</strong>
        </div>
        <button
          type="button"
          className="secondary v3-copy-code-button"
          data-testid="guide-copy-pairing-code-button"
          disabled={!props.pairingCode}
          onClick={props.onCopyPairingCode}
        >
          <ClipboardIcon /> Code teilen
        </button>
      </div>

      <ol className="v3-guide-steps">
        <li>Teile deinen Code oder frage nach dem Code deines Partners.</li>
        <li>Eine Person gibt den Partner-Code ein und sendet die Anfrage.</li>
        <li>Der Partner nimmt die Anfrage an.</li>
        <li>Öffnet die Verknüpfung und startet eure erste Runde.</li>
      </ol>
    </section>
  );
}
