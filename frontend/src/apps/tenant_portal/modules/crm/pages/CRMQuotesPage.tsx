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
  getCRMQuoteTemplates,
  getCRMQuotes,
  updateCRMQuote,
  updateCRMQuoteStatus,
  type CRMOpportunity,
  type CRMProduct,
  type CRMQuote,
  type CRMQuoteLine,
  type CRMQuoteSection,
  type CRMQuoteTemplate,
  type CRMQuoteTemplateItem,
  type CRMQuoteTemplateSection,
  type CRMQuoteWriteRequest,
} from "../services/crmService";

function buildDefaultLine(index: number): CRMQuoteLine {
  return {
    id: null,
    product_id: null,
    section_id: null,
    line_type: "catalog_item",
    name: "",
    description: null,
    quantity: 1,
    unit_price: 0,
    line_total: 0,
    sort_order: (index + 1) * 10,
  };
}

function buildDefaultSection(index: number): CRMQuoteSection {
  return {
    id: null,
    title: "",
    description: null,
    sort_order: (index + 1) * 10,
    lines: [buildDefaultLine(0)],
  };
}

function buildDefaultForm(): CRMQuoteWriteRequest {
  return {
    client_id: null,
    opportunity_id: null,
    template_id: null,
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
    sections: [],
  };
}

function toEditableLine(line: CRMQuoteLine, fallbackIndex: number): CRMQuoteLine {
  return {
    id: line.id,
    product_id: line.product_id,
    section_id: line.section_id || null,
    line_type: line.line_type,
    name: line.name,
    description: line.description,
    quantity: line.quantity,
    unit_price: line.unit_price,
    line_total: line.line_total,
    sort_order: line.sort_order ?? (fallbackIndex + 1) * 10,
  };
}

function buildLineFromTemplateItem(item: CRMQuoteTemplateItem, fallbackIndex: number): CRMQuoteLine {
  return {
    id: null,
    product_id: item.product_id,
    section_id: null,
    line_type: item.line_type,
    name: item.name,
    description: item.description,
    quantity: item.quantity,
    unit_price: item.unit_price,
    line_total: item.quantity * item.unit_price,
    sort_order: item.sort_order ?? (fallbackIndex + 1) * 10,
  };
}

function buildSectionFromTemplate(section: CRMQuoteTemplateSection, sectionIndex: number): CRMQuoteSection {
  return {
    id: null,
    title: section.title,
    description: section.description,
    sort_order: section.sort_order ?? (sectionIndex + 1) * 10,
    lines:
      section.items.length > 0
        ? section.items.map((item, itemIndex) => buildLineFromTemplateItem(item, itemIndex))
        : [buildDefaultLine(0)],
  };
}

