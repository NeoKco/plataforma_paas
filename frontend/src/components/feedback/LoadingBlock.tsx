import { useLanguage } from "../../store/language-context";

export function LoadingBlock({ label = "Cargando..." }: { label?: string }) {
  const { language } = useLanguage();
  const resolvedLabel =
    label === "Cargando..."
      ? language === "es"
        ? "Cargando..."
        : "Loading..."
      : label;

  return (
    <div className="d-flex align-items-center gap-3 rounded-3 border bg-white p-4 shadow-sm">
      <div className="spinner-border spinner-border-sm text-primary" role="status" />
      <span className="text-secondary">{resolvedLabel}</span>
    </div>
  );
}
