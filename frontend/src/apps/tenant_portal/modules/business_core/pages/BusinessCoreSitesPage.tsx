import { useEffect, useMemo, useState } from "react";
import { AppBadge } from "../../../../../design-system/AppBadge";
import { AppToolbar } from "../../../../../design-system/AppLayout";
import { useLanguage } from "../../../../../store/language-context";
import { useTenantAuth } from "../../../../../store/tenant-auth-context";
import type { ApiError } from "../../../../../types";
import { BusinessCoreCatalogPage } from "../components/common/BusinessCoreCatalogPage";
import {
  getTenantBusinessClients,
  type TenantBusinessClient,
} from "../services/clientsService";
import {
  getTenantBusinessOrganizations,
  type TenantBusinessOrganization,
} from "../services/organizationsService";
import {
  createTenantBusinessSite,
  deleteTenantBusinessSite,
  getTenantBusinessSites,
  updateTenantBusinessSite,
  updateTenantBusinessSiteStatus,
  type TenantBusinessSite,
  type TenantBusinessSiteWriteRequest,
} from "../services/sitesService";
import {
  buildAddressLine,
  getVisibleAddressLabel,
  parseAddressLine,
} from "../utils/addressPresentation";

type SiteForm = TenantBusinessSiteWriteRequest & {
  street: string;
  streetNumber: string;
};

function buildDefaultForm(): SiteForm {
  return {
    client_id: 0,
    name: "",
    site_code: null,
    address_line: null,
    street: "",
    streetNumber: "",
    commune: null,
    city: null,
    region: null,
    country_code: "CL",
    reference_notes: null,
    is_active: true,
    sort_order: 100,
  };
}

function normalizeNullable(value: string | null): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : null;
}

