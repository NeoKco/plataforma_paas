import { useEffect, useState } from "react";
import { AppBadge } from "../../../../../design-system/AppBadge";
import { AppToolbar } from "../../../../../design-system/AppLayout";
import { useLanguage } from "../../../../../store/language-context";
import { useTenantAuth } from "../../../../../store/tenant-auth-context";
import type { ApiError } from "../../../../../types";
import { BusinessCoreCatalogPage } from "../components/common/BusinessCoreCatalogPage";
import { buildInternalTaxonomyCode, stripLegacyVisibleText } from "../utils/taxonomyUi";
import {
  createTenantBusinessAssetType,
  deleteTenantBusinessAssetType,
  getTenantBusinessAssetTypes,
  updateTenantBusinessAssetType,
  updateTenantBusinessAssetTypeStatus,
  type TenantBusinessAssetType,
  type TenantBusinessAssetTypeWriteRequest,
} from "../services/assetTypesService";

function buildDefaultForm(): TenantBusinessAssetTypeWriteRequest {
  return { code: null, name: "", description: null, is_active: true, sort_order: 100 };
}

function normalizeNullable(value: string | null): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : null;
}

export function BusinessCoreAssetTypesPage() {
  const { session } = useTenantAuth();
  const { language } = useLanguage();
  const [items, setItems] = useState<TenantBusinessAssetType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [form, setForm] = useState<TenantBusinessAssetTypeWriteRequest>(buildDefaultForm());

  async function loadItems() {
    if (!session?.accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await getTenantBusinessAssetTypes(session.accessToken);
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

  function startEdit(item: TenantBusinessAssetType) {
    setEditingId(item.id);
    setFeedback(null);
    setError(null);
    setForm({
      code: item.code,
      name: item.name,
      description: stripLegacyVisibleText(item.description),
      is_active: item.is_active,
      sort_order: item.sort_order,
    });
  }

  async function handleSubmit() {
    if (!session?.accessToken) return;
    const payload = {
      ...form,
      code:
        editingId !== null
          ? (form.code?.trim() ?? "") || buildInternalTaxonomyCode("asset", form.name, editingId)
          : buildInternalTaxonomyCode("asset", form.name),
      name: form.name.trim(),
      description: stripLegacyVisibleText(normalizeNullable(form.description)),
    };
    setIsSubmitting(true);
    setError(null);
    try {
      const response = editingId
        ? await updateTenantBusinessAssetType(session.accessToken, editingId, payload)
        : await createTenantBusinessAssetType(session.accessToken, payload);
      setFeedback(response.message);
      startCreate();
      await loadItems();
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleToggle(item: TenantBusinessAssetType) {
    if (!session?.accessToken) return;
    try {
      const response = await updateTenantBusinessAssetTypeStatus(session.accessToken, item.id, !item.is_active);
      setFeedback(response.message);
      await loadItems();
    } catch (rawError) {
      setError(rawError as ApiError);
    }
  }

  async function handleDelete(item: TenantBusinessAssetType) {
    if (!session?.accessToken) return;
    const confirmed = window.confirm(
      language === "es"
        ? `Eliminar "${item.name}" quitará este tipo de activo del catálogo compartido. ¿Continuar?`
        : `Deleting "${item.name}" will remove this asset type from the shared catalog. Continue?`
    );
    if (!confirmed) return;
    try {
      const response = await deleteTenantBusinessAssetType(session.accessToken, item.id);
      if (editingId === item.id) startCreate();
      setFeedback(response.message);
      await loadItems();
    } catch (rawError) {
      setError(rawError as ApiError);
    }
  }

  return (
    <BusinessCoreCatalogPage
      titleEs="Tipos de activo"
      titleEn="Asset types"
      descriptionEs="Taxonomía compartida para activos e instalaciones operativas sobre sitios y clientes."
      descriptionEn="Shared taxonomy for assets and operational installations on sites and clients."
      helpEs="Define primero la taxonomía de activo para clasificar equipos, instalaciones y futuras integraciones de IoT."
      helpEn="Define the asset taxonomy first to classify equipment, installations, and future IoT integrations."
      loadingLabelEs="Cargando tipos de activo..."
      loadingLabelEn="Loading asset types..."
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
        { key: "name", labelEs: "Nombre", labelEn: "Name" },
        { key: "description", labelEs: "Descripción", labelEn: "Description", type: "textarea" },
        { key: "is_active", labelEs: "Activo", labelEn: "Active", type: "checkbox" },
      ]}
      renderEditorExtra={() => (
        <div className="form-text">
          {language === "es"
            ? "El código interno se genera automáticamente y queda reservado para integración y búsqueda técnica."
            : "The internal code is generated automatically and reserved for integration and technical lookup."}
        </div>
      )}
      columns={[
        {
          key: "asset_type",
          headerEs: "Tipo",
          headerEn: "Type",
          render: (item) => (
            <div>
              <div className="business-core-cell__title">{item.name}</div>
              <div className="business-core-cell__meta">{stripLegacyVisibleText(item.description) || "—"}</div>
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
                ? currentLanguage === "es"
                  ? "activo"
                  : "active"
                : currentLanguage === "es"
                  ? "inactivo"
                  : "inactive"}
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
                  ? currentLanguage === "es"
                    ? "Desactivar"
                    : "Deactivate"
                  : currentLanguage === "es"
                    ? "Activar"
                    : "Activate"}
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
