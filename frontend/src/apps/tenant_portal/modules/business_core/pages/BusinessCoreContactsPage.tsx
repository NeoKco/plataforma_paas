import { useEffect, useMemo, useState } from "react";
import { AppBadge } from "../../../../../design-system/AppBadge";
import { AppToolbar } from "../../../../../design-system/AppLayout";
import { useLanguage } from "../../../../../store/language-context";
import { useTenantAuth } from "../../../../../store/tenant-auth-context";
import type { ApiError } from "../../../../../types";
import { BusinessCoreCatalogPage } from "../components/common/BusinessCoreCatalogPage";
import {
  createTenantBusinessContact,
  deleteTenantBusinessContact,
  getTenantBusinessContacts,
  updateTenantBusinessContact,
  updateTenantBusinessContactStatus,
  type TenantBusinessContact,
  type TenantBusinessContactWriteRequest,
} from "../services/contactsService";
import {
  getTenantBusinessOrganizations,
  type TenantBusinessOrganization,
} from "../services/organizationsService";

function buildDefaultForm(): TenantBusinessContactWriteRequest {
  return {
    organization_id: 0,
    full_name: "",
    email: null,
    phone: null,
    role_title: null,
    is_primary: false,
    is_active: true,
    sort_order: 100,
  };
}

function normalizeNullable(value: string | null): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : null;
}

