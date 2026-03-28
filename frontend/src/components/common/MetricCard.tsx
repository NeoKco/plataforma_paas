import { PanelCard } from "./PanelCard";
import { AppIcon, type AppIconName } from "../../design-system/AppIcon";

type MetricCardProps = {
  label: string;
  value: number | string;
  hint?: string;
  icon?: AppIconName;
  tone?: "default" | "success" | "warning" | "danger" | "info";
};

export function MetricCard({
  label,
  value,
  hint,
  icon,
  tone = "default",
}: MetricCardProps) {
  return (
    <PanelCard>
      <div className={`metric-card metric-card--${tone}`}>
        {icon ? (
          <div className="metric-card__icon">
            <AppIcon name={icon} size={18} />
          </div>
        ) : null}
        <div className="metric-emphasis">{value}</div>
        <div className="tenant-detail__label mt-2">{label}</div>
        {hint ? <div className="small text-secondary mt-1">{hint}</div> : null}
      </div>
    </PanelCard>
  );
}
