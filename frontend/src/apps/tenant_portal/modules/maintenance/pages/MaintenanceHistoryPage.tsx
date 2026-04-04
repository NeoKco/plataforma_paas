import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "../../../../../components/common/PageHeader";
import { PanelCard } from "../../../../../components/common/PanelCard";
import { DataTableCard } from "../../../../../components/data-display/DataTableCard";
import { ErrorState } from "../../../../../components/feedback/ErrorState";
import { LoadingBlock } from "../../../../../components/feedback/LoadingBlock";
import { AppBadge } from "../../../../../design-system/AppBadge";
import { AppToolbar } from "../../../../../design-system/AppLayout";
import { getApiErrorDisplayMessage } from "../../../../../services/api";
import { useLanguage } from "../../../../../store/language-context";
import { useTenantAuth } from "../../../../../store/tenant-auth-context";
import { formatDateTimeInTimeZone } from "../../../../../utils/dateTimeLocal";
import type { ApiError } from "../../../../../types";
import {
  getTenantBusinessClients,
  type TenantBusinessClient,
} from "../../business_core/services/clientsService";
import {
  getTenantBusinessOrganizations,
  type TenantBusinessOrganization,
} from "../../business_core/services/organizationsService";
import {
  getTenantBusinessSites,
  type TenantBusinessSite,
} from "../../business_core/services/sitesService";
import { getVisibleAddressLabel } from "../../business_core/utils/addressPresentation";
import { MaintenanceHelpBubble } from "../components/common/MaintenanceHelpBubble";
import { MaintenanceCostingModal } from "../components/common/MaintenanceCostingModal";
import { MaintenanceModuleNav } from "../components/common/MaintenanceModuleNav";
import {
  getTenantMaintenanceHistory,
  type TenantMaintenanceHistoryWorkOrder,
} from "../services/historyService";
import {
  updateTenantMaintenanceWorkOrder,
  type TenantMaintenanceWorkOrderWriteRequest,
} from "../services/workOrdersService";
import {
  getTenantMaintenanceInstallations,
  type TenantMaintenanceInstallation,
} from "../services/installationsService";
import { stripLegacyVisibleText } from "../../../../../utils/legacyVisibleText";

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

function getStatusLabel(status: string, language: "es" | "en"): string {
  switch (status) {
    case "completed":
      return language === "es" ? "Completada" : "Completed";
    case "cancelled":
      return language === "es" ? "Anulada" : "Cancelled";
    case "in_progress":
      return language === "es" ? "En curso" : "In progress";
    case "scheduled":
      return language === "es" ? "Programada" : "Scheduled";
    default:
      return status;
  }
}

