import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { PageHeader } from "../../../../../components/common/PageHeader";
import { PanelCard } from "../../../../../components/common/PanelCard";
import { DataTableCard } from "../../../../../components/data-display/DataTableCard";
import { ErrorState } from "../../../../../components/feedback/ErrorState";
import { LoadingBlock } from "../../../../../components/feedback/LoadingBlock";
import { MetricCard } from "../../../../../components/common/MetricCard";
import { AppBadge } from "../../../../../design-system/AppBadge";
import { AppToolbar } from "../../../../../design-system/AppLayout";
import { getApiErrorDisplayMessage } from "../../../../../services/api";
import { getTenantUsers } from "../../../../../services/tenant-api";
import { useLanguage } from "../../../../../store/language-context";
import { useTenantAuth } from "../../../../../store/tenant-auth-context";
import { formatDateTimeInTimeZone } from "../../../../../utils/dateTimeLocal";
import type { ApiError, TenantUsersItem } from "../../../../../types";
import { MaintenanceHelpBubble } from "../components/common/MaintenanceHelpBubble";
import { MaintenanceModuleNav } from "../components/common/MaintenanceModuleNav";
import {
  createTenantMaintenanceWorkOrder,
  deleteTenantMaintenanceWorkOrder,
  getTenantMaintenanceWorkOrders,
  updateTenantMaintenanceWorkOrder,
  updateTenantMaintenanceWorkOrderStatus,
  type TenantMaintenanceWorkOrder,
  type TenantMaintenanceWorkOrderWriteRequest,
} from "../services/workOrdersService";
import {
  getTenantMaintenanceInstallations,
  type TenantMaintenanceInstallation,
} from "../services/installationsService";
import {
  getTenantBusinessClients,
  type TenantBusinessClient,
} from "../../business_core/services/clientsService";
import {
  getTenantBusinessOrganizations,
  type TenantBusinessOrganization,
} from "../../business_core/services/organizationsService";
import {
  getTenantBusinessWorkGroups,
  type TenantBusinessWorkGroup,
} from "../../business_core/services/workGroupsService";
import {
  getTenantBusinessSites,
  type TenantBusinessSite,
} from "../../business_core/services/sitesService";
import { getVisibleAddressLabel } from "../../business_core/utils/addressPresentation";
import { stripLegacyVisibleText } from "../../../../../utils/legacyVisibleText";

const ACTIVE_WORK_ORDER_STATUSES = new Set(["scheduled", "in_progress"]);

function buildDefaultForm(): TenantMaintenanceWorkOrderWriteRequest {
  return {
    client_id: 0,
    site_id: 0,
    installation_id: null,
    assigned_work_group_id: null,
    external_reference: null,
    title: "",
    description: null,
    priority: "normal",
    scheduled_for: null,
    cancellation_reason: null,
    closure_notes: null,
    assigned_tenant_user_id: null,
    maintenance_status: "scheduled",
  };
}

function normalizeNullable(value: string | null): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : null;
}

function formatDateTime(
  value: string | null,
  language: "es" | "en",
  timeZone?: string | null
): string {
  if (!value) {
    return language === "es" ? "sin fecha" : "no date";
  }
  return formatDateTimeInTimeZone(value, language, timeZone);
}

function getStatusTone(status: string): "success" | "warning" | "danger" | "info" | "neutral" {
  if (status === "completed") {
    return "success";
  }
  if (status === "cancelled") {
    return "danger";
  }
  if (status === "in_progress") {
    return "info";
  }
  if (status === "scheduled") {
    return "warning";
  }
  return "neutral";
}

function getStatusLabel(status: string, language: "es" | "en"): string {
  switch (status) {
    case "scheduled":
      return language === "es" ? "Programada" : "Scheduled";
    case "in_progress":
      return language === "es" ? "En curso" : "In progress";
    case "completed":
      return language === "es" ? "Completada" : "Completed";
    case "cancelled":
      return language === "es" ? "Anulada" : "Cancelled";
    default:
      return status;
  }
}

