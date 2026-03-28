import { AppBadge, type AppBadgeTone } from "../../design-system/AppBadge";
import { displayPlatformCode } from "../../utils/platform-labels";
import { useLanguage } from "../../store/language-context";

const STATUS_TONE_MAP: Record<string, AppBadgeTone> = {
  active: "success",
  allowed: "success",
  income: "success",
  reconciled: "success",
  trialing: "info",
  completed: "success",
  pending: "warning",
  retry_pending: "warning",
  past_due: "warning",
  expense: "warning",
  inactive: "warning",
  running: "info",
  suspended: "danger",
  failed: "danger",
  error: "danger",
  blocked: "danger",
  canceled: "neutral",
  archived: "neutral",
  duplicate: "neutral",
  ignored: "neutral",
};

export function StatusBadge({ value }: { value: string }) {
  const { language } = useLanguage();
  const normalized = value.trim().toLowerCase();
  const tone = STATUS_TONE_MAP[normalized] || "neutral";
  return (
    <AppBadge tone={tone}>
      {displayPlatformCode(normalized, language)}
    </AppBadge>
  );
}
