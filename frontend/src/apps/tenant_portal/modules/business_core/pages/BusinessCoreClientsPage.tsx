import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../../../../components/common/PageHeader";
import { DataTableCard } from "../../../../../components/data-display/DataTableCard";
import { ErrorState } from "../../../../../components/feedback/ErrorState";
import { LoadingBlock } from "../../../../../components/feedback/LoadingBlock";
import { AppBadge } from "../../../../../design-system/AppBadge";
import { AppToolbar } from "../../../../../design-system/AppLayout";
import { getApiErrorDisplayMessage } from "../../../../../services/api";
import { useLanguage } from "../../../../../store/language-context";
import { useTenantAuth } from "../../../../../store/tenant-auth-context";
import type { ApiError } from "../../../../../types";
import { BusinessCoreHelpBubble } from "../components/common/BusinessCoreHelpBubble";
import { BusinessCoreModuleNav } from "../components/common/BusinessCoreModuleNav";
import {
  createTenantBusinessClient,
  deleteTenantBusinessClient,
  getTenantBusinessClients,
  updateTenantBusinessClient,
  updateTenantBusinessClientStatus,
  type TenantBusinessClient,
  type TenantBusinessClientWriteRequest,
} from "../services/clientsService";
import {
  createTenantBusinessContact,
  getTenantBusinessContacts,
  updateTenantBusinessContact,
  type TenantBusinessContact,
  type TenantBusinessContactWriteRequest,
} from "../services/contactsService";
import {
  createTenantBusinessOrganization,
  getTenantBusinessOrganizations,
  updateTenantBusinessOrganization,
  type TenantBusinessOrganization,
  type TenantBusinessOrganizationWriteRequest,
} from "../services/organizationsService";
import {
  createTenantBusinessSite,
  getTenantBusinessSites,
  updateTenantBusinessSite,
  type TenantBusinessSite,
  type TenantBusinessSiteWriteRequest,
} from "../services/sitesService";

type ClientModalState = {
  mode: "create" | "edit";
  clientId: number | null;
  organizationId: number | null;
  primaryContactId: number | null;
  primaryAddressId: number | null;
};

type ClientModalForm = {
  organizationName: string;
  legalName: string;
  taxId: string;
  phone: string;
  email: string;
  clientCode: string;
  serviceStatus: string;
  commercialNotes: string;
  primaryContactName: string;
  primaryContactRole: string;
  primaryContactPhone: string;
  primaryContactEmail: string;
  addressName: string;
  addressLine: string;
  city: string;
  region: string;
  referenceNotes: string;
};

type ClientRow = {
  client: TenantBusinessClient;
  organization: TenantBusinessOrganization | null;
  contacts: TenantBusinessContact[];
  addresses: TenantBusinessSite[];
};

function buildDefaultModalForm(): ClientModalForm {
  return {
    organizationName: "",
    legalName: "",
    taxId: "",
    phone: "",
    email: "",
    clientCode: "",
    serviceStatus: "active",
    commercialNotes: "",
    primaryContactName: "",
    primaryContactRole: "",
    primaryContactPhone: "",
    primaryContactEmail: "",
    addressName: "",
    addressLine: "",
    city: "",
    region: "",
    referenceNotes: "",
  };
}

