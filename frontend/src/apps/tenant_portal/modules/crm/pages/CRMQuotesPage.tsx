import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "../../../../../components/common/PageHeader";
import { PanelCard } from "../../../../../components/common/PanelCard";
import { DataTableCard } from "../../../../../components/data-display/DataTableCard";
import { ErrorState } from "../../../../../components/feedback/ErrorState";
import { LoadingBlock } from "../../../../../components/feedback/LoadingBlock";
import { AppToolbar } from "../../../../../design-system/AppLayout";
import { getApiErrorDisplayMessage } from "../../../../../services/api";
import { useLanguage } from "../../../../../store/language-context";
import { useTenantAuth } from "../../../../../store/tenant-auth-context";
import type { ApiError } from "../../../../../types";
import { getTenantBusinessClients, type TenantBusinessClient } from "../../business_core/services/clientsService";
import {
  getTenantBusinessOrganizations,
  type TenantBusinessOrganization,
} from "../../business_core/services/organizationsService";
import { CRMModuleNav } from "../components/common/CRMModuleNav";
import {
  createCRMQuote,
  deleteCRMQuote,
  getCRMOpportunities,
  getCRMProducts,
  getCRMQuotes,
  updateCRMQuote,
  updateCRMQuoteStatus,
  type CRMOpportunity,
  type CRMProduct,
  type CRMQuote,
  type CRMQuoteLine,
  type CRMQuoteWriteRequest,
} from "../services/crmService";

function buildDefaultLine(index: number): CRMQuoteLine {
  return {
    id: null,
    product_id: null,
    line_type: "catalog_item",
    name: "",
    description: null,
    quantity: 1,
    unit_price: 0,
    line_total: 0,
    sort_order: (index + 1) * 10,
  };
}

function buildDefaultForm(): CRMQuoteWriteRequest {
  return {
    client_id: null,
    opportunity_id: null,
    quote_number: null,
    title: "",
    quote_status: "draft",
    valid_until: null,
    discount_amount: 0,
    tax_amount: 0,
    summary: null,
    notes: null,
    is_active: true,
    sort_order: 100,
    lines: [buildDefaultLine(0)],
  };
}

