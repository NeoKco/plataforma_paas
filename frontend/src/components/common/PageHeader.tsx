type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
};

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: PageHeaderProps) {
  return (
    <div className="page-header d-flex flex-column flex-lg-row align-items-lg-end justify-content-between gap-3">
      <div>
        {eyebrow ? <div className="page-eyebrow">{eyebrow}</div> : null}
        <h1 className="page-title">{title}</h1>
        {description ? <p className="page-description mb-0">{description}</p> : null}
      </div>
      {actions ? <div className="d-flex gap-2">{actions}</div> : null}
    </div>
  );
}
