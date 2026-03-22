import type { ReactNode } from "react";

type PanelCardProps = {
  title?: string;
  subtitle?: string;
  children: ReactNode;
};

export function PanelCard({ title, subtitle, children }: PanelCardProps) {
  return (
    <section className="panel-card">
      {title || subtitle ? (
        <header className="panel-card__header">
          {title ? <h2 className="panel-card__title">{title}</h2> : null}
          {subtitle ? <p className="panel-card__subtitle">{subtitle}</p> : null}
        </header>
      ) : null}
      <div className="panel-card__body">{children}</div>
    </section>
  );
}
