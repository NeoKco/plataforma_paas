import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "../../../../../components/common/PageHeader";
import { PanelCard } from "../../../../../components/common/PanelCard";
import { DataTableCard } from "../../../../../components/data-display/DataTableCard";
import { ErrorState } from "../../../../../components/feedback/ErrorState";
import { LoadingBlock } from "../../../../../components/feedback/LoadingBlock";
import { AppBadge } from "../../../../../design-system/AppBadge";
import { AppToolbar } from "../../../../../design-system/AppLayout";
import { getApiErrorDisplayMessage } from "../../../../../services/api";
import { getTenantUsers } from "../../../../../services/tenant-api";
import { useLanguage } from "../../../../../store/language-context";
import {
  pickLocalizedText,
  useLanguage,
} from "../../../../../store/language-context";
import { useTenantAuth } from "../../../../../store/tenant-auth-context";
import {
  formatDateTimeInTimeZone,
  fromDateTimeLocalInputValue,
  toDateTimeLocalInputValue,
} from "../../../../../utils/dateTimeLocal";
import type { ApiError, TenantUsersItem } from "../../../../../types";
import {
  getTenantBusinessClients,
  type TenantBusinessClient,
} from "../../business_core/services/clientsService";
import {
  getTenantBusinessOrganizations,
  type TenantBusinessOrganization,
} from "../../business_core/services/organizationsService";
import {
  getTenantBusinessWorkGroupMembers,
  getTenantBusinessWorkGroups,
  type TenantBusinessWorkGroupMember,
  type TenantBusinessWorkGroup,
} from "../../business_core/services/workGroupsService";
import {
  getTenantBusinessSites,
  type TenantBusinessSite,
} from "../../business_core/services/sitesService";
import {
  getTenantBusinessTaskTypes,
  type TenantBusinessTaskType,
} from "../../business_core/services/taskTypesService";
import { getVisibleAddressLabel } from "../../business_core/utils/addressPresentation";
import { MaintenanceHelpBubble } from "../components/common/MaintenanceHelpBubble";
import { MaintenanceCostingModal } from "../components/common/MaintenanceCostingModal";
import { MaintenanceFieldReportModal } from "../components/common/MaintenanceFieldReportModal";
import { MaintenanceWorkOrderDetailModal } from "../components/common/MaintenanceWorkOrderDetailModal";
import { MaintenanceModuleNav } from "../components/common/MaintenanceModuleNav";
import {
  getTenantMaintenanceWorkOrderCosting,
  type TenantMaintenanceCostingDetail,
} from "../services/costingService";
import {
  getTenantMaintenanceHistory,
  type TenantMaintenanceHistoryWorkOrder,
} from "../services/historyService";
import {
  updateTenantMaintenanceWorkOrderStatus,
  updateTenantMaintenanceWorkOrder,
  type TenantMaintenanceWorkOrderWriteRequest,
} from "../services/workOrdersService";
import {
  getTenantMaintenanceInstallations,
  type TenantMaintenanceInstallation,
} from "../services/installationsService";
import { stripLegacyVisibleText } from "../../../../../utils/legacyVisibleText";
import {
  getTenantMaintenanceSchedules,
  type TenantMaintenanceSchedule,
} from "../services/schedulesService";

function formatDateTime(
  value: string | null,
  language: "es" | "en",
  timeZone?: string | null
): string {
  if (!value) {
    return pickLocalizedText(language, { es: "sin fecha", en: "no date" });
  }
  return formatDateTimeInTimeZone(value, language, timeZone);
}

function getStatusLabel(status: string, language: "es" | "en"): string {
  switch (status) {
    case "completed":
      return pickLocalizedText(language, { es: "Completada", en: "Completed" });
    case "cancelled":
      return pickLocalizedText(language, { es: "Anulada", en: "Cancelled" });
    case "in_progress":
      return pickLocalizedText(language, { es: "En curso", en: "In progress" });
    case "scheduled":
      return pickLocalizedText(language, { es: "Programada", en: "Scheduled" });
    default:
      return status;
  }
}

function getVisitTypeLabel(type: string, language: "es" | "en"): string {
  switch (type) {
    case "diagnostic":
      return pickLocalizedText(language, { es: "Diagnóstico", en: "Diagnostic" });
    case "execution":
      return pickLocalizedText(language, { es: "Ejecución", en: "Execution" });
    case "follow_up":
      return pickLocalizedText(language, { es: "Seguimiento", en: "Follow-up" });
    case "closure":
      return pickLocalizedText(language, { es: "Cierre", en: "Closure" });
    default:
      return type;
  }
}

