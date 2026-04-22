import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
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
import {
  formatDateTimeInTimeZone,
  fromDateTimeLocalInputValue,
  toDateTimeLocalInputValue,
} from "../../../../../utils/dateTimeLocal";
import type { ApiError, TenantUsersItem } from "../../../../../types";
import { MaintenanceHelpBubble } from "../components/common/MaintenanceHelpBubble";
import { MaintenanceModuleNav } from "../components/common/MaintenanceModuleNav";
import {
  createTenantMaintenanceCostTemplate,
  getTenantMaintenanceCostTemplates,
  type TenantMaintenanceCostTemplate,
  updateTenantMaintenanceCostTemplate,
  updateTenantMaintenanceCostTemplateStatus,
} from "../services/costTemplatesService";
import {
  createTenantMaintenanceSchedule,
  getTenantMaintenanceScheduleSuggestion,
  getTenantMaintenanceSchedules,
  type TenantMaintenanceScheduleEstimateLineWriteItem,
  type TenantMaintenanceSchedule,
  type TenantMaintenanceScheduleSuggestion,
  type TenantMaintenanceScheduleWriteRequest,
} from "../services/schedulesService";
import {
  getTenantMaintenanceDueItems,
  postponeTenantMaintenanceDueItem,
  updateTenantMaintenanceDueItemContact,
  scheduleTenantMaintenanceDueItem,
  type TenantMaintenanceDueItem,
} from "../services/dueItemsService";
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
  getTenantBusinessSites,
  type TenantBusinessSite,
} from "../../business_core/services/sitesService";
import {
  getTenantBusinessTaskTypes,
  type TenantBusinessTaskType,
} from "../../business_core/services/taskTypesService";
import {
  getTenantBusinessWorkGroupMembers,
  getTenantBusinessWorkGroups,
  type TenantBusinessWorkGroupMember,
  type TenantBusinessWorkGroup,
} from "../../business_core/services/workGroupsService";
import {
  getTaskTypeAllowedProfileNames,
  isTaskTypeMembershipCompatible,
} from "../services/assignmentCapability";
import { stripLegacyVisibleText } from "../../../../../utils/legacyVisibleText";
import { getVisibleAddressLabel } from "../../business_core/utils/addressPresentation";

function buildDefaultScheduleForm(): TenantMaintenanceScheduleWriteRequest {
  return {
    client_id: 0,
    site_id: null,
    installation_id: null,
    task_type_id: null,
    cost_template_id: null,
    name: "",
    description: null,
    frequency_value: 6,
    frequency_unit: "months",
    lead_days: 30,
    start_mode: "from_manual_due_date",
    base_date: null,
    last_executed_at: null,
    next_due_at: "",
    default_priority: "normal",
    estimated_duration_minutes: 60,
    billing_mode: "per_work_order",
    estimate_target_margin_percent: 0,
    estimate_notes: null,
    is_active: true,
    auto_create_due_items: true,
    notes: null,
    estimate_lines: [],
  };
}

type ScheduleEstimateLineKey = "line_type" | "description" | "quantity" | "unit_cost" | "notes";

function buildBlankScheduleEstimateLine(): TenantMaintenanceScheduleEstimateLineWriteItem {
  return {
    line_type: "material",
    description: null,
    quantity: 1,
    unit_cost: 0,
    notes: null,
  };
}

function sumScheduleEstimateLines(lines: TenantMaintenanceScheduleEstimateLineWriteItem[]): number {
  return lines.reduce(
    (total, line) => total + Number(line.quantity || 0) * Number(line.unit_cost || 0),
    0,
  );
}

function sortCostTemplates(items: TenantMaintenanceCostTemplate[]): TenantMaintenanceCostTemplate[] {
  return [...items].sort((left, right) => {
    if (left.is_active !== right.is_active) {
      return left.is_active ? -1 : 1;
    }
    const nameCompare = left.name.localeCompare(right.name);
    if (nameCompare !== 0) {
      return nameCompare;
    }
    return left.id - right.id;
  });
}

