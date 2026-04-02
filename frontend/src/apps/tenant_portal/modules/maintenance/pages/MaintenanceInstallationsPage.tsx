import { useLanguage } from "../../../../../store/language-context";
import { MaintenancePlaceholderPage } from "../components/common/MaintenancePlaceholderPage";

export function MaintenanceInstallationsPage() {
  const { language } = useLanguage();

  return (
    <MaintenancePlaceholderPage
      title={language === "es" ? "Instalaciones por cliente" : "Client installations"}
      description={
        language === "es"
          ? "La base del módulo incluirá instalaciones técnicas como contexto obligatorio o recomendado para las mantenciones."
          : "The base module includes technical installations as required or recommended context for work orders."
      }
    />
  );
}
