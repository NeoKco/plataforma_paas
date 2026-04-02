import { useEffect, useState } from "react";
import { AppBadge } from "../../../../../design-system/AppBadge";
import { AppToolbar } from "../../../../../design-system/AppLayout";
import { useLanguage } from "../../../../../store/language-context";
import { useTenantAuth } from "../../../../../store/tenant-auth-context";
import type { ApiError } from "../../../../../types";
import { MaintenanceCatalogPage } from "../components/common/MaintenanceCatalogPage";
import {
  createTenantMaintenanceEquipmentType,
  deleteTenantMaintenanceEquipmentType,
  getTenantMaintenanceEquipmentTypes,
  updateTenantMaintenanceEquipmentType,
  updateTenantMaintenanceEquipmentTypeStatus,
  type TenantMaintenanceEquipmentType,
  type TenantMaintenanceEquipmentTypeWriteRequest,
} from "../services/equipmentTypesService";

function buildDefaultForm(): TenantMaintenanceEquipmentTypeWriteRequest {
  return {
    code: null,
    name: "",
    description: null,
    is_active: true,
    sort_order: 100,
  };
}

function normalizeNullable(value: string | null): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : null;
}

export function MaintenanceEquipmentTypesPage() {
  const { session } = useTenantAuth();
  const { language } = useLanguage();
  const [rows, setRows] = useState<TenantMaintenanceEquipmentType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [form, setForm] = useState<TenantMaintenanceEquipmentTypeWriteRequest>(
    buildDefaultForm()
  );

  async function loadData() {
    if (!session?.accessToken) {
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await getTenantMaintenanceEquipmentTypes(session.accessToken);
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

  function startCreate() {
    setEditingId(null);
    setFeedback(null);
    setError(null);
    setForm(buildDefaultForm());
  }

  function startEdit(item: TenantMaintenanceEquipmentType) {
    setEditingId(item.id);
    setFeedback(null);
    setError(null);
    setForm({
      code: item.code,
      name: item.name,
      description: item.description,
      is_active: item.is_active,
      sort_order: item.sort_order,
    });
  }

  async function handleSubmit() {
    if (!session?.accessToken) {
      return;
    }
    setIsSubmitting(true);
    setError(null);
    const payload: TenantMaintenanceEquipmentTypeWriteRequest = {
      code: normalizeNullable(form.code),
      name: form.name.trim(),
      description: normalizeNullable(form.description),
      is_active: form.is_active,
      sort_order: Number(form.sort_order),
    };
    try {
      const response = editingId
        ? await updateTenantMaintenanceEquipmentType(
            session.accessToken,
            editingId,
            payload
          )
        : await createTenantMaintenanceEquipmentType(session.accessToken, payload);
      setFeedback(response.message);
      startCreate();
      await loadData();
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleToggle(item: TenantMaintenanceEquipmentType) {
    if (!session?.accessToken) {
      return;
    }
    try {
      const response = await updateTenantMaintenanceEquipmentTypeStatus(
        session.accessToken,
        item.id,
        !item.is_active
      );
      setFeedback(response.message);
      await loadData();
    } catch (rawError) {
      setError(rawError as ApiError);
    }
  }

  async function handleDelete(item: TenantMaintenanceEquipmentType) {
    if (!session?.accessToken) {
      return;
    }
    const confirmed = window.confirm(
      language === "es"
        ? `Eliminar el tipo de equipo "${item.name}" solo funcionará si no tiene instalaciones asociadas. ¿Continuar?`
        : `Delete equipment type "${item.name}" only if it has no linked installations. Continue?`
    );
    if (!confirmed) {
      return;
    }
    try {
      const response = await deleteTenantMaintenanceEquipmentType(
        session.accessToken,
        item.id
      );
      if (editingId === item.id) {
        startCreate();
      }
      setFeedback(response.message);
      await loadData();
    } catch (rawError) {
      setError(rawError as ApiError);
    }
  }

  return (
    <MaintenanceCatalogPage
      titleEs="Tipos de equipo"
      titleEn="Equipment types"
      descriptionEs="Catálogo técnico reutilizable para instalaciones y órdenes de mantención."
      descriptionEn="Reusable technical catalog for installations and work orders."
      helpEs="No uses este catálogo para marcas o modelos puntuales. Aquí deben vivir solo las familias técnicas que luego reutilizarás en instalaciones y reportes."
      helpEn="Do not use this catalog for specific brands or models. Only reusable technical families should live here."
      loadingLabelEs="Cargando tipos de equipo..."
      loadingLabelEn="Loading equipment types..."
      isLoading={isLoading}
      isSubmitting={isSubmitting}
      rows={rows}
      error={error}
      feedback={feedback}
      editingId={editingId}
      form={form}
      onFormChange={setForm}
      onSubmit={handleSubmit}
      onCancel={startCreate}
      onReload={loadData}
      onNew={startCreate}
      fields={[
        { key: "code", labelEs: "Código", labelEn: "Code" },
        { key: "name", labelEs: "Nombre", labelEn: "Name" },
        {
          key: "sort_order",
          labelEs: "Orden",
          labelEn: "Sort order",
          type: "number",
          min: 0,
        },
        {
          key: "is_active",
          labelEs: "Activo",
          labelEn: "Active",
          type: "checkbox",
        },
        {
          key: "description",
          labelEs: "Descripción",
          labelEn: "Description",
          type: "textarea",
        },
      ]}
      columns={[
        {
          key: "type",
          headerEs: "Tipo",
          headerEn: "Type",
          render: (item, currentLanguage) => (
            <div>
              <div className="maintenance-cell__title">{item.name}</div>
              <div className="maintenance-cell__meta">
                {item.code || (currentLanguage === "es" ? "sin código" : "no code")}
              </div>
            </div>
          ),
        },
        {
          key: "status",
          headerEs: "Estado",
          headerEn: "Status",
          render: (item, currentLanguage) => (
            <AppBadge tone={item.is_active ? "success" : "neutral"}>
              {item.is_active
                ? currentLanguage === "es"
                  ? "Activo"
                  : "Active"
                : currentLanguage === "es"
                  ? "Inactivo"
                  : "Inactive"}
            </AppBadge>
          ),
        },
        {
          key: "actions",
          headerEs: "Acciones",
          headerEn: "Actions",
          render: (item, currentLanguage) => (
            <AppToolbar compact>
              <button
                className="btn btn-sm btn-outline-primary"
                type="button"
                onClick={() => startEdit(item)}
              >
                {currentLanguage === "es" ? "Editar" : "Edit"}
              </button>
              <button
                className="btn btn-sm btn-outline-secondary"
                type="button"
                onClick={() => void handleToggle(item)}
              >
                {item.is_active
                  ? currentLanguage === "es"
                    ? "Desactivar"
                    : "Deactivate"
                  : currentLanguage === "es"
                    ? "Activar"
                    : "Activate"}
              </button>
              <button
                className="btn btn-sm btn-outline-danger"
                type="button"
                onClick={() => void handleDelete(item)}
              >
                {currentLanguage === "es" ? "Eliminar" : "Delete"}
              </button>
            </AppToolbar>
          ),
        },
      ]}
    />
  );
}
