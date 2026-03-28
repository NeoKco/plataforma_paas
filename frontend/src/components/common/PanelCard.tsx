import type { ReactNode } from "react";
import { AppIcon, type AppIconName } from "../../design-system/AppIcon";

type PanelCardProps = {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  icon?: AppIconName;
  actions?: ReactNode;
};

export function PanelCard({
  title,
  subtitle,
  children,
  icon,
  actions,
}: PanelCardProps) {
  return (
    <section className="panel-card">
      {title || subtitle ? (
        <header className="panel-card__header">
          <div className="panel-card__header-main">
            {icon ? (
              <div className="panel-card__icon">
                <AppIcon name={icon} size={18} />
              </div>
            ) : null}
            <div>
              {title ? <h2 className="panel-card__title">{title}</h2> : null}
              {subtitle ? <p className="panel-card__subtitle">{subtitle}</p> : null}
            </div>
          </div>
          {actions ? <div className="panel-card__actions">{actions}</div> : null}
        </header>
      ) : null}
      <div className="panel-card__body">{children}</div>
    </section>
  );
}
