import type { ReactNode } from "react";

export function V3View(props: {
  title: string;
  subtitle?: string | null;
  onBack?: () => void;
  headerRight?: ReactNode;
  className?: string;
  testId?: string;
  backTestId?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={`card v3-card v3-view${props.className ? ` ${props.className}` : ""}`}
      data-testid={props.testId ?? "v3-view"}
    >
      {props.onBack ? (
        <div className="v3-view-head">
          <button
            className="secondary"
            data-testid={props.backTestId ?? "view-back-button"}
            onClick={props.onBack}
          >
            ← Zurück
          </button>
          <div>
            <h2 style={{ margin: 0 }} data-testid="view-title">
              {props.title}
            </h2>
            {props.subtitle ? <p className="hint v3-subtitle">{props.subtitle}</p> : null}
          </div>
          {props.headerRight ? <div className="v3-view-head-right">{props.headerRight}</div> : null}
        </div>
      ) : (
        <h2 data-testid="view-title">{props.title}</h2>
      )}
      {props.onBack ? <div className="divider" /> : null}
      {props.children}
    </section>
  );
}
