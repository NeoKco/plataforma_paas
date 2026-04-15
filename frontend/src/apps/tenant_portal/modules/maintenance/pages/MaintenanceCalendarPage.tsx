import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../../../../../components/common/PageHeader";
import { PanelCard } from "../../../../../components/common/PanelCard";
import { ErrorState } from "../../../../../components/feedback/ErrorState";
import { LoadingBlock } from "../../../../../components/feedback/LoadingBlock";
import { AppBadge } from "../../../../../design-system/AppBadge";
import { AppToolbar } from "../../../../../design-system/AppLayout";
import { getApiErrorDisplayMessage } from "../../../../../services/api";
import { getTenantUsers } from "../../../../../services/tenant-api";
import { useLanguage } from "../../../../../store/language-context";
import { useTenantAuth } from "../../../../../store/tenant-auth-context";
import { formatDateTimeInTimeZone } from "../../../../../utils/dateTimeLocal";
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
  getTenantBusinessTaskTypes,
  type TenantBusinessTaskType,
} from "../../business_core/services/taskTypesService";
import {
  getTenantBusinessSites,
  type TenantBusinessSite,
} from "../../business_core/services/sitesService";
import { getVisibleAddressLabel } from "../../business_core/utils/addressPresentation";
import { stripLegacyVisibleText } from "../../../../../utils/legacyVisibleText";
import { MaintenanceHelpBubble } from "../components/common/MaintenanceHelpBubble";
import { MaintenanceModuleNav } from "../components/common/MaintenanceModuleNav";
import { MaintenanceRescheduleVisitSyncPanel } from "../components/common/MaintenanceRescheduleVisitSyncPanel";
import {
  createTenantMaintenanceWorkOrder,
  getTenantMaintenanceWorkOrders,
  updateTenantMaintenanceWorkOrder,
  type TenantMaintenanceWorkOrder,
  type TenantMaintenanceWorkOrderWriteRequest,
} from "../services/workOrdersService";
import {
  getTenantMaintenanceInstallations,
  type TenantMaintenanceInstallation,
} from "../services/installationsService";
import {
  getTenantMaintenanceSchedules,
  type TenantMaintenanceSchedule,
} from "../services/schedulesService";
import {
  getTaskTypeAllowedProfileNames,
  isTaskTypeMembershipCompatible,
} from "../services/assignmentCapability";
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
const WEEKDAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

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