function normalizeSearchLabel(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

type DueScheduleForm = {
  scheduled_for: string;
  site_id: number | null;
  installation_id: number | null;
  title: string;
  description: string;
  priority: string;
  assigned_work_group_id: number | null;
  assigned_tenant_user_id: number | null;
};

type DueContactForm = {
  contact_status: string;
  contact_note: string;
};

type DuePostponeForm = {
  postponed_until: string;
  resolution_note: string;
};

type CostTemplateDraftForm = {
  name: string;
  description: string;
};

function buildDefaultDueScheduleForm(): DueScheduleForm {
  return {
    scheduled_for: "",
    site_id: null,
    installation_id: null,
    title: "",
    description: "",
    priority: "normal",
    assigned_work_group_id: null,
    assigned_tenant_user_id: null,
  };
}

function buildDefaultDueContactForm(): DueContactForm {
  return {
    contact_status: "contacted",
    contact_note: "",
  };
}

function buildDefaultDuePostponeForm(): DuePostponeForm {
  return {
    postponed_until: "",
    resolution_note: "",
  };
}

function buildDefaultCostTemplateDraft(): CostTemplateDraftForm {
  return {
    name: "",
    description: "",
  };
}

function formatDateTime(value: string | null, language: "es" | "en", timeZone?: string | null): string {
  if (!value) {
    return language === "es" ? "sin fecha" : "no date";
  }
  return formatDateTimeInTimeZone(value, language, timeZone);
}

function getDueTone(status: string): "success" | "warning" | "danger" | "info" | "neutral" {
  switch (status) {
    case "due":
      return "danger";
    case "upcoming":
      return "warning";
    case "contacted":
      return "info";
    case "postponed":
      return "neutral";
    default:
      return "neutral";
  }
}

function getDueLabel(status: string, language: "es" | "en"): string {
  switch (status) {
    case "due":
      return language === "es" ? "Vencida" : "Due";
    case "upcoming":
      return language === "es" ? "Por vencer" : "Upcoming";
    case "contacted":
      return language === "es" ? "Contactada" : "Contacted";
    case "postponed":
      return language === "es" ? "Pospuesta" : "Postponed";
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

export function MaintenanceDueItemsPage() {
  const { session, effectiveTimeZone } = useTenantAuth();
  const { language } = useLanguage();
  const accessToken = session?.accessToken ?? null;
  const [rows, setRows] = useState<TenantMaintenanceDueItem[]>([]);
  const [schedules, setSchedules] = useState<TenantMaintenanceSchedule[]>([]);
  const [clients, setClients] = useState<TenantBusinessClient[]>([]);
  const [organizations, setOrganizations] = useState<TenantBusinessOrganization[]>([]);
  const [sites, setSites] = useState<TenantBusinessSite[]>([]);
  const [installations, setInstallations] = useState<TenantMaintenanceInstallation[]>([]);
  const [costTemplates, setCostTemplates] = useState<TenantMaintenanceCostTemplate[]>([]);
  const [taskTypes, setTaskTypes] = useState<TenantBusinessTaskType[]>([]);
  const [workGroups, setWorkGroups] = useState<TenantBusinessWorkGroup[]>([]);
  const [workGroupMembers, setWorkGroupMembers] = useState<TenantBusinessWorkGroupMember[]>([]);
  const [tenantUsers, setTenantUsers] = useState<TenantUsersItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBulkPlanCreating, setIsBulkPlanCreating] = useState(false);
  const [isSuggestionLoading, setIsSuggestionLoading] = useState(false);
  const [isTemplateSaving, setIsTemplateSaving] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isPostponeModalOpen, setIsPostponeModalOpen] = useState(false);
  const [selectedDueItem, setSelectedDueItem] = useState<TenantMaintenanceDueItem | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [costTemplateFeedback, setCostTemplateFeedback] = useState<string | null>(null);
  const [scheduleSuggestion, setScheduleSuggestion] = useState<TenantMaintenanceScheduleSuggestion | null>(null);
  const [scheduleForm, setScheduleForm] = useState<TenantMaintenanceScheduleWriteRequest>(buildDefaultScheduleForm());
  const [selectedCostTemplateId, setSelectedCostTemplateId] = useState<number | null>(null);
  const [editingCostTemplateId, setEditingCostTemplateId] = useState<number | null>(null);
  const [isCostTemplateDraftOpen, setIsCostTemplateDraftOpen] = useState(false);
  const [costTemplateDraft, setCostTemplateDraft] = useState<CostTemplateDraftForm>(buildDefaultCostTemplateDraft());
  const [dueScheduleForm, setDueScheduleForm] = useState<DueScheduleForm>(buildDefaultDueScheduleForm());
  const [dueContactForm, setDueContactForm] = useState<DueContactForm>(buildDefaultDueContactForm());
  const [duePostponeForm, setDuePostponeForm] = useState<DuePostponeForm>(buildDefaultDuePostponeForm());
  const nextDueWasManuallyEditedRef = useRef(false);
  const frequencyWasManuallyEditedRef = useRef(false);

  const clientById = useMemo(() => new Map(clients.map((item) => [item.id, item])), [clients]);
  const organizationById = useMemo(
    () => new Map(organizations.map((item) => [item.id, item])),
    [organizations]
  );
  const siteById = useMemo(() => new Map(sites.map((item) => [item.id, item])), [sites]);
  const installationById = useMemo(
    () => new Map(installations.map((item) => [item.id, item])),
    [installations]
  );
  const taskTypeById = useMemo(() => new Map(taskTypes.map((item) => [item.id, item])), [taskTypes]);
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

  const filteredSitesForSchedule = useMemo(
    () =>
      scheduleForm.client_id > 0
        ? sites.filter((site) => site.client_id === Number(scheduleForm.client_id))
        : sites,
    [scheduleForm.client_id, sites]
  );
  const activeTenantUsers = useMemo(
    () => tenantUsers.filter((user) => user.is_active),
    [tenantUsers]
  );
  const defaultMaintenanceTaskTypeId = useMemo(() => {
    const preferred = taskTypes.find((item) => {
      const normalized = normalizeSearchLabel(item.name);
      return normalized.includes("mantencion") || normalized.includes("maintenance");
    });
    return preferred?.id ?? null;
  }, [taskTypes]);
  const dueScheduleRequiresFunctionalProfile = Boolean(selectedDueItem?.task_type_id);
  const dueScheduleTaskTypeLabel = useMemo(() => {
    if (!selectedDueItem?.task_type_id) {
      return null;
    }
    return taskTypeById.get(selectedDueItem.task_type_id)?.name || `#${selectedDueItem.task_type_id}`;
  }, [selectedDueItem?.task_type_id, taskTypeById]);
  const dueScheduleTaskType = useMemo(
    () => (selectedDueItem?.task_type_id ? taskTypeById.get(selectedDueItem.task_type_id) ?? null : null),
    [selectedDueItem?.task_type_id, taskTypeById]
  );
  const dueScheduleAllowedProfileNames = useMemo(
    () => getTaskTypeAllowedProfileNames(dueScheduleTaskType),
    [dueScheduleTaskType]
  );
  const selectableDueScheduleTechnicians = useMemo(() => {
    if (!dueScheduleForm.assigned_work_group_id) {
      return activeTenantUsers;
    }
    const memberships = workGroupMembers.filter(
      (member) =>
        member.group_id === dueScheduleForm.assigned_work_group_id && isMembershipActive(member)
    );
    const allowedIds = new Set(
      memberships
        .filter(
          (member) =>
            !dueScheduleRequiresFunctionalProfile ||
            isTaskTypeMembershipCompatible(dueScheduleTaskType, member.function_profile_name)
        )
        .map((member) => member.tenant_user_id)
    );
    return activeTenantUsers.filter((user) => allowedIds.has(user.id));
  }, [
    activeTenantUsers,
    dueScheduleForm.assigned_work_group_id,
    dueScheduleTaskType,
    dueScheduleAllowedProfileNames,
    dueScheduleRequiresFunctionalProfile,
    workGroupMembers,
  ]);
  const filteredInstallationsForSchedule = useMemo(
    () =>
      scheduleForm.site_id
        ? installations.filter((item) => item.site_id === Number(scheduleForm.site_id))
        : [],
    [scheduleForm.site_id, installations]
  );
  const filteredInstallationsForDue = useMemo(
    () =>
      dueScheduleForm.site_id
        ? installations.filter((item) => item.site_id === Number(dueScheduleForm.site_id))
        : [],
    [dueScheduleForm.site_id, installations]
  );
  const noClientsAvailable = clients.length === 0;
  const selectedScheduleSites = scheduleForm.client_id > 0 ? filteredSitesForSchedule : [];
  const selectedScheduleInstallations = scheduleForm.site_id ? filteredInstallationsForSchedule : [];
  const missingSiteForScheduleClient =
    scheduleForm.client_id > 0 && selectedScheduleSites.length === 0;
  const missingInstallationForScheduleSite =
    !!scheduleForm.site_id && selectedScheduleInstallations.length === 0;
  const scheduleSubmitBlocked =
    noClientsAvailable ||
    Number(scheduleForm.client_id) <= 0 ||
    !scheduleForm.name.trim() ||
    !scheduleForm.next_due_at ||
    missingSiteForScheduleClient;
  const scheduleEstimateTotalPreview = useMemo(
    () => sumScheduleEstimateLines(scheduleForm.estimate_lines),
    [scheduleForm.estimate_lines]
  );
  const filteredCostTemplates = useMemo(
    () =>
      costTemplates.filter((item) => {
        if (!item.is_active) {
          return false;
        }
        if (!scheduleForm.task_type_id) {
          return true;
        }
        return item.task_type_id === null || item.task_type_id === scheduleForm.task_type_id;
      }),
    [costTemplates, scheduleForm.task_type_id]
  );
  const visibleCostTemplates = useMemo(
    () =>
      sortCostTemplates(
        costTemplates.filter((item) => {
          if (!scheduleForm.task_type_id) {
            return true;
          }
          return item.task_type_id === null || item.task_type_id === scheduleForm.task_type_id;
        })
      ),
    [costTemplates, scheduleForm.task_type_id]
  );
  const selectedCostTemplate = useMemo(
    () => filteredCostTemplates.find((item) => item.id === selectedCostTemplateId) ?? null,
    [filteredCostTemplates, selectedCostTemplateId]
  );

  useEffect(() => {
    if (!selectedCostTemplateId) {
      return;
    }
    const exists = filteredCostTemplates.some((item) => item.id === selectedCostTemplateId);
    if (!exists) {
      setSelectedCostTemplateId(null);
    }
  }, [filteredCostTemplates, selectedCostTemplateId]);

  useEffect(() => {
    if (!isPlanModalOpen || !accessToken || Number(scheduleForm.client_id) <= 0) {
      setScheduleSuggestion(null);
      setIsSuggestionLoading(false);
      return;
    }

    let cancelled = false;
    const accessTokenForSuggestion = accessToken;
    const selectedClientId = Number(scheduleForm.client_id);
    const selectedSiteId = scheduleForm.site_id;
    const selectedInstallationId = scheduleForm.installation_id;

    async function loadSuggestion() {
      setIsSuggestionLoading(true);
      try {
        const response = await getTenantMaintenanceScheduleSuggestion(accessTokenForSuggestion, {
          clientId: selectedClientId,
          siteId: selectedSiteId,
          installationId: selectedInstallationId,
        });
        if (cancelled) {
          return;
        }
        setScheduleSuggestion(response.data);
        if (!nextDueWasManuallyEditedRef.current) {
          setScheduleForm((current) => {
            if (
              Number(current.client_id) !== selectedClientId ||
              current.site_id !== selectedSiteId ||
              current.installation_id !== selectedInstallationId
            ) {
              return current;
            }
            return {
              ...current,
              last_executed_at: response.data.last_executed_at,
              frequency_value:
                !frequencyWasManuallyEditedRef.current && response.data.suggested_frequency_value
                  ? response.data.suggested_frequency_value
                  : current.frequency_value,
              frequency_unit:
                !frequencyWasManuallyEditedRef.current && response.data.suggested_frequency_unit
                  ? response.data.suggested_frequency_unit
                  : current.frequency_unit,
              next_due_at: response.data.suggested_next_due_at
                ? toDateTimeLocalInputValue(response.data.suggested_next_due_at, effectiveTimeZone)
                : current.next_due_at,
            };
          });
        }
      } catch {
        if (!cancelled) {
          setScheduleSuggestion(null);
        }
      } finally {
        if (!cancelled) {
          setIsSuggestionLoading(false);
        }
      }
    }

    void loadSuggestion();
    return () => {
      cancelled = true;
    };
  }, [
    effectiveTimeZone,
    isPlanModalOpen,
    scheduleForm.client_id,
    scheduleForm.installation_id,
    scheduleForm.site_id,
    accessToken,
  ]);

  const metrics = useMemo(() => {
    return rows.reduce(
      (accumulator, row) => {
        accumulator.total += 1;
        if (row.due_status === "due") {
          accumulator.due += 1;
        } else if (row.due_status === "upcoming") {
          accumulator.upcoming += 1;
        } else if (row.due_status === "contacted") {
          accumulator.contacted += 1;
        }
        return accumulator;
      },
      { total: 0, due: 0, upcoming: 0, contacted: 0 }
    );
  }, [rows]);

  const uncoveredInstallations = useMemo(() => {
    const activeSchedules = schedules.filter((item) => item.is_active);
    return installations
      .filter((installation) => installation.is_active)
      .map((installation) => {
        const site = siteById.get(installation.site_id);
        const client = site ? clientById.get(site.client_id) : null;
        if (!site || !client || !client.is_active) {
          return null;
        }
        const covered = activeSchedules.some((schedule) => {
          if (schedule.client_id !== client.id) {
            return false;
          }
          if (schedule.installation_id === installation.id) {
            return true;
          }
          if (!schedule.installation_id && schedule.site_id === site.id) {
            return true;
          }
          return !schedule.installation_id && !schedule.site_id;
        });
        if (covered) {
          return null;
        }
        return {
          installation,
          site,
          client,
        };
      })
      .filter((item): item is { installation: TenantMaintenanceInstallation; site: TenantBusinessSite; client: TenantBusinessClient } => Boolean(item))
      .sort((left, right) => {
        const leftOrganization = getOrganizationName(left.client.id);
        const rightOrganization = getOrganizationName(right.client.id);
        return (
          leftOrganization.localeCompare(rightOrganization) ||
          getSiteLabel(left.site.id).localeCompare(getSiteLabel(right.site.id)) ||
          left.installation.name.localeCompare(right.installation.name)
        );
      });
  }, [clientById, getOrganizationName, getSiteLabel, installationById, installations, schedules, siteById]);

  const organizationGroups = useMemo(() => {
    const groups = new Map<
      number,
      {
        organizationId: number;
        organizationName: string;
        items: TenantMaintenanceDueItem[];
        overdueCount: number;
        upcomingCount: number;
        contactedCount: number;
      }
    >();

    rows.forEach((row) => {
      const client = clientById.get(row.client_id);
      const organizationId = client?.organization_id ?? -1;
      const organizationName = getOrganizationName(row.client_id);
      const current = groups.get(organizationId) ?? {
        organizationId,
        organizationName,
        items: [],
        overdueCount: 0,
        upcomingCount: 0,
        contactedCount: 0,
      };
      current.items.push(row);
      if (row.due_status === "due") {
        current.overdueCount += 1;
      }
      if (row.due_status === "upcoming") {
        current.upcomingCount += 1;
      }
      if (row.due_status === "contacted") {
        current.contactedCount += 1;
      }
      groups.set(organizationId, current);
    });

    return Array.from(groups.values()).sort((left, right) => {
      if (right.overdueCount !== left.overdueCount) {
        return right.overdueCount - left.overdueCount;
      }
      if (right.items.length !== left.items.length) {
        return right.items.length - left.items.length;
      }
      return left.organizationName.localeCompare(right.organizationName);
    });
  }, [clientById, rows]);

  async function loadData() {
    if (!session?.accessToken) {
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const [
        dueItemsResponse,
        schedulesResponse,
        costTemplatesResponse,
        clientsResponse,
        organizationsResponse,
        sitesResponse,
        installationsResponse,
        taskTypesResponse,
        workGroupsResponse,
        tenantUsersResponse,
      ] = await Promise.all([
        getTenantMaintenanceDueItems(session.accessToken),
        getTenantMaintenanceSchedules(session.accessToken, { includeInactive: false }),
        getTenantMaintenanceCostTemplates(session.accessToken, { includeInactive: true }),
        getTenantBusinessClients(session.accessToken, { includeInactive: false }),
        getTenantBusinessOrganizations(session.accessToken, { includeInactive: false }),
        getTenantBusinessSites(session.accessToken, { includeInactive: false }),
        getTenantMaintenanceInstallations(session.accessToken, { includeInactive: false }),
        getTenantBusinessTaskTypes(session.accessToken, { includeInactive: false }),
        getTenantBusinessWorkGroups(session.accessToken, { includeInactive: false }),
        getTenantUsers(session.accessToken),
      ]);
      const workGroupMembersResponses = await Promise.all(
        workGroupsResponse.data.map((group) =>
          getTenantBusinessWorkGroupMembers(session.accessToken as string, group.id)
        )
      );
      setRows(dueItemsResponse.data);
      setSchedules(schedulesResponse.data);
      setCostTemplates(sortCostTemplates(costTemplatesResponse.data));
      setClients(clientsResponse.data);
      setOrganizations(organizationsResponse.data);
      setSites(sitesResponse.data);
      setInstallations(installationsResponse.data);
      setTaskTypes(taskTypesResponse.data);
      setWorkGroups(workGroupsResponse.data);
      setWorkGroupMembers(workGroupMembersResponses.flatMap((response) => response.data));
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

  function getOrganizationName(clientId: number): string {
    const client = clientById.get(clientId);
    const organization = organizationById.get(client?.organization_id ?? -1);
    return (
      stripLegacyVisibleText(organization?.legal_name) ||
      stripLegacyVisibleText(organization?.name) ||
      (language === "es" ? "Organización sin nombre" : "Unnamed organization")
    );
  }

  function getClientName(clientId: number): string {
    const client = clientById.get(clientId);
    const organization = organizationById.get(client?.organization_id ?? -1);
    return (
      stripLegacyVisibleText(organization?.name) ||
      stripLegacyVisibleText(organization?.legal_name) ||
      (language === "es" ? "Cliente sin nombre" : "Unnamed client")
    );
  }

  function getClientOptionLabel(client: TenantBusinessClient): string {
    const primarySite = sites.find((site) => site.client_id === client.id);
    const clientName = getClientName(client.id);
    return primarySite ? `${clientName} · ${getSiteLabel(primarySite.id)}` : clientName;
  }

  function getSiteLabel(siteId: number | null): string {
    if (!siteId) {
      return language === "es" ? "Dirección pendiente" : "Missing address";
    }
    const site = siteById.get(siteId);
    if (!site) {
      return language === "es" ? "Dirección pendiente" : "Missing address";
    }
    return stripLegacyVisibleText(getVisibleAddressLabel(site)) || stripLegacyVisibleText(site.name) || "—";
  }

  function getInstallationName(installationId: number | null): string {
    if (!installationId) {
      return language === "es" ? "Instalación pendiente" : "Installation pending";
    }
    return installationById.get(installationId)?.name || `#${installationId}`;
  }

  function getDueScheduleTechnicianLabel(userId: number): string {
    const fullName = activeTenantUsers.find((user) => user.id === userId)?.full_name || `#${userId}`;
    if (!dueScheduleForm.assigned_work_group_id) {
      return fullName;
    }
    const profileLabel = workGroupMemberByKey.get(
      `${dueScheduleForm.assigned_work_group_id}:${userId}`
    )?.function_profile_name;
    return profileLabel ? `${fullName} · ${profileLabel}` : fullName;
  }

  function renderDueActions(item: TenantMaintenanceDueItem) {
    return (
      <AppToolbar compact>
        <Link
          className="btn btn-sm btn-outline-secondary"
          to={`/tenant-portal/business-core/clients/${item.client_id}`}
        >
          {language === "es" ? "Ver cliente" : "Open client"}
        </Link>
        <button
          className="btn btn-sm btn-outline-secondary"
          type="button"
          onClick={() => openContactDueItem(item)}
        >
          {language === "es" ? "Contactar" : "Contact"}
        </button>
        <button
          className="btn btn-sm btn-outline-secondary"
          type="button"
          onClick={() => openPostponeDueItem(item)}
        >
          {language === "es" ? "Posponer" : "Postpone"}
        </button>
        <button className="btn btn-sm btn-primary" type="button" onClick={() => openScheduleDueItem(item)}>
          {language === "es" ? "Agendar" : "Schedule"}
        </button>
      </AppToolbar>
    );
  }

  function startCreatePlan() {
    setFeedback(null);
    setError(null);
    setCostTemplateFeedback(null);
    setScheduleSuggestion(null);
    setSelectedCostTemplateId(null);
    setIsCostTemplateDraftOpen(false);
    setCostTemplateDraft(buildDefaultCostTemplateDraft());
    nextDueWasManuallyEditedRef.current = false;
    frequencyWasManuallyEditedRef.current = false;
    const defaultClientId = clients[0]?.id || 0;
    const candidateSites = sites.filter((site) => site.client_id === defaultClientId);
    const defaultSiteId = candidateSites[0]?.id || null;
    const candidateInstallations = defaultSiteId
      ? installations.filter((item) => item.site_id === defaultSiteId)
      : [];
    setScheduleForm({
      ...buildDefaultScheduleForm(),
      client_id: defaultClientId,
      site_id: defaultSiteId,
      installation_id: candidateInstallations[0]?.id || null,
    });
    setIsPlanModalOpen(true);
  }

  function startCreatePlanFromInstallation(installation: TenantMaintenanceInstallation) {
    const site = siteById.get(installation.site_id);
    if (!site) {
      return;
    }
    setFeedback(null);
    setError(null);
    setCostTemplateFeedback(null);
    setScheduleSuggestion(null);
    setSelectedCostTemplateId(null);
    setIsCostTemplateDraftOpen(false);
    setCostTemplateDraft(buildDefaultCostTemplateDraft());
    nextDueWasManuallyEditedRef.current = false;
    frequencyWasManuallyEditedRef.current = false;
    setScheduleForm({
      ...buildDefaultScheduleForm(),
      client_id: site.client_id,
      site_id: site.id,
      installation_id: installation.id,
      name:
        language === "es"
          ? `Plan preventivo ${installation.name}`
          : `Preventive plan ${installation.name}`,
    });
    setIsPlanModalOpen(true);
  }

  function getScheduleSuggestionText(): string {
    if (isSuggestionLoading) {
      return language === "es"
        ? "Buscando historial técnico para sugerir la próxima mantención..."
        : "Checking technical history to suggest the next maintenance date...";
    }
    if (nextDueWasManuallyEditedRef.current) {
      return language === "es"
        ? "Fecha ajustada manualmente. Puedes volver a cambiar cliente, dirección o instalación para recalcular la sugerencia."
        : "Date adjusted manually. Change the client, address, or installation again to recalculate the suggestion.";
    }
    if (scheduleSuggestion?.source === "history_completed_this_year" && scheduleSuggestion.reference_completed_at) {
      return language === "es"
        ? `Sugerida desde historial cerrado el ${formatDateTime(
            scheduleSuggestion.reference_completed_at,
            language,
            effectiveTimeZone,
          )}. Se propone el mismo día y mes para el próximo año.`
        : `Suggested from closed history on ${formatDateTime(
            scheduleSuggestion.reference_completed_at,
            language,
            effectiveTimeZone,
          )}. The same month/day is proposed for next year.`;
    }
    if (scheduleSuggestion?.source === "installation_baseline" && scheduleSuggestion.reference_completed_at) {
      return language === "es"
        ? `No se encontró una mantención cerrada este año. Se usa la base de la instalación (${formatDateTime(
            scheduleSuggestion.reference_completed_at,
            language,
            effectiveTimeZone,
          )}) para sugerir la próxima fecha.`
        : `No closed maintenance was found for this year. The installation baseline (${formatDateTime(
            scheduleSuggestion.reference_completed_at,
            language,
            effectiveTimeZone,
          )}) is used to suggest the next date.`;
    }
    return language === "es"
      ? "Si existe una mantención cerrada este año en historial, se propondrá automáticamente el mismo día y mes para el año siguiente."
      : "If a closed maintenance exists this year in history, the same month/day will be suggested automatically for next year.";
  }

  function getScheduleFrequencySuggestionText(): string {
    if (isSuggestionLoading) {
      return language === "es"
        ? "La frecuencia sugerida se calculará junto con la próxima mantención."
        : "The suggested frequency will be calculated together with the next due date.";
    }
    if (frequencyWasManuallyEditedRef.current) {
      return language === "es"
        ? "Frecuencia ajustada manualmente."
        : "Frequency adjusted manually.";
    }
    if (scheduleSuggestion?.source === "history_completed_this_year") {
      return language === "es"
        ? "Se propone frecuencia anual porque ya existe una mantención cerrada este año en historial."
        : "Annual frequency is suggested because a closed maintenance already exists this year in history.";
    }
    if (scheduleSuggestion?.source === "installation_baseline") {
      return language === "es"
        ? "Se mantiene la frecuencia base del módulo mientras no exista un cierre útil este año."
        : "The module baseline frequency is kept while there is no useful closed maintenance this year.";
    }
    return language === "es"
      ? "Define la frecuencia real del plan si difiere de la sugerencia."
      : "Set the real plan frequency if it differs from the suggestion.";
  }

  function addScheduleEstimateLine() {
    setScheduleForm((current) => ({
      ...current,
      estimate_lines: [...current.estimate_lines, buildBlankScheduleEstimateLine()],
    }));
  }

  function applyCostTemplate(template: TenantMaintenanceCostTemplate) {
    setSelectedCostTemplateId(template.id);
    setScheduleForm((current) => ({
      ...current,
      cost_template_id: template.id,
      estimate_target_margin_percent: template.estimate_target_margin_percent,
      estimate_notes: template.estimate_notes,
      estimate_lines: template.lines.map((line) => ({
        line_type: line.line_type,
        description: line.description,
        quantity: line.quantity,
        unit_cost: line.unit_cost,
        notes: line.notes,
      })),
    }));
    setCostTemplateFeedback(
      language === "es"
        ? `Plantilla aplicada: ${template.name}`
        : `Template applied: ${template.name}`
    );
  }

  function applySelectedCostTemplate() {
    if (!selectedCostTemplate) {
      return;
    }
    applyCostTemplate(selectedCostTemplate);
  }

  function openSaveCostTemplateDraft() {
    const taskTypeName = taskTypeById.get(scheduleForm.task_type_id ?? -1)?.name ?? "";
    setCostTemplateFeedback(null);
    setEditingCostTemplateId(null);
    setCostTemplateDraft({
      name:
        scheduleForm.name.trim() ||
        taskTypeName ||
        (language === "es" ? "Plantilla de costeo" : "Costing template"),
      description: scheduleForm.description ?? "",
    });
    setIsCostTemplateDraftOpen(true);
  }

  function startEditCostTemplate(template: TenantMaintenanceCostTemplate) {
    setSelectedCostTemplateId(template.id);
    setEditingCostTemplateId(template.id);
    setCostTemplateFeedback(null);
    setScheduleForm((current) => ({
      ...current,
      task_type_id: template.task_type_id,
      cost_template_id: template.id,
      estimate_target_margin_percent: template.estimate_target_margin_percent,
      estimate_notes: template.estimate_notes,
      estimate_lines: template.lines.map((line) => ({
        line_type: line.line_type,
        description: line.description,
        quantity: line.quantity,
        unit_cost: line.unit_cost,
        notes: line.notes,
      })),
    }));
    setCostTemplateDraft({
      name: template.name,
      description: template.description ?? "",
    });
    setIsCostTemplateDraftOpen(true);
  }

  function closeCostTemplateDraft() {
    setEditingCostTemplateId(null);
    setIsCostTemplateDraftOpen(false);
    setCostTemplateDraft(buildDefaultCostTemplateDraft());
  }

  async function handleSaveCostTemplate() {
    if (!session?.accessToken) {
      return;
    }
    if (!costTemplateDraft.name.trim()) {
      setCostTemplateFeedback(
        language === "es"
          ? "Debes indicar un nombre para guardar la plantilla."
          : "Provide a name before saving the template."
      );
      return;
    }
    if (scheduleForm.estimate_lines.length === 0) {
      setCostTemplateFeedback(
        language === "es"
          ? "La plantilla necesita al menos una línea de costeo."
          : "The template needs at least one costing line."
      );
      return;
    }
    setIsTemplateSaving(true);
    setCostTemplateFeedback(null);
    try {
      const payload = {
        name: costTemplateDraft.name.trim(),
        description: costTemplateDraft.description.trim() || null,
        task_type_id: scheduleForm.task_type_id,
        estimate_target_margin_percent: scheduleForm.estimate_target_margin_percent,
        estimate_notes: scheduleForm.estimate_notes?.trim() || null,
        is_active: true,
        lines: scheduleForm.estimate_lines.map((line) => ({
          line_type: line.line_type,
          description: line.description?.trim() || null,
          quantity: Number(line.quantity || 0),
          unit_cost: Number(line.unit_cost || 0),
          notes: line.notes?.trim() || null,
        })),
      };
      const response = editingCostTemplateId
        ? await updateTenantMaintenanceCostTemplate(
            session.accessToken,
            editingCostTemplateId,
            payload
          )
        : await createTenantMaintenanceCostTemplate(session.accessToken, payload);
      setCostTemplates((current) =>
        sortCostTemplates(
          editingCostTemplateId
            ? current.map((item) => (item.id === response.data.id ? response.data : item))
            : [...current, response.data]
        )
      );
      setSelectedCostTemplateId(response.data.id);
      setScheduleForm((current) => ({
        ...current,
        cost_template_id: response.data.id,
      }));
      closeCostTemplateDraft();
      setCostTemplateFeedback(
        editingCostTemplateId
          ? language === "es"
            ? `Plantilla actualizada: ${response.data.name}`
            : `Template updated: ${response.data.name}`
          : language === "es"
            ? `Plantilla guardada: ${response.data.name}`
            : `Template saved: ${response.data.name}`
      );
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsTemplateSaving(false);
    }
  }

  async function handleCostTemplateStatusChange(
    template: TenantMaintenanceCostTemplate,
    isActive: boolean
  ) {
    if (!session?.accessToken) {
      return;
    }
    setIsTemplateSaving(true);
    setCostTemplateFeedback(null);
    try {
      const response = await updateTenantMaintenanceCostTemplateStatus(
        session.accessToken,
        template.id,
        isActive
      );
      setCostTemplates((current) =>
        sortCostTemplates(
          current.map((item) => (item.id === response.data.id ? response.data : item))
        )
      );
      if (!isActive && selectedCostTemplateId === template.id) {
        setSelectedCostTemplateId(null);
      }
      if (!isActive) {
        setScheduleForm((current) =>
          current.cost_template_id === template.id
            ? { ...current, cost_template_id: null }
            : current
        );
      }
      setCostTemplateFeedback(
        isActive
          ? language === "es"
            ? `Plantilla reactivada: ${template.name}`
            : `Template reactivated: ${template.name}`
          : language === "es"
            ? `Plantilla archivada: ${template.name}`
            : `Template archived: ${template.name}`
      );
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsTemplateSaving(false);
    }
  }

  function updateScheduleEstimateLine(
    index: number,
    key: ScheduleEstimateLineKey,
    value: string
  ) {
    setScheduleForm((current) => ({
      ...current,
      estimate_lines: current.estimate_lines.map((line, currentIndex) => {
        if (currentIndex !== index) {
          return line;
        }
        if (key === "quantity" || key === "unit_cost") {
          return { ...line, [key]: Number(value) };
        }
        return { ...line, [key]: value || null };
      }),
    }));
  }

  function removeScheduleEstimateLine(index: number) {
    setScheduleForm((current) => ({
      ...current,
      estimate_lines: current.estimate_lines.filter((_, currentIndex) => currentIndex !== index),
    }));
  }

  function openContactDueItem(item: TenantMaintenanceDueItem) {
    setSelectedDueItem(item);
    setDueContactForm({
      contact_status:
        item.contact_status && item.contact_status !== "not_contacted"
          ? item.contact_status
          : "contacted",
      contact_note: item.contact_note ?? "",
    });
    setFeedback(null);
    setIsContactModalOpen(true);
  }

  function openPostponeDueItem(item: TenantMaintenanceDueItem) {
    const fallbackDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    setSelectedDueItem(item);
    setDuePostponeForm({
      postponed_until: toDateTimeLocalInputValue(
        item.postponed_until || item.due_at || fallbackDate,
        effectiveTimeZone,
      ),
      resolution_note: item.resolution_note ?? "",
    });
    setFeedback(null);
    setIsPostponeModalOpen(true);
  }

  function openScheduleDueItem(item: TenantMaintenanceDueItem) {
    setSelectedDueItem(item);
    setDueScheduleForm({
      scheduled_for: item.due_at.slice(0, 16),
      site_id: item.site_id,
      installation_id: item.installation_id,
      title: item.schedule_name,
      description: item.schedule_description ?? "",
      priority: item.default_priority,
      assigned_work_group_id: item.assigned_work_group_id,
      assigned_tenant_user_id: item.assigned_tenant_user_id,
    });
    setFeedback(null);
    setIsScheduleModalOpen(true);
  }

  async function handleCreatePlan(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.accessToken) {
      return;
    }
    setIsSubmitting(true);
    setFeedback(null);
    try {
      await createTenantMaintenanceSchedule(session.accessToken, {
        ...scheduleForm,
        next_due_at: fromDateTimeLocalInputValue(scheduleForm.next_due_at, effectiveTimeZone),
        description: scheduleForm.description?.trim() || null,
        estimate_notes: scheduleForm.estimate_notes?.trim() || null,
        notes: scheduleForm.notes?.trim() || null,
        estimate_lines: scheduleForm.estimate_lines.map((line) => ({
          ...line,
          description: line.description?.trim() || null,
          notes: line.notes?.trim() || null,
        })),
      });
      setFeedback(language === "es" ? "Programación creada." : "Schedule created.");
      setIsPlanModalOpen(false);
      await loadData();
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function buildAutomaticSchedulePayload(
    installation: TenantMaintenanceInstallation,
    site: TenantBusinessSite,
    client: TenantBusinessClient,
  ): Promise<TenantMaintenanceScheduleWriteRequest | null> {
    let suggestedNextDueAt: string | null = null;
    let suggestedLastExecutedAt: string | null = null;

    if (session?.accessToken) {
      try {
        const suggestionResponse = await getTenantMaintenanceScheduleSuggestion(session.accessToken, {
          clientId: client.id,
          siteId: site.id,
          installationId: installation.id,
        });
        if (suggestionResponse.data.source === "history_completed_this_year" && suggestionResponse.data.suggested_next_due_at) {
          suggestedNextDueAt = suggestionResponse.data.suggested_next_due_at;
          suggestedLastExecutedAt = suggestionResponse.data.last_executed_at;
        } else {
          return null;
        }
      } catch {
        return null;
      }
    } else {
      return null;
    }

    return {
      ...buildDefaultScheduleForm(),
      client_id: client.id,
      site_id: site.id,
      installation_id: installation.id,
      task_type_id: defaultMaintenanceTaskTypeId,
      name:
        language === "es"
          ? `Plan preventivo ${installation.name}`
          : `Preventive plan ${installation.name}`,
      frequency_value: 1,
      frequency_unit: "years",
      next_due_at: suggestedNextDueAt,
      last_executed_at: suggestedLastExecutedAt,
      notes:
        language === "es"
          ? "Alta automática desde instalaciones activas sin plan preventivo."
          : "Automatic creation from active installations without preventive plan.",
    };
  }

  async function handleCreateAnnualPlansForUncoveredInstallations() {
    if (!session?.accessToken || uncoveredInstallations.length === 0) {
      return;
    }
    setIsBulkPlanCreating(true);
    setFeedback(null);
    setError(null);

    let createdCount = 0;
    let skippedCount = 0;
    const failedItems: string[] = [];

    for (const item of uncoveredInstallations) {
      try {
        const payload = await buildAutomaticSchedulePayload(item.installation, item.site, item.client);
        if (!payload) {
          skippedCount += 1;
          continue;
        }
        await createTenantMaintenanceSchedule(session.accessToken, payload);
        createdCount += 1;
      } catch (rawError) {
        const apiError = rawError as ApiError;
        const detail = getApiErrorDisplayMessage(apiError);
        if (detail.toLowerCase().includes("ya existe una programacion activa equivalente")) {
          skippedCount += 1;
          continue;
        }
        failedItems.push(
          `${stripLegacyVisibleText(item.installation.name) || `#${item.installation.id}`}: ${detail}`,
        );
      }
    }

    try {
      await loadData();
    } finally {
      setIsBulkPlanCreating(false);
    }

    if (failedItems.length > 0) {
      const message =
        language === "es"
          ? `Se crearon ${createdCount} planes y ${skippedCount} se omitieron. Fallaron ${failedItems.length}: ${failedItems.join(" | ")}`
          : `Created ${createdCount} plans and skipped ${skippedCount}. ${failedItems.length} failed: ${failedItems.join(" | ")}`;
      const error = new Error(message) as ApiError;
      error.payload = { detail: message };
      setError(error);
      return;
    }

    setFeedback(
      language === "es"
        ? `Se crearon ${createdCount} planes anuales${skippedCount > 0 ? ` y ${skippedCount} se omitieron por no tener mantención cerrada en ${new Date().getFullYear()}` : ""}.`
        : `Created ${createdCount} annual plans${skippedCount > 0 ? ` and skipped ${skippedCount} items without a completed maintenance in ${new Date().getFullYear()}` : ""}.`,
    );
  }

  async function handleScheduleDueItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.accessToken || !selectedDueItem) {
      return;
    }
    setIsSubmitting(true);
    setFeedback(null);
    try {
      await scheduleTenantMaintenanceDueItem(session.accessToken, selectedDueItem.id, {
        scheduled_for: dueScheduleForm.scheduled_for || null,
        site_id: dueScheduleForm.site_id,
        installation_id: dueScheduleForm.installation_id,
        title: dueScheduleForm.title.trim() || null,
        description: dueScheduleForm.description.trim() || null,
        priority: dueScheduleForm.priority || null,
        assigned_work_group_id: dueScheduleForm.assigned_work_group_id,
        assigned_tenant_user_id: dueScheduleForm.assigned_tenant_user_id,
      });
      setFeedback(language === "es" ? "Mantención agendada." : "Maintenance scheduled.");
      setIsScheduleModalOpen(false);
      setSelectedDueItem(null);
      await loadData();
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleContactDueItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.accessToken || !selectedDueItem) {
      return;
    }
    setIsSubmitting(true);
    setFeedback(null);
    try {
      await updateTenantMaintenanceDueItemContact(session.accessToken, selectedDueItem.id, {
        contact_status: dueContactForm.contact_status,
        contact_note: dueContactForm.contact_note.trim() || null,
      });
      setFeedback(language === "es" ? "Contacto actualizado." : "Contact updated.");
      setIsContactModalOpen(false);
      setSelectedDueItem(null);
      await loadData();
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handlePostponeDueItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.accessToken || !selectedDueItem || !duePostponeForm.postponed_until) {
      return;
    }
    setIsSubmitting(true);
    setFeedback(null);
    try {
      await postponeTenantMaintenanceDueItem(session.accessToken, selectedDueItem.id, {
        postponed_until: fromDateTimeLocalInputValue(
          duePostponeForm.postponed_until,
          effectiveTimeZone,
        ),
        resolution_note: duePostponeForm.resolution_note.trim() || null,
      });
      setFeedback(language === "es" ? "Pendiente pospuesto." : "Due item postponed.");
      setIsPostponeModalOpen(false);
      setSelectedDueItem(null);
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
        title={language === "es" ? "Pendientes" : "Due maintenance"}
        description={
          language === "es"
            ? "Bandeja automática de mantenciones por vencer o vencidas, agrupables por organización pero operadas por cliente y dirección."
            : "Automatic queue of upcoming or overdue maintenance, readable by organization but operated by client and address."
        }
        actions={
          <AppToolbar compact>
            <MaintenanceHelpBubble
              label={language === "es" ? "Ayuda" : "Help"}
              helpText={
                language === "es"
                  ? "Aquí solo deberían aparecer mantenciones que entraron en ventana. Al agendar, salen de la bandeja y pasan a la operación normal."
                  : "Only maintenance that entered its due window should appear here. Once scheduled, it leaves this tray and moves into normal operations."
              }
            />
            <button className="btn btn-outline-secondary" type="button" onClick={() => void loadData()}>
              {language === "es" ? "Recargar" : "Reload"}
            </button>
            <button className="btn btn-primary" type="button" onClick={startCreatePlan}>
              {language === "es" ? "Nueva programación" : "New schedule"}
            </button>
          </AppToolbar>
        }
      />
      <MaintenanceModuleNav />

      {error ? (
        <ErrorState
          title={language === "es" ? "No se pudo cargar Pendientes" : "Due maintenance could not be loaded"}
          detail={getApiErrorDisplayMessage(error)}
          requestId={error.payload?.request_id}
        />
      ) : null}

      {feedback ? <div className="alert alert-success mb-0">{feedback}</div> : null}

      {isLoading ? (
        <LoadingBlock label={language === "es" ? "Cargando pendientes..." : "Loading due maintenance..."} />
      ) : null}

      <div className="row g-3">
        <div className="col-12 col-md-6 col-xl-3">
          <MetricCard
            label={language === "es" ? "Pendientes visibles" : "Visible due"}
            value={metrics.total}
            hint={language === "es" ? "En bandeja operativa" : "In the operational tray"}
            icon="planning"
            tone="info"
          />
        </div>
        <div className="col-12 col-md-6 col-xl-3">
          <MetricCard
            label={language === "es" ? "Vencidas" : "Overdue"}
            value={metrics.due}
            hint={language === "es" ? "Ya pasaron su fecha" : "Past their due date"}
            icon="focus"
            tone="danger"
          />
        </div>
        <div className="col-12 col-md-6 col-xl-3">
          <MetricCard
            label={language === "es" ? "Por vencer" : "Upcoming"}
            value={metrics.upcoming}
            hint={language === "es" ? "Entraron en ventana" : "Already in their visible window"}
            icon="maintenance"
            tone="warning"
          />
        </div>
        <div className="col-12 col-md-6 col-xl-3">
          <MetricCard
            label={language === "es" ? "Contactadas" : "Contacted"}
            value={metrics.contacted}
            hint={language === "es" ? "Gestión ya iniciada" : "Coordination already started"}
            icon="catalogs"
            tone="success"
          />
        </div>
      </div>

      <DataTableCard
        title={language === "es" ? "Bandeja de mantenciones por gestionar" : "Maintenance due queue"}
        subtitle={
          language === "es"
            ? "Agrupa visualmente la carga, pero la acción operativa sigue siendo por cliente, dirección e instalación."
            : "The queue can be read in groups, but the operational action remains tied to client, address, and installation."
        }
        rows={rows}
        columns={[
          {
            key: "client",
            header: language === "es" ? "Cliente / organización" : "Client / organization",
            render: (item) => (
              <div>
                <div className="maintenance-cell__title">{getClientName(item.client_id)}</div>
                <div className="maintenance-cell__meta">{getOrganizationName(item.client_id)}</div>
              </div>
            ),
          },
          {
            key: "site",
            header: language === "es" ? "Dirección / instalación" : "Address / installation",
            render: (item) => (
              <div>
                <div className="maintenance-cell__title">{getSiteLabel(item.site_id)}</div>
                <div className="maintenance-cell__meta">{getInstallationName(item.installation_id)}</div>
              </div>
            ),
          },
          {
            key: "plan",
            header: language === "es" ? "Plan" : "Plan",
            render: (item) => (
              <div>
                <div className="maintenance-cell__title">{stripLegacyVisibleText(item.schedule_name) || "—"}</div>
                <div className="maintenance-cell__meta">
                  {taskTypes.find((taskType) => taskType.id === item.task_type_id)?.name ||
                    (language === "es" ? "Sin tipo específico" : "No task type")}
                </div>
              </div>
            ),
          },
          {
            key: "due",
            header: language === "es" ? "Ventana" : "Window",
            render: (item) => (
              <div>
                <div>{formatDateTime(item.due_at, language, effectiveTimeZone)}</div>
                <div className="maintenance-cell__meta">
                  {language === "es" ? "Visible desde" : "Visible from"}{" "}
                  {formatDateTime(item.visible_from, language, effectiveTimeZone)}
                </div>
              </div>
            ),
          },
          {
            key: "status",
            header: language === "es" ? "Estado" : "Status",
            render: (item) => <AppBadge tone={getDueTone(item.due_status)}>{getDueLabel(item.due_status, language)}</AppBadge>,
          },
          {
            key: "actions",
            header: language === "es" ? "Acciones" : "Actions",
            render: (item) => renderDueActions(item),
          },
        ]}
      />

      <PanelCard
        title={language === "es" ? "Agrupación por organización" : "Organization grouping"}
        subtitle={
          language === "es"
            ? "Lectura ejecutiva para coordinar carga por organización sin perder la operación por cliente, dirección e instalación."
            : "Executive reading to coordinate workload by organization without losing the operational unit of client, address, and installation."
        }
      >
        {organizationGroups.length === 0 ? (
          <div className="maintenance-cell__meta">
            {language === "es"
              ? "Aún no hay organizaciones con mantenciones visibles en esta bandeja."
              : "There are no organizations with visible maintenance in this tray yet."}
          </div>
        ) : (
          <div className="maintenance-due-groups">
            {organizationGroups.map((group) => (
              <section key={`${group.organizationId}-${group.organizationName}`} className="maintenance-due-group">
                <div className="maintenance-due-group__header">
                  <div>
                    <h3 className="maintenance-due-group__title">{group.organizationName}</h3>
                    <p className="maintenance-due-group__subtitle">
                      {language === "es"
                        ? `${group.items.length} mantenciones visibles para coordinar`
                        : `${group.items.length} visible maintenance items to coordinate`}
                    </p>
                  </div>
                  <div className="maintenance-due-group__badges">
                    {group.overdueCount > 0 ? (
                      <AppBadge tone="danger">
                        {language === "es"
                          ? `${group.overdueCount} vencida${group.overdueCount === 1 ? "" : "s"}`
                          : `${group.overdueCount} overdue`}
                      </AppBadge>
                    ) : null}
                    {group.upcomingCount > 0 ? (
                      <AppBadge tone="warning">
                        {language === "es"
                          ? `${group.upcomingCount} por vencer`
                          : `${group.upcomingCount} upcoming`}
                      </AppBadge>
                    ) : null}
                    {group.contactedCount > 0 ? (
                      <AppBadge tone="info">
                        {language === "es"
                          ? `${group.contactedCount} contactada${group.contactedCount === 1 ? "" : "s"}`
                          : `${group.contactedCount} contacted`}
                      </AppBadge>
                    ) : null}
                  </div>
                </div>
                <div className="maintenance-due-group__items">
                  {group.items.map((item) => (
                    <article key={item.id} className="maintenance-due-group__item">
                      <div className="maintenance-due-group__item-main">
                        <div className="maintenance-cell__title">{getClientName(item.client_id)}</div>
                        <div className="maintenance-cell__meta">
                          {getSiteLabel(item.site_id)} · {getInstallationName(item.installation_id)}
                        </div>
                        <div className="maintenance-cell__meta">
                          {stripLegacyVisibleText(item.schedule_name) || "—"} ·{" "}
                          {formatDateTime(item.due_at, language, effectiveTimeZone)}
                        </div>
                      </div>
                      <div className="maintenance-due-group__item-status">
                        <AppBadge tone={getDueTone(item.due_status)}>
                          {getDueLabel(item.due_status, language)}
                        </AppBadge>
                      </div>
                      <div className="maintenance-due-group__item-actions">{renderDueActions(item)}</div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </PanelCard>

      <PanelCard
        title={
          language === "es"
            ? "Instalaciones activas sin plan preventivo"
            : "Active installations without preventive plan"
        }
        subtitle={
          language === "es"
            ? "Reporte operativo para detectar clientes con instalación activa sin cobertura preventiva. La alta masiva solo toma instalaciones con mantención cerrada este año."
            : "Operational report to detect clients with active installations without preventive coverage. Bulk creation only uses installations with a completed maintenance this year."
        }
        actions={
          uncoveredInstallations.length > 0 ? (
            <button
              className="btn btn-sm btn-outline-primary"
              type="button"
              onClick={() => void handleCreateAnnualPlansForUncoveredInstallations()}
              disabled={isBulkPlanCreating}
            >
              {isBulkPlanCreating
                ? language === "es"
                  ? "Creando planes..."
                  : "Creating plans..."
                : language === "es"
                  ? "Crear planes desde historial anual"
                  : "Create plans from current-year history"}
            </button>
          ) : null
        }
      >
        {uncoveredInstallations.length === 0 ? (
          <div className="maintenance-cell__meta">
            {language === "es"
              ? "No hay instalaciones activas pendientes de programación preventiva."
              : "There are no active installations pending preventive scheduling."}
          </div>
        ) : (
          <div className="maintenance-due-groups">
            {uncoveredInstallations.map(({ installation, site, client }) => (
              <article
                key={`uncovered-${installation.id}`}
                className="maintenance-due-group__item"
              >
                <div className="maintenance-due-group__item-main">
                  <div className="maintenance-cell__title">{getClientName(client.id)}</div>
                  <div className="maintenance-cell__meta">{getSiteLabel(site.id)}</div>
                  <div className="maintenance-cell__meta">
                    {installation.name}
                    {installation.installation_status
                      ? ` · ${stripLegacyVisibleText(installation.installation_status)}`
                      : ""}
                  </div>
                </div>
                <div className="maintenance-due-group__item-status">
                  <AppBadge tone="warning">
                    {language === "es" ? "Sin plan" : "No plan"}
                  </AppBadge>
                </div>
                <div className="maintenance-due-group__item-actions">
                  <AppToolbar compact>
                    <Link
                      className="btn btn-sm btn-outline-secondary"
                      to={`/tenant-portal/business-core/clients/${client.id}`}
                    >
                      {language === "es" ? "Ver cliente" : "Open client"}
                    </Link>
                    <button
                      className="btn btn-sm btn-primary"
                      type="button"
                      onClick={() => startCreatePlanFromInstallation(installation)}
                    >
                      {language === "es" ? "Crear plan" : "Create plan"}
                    </button>
                  </AppToolbar>
                </div>
              </article>
            ))}
          </div>
        )}
      </PanelCard>

      {isPlanModalOpen ? (
        <div
          className="maintenance-form-backdrop"
          role="presentation"
          onClick={() => setIsPlanModalOpen(false)}
        >
          <div
            className="maintenance-form-modal maintenance-form-modal--wide"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="panel-card maintenance-form-card">
              <div className="panel-card__header">
                <div>
                  <div className="maintenance-form-modal__eyebrow">
                    {language === "es" ? "Alta bajo demanda" : "On-demand create"}
                  </div>
                  <h2 className="panel-card__title mb-1">
                    {language === "es" ? "Nueva programación" : "New schedule"}
                  </h2>
                  <p className="panel-card__subtitle mb-0">
                    {language === "es"
                      ? "Define la regla preventiva base para que este cliente aparezca solo cuando entre en ventana y luego pueda agendarse como mantención real."
                      : "Define the preventive base rule so this client only appears once it enters the visible window and can then be scheduled as a real maintenance job."}
                  </p>
                </div>
              </div>
              <form className="maintenance-form-card__body" onSubmit={handleCreatePlan}>
                <div className="row g-3">
                  <div className="col-12 col-md-6">
                    <label className="form-label">{language === "es" ? "Cliente" : "Client"}</label>
                    <select
                      className="form-select"
                      value={scheduleForm.client_id}
                      onChange={(event) =>
                        {
                          nextDueWasManuallyEditedRef.current = false;
                          frequencyWasManuallyEditedRef.current = false;
                          setScheduleForm((current) => {
                          const nextClientId = Number(event.target.value);
                          const candidateSites = sites.filter((site) => site.client_id === nextClientId);
                          const nextSiteId = candidateSites[0]?.id || null;
                          const candidateInstallations = nextSiteId
                            ? installations.filter((item) => item.site_id === nextSiteId)
                            : [];
                          return {
                            ...current,
                            client_id: nextClientId,
                            site_id: nextSiteId,
                            installation_id: candidateInstallations[0]?.id || null,
                            last_executed_at: null,
                            frequency_value: buildDefaultScheduleForm().frequency_value,
                            frequency_unit: buildDefaultScheduleForm().frequency_unit,
                            next_due_at: "",
                          };
                          });
                        }
                      }
                    >
                      <option value={0}>{language === "es" ? "Selecciona un cliente" : "Select a client"}</option>
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
                      value={scheduleForm.site_id ?? ""}
                      onChange={(event) =>
                        {
                          nextDueWasManuallyEditedRef.current = false;
                          frequencyWasManuallyEditedRef.current = false;
                          setScheduleForm((current) => {
                          const nextSiteId = event.target.value ? Number(event.target.value) : null;
                          const candidateInstallations = nextSiteId
                            ? installations.filter((item) => item.site_id === nextSiteId)
                            : [];
                          return {
                            ...current,
                            site_id: nextSiteId,
                            installation_id: candidateInstallations[0]?.id || null,
                            last_executed_at: null,
                            frequency_value: buildDefaultScheduleForm().frequency_value,
                            frequency_unit: buildDefaultScheduleForm().frequency_unit,
                            next_due_at: "",
                          };
                          });
                        }
                      }
                    >
                      <option value="">{language === "es" ? "Selecciona una dirección" : "Select an address"}</option>
                      {filteredSitesForSchedule.map((site) => (
                        <option key={site.id} value={site.id}>
                          {getSiteLabel(site.id)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">{language === "es" ? "Instalación" : "Installation"}</label>
                    <select
                      className="form-select"
                      value={scheduleForm.installation_id ?? ""}
                      onChange={(event) =>
                        {
                          nextDueWasManuallyEditedRef.current = false;
                          frequencyWasManuallyEditedRef.current = false;
                          setScheduleForm((current) => ({
                            ...current,
                            installation_id: event.target.value ? Number(event.target.value) : null,
                            last_executed_at: null,
                            frequency_value: buildDefaultScheduleForm().frequency_value,
                            frequency_unit: buildDefaultScheduleForm().frequency_unit,
                            next_due_at: "",
                          }));
                        }
                      }
                    >
                      <option value="">{language === "es" ? "Selecciona una instalación" : "Select an installation"}</option>
                      {filteredInstallationsForSchedule.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">{language === "es" ? "Tipo de mantención" : "Task type"}</label>
                    <select
                      className="form-select"
                      value={scheduleForm.task_type_id ?? ""}
                      onChange={(event) =>
                        setScheduleForm((current) => ({
                          ...current,
                          task_type_id: event.target.value ? Number(event.target.value) : null,
                        }))
                      }
                    >
                      <option value="">{language === "es" ? "Sin tipo específico" : "No task type"}</option>
                      {taskTypes.map((taskType) => (
                        <option key={taskType.id} value={taskType.id}>
                          {taskType.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {noClientsAvailable ? (
                    <div className="col-12">
                      <div className="alert alert-warning mb-0">
                        {language === "es"
                          ? "No existen clientes disponibles para crear una programación preventiva. Debes crear primero el cliente y su dirección operativa."
                          : "There are no available clients to create a preventive schedule. Create the client and its operational address first."}{" "}
                        <Link to="/tenant-portal/business-core/clients">
                          {language === "es" ? "Ir a clientes" : "Go to clients"}
                        </Link>
                      </div>
                    </div>
                  ) : null}
                  {missingSiteForScheduleClient ? (
                    <div className="col-12">
                      <div className="alert alert-warning mb-0">
                        {language === "es"
                          ? "Este cliente aún no tiene dirección operativa. Crea la dirección antes de dejar activa la programación."
                          : "This client does not have an operational address yet. Create the address before activating the schedule."}{" "}
                        <Link to="/tenant-portal/business-core/clients">
                          {language === "es" ? "Ir a clientes" : "Go to clients"}
                        </Link>
                      </div>
                    </div>
                  ) : null}
                  {missingInstallationForScheduleSite ? (
                    <div className="col-12">
                      <div className="alert alert-warning mb-0">
                        {language === "es"
                          ? "La dirección seleccionada aún no tiene instalación. Puedes guardar la programación, pero no podrás agendar la mantención hasta crear la instalación."
                          : "The selected address does not have an installation yet. You can save the schedule, but you will not be able to schedule maintenance until the installation exists."}{" "}
                        {scheduleForm.client_id && scheduleForm.site_id ? (
                          <Link
                            to={`/tenant-portal/maintenance/installations?clientId=${Number(scheduleForm.client_id)}&siteId=${Number(scheduleForm.site_id)}&mode=create`}
                          >
                            {language === "es" ? "Ir a instalaciones" : "Go to installations"}
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                  <div className="col-12 col-md-4">
                    <label className="form-label">{language === "es" ? "Frecuencia" : "Frequency"}</label>
                    <input
                      className="form-control"
                      type="number"
                      min={1}
                      value={scheduleForm.frequency_value}
                      onChange={(event) => {
                        frequencyWasManuallyEditedRef.current = true;
                        setScheduleForm((current) => ({
                          ...current,
                          frequency_value: Number(event.target.value),
                        }));
                      }}
                    />
                    <div className="form-text">{getScheduleFrequencySuggestionText()}</div>
                  </div>
                  <div className="col-12 col-md-4">
                    <label className="form-label">{language === "es" ? "Unidad" : "Unit"}</label>
                    <select
                      className="form-select"
                      value={scheduleForm.frequency_unit}
                      onChange={(event) => {
                        frequencyWasManuallyEditedRef.current = true;
                        setScheduleForm((current) => ({
                          ...current,
                          frequency_unit: event.target.value,
                        }));
                      }}
                    >
                      <option value="days">{language === "es" ? "Días" : "Days"}</option>
                      <option value="weeks">{language === "es" ? "Semanas" : "Weeks"}</option>
                      <option value="months">{language === "es" ? "Meses" : "Months"}</option>
                      <option value="years">{language === "es" ? "Años" : "Years"}</option>
                    </select>
                  </div>
                  <div className="col-12 col-md-4">
                    <label className="form-label">{language === "es" ? "Aviso previo (días)" : "Lead days"}</label>
                    <input
                      className="form-control"
                      type="number"
                      min={0}
                      value={scheduleForm.lead_days}
                      onChange={(event) =>
                        setScheduleForm((current) => ({
                          ...current,
                          lead_days: Number(event.target.value),
                        }))
                      }
                    />
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">{language === "es" ? "Prioridad" : "Priority"}</label>
                    <select
                      className="form-select"
                      value={scheduleForm.default_priority}
                      onChange={(event) =>
                        setScheduleForm((current) => ({
                          ...current,
                          default_priority: event.target.value,
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
                    <label className="form-label">{language === "es" ? "Próxima mantención" : "Next due"}</label>
                    <input
                      className="form-control"
                      type="datetime-local"
                      value={scheduleForm.next_due_at}
                      onChange={(event) => {
                        nextDueWasManuallyEditedRef.current = true;
                        setScheduleForm((current) => ({
                          ...current,
                          next_due_at: event.target.value,
                        }));
                      }}
                    />
                    <div className="form-text">{getScheduleSuggestionText()}</div>
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">{language === "es" ? "Plan preventivo" : "Preventive plan"}</label>
                    <input
                      className="form-control"
                      value={scheduleForm.name}
                      onChange={(event) =>
                        setScheduleForm((current) => ({ ...current, name: event.target.value }))
                      }
                    />
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">{language === "es" ? "Duración estimada (min)" : "Estimated duration (min)"}</label>
                    <input
                      className="form-control"
                      type="number"
                      min={15}
                      step={15}
                      value={scheduleForm.estimated_duration_minutes ?? 60}
                      onChange={(event) =>
                        setScheduleForm((current) => ({
                          ...current,
                          estimated_duration_minutes: Number(event.target.value),
                        }))
                      }
                    />
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">{language === "es" ? "Margen objetivo (%)" : "Target margin (%)"}</label>
                    <input
                      className="form-control"
                      type="number"
                      min={0}
                      max={99.99}
                      step={0.01}
                      value={scheduleForm.estimate_target_margin_percent}
                      onChange={(event) =>
                        setScheduleForm((current) => ({
                          ...current,
                          estimate_target_margin_percent: Number(event.target.value),
                        }))
                      }
                    />
                  </div>
                  <div className="col-12">
                    <div className="panel-card border-0 bg-light-subtle">
                      <div className="panel-card__header pb-2">
                        <div>
                          <h3 className="panel-card__title mb-1">
                            {language === "es"
                              ? "Plantillas de costeo de mantención"
                              : "Maintenance costing templates"}
                          </h3>
                          <p className="panel-card__subtitle mb-0">
                            {language === "es"
                              ? "Función exclusiva de Mantenciones para reutilizar estructuras de costo estimado sin convertirlas en un catálogo compartido con otros módulos."
                              : "Maintenance-only feature to reuse estimated costing structures without turning them into a shared cross-module catalog."}
                          </p>
                        </div>
                        <button
                          className="btn btn-sm btn-outline-primary"
                          type="button"
                          onClick={openSaveCostTemplateDraft}
                        >
                          {language === "es" ? "Guardar como plantilla" : "Save as template"}
                        </button>
                      </div>
                      <div className="panel-card__body pt-0 d-grid gap-3">
                        <div className="row g-3 align-items-end">
                          <div className="col-12 col-md-8">
                            <label className="form-label">
                              {language === "es" ? "Aplicar plantilla existente" : "Apply existing template"}
                            </label>
                            <select
                              className="form-select"
                              value={selectedCostTemplateId ?? ""}
                              onChange={(event) =>
                                setSelectedCostTemplateId(
                                  event.target.value ? Number(event.target.value) : null
                                )
                              }
                            >
                              <option value="">
                                {language === "es"
                                  ? "Selecciona una plantilla de mantención"
                                  : "Select a maintenance template"}
                              </option>
                              {filteredCostTemplates.map((template) => {
                                const taskTypeName =
                                  taskTypes.find((taskType) => taskType.id === template.task_type_id)?.name ??
                                  (language === "es" ? "General" : "General");
                                return (
                                  <option key={template.id} value={template.id}>
                                    {template.name} · {taskTypeName}
                                  </option>
                                );
                              })}
                            </select>
                          </div>
                          <div className="col-12 col-md-4">
                            <button
                              className="btn btn-outline-secondary w-100"
                              type="button"
                              onClick={applySelectedCostTemplate}
                              disabled={!selectedCostTemplate}
                            >
                              {language === "es" ? "Aplicar plantilla" : "Apply template"}
                            </button>
                          </div>
                        </div>
                        {filteredCostTemplates.length === 0 ? (
                          <div className="maintenance-history-entry__meta">
                            {language === "es"
                              ? "Todavía no hay plantillas guardadas para Mantenciones. Puedes guardar el costeo que armes abajo y luego reutilizarlo en otras programaciones del módulo."
                              : "There are no saved Maintenance templates yet. You can save the costing you build below and reuse it in other module schedules."}
                          </div>
                        ) : null}
                        {selectedCostTemplate ? (
                          <div className="maintenance-history-entry__meta">
                            <strong>{selectedCostTemplate.name}</strong>
                            {selectedCostTemplate.description
                              ? ` · ${selectedCostTemplate.description}`
                              : ""}
                            {` · ${selectedCostTemplate.lines.length} `}
                            {language === "es" ? "líneas base" : "base lines"}
                            {` · ${selectedCostTemplate.usage_count} `}
                            {language === "es" ? "programaciones vinculadas" : "linked schedules"}
                          </div>
                        ) : null}
                        {visibleCostTemplates.length > 0 ? (
                          <div className="d-grid gap-2">
                            {visibleCostTemplates.map((template) => {
                              const taskTypeName =
                                taskTypeById.get(template.task_type_id ?? -1)?.name ??
                                (language === "es" ? "General" : "General");
                              return (
                                <div key={template.id} className="maintenance-history-entry">
                                  <div className="d-flex flex-wrap justify-content-between gap-2 align-items-start">
                                    <div>
                                      <div className="maintenance-history-entry__title d-flex flex-wrap gap-2 align-items-center">
                                        <span>{template.name}</span>
                                        <AppBadge tone={template.is_active ? "info" : "neutral"}>
                                          {template.is_active
                                            ? language === "es"
                                              ? "Activa"
                                              : "Active"
                                            : language === "es"
                                              ? "Archivada"
                                              : "Archived"}
                                        </AppBadge>
                                      </div>
                                      <div className="maintenance-history-entry__meta">
                                        {taskTypeName}
                                        {template.description ? ` · ${template.description}` : ""}
                                      </div>
                                      <div className="maintenance-history-entry__meta">
                                        {template.lines.length} {language === "es" ? "líneas" : "lines"}
                                        {` · ${template.usage_count} `}
                                        {language === "es" ? "programaciones vinculadas" : "linked schedules"}
                                        {` · ${language === "es" ? "Actualizada" : "Updated"} `}
                                        {formatDateTime(template.updated_at, language, effectiveTimeZone)}
                                      </div>
                                    </div>
                                    <AppToolbar compact>
                                      {template.is_active ? (
                                        <button
                                          className="btn btn-sm btn-outline-secondary"
                                          type="button"
                                          onClick={() => applyCostTemplate(template)}
                                        >
                                          {language === "es" ? "Aplicar" : "Apply"}
                                        </button>
                                      ) : null}
                                      <button
                                        className="btn btn-sm btn-outline-primary"
                                        type="button"
                                        onClick={() => startEditCostTemplate(template)}
                                      >
                                        {language === "es" ? "Editar" : "Edit"}
                                      </button>
                                      <button
                                        className="btn btn-sm btn-outline-secondary"
                                        type="button"
                                        onClick={() =>
                                          void handleCostTemplateStatusChange(
                                            template,
                                            !template.is_active
                                          )
                                        }
                                      >
                                        {template.is_active
                                          ? language === "es"
                                            ? "Archivar"
                                            : "Archive"
                                          : language === "es"
                                            ? "Reactivar"
                                            : "Reactivate"}
                                      </button>
                                    </AppToolbar>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : null}
                        {isCostTemplateDraftOpen ? (
                          <div className="maintenance-cost-lines__item">
                            <div className="row g-3">
                              <div className="col-12 col-md-6">
                                <label className="form-label">
                                  {language === "es" ? "Nombre de plantilla" : "Template name"}
                                </label>
                                <input
                                  className="form-control"
                                  value={costTemplateDraft.name}
                                  onChange={(event) =>
                                    setCostTemplateDraft((current) => ({
                                      ...current,
                                      name: event.target.value,
                                    }))
                                  }
                                />
                              </div>
                              <div className="col-12 col-md-6">
                                <label className="form-label">
                                  {language === "es" ? "Descripción breve" : "Short description"}
                                </label>
                                <input
                                  className="form-control"
                                  value={costTemplateDraft.description}
                                  onChange={(event) =>
                                    setCostTemplateDraft((current) => ({
                                      ...current,
                                      description: event.target.value,
                                    }))
                                  }
                                />
                              </div>
                              <div className="col-12">
                                <div className="maintenance-form__actions justify-content-start pt-0">
                                  <button
                                    className="btn btn-outline-secondary"
                                    type="button"
                                    onClick={closeCostTemplateDraft}
                                  >
                                    {language === "es" ? "Cancelar" : "Cancel"}
                                  </button>
                                  <button
                                    className="btn btn-primary"
                                    type="button"
                                    onClick={() => void handleSaveCostTemplate()}
                                    disabled={isTemplateSaving}
                                  >
                                    {isTemplateSaving
                                      ? language === "es"
                                        ? "Guardando..."
                                        : "Saving..."
                                      : editingCostTemplateId
                                        ? language === "es"
                                          ? "Actualizar plantilla"
                                          : "Update template"
                                        : language === "es"
                                          ? "Guardar plantilla"
                                          : "Save template"}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : null}
                        {costTemplateFeedback ? (
                          <div className="alert alert-info mb-0">{costTemplateFeedback}</div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <div className="col-12">
                    <div className="panel-card border-0 bg-light-subtle">
                      <div className="panel-card__header pb-2">
                        <div>
                          <h3 className="panel-card__title mb-1">
                            {language === "es" ? "Costeo estimado por defecto" : "Default estimated costing"}
                          </h3>
                          <p className="panel-card__subtitle mb-0">
                            {language === "es"
                              ? "Estas líneas se copiarán automáticamente al costeo estimado cuando una mantención se agende desde este plan preventivo. Puedes cargar varios materiales y servicios por defecto."
                              : "These lines will be copied automatically into the estimated costing when a maintenance job is scheduled from this preventive plan. You can preload multiple default materials and services."}
                          </p>
                        </div>
                        <button className="btn btn-sm btn-outline-primary" type="button" onClick={addScheduleEstimateLine}>
                          {language === "es" ? "Agregar línea" : "Add line"}
                        </button>
                      </div>
                      <div className="panel-card__body pt-0">
                        {scheduleForm.estimate_lines.length === 0 ? (
                          <div className="maintenance-history-entry__meta">
                            {language === "es"
                              ? "Sin líneas por defecto todavía. Si las agregas ahora, la OT programada ya abrirá con costeo estimado precargado."
                              : "No default lines yet. If you add them now, the scheduled work order will open with an estimated costing already preloaded."}
                          </div>
                        ) : (
                          <div className="d-grid gap-3">
                            {scheduleForm.estimate_lines.map((line, index) => {
                              const lineTotal = Number(line.quantity || 0) * Number(line.unit_cost || 0);
                              return (
                                <div className="maintenance-cost-lines__item" key={`schedule-estimate-${index}`}>
                                  <div className="row g-3">
                                    <div className="col-12 col-md-3">
                                      <label className="form-label">{language === "es" ? "Tipo" : "Type"}</label>
                                      <select
                                        className="form-select"
                                        value={line.line_type}
                                        onChange={(event) => updateScheduleEstimateLine(index, "line_type", event.target.value)}
                                      >
                                        <option value="labor">{language === "es" ? "Mano de obra" : "Labor"}</option>
                                        <option value="travel">{language === "es" ? "Traslado" : "Travel"}</option>
                                        <option value="material">{language === "es" ? "Material" : "Material"}</option>
                                        <option value="service">{language === "es" ? "Servicio externo" : "External service"}</option>
                                        <option value="overhead">{language === "es" ? "Indirecto" : "Overhead"}</option>
                                      </select>
                                    </div>
                                    <div className="col-12 col-md-5">
                                      <label className="form-label">{language === "es" ? "Descripción" : "Description"}</label>
                                      <input
                                        className="form-control"
                                        value={line.description ?? ""}
                                        onChange={(event) => updateScheduleEstimateLine(index, "description", event.target.value)}
                                      />
                                    </div>
                                    <div className="col-6 col-md-2">
                                      <label className="form-label">{language === "es" ? "Cantidad" : "Quantity"}</label>
                                      <input
                                        className="form-control"
                                        type="number"
                                        min={0}
                                        step={0.01}
                                        value={line.quantity}
                                        onChange={(event) => updateScheduleEstimateLine(index, "quantity", event.target.value)}
                                      />
                                    </div>
                                    <div className="col-6 col-md-2">
                                      <label className="form-label">{language === "es" ? "Costo unitario" : "Unit cost"}</label>
                                      <input
                                        className="form-control"
                                        type="number"
                                        min={0}
                                        step={0.01}
                                        value={line.unit_cost}
                                        onChange={(event) => updateScheduleEstimateLine(index, "unit_cost", event.target.value)}
                                      />
                                    </div>
                                    <div className="col-12 col-md-8">
                                      <label className="form-label">{language === "es" ? "Notas" : "Notes"}</label>
                                      <input
                                        className="form-control"
                                        value={line.notes ?? ""}
                                        onChange={(event) => updateScheduleEstimateLine(index, "notes", event.target.value)}
                                      />
                                    </div>
                                    <div className="col-8 col-md-2">
                                      <label className="form-label">{language === "es" ? "Total" : "Total"}</label>
                                      <input className="form-control" value={lineTotal.toFixed(2)} readOnly />
                                    </div>
                                    <div className="col-4 col-md-2 maintenance-cost-lines__remove">
                                      <button className="btn btn-outline-danger" type="button" onClick={() => removeScheduleEstimateLine(index)}>
                                        {language === "es" ? "Quitar" : "Remove"}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        <div className="row g-3 mt-1">
                          <div className="col-12 col-md-6">
                            <label className="form-label">{language === "es" ? "Costo estimado total por defecto" : "Default estimated total cost"}</label>
                            <input className="form-control" value={scheduleEstimateTotalPreview.toFixed(2)} readOnly />
                          </div>
                          <div className="col-12 col-md-6">
                            <label className="form-label">{language === "es" ? "Notas del costeo" : "Costing notes"}</label>
                            <textarea
                              className="form-control"
                              rows={2}
                              value={scheduleForm.estimate_notes ?? ""}
                              onChange={(event) =>
                                setScheduleForm((current) => ({
                                  ...current,
                                  estimate_notes: event.target.value,
                                }))
                              }
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="col-12">
                    <label className="form-label">{language === "es" ? "Notas operativas" : "Operational notes"}</label>
                    <textarea
                      className="form-control"
                      rows={4}
                      value={scheduleForm.notes ?? ""}
                      onChange={(event) =>
                        setScheduleForm((current) => ({ ...current, notes: event.target.value }))
                      }
                    />
                  </div>
                </div>
                <div className="maintenance-form__actions">
                  <button className="btn btn-outline-secondary" type="button" onClick={() => setIsPlanModalOpen(false)}>
                    {language === "es" ? "Cancelar" : "Cancel"}
                  </button>
                  <button className="btn btn-primary" type="submit" disabled={isSubmitting || scheduleSubmitBlocked}>
                    {isSubmitting
                      ? language === "es"
                        ? "Guardando..."
                        : "Saving..."
                      : language === "es"
                        ? "Crear programación"
                        : "Create schedule"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}

      {isContactModalOpen && selectedDueItem ? (
        <div
          className="maintenance-form-backdrop"
          role="presentation"
          onClick={() => setIsContactModalOpen(false)}
        >
          <div
            className="maintenance-form-modal"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="maintenance-form-modal__eyebrow">
              {language === "es" ? "Gestión operativa" : "Operational update"}
            </div>
            <PanelCard
              title={language === "es" ? "Actualizar contacto" : "Update contact"}
              subtitle={
                language === "es"
                  ? "Registra el estado de coordinación para que la bandeja no dependa de memoria o seguimiento informal."
                  : "Record the coordination status so this tray does not depend on memory or informal follow-up."
              }
            >
              <form className="maintenance-form" onSubmit={handleContactDueItem}>
                <div className="row g-3">
                  <div className="col-12">
                    <label className="form-label">{language === "es" ? "Cliente" : "Client"}</label>
                    <input className="form-control" value={getClientName(selectedDueItem.client_id)} disabled />
                  </div>
                  <div className="col-12">
                    <label className="form-label">{language === "es" ? "Estado de contacto" : "Contact status"}</label>
                    <select
                      className="form-select"
                      value={dueContactForm.contact_status}
                      onChange={(event) =>
                        setDueContactForm((current) => ({
                          ...current,
                          contact_status: event.target.value,
                        }))
                      }
                    >
                      <option value="contact_pending">{language === "es" ? "Contacto pendiente" : "Contact pending"}</option>
                      <option value="contacted">{language === "es" ? "Contactado" : "Contacted"}</option>
                      <option value="pending_confirmation">{language === "es" ? "Pendiente confirmación" : "Pending confirmation"}</option>
                      <option value="confirmed">{language === "es" ? "Confirmado" : "Confirmed"}</option>
                      <option value="no_response">{language === "es" ? "No responde" : "No response"}</option>
                      <option value="rejected">{language === "es" ? "Rechazado" : "Rejected"}</option>
                    </select>
                  </div>
                  <div className="col-12">
                    <label className="form-label">{language === "es" ? "Nota de gestión" : "Coordination note"}</label>
                    <textarea
                      className="form-control"
                      rows={4}
                      value={dueContactForm.contact_note}
                      onChange={(event) =>
                        setDueContactForm((current) => ({
                          ...current,
                          contact_note: event.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
                <div className="maintenance-form__actions">
                  <button className="btn btn-outline-secondary" type="button" onClick={() => setIsContactModalOpen(false)}>
                    {language === "es" ? "Cancelar" : "Cancel"}
                  </button>
                  <button className="btn btn-primary" type="submit" disabled={isSubmitting}>
                    {isSubmitting
                      ? language === "es"
                        ? "Guardando..."
                        : "Saving..."
                      : language === "es"
                        ? "Guardar contacto"
                        : "Save contact"}
                  </button>
                </div>
              </form>
            </PanelCard>
          </div>
        </div>
      ) : null}

      {isPostponeModalOpen && selectedDueItem ? (
        <div
          className="maintenance-form-backdrop"
          role="presentation"
          onClick={() => setIsPostponeModalOpen(false)}
        >
          <div
            className="maintenance-form-modal"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="maintenance-form-modal__eyebrow">
              {language === "es" ? "Reprogramación preventiva" : "Preventive reschedule"}
            </div>
            <PanelCard
              title={language === "es" ? "Posponer pendiente" : "Postpone due item"}
              subtitle={
                language === "es"
                  ? "Mueve este pendiente a una nueva fecha visible sin perder su trazabilidad comercial."
                  : "Move this due item to a new visible date without losing its commercial traceability."
              }
            >
              <form className="maintenance-form" onSubmit={handlePostponeDueItem}>
                <div className="row g-3">
                  <div className="col-12">
                    <label className="form-label">{language === "es" ? "Cliente" : "Client"}</label>
                    <input className="form-control" value={getClientName(selectedDueItem.client_id)} disabled />
                  </div>
                  <div className="col-12">
                    <label className="form-label">{language === "es" ? "Nueva fecha visible" : "New visible date"}</label>
                    <input
                      className="form-control"
                      type="datetime-local"
                      value={duePostponeForm.postponed_until}
                      onChange={(event) =>
                        setDuePostponeForm((current) => ({
                          ...current,
                          postponed_until: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label">{language === "es" ? "Motivo operativo" : "Operational reason"}</label>
                    <textarea
                      className="form-control"
                      rows={4}
                      value={duePostponeForm.resolution_note}
                      onChange={(event) =>
                        setDuePostponeForm((current) => ({
                          ...current,
                          resolution_note: event.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
                <div className="maintenance-form__actions">
                  <button className="btn btn-outline-secondary" type="button" onClick={() => setIsPostponeModalOpen(false)}>
                    {language === "es" ? "Cancelar" : "Cancel"}
                  </button>
                  <button className="btn btn-primary" type="submit" disabled={isSubmitting || !duePostponeForm.postponed_until}>
                    {isSubmitting
                      ? language === "es"
                        ? "Guardando..."
                        : "Saving..."
                      : language === "es"
                        ? "Guardar nueva fecha"
                        : "Save new date"}
                  </button>
                </div>
              </form>
            </PanelCard>
          </div>
        </div>
      ) : null}

      {isScheduleModalOpen && selectedDueItem ? (
        <div
          className="maintenance-form-backdrop"
          role="presentation"
          onClick={() => setIsScheduleModalOpen(false)}
        >
          <div
            className="maintenance-form-modal maintenance-form-modal--wide"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="panel-card maintenance-form-card">
              <div className="panel-card__header">
                <div>
                  <div className="maintenance-form-modal__eyebrow">
                    {language === "es" ? "Agendamiento" : "Scheduling"}
                  </div>
                  <h2 className="panel-card__title mb-1">
                    {language === "es" ? "Agendar mantención" : "Schedule maintenance"}
                  </h2>
                  <p className="panel-card__subtitle mb-0">
                    {language === "es"
                      ? "Convierte este pendiente en una orden de trabajo y sácalo de la bandeja activa."
                      : "Turn this due item into a work order and remove it from the active tray."}
                  </p>
                </div>
              </div>
              <form className="maintenance-form-card__body" onSubmit={handleScheduleDueItem}>
                <div className="row g-3">
                  <div className="col-12 col-lg-6">
                    <label className="form-label">{language === "es" ? "Cliente" : "Client"}</label>
                    <input className="form-control" value={getClientName(selectedDueItem.client_id)} disabled />
                  </div>
                  <div className="col-12 col-lg-6">
                    <label className="form-label">{language === "es" ? "Dirección" : "Address"}</label>
                    <select
                      className="form-select"
                      value={dueScheduleForm.site_id ?? ""}
                      onChange={(event) =>
                        setDueScheduleForm((current) => ({
                          ...current,
                          site_id: event.target.value ? Number(event.target.value) : null,
                          installation_id: null,
                        }))
                      }
                    >
                      <option value="">{language === "es" ? "Selecciona una dirección" : "Select an address"}</option>
                      {sites
                        .filter((site) => site.client_id === selectedDueItem.client_id)
                        .map((site) => (
                          <option key={site.id} value={site.id}>
                            {getSiteLabel(site.id)}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="col-12 col-lg-6">
                    <label className="form-label">{language === "es" ? "Instalación" : "Installation"}</label>
                    <select
                      className="form-select"
                      value={dueScheduleForm.installation_id ?? ""}
                      onChange={(event) =>
                        setDueScheduleForm((current) => ({
                          ...current,
                          installation_id: event.target.value ? Number(event.target.value) : null,
                        }))
                      }
                    >
                      <option value="">{language === "es" ? "Selecciona una instalación" : "Select an installation"}</option>
                      {filteredInstallationsForDue.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-12 col-lg-6">
                    <label className="form-label">{language === "es" ? "Fecha y hora programada" : "Scheduled date and time"}</label>
                    <input
                      className="form-control"
                      type="datetime-local"
                      value={dueScheduleForm.scheduled_for}
                      onChange={(event) =>
                        setDueScheduleForm((current) => ({
                          ...current,
                          scheduled_for: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="col-12 col-lg-6">
                    <label className="form-label">{language === "es" ? "Grupo responsable" : "Responsible group"}</label>
                    <select
                      className="form-select"
                      value={dueScheduleForm.assigned_work_group_id ?? ""}
                      onChange={(event) =>
                        setDueScheduleForm((current) => ({
                          ...current,
                          assigned_work_group_id: event.target.value ? Number(event.target.value) : null,
                          assigned_tenant_user_id: null,
                        }))
                      }
                    >
                      <option value="">{language === "es" ? "Sin grupo asignado" : "No group assigned"}</option>
                      {workGroups.filter((group) => group.is_active).map((group) => (
                        <option key={group.id} value={group.id}>
                          {group.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-12 col-lg-6">
                    <label className="form-label">{language === "es" ? "Técnico responsable" : "Responsible technician"}</label>
                    <select
                      className="form-select"
                      value={dueScheduleForm.assigned_tenant_user_id ?? ""}
                      onChange={(event) =>
                        setDueScheduleForm((current) => ({
                          ...current,
                          assigned_tenant_user_id: event.target.value ? Number(event.target.value) : null,
                        }))
                      }
                    >
                      <option value="">{language === "es" ? "Sin técnico asignado" : "No technician assigned"}</option>
                      {selectableDueScheduleTechnicians.map((user) => (
                        <option key={user.id} value={user.id}>
                          {getDueScheduleTechnicianLabel(user.id)}
                        </option>
                      ))}
                    </select>
                    {dueScheduleRequiresFunctionalProfile && dueScheduleTaskTypeLabel ? (
                      <div className="form-text text-muted">
                        {dueScheduleAllowedProfileNames.length > 0
                          ? language === "es"
                            ? `Esta programación usa el tipo de tarea ${dueScheduleTaskTypeLabel}; solo se muestran perfiles compatibles: ${dueScheduleAllowedProfileNames.join(", ")}.`
                            : `This schedule uses task type ${dueScheduleTaskTypeLabel}; only compatible profiles are shown: ${dueScheduleAllowedProfileNames.join(", ")}.`
                          : language === "es"
                            ? `Esta programación usa el tipo de tarea ${dueScheduleTaskTypeLabel}; solo se muestran técnicos con perfil funcional declarado en el grupo.`
                            : `This schedule uses task type ${dueScheduleTaskTypeLabel}; only technicians with a declared functional profile in the group are shown.`}
                      </div>
                    ) : null}
                    {dueScheduleForm.assigned_work_group_id && selectableDueScheduleTechnicians.length === 0 ? (
                      <div className="form-text text-warning">
                        {dueScheduleAllowedProfileNames.length > 0
                          ? language === "es"
                            ? `Este grupo no tiene técnicos activos compatibles con: ${dueScheduleAllowedProfileNames.join(", ")}.`
                            : `This group has no active technicians compatible with: ${dueScheduleAllowedProfileNames.join(", ")}.`
                          : dueScheduleRequiresFunctionalProfile
                          ? language === "es"
                            ? "Este grupo no tiene técnicos con membresía activa y perfil funcional declarado para este tipo de tarea."
                            : "This group has no technicians with an active membership and declared functional profile for this task type."
                          : language === "es"
                            ? "Este grupo no tiene técnicos con membresía activa para asignar."
                            : "This group has no technicians with an active membership available for assignment."}
                      </div>
                    ) : null}
                  </div>
                  <div className="col-12 col-lg-6">
                    <label className="form-label">{language === "es" ? "Prioridad" : "Priority"}</label>
                    <select
                      className="form-select"
                      value={dueScheduleForm.priority}
                      onChange={(event) =>
                        setDueScheduleForm((current) => ({ ...current, priority: event.target.value }))
                      }
                    >
                      <option value="low">{language === "es" ? "Baja" : "Low"}</option>
                      <option value="normal">{language === "es" ? "Normal" : "Normal"}</option>
                      <option value="high">{language === "es" ? "Alta" : "High"}</option>
                      <option value="critical">{language === "es" ? "Crítica" : "Critical"}</option>
                    </select>
                  </div>
                  <div className="col-12">
                    <label className="form-label">{language === "es" ? "Trabajo a realizar" : "Work title"}</label>
                    <input
                      className="form-control"
                      value={dueScheduleForm.title}
                      onChange={(event) =>
                        setDueScheduleForm((current) => ({ ...current, title: event.target.value }))
                      }
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label">{language === "es" ? "Detalle técnico" : "Technical detail"}</label>
                    <textarea
                      className="form-control"
                      rows={4}
                      value={dueScheduleForm.description}
                      onChange={(event) =>
                        setDueScheduleForm((current) => ({ ...current, description: event.target.value }))
                      }
                    />
                  </div>
                </div>
                <div className="maintenance-form__actions">
                  <button className="btn btn-outline-secondary" type="button" onClick={() => setIsScheduleModalOpen(false)}>
                    {language === "es" ? "Cancelar" : "Cancel"}
                  </button>
                  <button
                    className="btn btn-primary"
                    type="submit"
                    disabled={isSubmitting || !dueScheduleForm.site_id || !dueScheduleForm.installation_id || !dueScheduleForm.title.trim()}
                  >
                    {isSubmitting
                      ? language === "es"
                        ? "Agendando..."
                        : "Scheduling..."
                      : language === "es"
                        ? "Crear orden"
                        : "Create work order"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
