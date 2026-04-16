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
import { pickLocalizedText, useLanguage } from "../../../../../store/language-context";
import { useTenantAuth } from "../../../../../store/tenant-auth-context";
import { formatDateTimeInTimeZone } from "../../../../../utils/dateTimeLocal";
import type { ApiError, TenantUsersItem } from "../../../../../types";
import { MaintenanceHelpBubble } from "../components/common/MaintenanceHelpBubble";
import { MaintenanceCostingModal } from "../components/common/MaintenanceCostingModal";
import { MaintenanceFieldReportModal } from "../components/common/MaintenanceFieldReportModal";
import { MaintenanceRescheduleVisitSyncPanel } from "../components/common/MaintenanceRescheduleVisitSyncPanel";
import { MaintenanceWorkOrderDetailModal } from "../components/common/MaintenanceWorkOrderDetailModal";
import { MaintenanceVisitsModal } from "../components/common/MaintenanceVisitsModal";
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
import {
  getTaskTypeAllowedProfileNames,
  isTaskTypeMembershipCompatible,
} from "../services/assignmentCapability";
import { getVisibleAddressLabel } from "../../business_core/utils/addressPresentation";
import { stripLegacyVisibleText } from "../../../../../utils/legacyVisibleText";
import {
  getTenantMaintenanceSchedules,
  type TenantMaintenanceSchedule,
} from "../services/schedulesService";
import {
  getTenantMaintenanceVisits,
  updateTenantMaintenanceVisit,
  type TenantMaintenanceVisit,
} from "../services/visitsService";
import {
  buildRescheduleVisitSyncPayload,
  getRescheduleVisitSummary,
} from "../services/rescheduleVisitSync";

const ACTIVE_WORK_ORDER_STATUSES = new Set(["scheduled", "in_progress"]);

type WorkOrderConflictSummary = {
  count: number;
  reasons: string[];
};

function buildDefaultForm(): TenantMaintenanceWorkOrderWriteRequest {
  return {
    client_id: 0,
    site_id: 0,
    installation_id: null,
    task_type_id: null,
    assigned_work_group_id: null,
    external_reference: null,
    title: "",
    description: null,
    priority: "normal",
    scheduled_for: null,
    cancellation_reason: null,
    closure_notes: null,
    reschedule_note: null,
    assigned_tenant_user_id: null,
    maintenance_status: "scheduled",
  };
}

function normalizeNullable(value: string | null): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : null;
}

function normalizeSearchLabel(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase();
}

function toMinuteKey(value: string | null): string | null {
  if (!value) {
    return null;
  }
  return value.replace(" ", "T").slice(0, 16);
}

function toDateTimeLocalInputValue(value: string | null): string {
  return toMinuteKey(value) ?? "";
}

function upsertWorkOrderRow(
  rows: TenantMaintenanceWorkOrder[],
  item: TenantMaintenanceWorkOrder
): TenantMaintenanceWorkOrder[] {
  const existingIndex = rows.findIndex((row) => row.id === item.id);
  if (existingIndex === -1) {
    return [...rows, item];
  }
  return rows.map((row) => (row.id === item.id ? item : row));
}

