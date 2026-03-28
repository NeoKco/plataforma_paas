import type { ReactNode } from "react";
import { FinanceIcon, type FinanceIconName } from "./FinanceIcon";

type FinanceSpotlightStat = {
  label: string;
  value: ReactNode;
};

type FinanceSpotlightProps = {
  icon: FinanceIconName;
  eyebrow?: string;
  title: string;
  description: string;
  stats?: FinanceSpotlightStat[];
};

export function FinanceSpotlight({
  icon,
  eyebrow,
  title,
  description,
  stats = [],
}: FinanceSpotlightProps) {
  return (
    <section className="finance-spotlight">
      <div className="finance-spotlight__header">
        <div className="finance-spotlight__icon">
          <FinanceIcon name={icon} size={24} />
        </div>
        <div className="finance-spotlight__content">
          {eyebrow ? <div className="finance-spotlight__eyebrow">{eyebrow}</div> : null}
          <h2 className="finance-spotlight__title">{title}</h2>
          <p className="finance-spotlight__description">{description}</p>
        </div>
      </div>
      {stats.length > 0 ? (
        <div className="finance-spotlight__stats">
          {stats.map((stat) => (
            <div key={stat.label} className="finance-spotlight__stat">
              <span className="finance-spotlight__stat-label">{stat.label}</span>
              <strong className="finance-spotlight__stat-value">{stat.value}</strong>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
