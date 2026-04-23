import { useEffect, useState } from "react";
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
import { CRMModuleNav } from "../components/common/CRMModuleNav";
import {
  createCRMQuoteTemplate,
  deleteCRMQuoteTemplate,
  getCRMProducts,
  getCRMQuoteTemplates,
  updateCRMQuoteTemplate,
  updateCRMQuoteTemplateStatus,
  type CRMProduct,
  type CRMQuoteTemplate,
  type CRMQuoteTemplateItem,
  type CRMQuoteTemplateSection,
  type CRMQuoteTemplateWriteRequest,
} from "../services/crmService";

function buildDefaultTemplateItem(index: number): CRMQuoteTemplateItem {
  return {
    id: null,
    product_id: null,
    line_type: "catalog_item",
    name: "",
    description: null,
    quantity: 1,
    unit_price: 0,
    sort_order: (index + 1) * 10,
  };
}

function buildDefaultTemplateSection(index: number): CRMQuoteTemplateSection {
  return {
    id: null,
    title: "",
    description: null,
    sort_order: (index + 1) * 10,
    items: [buildDefaultTemplateItem(0)],
  };
}

function buildDefaultForm(): CRMQuoteTemplateWriteRequest {
  return {
    name: "",
    summary: null,
    notes: null,
    is_active: true,
    sort_order: 100,
    sections: [buildDefaultTemplateSection(0)],
  };
}