function getVisitResultLabel(type: string, language: "es" | "en"): string {
  switch (type) {
    case "executed":
      return pickLocalizedText(language, { es: "Ejecutada", en: "Executed" });
    case "client_absent":
      return pickLocalizedText(language, { es: "Cliente ausente", en: "Client absent" });
    case "no_access":
      return pickLocalizedText(language, { es: "Sin acceso", en: "No access" });
    case "pending_spare_parts":
      return pickLocalizedText(language, {
        es: "Pendiente repuestos",
        en: "Pending spare parts",
      });
    case "rescheduled_on_site":
      return pickLocalizedText(language, {
        es: "Reprogramada en terreno",
        en: "Rescheduled on site",
      });
    case "cancelled_on_site":
      return pickLocalizedText(language, {
        es: "Cancelada en terreno",
        en: "Cancelled on site",
      });
    default:
      return type;
  }
}

function getStatusLogTitle(
  log: { from_status: string | null; to_status: string; note: string | null },
  language: "es" | "en"
): string {
  const note = (log.note || "").trim().toLowerCase();
  if (
    log.from_status === "completed" &&
    log.to_status === "completed" &&
    note.startsWith("ajuste fecha efectiva de cierre")
  ) {
    return pickLocalizedText(language, {
      es: "Ajuste de fecha de cierre",
      en: "Closure date adjustment",
    });
  }
  if (log.from_status && log.from_status === log.to_status && note.startsWith("reprogramación")) {
    return pickLocalizedText(language, { es: "Reprogramación", en: "Reschedule" });
  }
  return `${log.from_status || pickLocalizedText(language, { es: "inicio", en: "start" })} -> ${log.to_status}`;
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

function inferReopenStatus(item: TenantMaintenanceHistoryWorkOrder): "scheduled" | "in_progress" {
  const candidate = item.status_logs.find(
    (log) =>
      log.to_status === item.maintenance_status &&
      (log.from_status === "scheduled" || log.from_status === "in_progress")
  );
  return candidate?.from_status === "in_progress" ? "in_progress" : "scheduled";
}

export function MaintenanceHistoryPage() {
  const { session, effectiveTimeZone } = useTenantAuth();
  const { language } = useLanguage();
  const t = (es: string, en: string) => pickLocalizedText(language, { es, en });
  const canReopenFromHistory = session?.role === "admin" || session?.role === "manager";
  const canAdjustCompletedAt = session?.role === "admin" || session?.role === "manager";
  const [rows, setRows] = useState<TenantMaintenanceHistoryWorkOrder[]>([]);
  const [clients, setClients] = useState<TenantBusinessClient[]>([]);
  const [organizations, setOrganizations] = useState<TenantBusinessOrganization[]>([]);
  const [sites, setSites] = useState<TenantBusinessSite[]>([]);
  const [installations, setInstallations] = useState<TenantMaintenanceInstallation[]>([]);
  const [workGroups, setWorkGroups] = useState<TenantBusinessWorkGroup[]>([]);
  const [workGroupMembers, setWorkGroupMembers] = useState<TenantBusinessWorkGroupMember[]>([]);
  const [taskTypes, setTaskTypes] = useState<TenantBusinessTaskType[]>([]);
  const [schedules, setSchedules] = useState<TenantMaintenanceSchedule[]>([]);
  const [tenantUsers, setTenantUsers] = useState<TenantUsersItem[]>([]);
  const [selectedWorkGroupId, setSelectedWorkGroupId] = useState<string>("");
  const [selectedTenantUserId, setSelectedTenantUserId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [editingRow, setEditingRow] = useState<TenantMaintenanceHistoryWorkOrder | null>(null);
  const [costingWorkOrder, setCostingWorkOrder] =
    useState<TenantMaintenanceHistoryWorkOrder | null>(null);
  const [detailWorkOrder, setDetailWorkOrder] =
    useState<TenantMaintenanceHistoryWorkOrder | null>(null);
  const [fieldReportWorkOrder, setFieldReportWorkOrder] =
    useState<TenantMaintenanceHistoryWorkOrder | null>(null);
  const [editingCostingDetail, setEditingCostingDetail] =
    useState<TenantMaintenanceCostingDetail | null>(null);
  const [historyForm, setHistoryForm] = useState({
    description: "",
    closure_notes: "",
    cancellation_reason: "",
    completed_at_override: "",
    closure_adjustment_note: "",
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
  const workGroupById = useMemo(
    () => new Map(workGroups.map((group) => [group.id, group])),
    [workGroups]
  );
  const taskTypeById = useMemo(() => new Map(taskTypes.map((item) => [item.id, item])), [taskTypes]);
  const scheduleById = useMemo(() => new Map(schedules.map((item) => [item.id, item])), [schedules]);
  const tenantUserById = useMemo(
    () => new Map(tenantUsers.map((user) => [user.id, user])),
    [tenantUsers]
  );
  const workGroupMemberByKey = useMemo(
    () =>
      new Map(
        workGroupMembers.map((member) => [
          `${member.group_id}:${member.tenant_user_id}`,
          member,
        ])
      ),
    [workGroupMembers]
  );
  const filteredRows = useMemo(
    () =>
      rows.filter((item) => {
        if (selectedWorkGroupId && item.assigned_work_group_id !== Number(selectedWorkGroupId)) {
          return false;
        }
        if (selectedTenantUserId && item.assigned_tenant_user_id !== Number(selectedTenantUserId)) {
          return false;
        }
        return true;
      }),
    [rows, selectedTenantUserId, selectedWorkGroupId]
  );
  const completedRows = useMemo(
    () => filteredRows.filter((item) => item.maintenance_status === "completed"),
    [filteredRows]
  );
  const cancelledRows = useMemo(
    () => filteredRows.filter((item) => item.maintenance_status === "cancelled"),
    [filteredRows]
  );
  const workGroupFilterOptions = useMemo(
    () =>
      workGroups.filter((group) =>
        rows.some((item) => item.assigned_work_group_id === group.id)
      ),
    [rows, workGroups]
  );
  const tenantUserFilterOptions = useMemo(
    () =>
      tenantUsers.filter((user) =>
        rows.some((item) => item.assigned_tenant_user_id === user.id)
      ),
    [rows, tenantUsers]
  );

  async function loadData() {
    if (!session?.accessToken) {
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const [historyResponse, clientsResponse, organizationsResponse, sitesResponse, installationsResponse, workGroupsResponse, taskTypesResponse, schedulesResponse, tenantUsersResponse] =
        await Promise.all([
          getTenantMaintenanceHistory(session.accessToken),
          getTenantBusinessClients(session.accessToken, { includeInactive: true }),
          getTenantBusinessOrganizations(session.accessToken, { includeInactive: true }),
          getTenantBusinessSites(session.accessToken, { includeInactive: true }),
          getTenantMaintenanceInstallations(session.accessToken, { includeInactive: true }),
          getTenantBusinessWorkGroups(session.accessToken, { includeInactive: true }),
          getTenantBusinessTaskTypes(session.accessToken, { includeInactive: true }),
          getTenantMaintenanceSchedules(session.accessToken, { includeInactive: true }),
          getTenantUsers(session.accessToken),
        ]);
      const workGroupMembersResponses = await Promise.all(
        workGroupsResponse.data.map((group) =>
          getTenantBusinessWorkGroupMembers(session.accessToken as string, group.id)
        )
      );
      setRows(historyResponse.data);
      setClients(clientsResponse.data);
      setOrganizations(organizationsResponse.data);
      setSites(sitesResponse.data);
      setInstallations(installationsResponse.data);
      setWorkGroups(workGroupsResponse.data);
      setWorkGroupMembers(workGroupMembersResponses.flatMap((response) => response.data));
      setTaskTypes(taskTypesResponse.data);
      setSchedules(schedulesResponse.data);
      setTenantUsers(tenantUsersResponse.data);
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [session?.accessToken]);

  async function startEdit(item: TenantMaintenanceHistoryWorkOrder) {
    setEditingRow(item);
    setFeedback(null);
    setError(null);
    setEditingCostingDetail(null);
    setHistoryForm({
      description: stripLegacyVisibleText(item.description) || "",
      closure_notes: stripLegacyVisibleText(item.closure_notes) || "",
      cancellation_reason: stripLegacyVisibleText(item.cancellation_reason) || "",
      completed_at_override: item.completed_at
        ? toDateTimeLocalInputValue(item.completed_at, effectiveTimeZone)
        : "",
      closure_adjustment_note: "",
    });
    if (!session?.accessToken) {
      return;
    }
    try {
      const costingResponse = await getTenantMaintenanceWorkOrderCosting(session.accessToken, item.id);
      setEditingCostingDetail(costingResponse.data);
    } catch {
      setEditingCostingDetail(null);
    }
  }

  function openCostingModal(item: TenantMaintenanceHistoryWorkOrder) {
    setFeedback(null);
    setError(null);
    setCostingWorkOrder(item);
  }

  function openDetailModal(item: TenantMaintenanceHistoryWorkOrder) {
    setFeedback(null);
    setError(null);
    setDetailWorkOrder(item);
  }

  function openFieldReportModal(item: TenantMaintenanceHistoryWorkOrder) {
    setFeedback(null);
    setError(null);
    setFieldReportWorkOrder(item);
  }

  function closeCostingModal() {
    setCostingWorkOrder(null);
  }

  function closeFieldReportModal() {
    setFieldReportWorkOrder(null);
  }

  function closeDetailModal() {
    setDetailWorkOrder(null);
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
      completed_at_override:
        editingRow.maintenance_status === "completed" && canAdjustCompletedAt && historyForm.completed_at_override
          ? fromDateTimeLocalInputValue(historyForm.completed_at_override, effectiveTimeZone)
          : undefined,
      closure_adjustment_note:
        editingRow.maintenance_status === "completed" && canAdjustCompletedAt
          ? historyForm.closure_adjustment_note.trim() || null
          : undefined,
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

  async function handleReopen(item: TenantMaintenanceHistoryWorkOrder) {
    if (!session?.accessToken) {
      return;
    }
    const targetStatus = inferReopenStatus(item);
    const confirmed = window.confirm(
      language === "es"
        ? `La mantención "${item.title}" volverá desde Historial a ${getStatusLabel(targetStatus, language)} y reaparecerá en la bandeja activa. Este atajo solo revierte el estado operativo. Si el cierre también generó movimientos en Finanzas, usa el runbook y el script de reversa. ¿Deseas continuar?`
        : `Maintenance "${item.title}" will move from History back to ${getStatusLabel(targetStatus, language)} and reappear in the active tray. This shortcut only reverts the operational status. If closure also created Finance movements, use the runbook and rollback script. Do you want to continue?`
    );
    if (!confirmed) {
      return;
    }
    const note = window.prompt(
      language === "es"
        ? `Nota para reapertura a ${getStatusLabel(targetStatus, language)}`
        : `Reason for reopening to ${getStatusLabel(targetStatus, language)}`,
      language === "es" ? "Reapertura por corrección operativa" : "Reopened for operational correction"
    );
    try {
      const response = await updateTenantMaintenanceWorkOrderStatus(
        session.accessToken,
        item.id,
        targetStatus,
        note
      );
      setFeedback(
        language === "es"
          ? `${response.message}. La OT volvió a ${getStatusLabel(targetStatus, language)}.`
          : `${response.message}. The work order returned to ${getStatusLabel(targetStatus, language)}.`
      );
      setDetailWorkOrder(null);
      await loadData();
    } catch (rawError) {
      setError(rawError as ApiError);
    }
  }

  function getClientDisplayName(clientId: number): string {
    const client = clientById.get(clientId);
    const organization = organizationById.get(client?.organization_id ?? -1);
    return (
      stripLegacyVisibleText(organization?.name) ||
      stripLegacyVisibleText(organization?.legal_name) ||
      t("Cliente sin nombre", "Unnamed client")
    );
  }

  function getSiteDisplayName(siteId: number): string {
    const site = siteById.get(siteId);
    if (!site) {
      return t("Dirección sin registrar", "Missing address");
    }
    const base =
      stripLegacyVisibleText(getVisibleAddressLabel(site)) ||
      stripLegacyVisibleText(site.name) ||
      t("Dirección sin nombre", "Unnamed address");
    const locality = [site.commune, site.city, site.region]
      .map((value) => stripLegacyVisibleText(value))
      .filter((value): value is string => Boolean(value))
      .join(", ");
    return locality ? `${base} · ${locality}` : base;
  }

  function getTaskTypeLabel(item: Pick<TenantMaintenanceHistoryWorkOrder, "schedule_id">): string {
    const taskTypeId = item.schedule_id ? scheduleById.get(item.schedule_id)?.task_type_id : null;
    if (!taskTypeId) {
      return t("Sin tipo", "No task type");
    }
    return taskTypeById.get(taskTypeId)?.name || `#${taskTypeId}`;
  }

  function getTechnicianFunctionProfileLabel(
    item: Pick<TenantMaintenanceHistoryWorkOrder, "assigned_work_group_id" | "assigned_tenant_user_id">
  ): string {
    if (!item.assigned_work_group_id || !item.assigned_tenant_user_id) {
      return t("Sin perfil", "No profile");
    }
    return (
      workGroupMemberByKey.get(`${item.assigned_work_group_id}:${item.assigned_tenant_user_id}`)
        ?.function_profile_name || t("Sin perfil", "No profile")
    );
  }

  function getAssignedWorkGroupLabel(
    item: Pick<TenantMaintenanceHistoryWorkOrder, "assigned_work_group_id">
  ): string {
    if (!item.assigned_work_group_id) {
      return t("Sin grupo", "No group");
    }
    return workGroupById.get(item.assigned_work_group_id)?.name || `#${item.assigned_work_group_id}`;
  }

  function getAssignedTenantUserLabel(
    item: Pick<TenantMaintenanceHistoryWorkOrder, "assigned_work_group_id" | "assigned_tenant_user_id">
  ): string {
    if (!item.assigned_tenant_user_id) {
      return t("Sin responsable", "No responsible");
    }
    const user = tenantUserById.get(item.assigned_tenant_user_id);
    const member =
      item.assigned_work_group_id && item.assigned_tenant_user_id
        ? workGroupMemberByKey.get(`${item.assigned_work_group_id}:${item.assigned_tenant_user_id}`)
        : null;
    return (
      stripLegacyVisibleText(user?.full_name) ||
      stripLegacyVisibleText(user?.email) ||
      member?.function_profile_name ||
      `#${item.assigned_tenant_user_id}`
    );
  }

  const historyColumns = [
    {
      key: "order",
      header: t("Orden", "Order"),
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
      header: t("Estado final", "Final status"),
      render: (item: TenantMaintenanceHistoryWorkOrder) => (
        <AppBadge tone={getStatusTone(item.maintenance_status)}>
          {getStatusLabel(item.maintenance_status, language)}
        </AppBadge>
      ),
    },
    {
      key: "taskType",
      header: t("Tipo y perfil", "Task and profile"),
      render: (item: TenantMaintenanceHistoryWorkOrder) => (
        <div>
          <div>{getTaskTypeLabel(item)}</div>
          <div className="maintenance-cell__meta">{getTechnicianFunctionProfileLabel(item)}</div>
        </div>
      ),
    },
    {
      key: "responsible",
      header: t("Responsable", "Responsible"),
      render: (item: TenantMaintenanceHistoryWorkOrder) => (
        <div>
          <div>{getAssignedWorkGroupLabel(item)}</div>
          <div className="maintenance-cell__meta">{getAssignedTenantUserLabel(item)}</div>
        </div>
      ),
    },
    {
      key: "dates",
      header: t("Fechas", "Dates"),
      render: (item: TenantMaintenanceHistoryWorkOrder) => (
        <div>
          <div>
            {item.maintenance_status === "completed"
              ? formatDateTime(item.completed_at, language, effectiveTimeZone)
              : formatDateTime(item.cancelled_at, language, effectiveTimeZone)}
          </div>
          <div className="maintenance-cell__meta">
            {t("Solicitada", "Requested")}{" "}
            {formatDateTime(item.requested_at, language, effectiveTimeZone)}
          </div>
        </div>
      ),
    },
    {
      key: "traceability",
      header: t("Trazabilidad", "Traceability"),
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
                    onClick={() => openDetailModal(item)}
                  >
                    {t("Ver ficha", "Open detail")}
                  </button>
                  <button
                    className="btn btn-sm btn-outline-primary"
                    type="button"
                    onClick={() => openCostingModal(item)}
                  >
                    {t("Ver costos", "View costing")}
                  </button>
                  <button
                    className="btn btn-sm btn-outline-primary"
                    type="button"
                    onClick={() => openFieldReportModal(item)}
                  >
                    {t("Ver checklist", "View checklist")}
                  </button>
                  {canReopenFromHistory ? (
                    <button
                      className="btn btn-sm btn-outline-warning"
                      type="button"
                      onClick={() => void handleReopen(item)}
                    >
                      {t("Reabrir", "Reopen")}
                    </button>
                  ) : null}
                  <button
                    className="btn btn-sm btn-outline-primary"
                    type="button"
                    onClick={() => startEdit(item)}
                  >
                    {t("Editar cierre", "Edit closure")}
                  </button>
                </AppToolbar>
              }
            >
              <div className="row g-3">
                <div className="col-12 col-lg-6">
                  <h3 className="panel-card__title h6 mb-3">
                    {t("Resumen", "Summary")}
                  </h3>
                  <div className="maintenance-cell__meta">
                    {t("Instalación", "Installation")}:{" "}
                    {item.installation_id
                      ? installationById.get(item.installation_id)?.name || `#${item.installation_id}`
                      : t("sin instalación", "no installation")}
                  </div>
                  <div className="maintenance-cell__meta">
                    {t("Programada", "Scheduled")}:{" "}
                    {formatDateTime(item.scheduled_for, language, effectiveTimeZone)}
                  </div>
                  <div className="maintenance-cell__meta">
                    {t("Tipo de tarea", "Task type")}: {getTaskTypeLabel(item)}
                  </div>
                  <div className="maintenance-cell__meta">
                    {t("Perfil funcional", "Function profile")}: {getTechnicianFunctionProfileLabel(item)}
                  </div>
                  <div className="maintenance-cell__meta">
                    {t("Responsable", "Responsible")}: {getAssignedWorkGroupLabel(item)} · {getAssignedTenantUserLabel(item)}
                  </div>
                  <div className="maintenance-cell__meta">
                    {t("Cierre", "Closed")}:{" "}
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
                    {t("Cambios de estado", "Status changes")}
                  </h3>
                  <div className="d-grid gap-2">
                    {item.status_logs.map((log) => (
                      <div key={log.id} className="maintenance-history-entry">
                        <div className="maintenance-history-entry__title">
                          {getStatusLogTitle(log, language)}
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
                    {t("Visitas", "Visits")}
                  </h3>
                  <div className="d-grid gap-2">
                    {item.visits.length === 0 ? (
                      <div className="maintenance-history-entry__meta">
                        {t("Sin visitas registradas", "No visits recorded")}
                      </div>
                    ) : (
                      item.visits.map((visit) => (
                        <div key={visit.id} className="maintenance-history-entry">
                          <div className="maintenance-history-entry__title">
                            {getVisitTypeLabel(visit.visit_type, language)} · {getStatusLabel(visit.visit_status, language)}
                          </div>
                          {visit.visit_result ? (
                            <div className="maintenance-history-entry__meta">
                              {getVisitResultLabel(visit.visit_result, language)}
                            </div>
                          ) : null}
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
        eyebrow={t("Mantenciones", "Maintenance")}
        icon="tenant-history"
        title={t("Historial técnico", "Technical history")}
        description={t(
          "Órdenes cerradas con trazabilidad, visitas registradas y lectura operativa por cliente y sitio.",
          "Closed work orders with traceability, registered visits, and operational reading by client and site."
        )}
        actions={
          <AppToolbar compact>
            <MaintenanceHelpBubble
              label={t("Ayuda", "Help")}
              helpText={
                t(
                  "Aquí no se consulta una tabla paralela de histórico de la app vieja. La lectura se deriva del lifecycle de las órdenes cerradas en el PaaS.",
                  "This does not read a parallel legacy history table. The view is derived from the lifecycle of closed work orders in the PaaS."
                )
              }
            />
            <button className="btn btn-outline-secondary" type="button" onClick={() => void loadData()}>
              {t("Recargar", "Reload")}
            </button>
          </AppToolbar>
        }
      />
      <MaintenanceModuleNav />

      <PanelCard
        title={t("Filtros por grupo/líder", "Group/leader filters")}
        subtitle={
          t(
            `Mostrando ${filteredRows.length} de ${rows.length} órdenes cerradas o anuladas.`,
            `Showing ${filteredRows.length} of ${rows.length} closed or cancelled work orders.`
          )
        }
      >
        <div className="alert alert-info mb-3">
          {t(
            "Grupo responsable = el equipo asignado a la mantención. Líder o técnico responsable = la persona concreta dentro de ese equipo. Si filtras por uno de ellos y no ves resultados, significa que esas órdenes no quedaron cerradas con esa asignación exacta.",
            "Work group = the team assigned to the maintenance. Leader or responsible technician = the specific person inside that team. If you filter by one of them and see no results, those orders were not closed with that exact assignment."
          )}
        </div>
        {canReopenFromHistory ? (
          <div className="alert alert-warning mb-3">
            {t(
              "La acción Reabrir devuelve la OT a la bandeja activa solo a nivel operativo. No anula movimientos ya sincronizados en Finanzas. Si el cierre erróneo también afectó finance, usa el runbook y el script de reversa manual.",
              "The Reopen action returns the work order to the active tray only at the operational level. It does not void movements already synced to Finance. If the mistaken closure also affected finance, use the runbook and the manual rollback script."
            )}
          </div>
        ) : null}
        <div className="row g-3 align-items-end">
          <div className="col-12 col-md-5">
            <label className="form-label">
              {t("Grupo de trabajo", "Work group")}
            </label>
                          <option value="">{t("Todos los grupos", "All groups")}</option>
            <select
              className="form-select"
              value={selectedWorkGroupId}
              onChange={(event) => setSelectedWorkGroupId(event.target.value)}
            >
              <option value="">{language === "es" ? "Todos los grupos" : "All groups"}</option>
              {workGroupFilterOptions.map((group) => (
                <option key={group.id} value={String(group.id)}>
                  {stripLegacyVisibleText(group.name) || `#${group.id}`}
                </option>
              ))}
            </select>
          </div>
          <div className="col-12 col-md-5">
            <label className="form-label">
              {t("Responsable", "Responsible")}
            </label>
                          <option value="">{t("Todos los usuarios", "All users")}</option>
            <select
              className="form-select"
              value={selectedTenantUserId}
              onChange={(event) => setSelectedTenantUserId(event.target.value)}
            >
              <option value="">{language === "es" ? "Todos los usuarios" : "All users"}</option>
              {tenantUserFilterOptions.map((user) => (
                <option key={user.id} value={String(user.id)}>
                  {stripLegacyVisibleText(user.full_name) || stripLegacyVisibleText(user.email) || `#${user.id}`}
                </option>
              ))}
            </select>
          </div>
          <div className="col-12 col-md-2 d-grid">
            <button
              className="btn btn-outline-secondary"
              type="button"
              onClick={() => {
                setSelectedWorkGroupId("");
                setSelectedTenantUserId("");
              }}
            >
              {t("Limpiar", "Clear")}
            </button>
          </div>
        </div>
      </PanelCard>

      {error ? (
        <ErrorState
          title={t("No se pudo cargar el historial", "The history could not be loaded")}
          detail={getApiErrorDisplayMessage(error)}
          requestId={error.payload?.request_id}
        />
      ) : null}

      {feedback ? <div className="alert alert-success mb-0">{feedback}</div> : null}

      {isLoading ? (
        <LoadingBlock label={t("Cargando historial...", "Loading history...")} />
      ) : null}

      <DataTableCard
        title={t("Mantenciones realizadas", "Completed maintenance")}
        subtitle={t(
          "Trabajo efectivamente ejecutado y ya cerrado.",
          "Work effectively executed and already closed."
        )}
        rows={completedRows}
        columns={historyColumns}
      />

      {renderHistoryCards(completedRows)}

      <DataTableCard
        title={t("Mantenciones anuladas", "Cancelled maintenance")}
        subtitle={t(
          "Trabajo cancelado, separado de las mantenciones realmente ejecutadas.",
          "Cancelled work, separated from work that was actually executed."
        )}
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
            aria-label={t("Editar cierre de mantención", "Edit maintenance closure")}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="maintenance-form-modal__eyebrow">
              {t("Cierre e historial", "Closure and history")}
            </div>
            <PanelCard
              title={t("Editar cierre", "Edit closure")}
              subtitle={
                language === "es"
                  ? canAdjustCompletedAt && editingRow.maintenance_status === "completed"
                    ? "Aquí puedes corregir descripción, notas y la fecha efectiva del cierre cuando el registro se hizo más tarde. El ajuste queda auditado en Cambios y eventos."
                    : "Aquí solo puedes corregir descripción o notas de cierre. Fecha, hora, cliente, dirección e instalación ya no cambian."
                  : canAdjustCompletedAt && editingRow.maintenance_status === "completed"
                    ? "Here you can adjust description, notes and the effective closure timestamp when the record was entered later. The adjustment is audited in Changes and events."
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
                    <label className="form-label">{t("Trabajo realizado", "Completed work")}</label>
                    <input className="form-control" value={editingRow.title} disabled />
                  </div>
                  <div className="col-12">
                    <label className="form-label">{t("Descripción", "Description")}</label>
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
                  {editingCostingDetail?.actual?.finance_synced_at ||
                  editingCostingDetail?.actual?.income_transaction_id ||
                  editingCostingDetail?.actual?.expense_transaction_id ? (
                    <div className="col-12">
                      <div className="alert alert-warning mb-0">
                        {language === "es"
                          ? "Esta OT ya tiene sincronización previa con Finanzas. Si corriges la fecha efectiva de cierre, después conviene reintentar/ajustar la sync financiera para alinear la fecha contable con el nuevo cierre real."
                          : "This work order already has a previous Finance sync. If you correct the effective closure date, it is recommended to retry/adjust the financial sync afterwards so the transaction date matches the new real closure timestamp."}
                      </div>
                    </div>
                  ) : null}
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
                  {editingRow.maintenance_status === "completed" && canAdjustCompletedAt ? (
                    <>
                      <div className="col-12 col-md-6">
                        <label className="form-label">{language === "es" ? "Fecha efectiva de cierre" : "Effective closure date"}</label>
                        <input
                          className="form-control"
                          type="datetime-local"
                          value={historyForm.completed_at_override}
                          onChange={(event) =>
                            setHistoryForm((current) => ({
                              ...current,
                              completed_at_override: event.target.value,
                            }))
                          }
                        />
                        <div className="maintenance-history-entry__meta mt-2">
                          {language === "es"
                            ? "Solo admin y manager pueden corregir esta fecha. Se registrará como ajuste posterior al cierre original."
                            : "Only admin and manager can adjust this timestamp. It will be recorded as an update performed after the original closure."}
                        </div>
                      </div>
                      <div className="col-12 col-md-6">
                        <label className="form-label">{language === "es" ? "Motivo del ajuste" : "Adjustment reason"}</label>
                        <textarea
                          className="form-control"
                          rows={4}
                          value={historyForm.closure_adjustment_note}
                          onChange={(event) =>
                            setHistoryForm((current) => ({
                              ...current,
                              closure_adjustment_note: event.target.value,
                            }))
                          }
                          placeholder={language === "es" ? "Ej.: el trabajo terminó en terreno antes, pero se registró al volver a oficina." : "E.g. the field work ended earlier, but it was recorded later from the office."}
                        />
                      </div>
                    </>
                  ) : null}
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
        mode="readonly"
        onClose={closeCostingModal}
        onFeedback={setFeedback}
        workOrder={costingWorkOrder}
      />

      <MaintenanceWorkOrderDetailModal
        accessToken={session?.accessToken}
        clientLabel={detailWorkOrder ? getClientDisplayName(detailWorkOrder.client_id) : "—"}
        siteLabel={detailWorkOrder ? getSiteDisplayName(detailWorkOrder.site_id) : "—"}
        installationLabel={
          detailWorkOrder?.installation_id
            ? installationById.get(detailWorkOrder.installation_id)?.name || `#${detailWorkOrder.installation_id}`
            : language === "es"
              ? "Instalación pendiente"
              : "Installation pending"
        }
        taskTypeLabel={detailWorkOrder ? getTaskTypeLabel(detailWorkOrder) : undefined}
        technicianProfileLabel={
          detailWorkOrder ? getTechnicianFunctionProfileLabel(detailWorkOrder) : undefined
        }
        workGroupLabel={
          detailWorkOrder?.assigned_work_group_id
            ? workGroupById.get(detailWorkOrder.assigned_work_group_id)?.name || `#${detailWorkOrder.assigned_work_group_id}`
            : language === "es"
              ? "Sin grupo"
              : "No group"
        }
        technicianLabel={
          detailWorkOrder?.assigned_tenant_user_id
            ? tenantUserById.get(detailWorkOrder.assigned_tenant_user_id)?.full_name || `#${detailWorkOrder.assigned_tenant_user_id}`
            : language === "es"
              ? "Sin técnico"
              : "No technician"
        }
        effectiveTimeZone={effectiveTimeZone}
        isOpen={Boolean(detailWorkOrder)}
        language={language}
        mode="history"
        onClose={closeDetailModal}
        onOpenChecklist={
          detailWorkOrder
            ? () => {
                closeDetailModal();
                openFieldReportModal(detailWorkOrder);
              }
            : undefined
        }
        onOpenCosting={
          detailWorkOrder
            ? () => {
                closeDetailModal();
                openCostingModal(detailWorkOrder);
              }
            : undefined
        }
        onEditClosure={
          detailWorkOrder
            ? () => {
                closeDetailModal();
                startEdit(detailWorkOrder);
              }
            : undefined
        }
        onReopen={
          detailWorkOrder && canReopenFromHistory
            ? () => {
                closeDetailModal();
                void handleReopen(detailWorkOrder);
              }
            : undefined
        }
        workOrder={detailWorkOrder}
      />

      <MaintenanceFieldReportModal
        accessToken={session?.accessToken}
        clientLabel={fieldReportWorkOrder ? getClientDisplayName(fieldReportWorkOrder.client_id) : "—"}
        siteLabel={fieldReportWorkOrder ? getSiteDisplayName(fieldReportWorkOrder.site_id) : "—"}
        installationLabel={
          fieldReportWorkOrder?.installation_id
            ? installationById.get(fieldReportWorkOrder.installation_id)?.name ||
              `#${fieldReportWorkOrder.installation_id}`
            : language === "es"
              ? "Instalación pendiente"
              : "Installation pending"
        }
        effectiveTimeZone={effectiveTimeZone}
        isOpen={Boolean(fieldReportWorkOrder)}
        language={language}
        mode="readonly"
        onClose={closeFieldReportModal}
        onFeedback={setFeedback}
        workOrder={fieldReportWorkOrder}
      />
    </div>
  );
}