function formatMoney(value: number, language: "es" | "en") {
  return new Intl.NumberFormat(language === "es" ? "es-CL" : "en-US", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export function CRMQuotesPage() {
  const { session } = useTenantAuth();
  const { language } = useLanguage();
  const [rows, setRows] = useState<CRMQuote[]>([]);
  const [clients, setClients] = useState<TenantBusinessClient[]>([]);
  const [organizations, setOrganizations] = useState<TenantBusinessOrganization[]>([]);
  const [products, setProducts] = useState<CRMProduct[]>([]);
  const [opportunities, setOpportunities] = useState<CRMOpportunity[]>([]);
  const [templates, setTemplates] = useState<CRMQuoteTemplate[]>([]);
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
        templatesResponse,
      ] = await Promise.all([
        getCRMQuotes(session.accessToken),
        getTenantBusinessClients(session.accessToken, { includeInactive: false }),
        getTenantBusinessOrganizations(session.accessToken, { includeInactive: false }),
        getCRMProducts(session.accessToken),
        getCRMOpportunities(session.accessToken),
        getCRMQuoteTemplates(session.accessToken),
      ]);
      setRows(quotesResponse.data);
      setClients(clientsResponse.data);
      setOrganizations(organizationsResponse.data);
      setProducts(productsResponse.data.filter((item) => item.is_active));
      setOpportunities(opportunitiesResponse.data.filter((item) => item.is_active));
      setTemplates(templatesResponse.data.filter((item) => item.is_active));
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadRows();
  }, [session?.accessToken]);

  const organizationById = useMemo(
    () => new Map(organizations.map((item) => [item.id, item])),
    [organizations]
  );

  const selectedTemplate = useMemo(
    () => templates.find((item) => item.id === form.template_id) || null,
    [form.template_id, templates]
  );

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
      template_id: item.template_id,
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
          ? item.lines.map((line, index) => toEditableLine(line, index))
          : [buildDefaultLine(0)],
      sections: item.sections.map((section, sectionIndex) => ({
        id: section.id,
        title: section.title,
        description: section.description,
        sort_order: section.sort_order,
        lines:
          section.lines.length > 0
            ? section.lines.map((line, lineIndex) => toEditableLine(line, lineIndex))
            : [buildDefaultLine(0)],
      })),
    });
    setFeedback(null);
  }

  const quotePreview = useMemo(() => {
    const linesSubtotal = form.lines.reduce(
      (sum, line) => sum + (Number(line.quantity) || 0) * (Number(line.unit_price) || 0),
      0
    );
    const sectionsSubtotal = form.sections.reduce(
      (sum, section) =>
        sum +
        section.lines.reduce(
          (sectionSum, line) =>
            sectionSum + (Number(line.quantity) || 0) * (Number(line.unit_price) || 0),
          0
        ),
      0
    );
    const subtotal = linesSubtotal + sectionsSubtotal;
    return {
      subtotal,
      total: subtotal - (Number(form.discount_amount) || 0) + (Number(form.tax_amount) || 0),
      sectionCount: form.sections.length,
      structuredLineCount: form.sections.reduce((sum, section) => sum + section.lines.length, 0),
      freeLineCount: form.lines.length,
    };
  }, [form.discount_amount, form.lines, form.sections, form.tax_amount]);

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
      lines:
        current.lines.length === 1
          ? [buildDefaultLine(0)]
          : current.lines.filter((_, lineIndex) => lineIndex !== index),
    }));
  }

  function updateSection(index: number, next: Partial<CRMQuoteSection>) {
    setForm((current) => ({
      ...current,
      sections: current.sections.map((section, sectionIndex) =>
        sectionIndex === index ? { ...section, ...next } : section
      ),
    }));
  }

  function updateSectionLine(sectionIndex: number, lineIndex: number, next: Partial<CRMQuoteLine>) {
    setForm((current) => ({
      ...current,
      sections: current.sections.map((section, currentSectionIndex) =>
        currentSectionIndex === sectionIndex
          ? {
              ...section,
              lines: section.lines.map((line, currentLineIndex) =>
                currentLineIndex === lineIndex ? { ...line, ...next } : line
              ),
            }
          : section
      ),
    }));
  }

  function addSection() {
    setForm((current) => ({
      ...current,
      sections: [...current.sections, buildDefaultSection(current.sections.length)],
    }));
  }

  function removeSection(index: number) {
    setForm((current) => ({
      ...current,
      sections: current.sections.filter((_, sectionIndex) => sectionIndex !== index),
    }));
  }

  function addSectionLine(sectionIndex: number) {
    setForm((current) => ({
      ...current,
      sections: current.sections.map((section, currentSectionIndex) =>
        currentSectionIndex === sectionIndex
          ? { ...section, lines: [...section.lines, buildDefaultLine(section.lines.length)] }
          : section
      ),
    }));
  }

  function removeSectionLine(sectionIndex: number, lineIndex: number) {
    setForm((current) => ({
      ...current,
      sections: current.sections.map((section, currentSectionIndex) =>
        currentSectionIndex === sectionIndex
          ? {
              ...section,
              lines:
                section.lines.length === 1
                  ? [buildDefaultLine(0)]
                  : section.lines.filter((_, currentLineIndex) => currentLineIndex !== lineIndex),
            }
          : section
      ),
    }));
  }

  function applyTemplate(templateId: number | null) {
    const template = templates.find((item) => item.id === templateId) || null;
    setForm((current) => ({
      ...current,
      template_id: templateId,
      sections: template
        ? template.sections.map((section, sectionIndex) => buildSectionFromTemplate(section, sectionIndex))
        : current.sections,
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
        lines: form.lines.filter((line) => line.name.trim()),
        sections: form.sections
          .filter((section) => section.title.trim())
          .map((section) => ({
            ...section,
            lines: section.lines.filter((line) => line.name.trim()),
          })),
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
    if (!window.confirm(language === "es" ? `Eliminar "${item.title}"?` : `Delete "${item.title}"?`)) {
      return;
    }
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
            ? "Propuestas comerciales estructuradas con líneas libres, secciones y plantillas reutilizables."
            : "Structured commercial proposals with free lines, sections, and reusable templates."
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
      {isLoading ? (
        <LoadingBlock label={language === "es" ? "Cargando cotizaciones..." : "Loading quotes..."} />
      ) : null}

      <PanelCard
        title={
          editingId
            ? language === "es"
              ? "Editar cotización"
              : "Edit quote"
            : language === "es"
              ? "Nueva cotización"
              : "New quote"
        }
        subtitle={
          language === "es"
            ? "Puedes combinar líneas libres, estructura por secciones y una plantilla comercial base."
            : "You can combine free lines, section structure, and a base commercial template."
        }
      >
        <form className="crm-form-grid" onSubmit={(event) => void handleSubmit(event)}>
          <label>
            <span>{language === "es" ? "Título" : "Title"}</span>
            <input
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              required
            />
          </label>
          <label>
            <span>{language === "es" ? "Número" : "Number"}</span>
            <input
              value={form.quote_number || ""}
              onChange={(event) =>
                setForm((current) => ({ ...current, quote_number: event.target.value || null }))
              }
            />
          </label>
          <label>
            <span>{language === "es" ? "Cliente" : "Client"}</span>
            <select
              value={form.client_id || ""}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  client_id: event.target.value ? Number(event.target.value) : null,
                }))
              }
            >
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
            <select
              value={form.opportunity_id || ""}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  opportunity_id: event.target.value ? Number(event.target.value) : null,
                }))
              }
            >
              <option value="">{language === "es" ? "Sin oportunidad" : "No opportunity"}</option>
              {opportunities.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>{language === "es" ? "Plantilla base" : "Base template"}</span>
            <select
              value={form.template_id || ""}
              onChange={(event) => applyTemplate(event.target.value ? Number(event.target.value) : null)}
            >
              <option value="">{language === "es" ? "Sin plantilla" : "No template"}</option>
              {templates.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>{language === "es" ? "Estado" : "Status"}</span>
            <select
              value={form.quote_status}
              onChange={(event) =>
                setForm((current) => ({ ...current, quote_status: event.target.value }))
              }
            >
              <option value="draft">draft</option>
              <option value="sent">sent</option>
              <option value="approved">approved</option>
              <option value="rejected">rejected</option>
              <option value="expired">expired</option>
            </select>
          </label>
          <label>
            <span>{language === "es" ? "Válida hasta" : "Valid until"}</span>
            <input
              type="datetime-local"
              value={form.valid_until || ""}
              onChange={(event) =>
                setForm((current) => ({ ...current, valid_until: event.target.value || null }))
              }
            />
          </label>
          <label>
            <span>{language === "es" ? "Descuento" : "Discount"}</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.discount_amount}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  discount_amount: Number(event.target.value) || 0,
                }))
              }
            />
          </label>
          <label>
            <span>{language === "es" ? "Impuesto" : "Tax"}</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.tax_amount}
              onChange={(event) =>
                setForm((current) => ({ ...current, tax_amount: Number(event.target.value) || 0 }))
              }
            />
          </label>
          <label>
            <span>{language === "es" ? "Orden" : "Order"}</span>
            <input
              type="number"
              min="0"
              value={form.sort_order}
              onChange={(event) =>
                setForm((current) => ({ ...current, sort_order: Number(event.target.value) || 0 }))
              }
            />
          </label>
          <label className="crm-inline-check">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(event) =>
                setForm((current) => ({ ...current, is_active: event.target.checked }))
              }
            />
            <span>{language === "es" ? "Activa" : "Active"}</span>
          </label>

          {selectedTemplate ? (
            <div className="crm-detail-card crm-form-grid__full">
              <div className="crm-detail-card__header">
                <strong>{language === "es" ? "Plantilla aplicada" : "Applied template"}</strong>
                <span className="crm-chip">{selectedTemplate.name}</span>
              </div>
              <div className="text-muted small">
                {selectedTemplate.summary ||
                  (language === "es"
                    ? "La estructura de secciones se puede ajustar antes de guardar."
                    : "The section structure can be adjusted before saving.")}
              </div>
            </div>
          ) : null}

          <div className="crm-form-grid__full">
            <div className="crm-lines-header">
              <div>
                <strong>{language === "es" ? "Líneas libres" : "Free lines"}</strong>
                <div className="text-muted small">
                  {language === "es"
                    ? "Ítems fuera de secciones, útiles para ajustes o cargos generales."
                    : "Items outside sections, useful for adjustments or general charges."}
                </div>
              </div>
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
                      <input
                        value={line.name}
                        onChange={(event) => updateLine(index, { name: event.target.value })}
                        required
                      />
                    </label>
                    <label>
                      <span>{language === "es" ? "Cantidad" : "Quantity"}</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.quantity}
                        onChange={(event) =>
                          updateLine(index, { quantity: Number(event.target.value) || 0 })
                        }
                      />
                    </label>
                    <label>
                      <span>{language === "es" ? "Precio unitario" : "Unit price"}</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.unit_price}
                        onChange={(event) =>
                          updateLine(index, { unit_price: Number(event.target.value) || 0 })
                        }
                      />
                    </label>
                    <label className="crm-form-grid__full">
                      <span>{language === "es" ? "Descripción" : "Description"}</span>
                      <textarea
                        value={line.description || ""}
                        onChange={(event) =>
                          updateLine(index, { description: event.target.value || null })
                        }
                        rows={2}
                      />
                    </label>
                  </div>
                  <div className="crm-line-card__footer">
                    <span>
                      {language === "es" ? "Subtotal línea" : "Line subtotal"}:{" "}
                      {formatMoney((Number(line.quantity) || 0) * (Number(line.unit_price) || 0), language)}
                    </span>
                    <button
                      className="btn btn-outline-danger btn-sm"
                      type="button"
                      onClick={() => removeLine(index)}
                    >
                      {language === "es" ? "Quitar" : "Remove"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="crm-form-grid__full">
            <div className="crm-lines-header">
              <div>
                <strong>{language === "es" ? "Secciones estructuradas" : "Structured sections"}</strong>
                <div className="text-muted small">
                  {language === "es"
                    ? "Aquí viven los bloques principales de la propuesta comercial."
                    : "This is where the main blocks of the commercial proposal live."}
                </div>
              </div>
              <button className="btn btn-outline-secondary btn-sm" type="button" onClick={addSection}>
                {language === "es" ? "Agregar sección" : "Add section"}
              </button>
            </div>
            <div className="crm-lines-list">
              {form.sections.length === 0 ? (
                <div className="crm-kanban-empty">
                  {language === "es"
                    ? "Sin secciones aún. Puedes usar una plantilla o agregarlas manualmente."
                    : "No sections yet. You can use a template or add them manually."}
                </div>
              ) : null}
              {form.sections.map((section, sectionIndex) => (
                <div key={`section-${sectionIndex}`} className="crm-line-card">
                  <div className="crm-line-grid">
                    <label>
                      <span>{language === "es" ? "Sección" : "Section"}</span>
                      <input
                        value={section.title}
                        onChange={(event) => updateSection(sectionIndex, { title: event.target.value })}
                      />
                    </label>
                    <label>
                      <span>{language === "es" ? "Orden" : "Order"}</span>
                      <input
                        type="number"
                        min="0"
                        value={section.sort_order}
                        onChange={(event) =>
                          updateSection(sectionIndex, { sort_order: Number(event.target.value) || 0 })
                        }
                      />
                    </label>
                    <label className="crm-form-grid__full">
                      <span>{language === "es" ? "Descripción" : "Description"}</span>
                      <textarea
                        value={section.description || ""}
                        onChange={(event) =>
                          updateSection(sectionIndex, { description: event.target.value || null })
                        }
                        rows={2}
                      />
                    </label>
                  </div>

                  <div className="crm-lines-header">
                    <strong>{language === "es" ? "Ítems de la sección" : "Section items"}</strong>
                    <button
                      className="btn btn-outline-secondary btn-sm"
                      type="button"
                      onClick={() => addSectionLine(sectionIndex)}
                    >
                      {language === "es" ? "Agregar ítem" : "Add item"}
                    </button>
                  </div>
                  <div className="crm-lines-list">
                    {section.lines.map((line, lineIndex) => (
                      <div key={`section-${sectionIndex}-line-${lineIndex}`} className="crm-line-card">
                        <div className="crm-line-grid">
                          <label>
                            <span>{language === "es" ? "Producto" : "Product"}</span>
                            <select
                              value={line.product_id || ""}
                              onChange={(event) => {
                                const productId = event.target.value ? Number(event.target.value) : null;
                                const product = products.find((item) => item.id === productId) || null;
                                updateSectionLine(sectionIndex, lineIndex, {
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
                            <input
                              value={line.name}
                              onChange={(event) =>
                                updateSectionLine(sectionIndex, lineIndex, { name: event.target.value })
                              }
                            />
                          </label>
                          <label>
                            <span>{language === "es" ? "Cantidad" : "Quantity"}</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={line.quantity}
                              onChange={(event) =>
                                updateSectionLine(sectionIndex, lineIndex, {
                                  quantity: Number(event.target.value) || 0,
                                })
                              }
                            />
                          </label>
                          <label>
                            <span>{language === "es" ? "Precio unitario" : "Unit price"}</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={line.unit_price}
                              onChange={(event) =>
                                updateSectionLine(sectionIndex, lineIndex, {
                                  unit_price: Number(event.target.value) || 0,
                                })
                              }
                            />
                          </label>
                          <label className="crm-form-grid__full">
                            <span>{language === "es" ? "Descripción" : "Description"}</span>
                            <textarea
                              value={line.description || ""}
                              onChange={(event) =>
                                updateSectionLine(sectionIndex, lineIndex, {
                                  description: event.target.value || null,
                                })
                              }
                              rows={2}
                            />
                          </label>
                        </div>
                        <div className="crm-line-card__footer">
                          <span>
                            {language === "es" ? "Subtotal ítem" : "Item subtotal"}:{" "}
                            {formatMoney(
                              (Number(line.quantity) || 0) * (Number(line.unit_price) || 0),
                              language
                            )}
                          </span>
                          <button
                            className="btn btn-outline-danger btn-sm"
                            type="button"
                            onClick={() => removeSectionLine(sectionIndex, lineIndex)}
                          >
                            {language === "es" ? "Quitar" : "Remove"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="crm-line-card__footer">
                    <span>
                      {language === "es" ? "Subtotal sección" : "Section subtotal"}:{" "}
                      {formatMoney(
                        section.lines.reduce(
                          (sum, line) => sum + (Number(line.quantity) || 0) * (Number(line.unit_price) || 0),
                          0
                        ),
                        language
                      )}
                    </span>
                    <button
                      className="btn btn-outline-danger btn-sm"
                      type="button"
                      onClick={() => removeSection(sectionIndex)}
                    >
                      {language === "es" ? "Quitar sección" : "Remove section"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <label className="crm-form-grid__full">
            <span>{language === "es" ? "Resumen" : "Summary"}</span>
            <textarea
              value={form.summary || ""}
              onChange={(event) =>
                setForm((current) => ({ ...current, summary: event.target.value || null }))
              }
              rows={2}
            />
          </label>
          <label className="crm-form-grid__full">
            <span>{language === "es" ? "Notas" : "Notes"}</span>
            <textarea
              value={form.notes || ""}
              onChange={(event) =>
                setForm((current) => ({ ...current, notes: event.target.value || null }))
              }
              rows={2}
            />
          </label>

          <div className="crm-quote-preview crm-form-grid__full">
            <strong>{language === "es" ? "Vista previa económica" : "Economic preview"}</strong>
            <div className="crm-chip-list">
              <span className="crm-chip">
                {language === "es" ? "Líneas libres" : "Free lines"}: {quotePreview.freeLineCount}
              </span>
              <span className="crm-chip">
                {language === "es" ? "Secciones" : "Sections"}: {quotePreview.sectionCount}
              </span>
              <span className="crm-chip">
                {language === "es" ? "Ítems estructurados" : "Structured items"}:{" "}
                {quotePreview.structuredLineCount}
              </span>
            </div>
            <div>{language === "es" ? "Subtotal" : "Subtotal"}: {formatMoney(quotePreview.subtotal, language)}</div>
            <div>{language === "es" ? "Total" : "Total"}: {formatMoney(quotePreview.total, language)}</div>
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
        subtitle={
          language === "es"
            ? "Lectura operativa del frente de propuestas comerciales."
            : "Operational read of the commercial proposal front."
        }
        rows={rows}
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
            key: "structure",
            header: language === "es" ? "Estructura" : "Structure",
            render: (row) => (
              <div className="crm-chip-list">
                <span className="crm-chip">
                  {language === "es" ? "Libres" : "Free"}: {row.lines.length}
                </span>
                <span className="crm-chip">
                  {language === "es" ? "Secciones" : "Sections"}: {row.sections.length}
                </span>
              </div>
            ),
          },
          {
            key: "total",
            header: language === "es" ? "Total" : "Total",
            render: (row) => formatMoney(row.total_amount, language),
          },
          {
            key: "actions",
            header: language === "es" ? "Acciones" : "Actions",
            render: (row) => (
              <div className="d-flex gap-2 flex-wrap">
                <button className="btn btn-outline-secondary btn-sm" type="button" onClick={() => startEdit(row)}>
                  {language === "es" ? "Editar" : "Edit"}
                </button>
                <button className="btn btn-outline-secondary btn-sm" type="button" onClick={() => void handleToggle(row)}>
                  {row.is_active
                    ? language === "es"
                      ? "Desactivar"
                      : "Deactivate"
                    : language === "es"
                      ? "Activar"
                      : "Activate"}
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