function getStatusTone(status: string): "success" | "danger" | "warning" | "info" | "neutral" {
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

export function MaintenanceHistoryPage() {
  const { session, effectiveTimeZone } = useTenantAuth();
  const { language } = useLanguage();
  const [rows, setRows] = useState<TenantMaintenanceHistoryWorkOrder[]>([]);
  const [clients, setClients] = useState<TenantBusinessClient[]>([]);
  const [organizations, setOrganizations] = useState<TenantBusinessOrganization[]>([]);
  const [sites, setSites] = useState<TenantBusinessSite[]>([]);
  const [installations, setInstallations] = useState<TenantMaintenanceInstallation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [editingRow, setEditingRow] = useState<TenantMaintenanceHistoryWorkOrder | null>(null);
  const [costingWorkOrder, setCostingWorkOrder] =
    useState<TenantMaintenanceHistoryWorkOrder | null>(null);
  const [historyForm, setHistoryForm] = useState({
    description: "",
    closure_notes: "",
    cancellation_reason: "",
  });

  const clientById = useMemo(
    () => new Map(clients.map((client) => [client.id, client])),
    [clients]
  );
  const organizationById = useMemo(
    () => new Map(organizations.map((organization) => [organization.id, organization])),
    [organizations]
  );
  const siteById = useMemo(() => new Map(sites.map((site) => [site.id, site])), [sites]);
  const installationById = useMemo(
    () => new Map(installations.map((item) => [item.id, item])),
    [installations]
  );
  const completedRows = useMemo(
    () => rows.filter((item) => item.maintenance_status === "completed"),
    [rows]
  );
  const cancelledRows = useMemo(
    () => rows.filter((item) => item.maintenance_status === "cancelled"),
    [rows]
  );

  async function loadData() {
    if (!session?.accessToken) {
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const [historyResponse, clientsResponse, organizationsResponse, sitesResponse, installationsResponse] =
        await Promise.all([
          getTenantMaintenanceHistory(session.accessToken),
          getTenantBusinessClients(session.accessToken, { includeInactive: true }),
          getTenantBusinessOrganizations(session.accessToken, { includeInactive: true }),
          getTenantBusinessSites(session.accessToken, { includeInactive: true }),
          getTenantMaintenanceInstallations(session.accessToken, { includeInactive: true }),
        ]);
      setRows(historyResponse.data);
      setClients(clientsResponse.data);
      setOrganizations(organizationsResponse.data);
      setSites(sitesResponse.data);
      setInstallations(installationsResponse.data);
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [session?.accessToken]);

  function startEdit(item: TenantMaintenanceHistoryWorkOrder) {
    setEditingRow(item);
    setFeedback(null);
    setError(null);
    setHistoryForm({
      description: stripLegacyVisibleText(item.description) || "",
      closure_notes: stripLegacyVisibleText(item.closure_notes) || "",
      cancellation_reason: stripLegacyVisibleText(item.cancellation_reason) || "",
    });
  }

  function openCostingModal(item: TenantMaintenanceHistoryWorkOrder) {
    setFeedback(null);
    setError(null);
    setCostingWorkOrder(item);
  }

  function closeCostingModal() {
    setCostingWorkOrder(null);
  }

  async function handleHistorySubmit() {
    if (!session?.accessToken || !editingRow) {
      return;
    }
    setIsSubmitting(true);
    setError(null);
    const payload: TenantMaintenanceWorkOrderWriteRequest = {
      client_id: editingRow.client_id,
      site_id: editingRow.site_id,
      installation_id: editingRow.installation_id,
      assigned_work_group_id: editingRow.assigned_work_group_id,
      external_reference: editingRow.external_reference,
      title: editingRow.title,
      description: historyForm.description.trim() || null,
      priority: editingRow.priority,
      scheduled_for: editingRow.scheduled_for,
      cancellation_reason: historyForm.cancellation_reason.trim() || null,
      closure_notes: historyForm.closure_notes.trim() || null,
      assigned_tenant_user_id: editingRow.assigned_tenant_user_id,
      maintenance_status: editingRow.maintenance_status,
    };
    try {
      const response = await updateTenantMaintenanceWorkOrder(
        session.accessToken,
        editingRow.id,
        payload
      );
      setFeedback(response.message);
      setEditingRow(null);
      await loadData();
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsSubmitting(false);
    }
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
    const base =
      stripLegacyVisibleText(getVisibleAddressLabel(site)) ||
      stripLegacyVisibleText(site.name) ||
      (language === "es" ? "Dirección sin nombre" : "Unnamed address");
    const locality = [site.commune, site.city, site.region]
      .map((value) => stripLegacyVisibleText(value))
      .filter((value): value is string => Boolean(value))
      .join(", ");
    return locality ? `${base} · ${locality}` : base;
  }

  const historyColumns = [
    {
      key: "order",
      header: language === "es" ? "Orden" : "Order",
      render: (item: TenantMaintenanceHistoryWorkOrder) => (
        <div>
          <div className="maintenance-cell__title">{item.title}</div>
          <div className="maintenance-cell__meta">
            {getClientDisplayName(item.client_id) + " · " + getSiteDisplayName(item.site_id)}
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: language === "es" ? "Estado final" : "Final status",
      render: (item: TenantMaintenanceHistoryWorkOrder) => (
        <AppBadge tone={getStatusTone(item.maintenance_status)}>
          {getStatusLabel(item.maintenance_status, language)}
        </AppBadge>
      ),
    },
    {
      key: "dates",
      header: language === "es" ? "Fechas" : "Dates",
      render: (item: TenantMaintenanceHistoryWorkOrder) => (
        <div>
          <div>
            {item.maintenance_status === "completed"
              ? formatDateTime(item.completed_at, language, effectiveTimeZone)
              : formatDateTime(item.cancelled_at, language, effectiveTimeZone)}
          </div>
          <div className="maintenance-cell__meta">
            {language === "es" ? "Solicitada" : "Requested"}{" "}
            {formatDateTime(item.requested_at, language, effectiveTimeZone)}
          </div>
        </div>
      ),
    },
    {
      key: "traceability",
      header: language === "es" ? "Trazabilidad" : "Traceability",
      render: (item: TenantMaintenanceHistoryWorkOrder) => (
        <div>
          <div>
            {item.status_logs.length}{" "}
            {language === "es"
              ? item.status_logs.length === 1
                ? "log"
                : "logs"
              : item.status_logs.length === 1
                ? "log"
                : "logs"}
          </div>
          <div className="maintenance-cell__meta">
            {item.visits.length}{" "}
            {language === "es"
              ? item.visits.length === 1
                ? "visita"
                : "visitas"
              : item.visits.length === 1
                ? "visit"
                : "visits"}
          </div>
        </div>
      ),
    },
  ];

  function renderHistoryCards(items: TenantMaintenanceHistoryWorkOrder[]) {
    return (
      <div className="row g-3">
        {items.map((item) => (
          <div className="col-12" key={item.id}>
            <PanelCard
              title={item.title}
              subtitle={`${getClientDisplayName(item.client_id)} · ${getSiteDisplayName(item.site_id)}`}
              actions={
                <AppToolbar compact>
                  <AppBadge tone={getStatusTone(item.maintenance_status)}>
                    {getStatusLabel(item.maintenance_status, language)}
                  </AppBadge>
                  <button
                    className="btn btn-sm btn-outline-primary"
                    type="button"
                    onClick={() => openCostingModal(item)}
                  >
                    {language === "es" ? "Costos" : "Costing"}
                  </button>
                  <button
                    className="btn btn-sm btn-outline-primary"
                    type="button"
                    onClick={() => startEdit(item)}
                  >
                    {language === "es" ? "Editar cierre" : "Edit closure"}
                  </button>
                </AppToolbar>
              }
            >
              <div className="row g-3">
                <div className="col-12 col-lg-6">
                  <h3 className="panel-card__title h6 mb-3">
                    {language === "es" ? "Resumen" : "Summary"}
                  </h3>
                  <div className="maintenance-cell__meta">
                    {language === "es" ? "Instalación" : "Installation"}:{" "}
                    {item.installation_id
                      ? installationById.get(item.installation_id)?.name || `#${item.installation_id}`
                      : language === "es"
                        ? "sin instalación"
                        : "no installation"}
                  </div>
                  <div className="maintenance-cell__meta">
                    {language === "es" ? "Programada" : "Scheduled"}:{" "}
                    {formatDateTime(item.scheduled_for, language, effectiveTimeZone)}
                  </div>
                  <div className="maintenance-cell__meta">
                    {language === "es" ? "Cierre" : "Closed"}:{" "}
                    {formatDateTime(
                      item.completed_at || item.cancelled_at,
                      language,
                      effectiveTimeZone
                    )}
                  </div>
                  {stripLegacyVisibleText(item.description) ? (
                    <p className="mb-0 mt-3">{stripLegacyVisibleText(item.description)}</p>
                  ) : null}
                </div>
                <div className="col-12 col-lg-3">
                  <h3 className="panel-card__title h6 mb-3">
                    {language === "es" ? "Cambios de estado" : "Status changes"}
                  </h3>
                  <div className="d-grid gap-2">
                    {item.status_logs.map((log) => (
                      <div key={log.id} className="maintenance-history-entry">
                        <div className="maintenance-history-entry__title">
                          {(log.from_status || (language === "es" ? "inicio" : "start")) +
                            " -> " +
                            log.to_status}
                        </div>
                        <div className="maintenance-history-entry__meta">
                          {formatDateTime(log.changed_at, language, effectiveTimeZone)}
                        </div>
                        {stripLegacyVisibleText(log.note) ? (
                          <div className="maintenance-history-entry__meta">
                            {stripLegacyVisibleText(log.note)}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="col-12 col-lg-3">
                  <h3 className="panel-card__title h6 mb-3">
                    {language === "es" ? "Visitas" : "Visits"}
                  </h3>
                  <div className="d-grid gap-2">
                    {item.visits.length === 0 ? (
                      <div className="maintenance-history-entry__meta">
                        {language === "es" ? "Sin visitas registradas" : "No visits recorded"}
                      </div>
                    ) : (
                      item.visits.map((visit) => (
                        <div key={visit.id} className="maintenance-history-entry">
                          <div className="maintenance-history-entry__title">
                            {getStatusLabel(visit.visit_status, language)}
                          </div>
                          <div className="maintenance-history-entry__meta">
                            {formatDateTime(
                              visit.scheduled_start_at,
                              language,
                              effectiveTimeZone
                            )}
                          </div>
                          {visit.assigned_group_label ? (
                            <div className="maintenance-history-entry__meta">
                              {visit.assigned_group_label}
                            </div>
                          ) : null}
                          {stripLegacyVisibleText(visit.notes) ? (
                            <div className="maintenance-history-entry__meta">
                              {stripLegacyVisibleText(visit.notes)}
                            </div>
                          ) : null}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </PanelCard>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="d-grid gap-4">
      <PageHeader
        eyebrow={language === "es" ? "Mantenciones" : "Maintenance"}
        icon="tenant-history"
        title={language === "es" ? "Historial técnico" : "Technical history"}
        description={
          language === "es"
            ? "Órdenes cerradas con trazabilidad, visitas registradas y lectura operativa por cliente y sitio."
            : "Closed work orders with traceability, registered visits, and operational reading by client and site."
        }
        actions={
          <AppToolbar compact>
            <MaintenanceHelpBubble
              label={language === "es" ? "Ayuda" : "Help"}
              helpText={
                language === "es"
                  ? "Aquí no se consulta una tabla paralela de histórico de la app vieja. La lectura se deriva del lifecycle de las órdenes cerradas en el PaaS."
                  : "This does not read a parallel legacy history table. The view is derived from the lifecycle of closed work orders in the PaaS."
              }
            />
            <button className="btn btn-outline-secondary" type="button" onClick={() => void loadData()}>
              {language === "es" ? "Recargar" : "Reload"}
            </button>
          </AppToolbar>
        }
      />
      <MaintenanceModuleNav />

      {error ? (
        <ErrorState
          title={
            language === "es"
              ? "No se pudo cargar el historial"
              : "The history could not be loaded"
          }
          detail={getApiErrorDisplayMessage(error)}
          requestId={error.payload?.request_id}
        />
      ) : null}

      {feedback ? <div className="alert alert-success mb-0">{feedback}</div> : null}

      {isLoading ? (
        <LoadingBlock label={language === "es" ? "Cargando historial..." : "Loading history..."} />
      ) : null}

      <DataTableCard
        title={language === "es" ? "Mantenciones realizadas" : "Completed maintenance"}
        subtitle={
          language === "es"
            ? "Trabajo efectivamente ejecutado y ya cerrado."
            : "Work effectively executed and already closed."
        }
        rows={completedRows}
        columns={historyColumns}
      />

      {renderHistoryCards(completedRows)}

      <DataTableCard
        title={language === "es" ? "Mantenciones anuladas" : "Cancelled maintenance"}
        subtitle={
          language === "es"
            ? "Trabajo cancelado, separado de las mantenciones realmente ejecutadas."
            : "Cancelled work, separated from work that was actually executed."
        }
        rows={cancelledRows}
        columns={historyColumns}
      />

      {renderHistoryCards(cancelledRows)}

      {editingRow ? (
        <div className="maintenance-form-backdrop" role="presentation" onClick={() => setEditingRow(null)}>
          <div
            className="maintenance-form-modal"
            role="dialog"
            aria-modal="true"
            aria-label={language === "es" ? "Editar cierre de mantención" : "Edit maintenance closure"}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="maintenance-form-modal__eyebrow">
              {language === "es" ? "Cierre e historial" : "Closure and history"}
            </div>
            <PanelCard
              title={language === "es" ? "Editar cierre" : "Edit closure"}
              subtitle={
                language === "es"
                  ? "Aquí solo puedes corregir descripción o notas de cierre. Fecha, hora, cliente, dirección e instalación ya no cambian."
                  : "Here you can only adjust description or closure notes. Date, time, client, address, and installation can no longer change."
              }
            >
              <form
                className="maintenance-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleHistorySubmit();
                }}
              >
                <div className="row g-3">
                  <div className="col-12">
                    <label className="form-label">{language === "es" ? "Trabajo realizado" : "Completed work"}</label>
                    <input className="form-control" value={editingRow.title} disabled />
                  </div>
                  <div className="col-12">
                    <label className="form-label">{language === "es" ? "Descripción" : "Description"}</label>
                    <textarea
                      className="form-control"
                      rows={4}
                      value={historyForm.description}
                      onChange={(event) =>
                        setHistoryForm((current) => ({
                          ...current,
                          description: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">{language === "es" ? "Notas de cierre" : "Closure notes"}</label>
                    <textarea
                      className="form-control"
                      rows={4}
                      value={historyForm.closure_notes}
                      onChange={(event) =>
                        setHistoryForm((current) => ({
                          ...current,
                          closure_notes: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">{language === "es" ? "Motivo de anulación" : "Cancellation reason"}</label>
                    <textarea
                      className="form-control"
                      rows={4}
                      value={historyForm.cancellation_reason}
                      onChange={(event) =>
                        setHistoryForm((current) => ({
                          ...current,
                          cancellation_reason: event.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
                <div className="maintenance-form__actions">
                  <button className="btn btn-outline-secondary" type="button" onClick={() => setEditingRow(null)}>
                    {language === "es" ? "Cancelar" : "Cancel"}
                  </button>
                  <button className="btn btn-primary" type="submit" disabled={isSubmitting}>
                    {isSubmitting
                      ? language === "es"
                        ? "Guardando..."
                        : "Saving..."
                      : language === "es"
                        ? "Guardar cierre"
                        : "Save closure"}
                  </button>
                </div>
              </form>
            </PanelCard>
          </div>
        </div>
      ) : null}

      <MaintenanceCostingModal
        accessToken={session?.accessToken}
        clientLabel={costingWorkOrder ? getClientDisplayName(costingWorkOrder.client_id) : "—"}
        siteLabel={costingWorkOrder ? getSiteDisplayName(costingWorkOrder.site_id) : "—"}
        installationLabel={
          costingWorkOrder?.installation_id
            ? installationById.get(costingWorkOrder.installation_id)?.name ||
              `#${costingWorkOrder.installation_id}`
            : language === "es"
              ? "Instalación pendiente"
              : "Installation pending"
        }
        effectiveTimeZone={effectiveTimeZone}
        isOpen={Boolean(costingWorkOrder)}
        language={language}
        onClose={closeCostingModal}
        onFeedback={setFeedback}
        workOrder={costingWorkOrder}
      />
    </div>
  );
}
