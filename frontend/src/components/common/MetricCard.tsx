import { PanelCard } from "./PanelCard";

type MetricCardProps = {
  label: string;
  value: number | string;
  hint?: string;
};

export function MetricCard({ label, value, hint }: MetricCardProps) {
  return (
    <PanelCard>
      <div className="metric-emphasis">{value}</div>
      <div className="tenant-detail__label mt-2">{label}</div>
      {hint ? <div className="small text-secondary mt-1">{hint}</div> : null}
    </PanelCard>
  );
}
