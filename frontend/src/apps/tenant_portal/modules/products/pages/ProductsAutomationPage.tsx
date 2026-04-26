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
  getProductCatalogSchedulerOverview,
  runProductCatalogDueScheduler,
  type ProductCatalogRefreshRun,
  type ProductCatalogSchedulerBatchRunItem,
  type ProductCatalogSchedulerConnectorItem,
} from "../services/productsService";

function formatDate(value: string | null, language: "es" | "en") {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat(language === "es" ? "es-CL" : "en-US", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function ProductsAutomationPage() {
  const { session } = useTenantAuth();
  const { language } = useLanguage();
  const [dueConnectors, setDueConnectors] = useState<ProductCatalogSchedulerConnectorItem[]>([]);
  const [recentRuns, setRecentRuns] = useState<ProductCatalogRefreshRun[]>([]);
  const [lastBatchItems, setLastBatchItems] = useState<ProductCatalogSchedulerBatchRunItem[]>([]);
  const [error, setError] = useState<ApiError | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function loadData() {
    if (!session?.accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await getProductCatalogSchedulerOverview(session.accessToken);
      setDueConnectors(response.data || []);
      setRecentRuns(response.recent_runs || []);
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [session?.accessToken]);

  async function handleRunDueNow() {
    if (!session?.accessToken) return;
    setIsSubmitting(true);
    setFeedback(null);
    setError(null);
    try {
      const response = await runProductCatalogDueScheduler(session.accessToken);
      setLastBatchItems(response.data || []);
      setFeedback(
        `${response.message} (${response.launched}/${response.processed} ${
          language === "es" ? "corridas lanzadas" : "runs launched"
        })`,
      );
      await loadData();
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsSubmitting(false);
    }
  }

  const dueTotal = dueConnectors.length;
  const totalDueSources = dueConnectors.reduce((sum, item) => sum + (item.due_source_count || 0), 0);
  const activeRecentRuns = recentRuns.filter((item) => ["queued", "running"].includes(item.status)).length;
  const failedRecentRuns = recentRuns.filter((item) => item.error_count > 0 || item.status === "failed").length;

  return (
    <div className="d-grid gap-4">
      <PageHeader
        eyebrow={language === "es" ? "Automatización" : "Automation"}
        icon="pulse"
        title={language === "es" ? "Scheduler gobernado por tenant" : "Tenant-governed scheduler"}
        description={
          language === "es"
            ? "Opera conectores vencidos por tenant, deja historial de corridas y prepara el carril para cron/worker externo."
            : "Operate due connectors per tenant, keep run history, and prepare the lane for external cron/worker automation."
        }
        actions={
          <AppToolbar compact>
            <button className="btn btn-outline-secondary" type="button" onClick={() => void loadData()} disabled={isSubmitting}>
              {language === "es" ? "Recargar" : "Reload"}
            </button>
            <button className="btn btn-primary" type="button" onClick={() => void handleRunDueNow()} disabled={isSubmitting}>
              {language === "es" ? "Correr vencidos ahora" : "Run due now"}
            </button>
          </AppToolbar>
        }
      />
      <ProductsModuleNav />
      {feedback ? <div className="alert alert-success mb-0">{feedback}</div> : null}
      {error ? (
        <ErrorState
          title={language === "es" ? "No se pudo operar la automatización" : "Could not operate automation"}
          detail={getApiErrorDisplayMessage(error)}
          requestId={error.payload?.request_id}
        />
      ) : null}
      {isLoading ? <LoadingBlock label={language === "es" ? "Cargando automatización..." : "Loading automation..."} /> : null}

      {!isLoading ? (
        <>
          <div className="tenant-portal-metrics">
            <MetricCard icon="pulse" label={language === "es" ? "Conectores vencidos" : "Due connectors"} value={dueTotal} />
            <MetricCard icon="reports" label={language === "es" ? "Fuentes vencidas" : "Due sources"} value={totalDueSources} />
            <MetricCard icon="focus" label={language === "es" ? "Corridas activas" : "Active runs"} value={activeRecentRuns} />
            <MetricCard icon="settings" label={language === "es" ? "Corridas con error" : "Runs with error"} value={failedRecentRuns} />
          </div>

          <PanelCard
            title={language === "es" ? "Qué hace este carril" : "What this lane does"}
            subtitle={
              language === "es"
                ? "Toma conectores con scheduler vencido, lanza refresh runs por conector y deja trazabilidad visible dentro del tenant."
                : "Takes connectors with due scheduler windows, launches refresh runs per connector, and leaves visible traceability inside the tenant."
            }
          >
            <div className="text-muted small">
              {language === "es"
                ? "Sirve como gobierno operativo del módulo: primero valida conectores y políticas de retry, luego corre los conectores vencidos y finalmente deja corridas recientes visibles. El runner cross-tenant externo usa este mismo modelo."
                : "It acts as the operational governance lane of the module: it validates connectors and retry policies first, then runs due connectors and leaves recent runs visible. The external cross-tenant runner uses this same model."}
            </div>
          </PanelCard>

          <DataTableCard
            title={language === "es" ? "Conectores vencidos" : "Due connectors"}
            subtitle={language === "es" ? "Listos para lanzar refresh de sus fuentes vencidas." : "Ready to launch refresh for their due sources."}
            rows={dueConnectors}
            columns={[
              {
                key: "name",
                header: language === "es" ? "Conector" : "Connector",
                render: (row) => (
                  <div>
                    <strong>{row.name}</strong>
                    <div className="text-muted small">{row.provider_key} · {row.provider_profile}</div>
                  </div>
                ),
              },
              {
                key: "due",
                header: language === "es" ? "Fuentes vencidas" : "Due sources",
                render: (row) => row.due_source_count,
              },
              {
                key: "schedule",
                header: language === "es" ? "Frecuencia" : "Frequency",
                render: (row) => `${row.schedule_frequency} · ${row.schedule_batch_limit}`,
              },
              {
                key: "next",
                header: language === "es" ? "Próxima corrida" : "Next run",
                render: (row) => formatDate(row.next_scheduled_run_at, language),
              },
              {
                key: "last",
                header: language === "es" ? "Último estado" : "Last status",
                render: (row) => `${row.last_schedule_status} · ${row.last_schedule_summary || "—"}`,
              },
            ]}
          />

          <DataTableCard
            title={language === "es" ? "Corridas recientes del scheduler" : "Recent scheduler runs"}
            subtitle={language === "es" ? "Refresh runs disparadas desde el carril de automatización." : "Refresh runs launched from the automation lane."}
            rows={recentRuns}
            columns={[
              {
                key: "scope",
                header: language === "es" ? "Conector" : "Connector",
                render: (row) => (
                  <div>
                    <strong>{row.connector_name || row.scope_label || row.scope}</strong>
                    <div className="text-muted small">{row.status}</div>
                  </div>
                ),
              },
              {
                key: "counts",
                header: language === "es" ? "Resultado" : "Result",
                render: (row) => `${row.completed_count} ok / ${row.error_count} error / ${row.requested_count} total`,
              },
              {
                key: "finished",
                header: language === "es" ? "Fin" : "Finished",
                render: (row) => formatDate(row.finished_at || row.started_at, language),
              },
              {
                key: "error",
                header: language === "es" ? "Último error" : "Last error",
                render: (row) => row.last_error || "—",
              },
            ]}
          />

          {lastBatchItems.length > 0 ? (
            <DataTableCard
              title={language === "es" ? "Resultado del último disparo batch" : "Last batch run result"}
              subtitle={language === "es" ? "Resumen por conector del último 'Correr vencidos ahora'." : "Per-connector summary of the last 'Run due now' execution."}
              rows={lastBatchItems}
              columns={[
                {
                  key: "connector_name",
                  header: language === "es" ? "Conector" : "Connector",
                  render: (row) => row.connector_name,
                },
                {
                  key: "status",
                  header: language === "es" ? "Estado" : "Status",
                  render: (row) => row.status,
                },
                {
                  key: "counts",
                  header: language === "es" ? "Conteo" : "Counts",
                  render: (row) => `${row.completed_count} ok / ${row.error_count} error / ${row.processed_count} total`,
                },
                {
                  key: "detail",
                  header: language === "es" ? "Detalle" : "Detail",
                  render: (row) => row.detail || row.run_id || "—",
                },
              ]}
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}
