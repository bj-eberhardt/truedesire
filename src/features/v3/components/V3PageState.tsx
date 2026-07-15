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

export function V3LoadingState(props: V3LoadingStateProps) {
  if (props.framed) {
    return (
      <section className="card v3-card v3-view" data-testid={props.testId}>
        {props.title ? <h2>{props.title}</h2> : null}
        <p className="hint">{props.children}</p>
      </section>
    );
  }

  return (
    <div className="empty" data-testid={props.testId}>
      {props.children}
    </div>
  );
}
