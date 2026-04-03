import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PageHeader } from "../../../../../components/common/PageHeader";
import { PanelCard } from "../../../../../components/common/PanelCard";
import { ErrorState } from "../../../../../components/feedback/ErrorState";
import { LoadingBlock } from "../../../../../components/feedback/LoadingBlock";
import { AppBadge } from "../../../../../design-system/AppBadge";
import { AppToolbar } from "../../../../../design-system/AppLayout";
import { getApiErrorDisplayMessage } from "../../../../../services/api";
import { useLanguage } from "../../../../../store/language-context";
import { useTenantAuth } from "../../../../../store/tenant-auth-context";
import type { ApiError } from "../../../../../types";
import { BusinessCoreModuleNav } from "../components/common/BusinessCoreModuleNav";
import {
  getTenantBusinessClient,
  type TenantBusinessClient,
} from "../services/clientsService";
import {
  createTenantBusinessContact,
  deleteTenantBusinessContact,
  getTenantBusinessContacts,
  updateTenantBusinessContact,
  type TenantBusinessContact,
  type TenantBusinessContactWriteRequest,
} from "../services/contactsService";
import {
  getTenantBusinessOrganization,
  type TenantBusinessOrganization,
} from "../services/organizationsService";
import {
  createTenantBusinessSite,
  deleteTenantBusinessSite,
  getTenantBusinessSites,
  updateTenantBusinessSite,
  type TenantBusinessSite,
  type TenantBusinessSiteWriteRequest,
} from "../services/sitesService";
import {
  getTenantMaintenanceInstallations,
  type TenantMaintenanceInstallation,
} from "../../maintenance/services/installationsService";
import {
  getTenantMaintenanceWorkOrders,
  type TenantMaintenanceWorkOrder,
} from "../../maintenance/services/workOrdersService";
import { stripLegacyVisibleText } from "../../../../../utils/legacyVisibleText";
import {
  buildAddressLine,
  getVisibleAddressLabel,
  parseAddressLine,
} from "../utils/addressPresentation";