export function BusinessCoreContactsPage() {
  const { session } = useTenantAuth();
  const { language } = useLanguage();
  const [contacts, setContacts] = useState<TenantBusinessContact[]>([]);
  const [organizations, setOrganizations] = useState<TenantBusinessOrganization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [form, setForm] = useState<TenantBusinessContactWriteRequest>(buildDefaultForm());

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
      const [contactsResponse, organizationsResponse] = await Promise.all([
        getTenantBusinessContacts(session.accessToken),
        getTenantBusinessOrganizations(session.accessToken, { includeInactive: false }),
      ]);
      setContacts(contactsResponse.data);
      setOrganizations(organizationsResponse.data);
      setForm((current) => ({
        ...current,
        organization_id: current.organization_id || organizationsResponse.data[0]?.id || 0,
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
      organization_id: organizations[0]?.id || 0,
    });
  }

  function startEdit(contact: TenantBusinessContact) {
    setEditingId(contact.id);
    setFeedback(null);
    setError(null);
    setForm({
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

  async function handleSubmit() {
    if (!session?.accessToken) {
      return;
    }
    const payload: TenantBusinessContactWriteRequest = {
      ...form,
      organization_id: Number(form.organization_id),
      full_name: form.full_name.trim(),
      email: normalizeNullable(form.email),
      phone: normalizeNullable(form.phone),
      role_title: normalizeNullable(form.role_title),
    };
    setIsSubmitting(true);
    setError(null);
    try {
      const response = editingId
        ? await updateTenantBusinessContact(session.accessToken, editingId, payload)
        : await createTenantBusinessContact(session.accessToken, payload);
      setFeedback(response.message);
      startCreate();
      await loadData();
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleToggle(contact: TenantBusinessContact) {
    if (!session?.accessToken) {
      return;
    }
    try {
      const response = await updateTenantBusinessContactStatus(
        session.accessToken,
        contact.id,
        !contact.is_active
      );
      setFeedback(response.message);
      await loadData();
    } catch (rawError) {
      setError(rawError as ApiError);
    }
  }

  async function handleDelete(contact: TenantBusinessContact) {
    if (!session?.accessToken) {
      return;
    }
    const confirmed = window.confirm(
      language === "es"
        ? `Eliminar el contacto "${contact.full_name}" del core compartido. ¿Continuar?`
        : `Delete contact "${contact.full_name}" from the shared core. Continue?`
    );
    if (!confirmed) {
      return;
    }
    try {
      const response = await deleteTenantBusinessContact(session.accessToken, contact.id);
      if (editingId === contact.id) {
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
      titleEs="Contactos"
      titleEn="Contacts"
      descriptionEs="Contactos compartidos de negocio, separados del CRM y reutilizables por sitio y cliente."
      descriptionEn="Shared business contacts, separated from CRM and reusable by site and client."
      helpEs="Solo deja un contacto principal por organización. Los contactos comerciales ligados a oportunidades siguen perteneciendo al CRM."
      helpEn="Keep only one primary contact per organization. Opportunity-bound commercial contacts still belong to CRM."
      loadingLabelEs="Cargando contactos..."
      loadingLabelEn="Loading contacts..."
      isLoading={isLoading}
      isSubmitting={isSubmitting}
      rows={contacts}
      error={error}
      feedback={feedback}
      editingId={editingId}
      form={form}
      onFormChange={(next) =>
        setForm({
          ...next,
          organization_id: Number(next.organization_id),
        })
      }
      onSubmit={handleSubmit}
      onCancel={startCreate}
      onReload={loadData}
      onNew={startCreate}
      fields={[
        {
          key: "organization_id",
          labelEs: "Organización",
          labelEn: "Organization",
          type: "select",
          options: organizations.map((organization) => ({
            value: String(organization.id),
            label: organization.name,
          })),
        },
        { key: "full_name", labelEs: "Nombre completo", labelEn: "Full name" },
        { key: "role_title", labelEs: "Cargo", labelEn: "Role title" },
        { key: "email", labelEs: "Email", labelEn: "Email", type: "email" },
        { key: "phone", labelEs: "Teléfono", labelEn: "Phone" },
        { key: "is_primary", labelEs: "Contacto principal", labelEn: "Primary contact", type: "checkbox" },
        { key: "is_active", labelEs: "Activo", labelEn: "Active", type: "checkbox" },
      ]}
      columns={[
        {
          key: "contact",
          headerEs: "Contacto",
          headerEn: "Contact",
          render: (contact, currentLanguage) => (
            <div>
              <div className="business-core-cell__title">{contact.full_name}</div>
              <div className="business-core-cell__meta">
                {organizationById.get(contact.organization_id)?.name ??
                  (currentLanguage === "es" ? "Organización no encontrada" : "Organization not found")}
              </div>
            </div>
          ),
        },
        {
          key: "role",
          headerEs: "Rol",
          headerEn: "Role",
          render: (contact, currentLanguage) =>
            contact.role_title || (currentLanguage === "es" ? "sin cargo" : "no title"),
        },
        {
          key: "status",
          headerEs: "Estado",
          headerEn: "Status",
          render: (contact, currentLanguage) => (
            <div className="d-flex flex-wrap gap-2">
              <AppBadge tone={contact.is_active ? "success" : "warning"}>
                {contact.is_active
                  ? currentLanguage === "es"
                    ? "activo"
                    : "active"
                  : currentLanguage === "es"
                    ? "inactivo"
                    : "inactive"}
              </AppBadge>
              {contact.is_primary ? (
                <AppBadge tone="info">
                  {currentLanguage === "es" ? "principal" : "primary"}
                </AppBadge>
              ) : null}
            </div>
          ),
        },
        {
          key: "actions",
          headerEs: "Acciones",
          headerEn: "Actions",
          render: (contact, currentLanguage) => (
            <AppToolbar compact>
              <button className="btn btn-sm btn-outline-primary" type="button" onClick={() => startEdit(contact)}>
                {currentLanguage === "es" ? "Editar" : "Edit"}
              </button>
              <button className="btn btn-sm btn-outline-secondary" type="button" onClick={() => void handleToggle(contact)}>
                {contact.is_active
                  ? currentLanguage === "es"
                    ? "Desactivar"
                    : "Deactivate"
                  : currentLanguage === "es"
                    ? "Activar"
                    : "Activate"}
              </button>
              <button className="btn btn-sm btn-outline-danger" type="button" onClick={() => void handleDelete(contact)}>
                {currentLanguage === "es" ? "Eliminar" : "Delete"}
              </button>
            </AppToolbar>
          ),
        },
      ]}
    />
  );
}
