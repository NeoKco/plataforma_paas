import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../../../../components/common/PageHeader";
import { PanelCard } from "../../../../../components/common/PanelCard";
import { DataTableCard } from "../../../../../components/data-display/DataTableCard";
import { ErrorState } from "../../../../../components/feedback/ErrorState";
import { LoadingBlock } from "../../../../../components/feedback/LoadingBlock";
import { AppBadge } from "../../../../../design-system/AppBadge";
import { AppToolbar } from "../../../../../design-system/AppLayout";
import { getApiErrorDisplayMessage } from "../../../../../services/api";
import { getTenantUsers } from "../../../../../services/tenant-api";
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
  getTenantBusinessContacts,
  type TenantBusinessContact,
} from "../../business_core/services/contactsService";
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
import { hasTenantPermission } from "../../../utils/tenant-permissions";

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

function getFinanceStatusLabel(
  item: TenantMaintenanceHistoryWorkOrder,
  language: "es" | "en"
): string {
  const financeSummary = getFinanceSummary(item);
  if (
    financeSummary.income_is_voided ||
    financeSummary.expense_is_voided
  ) {
    return pickLocalizedText(language, {
      es: "Finance anulada",
      en: "Finance voided",
    });
  }
  if (
    (financeSummary.income_transaction_id != null &&
      (!financeSummary.income_has_account || !financeSummary.income_has_category)) ||
    (financeSummary.expense_transaction_id != null &&
      (!financeSummary.expense_has_account || !financeSummary.expense_has_category))
  ) {
    return pickLocalizedText(language, {
      es: "Finance incompleta",
      en: "Finance incomplete",
    });
  }
  if (
    (financeSummary.income_transaction_id != null && financeSummary.income_is_reconciled) ||
    (financeSummary.expense_transaction_id != null && financeSummary.expense_is_reconciled)
  ) {
    return pickLocalizedText(language, {
      es: "Finance conciliada",
      en: "Finance reconciled",
    });
  }
  if (financeSummary.is_synced_to_finance) {
    return pickLocalizedText(language, { es: "Finance OK", en: "Finance OK" });
  }
  if (financeSummary.has_actual_cost) {
    return pickLocalizedText(language, { es: "Finance pendiente", en: "Finance pending" });
  }
  return pickLocalizedText(language, { es: "Sin cierre económico", en: "No financial close" });
}

function getFinanceStatusTone(
  item: TenantMaintenanceHistoryWorkOrder
): "success" | "warning" | "danger" | "neutral" {
  const financeSummary = getFinanceSummary(item);
  if (financeSummary.income_is_voided || financeSummary.expense_is_voided) {
    return "danger";
  }
  if (
    (financeSummary.income_transaction_id != null &&
      (!financeSummary.income_has_account || !financeSummary.income_has_category)) ||
    (financeSummary.expense_transaction_id != null &&
      (!financeSummary.expense_has_account || !financeSummary.expense_has_category))
  ) {
    return "warning";
  }
  if (financeSummary.is_synced_to_finance) {
    return "success";
  }
  if (financeSummary.has_actual_cost) {
    return "warning";
  }
  return "neutral";
}

function getFinanceSummary(item?: TenantMaintenanceHistoryWorkOrder | null) {
  return {
    has_actual_cost: false,
    is_synced_to_finance: false,
    income_transaction_id: null,
    expense_transaction_id: null,
    finance_synced_at: null,
    income_is_reconciled: false,
    expense_is_reconciled: false,
    income_is_voided: false,
    expense_is_voided: false,
    income_has_account: false,
    expense_has_account: false,
    income_has_category: false,
    expense_has_category: false,
    ...(item?.finance_summary ?? {}),
  };
}

