import { useEffect, useMemo, useState } from "react";
import { AppBadge } from "../../../../../design-system/AppBadge";
import { AppToolbar } from "../../../../../design-system/AppLayout";
import { useLanguage } from "../../../../../store/language-context";
import { useTenantAuth } from "../../../../../store/tenant-auth-context";
import type { ApiError } from "../../../../../types";
import { BusinessCoreCatalogPage } from "../components/common/BusinessCoreCatalogPage";
import { getTenantBusinessSites, type TenantBusinessSite } from "../services/sitesService";
import { getTenantBusinessAssetTypes, type TenantBusinessAssetType } from "../services/assetTypesService";
import {
  createTenantBusinessAsset,
  deleteTenantBusinessAsset,
  getTenantBusinessAssets,
  updateTenantBusinessAsset,
  updateTenantBusinessAssetStatus,
  type TenantBusinessAsset,
  type TenantBusinessAssetWriteRequest,
} from "../services/assetsService";

function buildDefaultForm(): TenantBusinessAssetWriteRequest {
  return {
    site_id: 0,
    asset_type_id: 0,
    name: "",
    asset_code: null,
    serial_number: null,
    manufacturer: null,
    model: null,
    asset_status: "active",
    installed_at: null,
    last_service_at: null,
    warranty_until: null,
    location_note: null,
    technical_notes: null,
    is_active: true,
    sort_order: 100,
  };
}

function normalizeNullable(value: string | null): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : null;
}

