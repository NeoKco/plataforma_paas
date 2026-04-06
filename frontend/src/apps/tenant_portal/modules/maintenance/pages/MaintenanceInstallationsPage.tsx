import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AppBadge } from "../../../../../design-system/AppBadge";
import { AppToolbar } from "../../../../../design-system/AppLayout";
import { pickLocalizedText, useLanguage } from "../../../../../store/language-context";
import { useTenantAuth } from "../../../../../store/tenant-auth-context";
import type { ApiError } from "../../../../../types";
import { MaintenanceCatalogPage } from "../components/common/MaintenanceCatalogPage";
import { MaintenanceInstallationTechnicalRecordModal } from "../components/common/MaintenanceInstallationTechnicalRecordModal";
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
import {
  getTenantBusinessOrganizations,
  type TenantBusinessOrganization,
} from "../../business_core/services/organizationsService";
import { getVisibleAddressLabel } from "../../business_core/utils/addressPresentation";
import { stripLegacyVisibleText } from "../../../../../utils/legacyVisibleText";

type MaintenanceInstallationForm = TenantMaintenanceInstallationWriteRequest & {
  client_id: number;
};

function buildDefaultForm(): MaintenanceInstallationForm {
  return {
    client_id: 0,
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

function localizeDynamic(language: string, es: string, en: string): string {
  return pickLocalizedText(language === "en" ? "en" : "es", { es, en });
}

export function MaintenanceInstallationsPage() {
  const { session, effectiveTimeZone } = useTenantAuth();
  const { language } = useLanguage();
  const t = (es: string, en: string) => pickLocalizedText(language, { es, en });
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [rows, setRows] = useState<TenantMaintenanceInstallation[]>([]);
  const [sites, setSites] = useState<TenantBusinessSite[]>([]);
  const [clients, setClients] = useState<TenantBusinessClient[]>([]);
  const [organizations, setOrganizations] = useState<TenantBusinessOrganization[]>([]);
  const [equipmentTypes, setEquipmentTypes] = useState<TenantMaintenanceEquipmentType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [form, setForm] = useState<MaintenanceInstallationForm>(buildDefaultForm());
  const [technicalRecordInstallation, setTechnicalRecordInstallation] =
    useState<TenantMaintenanceInstallation | null>(null);
  const [openCreateSignal, setOpenCreateSignal] = useState<string | null>(null);
  const [requestedCreateHandled, setRequestedCreateHandled] = useState(false);
  const requestedClientId = Number(searchParams.get("clientId") || 0);
  const requestedSiteId = Number(searchParams.get("siteId") || 0);
  const requestedMode = searchParams.get("mode");

  const siteById = useMemo(() => new Map(sites.map((site) => [site.id, site])), [sites]);
  const clientById = useMemo(
    () => new Map(clients.map((client) => [client.id, client])),
    [clients]
  );
  const organizationById = useMemo(
    () => new Map(organizations.map((organization) => [organization.id, organization])),
    [organizations]
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
  const filteredSites = useMemo(
    () =>
      form.client_id > 0
        ? sites.filter((site) => site.client_id === Number(form.client_id))
        : sites,
    [form.client_id, sites]
  );

  async function loadData() {
    if (!session?.accessToken) {
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const [installationsResponse, sitesResponse, clientsResponse, organizationsResponse, equipmentTypesResponse] =
        await Promise.all([
          getTenantMaintenanceInstallations(session.accessToken),
          getTenantBusinessSites(session.accessToken, { includeInactive: false }),
          getTenantBusinessClients(session.accessToken, { includeInactive: false }),
          getTenantBusinessOrganizations(session.accessToken, { includeInactive: false }),
          getTenantMaintenanceEquipmentTypes(session.accessToken, { includeInactive: false }),
        ]);
      setRows(installationsResponse.data);
      setSites(sitesResponse.data);
      setClients(clientsResponse.data);
      setOrganizations(organizationsResponse.data);
      setEquipmentTypes(equipmentTypesResponse.data);
      const initialClientId =
        requestedClientId ||
        sitesResponse.data.find((site) => site.id === requestedSiteId)?.client_id ||
        clientsResponse.data[0]?.id ||
        0;
      const candidateSites = sitesResponse.data.filter(
        (site) => site.client_id === initialClientId
      );
      const initialSiteId =
        (requestedSiteId > 0 &&
        candidateSites.some((site) => site.id === requestedSiteId)
          ? requestedSiteId
          : 0) ||
        candidateSites[0]?.id ||
        0;
      setForm((current) => ({
        ...current,
        client_id: current.client_id || initialClientId,
        site_id: current.site_id || initialSiteId,
        equipment_type_id:
          current.equipment_type_id || equipmentTypesResponse.data[0]?.id || 0,
      }));
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsLoading(false);
    }
  }

  function getClientDisplayName(clientId: number): string {
    const client = clientById.get(clientId);
    const organization = organizationById.get(client?.organization_id ?? -1);
    return (
      stripLegacyVisibleText(organization?.name) ||
      stripLegacyVisibleText(organization?.legal_name) ||
      t("Cliente sin nombre", "Unnamed client")
    );
  }

  function getSiteDisplayName(site: TenantBusinessSite | undefined): string {
    if (!site) {
      return t("Dirección sin registrar", "Missing address");
    }
    const base =
      stripLegacyVisibleText(getVisibleAddressLabel(site)) ||
      stripLegacyVisibleText(site.name) ||
      t("Dirección sin nombre", "Unnamed address");
    const locality = [site.commune, site.city, site.region]
      .map((value) => stripLegacyVisibleText(value))
      .filter((value): value is string => Boolean(value))
      .join(", ");
    return locality ? `${base} · ${locality}` : base;
  }

  useEffect(() => {
    void loadData();
  }, [session?.accessToken]);

  useEffect(() => {
    if (!filteredSites.some((site) => site.id === Number(form.site_id))) {
      setForm((current) => ({
        ...current,
        site_id: filteredSites[0]?.id || 0,
      }));
    }
  }, [filteredSites, form.site_id]);

  useEffect(() => {
    if (
      requestedMode !== "create" ||
      requestedCreateHandled ||
      isLoading ||
      clients.length === 0 ||
      equipmentTypes.length === 0
    ) {
      return;
    }
    startCreate();
    setOpenCreateSignal(`installation-create:${requestedClientId}:${requestedSiteId}`);
    setRequestedCreateHandled(true);
  }, [
    requestedClientId,
    requestedCreateHandled,
    requestedMode,
    requestedSiteId,
    isLoading,
    clients,
    equipmentTypes,
  ]);

  function startCreate() {
    setEditingId(null);
    setFeedback(null);
    setError(null);
    const clientId =
      requestedClientId ||
      sites.find((site) => site.id === requestedSiteId)?.client_id ||
      clients[0]?.id ||
      0;
    const candidateSites = sites.filter((site) => site.client_id === clientId);
    const siteId =
      (requestedSiteId > 0 &&
      candidateSites.some((site) => site.id === requestedSiteId)
        ? requestedSiteId
        : 0) ||
      candidateSites[0]?.id ||
      0;
    setForm({
      ...buildDefaultForm(),
      client_id: clientId,
      site_id: siteId,
      equipment_type_id: equipmentTypes[0]?.id || 0,
    });
  }

  function startEdit(item: TenantMaintenanceInstallation) {
    setEditingId(item.id);
    setFeedback(null);
    setError(null);
    const site = siteById.get(item.site_id);
    setForm({
      client_id: site?.client_id || 0,
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
      sort_order: 100,
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
      sort_order: 100,
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
      t(
        `Eliminar la instalación "${item.name}" solo funcionará si no tiene mantenciones asociadas. ¿Continuar?`,
        `Delete installation "${item.name}" only if it has no linked work orders. Continue?`
      )
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

  function openTechnicalRecord(item: TenantMaintenanceInstallation) {
    setTechnicalRecordInstallation(item);
  }

  function closeTechnicalRecord() {
    setTechnicalRecordInstallation(null);
  }

  return (
    <>
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
      openCreateSignal={openCreateSignal}
      onFormChange={(next) =>
        setForm({
          ...next,
          client_id: Number(next.client_id),
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
          key: "client_id",
          labelEs: "Cliente",
          labelEn: "Client",
          type: "select",
          disabled: requestedClientId > 0,
          options: clients.map((client) => ({
            value: String(client.id),
            label: getClientDisplayName(client.id),
          })),
        },
        {
          key: "site_id",
          labelEs: "Dirección del cliente",
          labelEn: "Client address",
          type: "select",
          options: filteredSites.map((site) => ({
            value: String(site.id),
            label: getSiteDisplayName(site),
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
            { value: "active", label: t("Activa", "Active") },
            {
              value: "maintenance",
              label: t("En mantención", "In maintenance"),
            },
            { value: "retired", label: t("Retirada", "Retired") },
          ],
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
                  localizeDynamic(currentLanguage, "sin serie", "no serial")}
              </div>
            </div>
          ),
        },
        {
          key: "client",
          headerEs: "Cliente",
          headerEn: "Client",
          render: (item, currentLanguage) => {
            const site = siteById.get(item.site_id);
            return (
              <div>
                <div className="maintenance-cell__title">
                  {site
                    ? getClientDisplayName(site.client_id)
                    : localizeDynamic(currentLanguage, "Cliente no encontrado", "Client not found")}
                </div>
                <div className="maintenance-cell__meta">
                  {site
                    ? getSiteDisplayName(site)
                    : localizeDynamic(currentLanguage, "sin dirección", "no address")}
                </div>
              </div>
            );
          },
        },
        {
          key: "address",
          headerEs: "Dirección",
          headerEn: "Address",
          render: (item, currentLanguage) => {
            const site = siteById.get(item.site_id);
            return site
              ? getSiteDisplayName(site)
              : localizeDynamic(currentLanguage, "sin dirección", "no address");
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
                ? localizeDynamic(currentLanguage, "Activa", "Active")
                : localizeDynamic(currentLanguage, "Inactiva", "Inactive")}
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
                className="btn btn-sm btn-outline-success"
                type="button"
                onClick={() => navigate(`/tenant-portal/business-core/assets?siteId=${item.site_id}`)}
              >
                {localizeDynamic(currentLanguage, "Activos", "Assets")}
              </button>
              <button
                className="btn btn-sm btn-outline-info"
                type="button"
                onClick={() => openTechnicalRecord(item)}
              >
                {localizeDynamic(currentLanguage, "Expediente", "Record")}
              </button>
              <button
                className="btn btn-sm btn-outline-primary"
                type="button"
                onClick={() => startEdit(item)}
              >
                {localizeDynamic(currentLanguage, "Editar", "Edit")}
              </button>
              <button
                className="btn btn-sm btn-outline-secondary"
                type="button"
                onClick={() => void handleToggle(item)}
              >
                {item.is_active
                  ? localizeDynamic(currentLanguage, "Desactivar", "Deactivate")
                  : localizeDynamic(currentLanguage, "Activar", "Activate")}
              </button>
              <button
                className="btn btn-sm btn-outline-danger"
                type="button"
                onClick={() => void handleDelete(item)}
              >
                {localizeDynamic(currentLanguage, "Eliminar", "Delete")}
              </button>
            </AppToolbar>
          ),
        },
      ]}
      />

      <MaintenanceInstallationTechnicalRecordModal
        accessToken={session?.accessToken}
        installation={technicalRecordInstallation}
        clientLabel={
          technicalRecordInstallation
            ? getClientDisplayName(siteById.get(technicalRecordInstallation.site_id)?.client_id || 0)
            : "—"
        }
        siteLabel={
          technicalRecordInstallation
            ? getSiteDisplayName(siteById.get(technicalRecordInstallation.site_id))
            : "—"
        }
        equipmentTypeLabel={
          technicalRecordInstallation
            ? equipmentTypeById.get(technicalRecordInstallation.equipment_type_id)?.name ||
              `#${technicalRecordInstallation.equipment_type_id}`
            : "—"
        }
        effectiveTimeZone={effectiveTimeZone}
        isOpen={Boolean(technicalRecordInstallation)}
        language={language}
        onClose={closeTechnicalRecord}
      />
    </>
  );
}
