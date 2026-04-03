import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AppBadge } from "../../../../../design-system/AppBadge";
import { AppToolbar } from "../../../../../design-system/AppLayout";
import { useLanguage } from "../../../../../store/language-context";
import { useTenantAuth } from "../../../../../store/tenant-auth-context";
import type { ApiError } from "../../../../../types";
import { MaintenanceCatalogPage } from "../components/common/MaintenanceCatalogPage";
import {
  createTenantMaintenanceInstallation,
  deleteTenantMaintenanceInstallation,
  getTenantMaintenanceInstallations,
  updateTenantMaintenanceInstallation,
  updateTenantMaintenanceInstallationStatus,
  type TenantMaintenanceInstallation,
  type TenantMaintenanceInstallationWriteRequest,
} from "../services/installationsService";
import {
  getTenantMaintenanceEquipmentTypes,
  type TenantMaintenanceEquipmentType,
} from "../services/equipmentTypesService";
import {
  getTenantBusinessSites,
  type TenantBusinessSite,
} from "../../business_core/services/sitesService";
import {
  getTenantBusinessClients,
  type TenantBusinessClient,
} from "../../business_core/services/clientsService";
import { stripLegacyVisibleText } from "../../../../../utils/legacyVisibleText";

function buildDefaultForm(): TenantMaintenanceInstallationWriteRequest {
  return {
    site_id: 0,
    equipment_type_id: 0,
    name: "",
    serial_number: null,
    manufacturer: null,
    model: null,
    installed_at: null,
    last_service_at: null,
    warranty_until: null,
    installation_status: "active",
    location_note: null,
    technical_notes: null,
    is_active: true,
    sort_order: 100,
  };
}

function normalizeNullable(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : null;
}

