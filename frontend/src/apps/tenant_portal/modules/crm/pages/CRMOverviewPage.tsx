import { useEffect, useMemo, useState } from "react";
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
  const pipelineHealth = useMemo(() => {
    if (!metrics) {
      return 0;
    }
    if (metrics.opportunities_total === 0) {
      return 0;
    }
    return Math.round((metrics.opportunities_open / metrics.opportunities_total) * 100);
  }, [metrics]);

  return (
    <div className="d-grid gap-4">
      <PageHeader
        eyebrow={language === "es" ? "CRM comercial" : "Commercial CRM"}
        icon="crm"
        title={language === "es" ? "CRM, Cotizaciones y Productos" : "CRM, Quotes, and Products"}
        description={
          language === "es"
            ? "Bloque comercial completo del tenant para oportunidades, catálogo reusable, plantillas y propuestas."
            : "Complete tenant commercial block for opportunities, reusable catalog, templates, and proposals."
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
              hint={language === "es" ? "Catálogo reutilizable disponible" : "Available reusable catalog"}
            />
            <MetricCard
              icon="pipeline"
              label={language === "es" ? "Oportunidades abiertas" : "Open opportunities"}
              value={metrics.opportunities_open}
              hint={language === "es" ? "Pipeline vivo" : "Live pipeline"}
            />
            <MetricCard
              icon="tenant-history"
              label={language === "es" ? "Históricas" : "Historical"}
              value={metrics.opportunities_historical}
              hint={language === "es" ? "Ganadas o perdidas" : "Won or lost"}
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
              hint={language === "es" ? "Ingreso esperado" : "Expected revenue"}
            />
            <MetricCard
              icon="reports"
              label={language === "es" ? "Monto cotizado" : "Quoted amount"}
              value={formatMoney(metrics.quoted_amount, language)}
              hint={language === "es" ? "Total vigente del frente comercial" : "Current commercial front total"}
            />
            <MetricCard
              icon="templates"
              label={language === "es" ? "Plantillas" : "Templates"}
              value={metrics.templates_total}
              hint={language === "es" ? "Bases comerciales reutilizables" : "Reusable commercial bases"}
            />
            <MetricCard
              icon="products"
              label={language === "es" ? "Borradores ingesta" : "Ingestion drafts"}
              value={metrics.ingestion_draft}
              hint={language === "es" ? "Pendientes de revisar y publicar" : "Pending review and publish"}
            />
          </div>

          <div className="tenant-portal-metrics">
            <MetricCard
              icon="focus"
              label={language === "es" ? "Salud pipeline" : "Pipeline health"}
              value={`${pipelineHealth}%`}
              hint={language === "es" ? "Proporción abierta del total" : "Open share of total"}
            />
            <MetricCard
              icon="catalogs"
              label={language === "es" ? "Ingesta total" : "Total ingestion"}
              value={metrics.ingestion_total}
              hint={language === "es" ? "Capturas comerciales registradas" : "Registered commercial captures"}
            />
          </div>

          <PanelCard
            title={language === "es" ? "Lectura operativa del frente comercial" : "Operational read of the commercial front"}
            subtitle={
              language === "es"
                ? "El módulo ya cubre captura, seguimiento, histórico y preparación de propuestas comerciales reutilizables."
                : "The module now covers capture, tracking, history, and reusable commercial proposal preparation."
            }
          >
            <div className="crm-detail-grid">
              <div className="crm-detail-card">
                <div className="crm-detail-card__header">
                  <strong>{language === "es" ? "Pipeline" : "Pipeline"}</strong>
                </div>
                <div className="text-muted small">
                  {language === "es"
                    ? "Oportunidades activas con kanban, detalle, notas, actividades, adjuntos y cierre formal."
                    : "Active opportunities with kanban, detail, notes, activities, attachments, and formal close."}
                </div>
              </div>
              <div className="crm-detail-card">
                <div className="crm-detail-card__header">
                  <strong>{language === "es" ? "Propuestas" : "Proposals"}</strong>
                </div>
                <div className="text-muted small">
                  {language === "es"
                    ? "Cotizaciones con líneas libres, estructura por secciones y plantillas base."
                    : "Quotes with free lines, structured sections, and base templates."}
                </div>
              </div>
              <div className="crm-detail-card">
                <div className="crm-detail-card__header">
                  <strong>{language === "es" ? "Catálogo" : "Catalog"}</strong>
                </div>
                <div className="text-muted small">
                  {language === "es"
                    ? "Productos y servicios enriquecidos con características técnicas/comerciales."
                    : "Products and services enriched with technical/commercial characteristics."}
                </div>
              </div>
              <div className="crm-detail-card">
                <div className="crm-detail-card__header">
                  <strong>{language === "es" ? "Ingesta asistida" : "Assisted ingestion"}</strong>
                </div>
                <div className="text-muted small">
                  {language === "es"
                    ? "Borradores revisables para capturar productos desde referencias externas antes de publicarlos al catálogo."
                    : "Reviewable drafts to capture products from external references before publishing them to the catalog."}
                </div>
              </div>
            </div>
          </PanelCard>

          <DataTableCard
            title={language === "es" ? "Oportunidades recientes" : "Recent opportunities"}
            subtitle={language === "es" ? "Lectura rápida del pipeline abierto." : "Quick read of the open pipeline."}
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
                key: "probability",
                header: language === "es" ? "Probabilidad" : "Probability",
                render: (row) => `${row.probability_percent}%`,
              },
              {
                key: "amount",
                header: language === "es" ? "Valor esperado" : "Expected value",
                render: (row) => formatMoney(row.expected_value || 0, language),
              },
            ]}
          />

          <DataTableCard
            title={language === "es" ? "Borradores recientes de ingesta" : "Recent ingestion drafts"}
            subtitle={
              language === "es"
                ? "Capturas pendientes o recién publicadas al catálogo."
                : "Captures pending review or just published to the catalog."
            }
            rows={data?.recent_product_drafts || []}
            columns={[
              {
                key: "name",
                header: language === "es" ? "Borrador" : "Draft",
                render: (row) => (
                  <div>
                    <strong>{row.name || row.source_label || "—"}</strong>
                    <div className="text-muted small">{row.source_url || row.brand || "—"}</div>
                  </div>
                ),
              },
              {
                key: "status",
                header: language === "es" ? "Estado" : "Status",
                render: (row) => row.capture_status,
              },
              {
                key: "type",
                header: language === "es" ? "Tipo" : "Type",
                render: (row) => row.product_type,
              },
              {
                key: "published",
                header: language === "es" ? "Producto final" : "Published product",
                render: (row) => row.published_product_name || "—",
              },
            ]}
          />

          <DataTableCard
            title={language === "es" ? "Cotizaciones recientes" : "Recent quotes"}
            subtitle={
              language === "es"
                ? "Últimas propuestas estructuradas registradas."
                : "Latest registered structured proposals."
            }
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
                key: "template",
                header: language === "es" ? "Plantilla" : "Template",
                render: (row) => row.template_name || "—",
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