export function BusinessCoreAssetsPage() {
  const { session } = useTenantAuth();
  const { language } = useLanguage();
  const [items, setItems] = useState<TenantBusinessAsset[]>([]);
  const [sites, setSites] = useState<TenantBusinessSite[]>([]);
  const [assetTypes, setAssetTypes] = useState<TenantBusinessAssetType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [form, setForm] = useState<TenantBusinessAssetWriteRequest>(buildDefaultForm());

  const siteById = useMemo(() => new Map(sites.map((site) => [site.id, site])), [sites]);
  const assetTypeById = useMemo(() => new Map(assetTypes.map((type) => [type.id, type])), [assetTypes]);

  async function loadItems() {
    if (!session?.accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const [assetsResponse, sitesResponse, assetTypesResponse] = await Promise.all([
        getTenantBusinessAssets(session.accessToken),
        getTenantBusinessSites(session.accessToken, { includeInactive: false }),
        getTenantBusinessAssetTypes(session.accessToken, { includeInactive: false }),
      ]);
      setItems(assetsResponse.data);
      setSites(sitesResponse.data);
      setAssetTypes(assetTypesResponse.data);
      setForm((current) => ({
        ...current,
        site_id: current.site_id || sitesResponse.data[0]?.id || 0,
        asset_type_id: current.asset_type_id || assetTypesResponse.data[0]?.id || 0,
      }));
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
    setForm({
      ...buildDefaultForm(),
      site_id: sites[0]?.id || 0,
      asset_type_id: assetTypes[0]?.id || 0,
    });
  }

  function startEdit(item: TenantBusinessAsset) {
    setEditingId(item.id);
    setFeedback(null);
    setError(null);
    setForm({
      site_id: item.site_id,
      asset_type_id: item.asset_type_id,
      name: item.name,
      asset_code: item.asset_code,
      serial_number: item.serial_number,
      manufacturer: item.manufacturer,
      model: item.model,
      asset_status: item.asset_status,
      installed_at: item.installed_at,
      last_service_at: item.last_service_at,
      warranty_until: item.warranty_until,
      location_note: item.location_note,
      technical_notes: item.technical_notes,
      is_active: item.is_active,
      sort_order: item.sort_order,
    });
  }

  async function handleSubmit() {
    if (!session?.accessToken) return;
    const payload: TenantBusinessAssetWriteRequest = {
      ...form,
      site_id: Number(form.site_id),
      asset_type_id: Number(form.asset_type_id),
      name: form.name.trim(),
      asset_code: normalizeNullable(form.asset_code),
      serial_number: normalizeNullable(form.serial_number),
      manufacturer: normalizeNullable(form.manufacturer),
      model: normalizeNullable(form.model),
      asset_status: form.asset_status.trim().toLowerCase(),
      location_note: normalizeNullable(form.location_note),
      technical_notes: normalizeNullable(form.technical_notes),
    };
    setIsSubmitting(true);
    setError(null);
    try {
      const response = editingId
        ? await updateTenantBusinessAsset(session.accessToken, editingId, payload)
        : await createTenantBusinessAsset(session.accessToken, payload);
      setFeedback(response.message);
      startCreate();
      await loadItems();
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleToggle(item: TenantBusinessAsset) {
    if (!session?.accessToken) return;
    try {
      const response = await updateTenantBusinessAssetStatus(session.accessToken, item.id, !item.is_active);
      setFeedback(response.message);
      await loadItems();
    } catch (rawError) {
      setError(rawError as ApiError);
    }
  }

  async function handleDelete(item: TenantBusinessAsset) {
    if (!session?.accessToken) return;
    const confirmed = window.confirm(
      language === "es"
        ? `Eliminar el activo "${item.name}". ¿Continuar?`
        : `Delete asset "${item.name}". Continue?`
    );
    if (!confirmed) return;
    try {
      const response = await deleteTenantBusinessAsset(session.accessToken, item.id);
      if (editingId === item.id) startCreate();
      setFeedback(response.message);
      await loadItems();
    } catch (rawError) {
      setError(rawError as ApiError);
    }
  }

  return (
    <BusinessCoreCatalogPage
      titleEs="Activos"
      titleEn="Assets"
      descriptionEs="Inventario operativo de equipos y activos instalados sobre sitios del tenant."
      descriptionEn="Operational inventory of equipment and assets installed on tenant sites."
      helpEs="Relaciona cada activo con un sitio y un tipo de activo para dejar listo el terreno de IoT y mantención futura."
      helpEn="Relate each asset to a site and an asset type to prepare the ground for IoT and future maintenance."
      loadingLabelEs="Cargando activos..."
      loadingLabelEn="Loading assets..."
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
        {
          key: "site_id",
          labelEs: "Sitio",
          labelEn: "Site",
          type: "select",
          options: sites.map((site) => ({
            value: String(site.id),
            label: siteById.get(site.id)?.address_line || site.name || `#${site.id}`,
          })),
        },
        {
          key: "asset_type_id",
          labelEs: "Tipo de activo",
          labelEn: "Asset type",
          type: "select",
          options: assetTypes.map((type) => ({
            value: String(type.id),
            label: assetTypeById.get(type.id)?.name || `#${type.id}`,
          })),
        },
        { key: "name", labelEs: "Nombre", labelEn: "Name" },
        { key: "asset_status", labelEs: "Estado de activo", labelEn: "Asset status" },
        { key: "asset_code", labelEs: "Código interno", labelEn: "Internal code" },
        { key: "serial_number", labelEs: "Serie", labelEn: "Serial" },
        { key: "manufacturer", labelEs: "Fabricante", labelEn: "Manufacturer" },
        { key: "model", labelEs: "Modelo", labelEn: "Model" },
        { key: "installed_at", labelEs: "Instalado en", labelEn: "Installed at" },
        { key: "last_service_at", labelEs: "Último servicio", labelEn: "Last service" },
        { key: "warranty_until", labelEs: "Garantía hasta", labelEn: "Warranty until" },
        { key: "location_note", labelEs: "Ubicación", labelEn: "Location" },
        { key: "technical_notes", labelEs: "Notas técnicas", labelEn: "Technical notes", type: "textarea" },
        { key: "is_active", labelEs: "Activo", labelEn: "Active", type: "checkbox" },
      ]}
      renderEditorExtra={({ language: currentLanguage }) => (
        <div className="form-text">
          {currentLanguage === "es"
            ? "El código interno queda reservado para integración y búsqueda técnica."
            : "The internal code remains reserved for integration and technical lookup."}
        </div>
      )}
      onFormChange={setForm}
      columns={[
        {
          key: "asset",
          headerEs: "Activo",
          headerEn: "Asset",
          render: (item) => (
            <div>
              <div className="business-core-cell__title">{item.name}</div>
              <div className="business-core-cell__meta">{item.site_label}</div>
              <div className="business-core-cell__meta">{item.asset_type_name}</div>
            </div>
          ),
        },
        {
          key: "serial",
          headerEs: "Serie",
          headerEn: "Serial",
          render: (item) => item.serial_number || "—",
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
