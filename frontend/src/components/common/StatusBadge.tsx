import { displayPlatformCode } from "../../utils/platform-labels";

const STATUS_CLASS_MAP: Record<string, string> = {
  active: "status-badge status-badge--success",
  allowed: "status-badge status-badge--success",
  income: "status-badge status-badge--success",
  reconciled: "status-badge status-badge--success",
  trialing: "status-badge status-badge--info",
  completed: "status-badge status-badge--success",
  pending: "status-badge status-badge--warning",
  retry_pending: "status-badge status-badge--warning",
  past_due: "status-badge status-badge--warning",
  expense: "status-badge status-badge--warning",
  inactive: "status-badge status-badge--warning",
  running: "status-badge status-badge--info",
  suspended: "status-badge status-badge--danger",
  failed: "status-badge status-badge--danger",
  error: "status-badge status-badge--danger",
  blocked: "status-badge status-badge--danger",
  canceled: "status-badge status-badge--neutral",
  archived: "status-badge status-badge--neutral",
  duplicate: "status-badge status-badge--neutral",
  ignored: "status-badge status-badge--neutral",
};

export function StatusBadge({ value }: { value: string }) {
  const normalized = value.trim().toLowerCase();
  const className =
    STATUS_CLASS_MAP[normalized] || "status-badge status-badge--neutral";
  return <span className={className}>{displayPlatformCode(normalized)}</span>;
}
