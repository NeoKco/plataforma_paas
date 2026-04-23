import { useEffect, useState } from "react";
import { PageHeader } from "../../../../../components/common/PageHeader";
import { MetricCard } from "../../../../../components/common/MetricCard";
import { PanelCard } from "../../../../../components/common/PanelCard";
import { DataTableCard } from "../../../../../components/data-display/DataTableCard";
import { ErrorState } from "../../../../../components/feedback/ErrorState";
import { LoadingBlock } from "../../../../../components/feedback/LoadingBlock";
import { AppToolbar } from "../../../../../design-system/AppLayout";
import { getApiErrorDisplayMessage } from "../../../../../services/api";
import { useLanguage } from "../../../../../store/language-context";
import { useTenantAuth } from "../../../../../store/tenant-auth-context";
import type { ApiError } from "../../../../../types";
import { CRMModuleNav } from "../components/common/CRMModuleNav";
import { getCRMOverview } from "../services/crmService";

function formatMoney(value: number, language: "es" | "en") {
  return new Intl.NumberFormat(language === "es" ? "es-CL" : "en-US", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export function CRMOverviewPage() {
  const { session } = useTenantAuth();
  const { language } = useLanguage();
  const [data, setData] = useState<Awaited<ReturnType<typeof getCRMOverview>> | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function loadOverview() {
    if (!session?.accessToken) {
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      setData(await getCRMOverview(session.accessToken));
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadOverview();
  }, [session?.accessToken]);

  const metrics = data?.metrics;

  return (
    <div className="d-grid gap-4">
      <PageHeader
        eyebrow={language === "es" ? "CRM comercial" : "Commercial CRM"}
        icon="crm"
        title={language === "es" ? "CRM, Cotizaciones y Productos" : "CRM, Quotes, and Products"}
        description={
          language === "es"
            ? "Primer slice comercial del PaaS para oportunidades, propuestas y catálogo reutilizable."
            : "First commercial slice of the PaaS for opportunities, proposals, and reusable catalog."
        }
        actions={
          <AppToolbar compact>
            <button className="btn btn-outline-secondary" type="button" onClick={() => void loadOverview()}>
              {language === "es" ? "Recargar" : "Reload"}
            </button>
          </AppToolbar>
        }
      />
      <CRMModuleNav />

      {error ? (
        <ErrorState
          title={language === "es" ? "No se pudo cargar CRM" : "Could not load CRM"}
          detail={getApiErrorDisplayMessage(error)}
          requestId={error.payload?.request_id}
        />
      ) : null}
      {isLoading ? <LoadingBlock label={language === "es" ? "Cargando CRM..." : "Loading CRM..."} /> : null}

      {!isLoading && metrics ? (
        <>
          <div className="tenant-portal-metrics">
            <MetricCard
              icon="products"
              label={language === "es" ? "Productos activos" : "Active products"}
              value={metrics.products_active}
              hint={language === "es" ? "Catálogo comercial reusable" : "Reusable commercial catalog"}
            />
            <MetricCard
              icon="pipeline"
              label={language === "es" ? "Oportunidades" : "Opportunities"}
              value={metrics.opportunities_total}
              hint={language === "es" ? "Pipeline vigente" : "Current pipeline"}
            />
            <MetricCard
              icon="quotes"
              label={language === "es" ? "Cotizaciones" : "Quotes"}
              value={metrics.quotes_total}
              hint={language === "es" ? "Propuestas registradas" : "Registered proposals"}
            />
          </div>

          <div className="tenant-portal-metrics">
            <MetricCard
              icon="crm"
              label={language === "es" ? "Valor pipeline" : "Pipeline value"}
              value={formatMoney(metrics.pipeline_value, language)}
              hint={language === "es" ? "Monto esperado" : "Expected amount"}
            />
            <MetricCard
              icon="reports"
              label={language === "es" ? "Monto cotizado" : "Quoted amount"}
              value={formatMoney(metrics.quoted_amount, language)}
              hint={language === "es" ? "Total de propuestas activas" : "Total active proposals"}
            />
          </div>

          <PanelCard
            title={language === "es" ? "Lectura operativa del frente comercial" : "Operational reading of the commercial front"}
            subtitle={
              language === "es"
                ? "Este primer corte abre el bloque CRM + Cotizaciones + Productos con base tenant real y relación a clientes del core."
                : "This first cut opens the CRM + Quotes + Products block with a real tenant base and links to business-core clients."
            }
          >
            <p className="mb-0">
              {language === "es"
                ? "Quedan para slices siguientes: notas/actividades CRM, archivos, plantillas comerciales, render/PDF y pipeline histórico más rico."
                : "Next slices remain for CRM notes/activities, files, commercial templates, render/PDF, and richer pipeline history."}
            </p>
          </PanelCard>

          <DataTableCard
            title={language === "es" ? "Oportunidades recientes" : "Recent opportunities"}
            subtitle={language === "es" ? "Lectura rápida del pipeline." : "Quick pipeline read."}
            rows={data?.recent_opportunities || []}
            columns={[
              {
                key: "title",
                header: language === "es" ? "Oportunidad" : "Opportunity",
                render: (row) => (
                  <div>
                    <strong>{row.title}</strong>
                    <div className="text-muted small">{row.client_display_name || "—"}</div>
                  </div>
                ),
              },
              {
                key: "stage",
                header: language === "es" ? "Etapa" : "Stage",
                render: (row) => row.stage,
              },
              {
                key: "amount",
                header: language === "es" ? "Valor esperado" : "Expected value",
                render: (row) => formatMoney(row.expected_value || 0, language),
              },
            ]}
          />

          <DataTableCard
            title={language === "es" ? "Cotizaciones recientes" : "Recent quotes"}
            subtitle={language === "es" ? "Últimas propuestas registradas." : "Latest registered proposals."}
            rows={data?.recent_quotes || []}
            columns={[
              {
                key: "title",
                header: language === "es" ? "Cotización" : "Quote",
                render: (row) => (
                  <div>
                    <strong>{row.title}</strong>
                    <div className="text-muted small">{row.client_display_name || "—"}</div>
                  </div>
                ),
              },
              {
                key: "status",
                header: language === "es" ? "Estado" : "Status",
                render: (row) => row.quote_status,
              },
              {
                key: "total",
                header: language === "es" ? "Total" : "Total",
                render: (row) => formatMoney(row.total_amount || 0, language),
              },
            ]}
          />
        </>
      ) : null}
    </div>
  );
}