export function MaintenanceInstallationsPage() {
  const { session } = useTenantAuth();
  const { language } = useLanguage();
  const [searchParams] = useSearchParams();
  const [rows, setRows] = useState<TenantMaintenanceInstallation[]>([]);
  const [sites, setSites] = useState<TenantBusinessSite[]>([]);
  const [clients, setClients] = useState<TenantBusinessClient[]>([]);
  const [equipmentTypes, setEquipmentTypes] = useState<TenantMaintenanceEquipmentType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [form, setForm] = useState<TenantMaintenanceInstallationWriteRequest>(
    buildDefaultForm()
  );
  const requestedClientId = Number(searchParams.get("clientId") || 0);
  const requestedSiteId = Number(searchParams.get("siteId") || 0);

  const siteById = useMemo(() => new Map(sites.map((site) => [site.id, site])), [sites]);
  const clientById = useMemo(
    () => new Map(clients.map((client) => [client.id, client])),
    [clients]
  );
  const equipmentTypeById = useMemo(
    () => new Map(equipmentTypes.map((item) => [item.id, item])),
    [equipmentTypes]
  );
  const visibleRows = useMemo(
    () =>
      requestedClientId > 0
        ? rows.filter((row) => {
            const site = siteById.get(row.site_id);
            return site?.client_id === requestedClientId;
          })
        : rows,
    [requestedClientId, rows, siteById]
  );

  async function loadData() {
    if (!session?.accessToken) {
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const [installationsResponse, sitesResponse, clientsResponse, equipmentTypesResponse] =
        await Promise.all([
          getTenantMaintenanceInstallations(session.accessToken),
          getTenantBusinessSites(session.accessToken, { includeInactive: false }),
          getTenantBusinessClients(session.accessToken, { includeInactive: false }),
          getTenantMaintenanceEquipmentTypes(session.accessToken, { includeInactive: false }),
        ]);
      setRows(installationsResponse.data);
      setSites(sitesResponse.data);
      setClients(clientsResponse.data);
      setEquipmentTypes(equipmentTypesResponse.data);
      setForm((current) => ({
        ...current,
        site_id: current.site_id || requestedSiteId || sitesResponse.data[0]?.id || 0,
        equipment_type_id:
          current.equipment_type_id || equipmentTypesResponse.data[0]?.id || 0,
      }));
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
    setForm({
      ...buildDefaultForm(),
      site_id: sites[0]?.id || 0,
      equipment_type_id: equipmentTypes[0]?.id || 0,
    });
  }

  function startEdit(item: TenantMaintenanceInstallation) {
    setEditingId(item.id);
    setFeedback(null);
    setError(null);
    setForm({
      site_id: item.site_id,
      equipment_type_id: item.equipment_type_id,
      name: item.name,
      serial_number: item.serial_number,
      manufacturer: item.manufacturer,
      model: item.model,
      installed_at: item.installed_at,
      last_service_at: item.last_service_at,
      warranty_until: item.warranty_until,
      installation_status: item.installation_status,
      location_note: item.location_note,
      technical_notes: stripLegacyVisibleText(item.technical_notes),
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
    const payload: TenantMaintenanceInstallationWriteRequest = {
      site_id: Number(form.site_id),
      equipment_type_id: Number(form.equipment_type_id),
      name: form.name.trim(),
      serial_number: normalizeNullable(form.serial_number),
      manufacturer: normalizeNullable(form.manufacturer),
      model: normalizeNullable(form.model),
      installed_at: normalizeNullable(form.installed_at),
      last_service_at: normalizeNullable(form.last_service_at),
      warranty_until: normalizeNullable(form.warranty_until),
      installation_status: form.installation_status.trim().toLowerCase() || "active",
      location_note: normalizeNullable(form.location_note),
      technical_notes: stripLegacyVisibleText(normalizeNullable(form.technical_notes)),
      is_active: form.is_active,
      sort_order: Number(form.sort_order),
    };
    try {
      const response = editingId
        ? await updateTenantMaintenanceInstallation(
            session.accessToken,
            editingId,
            payload
          )
        : await createTenantMaintenanceInstallation(session.accessToken, payload);
      setFeedback(response.message);
      startCreate();
      await loadData();
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleToggle(item: TenantMaintenanceInstallation) {
    if (!session?.accessToken) {
      return;
    }
    try {
      const response = await updateTenantMaintenanceInstallationStatus(
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

  async function handleDelete(item: TenantMaintenanceInstallation) {
    if (!session?.accessToken) {
      return;
    }
    const confirmed = window.confirm(
      language === "es"
        ? `Eliminar la instalación "${item.name}" solo funcionará si no tiene mantenciones asociadas. ¿Continuar?`
        : `Delete installation "${item.name}" only if it has no linked work orders. Continue?`
    );
    if (!confirmed) {
      return;
    }
    try {
      const response = await deleteTenantMaintenanceInstallation(
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
      titleEs="Instalaciones"
      titleEn="Installations"
      descriptionEs="Ficha técnica instalada por sitio para que las mantenciones tengan contexto real y no solo un cliente genérico."
      descriptionEn="Installed technical record by site so work orders have real context instead of only a generic client."
      helpEs="Cada instalación debería representar un equipo o sistema concreto en un sitio específico. Si un cliente tiene varios portones, bombas o sensores, aquí es donde se separan correctamente."
      helpEn="Each installation should represent a concrete asset or system in a specific site. If a client has multiple gates, pumps, or sensors, this is where they are separated correctly."
      loadingLabelEs="Cargando instalaciones..."
      loadingLabelEn="Loading installations..."
      isLoading={isLoading}
      isSubmitting={isSubmitting}
      rows={visibleRows}
      error={error}
      feedback={feedback}
      editingId={editingId}
      form={form}
      onFormChange={(next) =>
        setForm({
          ...next,
          site_id: Number(next.site_id),
          equipment_type_id: Number(next.equipment_type_id),
        })
      }
      onSubmit={handleSubmit}
      onCancel={startCreate}
      onReload={loadData}
      onNew={startCreate}
      fields={[
        {
          key: "site_id",
          labelEs: "Sitio",
          labelEn: "Site",
          type: "select",
          options: sites.map((site) => ({
            value: String(site.id),
            label: site.name,
          })),
        },
        {
          key: "equipment_type_id",
          labelEs: "Tipo de equipo",
          labelEn: "Equipment type",
          type: "select",
          options: equipmentTypes.map((item) => ({
            value: String(item.id),
            label: item.name,
          })),
        },
        { key: "name", labelEs: "Nombre", labelEn: "Name" },
        { key: "serial_number", labelEs: "Serie", labelEn: "Serial number" },
        { key: "manufacturer", labelEs: "Fabricante", labelEn: "Manufacturer" },
        { key: "model", labelEs: "Modelo", labelEn: "Model" },
        {
          key: "installed_at",
          labelEs: "Instalado en",
          labelEn: "Installed at",
          type: "datetime-local",
        },
        {
          key: "last_service_at",
          labelEs: "Último servicio",
          labelEn: "Last service",
          type: "datetime-local",
        },
        {
          key: "warranty_until",
          labelEs: "Garantía hasta",
          labelEn: "Warranty until",
          type: "datetime-local",
        },
        {
          key: "installation_status",
          labelEs: "Estado técnico",
          labelEn: "Technical status",
          type: "select",
          options: [
            { value: "active", label: language === "es" ? "Activa" : "Active" },
            {
              value: "maintenance",
              label: language === "es" ? "En mantención" : "In maintenance",
            },
            { value: "retired", label: language === "es" ? "Retirada" : "Retired" },
          ],
        },
        {
          key: "sort_order",
          labelEs: "Orden",
          labelEn: "Sort order",
          type: "number",
          min: 0,
        },
        {
          key: "is_active",
          labelEs: "Activa en catálogo",
          labelEn: "Catalog active",
          type: "checkbox",
        },
        {
          key: "location_note",
          labelEs: "Ubicación",
          labelEn: "Location note",
          type: "textarea",
        },
        {
          key: "technical_notes",
          labelEs: "Notas técnicas",
          labelEn: "Technical notes",
          type: "textarea",
        },
      ]}
      columns={[
        {
          key: "installation",
          headerEs: "Instalación",
          headerEn: "Installation",
          render: (item, currentLanguage) => (
            <div>
              <div className="maintenance-cell__title">{item.name}</div>
              <div className="maintenance-cell__meta">
                {item.serial_number ||
                  (currentLanguage === "es" ? "sin serie" : "no serial")}
              </div>
            </div>
          ),
        },
        {
          key: "site",
          headerEs: "Sitio",
          headerEn: "Site",
          render: (item, currentLanguage) => {
            const site = siteById.get(item.site_id);
            const client = site ? clientById.get(site.client_id) : null;
            return (
              <div>
                <div className="maintenance-cell__title">
                  {site?.name || (currentLanguage === "es" ? "Sitio no encontrado" : "Site not found")}
                </div>
                <div className="maintenance-cell__meta">
                  {client?.client_code || (currentLanguage === "es" ? "sin cliente" : "no client")}
                </div>
              </div>
            );
          },
        },
        {
          key: "type",
          headerEs: "Tipo",
          headerEn: "Type",
          render: (item) => equipmentTypeById.get(item.equipment_type_id)?.name || `#${item.equipment_type_id}`,
        },
        {
          key: "status",
          headerEs: "Estado",
          headerEn: "Status",
          render: (item, currentLanguage) => (
            <AppBadge tone={item.is_active ? "success" : "neutral"}>
              {item.is_active
                ? currentLanguage === "es"
                  ? "Activa"
                  : "Active"
                : currentLanguage === "es"
                  ? "Inactiva"
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
