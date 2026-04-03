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

function buildGoogleMapsUrl(site: TenantBusinessSite): string | null {
  const query = [site.address_line, site.city, site.region, site.country_code || "Chile"]
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

function buildDefaultAddressForm(clientId: number): TenantBusinessSiteWriteRequest {
  return {
    client_id: clientId,
    name: "",
    site_code: null,
    address_line: null,
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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [isSavingContact, setIsSavingContact] = useState(false);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [editingContactId, setEditingContactId] = useState<number | null>(null);
  const [editingAddressId, setEditingAddressId] = useState<number | null>(null);
  const [contactForm, setContactForm] = useState<TenantBusinessContactWriteRequest>(
    buildDefaultContactForm(0)
  );
  const [addressForm, setAddressForm] = useState<TenantBusinessSiteWriteRequest>(
    buildDefaultAddressForm(0)
  );

  const primaryContact = useMemo(
    () => contacts.find((contact) => contact.is_primary) ?? contacts[0] ?? null,
    [contacts]
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

      const [organizationResponse, contactsResponse, addressesResponse] = await Promise.all([
        getTenantBusinessOrganization(session.accessToken, clientData.organization_id),
        getTenantBusinessContacts(session.accessToken, {
          organizationId: clientData.organization_id,
        }),
        getTenantBusinessSites(session.accessToken, { clientId: clientData.id }),
      ]);

      setOrganization(organizationResponse.data);
      setContacts(contactsResponse.data);
      setAddresses(addressesResponse.data);
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
  }

  function startEditAddress(address: TenantBusinessSite) {
    setEditingAddressId(address.id);
    setMutationError(null);
    setAddressForm({
      client_id: address.client_id,
      name: address.name,
      site_code: address.site_code,
      address_line: address.address_line,
      city: address.city,
      region: address.region,
      country_code: address.country_code ?? "CL",
      reference_notes: address.reference_notes,
      is_active: address.is_active,
      sort_order: address.sort_order,
    });
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
      resetContactForm();
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
        resetContactForm();
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
      const payload: TenantBusinessSiteWriteRequest = {
        ...addressForm,
        client_id: client.id,
        name: addressForm.name.trim(),
        site_code: normalizeNullable(addressForm.site_code),
        address_line: normalizeNullable(addressForm.address_line),
        city: normalizeNullable(addressForm.city),
        region: normalizeNullable(addressForm.region),
        country_code: normalizeNullable(addressForm.country_code) ?? "CL",
        reference_notes: normalizeNullable(addressForm.reference_notes),
      };
      const response = editingAddressId
        ? await updateTenantBusinessSite(session.accessToken, editingAddressId, payload)
        : await createTenantBusinessSite(session.accessToken, payload);
      setFeedback(response.message);
      resetAddressForm();
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
        ? `Eliminar dirección "${address.name}" del cliente?`
        : `Delete address "${address.name}" from the client?`
    );
    if (!confirmed) {
      return;
    }
    try {
      const response = await deleteTenantBusinessSite(session.accessToken, address.id);
      setFeedback(response.message);
      if (editingAddressId === address.id) {
        resetAddressForm();
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
                {language === "es" ? "Razón social" : "Legal name"}
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
          {client.commercial_notes ? (
            <div className="business-core-detail-note">
              <strong>{language === "es" ? "Notas" : "Notes"}:</strong>{" "}
              {client.commercial_notes}
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
                onClick={resetContactForm}
              >
                {language === "es" ? "Nuevo contacto" : "New contact"}
              </button>
            </AppToolbar>
          }
        >
          <div className="business-core-inline-form">
            <div className="row g-3">
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
            <div className="business-core-inline-form__actions">
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
              {(editingContactId !== null || contactForm.full_name) ? (
                <button
                  className="btn btn-outline-secondary"
                  type="button"
                  onClick={resetContactForm}
                >
                  {language === "es" ? "Cancelar" : "Cancel"}
                </button>
              ) : null}
            </div>
          </div>

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
              onClick={resetAddressForm}
            >
              {language === "es" ? "Nueva dirección" : "New address"}
            </button>
          </AppToolbar>
        }
      >
        <div className="business-core-inline-form">
          <div className="row g-3">
            <div className="col-12 col-md-6">
              <label className="form-label">
                {language === "es" ? "Nombre dirección" : "Address name"}
              </label>
              <input
                className="form-control"
                value={addressForm.name}
                onChange={(event) =>
                  setAddressForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
              />
            </div>
            <div className="col-12 col-md-6">
              <label className="form-label">
                {language === "es" ? "Código dirección" : "Address code"}
              </label>
              <input
                className="form-control"
                value={addressForm.site_code ?? ""}
                onChange={(event) =>
                  setAddressForm((current) => ({
                    ...current,
                    site_code: event.target.value,
                  }))
                }
              />
            </div>
            <div className="col-12">
              <label className="form-label">
                {language === "es" ? "Dirección" : "Address"}
              </label>
              <input
                className="form-control"
                value={addressForm.address_line ?? ""}
                onChange={(event) =>
                  setAddressForm((current) => ({
                    ...current,
                    address_line: event.target.value,
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
          <div className="business-core-inline-form__actions">
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
            {(editingAddressId !== null ||
              addressForm.name ||
              addressForm.address_line) ? (
              <button
                className="btn btn-outline-secondary"
                type="button"
                onClick={resetAddressForm}
              >
                {language === "es" ? "Cancelar" : "Cancel"}
              </button>
            ) : null}
          </div>
        </div>

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
                  <div className="business-core-related-title">{site.name}</div>
                  <div className="business-core-cell__meta">
                    {[site.address_line, site.city, site.region]
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
    </div>
  );
}
