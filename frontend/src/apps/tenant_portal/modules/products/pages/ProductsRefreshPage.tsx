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
import {
  cancelProductCatalogRefreshRun,
  createProductCatalogRefreshRun,
  getProductCatalogItems,
  getProductCatalogRefreshRuns,
  refreshProductCatalogItemNow,
  type ProductCatalogItem,
  type ProductCatalogRefreshRun,
} from "../services/productsService";

function formatDate(value: string | null) {
  if (!value) return "—";
  return value.replace("T", " ").slice(0, 16);
}

export function ProductsRefreshPage() {
  const { session } = useTenantAuth();
  const { language } = useLanguage();
  const [products, setProducts] = useState<ProductCatalogItem[]>([]);
  const [runs, setRuns] = useState<ProductCatalogRefreshRun[]>([]);
  const [error, setError] = useState<ApiError | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function loadData() {
    if (!session?.accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const [productResponse, runResponse] = await Promise.all([
        getProductCatalogItems(session.accessToken),
        getProductCatalogRefreshRuns(session.accessToken),
      ]);
      setProducts(productResponse.data || []);
      setRuns(runResponse.data || []);
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [session?.accessToken]);

  async function handleRefreshAll(scope: "due_sources" | "active_sources") {
    if (!session?.accessToken) return;
    setIsSubmitting(true);
    setFeedback(null);
    try {
      const response = await createProductCatalogRefreshRun(session.accessToken, {
        scope,
        connector_id: null,
        product_ids: [],
        limit: 250,
        prefer_ai: true,
      });
      setFeedback(response.message);
      await loadData();
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRefreshProduct(productId: number) {
    if (!session?.accessToken) return;
    setIsSubmitting(true);
    setFeedback(null);
    try {
      const response = await refreshProductCatalogItemNow(session.accessToken, productId, true);
      setFeedback(response.message);
      await loadData();
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCancelRun(runId: number) {
    if (!session?.accessToken) return;
    setIsSubmitting(true);
    setFeedback(null);
    try {
      const response = await cancelProductCatalogRefreshRun(session.accessToken, runId);
      setFeedback(response.message);
      await loadData();
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsSubmitting(false);
    }
  }

  const dueCount = products.filter((item) => item.health_status === "stale").length;
  const errorCount = products.filter((item) => item.health_status === "error").length;
  const healthyCount = products.filter((item) => item.health_status === "healthy").length;
  const activeRuns = runs.filter((item) => ["queued", "running"].includes(item.status)).length;

  return (
    <div className="d-grid gap-4">
      <PageHeader
        eyebrow={language === "es" ? "Actualización viva" : "Live refresh"}
        icon="pulse"
        title={language === "es" ? "Refresh automático por artículo" : "Automatic per-item refresh"}
        description={
          language === "es"
            ? "Actualiza artículos vivos desde sus URLs con IA, merge controlado e historial de corridas."
            : "Update live items from source URLs with AI, controlled merges, and run history."
        }
        actions={
          <AppToolbar compact>
            <button className="btn btn-outline-secondary" type="button" onClick={() => void loadData()} disabled={isSubmitting}>
              {language === "es" ? "Recargar" : "Reload"}
            </button>
            <button className="btn btn-outline-primary" type="button" onClick={() => void handleRefreshAll("due_sources")} disabled={isSubmitting}>
              {language === "es" ? "Actualizar vencidos" : "Refresh due"}
            </button>
            <button className="btn btn-primary" type="button" onClick={() => void handleRefreshAll("active_sources")} disabled={isSubmitting}>
              {language === "es" ? "Actualizar activos" : "Refresh active"}
            </button>
          </AppToolbar>
        }
      />
      <ProductsModuleNav />
      {feedback ? <div className="alert alert-success mb-0">{feedback}</div> : null}
      {error ? (
        <ErrorState
          title={language === "es" ? "No se pudo operar el refresh" : "Could not operate refresh"}
          detail={getApiErrorDisplayMessage(error)}
          requestId={error.payload?.request_id}
        />
      ) : null}
      {isLoading ? <LoadingBlock label={language === "es" ? "Cargando actualización viva..." : "Loading live refresh..."} /> : null}

      {!isLoading ? (
        <>
          <div className="tenant-portal-metrics">
            <MetricCard icon="pulse" label={language === "es" ? "Artículos sanos" : "Healthy items"} value={healthyCount} />
            <MetricCard icon="focus" label={language === "es" ? "Vencidos" : "Due"} value={dueCount} />
            <MetricCard icon="reports" label={language === "es" ? "Con error" : "With error"} value={errorCount} />
            <MetricCard icon="settings" label={language === "es" ? "Corridas activas" : "Active runs"} value={activeRuns} />
          </div>

          <PanelCard
            title={language === "es" ? "Cómo opera este carril" : "How this lane works"}
            subtitle={
              language === "es"
                ? "A diferencia de la ingesta inicial, aquí el sistema refresca artículos ya existentes usando sus fuentes activas."
                : "Unlike initial ingestion, this lane refreshes existing items using their active sources."
            }
          >
            <div className="text-muted small">
              {language === "es"
                ? "Usa la URL fuente, aplica extracción + IA y luego hace merge según la política de cada fuente: solo precio, merge seguro o overwrite del catálogo. Las corridas batch permiten operar por vencimiento o por alcance total."
                : "It uses the source URL, applies extraction + AI, then merges according to each source policy: price only, safe merge, or catalog overwrite. Batch runs let you operate by due status or full active scope."}
            </div>
          </PanelCard>

          <DataTableCard
            title={language === "es" ? "Artículos vivos" : "Live items"}
            subtitle={language === "es" ? "Salud del artículo y actualización manual inmediata." : "Item health and immediate manual refresh."}
            rows={products}
            columns={[
              {
                key: "name",
                header: language === "es" ? "Artículo" : "Item",
                render: (row) => (
                  <div>
                    <strong>{row.name}</strong>
                    <div className="text-muted small">{row.sku || row.product_type}</div>
                  </div>
                ),
              },
              {
                key: "health",
                header: language === "es" ? "Salud" : "Health",
                render: (row) => `${row.health_status} · ${row.active_source_count}/${row.source_count}`,
              },
              {
                key: "last",
                header: language === "es" ? "Último refresh" : "Last refresh",
                render: (row) => formatDate(row.last_refresh_at),
              },
              {
                key: "next",
                header: language === "es" ? "Próximo refresh" : "Next refresh",
                render: (row) => formatDate(row.next_refresh_at),
              },
              {
                key: "actions",
                header: language === "es" ? "Acción" : "Action",
                render: (row) => (
                  <button className="btn btn-sm btn-outline-primary" type="button" disabled={isSubmitting} onClick={() => void handleRefreshProduct(row.id)}>
                    {language === "es" ? "Actualizar ahora" : "Refresh now"}
                  </button>
                ),
              },
            ]}
          />

          <DataTableCard
            title={language === "es" ? "Corridas recientes" : "Recent runs"}
            subtitle={language === "es" ? "Progreso de campañas masivas de actualización." : "Progress of bulk refresh campaigns."}
            rows={runs}
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
                key: "summary",
                header: language === "es" ? "Resultado" : "Result",
                render: (row) => `${row.completed_count} ok / ${row.error_count} error / ${row.cancelled_count} cancel`,
              },
              {
                key: "actions",
                header: language === "es" ? "Acción" : "Action",
                render: (row) =>
                  ["queued", "running"].includes(row.status) ? (
                    <button className="btn btn-sm btn-outline-danger" type="button" disabled={isSubmitting} onClick={() => void handleCancelRun(row.id)}>
                      {language === "es" ? "Cancelar" : "Cancel"}
                    </button>
                  ) : (
                    "—"
                  ),
              },
            ]}
          />
        </>
      ) : null}
    </div>
  );
}
