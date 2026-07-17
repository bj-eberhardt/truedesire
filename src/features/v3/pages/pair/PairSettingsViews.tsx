import { RefreshButton } from "../../../../components/RefreshButton";
import type { MatchPolicy, PairView } from "../../../../types";
import { V3SectionHeader } from "../../components";
import { PairSettingsLimitCard } from "./PairSettingsLimitCard";
import { PairSettingsMatchPolicyCard } from "./PairSettingsMatchPolicyCard";

type GroupSettingsAction = "accept" | "reject" | "cancel";

type PairSettingsHeaderProps = {
  onRefresh: () => Promise<void> | void;
};

type PairSettingsLoadingProps = {
  isLoading: boolean;
};

type PairSettingsPanelProps = {
  allowAllQuestions: boolean;
  canProposeMatchPolicy: boolean;
  canProposeWeeklyLimit: boolean;
  isLoadingGroupSettings: boolean;
  isOwnMatchPolicyPending: boolean;
  isOwnWeeklyLimitPending: boolean;
  matchPolicy: MatchPolicy;
  matchPolicyDraft: MatchPolicy;
  pair: PairView | null;
  weeklyLimitDraft: string;
  onProposeGroupSettings: () => Promise<void> | void;
  onProposeMatchPolicy: () => Promise<void> | void;
  onRespondGroupSettings: (action: GroupSettingsAction) => Promise<void> | void;
  onRespondMatchPolicy: (action: GroupSettingsAction) => Promise<void> | void;
  onSetQuestionsUnlimited: (unlimited: boolean) => void;
  onUpdateMatchPolicyDraft: (policy: MatchPolicy) => void;
  onUpdateWeeklyLimitDraft: (value: string) => void;
};

export function PairSettingsHeader({ onRefresh }: PairSettingsHeaderProps) {
  return (
    <V3SectionHeader
      title="Gruppen-Einstellungen"
      action={
        <RefreshButton
          testId="settings-refresh-button"
          onClick={onRefresh}
          title="Gruppen-Einstellungen neu laden"
        />
      }
    />
  );
}

export function PairSettingsLoading({ isLoading }: PairSettingsLoadingProps) {
  if (!isLoading) return null;

  return <div className="hint">Gruppen-Einstellungen werden geladen...</div>;
}

export function PairSettingsPanel(props: PairSettingsPanelProps) {
  if (props.isLoadingGroupSettings || !props.pair) return null;

  return (
    <div className="settings-panel" data-testid="settings-panel">
      <PairSettingsMatchPolicyCard
        canProposeMatchPolicy={props.canProposeMatchPolicy}
        isLoadingGroupSettings={props.isLoadingGroupSettings}
        isOwnMatchPolicyPending={props.isOwnMatchPolicyPending}
        matchPolicy={props.matchPolicy}
        matchPolicyDraft={props.matchPolicyDraft}
        pair={props.pair}
        onProposeMatchPolicy={props.onProposeMatchPolicy}
        onRespondMatchPolicy={props.onRespondMatchPolicy}
        onUpdateMatchPolicyDraft={props.onUpdateMatchPolicyDraft}
      />
      <PairSettingsLimitCard
        allowAllQuestions={props.allowAllQuestions}
        canProposeWeeklyLimit={props.canProposeWeeklyLimit}
        isLoadingGroupSettings={props.isLoadingGroupSettings}
        isOwnWeeklyLimitPending={props.isOwnWeeklyLimitPending}
        pair={props.pair}
        weeklyLimitDraft={props.weeklyLimitDraft}
        onProposeGroupSettings={props.onProposeGroupSettings}
        onRespondGroupSettings={props.onRespondGroupSettings}
        onSetQuestionsUnlimited={props.onSetQuestionsUnlimited}
        onUpdateWeeklyLimitDraft={props.onUpdateWeeklyLimitDraft}
      />
    </div>
  );
}
