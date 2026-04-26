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
import {
  approveProductCatalogIngestionDraft,
  cancelProductCatalogIngestionRun,
  createProductCatalogIngestionDraft,
  createProductCatalogIngestionRun,
  enrichProductCatalogIngestionDraft,
  extractProductCatalogUrl,
  getProductCatalogConnectors,
  getProductCatalogIngestionDrafts,
  getProductCatalogIngestionOverview,
  getProductCatalogIngestionRuns,
  resolveProductCatalogDuplicate,
  type ProductCatalogConnector,
  type ProductCatalogIngestionCharacteristic,
  type ProductCatalogDuplicateCandidate,
  type ProductCatalogIngestionDraft,
  type ProductCatalogIngestionDraftWriteRequest,
  type ProductCatalogIngestionRun,
  updateProductCatalogIngestionDraft,
  updateProductCatalogIngestionDraftStatus,
} from "../../products/services/productsService";
import { ProductsModuleNav } from "../../products/components/common/ProductsModuleNav";

function buildCharacteristic(index: number): ProductCatalogIngestionCharacteristic {
  return {
    id: null,
    label: "",
    value: "",
    sort_order: (index + 1) * 10,
  };
}

function buildDefaultForm(): ProductCatalogIngestionDraftWriteRequest {
  return {
    source_kind: "url_reference",
    source_label: null,
    source_url: null,
    connector_id: null,
    external_reference: null,
    sku: null,
    name: null,
    brand: null,
    category_label: null,
    product_type: "product",
    unit_label: null,
    unit_price: 0,
    currency_code: "CLP",
    description: null,
    source_excerpt: null,
    extraction_notes: null,
    characteristics: [buildCharacteristic(0)],
  };
}

function buildBatchText(entries: ProductCatalogIngestionRun[]): string {
  return entries
    .flatMap((run) => run.items)
    .map((item) => item.source_url)
    .filter(Boolean)
    .join("\n");
}

function getPreferredCatalogCandidate(row: ProductCatalogIngestionDraft): ProductCatalogDuplicateCandidate | null {
  return row.duplicate_candidates.find((candidate) => candidate.candidate_kind === "catalog_product") || null;
}