function getFinanceTransactionHealthLabel(
  transactionType: "income" | "expense",
  item: TenantMaintenanceHistoryWorkOrder,
  language: "es" | "en"
): string | null {
  const financeSummary = getFinanceSummary(item);
  const isLinked =
    transactionType === "income"
      ? financeSummary.income_transaction_id != null
      : financeSummary.expense_transaction_id != null;
  if (!isLinked) {
    return null;
  }
  const isVoided =
    transactionType === "income"
      ? financeSummary.income_is_voided
      : financeSummary.expense_is_voided;
  if (isVoided) {
    return pickLocalizedText(language, { es: "Anulada", en: "Voided" });
  }
  const hasAccount =
    transactionType === "income"
      ? financeSummary.income_has_account
      : financeSummary.expense_has_account;
  const hasCategory =
    transactionType === "income"
      ? financeSummary.income_has_category
      : financeSummary.expense_has_category;
  if (!hasAccount || !hasCategory) {
    return pickLocalizedText(language, {
      es: `Incompleta${!hasAccount && !hasCategory ? " (sin cuenta/categoría)" : !hasAccount ? " (sin cuenta)" : " (sin categoría)"}`,
      en: `Incomplete${!hasAccount && !hasCategory ? " (missing account/category)" : !hasAccount ? " (missing account)" : " (missing category)"}`,
    });
  }
  const isReconciled =
    transactionType === "income"
      ? financeSummary.income_is_reconciled
      : financeSummary.expense_is_reconciled;
  if (isReconciled) {
    return pickLocalizedText(language, { es: "Conciliada", en: "Reconciled" });
  }
  return pickLocalizedText(language, { es: "Sincronizada", en: "Synced" });
}

function getFinanceDimensionGapLabel(
  transactionType: "income" | "expense",
  item: TenantMaintenanceHistoryWorkOrder,
  language: "es" | "en"
): string | null {
  const financeSummary = getFinanceSummary(item);
  const isLinked =
    transactionType === "income"
      ? financeSummary.income_transaction_id != null
      : financeSummary.expense_transaction_id != null;
  if (!isLinked) {
    return null;
  }
  const hasAccount =
    transactionType === "income"
      ? financeSummary.income_has_account
      : financeSummary.expense_has_account;
  const hasCategory =
    transactionType === "income"
      ? financeSummary.income_has_category
      : financeSummary.expense_has_category;
  if (hasAccount && hasCategory) {
    return null;
  }
  return pickLocalizedText(language, {
    es: !hasAccount && !hasCategory
      ? "sin cuenta y categoría"
      : !hasAccount
        ? "sin cuenta"
        : "sin categoría",
    en: !hasAccount && !hasCategory
      ? "missing account and category"
      : !hasAccount
        ? "missing account"
        : "missing category",
  });
}

function buildFinanceTransactionLink(
  item: TenantMaintenanceHistoryWorkOrder,
  kind: "income" | "expense"
): string | null {
  const financeSummary = getFinanceSummary(item);
  const transactionId =
    kind === "income"
      ? financeSummary.income_transaction_id
      : financeSummary.expense_transaction_id;
  if (transactionId == null) {
    return null;
  }
  const params = new URLSearchParams({
    transactionId: String(transactionId),
    transactionType: kind,
    search: `${kind === "income" ? "Ingreso" : "Egreso"} mantención #${item.id}`,
  });
  return `/tenant-portal/finance?${params.toString()}`;
}

