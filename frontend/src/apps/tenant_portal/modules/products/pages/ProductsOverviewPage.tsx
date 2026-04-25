import { useEffect, useState } from "react";
import { DataTableCard } from "../../../../../components/data-display/DataTableCard";
import { ErrorState } from "../../../../../components/feedback/ErrorState";
import { LoadingBlock } from "../../../../../components/feedback/LoadingBlock";
import { MetricCard } from "../../../../../components/common/MetricCard";
import { PageHeader } from "../../../../../components/common/PageHeader";
import { PanelCard } from "../../../../../components/common/PanelCard";
import { AppToolbar } from "../../../../../design-system/AppLayout";
import { getApiErrorDisplayMessage } from "../../../../../services/api";
import { useLanguage } from "../../../../../store/language-context";
import { useTenantAuth } from "../../../../../store/tenant-auth-context";
import type { ApiError } from "../../../../../types";
import { ProductsModuleNav } from "../components/common/ProductsModuleNav";
import { getProductCatalogOverview } from "../services/productsService";

function formatMoney(value: number, language: "es" | "en", currencyCode = "CLP") {
  return new Intl.NumberFormat(language === "es" ? "es-CL" : "en-US", {
    style: "currency",
    currency: currencyCode || "CLP",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export function ProductsOverviewPage() {
  const { session } = useTenantAuth();
  const { language } = useLanguage();
  const [data, setData] = useState<Awaited<ReturnType<typeof getProductCatalogOverview>> | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function loadOverview() {
    if (!session?.accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      setData(await getProductCatalogOverview(session.accessToken));
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
        eyebrow={language === "es" ? "Catálogo de productos" : "Product catalog"}
        icon="products"
        title={language === "es" ? "Catálogo, scraping e IA" : "Catalog, scraping and AI"}
        description={
          language === "es"
            ? "Módulo base para capturar, mantener y reutilizar productos en cotizaciones y futuros proyectos."
            : "Base module to capture, maintain, and reuse products in quotes and future projects."
        }
        actions={
          <AppToolbar compact>
            <button className="btn btn-outline-secondary" type="button" onClick={() => void loadOverview()}>
              {language === "es" ? "Recargar" : "Reload"}
            </button>
          </AppToolbar>
        }
      />
      <ProductsModuleNav />
      {error ? (
        <ErrorState
          title={language === "es" ? "No se pudo cargar el catálogo" : "Could not load the catalog"}
          detail={getApiErrorDisplayMessage(error)}
          requestId={error.payload?.request_id}
        />
      ) : null}
      {isLoading ? <LoadingBlock label={language === "es" ? "Cargando catálogo..." : "Loading catalog..."} /> : null}

      {!isLoading && metrics ? (
        <>
          <div className="tenant-portal-metrics">
            <MetricCard
              icon="products"
              label={language === "es" ? "Productos activos" : "Active products"}
              value={metrics.products_active}
              hint={language === "es" ? "Catálogo vigente para reutilizar" : "Current reusable catalog"}
            />
            <MetricCard
              icon="catalogs"
              label={language === "es" ? "Borradores ingesta" : "Ingestion drafts"}
              value={metrics.ingestion_draft}
              hint={language === "es" ? "Pendientes de revisar" : "Pending review"}
            />
            <MetricCard
              icon="focus"
              label={language === "es" ? "Aprobados" : "Approved"}
              value={metrics.approved_total}
              hint={language === "es" ? "Publicados al catálogo" : "Published to catalog"}
            />
            <MetricCard
              icon="pulse"
              label={language === "es" ? "Corridas activas" : "Active runs"}
              value={metrics.run_active}
              hint={language === "es" ? "Extracción en curso" : "Extraction in progress"}
            />
          </div>
          <div className="tenant-portal-metrics">
            <MetricCard
              icon="reports"
              label={language === "es" ? "Valor referencial visible" : "Visible reference value"}
              value={formatMoney(
                (data.recent_products || []).reduce((sum, item) => sum + (item.unit_price || 0), 0),
                language,
              )}
              hint={language === "es" ? "Suma rápida de productos recientes" : "Quick sum of recent products"}
            />
            <MetricCard
              icon="shopping"
              label={language === "es" ? "Capturas por URL" : "URL captures"}
              value={metrics.url_source_total}
              hint={language === "es" ? "Fuentes externas registradas" : "Registered external sources"}
            />
            <MetricCard
              icon="reports"
              label={language === "es" ? "Fuentes activas" : "Active sources"}
              value={metrics.source_active}
              hint={language === "es" ? "Referencias útiles para cotizar" : "Useful references for quoting"}
            />
            <MetricCard
              icon="settings"
              label={language === "es" ? "Conectores activos" : "Active connectors"}
              value={metrics.connector_active}
              hint={language === "es" ? "Perfiles multi-fuente vigentes" : "Current multi-source profiles"}
            />
            <MetricCard
              icon="pulse"
              label={language === "es" ? "Con scheduler" : "Scheduled connectors"}
              value={metrics.connector_scheduled}
              hint={language === "es" ? "Conectores con refresh tenant programado" : "Connectors with tenant scheduled refresh"}
            />
            <MetricCard
              icon="focus"
              label={language === "es" ? "Schedulers vencidos" : "Due schedulers"}
              value={metrics.connector_schedule_due}
              hint={language === "es" ? "Conectores listos para lanzar corridas" : "Connectors ready to launch runs"}
            />
            <MetricCard
              icon="reports"
              label={language === "es" ? "Productos multi-fuente" : "Multi-source products"}
              value={metrics.products_with_multi_source}
              hint={language === "es" ? "Listos para comparación y precio recomendado" : "Ready for comparison and recommended pricing"}
            />
            <MetricCard
              icon="pulse"
              label={language === "es" ? "Refresh activos" : "Active refresh runs"}
              value={metrics.refresh_run_active}
              hint={language === "es" ? "Campañas vivas de actualización" : "Live refresh campaigns"}
            />
            <MetricCard
              icon="focus"
              label={language === "es" ? "Fuentes vencidas" : "Due sources"}
              value={metrics.source_due}
              hint={language === "es" ? "Pendientes de actualizar por política" : "Pending refresh by policy"}
            />
            <MetricCard
              icon="reports"
              label={language === "es" ? "Fuentes con error" : "Sources with error"}
              value={metrics.source_error}
              hint={language === "es" ? "Requieren revisión o rescate" : "Require review or rescue"}
            />
          </div>

          <PanelCard
            title={language === "es" ? "Lectura operativa del módulo" : "Operational read of the module"}
            subtitle={
              language === "es"
                ? "Este módulo concentra el catálogo técnico-comercial y la ingesta asistida. CRM y futuros proyectos lo consumen, pero no lo nombran."
                : "This module concentrates the technical-commercial catalog and assisted ingestion. CRM and future projects consume it, but do not own it."
            }
          >
            <div className="crm-detail-grid">
              <div className="crm-detail-card">
                <div className="crm-detail-card__header">
                  <strong>{language === "es" ? "Catálogo vivo" : "Live catalog"}</strong>
                </div>
                <div className="text-muted small">
                  {language === "es"
                    ? "Productos y servicios con características, precio base y estructura reutilizable."
                    : "Products and services with characteristics, base price, and reusable structure."}
                </div>
              </div>
              <div className="crm-detail-card">
                <div className="crm-detail-card__header">
                  <strong>{language === "es" ? "Scraping asistido" : "Assisted scraping"}</strong>
                </div>
                <div className="text-muted small">
                  {language === "es"
                    ? "Captura desde URLs para revisar antes de publicar al catálogo."
                    : "Capture from URLs for review before publishing to the catalog."}
                </div>
              </div>
              <div className="crm-detail-card">
                <div className="crm-detail-card__header">
                  <strong>{language === "es" ? "Preparado para IA" : "Ready for AI"}</strong>
                </div>
                <div className="text-muted small">
                  {language === "es"
                    ? "Base adecuada para enriquecer descripción, atributos y clasificación con tu API de IA."
                    : "Suitable base to enrich description, attributes, and classification with your AI API."}
                </div>
              </div>
              <div className="crm-detail-card">
                <div className="crm-detail-card__header">
                  <strong>{language === "es" ? "Comparación multi-fuente" : "Multi-source comparison"}</strong>
                </div>
                <div className="text-muted small">
                  {language === "es"
                    ? "Permite contrastar varias fuentes por producto y recomendar la mejor referencia vigente."
                    : "Lets you compare multiple sources per product and recommend the best current reference."}
                </div>
              </div>
              <div className="crm-detail-card">
                <div className="crm-detail-card__header">
                  <strong>{language === "es" ? "Actualización viva" : "Live refresh"}</strong>
                </div>
                <div className="text-muted small">
                  {language === "es"
                    ? "Refresca artículos ya existentes desde sus URLs fuente con IA, merge controlado y scheduler por tenant."
                    : "Refreshes existing items from source URLs with AI, controlled merge, and tenant scheduler."}
                </div>
              </div>
            </div>
          </PanelCard>

          <DataTableCard
            title={language === "es" ? "Productos recientes" : "Recent products"}
            subtitle={language === "es" ? "Últimos elementos visibles del catálogo." : "Latest visible catalog items."}
            rows={data?.recent_products || []}
            columns={[
              {
                key: "name",
                header: language === "es" ? "Producto" : "Product",
                render: (row) => (
                  <div>
                    <strong>{row.name}</strong>
                    <div className="text-muted small">{row.sku || "—"}</div>
                  </div>
                ),
              },
              {
                key: "type",
                header: language === "es" ? "Tipo" : "Type",
                render: (row) => row.product_type,
              },
              {
                key: "price",
                header: language === "es" ? "Precio base" : "Base price",
                render: (row) => formatMoney(row.unit_price || 0, language),
              },
            ]}
          />

          <DataTableCard
            title={language === "es" ? "Borradores recientes" : "Recent drafts"}
            subtitle={language === "es" ? "Capturas aún no consolidadas o recién aprobadas." : "Captures not yet consolidated or just approved."}
            rows={data?.recent_drafts || []}
            columns={[
              {
                key: "name",
                header: language === "es" ? "Borrador" : "Draft",
                render: (row) => (
                  <div>
                    <strong>{row.name || row.source_label || row.source_url || "—"}</strong>
                    <div className="text-muted small">{row.brand || row.category_label || "—"}</div>
                  </div>
                ),
              },
              {
                key: "status",
                header: language === "es" ? "Estado" : "Status",
                render: (row) => row.capture_status,
              },
              {
                key: "published",
                header: language === "es" ? "Publicado" : "Published",
                render: (row) => row.published_product_name || "—",
              },
            ]}
          />

          <DataTableCard
            title={language === "es" ? "Fuentes recientes" : "Recent sources"}
            subtitle={
              language === "es"
                ? "Últimas referencias persistidas por producto."
                : "Latest persisted references per product."
            }
            rows={data?.recent_sources || []}
            columns={[
              {
                key: "source",
                header: language === "es" ? "Fuente" : "Source",
                render: (row) => (
                  <div>
                    <strong>{row.source_label || row.source_url || "—"}</strong>
                    <div className="text-muted small">{row.connector_name || row.source_kind}</div>
                  </div>
                ),
              },
              {
                key: "status",
                header: language === "es" ? "Estado" : "Status",
                render: (row) => row.source_status,
              },
              {
                key: "price",
                header: language === "es" ? "Precio" : "Price",
                render: (row) => formatMoney(row.latest_unit_price || 0, language, row.currency_code),
              },
            ]}
          />

          <DataTableCard
            title={language === "es" ? "Eventos de precio recientes" : "Recent price events"}
            subtitle={
              language === "es"
                ? "Trazabilidad de valores observados o consolidados."
                : "Traceability of observed or consolidated values."
            }
            rows={data?.recent_prices || []}
            columns={[
              {
                key: "product",
                header: language === "es" ? "Producto" : "Product",
                render: (row) => (
                  <div>
                    <strong>{row.product_name || `#${row.product_id}`}</strong>
                    <div className="text-muted small">{row.connector_name || row.price_kind}</div>
                  </div>
                ),
              },
              {
                key: "price",
                header: language === "es" ? "Precio" : "Price",
                render: (row) => formatMoney(row.unit_price || 0, language, row.currency_code),
              },
              {
                key: "captured",
                header: language === "es" ? "Capturado" : "Captured",
                render: (row) => row.captured_at || "—",
              },
            ]}
          />

          <DataTableCard
            title={language === "es" ? "Comparaciones recientes" : "Recent comparisons"}
            subtitle={
              language === "es"
                ? "Lectura rápida del mejor precio/fuente recomendada por producto."
                : "Quick read of the best recommended source/price per product."
            }
            rows={data?.recent_comparisons || []}
            columns={[
              {
                key: "product",
                header: language === "es" ? "Producto" : "Product",
                render: (row) => (
                  <div>
                    <strong>{row.product_name}</strong>
                    <div className="text-muted small">{row.product_sku || "—"}</div>
                  </div>
                ),
              },
              {
                key: "coverage",
                header: language === "es" ? "Cobertura" : "Coverage",
                render: (row) => `${row.active_source_count}/${row.source_count}`,
              },
              {
                key: "recommended",
                header: language === "es" ? "Recomendado" : "Recommended",
                render: (row) =>
                  row.recommended_price !== null
                    ? formatMoney(row.recommended_price, language, row.recommended_currency_code || "CLP")
                    : "—",
              },
              {
                key: "spread",
                header: language === "es" ? "Brecha" : "Spread",
                render: (row) =>
                  row.price_spread !== null
                    ? `${formatMoney(row.price_spread, language, row.recommended_currency_code || "CLP")} · ${Math.round(row.price_spread_percent || 0)}%`
                    : "—",
              },
            ]}
          />

          <DataTableCard
            title={language === "es" ? "Corridas de refresh recientes" : "Recent refresh runs"}
            subtitle={
              language === "es"
                ? "Actualización viva del catálogo desde fuentes activas y vencidas."
                : "Live catalog refresh from active and due sources."
            }
            rows={data?.recent_refresh_runs || []}
            columns={[
              {
                key: "scope",
                header: language === "es" ? "Alcance" : "Scope",
                render: (row) => (
                  <div>
                    <strong>{row.scope_label || row.scope}</strong>
                    <div className="text-muted small">{row.connector_name || "—"}</div>
                  </div>
                ),
              },
              {
                key: "status",
                header: language === "es" ? "Estado" : "Status",
                render: (row) => `${row.status} · ${row.processed_count}/${row.requested_count}`,
              },
              {
                key: "result",
                header: language === "es" ? "Resultado" : "Result",
                render: (row) => `${row.completed_count} ok / ${row.error_count} error`,
              },
            ]}
          />
        </>
      ) : null}
    </div>
  );
}
