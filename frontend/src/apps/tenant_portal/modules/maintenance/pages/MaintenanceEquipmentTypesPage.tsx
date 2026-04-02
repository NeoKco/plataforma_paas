import { useLanguage } from "../../../../../store/language-context";
import { MaintenancePlaceholderPage } from "../components/common/MaintenancePlaceholderPage";

export function MaintenanceEquipmentTypesPage() {
  const { language } = useLanguage();

  return (
    <MaintenancePlaceholderPage
      title={language === "es" ? "Tipos de equipo" : "Equipment types"}
      description={
        language === "es"
          ? "Catálogo técnico base para clasificar instalaciones y órdenes de mantención."
          : "Base technical catalog to classify installations and maintenance work orders."
      }
    />
  );
}
