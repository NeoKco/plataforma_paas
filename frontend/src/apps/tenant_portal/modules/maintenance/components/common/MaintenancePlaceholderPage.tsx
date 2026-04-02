import { PageHeader } from "../../../../../../components/common/PageHeader";
import { PanelCard } from "../../../../../../components/common/PanelCard";
import { useLanguage } from "../../../../../../store/language-context";
import { MaintenanceModuleNav } from "./MaintenanceModuleNav";

export function MaintenancePlaceholderPage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  const { language } = useLanguage();

  return (
    <div className="d-grid gap-4">
      <PageHeader
        eyebrow={language === "es" ? "Mantenimiento" : "Maintenance"}
        icon="maintenance"
        title={title}
        description={description}
      />
      <MaintenanceModuleNav />
      <PanelCard
        title={language === "es" ? "Slice en apertura" : "Slice opening"}
        subtitle={
          language === "es"
            ? "Este frente ya quedó declarado como el siguiente módulo tenant priorizado."
            : "This front is now declared as the next prioritized tenant module."
        }
      >
        <p className="text-secondary mb-0">
          {language === "es"
            ? "La implementación comienza por mantenciones activas, historial, instalaciones por cliente, tipos de equipo e integración con agenda. CRM, cotizaciones y expediente técnico completo quedan como fases posteriores."
            : "Implementation starts with active work orders, history, client installations, equipment types, and calendar integration. CRM, quotes, and the full technical record stay as later phases."}
        </p>
      </PanelCard>
    </div>
  );
}
