import { useEffect, useState } from "react";
import { DataTableCard } from "../../../../../components/data-display/DataTableCard";
import { ErrorState } from "../../../../../components/feedback/ErrorState";
import { LoadingBlock } from "../../../../../components/feedback/LoadingBlock";
import { PageHeader } from "../../../../../components/common/PageHeader";
import { PanelCard } from "../../../../../components/common/PanelCard";
import { AppToolbar } from "../../../../../design-system/AppLayout";
import { getApiErrorDisplayMessage } from "../../../../../services/api";
import { useLanguage } from "../../../../../store/language-context";
import { useTenantAuth } from "../../../../../store/tenant-auth-context";
import type { ApiError } from "../../../../../types";
import { ProductsModuleNav } from "../components/common/ProductsModuleNav";
import {
  createProductCatalogConnector,
  deleteProductCatalogConnector,
  getProductCatalogConnectors,
  runProductCatalogConnectorSchedule,
  syncProductCatalogConnector,
  type ProductCatalogConnector,
  type ProductCatalogConnectorWriteRequest,
  updateProductCatalogConnector,
  updateProductCatalogConnectorStatus,
} from "../services/productsService";

const CONNECTOR_PROVIDER_PRESETS: Record<
  string,
  Partial<ProductCatalogConnectorWriteRequest> & { label: string }
> = {
  generic: {
    label: "Genérico",
    connector_kind: "generic_url",
    fetch_strategy: "html_generic",
    sync_mode: "manual",
    run_ai_enrichment: false,
    supports_batch: true,
    supports_price_tracking: true,
    schedule_scope: "due_sources",
    schedule_frequency: "daily",
    schedule_batch_limit: 25,
  },
  mercadolibre: {
    label: "Mercado Libre",
    connector_kind: "vendor_site",
    fetch_strategy: "html_ai",
    sync_mode: "connector_sync",
    run_ai_enrichment: true,
    supports_batch: true,
    supports_price_tracking: true,
    schedule_scope: "due_sources",
    schedule_frequency: "daily",
    schedule_batch_limit: 25,
  },
  sodimac: {
    label: "Sodimac",
    connector_kind: "vendor_site",
    fetch_strategy: "html_vendor",
    sync_mode: "connector_sync",
    run_ai_enrichment: true,
    supports_batch: true,
    supports_price_tracking: true,
    schedule_scope: "due_sources",
    schedule_frequency: "daily",
    schedule_batch_limit: 25,
  },
  easy: {
    label: "Easy",
    connector_kind: "vendor_site",
    fetch_strategy: "html_vendor",
    sync_mode: "connector_sync",
    run_ai_enrichment: true,
    supports_batch: true,
    supports_price_tracking: true,
    schedule_scope: "due_sources",
    schedule_frequency: "daily",
    schedule_batch_limit: 25,
  },
  json_feed: {
    label: "Feed JSON",
    connector_kind: "vendor_feed",
    fetch_strategy: "json_feed",
    sync_mode: "connector_sync",
    run_ai_enrichment: false,
    supports_batch: true,
    supports_price_tracking: true,
    schedule_scope: "due_sources",
    schedule_frequency: "hourly",
    schedule_batch_limit: 50,
  },
};

function buildDefaultForm(): ProductCatalogConnectorWriteRequest {
  return {
    name: "",
    connector_kind: "generic_url",
    provider_key: "generic",
    base_url: "",
    default_currency_code: "CLP",
    supports_batch: true,
    supports_price_tracking: true,
    is_active: true,
    sync_mode: "manual",
    fetch_strategy: "html_generic",
    run_ai_enrichment: false,
    schedule_enabled: false,
    schedule_scope: "due_sources",
    schedule_frequency: "daily",
    schedule_batch_limit: 25,
    config_notes: "",
  };
}

