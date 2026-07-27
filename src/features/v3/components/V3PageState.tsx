import type { ReactNode } from "react";
import { InlineError } from "./InlineError";

type V3PageErrorProps = {
  children: ReactNode;
  testId?: string;
};

type V3LoadingStateProps = {
  children: ReactNode;
  testId?: string;
  framed?: boolean;
  title?: string;
};

export function V3PageError(props: V3PageErrorProps) {
  return <InlineError testId={props.testId}>{props.children}</InlineError>;
}

function stripStaticDots(value: ReactNode): ReactNode {
  return typeof value === "string" ? value.replace(/(?:\.\.\.|…)$/u, "") : value;
}

export function V3LoadingText(props: { children: ReactNode }) {
  return (
    <span className="v3-loading-text">
      <span>{stripStaticDots(props.children)}</span>
      <span className="v3-loading-dots" aria-hidden="true">
        <span>.</span>
        <span>.</span>
        <span>.</span>
      </span>
    </span>
  );
}

export function V3LoadingState(props: V3LoadingStateProps) {
  if (props.framed) {
    return (
      <section className="card v3-card v3-view" data-testid={props.testId}>
        {props.title ? (
          <h2>
            <V3LoadingText>{props.title}</V3LoadingText>
          </h2>
        ) : null}
        <p className="hint">
          <V3LoadingText>{props.children}</V3LoadingText>
        </p>
      </section>
    );
  }

  return (
    <div className="empty" data-testid={props.testId}>
      <V3LoadingText>{props.children}</V3LoadingText>
    </div>
  );
}
