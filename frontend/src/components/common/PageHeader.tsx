import { AppIcon, type AppIconName } from "../../design-system/AppIcon";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  icon?: AppIconName;
};

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  icon,
}: PageHeaderProps) {
  return (
    <div className="page-header d-flex flex-column flex-lg-row align-items-lg-end justify-content-between gap-3">
      <div className="page-header__main">
        {icon ? (
          <div className="page-header__icon">
            <AppIcon name={icon} size={22} />
          </div>
        ) : null}
        <div>
          {eyebrow ? <div className="page-eyebrow">{eyebrow}</div> : null}
          <h1 className="page-title">{title}</h1>
          {description ? <p className="page-description mb-0">{description}</p> : null}
        </div>
      </div>
      {actions ? <div className="d-flex gap-2">{actions}</div> : null}
    </div>
  );
}
