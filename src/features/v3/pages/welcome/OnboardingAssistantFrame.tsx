import type { ReactNode } from "react";
import { OnboardingStepper } from "../../components/OnboardingStepper";
import { V3PageError } from "../../components";

type OnboardingStep = {
  id: string;
  title: string;
  subtitle?: string;
};

export function OnboardingAssistantFrame({
  activeStepId,
  children,
  error,
  leftAction,
  rightAction,
  steps
}: {
  activeStepId: string;
  children?: ReactNode;
  error?: string | null;
  leftAction?: ReactNode;
  rightAction?: ReactNode;
  steps: OnboardingStep[];
}) {
  return (
    <section className="card v3-card v3-view" data-testid="onboarding-view">
      <h2 className="v3-welcome-title">Willkommen</h2>
      <OnboardingStepper steps={steps} activeStepId={activeStepId} />
      <div className="divider v3-welcome-divider" />

      <div className="v3-onboard-slot">{children}</div>

      {error ? <V3PageError testId="onboarding-error">{error}</V3PageError> : null}

      {leftAction || rightAction ? (
        <div className="v3-onboard-actions">
          <div className="v3-onboard-action-left">{leftAction}</div>
          <div className="v3-onboard-action-right">{rightAction}</div>
        </div>
      ) : null}
    </section>
  );
}
