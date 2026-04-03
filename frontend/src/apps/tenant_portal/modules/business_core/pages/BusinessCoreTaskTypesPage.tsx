import { useEffect, useState } from "react";
import { AppBadge } from "../../../../../design-system/AppBadge";
import { AppToolbar } from "../../../../../design-system/AppLayout";
import { useLanguage } from "../../../../../store/language-context";
import { useTenantAuth } from "../../../../../store/tenant-auth-context";
import type { ApiError } from "../../../../../types";
import { BusinessCoreCatalogPage } from "../components/common/BusinessCoreCatalogPage";
import {
  createTenantBusinessTaskType,
  deleteTenantBusinessTaskType,
  getTenantBusinessTaskTypes,
  updateTenantBusinessTaskType,
  updateTenantBusinessTaskTypeStatus,
  type TenantBusinessTaskType,
  type TenantBusinessTaskTypeWriteRequest,
} from "../services/taskTypesService";

function buildDefaultForm(): TenantBusinessTaskTypeWriteRequest {
  return {
    code: "",
    name: "",
    description: null,
    color: "#2563eb",
    icon: "calendar",
    is_active: true,
    sort_order: 100,
  };
}

function normalizeNullable(value: string | null): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : null;
}

export function BusinessCoreTaskTypesPage() {
  const { session } = useTenantAuth();
  const { language } = useLanguage();
  const [items, setItems] = useState<TenantBusinessTaskType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [form, setForm] = useState<TenantBusinessTaskTypeWriteRequest>(buildDefaultForm());

  async function loadItems() {
    if (!session?.accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await getTenantBusinessTaskTypes(session.accessToken);
      setItems(response.data);
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadItems();
  }, [session?.accessToken]);

  function startCreate() {
    setEditingId(null);
    setFeedback(null);
    setError(null);
    setForm(buildDefaultForm());
  }

  function startEdit(item: TenantBusinessTaskType) {
    setEditingId(item.id);
    setFeedback(null);
    setError(null);
    setForm({
      code: item.code,
      name: item.name,
      description: item.description,
      color: item.color,
      icon: item.icon,
      is_active: item.is_active,
      sort_order: item.sort_order,
    });
  }

  async function handleSubmit() {
    if (!session?.accessToken) return;
    const payload = {
      ...form,
      code: form.code.trim(),
      name: form.name.trim(),
      description: normalizeNullable(form.description),
      color: normalizeNullable(form.color),
      icon: normalizeNullable(form.icon),
    };
    setIsSubmitting(true);
    setError(null);
    try {
      const response = editingId
        ? await updateTenantBusinessTaskType(session.accessToken, editingId, payload)
        : await createTenantBusinessTaskType(session.accessToken, payload);
      setFeedback(response.message);
      startCreate();
      await loadItems();
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleToggle(item: TenantBusinessTaskType) {
    if (!session?.accessToken) return;
    try {
      const response = await updateTenantBusinessTaskTypeStatus(
        session.accessToken,
        item.id,
        !item.is_active
      );
      setFeedback(response.message);
      await loadItems();
    } catch (rawError) {
      setError(rawError as ApiError);
    }
  }

  async function handleDelete(item: TenantBusinessTaskType) {
    if (!session?.accessToken) return;
    const confirmed = window.confirm(
      language === "es"
        ? `Eliminar "${item.name}" quitará este tipo de tarea del catálogo compartido. ¿Continuar?`
        : `Deleting "${item.name}" will remove this task type from the shared catalog. Continue?`
    );
    if (!confirmed) return;
    try {
      const response = await deleteTenantBusinessTaskType(session.accessToken, item.id);
      if (editingId === item.id) startCreate();
      setFeedback(response.message);
      await loadItems();
    } catch (rawError) {
      setError(rawError as ApiError);
    }
  }

  return (
    <BusinessCoreCatalogPage
      titleEs="Tipos de tarea"
      titleEn="Task types"
      descriptionEs="Taxonomía compartida para mantenciones, proyectos y futura automatización operativa."
      descriptionEn="Shared taxonomy for maintenance, projects, and future operational automation."
      helpEs="Define tipos reutilizables antes de abrir flujos operativos. Evita que cada módulo cree sus propias categorías técnicas incompatibles."
      helpEn="Define reusable types before opening operational flows. Avoid each module creating incompatible technical categories."
      loadingLabelEs="Cargando tipos de tarea..."
      loadingLabelEn="Loading task types..."
      isLoading={isLoading}
      isSubmitting={isSubmitting}
      rows={items}
      error={error}
      feedback={feedback}
      editingId={editingId}
      form={form}
      onFormChange={setForm}
      onSubmit={handleSubmit}
      onCancel={startCreate}
      onReload={loadItems}
      onNew={startCreate}
      fields={[
        { key: "code", labelEs: "Código", labelEn: "Code", placeholderEs: "Ej: mantencion-preventiva", placeholderEn: "Ex: preventive-maintenance" },
        { key: "name", labelEs: "Nombre", labelEn: "Name", placeholderEs: "Ej: Mantención preventiva", placeholderEn: "Ex: Preventive maintenance" },
        { key: "color", labelEs: "Color", labelEn: "Color", placeholderEs: "#2563eb", placeholderEn: "#2563eb" },
        { key: "icon", labelEs: "Icono", labelEn: "Icon", placeholderEs: "calendar", placeholderEn: "calendar" },
        { key: "is_active", labelEs: "Activo", labelEn: "Active", type: "checkbox" },
        { key: "description", labelEs: "Descripción", labelEn: "Description", type: "textarea" },
      ]}
      columns={[
        {
          key: "task_type",
          headerEs: "Tipo",
          headerEn: "Type",
          render: (item) => (
            <div>
              <div className="business-core-cell__title">{item.name}</div>
              <div className="business-core-cell__meta">{item.code}</div>
            </div>
          ),
        },
        {
          key: "color",
          headerEs: "Color",
          headerEn: "Color",
          render: (item) => (
            <div className="d-flex align-items-center gap-2">
              <span
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: "999px",
                  background: item.color ?? "#94a3b8",
                  display: "inline-block",
                }}
              />
              <span>{item.color ?? "sin color"}</span>
            </div>
          ),
        },
        {
          key: "status",
          headerEs: "Estado",
          headerEn: "Status",
          render: (item, currentLanguage) => (
            <AppBadge tone={item.is_active ? "success" : "warning"}>
              {item.is_active
                ? currentLanguage === "es" ? "activo" : "active"
                : currentLanguage === "es" ? "inactivo" : "inactive"}
            </AppBadge>
          ),
        },
        {
          key: "actions",
          headerEs: "Acciones",
          headerEn: "Actions",
          render: (item, currentLanguage) => (
            <AppToolbar compact>
              <button className="btn btn-sm btn-outline-primary" type="button" onClick={() => startEdit(item)}>
                {currentLanguage === "es" ? "Editar" : "Edit"}
              </button>
              <button className="btn btn-sm btn-outline-secondary" type="button" onClick={() => void handleToggle(item)}>
                {item.is_active
                  ? currentLanguage === "es" ? "Desactivar" : "Deactivate"
                  : currentLanguage === "es" ? "Activar" : "Activate"}
              </button>
              <button className="btn btn-sm btn-outline-danger" type="button" onClick={() => void handleDelete(item)}>
                {currentLanguage === "es" ? "Eliminar" : "Delete"}
              </button>
            </AppToolbar>
          ),
        },
      ]}
    />
  );
}
