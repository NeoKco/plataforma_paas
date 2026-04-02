import { PageHeader } from "../../../../../components/common/PageHeader";
import { MetricCard } from "../../../../../components/common/MetricCard";
import { PanelCard } from "../../../../../components/common/PanelCard";
import { AppToolbar } from "../../../../../design-system/AppLayout";
import { useLanguage } from "../../../../../store/language-context";
import { MaintenanceHelpBubble } from "../components/common/MaintenanceHelpBubble";
import { MaintenanceModuleNav } from "../components/common/MaintenanceModuleNav";

export function MaintenanceOverviewPage() {
  const { language } = useLanguage();

  return (
    <div className="d-grid gap-4">
      <PageHeader
        eyebrow={language === "es" ? "Mantenciones" : "Maintenance"}
        icon="maintenance"
        title={language === "es" ? "Resumen técnico" : "Technical overview"}
        description={
          language === "es"
            ? "Primer corte ya operativo para órdenes de trabajo, instalaciones y tipos de equipo sobre business-core."
            : "First operational slice already live for work orders, installations, and equipment types on top of business-core."
        }
        actions={
          <AppToolbar compact>
            <MaintenanceHelpBubble
              label={language === "es" ? "Ayuda" : "Help"}
              helpText={
                language === "es"
                  ? "El módulo ya usa business-core como dominio base. Lo pendiente ahora es profundizar historial, agenda, visitas e importadores desde la app fuente."
                  : "The module already uses business-core as its base domain. The pending work now is deeper history, calendar, visits, and importers from the source app."
              }
            />
          </AppToolbar>
        }
      />
      <MaintenanceModuleNav />
      <div className="row g-3">
        <div className="col-12 col-md-6 col-xl-3">
          <MetricCard
            label={language === "es" ? "Slice base" : "Base slice"}
            value={language === "es" ? "Operativo" : "Live"}
            hint={
              language === "es"
                ? "Frontend y backend conectados"
                : "Frontend and backend connected"
            }
            icon="maintenance"
            tone="success"
          />
        </div>
        <div className="col-12 col-md-6 col-xl-3">
          <MetricCard
            label={language === "es" ? "Catálogos" : "Catalogs"}
            value="2"
            hint={
              language === "es"
                ? "Tipos de equipo e instalaciones"
                : "Equipment types and installations"
            }
            icon="catalogs"
            tone="info"
          />
        </div>
        <div className="col-12 col-md-6 col-xl-3">
          <MetricCard
            label={language === "es" ? "Lifecycle" : "Lifecycle"}
            value={language === "es" ? "Con trazabilidad" : "Traceable"}
            hint={
              language === "es"
                ? "La orden cambia de estado sin mover filas"
                : "Orders change status without moving rows"
            }
            icon="tenant-history"
            tone="warning"
          />
        </div>
        <div className="col-12 col-md-6 col-xl-3">
          <MetricCard
            label={language === "es" ? "Dependencia base" : "Base dependency"}
            value="business-core"
            hint={
              language === "es"
                ? "Clientes y sitios ya normalizados"
                : "Clients and sites already normalized"
            }
            icon="business-core"
            tone="info"
          />
        </div>
      </div>
      <PanelCard
        title={language === "es" ? "Qué ya quedó resuelto" : "What is already solved"}
        subtitle={
          language === "es"
            ? "El módulo ya no depende del modelo embebido de la app fuente para operar."
            : "The module no longer depends on the embedded source-app model to operate."
        }
      >
        <ul className="mb-0">
          <li>
            {language === "es"
              ? "Órdenes de trabajo con create, update, cambio de estado y borrado seguro."
              : "Work orders with create, update, status change, and safe delete."}
          </li>
          <li>
            {language === "es"
              ? "Instalaciones ligadas a sitios reales del core compartido."
              : "Installations linked to real sites from the shared core."}
          </li>
          <li>
            {language === "es"
              ? "Tipos de equipo reutilizables para clasificar el parque técnico."
              : "Reusable equipment types to classify the technical asset base."}
          </li>
        </ul>
      </PanelCard>
      <PanelCard
        title={language === "es" ? "Lo que sigue" : "What comes next"}
        subtitle={
          language === "es"
            ? "El siguiente salto ya no es abrir más tablas, sino mejorar operación y migración."
            : "The next step is no longer opening more tables, but improving operations and migration."
        }
      >
        <ul className="mb-0">
          <li>
            {language === "es"
              ? "Historial operativo visible con logs y visitas."
              : "Visible operational history with logs and visits."}
          </li>
          <li>
            {language === "es"
              ? "Agenda integrada para programación y reprogramación."
              : "Integrated calendar for scheduling and rescheduling."}
          </li>
          <li>
            {language === "es"
              ? "Importadores desde ieris_app hacia maintenance y business-core."
              : "Importers from ieris_app into maintenance and business-core."}
          </li>
        </ul>
      </PanelCard>
    </div>
  );
}