export function CRMTemplatesPage() {
  const { session } = useTenantAuth();
  const { language } = useLanguage();
  const [rows, setRows] = useState<CRMQuoteTemplate[]>([]);
  const [products, setProducts] = useState<CRMProduct[]>([]);
  const [form, setForm] = useState<CRMQuoteTemplateWriteRequest>(buildDefaultForm());
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
      const [templatesResponse, productsResponse] = await Promise.all([
        getCRMQuoteTemplates(session.accessToken),
        getCRMProducts(session.accessToken),
      ]);
      setRows(templatesResponse.data);
      setProducts(productsResponse.data.filter((item) => item.is_active));
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadRows();
  }, [session?.accessToken]);

  function startNew() {
    setEditingId(null);
    setForm(buildDefaultForm());
    setFeedback(null);
  }

  function startEdit(item: CRMQuoteTemplate) {
    setEditingId(item.id);
    setForm({
      name: item.name,
      summary: item.summary,
      notes: item.notes,
      is_active: item.is_active,
      sort_order: item.sort_order,
      sections:
        item.sections.length > 0
          ? item.sections.map((section) => ({
              id: section.id,
              title: section.title,
              description: section.description,
              sort_order: section.sort_order,
              items:
                section.items.length > 0
                  ? section.items.map((entry) => ({
                      id: entry.id,
                      product_id: entry.product_id,
                      line_type: entry.line_type,
                      name: entry.name,
                      description: entry.description,
                      quantity: entry.quantity,
                      unit_price: entry.unit_price,
                      sort_order: entry.sort_order,
                    }))
                  : [buildDefaultTemplateItem(0)],
            }))
          : [buildDefaultTemplateSection(0)],
    });
    setFeedback(null);
  }

  function updateSection(index: number, next: Partial<CRMQuoteTemplateSection>) {
    setForm((current) => ({
      ...current,
      sections: current.sections.map((section, sectionIndex) =>
        sectionIndex === index ? { ...section, ...next } : section
      ),
    }));
  }

  function updateSectionItem(sectionIndex: number, itemIndex: number, next: Partial<CRMQuoteTemplateItem>) {
    setForm((current) => ({
      ...current,
      sections: current.sections.map((section, currentSectionIndex) =>
        currentSectionIndex === sectionIndex
          ? {
              ...section,
              items: section.items.map((item, currentItemIndex) =>
                currentItemIndex === itemIndex ? { ...item, ...next } : item
              ),
            }
          : section
      ),
    }));
  }

  function addSection() {
    setForm((current) => ({
      ...current,
      sections: [...current.sections, buildDefaultTemplateSection(current.sections.length)],
    }));
  }

  function removeSection(index: number) {
    setForm((current) => ({
      ...current,
      sections:
        current.sections.length === 1
          ? [buildDefaultTemplateSection(0)]
          : current.sections.filter((_, sectionIndex) => sectionIndex !== index),
    }));
  }

  function addSectionItem(sectionIndex: number) {
    setForm((current) => ({
      ...current,
      sections: current.sections.map((section, currentSectionIndex) =>
        currentSectionIndex === sectionIndex
          ? { ...section, items: [...section.items, buildDefaultTemplateItem(section.items.length)] }
          : section
      ),
    }));
  }

  function removeSectionItem(sectionIndex: number, itemIndex: number) {
    setForm((current) => ({
      ...current,
      sections: current.sections.map((section, currentSectionIndex) =>
        currentSectionIndex === sectionIndex
          ? {
              ...section,
              items:
                section.items.length === 1
                  ? [buildDefaultTemplateItem(0)]
                  : section.items.filter((_, currentItemIndex) => currentItemIndex !== itemIndex),
            }
          : section
      ),
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
        sections: form.sections
          .filter((section) => section.title.trim())
          .map((section) => ({
            ...section,
            items: section.items.filter((item) => item.name.trim()),
          })),
      };
      const response = editingId
        ? await updateCRMQuoteTemplate(session.accessToken, editingId, payload)
        : await createCRMQuoteTemplate(session.accessToken, payload);
      setFeedback(response.message);
      startNew();
      await loadRows();
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleToggle(item: CRMQuoteTemplate) {
    if (!session?.accessToken) return;
    try {
      const response = await updateCRMQuoteTemplateStatus(session.accessToken, item.id, !item.is_active);
      setFeedback(response.message);
      await loadRows();
    } catch (rawError) {
      setError(rawError as ApiError);
    }
  }

  async function handleDelete(item: CRMQuoteTemplate) {
    if (!session?.accessToken) return;
    if (!window.confirm(language === "es" ? `Eliminar "${item.name}"?` : `Delete "${item.name}"?`)) return;
    try {
      const response = await deleteCRMQuoteTemplate(session.accessToken, item.id);
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
        icon="templates"
        title={language === "es" ? "Plantillas comerciales" : "Commercial templates"}
        description={
          language === "es"
            ? "Proyectos base reutilizables para cotizaciones estructuradas."
            : "Reusable base projects for structured quotes."
        }
        actions={
          <AppToolbar compact>
            <button className="btn btn-outline-secondary" type="button" onClick={() => void loadRows()}>
              {language === "es" ? "Recargar" : "Reload"}
            </button>
            <button className="btn btn-primary" type="button" onClick={startNew}>
              {language === "es" ? "Nueva plantilla" : "New template"}
            </button>
          </AppToolbar>
        }
      />
      <CRMModuleNav />
      {feedback ? <div className="alert alert-success mb-0">{feedback}</div> : null}
      {error ? (
        <ErrorState
          title={language === "es" ? "No se pudo cargar plantillas" : "Could not load templates"}
          detail={getApiErrorDisplayMessage(error)}
          requestId={error.payload?.request_id}
        />
      ) : null}
      {isLoading ? <LoadingBlock label={language === "es" ? "Cargando plantillas..." : "Loading templates..."} /> : null}

      <PanelCard
        title={editingId ? (language === "es" ? "Editar plantilla" : "Edit template") : (language === "es" ? "Nueva plantilla" : "New template")}
        subtitle={
          language === "es"
            ? "Estructura base por secciones e ítems para acelerar propuestas."
            : "Base structure with sections and items to accelerate proposals."
        }
      >
        <form className="crm-form-grid" onSubmit={(event) => void handleSubmit(event)}>
          <label>
            <span>{language === "es" ? "Nombre" : "Name"}</span>
            <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required />
          </label>
          <label>
            <span>{language === "es" ? "Orden" : "Order"}</span>
            <input type="number" min="0" value={form.sort_order} onChange={(event) => setForm((current) => ({ ...current, sort_order: Number(event.target.value) || 0 }))} />
          </label>
          <label className="crm-form-grid__full">
            <span>{language === "es" ? "Resumen" : "Summary"}</span>
            <textarea value={form.summary || ""} onChange={(event) => setForm((current) => ({ ...current, summary: event.target.value || null }))} rows={2} />
          </label>
          <label className="crm-form-grid__full">
            <span>{language === "es" ? "Notas" : "Notes"}</span>
            <textarea value={form.notes || ""} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value || null }))} rows={2} />
          </label>

          <div className="crm-form-grid__full">
            <div className="crm-lines-header">
              <div>
                <strong>{language === "es" ? "Secciones base" : "Base sections"}</strong>
                <div className="text-muted small">
                  {language === "es"
                    ? "Cada sección puede cargar productos del catálogo o ítems libres."
                    : "Each section can include catalog products or custom items."}
                </div>
              </div>
              <button className="btn btn-outline-secondary btn-sm" type="button" onClick={addSection}>
                {language === "es" ? "Agregar sección" : "Add section"}
              </button>
            </div>
            <div className="crm-lines-list">
              {form.sections.map((section, sectionIndex) => (
                <div key={`${editingId || "new"}-template-section-${sectionIndex}`} className="crm-line-card">
                  <div className="crm-line-grid">
                    <label>
                      <span>{language === "es" ? "Sección" : "Section"}</span>
                      <input value={section.title} onChange={(event) => updateSection(sectionIndex, { title: event.target.value })} />
                    </label>
                    <label>
                      <span>{language === "es" ? "Orden" : "Order"}</span>
                      <input type="number" min="0" value={section.sort_order} onChange={(event) => updateSection(sectionIndex, { sort_order: Number(event.target.value) || 0 })} />
                    </label>
                    <label className="crm-form-grid__full">
                      <span>{language === "es" ? "Descripción" : "Description"}</span>
                      <textarea value={section.description || ""} onChange={(event) => updateSection(sectionIndex, { description: event.target.value || null })} rows={2} />
                    </label>
                  </div>

                  <div className="crm-lines-header">
                    <strong>{language === "es" ? "Ítems base" : "Base items"}</strong>
                    <button className="btn btn-outline-secondary btn-sm" type="button" onClick={() => addSectionItem(sectionIndex)}>
                      {language === "es" ? "Agregar ítem" : "Add item"}
                    </button>
                  </div>

                  <div className="crm-lines-list">
                    {section.items.map((item, itemIndex) => (
                      <div key={`${editingId || "new"}-template-item-${sectionIndex}-${itemIndex}`} className="crm-line-card">
                        <div className="crm-line-grid">
                          <label>
                            <span>{language === "es" ? "Producto catálogo" : "Catalog product"}</span>
                            <select
                              value={item.product_id || ""}
                              onChange={(event) => {
                                const product = products.find((entry) => entry.id === Number(event.target.value));
                                updateSectionItem(sectionIndex, itemIndex, {
                                  product_id: event.target.value ? Number(event.target.value) : null,
                                  line_type: event.target.value ? "catalog_item" : item.line_type,
                                  name: product?.name || item.name,
                                  unit_price: product?.unit_price ?? item.unit_price,
                                });
                              }}
                            >
                              <option value="">{language === "es" ? "Ítem libre" : "Custom item"}</option>
                              {products.map((product) => (
                                <option key={product.id} value={product.id}>
                                  {product.name}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label>
                            <span>{language === "es" ? "Nombre" : "Name"}</span>
                            <input value={item.name} onChange={(event) => updateSectionItem(sectionIndex, itemIndex, { name: event.target.value })} />
                          </label>
                          <label>
                            <span>{language === "es" ? "Cantidad" : "Quantity"}</span>
                            <input type="number" min="0" step="0.01" value={item.quantity} onChange={(event) => updateSectionItem(sectionIndex, itemIndex, { quantity: Number(event.target.value) || 0 })} />
                          </label>
                          <label>
                            <span>{language === "es" ? "Precio" : "Price"}</span>
                            <input type="number" min="0" step="0.01" value={item.unit_price} onChange={(event) => updateSectionItem(sectionIndex, itemIndex, { unit_price: Number(event.target.value) || 0 })} />
                          </label>
                          <label className="crm-form-grid__full">
                            <span>{language === "es" ? "Descripción" : "Description"}</span>
                            <textarea value={item.description || ""} onChange={(event) => updateSectionItem(sectionIndex, itemIndex, { description: event.target.value || null })} rows={2} />
                          </label>
                        </div>
                        <div className="crm-line-card__footer">
                          <span className="text-muted small">
                            {language === "es"
                              ? "Este ítem se puede aplicar a nuevas cotizaciones desde la plantilla."
                              : "This item can be applied to new quotes from the template."}
                          </span>
                          <button className="btn btn-outline-danger btn-sm" type="button" onClick={() => removeSectionItem(sectionIndex, itemIndex)}>
                            {language === "es" ? "Quitar ítem" : "Remove item"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="crm-line-card__footer">
                    <span className="text-muted small">
                      {language === "es"
                        ? "La plantilla queda reutilizable para nuevas propuestas."
                        : "The template remains reusable for new proposals."}
                    </span>
                    <button className="btn btn-outline-danger btn-sm" type="button" onClick={() => removeSection(sectionIndex)}>
                      {language === "es" ? "Quitar sección" : "Remove section"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <label className="crm-inline-check">
            <input type="checkbox" checked={form.is_active} onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.checked }))} />
            <span>{language === "es" ? "Activa" : "Active"}</span>
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
                  ? "Guardar cambios"
                  : "Save changes"
                : language === "es"
                  ? "Crear plantilla"
                  : "Create template"}
            </button>
          </div>
        </form>
      </PanelCard>

      <DataTableCard
        title={language === "es" ? "Plantillas disponibles" : "Available templates"}
        subtitle={language === "es" ? "Base comercial reutilizable del tenant." : "Reusable tenant commercial base."}
        rows={rows}
        columns={[
          {
            key: "name",
            header: language === "es" ? "Plantilla" : "Template",
            render: (row) => (
              <div>
                <strong>{row.name}</strong>
                <div className="text-muted small">{row.summary || "—"}</div>
              </div>
            ),
          },
          {
            key: "structure",
            header: language === "es" ? "Estructura" : "Structure",
            render: (row) => `${row.sections.length} ${language === "es" ? "secciones" : "sections"}`,
          },
          {
            key: "status",
            header: language === "es" ? "Estado" : "Status",
            render: (row) => (row.is_active ? (language === "es" ? "activa" : "active") : (language === "es" ? "inactiva" : "inactive")),
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
