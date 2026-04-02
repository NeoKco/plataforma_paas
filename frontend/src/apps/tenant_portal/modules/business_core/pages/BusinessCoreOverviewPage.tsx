import { MetricCard } from "../../../../../components/common/MetricCard";
import { PanelCard } from "../../../../../components/common/PanelCard";
import { useLanguage } from "../../../../../store/language-context";
import { BusinessCorePlaceholderPage } from "../components/common/BusinessCorePlaceholderPage";

export function BusinessCoreOverviewPage() {
  const { language } = useLanguage();

  return (
    <div className="d-grid gap-4">
      <BusinessCorePlaceholderPage
        title={language === "es" ? "Base compartida tenant" : "Shared tenant base"}
        description={
          language === "es"
            ? "Primer slice para normalizar empresas, clientes, contactos y sitios antes de seguir con Mantenciones."
            : "First slice to normalize organizations, clients, contacts, and sites before continuing with Maintenance."
        }
      />
      <div className="row g-3">
        <div className="col-12 col-md-6 col-xl-3">
          <MetricCard
            label={language === "es" ? "Fase actual" : "Current phase"}
            value={language === "es" ? "Diseño" : "Design"}
            hint={language === "es" ? "Slice scaffolded" : "Slice scaffolded"}
            icon="business-core"
            tone="info"
          />
        </div>
        <div className="col-12 col-md-6 col-xl-3">
          <MetricCard
            label={language === "es" ? "Fase 1A" : "Phase 1A"}
            value={language === "es" ? "4 entidades" : "4 entities"}
            hint={language === "es" ? "Empresas, clientes, contactos y sitios" : "Organizations, clients, contacts, and sites"}
            icon="accounts"
          />
        </div>
        <div className="col-12 col-md-6 col-xl-3">
          <MetricCard
            label={language === "es" ? "Consumidores" : "Consumers"}
            value="3"
            hint={language === "es" ? "Maintenance, Projects, IoT" : "Maintenance, Projects, IoT"}
            icon="categories"
            tone="warning"
          />
        </div>
        <div className="col-12 col-md-6 col-xl-3">
          <MetricCard
            label={language === "es" ? "Riesgo evitado" : "Risk avoided"}
            value={language === "es" ? "Duplicación" : "Duplication"}
            hint={language === "es" ? "No mezclar dominio en módulos operativos" : "No domain duplication in operational modules"}
            icon="focus"
            tone="success"
          />
        </div>
      </div>
      <PanelCard
        title={language === "es" ? "Diseño aprobado" : "Approved design"}
        subtitle={
          language === "es"
            ? "La fuente real es ieris_app, pero la arquitectura destino ya no hereda sus acoplamientos."
            : "The real source is ieris_app, but the destination architecture no longer inherits its couplings."
        }
      >
        <ul className="mb-0">
          <li>
            {language === "es"
              ? "Cliente ya no guarda dirección y contactos como columnas planas."
              : "Client no longer stores address and contacts as flat columns."}
          </li>
          <li>
            {language === "es"
              ? "Empresa deja de mezclar cliente, proveedora y propia como una sola tabla rígida."
              : "Organization stops mixing client, supplier, and own-company concerns in one rigid table."}
          </li>
          <li>
            {language === "es"
              ? "Sitio pasa a ser entidad de primer nivel para Mantenciones, Proyectos e IoT."
              : "Site becomes a first-level entity for Maintenance, Projects, and IoT."}
          </li>
        </ul>
      </PanelCard>
    </div>
  );
}
