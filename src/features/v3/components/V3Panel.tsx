import { forwardRef, type ReactNode } from "react";

type V3PanelProps = {
  children: ReactNode;
  className?: string;
  testId?: string;
  title?: ReactNode;
  hint?: ReactNode;
};

export const V3Panel = forwardRef<HTMLElement, V3PanelProps>(function V3Panel(
  { children, className, hint, testId, title },
  ref
) {
  return (
    <section
      ref={ref}
      className={`card v3-card v3-panel${className ? ` ${className}` : ""}`}
      data-testid={testId}
    >
      {title ? <h2>{title}</h2> : null}
      {hint ? <p className="hint">{hint}</p> : null}
      {children}
    </section>
  );
});
