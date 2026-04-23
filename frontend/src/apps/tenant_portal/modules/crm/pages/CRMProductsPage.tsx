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
  createCRMProduct,
  deleteCRMProduct,
  getCRMProducts,
  updateCRMProduct,
  updateCRMProductStatus,
  type CRMProduct,
  type CRMProductWriteRequest,
} from "../services/crmService";

function buildDefaultForm(): CRMProductWriteRequest {
  return {
    sku: null,
    name: "",
    product_type: "service",
    unit_label: null,
    unit_price: 0,
    description: null,
    is_active: true,
    sort_order: 100,
  };
}

export function CRMProductsPage() {
  const { session } = useTenantAuth();
  const { language } = useLanguage();
  const [rows, setRows] = useState<CRMProduct[]>([]);
  const [form, setForm] = useState<CRMProductWriteRequest>(buildDefaultForm());
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
      const response = await getCRMProducts(session.accessToken);
      setRows(response.data);
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

  function startEdit(item: CRMProduct) {
    setEditingId(item.id);
    setForm({
      sku: item.sku,
      name: item.name,
      product_type: item.product_type,
      unit_label: item.unit_label,
      unit_price: item.unit_price,
      description: item.description,
      is_active: item.is_active,
      sort_order: item.sort_order,
    });
    setFeedback(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.accessToken) return;
    setIsSubmitting(true);
    setError(null);
    setFeedback(null);
    try {
      const response = editingId
        ? await updateCRMProduct(session.accessToken, editingId, form)
        : await createCRMProduct(session.accessToken, form);
      setFeedback(response.message);
      startNew();
      await loadRows();
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleToggle(item: CRMProduct) {
    if (!session?.accessToken) return;
    try {
      const response = await updateCRMProductStatus(session.accessToken, item.id, !item.is_active);
      setFeedback(response.message);
      await loadRows();
    } catch (rawError) {
      setError(rawError as ApiError);
    }
  }

  async function handleDelete(item: CRMProduct) {
    if (!session?.accessToken) return;
    if (!window.confirm(language === "es" ? `Eliminar "${item.name}"?` : `Delete "${item.name}"?`)) return;
    try {
      const response = await deleteCRMProduct(session.accessToken, item.id);
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
        icon="products"
        title={language === "es" ? "Productos y servicios" : "Products and services"}
        description={
          language === "es"
            ? "Catálogo comercial reutilizable por oportunidades y cotizaciones."
            : "Reusable commercial catalog for opportunities and quotes."
        }
        actions={
          <AppToolbar compact>
            <button className="btn btn-outline-secondary" type="button" onClick={() => void loadRows()}>
              {language === "es" ? "Recargar" : "Reload"}
            </button>
            <button className="btn btn-primary" type="button" onClick={startNew}>
              {language === "es" ? "Nuevo producto" : "New product"}
            </button>
          </AppToolbar>
        }
      />
      <CRMModuleNav />
      {feedback ? <div className="alert alert-success mb-0">{feedback}</div> : null}
      {error ? (
        <ErrorState
          title={language === "es" ? "No se pudo cargar productos" : "Could not load products"}
          detail={getApiErrorDisplayMessage(error)}
          requestId={error.payload?.request_id}
        />
      ) : null}
      {isLoading ? <LoadingBlock label={language === "es" ? "Cargando catálogo..." : "Loading catalog..."} /> : null}

      <PanelCard
        title={editingId ? (language === "es" ? "Editar producto" : "Edit product") : (language === "es" ? "Nuevo producto" : "New product")}
        subtitle={
          language === "es"
            ? "Este catálogo alimenta cotizaciones y evita reescribir precios base."
            : "This catalog feeds quotes and avoids rewriting base prices."
        }
      >
        <form className="crm-form-grid" onSubmit={(event) => void handleSubmit(event)}>
          <label>
            <span>{language === "es" ? "Nombre" : "Name"}</span>
            <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required />
          </label>
          <label>
            <span>SKU</span>
            <input value={form.sku || ""} onChange={(event) => setForm((current) => ({ ...current, sku: event.target.value || null }))} />
          </label>
          <label>
            <span>{language === "es" ? "Tipo" : "Type"}</span>
            <select value={form.product_type} onChange={(event) => setForm((current) => ({ ...current, product_type: event.target.value }))}>
              <option value="service">{language === "es" ? "Servicio" : "Service"}</option>
              <option value="product">{language === "es" ? "Producto" : "Product"}</option>
            </select>
          </label>
          <label>
            <span>{language === "es" ? "Unidad" : "Unit"}</span>
            <input value={form.unit_label || ""} onChange={(event) => setForm((current) => ({ ...current, unit_label: event.target.value || null }))} />
          </label>
          <label>
            <span>{language === "es" ? "Precio base" : "Base price"}</span>
            <input type="number" min="0" step="0.01" value={form.unit_price} onChange={(event) => setForm((current) => ({ ...current, unit_price: Number(event.target.value) || 0 }))} />
          </label>
          <label>
            <span>{language === "es" ? "Orden" : "Order"}</span>
            <input type="number" min="0" value={form.sort_order} onChange={(event) => setForm((current) => ({ ...current, sort_order: Number(event.target.value) || 0 }))} />
          </label>
          <label className="crm-form-grid__full">
            <span>{language === "es" ? "Descripción" : "Description"}</span>
            <textarea value={form.description || ""} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value || null }))} rows={3} />
          </label>
          <label className="crm-inline-check">
            <input type="checkbox" checked={form.is_active} onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.checked }))} />
            <span>{language === "es" ? "Activo" : "Active"}</span>
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
                  ? "Crear producto"
                  : "Create product"}
            </button>
          </div>
        </form>
      </PanelCard>

      <DataTableCard
        title={language === "es" ? "Catálogo activo" : "Active catalog"}
        subtitle={language === "es" ? "Productos y servicios listos para ventas." : "Products and services ready for sales."}
        rows={rows}
        columns={[
          { key: "name", header: language === "es" ? "Nombre" : "Name", render: (row) => <div><strong>{row.name}</strong><div className="text-muted small">{row.sku || "—"}</div></div> },
          { key: "type", header: language === "es" ? "Tipo" : "Type", render: (row) => row.product_type },
          { key: "price", header: language === "es" ? "Precio" : "Price", render: (row) => row.unit_price.toLocaleString() },
          { key: "status", header: language === "es" ? "Estado" : "Status", render: (row) => (row.is_active ? (language === "es" ? "activo" : "active") : (language === "es" ? "inactivo" : "inactive")) },
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
