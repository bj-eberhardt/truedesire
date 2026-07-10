import type { ReactNode } from "react";

export function V3Notice(props: {
  title: string;
  hint?: string | null;
  icon: ReactNode;
  onClick?: () => void;
  className?: string;
  testId?: string;
}) {
  const body = (
    <>
      {props.icon}
      <div className="v3-notice-text">
        <strong>{props.title}</strong>
        {props.hint ? <span className="hint">{props.hint}</span> : null}
      </div>
    </>
  );

  const className = `v3-notice${props.className ? ` ${props.className}` : ""}`;

  if (props.onClick) {
    return (
      <button
        type="button"
        className={className}
        data-testid={props.testId ?? "v3-notice"}
        onClick={props.onClick}
      >
        {body}
      </button>
    );
  }

  return (
    <div
      className={className}
      data-testid={props.testId ?? "v3-notice"}
      role="status"
      aria-live="polite"
    >
      {body}
    </div>
  );
}