function normalizeNullable(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function buildGoogleMapsUrl(address: TenantBusinessSite): string | null {
  const query = [address.address_line, address.city, address.region, address.country_code || "Chile"]
    .filter(Boolean)
    .join(", ")
    .trim();
  if (!query) {
    return null;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function BusinessCoreClientsPage() {
  const { session } = useTenantAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [clients, setClients] = useState<TenantBusinessClient[]>([]);
  const [organizations, setOrganizations] = useState<TenantBusinessOrganization[]>([]);
  const [contacts, setContacts] = useState<TenantBusinessContact[]>([]);
  const [addresses, setAddresses] = useState<TenantBusinessSite[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalState, setModalState] = useState<ClientModalState | null>(null);
  const [modalForm, setModalForm] = useState<ClientModalForm>(buildDefaultModalForm());

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

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return clientRows;
    }
    return clientRows.filter((row) => {
      const primaryContact = row.contacts.find((contact) => contact.is_primary) ?? row.contacts[0];
      const primaryAddress = row.addresses[0];
      const haystack = [
        row.organization?.name,
        row.organization?.legal_name,
        row.organization?.tax_id,
        row.client.client_code,
        row.client.commercial_notes,
        primaryContact?.full_name,
        primaryContact?.email,
        primaryContact?.phone,
        primaryAddress?.name,
        primaryAddress?.address_line,
        primaryAddress?.city,
        primaryAddress?.region,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [clientRows, search]);

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

  function openCreateModal() {
    setModalError(null);
    setFeedback(null);
    setModalState({
      mode: "create",
      clientId: null,
      organizationId: null,
      primaryContactId: null,
      primaryAddressId: null,
    });
    setModalForm(buildDefaultModalForm());
  }

  function openEditModal(row: ClientRow) {
    const primaryContact = row.contacts.find((contact) => contact.is_primary) ?? row.contacts[0] ?? null;
    const primaryAddress = row.addresses[0] ?? null;
    setModalError(null);
    setFeedback(null);
    setModalState({
      mode: "edit",
      clientId: row.client.id,
      organizationId: row.organization?.id ?? null,
      primaryContactId: primaryContact?.id ?? null,
      primaryAddressId: primaryAddress?.id ?? null,
    });
    setModalForm({
      organizationName: row.organization?.name ?? "",
      legalName: row.organization?.legal_name ?? "",
      taxId: row.organization?.tax_id ?? "",
      phone: row.organization?.phone ?? "",
      email: row.organization?.email ?? "",
      clientCode: row.client.client_code ?? "",
      serviceStatus: row.client.service_status,
      commercialNotes: row.client.commercial_notes ?? "",
      primaryContactName: primaryContact?.full_name ?? "",
      primaryContactRole: primaryContact?.role_title ?? "",
      primaryContactPhone: primaryContact?.phone ?? "",
      primaryContactEmail: primaryContact?.email ?? "",
      addressName: primaryAddress?.name ?? "",
      addressLine: primaryAddress?.address_line ?? "",
      city: primaryAddress?.city ?? "",
      region: primaryAddress?.region ?? "",
      referenceNotes: primaryAddress?.reference_notes ?? "",
    });
  }

  function closeModal() {
    if (isSubmitting) {
      return;
    }
    setModalState(null);
    setModalError(null);
    setModalForm(buildDefaultModalForm());
  }

  async function handleSaveClient() {
    if (!session?.accessToken || !modalState) {
      return;
    }
    setIsSubmitting(true);
    setModalError(null);
    try {
      const organizationPayload: TenantBusinessOrganizationWriteRequest = {
        name: modalForm.organizationName.trim(),
        legal_name: normalizeNullable(modalForm.legalName),
        tax_id: normalizeNullable(modalForm.taxId),
        organization_kind: "client",
        phone: normalizeNullable(modalForm.phone),
        email: normalizeNullable(modalForm.email),
        notes: null,
        is_active: true,
        sort_order: 100,
      };

      const organizationResponse =
        modalState.mode === "edit" && modalState.organizationId
          ? await updateTenantBusinessOrganization(
              session.accessToken,
              modalState.organizationId,
              organizationPayload
            )
          : await createTenantBusinessOrganization(
              session.accessToken,
              organizationPayload
            );
      const organization = organizationResponse.data;

      const clientPayload: TenantBusinessClientWriteRequest = {
        organization_id: organization.id,
        client_code: normalizeNullable(modalForm.clientCode),
        service_status: modalForm.serviceStatus,
        commercial_notes: normalizeNullable(modalForm.commercialNotes),
        is_active: true,
        sort_order: 100,
      };

      const clientResponse =
        modalState.mode === "edit" && modalState.clientId
          ? await updateTenantBusinessClient(
              session.accessToken,
              modalState.clientId,
              clientPayload
            )
          : await createTenantBusinessClient(session.accessToken, clientPayload);
      const client = clientResponse.data;

      if (modalForm.primaryContactName.trim()) {
        const contactPayload: TenantBusinessContactWriteRequest = {
          organization_id: organization.id,
          full_name: modalForm.primaryContactName.trim(),
          email: normalizeNullable(modalForm.primaryContactEmail),
          phone: normalizeNullable(modalForm.primaryContactPhone),
          role_title: normalizeNullable(modalForm.primaryContactRole),
          is_primary: true,
          is_active: true,
          sort_order: 100,
        };
        if (modalState.mode === "edit" && modalState.primaryContactId) {
          await updateTenantBusinessContact(
            session.accessToken,
            modalState.primaryContactId,
            contactPayload
          );
        } else {
          await createTenantBusinessContact(session.accessToken, contactPayload);
        }
      }

      if (modalForm.addressName.trim() || modalForm.addressLine.trim()) {
        const addressPayload: TenantBusinessSiteWriteRequest = {
          client_id: client.id,
          name: modalForm.addressName.trim() || (language === "es" ? "Dirección principal" : "Primary address"),
          site_code: null,
          address_line: normalizeNullable(modalForm.addressLine),
          city: normalizeNullable(modalForm.city),
          region: normalizeNullable(modalForm.region),
          country_code: "CL",
          reference_notes: normalizeNullable(modalForm.referenceNotes),
          is_active: true,
          sort_order: 100,
        };
        if (modalState.mode === "edit" && modalState.primaryAddressId) {
          await updateTenantBusinessSite(
            session.accessToken,
            modalState.primaryAddressId,
            addressPayload
          );
        } else {
          await createTenantBusinessSite(session.accessToken, addressPayload);
        }
      }

      setFeedback(
        modalState.mode === "edit"
          ? language === "es"
            ? "Cliente actualizado correctamente"
            : "Client updated successfully"
          : language === "es"
            ? "Cliente creado correctamente"
            : "Client created successfully"
      );
      closeModal();
      await loadData();
    } catch (rawError) {
      setModalError(getApiErrorDisplayMessage(rawError as ApiError));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleToggle(row: ClientRow) {
    if (!session?.accessToken) {
      return;
    }
    try {
      const response = await updateTenantBusinessClientStatus(
        session.accessToken,
        row.client.id,
        !row.client.is_active
      );
      setFeedback(response.message);
      await loadData();
    } catch (rawError) {
      setError(rawError as ApiError);
    }
  }

  async function handleDelete(row: ClientRow) {
    if (!session?.accessToken) {
      return;
    }
    const confirmed = window.confirm(
      language === "es"
        ? `Eliminar "${row.organization?.name ?? "cliente"}" solo funcionará si no tiene direcciones asociadas.`
        : `Deleting "${row.organization?.name ?? "client"}" only works if it has no linked addresses.`
    );
    if (!confirmed) {
      return;
    }
    try {
      const response = await deleteTenantBusinessClient(session.accessToken, row.client.id);
      setFeedback(response.message);
      await loadData();
    } catch (rawError) {
      setError(rawError as ApiError);
    }
  }

  return (
    <div className="d-grid gap-4">
      <PageHeader
        eyebrow={language === "es" ? "Core de negocio" : "Business core"}
        icon="business-core"
        title={language === "es" ? "Clientes" : "Clients"}
        description={
          language === "es"
            ? "Vista principal de lectura comercial. Aquí debes poder ubicar un cliente por nombre, contacto o dirección."
            : "Primary commercial reading view. You should be able to find a client by name, contact, or address here."
        }
        actions={
          <AppToolbar compact>
            <BusinessCoreHelpBubble
              label={language === "es" ? "Ayuda" : "Help"}
              helpText={
                language === "es"
                  ? "La tabla de clientes debe ser tu lectura principal. Contactos y direcciones se consultan desde aquí y la ficha del cliente, no como catálogos separados."
                  : "The clients table should be your main reading view. Contacts and addresses are consulted from here and from the client detail, not as separate catalogs."
              }
            />
            <button
              className="btn btn-outline-secondary"
              type="button"
              onClick={() => void loadData()}
            >
              {language === "es" ? "Recargar" : "Reload"}
            </button>
            <button className="btn btn-primary" type="button" onClick={openCreateModal}>
              {language === "es" ? "Nuevo cliente" : "New client"}
            </button>
          </AppToolbar>
        }
      />
      <BusinessCoreModuleNav />

      {feedback ? <div className="alert alert-success mb-0">{feedback}</div> : null}
      {error ? (
        <ErrorState
          title={
            language === "es"
              ? "No se pudo cargar la vista de clientes"
              : "The clients view could not be loaded"
          }
          detail={getApiErrorDisplayMessage(error)}
          requestId={error.payload?.request_id}
        />
      ) : null}
      {isLoading ? (
        <LoadingBlock label={language === "es" ? "Cargando clientes..." : "Loading clients..."} />
      ) : null}

      <DataTableCard
        title={language === "es" ? "Clientes activos y cartera" : "Client portfolio"}
        subtitle={
          language === "es"
            ? "Busca por nombre, RUT, contacto o dirección."
            : "Search by name, tax ID, contact, or address."
        }
        rows={filteredRows}
        actions={
          <input
            className="form-control business-core-search"
            type="search"
            placeholder={
              language === "es"
                ? "Buscar por cliente, RUT, contacto o dirección"
                : "Search by client, tax ID, contact, or address"
            }
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        }
        columns={[
          {
            key: "client",
            header: language === "es" ? "Cliente" : "Client",
            render: (row) => (
              <div>
                <div className="business-core-cell__title">
                  {row.organization?.name ?? (language === "es" ? "Sin nombre" : "No name")}
                </div>
                <div className="business-core-cell__meta">
                  {row.client.client_code || "—"} · {row.organization?.tax_id || "—"}
                </div>
              </div>
            ),
          },
          {
            key: "contact",
            header: language === "es" ? "Contacto principal" : "Primary contact",
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
            header: language === "es" ? "Dirección principal" : "Primary address",
            render: (row) => {
              const primaryAddress = row.addresses[0];
              const mapsUrl = primaryAddress ? buildGoogleMapsUrl(primaryAddress) : null;
              return (
                <div>
                  <div className="business-core-cell__title">
                    {primaryAddress?.address_line || "—"}
                  </div>
                  <div className="business-core-cell__meta">
                    {[primaryAddress?.city, primaryAddress?.region].filter(Boolean).join(", ") || "—"}
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
            key: "status",
            header: language === "es" ? "Estado" : "Status",
            render: (row) => (
              <AppBadge tone={row.client.is_active ? "success" : "warning"}>
                {row.client.is_active
                  ? language === "es"
                    ? "activo"
                    : "active"
                  : language === "es"
                    ? "inactivo"
                    : "inactive"}
              </AppBadge>
            ),
          },
          {
            key: "actions",
            header: language === "es" ? "Acciones" : "Actions",
            render: (row) => (
              <AppToolbar compact>
                <button
                  className="btn btn-sm btn-outline-primary"
                  type="button"
                  onClick={() => navigate(`/tenant-portal/business-core/clients/${row.client.id}`)}
                >
                  {language === "es" ? "Ver ficha" : "Open detail"}
                </button>
                <button
                  className="btn btn-sm btn-outline-dark"
                  type="button"
                  onClick={() => openEditModal(row)}
                >
                  {language === "es" ? "Editar" : "Edit"}
                </button>
                <button
                  className="btn btn-sm btn-outline-secondary"
                  type="button"
                  onClick={() => void handleToggle(row)}
                >
                  {row.client.is_active
                    ? language === "es"
                      ? "Desactivar"
                      : "Deactivate"
                    : language === "es"
                      ? "Activar"
                      : "Activate"}
                </button>
                <button
                  className="btn btn-sm btn-outline-danger"
                  type="button"
                  onClick={() => void handleDelete(row)}
                >
                  {language === "es" ? "Eliminar" : "Delete"}
                </button>
              </AppToolbar>
            ),
          },
        ]}
      />

      {modalState ? (
        <div className="confirm-dialog-backdrop" role="presentation" onClick={closeModal}>
          <div
            className="confirm-dialog business-core-client-modal"
            role="dialog"
            aria-modal="true"
            aria-label={language === "es" ? "Cliente" : "Client"}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="confirm-dialog__title">
              {modalState.mode === "edit"
                ? language === "es"
                  ? "Editar cliente"
                  : "Edit client"
                : language === "es"
                  ? "Nuevo cliente"
                  : "New client"}
            </div>
            <div className="confirm-dialog__description">
              {language === "es"
                ? "Carga aquí los datos base del cliente. Los detalles adicionales de mantención vivirán luego sobre sus instalaciones."
                : "Load the client's base data here. Additional maintenance details will later live on top of its installations."}
            </div>
            {modalError ? <div className="alert alert-danger mb-3">{modalError}</div> : null}
            <div className="business-core-modal-grid business-core-modal-grid--client">
              <div className="business-core-modal-section business-core-modal-section--client-main">
                <div className="business-core-modal-section__title">
                  {language === "es" ? "Cliente" : "Client"}
                </div>
                <div className="row g-3">
                  <div className="col-12 col-md-6">
                    <label className="form-label">
                      {language === "es" ? "Nombre cliente" : "Client name"}
                    </label>
                    <input
                      className="form-control"
                      value={modalForm.organizationName}
                      onChange={(event) =>
                        setModalForm((current) => ({
                          ...current,
                          organizationName: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">
                      {language === "es" ? "Razón social" : "Legal name"}
                    </label>
                    <input
                      className="form-control"
                      value={modalForm.legalName}
                      onChange={(event) =>
                        setModalForm((current) => ({
                          ...current,
                          legalName: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">RUT / Tax ID</label>
                    <input
                      className="form-control"
                      value={modalForm.taxId}
                      onChange={(event) =>
                        setModalForm((current) => ({
                          ...current,
                          taxId: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">
                      {language === "es" ? "Código cliente" : "Client code"}
                    </label>
                    <input
                      className="form-control"
                      value={modalForm.clientCode}
                      onChange={(event) =>
                        setModalForm((current) => ({
                          ...current,
                          clientCode: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">
                      {language === "es" ? "Teléfono" : "Phone"}
                    </label>
                    <input
                      className="form-control"
                      value={modalForm.phone}
                      onChange={(event) =>
                        setModalForm((current) => ({
                          ...current,
                          phone: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">Email</label>
                    <input
                      className="form-control"
                      type="email"
                      value={modalForm.email}
                      onChange={(event) =>
                        setModalForm((current) => ({
                          ...current,
                          email: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">
                      {language === "es" ? "Estado servicio" : "Service status"}
                    </label>
                    <select
                      className="form-select"
                      value={modalForm.serviceStatus}
                      onChange={(event) =>
                        setModalForm((current) => ({
                          ...current,
                          serviceStatus: event.target.value,
                        }))
                      }
                    >
                      <option value="active">{language === "es" ? "Activo" : "Active"}</option>
                      <option value="paused">{language === "es" ? "Pausado" : "Paused"}</option>
                      <option value="prospect">{language === "es" ? "Prospecto" : "Prospect"}</option>
                    </select>
                  </div>
                  <div className="col-12">
                    <label className="form-label">
                      {language === "es" ? "Notas comerciales" : "Commercial notes"}
                    </label>
                    <textarea
                      className="form-control"
                      rows={2}
                      value={modalForm.commercialNotes}
                      onChange={(event) =>
                        setModalForm((current) => ({
                          ...current,
                          commercialNotes: event.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="business-core-modal-section business-core-modal-section--client-side">
                <div className="business-core-modal-section__title">
                  {language === "es" ? "Contacto principal" : "Primary contact"}
                </div>
                <div className="row g-3">
                  <div className="col-12 col-md-6">
                    <label className="form-label">
                      {language === "es" ? "Nombre completo" : "Full name"}
                    </label>
                    <input
                      className="form-control"
                      value={modalForm.primaryContactName}
                      onChange={(event) =>
                        setModalForm((current) => ({
                          ...current,
                          primaryContactName: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">
                      {language === "es" ? "Cargo" : "Role"}
                    </label>
                    <input
                      className="form-control"
                      value={modalForm.primaryContactRole}
                      onChange={(event) =>
                        setModalForm((current) => ({
                          ...current,
                          primaryContactRole: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">
                      {language === "es" ? "Teléfono contacto" : "Contact phone"}
                    </label>
                    <input
                      className="form-control"
                      value={modalForm.primaryContactPhone}
                      onChange={(event) =>
                        setModalForm((current) => ({
                          ...current,
                          primaryContactPhone: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">
                      {language === "es" ? "Email contacto" : "Contact email"}
                    </label>
                    <input
                      className="form-control"
                      type="email"
                      value={modalForm.primaryContactEmail}
                      onChange={(event) =>
                        setModalForm((current) => ({
                          ...current,
                          primaryContactEmail: event.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="business-core-modal-section business-core-modal-section--client-side">
                <div className="business-core-modal-section__title">
                  {language === "es" ? "Dirección principal" : "Primary address"}
                </div>
                <div className="row g-3">
                  <div className="col-12 col-md-6">
                    <label className="form-label">
                      {language === "es" ? "Nombre dirección" : "Address name"}
                    </label>
                    <input
                      className="form-control"
                      value={modalForm.addressName}
                      onChange={(event) =>
                        setModalForm((current) => ({
                          ...current,
                          addressName: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">
                      {language === "es" ? "Dirección" : "Address"}
                    </label>
                    <input
                      className="form-control"
                      value={modalForm.addressLine}
                      onChange={(event) =>
                        setModalForm((current) => ({
                          ...current,
                          addressLine: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">
                      {language === "es" ? "Ciudad" : "City"}
                    </label>
                    <input
                      className="form-control"
                      value={modalForm.city}
                      onChange={(event) =>
                        setModalForm((current) => ({
                          ...current,
                          city: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">
                      {language === "es" ? "Región" : "Region"}
                    </label>
                    <input
                      className="form-control"
                      value={modalForm.region}
                      onChange={(event) =>
                        setModalForm((current) => ({
                          ...current,
                          region: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label">
                      {language === "es" ? "Notas de referencia" : "Reference notes"}
                    </label>
                    <textarea
                      className="form-control"
                      rows={2}
                      value={modalForm.referenceNotes}
                      onChange={(event) =>
                        setModalForm((current) => ({
                          ...current,
                          referenceNotes: event.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="confirm-dialog__actions">
              <button
                className="btn btn-outline-primary"
                type="button"
                onClick={closeModal}
                disabled={isSubmitting}
              >
                {language === "es" ? "Cancelar" : "Cancel"}
              </button>
              <button
                className="btn btn-primary"
                type="button"
                onClick={() => void handleSaveClient()}
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? language === "es"
                    ? "Guardando..."
                    : "Saving..."
                  : modalState.mode === "edit"
                    ? language === "es"
                      ? "Guardar cambios"
                      : "Save changes"
                    : language === "es"
                      ? "Crear cliente"
                      : "Create client"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