function getConflictReasons(
  left: Pick<
    TenantMaintenanceWorkOrder,
    "scheduled_for" | "installation_id" | "assigned_work_group_id" | "assigned_tenant_user_id"
  >,
  right: Pick<
    TenantMaintenanceWorkOrder,
    "scheduled_for" | "installation_id" | "assigned_work_group_id" | "assigned_tenant_user_id"
  >
): string[] {
  if (!toMinuteKey(left.scheduled_for) || toMinuteKey(left.scheduled_for) !== toMinuteKey(right.scheduled_for)) {
    return [];
  }
  const reasons: string[] = [];
  if (left.installation_id && right.installation_id && left.installation_id === right.installation_id) {
    reasons.push("installation");
  }
  if (
    left.assigned_work_group_id &&
    right.assigned_work_group_id &&
    left.assigned_work_group_id === right.assigned_work_group_id
  ) {
    reasons.push("group");
  }
  if (
    left.assigned_tenant_user_id &&
    right.assigned_tenant_user_id &&
    left.assigned_tenant_user_id === right.assigned_tenant_user_id
  ) {
    reasons.push("technician");
  }
  return reasons;
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

function isMembershipActive(member: {
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
}) {
  if (!member.is_active) {
    return false;
  }
  const now = new Date();
  if (member.starts_at && new Date(member.starts_at) > now) {
    return false;
  }
  if (member.ends_at && new Date(member.ends_at) < now) {
    return false;
  }
  return true;
}

export function MaintenanceWorkOrdersPage() {
  const { session, effectiveTimeZone } = useTenantAuth();
  const { language } = useLanguage();
  const t = (es: string, en: string) => pickLocalizedText(language, { es, en });
  const [searchParams] = useSearchParams();
  const [rows, setRows] = useState<TenantMaintenanceWorkOrder[]>([]);
  const [clients, setClients] = useState<TenantBusinessClient[]>([]);
  const [organizations, setOrganizations] = useState<TenantBusinessOrganization[]>([]);
  const [sites, setSites] = useState<TenantBusinessSite[]>([]);
  const [installations, setInstallations] = useState<TenantMaintenanceInstallation[]>([]);
  const [workGroups, setWorkGroups] = useState<TenantBusinessWorkGroup[]>([]);
  const [workGroupMembers, setWorkGroupMembers] = useState<TenantBusinessWorkGroupMember[]>([]);
  const [taskTypes, setTaskTypes] = useState<TenantBusinessTaskType[]>([]);
  const [schedules, setSchedules] = useState<TenantMaintenanceSchedule[]>([]);
  const [tenantUsers, setTenantUsers] = useState<TenantUsersItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [requestedCreateHandled, setRequestedCreateHandled] = useState(false);
  const [form, setForm] = useState<TenantMaintenanceWorkOrderWriteRequest>(buildDefaultForm());
  const [isRescheduleMode, setIsRescheduleMode] = useState(false);
  const [costingWorkOrder, setCostingWorkOrder] = useState<TenantMaintenanceWorkOrder | null>(null);
  const [detailWorkOrder, setDetailWorkOrder] = useState<TenantMaintenanceWorkOrder | null>(null);
  const [visitsWorkOrder, setVisitsWorkOrder] = useState<TenantMaintenanceWorkOrder | null>(null);
  const [fieldReportWorkOrder, setFieldReportWorkOrder] =
    useState<TenantMaintenanceWorkOrder | null>(null);
  const [rescheduleVisits, setRescheduleVisits] = useState<TenantMaintenanceVisit[]>([]);
  const [isRescheduleVisitsLoading, setIsRescheduleVisitsLoading] = useState(false);
  const [syncFirstOpenVisit, setSyncFirstOpenVisit] = useState(false);

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
  const taskTypeById = useMemo(() => new Map(taskTypes.map((item) => [item.id, item])), [taskTypes]);
  const scheduleById = useMemo(() => new Map(schedules.map((item) => [item.id, item])), [schedules]);
  const tenantUserById = useMemo(
    () => new Map(tenantUsers.map((user) => [user.id, user])),
    [tenantUsers]
  );
  const defaultMaintenanceTaskTypeId = useMemo(() => {
    const preferred = taskTypes.find((item) => {
      const normalized = normalizeSearchLabel(item.name);
      return normalized.includes("mantencion") || normalized.includes("maintenance");
    });
    return preferred?.id ?? null;
  }, [taskTypes]);
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
  const editingWorkOrder = useMemo(
    () => rows.find((item) => item.id === editingId) ?? null,
    [editingId, rows]
  );
  const assignmentTaskTypeId = useMemo(
    () =>
      form.task_type_id ??
      editingWorkOrder?.task_type_id ??
      (editingWorkOrder?.schedule_id
        ? scheduleById.get(editingWorkOrder.schedule_id)?.task_type_id ?? null
        : null),
    [editingWorkOrder, form.task_type_id, scheduleById]
  );
  const assignmentTaskTypeLabel = useMemo(() => {
    if (!assignmentTaskTypeId) {
      return null;
    }
    return taskTypeById.get(assignmentTaskTypeId)?.name || `#${assignmentTaskTypeId}`;
  }, [assignmentTaskTypeId, taskTypeById]);
  const assignmentTaskType = useMemo(
    () => (assignmentTaskTypeId ? taskTypeById.get(assignmentTaskTypeId) ?? null : null),
    [assignmentTaskTypeId, taskTypeById]
  );
  const assignmentAllowedProfileNames = useMemo(
    () => getTaskTypeAllowedProfileNames(assignmentTaskType),
    [assignmentTaskType]
  );
  const requiresFunctionalProfileForAssignment = Boolean(assignmentTaskTypeId);
  const rescheduleVisitSummary = useMemo(
    () => getRescheduleVisitSummary(rescheduleVisits),
    [rescheduleVisits]
  );
  const selectableTenantUsers = useMemo(() => {
    if (!form.assigned_work_group_id) {
      return activeTenantUsers;
    }
    const memberships = workGroupMembers.filter(
      (member) =>
        member.group_id === form.assigned_work_group_id && isMembershipActive(member)
    );
    const allowedIds = new Set(
      memberships
        .filter(
          (member) =>
            !requiresFunctionalProfileForAssignment ||
            isTaskTypeMembershipCompatible(assignmentTaskType, member.function_profile_name)
        )
        .map((member) => member.tenant_user_id)
    );
    return activeTenantUsers.filter((user) => allowedIds.has(user.id));
  }, [
    activeTenantUsers,
    assignmentAllowedProfileNames,
    assignmentTaskType,
    form.assigned_work_group_id,
    requiresFunctionalProfileForAssignment,
    workGroupMembers,
  ]);

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
  const conflictSummaryById = useMemo(() => {
    const map = new Map<number, WorkOrderConflictSummary>();
    for (let index = 0; index < activeRows.length; index += 1) {
      const current = activeRows[index];
      for (let nestedIndex = index + 1; nestedIndex < activeRows.length; nestedIndex += 1) {
        const candidate = activeRows[nestedIndex];
        const reasons = getConflictReasons(current, candidate);
        if (reasons.length === 0) {
          continue;
        }
        const currentSummary = map.get(current.id) ?? { count: 0, reasons: [] };
        currentSummary.count += 1;
        currentSummary.reasons = [...new Set([...currentSummary.reasons, ...reasons])];
        map.set(current.id, currentSummary);

        const candidateSummary = map.get(candidate.id) ?? { count: 0, reasons: [] };
        candidateSummary.count += 1;
        candidateSummary.reasons = [...new Set([...candidateSummary.reasons, ...reasons])];
        map.set(candidate.id, candidateSummary);
      }
    }
    return map;
  }, [activeRows]);
  const conflictingCount = useMemo(
    () => activeRows.filter((item) => (conflictSummaryById.get(item.id)?.count ?? 0) > 0).length,
    [activeRows, conflictSummaryById]
  );
  const formConflictPreview = useMemo(() => {
    const probeScheduledFor = toMinuteKey(form.scheduled_for);
    if (!probeScheduledFor) {
      return [] as TenantMaintenanceWorkOrder[];
    }
    const probe = {
      scheduled_for: form.scheduled_for,
      installation_id: form.installation_id,
      assigned_work_group_id: form.assigned_work_group_id,
      assigned_tenant_user_id: form.assigned_tenant_user_id,
    };
    return activeRows.filter(
      (item) => item.id !== editingId && getConflictReasons(item, probe).length > 0
    );
  }, [activeRows, editingId, form.assigned_tenant_user_id, form.assigned_work_group_id, form.installation_id, form.scheduled_for]);

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
        taskTypesResponse,
        schedulesResponse,
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
        getTenantBusinessTaskTypes(session.accessToken, { includeInactive: false }),
        getTenantMaintenanceSchedules(session.accessToken, { includeInactive: true }),
        getTenantUsers(session.accessToken),
      ]);
      const workGroupMembersResponses = await Promise.all(
        workGroupsResponse.data.map((group) =>
          getTenantBusinessWorkGroupMembers(session.accessToken as string, group.id)
        )
      );
      setRows(workOrdersResponse.data);
      setClients(clientsResponse.data);
      setOrganizations(organizationsResponse.data);
      setSites(sitesResponse.data);
      setInstallations(installationsResponse.data);
      setWorkGroups(workGroupsResponse.data);
      setWorkGroupMembers(workGroupMembersResponses.flatMap((response) => response.data));
      setTaskTypes(taskTypesResponse.data);
      setSchedules(schedulesResponse.data);
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

  async function loadRescheduleVisits(workOrderId: number) {
    if (!session?.accessToken) {
      return;
    }
    setIsRescheduleVisitsLoading(true);
    try {
      const response = await getTenantMaintenanceVisits(session.accessToken, { workOrderId });
      setRescheduleVisits(response.data);
    } catch {
      setRescheduleVisits([]);
    } finally {
      setIsRescheduleVisitsLoading(false);
    }
  }

  function startCreate(openForm = false, scheduledFor: string | null = null) {
    const clientId = requestedClientId || clients[0]?.id || 0;
    const candidateSites = sites.filter((site) => site.client_id === clientId);
    const siteId = requestedSiteId || candidateSites[0]?.id || 0;
    const candidateInstallations = installations.filter((installation) => installation.site_id === siteId);
    setEditingId(null);
    setIsRescheduleMode(false);
    setSyncFirstOpenVisit(false);
    setRescheduleVisits([]);
    setIsRescheduleVisitsLoading(false);
    setFeedback(null);
    setError(null);
    setIsFormOpen(openForm);
    setForm({
      ...buildDefaultForm(),
      client_id: clientId,
      site_id: siteId,
      installation_id: requestedInstallationId || candidateInstallations[0]?.id || null,
      task_type_id: defaultMaintenanceTaskTypeId,
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
      t("Cliente sin nombre", "Unnamed client")
    );
  }

  function getSiteDisplayName(siteId: number): string {
    const site = siteById.get(siteId);
    if (!site) {
      return t("Dirección sin registrar", "Missing address");
    }
    const visibleAddress =
      stripLegacyVisibleText(getVisibleAddressLabel(site)) ||
      stripLegacyVisibleText(site.name) ||
      t("Dirección sin nombre", "Unnamed address");
    const locality = [site.commune, site.city, site.region]
      .map((value) => stripLegacyVisibleText(value))
      .filter((value): value is string => Boolean(value))
      .join(", ");
    return locality ? `${visibleAddress} · ${locality}` : visibleAddress;
  }

  function getTaskTypeLabel(item: Pick<TenantMaintenanceWorkOrder, "task_type_id">): string {
    if (!item.task_type_id) {
      return t("Sin tipo", "No task type");
    }
    return taskTypeById.get(item.task_type_id)?.name || `#${item.task_type_id}`;
  }

  function getTechnicianFunctionProfileLabel(
    item: Pick<TenantMaintenanceWorkOrder, "assigned_work_group_id" | "assigned_tenant_user_id">
  ): string {
    if (!item.assigned_work_group_id || !item.assigned_tenant_user_id) {
      return t("Sin perfil", "No profile");
    }
    return (
      workGroupMemberByKey.get(`${item.assigned_work_group_id}:${item.assigned_tenant_user_id}`)
        ?.function_profile_name || t("Sin perfil", "No profile")
    );
  }

  function getAssignableTechnicianLabel(userId: number): string {
    const fullName = tenantUserById.get(userId)?.full_name || `#${userId}`;
    if (!form.assigned_work_group_id) {
      return fullName;
    }
    const profileLabel = workGroupMemberByKey.get(`${form.assigned_work_group_id}:${userId}`)?.function_profile_name;
    return profileLabel ? `${fullName} · ${profileLabel}` : fullName;
  }

  function getClientOptionLabel(client: TenantBusinessClient): string {
    const primarySite = sites.find((site) => site.client_id === client.id);
    const clientName = getClientDisplayName(client.id);
    return primarySite ? `${clientName} · ${getSiteDisplayName(primarySite.id)}` : clientName;
  }

  function startEdit(item: TenantMaintenanceWorkOrder) {
    setIsRescheduleMode(false);
    setSyncFirstOpenVisit(false);
    setRescheduleVisits([]);
    setIsRescheduleVisitsLoading(false);
    setEditingId(item.id);
    setFeedback(null);
    setError(null);
    setIsFormOpen(true);
    setForm({
      client_id: item.client_id,
      site_id: item.site_id,
      installation_id: item.installation_id,
      task_type_id: item.task_type_id,
      assigned_work_group_id: item.assigned_work_group_id,
      external_reference: item.external_reference,
      title: item.title,
      description: stripLegacyVisibleText(item.description),
      priority: item.priority,
      scheduled_for: toDateTimeLocalInputValue(item.scheduled_for),
      cancellation_reason: null,
      closure_notes: stripLegacyVisibleText(item.closure_notes),
      reschedule_note: null,
      assigned_tenant_user_id: item.assigned_tenant_user_id,
      maintenance_status: item.maintenance_status,
    });
  }

  function startReschedule(item: TenantMaintenanceWorkOrder) {
    startEdit(item);
    setIsRescheduleMode(true);
    void loadRescheduleVisits(item.id);
  }

  function closeCostingModal() {
    setCostingWorkOrder(null);
  }

  function openCostingModal(item: TenantMaintenanceWorkOrder) {
    setError(null);
    setFeedback(null);
    setCostingWorkOrder(item);
  }

  function openDetailModal(item: TenantMaintenanceWorkOrder) {
    setError(null);
    setFeedback(null);
    setDetailWorkOrder(item);
  }

  function closeDetailModal() {
    setDetailWorkOrder(null);
  }

  function openVisitsModal(item: TenantMaintenanceWorkOrder) {
    setFeedback(null);
    setError(null);
    setVisitsWorkOrder(item);
  }

  function closeVisitsModal() {
    setVisitsWorkOrder(null);
  }

  function openFieldReportModal(item: TenantMaintenanceWorkOrder) {
    setError(null);
    setFeedback(null);
    setFieldReportWorkOrder(item);
  }

  function closeFieldReportModal() {
    setFieldReportWorkOrder(null);
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
      task_type_id: form.task_type_id ? Number(form.task_type_id) : null,
      assigned_work_group_id: form.assigned_work_group_id ? Number(form.assigned_work_group_id) : null,
      external_reference: editingId ? normalizeNullable(form.external_reference) : null,
      title: form.title.trim(),
      description: stripLegacyVisibleText(normalizeNullable(form.description)),
      priority: form.priority.trim().toLowerCase() || "normal",
      scheduled_for: normalizeNullable(form.scheduled_for),
      cancellation_reason: null,
      closure_notes: editingId ? stripLegacyVisibleText(normalizeNullable(form.closure_notes)) : null,
      reschedule_note:
        editingId && isRescheduleMode ? normalizeNullable(form.reschedule_note ?? null) : undefined,
      assigned_tenant_user_id: form.assigned_tenant_user_id ? Number(form.assigned_tenant_user_id) : null,
      ...(editingId ? {} : { maintenance_status: form.maintenance_status || "scheduled" }),
    };
    try {
      const response = editingId
        ? await updateTenantMaintenanceWorkOrder(session.accessToken, editingId, payload)
        : await createTenantMaintenanceWorkOrder(session.accessToken, payload);
      setRows((current) => upsertWorkOrderRow(current, response.data));
      let feedbackMessage = response.message;
      if (
        editingId &&
        isRescheduleMode &&
        syncFirstOpenVisit &&
        rescheduleVisitSummary.syncCandidate &&
        payload.scheduled_for
      ) {
        try {
          await updateTenantMaintenanceVisit(
            session.accessToken,
            rescheduleVisitSummary.syncCandidate.id,
            buildRescheduleVisitSyncPayload(rescheduleVisitSummary.syncCandidate, {
              scheduledFor: payload.scheduled_for,
              assignedWorkGroupId: payload.assigned_work_group_id,
              assignedTenantUserId: payload.assigned_tenant_user_id,
            })
          );
          feedbackMessage =
            language === "es"
              ? `${response.message} La primera visita abierta también quedó alineada con la nueva ventana.`
              : `${response.message} The first open visit was also aligned with the new window.`;
        } catch {
          feedbackMessage =
            language === "es"
              ? `${response.message} La OT se reprogramó, pero la primera visita abierta quedó pendiente de ajuste manual.`
              : `${response.message} The work order was rescheduled, but the first open visit still requires manual adjustment.`;
        }
      }
      setFeedback(feedbackMessage);
      startCreate(false);
      setIsRescheduleMode(false);
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
        eyebrow={t("Mantenciones", "Maintenance")}
        icon="maintenance"
        title={t("Mantenciones abiertas", "Open maintenance work")}
        description={
          t(
            "Aquí solo se trabajan las mantenciones programadas o en curso. Las realizadas o anuladas pasan de inmediato al historial.",
            "Only scheduled or in-progress maintenance is worked here. Completed or cancelled work moves immediately to history."
          )
        }
        actions={
          <AppToolbar compact>
            <MaintenanceHelpBubble
              label={t("Ayuda", "Help")}
              helpText={
                t(
                  "Toda mantención debe colgar de un cliente, una dirección y una instalación real. Si falta uno de esos tres, primero debes crearlo.",
                  "Every maintenance work item must belong to a real client, address, and installation. If any is missing, create it first."
                )
              }
            />
            <button className="btn btn-outline-secondary" type="button" onClick={() => void loadData()}>
              {t("Recargar", "Reload")}
            </button>
            <button
              className="btn btn-primary"
              type="button"
              onClick={() => startCreate(true)}
              disabled={noClientsAvailable}
              title={
                noClientsAvailable
                  ? t("Primero crea un cliente en Core de negocio", "Create a client in Business core first")
                  : undefined
              }
            >
              {t("Nueva orden", "New work order")}
            </button>
          </AppToolbar>
        }
      />
      <MaintenanceModuleNav />

      {requestedClientId > 0 ? (
        <div className="maintenance-context-banner">
          {t(
            "Vista abierta desde la ficha del cliente. Las mantenciones quedan filtradas por ese cliente y la nueva orden se precarga con sus datos.",
            "View opened from the client detail. Work orders are filtered by that client and the new work order is preloaded with its data."
          )}
        </div>
      ) : null}

      {noClientsAvailable ? (
        <div className="alert alert-warning mb-0">
          {t(
            "Antes de agendar una mantención debe existir un cliente en Core de negocio.",
            "A client must exist in Business core before scheduling maintenance."
          )}{" "}
          <Link to="/tenant-portal/business-core/clients">
            {t("Ir a clientes", "Go to clients")}
          </Link>
        </div>
      ) : null}

      {feedback ? <div className="alert alert-success mb-0">{feedback}</div> : null}

      {error ? (
        <ErrorState
          title={t("No se pudo cargar la vista", "The view could not be loaded")}
          detail={getApiErrorDisplayMessage(error)}
          requestId={error.payload?.request_id}
        />
      ) : null}

      {isLoading ? (
        <LoadingBlock label={t("Cargando mantenciones...", "Loading maintenance...")} />
      ) : null}

      <div className="row g-3">
        <div className="col-12 col-md-6 col-xl-3">
          <MetricCard
            label={t("Abiertas", "Open")}
            value={summary.total}
            hint={t("Mantenciones visibles aquí", "Maintenance work visible here")}
            icon="maintenance"
            tone="info"
          />
        </div>
        <div className="col-12 col-md-6 col-xl-3">
          <MetricCard
            label={t("Programadas", "Scheduled")}
            value={summary.scheduled}
            hint={t("Pendientes de ejecutar", "Waiting to be executed")}
            icon="planning"
            tone="warning"
          />
        </div>
        <div className="col-12 col-md-6 col-xl-3">
          <MetricCard
            label={t("En curso", "In progress")}
            value={summary.inProgress}
            hint={t("Trabajo activo de terreno", "Active field work")}
            icon="focus"
            tone="info"
          />
        </div>
        <div className="col-12 col-md-6 col-xl-3">
          <MetricCard
            label={t("Historial", "History")}
            value={summary.completed + summary.cancelled}
            hint={t("Realizadas o anuladas", "Completed or cancelled")}
            icon="reports"
            tone="success"
          />
        </div>
        <div className="col-12 col-md-6 col-xl-3">
          <MetricCard
            label={t("Conflictos", "Conflicts")}
            value={conflictingCount}
            hint={
              t(
                "Cruces visibles por instalación, grupo o técnico en el mismo horario",
                "Visible clashes by installation, group, or technician in the same slot"
              )
            }
            icon="planning"
            tone={conflictingCount > 0 ? "danger" : "default"}
          />
        </div>
      </div>

      {conflictingCount > 0 ? (
        <div className="alert alert-warning mb-0">
          {t(
            "La bandeja detectó cruces de agenda en mantenciones abiertas. Revísalos antes de seguir asignando el mismo horario.",
            "The tray detected schedule clashes in open work orders. Review them before assigning the same time slot again."
          )}
        </div>
      ) : null}

      {activeRows.length === 0 && !isLoading ? (
        <PanelCard
          title={t("No hay mantenciones abiertas", "There are no open work orders")}
          subtitle={
            t(
              "Las mantenciones realizadas o anuladas ya no aparecen aquí; revísalas en Historial. Usa Nueva orden para programar trabajo nuevo.",
              "Completed or cancelled maintenance no longer appears here; review it in History. Use New work order to schedule new work."
            )
          }
        >
          <div className="maintenance-cell__meta">
            {t(
              "La bandeja diaria queda reservada solo para trabajo pendiente.",
              "The day-to-day tray is reserved only for pending work."
            )}
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
                  ? isRescheduleMode
                    ? "Reprogramar mantención"
                    : "Editar mantención"
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
                  ? isRescheduleMode
                    ? "Reprogramación auditada"
                    : "Edición puntual"
                  : "Targeted edit"
                : language === "es"
                  ? "Alta bajo demanda"
                  : "On-demand creation"}
            </div>
            <PanelCard
              title={
                editingId
                  ? language === "es"
                    ? isRescheduleMode
                      ? "Reprogramar mantención"
                      : "Editar mantención"
                    : "Edit maintenance work"
                  : language === "es"
                    ? "Nueva mantención"
                    : "New maintenance work"
              }
              subtitle={
                language === "es"
                  ? isRescheduleMode
                    ? "Ajusta fecha, instalación o responsables sin perder trazabilidad. La reprogramación quedará auditada en el historial técnico."
                    : "Programa solo trabajo abierto. Al completarlo, saldrá de esta bandeja y quedará en historial."
                  : "Schedule only open work. Once completed, it will leave this tray and remain in history."
              }
            >
              {isRescheduleMode ? (
                <div className="alert alert-info mb-3">
                  {language === "es"
                    ? "Usa este flujo para reprogramar sin perder historial. El backend dejará una traza visible con los cambios del slot y responsables."
                    : "Use this flow to reschedule without losing history. The backend will keep a visible trace of slot and responsibility changes."}
                </div>
              ) : null}
              {formConflictPreview.length > 0 ? (
                <div className="alert alert-warning mb-3">
                  {language === "es"
                    ? `Este horario ya cruza con ${formConflictPreview.length} mantención(es) abierta(s) por instalación, grupo o técnico.`
                    : `This slot already clashes with ${formConflictPreview.length} open work order(s) by installation, group, or technician.`}
                </div>
              ) : null}
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
                      {language === "es" ? "Tipo de tarea" : "Task type"}
                    </label>
                    <select
                      className="form-select"
                      value={form.task_type_id ?? ""}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          task_type_id: event.target.value ? Number(event.target.value) : null,
                          assigned_tenant_user_id: null,
                        }))
                      }
                    >
                      <option value="">
                        {language === "es" ? "Sin tipo específico" : "No specific task type"}
                      </option>
                      {taskTypes.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">
                      {language === "es" ? "Grupo/líder" : "Group/leader"}
                    </label>
                    <select
                      className="form-select"
                      value={form.assigned_work_group_id ?? ""}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          assigned_work_group_id: event.target.value ? Number(event.target.value) : null,
                          assigned_tenant_user_id: null,
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
                      {language === "es" ? "Líder responsable" : "Responsible leader"}
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
                      {selectableTenantUsers.map((user) => (
                        <option key={user.id} value={user.id}>
                          {getAssignableTechnicianLabel(user.id)}
                        </option>
                      ))}
                    </select>
                    {requiresFunctionalProfileForAssignment && assignmentTaskTypeLabel ? (
                      <div className="form-text text-muted">
                        {assignmentAllowedProfileNames.length > 0
                          ? language === "es"
                            ? `Esta mantención viene desde el tipo de tarea ${assignmentTaskTypeLabel}; solo se muestran perfiles compatibles: ${assignmentAllowedProfileNames.join(", ")}.`
                            : `This work order comes from task type ${assignmentTaskTypeLabel}; only compatible profiles are shown: ${assignmentAllowedProfileNames.join(", ")}.`
                          : language === "es"
                            ? `Esta mantención viene desde el tipo de tarea ${assignmentTaskTypeLabel}; solo se muestran técnicos con perfil funcional declarado en el grupo.`
                            : `This work order comes from task type ${assignmentTaskTypeLabel}; only technicians with a declared functional profile in the group are shown.`}
                      </div>
                    ) : null}
                    {form.assigned_work_group_id && selectableTenantUsers.length === 0 ? (
                      <div className="form-text text-warning">
                        {assignmentAllowedProfileNames.length > 0
                          ? language === "es"
                            ? `Este grupo no tiene técnicos activos compatibles con: ${assignmentAllowedProfileNames.join(", ")}.`
                            : `This group has no active technicians compatible with: ${assignmentAllowedProfileNames.join(", ")}.`
                          : requiresFunctionalProfileForAssignment
                          ? language === "es"
                            ? "Este grupo no tiene técnicos con membresía activa y perfil funcional declarado para este tipo de tarea."
                            : "This group has no technicians with an active membership and declared functional profile for this task type."
                          : language === "es"
                            ? "Este grupo no tiene técnicos con membresía activa para asignar."
                            : "This group has no technicians with an active membership available for assignment."}
                      </div>
                    ) : null}
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
                      value={toDateTimeLocalInputValue(form.scheduled_for)}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          scheduled_for: event.target.value,
                        }))
                      }
                    />
                  </div>
                  {editingId && isRescheduleMode ? (
                    <div className="col-12">
                      <label className="form-label">
                        {language === "es" ? "Motivo de reprogramación" : "Reschedule reason"}
                      </label>
                      <textarea
                        className="form-control"
                        aria-label={language === "es" ? "Motivo de reprogramación" : "Reschedule reason"}
                        rows={2}
                        placeholder={
                          language === "es"
                            ? "Ej.: cliente pidió nuevo horario, técnico reasignado, acceso restringido"
                            : "E.g. client requested a new slot, technician reassigned, restricted access"
                        }
                        value={form.reschedule_note ?? ""}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            reschedule_note: event.target.value,
                          }))
                        }
                      />
                    </div>
                  ) : null}
                  {editingId && isRescheduleMode ? (
                    <div className="col-12">
                      <MaintenanceRescheduleVisitSyncPanel
                        effectiveTimeZone={effectiveTimeZone}
                        isLoading={isRescheduleVisitsLoading}
                        language={language}
                        onSyncEnabledChange={setSyncFirstOpenVisit}
                        scheduledFor={form.scheduled_for}
                        summary={rescheduleVisitSummary}
                        syncEnabled={syncFirstOpenVisit}
                      />
                    </div>
                  ) : null}
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
                          ? isRescheduleMode
                            ? "Guardar reprogramación"
                            : "Guardar cambios"
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

      <MaintenanceCostingModal
        accessToken={session?.accessToken}
        allowComplete
        clientLabel={costingWorkOrder ? getClientDisplayName(costingWorkOrder.client_id) : "—"}
        siteLabel={costingWorkOrder ? getSiteDisplayName(costingWorkOrder.site_id) : "—"}
        installationLabel={
          costingWorkOrder?.installation_id
            ? installationById.get(costingWorkOrder.installation_id)?.name || `#${costingWorkOrder.installation_id}`
            : language === "es"
              ? "Instalación pendiente"
              : "Installation pending"
        }
        effectiveTimeZone={effectiveTimeZone}
        isOpen={Boolean(costingWorkOrder)}
        language={language}
        mode="edit"
        onClose={closeCostingModal}
        onCompleted={() => void loadData()}
        onFeedback={setFeedback}
        taskTypeId={
          costingWorkOrder?.task_type_id ??
          (costingWorkOrder?.schedule_id
            ? scheduleById.get(costingWorkOrder.schedule_id)?.task_type_id ?? null
            : null)
        }
        taskTypeLabel={costingWorkOrder ? getTaskTypeLabel(costingWorkOrder) : null}
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
        mode="open"
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
        onManageVisits={
          detailWorkOrder
            ? () => {
                closeDetailModal();
                openVisitsModal(detailWorkOrder);
              }
            : undefined
        }
        workOrder={detailWorkOrder}
      />
      <MaintenanceVisitsModal
        accessToken={session?.accessToken}
        clientLabel={visitsWorkOrder ? getClientDisplayName(visitsWorkOrder.client_id) : "—"}
        siteLabel={visitsWorkOrder ? getSiteDisplayName(visitsWorkOrder.site_id) : "—"}
        installationLabel={
          visitsWorkOrder?.installation_id
            ? installationById.get(visitsWorkOrder.installation_id)?.name || `#${visitsWorkOrder.installation_id}`
            : language === "es"
              ? "Instalación pendiente"
              : "Installation pending"
        }
        effectiveTimeZone={effectiveTimeZone}
        isOpen={Boolean(visitsWorkOrder)}
        language={language}
        onClose={closeVisitsModal}
        onFeedback={setFeedback}
        allowedFunctionProfileNames={
          visitsWorkOrder
            ? getTaskTypeAllowedProfileNames(
                taskTypeById.get(
                  visitsWorkOrder.task_type_id ??
                    (visitsWorkOrder.schedule_id
                      ? scheduleById.get(visitsWorkOrder.schedule_id)?.task_type_id ?? -1
                      : -1)
                ) ?? null
              )
            : []
        }
        requiresFunctionalProfile={Boolean(
          visitsWorkOrder?.task_type_id ||
            (visitsWorkOrder?.schedule_id
              ? scheduleById.get(visitsWorkOrder.schedule_id)?.task_type_id
              : null)
        )}
        taskTypeLabel={visitsWorkOrder ? getTaskTypeLabel(visitsWorkOrder) : null}
        technicians={activeTenantUsers.map((item) => ({ id: item.id, full_name: item.full_name }))}
        workGroups={activeWorkGroups.map((item) => ({ id: item.id, name: item.name }))}
        workGroupMembers={workGroupMembers}
        workOrder={visitsWorkOrder}
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
        mode="edit"
        onClose={closeFieldReportModal}
        onFeedback={setFeedback}
        workOrder={fieldReportWorkOrder}
      />

      <DataTableCard
        title={t("Mantenciones abiertas", "Open maintenance work")}
        subtitle={
          t(
            "Solo se muestran programadas o en curso. Al completar o anular, pasan de inmediato al historial.",
            "Only scheduled or in-progress work is shown here. Once completed or cancelled, it immediately moves to history."
          )
        }
        rows={activeRows}
        columns={[
          {
            key: "order",
            header: t("Trabajo", "Work"),
            render: (item) => (
              <div>
                <div className="maintenance-cell__title">
                  {stripLegacyVisibleText(item.title) || "—"}
                </div>
                <div className="maintenance-cell__meta">
                  {stripLegacyVisibleText(item.description) ||
                    t("Sin detalle adicional", "No additional detail")}
                </div>
              </div>
            ),
          },
          {
            key: "client",
            header: t("Cliente", "Client"),
            render: (item) => (
              <div>
                <div className="maintenance-cell__title">{getClientDisplayName(item.client_id)}</div>
                <div className="maintenance-cell__meta">{getSiteDisplayName(item.site_id)}</div>
              </div>
            ),
          },
          {
            key: "responsible",
            header: t("Responsable", "Responsible"),
            render: (item) => (
              <div>
                <div className="maintenance-cell__title">
                  {item.assigned_work_group_id
                    ? workGroupById.get(item.assigned_work_group_id)?.name || `#${item.assigned_work_group_id}`
                    : t("Sin grupo", "No group")}
                </div>
                <div className="maintenance-cell__meta">
                  {item.assigned_tenant_user_id
                    ? tenantUserById.get(item.assigned_tenant_user_id)?.full_name || `#${item.assigned_tenant_user_id}`
                    : t("Sin técnico", "No technician")}
                </div>
                <div className="maintenance-cell__meta">{getTechnicianFunctionProfileLabel(item)}</div>
              </div>
            ),
          },
          {
            key: "taskType",
            header: t("Tipo de tarea", "Task type"),
            render: (item) => getTaskTypeLabel(item),
          },
          {
            key: "schedule",
            header: t("Fecha y hora", "Date and time"),
            render: (item) => (
              <div>
                <div>{formatDateTime(item.scheduled_for, language, effectiveTimeZone)}</div>
                <div className="maintenance-cell__meta">
                  {t("Solicitada", "Requested")}{" "}
                  {formatDateTime(item.requested_at, language, effectiveTimeZone)}
                </div>
              </div>
            ),
          },
          {
            key: "status",
            header: t("Estado", "Status"),
            render: (item) => (
              <div className="d-grid gap-1">
                <AppBadge tone={getStatusTone(item.maintenance_status)}>
                  {getStatusLabel(item.maintenance_status, language)}
                </AppBadge>
                {(conflictSummaryById.get(item.id)?.count ?? 0) > 0 ? (
                  <div className="maintenance-cell__meta text-danger">
                    {t(
                      `Conflictos visibles: ${conflictSummaryById.get(item.id)?.count ?? 0}`,
                      `Visible conflicts: ${conflictSummaryById.get(item.id)?.count ?? 0}`
                    )}
                  </div>
                ) : null}
              </div>
            ),
          },
          {
            key: "installation",
            header: t("Instalación", "Installation"),
            render: (item) =>
              item.installation_id
                ? installationById.get(item.installation_id)?.name || `#${item.installation_id}`
                : t("Instalación pendiente", "Installation pending"),
          },
          {
            key: "actions",
            header: t("Acciones", "Actions"),
            render: (item) => (
              <AppToolbar compact>
                <button
                  className="btn btn-sm btn-outline-secondary"
                  type="button"
                  onClick={() => openDetailModal(item)}
                >
                  {t("Ver ficha", "Open detail")}
                </button>
                <button
                  className="btn btn-sm btn-outline-primary"
                  type="button"
                  onClick={() => startEdit(item)}
                >
                  {t("Editar", "Edit")}
                </button>
                <button
                  className="btn btn-sm btn-outline-info"
                  type="button"
                  onClick={() => startReschedule(item)}
                >
                  {t("Reprogramar", "Reschedule")}
                </button>
                <button
                  className="btn btn-sm btn-outline-secondary"
                  type="button"
                  onClick={() => openVisitsModal(item)}
                >
                  {t("Visitas", "Visits")}
                </button>
                <button
                  className="btn btn-sm btn-outline-secondary"
                  type="button"
                  onClick={() => void openCostingModal(item)}
                >
                  {t("Costos", "Costing")}
                </button>
                <button
                  className="btn btn-sm btn-outline-secondary"
                  type="button"
                  onClick={() => openFieldReportModal(item)}
                >
                  {t("Checklist", "Checklist")}
                </button>
                {item.maintenance_status === "scheduled" ? (
                  <button
                    className="btn btn-sm btn-outline-info"
                    type="button"
                    onClick={() => void handleStatusChange(item, "in_progress")}
                  >
                    {t("Iniciar", "Start")}
                  </button>
                ) : null}
                <button
                  className="btn btn-sm btn-outline-success"
                  type="button"
                  onClick={() => void openCostingModal(item)}
                >
                  {t("Cerrar con costos", "Close with costing")}
                </button>
                <button
                  className="btn btn-sm btn-outline-danger"
                  type="button"
                  onClick={() => void handleStatusChange(item, "cancelled")}
                >
                  {t("Anular", "Cancel")}
                </button>
                <button
                  className="btn btn-sm btn-outline-danger"
                  type="button"
                  onClick={() => void handleDelete(item)}
                >
                  {t("Eliminar", "Delete")}
                </button>
              </AppToolbar>
            ),
          },
        ]}
      />
    </div>
  );
}
