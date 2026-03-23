type EmptyStateProps = {
  title: string;
  detail: string;
};

export function EmptyState({ title, detail }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="empty-state__eyebrow">Sin datos</div>
      <h3 className="empty-state__title">{title}</h3>
      <p className="empty-state__detail">{detail}</p>
    </div>
  );
}