export function CRMQuotesPage() {
  const { session } = useTenantAuth();
  const { language } = useLanguage();
  const [rows, setRows] = useState<CRMQuote[]>([]);
  const [clients, setClients] = useState<TenantBusinessClient[]>([]);
  const [organizations, setOrganizations] = useState<TenantBusinessOrganization[]>([]);
  const [products, setProducts] = useState<CRMProduct[]>([]);
  const [opportunities, setOpportunities] = useState<CRMOpportunity[]>([]);
  const [form, setForm] = useState<CRMQuoteWriteRequest>(buildDefaultForm());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function loadRows() {
    if (!session?.accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const [
        quotesResponse,
        clientsResponse,
        organizationsResponse,
        productsResponse,
        opportunitiesResponse,
      ] =
        await Promise.all([
          getCRMQuotes(session.accessToken),
          getTenantBusinessClients(session.accessToken, { includeInactive: false }),
          getTenantBusinessOrganizations(session.accessToken, { includeInactive: false }),
          getCRMProducts(session.accessToken),
          getCRMOpportunities(session.accessToken),
        ]);
      setRows(quotesResponse.data);
      setClients(clientsResponse.data);
      setOrganizations(organizationsResponse.data);
      setProducts(productsResponse.data.filter((item) => item.is_active));
      setOpportunities(opportunitiesResponse.data.filter((item) => item.is_active));
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadRows();
  }, [session?.accessToken]);

  const organizationById = new Map(organizations.map((item) => [item.id, item]));

  function startNew() {
    setEditingId(null);
    setForm(buildDefaultForm());
    setFeedback(null);
  }

  function startEdit(item: CRMQuote) {
    setEditingId(item.id);
    setForm({
      client_id: item.client_id,
      opportunity_id: item.opportunity_id,
      quote_number: item.quote_number,
      title: item.title,
      quote_status: item.quote_status,
      valid_until: item.valid_until ? item.valid_until.slice(0, 16) : null,
      discount_amount: item.discount_amount,
      tax_amount: item.tax_amount,
      summary: item.summary,
      notes: item.notes,
      is_active: item.is_active,
      sort_order: item.sort_order,
      lines:
        item.lines.length > 0
          ? item.lines.map((line) => ({
              id: line.id,
              product_id: line.product_id,
              line_type: line.line_type,
              name: line.name,
              description: line.description,
              quantity: line.quantity,
              unit_price: line.unit_price,
              sort_order: line.sort_order,
            }))
          : [buildDefaultLine(0)],
    });
    setFeedback(null);
  }

  const quotePreview = useMemo(() => {
    const subtotal = form.lines.reduce(
      (sum, line) => sum + (Number(line.quantity) || 0) * (Number(line.unit_price) || 0),
      0
    );
    return {
      subtotal,
      total: subtotal - (Number(form.discount_amount) || 0) + (Number(form.tax_amount) || 0),
    };
  }, [form.discount_amount, form.lines, form.tax_amount]);

  function updateLine(index: number, next: Partial<CRMQuoteLine>) {
    setForm((current) => ({
      ...current,
      lines: current.lines.map((line, lineIndex) =>
        lineIndex === index ? { ...line, ...next } : line
      ),
    }));
  }

  function addLine() {
    setForm((current) => ({
      ...current,
      lines: [...current.lines, buildDefaultLine(current.lines.length)],
    }));
  }

  function removeLine(index: number) {
    setForm((current) => ({
      ...current,
      lines: current.lines.filter((_, lineIndex) => lineIndex !== index),
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
        valid_until: form.valid_until ? new Date(form.valid_until).toISOString() : null,
      };
      const response = editingId
        ? await updateCRMQuote(session.accessToken, editingId, payload)
        : await createCRMQuote(session.accessToken, payload);
      setFeedback(response.message);
      startNew();
      await loadRows();
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleToggle(item: CRMQuote) {
    if (!session?.accessToken) return;
    try {
      const response = await updateCRMQuoteStatus(session.accessToken, item.id, !item.is_active);
      setFeedback(response.message);
      await loadRows();
    } catch (rawError) {
      setError(rawError as ApiError);
    }
  }

  async function handleDelete(item: CRMQuote) {
    if (!session?.accessToken) return;
    if (!window.confirm(language === "es" ? `Eliminar "${item.title}"?` : `Delete "${item.title}"?`)) return;
    try {
      const response = await deleteCRMQuote(session.accessToken, item.id);
      setFeedback(response.message);
      if (editingId === item.id) {
        startNew();
      }
      await loadRows();
    } catch (rawError) {
      setError(rawError as ApiError);
    }
  }

  return (
    <div className="d-grid gap-4">
      <PageHeader
        eyebrow={language === "es" ? "CRM comercial" : "Commercial CRM"}
        icon="quotes"
        title={language === "es" ? "Cotizaciones" : "Quotes"}
        description={
          language === "es"
            ? "Propuestas comerciales conectadas a clientes, oportunidades y catálogo."
            : "Commercial proposals connected to clients, opportunities, and catalog."
        }
        actions={
          <AppToolbar compact>
            <button className="btn btn-outline-secondary" type="button" onClick={() => void loadRows()}>
              {language === "es" ? "Recargar" : "Reload"}
            </button>
            <button className="btn btn-primary" type="button" onClick={startNew}>
              {language === "es" ? "Nueva cotización" : "New quote"}
            </button>
          </AppToolbar>
        }
      />
      <CRMModuleNav />
      {feedback ? <div className="alert alert-success mb-0">{feedback}</div> : null}
      {error ? (
        <ErrorState
          title={language === "es" ? "No se pudo cargar cotizaciones" : "Could not load quotes"}
          detail={getApiErrorDisplayMessage(error)}
          requestId={error.payload?.request_id}
        />
      ) : null}
      {isLoading ? <LoadingBlock label={language === "es" ? "Cargando cotizaciones..." : "Loading quotes..."} /> : null}

      <PanelCard
        title={editingId ? (language === "es" ? "Editar cotización" : "Edit quote") : (language === "es" ? "Nueva cotización" : "New quote")}
        subtitle={
          language === "es"
            ? "Este primer corte usa líneas simples con productos del catálogo y deja pendiente render/PDF."
            : "This first cut uses simple lines with catalog products and leaves render/PDF for later."
        }
      >
        <form className="crm-form-grid" onSubmit={(event) => void handleSubmit(event)}>
          <label>
            <span>{language === "es" ? "Título" : "Title"}</span>
            <input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} required />
          </label>
          <label>
            <span>{language === "es" ? "Número" : "Number"}</span>
            <input value={form.quote_number || ""} onChange={(event) => setForm((current) => ({ ...current, quote_number: event.target.value || null }))} />
          </label>
          <label>
            <span>{language === "es" ? "Cliente" : "Client"}</span>
            <select value={form.client_id || ""} onChange={(event) => setForm((current) => ({ ...current, client_id: event.target.value ? Number(event.target.value) : null }))}>
              <option value="">{language === "es" ? "Sin cliente" : "No client"}</option>
              {clients.map((item) => (
                <option key={item.id} value={item.id}>
                  {organizationById.get(item.organization_id)?.name || item.client_code || `#${item.id}`}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>{language === "es" ? "Oportunidad" : "Opportunity"}</span>
            <select value={form.opportunity_id || ""} onChange={(event) => setForm((current) => ({ ...current, opportunity_id: event.target.value ? Number(event.target.value) : null }))}>
              <option value="">{language === "es" ? "Sin oportunidad" : "No opportunity"}</option>
              {opportunities.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>{language === "es" ? "Estado" : "Status"}</span>
            <select value={form.quote_status} onChange={(event) => setForm((current) => ({ ...current, quote_status: event.target.value }))}>
              <option value="draft">draft</option>
              <option value="sent">sent</option>
              <option value="approved">approved</option>
              <option value="rejected">rejected</option>
              <option value="expired">expired</option>
            </select>
          </label>
          <label>
            <span>{language === "es" ? "Válida hasta" : "Valid until"}</span>
            <input type="datetime-local" value={form.valid_until || ""} onChange={(event) => setForm((current) => ({ ...current, valid_until: event.target.value || null }))} />
          </label>
          <label>
            <span>{language === "es" ? "Descuento" : "Discount"}</span>
            <input type="number" min="0" step="0.01" value={form.discount_amount} onChange={(event) => setForm((current) => ({ ...current, discount_amount: Number(event.target.value) || 0 }))} />
          </label>
          <label>
            <span>{language === "es" ? "Impuesto" : "Tax"}</span>
            <input type="number" min="0" step="0.01" value={form.tax_amount} onChange={(event) => setForm((current) => ({ ...current, tax_amount: Number(event.target.value) || 0 }))} />
          </label>
          <label className="crm-inline-check">
            <input type="checkbox" checked={form.is_active} onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.checked }))} />
            <span>{language === "es" ? "Activa" : "Active"}</span>
          </label>

          <div className="crm-form-grid__full">
            <div className="crm-lines-header">
              <strong>{language === "es" ? "Líneas de cotización" : "Quote lines"}</strong>
              <button className="btn btn-outline-secondary btn-sm" type="button" onClick={addLine}>
                {language === "es" ? "Agregar línea" : "Add line"}
              </button>
            </div>
            <div className="crm-lines-list">
              {form.lines.map((line, index) => (
                <div key={`line-${index}`} className="crm-line-card">
                  <div className="crm-line-grid">
                    <label>
                      <span>{language === "es" ? "Producto" : "Product"}</span>
                      <select
                        value={line.product_id || ""}
                        onChange={(event) => {
                          const productId = event.target.value ? Number(event.target.value) : null;
                          const product = products.find((item) => item.id === productId) || null;
                          updateLine(index, {
                            product_id: productId,
                            name: product?.name || line.name,
                            unit_price: product?.unit_price ?? line.unit_price,
                            line_type: productId ? "catalog_item" : "manual_item",
                          });
                        }}
                      >
                        <option value="">{language === "es" ? "Manual" : "Manual"}</option>
                        {products.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>{language === "es" ? "Nombre línea" : "Line name"}</span>
                      <input value={line.name} onChange={(event) => updateLine(index, { name: event.target.value })} required />
                    </label>
                    <label>
                      <span>{language === "es" ? "Cantidad" : "Quantity"}</span>
                      <input type="number" min="0" step="0.01" value={line.quantity} onChange={(event) => updateLine(index, { quantity: Number(event.target.value) || 0 })} />
                    </label>
                    <label>
                      <span>{language === "es" ? "Precio unitario" : "Unit price"}</span>
                      <input type="number" min="0" step="0.01" value={line.unit_price} onChange={(event) => updateLine(index, { unit_price: Number(event.target.value) || 0 })} />
                    </label>
                    <label className="crm-form-grid__full">
                      <span>{language === "es" ? "Descripción" : "Description"}</span>
                      <textarea value={line.description || ""} onChange={(event) => updateLine(index, { description: event.target.value || null })} rows={2} />
                    </label>
                  </div>
                  <div className="crm-line-card__footer">
                    <span>
                      {language === "es" ? "Subtotal línea" : "Line subtotal"}:{" "}
                      {((Number(line.quantity) || 0) * (Number(line.unit_price) || 0)).toLocaleString()}
                    </span>
                    {form.lines.length > 1 ? (
                      <button className="btn btn-outline-danger btn-sm" type="button" onClick={() => removeLine(index)}>
                        {language === "es" ? "Quitar" : "Remove"}
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <label className="crm-form-grid__full">
            <span>{language === "es" ? "Resumen" : "Summary"}</span>
            <textarea value={form.summary || ""} onChange={(event) => setForm((current) => ({ ...current, summary: event.target.value || null }))} rows={2} />
          </label>
          <label className="crm-form-grid__full">
            <span>{language === "es" ? "Notas" : "Notes"}</span>
            <textarea value={form.notes || ""} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value || null }))} rows={2} />
          </label>
          <div className="crm-quote-preview crm-form-grid__full">
            <strong>{language === "es" ? "Vista previa económica" : "Economic preview"}</strong>
            <div>{language === "es" ? "Subtotal" : "Subtotal"}: {quotePreview.subtotal.toLocaleString()}</div>
            <div>{language === "es" ? "Total" : "Total"}: {quotePreview.total.toLocaleString()}</div>
          </div>
          <div className="crm-form-actions">
            {editingId ? (
              <button className="btn btn-outline-secondary" type="button" onClick={startNew}>
                {language === "es" ? "Cancelar edición" : "Cancel edit"}
              </button>
            ) : null}
            <button className="btn btn-primary" disabled={isSubmitting} type="submit">
              {editingId
                ? language === "es"
                  ? "Guardar cambios"
                  : "Save changes"
                : language === "es"
                  ? "Crear cotización"
                  : "Create quote"}
            </button>
          </div>
        </form>
      </PanelCard>

      <DataTableCard
        title={language === "es" ? "Cotizaciones activas" : "Active quotes"}
        subtitle={language === "es" ? "Lectura operativa del frente de propuestas." : "Operational view of proposals."}
        rows={rows}
        columns={[
          { key: "title", header: language === "es" ? "Cotización" : "Quote", render: (row) => <div><strong>{row.title}</strong><div className="text-muted small">{row.client_display_name || "—"}</div></div> },
          { key: "status", header: language === "es" ? "Estado" : "Status", render: (row) => row.quote_status },
          { key: "total", header: language === "es" ? "Total" : "Total", render: (row) => row.total_amount.toLocaleString() },
          { key: "lines", header: language === "es" ? "Líneas" : "Lines", render: (row) => row.lines.length },
          {
            key: "actions",
            header: language === "es" ? "Acciones" : "Actions",
            render: (row) => (
              <div className="d-flex gap-2 flex-wrap">
                <button className="btn btn-outline-secondary btn-sm" type="button" onClick={() => startEdit(row)}>
                  {language === "es" ? "Editar" : "Edit"}
                </button>
                <button className="btn btn-outline-secondary btn-sm" type="button" onClick={() => void handleToggle(row)}>
                  {row.is_active ? (language === "es" ? "Desactivar" : "Deactivate") : (language === "es" ? "Activar" : "Activate")}
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