function formatDateTime(value: string | null, language: "es" | "en") {
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

export function ProductsConnectorsPage() {
  const { session } = useTenantAuth();
  const { language } = useLanguage();
  const [rows, setRows] = useState<ProductCatalogConnector[]>([]);
  const [form, setForm] = useState<ProductCatalogConnectorWriteRequest>(buildDefaultForm());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function loadData() {
    if (!session?.accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await getProductCatalogConnectors(session.accessToken);
      setRows(response.data);
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [session?.accessToken]);

  function startNew() {
    setEditingId(null);
    setForm(buildDefaultForm());
  }

  function startEdit(item: ProductCatalogConnector) {
    setEditingId(item.id);
    setForm({
      name: item.name,
      connector_kind: item.connector_kind,
      provider_key: item.provider_key,
      base_url: item.base_url || "",
      default_currency_code: item.default_currency_code,
      supports_batch: item.supports_batch,
      supports_price_tracking: item.supports_price_tracking,
      is_active: item.is_active,
      sync_mode: item.sync_mode,
      fetch_strategy: item.fetch_strategy,
      run_ai_enrichment: item.run_ai_enrichment,
      schedule_enabled: item.schedule_enabled,
      schedule_scope: item.schedule_scope,
      schedule_frequency: item.schedule_frequency,
      schedule_batch_limit: item.schedule_batch_limit,
      config_notes: item.config_notes || "",
    });
  }

  function applyProviderPreset(providerKey: string) {
    const preset = CONNECTOR_PROVIDER_PRESETS[providerKey] || CONNECTOR_PROVIDER_PRESETS.generic;
    setForm((current) => ({
      ...current,
      provider_key: providerKey,
      connector_kind: preset.connector_kind || current.connector_kind,
      fetch_strategy: preset.fetch_strategy || current.fetch_strategy,
      sync_mode: preset.sync_mode || current.sync_mode,
      run_ai_enrichment: preset.run_ai_enrichment ?? current.run_ai_enrichment,
      supports_batch: preset.supports_batch ?? current.supports_batch,
      supports_price_tracking: preset.supports_price_tracking ?? current.supports_price_tracking,
      schedule_scope: preset.schedule_scope || current.schedule_scope,
      schedule_frequency: preset.schedule_frequency || current.schedule_frequency,
      schedule_batch_limit: preset.schedule_batch_limit || current.schedule_batch_limit,
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.accessToken) return;
    setIsSubmitting(true);
    setError(null);
    setFeedback(null);
    try {
      const payload: ProductCatalogConnectorWriteRequest = {
        ...form,
        base_url: form.base_url || null,
        config_notes: form.config_notes || null,
      };
      const response = editingId
        ? await updateProductCatalogConnector(session.accessToken, editingId, payload)
        : await createProductCatalogConnector(session.accessToken, payload);
      setFeedback(response.message);
      startNew();
      await loadData();
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleToggle(item: ProductCatalogConnector) {
    if (!session?.accessToken) return;
    try {
      const response = await updateProductCatalogConnectorStatus(session.accessToken, item.id, !item.is_active);
      setFeedback(response.message);
      await loadData();
    } catch (rawError) {
      setError(rawError as ApiError);
    }
  }

  async function handleDelete(item: ProductCatalogConnector) {
    if (!session?.accessToken) return;
    try {
      const response = await deleteProductCatalogConnector(session.accessToken, item.id);
      setFeedback(response.message);
      await loadData();
    } catch (rawError) {
      setError(rawError as ApiError);
    }
  }

  async function handleSync(item: ProductCatalogConnector) {
    if (!session?.accessToken) return;
    try {
      const response = await syncProductCatalogConnector(session.accessToken, item.id, { limit: 25 });
      setFeedback(
        `${response.message} (${response.connector_name}: ${response.synced}/${response.processed} ${
          language === "es" ? "sincronizadas" : "synced"
        }, ${response.price_updates} ${language === "es" ? "precios actualizados" : "price updates"})`,
      );
      await loadData();
    } catch (rawError) {
      setError(rawError as ApiError);
    }
  }

  async function handleScheduleRun(item: ProductCatalogConnector) {
    if (!session?.accessToken) return;
    try {
      const response = await runProductCatalogConnectorSchedule(session.accessToken, item.id);
      setFeedback(
        `${response.message} (${item.name}: ${response.data.completed_count}/${response.data.requested_count} ${
          language === "es" ? "completadas" : "completed"
        })`,
      );
      await loadData();
    } catch (rawError) {
      setError(rawError as ApiError);
    }
  }

  return (
    <div className="d-grid gap-4">
      <PageHeader
        eyebrow={language === "es" ? "Catálogo de productos" : "Product catalog"}
        icon="settings"
        title={language === "es" ? "Conectores multi-fuente" : "Multi-source connectors"}
        description={
          language === "es"
            ? "Define las fuentes que alimentan scraping, historia de precios y futuras sincronizaciones."
            : "Define the sources that feed scraping, price history, and future synchronizations."
        }
        actions={
          <AppToolbar compact>
            <button className="btn btn-outline-secondary" type="button" onClick={() => void loadData()}>
              {language === "es" ? "Recargar" : "Reload"}
            </button>
            <button className="btn btn-primary" type="button" onClick={startNew}>
              {language === "es" ? "Nuevo conector" : "New connector"}
            </button>
          </AppToolbar>
        }
      />
      <ProductsModuleNav />

      {feedback ? <div className="alert alert-success mb-0">{feedback}</div> : null}
      {error ? (
        <ErrorState
          title={language === "es" ? "No se pudo cargar conectores" : "Could not load connectors"}
          detail={getApiErrorDisplayMessage(error)}
          requestId={error.payload?.request_id}
        />
      ) : null}
      {isLoading ? <LoadingBlock label={language === "es" ? "Cargando conectores..." : "Loading connectors..."} /> : null}

      <PanelCard
        title={editingId ? (language === "es" ? "Editar conector" : "Edit connector") : (language === "es" ? "Nuevo conector" : "New connector")}
        subtitle={
          language === "es"
            ? "Un conector agrupa origen, reglas mínimas y capacidad batch para una familia de fuentes."
            : "A connector groups origin, minimum rules, and batch capability for a source family."
        }
      >
        <form className="crm-form-grid" onSubmit={(event) => void handleSubmit(event)}>
          <label>
            <span>{language === "es" ? "Nombre" : "Name"}</span>
            <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
          </label>
          <label>
            <span>{language === "es" ? "Proveedor" : "Provider"}</span>
            <select
              value={form.provider_key}
              onChange={(event) => applyProviderPreset(event.target.value)}
            >
              {Object.entries(CONNECTOR_PROVIDER_PRESETS).map(([key, preset]) => (
                <option key={key} value={key}>
                  {preset.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>{language === "es" ? "Tipo" : "Kind"}</span>
            <select value={form.connector_kind} onChange={(event) => setForm((current) => ({ ...current, connector_kind: event.target.value }))}>
              <option value="generic_url">{language === "es" ? "URL genérica" : "Generic URL"}</option>
              <option value="vendor_site">{language === "es" ? "Sitio proveedor" : "Vendor site"}</option>
              <option value="vendor_feed">{language === "es" ? "Feed proveedor" : "Vendor feed"}</option>
              <option value="ai_scrape">{language === "es" ? "IA + scraping" : "AI + scraping"}</option>
            </select>
          </label>
          <label className="crm-form-grid__full">
            <span>Base URL</span>
            <input value={form.base_url || ""} onChange={(event) => setForm((current) => ({ ...current, base_url: event.target.value }))} />
          </label>
          <label>
            <span>{language === "es" ? "Moneda por defecto" : "Default currency"}</span>
            <input value={form.default_currency_code} onChange={(event) => setForm((current) => ({ ...current, default_currency_code: event.target.value }))} />
          </label>
          <label>
            <span>{language === "es" ? "Modo sync" : "Sync mode"}</span>
            <select value={form.sync_mode} onChange={(event) => setForm((current) => ({ ...current, sync_mode: event.target.value }))}>
              <option value="manual">{language === "es" ? "Manual" : "Manual"}</option>
              <option value="connector_sync">{language === "es" ? "Sync automático" : "Automatic sync"}</option>
            </select>
          </label>
          <label>
            <span>{language === "es" ? "Estrategia fetch" : "Fetch strategy"}</span>
            <select value={form.fetch_strategy} onChange={(event) => setForm((current) => ({ ...current, fetch_strategy: event.target.value }))}>
              <option value="html_generic">{language === "es" ? "HTML genérico" : "Generic HTML"}</option>
              <option value="html_vendor">{language === "es" ? "HTML proveedor" : "Vendor HTML"}</option>
              <option value="json_feed">{language === "es" ? "Feed JSON" : "JSON feed"}</option>
              <option value="html_ai">{language === "es" ? "HTML + IA" : "HTML + AI"}</option>
            </select>
          </label>
          <label>
            <span>{language === "es" ? "Frecuencia scheduler" : "Scheduler frequency"}</span>
            <select
              value={form.schedule_frequency}
              onChange={(event) => setForm((current) => ({ ...current, schedule_frequency: event.target.value }))}
            >
              <option value="hourly">{language === "es" ? "Cada hora" : "Hourly"}</option>
              <option value="daily">{language === "es" ? "Diaria" : "Daily"}</option>
              <option value="weekly">{language === "es" ? "Semanal" : "Weekly"}</option>
            </select>
          </label>
          <label>
            <span>{language === "es" ? "Límite scheduler" : "Scheduler batch limit"}</span>
            <input
              type="number"
              min={1}
              max={250}
              value={form.schedule_batch_limit}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  schedule_batch_limit: Number.parseInt(event.target.value || "25", 10),
                }))
              }
            />
          </label>
          <label className="crm-form-grid__full">
            <span>{language === "es" ? "Notas de configuración" : "Configuration notes"}</span>
            <textarea rows={4} value={form.config_notes || ""} onChange={(event) => setForm((current) => ({ ...current, config_notes: event.target.value }))} />
          </label>
          <label className="crm-form-grid__full d-flex gap-3 align-items-center">
            <span>{language === "es" ? "Capacidades" : "Capabilities"}</span>
            <span className="d-inline-flex gap-2 align-items-center">
              <input type="checkbox" checked={form.supports_batch} onChange={(event) => setForm((current) => ({ ...current, supports_batch: event.target.checked }))} />
              {language === "es" ? "Batch" : "Batch"}
            </span>
            <span className="d-inline-flex gap-2 align-items-center">
              <input type="checkbox" checked={form.supports_price_tracking} onChange={(event) => setForm((current) => ({ ...current, supports_price_tracking: event.target.checked }))} />
              {language === "es" ? "Seguimiento de precios" : "Price tracking"}
            </span>
            <span className="d-inline-flex gap-2 align-items-center">
              <input type="checkbox" checked={form.is_active} onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.checked }))} />
              {language === "es" ? "Activo" : "Active"}
            </span>
            <span className="d-inline-flex gap-2 align-items-center">
              <input type="checkbox" checked={form.run_ai_enrichment} onChange={(event) => setForm((current) => ({ ...current, run_ai_enrichment: event.target.checked }))} />
              {language === "es" ? "Enriquecimiento IA" : "AI enrichment"}
            </span>
            <span className="d-inline-flex gap-2 align-items-center">
              <input
                type="checkbox"
                checked={form.schedule_enabled}
                onChange={(event) => setForm((current) => ({ ...current, schedule_enabled: event.target.checked }))}
              />
              {language === "es" ? "Scheduler tenant" : "Tenant scheduler"}
            </span>
          </label>
          <div className="crm-form-actions crm-form-grid__full">
            <button className="btn btn-primary" type="submit" disabled={isSubmitting || !form.name.trim()}>
              {editingId ? (language === "es" ? "Actualizar" : "Update") : (language === "es" ? "Crear conector" : "Create connector")}
            </button>
          </div>
        </form>
      </PanelCard>

      <DataTableCard
        title={language === "es" ? "Conectores registrados" : "Registered connectors"}
        subtitle={
          language === "es"
            ? "Desde aquí se ve la cobertura del scraping y del historial de precios."
            : "From here you can see scraping and price-history coverage."
        }
        rows={rows}
        columns={[
          {
            key: "connector",
            header: language === "es" ? "Conector" : "Connector",
            render: (row) => (
              <div>
                <strong>{row.name}</strong>
                <div className="text-muted small">{row.provider_key} · {row.connector_kind}</div>
              </div>
            ),
          },
          {
            key: "coverage",
            header: language === "es" ? "Cobertura" : "Coverage",
            render: (row) => (
              <div className="small">
                <div>{language === "es" ? "Fuentes" : "Sources"}: {row.source_total}</div>
                <div>{language === "es" ? "Precios" : "Prices"}: {row.price_event_total}</div>
              </div>
            ),
          },
          {
            key: "status",
            header: language === "es" ? "Estado" : "Status",
            render: (row) => (
              <div>
                <strong>{row.is_active ? (language === "es" ? "Activo" : "Active") : (language === "es" ? "Inactivo" : "Inactive")}</strong>
                <div className="text-muted small">
                  {row.sync_mode} · {row.fetch_strategy} · {row.last_sync_status}
                </div>
                <div className="text-muted small">{row.last_sync_summary || "—"}</div>
                <div className="text-muted small">
                  {row.schedule_enabled
                    ? `${language === "es" ? "Scheduler" : "Scheduler"}: ${row.schedule_frequency} · ${row.last_schedule_status}`
                    : language === "es"
                      ? "Scheduler desactivado"
                      : "Scheduler disabled"}
                </div>
                <div className="text-muted small">
                  {language === "es" ? "Próxima corrida" : "Next run"}: {formatDateTime(row.next_scheduled_run_at, language)}
                </div>
              </div>
            ),
          },
          {
            key: "actions",
            header: language === "es" ? "Acciones" : "Actions",
            render: (row) => (
              <div className="d-flex flex-wrap gap-2">
                <button className="btn btn-outline-secondary btn-sm" type="button" onClick={() => startEdit(row)}>
                  {language === "es" ? "Editar" : "Edit"}
                </button>
                <button className="btn btn-outline-primary btn-sm" type="button" onClick={() => void handleToggle(row)}>
                  {row.is_active ? (language === "es" ? "Desactivar" : "Disable") : (language === "es" ? "Activar" : "Enable")}
                </button>
                <button
                  className="btn btn-outline-success btn-sm"
                  type="button"
                  onClick={() => void handleSync(row)}
                  disabled={!row.is_active || row.sync_mode !== "connector_sync"}
                >
                  {language === "es" ? "Sincronizar" : "Sync"}
                </button>
                <button
                  className="btn btn-outline-info btn-sm"
                  type="button"
                  onClick={() => void handleScheduleRun(row)}
                  disabled={!row.is_active || !row.schedule_enabled}
                >
                  {language === "es" ? "Correr scheduler" : "Run scheduler"}
                </button>
                <button className="btn btn-outline-danger btn-sm" type="button" onClick={() => void handleDelete(row)}>
                  {language === "es" ? "Eliminar" : "Delete"}
                </button>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
