import { ProfileAvatar } from "../../../../components/ProfileAvatar";
import type { PairingContextValue } from "../../../../app/state";

type MyPairs = PairingContextValue["myPairs"];

export function PartnersPanel(props: { pairs: MyPairs; onOpenPair: (pairId: string) => void }) {
  return (
    <section className="card v3-card v3-panel" data-testid="partners-panel">
      <h2>Deine Partner</h2>
      <p className="hint">
        Du hast bereits folgende verknüpfte Partner. Tippe auf einen Partner, um die Fragen zu
        öffnen.
      </p>
      <div className="v3-pair-grid">
        {props.pairs.map((pair) => (
          <button
            key={pair.id}
            className="v3-pair-card"
            data-testid="partner-card"
            data-pair-id={pair.id}
            data-partner-name={pair.partner?.nickname ?? pair.id}
            onClick={() => props.onOpenPair(pair.id)}
          >
            <div className="v3-pair-card-main">
              <ProfileAvatar name={pair.partner?.nickname ?? "?"} />
              <div>
                <div className="v3-pair-card-name">{pair.partner?.nickname ?? pair.id}</div>
                <div className="v3-pair-card-code mono">{pair.partner?.code ?? "—"}</div>
              </div>
            </div>
            <div
              className={`pill mono status ${
                pair.status === "active" ? "ok" : pair.status === "ended" ? "ended" : "pending"
              }`}
            >
              {pair.partnerDeleted
                ? "gelöscht"
                : pair.status === "active"
                  ? "aktiv"
                  : pair.status === "ended"
                    ? "beendet"
                    : "ausstehend"}
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
