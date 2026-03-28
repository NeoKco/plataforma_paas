import type { ReactNode } from "react";
import { AppIcon, type AppIconName } from "./AppIcon";

type AppSpotlightStat = {
  label: string;
  value: ReactNode;
};

type AppSpotlightProps = {
  icon: AppIconName;
  eyebrow?: string;
  title: string;
  description: string;
  stats?: AppSpotlightStat[];
};

export function AppSpotlight({
  icon,
  eyebrow,
  title,
  description,
  stats = [],
}: AppSpotlightProps) {
  return (
    <section className="app-spotlight">
      <div className="app-spotlight__header">
        <div className="app-spotlight__icon">
          <AppIcon name={icon} size={24} />
        </div>
        <div className="app-spotlight__content">
          {eyebrow ? <div className="app-spotlight__eyebrow">{eyebrow}</div> : null}
          <h2 className="app-spotlight__title">{title}</h2>
          <p className="app-spotlight__description">{description}</p>
        </div>
      </div>
      {stats.length > 0 ? (
        <div className="app-spotlight__stats">
          {stats.map((stat) => (
            <div key={stat.label} className="app-spotlight__stat">
              <span className="app-spotlight__stat-label">{stat.label}</span>
              <strong className="app-spotlight__stat-value">{stat.value}</strong>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
