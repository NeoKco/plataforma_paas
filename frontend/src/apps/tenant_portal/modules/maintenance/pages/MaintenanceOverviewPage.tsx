import { MetricCard } from "../../../../../components/common/MetricCard";
import { PanelCard } from "../../../../../components/common/PanelCard";
import { useLanguage } from "../../../../../store/language-context";
import { MaintenancePlaceholderPage } from "../components/common/MaintenancePlaceholderPage";

export function MaintenanceOverviewPage() {
  const { language } = useLanguage();

  return (
    <div className="d-grid gap-4">
      <MaintenancePlaceholderPage
        title={language === "es" ? "Resumen técnico" : "Technical overview"}
        description={
          language === "es"
            ? "Primer corte planeado para la operación diaria de mantenciones, instalaciones y agenda."
            : "First planned slice for daily work orders, installations, and calendar operations."
        }
      />
      <div className="row g-3">
        <div className="col-12 col-md-6 col-xl-3">
          <MetricCard
            label={language === "es" ? "Slice 1" : "Slice 1"}
            value={language === "es" ? "Activo" : "Active"}
            hint={language === "es" ? "Diseño definido" : "Design defined"}
            icon="maintenance"
            tone="info"
          />
        </div>
        <div className="col-12 col-md-6 col-xl-3">
          <MetricCard
            label={language === "es" ? "Foco" : "Focus"}
            value={language === "es" ? "Operación diaria" : "Daily operations"}
            hint={language === "es" ? "Trabajo técnico recurrente" : "Recurring technical work"}
            icon="planning"
            tone="warning"
          />
        </div>
        <div className="col-12 col-md-6 col-xl-3">
          <MetricCard
            label={language === "es" ? "Catálogos base" : "Base catalogs"}
            value="2"
            hint={language === "es" ? "Instalaciones y equipos" : "Installations and equipment"}
            icon="catalogs"
          />
        </div>
        <div className="col-12 col-md-6 col-xl-3">
          <MetricCard
            label={language === "es" ? "Integración futura" : "Future integration"}
            value={language === "es" ? "Agenda" : "Calendar"}
            hint={language === "es" ? "Sincronización operativa" : "Operational sync"}
            icon="overview"
          />
        </div>
      </div>
      <PanelCard
        title={language === "es" ? "Mejoras previstas" : "Planned improvements"}
        subtitle={
          language === "es"
            ? "El módulo no copiará la deuda completa de la app fuente."
            : "The module will not copy the full debt from the source app."
        }
      >
        <ul className="mb-0">
          <li>{language === "es" ? "Lifecycle formal de la orden técnica sin mover registros a otra tabla para operar." : "Formal work-order lifecycle without moving records to a second table to operate."}</li>
          <li>{language === "es" ? "Vínculo explícito entre mantención e instalación cuando el cliente tenga varias." : "Explicit link between work order and installation when the client has multiple assets."}</li>
          <li>{language === "es" ? "Lectura por ficha operativa, no solo tabla compacta." : "Operational detail view, not only a compact table."}</li>
        </ul>
      </PanelCard>
    </div>
  );
}
