import type { ReactNode } from "react";

type V3SectionHeaderProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export function V3SectionHeader({ action, className, subtitle, title }: V3SectionHeaderProps) {
  return (
    <div className={`v3-section-head${className ? ` ${className}` : ""}`}>
      <div>
        <h2>{title}</h2>
        {subtitle ? <p className="hint v3-section-subtitle">{subtitle}</p> : null}
      </div>
      {action ? <div className="v3-section-head-action">{action}</div> : null}
    </div>
  );
}