export function BusinessCoreSitesPage() {
  const { session } = useTenantAuth();
  const { language } = useLanguage();
  const [sites, setSites] = useState<TenantBusinessSite[]>([]);
  const [clients, setClients] = useState<TenantBusinessClient[]>([]);
  const [organizations, setOrganizations] = useState<TenantBusinessOrganization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [form, setForm] = useState<SiteForm>(buildDefaultForm());

  const clientById = useMemo(
    () => new Map(clients.map((client) => [client.id, client])),
    [clients]
  );
  const organizationById = useMemo(
    () => new Map(organizations.map((organization) => [organization.id, organization])),
    [organizations]
  );

  async function loadData() {
    if (!session?.accessToken) {
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const [sitesResponse, clientsResponse, organizationsResponse] = await Promise.all([
        getTenantBusinessSites(session.accessToken),
        getTenantBusinessClients(session.accessToken, { includeInactive: false }),
        getTenantBusinessOrganizations(session.accessToken, { includeInactive: false }),
      ]);
      setSites(sitesResponse.data);
      setClients(clientsResponse.data);
      setOrganizations(organizationsResponse.data);
      setForm((current) => ({
        ...current,
        client_id: current.client_id || clientsResponse.data[0]?.id || 0,
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
      client_id: clients[0]?.id || 0,
    });
  }

  function startEdit(site: TenantBusinessSite) {
    const parsedAddress = parseAddressLine(site.address_line);
    setEditingId(site.id);
    setFeedback(null);
    setError(null);
    setForm({
      client_id: site.client_id,
      name: site.name,
      site_code: site.site_code,
      address_line: site.address_line,
      street: parsedAddress.street,
      streetNumber: parsedAddress.streetNumber,
      commune: site.commune,
      city: site.city,
      region: site.region,
      country_code: site.country_code,
      reference_notes: site.reference_notes,
      is_active: site.is_active,
      sort_order: site.sort_order,
    });
  }

  async function handleSubmit() {
    if (!session?.accessToken) {
      return;
    }
    const composedAddressLine = buildAddressLine(form.street, form.streetNumber);
    const payload: TenantBusinessSiteWriteRequest = {
      ...form,
      client_id: Number(form.client_id),
      name:
        composedAddressLine ||
        (language === "es" ? "Dirección principal" : "Primary address"),
      site_code: null,
      address_line: normalizeNullable(composedAddressLine),
      commune: normalizeNullable(form.commune),
      city: normalizeNullable(form.city),
      region: normalizeNullable(form.region),
      country_code: normalizeNullable(form.country_code) ?? "CL",
      reference_notes: normalizeNullable(form.reference_notes),
    };
    setIsSubmitting(true);
    setError(null);
    try {
      const response = editingId
        ? await updateTenantBusinessSite(session.accessToken, editingId, payload)
        : await createTenantBusinessSite(session.accessToken, payload);
      setFeedback(response.message);
      startCreate();
      await loadData();
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleToggle(site: TenantBusinessSite) {
    if (!session?.accessToken) {
      return;
    }
    try {
      const response = await updateTenantBusinessSiteStatus(
        session.accessToken,
        site.id,
        !site.is_active
      );
      setFeedback(response.message);
      await loadData();
    } catch (rawError) {
      setError(rawError as ApiError);
    }
  }

  async function handleDelete(site: TenantBusinessSite) {
    if (!session?.accessToken) {
      return;
    }
    const confirmed = window.confirm(
      language === "es"
        ? `Eliminar el sitio "${site.name}" del core compartido. ¿Continuar?`
        : `Delete site "${site.name}" from the shared core. Continue?`
    );
    if (!confirmed) {
      return;
    }
    try {
      const response = await deleteTenantBusinessSite(session.accessToken, site.id);
      if (editingId === site.id) {
        startCreate();
      }
      setFeedback(response.message);
      await loadData();
    } catch (rawError) {
      setError(rawError as ApiError);
    }
  }

  return (
    <BusinessCoreCatalogPage
      titleEs="Direcciones de clientes"
      titleEn="Client addresses"
      descriptionEs="Vista administrativa de direcciones operativas. La lectura principal debería hacerse desde la ficha del cliente."
      descriptionEn="Administrative view of operating addresses. Primary reading should happen from the client detail page."
      helpEs="Internamente sigue siendo una entidad `site`, pero funcionalmente representa una dirección del cliente. El código técnico queda oculto y esta vista debe usarse para mantenimiento administrativo; la lectura diaria debería hacerse desde la ficha del cliente."
      helpEn="Internally this is still a `site` entity, but functionally it represents a client address. The technical code stays hidden and this view should be used for administration; day-to-day reading should happen from the client detail page."
      loadingLabelEs="Cargando direcciones..."
      loadingLabelEn="Loading addresses..."
      isLoading={isLoading}
      isSubmitting={isSubmitting}
      rows={sites}
      error={error}
      feedback={feedback}
      editingId={editingId}
      form={form}
      onFormChange={(next) =>
        setForm({
          ...next,
          client_id: Number(next.client_id),
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
          options: clients.map((client) => ({
            value: String(client.id),
            label:
              organizationById.get(client.organization_id)?.name ||
              organizationById.get(client.organization_id)?.legal_name ||
              `${language === "es" ? "Cliente" : "Client"} #${client.id}`,
          })),
        },
        { key: "street", labelEs: "Calle", labelEn: "Street" },
        { key: "streetNumber", labelEs: "Número", labelEn: "Number" },
        { key: "commune", labelEs: "Comuna", labelEn: "Commune" },
        { key: "city", labelEs: "Ciudad", labelEn: "City" },
        { key: "region", labelEs: "Región", labelEn: "Region" },
        { key: "country_code", labelEs: "País", labelEn: "Country" },
        { key: "is_active", labelEs: "Activo", labelEn: "Active", type: "checkbox" },
        { key: "reference_notes", labelEs: "Notas", labelEn: "Notes", type: "textarea" },
      ]}
      columns={[
        {
          key: "site",
          headerEs: "Dirección",
          headerEn: "Address",
          render: (site, currentLanguage) => (
            <div>
              <div className="business-core-cell__title">
                {getVisibleAddressLabel(site)}
              </div>
              <div className="business-core-cell__meta">
                {[site.commune, site.city, site.region].filter(Boolean).join(", ") ||
                  (currentLanguage === "es" ? "sin ubicación" : "no location")}
              </div>
            </div>
          ),
        },
        {
          key: "client",
          headerEs: "Cliente",
          headerEn: "Client",
          render: (site, currentLanguage) =>
            organizationById.get(clientById.get(site.client_id)?.organization_id ?? -1)?.name ||
            organizationById.get(clientById.get(site.client_id)?.organization_id ?? -1)?.legal_name ||
            `${currentLanguage === "es" ? "Cliente" : "Client"} #${site.client_id}`,
        },
        {
          key: "status",
          headerEs: "Estado",
          headerEn: "Status",
          render: (site, currentLanguage) => (
            <AppBadge tone={site.is_active ? "success" : "warning"}>
              {site.is_active
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
          render: (site, currentLanguage) => (
            <AppToolbar compact>
              <button className="btn btn-sm btn-outline-primary" type="button" onClick={() => startEdit(site)}>
                {currentLanguage === "es" ? "Editar" : "Edit"}
              </button>
              <button className="btn btn-sm btn-outline-secondary" type="button" onClick={() => void handleToggle(site)}>
                {site.is_active
                  ? currentLanguage === "es"
                    ? "Desactivar"
                    : "Deactivate"
                  : currentLanguage === "es"
                    ? "Activar"
                    : "Activate"}
              </button>
              <button className="btn btn-sm btn-outline-danger" type="button" onClick={() => void handleDelete(site)}>
                {currentLanguage === "es" ? "Eliminar" : "Delete"}
              </button>
            </AppToolbar>
          ),
        },
      ]}
    />
  );
}
