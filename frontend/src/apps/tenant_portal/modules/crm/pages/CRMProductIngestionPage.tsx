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
import {
  approveCRMProductIngestionDraft,
  createCRMProductIngestionDraft,
  getCRMProductIngestionDrafts,
  getCRMProductIngestionOverview,
  type CRMProductIngestionCharacteristic,
  type CRMProductIngestionDraft,
  type CRMProductIngestionDraftWriteRequest,
  updateCRMProductIngestionDraft,
  updateCRMProductIngestionDraftStatus,
} from "../services/crmService";

function buildCharacteristic(index: number): CRMProductIngestionCharacteristic {
  return {
    id: null,
    label: "",
    value: "",
    sort_order: (index + 1) * 10,
  };
}

function buildDefaultForm(): CRMProductIngestionDraftWriteRequest {
  return {
    source_kind: "url_reference",
    source_label: null,
    source_url: null,
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

export function CRMProductIngestionPage() {
  const { session } = useTenantAuth();
  const { language } = useLanguage();
  const [overview, setOverview] = useState<Awaited<ReturnType<typeof getCRMProductIngestionOverview>> | null>(null);
  const [rows, setRows] = useState<CRMProductIngestionDraft[]>([]);
  const [form, setForm] = useState<CRMProductIngestionDraftWriteRequest>(buildDefaultForm());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [reviewNotes, setReviewNotes] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function loadData() {
    if (!session?.accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const [overviewResponse, draftsResponse] = await Promise.all([
        getCRMProductIngestionOverview(session.accessToken),
        getCRMProductIngestionDrafts(session.accessToken, {
          capture_status: statusFilter === "all" ? null : statusFilter,
          q: query || null,
        }),
      ]);
      setOverview(overviewResponse);
      setRows(draftsResponse.data);
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [session?.accessToken, statusFilter, query]);

  function startNew() {
    setEditingId(null);
    setForm(buildDefaultForm());
    setReviewNotes("");
  }

  function startEdit(item: CRMProductIngestionDraft) {
    setEditingId(item.id);
    setForm({
      source_kind: item.source_kind,
      source_label: item.source_label,
      source_url: item.source_url,
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

  function updateCharacteristic(index: number, next: Partial<CRMProductIngestionCharacteristic>) {
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
        ? await updateCRMProductIngestionDraft(session.accessToken, editingId, payload)
        : await createCRMProductIngestionDraft(session.accessToken, payload);
      setFeedback(response.message);
      startNew();
      await loadData();
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleApprove(item: CRMProductIngestionDraft) {
    if (!session?.accessToken) return;
    try {
      const response = await approveCRMProductIngestionDraft(
        session.accessToken,
        item.id,
        reviewNotes || null,
      );
      setFeedback(response.message);
      await loadData();
    } catch (rawError) {
      setError(rawError as ApiError);
    }
  }

  async function handleStatus(item: CRMProductIngestionDraft, nextStatus: "draft" | "discarded") {
    if (!session?.accessToken) return;
    try {
      const response = await updateCRMProductIngestionDraftStatus(
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

  const metrics = overview?.metrics;
  const statusLabelMap = useMemo(
    () => ({
      draft: language === "es" ? "borrador" : "draft",
      approved: language === "es" ? "aprobado" : "approved",
      discarded: language === "es" ? "descartado" : "discarded",
    }),
    [language],
  );

  return (
    <div className="d-grid gap-4">
      <PageHeader
        eyebrow={language === "es" ? "CRM comercial" : "Commercial CRM"}
        icon="products"
        title={language === "es" ? "Ingesta de productos" : "Product ingestion"}
        description={
          language === "es"
            ? "Captura asistida de productos y servicios desde referencias externas antes de publicarlos al catálogo CRM."
            : "Assisted capture of products and services from external references before publishing them to the CRM catalog."
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
      <CRMModuleNav />

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
            value={metrics.ingestion_draft}
            hint={language === "es" ? "Pendientes de revisar" : "Pending review"}
          />
          <MetricCard
            icon="catalogs"
            label={language === "es" ? "Aprobados" : "Approved"}
            value={metrics.ingestion_approved}
            hint={language === "es" ? "Ya publicados al catálogo" : "Already published to catalog"}
          />
          <MetricCard
            icon="focus"
            label={language === "es" ? "Descartados" : "Discarded"}
            value={metrics.ingestion_discarded}
            hint={language === "es" ? "Capturas no publicadas" : "Captures not published"}
          />
          <MetricCard
            icon="reports"
            label={language === "es" ? "Con URL" : "With URL"}
            value={metrics.ingestion_with_url}
            hint={language === "es" ? "Referencias externas declaradas" : "Declared external references"}
          />
        </div>
      ) : null}

      <PanelCard
        title={editingId ? (language === "es" ? "Editar borrador" : "Edit draft") : (language === "es" ? "Nuevo borrador" : "New draft")}
        subtitle={
          language === "es"
            ? "Este primer corte captura y normaliza antes de publicar. El scraping automático real se profundiza después."
            : "This first cut captures and normalizes before publishing. Full automatic scraping can be deepened later."
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
            ? "Revisa, aprueba o descarta antes de mover al catálogo CRM."
            : "Review, approve, or discard before moving to the CRM catalog."
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
                <div className="text-muted small">{row.brand || row.category_label || "—"}</div>
              </div>
            ),
          },
          {
            key: "source",
            header: language === "es" ? "Fuente" : "Source",
            render: (row) => (
              <div>
                <div>{row.source_kind}</div>
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
            key: "actions",
            header: language === "es" ? "Acciones" : "Actions",
            render: (row) => (
              <div className="d-flex flex-wrap gap-2">
                <button className="btn btn-outline-secondary btn-sm" type="button" onClick={() => startEdit(row)}>
                  {language === "es" ? "Editar" : "Edit"}
                </button>
                {row.capture_status === "draft" ? (
                  <>
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