export function CRMProductIngestionPage() {
  const { session } = useTenantAuth();
  const { language } = useLanguage();
  const [overview, setOverview] = useState<Awaited<ReturnType<typeof getProductCatalogIngestionOverview>> | null>(null);
  const [rows, setRows] = useState<ProductCatalogIngestionDraft[]>([]);
  const [runs, setRuns] = useState<ProductCatalogIngestionRun[]>([]);
  const [connectors, setConnectors] = useState<ProductCatalogConnector[]>([]);
  const [form, setForm] = useState<ProductCatalogIngestionDraftWriteRequest>(buildDefaultForm());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [reviewNotes, setReviewNotes] = useState("");
  const [extractUrl, setExtractUrl] = useState("");
  const [extractSourceLabel, setExtractSourceLabel] = useState("");
  const [extractConnectorId, setExtractConnectorId] = useState("");
  const [extractReference, setExtractReference] = useState("");
  const [batchLabel, setBatchLabel] = useState("");
  const [batchConnectorId, setBatchConnectorId] = useState("");
  const [batchUrls, setBatchUrls] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function loadData(options?: { silent?: boolean }) {
    if (!session?.accessToken) return;
    if (!options?.silent) {
      setIsLoading(true);
    }
    setError(null);
    try {
      const [overviewResponse, draftsResponse, runsResponse, connectorsResponse] = await Promise.all([
        getProductCatalogIngestionOverview(session.accessToken),
        getProductCatalogIngestionDrafts(session.accessToken, {
          capture_status: statusFilter === "all" ? null : statusFilter,
          q: query || null,
        }),
        getProductCatalogIngestionRuns(session.accessToken),
        getProductCatalogConnectors(session.accessToken),
      ]);
      setOverview(overviewResponse);
      setRows(draftsResponse.data);
      setRuns(runsResponse.data);
      setConnectors(connectorsResponse.data.filter((item) => item.is_active));
      if (!batchUrls.trim() && runsResponse.data.length > 0) {
        setBatchUrls(buildBatchText(runsResponse.data));
      }
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      if (!options?.silent) {
        setIsLoading(false);
      }
    }
  }

  useEffect(() => {
    void loadData();
  }, [session?.accessToken, statusFilter, query]);

  useEffect(() => {
    if (!session?.accessToken) return undefined;
    const hasActiveRuns = runs.some((item) => item.status === "queued" || item.status === "running");
    if (!hasActiveRuns) return undefined;
    const timer = window.setInterval(() => {
      void loadData({ silent: true });
    }, 5000);
    return () => window.clearInterval(timer);
  }, [runs, session?.accessToken, statusFilter, query]);

  function startNew() {
    setEditingId(null);
    setForm(buildDefaultForm());
    setReviewNotes("");
  }

  function startEdit(item: ProductCatalogIngestionDraft) {
    setEditingId(item.id);
    setForm({
      source_kind: item.source_kind,
      source_label: item.source_label,
      source_url: item.source_url,
      connector_id: item.connector_id,
      external_reference: item.external_reference,
      sku: item.sku,
      name: item.name,
      brand: item.brand,
      category_label: item.category_label,
      product_type: item.product_type,
      unit_label: item.unit_label,
      unit_price: item.unit_price,
      currency_code: item.currency_code,
      description: item.description,
      source_excerpt: item.source_excerpt,
      extraction_notes: item.extraction_notes,
      characteristics:
        item.characteristics.length > 0
          ? item.characteristics.map((characteristic) => ({
              id: characteristic.id,
              label: characteristic.label,
              value: characteristic.value,
              sort_order: characteristic.sort_order,
            }))
          : [buildCharacteristic(0)],
    });
    setReviewNotes(item.review_notes || "");
  }

  function updateCharacteristic(index: number, next: Partial<ProductCatalogIngestionCharacteristic>) {
    setForm((current) => ({
      ...current,
      characteristics: current.characteristics.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...next } : item,
      ),
    }));
  }

  function addCharacteristic() {
    setForm((current) => ({
      ...current,
      characteristics: [...current.characteristics, buildCharacteristic(current.characteristics.length)],
    }));
  }

  function removeCharacteristic(index: number) {
    setForm((current) => ({
      ...current,
      characteristics:
        current.characteristics.length === 1
          ? [buildCharacteristic(0)]
          : current.characteristics.filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.accessToken) return;
    setIsSubmitting(true);
    setError(null);
    setFeedback(null);
    try {
      const payload = {
        ...form,
        characteristics: form.characteristics.filter((item) => item.label.trim() && item.value.trim()),
      };
      const response = editingId
        ? await updateProductCatalogIngestionDraft(session.accessToken, editingId, payload)
        : await createProductCatalogIngestionDraft(session.accessToken, payload);
      setFeedback(response.message);
      startNew();
      await loadData();
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleExtractUrl() {
    if (!session?.accessToken || !extractUrl.trim()) return;
    setIsSubmitting(true);
    setError(null);
    setFeedback(null);
    try {
      const response = await extractProductCatalogUrl(session.accessToken, {
        source_url: extractUrl.trim(),
        source_label: extractSourceLabel.trim() || null,
        connector_id: extractConnectorId ? Number(extractConnectorId) : null,
        external_reference: extractReference.trim() || null,
      });
      setFeedback(response.message);
      setExtractUrl("");
      setExtractSourceLabel("");
      setExtractConnectorId("");
      setExtractReference("");
      await loadData();
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCreateBatchRun() {
    if (!session?.accessToken) return;
    const entries = batchUrls
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((source_url) => ({
        source_url,
        source_label: batchLabel.trim() || null,
        connector_id: batchConnectorId ? Number(batchConnectorId) : null,
        external_reference: null,
      }));
    if (entries.length === 0) return;
    setIsSubmitting(true);
    setError(null);
    setFeedback(null);
    try {
      const response = await createProductCatalogIngestionRun(session.accessToken, {
        source_label: batchLabel.trim() || null,
        connector_id: batchConnectorId ? Number(batchConnectorId) : null,
        entries,
      });
      setFeedback(response.message);
      setBatchUrls("");
      setBatchConnectorId("");
      await loadData();
      setRuns((current) => [response.data, ...current.filter((item) => item.id !== response.data.id)]);
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleApprove(item: ProductCatalogIngestionDraft) {
    if (!session?.accessToken) return;
    try {
      const response = await approveProductCatalogIngestionDraft(session.accessToken, item.id, reviewNotes || null);
      setFeedback(response.message);
      await loadData();
    } catch (rawError) {
      setError(rawError as ApiError);
    }
  }

  async function handleEnrich(item: ProductCatalogIngestionDraft) {
    if (!session?.accessToken) return;
    setIsSubmitting(true);
    setError(null);
    setFeedback(null);
    try {
      const response = await enrichProductCatalogIngestionDraft(
        session.accessToken,
        item.id,
        item.enrichment_state?.ai_available ?? true,
      );
      setFeedback(response.message);
      await loadData();
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResolveDuplicate(
    item: ProductCatalogIngestionDraft,
    resolutionMode: "update_existing" | "link_existing",
  ) {
    if (!session?.accessToken) return;
    const candidate = getPreferredCatalogCandidate(item);
    if (!candidate) return;
    setIsSubmitting(true);
    setError(null);
    setFeedback(null);
    try {
      const response = await resolveProductCatalogDuplicate(
        session.accessToken,
        item.id,
        candidate.candidate_id,
        resolutionMode,
        reviewNotes || null,
      );
      setFeedback(response.message);
      await loadData();
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleStatus(item: ProductCatalogIngestionDraft, nextStatus: "draft" | "discarded") {
    if (!session?.accessToken) return;
    try {
      const response = await updateProductCatalogIngestionDraftStatus(
        session.accessToken,
        item.id,
        nextStatus,
        reviewNotes || null,
      );
      setFeedback(response.message);
      await loadData();
    } catch (rawError) {
      setError(rawError as ApiError);
    }
  }

  async function handleCancelRun(item: ProductCatalogIngestionRun) {
    if (!session?.accessToken) return;
    try {
      const response = await cancelProductCatalogIngestionRun(session.accessToken, item.id);
      setFeedback(response.message);
      await loadData();
      setRuns((current) => current.map((run) => (run.id === response.data.id ? response.data : run)));
    } catch (rawError) {
      setError(rawError as ApiError);
    }
  }

  const metrics = overview?.metrics;
  const statusLabelMap = useMemo(
    () => ({
      draft: language === "es" ? "borrador" : "draft",
      approved: language === "es" ? "aprobado" : "approved",
      discarded: language === "es" ? "descartado" : "discarded",
      queued: language === "es" ? "en cola" : "queued",
      running: language === "es" ? "ejecutando" : "running",
      completed: language === "es" ? "completada" : "completed",
      cancelled: language === "es" ? "cancelada" : "cancelled",
      failed: language === "es" ? "fallida" : "failed",
      error: language === "es" ? "error" : "error",
      processing: language === "es" ? "procesando" : "processing",
    }),
    [language],
  );

  return (
    <div className="d-grid gap-4">
      <PageHeader
        eyebrow={language === "es" ? "Catálogo de productos" : "Product catalog"}
        icon="products"
        title={language === "es" ? "Ingesta de productos" : "Product ingestion"}
        description={
          language === "es"
            ? "Captura, extracción IA por URL y corridas batch antes de publicar productos al catálogo central."
            : "Capture, AI URL extraction, and batch runs before publishing products into the central catalog."
        }
        actions={
          <AppToolbar compact>
            <button className="btn btn-outline-secondary" type="button" onClick={() => void loadData()}>
              {language === "es" ? "Recargar" : "Reload"}
            </button>
            <button className="btn btn-primary" type="button" onClick={startNew}>
              {language === "es" ? "Nuevo borrador" : "New draft"}
            </button>
          </AppToolbar>
        }
      />
      <ProductsModuleNav />

      {feedback ? <div className="alert alert-success mb-0">{feedback}</div> : null}
      {error ? (
        <ErrorState
          title={language === "es" ? "No se pudo operar ingesta" : "Could not operate ingestion"}
          detail={getApiErrorDisplayMessage(error)}
          requestId={error.payload?.request_id}
        />
      ) : null}
      {isLoading ? <LoadingBlock label={language === "es" ? "Cargando ingesta..." : "Loading ingestion..."} /> : null}

      {!isLoading && metrics ? (
        <div className="tenant-portal-metrics">
          <MetricCard
            icon="products"
            label={language === "es" ? "Borradores" : "Drafts"}
            value={metrics.draft}
            hint={language === "es" ? "Pendientes de revisar" : "Pending review"}
          />
          <MetricCard
            icon="catalogs"
            label={language === "es" ? "Aprobados" : "Approved"}
            value={metrics.approved}
            hint={language === "es" ? "Ya publicados al catálogo" : "Already published to catalog"}
          />
          <MetricCard
            icon="focus"
            label={language === "es" ? "Descartados" : "Discarded"}
            value={metrics.discarded}
            hint={language === "es" ? "Capturas no publicadas" : "Captures not published"}
          />
          <MetricCard
            icon="reports"
            label={language === "es" ? "Con URL" : "With URL"}
            value={metrics.with_url}
            hint={language === "es" ? "Referencias externas declaradas" : "Declared external references"}
          />
        </div>
      ) : null}

      <PanelCard
        title={language === "es" ? "Extracción rápida por URL" : "Quick extraction by URL"}
        subtitle={
          language === "es"
            ? "Usa scraping genérico + IA para convertir cualquier URL en borrador revisable. Puede tardar varios minutos."
            : "Uses generic scraping + AI to convert any URL into a reviewable draft. It can take several minutes."
        }
      >
        <div className="crm-form-grid">
          <label className="crm-form-grid__full">
            <span>URL</span>
            <input value={extractUrl} onChange={(event) => setExtractUrl(event.target.value)} />
          </label>
          <label>
            <span>{language === "es" ? "Etiqueta fuente" : "Source label"}</span>
            <input value={extractSourceLabel} onChange={(event) => setExtractSourceLabel(event.target.value)} />
          </label>
          <label>
            <span>{language === "es" ? "Conector" : "Connector"}</span>
            <select value={extractConnectorId} onChange={(event) => setExtractConnectorId(event.target.value)}>
              <option value="">{language === "es" ? "Sin conector" : "No connector"}</option>
              {connectors.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>{language === "es" ? "Referencia externa" : "External reference"}</span>
            <input value={extractReference} onChange={(event) => setExtractReference(event.target.value)} />
          </label>
          <div className="crm-form-actions crm-form-grid__full">
            <button className="btn btn-primary" type="button" disabled={isSubmitting || !extractUrl.trim()} onClick={() => void handleExtractUrl()}>
              {language === "es" ? "Extraer y crear borrador" : "Extract and create draft"}
            </button>
          </div>
        </div>
      </PanelCard>

      <PanelCard
        title={language === "es" ? "Corrida batch por URLs" : "Batch run by URLs"}
        subtitle={
          language === "es"
            ? "Lanza una corrida asíncrona, deja trazabilidad por URL y permite cancelar sin borrar lo ya capturado."
            : "Launches an async run, keeps per-URL traceability, and allows cancellation without deleting what was already captured."
        }
      >
        <div className="crm-form-grid">
          <label>
            <span>{language === "es" ? "Etiqueta fuente común" : "Shared source label"}</span>
            <input value={batchLabel} onChange={(event) => setBatchLabel(event.target.value)} />
          </label>
          <label>
            <span>{language === "es" ? "Conector común" : "Shared connector"}</span>
            <select value={batchConnectorId} onChange={(event) => setBatchConnectorId(event.target.value)}>
              <option value="">{language === "es" ? "Sin conector" : "No connector"}</option>
              {connectors.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label className="crm-form-grid__full">
            <span>{language === "es" ? "URLs (una por línea)" : "URLs (one per line)"}</span>
            <textarea rows={6} value={batchUrls} onChange={(event) => setBatchUrls(event.target.value)} />
          </label>
          <div className="crm-form-actions crm-form-grid__full">
            <button className="btn btn-primary" type="button" disabled={isSubmitting || !batchUrls.trim()} onClick={() => void handleCreateBatchRun()}>
              {language === "es" ? "Iniciar corrida" : "Start run"}
            </button>
          </div>
        </div>
      </PanelCard>

      <DataTableCard
        title={language === "es" ? "Corridas de ingesta" : "Ingestion runs"}
        subtitle={
          language === "es"
            ? "Seguimiento de ejecuciones automáticas por lote."
            : "Tracking of automatic batch executions."
        }
        rows={runs}
        columns={[
          {
            key: "run",
            header: language === "es" ? "Corrida" : "Run",
            render: (row) => (
              <div>
                <strong>{row.source_label || `run-${row.id}`}</strong>
                <div className="text-muted small">{row.connector_name || row.source_mode}</div>
              </div>
            ),
          },
          {
            key: "status",
            header: language === "es" ? "Estado" : "Status",
            render: (row) => statusLabelMap[row.status as keyof typeof statusLabelMap] || row.status,
          },
          {
            key: "progress",
            header: language === "es" ? "Progreso" : "Progress",
            render: (row) => `${row.processed_count}/${row.requested_count}`,
          },
          {
            key: "result",
            header: language === "es" ? "Resultado" : "Outcome",
            render: (row) => (
              <div className="small">
                <div>{language === "es" ? "OK" : "OK"}: {row.completed_count}</div>
                <div>{language === "es" ? "Error" : "Error"}: {row.error_count}</div>
                <div>{language === "es" ? "Canceladas" : "Cancelled"}: {row.cancelled_count}</div>
              </div>
            ),
          },
          {
            key: "actions",
            header: language === "es" ? "Acciones" : "Actions",
            render: (row) => (
              <div className="d-flex flex-wrap gap-2">
                {(row.status === "queued" || row.status === "running") ? (
                  <button className="btn btn-outline-danger btn-sm" type="button" onClick={() => void handleCancelRun(row)}>
                    {language === "es" ? "Cancelar" : "Cancel"}
                  </button>
                ) : null}
              </div>
            ),
          },
        ]}
      />

      <PanelCard
        title={editingId ? (language === "es" ? "Editar borrador" : "Edit draft") : (language === "es" ? "Nuevo borrador manual" : "New manual draft")}
        subtitle={
          language === "es"
            ? "Si necesitas corregir o capturar manualmente, aquí mantienes el carril revisable antes de publicar."
            : "If you need to correct or capture manually, this keeps the reviewable path before publishing."
        }
      >
        <form className="crm-form-grid" onSubmit={(event) => void handleSubmit(event)}>
          <label>
            <span>{language === "es" ? "Origen" : "Source kind"}</span>
            <select value={form.source_kind} onChange={(event) => setForm((current) => ({ ...current, source_kind: event.target.value }))}>
              <option value="url_reference">{language === "es" ? "Referencia URL" : "URL reference"}</option>
              <option value="manual_capture">{language === "es" ? "Captura manual" : "Manual capture"}</option>
            </select>
          </label>
          <label>
            <span>{language === "es" ? "Etiqueta fuente" : "Source label"}</span>
            <input value={form.source_label || ""} onChange={(event) => setForm((current) => ({ ...current, source_label: event.target.value || null }))} />
          </label>
          <label>
            <span>{language === "es" ? "Conector" : "Connector"}</span>
            <select
              value={form.connector_id || ""}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  connector_id: event.target.value ? Number(event.target.value) : null,
                }))
              }
            >
              <option value="">{language === "es" ? "Sin conector" : "No connector"}</option>
              {connectors.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label className="crm-form-grid__full">
            <span>URL</span>
            <input value={form.source_url || ""} onChange={(event) => setForm((current) => ({ ...current, source_url: event.target.value || null }))} />
          </label>
          <label>
            <span>{language === "es" ? "Referencia externa" : "External reference"}</span>
            <input value={form.external_reference || ""} onChange={(event) => setForm((current) => ({ ...current, external_reference: event.target.value || null }))} />
          </label>
          <label>
            <span>{language === "es" ? "Nombre normalizado" : "Normalized name"}</span>
            <input value={form.name || ""} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value || null }))} />
          </label>
          <label>
            <span>SKU</span>
            <input value={form.sku || ""} onChange={(event) => setForm((current) => ({ ...current, sku: event.target.value || null }))} />
          </label>
          <label>
            <span>{language === "es" ? "Marca" : "Brand"}</span>
            <input value={form.brand || ""} onChange={(event) => setForm((current) => ({ ...current, brand: event.target.value || null }))} />
          </label>
          <label>
            <span>{language === "es" ? "Categoría" : "Category"}</span>
            <input value={form.category_label || ""} onChange={(event) => setForm((current) => ({ ...current, category_label: event.target.value || null }))} />
          </label>
          <label>
            <span>{language === "es" ? "Tipo" : "Type"}</span>
            <select value={form.product_type} onChange={(event) => setForm((current) => ({ ...current, product_type: event.target.value }))}>
              <option value="product">{language === "es" ? "Producto" : "Product"}</option>
              <option value="service">{language === "es" ? "Servicio" : "Service"}</option>
            </select>
          </label>
          <label>
            <span>{language === "es" ? "Unidad" : "Unit"}</span>
            <input value={form.unit_label || ""} onChange={(event) => setForm((current) => ({ ...current, unit_label: event.target.value || null }))} />
          </label>
          <label>
            <span>{language === "es" ? "Precio referencial" : "Reference price"}</span>
            <input type="number" min="0" step="0.01" value={form.unit_price} onChange={(event) => setForm((current) => ({ ...current, unit_price: Number(event.target.value) || 0 }))} />
          </label>
          <label>
            <span>{language === "es" ? "Moneda" : "Currency"}</span>
            <input value={form.currency_code} onChange={(event) => setForm((current) => ({ ...current, currency_code: event.target.value || "CLP" }))} />
          </label>
          <label className="crm-form-grid__full">
            <span>{language === "es" ? "Descripción" : "Description"}</span>
            <textarea rows={3} value={form.description || ""} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value || null }))} />
          </label>
          <label className="crm-form-grid__full">
            <span>{language === "es" ? "Extracto fuente" : "Source excerpt"}</span>
            <textarea rows={4} value={form.source_excerpt || ""} onChange={(event) => setForm((current) => ({ ...current, source_excerpt: event.target.value || null }))} />
          </label>
          <label className="crm-form-grid__full">
            <span>{language === "es" ? "Notas de extracción" : "Extraction notes"}</span>
            <textarea rows={3} value={form.extraction_notes || ""} onChange={(event) => setForm((current) => ({ ...current, extraction_notes: event.target.value || null }))} />
          </label>

          <div className="crm-form-grid__full">
            <div className="crm-lines-header">
              <div>
                <strong>{language === "es" ? "Características capturadas" : "Captured characteristics"}</strong>
                <div className="text-muted small">
                  {language === "es"
                    ? "Todo lo que aquí apruebes se puede trasladar al producto final."
                    : "Anything approved here can be moved to the final product."}
                </div>
              </div>
              <button className="btn btn-outline-secondary btn-sm" type="button" onClick={addCharacteristic}>
                {language === "es" ? "Agregar" : "Add"}
              </button>
            </div>
            <div className="crm-lines-list">
              {form.characteristics.map((characteristic, index) => (
                <div key={`${editingId || "new"}-ingestion-characteristic-${index}`} className="crm-line-card">
                  <div className="crm-line-grid">
                    <label>
                      <span>{language === "es" ? "Etiqueta" : "Label"}</span>
                      <input value={characteristic.label} onChange={(event) => updateCharacteristic(index, { label: event.target.value })} />
                    </label>
                    <label>
                      <span>{language === "es" ? "Valor" : "Value"}</span>
                      <input value={characteristic.value} onChange={(event) => updateCharacteristic(index, { value: event.target.value })} />
                    </label>
                    <label>
                      <span>{language === "es" ? "Orden" : "Order"}</span>
                      <input type="number" min="0" value={characteristic.sort_order} onChange={(event) => updateCharacteristic(index, { sort_order: Number(event.target.value) || 0 })} />
                    </label>
                  </div>
                  <div className="crm-line-card__footer">
                    <span className="text-muted small">
                      {language === "es" ? "Se copiará al catálogo al aprobar el borrador." : "Copied into the catalog when the draft is approved."}
                    </span>
                    <button className="btn btn-outline-danger btn-sm" type="button" onClick={() => removeCharacteristic(index)}>
                      {language === "es" ? "Quitar" : "Remove"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <label className="crm-form-grid__full">
            <span>{language === "es" ? "Notas de revisión" : "Review notes"}</span>
            <textarea rows={3} value={reviewNotes} onChange={(event) => setReviewNotes(event.target.value)} />
          </label>

          <div className="crm-form-actions">
            {editingId ? (
              <button className="btn btn-outline-secondary" type="button" onClick={startNew}>
                {language === "es" ? "Cancelar edición" : "Cancel edit"}
              </button>
            ) : null}
            <button className="btn btn-primary" disabled={isSubmitting} type="submit">
              {editingId
                ? language === "es"
                  ? "Guardar borrador"
                  : "Save draft"
                : language === "es"
                  ? "Crear borrador"
                  : "Create draft"}
            </button>
          </div>
        </form>
      </PanelCard>

      <DataTableCard
        title={language === "es" ? "Borradores de ingesta" : "Ingestion drafts"}
        subtitle={
          language === "es"
            ? "Revisa, aprueba o descarta antes de mover al catálogo central."
            : "Review, approve, or discard before moving to the central catalog."
        }
        rows={rows}
        actions={
          <>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">{language === "es" ? "Todos" : "All"}</option>
              <option value="draft">{language === "es" ? "Borradores" : "Drafts"}</option>
              <option value="approved">{language === "es" ? "Aprobados" : "Approved"}</option>
              <option value="discarded">{language === "es" ? "Descartados" : "Discarded"}</option>
            </select>
            <input
              type="search"
              placeholder={language === "es" ? "Buscar por nombre, marca, categoría, URL..." : "Search by name, brand, category, URL..."}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </>
        }
        columns={[
          {
            key: "draft",
            header: language === "es" ? "Borrador" : "Draft",
            render: (row) => (
              <div>
                <strong>{row.name || row.source_label || "—"}</strong>
                <div className="text-muted small">{row.connector_name || row.brand || row.category_label || "—"}</div>
                {row.duplicate_summary && row.duplicate_summary.status !== "none" ? (
                  <div className="small text-danger">
                    {language === "es" ? "Posible duplicado" : "Possible duplicate"} · {row.duplicate_summary.top_score}/100
                    {row.duplicate_summary.top_reason ? ` · ${row.duplicate_summary.top_reason}` : ""}
                  </div>
                ) : null}
                {getPreferredCatalogCandidate(row) ? (
                  <div className="small text-muted">
                    {language === "es" ? "Catálogo sugerido" : "Suggested catalog match"} ·{" "}
                    {getPreferredCatalogCandidate(row)?.label}
                  </div>
                ) : null}
                {row.enrichment_state && row.enrichment_state.status === "ready" ? (
                  <div className="small text-success">
                    {language === "es" ? "Enriquecido" : "Enriched"}
                    {row.enrichment_state.strategy ? ` · ${row.enrichment_state.strategy}` : ""}
                    {row.enrichment_state.summary ? ` · ${row.enrichment_state.summary}` : ""}
                  </div>
                ) : null}
              </div>
            ),
          },
          {
            key: "source",
            header: language === "es" ? "Fuente" : "Source",
            render: (row) => (
              <div>
                <div>{row.connector_name || row.source_kind}</div>
                <div className="text-muted small">{row.source_url || row.source_label || "—"}</div>
              </div>
            ),
          },
          {
            key: "status",
            header: language === "es" ? "Estado" : "Status",
            render: (row) => statusLabelMap[row.capture_status as keyof typeof statusLabelMap] || row.capture_status,
          },
          {
            key: "publish",
            header: language === "es" ? "Producto final" : "Published product",
            render: (row) => row.published_product_name || "—",
          },
          {
            key: "signals",
            header: language === "es" ? "Señales" : "Signals",
            render: (row) => (
              <div className="small">
                <div>
                  {language === "es" ? "Duplicados" : "Duplicates"}:{" "}
                  {row.duplicate_summary?.candidate_count || 0}
                </div>
                <div>
                  {language === "es" ? "IA disponible" : "AI ready"}:{" "}
                  {row.enrichment_state?.ai_available ? (language === "es" ? "sí" : "yes") : (language === "es" ? "no" : "no")}
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
                {row.capture_status === "draft" ? (
                  <>
                    <button className="btn btn-outline-secondary btn-sm" type="button" onClick={() => void handleEnrich(row)}>
                      {language === "es" ? "Enriquecer" : "Enrich"}
                    </button>
                    {getPreferredCatalogCandidate(row) ? (
                      <>
                        <button
                          className="btn btn-outline-primary btn-sm"
                          type="button"
                          onClick={() => void handleResolveDuplicate(row, "update_existing")}
                        >
                          {language === "es" ? "Actualizar existente" : "Update existing"}
                        </button>
                        <button
                          className="btn btn-outline-secondary btn-sm"
                          type="button"
                          onClick={() => void handleResolveDuplicate(row, "link_existing")}
                        >
                          {language === "es" ? "Vincular existente" : "Link existing"}
                        </button>
                      </>
                    ) : null}
                    <button className="btn btn-primary btn-sm" type="button" onClick={() => void handleApprove(row)}>
                      {language === "es" ? "Aprobar" : "Approve"}
                    </button>
                    <button className="btn btn-outline-danger btn-sm" type="button" onClick={() => void handleStatus(row, "discarded")}>
                      {language === "es" ? "Descartar" : "Discard"}
                    </button>
                  </>
                ) : null}
                {row.capture_status === "discarded" ? (
                  <button className="btn btn-outline-secondary btn-sm" type="button" onClick={() => void handleStatus(row, "draft")}>
                    {language === "es" ? "Reabrir" : "Reopen"}
                  </button>
                ) : null}
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