function toMinuteKey(value: string | null): string | null {
  if (!value) {
    return null;
  }
  return value.replace(" ", "T").slice(0, 16);
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

function toMonthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toLocalDateTimeValue(date: Date) {
  return `${toDateKey(date)}T09:00`;
}

function getCalendarGridStart(date: Date) {
  const monthStart = toMonthStart(date);
  const dayIndex = (monthStart.getDay() + 6) % 7;
  const start = new Date(monthStart);
  start.setDate(monthStart.getDate() - dayIndex);
  return start;
}

function getMonthLabel(date: Date, language: "es" | "en") {
  return new Intl.DateTimeFormat(language === "es" ? "es-CL" : "en-US", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function getWeekdayLabel(day: (typeof WEEKDAY_KEYS)[number], language: "es" | "en") {
  const labels = {
    es: {
      mon: "Lun",
      tue: "Mar",
      wed: "Mié",
      thu: "Jue",
      fri: "Vie",
      sat: "Sáb",
      sun: "Dom",
    },
    en: {
      mon: "Mon",
      tue: "Tue",
      wed: "Wed",
      thu: "Thu",
      fri: "Fri",
      sat: "Sat",
      sun: "Sun",
    },
  };
  return labels[language][day];
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

export function MaintenanceCalendarPage() {
  const { session, effectiveTimeZone } = useTenantAuth();
  const { language } = useLanguage();
  const [workOrders, setWorkOrders] = useState<TenantMaintenanceWorkOrder[]>([]);
  const [clients, setClients] = useState<TenantBusinessClient[]>([]);
  const [organizations, setOrganizations] = useState<TenantBusinessOrganization[]>([]);
  const [sites, setSites] = useState<TenantBusinessSite[]>([]);
  const [installations, setInstallations] = useState<TenantMaintenanceInstallation[]>([]);
  const [workGroups, setWorkGroups] = useState<TenantBusinessWorkGroup[]>([]);
  const [workGroupMembers, setWorkGroupMembers] = useState<TenantBusinessWorkGroupMember[]>([]);
  const [taskTypes, setTaskTypes] = useState<TenantBusinessTaskType[]>([]);
  const [schedules, setSchedules] = useState<TenantMaintenanceSchedule[]>([]);
  const [tenantUsers, setTenantUsers] = useState<TenantUsersItem[]>([]);
  const [currentMonth, setCurrentMonth] = useState(() => toMonthStart(new Date()));
  const [selectedDateKey, setSelectedDateKey] = useState(() => toDateKey(new Date()));
  const [calendarAssignedWorkGroupFilter, setCalendarAssignedWorkGroupFilter] = useState<number | null>(null);
  const [calendarAssignedTechnicianFilter, setCalendarAssignedTechnicianFilter] = useState<number | null>(null);
  const [isRescheduleMode, setIsRescheduleMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [rescheduleVisits, setRescheduleVisits] = useState<TenantMaintenanceVisit[]>([]);
  const [isRescheduleVisitsLoading, setIsRescheduleVisitsLoading] = useState(false);
  const [syncFirstOpenVisit, setSyncFirstOpenVisit] = useState(false);
  const [form, setForm] = useState<TenantMaintenanceWorkOrderWriteRequest>(buildDefaultForm());
  const rescheduleVisitSummary = useMemo(
    () => getRescheduleVisitSummary(rescheduleVisits),
    [rescheduleVisits]
  );

  const clientById = useMemo(
    () => new Map(clients.map((client) => [client.id, client])),
    [clients]
  );
  const organizationById = useMemo(
    () => new Map(organizations.map((organization) => [organization.id, organization])),
    [organizations]
  );
  const siteById = useMemo(() => new Map(sites.map((site) => [site.id, site])), [sites]);
  const scheduleById = useMemo(
    () => new Map(schedules.map((schedule) => [schedule.id, schedule])),
    [schedules]
  );
  const taskTypeById = useMemo(
    () => new Map(taskTypes.map((taskType) => [taskType.id, taskType])),
    [taskTypes]
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
  const editingWorkOrder = useMemo(
    () => workOrders.find((item) => item.id === editingId) ?? null,
    [editingId, workOrders]
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

  const activeRows = useMemo(
    () =>
      [...workOrders]
        .filter((item) => ACTIVE_WORK_ORDER_STATUSES.has(item.maintenance_status))
        .sort((left, right) => {
          const leftDate = new Date(left.scheduled_for || left.requested_at).getTime();
          const rightDate = new Date(right.scheduled_for || right.requested_at).getTime();
          return leftDate - rightDate;
        }),
    [workOrders]
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
  const visibleCalendarRows = useMemo(
    () =>
      activeRows.filter((item) => {
        const matchesWorkGroup =
          calendarAssignedWorkGroupFilter === null ||
          item.assigned_work_group_id === calendarAssignedWorkGroupFilter;
        const matchesTechnician =
          calendarAssignedTechnicianFilter === null ||
          item.assigned_tenant_user_id === calendarAssignedTechnicianFilter;
        return matchesWorkGroup && matchesTechnician;
      }),
    [activeRows, calendarAssignedTechnicianFilter, calendarAssignedWorkGroupFilter]
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

  const eventsByDate = useMemo(() => {
    const map = new Map<string, TenantMaintenanceWorkOrder[]>();
    for (const item of visibleCalendarRows) {
      const source = item.scheduled_for || item.requested_at;
      if (!source) {
        continue;
      }
      const key = source.slice(0, 10);
      const dayRows = map.get(key) ?? [];
      dayRows.push(item);
      map.set(key, dayRows);
    }
    return map;
  }, [visibleCalendarRows]);

  const calendarDays = useMemo(() => {
    const start = getCalendarGridStart(currentMonth);
    return Array.from({ length: 42 }, (_, index) => {
      const day = new Date(start);
      day.setDate(start.getDate() + index);
      const key = toDateKey(day);
      return {
        date: day,
        key,
        isCurrentMonth: day.getMonth() === currentMonth.getMonth(),
        isToday: key === toDateKey(new Date()),
        isSelected: key === selectedDateKey,
        events: eventsByDate.get(key) ?? [],
      };
    });
  }, [currentMonth, eventsByDate, selectedDateKey]);

  const selectedDayEvents = useMemo(
    () => eventsByDate.get(selectedDateKey) ?? [],
    [eventsByDate, selectedDateKey]
  );

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
        getTenantMaintenanceWorkOrders(session.accessToken),
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
      setWorkOrders(workOrdersResponse.data);
      setClients(clientsResponse.data);
      setOrganizations(organizationsResponse.data);
      setSites(sitesResponse.data);
      setInstallations(installationsResponse.data);
      setWorkGroups(workGroupsResponse.data);
      setWorkGroupMembers(workGroupMembersResponses.flatMap((response) => response.data));
      setTaskTypes(taskTypesResponse.data);
      setSchedules(schedulesResponse.data);
      setTenantUsers(tenantUsersResponse.data);
      setForm((current) => ({
        ...current,
        client_id: current.client_id || clientsResponse.data[0]?.id || 0,
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

  function getClientOptionLabel(client: TenantBusinessClient): string {
    const primarySite = sites.find((site) => site.client_id === client.id);
    const clientName = getClientDisplayName(client.id);
    return primarySite ? `${clientName} · ${getSiteDisplayName(primarySite.id)}` : clientName;
  }

  function getAssignableTechnicianLabel(userId: number): string {
    const fullName = tenantUserById.get(userId)?.full_name || `#${userId}`;
    if (!form.assigned_work_group_id) {
      return fullName;
    }
    const profileLabel = workGroupMemberByKey.get(`${form.assigned_work_group_id}:${userId}`)?.function_profile_name;
    return profileLabel ? `${fullName} · ${profileLabel}` : fullName;
  }

  function startCreateForDate(date: Date) {
    const clientId = clients[0]?.id || 0;
    const candidateSites = sites.filter((site) => site.client_id === clientId);
    const siteId = candidateSites[0]?.id || 0;
    const candidateInstallations = installations.filter((installation) => installation.site_id === siteId);
    setSelectedDateKey(toDateKey(date));
    setCurrentMonth(toMonthStart(date));
    setEditingId(null);
    setIsRescheduleMode(false);
    setFeedback(null);
    setError(null);
    setIsFormOpen(true);
    setForm({
      ...buildDefaultForm(),
      client_id: clientId,
      site_id: siteId,
      installation_id: candidateInstallations[0]?.id || null,
      task_type_id: null,
      assigned_work_group_id: null,
      scheduled_for: toLocalDateTimeValue(date),
    });
  }

  function startGeneralCreate() {
    startCreateForDate(new Date());
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
    setSelectedDateKey((item.scheduled_for || item.requested_at).slice(0, 10));
    setForm({
      client_id: item.client_id,
      site_id: item.site_id,
      installation_id: item.installation_id,
      task_type_id:
        item.task_type_id ??
        (item.schedule_id ? scheduleById.get(item.schedule_id)?.task_type_id ?? null : null),
      assigned_work_group_id: item.assigned_work_group_id,
      external_reference: item.external_reference,
      title: item.title,
      description: stripLegacyVisibleText(item.description),
      priority: item.priority,
      scheduled_for: item.scheduled_for,
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
      setIsFormOpen(false);
      setEditingId(null);
      setIsRescheduleMode(false);
      setSyncFirstOpenVisit(false);
      setRescheduleVisits([]);
      setIsRescheduleVisitsLoading(false);
      setForm(buildDefaultForm());
      await loadData();
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="d-grid gap-4">
      <PageHeader
        eyebrow={language === "es" ? "Mantenciones" : "Maintenance"}
        icon="planning"
        title={language === "es" ? "Agenda técnica" : "Technical calendar"}
        description={
          language === "es"
            ? "Calendario visual de mantenciones abiertas. Desde aquí puedes programar trabajo nuevo sobre cliente, dirección e instalación reales."
            : "Visual calendar for open maintenance work. From here you can schedule new work on a real client, address, and installation."
        }
        actions={
          <AppToolbar compact>
            <MaintenanceHelpBubble
              label={language === "es" ? "Ayuda" : "Help"}
              helpText={
                language === "es"
                  ? "La agenda muestra solo mantenciones abiertas. Al completar o anular una orden, desaparece de aquí y queda en Historial."
                  : "The calendar shows only open maintenance work. Once an order is completed or cancelled, it disappears from here and remains in History."
              }
            />
            <button className="btn btn-outline-secondary" type="button" onClick={() => void loadData()}>
              {language === "es" ? "Recargar" : "Reload"}
            </button>
            <button
              className="btn btn-primary"
              type="button"
              onClick={startGeneralCreate}
              disabled={noClientsAvailable}
            >
              {language === "es" ? "Nueva mantención" : "New maintenance work"}
            </button>
          </AppToolbar>
        }
      />
      <MaintenanceModuleNav />

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
          title={language === "es" ? "No se pudo cargar la agenda" : "The calendar could not be loaded"}
          detail={getApiErrorDisplayMessage(error)}
          requestId={error.payload?.request_id}
        />
      ) : null}

      {isLoading ? (
        <LoadingBlock label={language === "es" ? "Cargando agenda técnica..." : "Loading technical calendar..."} />
      ) : null}

      {conflictingCount > 0 ? (
        <div className="alert alert-warning mb-0">
          {language === "es"
            ? `La agenda detectó ${conflictingCount} mantención(es) abierta(s) con cruces visibles de instalación, grupo o técnico.`
            : `The calendar detected ${conflictingCount} open work order(s) with visible installation, group, or technician clashes.`}
        </div>
      ) : null}

      <PanelCard
        title={language === "es" ? "Agenda visual" : "Visual calendar"}
        subtitle={
          language === "es"
            ? "Cada bloque representa una mantención abierta programada para ese día. Haz clic sobre el día para crear una nueva."
            : "Each block represents an open maintenance job scheduled for that day. Click a day to create a new one."
        }
        actions={
          <div className="maintenance-calendar__toolbar">
            <button
              className="btn btn-outline-secondary btn-sm"
              type="button"
              onClick={() => setCurrentMonth(toMonthStart(new Date()))}
            >
              {language === "es" ? "Hoy" : "Today"}
            </button>
            <button
              className="btn btn-outline-secondary btn-sm"
              type="button"
              onClick={() =>
                setCurrentMonth(
                  (current) => new Date(current.getFullYear(), current.getMonth() - 1, 1)
                )
              }
            >
              {language === "es" ? "Anterior" : "Back"}
            </button>
            <button
              className="btn btn-outline-secondary btn-sm"
              type="button"
              onClick={() =>
                setCurrentMonth(
                  (current) => new Date(current.getFullYear(), current.getMonth() + 1, 1)
                )
              }
            >
              {language === "es" ? "Siguiente" : "Next"}
            </button>
          </div>
        }
      >
        <div className="d-flex flex-wrap gap-2 align-items-end mb-3">
          <div>
            <label className="form-label mb-1">
              {language === "es" ? "Filtrar por grupo" : "Filter by group"}
            </label>
            <select
              className="form-select form-select-sm"
              aria-label={language === "es" ? "Filtrar por grupo" : "Filter by group"}
              value={calendarAssignedWorkGroupFilter ?? ""}
              onChange={(event) =>
                setCalendarAssignedWorkGroupFilter(
                  event.target.value ? Number(event.target.value) : null
                )
              }
            >
              <option value="">{language === "es" ? "Todos los grupos" : "All groups"}</option>
              {activeWorkGroups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label mb-1">
              {language === "es" ? "Filtrar por técnico" : "Filter by technician"}
            </label>
            <select
              className="form-select form-select-sm"
              aria-label={language === "es" ? "Filtrar por técnico" : "Filter by technician"}
              value={calendarAssignedTechnicianFilter ?? ""}
              onChange={(event) =>
                setCalendarAssignedTechnicianFilter(
                  event.target.value ? Number(event.target.value) : null
                )
              }
            >
              <option value="">{language === "es" ? "Todos los técnicos" : "All technicians"}</option>
              {activeTenantUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.full_name}
                </option>
              ))}
            </select>
          </div>
          <div className="maintenance-cell__meta mb-1">
            {language === "es"
              ? `${visibleCalendarRows.length} mantención(es) visibles de ${activeRows.length} abierta(s)`
              : `${visibleCalendarRows.length} visible maintenance work order(s) out of ${activeRows.length} open`}
          </div>
        </div>
        <div className="maintenance-calendar">
          <div className="maintenance-calendar__heading">
            {getMonthLabel(currentMonth, language)}
          </div>
          <div className="maintenance-calendar__weekdays">
            {WEEKDAY_KEYS.map((day) => (
              <div key={day} className="maintenance-calendar__weekday">
                {getWeekdayLabel(day, language)}
              </div>
            ))}
          </div>
          <div className="maintenance-calendar__grid">
            {calendarDays.map((day) => (
              <button
                key={day.key}
                type="button"
                className={[
                  "maintenance-calendar__day",
                  day.isCurrentMonth ? "" : "is-outside",
                  day.isToday ? "is-today" : "",
                  day.isSelected ? "is-selected" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => {
                  setSelectedDateKey(day.key);
                  if (day.isCurrentMonth) {
                    startCreateForDate(day.date);
                  }
                }}
              >
                <div className="maintenance-calendar__day-header">
                  <span>{day.date.getDate()}</span>
                  {day.isCurrentMonth ? (
                    <span className="maintenance-calendar__day-action">
                      {language === "es" ? "+ mant." : "+ maint."}
                    </span>
                  ) : null}
                </div>
                {day.events.some((item) => (conflictSummaryById.get(item.id)?.count ?? 0) > 0) ? (
                  <div className="maintenance-cell__meta text-danger text-start">
                    {language === "es" ? "Conflicto visible" : "Visible conflict"}
                  </div>
                ) : null}
                <div className="maintenance-calendar__events">
                  {day.events.slice(0, 4).map((item) => (
                    <span
                      key={item.id}
                      className={`maintenance-calendar__event is-${item.maintenance_status}`}
                      onClick={(event) => {
                        event.stopPropagation();
                          startReschedule(item);
                      }}
                    >
                      <strong>
                        {formatDateTime(item.scheduled_for, language, effectiveTimeZone).split(",")[1]?.trim() ||
                          formatDateTime(item.scheduled_for, language, effectiveTimeZone)}
                      </strong>
                      <span>
                        {(conflictSummaryById.get(item.id)?.count ?? 0) > 0 ? "⚠ " : ""}
                        {stripLegacyVisibleText(item.title) || "—"}
                      </span>
                    </span>
                  ))}
                  {day.events.length > 4 ? (
                    <span className="maintenance-calendar__more">
                      {language === "es"
                        ? `+${day.events.length - 4} más`
                        : `+${day.events.length - 4} more`}
                    </span>
                  ) : null}
                </div>
              </button>
            ))}
          </div>
        </div>
      </PanelCard>

      <PanelCard
        title={language === "es" ? "Mantenciones del día seleccionado" : "Maintenance for selected day"}
        subtitle={
          language === "es"
            ? "Lectura rápida del día escogido, con cliente, dirección y horario."
            : "Quick reading of the selected day, with client, address, and schedule."
        }
      >
        {selectedDayEvents.length === 0 ? (
          <div className="maintenance-cell__meta">
            {language === "es" ? "No hay mantenciones abiertas para este día." : "There is no open maintenance work for this day."}
          </div>
        ) : (
          <div className="d-grid gap-3">
            {selectedDayEvents.map((item) => (
              <div key={item.id} className="maintenance-history-entry">
                <div className="d-flex flex-wrap justify-content-between gap-2 align-items-start">
                  <div className="d-grid gap-1">
                    <div className="maintenance-history-entry__title">
                      {stripLegacyVisibleText(item.title) || "—"}
                    </div>
                    <div className="maintenance-history-entry__meta">
                      {getClientDisplayName(item.client_id)}
                    </div>
                    <div className="maintenance-history-entry__meta">
                      {getSiteDisplayName(item.site_id)}
                    </div>
                    <div className="maintenance-history-entry__meta">
                      {language === "es" ? "Instalación" : "Installation"}:{" "}
                      {item.installation_id
                        ? installations.find((installation) => installation.id === item.installation_id)?.name || `#${item.installation_id}`
                        : language === "es"
                          ? "sin instalación"
                          : "no installation"}
                    </div>
                    <div className="maintenance-history-entry__meta">
                      {language === "es" ? "Grupo" : "Group"}:{" "}
                      {item.assigned_work_group_id
                        ? workGroupById.get(item.assigned_work_group_id)?.name || `#${item.assigned_work_group_id}`
                        : language === "es"
                          ? "sin grupo"
                          : "no group"}
                    </div>
                    <div className="maintenance-history-entry__meta">
                      {language === "es" ? "Técnico" : "Technician"}:{" "}
                      {item.assigned_tenant_user_id
                        ? tenantUserById.get(item.assigned_tenant_user_id)?.full_name || `#${item.assigned_tenant_user_id}`
                        : language === "es"
                          ? "sin técnico"
                          : "no technician"}
                    </div>
                  </div>
                  <AppBadge tone={item.maintenance_status === "in_progress" ? "info" : "warning"}>
                    {item.maintenance_status === "in_progress"
                      ? language === "es"
                        ? "En curso"
                        : "In progress"
                      : language === "es"
                        ? "Programada"
                        : "Scheduled"}
                  </AppBadge>
                </div>
                {(conflictSummaryById.get(item.id)?.count ?? 0) > 0 ? (
                  <div className="maintenance-history-entry__meta text-danger mt-2">
                    {language === "es"
                      ? `Conflictos visibles: ${conflictSummaryById.get(item.id)?.count ?? 0}`
                      : `Visible conflicts: ${conflictSummaryById.get(item.id)?.count ?? 0}`}
                  </div>
                ) : null}
                <div className="maintenance-history-entry__meta mt-2">
                  {formatDateTime(item.scheduled_for, language, effectiveTimeZone)}
                </div>
                <div className="d-flex gap-2 mt-2">
                  <button
                    className="btn btn-sm btn-outline-primary"
                    type="button"
                    onClick={() => startEdit(item)}
                  >
                    {language === "es" ? "Editar" : "Edit"}
                  </button>
                  <button
                    className="btn btn-sm btn-outline-info"
                    type="button"
                    onClick={() => startReschedule(item)}
                  >
                    {language === "es" ? "Reprogramar" : "Reschedule"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </PanelCard>

      {isFormOpen ? (
        <div className="maintenance-form-backdrop" role="presentation" onClick={() => setIsFormOpen(false)}>
          <div
            className="maintenance-form-modal maintenance-form-modal--wide"
            role="dialog"
            aria-modal="true"
            aria-label={
              editingId
                ? language === "es"
                  ? isRescheduleMode
                    ? "Reprogramar mantención desde agenda"
                    : "Editar mantención desde agenda"
                  : "Edit maintenance from calendar"
                : language === "es"
                  ? "Nueva mantención desde agenda"
                  : "New maintenance from calendar"
            }
            onClick={(event) => event.stopPropagation()}
          >
            <div className="maintenance-form-modal__eyebrow">
              {editingId
                ? language === "es"
                  ? isRescheduleMode
                    ? "Reprogramación desde agenda"
                    : "Edición desde agenda"
                  : "Calendar edit"
                : language === "es"
                  ? "Alta desde agenda"
                  : "Calendar creation"}
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
                    ? "Ajusta fecha, instalación o responsables desde la agenda sin perder trazabilidad histórica."
                    : "La agenda programa mantenciones abiertas; al completarlas, desaparecerán de aquí."
                  : "The calendar schedules open maintenance work; once completed, it will disappear from here."
              }
            >
              {isRescheduleMode ? (
                <div className="alert alert-info mb-3">
                  {language === "es"
                    ? "La reprogramación dejará una traza visible en historial con el cambio de slot y responsables."
                    : "Rescheduling will keep a visible trace in history with slot and responsibility changes."}
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
                    <label className="form-label">{language === "es" ? "Instalación" : "Installation"}</label>
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
                            ? "Este grupo no tiene técnicos con membresía activa para asignar desde agenda."
                            : "This group has no technicians with an active membership available from the calendar."}
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
                      value={form.scheduled_for ?? ""}
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
                            ? "Ej.: acceso pospuesto, reasignación de técnico, ventana nueva del cliente"
                            : "E.g. postponed access, technician reassigned, new customer window"
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
                  <button className="btn btn-outline-secondary" type="button" onClick={() => setIsFormOpen(false)}>
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
                          ? "Crear mantención"
                          : "Create maintenance"}
                  </button>
                </div>
              </form>
            </PanelCard>
          </div>
        </div>
      ) : null}
    </div>
  );
}