function buildGoogleMapsUrl(site: TenantBusinessSite): string | null {
  const query = [site.address_line, site.commune, site.city, site.region, site.country_code || "Chile"]
    .filter(Boolean)
    .join(", ")
    .trim();
  if (!query) {
    return null;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function normalizeNullable(value: string | null): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : null;
}

function buildDefaultContactForm(organizationId: number): TenantBusinessContactWriteRequest {
  return {
    organization_id: organizationId,
    full_name: "",
    email: null,
    phone: null,
    role_title: null,
    is_primary: false,
    is_active: true,
    sort_order: 100,
  };
}

type AddressModalForm = TenantBusinessSiteWriteRequest & {
  street: string;
  streetNumber: string;
};

function buildDefaultAddressForm(clientId: number): AddressModalForm {
  return {
    client_id: clientId,
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

export function BusinessCoreClientDetailPage() {
  const { session } = useTenantAuth();
  const { language } = useLanguage();
  const { clientId } = useParams<{ clientId: string }>();
  const [client, setClient] = useState<TenantBusinessClient | null>(null);
  const [organization, setOrganization] = useState<TenantBusinessOrganization | null>(null);
  const [contacts, setContacts] = useState<TenantBusinessContact[]>([]);
  const [addresses, setAddresses] = useState<TenantBusinessSite[]>([]);
  const [installations, setInstallations] = useState<TenantMaintenanceInstallation[]>([]);
  const [workOrders, setWorkOrders] = useState<TenantMaintenanceWorkOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [isSavingContact, setIsSavingContact] = useState(false);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [editingContactId, setEditingContactId] = useState<number | null>(null);
  const [editingAddressId, setEditingAddressId] = useState<number | null>(null);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [contactForm, setContactForm] = useState<TenantBusinessContactWriteRequest>(
    buildDefaultContactForm(0)
  );
  const [addressForm, setAddressForm] = useState<AddressModalForm>(
    buildDefaultAddressForm(0)
  );

  const primaryContact = useMemo(
    () => contacts.find((contact) => contact.is_primary) ?? contacts[0] ?? null,
    [contacts]
  );
  const relatedInstallations = useMemo(() => {
    const siteIds = new Set(addresses.map((address) => address.id));
    return installations.filter((installation) => siteIds.has(installation.site_id));
  }, [addresses, installations]);
  const recentWorkOrders = useMemo(
    () =>
      [...workOrders]
        .sort((left, right) => {
          const leftDate = new Date(left.scheduled_for || left.requested_at).getTime();
          const rightDate = new Date(right.scheduled_for || right.requested_at).getTime();
          return rightDate - leftDate;
        })
        .slice(0, 5),
    [workOrders]
  );

  async function loadData() {
    if (!session?.accessToken || !clientId) {
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const clientResponse = await getTenantBusinessClient(
        session.accessToken,
        Number(clientId)
      );
      const clientData = clientResponse.data;
      setClient(clientData);

      const [
        organizationResponse,
        contactsResponse,
        addressesResponse,
        installationsResponse,
        workOrdersResponse,
      ] = await Promise.all([
        getTenantBusinessOrganization(session.accessToken, clientData.organization_id),
        getTenantBusinessContacts(session.accessToken, {
          organizationId: clientData.organization_id,
        }),
        getTenantBusinessSites(session.accessToken, { clientId: clientData.id }),
        getTenantMaintenanceInstallations(session.accessToken),
        getTenantMaintenanceWorkOrders(session.accessToken, { clientId: clientData.id }),
      ]);

      setOrganization(organizationResponse.data);
      setContacts(contactsResponse.data);
      setAddresses(addressesResponse.data);
      setInstallations(installationsResponse.data);
      setWorkOrders(workOrdersResponse.data);
      setContactForm((current) =>
        current.organization_id
          ? current
          : buildDefaultContactForm(clientData.organization_id)
      );
      setAddressForm((current) =>
        current.client_id ? current : buildDefaultAddressForm(clientData.id)
      );
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [clientId, session?.accessToken]);

  function resetContactForm() {
    setEditingContactId(null);
    setMutationError(null);
    setContactForm(buildDefaultContactForm(organization?.id ?? 0));
  }

  function resetAddressForm() {
    setEditingAddressId(null);
    setMutationError(null);
    setAddressForm(buildDefaultAddressForm(client?.id ?? 0));
  }

  function openCreateContactModal() {
    resetContactForm();
    setIsContactModalOpen(true);
  }

  function openCreateAddressModal() {
    resetAddressForm();
    setIsAddressModalOpen(true);
  }

  function closeContactModal() {
    if (isSavingContact) {
      return;
    }
    setIsContactModalOpen(false);
    resetContactForm();
  }

  function closeAddressModal() {
    if (isSavingAddress) {
      return;
    }
    setIsAddressModalOpen(false);
    resetAddressForm();
  }

  function startEditContact(contact: TenantBusinessContact) {
    setEditingContactId(contact.id);
    setMutationError(null);
    setContactForm({
      organization_id: contact.organization_id,
      full_name: contact.full_name,
      email: contact.email,
      phone: contact.phone,
      role_title: contact.role_title,
      is_primary: contact.is_primary,
      is_active: contact.is_active,
      sort_order: contact.sort_order,
    });
    setIsContactModalOpen(true);
  }

  function startEditAddress(address: TenantBusinessSite) {
    const parsedAddress = parseAddressLine(address.address_line);
    setEditingAddressId(address.id);
    setMutationError(null);
    setAddressForm({
      client_id: address.client_id,
      name: address.name,
      site_code: address.site_code,
      address_line: address.address_line,
      street: parsedAddress.street,
      streetNumber: parsedAddress.streetNumber,
      commune: address.commune,
      city: address.city,
      region: address.region,
      country_code: address.country_code ?? "CL",
      reference_notes: address.reference_notes,
      is_active: address.is_active,
      sort_order: address.sort_order,
    });
    setIsAddressModalOpen(true);
  }

  async function handleSaveContact() {
    if (!session?.accessToken || !organization) {
      return;
    }
    setIsSavingContact(true);
    setMutationError(null);
    try {
      const payload: TenantBusinessContactWriteRequest = {
        ...contactForm,
        organization_id: organization.id,
        full_name: contactForm.full_name.trim(),
        email: normalizeNullable(contactForm.email),
        phone: normalizeNullable(contactForm.phone),
        role_title: normalizeNullable(contactForm.role_title),
      };
      const response = editingContactId
        ? await updateTenantBusinessContact(session.accessToken, editingContactId, payload)
        : await createTenantBusinessContact(session.accessToken, payload);
      setFeedback(response.message);
      closeContactModal();
      await loadData();
    } catch (rawError) {
      setMutationError(getApiErrorDisplayMessage(rawError as ApiError));
    } finally {
      setIsSavingContact(false);
    }
  }

  async function handleDeleteContact(contact: TenantBusinessContact) {
    if (!session?.accessToken) {
      return;
    }
    const confirmed = window.confirm(
      language === "es"
        ? `Eliminar contacto "${contact.full_name}" de la ficha del cliente?`
        : `Delete contact "${contact.full_name}" from the client detail?`
    );
    if (!confirmed) {
      return;
    }
    try {
      const response = await deleteTenantBusinessContact(session.accessToken, contact.id);
      setFeedback(response.message);
      if (editingContactId === contact.id) {
        closeContactModal();
      }
      await loadData();
    } catch (rawError) {
      setMutationError(getApiErrorDisplayMessage(rawError as ApiError));
    }
  }

  async function handleSaveAddress() {
    if (!session?.accessToken || !client) {
      return;
    }
    setIsSavingAddress(true);
    setMutationError(null);
    try {
      const composedAddressLine = buildAddressLine(
        addressForm.street,
        addressForm.streetNumber
      );
      const payload: TenantBusinessSiteWriteRequest = {
        ...addressForm,
        client_id: client.id,
        name:
          composedAddressLine ||
          (language === "es" ? "Dirección principal" : "Primary address"),
        site_code: null,
        address_line: normalizeNullable(composedAddressLine),
        commune: normalizeNullable(addressForm.commune),
        city: normalizeNullable(addressForm.city),
        region: normalizeNullable(addressForm.region),
        country_code: normalizeNullable(addressForm.country_code) ?? "CL",
        reference_notes: normalizeNullable(addressForm.reference_notes),
      };
      const response = editingAddressId
        ? await updateTenantBusinessSite(session.accessToken, editingAddressId, payload)
        : await createTenantBusinessSite(session.accessToken, payload);
      setFeedback(response.message);
      closeAddressModal();
      await loadData();
    } catch (rawError) {
      setMutationError(getApiErrorDisplayMessage(rawError as ApiError));
    } finally {
      setIsSavingAddress(false);
    }
  }

  async function handleDeleteAddress(address: TenantBusinessSite) {
    if (!session?.accessToken) {
      return;
    }
      const confirmed = window.confirm(
      language === "es"
        ? `Eliminar dirección "${getVisibleAddressLabel(address)}" del cliente?`
        : `Delete address "${getVisibleAddressLabel(address)}" from the client?`
    );
    if (!confirmed) {
      return;
    }
    try {
      const response = await deleteTenantBusinessSite(session.accessToken, address.id);
      setFeedback(response.message);
      if (editingAddressId === address.id) {
        closeAddressModal();
      }
      await loadData();
    } catch (rawError) {
      setMutationError(getApiErrorDisplayMessage(rawError as ApiError));
    }
  }

  if (isLoading) {
    return (
      <LoadingBlock
        label={
          language === "es"
            ? "Cargando ficha de cliente..."
            : "Loading client detail..."
        }
      />
    );
  }

  if (error || !client || !organization) {
    return (
      <ErrorState
        title={
          language === "es"
            ? "No se pudo cargar la ficha del cliente"
            : "The client detail could not be loaded"
        }
        detail={
          error
            ? getApiErrorDisplayMessage(error)
            : language === "es"
              ? "Cliente no encontrado"
              : "Client not found"
        }
        requestId={error?.payload?.request_id}
      />
    );
  }

  return (
    <div className="d-grid gap-4">
      <PageHeader
        eyebrow={language === "es" ? "Core de negocio" : "Business core"}
        icon="business-core"
        title={organization.name}
        description={
          language === "es"
            ? "Ficha consolidada del cliente: identidad, contactos y direcciones operativas."
            : "Consolidated client detail: identity, contacts, and operating addresses."
        }
        actions={
          <AppToolbar compact>
            <Link
              className="btn btn-outline-secondary"
              to="/tenant-portal/business-core/clients"
            >
              {language === "es" ? "Volver a clientes" : "Back to clients"}
            </Link>
          </AppToolbar>
        }
      />
      <BusinessCoreModuleNav />

      {feedback ? <div className="alert alert-success mb-0">{feedback}</div> : null}
      {mutationError ? <div className="alert alert-danger mb-0">{mutationError}</div> : null}

      <div className="business-core-detail-grid">
        <PanelCard
          title={language === "es" ? "Resumen del cliente" : "Client summary"}
          subtitle={
            language === "es"
              ? "Lectura principal para operación diaria."
              : "Primary reading for day-to-day operation."
          }
        >
          <div className="business-core-detail-list">
            <div className="business-core-detail-item">
              <span className="business-core-detail-label">
                {language === "es" ? "Organización / Razón social" : "Organization / legal name"}
              </span>
              <span>{organization.legal_name || organization.name}</span>
            </div>
            <div className="business-core-detail-item">
              <span className="business-core-detail-label">RUT / Tax ID</span>
              <span>{organization.tax_id || "—"}</span>
            </div>
            <div className="business-core-detail-item">
              <span className="business-core-detail-label">
                {language === "es" ? "Código cliente" : "Client code"}
              </span>
              <span>{client.client_code || "—"}</span>
            </div>
            <div className="business-core-detail-item">
              <span className="business-core-detail-label">
                {language === "es" ? "Estado servicio" : "Service status"}
              </span>
              <AppBadge tone={client.is_active ? "success" : "warning"}>
                {client.service_status}
              </AppBadge>
            </div>
            <div className="business-core-detail-item">
              <span className="business-core-detail-label">
                {language === "es" ? "Contacto principal" : "Primary contact"}
              </span>
              <span>{primaryContact?.full_name || "—"}</span>
            </div>
            <div className="business-core-detail-item">
              <span className="business-core-detail-label">
                {language === "es" ? "Teléfono principal" : "Primary phone"}
              </span>
              <span>{primaryContact?.phone || organization.phone || "—"}</span>
            </div>
            <div className="business-core-detail-item">
              <span className="business-core-detail-label">Email</span>
              <span>{primaryContact?.email || organization.email || "—"}</span>
            </div>
          </div>
          {stripLegacyVisibleText(client.commercial_notes) ? (
            <div className="business-core-detail-note">
              <strong>{language === "es" ? "Notas" : "Notes"}:</strong>{" "}
              {stripLegacyVisibleText(client.commercial_notes)}
            </div>
          ) : null}
        </PanelCard>

        <PanelCard
          title={language === "es" ? "Contactos asociados" : "Linked contacts"}
          subtitle={
            language === "es"
              ? "Todos los contactos de la organización base del cliente."
              : "All contacts from the client's base organization."
          }
          actions={
            <AppToolbar compact>
              <button
              className="btn btn-sm btn-outline-primary"
              type="button"
              onClick={openCreateContactModal}
            >
              {language === "es" ? "Nuevo contacto" : "New contact"}
            </button>
          </AppToolbar>
        }
      >
          {contacts.length === 0 ? (
            <p className="mb-0 text-muted">
              {language === "es"
                ? "Este cliente no tiene contactos cargados."
                : "This client has no contacts yet."}
            </p>
          ) : (
            <div className="business-core-stack">
              {contacts.map((contact) => (
                <div className="business-core-related-card" key={contact.id}>
                  <div className="business-core-related-title">
                    {contact.full_name}
                    {contact.is_primary ? (
                      <AppBadge tone="success">
                        {language === "es" ? "principal" : "primary"}
                      </AppBadge>
                    ) : null}
                  </div>
                  <div className="business-core-cell__meta">
                    {contact.role_title ||
                      (language === "es" ? "sin cargo" : "no role")}
                  </div>
                  <div className="business-core-cell__meta">
                    {contact.phone || "—"} · {contact.email || "—"}
                  </div>
                  <div className="business-core-card__actions">
                    <button
                      className="btn btn-sm btn-outline-primary"
                      type="button"
                      onClick={() => startEditContact(contact)}
                    >
                      {language === "es" ? "Editar" : "Edit"}
                    </button>
                    <button
                      className="btn btn-sm btn-outline-danger"
                      type="button"
                      onClick={() => void handleDeleteContact(contact)}
                    >
                      {language === "es" ? "Eliminar" : "Delete"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </PanelCard>
      </div>

      <PanelCard
        title={language === "es" ? "Direcciones del cliente" : "Client addresses"}
        subtitle={
          language === "es"
            ? "Direcciones operativas donde luego cuelgan mantenciones, proyectos o activos."
            : "Operating addresses where maintenance, projects, or assets will later hang."
        }
        actions={
          <AppToolbar compact>
            <button
              className="btn btn-sm btn-outline-primary"
              type="button"
              onClick={openCreateAddressModal}
            >
              {language === "es" ? "Nueva dirección" : "New address"}
            </button>
          </AppToolbar>
        }
      >
        {addresses.length === 0 ? (
          <p className="mb-0 text-muted">
            {language === "es"
              ? "Este cliente no tiene direcciones cargadas."
              : "This client has no addresses yet."}
          </p>
        ) : (
          <div className="business-core-stack">
            {addresses.map((site) => {
              const mapsUrl = buildGoogleMapsUrl(site);
              return (
                <div className="business-core-related-card" key={site.id}>
                  <div className="business-core-related-title">
                    {getVisibleAddressLabel(site)}
                  </div>
                  <div className="business-core-cell__meta">
                    {[site.address_line, site.commune, site.city, site.region]
                      .filter(Boolean)
                      .join(", ") || "—"}
                  </div>
                  {site.reference_notes ? (
                    <div className="business-core-cell__meta">
                      {site.reference_notes}
                    </div>
                  ) : null}
                  <div className="business-core-card__actions">
                    <button
                      className="btn btn-sm btn-outline-primary"
                      type="button"
                      onClick={() => startEditAddress(site)}
                    >
                      {language === "es" ? "Editar" : "Edit"}
                    </button>
                    {mapsUrl ? (
                      <a
                        className="btn btn-sm btn-outline-secondary"
                        href={mapsUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {language === "es"
                          ? "Google Maps"
                          : "Google Maps"}
                      </a>
                    ) : null}
                    <button
                      className="btn btn-sm btn-outline-danger"
                      type="button"
                      onClick={() => void handleDeleteAddress(site)}
                    >
                      {language === "es" ? "Eliminar" : "Delete"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </PanelCard>

      {isContactModalOpen ? (
        <div
          className="confirm-dialog-backdrop"
          role="presentation"
          onClick={closeContactModal}
        >
          <div
            className="confirm-dialog business-core-form-modal business-core-form-modal--compact"
            role="dialog"
            aria-modal="true"
            aria-label={editingContactId ? "Editar contacto" : "Nuevo contacto"}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="business-core-form-modal__eyebrow">
              {language === "es" ? "Edición puntual" : "Targeted edit"}
            </div>
            <div className="confirm-dialog__title">
              {editingContactId
                ? language === "es"
                  ? "Editar contacto"
                  : "Edit contact"
                : language === "es"
                  ? "Nuevo contacto"
                  : "New contact"}
            </div>
            <div className="confirm-dialog__description">
              {language === "es"
                ? "Completa solo cuando realmente necesites agregar o corregir un contacto del cliente."
                : "Fill this only when you actually need to add or correct a client contact."}
            </div>
            <div className="business-core-modal-grid">
              <div className="business-core-modal-section">
                <div className="business-core-modal-section__hint">
                  {language === "es"
                    ? "Corrige o agrega el contacto sin salir de la ficha del cliente."
                    : "Add or correct the contact without leaving the client detail page."}
                </div>
                <div className="row g-3 business-core-form-grid--dense">
                  <div className="col-12 col-md-6">
                    <label className="form-label">
                      {language === "es" ? "Nombre completo" : "Full name"}
                    </label>
                    <input
                      className="form-control"
                      value={contactForm.full_name}
                      onChange={(event) =>
                        setContactForm((current) => ({
                          ...current,
                          full_name: event.target.value,
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
                      value={contactForm.role_title ?? ""}
                      onChange={(event) =>
                        setContactForm((current) => ({
                          ...current,
                          role_title: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">Email</label>
                    <input
                      className="form-control"
                      type="email"
                      value={contactForm.email ?? ""}
                      onChange={(event) =>
                        setContactForm((current) => ({
                          ...current,
                          email: event.target.value,
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
                      value={contactForm.phone ?? ""}
                      onChange={(event) =>
                        setContactForm((current) => ({
                          ...current,
                          phone: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="col-12 d-flex flex-wrap gap-3">
                    <label className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        checked={contactForm.is_primary}
                        onChange={(event) =>
                          setContactForm((current) => ({
                            ...current,
                            is_primary: event.target.checked,
                          }))
                        }
                      />
                      <span className="form-check-label">
                        {language === "es" ? "Contacto principal" : "Primary contact"}
                      </span>
                    </label>
                    <label className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        checked={contactForm.is_active}
                        onChange={(event) =>
                          setContactForm((current) => ({
                            ...current,
                            is_active: event.target.checked,
                          }))
                        }
                      />
                      <span className="form-check-label">
                        {language === "es" ? "Activo" : "Active"}
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
            <div className="confirm-dialog__actions">
              <button
                className="btn btn-outline-secondary"
                type="button"
                onClick={closeContactModal}
              >
                {language === "es" ? "Cancelar" : "Cancel"}
              </button>
              <button
                className="btn btn-primary"
                type="button"
                disabled={isSavingContact}
                onClick={() => void handleSaveContact()}
              >
                {editingContactId
                  ? language === "es"
                    ? "Guardar contacto"
                    : "Save contact"
                  : language === "es"
                    ? "Agregar contacto"
                    : "Add contact"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isAddressModalOpen ? (
        <div
          className="confirm-dialog-backdrop"
          role="presentation"
          onClick={closeAddressModal}
        >
          <div
            className="confirm-dialog business-core-form-modal business-core-form-modal--compact"
            role="dialog"
            aria-modal="true"
            aria-label={editingAddressId ? "Editar dirección" : "Nueva dirección"}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="business-core-form-modal__eyebrow">
              {language === "es" ? "Edición puntual" : "Targeted edit"}
            </div>
            <div className="confirm-dialog__title">
              {editingAddressId
                ? language === "es"
                  ? "Editar dirección"
                  : "Edit address"
                : language === "es"
                  ? "Nueva dirección"
                  : "New address"}
            </div>
            <div className="confirm-dialog__description">
              {language === "es"
                ? "Agrega o corrige una dirección del cliente solo cuando haga falta."
                : "Add or correct a client address only when needed."}
            </div>
            <div className="business-core-modal-grid">
              <div className="business-core-modal-section">
                <div className="business-core-modal-section__hint">
                  {language === "es"
                    ? "Captura la dirección visible del cliente; el código técnico queda interno."
                    : "Capture the visible client address; the technical code stays internal."}
                </div>
                <div className="row g-3 business-core-form-grid--dense">
                  <div className="col-12 col-md-8">
                    <label className="form-label">
                      {language === "es" ? "Calle" : "Street"}
                    </label>
                    <input
                      className="form-control"
                      value={addressForm.street}
                      onChange={(event) =>
                        setAddressForm((current) => ({
                          ...current,
                          street: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="col-12 col-md-4">
                    <label className="form-label">
                      {language === "es" ? "Número" : "Number"}
                    </label>
                    <input
                      className="form-control"
                      value={addressForm.streetNumber}
                      onChange={(event) =>
                        setAddressForm((current) => ({
                          ...current,
                          streetNumber: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="col-12 col-md-4">
                    <label className="form-label">
                      {language === "es" ? "Comuna" : "Commune"}
                    </label>
                    <input
                      className="form-control"
                      value={addressForm.commune ?? ""}
                      onChange={(event) =>
                        setAddressForm((current) => ({
                          ...current,
                          commune: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="col-12 col-md-4">
                    <label className="form-label">
                      {language === "es" ? "Ciudad" : "City"}
                    </label>
                    <input
                      className="form-control"
                      value={addressForm.city ?? ""}
                      onChange={(event) =>
                        setAddressForm((current) => ({
                          ...current,
                          city: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="col-12 col-md-4">
                    <label className="form-label">
                      {language === "es" ? "Región" : "Region"}
                    </label>
                    <input
                      className="form-control"
                      value={addressForm.region ?? ""}
                      onChange={(event) =>
                        setAddressForm((current) => ({
                          ...current,
                          region: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="col-12 col-md-4">
                    <label className="form-label">
                      {language === "es" ? "País" : "Country"}
                    </label>
                    <input
                      className="form-control"
                      value={addressForm.country_code ?? "CL"}
                      onChange={(event) =>
                        setAddressForm((current) => ({
                          ...current,
                          country_code: event.target.value,
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
                      rows={3}
                      value={addressForm.reference_notes ?? ""}
                      onChange={(event) =>
                        setAddressForm((current) => ({
                          ...current,
                          reference_notes: event.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="confirm-dialog__actions">
              <button
                className="btn btn-outline-secondary"
                type="button"
                onClick={closeAddressModal}
              >
                {language === "es" ? "Cancelar" : "Cancel"}
              </button>
              <button
                className="btn btn-primary"
                type="button"
                disabled={isSavingAddress}
                onClick={() => void handleSaveAddress()}
              >
                {editingAddressId
                  ? language === "es"
                    ? "Guardar dirección"
                    : "Save address"
                  : language === "es"
                    ? "Agregar dirección"
                    : "Add address"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="business-core-detail-grid">
        <PanelCard
          title={language === "es" ? "Instalaciones asociadas" : "Linked installations"}
          subtitle={
            language === "es"
              ? "Resumen técnico conectado al cliente a través de sus direcciones."
              : "Technical summary connected to the client through its addresses."
          }
          actions={
            <AppToolbar compact>
              <Link
                className="btn btn-outline-secondary"
                to={`/tenant-portal/maintenance/installations?clientId=${client.id}`}
              >
                {language === "es" ? "Ver instalaciones" : "View installations"}
              </Link>
            </AppToolbar>
          }
        >
          {relatedInstallations.length === 0 ? (
            <p className="mb-0 text-muted">
              {language === "es"
                ? "Este cliente todavía no tiene instalaciones técnicas registradas."
                : "This client has no technical installations yet."}
            </p>
          ) : (
            <div className="business-core-stack">
              {relatedInstallations.slice(0, 5).map((installation) => {
                const targetAddress = addresses.find((address) => address.id === installation.site_id);
                const scheduleParams = new URLSearchParams({
                  clientId: String(client.id),
                  siteId: String(installation.site_id),
                  installationId: String(installation.id),
                  mode: "create",
                }).toString();
                return (
                  <div className="business-core-related-card" key={installation.id}>
                    <div className="business-core-related-title">{installation.name}</div>
                    <div className="business-core-cell__meta">
                      {[installation.manufacturer, installation.model, installation.serial_number]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </div>
                    <div className="business-core-cell__meta">
                      {targetAddress?.name || targetAddress?.address_line || "—"}
                    </div>
                    <div className="business-core-card__actions">
                      <Link
                        className="btn btn-sm btn-outline-primary"
                        to={`/tenant-portal/maintenance/work-orders?${scheduleParams}`}
                      >
                        {language === "es" ? "Agendar mantención" : "Schedule maintenance"}
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </PanelCard>

        <PanelCard
          title={language === "es" ? "Mantenciones recientes" : "Recent work orders"}
          subtitle={
            language === "es"
              ? "Lectura rápida del trabajo técnico ligado a este cliente."
              : "Quick reading of technical work linked to this client."
          }
          actions={
            <AppToolbar compact>
              <Link
                className="btn btn-outline-secondary"
                to={`/tenant-portal/maintenance/work-orders?clientId=${client.id}`}
              >
                {language === "es" ? "Ver mantenciones" : "View work orders"}
              </Link>
            </AppToolbar>
          }
        >
          {recentWorkOrders.length === 0 ? (
            <p className="mb-0 text-muted">
              {language === "es"
                ? "Este cliente no tiene mantenciones registradas todavía."
                : "This client has no work orders yet."}
            </p>
          ) : (
            <div className="business-core-stack">
              {recentWorkOrders.map((workOrder) => {
                const scheduleParams = new URLSearchParams({
                  clientId: String(client.id),
                  siteId: String(workOrder.site_id),
                  ...(workOrder.installation_id ? { installationId: String(workOrder.installation_id) } : {}),
                }).toString();
                return (
                  <div className="business-core-related-card" key={workOrder.id}>
                    <div className="business-core-related-title">{workOrder.title}</div>
                    <div className="business-core-cell__meta">
                      {workOrder.maintenance_status} · {workOrder.priority}
                    </div>
                    <div className="business-core-cell__meta">
                      {workOrder.scheduled_for || workOrder.requested_at}
                    </div>
                    <div className="business-core-card__actions">
                      <Link
                        className="btn btn-sm btn-outline-primary"
                        to={`/tenant-portal/maintenance/work-orders?${scheduleParams}`}
                      >
                        {language === "es" ? "Abrir en mantenciones" : "Open in maintenance"}
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </PanelCard>
      </div>
    </div>
  );
}
