type OnboardingStep = {
  id: string;
  title: string;
  subtitle?: string;
};

type OnboardingStepperProps = {
  steps: OnboardingStep[];
  activeStepId: string;
};

export function OnboardingStepper(props: OnboardingStepperProps) {
  const activeIndex = Math.max(
    0,
    props.steps.findIndex((s) => s.id === props.activeStepId)
  );

  return (
    <ol className="v3-stepper" aria-label="Onboarding Fortschritt">
      {props.steps.map((step, idx) => {
        const state = idx < activeIndex ? "done" : idx === activeIndex ? "active" : "todo";
        const showLine = idx < props.steps.length - 1;
        return (
          <li
            key={step.id}
            className="v3-step"
            data-state={state}
            aria-current={state === "active" ? "step" : undefined}
          >
            <div className="v3-step-marker" aria-hidden="true">
              <div className="v3-step-dot">
                {state === "done" ? (
                  <span className="v3-step-check">✓</span>
                ) : (
                  <span className="v3-step-num">{idx + 1}</span>
                )}
              </div>
              {showLine ? <div className="v3-step-line" /> : null}
            </div>
            <div className="v3-step-content">
              <div className="v3-step-title">{step.title}</div>
              {step.subtitle ? <div className="hint v3-step-subtitle">{step.subtitle}</div> : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
