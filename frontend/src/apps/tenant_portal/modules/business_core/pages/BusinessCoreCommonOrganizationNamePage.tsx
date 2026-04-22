import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../../../../components/common/PageHeader";
import { PanelCard } from "../../../../../components/common/PanelCard";
import { DataTableCard } from "../../../../../components/data-display/DataTableCard";
import { ErrorState } from "../../../../../components/feedback/ErrorState";
import { LoadingBlock } from "../../../../../components/feedback/LoadingBlock";
import { AppToolbar } from "../../../../../design-system/AppLayout";
import { getApiErrorDisplayMessage } from "../../../../../services/api";
import { pickLocalizedText, useLanguage } from "../../../../../store/language-context";
import { useTenantAuth } from "../../../../../store/tenant-auth-context";
import type { ApiError } from "../../../../../types";
import { BusinessCoreHelpBubble } from "../components/common/BusinessCoreHelpBubble";
import { BusinessCoreModuleNav } from "../components/common/BusinessCoreModuleNav";
import {
  getTenantBusinessClients,
  type TenantBusinessClient,
} from "../services/clientsService";
import {
  getTenantBusinessContacts,
  type TenantBusinessContact,
} from "../services/contactsService";
import {
  getTenantBusinessOrganizations,
  updateTenantBusinessOrganization,
  type TenantBusinessOrganization,
  type TenantBusinessOrganizationWriteRequest,
} from "../services/organizationsService";
import {
  getTenantBusinessSites,
  type TenantBusinessSite,
} from "../services/sitesService";

type ClientRow = {
  client: TenantBusinessClient;
  organization: TenantBusinessOrganization | null;
  contacts: TenantBusinessContact[];
  addresses: TenantBusinessSite[];
};

function normalizeNullable(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : null;
}

function buildOrganizationWritePayload(
  organization: TenantBusinessOrganization,
  overrides: Partial<TenantBusinessOrganization> = {}
): TenantBusinessOrganizationWriteRequest {
  return {
    name: overrides.name ?? organization.name,
    legal_name: overrides.legal_name ?? organization.legal_name,
    tax_id: overrides.tax_id ?? organization.tax_id,
    organization_kind: overrides.organization_kind ?? organization.organization_kind,
    phone: overrides.phone ?? organization.phone,
    email: overrides.email ?? organization.email,
    address_line: overrides.address_line ?? organization.address_line,
    commune: overrides.commune ?? organization.commune,
    city: overrides.city ?? organization.city,
    region: overrides.region ?? organization.region,
    country_code: overrides.country_code ?? organization.country_code,
    notes: overrides.notes ?? organization.notes,
    is_active: overrides.is_active ?? organization.is_active,
    sort_order: overrides.sort_order ?? organization.sort_order,
  };
}

