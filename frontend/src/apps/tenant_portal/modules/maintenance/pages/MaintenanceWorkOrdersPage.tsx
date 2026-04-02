import { useLanguage } from "../../../../../store/language-context";
import { MaintenancePlaceholderPage } from "../components/common/MaintenancePlaceholderPage";

export function MaintenanceWorkOrdersPage() {
  const { language } = useLanguage();

  return (
    <MaintenancePlaceholderPage
      title={language === "es" ? "Mantenciones activas" : "Active work orders"}
      description={
        language === "es"
          ? "Este bloque abrirá la gestión de mantenciones programadas, reprogramaciones, cierre y anulación."
          : "This block will open scheduled work orders, rescheduling, completion, and cancellation management."
      }
    />
  );
}
