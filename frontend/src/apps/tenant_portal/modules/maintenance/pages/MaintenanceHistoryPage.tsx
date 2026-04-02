import { useLanguage } from "../../../../../store/language-context";
import { MaintenancePlaceholderPage } from "../components/common/MaintenancePlaceholderPage";

export function MaintenanceHistoryPage() {
  const { language } = useLanguage();

  return (
    <MaintenancePlaceholderPage
      title={language === "es" ? "Historial técnico" : "Technical history"}
      description={
        language === "es"
          ? "El historial derivará de órdenes cerradas con trazabilidad, no de un mecanismo de borrado operativo."
          : "History will derive from closed work orders with traceability, not from an operational delete pattern."
      }
    />
  );
}
