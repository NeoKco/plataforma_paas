import { useLanguage } from "../../store/language-context";

type EmptyStateProps = {
  title: string;
  detail: string;
};

export function EmptyState({ title, detail }: EmptyStateProps) {
  const { language } = useLanguage();

  return (
    <div className="empty-state">
      <div className="empty-state__eyebrow">
        {language === "es" ? "Sin datos" : "No data"}
      </div>
      <h3 className="empty-state__title">{title}</h3>
      <p className="empty-state__detail">{detail}</p>
    </div>
  );
}
