import type { MatchPolicy } from "../../../../types";
import { InfoIcon } from "../../components/icons/InfoIcon";

export type PairWelcomePanelProps = {
  matchPolicy: MatchPolicy;
  partnerName: string;
  weeklyLimit: number;
  onAcknowledge: () => void;
  onOpenMatches: () => void;
  onOpenPlay: () => void;
  onOpenSettings: () => void;
};

export function PairWelcomePanel(props: PairWelcomePanelProps) {
  const weeklyLimitText =
    props.weeklyLimit === 0 ? "Alle Fragen sind erlaubt" : `${props.weeklyLimit} Fragen pro Woche`;
  const matchPolicyText = getMatchPolicyExplanation(props.matchPolicy);

  return (
    <section className="v3-pair-welcome" data-testid="pair-welcome-panel" aria-label="Willkommen">
      <div className="v3-pair-welcome-icon">
        <InfoIcon className="v3-pair-welcome-svg" />
      </div>
      <div className="v3-pair-welcome-copy">
        <div className="v3-pair-welcome-kicker">Neu verbunden</div>
        <h3>Willkommen bei euren Fragen mit {props.partnerName}</h3>
        <p>
          Eure aktuelle Match-Regel: <strong>{matchPolicyText}</strong> Ihr könnt{" "}
          <strong>{weeklyLimitText}</strong> beantworten. Beides könnt ihr gemeinsam in den{" "}
          <InlineTabButton onClick={props.onOpenSettings}>Einstellungen</InlineTabButton> ändern.
        </p>
        <p>
          Startet im Tab <InlineTabButton onClick={props.onOpenPlay}>Fragen</InlineTabButton>:
          beantwortet, was schon da ist, stellt neue Fragen und entdeckt im Tab{" "}
          <InlineTabButton onClick={props.onOpenMatches}>Matches</InlineTabButton>, wo ihr gleich
          tickt.
        </p>
      </div>
      <button
        type="button"
        className="primary v3-pair-welcome-settings"
        onClick={props.onAcknowledge}
      >
        Okay
      </button>
    </section>
  );
}

function InlineTabButton(props: { children: string; onClick: () => void }) {
  return (
    <button type="button" className="v3-pair-welcome-link" onClick={props.onClick}>
      <em>{props.children}</em>
    </button>
  );
}

function getMatchPolicyExplanation(policy: MatchPolicy): string {
  if (policy === "perfectOnly") {
    return 'Ihr bekommt nur ein Match, wenn ihr beide dieselbe Frage mit "Ja" beantwortet.';
  }
  if (policy === "allowMixedMaybe") {
    return 'Ihr bekommt ein Match bei "Ja" + "Ja" und auch, wenn eine Person "Ja" und die andere "Vielleicht" antwortet.';
  }
  return 'Ihr bekommt ein Match bei "Ja" + "Ja", bei "Ja" + "Vielleicht" und auch, wenn ihr beide "Vielleicht" antwortet.';
}