function buildGoogleMapsUrl(address: TenantBusinessSite): string | null {
  const query = [
    address.address_line,
    address.commune,
    address.city,
    address.region,
    address.country_code || "Chile",
  ]
    .filter(Boolean)
    .join(", ")
    .trim();
  if (!query) {
    return null;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function BusinessCoreCommonOrganizationNamePage() {
  const { session } = useTenantAuth();
  const { language } = useLanguage();
  const t = (es: string, en: string) => pickLocalizedText(language, { es, en });
  const navigate = useNavigate();
  const [clients, setClients] = useState<TenantBusinessClient[]>([]);
  const [organizations, setOrganizations] = useState<TenantBusinessOrganization[]>([]);
  const [contacts, setContacts] = useState<TenantBusinessContact[]>([]);
  const [addresses, setAddresses] = useState<TenantBusinessSite[]>([]);
  const [search, setSearch] = useState("");
  const [selectedClientIds, setSelectedClientIds] = useState<number[]>([]);
  const [commonOrganizationName, setCommonOrganizationName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const organizationById = useMemo(
    () => new Map(organizations.map((organization) => [organization.id, organization])),
    [organizations]
  );

  const contactsByOrganizationId = useMemo(() => {
    const grouped = new Map<number, TenantBusinessContact[]>();
    contacts.forEach((contact) => {
      const current = grouped.get(contact.organization_id) ?? [];
      current.push(contact);
      grouped.set(contact.organization_id, current);
    });
    return grouped;
  }, [contacts]);

  const addressesByClientId = useMemo(() => {
    const grouped = new Map<number, TenantBusinessSite[]>();
    addresses.forEach((address) => {
      const current = grouped.get(address.client_id) ?? [];
      current.push(address);
      grouped.set(address.client_id, current);
    });
    return grouped;
  }, [addresses]);

  const clientRows = useMemo<ClientRow[]>(
    () =>
      clients.map((client) => ({
        client,
        organization: organizationById.get(client.organization_id) ?? null,
        contacts: contactsByOrganizationId.get(client.organization_id) ?? [],
        addresses: addressesByClientId.get(client.id) ?? [],
      })),
    [addressesByClientId, clients, contactsByOrganizationId, organizationById]
  );

  const pendingRows = useMemo(
    () =>
      clientRows.filter(
        (row) => !normalizeNullable(row.organization?.legal_name)
      ),
    [clientRows]
  );

  const pendingRowByClientId = useMemo(
    () => new Map(pendingRows.map((row) => [row.client.id, row])),
    [pendingRows]
  );

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return pendingRows;
    }
    return pendingRows.filter((row) => {
      const primaryContact = row.contacts.find((contact) => contact.is_primary) ?? row.contacts[0];
      const primaryAddress = row.addresses[0];
      const haystack = [
        row.organization?.name,
        row.organization?.tax_id,
        primaryContact?.full_name,
        primaryContact?.email,
        primaryContact?.phone,
        primaryAddress?.name,
        primaryAddress?.address_line,
        primaryAddress?.commune,
        primaryAddress?.city,
        primaryAddress?.region,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [pendingRows, search]);

  const selectedRows = useMemo(
    () =>
      selectedClientIds
        .map((clientId) => pendingRowByClientId.get(clientId) ?? null)
        .filter((row): row is ClientRow => Boolean(row)),
    [pendingRowByClientId, selectedClientIds]
  );

  async function loadData() {
    if (!session?.accessToken) {
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const [clientsResponse, organizationsResponse, contactsResponse, addressesResponse] =
        await Promise.all([
          getTenantBusinessClients(session.accessToken),
          getTenantBusinessOrganizations(session.accessToken, { includeInactive: true }),
          getTenantBusinessContacts(session.accessToken),
          getTenantBusinessSites(session.accessToken),
        ]);
      setClients(clientsResponse.data);
      setOrganizations(organizationsResponse.data);
      setContacts(contactsResponse.data);
      setAddresses(addressesResponse.data);
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [session?.accessToken]);

  useEffect(() => {
    setSelectedClientIds((current) => current.filter((clientId) => pendingRowByClientId.has(clientId)));
  }, [pendingRowByClientId]);

  function toggleClientSelection(clientId: number) {
    setSelectedClientIds((current) =>
      current.includes(clientId)
        ? current.filter((id) => id !== clientId)
        : [...current, clientId]
    );
  }

  function clearSelection() {
    setSelectedClientIds([]);
    setCommonOrganizationName("");
  }

  async function handleApplyCommonOrganizationName() {
    if (!session?.accessToken) {
      return;
    }
    if (selectedRows.length === 0) {
      setError(
        new Error(
          t(
            "Selecciona al menos un cliente pendiente para aplicar nombre común.",
            "Select at least one pending client to apply a common name."
          )
        ) as ApiError
      );
      return;
    }
    const finalOrganizationName = commonOrganizationName.trim();
    if (!finalOrganizationName) {
      setError(
        new Error(
          t(
            "Indica el nombre común final de la organización.",
            "Provide the final common organization name."
          )
        ) as ApiError
      );
      return;
    }

    const confirmed = window.confirm(
      t(
        `Aplicar "${finalOrganizationName}" a ${selectedRows.length} cliente(s) pendientes. Esto solo actualizará "Organización / Razón social" y luego esas filas saldrán de esta vista.`,
        `Apply "${finalOrganizationName}" to ${selectedRows.length} pending client(s). This only updates "Organization / legal name" and those rows will then leave this view.`
      )
    );
    if (!confirmed) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setFeedback(null);
    try {
      const processedOrganizationIds = new Set<number>();
      for (const row of selectedRows) {
        if (!row.organization || processedOrganizationIds.has(row.organization.id)) {
          continue;
        }
        processedOrganizationIds.add(row.organization.id);
        await updateTenantBusinessOrganization(
          session.accessToken,
          row.organization.id,
          buildOrganizationWritePayload(row.organization, {
            legal_name: finalOrganizationName,
          })
        );
      }
      setFeedback(
        t(
          `Nombre común aplicado en ${selectedRows.length} cliente(s). Las filas ya atendidas salen de esta vista.`,
          `Common name applied to ${selectedRows.length} client(s). Processed rows now leave this view.`
        )
      );
      clearSelection();
      await loadData();
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="d-grid gap-4">
      <PageHeader
        eyebrow={t("Core de negocio", "Business core")}
        icon="business-core"
        title={t("Nombre común de organización", "Common organization name")}
        description={
          t(
            "Vista dedicada para normalizar la organización común sin confundir la lectura principal de clientes.",
            "Dedicated view to normalize the common organization name without cluttering the main clients reading view."
          )
        }
        actions={
          <AppToolbar compact>
            <BusinessCoreHelpBubble
              label={t("Ayuda", "Help")}
              helpText={
                t(
                  "Aquí solo aparecen clientes que todavía no tienen cargado 'Organización / Razón social'. Cuando aplicas un nombre común, salen de esta lista.",
                  "Only clients without 'Organization / legal name' appear here. Once you apply a common name, they leave this list."
                )
              }
            />
            <button
              className="btn btn-outline-secondary"
              type="button"
              onClick={() => void loadData()}
            >
              {t("Recargar", "Reload")}
            </button>
            <button
              className="btn btn-outline-dark"
              type="button"
              onClick={() => navigate("/tenant-portal/business-core/clients")}
            >
              {t("Volver a clientes", "Back to clients")}
            </button>
          </AppToolbar>
        }
      />
      <BusinessCoreModuleNav />

      {feedback ? <div className="alert alert-success mb-0">{feedback}</div> : null}
      {error ? (
        <ErrorState
          title={t(
            "No se pudo cargar la normalización de organización",
            "The common organization normalization view could not be loaded"
          )}
          detail={getApiErrorDisplayMessage(error)}
          requestId={error.payload?.request_id}
        />
      ) : null}
      {isLoading ? (
        <LoadingBlock label={t("Cargando clientes pendientes...", "Loading pending clients...")} />
      ) : null}

      <PanelCard
        title={t("Backlog pendiente", "Pending backlog")}
        subtitle={t(
          "Solo se muestran clientes sin 'Organización / Razón social'. La idea es que este listado se vaya reduciendo.",
          "Only clients without 'Organization / legal name' are shown. The goal is to reduce this list over time."
        )}
      >
        <div className="business-core-manual-merge">
          <div className="business-core-manual-merge__summary">
            <span>
              {pendingRows.length} {t("pendientes", "pending")}
            </span>
            <span>
              {selectedRows.length} {t("seleccionados", "selected")}
            </span>
          </div>
          <div className="business-core-manual-merge__grid">
            <label className="business-core-manual-merge__field">
              <span>{t("Nombre común final", "Final common name")}</span>
              <input
                className="form-control"
                value={commonOrganizationName}
                disabled={isSubmitting}
                placeholder={t("Ej.: Los Arbolitos", "Ex.: Los Arbolitos")}
                onChange={(event) => setCommonOrganizationName(event.target.value)}
              />
            </label>
          </div>
          <div className="business-core-manual-merge__note">
            {t(
              "Este flujo solo completa 'Organización / Razón social'. No modifica nombre cliente, contactos, direcciones ni mantenciones.",
              "This flow only fills 'Organization / legal name'. It does not modify client name, contacts, addresses, or maintenance records."
            )}
          </div>
          <div className="business-core-card__actions">
            <button
              className="btn btn-outline-secondary"
              type="button"
              disabled={selectedRows.length === 0 || isSubmitting}
              onClick={clearSelection}
            >
              {t("Limpiar selección", "Clear selection")}
            </button>
            <button
              className="btn btn-primary"
              type="button"
              disabled={isSubmitting || selectedRows.length === 0 || !commonOrganizationName.trim()}
              onClick={() => void handleApplyCommonOrganizationName()}
            >
              {isSubmitting
                ? t("Aplicando...", "Applying...")
                : t("Aplicar nombre común", "Apply common name")}
            </button>
          </div>
        </div>
      </PanelCard>

      <DataTableCard
        title={t("Clientes sin organización común", "Clients without a common organization")}
        subtitle={t(
          "Busca por cliente, contacto o dirección. Cuando una fila se atiende, desaparece de esta lista.",
          "Search by client, contact, or address. Once a row is processed, it disappears from this list."
        )}
        rows={filteredRows}
        actions={
          <input
            className="form-control business-core-search"
            type="search"
            placeholder={t(
              "Buscar por cliente, contacto o dirección",
              "Search by client, contact, or address"
            )}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        }
        columns={[
          {
            key: "select",
            header: t("Sel.", "Pick"),
            render: (row) => (
              <label className="business-core-selection-toggle">
                <input
                  type="checkbox"
                  checked={selectedClientIds.includes(row.client.id)}
                  disabled={isSubmitting}
                  onChange={() => toggleClientSelection(row.client.id)}
                />
                <span>{t("marcar", "pick")}</span>
              </label>
            ),
          },
          {
            key: "client",
            header: t("Cliente", "Client"),
            render: (row) => (
              <div>
                <div className="business-core-cell__title">
                  {row.organization?.name ?? t("Sin nombre", "No name")}
                </div>
                <div className="business-core-cell__meta">
                  {row.organization?.tax_id || "—"}
                </div>
              </div>
            ),
          },
          {
            key: "contact",
            header: t("Contacto principal", "Primary contact"),
            render: (row) => {
              const primaryContact =
                row.contacts.find((contact) => contact.is_primary) ?? row.contacts[0];
              return (
                <div>
                  <div className="business-core-cell__title">
                    {primaryContact?.full_name || "—"}
                  </div>
                  <div className="business-core-cell__meta">
                    {primaryContact
                      ? [primaryContact.phone, primaryContact.email].filter(Boolean).join(" · ") || "—"
                      : "—"}
                  </div>
                </div>
              );
            },
          },
          {
            key: "address",
            header: t("Dirección principal", "Primary address"),
            render: (row) => {
              const primaryAddress = row.addresses[0];
              const mapsUrl = primaryAddress ? buildGoogleMapsUrl(primaryAddress) : null;
              return (
                <div>
                  <div className="business-core-cell__title">
                    {primaryAddress?.address_line || "—"}
                  </div>
                  <div className="business-core-cell__meta">
                    {[primaryAddress?.commune, primaryAddress?.city, primaryAddress?.region]
                      .filter(Boolean)
                      .join(", ") || "—"}
                  </div>
                  {mapsUrl ? (
                    <div className="business-core-cell__meta">
                      <a href={mapsUrl} target="_blank" rel="noreferrer">
                        Google Maps
                      </a>
                    </div>
                  ) : null}
                </div>
              );
            },
          },
          {
            key: "actions",
            header: t("Acciones", "Actions"),
            render: (row) => (
              <AppToolbar compact>
                <button
                  className="btn btn-sm btn-outline-primary"
                  type="button"
                  onClick={() => navigate(`/tenant-portal/business-core/clients/${row.client.id}`)}
                >
                  {t("Ver ficha", "Open detail")}
                </button>
                <button
                  className="btn btn-sm btn-outline-dark"
                  type="button"
                  onClick={() => navigate("/tenant-portal/business-core/clients")}
                >
                  {t("Ir a clientes", "Open clients")}
                </button>
              </AppToolbar>
            ),
          },
        ]}
      />
    </div>
  );
}
