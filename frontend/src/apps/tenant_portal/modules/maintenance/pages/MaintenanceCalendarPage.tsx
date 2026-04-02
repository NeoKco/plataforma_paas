import { useLanguage } from "../../../../../store/language-context";
import { MaintenancePlaceholderPage } from "../components/common/MaintenancePlaceholderPage";

export function MaintenanceCalendarPage() {
  const { language } = useLanguage();

  return (
    <MaintenancePlaceholderPage
      title={language === "es" ? "Agenda técnica" : "Technical calendar"}
      description={
        language === "es"
          ? "La sincronización con agenda será una pieza base del módulo para evitar solapamientos y ordenar terreno."
          : "Calendar sync will be a base module piece to prevent overlaps and coordinate field work."
      }
    />
  );
}
