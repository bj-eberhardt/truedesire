import type { ReactNode } from "react";

export function InlineError(props: { children: ReactNode; testId?: string }) {
  return (
    <div className="inline-error" data-testid={props.testId ?? "inline-error"}>
      {props.children}
    </div>
  );
}
