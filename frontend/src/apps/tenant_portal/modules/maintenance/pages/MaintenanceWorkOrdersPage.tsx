import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PageHeader } from "../../../../../components/common/PageHeader";
import { PanelCard } from "../../../../../components/common/PanelCard";
import { DataTableCard } from "../../../../../components/data-display/DataTableCard";
import { ErrorState } from "../../../../../components/feedback/ErrorState";
import { LoadingBlock } from "../../../../../components/feedback/LoadingBlock";
import { MetricCard } from "../../../../../components/common/MetricCard";
import { AppBadge } from "../../../../../design-system/AppBadge";
import { AppToolbar } from "../../../../../design-system/AppLayout";
import { getApiErrorDisplayMessage } from "../../../../../services/api";
import { useLanguage } from "../../../../../store/language-context";
import { useTenantAuth } from "../../../../../store/tenant-auth-context";
import type { ApiError } from "../../../../../types";
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
  getTenantBusinessSites,
  type TenantBusinessSite,
} from "../../business_core/services/sitesService";
import { stripLegacyVisibleText } from "../../../../../utils/legacyVisibleText";

function buildDefaultForm(): TenantMaintenanceWorkOrderWriteRequest {
  return {
    client_id: 0,
    site_id: 0,
    installation_id: null,
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

function formatDateTime(value: string | null, language: "es" | "en"): string {
  if (!value) {
    return language === "es" ? "sin fecha" : "no date";
  }
  return new Date(value).toLocaleString(language === "es" ? "es-CL" : "en-US");
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
  const { session } = useTenantAuth();
  const { language } = useLanguage();
  const [searchParams] = useSearchParams();
  const [rows, setRows] = useState<TenantMaintenanceWorkOrder[]>([]);
  const [clients, setClients] = useState<TenantBusinessClient[]>([]);
  const [sites, setSites] = useState<TenantBusinessSite[]>([]);
  const [installations, setInstallations] = useState<TenantMaintenanceInstallation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [form, setForm] = useState<TenantMaintenanceWorkOrderWriteRequest>(buildDefaultForm());

  const requestedClientId = Number(searchParams.get("clientId") || 0);
  const requestedSiteId = Number(searchParams.get("siteId") || 0);
  const requestedInstallationId = Number(searchParams.get("installationId") || 0);
  const requestedMode = searchParams.get("mode");

  const siteById = useMemo(() => new Map(sites.map((site) => [site.id, site])), [sites]);
  const clientById = useMemo(
    () => new Map(clients.map((client) => [client.id, client])),
    [clients]
  );
  const installationById = useMemo(
    () => new Map(installations.map((item) => [item.id, item])),
    [installations]
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

  const summary = useMemo(() => {
    return rows.reduce(
      (accumulator, row) => {
        accumulator.total += 1;
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
      const [workOrdersResponse, clientsResponse, sitesResponse, installationsResponse] =
        await Promise.all([
          getTenantMaintenanceWorkOrders(session.accessToken, {
            ...(requestedClientId > 0 ? { clientId: requestedClientId } : {}),
            ...(requestedSiteId > 0 ? { siteId: requestedSiteId } : {}),
          }),
          getTenantBusinessClients(session.accessToken, { includeInactive: false }),
          getTenantBusinessSites(session.accessToken, { includeInactive: false }),
          getTenantMaintenanceInstallations(session.accessToken, { includeInactive: false }),
        ]);
      setRows(workOrdersResponse.data);
      setClients(clientsResponse.data);
      setSites(sitesResponse.data);
      setInstallations(installationsResponse.data);
      setForm((current) => {
        const nextClientId =
          current.client_id ||
          requestedClientId ||
          clientsResponse.data[0]?.id ||
          0;
        const candidateSites = sitesResponse.data.filter(
          (site) => site.client_id === nextClientId
        );
        const nextSiteId =
          current.site_id ||
          (requestedSiteId > 0 ? requestedSiteId : 0) ||
          candidateSites[0]?.id ||
          0;
        return {
          ...current,
          client_id: nextClientId,
          site_id: nextSiteId,
          installation_id:
            current.installation_id ||
            (requestedInstallationId > 0 ? requestedInstallationId : null),
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
    if (!isLoading && requestedMode === "create") {
      setEditingId(null);
      setIsFormOpen(true);
    }
  }, [isLoading, requestedMode]);

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
        installation_id: null,
      }));
    }
  }, [filteredInstallations, form.installation_id]);

  function startCreate(openForm = false) {
    const clientId = clients[0]?.id || 0;
    const candidateSites = sites.filter((site) => site.client_id === clientId);
    setEditingId(null);
    setFeedback(null);
    setError(null);
    setIsFormOpen(openForm);
    setForm({
      ...buildDefaultForm(),
      client_id: clientId,
      site_id: candidateSites[0]?.id || 0,
    });
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
      external_reference: item.external_reference,
      title: item.title,
      description: stripLegacyVisibleText(item.description),
      priority: item.priority,
      scheduled_for: item.scheduled_for,
      cancellation_reason: item.cancellation_reason,
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
      external_reference: normalizeNullable(form.external_reference),
      title: form.title.trim(),
      description: stripLegacyVisibleText(normalizeNullable(form.description)),
      priority: form.priority.trim().toLowerCase() || "normal",
      scheduled_for: normalizeNullable(form.scheduled_for),
      cancellation_reason: normalizeNullable(form.cancellation_reason),
      closure_notes: stripLegacyVisibleText(normalizeNullable(form.closure_notes)),
      assigned_tenant_user_id: form.assigned_tenant_user_id
        ? Number(form.assigned_tenant_user_id)
        : null,
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

  async function handleStatusChange(
    workOrder: TenantMaintenanceWorkOrder,
    nextStatus: string
  ) {
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
      const response = await deleteTenantMaintenanceWorkOrder(
        session.accessToken,
        workOrder.id
      );
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
        title={language === "es" ? "Órdenes de trabajo" : "Work orders"}
        description={
          language === "es"
            ? "Gestión operativa de mantenciones programadas, en curso, completadas y anuladas."
            : "Operational management of scheduled, in-progress, completed, and cancelled work orders."
        }
        actions={
          <AppToolbar compact>
            <MaintenanceHelpBubble
              label={language === "es" ? "Ayuda" : "Help"}
              helpText={
                language === "es"
                  ? "Una orden debe colgar de un cliente, un sitio y opcionalmente una instalación específica. Cambia de estado sin mover registros a otra tabla."
                  : "A work order must hang from a client, a site, and optionally a specific installation. Change status without moving records to another table."
              }
            />
            <button className="btn btn-outline-secondary" type="button" onClick={() => void loadData()}>
              {language === "es" ? "Recargar" : "Reload"}
            </button>
            <button className="btn btn-primary" type="button" onClick={() => startCreate(true)}>
              {language === "es" ? "Nueva orden" : "New work order"}
            </button>
          </AppToolbar>
        }
      />
      <MaintenanceModuleNav />

      {requestedClientId > 0 ? (
        <div className="maintenance-context-banner">
          {language === "es"
            ? "Vista abierta desde la ficha del cliente. Las mantenciones se muestran filtradas por ese cliente y la nueva orden queda preseleccionada."
            : "View opened from the client detail. Work orders are filtered by that client and new orders are preselected."}
        </div>
      ) : null}

      {feedback ? <div className="alert alert-success mb-0">{feedback}</div> : null}
      {error ? (
        <ErrorState
          title={
            language === "es"
              ? "No se pudo cargar la vista"
              : "The view could not be loaded"
          }
          detail={getApiErrorDisplayMessage(error)}
          requestId={error.payload?.request_id}
        />
      ) : null}
      {isLoading ? (
        <LoadingBlock label={language === "es" ? "Cargando órdenes..." : "Loading work orders..."} />
      ) : null}

      <div className="row g-3">
        <div className="col-12 col-md-6 col-xl-3">
          <MetricCard
            label={language === "es" ? "Total" : "Total"}
            value={summary.total}
            hint={language === "es" ? "Órdenes visibles" : "Visible work orders"}
            icon="maintenance"
            tone="info"
          />
        </div>
        <div className="col-12 col-md-6 col-xl-3">
          <MetricCard
            label={language === "es" ? "Programadas" : "Scheduled"}
            value={summary.scheduled}
            hint={language === "es" ? "Pendientes de ejecución" : "Waiting to be executed"}
            icon="planning"
            tone="warning"
          />
        </div>
        <div className="col-12 col-md-6 col-xl-3">
          <MetricCard
            label={language === "es" ? "En curso" : "In progress"}
            value={summary.inProgress}
            hint={language === "es" ? "Trabajo abierto" : "Open work"}
            icon="focus"
            tone="info"
          />
        </div>
        <div className="col-12 col-md-6 col-xl-3">
          <MetricCard
            label={language === "es" ? "Cerradas" : "Closed"}
            value={summary.completed + summary.cancelled}
            hint={language === "es" ? "Completadas o anuladas" : "Completed or cancelled"}
            icon="reports"
            tone="success"
          />
        </div>
      </div>

      {isFormOpen ? (
        <div
          className="maintenance-form-backdrop"
          role="presentation"
          onClick={() => startCreate(false)}
        >
          <div
            className="maintenance-form-modal maintenance-form-modal--wide"
            role="dialog"
            aria-modal="true"
            aria-label={
              editingId
                ? language === "es"
                  ? "Editar orden"
                  : "Edit work order"
                : language === "es"
                  ? "Nueva orden"
                  : "New work order"
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
                    ? "Editar orden"
                    : "Edit work order"
                  : language === "es"
                    ? "Nueva orden"
                    : "New work order"
              }
              subtitle={
                language === "es"
                  ? "Primer corte operativo apoyado sobre business-core y trazabilidad de estado."
                  : "First operational slice supported by business-core and status traceability."
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
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.client_code || `#${client.id}`}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label">{language === "es" ? "Sitio" : "Site"}</label>
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
                  {filteredSites.map((site) => (
                    <option key={site.id} value={site.id}>
                      {site.name}
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
                  <option value="">{language === "es" ? "Sin instalación" : "No installation"}</option>
                  {filteredInstallations.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
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
                  {language === "es" ? "Referencia externa" : "External reference"}
                </label>
                <input
                  className="form-control"
                  value={form.external_reference ?? ""}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      external_reference: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label">
                  {language === "es" ? "Programada para" : "Scheduled for"}
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
              <div className="col-12">
                <label className="form-label">{language === "es" ? "Título" : "Title"}</label>
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
                  {language === "es" ? "Descripción" : "Description"}
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
              <div className="col-12 col-md-6">
                <label className="form-label">
                  {language === "es" ? "Motivo de anulación" : "Cancellation reason"}
                </label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={form.cancellation_reason ?? ""}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      cancellation_reason: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label">
                  {language === "es" ? "Notas de cierre" : "Closure notes"}
                </label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={form.closure_notes ?? ""}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      closure_notes: event.target.value,
                    }))
                  }
                />
              </div>
                </div>
                <div className="maintenance-form__actions">
                  <button
                    className="btn btn-outline-secondary"
                    type="button"
                    onClick={() => startCreate(false)}
                  >
                    {language === "es" ? "Cancelar" : "Cancel"}
                  </button>
                  <button className="btn btn-primary" type="submit" disabled={isSubmitting}>
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
          title={language === "es" ? "Órdenes activas y cerradas" : "Open and closed work orders"}
          subtitle={
            language === "es"
              ? "Primer corte con lifecycle auditable sin mover registros a histórico."
              : "First slice with auditable lifecycle without moving records to history tables."
          }
          rows={rows}
          columns={[
            {
              key: "order",
              header: language === "es" ? "Orden" : "Order",
              render: (item) => {
                const site = siteById.get(item.site_id);
                const client = clientById.get(item.client_id);
                return (
                  <div>
                    <div className="maintenance-cell__title">{item.title}</div>
                    <div className="maintenance-cell__meta">
                      {(client?.client_code || `#${item.client_id}`) +
                        " · " +
                        (site?.name || `#${item.site_id}`)}
                    </div>
                  </div>
                );
              },
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
              key: "schedule",
              header: language === "es" ? "Programación" : "Schedule",
              render: (item) => (
                <div>
                  <div>{formatDateTime(item.scheduled_for, language)}</div>
                  <div className="maintenance-cell__meta">
                    {language === "es" ? "Solicitada" : "Requested"}{" "}
                    {formatDateTime(item.requested_at, language)}
                  </div>
                </div>
              ),
            },
            {
              key: "installation",
              header: language === "es" ? "Instalación" : "Installation",
              render: (item) =>
                item.installation_id
                  ? installationById.get(item.installation_id)?.name || `#${item.installation_id}`
                  : language === "es"
                    ? "Sin instalación"
                    : "No installation",
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
                  {item.maintenance_status !== "in_progress" &&
                  item.maintenance_status !== "completed" &&
                  item.maintenance_status !== "cancelled" ? (
                    <button
                      className="btn btn-sm btn-outline-info"
                      type="button"
                      onClick={() => void handleStatusChange(item, "in_progress")}
                    >
                      {language === "es" ? "Iniciar" : "Start"}
                    </button>
                  ) : null}
                  {item.maintenance_status !== "completed" &&
                  item.maintenance_status !== "cancelled" ? (
                    <button
                      className="btn btn-sm btn-outline-success"
                      type="button"
                      onClick={() => void handleStatusChange(item, "completed")}
                    >
                      {language === "es" ? "Completar" : "Complete"}
                    </button>
                  ) : null}
                  {item.maintenance_status !== "cancelled" &&
                  item.maintenance_status !== "completed" ? (
                    <button
                      className="btn btn-sm btn-outline-danger"
                      type="button"
                      onClick={() => void handleStatusChange(item, "cancelled")}
                    >
                      {language === "es" ? "Anular" : "Cancel"}
                    </button>
                  ) : null}
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