function inferReopenStatus(item: TenantMaintenanceHistoryWorkOrder): "scheduled" | "in_progress" {
  const candidate = item.status_logs.find(
    (log) =>
      log.to_status === item.maintenance_status &&
      (log.from_status === "scheduled" || log.from_status === "in_progress")
  );
  return candidate?.from_status === "in_progress" ? "in_progress" : "scheduled";
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

export function MaintenanceHistoryPage() {
  const { session, tenantUser, effectiveTimeZone } = useTenantAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const t = (es: string, en: string) => pickLocalizedText(language, { es, en });
  const canReadBusinessCore = hasTenantPermission(tenantUser, "tenant.business_core.read");
  const canReadUsers = hasTenantPermission(tenantUser, "tenant.users.read");
  const canReopenFromHistory = session?.role === "admin" || session?.role === "manager";
  const canAdjustCompletedAt = session?.role === "admin" || session?.role === "manager";
  const [rows, setRows] = useState<TenantMaintenanceHistoryWorkOrder[]>([]);
  const [clients, setClients] = useState<TenantBusinessClient[]>([]);
  const [contacts, setContacts] = useState<TenantBusinessContact[]>([]);
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
    task_type_id: null as number | null,
    assigned_work_group_id: null as number | null,
    assigned_tenant_user_id: null as number | null,
  });

  const clientById = useMemo(
    () => new Map(clients.map((client) => [client.id, client])),
    [clients]
  );
  const organizationById = useMemo(
    () => new Map(organizations.map((organization) => [organization.id, organization])),
    [organizations]
  );
  const contactsByOrganizationId = useMemo(() => {
    const grouped = new Map<number, TenantBusinessContact[]>();
    contacts.forEach((contact) => {
      const existing = grouped.get(contact.organization_id) ?? [];
      existing.push(contact);
      grouped.set(contact.organization_id, existing);
    });
    return grouped;
  }, [contacts]);
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
  const activeTaskTypes = useMemo(() => taskTypes.filter((item) => item.is_active), [taskTypes]);
  const activeWorkGroups = useMemo(
    () => workGroups.filter((group) => group.is_active),
    [workGroups]
  );
  const activeTenantUsers = useMemo(
    () => tenantUsers.filter((user) => user.is_active),
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
  const historyAssignmentTaskType = useMemo(
    () => (historyForm.task_type_id ? taskTypeById.get(historyForm.task_type_id) ?? null : null),
    [historyForm.task_type_id, taskTypeById]
  );
  const historyAllowedProfileNames = useMemo(
    () => getTaskTypeAllowedProfileNames(historyAssignmentTaskType),
    [historyAssignmentTaskType]
  );
  const historySelectableTenantUsers = useMemo(() => {
    if (!historyForm.assigned_work_group_id) {
      return activeTenantUsers;
    }
    const memberships = workGroupMembers.filter(
      (member) =>
        member.group_id === historyForm.assigned_work_group_id && isMembershipActive(member)
    );
    const allowedIds = new Set(
      memberships
        .filter(
          (member) =>
            !historyForm.task_type_id ||
            isTaskTypeMembershipCompatible(historyAssignmentTaskType, member.function_profile_name)
        )
        .map((member) => member.tenant_user_id)
    );
    return activeTenantUsers.filter((user) => allowedIds.has(user.id));
  }, [
    activeTenantUsers,
    historyAssignmentTaskType,
    historyAllowedProfileNames,
    historyForm.assigned_work_group_id,
    historyForm.task_type_id,
    workGroupMembers,
  ]);
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
      const [historyResponse, clientsResponse, contactsResponse, organizationsResponse, sitesResponse, installationsResponse, workGroupsResponse, taskTypesResponse, schedulesResponse, tenantUsersResponse] =
        await Promise.all([
          getTenantMaintenanceHistory(session.accessToken),
          canReadBusinessCore
            ? getTenantBusinessClients(session.accessToken, { includeInactive: true })
            : Promise.resolve({ data: [] as TenantBusinessClient[] }),
          canReadBusinessCore
            ? getTenantBusinessContacts(session.accessToken, { includeInactive: true })
            : Promise.resolve({ data: [] as TenantBusinessContact[] }),
          canReadBusinessCore
            ? getTenantBusinessOrganizations(session.accessToken, { includeInactive: true })
            : Promise.resolve({ data: [] as TenantBusinessOrganization[] }),
          canReadBusinessCore
            ? getTenantBusinessSites(session.accessToken, { includeInactive: true })
            : Promise.resolve({ data: [] as TenantBusinessSite[] }),
          getTenantMaintenanceInstallations(session.accessToken, { includeInactive: true }),
          canReadBusinessCore
            ? getTenantBusinessWorkGroups(session.accessToken, { includeInactive: true })
            : Promise.resolve({ data: [] as TenantBusinessWorkGroup[] }),
          canReadBusinessCore
            ? getTenantBusinessTaskTypes(session.accessToken, { includeInactive: true })
            : Promise.resolve({ data: [] as TenantBusinessTaskType[] }),
          getTenantMaintenanceSchedules(session.accessToken, { includeInactive: true }),
          canReadUsers
            ? getTenantUsers(session.accessToken)
            : Promise.resolve({ data: [] as TenantUsersItem[] }),
        ]);
      const workGroupMembersResponses = await Promise.all(
        workGroupsResponse.data.map((group) =>
          getTenantBusinessWorkGroupMembers(session.accessToken as string, group.id)
        )
      );
      setRows(historyResponse.data);
      setClients(clientsResponse.data);
      setContacts(contactsResponse.data);
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
      task_type_id:
        item.task_type_id ??
        (item.schedule_id ? scheduleById.get(item.schedule_id)?.task_type_id ?? null : null),
      assigned_work_group_id: item.assigned_work_group_id ?? null,
      assigned_tenant_user_id: item.assigned_tenant_user_id ?? null,
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

  function openFinanceTransaction(
    item: TenantMaintenanceHistoryWorkOrder,
    kind: "income" | "expense"
  ) {
    const target = buildFinanceTransactionLink(item, kind);
    if (!target) {
      return;
    }
    navigate(target);
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
      task_type_id: historyForm.task_type_id,
      assigned_work_group_id: historyForm.assigned_work_group_id,
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
      assigned_tenant_user_id: historyForm.assigned_tenant_user_id,
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

  function getPrimaryContact(clientId: number): TenantBusinessContact | null {
    const client = clientById.get(clientId);
    if (!client) {
      return null;
    }
    const organizationContacts = contactsByOrganizationId.get(client.organization_id) ?? [];
    return (
      organizationContacts.find((contact) => contact.is_primary && contact.is_active) ??
      organizationContacts.find((contact) => contact.is_active) ??
      organizationContacts.find((contact) => contact.is_primary) ??
      organizationContacts[0] ??
      null
    );
  }

  function getPrimaryContactLabel(clientId: number): string {
    return (
      stripLegacyVisibleText(getPrimaryContact(clientId)?.full_name) ||
      t("Sin contacto principal", "No primary contact")
    );
  }

  function getPrimaryContactDetail(clientId: number): string | null {
    const contact = getPrimaryContact(clientId);
    if (!contact) {
      return null;
    }
    const parts = [
      stripLegacyVisibleText(contact.role_title),
      stripLegacyVisibleText(contact.phone),
      stripLegacyVisibleText(contact.email),
    ].filter((value): value is string => Boolean(value));
    return parts.length ? parts.join(" · ") : null;
  }

  function getPrimaryContactSummary(clientId: number): string {
    const detail = getPrimaryContactDetail(clientId);
    return detail ? `${getPrimaryContactLabel(clientId)} · ${detail}` : getPrimaryContactLabel(clientId);
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

  function getTaskTypeLabel(
    item: Pick<TenantMaintenanceHistoryWorkOrder, "task_type_id" | "schedule_id">
  ): string {
    const taskTypeId =
      item.task_type_id ??
      (item.schedule_id ? scheduleById.get(item.schedule_id)?.task_type_id ?? null : null);
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
          <div className="maintenance-cell__meta">
            {t("Contacto principal", "Primary contact")}: {getPrimaryContactSummary(item.client_id)}
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
                  <AppBadge tone={getFinanceStatusTone(item)}>
                    {getFinanceStatusLabel(item, language)}
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
                    {t("Ver costos (hist.)", "View costing (history)")}
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
                    {t("Contacto principal", "Primary contact")}: {getPrimaryContactSummary(item.client_id)}
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
                  <div className="maintenance-cell__meta">
                    {t("Estado finanzas", "Finance status")}: {getFinanceStatusLabel(item, language)}
                  </div>
                  {getFinanceSummary(item).is_synced_to_finance ? (
                    <div className="maintenance-cell__meta">
                      {t("Sync finanzas", "Finance sync")}:{" "}
                      {formatDateTime(
                        getFinanceSummary(item).finance_synced_at,
                        language,
                        effectiveTimeZone
                      )}
                    </div>
                  ) : null}
                  {getFinanceSummary(item).income_transaction_id != null ? (
                    <div className="maintenance-cell__meta">
                      {t("Ingreso", "Income")}:{" "}
                      {getFinanceTransactionHealthLabel("income", item, language)}
                      {getFinanceDimensionGapLabel("income", item, language)
                        ? ` · ${getFinanceDimensionGapLabel("income", item, language)}`
                        : ""}
                    </div>
                  ) : null}
                  {getFinanceSummary(item).expense_transaction_id != null ? (
                    <div className="maintenance-cell__meta">
                      {t("Egreso", "Expense")}:{" "}
                      {getFinanceTransactionHealthLabel("expense", item, language)}
                      {getFinanceDimensionGapLabel("expense", item, language)
                        ? ` · ${getFinanceDimensionGapLabel("expense", item, language)}`
                        : ""}
                    </div>
                  ) : null}
                  {getFinanceSummary(item).income_transaction_id != null ||
                  getFinanceSummary(item).expense_transaction_id != null ? (
                    <div className="d-flex flex-wrap gap-2 mt-3">
                      {getFinanceSummary(item).income_transaction_id != null ? (
                        <button
                          className="btn btn-sm btn-outline-success"
                          type="button"
                          onClick={() => openFinanceTransaction(item, "income")}
                        >
                          {t("Abrir ingreso en Finanzas", "Open income in Finance")}
                        </button>
                      ) : null}
                      {getFinanceSummary(item).expense_transaction_id != null ? (
                        <button
                          className="btn btn-sm btn-outline-warning"
                          type="button"
                          onClick={() => openFinanceTransaction(item, "expense")}
                        >
                          {t("Abrir egreso en Finanzas", "Open expense in Finance")}
                        </button>
                      ) : null}
                    </div>
                  ) : null}
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
        <div className="alert alert-info mb-3">
          {t(
            "En Historial, Ver costos es solo consulta del cierre económico ya guardado. Si necesitas corregir datos o reintentar el puente con Finanzas, usa Editar cierre o el flujo operativo de la OT.",
            "In History, View costing is read-only and only shows the registered financial close. If you need to correct data or retry the Finance bridge, use Edit closure or the work-order operational flow."
          )}
        </div>
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
                  <div className="col-12 col-md-4">
                    <label className="form-label">{t("Tipo de tarea", "Task type")}</label>
                    <select
                      className="form-select"
                      value={historyForm.task_type_id ?? ""}
                      onChange={(event) =>
                        setHistoryForm((current) => ({
                          ...current,
                          task_type_id: event.target.value ? Number(event.target.value) : null,
                        }))
                      }
                    >
                      <option value="">{t("Sin tipo", "No task type")}</option>
                      {activeTaskTypes.map((item) => (
                        <option key={item.id} value={String(item.id)}>
                          {stripLegacyVisibleText(item.name) || `#${item.id}`}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-12 col-md-4">
                    <label className="form-label">{t("Grupo responsable", "Work group")}</label>
                    <select
                      className="form-select"
                      value={historyForm.assigned_work_group_id ?? ""}
                      onChange={(event) =>
                        setHistoryForm((current) => ({
                          ...current,
                          assigned_work_group_id: event.target.value ? Number(event.target.value) : null,
                          assigned_tenant_user_id: null,
                        }))
                      }
                    >
                      <option value="">{t("Sin grupo", "No group")}</option>
                      {activeWorkGroups.map((group) => (
                        <option key={group.id} value={String(group.id)}>
                          {stripLegacyVisibleText(group.name) || `#${group.id}`}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-12 col-md-4">
                    <label className="form-label">{t("Responsable", "Responsible")}</label>
                    <select
                      className="form-select"
                      value={historyForm.assigned_tenant_user_id ?? ""}
                      onChange={(event) =>
                        setHistoryForm((current) => ({
                          ...current,
                          assigned_tenant_user_id: event.target.value ? Number(event.target.value) : null,
                        }))
                      }
                    >
                      <option value="">{t("Sin responsable", "No responsible")}</option>
                      {historySelectableTenantUsers.map((user) => (
                        <option key={user.id} value={String(user.id)}>
                          {stripLegacyVisibleText(user.full_name) ||
                            stripLegacyVisibleText(user.email) ||
                            `#${user.id}`}
                        </option>
                      ))}
                    </select>
                    {historyForm.task_type_id && historyForm.assigned_work_group_id ? (
                      <div className="maintenance-history-entry__meta mt-2">
                        {historyAllowedProfileNames.length > 0
                          ? t(
                              `Perfiles compatibles: ${historyAllowedProfileNames.join(", ")}.`,
                              `Compatible profiles: ${historyAllowedProfileNames.join(", ")}.`
                            )
                          : t(
                              "Este tipo de tarea no restringe perfiles compatibles.",
                              "This task type does not restrict compatible profiles."
                            )}
                      </div>
                    ) : null}
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
        primaryContactLabel={
          detailWorkOrder ? getPrimaryContactLabel(detailWorkOrder.client_id) : undefined
        }
        primaryContactDetail={
          detailWorkOrder ? getPrimaryContactDetail(detailWorkOrder.client_id) : null
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
