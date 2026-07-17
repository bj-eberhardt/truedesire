import type { ReactNode } from "react";

type V3RevealContentProps = {
  children: ReactNode;
  isLoading: boolean;
  loading: ReactNode;
  className?: string;
};

export function V3RevealContent(props: V3RevealContentProps) {
  const className = `v3-reveal-content${props.className ? ` ${props.className}` : ""}`;

  if (props.isLoading) return <>{props.loading}</>;

  return (
    <div className={className} data-animation-state="open">
      <div className="v3-reveal-content-inner">{props.children}</div>
    </div>
  );
}
