import { useEffect, useState } from "react";
import { AppBadge } from "../../../../../design-system/AppBadge";
import { AppToolbar } from "../../../../../design-system/AppLayout";
import { useLanguage } from "../../../../../store/language-context";
import { useTenantAuth } from "../../../../../store/tenant-auth-context";
import type { ApiError } from "../../../../../types";
import { BusinessCoreCatalogPage } from "../components/common/BusinessCoreCatalogPage";
import {
  createTenantBusinessOrganization,
  deleteTenantBusinessOrganization,
  getTenantBusinessOrganizations,
  updateTenantBusinessOrganization,
  updateTenantBusinessOrganizationStatus,
  type TenantBusinessOrganization,
  type TenantBusinessOrganizationWriteRequest,
} from "../services/organizationsService";

function buildDefaultForm(): TenantBusinessOrganizationWriteRequest {
  return {
    name: "",
    legal_name: null,
    tax_id: null,
    organization_kind: "supplier",
    phone: null,
    email: null,
    notes: null,
    is_active: true,
    sort_order: 100,
  };
}

function normalizeNullable(value: string | null): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : null;
}

export function BusinessCoreOrganizationsPage() {
  const { session } = useTenantAuth();
  const { language } = useLanguage();
  const [organizations, setOrganizations] = useState<TenantBusinessOrganization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [form, setForm] = useState<TenantBusinessOrganizationWriteRequest>(buildDefaultForm());

  async function loadOrganizations() {
    if (!session?.accessToken) {
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await getTenantBusinessOrganizations(session.accessToken, {
        excludeClientOrganizations: true,
      });
      setOrganizations(response.data);
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadOrganizations();
  }, [session?.accessToken]);

  function startCreate() {
    setEditingId(null);
    setFeedback(null);
    setError(null);
    setForm(buildDefaultForm());
  }

  function startEdit(organization: TenantBusinessOrganization) {
    setEditingId(organization.id);
    setFeedback(null);
    setError(null);
    setForm({
      name: organization.name,
      legal_name: organization.legal_name,
      tax_id: organization.tax_id,
      organization_kind: organization.organization_kind,
      phone: organization.phone,
      email: organization.email,
      notes: organization.notes,
      is_active: organization.is_active,
      sort_order: organization.sort_order,
    });
  }

  async function handleSubmit() {
    if (!session?.accessToken) {
      return;
    }
    const payload: TenantBusinessOrganizationWriteRequest = {
      ...form,
      name: form.name.trim(),
      legal_name: normalizeNullable(form.legal_name),
      tax_id: normalizeNullable(form.tax_id),
      phone: normalizeNullable(form.phone),
      email: normalizeNullable(form.email),
      notes: normalizeNullable(form.notes),
    };
    setIsSubmitting(true);
    setError(null);
    try {
      const response = editingId
        ? await updateTenantBusinessOrganization(session.accessToken, editingId, payload)
        : await createTenantBusinessOrganization(session.accessToken, payload);
      setFeedback(response.message);
      startCreate();
      await loadOrganizations();
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleToggle(organization: TenantBusinessOrganization) {
    if (!session?.accessToken) {
      return;
    }
    try {
      const response = await updateTenantBusinessOrganizationStatus(
        session.accessToken,
        organization.id,
        !organization.is_active
      );
      setFeedback(response.message);
      await loadOrganizations();
    } catch (rawError) {
      setError(rawError as ApiError);
    }
  }

  async function handleDelete(organization: TenantBusinessOrganization) {
    if (!session?.accessToken) {
      return;
    }
    const confirmed = window.confirm(
      language === "es"
        ? `Eliminar "${organization.name}" solo funcionará si no tiene clientes ni contactos asociados. ¿Continuar?`
        : `Deleting "${organization.name}" only works if it has no linked clients or contacts. Continue?`
    );
    if (!confirmed) {
      return;
    }
    try {
      const response = await deleteTenantBusinessOrganization(session.accessToken, organization.id);
      if (editingId === organization.id) {
        startCreate();
      }
      setFeedback(response.message);
      await loadOrganizations();
    } catch (rawError) {
      setError(rawError as ApiError);
    }
  }

  return (
    <BusinessCoreCatalogPage
      titleEs="Empresas y contrapartes operativas"
      titleEn="Operational organizations and counterparts"
      descriptionEs="Catálogo para empresa propia, proveedores y partners. Los clientes operativos se gestionan en la vista de Clientes."
      descriptionEn="Catalog for own company, suppliers, and partners. Operational clients are managed from the Clients view."
      helpEs="Esta vista excluye por defecto las organizaciones ya usadas como clientes. Usa Clientes para la cartera comercial y Empresas para contrapartes operativas."
      helpEn="This view excludes organizations already used as clients by default. Use Clients for the commercial portfolio and Organizations for operational counterparts."
      loadingLabelEs="Cargando organizaciones..."
      loadingLabelEn="Loading organizations..."
      isLoading={isLoading}
      isSubmitting={isSubmitting}
      rows={organizations}
      error={error}
      feedback={feedback}
      editingId={editingId}
      form={form}
      onFormChange={setForm}
      onSubmit={handleSubmit}
      onCancel={startCreate}
      onReload={loadOrganizations}
      onNew={startCreate}
      fields={[
        { key: "name", labelEs: "Nombre", labelEn: "Name", placeholderEs: "Ej: Acme Ltda", placeholderEn: "Ex: Acme Ltd" },
        { key: "legal_name", labelEs: "Razón social", labelEn: "Legal name" },
        { key: "tax_id", labelEs: "RUT / Tax ID", labelEn: "Tax ID" },
        {
          key: "organization_kind",
          labelEs: "Tipo",
          labelEn: "Kind",
          type: "select",
          options: [
            { value: "supplier", label: language === "es" ? "Proveedor" : "Supplier" },
            { value: "partner", label: language === "es" ? "Partner" : "Partner" },
            { value: "internal", label: language === "es" ? "Interna" : "Internal" },
          ],
        },
        { key: "phone", labelEs: "Teléfono", labelEn: "Phone" },
        { key: "email", labelEs: "Email", labelEn: "Email", type: "email" },
        { key: "sort_order", labelEs: "Orden", labelEn: "Sort order", type: "number", min: 0 },
        { key: "is_active", labelEs: "Activa", labelEn: "Active", type: "checkbox" },
        { key: "notes", labelEs: "Notas", labelEn: "Notes", type: "textarea" },
      ]}
      columns={[
        {
          key: "name",
          headerEs: "Organización",
          headerEn: "Organization",
          render: (organization) => (
            <div>
              <div className="business-core-cell__title">{organization.name}</div>
              <div className="business-core-cell__meta">
                {organization.legal_name || (language === "es" ? "sin razón social" : "no legal name")}
              </div>
            </div>
          ),
        },
        {
          key: "kind",
          headerEs: "Tipo",
          headerEn: "Kind",
          render: (organization, currentLanguage) => organization.organization_kind === "internal"
            ? currentLanguage === "es" ? "Interna" : "Internal"
            : organization.organization_kind === "supplier"
              ? currentLanguage === "es" ? "Proveedor" : "Supplier"
              : organization.organization_kind === "partner"
                ? "Partner"
                : currentLanguage === "es" ? "Cliente" : "Client",
        },
        {
          key: "status",
          headerEs: "Estado",
          headerEn: "Status",
          render: (organization, currentLanguage) => (
            <AppBadge tone={organization.is_active ? "success" : "warning"}>
              {organization.is_active
                ? currentLanguage === "es"
                  ? "activa"
                  : "active"
                : currentLanguage === "es"
                  ? "inactiva"
                  : "inactive"}
            </AppBadge>
          ),
        },
        {
          key: "actions",
          headerEs: "Acciones",
          headerEn: "Actions",
          render: (organization, currentLanguage) => (
            <AppToolbar compact>
              <button className="btn btn-sm btn-outline-primary" type="button" onClick={() => startEdit(organization)}>
                {currentLanguage === "es" ? "Editar" : "Edit"}
              </button>
              <button className="btn btn-sm btn-outline-secondary" type="button" onClick={() => void handleToggle(organization)}>
                {organization.is_active
                  ? currentLanguage === "es"
                    ? "Desactivar"
                    : "Deactivate"
                  : currentLanguage === "es"
                    ? "Activar"
                    : "Activate"}
              </button>
              <button className="btn btn-sm btn-outline-danger" type="button" onClick={() => void handleDelete(organization)}>
                {currentLanguage === "es" ? "Eliminar" : "Delete"}
              </button>
            </AppToolbar>
          ),
        },
      ]}
    />
  );
}