export function MaintenanceWorkOrdersPage() {
  const { session, effectiveTimeZone } = useTenantAuth();
  const { language } = useLanguage();
  const [searchParams] = useSearchParams();
  const [rows, setRows] = useState<TenantMaintenanceWorkOrder[]>([]);
  const [clients, setClients] = useState<TenantBusinessClient[]>([]);
  const [organizations, setOrganizations] = useState<TenantBusinessOrganization[]>([]);
  const [sites, setSites] = useState<TenantBusinessSite[]>([]);
  const [installations, setInstallations] = useState<TenantMaintenanceInstallation[]>([]);
  const [workGroups, setWorkGroups] = useState<TenantBusinessWorkGroup[]>([]);
  const [tenantUsers, setTenantUsers] = useState<TenantUsersItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [requestedCreateHandled, setRequestedCreateHandled] = useState(false);
  const [form, setForm] = useState<TenantMaintenanceWorkOrderWriteRequest>(buildDefaultForm());

  const requestedClientId = Number(searchParams.get("clientId") || 0);
  const requestedSiteId = Number(searchParams.get("siteId") || 0);
  const requestedInstallationId = Number(searchParams.get("installationId") || 0);
  const requestedMode = searchParams.get("mode");

  const siteById = useMemo(() => new Map(sites.map((site) => [site.id, site])), [sites]);
  const organizationById = useMemo(
    () => new Map(organizations.map((organization) => [organization.id, organization])),
    [organizations]
  );
  const clientById = useMemo(
    () => new Map(clients.map((client) => [client.id, client])),
    [clients]
  );
  const installationById = useMemo(
    () => new Map(installations.map((item) => [item.id, item])),
    [installations]
  );
  const workGroupById = useMemo(
    () => new Map(workGroups.map((group) => [group.id, group])),
    [workGroups]
  );
  const tenantUserById = useMemo(
    () => new Map(tenantUsers.map((user) => [user.id, user])),
    [tenantUsers]
  );

  const filteredSites = useMemo(
    () =>
      form.client_id > 0
        ? sites.filter((site) => site.client_id === Number(form.client_id))
        : sites,
    [form.client_id, sites]
  );

  const filteredInstallations = useMemo(
    () =>
      form.site_id > 0
        ? installations.filter((item) => item.site_id === Number(form.site_id))
        : installations,
    [form.site_id, installations]
  );

  const activeWorkGroups = useMemo(
    () => workGroups.filter((group) => group.is_active),
    [workGroups]
  );

  const activeTenantUsers = useMemo(
    () => tenantUsers.filter((user) => user.is_active),
    [tenantUsers]
  );

  const sortedRows = useMemo(
    () =>
      [...rows].sort((left, right) => {
        const leftDate = new Date(left.scheduled_for || left.requested_at).getTime();
        const rightDate = new Date(right.scheduled_for || right.requested_at).getTime();
        return rightDate - leftDate;
      }),
    [rows]
  );

  const activeRows = useMemo(
    () => sortedRows.filter((item) => ACTIVE_WORK_ORDER_STATUSES.has(item.maintenance_status)),
    [sortedRows]
  );

  const noClientsAvailable = clients.length === 0;
  const selectedClientSites = form.client_id > 0 ? filteredSites : [];
  const selectedSiteInstallations = form.site_id > 0 ? filteredInstallations : [];
  const missingSiteForSelectedClient = form.client_id > 0 && selectedClientSites.length === 0;
  const missingInstallationForSelectedSite =
    form.site_id > 0 && selectedSiteInstallations.length === 0;
  const submitBlocked =
    noClientsAvailable ||
    Number(form.client_id) <= 0 ||
    Number(form.site_id) <= 0 ||
    !form.installation_id ||
    missingSiteForSelectedClient ||
    missingInstallationForSelectedSite;

  const summary = useMemo(() => {
    return rows.reduce(
      (accumulator, row) => {
        if (ACTIVE_WORK_ORDER_STATUSES.has(row.maintenance_status)) {
          accumulator.total += 1;
        }
        if (row.maintenance_status === "scheduled") {
          accumulator.scheduled += 1;
        } else if (row.maintenance_status === "in_progress") {
          accumulator.inProgress += 1;
        } else if (row.maintenance_status === "completed") {
          accumulator.completed += 1;
        } else if (row.maintenance_status === "cancelled") {
          accumulator.cancelled += 1;
        }
        return accumulator;
      },
      { total: 0, scheduled: 0, inProgress: 0, completed: 0, cancelled: 0 }
    );
  }, [rows]);

  async function loadData() {
    if (!session?.accessToken) {
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const [
        workOrdersResponse,
        clientsResponse,
        organizationsResponse,
        sitesResponse,
        installationsResponse,
        workGroupsResponse,
        tenantUsersResponse,
      ] = await Promise.all([
        getTenantMaintenanceWorkOrders(session.accessToken, {
          ...(requestedClientId > 0 ? { clientId: requestedClientId } : {}),
          ...(requestedSiteId > 0 ? { siteId: requestedSiteId } : {}),
        }),
        getTenantBusinessClients(session.accessToken, { includeInactive: false }),
        getTenantBusinessOrganizations(session.accessToken, { includeInactive: false }),
        getTenantBusinessSites(session.accessToken, { includeInactive: false }),
        getTenantMaintenanceInstallations(session.accessToken, { includeInactive: false }),
        getTenantBusinessWorkGroups(session.accessToken, { includeInactive: false }),
        getTenantUsers(session.accessToken),
      ]);
      setRows(workOrdersResponse.data);
      setClients(clientsResponse.data);
      setOrganizations(organizationsResponse.data);
      setSites(sitesResponse.data);
      setInstallations(installationsResponse.data);
      setWorkGroups(workGroupsResponse.data);
      setTenantUsers(tenantUsersResponse.data);

      setForm((current) => {
        const nextClientId = current.client_id || requestedClientId || clientsResponse.data[0]?.id || 0;
        const candidateSites = sitesResponse.data.filter((site) => site.client_id === nextClientId);
        const nextSiteId =
          current.site_id || (requestedSiteId > 0 ? requestedSiteId : 0) || candidateSites[0]?.id || 0;
        const candidateInstallations = installationsResponse.data.filter(
          (installation) => installation.site_id === nextSiteId
        );
        return {
          ...current,
          client_id: nextClientId,
          site_id: nextSiteId,
          installation_id:
            current.installation_id ||
            (requestedInstallationId > 0 ? requestedInstallationId : null) ||
            candidateInstallations[0]?.id ||
            null,
          assigned_work_group_id: current.assigned_work_group_id || null,
        };
      });
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
    if (!isLoading && requestedMode === "create" && !requestedCreateHandled) {
      setRequestedCreateHandled(true);
      startCreate(true);
    }
  }, [isLoading, requestedMode, requestedCreateHandled]);

  useEffect(() => {
    if (!filteredSites.some((site) => site.id === Number(form.site_id))) {
      setForm((current) => ({
        ...current,
        site_id: filteredSites[0]?.id || 0,
        installation_id: null,
      }));
    }
  }, [filteredSites, form.site_id]);

  useEffect(() => {
    if (!filteredInstallations.some((item) => item.id === Number(form.installation_id))) {
      setForm((current) => ({
        ...current,
        installation_id: filteredInstallations[0]?.id || null,
      }));
    }
  }, [filteredInstallations, form.installation_id]);

  function startCreate(openForm = false, scheduledFor: string | null = null) {
    const clientId = requestedClientId || clients[0]?.id || 0;
    const candidateSites = sites.filter((site) => site.client_id === clientId);
    const siteId = requestedSiteId || candidateSites[0]?.id || 0;
    const candidateInstallations = installations.filter((installation) => installation.site_id === siteId);
    setEditingId(null);
    setFeedback(null);
    setError(null);
    setIsFormOpen(openForm);
    setForm({
      ...buildDefaultForm(),
      client_id: clientId,
      site_id: siteId,
      installation_id: requestedInstallationId || candidateInstallations[0]?.id || null,
      assigned_work_group_id: null,
      scheduled_for: scheduledFor,
    });
  }

  function getClientDisplayName(clientId: number): string {
    const client = clientById.get(clientId);
    const organization = organizationById.get(client?.organization_id ?? -1);
    return (
      stripLegacyVisibleText(organization?.name) ||
      stripLegacyVisibleText(organization?.legal_name) ||
      (language === "es" ? "Cliente sin nombre" : "Unnamed client")
    );
  }

  function getSiteDisplayName(siteId: number): string {
    const site = siteById.get(siteId);
    if (!site) {
      return language === "es" ? "Dirección sin registrar" : "Missing address";
    }
    const visibleAddress =
      stripLegacyVisibleText(getVisibleAddressLabel(site)) ||
      stripLegacyVisibleText(site.name) ||
      (language === "es" ? "Dirección sin nombre" : "Unnamed address");
    const locality = [site.commune, site.city, site.region]
      .map((value) => stripLegacyVisibleText(value))
      .filter((value): value is string => Boolean(value))
      .join(", ");
    return locality ? `${visibleAddress} · ${locality}` : visibleAddress;
  }

  function getClientOptionLabel(client: TenantBusinessClient): string {
    const primarySite = sites.find((site) => site.client_id === client.id);
    const clientName = getClientDisplayName(client.id);
    return primarySite ? `${clientName} · ${getSiteDisplayName(primarySite.id)}` : clientName;
  }

  function startEdit(item: TenantMaintenanceWorkOrder) {
    setEditingId(item.id);
    setFeedback(null);
    setError(null);
    setIsFormOpen(true);
    setForm({
      client_id: item.client_id,
      site_id: item.site_id,
      installation_id: item.installation_id,
      assigned_work_group_id: item.assigned_work_group_id,
      external_reference: item.external_reference,
      title: item.title,
      description: stripLegacyVisibleText(item.description),
      priority: item.priority,
      scheduled_for: item.scheduled_for,
      cancellation_reason: null,
      closure_notes: stripLegacyVisibleText(item.closure_notes),
      assigned_tenant_user_id: item.assigned_tenant_user_id,
      maintenance_status: item.maintenance_status,
    });
  }

  async function handleSubmit() {
    if (!session?.accessToken) {
      return;
    }
    setIsSubmitting(true);
    setError(null);
    const payload: TenantMaintenanceWorkOrderWriteRequest = {
      client_id: Number(form.client_id),
      site_id: Number(form.site_id),
      installation_id: form.installation_id ? Number(form.installation_id) : null,
      assigned_work_group_id: form.assigned_work_group_id ? Number(form.assigned_work_group_id) : null,
      external_reference: editingId ? normalizeNullable(form.external_reference) : null,
      title: form.title.trim(),
      description: stripLegacyVisibleText(normalizeNullable(form.description)),
      priority: form.priority.trim().toLowerCase() || "normal",
      scheduled_for: normalizeNullable(form.scheduled_for),
      cancellation_reason: null,
      closure_notes: editingId ? stripLegacyVisibleText(normalizeNullable(form.closure_notes)) : null,
      assigned_tenant_user_id: form.assigned_tenant_user_id ? Number(form.assigned_tenant_user_id) : null,
      ...(editingId ? {} : { maintenance_status: form.maintenance_status || "scheduled" }),
    };
    try {
      const response = editingId
        ? await updateTenantMaintenanceWorkOrder(session.accessToken, editingId, payload)
        : await createTenantMaintenanceWorkOrder(session.accessToken, payload);
      setFeedback(response.message);
      startCreate(false);
      await loadData();
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleStatusChange(workOrder: TenantMaintenanceWorkOrder, nextStatus: string) {
    if (!session?.accessToken) {
      return;
    }
    const note = window.prompt(
      language === "es"
        ? `Motivo o nota para cambiar a ${getStatusLabel(nextStatus, language)}`
        : `Reason or note to change to ${getStatusLabel(nextStatus, language)}`
    );
    try {
      const response = await updateTenantMaintenanceWorkOrderStatus(
        session.accessToken,
        workOrder.id,
        nextStatus,
        note
      );
      setFeedback(response.message);
      await loadData();
    } catch (rawError) {
      setError(rawError as ApiError);
    }
  }

  async function handleDelete(workOrder: TenantMaintenanceWorkOrder) {
    if (!session?.accessToken) {
      return;
    }
    const confirmed = window.confirm(
      language === "es"
        ? `Eliminar la orden "${workOrder.title}" solo funciona si no tiene trazabilidad relevante. ¿Continuar?`
        : `Delete work order "${workOrder.title}" only if it has no relevant traceability. Continue?`
    );
    if (!confirmed) {
      return;
    }
    try {
      const response = await deleteTenantMaintenanceWorkOrder(session.accessToken, workOrder.id);
      if (editingId === workOrder.id) {
        startCreate(false);
      }
      setFeedback(response.message);
      await loadData();
    } catch (rawError) {
      setError(rawError as ApiError);
    }
  }

  return (
    <div className="d-grid gap-4">
      <PageHeader
        eyebrow={language === "es" ? "Mantenciones" : "Maintenance"}
        icon="maintenance"
        title={language === "es" ? "Mantenciones abiertas" : "Open maintenance work"}
        description={
          language === "es"
            ? "Aquí solo se trabajan las mantenciones programadas o en curso. Las realizadas o anuladas pasan de inmediato al historial."
            : "Only scheduled or in-progress maintenance is worked here. Completed or cancelled work moves immediately to history."
        }
        actions={
          <AppToolbar compact>
            <MaintenanceHelpBubble
              label={language === "es" ? "Ayuda" : "Help"}
              helpText={
                language === "es"
                  ? "Toda mantención debe colgar de un cliente, una dirección y una instalación real. Si falta uno de esos tres, primero debes crearlo."
                  : "Every maintenance work item must belong to a real client, address, and installation. If any is missing, create it first."
              }
            />
            <button className="btn btn-outline-secondary" type="button" onClick={() => void loadData()}>
              {language === "es" ? "Recargar" : "Reload"}
            </button>
            <button
              className="btn btn-primary"
              type="button"
              onClick={() => startCreate(true)}
              disabled={noClientsAvailable}
              title={
                noClientsAvailable
                  ? language === "es"
                    ? "Primero crea un cliente en Core de negocio"
                    : "Create a client in Business core first"
                  : undefined
              }
            >
              {language === "es" ? "Nueva orden" : "New work order"}
            </button>
          </AppToolbar>
        }
      />
      <MaintenanceModuleNav />

      {requestedClientId > 0 ? (
        <div className="maintenance-context-banner">
          {language === "es"
            ? "Vista abierta desde la ficha del cliente. Las mantenciones quedan filtradas por ese cliente y la nueva orden se precarga con sus datos."
            : "View opened from the client detail. Work orders are filtered by that client and the new work order is preloaded with its data."}
        </div>
      ) : null}

      {noClientsAvailable ? (
        <div className="alert alert-warning mb-0">
          {language === "es"
            ? "Antes de agendar una mantención debe existir un cliente en Core de negocio."
            : "A client must exist in Business core before scheduling maintenance."}{" "}
          <Link to="/tenant-portal/business-core/clients">
            {language === "es" ? "Ir a clientes" : "Go to clients"}
          </Link>
        </div>
      ) : null}

      {feedback ? <div className="alert alert-success mb-0">{feedback}</div> : null}

      {error ? (
        <ErrorState
          title={language === "es" ? "No se pudo cargar la vista" : "The view could not be loaded"}
          detail={getApiErrorDisplayMessage(error)}
          requestId={error.payload?.request_id}
        />
      ) : null}

      {isLoading ? (
        <LoadingBlock label={language === "es" ? "Cargando mantenciones..." : "Loading maintenance..."} />
      ) : null}

      <div className="row g-3">
        <div className="col-12 col-md-6 col-xl-3">
          <MetricCard
            label={language === "es" ? "Abiertas" : "Open"}
            value={summary.total}
            hint={language === "es" ? "Mantenciones visibles aquí" : "Maintenance work visible here"}
            icon="maintenance"
            tone="info"
          />
        </div>
        <div className="col-12 col-md-6 col-xl-3">
          <MetricCard
            label={language === "es" ? "Programadas" : "Scheduled"}
            value={summary.scheduled}
            hint={language === "es" ? "Pendientes de ejecutar" : "Waiting to be executed"}
            icon="planning"
            tone="warning"
          />
        </div>
        <div className="col-12 col-md-6 col-xl-3">
          <MetricCard
            label={language === "es" ? "En curso" : "In progress"}
            value={summary.inProgress}
            hint={language === "es" ? "Trabajo activo de terreno" : "Active field work"}
            icon="focus"
            tone="info"
          />
        </div>
        <div className="col-12 col-md-6 col-xl-3">
          <MetricCard
            label={language === "es" ? "Historial" : "History"}
            value={summary.completed + summary.cancelled}
            hint={language === "es" ? "Realizadas o anuladas" : "Completed or cancelled"}
            icon="reports"
            tone="success"
          />
        </div>
      </div>

      {activeRows.length === 0 && !isLoading ? (
        <PanelCard
          title={language === "es" ? "No hay mantenciones abiertas" : "There are no open work orders"}
          subtitle={
            language === "es"
              ? "Las mantenciones realizadas o anuladas ya no aparecen aquí; revísalas en Historial. Usa Nueva orden para programar trabajo nuevo."
              : "Completed or cancelled maintenance no longer appears here; review it in History. Use New work order to schedule new work."
          }
        >
          <div className="maintenance-cell__meta">
            {language === "es"
              ? "La bandeja diaria queda reservada solo para trabajo pendiente."
              : "The day-to-day tray is reserved only for pending work."}
          </div>
        </PanelCard>
      ) : null}

      {isFormOpen ? (
        <div className="maintenance-form-backdrop" role="presentation" onClick={() => startCreate(false)}>
          <div
            className="maintenance-form-modal maintenance-form-modal--wide"
            role="dialog"
            aria-modal="true"
            aria-label={
              editingId
                ? language === "es"
                  ? "Editar mantención"
                  : "Edit maintenance work"
                : language === "es"
                  ? "Nueva mantención"
                  : "New maintenance work"
            }
            onClick={(event) => event.stopPropagation()}
          >
            <div className="maintenance-form-modal__eyebrow">
              {editingId
                ? language === "es"
                  ? "Edición puntual"
                  : "Targeted edit"
                : language === "es"
                  ? "Alta bajo demanda"
                  : "On-demand creation"}
            </div>
            <PanelCard
              title={
                editingId
                  ? language === "es"
                    ? "Editar mantención"
                    : "Edit maintenance work"
                  : language === "es"
                    ? "Nueva mantención"
                    : "New maintenance work"
              }
              subtitle={
                language === "es"
                  ? "Programa solo trabajo abierto. Al completarlo, saldrá de esta bandeja y quedará en historial."
                  : "Schedule only open work. Once completed, it will leave this tray and remain in history."
              }
            >
              <form
                className="maintenance-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleSubmit();
                }}
              >
                <div className="row g-3">
                  <div className="col-12 col-md-6">
                    <label className="form-label">{language === "es" ? "Cliente" : "Client"}</label>
                    <select
                      className="form-select"
                      value={form.client_id}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          client_id: Number(event.target.value),
                        }))
                      }
                    >
                      <option value={0}>
                        {language === "es" ? "Selecciona un cliente" : "Select a client"}
                      </option>
                      {clients.map((client) => (
                        <option key={client.id} value={client.id}>
                          {getClientOptionLabel(client)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">{language === "es" ? "Dirección" : "Address"}</label>
                    <select
                      className="form-select"
                      value={form.site_id}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          site_id: Number(event.target.value),
                        }))
                      }
                    >
                      <option value={0}>
                        {language === "es" ? "Selecciona una dirección" : "Select an address"}
                      </option>
                      {filteredSites.map((site) => (
                        <option key={site.id} value={site.id}>
                          {getSiteDisplayName(site.id)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">
                      {language === "es" ? "Instalación" : "Installation"}
                    </label>
                    <select
                      className="form-select"
                      value={form.installation_id ?? ""}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          installation_id: event.target.value ? Number(event.target.value) : null,
                        }))
                      }
                    >
                      <option value="">
                        {language === "es"
                          ? "Selecciona una instalación"
                          : "Select an installation"}
                      </option>
                      {filteredInstallations.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">
                      {language === "es" ? "Grupo responsable" : "Responsible group"}
                    </label>
                    <select
                      className="form-select"
                      value={form.assigned_work_group_id ?? ""}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          assigned_work_group_id: event.target.value ? Number(event.target.value) : null,
                        }))
                      }
                    >
                      <option value="">
                        {language === "es" ? "Sin grupo asignado" : "No group assigned"}
                      </option>
                      {activeWorkGroups.map((group) => (
                        <option key={group.id} value={group.id}>
                          {group.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">
                      {language === "es" ? "Técnico responsable" : "Assigned technician"}
                    </label>
                    <select
                      className="form-select"
                      value={form.assigned_tenant_user_id ?? ""}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          assigned_tenant_user_id: event.target.value ? Number(event.target.value) : null,
                        }))
                      }
                    >
                      <option value="">
                        {language === "es" ? "Sin técnico asignado" : "No technician assigned"}
                      </option>
                      {activeTenantUsers.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.full_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {!editingId ? (
                    <div className="col-12 col-md-6">
                      <label className="form-label">
                        {language === "es" ? "Estado inicial" : "Initial status"}
                      </label>
                      <select
                        className="form-select"
                        value={form.maintenance_status}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            maintenance_status: event.target.value,
                          }))
                        }
                      >
                        <option value="scheduled">{language === "es" ? "Programada" : "Scheduled"}</option>
                        <option value="in_progress">{language === "es" ? "En curso" : "In progress"}</option>
                      </select>
                    </div>
                  ) : null}
                  <div className="col-12 col-md-6">
                    <label className="form-label">{language === "es" ? "Prioridad" : "Priority"}</label>
                    <select
                      className="form-select"
                      value={form.priority}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          priority: event.target.value,
                        }))
                      }
                    >
                      <option value="low">{language === "es" ? "Baja" : "Low"}</option>
                      <option value="normal">{language === "es" ? "Normal" : "Normal"}</option>
                      <option value="high">{language === "es" ? "Alta" : "High"}</option>
                      <option value="critical">{language === "es" ? "Crítica" : "Critical"}</option>
                    </select>
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">
                      {language === "es" ? "Fecha y hora programada" : "Scheduled date and time"}
                    </label>
                    <input
                      className="form-control"
                      type="datetime-local"
                      value={form.scheduled_for ?? ""}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          scheduled_for: event.target.value,
                        }))
                      }
                    />
                  </div>
                  {missingSiteForSelectedClient ? (
                    <div className="col-12">
                      <div className="alert alert-warning mb-0">
                        {language === "es"
                          ? "Este cliente aún no tiene dirección operativa. Crea la dirección antes de agendar la mantención."
                          : "This client does not have an operational address yet. Create it before scheduling maintenance."}{" "}
                        <Link to="/tenant-portal/business-core/clients">
                          {language === "es" ? "Ir a clientes" : "Go to clients"}
                        </Link>
                      </div>
                    </div>
                  ) : null}
                  {missingInstallationForSelectedSite ? (
                    <div className="col-12">
                      <div className="alert alert-warning mb-0">
                        {language === "es"
                          ? "La dirección seleccionada aún no tiene instalación. Crea la instalación antes de agendar la mantención."
                          : "The selected address does not have an installation yet. Create the installation before scheduling maintenance."}{" "}
                        <Link
                          to={`/tenant-portal/maintenance/installations?clientId=${Number(form.client_id) || 0}&siteId=${Number(form.site_id) || 0}&mode=create`}
                        >
                          {language === "es" ? "Ir a instalaciones" : "Go to installations"}
                        </Link>
                      </div>
                    </div>
                  ) : null}
                  <div className="col-12">
                    <label className="form-label">{language === "es" ? "Trabajo a realizar" : "Work to be done"}</label>
                    <input
                      className="form-control"
                      value={form.title}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          title: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label">
                      {language === "es" ? "Detalle técnico" : "Technical detail"}
                    </label>
                    <textarea
                      className="form-control"
                      rows={4}
                      value={form.description ?? ""}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          description: event.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
                <div className="maintenance-form__actions">
                  <button className="btn btn-outline-secondary" type="button" onClick={() => startCreate(false)}>
                    {language === "es" ? "Cancelar" : "Cancel"}
                  </button>
                  <button className="btn btn-primary" type="submit" disabled={isSubmitting || submitBlocked}>
                    {isSubmitting
                      ? language === "es"
                        ? "Guardando..."
                        : "Saving..."
                      : editingId
                        ? language === "es"
                          ? "Guardar cambios"
                          : "Save changes"
                        : language === "es"
                          ? "Crear orden"
                          : "Create work order"}
                  </button>
                </div>
              </form>
            </PanelCard>
          </div>
        </div>
      ) : null}

      <DataTableCard
        title={language === "es" ? "Mantenciones abiertas" : "Open maintenance work"}
        subtitle={
          language === "es"
            ? "Solo se muestran programadas o en curso. Al completar o anular, pasan de inmediato al historial."
            : "Only scheduled or in-progress work is shown here. Once completed or cancelled, it immediately moves to history."
        }
        rows={activeRows}
        columns={[
          {
            key: "order",
            header: language === "es" ? "Trabajo" : "Work",
            render: (item) => (
              <div>
                <div className="maintenance-cell__title">
                  {stripLegacyVisibleText(item.title) || "—"}
                </div>
                <div className="maintenance-cell__meta">
                  {stripLegacyVisibleText(item.description) ||
                    (language === "es" ? "Sin detalle adicional" : "No additional detail")}
                </div>
              </div>
            ),
          },
          {
            key: "client",
            header: language === "es" ? "Cliente" : "Client",
            render: (item) => (
              <div>
                <div className="maintenance-cell__title">{getClientDisplayName(item.client_id)}</div>
                <div className="maintenance-cell__meta">{getSiteDisplayName(item.site_id)}</div>
              </div>
            ),
          },
          {
            key: "responsible",
            header: language === "es" ? "Responsable" : "Responsible",
            render: (item) => (
              <div>
                <div className="maintenance-cell__title">
                  {item.assigned_work_group_id
                    ? workGroupById.get(item.assigned_work_group_id)?.name || `#${item.assigned_work_group_id}`
                    : language === "es"
                      ? "Sin grupo"
                      : "No group"}
                </div>
                <div className="maintenance-cell__meta">
                  {item.assigned_tenant_user_id
                    ? tenantUserById.get(item.assigned_tenant_user_id)?.full_name || `#${item.assigned_tenant_user_id}`
                    : language === "es"
                      ? "Sin técnico"
                      : "No technician"}
                </div>
              </div>
            ),
          },
          {
            key: "schedule",
            header: language === "es" ? "Fecha y hora" : "Date and time",
            render: (item) => (
              <div>
                <div>{formatDateTime(item.scheduled_for, language, effectiveTimeZone)}</div>
                <div className="maintenance-cell__meta">
                  {language === "es" ? "Solicitada" : "Requested"}{" "}
                  {formatDateTime(item.requested_at, language, effectiveTimeZone)}
                </div>
              </div>
            ),
          },
          {
            key: "status",
            header: language === "es" ? "Estado" : "Status",
            render: (item) => (
              <AppBadge tone={getStatusTone(item.maintenance_status)}>
                {getStatusLabel(item.maintenance_status, language)}
              </AppBadge>
            ),
          },
          {
            key: "installation",
            header: language === "es" ? "Instalación" : "Installation",
            render: (item) =>
              item.installation_id
                ? installationById.get(item.installation_id)?.name || `#${item.installation_id}`
                : language === "es"
                  ? "Instalación pendiente"
                  : "Installation pending",
          },
          {
            key: "actions",
            header: language === "es" ? "Acciones" : "Actions",
            render: (item) => (
              <AppToolbar compact>
                <button
                  className="btn btn-sm btn-outline-primary"
                  type="button"
                  onClick={() => startEdit(item)}
                >
                  {language === "es" ? "Editar" : "Edit"}
                </button>
                {item.maintenance_status === "scheduled" ? (
                  <button
                    className="btn btn-sm btn-outline-info"
                    type="button"
                    onClick={() => void handleStatusChange(item, "in_progress")}
                  >
                    {language === "es" ? "Iniciar" : "Start"}
                  </button>
                ) : null}
                <button
                  className="btn btn-sm btn-outline-success"
                  type="button"
                  onClick={() => void handleStatusChange(item, "completed")}
                >
                  {language === "es" ? "Completar" : "Complete"}
                </button>
                <button
                  className="btn btn-sm btn-outline-danger"
                  type="button"
                  onClick={() => void handleStatusChange(item, "cancelled")}
                >
                  {language === "es" ? "Anular" : "Cancel"}
                </button>
                <button
                  className="btn btn-sm btn-outline-danger"
                  type="button"
                  onClick={() => void handleDelete(item)}
                >
                  {language === "es" ? "Eliminar" : "Delete"}
                </button>
              </AppToolbar>
            ),
          },
        ]}
      />
    </div>
  );
}
