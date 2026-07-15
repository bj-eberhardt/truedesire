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
          <h2>So verknüpft ihr euch</h2>
          <p className="hint">
            Eine Person sendet eine Anfrage an den Pairing-Code des Partners. Sobald der Partner
            annimmt, seid ihr verknüpft.
          </p>
        </div>
      </div>
      <ol className="v3-guide-steps">
        <li>
          Frag deinen Partner nach seinem <strong>Pairing-Code</strong>.
        </li>
        <li>
          Teile deinem Partner deinen <strong>Pairing-Code</strong> (
          <span className="v3-guide-code mono">{props.pairingCode ?? "—"}</span>) mit.
          <button
            type="button"
            className="v3-copy-code-button"
            data-testid="guide-copy-pairing-code-button"
            aria-label="Pairing-Code kopieren"
            disabled={!props.pairingCode}
            onClick={props.onCopyPairingCode}
          >
            <ClipboardIcon />
          </button>
        </li>
        <li>Eine Person sendet die Anfrage. Der Partner nimmt sie an, dann wird die Verknüpfung aktiv.</li>
        <li>Wenn ihr verbunden seid, könnt ihr euch gegenseitig Fragen ausspielen und Antworten sehen.</li>
      </ol>
    </section>
  );
}
