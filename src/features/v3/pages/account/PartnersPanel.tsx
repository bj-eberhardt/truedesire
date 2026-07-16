import { ProfileAvatar } from "../../../../components/ProfileAvatar";
import { PairStatusBadge, V3Panel } from "../../components";
import type { AccountPair } from "./accountHomeTypes";

export function PartnersPanel(props: {
  pairs: AccountPair[];
  onOpenPair: (pairId: string) => void;
}) {
  return (
    <V3Panel
      testId="partners-panel"
      title="Deine Partner"
      hint="Du hast bereits folgende verknüpfte Partner. Tippe auf einen Partner, um die Fragen zu öffnen."
    >
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
            <PairStatusBadge
              status={pair.status}
              partnerDeleted={pair.partnerDeleted}
              showActive
              className="mono"
            />
          </button>
        ))}
      </div>
    </V3Panel>
  );
}
