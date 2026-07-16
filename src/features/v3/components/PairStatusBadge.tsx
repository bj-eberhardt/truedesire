import type { PairView } from "../../../types";

type PairStatusBadgeProps = {
  status: PairView["status"];
  partnerDeleted?: boolean;
  showActive?: boolean;
  className?: string;
};

export function PairStatusBadge({
  status,
  partnerDeleted,
  showActive = false,
  className
}: PairStatusBadgeProps) {
  if (!partnerDeleted && status === "active" && !showActive) return null;

  const statusClass = status === "active" ? "ok" : status === "ended" ? "ended" : "pending";
  const label = partnerDeleted
    ? "gelöscht"
    : status === "active"
      ? "aktiv"
      : status === "ended"
        ? "beendet"
        : "ausstehend";

  return (
    <span className={`pill status ${statusClass}${className ? ` ${className}` : ""}`}>{label}</span>
  );
}
