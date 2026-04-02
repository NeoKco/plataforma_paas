import { useEffect, useMemo, useState } from "react";
import { AppBadge } from "../../../../../design-system/AppBadge";
import { AppToolbar } from "../../../../../design-system/AppLayout";
import { useLanguage } from "../../../../../store/language-context";
import { useTenantAuth } from "../../../../../store/tenant-auth-context";
import type { ApiError } from "../../../../../types";
import { BusinessCoreCatalogPage } from "../components/common/BusinessCoreCatalogPage";
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
  getTenantBusinessOrganizations,
  type TenantBusinessOrganization,
} from "../services/organizationsService";

function buildDefaultForm(): TenantBusinessClientWriteRequest {
  return {
    organization_id: 0,
    client_code: null,
    service_status: "active",
    commercial_notes: null,
    is_active: true,
    sort_order: 100,
  };
}

function normalizeNullable(value: string | null): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : null;
}

export function BusinessCoreClientsPage() {
  const { session } = useTenantAuth();
  const { language } = useLanguage();
  const [clients, setClients] = useState<TenantBusinessClient[]>([]);
  const [organizations, setOrganizations] = useState<TenantBusinessOrganization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [form, setForm] = useState<TenantBusinessClientWriteRequest>(buildDefaultForm());

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
      const [clientsResponse, organizationsResponse] = await Promise.all([
        getTenantBusinessClients(session.accessToken),
        getTenantBusinessOrganizations(session.accessToken, { includeInactive: false }),
      ]);
      setClients(clientsResponse.data);
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

  function startEdit(client: TenantBusinessClient) {
    setEditingId(client.id);
    setFeedback(null);
    setError(null);
    setForm({
      organization_id: client.organization_id,
      client_code: client.client_code,
      service_status: client.service_status,
      commercial_notes: client.commercial_notes,
      is_active: client.is_active,
      sort_order: client.sort_order,
    });
  }

  async function handleSubmit() {
    if (!session?.accessToken) {
      return;
    }
    const payload: TenantBusinessClientWriteRequest = {
      ...form,
      organization_id: Number(form.organization_id),
      client_code: normalizeNullable(form.client_code),
      commercial_notes: normalizeNullable(form.commercial_notes),
    };
    setIsSubmitting(true);
    setError(null);
    try {
      const response = editingId
        ? await updateTenantBusinessClient(session.accessToken, editingId, payload)
        : await createTenantBusinessClient(session.accessToken, payload);
      setFeedback(response.message);
      startCreate();
      await loadData();
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleToggle(client: TenantBusinessClient) {
    if (!session?.accessToken) {
      return;
    }
    try {
      const response = await updateTenantBusinessClientStatus(
        session.accessToken,
        client.id,
        !client.is_active
      );
      setFeedback(response.message);
      await loadData();
    } catch (rawError) {
      setError(rawError as ApiError);
    }
  }

  async function handleDelete(client: TenantBusinessClient) {
    if (!session?.accessToken) {
      return;
    }
    const confirmed = window.confirm(
      language === "es"
        ? "Eliminar el cliente solo funcionará si no tiene sitios asociados. ¿Continuar?"
        : "Deleting the client only works when it has no linked sites. Continue?"
    );
    if (!confirmed) {
      return;
    }
    try {
      const response = await deleteTenantBusinessClient(session.accessToken, client.id);
      if (editingId === client.id) {
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
      titleEs="Clientes"
      titleEn="Clients"
      descriptionEs="Entidad cliente separada de la organización para no mezclar roles comerciales con identidad base."
      descriptionEn="Client entity separated from organization to avoid mixing commercial roles with base identity."
      helpEs="Un cliente reutiliza una organización existente. Si mañana esa misma contraparte también es proveedora, no duplicas la identidad base."
      helpEn="A client reuses an existing organization. If that same counterpart becomes a supplier later, you do not duplicate the base identity."
      loadingLabelEs="Cargando clientes..."
      loadingLabelEn="Loading clients..."
      isLoading={isLoading}
      isSubmitting={isSubmitting}
      rows={clients}
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
        { key: "client_code", labelEs: "Código cliente", labelEn: "Client code" },
        {
          key: "service_status",
          labelEs: "Estado de servicio",
          labelEn: "Service status",
          type: "select",
          options: [
            { value: "active", label: language === "es" ? "Activo" : "Active" },
            { value: "paused", label: language === "es" ? "Pausado" : "Paused" },
            { value: "prospect", label: language === "es" ? "Prospecto" : "Prospect" },
          ],
        },
        { key: "sort_order", labelEs: "Orden", labelEn: "Sort order", type: "number", min: 0 },
        { key: "is_active", labelEs: "Activo", labelEn: "Active", type: "checkbox" },
        { key: "commercial_notes", labelEs: "Notas comerciales", labelEn: "Commercial notes", type: "textarea" },
      ]}
      columns={[
        {
          key: "client",
          headerEs: "Cliente",
          headerEn: "Client",
          render: (client, currentLanguage) => (
            <div>
              <div className="business-core-cell__title">
                {organizationById.get(client.organization_id)?.name ??
                  (currentLanguage === "es" ? "Organización no encontrada" : "Organization not found")}
              </div>
              <div className="business-core-cell__meta">
                {client.client_code || (currentLanguage === "es" ? "sin código" : "no code")}
              </div>
            </div>
          ),
        },
        {
          key: "service",
          headerEs: "Servicio",
          headerEn: "Service",
          render: (client, currentLanguage) =>
            client.service_status === "paused"
              ? currentLanguage === "es"
                ? "Pausado"
                : "Paused"
              : client.service_status === "prospect"
                ? currentLanguage === "es"
                  ? "Prospecto"
                  : "Prospect"
                : currentLanguage === "es"
                  ? "Activo"
                  : "Active",
        },
        {
          key: "status",
          headerEs: "Estado",
          headerEn: "Status",
          render: (client, currentLanguage) => (
            <AppBadge tone={client.is_active ? "success" : "warning"}>
              {client.is_active
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
          render: (client, currentLanguage) => (
            <AppToolbar compact>
              <button className="btn btn-sm btn-outline-primary" type="button" onClick={() => startEdit(client)}>
                {currentLanguage === "es" ? "Editar" : "Edit"}
              </button>
              <button className="btn btn-sm btn-outline-secondary" type="button" onClick={() => void handleToggle(client)}>
                {client.is_active
                  ? currentLanguage === "es"
                    ? "Desactivar"
                    : "Deactivate"
                  : currentLanguage === "es"
                    ? "Activar"
                    : "Activate"}
              </button>
              <button className="btn btn-sm btn-outline-danger" type="button" onClick={() => void handleDelete(client)}>
                {currentLanguage === "es" ? "Eliminar" : "Delete"}
              </button>
            </AppToolbar>
          ),
        },
      ]}
    />
  );
}
