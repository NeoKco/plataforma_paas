import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Link } from "react-router-dom";
import { ConfirmDialog } from "../../../../components/common/ConfirmDialog";
import {
  OperationalSummaryStrip,
  type OperationalSummaryCard,
} from "../../../../components/common/OperationalSummaryStrip";
import { PanelCard } from "../../../../components/common/PanelCard";
import { PageHeader } from "../../../../components/common/PageHeader";
import { StatusBadge } from "../../../../components/common/StatusBadge";
import { DataTableCard } from "../../../../components/data-display/DataTableCard";
import { AppBadge, type AppBadgeTone } from "../../../../design-system/AppBadge";
import {
  AppCheckGrid,
  AppForm,
  AppFormActions,
  AppFormField,
} from "../../../../design-system/AppForm";
import { AppFilterGrid, AppToolbar } from "../../../../design-system/AppLayout";
import { ErrorState } from "../../../../components/feedback/ErrorState";
import { LoadingBlock } from "../../../../components/feedback/LoadingBlock";
import { getApiErrorDisplayMessage } from "../../../../services/api";
import {
  getPlatformActionFeedbackLabel,
  getPlatformActionSuccessMessage,
} from "../../../../utils/action-feedback";
import {
  displayAccessBlockingSource,
  displayMaintenanceAccessMode,
  displayPlatformCode,
  displayTenantAccessDetail,
} from "../../../../utils/platform-labels";
import {
  createPlatformTenant,
  createPlatformTenantDataExportJob,
  createPlatformTenantDataImportJob,
  deprovisionPlatformTenant,
  deletePlatformTenant,
  downloadPlatformTenantDataExportJob,
  getPlatformCapabilities,
  getPlatformTenant,
  getPlatformTenantAccessPolicy,
  getProvisioningAlerts,
  listPlatformTenantDataExportJobs,
  listPlatformTenantDataImportJobs,
  getPlatformTenantRetirementArchive,
  getPlatformTenantModuleUsage,
  getPlatformTenantSchemaStatus,
  getPlatformTenantPolicyHistory,
  listPlatformTenantRetirementArchives,
  listPlatformTenantUsers,
  listProvisioningJobs,
  reprovisionPlatformTenant,
  resetPlatformTenantUserPassword,
  rotatePlatformTenantDbCredentials,
  requeueProvisioningJob,
  runProvisioningJob,
  listPlatformTenants,
  syncPlatformTenantSchema,
  restorePlatformTenant,
  updatePlatformTenantBilling,
  updatePlatformTenantBillingIdentity,
  updatePlatformTenantIdentity,
  updatePlatformTenantMaintenance,
  updatePlatformTenantModuleLimits,
  migratePlatformTenantLegacySubscription,
  updatePlatformTenantPlan,
  updatePlatformTenantSubscription,
  updatePlatformTenantRateLimits,
  updatePlatformTenantStatus,
} from "../../../../services/platform-api";
import { useAuth } from "../../../../store/auth-context";
import { useLanguage } from "../../../../store/language-context";
import type {
  ApiError,
  PlatformCapabilities,
  PlatformModuleDependency,
  ProvisioningJob,
  PlatformTenant,
  PlatformTenantAccessPolicy,
  PlatformTenantDataExportJob,
  TenantDataExportScope,
  PlatformTenantDataImportJob,
  PlatformTenantPortalUserItem,
  PlatformTenantRetirementArchiveItem,
  PlatformTenantPolicyChangeEvent,
  PlatformTenantSchemaStatusResponse,
  PlatformTenantModuleUsageSummary,
  ProvisioningOperationalAlert,
  ProvisioningOperationalAlertsResponse,
} from "../../../../types";
import { getCurrentLanguage, getCurrentLocale } from "../../../../utils/i18n";

type ActionFeedback = {
  scope: string;
  type: "success" | "error";
  message: string;
  details?: string[];
};

function getTenantDataExportScopeLabel(
  scope: string,
  language: "es" | "en"
) {
  switch (scope) {
    case "portable_full":
    case "portable_minimum":
      return language === "es"
        ? "Paquete completo"
        : "Full package";
    case "functional_data_only":
      return language === "es"
        ? "Solo datos funcionales"
        : "Functional data only";
    default:
      return scope;
  }
}

type PendingConfirmation = {
  scope: string;
  title: string;
  description: string;
  details: string[];
  confirmLabel: string;
  tone?: "warning" | "danger";
  action: () => Promise<{ message: string; afterSuccess?: () => Promise<void> | void }>;
};

type ModuleUsageAvailabilityReason =
  | "tenant-inactive"
  | "db-incomplete"
  | "schema-incomplete"
  | "db-credentials-invalid"
  | null;

type TenantOperationalAction =
  | "open-provisioning"
  | "run-provisioning"
  | "retry-provisioning"
  | "reprovision"
  | "sync-schema"
  | "rotate-credentials"
  | "open-tenant-portal"
  | null;

type TenantOperationalPosture = {
  tone: AppBadgeTone;
  label: string;
  dominantSignal: string;
  quickRead: string;
  nextAction: string;
  supportingNote: string | null;
  primaryAction: TenantOperationalAction;
};

type TenantProvisioningAlertContext = {
  tone: AppBadgeTone;
  label: string;
  scopeLabel: string;
  quickRead: string;
  supportingNote: string | null;
  environmentAlertCount: number | null;
  tenantAlertCount: number | null;
  latestCapturedAt: string | null;
  showProvisioningLink: boolean;
  provisioningLink: string;
};

export function TenantsPage() {
  const { session } = useAuth();
  const { language } = useLanguage();
  const [capabilities, setCapabilities] = useState<PlatformCapabilities | null>(null);
  const [tenants, setTenants] = useState<PlatformTenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<number | null>(null);
  const [selectedTenant, setSelectedTenant] = useState<PlatformTenant | null>(null);
  const [accessPolicy, setAccessPolicy] = useState<PlatformTenantAccessPolicy | null>(
    null
  );
  const [moduleUsage, setModuleUsage] =
    useState<PlatformTenantModuleUsageSummary | null>(null);
  const [moduleUsageNotice, setModuleUsageNotice] = useState<string | null>(null);
  const [moduleUsageAvailabilityReason, setModuleUsageAvailabilityReason] =
    useState<ModuleUsageAvailabilityReason>(null);
  const [schemaStatus, setSchemaStatus] =
    useState<PlatformTenantSchemaStatusResponse | null>(null);
  const [policyHistory, setPolicyHistory] = useState<PlatformTenantPolicyChangeEvent[]>(
    []
  );
  const [provisioningAlerts, setProvisioningAlerts] =
    useState<ProvisioningOperationalAlertsResponse | null>(null);
  const [dataExportJobs, setDataExportJobs] = useState<PlatformTenantDataExportJob[]>(
    []
  );
  const [dataImportJobs, setDataImportJobs] = useState<PlatformTenantDataImportJob[]>(
    []
  );
  const [retirementArchives, setRetirementArchives] = useState<
    PlatformTenantRetirementArchiveItem[]
  >([]);
  const [selectedRetirementArchiveId, setSelectedRetirementArchiveId] = useState<
    number | null
  >(null);
  const [selectedRetirementArchive, setSelectedRetirementArchive] =
    useState<PlatformTenantRetirementArchiveItem | null>(null);
  const [selectedRetirementSummary, setSelectedRetirementSummary] = useState<
    Record<string, unknown> | null
  >(null);
  const [listError, setListError] = useState<ApiError | null>(null);
  const [retirementArchivesError, setRetirementArchivesError] = useState<ApiError | null>(
    null
  );
  const [retirementArchiveDetailError, setRetirementArchiveDetailError] =
    useState<ApiError | null>(null);
  const [detailError, setDetailError] = useState<ApiError | null>(null);
  const [moduleUsageError, setModuleUsageError] = useState<ApiError | null>(null);
  const [policyHistoryError, setPolicyHistoryError] = useState<ApiError | null>(null);
  const [dataExportJobsError, setDataExportJobsError] = useState<ApiError | null>(null);
  const [dataImportJobsError, setDataImportJobsError] = useState<ApiError | null>(null);
  const [provisioningJobError, setProvisioningJobError] = useState<ApiError | null>(null);
  const [provisioningAlertsError, setProvisioningAlertsError] = useState<ApiError | null>(
    null
  );
  const [schemaStatusError, setSchemaStatusError] = useState<ApiError | null>(null);
  const [isListLoading, setIsListLoading] = useState(true);
  const [isRetirementArchivesLoading, setIsRetirementArchivesLoading] = useState(true);
  const [isRetirementArchiveDetailLoading, setIsRetirementArchiveDetailLoading] =
    useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isDataExportJobsLoading, setIsDataExportJobsLoading] = useState(false);
  const [isDataImportJobsLoading, setIsDataImportJobsLoading] = useState(false);
  const [isActionSubmitting, setIsActionSubmitting] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<ActionFeedback | null>(null);
  const [pendingConfirmation, setPendingConfirmation] =
    useState<PendingConfirmation | null>(null);

  const [statusValue, setStatusValue] = useState("");
  const [statusReason, setStatusReason] = useState("");
  const [billingStatus, setBillingStatus] = useState("");
  const [billingReason, setBillingReason] = useState("");
  const [billingCurrentPeriodEndsAt, setBillingCurrentPeriodEndsAt] = useState("");
  const [billingGraceUntil, setBillingGraceUntil] = useState("");
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceStartsAt, setMaintenanceStartsAt] = useState("");
  const [maintenanceEndsAt, setMaintenanceEndsAt] = useState("");
  const [maintenanceReason, setMaintenanceReason] = useState("");
  const [maintenanceScopes, setMaintenanceScopes] = useState<string[]>(["all"]);
  const [maintenanceAccessMode, setMaintenanceAccessMode] = useState("write_block");
  const [planCode, setPlanCode] = useState("");
  const [subscriptionBasePlanCode, setSubscriptionBasePlanCode] = useState("");
  const [subscriptionBillingCycle, setSubscriptionBillingCycle] = useState("");
  const [subscriptionAddonSelections, setSubscriptionAddonSelections] = useState<
    Record<string, boolean>
  >({});
  const [subscriptionAddonBillingCycles, setSubscriptionAddonBillingCycles] = useState<
    Record<string, string>
  >({});
  const [readRateLimit, setReadRateLimit] = useState("");
  const [writeRateLimit, setWriteRateLimit] = useState("");
  const [billingProvider, setBillingProvider] = useState("");
  const [billingProviderCustomerId, setBillingProviderCustomerId] = useState("");
  const [billingProviderSubscriptionId, setBillingProviderSubscriptionId] =
    useState("");
  const [tenantPortalUsers, setTenantPortalUsers] = useState<
    PlatformTenantPortalUserItem[]
  >([]);
  const [tenantPortalResetEmail, setTenantPortalResetEmail] = useState("");
  const [tenantPortalResetPassword, setTenantPortalResetPassword] = useState("");
  const [tenantPortalLastResetEmail, setTenantPortalLastResetEmail] = useState("");
  const [tenantPortalLastResetPassword, setTenantPortalLastResetPassword] = useState("");
  const [moduleLimitDrafts, setModuleLimitDrafts] = useState<Record<string, string>>(
    {}
  );
  const [createTenantName, setCreateTenantName] = useState("");
  const [createTenantSlug, setCreateTenantSlug] = useState("");
  const [createTenantSlugTouched, setCreateTenantSlugTouched] = useState(false);
  const [createTenantType, setCreateTenantType] = useState("empresa");
  const [createTenantBasePlanCode, setCreateTenantBasePlanCode] = useState("");
  const [createTenantAdminFullName, setCreateTenantAdminFullName] = useState("");
  const [createTenantAdminEmail, setCreateTenantAdminEmail] = useState("");
  const [createTenantAdminPassword, setCreateTenantAdminPassword] = useState("");
  const [createTenantAdminPasswordConfirm, setCreateTenantAdminPasswordConfirm] =
    useState("");
  const [tenantDataExportScope, setTenantDataExportScope] =
    useState<TenantDataExportScope>("portable_full");
  const [tenantImportFile, setTenantImportFile] = useState<File | null>(null);
  const [tenantImportDryRun, setTenantImportDryRun] = useState(true);
  const [isCreateTenantModalOpen, setIsCreateTenantModalOpen] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [retirementSearch, setRetirementSearch] = useState("");
  const [catalogStatusFilter, setCatalogStatusFilter] = useState("");
  const [catalogBillingFilter, setCatalogBillingFilter] = useState("");
  const [catalogTypeFilter, setCatalogTypeFilter] = useState("");
  const [identityName, setIdentityName] = useState("");
  const [identityTenantType, setIdentityTenantType] = useState("empresa");
  const [restoreTargetStatus, setRestoreTargetStatus] = useState("active");
  const [restoreReason, setRestoreReason] = useState("");
  const [selectedProvisioningJob, setSelectedProvisioningJob] = useState<ProvisioningJob | null>(
    null
  );

  const selectedTenantSummary =
    tenants.find((tenant) => tenant.id === selectedTenantId) || selectedTenant;
  const selectedTenantVisibleBaseCode =
    selectedTenantSummary?.subscription_base_plan_code ||
    (selectedTenantSummary?.legacy_plan_fallback_active
      ? selectedTenantSummary?.plan_code
      : null);

  const createTenantPasswordsMatch =
    createTenantAdminPassword.length > 0 &&
    createTenantAdminPassword === createTenantAdminPasswordConfirm;

  const tenantTypeOptions = useMemo(
    () =>
      Array.from(
        new Set(["empresa", "condominio", ...tenants.map((tenant) => tenant.tenant_type)])
      ).sort(),
    [tenants]
  );

  const filteredTenants = useMemo(() => {
    const search = catalogSearch.trim().toLowerCase();

    return tenants.filter((tenant) => {
      const matchesSearch =
        !search ||
        tenant.name.toLowerCase().includes(search) ||
        tenant.slug.toLowerCase().includes(search) ||
        tenant.tenant_type.toLowerCase().includes(search);
      const matchesStatus =
        !catalogStatusFilter || tenant.status === catalogStatusFilter;
      const matchesBilling =
        !catalogBillingFilter ||
        (tenant.billing_status || "") === catalogBillingFilter;
      const matchesType =
        !catalogTypeFilter || tenant.tenant_type === catalogTypeFilter;

      return matchesSearch && matchesStatus && matchesBilling && matchesType;
    });
  }, [
    catalogBillingFilter,
    catalogSearch,
    catalogStatusFilter,
    catalogTypeFilter,
    tenants,
  ]);

  const filteredRetirementArchives = useMemo(() => {
    const search = retirementSearch.trim().toLowerCase();
    if (!search) {
      return retirementArchives;
    }

    return retirementArchives.filter((archive) => {
      return (
        archive.tenant_name.toLowerCase().includes(search) ||
        archive.tenant_slug.toLowerCase().includes(search) ||
        archive.tenant_type.toLowerCase().includes(search) ||
        (archive.deleted_by_email || "").toLowerCase().includes(search) ||
        (archive.billing_provider || "").toLowerCase().includes(search) ||
        (archive.billing_status || "").toLowerCase().includes(search)
      );
    });
  }, [retirementArchives, retirementSearch]);

  const planOptions = useMemo(
    () =>
      Array.from(
        new Set([
          ...(capabilities?.available_plan_codes || []),
          ...tenants
            .map((tenant) => tenant.plan_code)
            .filter((value): value is string => Boolean(value)),
        ])
      ).sort(),
    [capabilities?.available_plan_codes, tenants]
  );

  const planCatalogByCode = useMemo(
    () =>
      new Map(
        (capabilities?.plan_catalog || []).map((entry) => [entry.plan_code, entry])
      ),
    [capabilities?.plan_catalog]
  );

  const moduleDependencyMap = useMemo(
    () =>
      new Map(
        (capabilities?.module_dependency_catalog || []).map((entry) => [
          entry.module_key,
          entry,
        ])
      ),
    [capabilities?.module_dependency_catalog]
  );

  const selectedTenantPlanCatalog =
    selectedTenantSummary?.legacy_plan_fallback_active && selectedTenantSummary?.plan_code
      ? planCatalogByCode.get(selectedTenantSummary.plan_code) || null
      : null;
  const selectedTenantEffectiveModules =
    selectedTenantSummary?.effective_enabled_modules ||
    selectedTenantSummary?.plan_enabled_modules ||
    null;
  const selectedTenantActivationSourceLabel = getTenantActivationSourceLabel(
    selectedTenantSummary?.effective_activation_source || null,
    language
  );

  const defaultBasePlanCatalog = useMemo(
    () =>
      capabilities?.base_plan_catalog.find((entry) => entry.is_default) ||
      capabilities?.base_plan_catalog[0] ||
      null,
    [capabilities?.base_plan_catalog]
  );

  const selectedCreateBasePlanCatalog =
    (createTenantBasePlanCode
      ? capabilities?.base_plan_catalog.find(
          (entry) => entry.plan_code === createTenantBasePlanCode
        ) || null
      : null) || defaultBasePlanCatalog;

  const rentableModuleCatalog = useMemo(
    () =>
      (capabilities?.module_subscription_catalog || []).filter(
        (entry) => entry.activation_kind === "addon"
      ),
    [capabilities?.module_subscription_catalog]
  );

  useEffect(() => {
    if (!createTenantBasePlanCode && defaultBasePlanCatalog?.plan_code) {
      setCreateTenantBasePlanCode(defaultBasePlanCatalog.plan_code);
    }
  }, [createTenantBasePlanCode, defaultBasePlanCatalog?.plan_code]);

  const selectedTenantContractItems = useMemo(
    () =>
      new Map(
        (selectedTenantSummary?.subscription_items || []).map((item) => [
          item.module_key,
          item,
        ])
      ),
    [selectedTenantSummary?.subscription_items]
  );

  const selectedCreatePlanDependencyStatus = useMemo(
    () =>
      buildTenantPlanDependencyStatus(
        selectedCreateBasePlanCatalog?.included_modules || null,
        capabilities?.module_dependency_catalog || []
      ),
    [capabilities?.module_dependency_catalog, selectedCreateBasePlanCatalog?.included_modules]
  );

  const selectedTenantPlanDependencyStatus = useMemo(
    () =>
      buildTenantPlanDependencyStatus(
        planCode ? planCatalogByCode.get(planCode)?.enabled_modules || null : null,
        capabilities?.module_dependency_catalog || []
      ),
    [capabilities?.module_dependency_catalog, planCatalogByCode, planCode]
  );

  const selectedTenantSubscriptionDependencyStatus = useMemo(() => {
    const includedModules = defaultBasePlanCatalog?.included_modules || [];
    const selectedAddons = rentableModuleCatalog
      .filter((entry) => subscriptionAddonSelections[entry.module_key])
      .map((entry) => entry.module_key);
    return buildTenantPlanDependencyStatus(
      [...includedModules, ...selectedAddons],
      capabilities?.module_dependency_catalog || []
    );
  }, [
    capabilities?.module_dependency_catalog,
    defaultBasePlanCatalog?.included_modules,
    rentableModuleCatalog,
    subscriptionAddonSelections,
  ]);

  const selectedTenantSubscriptionAddons = useMemo(
    () =>
      rentableModuleCatalog
        .filter((entry) => subscriptionAddonSelections[entry.module_key])
        .map((entry) => entry.module_key),
    [rentableModuleCatalog, subscriptionAddonSelections]
  );

  const selectedTenantSubscriptionTechnicalPreview = useMemo(() => {
    const technicalModules = new Set<string>();
    selectedTenantSubscriptionDependencyStatus.missing.forEach((entry) => {
      entry.requires_modules.forEach((moduleKey) => technicalModules.add(moduleKey));
    });
    return Array.from(technicalModules);
  }, [selectedTenantSubscriptionDependencyStatus.missing]);

  const moduleLimitCapabilityMap = useMemo(
    () =>
      new Map(
        (capabilities?.module_limit_capabilities || []).map((capability) => [
          capability.key,
          capability,
        ])
      ),
    [capabilities?.module_limit_capabilities]
  );

  const moduleLimitKeys = useMemo(() => {
    const keys = new Set<string>(capabilities?.supported_module_limit_keys || []);

    Object.keys(selectedTenantSummary?.plan_module_limits || {}).forEach((key) =>
      keys.add(key)
    );
    Object.keys(selectedTenantSummary?.module_limits || {}).forEach((key) =>
      keys.add(key)
    );
    (moduleUsage?.data || []).forEach((item) => keys.add(item.module_key));

    return Array.from(keys).sort();
  }, [
    capabilities?.supported_module_limit_keys,
    moduleUsage?.data,
    selectedTenantSummary?.module_limits,
    selectedTenantSummary?.plan_module_limits,
  ]);

  const tenantPortalHref = useMemo(() => {
    if (!selectedTenantSummary) {
      return null;
    }
    const searchParams = new URLSearchParams({
      tenantSlug: selectedTenantSummary.slug,
    });
    if (tenantPortalResetEmail) {
      searchParams.set("email", tenantPortalResetEmail);
    }
    return `/tenant-portal/login?${searchParams.toString()}`;
  }, [selectedTenantSummary, tenantPortalResetEmail]);

  const canOpenTenantPortal = useMemo(() => {
    if (!selectedTenantSummary) {
      return false;
    }

    if (selectedTenantSummary.status !== "active") {
      return false;
    }

    if (!selectedTenantSummary.db_configured) {
      return false;
    }

    if (
      selectedProvisioningJob &&
      selectedProvisioningJob.status !== "completed"
    ) {
      return false;
    }

    return true;
  }, [selectedProvisioningJob, selectedTenantSummary]);

  const tenantOperationalPosture = useMemo(
    () =>
      getTenantOperationalPosture({
        language,
        tenant: selectedTenantSummary,
        accessPolicy,
        selectedProvisioningJob,
        schemaStatus,
        schemaStatusError,
        moduleUsageAvailabilityReason,
        moduleUsageError,
        canOpenTenantPortal,
      }),
    [
      accessPolicy,
      canOpenTenantPortal,
      language,
      moduleUsageAvailabilityReason,
      moduleUsageError,
      schemaStatus,
      schemaStatusError,
      selectedProvisioningJob,
      selectedTenantSummary,
    ]
  );

  const tenantProvisioningAlertContext = useMemo(
    () =>
      getTenantProvisioningAlertContext({
        language,
        tenantSlug: selectedTenantSummary?.slug || null,
        provisioningAlerts,
        provisioningAlertsError,
      }),
    [language, provisioningAlerts, provisioningAlertsError, selectedTenantSummary?.slug]
  );

  const tenantOperationalSummaryCards = useMemo(
    () =>
      getTenantOperationalSummaryCards(
        language,
        tenantOperationalPosture,
        tenantProvisioningAlertContext
      ),
    [language, tenantOperationalPosture, tenantProvisioningAlertContext]
  );

  const latestCompletedExportJob = useMemo(
    () =>
      dataExportJobs.find(
        (job) =>
          job.direction === "export" &&
          job.status === "completed" &&
          (job.artifacts?.length || 0) > 0
      ) || null,
    [dataExportJobs]
  );

  async function loadCapabilities() {
    if (!session?.accessToken) {
      return;
    }
    const response = await getPlatformCapabilities(session.accessToken);
    setCapabilities(response);
  }

  async function loadTenantsCatalog() {
    if (!session?.accessToken) {
      return;
    }

    setIsListLoading(true);
    setListError(null);
    try {
      const response = await listPlatformTenants(session.accessToken);
      setTenants(response.data);
      setSelectedTenantId((current) => {
        if (response.data.length === 0) {
          return null;
        }
        if (current && response.data.some((tenant) => tenant.id === current)) {
          return current;
        }
        return response.data[0].id;
      });
    } catch (rawError) {
      setListError(rawError as ApiError);
    } finally {
      setIsListLoading(false);
    }
  }

  async function loadRetirementArchives() {
    if (!session?.accessToken) {
      return;
    }

    setIsRetirementArchivesLoading(true);
    setRetirementArchivesError(null);
    try {
      const response = await listPlatformTenantRetirementArchives(
        session.accessToken,
        { limit: 100 }
      );
      setRetirementArchives(response.data);
      const hasSelectedArchive =
        selectedRetirementArchiveId !== null &&
        response.data.some((archive) => archive.id === selectedRetirementArchiveId);
      if (hasSelectedArchive && selectedRetirementArchiveId !== null) {
        await loadRetirementArchiveDetail(selectedRetirementArchiveId);
      } else {
        setSelectedRetirementArchiveId(null);
        setSelectedRetirementArchive(null);
        setSelectedRetirementSummary(null);
        setRetirementArchiveDetailError(null);
      }
    } catch (rawError) {
      setRetirementArchivesError(rawError as ApiError);
      setRetirementArchives([]);
      setSelectedRetirementArchiveId(null);
      setSelectedRetirementArchive(null);
      setSelectedRetirementSummary(null);
    } finally {
      setIsRetirementArchivesLoading(false);
    }
  }

  async function loadRetirementArchiveDetail(archiveId: number) {
    if (!session?.accessToken) {
      return;
    }

    setIsRetirementArchiveDetailLoading(true);
    setRetirementArchiveDetailError(null);
    try {
      const response = await getPlatformTenantRetirementArchive(
        session.accessToken,
        archiveId
      );
      setSelectedRetirementArchive(response.data);
      setSelectedRetirementSummary(response.summary);
    } catch (rawError) {
      setSelectedRetirementArchive(null);
      setSelectedRetirementSummary(null);
      setRetirementArchiveDetailError(rawError as ApiError);
    } finally {
      setIsRetirementArchiveDetailLoading(false);
    }
  }

  async function loadTenantWorkspace(tenantId: number) {
    if (!session?.accessToken) {
      return;
    }

    setIsDetailLoading(true);
    setDetailError(null);
    setModuleUsageError(null);
    setModuleUsageNotice(null);
    setModuleUsageAvailabilityReason(null);
    setPolicyHistoryError(null);
    setDataExportJobsError(null);
    setDataImportJobsError(null);
    setProvisioningJobError(null);
    setProvisioningAlertsError(null);
    setSchemaStatusError(null);
    setSelectedTenant(null);
    setAccessPolicy(null);
    setModuleUsage(null);
    setSchemaStatus(null);
    setPolicyHistory([]);
    setProvisioningAlerts(null);
    setDataExportJobs([]);
    setDataImportJobs([]);
    setSelectedProvisioningJob(null);
    setTenantPortalUsers([]);
    let tenantStatus: string | null = null;
    let tenantDbConfigured = false;

    try {
      const [tenantResponse, accessPolicyResponse] = await Promise.all([
        getPlatformTenant(session.accessToken, tenantId),
        getPlatformTenantAccessPolicy(session.accessToken, tenantId),
      ]);
      setSelectedTenant(tenantResponse);
      setAccessPolicy(accessPolicyResponse);
      tenantStatus = tenantResponse.status;
      tenantDbConfigured = tenantResponse.db_configured;

      if (tenantResponse.db_configured) {
        try {
          const schemaStatusResponse = await getPlatformTenantSchemaStatus(
            session.accessToken,
            tenantId
          );
          setSchemaStatus(schemaStatusResponse);
          setSelectedTenant((current) =>
            current
              ? {
                  ...current,
                  tenant_schema_version: schemaStatusResponse.current_version,
                  tenant_schema_synced_at: schemaStatusResponse.last_applied_at,
                }
              : current
          );
        } catch (rawError) {
          setSchemaStatus(null);
          setSchemaStatusError(rawError as ApiError);
        }
      }

      if (tenantResponse.status !== "active") {
        setModuleUsage(null);
        setModuleUsageAvailabilityReason("tenant-inactive");
        setModuleUsageNotice(
          language === "es"
            ? "El uso por módulo estará disponible cuando el tenant esté activo y su base tenant quede provisionada."
            : "Module usage will be available once the tenant is active and its tenant database is provisioned."
        );
      }
    } catch (rawError) {
      setDetailError(rawError as ApiError);
      setIsDetailLoading(false);
      return;
    }

    try {
      if (tenantStatus !== "active") {
        setModuleUsage(null);
      } else {
        const usageResponse = await getPlatformTenantModuleUsage(
          session.accessToken,
          tenantId
        );
        setModuleUsage(usageResponse);
        setModuleUsageAvailabilityReason(null);
      }
    } catch (rawError) {
      const typedError = rawError as ApiError;
      setModuleUsage(null);
      if (
        typedError.payload?.detail === "Tenant database configuration is incomplete"
      ) {
        setModuleUsageAvailabilityReason("db-incomplete");
        setModuleUsageNotice(
          language === "es"
            ? "El tenant todavía no tiene completa su configuración de base de datos, por eso el uso por módulo no está disponible."
            : "The tenant database configuration is still incomplete, so module usage is not available yet."
        );
      } else if (
        typedError.payload?.detail ===
        "Tenant schema is incomplete. Run tenant schema sync or tenant migrations before requesting module usage."
      ) {
        setModuleUsageAvailabilityReason("schema-incomplete");
        setModuleUsageNotice(
          language === "es"
            ? "La base tenant existe, pero su esquema está incompleto. Debes sincronizar migraciones tenant antes de ver el uso por módulo."
            : "The tenant database exists, but its schema is incomplete. Run tenant migrations or tenant schema sync before viewing module usage."
        );
      } else if (
        typedError.payload?.detail ===
        "Tenant database access failed. Rotate or reprovision tenant DB credentials before requesting module usage."
      ) {
        setModuleUsageAvailabilityReason("db-credentials-invalid");
        setModuleUsageNotice(
          language === "es"
            ? "La base tenant no aceptó la credencial técnica actual. Debes rotar o reprovisionar las credenciales de la base tenant antes de ver el uso por módulo."
            : "The tenant database rejected the current technical credential. Rotate or reprovision the tenant DB credentials before viewing module usage."
        );
      } else {
        setModuleUsageAvailabilityReason(null);
        setModuleUsageError(typedError);
      }
    }

    try {
      const historyResponse = await getPlatformTenantPolicyHistory(
        session.accessToken,
        tenantId,
        { limit: 10 }
      );
      setPolicyHistory(historyResponse.data);
    } catch (rawError) {
      setPolicyHistory([]);
      setPolicyHistoryError(rawError as ApiError);
    }

    try {
      setIsDataExportJobsLoading(true);
      const exportJobsResponse = await listPlatformTenantDataExportJobs(
        session.accessToken,
        tenantId,
        { limit: 5 }
      );
      setDataExportJobs(exportJobsResponse.data);
    } catch (rawError) {
      setDataExportJobs([]);
      setDataExportJobsError(rawError as ApiError);
    } finally {
      setIsDataExportJobsLoading(false);
    }

    try {
      setIsDataImportJobsLoading(true);
      const importJobsResponse = await listPlatformTenantDataImportJobs(
        session.accessToken,
        tenantId,
        { limit: 5 }
      );
      setDataImportJobs(importJobsResponse.data);
    } catch (rawError) {
      setDataImportJobs([]);
      setDataImportJobsError(rawError as ApiError);
    } finally {
      setIsDataImportJobsLoading(false);
    }

    const [provisioningJobsResult, provisioningAlertsResult] =
      await Promise.allSettled([
        listProvisioningJobs(session.accessToken),
        getProvisioningAlerts(session.accessToken),
      ]);

    if (provisioningJobsResult.status === "fulfilled") {
      setSelectedProvisioningJob(
        selectLatestProvisioningJob(provisioningJobsResult.value, tenantId)
      );
    } else {
      setSelectedProvisioningJob(null);
      setProvisioningJobError(provisioningJobsResult.reason as ApiError);
    }

    if (provisioningAlertsResult.status === "fulfilled") {
      setProvisioningAlerts(provisioningAlertsResult.value);
    } else {
      setProvisioningAlerts(null);
      setProvisioningAlertsError(provisioningAlertsResult.reason as ApiError);
    }

    if (tenantDbConfigured) {
      try {
        const tenantUsersResponse = await listPlatformTenantUsers(
          session.accessToken,
          tenantId
        );
        setTenantPortalUsers(tenantUsersResponse.data);
      } catch (_rawError) {
        setTenantPortalUsers([]);
      }
    } else {
      setTenantPortalUsers([]);
    }

    setIsDetailLoading(false);
  }

  async function reloadSelectedTenantWorkspace() {
    if (selectedTenantId === null) {
      await loadTenantsCatalog();
      return;
    }
    await loadTenantsCatalog();
    await loadTenantWorkspace(selectedTenantId);
  }

  useEffect(() => {
    if (!session?.accessToken) {
      return;
    }
    void loadCapabilities();
    void loadTenantsCatalog();
  }, [session?.accessToken]);

  useEffect(() => {
    if (!session?.accessToken || selectedTenantId === null) {
      setSelectedTenant(null);
      setAccessPolicy(null);
      setModuleUsage(null);
      return;
    }
    void loadTenantWorkspace(selectedTenantId);
  }, [selectedTenantId, session?.accessToken]);

  useEffect(() => {
    if (!selectedTenantSummary) {
      return;
    }
    setStatusValue(selectedTenantSummary.status);
    setStatusReason(selectedTenantSummary.status_reason || "");
    setBillingStatus(selectedTenantSummary.billing_status || "");
    setBillingReason(selectedTenantSummary.billing_status_reason || "");
    setBillingCurrentPeriodEndsAt(
      toDateTimeLocalInput(selectedTenantSummary.billing_current_period_ends_at)
    );
    setBillingGraceUntil(
      toDateTimeLocalInput(selectedTenantSummary.billing_grace_until)
    );
    setMaintenanceMode(selectedTenantSummary.maintenance_mode);
    setMaintenanceStartsAt(
      toDateTimeLocalInput(selectedTenantSummary.maintenance_starts_at)
    );
    setMaintenanceEndsAt(
      toDateTimeLocalInput(selectedTenantSummary.maintenance_ends_at)
    );
    setMaintenanceReason(selectedTenantSummary.maintenance_reason || "");
    setMaintenanceScopes(selectedTenantSummary.maintenance_scopes || ["all"]);
    setMaintenanceAccessMode(selectedTenantSummary.maintenance_access_mode);
    setPlanCode(
      selectedTenantSummary.legacy_plan_fallback_active
        ? selectedTenantSummary.plan_code || ""
        : ""
    );
    setSubscriptionBasePlanCode(
      selectedTenantSummary.subscription_base_plan_code ||
        defaultBasePlanCatalog?.plan_code ||
        ""
    );
    setSubscriptionBillingCycle(
      selectedTenantSummary.subscription_billing_cycle ||
        defaultBasePlanCatalog?.default_billing_cycle ||
        "monthly"
    );
    setSubscriptionAddonSelections(
      Object.fromEntries(
        rentableModuleCatalog.map((entry) => {
          const existingItem = (selectedTenantSummary.subscription_items || []).find(
            (item) => item.module_key === entry.module_key
          );
          return [
            entry.module_key,
            Boolean(
              existingItem &&
                ["active", "scheduled_cancel", "grace_period", "pending_activation"].includes(
                  existingItem.status
                )
            ),
          ];
        })
      )
    );
    setSubscriptionAddonBillingCycles(
      Object.fromEntries(
        rentableModuleCatalog.map((entry) => {
          const existingItem = (selectedTenantSummary.subscription_items || []).find(
            (item) => item.module_key === entry.module_key
          );
          return [
            entry.module_key,
            existingItem?.billing_cycle ||
              entry.billing_cycles[0] ||
              selectedTenantSummary.subscription_billing_cycle ||
              "monthly",
          ];
        })
      )
    );
    setReadRateLimit(
      selectedTenantSummary.api_read_requests_per_minute === null
        ? ""
        : String(selectedTenantSummary.api_read_requests_per_minute)
    );
    setWriteRateLimit(
      selectedTenantSummary.api_write_requests_per_minute === null
        ? ""
        : String(selectedTenantSummary.api_write_requests_per_minute)
    );
    setBillingProvider(selectedTenantSummary.billing_provider || "");
    setBillingProviderCustomerId(
      selectedTenantSummary.billing_provider_customer_id || ""
    );
    setBillingProviderSubscriptionId(
      selectedTenantSummary.billing_provider_subscription_id || ""
    );
    setTenantPortalResetEmail("");
    setTenantPortalResetPassword("");
    setIdentityName(selectedTenantSummary.name);
    setIdentityTenantType(selectedTenantSummary.tenant_type);
    setRestoreTargetStatus("active");
    setRestoreReason("");
    const nextDrafts = Object.fromEntries(
      moduleLimitKeys.map((key) => {
        const value = selectedTenantSummary.module_limits?.[key];
        return [key, value === undefined || value === null ? "" : String(value)];
      })
    );
    setModuleLimitDrafts(nextDrafts);
    setActionFeedback(null);
  }, [
    defaultBasePlanCatalog?.default_billing_cycle,
    defaultBasePlanCatalog?.plan_code,
    moduleLimitKeys,
    rentableModuleCatalog,
    selectedTenantSummary,
  ]);

  useEffect(() => {
    if (tenantPortalUsers.length === 0) {
      setTenantPortalResetEmail("");
      return;
    }

    if (
      tenantPortalResetEmail &&
      tenantPortalUsers.some((user) => user.email === tenantPortalResetEmail)
    ) {
      return;
    }

    const preferredUser =
      tenantPortalUsers.find((user) => user.is_active && user.role === "admin") ||
      tenantPortalUsers.find((user) => user.is_active && user.role === "manager") ||
      tenantPortalUsers.find((user) => user.is_active && user.role === "user") ||
      tenantPortalUsers[0];

    setTenantPortalResetEmail(preferredUser?.email || "");
  }, [tenantPortalResetEmail, tenantPortalUsers]);

  async function runAction(
    scope: string,
    action: () => Promise<{
      afterSuccess?: () => Promise<void> | void;
      details?: string[];
      message: string;
    }>
  ) {
    setIsActionSubmitting(true);
    setActionFeedback(null);

    try {
      const result = await action();
      if (result.afterSuccess) {
        await result.afterSuccess();
      } else {
        await reloadSelectedTenantWorkspace();
      }
      setActionFeedback({
        details: result.details,
        scope,
        type: "success",
        message: getPlatformActionSuccessMessage(scope, result.message),
      });
    } catch (rawError) {
      const typedError = rawError as ApiError;
      setActionFeedback({
        scope,
        type: "error",
        message: getApiErrorDisplayMessage(typedError),
      });
    } finally {
      setIsActionSubmitting(false);
    }
  }

  function requestConfirmation(confirmation: PendingConfirmation) {
    setPendingConfirmation(confirmation);
  }

  async function handleConfirmAction() {
    if (!pendingConfirmation) {
      return;
    }
    const confirmation = pendingConfirmation;
    setPendingConfirmation(null);
    await runAction(confirmation.scope, confirmation.action);
  }

  async function handleCreateTenantSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.accessToken) {
      return;
    }

    setIsActionSubmitting(true);
    setActionFeedback(null);

    try {
      const createdTenant = await createPlatformTenant(session.accessToken, {
        name: createTenantName.trim(),
        slug: createTenantSlug.trim(),
        tenant_type: createTenantType,
        base_plan_code: normalizeNullableString(createTenantBasePlanCode),
        admin_full_name: createTenantAdminFullName.trim(),
        admin_email: createTenantAdminEmail.trim().toLowerCase(),
        admin_password: createTenantAdminPassword,
      });
      await loadTenantsCatalog();
      setSelectedTenantId(createdTenant.id);
      await loadTenantWorkspace(createdTenant.id);
      setCreateTenantName("");
      setCreateTenantSlug("");
      setCreateTenantSlugTouched(false);
      setCreateTenantType("empresa");
      setCreateTenantBasePlanCode(defaultBasePlanCatalog?.plan_code || "");
      setCreateTenantAdminFullName("");
      setCreateTenantAdminEmail("");
      setCreateTenantAdminPassword("");
      setCreateTenantAdminPasswordConfirm("");
      setIsCreateTenantModalOpen(false);
      setActionFeedback({
        scope: "create-tenant",
        type: "success",
        message: getPlatformActionSuccessMessage("create-tenant"),
      });
    } catch (rawError) {
      const typedError = rawError as ApiError;
      setActionFeedback({
        scope: "create-tenant",
        type: "error",
        message: getApiErrorDisplayMessage(typedError),
      });
    } finally {
      setIsActionSubmitting(false);
    }
  }

  function closeCreateTenantModal() {
    if (isActionSubmitting) {
      return;
    }
    setIsCreateTenantModalOpen(false);
    setCreateTenantName("");
    setCreateTenantSlug("");
    setCreateTenantSlugTouched(false);
    setCreateTenantType("empresa");
    setCreateTenantBasePlanCode(defaultBasePlanCatalog?.plan_code || "");
    setCreateTenantAdminFullName("");
    setCreateTenantAdminEmail("");
    setCreateTenantAdminPassword("");
    setCreateTenantAdminPasswordConfirm("");
  }

  function handleIdentitySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.accessToken || selectedTenantId === null) {
      return;
    }

    requestConfirmation({
      scope: "identity-tenant",
      title:
        language === "es"
          ? "Confirmar actualización de identidad básica"
          : "Confirm basic identity update",
      description:
        language === "es"
          ? "Esta acción actualiza el nombre visible y el tipo operativo del tenant. El slug se mantiene estable."
          : "This action updates the tenant visible name and operational type. The slug remains stable.",
      details: [
        `${
          language === "es" ? "Tenant actual" : "Current tenant"
        }: ${selectedTenantSummary?.name || "n/a"}`,
        `${language === "es" ? "Nuevo nombre" : "New name"}: ${identityName.trim() || "n/a"}`,
        `${language === "es" ? "Tipo actual" : "Current type"}: ${selectedTenantSummary?.tenant_type || "n/a"}`,
        `${language === "es" ? "Nuevo tipo" : "New type"}: ${identityTenantType || "n/a"}`,
        `${language === "es" ? "Slug estable" : "Stable slug"}: ${selectedTenantSummary?.slug || "n/a"}`,
      ],
      confirmLabel: language === "es" ? "Actualizar identidad" : "Update identity",
      action: () =>
        updatePlatformTenantIdentity(session.accessToken, selectedTenantId, {
          name: identityName.trim(),
          tenant_type: identityTenantType,
        }),
    });
  }

  function handleStatusSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.accessToken || selectedTenantId === null) {
      return;
    }
    requestConfirmation({
      scope: "status",
      title: language === "es" ? "Confirmar cambio de estado tenant" : "Confirm tenant status change",
      description:
        language === "es"
          ? "Este cambio modifica el lifecycle efectivo del tenant y puede afectar su acceso operativo."
          : "This change modifies the tenant effective lifecycle and may affect its operational access.",
      details: [
        `Tenant: ${selectedTenantSummary?.name || "n/a"}`,
        `${language === "es" ? "Estado actual" : "Current status"}: ${selectedTenantSummary?.status || "n/a"}`,
        `${language === "es" ? "Nuevo estado" : "New status"}: ${statusValue || "n/a"}`,
        `${language === "es" ? "Motivo" : "Reason"}: ${normalizeNullableString(statusReason) || (language === "es" ? "sin motivo" : "no reason")}`,
      ],
      confirmLabel: language === "es" ? "Aplicar cambio" : "Apply change",
      tone:
        statusValue === "suspended" || statusValue === "archived" ? "danger" : "warning",
      action: () =>
        updatePlatformTenantStatus(session.accessToken, selectedTenantId, {
          status: statusValue,
          status_reason: normalizeNullableString(statusReason),
        }),
    });
  }

  function handleMaintenanceSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.accessToken || selectedTenantId === null) {
      return;
    }
    requestConfirmation({
      scope: "maintenance",
      title: language === "es" ? "Confirmar actualización de mantenimiento" : "Confirm maintenance update",
      description:
        language === "es"
          ? "Esta acción puede bloquear escritura o acceso total según el modo configurado."
          : "This action may block writes or full access depending on the configured mode.",
      details: [
        `Tenant: ${selectedTenantSummary?.name || "n/a"}`,
        `${language === "es" ? "Modo manual" : "Manual mode"}: ${
          maintenanceMode
            ? language === "es"
              ? "habilitado"
              : "enabled"
            : language === "es"
              ? "deshabilitado"
              : "disabled"
        }`,
        `${language === "es" ? "Modo de acceso" : "Access mode"}: ${maintenanceAccessMode}`,
        `Scopes: ${
          maintenanceScopes.length > 0
            ? normalizeScopes(maintenanceScopes).join(", ")
            : language === "es"
              ? "ninguno"
              : "none"
        }`,
        `${language === "es" ? "Ventana" : "Window"}: ${
          maintenanceStartsAt || (language === "es" ? "sin inicio" : "no start")
        } -> ${maintenanceEndsAt || (language === "es" ? "sin fin" : "no end")}`,
      ],
      confirmLabel: language === "es" ? "Actualizar mantenimiento" : "Update maintenance",
      tone: maintenanceMode ? "danger" : "warning",
      action: () =>
        updatePlatformTenantMaintenance(session.accessToken, selectedTenantId, {
          maintenance_mode: maintenanceMode,
          maintenance_starts_at: toApiDateTime(maintenanceStartsAt),
          maintenance_ends_at: toApiDateTime(maintenanceEndsAt),
          maintenance_reason: normalizeNullableString(maintenanceReason),
          maintenance_scopes:
            maintenanceScopes.length === 0 ? null : normalizeScopes(maintenanceScopes),
          maintenance_access_mode: maintenanceAccessMode,
        }),
    });
  }

  function handleBillingSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.accessToken || selectedTenantId === null) {
      return;
    }
    requestConfirmation({
      scope: "billing",
      title: language === "es" ? "Confirmar actualización de facturación" : "Confirm billing update",
      description:
        language === "es"
          ? "Este cambio impacta la política de acceso y la lectura operativa del tenant."
          : "This change affects the tenant access policy and operational read.",
      details: [
        `Tenant: ${selectedTenantSummary?.name || "n/a"}`,
        `${language === "es" ? "Estado billing actual" : "Current billing status"}: ${
          selectedTenantSummary?.billing_status || (language === "es" ? "ninguno" : "none")
        }`,
        `${language === "es" ? "Nuevo estado billing" : "New billing status"}: ${
          normalizeNullableString(billingStatus) || (language === "es" ? "ninguno" : "none")
        }`,
        `${language === "es" ? "Gracia hasta" : "Grace until"}: ${
          billingGraceUntil || (language === "es" ? "sin fecha" : "no date")
        }`,
      ],
      confirmLabel: language === "es" ? "Actualizar facturación" : "Update billing",
      tone:
        billingStatus === "suspended" || billingStatus === "canceled" ? "danger" : "warning",
      action: () =>
        updatePlatformTenantBilling(session.accessToken, selectedTenantId, {
          billing_status: normalizeNullableString(billingStatus),
          billing_status_reason: normalizeNullableString(billingReason),
          billing_current_period_ends_at: toApiDateTime(billingCurrentPeriodEndsAt),
          billing_grace_until: toApiDateTime(billingGraceUntil),
        }),
    });
  }

  function handlePlanSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.accessToken || selectedTenantId === null) {
      return;
    }
    requestConfirmation({
      scope: "plan",
      title: language === "es" ? "Confirmar cambio de plan" : "Confirm plan change",
      description:
        language === "es"
          ? "El plan puede alterar módulos habilitados, límites y políticas derivadas del tenant."
          : "The plan may alter enabled modules, limits and derived tenant policies.",
      details: [
        `Tenant: ${selectedTenantSummary?.name || "n/a"}`,
        `${language === "es" ? "Plan actual" : "Current plan"}: ${
          selectedTenantSummary?.legacy_plan_fallback_active
            ? selectedTenantSummary?.plan_code || (language === "es" ? "sin plan" : "no plan")
            : language === "es"
              ? "sin baseline legacy"
              : "no legacy baseline"
        }`,
        `${language === "es" ? "Nuevo plan" : "New plan"}: ${
          normalizeNullableString(planCode) || (language === "es" ? "sin plan" : "no plan")
        }`,
      ],
      confirmLabel: language === "es" ? "Actualizar plan" : "Update plan",
      action: () =>
        updatePlatformTenantPlan(session.accessToken, selectedTenantId, {
          plan_code: normalizeNullableString(planCode),
        }),
    });
  }

  function handleSubscriptionContractSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.accessToken || selectedTenantId === null) {
      return;
    }

    const selectedAddonItems = rentableModuleCatalog
      .filter((entry) => subscriptionAddonSelections[entry.module_key])
      .map((entry) => ({
        module_key: entry.module_key,
        billing_cycle:
          subscriptionAddonBillingCycles[entry.module_key] ||
          entry.billing_cycles[0] ||
          subscriptionBillingCycle,
      }));

    requestConfirmation({
      scope: "subscription-contract",
      title:
        language === "es"
          ? "Confirmar contratación de add-ons"
          : "Confirm add-on contracting",
      description:
        language === "es"
          ? "Se actualizará la suscripción comercial del tenant sobre `tenant_subscriptions` y `tenant_subscription_items`."
          : "The tenant commercial subscription will be updated over `tenant_subscriptions` and `tenant_subscription_items`.",
      details: [
        `Tenant: ${selectedTenantSummary?.name || "n/a"}`,
        `${language === "es" ? "Plan Base" : "Base plan"}: ${
          subscriptionBasePlanCode || "n/a"
        }`,
        `${language === "es" ? "Ciclo base" : "Base cycle"}: ${
          getTenantBillingCycleLabel(subscriptionBillingCycle)
        }`,
        `${language === "es" ? "Add-ons seleccionados" : "Selected add-ons"}: ${
          selectedAddonItems.length
        }`,
      ],
      confirmLabel:
        language === "es" ? "Guardar contratación" : "Save subscription contract",
      action: () =>
        updatePlatformTenantSubscription(session.accessToken, selectedTenantId, {
          base_plan_code: subscriptionBasePlanCode,
          billing_cycle: subscriptionBillingCycle,
          addon_items: selectedAddonItems,
        }),
    });
  }

  function handleMigrateLegacyContract() {
    if (!session?.accessToken || selectedTenantId === null || !selectedTenantSummary) {
      return;
    }
    requestConfirmation({
      scope: "subscription-contract",
      title:
        language === "es"
          ? "Confirmar migración del baseline legacy"
          : "Confirm legacy baseline migration",
      description:
        language === "es"
          ? "Se migrará este tenant al contrato formal `Plan Base + add-ons`, infiriendo add-ons desde el baseline legacy actual y retirando `plan_code`."
          : "This tenant will be migrated to the formal `Base plan + add-ons` contract, inferring add-ons from the current legacy baseline and retiring `plan_code`.",
      details: [
        `Tenant: ${selectedTenantSummary.name || "n/a"}`,
        `${language === "es" ? "Plan legacy actual" : "Current legacy plan"}: ${
          selectedTenantSummary.plan_code ||
            (language === "es" ? "sin baseline legacy" : "no legacy baseline")
        }`,
        `${language === "es" ? "Plan Base resultante" : "Resulting base plan"}: ${
          selectedTenantSummary.subscription_base_plan_code ||
          subscriptionBasePlanCode ||
          defaultBasePlanCatalog?.plan_code ||
          "base_finance"
        }`,
      ],
      confirmLabel:
        language === "es" ? "Migrar baseline legacy" : "Migrate legacy baseline",
      action: () =>
        migratePlatformTenantLegacySubscription(session.accessToken, selectedTenantId),
    });
  }

  function handleRateLimitSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.accessToken || selectedTenantId === null) {
      return;
    }
    requestConfirmation({
      scope: "rate-limit",
      title: language === "es" ? "Confirmar actualización de límites de tasa" : "Confirm rate-limit update",
      description:
        language === "es"
          ? "Estos overrides cambian el throughput efectivo del tenant por sobre el plan o la política global."
          : "These overrides change the tenant effective throughput beyond the plan or global policy.",
      details: [
        `Tenant: ${selectedTenantSummary?.name || "n/a"}`,
        `${language === "es" ? "Lecturas req/min" : "Read req/min"}: ${
          readRateLimit.trim() || (language === "es" ? "heredado" : "inherited")
        }`,
        `${language === "es" ? "Escrituras req/min" : "Write req/min"}: ${
          writeRateLimit.trim() || (language === "es" ? "heredado" : "inherited")
        }`,
      ],
      confirmLabel: language === "es" ? "Actualizar límites" : "Update limits",
      action: () =>
        updatePlatformTenantRateLimits(session.accessToken, selectedTenantId, {
          api_read_requests_per_minute: parseNullableInteger(readRateLimit),
          api_write_requests_per_minute: parseNullableInteger(writeRateLimit),
        }),
    });
  }

  function handleBillingIdentitySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.accessToken || selectedTenantId === null) {
      return;
    }
    requestConfirmation({
      scope: "billing-identity",
      title: language === "es" ? "Confirmar actualización de identidad de billing" : "Confirm billing identity update",
      description:
        language === "es"
          ? "Se actualizarán los identificadores que conectan este tenant con el proveedor de billing."
          : "The identifiers connecting this tenant to the billing provider will be updated.",
      details: [
        `Tenant: ${selectedTenantSummary?.name || "n/a"}`,
        `${language === "es" ? "Proveedor" : "Provider"}: ${
          normalizeNullableString(billingProvider) || (language === "es" ? "ninguno" : "none")
        }`,
        `Customer ID: ${
          normalizeNullableString(billingProviderCustomerId) || (language === "es" ? "vacío" : "empty")
        }`,
        `Subscription ID: ${
          normalizeNullableString(billingProviderSubscriptionId) ||
          (language === "es" ? "vacío" : "empty")
        }`,
      ],
      confirmLabel: language === "es" ? "Actualizar identidad" : "Update identity",
      action: () =>
        updatePlatformTenantBillingIdentity(session.accessToken, selectedTenantId, {
          billing_provider: normalizeNullableString(billingProvider),
          billing_provider_customer_id: normalizeNullableString(
            billingProviderCustomerId
          ),
          billing_provider_subscription_id: normalizeNullableString(
            billingProviderSubscriptionId
          ),
        }),
    });
  }

  function handleModuleLimitsSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.accessToken || selectedTenantId === null) {
      return;
    }

    const payload =
      moduleLimitKeys.length === 0
        ? null
        : Object.fromEntries(
            moduleLimitKeys.map((key) => [key, parseNullableInteger(moduleLimitDrafts[key] || "")])
          );

    requestConfirmation({
      scope: "module-limits",
      title: language === "es" ? "Confirmar actualización de límites por módulo" : "Confirm module-limit update",
      description:
        language === "es"
          ? "Se aplicarán overrides tenant sobre los límites efectivos de módulos y cuotas operativas."
          : "Tenant overrides will be applied over effective module limits and operational quotas.",
      details: [
        `Tenant: ${selectedTenantSummary?.name || "n/a"}`,
        `${language === "es" ? "Claves evaluadas" : "Evaluated keys"}: ${moduleLimitKeys.length}`,
        `${language === "es" ? "Overrides con valor explícito" : "Overrides with explicit value"}: ${
          Object.values(moduleLimitDrafts).filter((value) => value.trim()).length
        }`,
      ],
      confirmLabel: language === "es" ? "Actualizar límites por módulo" : "Update module limits",
      action: () =>
        updatePlatformTenantModuleLimits(session.accessToken, selectedTenantId, {
          module_limits: payload,
        }),
    });
  }

  function requestTenantSchemaSyncConfirmation() {
    if (!session?.accessToken || selectedTenantId === null) {
      return;
    }
    requestConfirmation({
      scope: "sync-schema",
      title:
        language === "es"
          ? "Confirmar sincronización de esquema tenant"
          : "Confirm tenant schema sync",
      description:
        language === "es"
          ? "Se ejecutarán migraciones tenant sobre la base configurada del tenant seleccionado."
          : "Tenant migrations will run against the configured database of the selected tenant.",
      details: [
        `Tenant: ${selectedTenantSummary?.name || "n/a"}`,
        `Slug: ${selectedTenantSummary?.slug || "n/a"}`,
        language === "es"
          ? "Usa esta acción cuando falten tablas o el schema tenant no esté al día."
          : "Use this action when tables are missing or the tenant schema is not up to date.",
      ],
      confirmLabel: language === "es" ? "Sincronizar esquema" : "Sync schema",
      action: () => syncPlatformTenantSchema(session.accessToken, selectedTenantId),
    });
  }

  function handleTenantSchemaSync(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    requestTenantSchemaSyncConfirmation();
  }

  async function handleCreateTenantDataExport() {
    if (!session?.accessToken || selectedTenantId === null || !selectedTenantSummary) {
      return;
    }

    await runAction("tenant-data-export", async () => {
      const job = await createPlatformTenantDataExportJob(
        session.accessToken,
        selectedTenantId,
        {
          export_scope: tenantDataExportScope,
        }
      );

      return {
        message:
          language === "es"
            ? "Export portable generado correctamente"
            : "Portable export generated successfully",
        afterSuccess: async () => {
          await reloadSelectedTenantWorkspace();
          if (job.status === "completed" && job.artifacts.length > 0) {
            await downloadPlatformTenantDataExportJob(
              session.accessToken,
              selectedTenantId,
              job.id
            );
          }
        },
      };
    });
  }

  async function handleDownloadTenantDataExport(jobId: number) {
    if (!session?.accessToken || selectedTenantId === null) {
      return;
    }

    setIsActionSubmitting(true);
    setActionFeedback(null);
    try {
      await downloadPlatformTenantDataExportJob(
        session.accessToken,
        selectedTenantId,
        jobId
      );
      setActionFeedback({
        scope: "tenant-data-export-download",
        type: "success",
        message:
          language === "es"
            ? "Descarga iniciada correctamente."
            : "Download started successfully.",
      });
    } catch (rawError) {
      setActionFeedback({
        scope: "tenant-data-export-download",
        type: "error",
        message: getApiErrorDisplayMessage(rawError as ApiError),
      });
    } finally {
      setIsActionSubmitting(false);
    }
  }

  async function handleCreateTenantDataImport() {
    if (
      !session?.accessToken ||
      selectedTenantId === null ||
      !selectedTenantSummary ||
      !tenantImportFile
    ) {
      return;
    }

    await runAction("tenant-data-import", async () => {
      const job = await createPlatformTenantDataImportJob(
        session.accessToken,
        selectedTenantId,
        {
          file: tenantImportFile,
          dry_run: tenantImportDryRun,
          import_strategy: "skip_existing",
        }
      );

      return {
        message:
          language === "es"
            ? tenantImportDryRun
              ? "Simulación de import ejecutada correctamente"
              : "Import portable aplicado correctamente"
            : tenantImportDryRun
              ? "Import dry run completed successfully"
              : "Portable import applied successfully",
        afterSuccess: async () => {
          setTenantImportFile(null);
          setTenantImportDryRun(true);
          await reloadSelectedTenantWorkspace();
        },
      };
    });
  }

  function handleRunProvisioningJob() {
    if (!session?.accessToken || !selectedProvisioningJob) {
      return;
    }

    requestConfirmation({
      scope: "run-provisioning-job",
      title:
        language === "es"
          ? "Confirmar ejecución del provisioning"
          : "Confirm provisioning run",
      description:
        language === "es"
          ? "Esta acción intenta procesar ahora mismo el job de provisioning visible para este tenant."
          : "This action tries to process the visible provisioning job for this tenant right now.",
      details: [
        `Tenant: ${selectedTenantSummary?.name || "n/a"}`,
        `Job: #${selectedProvisioningJob.id}`,
        `${language === "es" ? "Tipo" : "Type"}: ${formatProvisioningJobType(selectedProvisioningJob.job_type)}`,
        `${language === "es" ? "Estado actual" : "Current status"}: ${displayPlatformCode(selectedProvisioningJob.status, language)}`,
      ],
      confirmLabel: language === "es" ? "Ejecutar ahora" : "Run now",
      action: async () => {
        await runProvisioningJob(session.accessToken, selectedProvisioningJob.id);
        return {
          message:
            language === "es"
              ? "El worker procesó el job seleccionado."
              : "The worker processed the selected job.",
        };
      },
    });
  }

  function handleRequeueProvisioningJob() {
    if (!session?.accessToken || !selectedProvisioningJob) {
      return;
    }

    requestConfirmation({
      scope: "requeue-provisioning-job",
      title:
        language === "es"
          ? "Confirmar nuevo intento de provisioning"
          : "Confirm provisioning retry",
      description:
        language === "es"
          ? "Esta acción vuelve a poner el job en cola para que pueda ejecutarse otra vez."
          : "This action puts the job back in queue so it can run again.",
      details: [
        `Tenant: ${selectedTenantSummary?.name || "n/a"}`,
        `Job: #${selectedProvisioningJob.id}`,
        `${language === "es" ? "Estado actual" : "Current status"}: ${displayPlatformCode(selectedProvisioningJob.status, language)}`,
        `${language === "es" ? "Intentos usados" : "Attempts used"}: ${selectedProvisioningJob.attempts}/${selectedProvisioningJob.max_attempts}`,
      ],
      confirmLabel: language === "es" ? "Reencolar job" : "Requeue job",
      action: async () => {
        await requeueProvisioningJob(session.accessToken, selectedProvisioningJob.id);
        return {
          message:
            language === "es"
              ? "El job quedó reencolado para un nuevo intento."
              : "The job was requeued for a new attempt.",
        };
      },
    });
  }

  function handleReprovisionTenant() {
    if (!session?.accessToken || selectedTenantId === null || !selectedTenantSummary) {
      return;
    }

    requestConfirmation({
      scope: "reprovision-tenant",
      title:
        language === "es"
          ? "Confirmar reprovisionado del tenant"
          : "Confirm tenant reprovisioning",
      description:
        language === "es"
          ? "Esta acción crea un nuevo job para recomponer la base tenant cuando el historial previo quedó completado, pero la configuración DB sigue incompleta."
          : "This action creates a new job to rebuild the tenant database when the previous history completed but DB configuration is still incomplete.",
      details: [
        `Tenant: ${selectedTenantSummary.name}`,
        `Slug: ${selectedTenantSummary.slug}`,
        `${language === "es" ? "Lifecycle actual" : "Current lifecycle"}: ${displayPlatformCode(selectedTenantSummary.status, language)}`,
        language === "es"
          ? "Úsalo cuando el portal tenant siga bloqueado por configuración DB incompleta."
          : "Use it when the tenant portal is still blocked by incomplete DB configuration.",
      ],
      confirmLabel: language === "es" ? "Reprovisionar tenant" : "Reprovision tenant",
      action: async () => {
        await reprovisionPlatformTenant(session.accessToken, selectedTenantId);
        return {
          message:
            language === "es"
              ? "Se creó un nuevo job de provisioning para recomponer la base tenant."
              : "A new provisioning job was created to rebuild the tenant database.",
        };
      },
    });
  }

  function handleRotateTenantDbCredentials() {
    if (!session?.accessToken || selectedTenantId === null || !selectedTenantSummary) {
      return;
    }

    requestConfirmation({
      scope: "rotate-tenant-db-credentials",
      title:
        language === "es"
          ? "Confirmar rotación de credenciales técnicas"
          : "Confirm technical credential rotation",
      description:
        language === "es"
          ? "Esta acción rota la contraseña técnica de la base tenant, valida el nuevo acceso y actualiza el secreto dinámico usado por la plataforma."
          : "This action rotates the tenant database technical password, validates the new access, and updates the dynamic secret used by the platform.",
      details: [
        `Tenant: ${selectedTenantSummary.name}`,
        `Slug: ${selectedTenantSummary.slug}`,
        `${language === "es" ? "DB tenant configurada" : "Tenant DB configured"}: ${selectedTenantSummary.db_configured ? (language === "es" ? "sí" : "yes") : "no"}`,
        language === "es"
          ? "No cambia las credenciales del portal tenant ni las cuentas de usuario final."
          : "It does not change tenant portal credentials or end-user accounts.",
      ],
      confirmLabel: language === "es" ? "Rotar credenciales" : "Rotate credentials",
      action: async () => {
        const response = await rotatePlatformTenantDbCredentials(
          session.accessToken,
          selectedTenantId
        );
        return {
          message:
            language === "es"
              ? "La credencial técnica de la base tenant fue rotada y validada correctamente."
              : "The tenant database technical credential was rotated and validated successfully.",
          details: [
            `${language === "es" ? "Variable actualizada" : "Updated variable"}: ${response.env_var_name}`,
            `${language === "es" ? "Archivo gestionado" : "Managed file"}: /home/felipe/platform_paas/.env`,
            language === "es"
              ? "Esta credencial es técnica para la base tenant. No corresponde a la contraseña del portal tenant."
              : "This credential is technical for the tenant database. It is not the tenant portal password.",
          ],
        };
      },
    });
  }

  async function handleResetTenantPortalPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.accessToken || selectedTenantId === null) {
      return;
    }

    await runAction("reset-tenant-portal-password", async () => {
      const response = await resetPlatformTenantUserPassword(
        session.accessToken,
        selectedTenantId,
        {
          email: tenantPortalResetEmail.trim(),
          new_password: tenantPortalResetPassword,
        }
      );
      setTenantPortalLastResetEmail(tenantPortalResetEmail.trim());
      setTenantPortalLastResetPassword(tenantPortalResetPassword);
      setTenantPortalResetPassword("");
      return {
        message:
          language === "es"
            ? "La contraseña del usuario tenant fue actualizada correctamente."
            : "The tenant user password was updated successfully.",
        details: [
          `${language === "es" ? "Usuario actualizado" : "Updated user"}: ${response.email}`,
          `Tenant: ${response.tenant_slug}`,
          language === "es"
            ? "Esto cambia la contraseña del portal tenant, no la credencial técnica de la base de datos."
            : "This changes the tenant portal password, not the database technical credential.",
        ],
      };
    });
  }

  function handleOpenTenantPortalWithPassword() {
    if (!selectedTenantSummary || !tenantPortalHref) {
      return;
    }
    if (!tenantPortalLastResetEmail || !tenantPortalLastResetPassword) {
      return;
    }

    try {
      sessionStorage.setItem(
        "platform_paas.tenant_portal_prefill",
        JSON.stringify({
          tenantSlug: selectedTenantSummary.slug,
          email: tenantPortalLastResetEmail,
          password: tenantPortalLastResetPassword,
          issuedAt: Date.now(),
        })
      );
    } catch {
      // if storage fails, still allow navigation without prefill
    }

    window.location.assign(tenantPortalHref);
  }

  function handleArchiveTenant() {
    if (!session?.accessToken || selectedTenantId === null || !selectedTenantSummary) {
      return;
    }

    requestConfirmation({
      scope: "archive-tenant",
      title:
        language === "es"
          ? "Confirmar archivo del tenant"
          : "Confirm tenant archive",
      description:
        language === "es"
          ? "Archivar deja al tenant fuera de operación normal sin eliminar su historial, jobs ni referencias técnicas."
          : "Archiving takes the tenant out of normal operation without deleting its history, jobs, or technical references.",
      details: [
        `Tenant: ${selectedTenantSummary.name}`,
        `Slug: ${selectedTenantSummary.slug}`,
        language === "es"
          ? "La reapertura posterior debe hacerse usando el flujo explícito de restauración."
          : "Any later reopening must be done through the explicit restore flow.",
      ],
      confirmLabel: language === "es" ? "Archivar tenant" : "Archive tenant",
      tone: "danger",
      action: () =>
        updatePlatformTenantStatus(session.accessToken, selectedTenantId, {
          status: "archived",
          status_reason:
            normalizeNullableString(statusReason) ||
            (language === "es"
              ? "Archivado desde consola de plataforma"
              : "Archived from the platform console"),
        }),
    });
  }

  function handleRestoreTenantSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.accessToken || selectedTenantId === null || !selectedTenantSummary) {
      return;
    }

    requestConfirmation({
      scope: "restore-tenant",
      title:
        language === "es"
          ? "Confirmar restauración del tenant"
          : "Confirm tenant restore",
      description:
        language === "es"
          ? "Restaurar vuelve a abrir el tenant archivado y lo deja en el lifecycle destino elegido, sin perder historial ni referencias operativas."
          : "Restoring reopens the archived tenant and leaves it in the selected target lifecycle without losing history or operational references.",
      details: [
        `Tenant: ${selectedTenantSummary.name}`,
        `Slug: ${selectedTenantSummary.slug}`,
        `${language === "es" ? "Estado actual" : "Current status"}: ${selectedTenantSummary.status}`,
        `${language === "es" ? "Estado de restauración" : "Restore status"}: ${restoreTargetStatus}`,
        `${language === "es" ? "Motivo" : "Reason"}: ${normalizeNullableString(restoreReason) || (language === "es" ? "sin motivo" : "no reason")}`,
      ],
      confirmLabel: language === "es" ? "Restaurar tenant" : "Restore tenant",
      tone: "warning",
      action: () =>
        restorePlatformTenant(session.accessToken, selectedTenantId, {
          target_status: restoreTargetStatus,
          restore_reason: normalizeNullableString(restoreReason),
        }),
    });
  }

  function handleDeleteTenant() {
    if (!session?.accessToken || selectedTenantId === null || !selectedTenantSummary) {
      return;
    }

    if (!latestCompletedExportJob) {
      setActionFeedback({
        scope: "delete-tenant",
        type: "error",
        message:
          language === "es"
            ? "Antes de eliminar el tenant debes generar un export portable completado del mismo tenant."
            : "Before deleting the tenant you must generate a completed portable export for the same tenant.",
        details: [
          language === "es"
            ? "Usa el bloque `Portabilidad tenant`, espera el job `completed` y luego reintenta el borrado."
            : "Use the `Tenant portability` block, wait for a `completed` job, and retry the deletion.",
        ],
      });
      return;
    }

    const exportJob = latestCompletedExportJob;

    requestConfirmation({
      scope: "delete-tenant",
      title:
        language === "es"
          ? "Confirmar borrado seguro del tenant"
          : "Confirm safe tenant deletion",
      description:
        language === "es"
          ? "Esta acción elimina definitivamente el tenant archivado solo cuando nunca quedó materializada su infraestructura tenant ni su historial comercial."
          : "This action permanently deletes the archived tenant only when its tenant infrastructure and commercial history were never materialized.",
      details: [
        `Tenant: ${selectedTenantSummary.name}`,
        `Slug: ${selectedTenantSummary.slug}`,
        `${
          language === "es" ? "Export portable requerido" : "Required portable export"
        }: #${exportJob.id} · ${exportJob.export_scope}`,
        language === "es"
          ? "El backend rechazará el borrado si ese export portable ya no existe o no pertenece al tenant."
          : "The backend will reject deletion if that portable export no longer exists or does not belong to the tenant.",
      ],
      confirmLabel: language === "es" ? "Eliminar tenant" : "Delete tenant",
      tone: "danger",
      action: async () => {
        await deletePlatformTenant(session.accessToken, selectedTenantId, {
          confirm_tenant_slug: selectedTenantSummary.slug,
          portable_export_job_id: exportJob.id,
        });
        return {
          message:
            language === "es"
              ? "El tenant fue eliminado correctamente."
              : "The tenant was deleted successfully.",
          afterSuccess: async () => {
            setSelectedTenantId(null);
            setSelectedTenant(null);
            setAccessPolicy(null);
            setModuleUsage(null);
            setPolicyHistory([]);
            setSelectedProvisioningJob(null);
            await loadTenantsCatalog();
          },
        };
      },
    });
  }

  function handleDeprovisionTenant() {
    if (!session?.accessToken || selectedTenantId === null || !selectedTenantSummary) {
      return;
    }

    requestConfirmation({
      scope: "deprovision-tenant",
      title:
        language === "es"
          ? "Confirmar desprovisionado del tenant"
          : "Confirm tenant deprovisioning",
      description:
        language === "es"
          ? "Esta acción elimina la base tenant, el rol técnico de PostgreSQL y los secretos técnicos asociados. No equivale a borrar el registro del tenant."
          : "This action removes the tenant database, the PostgreSQL technical role, and associated technical secrets. It does not delete the tenant record.",
      details: [
        `Tenant: ${selectedTenantSummary.name}`,
        `Slug: ${selectedTenantSummary.slug}`,
        language === "es"
          ? "Debe usarse sobre tenants archivados cuando ya no deban conservar infraestructura técnica."
          : "It should be used on archived tenants that should no longer keep technical infrastructure.",
        language === "es"
          ? "Después de desprovisionar, el tenant puede quedar apto para borrado seguro si tampoco tiene historial comercial protegido."
          : "After deprovisioning, the tenant may become eligible for safe deletion if it also has no protected commercial history.",
      ],
      confirmLabel: language === "es" ? "Desprovisionar tenant" : "Deprovision tenant",
      tone: "danger",
      action: async () => {
        const job = await deprovisionPlatformTenant(
          session.accessToken,
          selectedTenantId
        );
        return {
          message:
            language === "es"
              ? "Se creó un job para desprovisionar la infraestructura técnica del tenant."
              : "A job was created to deprovision the tenant technical infrastructure.",
          details: [
            `Job: #${job.id}`,
            `${language === "es" ? "Tipo" : "Type"}: ${formatProvisioningJobType(job.job_type)}`,
            `${language === "es" ? "Estado inicial" : "Initial status"}: ${displayPlatformCode(job.status, language)}`,
            language === "es"
              ? "La ejecución real se procesa por el worker de provisioning o puede lanzarse manualmente desde esta misma ficha."
              : "The actual execution is processed by the provisioning worker or can be launched manually from this same page.",
          ],
        };
      },
    });
  }

  return (
    <div className="d-grid gap-4">
      <ConfirmDialog
        isOpen={pendingConfirmation !== null}
        title={pendingConfirmation?.title || ""}
        description={pendingConfirmation?.description || ""}
        details={pendingConfirmation?.details || []}
        confirmLabel={pendingConfirmation?.confirmLabel || (language === "es" ? "Confirmar" : "Confirm")}
        tone={pendingConfirmation?.tone || "warning"}
        isSubmitting={isActionSubmitting}
        onCancel={() => setPendingConfirmation(null)}
        onConfirm={() => void handleConfirmAction()}
      />

      <PageHeader
        eyebrow={language === "es" ? "Plataforma" : "Platform"}
        icon="tenants"
        title="Tenants"
        description={
          language === "es"
            ? "Vista operativa sobre lifecycle tenant, billing, mantenimiento, política de acceso y uso actual por módulo."
            : "Operational view of tenant lifecycle, billing, maintenance, access policy and current usage by module."
        }
        actions={
          <AppToolbar compact>
            <button
              className="btn btn-primary"
              type="button"
              onClick={() => setIsCreateTenantModalOpen(true)}
            >
              {language === "es" ? "Nuevo tenant" : "New tenant"}
            </button>
            <Link className="btn btn-outline-primary" to="/tenant-history">
              {language === "es" ? "Abrir histórico" : "Open history"}
            </Link>
          </AppToolbar>
        }
      />

      {isCreateTenantModalOpen ? (
        <div
          className="confirm-dialog-backdrop"
          role="presentation"
          onClick={closeCreateTenantModal}
        >
          <div
            className="confirm-dialog platform-admin-form-modal platform-admin-form-modal--wide"
            role="dialog"
            aria-modal="true"
            aria-label={language === "es" ? "Crear tenant" : "Create tenant"}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="platform-admin-form-modal__eyebrow">
              {language === "es" ? "Alta bajo demanda" : "On-demand creation"}
            </div>
            <div className="confirm-dialog__title">
              {language === "es" ? "Crear tenant" : "Create tenant"}
            </div>
            <div className="confirm-dialog__description">
              {language === "es"
                ? "Abre esta captura solo cuando realmente necesites dar de alta un tenant nuevo y disparar provisioning."
                : "Open this form only when you really need to onboard a new tenant and trigger provisioning."}
            </div>
            <AppForm
              className="tenant-action-form tenant-create-form platform-admin-form-modal__form"
              onSubmit={handleCreateTenantSubmit}
            >
              <AppFormField fullWidth>
                <FieldHelpLabel
                  label={language === "es" ? "Nombre visible" : "Display name"}
                  help={
                    language === "es"
                      ? "Nombre con el que el operador reconocerá el tenant en la consola."
                      : "Name the operator will use to recognize the tenant in the console."
                  }
                />
                <input
                  className="form-control"
                  value={createTenantName}
                  onChange={(event) => {
                    const nextName = event.target.value;
                    setCreateTenantName(nextName);
                    if (!createTenantSlugTouched) {
                      setCreateTenantSlug(slugifyTenantName(nextName));
                    }
                  }}
                  placeholder={language === "es" ? "Ej: Empresa Centro" : "Ex: Empresa Centro"}
                  required
                />
              </AppFormField>
              <AppFormField fullWidth>
                <FieldHelpLabel
                  label="Slug"
                  help={
                    language === "es"
                      ? "Identificador estable del tenant. Conviene definirlo bien al inicio porque se usa en portal tenant, bootstrap y referencias técnicas."
                      : "Stable tenant identifier. It is worth defining it well from the start because it is used in the tenant portal, bootstrap and technical references."
                  }
                />
                <input
                  className="form-control"
                  value={createTenantSlug}
                  onChange={(event) => {
                    setCreateTenantSlugTouched(true);
                    setCreateTenantSlug(slugifyTenantName(event.target.value));
                  }}
                  placeholder="empresa-centro"
                  required
                />
              </AppFormField>
              <AppFormField>
                <FieldHelpLabel
                  label={language === "es" ? "Tipo de tenant" : "Tenant type"}
                  help={
                    language === "es"
                      ? "Clasifica el tenant según su vertical principal. Puedes empezar por empresa o condominio. Este tipo también define el catálogo financiero base que se sembrará durante el bootstrap."
                      : "Classify the tenant by its main vertical. You can start with company or condominium. This type also defines the base finance catalog seeded during bootstrap."
                  }
                />
                <select
                  className="form-select"
                  value={createTenantType}
                  onChange={(event) => setCreateTenantType(event.target.value)}
                >
                  {tenantTypeOptions.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </AppFormField>
              <AppFormField>
                <FieldHelpLabel
                  label={language === "es" ? "Plan Base inicial" : "Initial Base plan"}
                  help={
                    language === "es"
                      ? "Todo tenant nuevo nace ya con contrato formal. Aquí eliges el `Plan Base` inicial; el alta ya no depende de `plan_code`."
                      : "Every new tenant now starts with the formal contract. Choose the initial `Base plan` here; tenant creation no longer depends on `plan_code`."
                  }
                />
                <select
                  className="form-select"
                  value={createTenantBasePlanCode}
                  onChange={(event) => setCreateTenantBasePlanCode(event.target.value)}
                >
                  {capabilities?.base_plan_catalog.map((entry) => (
                    <option key={entry.plan_code} value={entry.plan_code}>
                      {entry.display_name}
                    </option>
                  ))}
                </select>
              </AppFormField>
              <div className="app-form-field app-form-field--full">
                <div className="tenant-help-box">
                  <p className="tenant-help-text mb-2">
                    {language === "es"
                      ? "Modelo comercial aprobado para la Etapa 15:"
                      : "Approved commercial model for Stage 15:"}
                  </p>
                  <div className="tenant-scope-list">
                    <div className="tenant-scope-list__item">
                      <strong>{language === "es" ? "Plan Base" : "Base plan"}</strong>:{" "}
                      {defaultBasePlanCatalog
                        ? `${defaultBasePlanCatalog.display_name} · ${defaultBasePlanCatalog.included_modules
                            .map((moduleKey) => getTenantPlanModuleLabel(moduleKey))
                            .join(", ")}`
                        : language === "es"
                          ? "sin catálogo visible"
                          : "no visible catalog"}
                    </div>
                    <div className="tenant-scope-list__item">
                      <strong>{language === "es" ? "Add-ons" : "Add-ons"}</strong>:{" "}
                      {rentableModuleCatalog.length
                        ? rentableModuleCatalog
                            .map((entry) => getTenantPlanModuleLabel(entry.module_key))
                            .join(", ")
                        : "—"}
                    </div>
                    <div className="tenant-scope-list__item">
                      <strong>{language === "es" ? "Ciclos" : "Cycles"}</strong>:{" "}
                      {(capabilities?.subscription_billing_cycles || [])
                        .map((value) => getTenantBillingCycleLabel(value))
                        .join(", ") || "—"}
                    </div>
                  </div>
                </div>
              </div>
              <div className="app-form-field app-form-field--full">
                <FieldHelpLabel
                  label={language === "es" ? "Admin inicial del tenant" : "Initial tenant admin"}
                  help={
                    language === "es"
                      ? "Estas credenciales se usan para bootstrap del primer administrador del portal tenant. Ya no se genera un admin por defecto."
                      : "These credentials bootstrap the first tenant portal administrator. A default admin is no longer generated."
                  }
                />
              </div>
              <AppFormField>
                <FieldHelpLabel
                  label={language === "es" ? "Nombre completo admin" : "Admin full name"}
                  help={
                    language === "es"
                      ? "Nombre visible del primer administrador del tenant."
                      : "Display name for the tenant first administrator."
                  }
                />
                <input
                  className="form-control"
                  value={createTenantAdminFullName}
                  onChange={(event) => setCreateTenantAdminFullName(event.target.value)}
                  placeholder={language === "es" ? "Ej: Ana Pérez" : "Ex: Ana Perez"}
                  required
                />
              </AppFormField>
              <AppFormField>
                <FieldHelpLabel
                  label={language === "es" ? "Correo admin" : "Admin email"}
                  help={
                    language === "es"
                      ? "Correo que usará el primer login del portal tenant."
                      : "Email to be used for the first tenant portal login."
                  }
                />
                <input
                  className="form-control"
                  type="email"
                  value={createTenantAdminEmail}
                  onChange={(event) => setCreateTenantAdminEmail(event.target.value)}
                  placeholder="admin@empresa-centro.local"
                  required
                />
              </AppFormField>
              <AppFormField>
                <FieldHelpLabel
                  label={language === "es" ? "Contraseña admin" : "Admin password"}
                  help={
                    language === "es"
                      ? "Mínimo 10 caracteres. Esta clave ya no se deja fija por defecto."
                      : "At least 10 characters. This password is no longer fixed by default."
                  }
                />
                <input
                  className="form-control"
                  type="password"
                  value={createTenantAdminPassword}
                  onChange={(event) => setCreateTenantAdminPassword(event.target.value)}
                  required
                  minLength={10}
                />
              </AppFormField>
              <AppFormField>
                <FieldHelpLabel
                  label={language === "es" ? "Confirmar contraseña" : "Confirm password"}
                  help={
                    language === "es"
                      ? "Debe coincidir con la contraseña admin."
                      : "Must match the admin password."
                  }
                />
                <input
                  className="form-control"
                  type="password"
                  value={createTenantAdminPasswordConfirm}
                  onChange={(event) =>
                    setCreateTenantAdminPasswordConfirm(event.target.value)
                  }
                  required
                  minLength={10}
                />
              </AppFormField>
              <div className="app-form-field app-form-field--full">
                {selectedCreateBasePlanCatalog ? (
                  <>
                    <p className="tenant-help-text mt-2 mb-2">
                      {language === "es"
                        ? "Módulos incluidos por el Plan Base seleccionado:"
                        : "Modules included by the selected Base plan:"}
                    </p>
                    <div className="tenant-list__chips">
                      {selectedCreateBasePlanCatalog.included_modules.map((moduleKey) => (
                        <span key={moduleKey} className="tenant-chip">
                          {getTenantPlanModuleLabel(moduleKey)}
                        </span>
                      ))}
                    </div>
                    {selectedCreatePlanDependencyStatus.covered.length ? (
                      <>
                        <p className="tenant-help-text mt-3 mb-2">
                          {language === "es"
                            ? "Dependencias cubiertas por este Plan Base:"
                            : "Dependencies covered by this Base plan:"}
                        </p>
                        <div className="tenant-help-box">
                          {selectedCreatePlanDependencyStatus.covered.map((entry) => (
                            <div key={`create-covered-${entry.module_key}`}>
                              <strong>{getTenantPlanModuleLabel(entry.module_key)}</strong>:{" "}
                              {entry.requires_modules
                                .map((moduleKey) => getTenantPlanModuleLabel(moduleKey))
                                .join(", ")}
                            </div>
                          ))}
                        </div>
                      </>
                    ) : null}
                    {selectedCreatePlanDependencyStatus.missing.length ? (
                      <>
                        <p className="tenant-help-text mt-3 mb-2">
                          {language === "es"
                            ? "Dependencias faltantes detectadas en este plan:"
                            : "Missing dependencies detected in this plan:"}
                        </p>
                        <div className="tenant-help-box">
                          {selectedCreatePlanDependencyStatus.missing.map((entry) => (
                            <div key={`create-missing-${entry.module_key}`}>
                              <strong>{getTenantPlanModuleLabel(entry.module_key)}</strong>:{" "}
                              {entry.requires_modules
                                .filter(
                                  (moduleKey) =>
                                    !selectedCreatePlanDependencyStatus.enabledModules.includes(
                                      moduleKey
                                    )
                                )
                                .map((moduleKey) => getTenantPlanModuleLabel(moduleKey))
                                .join(", ")}
                            </div>
                          ))}
                        </div>
                      </>
                    ) : null}
                  </>
                ) : (
                  <p className="tenant-help-text mt-2 mb-0">
                    {language === "es"
                      ? "Si dejas el tenant sin plan, no se activará una política base de módulos desde el alta."
                      : "If you leave the tenant without a plan, no base module policy will be activated during creation."}
                  </p>
                )}
              </div>
              <div className="app-form-field app-form-field--full">
                <p className="tenant-help-text mt-2 mb-0">
                  {language === "es"
                    ? "Al crear el tenant se dispara provisioning para preparar su base tenant y dejar el acceso bootstrap listo con el admin definido arriba."
                    : "Creating the tenant triggers provisioning to prepare its tenant database and leave bootstrap access ready with the admin defined above."}
                </p>
                {!createTenantPasswordsMatch &&
                createTenantAdminPassword.length > 0 &&
                createTenantAdminPasswordConfirm.length > 0 ? (
                  <p className="text-danger mt-2 mb-0">
                    {language === "es"
                      ? "La confirmación de contraseña no coincide."
                      : "Password confirmation does not match."}
                  </p>
                ) : null}
              </div>
              <div className="confirm-dialog__actions">
                <button
                  className="btn btn-outline-primary"
                  type="button"
                  onClick={closeCreateTenantModal}
                  disabled={isActionSubmitting}
                >
                  {language === "es" ? "Cancelar" : "Cancel"}
                </button>
                <button
                  className="btn btn-primary"
                  type="submit"
                  disabled={
                    isActionSubmitting ||
                    !createTenantName.trim() ||
                    !createTenantSlug.trim() ||
                    !createTenantAdminFullName.trim() ||
                    !createTenantAdminEmail.trim() ||
                    !createTenantPasswordsMatch
                  }
                >
                  {language === "es" ? "Crear tenant" : "Create tenant"}
                </button>
              </div>
            </AppForm>
          </div>
        </div>
      ) : null}

      {listError ? (
        <ErrorState
          detail={listError.payload?.detail || listError.message}
          requestId={listError.payload?.request_id}
        />
      ) : null}

      <div className="tenants-page-grid">
        <div className="d-grid gap-4">
          <PanelCard
            title={language === "es" ? "Catálogo de tenants" : "Tenants catalog"}
            subtitle={
              language === "es"
                ? "Busca, filtra y selecciona tenants para entrar a su operación central."
                : "Search, filter and select tenants to enter their central operations."
            }
          >
            <AppFilterGrid className="tenant-catalog-filters">
              <input
                className="form-control"
                value={catalogSearch}
                onChange={(event) => setCatalogSearch(event.target.value)}
                placeholder={
                  language === "es"
                    ? "Buscar por nombre, slug o tipo"
                    : "Search by name, slug or type"
                }
              />
              <select
                className="form-select"
                value={catalogStatusFilter}
                onChange={(event) => setCatalogStatusFilter(event.target.value)}
              >
                <option value="">{language === "es" ? "Todos los estados" : "All statuses"}</option>
                {(capabilities?.tenant_statuses || []).map((value) => (
                  <option key={value} value={value}>
                    {displayPlatformCode(value, language)}
                  </option>
                ))}
              </select>
              <select
                className="form-select"
                value={catalogBillingFilter}
                onChange={(event) => setCatalogBillingFilter(event.target.value)}
              >
                <option value="">{language === "es" ? "Toda la facturación" : "All billing states"}</option>
                {(capabilities?.tenant_billing_statuses || []).map((value) => (
                  <option key={value} value={value}>
                    {displayPlatformCode(value, language)}
                  </option>
                ))}
              </select>
              <select
                className="form-select"
                value={catalogTypeFilter}
                onChange={(event) => setCatalogTypeFilter(event.target.value)}
              >
                <option value="">{language === "es" ? "Todos los tipos" : "All types"}</option>
                {tenantTypeOptions.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </AppFilterGrid>

            {isListLoading ? (
              <LoadingBlock label={language === "es" ? "Cargando tenants..." : "Loading tenants..."} />
            ) : null}

            {!isListLoading && tenants.length === 0 ? (
              <div className="text-secondary">
                {language === "es"
                  ? "Aún no hay tenants creados. Usa el formulario superior para dar de alta el primero y disparar su provisioning inicial."
                  : "There are no tenants yet. Use the form above to create the first one and trigger its initial provisioning."}
              </div>
            ) : null}

            {!isListLoading && tenants.length > 0 && filteredTenants.length === 0 ? (
              <div className="text-secondary">
                {language === "es"
                  ? "No hay tenants que coincidan con los filtros actuales."
                  : "No tenants match the current filters."}
              </div>
            ) : null}

            {filteredTenants.length > 0 ? (
              <>
                <div className="tenant-catalog-summary">
                  {filteredTenants.length} {language === "es" ? "de" : "of"} {tenants.length}{" "}
                  {language === "es" ? "tenants visibles" : "visible tenants"}
                </div>
                <div className="tenant-list">
                  {filteredTenants.map((tenant) => {
                    const isSelected = tenant.id === selectedTenantId;
                    return (
                      <button
                        key={tenant.id}
                        type="button"
                        className={`tenant-list__item${isSelected ? " is-selected" : ""}`}
                        onClick={() => setSelectedTenantId(tenant.id)}
                      >
                        <div className="tenant-list__row">
                          <div>
                            <div className="tenant-list__title">{tenant.name}</div>
                            <div className="tenant-list__meta">
                              <code>{tenant.slug}</code>
                              <span>{tenant.tenant_type}</span>
                            </div>
                          </div>
                          <StatusBadge value={tenant.status} />
                        </div>
                        <div className="tenant-list__chips">
                          <span className="tenant-chip">
                            billing: {displayPlatformCode(tenant.billing_status || "none", language)}
                          </span>
                          <span className="tenant-chip">
                            {tenant.subscription_contract_managed
                              ? `${language === "es" ? "base" : "base"}: ${
                                  tenant.subscription_base_plan_code ||
                                  (language === "es" ? "ninguno" : "none")
                                }`
                              : `${language === "es" ? "base" : "base"}: ${
                                  tenant.plan_code || (language === "es" ? "ninguno" : "none")
                                }`}
                          </span>
                          {tenant.legacy_plan_fallback_active && tenant.plan_code ? (
                            <span className="tenant-chip tenant-chip--warning">
                              legacy: {tenant.plan_code}
                            </span>
                          ) : null}
                          <span className="tenant-chip">
                            {language === "es" ? "modelo" : "model"}:{" "}
                            {getTenantContractManagementLabel(
                              tenant.subscription_contract_managed,
                              tenant.legacy_plan_fallback_active,
                              language
                            )}
                          </span>
                          {tenant.maintenance_mode ? (
                            <span className="tenant-chip tenant-chip--warning">
                              {language === "es" ? "mantenimiento" : "maintenance"}
                            </span>
                          ) : null}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            ) : null}
          </PanelCard>

        </div>

        <div className="d-grid gap-4">
          {isDetailLoading && !selectedTenant ? (
            <LoadingBlock
              label={
                language === "es"
                  ? "Cargando detalle del tenant..."
                  : "Loading tenant detail..."
              }
            />
          ) : null}

          {detailError ? (
            <ErrorState
              title={
                language === "es"
                  ? "Falló el detalle del tenant"
                  : "Tenant detail failed"
              }
              detail={detailError.payload?.detail || detailError.message}
              requestId={detailError.payload?.request_id}
            />
          ) : null}

          {selectedTenantSummary ? (
            <>
              <PanelCard
                title={selectedTenantSummary.name}
                subtitle={
                  language === "es"
                    ? "Identidad central y contexto operativo actual."
                    : "Central operational identity and effective platform context."
                }
              >
                <div className="tenant-context-actions">
                  <div className="tenant-help-text">
                    {language === "es"
                      ? "Acceso rápido superadmin al portal tenant."
                      : "Quick superadmin access to the tenant portal with the slug prefilled."}
                  </div>
                  <div className="tenant-context-actions__buttons">
                    {selectedTenantSummary.status !== "archived" ? (
                      <button
                        className="btn btn-outline-danger btn-sm"
                        type="button"
                        onClick={handleArchiveTenant}
                        disabled={isActionSubmitting}
                      >
                        {language === "es" ? "Archivar tenant" : "Archive tenant"}
                      </button>
                    ) : (
                      <>
                        <div className="tenant-help-text">
                          {language === "es"
                            ? "Este tenant está archivado. Reábrelo desde el bloque de restauración."
                            : "This tenant is archived. Use the restore block to reopen it with an explicit lifecycle."}
                        </div>
                        {selectedTenantSummary.db_configured ? (
                          <button
                            className="btn btn-outline-danger btn-sm"
                            type="button"
                            onClick={handleDeprovisionTenant}
                            disabled={isActionSubmitting}
                          >
                            {language === "es" ? "Desprovisionar tenant" : "Deprovision tenant"}
                          </button>
                        ) : (
                          <button
                            className="btn btn-outline-danger btn-sm"
                            type="button"
                            onClick={handleDeleteTenant}
                            disabled={isActionSubmitting || !latestCompletedExportJob}
                          >
                            {language === "es" ? "Eliminar tenant" : "Delete tenant"}
                          </button>
                        )}
                      </>
                    )}
                    {tenantPortalHref && canOpenTenantPortal ? (
                      <div className="d-flex flex-wrap gap-2">
                        <Link className="btn btn-outline-primary btn-sm" to={tenantPortalHref}>
                          {language === "es" ? "Abrir portal tenant" : "Open tenant portal"}
                        </Link>
                        {tenantPortalLastResetEmail && tenantPortalLastResetPassword ? (
                          <button
                            className="btn btn-outline-secondary btn-sm"
                            type="button"
                            onClick={handleOpenTenantPortalWithPassword}
                          >
                            {language === "es"
                              ? "Abrir portal con contraseña temporal"
                              : "Open portal with temp password"}
                          </button>
                        ) : null}
                      </div>
                    ) : tenantPortalHref ? (
                      <div className="tenant-help-text">
                        {language === "es"
                          ? "El portal solo queda disponible cuando el tenant está activo y su DB quedó lista."
                          : "The tenant portal is only available when the tenant is active, provisioning finished successfully and tenant DB configuration is complete."}
                      </div>
                    ) : null}
                  </div>
                </div>
                <div className="tenant-detail-grid">
                  <DetailField label="Slug" value={<code>{selectedTenantSummary.slug}</code>} />
                  <DetailField
                    label={language === "es" ? "Tipo de tenant" : "Tenant type"}
                    value={selectedTenantSummary.tenant_type}
                  />
                  <DetailField
                    label={language === "es" ? "Ciclo de vida" : "Lifecycle"}
                    value={<StatusBadge value={selectedTenantSummary.status} />}
                  />
                  <DetailField
                    label={language === "es" ? "Facturación" : "Billing"}
                    value={
                      <StatusBadge value={selectedTenantSummary.billing_status || "unknown"} />
                    }
                  />
                  <DetailField
                    label={language === "es" ? "Plan base" : "Base plan"}
                    value={
                      selectedTenantVisibleBaseCode ||
                      (language === "es" ? "Sin plan base" : "No base plan")
                    }
                  />
                  <DetailField
                    label={language === "es" ? "Modelo contractual" : "Contract model"}
                    value={getTenantContractManagementLabel(
                      selectedTenantSummary.subscription_contract_managed,
                      selectedTenantSummary.legacy_plan_fallback_active,
                      language
                    )}
                  />
                  <DetailField
                    label={language === "es" ? "Fuente baseline" : "Baseline source"}
                    value={getTenantBaselinePolicySourceLabel(
                      selectedTenantSummary.baseline_policy_source,
                      language
                    )}
                  />
                  <DetailField
                    label={language === "es" ? "Mantenimiento" : "Maintenance"}
                    value={
                      selectedTenantSummary.maintenance_mode
                        ? language === "es"
                          ? "Manual"
                          : "Manual"
                        : language === "es"
                          ? "Apagado"
                          : "Off"
                    }
                  />
                  <DetailField
                    label={language === "es" ? "Fin de período billing" : "Billing period end"}
                    value={formatDateTime(selectedTenantSummary.billing_current_period_ends_at)}
                  />
                  <DetailField
                    label={language === "es" ? "Gracia billing hasta" : "Billing grace until"}
                    value={formatDateTime(selectedTenantSummary.billing_grace_until)}
                  />
                  <DetailField
                    label={language === "es" ? "Inicio mantenimiento" : "Maintenance start"}
                    value={formatDateTime(selectedTenantSummary.maintenance_starts_at)}
                  />
                  <DetailField
                    label={language === "es" ? "Fin mantenimiento" : "Maintenance end"}
                    value={formatDateTime(selectedTenantSummary.maintenance_ends_at)}
                  />
                </div>

                {selectedTenantSummary.status_reason ? (
                  <div className="tenant-inline-note">
                    {language === "es" ? "Motivo de estado" : "Status reason"}: {selectedTenantSummary.status_reason}
                  </div>
                ) : null}
                {selectedTenantSummary.billing_status_reason ? (
                  <div className="tenant-inline-note">
                    {language === "es" ? "Motivo de facturación" : "Billing reason"}: {selectedTenantSummary.billing_status_reason}
                  </div>
                ) : null}
                <div className="tenant-inline-note">
                  {language === "es"
                    ? "Activación efectiva actual"
                    : "Current effective activation"}
                  :{" "}
                  {selectedTenantEffectiveModules?.length
                    ? selectedTenantEffectiveModules
                        .map((moduleKey) => getTenantPlanModuleLabel(moduleKey))
                        .join(", ")
                    : language === "es"
                      ? "sin módulos efectivos visibles"
                      : "no visible effective modules"}
                </div>
                <div className="tenant-inline-note">
                  {language === "es"
                    ? "Fuente efectiva"
                    : "Effective source"}
                  : {selectedTenantActivationSourceLabel}
                </div>
                <div className="tenant-inline-note">
                  {language === "es"
                    ? "Plan Base aprobado"
                    : "Approved base plan"}
                  :{" "}
                  {language === "es"
                    ? defaultBasePlanCatalog
                      ? `${defaultBasePlanCatalog.display_name} · incluye ${defaultBasePlanCatalog.included_modules
                          .map((moduleKey) => getTenantPlanModuleLabel(moduleKey))
                          .join(", ")}`
                      : "sin catálogo visible"
                    : defaultBasePlanCatalog
                      ? `${defaultBasePlanCatalog.display_name} · includes ${defaultBasePlanCatalog.included_modules
                          .map((moduleKey) => getTenantPlanModuleLabel(moduleKey))
                          .join(", ")}`
                      : "no visible catalog"}
                </div>
                <div className="tenant-inline-note">
                  {language === "es"
                    ? "Incluido por suscripción"
                    : "Included by subscription"}
                  :{" "}
                  {formatTenantModuleList(
                    selectedTenantSummary?.subscription_included_modules,
                    language
                  )}
                </div>
                <div className="tenant-inline-note">
                  {language === "es"
                    ? "Add-ons arrendados"
                    : "Rented add-ons"}
                  :{" "}
                  {formatTenantModuleList(
                    selectedTenantSummary?.subscription_addon_modules,
                    language
                  )}
                </div>
                <div className="tenant-inline-note">
                  {language === "es"
                    ? "Módulos técnicos"
                    : "Technical modules"}
                  :{" "}
                  {formatTenantModuleList(
                    selectedTenantSummary?.subscription_technical_modules,
                    language
                  )}
                </div>
                <div className="tenant-inline-note">
                  {language === "es"
                    ? "Fallback legacy"
                    : "Legacy fallback"}
                  :{" "}
                  {formatTenantModuleList(
                    selectedTenantSummary?.subscription_legacy_fallback_modules,
                    language
                  )}
                </div>
                <div className="tenant-inline-note">
                  {language === "es"
                    ? "Ruta formal de activación"
                    : "Formal activation route"}
                  :{" "}
                  {selectedTenantSummary.subscription_contract_managed
                    ? language === "es"
                      ? "este tenant ya calcula activación y baseline técnico desde `tenant_subscriptions`; la compatibilidad legacy ya no forma parte de la lectura normal."
                      : "this tenant already computes activation and technical baseline from `tenant_subscriptions`; legacy compatibility is no longer part of the normal reading."
                    : language === "es"
                      ? "este tenant todavía mantiene baseline/fallback legacy por `plan_code`; el siguiente paso es recontratarlo al modelo `Plan Base + add-ons`."
                      : "this tenant still keeps the legacy `plan_code` baseline/fallback; the next step is to recontract it into the `Base plan + add-ons` model."}
                </div>
                {selectedTenantSummary.baseline_compatibility_policy_code ? (
                  <div className="tenant-inline-note">
                    {language === "es"
                      ? "Política de compatibilidad baseline"
                      : "Baseline compatibility policy"}
                    : <code>{selectedTenantSummary.baseline_compatibility_policy_code}</code>
                  </div>
                ) : null}
                {selectedTenantSummary.legacy_plan_fallback_active ? (
                  <div className="tenant-inline-note">
                    {language === "es"
                      ? "Compatibilidad legacy activa: los límites baseline siguen arrastrando compatibilidad con la política antigua para este tenant."
                      : "Legacy compatibility active: baseline limits still carry old-policy compatibility for this tenant."}
                  </div>
                ) : null}
                {selectedTenantSummary.legacy_plan_fallback_active ? (
                  <div className="tenant-context-actions__buttons mt-2">
                    <button
                      className="btn btn-outline-warning btn-sm"
                      type="button"
                      onClick={handleMigrateLegacyContract}
                      disabled={isActionSubmitting}
                    >
                      {language === "es"
                        ? "Migrar baseline legacy al contrato"
                        : "Migrate legacy baseline to contract"}
                    </button>
                  </div>
                ) : null}
                {selectedTenantSummary.maintenance_reason ? (
                  <div className="tenant-inline-note">
                    {language === "es" ? "Motivo de mantenimiento" : "Maintenance reason"}: {selectedTenantSummary.maintenance_reason}
                  </div>
                ) : null}
              </PanelCard>

              {tenantOperationalPosture ? (
                <PanelCard
                  title={
                    language === "es"
                      ? "Postura operativa tenant"
                      : "Tenant operational posture"
                  }
                  subtitle={
                    language === "es"
                      ? "Entrada rápida para decidir si esto es bloqueo esperado, provisioning o drift técnico."
                      : "Quick entry point to decide whether this is expected blocking, provisioning or technical drift."
                  }
                >
                  {tenantOperationalSummaryCards.length > 0 ? (
                    <OperationalSummaryStrip cards={tenantOperationalSummaryCards} />
                  ) : null}

                  <div className="tenant-detail-grid">
                    <DetailField
                      label={language === "es" ? "Postura" : "Posture"}
                      value={
                        <AppBadge tone={tenantOperationalPosture.tone}>
                          {tenantOperationalPosture.label}
                        </AppBadge>
                      }
                    />
                    <DetailField
                      label={language === "es" ? "Señal dominante" : "Dominant signal"}
                      value={tenantOperationalPosture.dominantSignal}
                    />
                    <DetailField
                      label={language === "es" ? "Acceso portal" : "Portal access"}
                      value={
                        accessPolicy ? (
                          <AppBadge tone={accessPolicy.access_allowed ? "success" : "danger"}>
                            {accessPolicy.access_allowed
                              ? language === "es"
                                ? "habilitado"
                                : "enabled"
                              : language === "es"
                                ? "bloqueado"
                                : "blocked"}
                          </AppBadge>
                        ) : language === "es" ? (
                          "sin lectura"
                        ) : (
                          "no read"
                        )
                      }
                    />
                    <DetailField
                      label={language === "es" ? "DB tenant" : "Tenant DB"}
                      value={
                        selectedTenantSummary.db_configured
                          ? language === "es"
                            ? "configurada"
                            : "configured"
                          : language === "es"
                            ? "incompleta"
                            : "incomplete"
                      }
                    />
                    <DetailField
                      label={language === "es" ? "Job visible" : "Visible job"}
                      value={
                        selectedProvisioningJob ? (
                          <StatusBadge value={selectedProvisioningJob.status} />
                        ) : language === "es" ? (
                          "sin job visible"
                        ) : (
                          "no visible job"
                        )
                      }
                    />
                    <DetailField
                      label={language === "es" ? "Esquema" : "Schema"}
                      value={formatTenantSchemaSignal(language, schemaStatus, schemaStatusError)}
                    />
                  </div>

                  <div className="tenant-inline-note">
                    <strong>{language === "es" ? "Lectura rápida" : "Quick read"}:</strong>{" "}
                    {tenantOperationalPosture.quickRead}
                  </div>
                  <div className="tenant-inline-note">
                    <strong>{language === "es" ? "Siguiente acción" : "Next action"}:</strong>{" "}
                    {tenantOperationalPosture.nextAction}
                  </div>
                  {tenantOperationalPosture.supportingNote ? (
                    <div className="tenant-inline-note">
                      {tenantOperationalPosture.supportingNote}
                    </div>
                  ) : null}
                  {tenantProvisioningAlertContext ? (
                    <>
                      <div className="tenant-inline-note">
                        <strong>
                          {language === "es"
                            ? "Contexto de alertas activas"
                            : "Active alerts context"}
                          :
                        </strong>{" "}
                        {tenantProvisioningAlertContext.quickRead}
                      </div>
                      <div className="tenant-detail-grid">
                        <DetailField
                          label={language === "es" ? "Clasificación" : "Classification"}
                          value={
                            <AppBadge tone={tenantProvisioningAlertContext.tone}>
                              {tenantProvisioningAlertContext.label}
                            </AppBadge>
                          }
                        />
                        <DetailField
                          label={language === "es" ? "Lectura ambiente" : "Environment read"}
                          value={tenantProvisioningAlertContext.scopeLabel}
                        />
                        <DetailField
                          label={
                            language === "es"
                              ? "Alertas ambiente"
                              : "Environment alerts"
                          }
                          value={
                            tenantProvisioningAlertContext.environmentAlertCount === null
                              ? language === "es"
                                ? "sin lectura"
                                : "no read"
                              : String(
                                  tenantProvisioningAlertContext.environmentAlertCount
                                )
                          }
                        />
                        <DetailField
                          label={
                            language === "es"
                              ? "Alertas tenant"
                              : "Tenant alerts"
                          }
                          value={
                            tenantProvisioningAlertContext.tenantAlertCount === null
                              ? language === "es"
                                ? "sin lectura"
                                : "no read"
                              : String(tenantProvisioningAlertContext.tenantAlertCount)
                          }
                        />
                        <DetailField
                          label={language === "es" ? "Última señal" : "Latest signal"}
                          value={formatDateTime(tenantProvisioningAlertContext.latestCapturedAt)}
                        />
                      </div>
                      {tenantProvisioningAlertContext.supportingNote ? (
                        <div className="tenant-inline-note">
                          {tenantProvisioningAlertContext.supportingNote}
                        </div>
                      ) : null}
                    </>
                  ) : null}

                  <div className="tenant-context-actions tenant-context-actions--compact">
                    <div className="tenant-help-text">
                      {language === "es"
                        ? "Primero lee esta prioridad y luego baja al detalle fino solo si hace falta."
                        : "Read this priority first and only then move to the detailed sections if needed."}
                    </div>
                    <div className="tenant-context-actions__buttons">
                      {tenantOperationalPosture.primaryAction === "open-provisioning" ? (
                        <Link
                          className="btn btn-primary btn-sm"
                          to={buildProvisioningWorkspaceLink(
                            selectedTenantSummary.slug,
                            selectedProvisioningJob?.job_type || null
                          )}
                        >
                          {language === "es" ? "Abrir provisioning" : "Open provisioning"}
                        </Link>
                      ) : null}
                      {tenantOperationalPosture.primaryAction === "run-provisioning" ? (
                        <button
                          className="btn btn-primary btn-sm"
                          type="button"
                          onClick={handleRunProvisioningJob}
                          disabled={isActionSubmitting}
                        >
                          {language === "es" ? "Ejecutar ahora" : "Run now"}
                        </button>
                      ) : null}
                      {tenantOperationalPosture.primaryAction === "retry-provisioning" ? (
                        <button
                          className="btn btn-primary btn-sm"
                          type="button"
                          onClick={handleRequeueProvisioningJob}
                          disabled={isActionSubmitting}
                        >
                          {language === "es" ? "Reintentar job" : "Retry job"}
                        </button>
                      ) : null}
                      {tenantOperationalPosture.primaryAction === "reprovision" ? (
                        <button
                          className="btn btn-primary btn-sm"
                          type="button"
                          onClick={handleReprovisionTenant}
                          disabled={isActionSubmitting}
                        >
                          {language === "es" ? "Reprovisionar tenant" : "Reprovision tenant"}
                        </button>
                      ) : null}
                      {tenantOperationalPosture.primaryAction === "sync-schema" ? (
                        <button
                          className="btn btn-primary btn-sm"
                          type="button"
                          onClick={requestTenantSchemaSyncConfirmation}
                          disabled={isActionSubmitting}
                        >
                          {language === "es" ? "Sincronizar esquema" : "Sync schema"}
                        </button>
                      ) : null}
                      {tenantOperationalPosture.primaryAction === "rotate-credentials" ? (
                        <button
                          className="btn btn-primary btn-sm"
                          type="button"
                          onClick={handleRotateTenantDbCredentials}
                          disabled={isActionSubmitting}
                        >
                          {language === "es"
                            ? "Rotar credenciales técnicas"
                            : "Rotate technical credentials"}
                        </button>
                      ) : null}
                      {tenantOperationalPosture.primaryAction === "open-tenant-portal" &&
                      tenantPortalHref ? (
                        <Link className="btn btn-primary btn-sm" to={tenantPortalHref}>
                          {language === "es" ? "Abrir portal tenant" : "Open tenant portal"}
                        </Link>
                      ) : null}
                      {tenantProvisioningAlertContext?.showProvisioningLink &&
                      tenantOperationalPosture.primaryAction !== "open-provisioning" ? (
                        <Link
                          className="btn btn-outline-secondary btn-sm"
                          to={tenantProvisioningAlertContext.provisioningLink}
                        >
                          {language === "es"
                            ? "Ir a alertas"
                            : "Open alerts"}
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </PanelCard>
              ) : null}

              <PanelCard
                title={language === "es" ? "Portabilidad tenant" : "Tenant portability"}
                subtitle={
                  language === "es"
                    ? "Genera un paquete portable para respaldo y migración parcial."
                    : "Generate a portable `CSV + manifest + zip` package for operational backup and partial migration."
                }
              >
                <div className="tenant-context-actions tenant-context-actions--compact">
                  <div className="tenant-help-text">
                    {language === "es"
                      ? "Puedes exportar tenant completo soportado o solo datos funcionales. No reemplaza backup PostgreSQL."
                      : "You can export the supported full tenant package or only the functional data. Neither mode replaces PostgreSQL backup."}
                  </div>
                  <div className="tenant-context-actions__buttons">
                    <select
                      className="form-select form-select-sm"
                      value={tenantDataExportScope}
                      onChange={(event) =>
                        setTenantDataExportScope(
                          event.target.value as TenantDataExportScope
                        )
                      }
                      disabled={isActionSubmitting}
                      aria-label={
                        language === "es"
                          ? "Modo de exportación portable"
                          : "Portable export mode"
                      }
                    >
                      <option value="portable_full">
                        {getTenantDataExportScopeLabel("portable_full", language)}
                      </option>
                      <option value="functional_data_only">
                        {getTenantDataExportScopeLabel(
                          "functional_data_only",
                          language
                        )}
                      </option>
                    </select>
                    <button
                      className="btn btn-outline-primary btn-sm"
                      type="button"
                      onClick={handleCreateTenantDataExport}
                      disabled={
                        isActionSubmitting || !selectedTenantSummary.db_configured
                      }
                    >
                      {language === "es"
                        ? "Exportar paquete portable"
                        : "Export portable package"}
                    </button>
                  </div>
                </div>
                {!selectedTenantSummary.db_configured ? (
                  <div className="tenant-inline-note">
                    {language === "es"
                      ? "Primero debes completar el provisioning del tenant. Sin configuración DB tenant no hay export portable posible."
                      : "Complete tenant provisioning first. Without tenant DB configuration, portable export is not possible."}
                  </div>
                ) : null}
                <div className="tenant-inline-note">
                  {language === "es"
                    ? tenantDataExportScope === "functional_data_only"
                      ? "Modo actual: solo datos funcionales. Excluye identidad tenant, roles y usuarios."
                      : "Modo actual: completo tenant soportado. Incluye identidad tenant, roles, usuarios y datos funcionales."
                    : tenantDataExportScope === "functional_data_only"
                      ? "Current mode: functional data only. It excludes tenant identity, roles, and users."
                      : "Current mode: supported full tenant. It includes tenant identity, roles, users, and functional data."}
                </div>
                {isDataExportJobsLoading ? (
                  <LoadingBlock
                    label={
                      language === "es"
                        ? "Cargando exports portables..."
                        : "Loading portable exports..."
                    }
                  />
                ) : null}
                {dataExportJobsError ? (
                  <ErrorState
                    title={
                      language === "es"
                        ? "Falló la lectura de exports portables"
                        : "Portable exports read failed"
                    }
                    detail={
                      dataExportJobsError.payload?.detail || dataExportJobsError.message
                    }
                    requestId={dataExportJobsError.payload?.request_id}
                  />
                ) : null}
                {!isDataExportJobsLoading &&
                !dataExportJobsError &&
                dataExportJobs.length === 0 ? (
                  <div className="text-secondary">
                    {language === "es"
                      ? "Aún no hay exports portables para este tenant."
                      : "There are no portable exports for this tenant yet."}
                  </div>
                ) : null}
              </PanelCard>

              <PanelCard
                title={
                  language === "es"
                    ? "Import portable controlado"
                    : "Controlled portable import"
                }
                subtitle={
                  language === "es"
                    ? "Carga un paquete exportado por la plataforma y ejecútalo primero en `dry_run`."
                    : "Upload a platform-generated `zip + manifest + csv` package and run it in `dry_run` before applying."
                }
              >
                <div className="tenant-context-actions tenant-context-actions--compact">
                  <div className="tenant-help-text">
                    {language === "es"
                      ? "Acepta paquetes completos y de solo datos funcionales. La estrategia sigue siendo `skip_existing`."
                      : "Import accepts full packages and functional-data-only packages. The current strategy is still `skip_existing`."}
                  </div>
                </div>
                <div className="tenant-form-grid">
                  <label className="tenant-field">
                    <span>{language === "es" ? "Paquete portable" : "Portable package"}</span>
                    <input
                      key={`${selectedTenantId}-${tenantImportFile?.name || "empty"}`}
                      type="file"
                      accept=".zip,application/zip"
                      onChange={(event) =>
                        setTenantImportFile(event.target.files?.[0] || null)
                      }
                    />
                  </label>
                  <label className="tenant-field tenant-field--checkbox">
                    <input
                      type="checkbox"
                      checked={tenantImportDryRun}
                      onChange={(event) => setTenantImportDryRun(event.target.checked)}
                    />
                    <span>
                      {language === "es"
                        ? "Ejecutar como dry_run"
                        : "Run as dry_run"}
                    </span>
                  </label>
                </div>
                {tenantImportFile ? (
                  <div className="tenant-inline-note">
                    {language === "es" ? "Archivo seleccionado" : "Selected file"}:{" "}
                    {tenantImportFile.name}
                  </div>
                ) : null}
                {!selectedTenantSummary.db_configured ? (
                  <div className="tenant-inline-note">
                    {language === "es"
                      ? "Primero debes completar provisioning y sincronización del esquema del tenant destino."
                      : "Complete provisioning and schema sync first for the target tenant."}
                  </div>
                ) : null}
                <div className="tenant-context-actions__buttons">
                  <button
                    className="btn btn-outline-primary btn-sm"
                    type="button"
                    onClick={() => void handleCreateTenantDataImport()}
                    disabled={
                      isActionSubmitting ||
                      !selectedTenantSummary.db_configured ||
                      tenantImportFile === null
                    }
                  >
                    {tenantImportDryRun
                      ? language === "es"
                        ? "Simular import portable"
                        : "Run portable import dry_run"
                      : language === "es"
                        ? "Aplicar import portable"
                        : "Apply portable import"}
                  </button>
                </div>
                {isDataImportJobsLoading ? (
                  <LoadingBlock
                    label={
                      language === "es"
                        ? "Cargando imports portables..."
                        : "Loading portable imports..."
                    }
                  />
                ) : null}
                {dataImportJobsError ? (
                  <ErrorState
                    title={
                      language === "es"
                        ? "Falló la lectura de imports portables"
                        : "Portable imports read failed"
                    }
                    detail={
                      dataImportJobsError.payload?.detail || dataImportJobsError.message
                    }
                    requestId={dataImportJobsError.payload?.request_id}
                  />
                ) : null}
                {!isDataImportJobsLoading &&
                !dataImportJobsError &&
                dataImportJobs.length === 0 ? (
                  <div className="text-secondary">
                    {language === "es"
                      ? "Aún no hay imports portables para este tenant."
                      : "There are no portable imports for this tenant yet."}
                  </div>
                ) : null}
              </PanelCard>

              {dataExportJobs.length > 0 ? (
                <DataTableCard
                  title={
                    language === "es"
                      ? "Últimos exports portables"
                      : "Latest portable exports"
                  }
                  rows={dataExportJobs}
                  columns={[
                    {
                      key: "id",
                      header: "Job",
                      render: (row) => `#${row.id}`,
                    },
                    {
                      key: "status",
                      header: language === "es" ? "Estado" : "Status",
                      render: (row) => <StatusBadge value={row.status} />,
                    },
                    {
                      key: "export_scope",
                      header: language === "es" ? "Scope" : "Scope",
                      render: (row) =>
                        getTenantDataExportScopeLabel(row.export_scope, language),
                    },
                    {
                      key: "created_at",
                      header: language === "es" ? "Creado" : "Created",
                      render: (row) => formatDateTime(row.created_at),
                    },
                    {
                      key: "artifact",
                      header: language === "es" ? "Artifact" : "Artifact",
                      render: (row) =>
                        row.artifacts[0]?.file_name ||
                        (language === "es" ? "sin artifact" : "no artifact"),
                    },
                    {
                      key: "actions",
                      header: language === "es" ? "Acciones" : "Actions",
                      render: (row) =>
                        row.status === "completed" && row.artifacts.length > 0 ? (
                          <button
                            className="btn btn-outline-secondary btn-sm"
                            type="button"
                            onClick={() => void handleDownloadTenantDataExport(row.id)}
                            disabled={isActionSubmitting}
                          >
                            {language === "es" ? "Descargar zip" : "Download zip"}
                          </button>
                        ) : (
                          <span className="text-secondary">
                            {row.error_message ||
                              (language === "es" ? "sin descarga" : "no download")}
                          </span>
                        ),
                    },
                  ]}
                />
              ) : null}

              {dataImportJobs.length > 0 ? (
                <DataTableCard
                  title={
                    language === "es"
                      ? "Últimos imports portables"
                      : "Latest portable imports"
                  }
                  rows={dataImportJobs}
                  columns={[
                    {
                      key: "id",
                      header: "Job",
                      render: (row) => `#${row.id}`,
                    },
                    {
                      key: "status",
                      header: language === "es" ? "Estado" : "Status",
                      render: (row) => <StatusBadge value={row.status} />,
                    },
                    {
                      key: "mode",
                      header: language === "es" ? "Modo" : "Mode",
                      render: (row) => {
                        const summary =
                          row.summary_json && row.summary_json.trim()
                            ? JSON.parse(row.summary_json)
                            : null;
                        return summary?.mode || "n/a";
                      },
                    },
                    {
                      key: "export_scope",
                      header: language === "es" ? "Scope" : "Scope",
                      render: (row) => {
                        const summary =
                          row.summary_json && row.summary_json.trim()
                            ? JSON.parse(row.summary_json)
                            : null;
                        return getTenantDataExportScopeLabel(
                          summary?.export_scope || row.export_scope,
                          language
                        );
                      },
                    },
                    {
                      key: "source",
                      header: language === "es" ? "Paquete" : "Package",
                      render: (row) => {
                        const summary =
                          row.summary_json && row.summary_json.trim()
                            ? JSON.parse(row.summary_json)
                            : null;
                        return (
                          summary?.source_file_name ||
                          row.artifacts[0]?.file_name ||
                          (language === "es" ? "sin paquete" : "no package")
                        );
                      },
                    },
                    {
                      key: "created_at",
                      header: language === "es" ? "Creado" : "Created",
                      render: (row) => formatDateTime(row.created_at),
                    },
                  ]}
                />
              ) : null}

              {accessPolicy ? (
                <PanelCard
                  title={language === "es" ? "Política de acceso" : "Access policy"}
                subtitle={
                  language === "es"
                    ? "Lectura efectiva de lifecycle y billing."
                    : "Effective read of lifecycle and billing enforcement."
                }
              >
                  <div className="tenant-access-grid">
                    <DetailField
                      label={language === "es" ? "Permitido" : "Allowed"}
                      value={
                        <AppBadge tone={accessPolicy.access_allowed ? "success" : "danger"}>
                          {accessPolicy.access_allowed
                            ? language === "es"
                              ? "permitido"
                              : "allowed"
                            : language === "es"
                              ? "bloqueado"
                              : "blocked"}
                        </AppBadge>
                      }
                    />
                    <DetailField
                      label={language === "es" ? "Fuente de bloqueo" : "Blocking source"}
                      value={displayAccessBlockingSource(accessPolicy.access_blocking_source, language)}
                    />
                    <DetailField
                      label={language === "es" ? "Código de estado" : "Status code"}
                      value={accessPolicy.access_status_code || "n/a"}
                    />
                    <DetailField
                      label={language === "es" ? "Billing en gracia" : "Billing in grace"}
                      value={accessPolicy.billing_in_grace ? (language === "es" ? "sí" : "yes") : "no"}
                    />
                  </div>
                  {accessPolicy.access_detail ? (
                    <div className="tenant-inline-note">
                      {displayTenantAccessDetail(accessPolicy.access_detail, language)}
                    </div>
                  ) : null}
                </PanelCard>
              ) : null}

              <PanelCard
                title="Provisioning"
                subtitle={
                  language === "es"
                    ? "Estado del job que prepara la base tenant."
                    : "State of the technical job that prepares the tenant database and leaves bootstrap access ready."
                }
              >
                {provisioningJobError ? (
                  <ErrorState
                    title={
                      language === "es"
                        ? "Falló la lectura de provisioning"
                        : "Provisioning read failed"
                    }
                    detail={
                      provisioningJobError.payload?.detail || provisioningJobError.message
                    }
                    requestId={provisioningJobError.payload?.request_id}
                  />
                ) : selectedProvisioningJob ? (
                  <>
                    <div className="tenant-detail-grid">
                      <DetailField
                        label={language === "es" ? "Último job" : "Latest job"}
                        value={`#${selectedProvisioningJob.id}`}
                      />
                      <DetailField
                        label={language === "es" ? "Operación" : "Operation"}
                        value={formatProvisioningJobType(selectedProvisioningJob.job_type)}
                      />
                      <DetailField
                        label={language === "es" ? "Estado" : "Status"}
                        value={<StatusBadge value={selectedProvisioningJob.status} />}
                      />
                      <DetailField
                        label={language === "es" ? "Intentos" : "Attempts"}
                        value={`${selectedProvisioningJob.attempts}/${selectedProvisioningJob.max_attempts}`}
                      />
                      <DetailField
                        label={language === "es" ? "Próximo reintento" : "Next retry"}
                        value={formatDateTime(selectedProvisioningJob.next_retry_at)}
                      />
                      <DetailField
                        label={language === "es" ? "Lectura rápida" : "Quick read"}
                        value={getProvisioningStatusExplanation(selectedProvisioningJob.status)}
                      />
                    </div>

                    {selectedProvisioningJob.error_code ? (
                      <div className="tenant-inline-note">
                        {language === "es" ? "Error técnico" : "Technical error"}:{" "}
                        {displayPlatformCode(selectedProvisioningJob.error_code, language)}
                      </div>
                    ) : null}
                    {selectedProvisioningJob.error_message ? (
                      <div className="tenant-inline-note">
                        {language === "es" ? "Detalle último error" : "Last error detail"}:{" "}
                        {selectedProvisioningJob.error_message}
                      </div>
                    ) : null}
                    {!selectedTenantSummary.db_configured &&
                    selectedProvisioningJob.status === "completed" ? (
                      <div className="tenant-inline-note">
                        {language === "es"
                          ? "El tenant tiene un job histórico completado, pero la configuración DB sigue incompleta. Debes reprovisionarlo para recomponer su base tenant."
                          : "The tenant has a completed historical job, but DB configuration is still incomplete. You must reprovision it to rebuild its tenant database."}
                      </div>
                    ) : null}

                    <div className="tenant-context-actions tenant-context-actions--compact">
                      <div className="tenant-help-text">
                        {language === "es"
                          ? "Crear tenant dispara provisioning automático. Aquí ves si la base quedó lista o requiere intervención."
                          : "Creating a tenant triggers provisioning automatically. Here you can see whether the tenant database is ready or whether the job needs intervention."}
                      </div>
                      <div className="tenant-context-actions__buttons">
                        <Link
                          className="btn btn-outline-primary btn-sm"
                          to={buildProvisioningWorkspaceLink(
                            selectedTenantSummary.slug,
                            selectedProvisioningJob?.job_type || null
                          )}
                        >
                          {language === "es" ? "Abrir provisioning" : "Open provisioning"}
                        </Link>
                        {(selectedProvisioningJob.status === "pending" ||
                          selectedProvisioningJob.status === "retry_pending") && (
                          <button
                            className="btn btn-outline-secondary btn-sm"
                            type="button"
                            onClick={handleRunProvisioningJob}
                            disabled={isActionSubmitting}
                          >
                            {language === "es" ? "Ejecutar ahora" : "Run now"}
                          </button>
                        )}
                        {selectedProvisioningJob.status === "failed" && (
                          <button
                            className="btn btn-outline-secondary btn-sm"
                            type="button"
                            onClick={handleRequeueProvisioningJob}
                            disabled={isActionSubmitting}
                          >
                            {language === "es" ? "Reintentar" : "Retry"}
                          </button>
                        )}
                        {!selectedTenantSummary.db_configured &&
                          selectedProvisioningJob.status === "completed" && (
                            <button
                              className="btn btn-outline-secondary btn-sm"
                              type="button"
                              onClick={handleReprovisionTenant}
                              disabled={isActionSubmitting}
                            >
                              {language === "es" ? "Reprovisionar tenant" : "Reprovision tenant"}
                            </button>
                          )}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-secondary">
                      {language === "es"
                        ? "Este tenant todavía no tiene jobs visibles. Si acaba de crearse, recarga o abre Provisioning."
                        : "This tenant still has no visible provisioning jobs. If it was just created, reload the catalog or open the provisioning console to review the global queue."}
                    </div>
                    {!selectedTenantSummary.db_configured ? (
                      <div className="tenant-context-actions tenant-context-actions--compact">
                        <div className="tenant-help-text">
                          {language === "es"
                            ? "El tenant sigue sin DB completa. Puedes crear ahora un job nuevo de provisioning."
                            : "The tenant still lacks complete DB configuration. You can create a new provisioning job now to prepare it."}
                        </div>
                        <div className="tenant-context-actions__buttons">
                          <button
                            className="btn btn-outline-secondary btn-sm"
                            type="button"
                            onClick={handleReprovisionTenant}
                            disabled={isActionSubmitting}
                          >
                            {language === "es" ? "Reprovisionar tenant" : "Reprovision tenant"}
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </>
                )}

                {selectedTenantSummary.db_configured ? (
                  schemaStatusError ? (
                    <div className="tenant-inline-note">
                      {language === "es"
                        ? "No se pudo leer la trazabilidad de esquema tenant en esta revisión."
                        : "Could not read tenant schema traceability in this review."}
                    </div>
                  ) : schemaStatus ? (
                    <>
                      <div className="tenant-section-divider" />
                      <div className="tenant-detail-grid">
                        <DetailField
                          label={language === "es" ? "Esquema actual" : "Current schema"}
                          value={
                            schemaStatus.current_version ||
                            (language === "es" ? "sin registro" : "no record")
                          }
                        />
                        <DetailField
                          label={
                            language === "es"
                              ? "Última versión disponible"
                              : "Latest available version"
                          }
                          value={schemaStatus.latest_available_version || "n/a"}
                        />
                        <DetailField
                          label={language === "es" ? "Migraciones pendientes" : "Pending migrations"}
                          value={schemaStatus.pending_count}
                        />
                        <DetailField
                          label={language === "es" ? "Última sincronización" : "Last sync"}
                          value={formatDateTime(schemaStatus.last_applied_at)}
                        />
                      </div>
                      {schemaStatus.pending_count > 0 ? (
                        <div className="tenant-inline-note">
                          {language === "es" ? "El tenant no está al día de esquema. Usa " : "The tenant schema is not up to date. Use "}
                          <strong>
                            {language === "es" ? "Sincronizar esquema tenant" : "Sync tenant schema"}
                          </strong>{" "}
                          {language === "es" ? "para aplicar las migraciones pendientes." : "to apply pending migrations."}
                        </div>
                      ) : (
                        <div className="tenant-inline-note">
                          {language === "es"
                            ? "El esquema tenant está al día según las migraciones registradas."
                            : "The tenant schema is up to date according to recorded migrations."}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="tenant-inline-note">
                      {language === "es"
                        ? "La DB tenant existe, pero todavía no hay una lectura reciente de su versión de esquema."
                        : "The tenant DB exists, but there is still no recent read of its schema version."}
                    </div>
                  )
                ) : null}
                {selectedTenantSummary.db_configured ? (
                  <>
                    {actionFeedback?.scope === "rotate-tenant-db-credentials" ? (
                      <div
                        className={`tenant-action-feedback tenant-action-feedback--${actionFeedback.type}`}
                      >
                        <strong>
                          {getPlatformActionFeedbackLabel(actionFeedback.scope, language)}:
                        </strong>{" "}
                        {actionFeedback.message}
                        {actionFeedback.details?.length ? (
                          <div className="mt-2">
                            {actionFeedback.details.map((detail) => (
                              <div key={detail}>{detail}</div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                    <div className="tenant-detail-grid">
                      <DetailField
                        label={
                          language === "es"
                            ? "Última rotación credenciales DB"
                            : "Last DB credentials rotation"
                        }
                        value={formatDateTime(
                          selectedTenantSummary.tenant_db_credentials_rotated_at
                        )}
                      />
                    </div>
                    <div className="tenant-context-actions tenant-context-actions--compact">
                      <div className="tenant-help-text">
                        {language === "es"
                          ? "Rota la contraseña DB tenant si sospechas exposición técnica. No cambia la contraseña del portal."
                          : "If you need to harden operations or suspect technical secret exposure, you can rotate the tenant DB password without affecting tenant portal access. This is not the tenant portal user password; that access credential is managed separately."}
                      </div>
                      <div className="tenant-context-actions__buttons">
                        <button
                          className="btn btn-outline-secondary btn-sm"
                          type="button"
                          onClick={handleRotateTenantDbCredentials}
                          disabled={isActionSubmitting}
                        >
                          {language === "es" ? "Rotar credenciales técnicas" : "Rotate technical credentials"}
                        </button>
                      </div>
                    </div>
                  </>
                ) : null}
              </PanelCard>

              <PanelCard
                title={language === "es" ? "Acciones administrativas" : "Administrative actions"}
                subtitle={
                  language === "es"
                    ? "Lifecycle, mantenimiento, billing, plan, límites y operación técnica."
                    : "Govern lifecycle, maintenance, billing, plan, limits and technical operations for the selected tenant."
                }
              >
                {actionFeedback ? (
                  <div
                    className={`tenant-action-feedback tenant-action-feedback--${actionFeedback.type}`}
                  >
                    <strong>{getPlatformActionFeedbackLabel(actionFeedback.scope, language)}:</strong>{" "}
                    {actionFeedback.message}
                    {actionFeedback.details?.length ? (
                      <div className="mt-2">
                        {actionFeedback.details.map((detail) => (
                          <div key={detail}>{detail}</div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <div className="tenant-action-grid">
                  {selectedTenantSummary.status === "archived" ? (
                    <AppForm className="tenant-action-form" onSubmit={handleRestoreTenantSubmit}>
                      <h3 className="tenant-action-form__title">
                        {language === "es" ? "Restauración" : "Restore"}
                      </h3>
                      <AppFormField fullWidth>
                        <FieldHelpLabel
                          label={language === "es" ? "Estado destino" : "Target status"}
                          help={
                            language === "es"
                              ? "La restauración no cambia el slug ni elimina historial. Solo reabre el tenant archivado en el lifecycle que definas aquí."
                              : "Restore does not change the slug or remove history. It only reopens the archived tenant in the lifecycle you define here."
                          }
                        />
                        <select
                          className="form-select"
                          value={restoreTargetStatus}
                          onChange={(event) => setRestoreTargetStatus(event.target.value)}
                        >
                          {["pending", "active", "suspended"].map((value) => (
                            <option key={value} value={value}>
                              {displayPlatformCode(value, language)}
                            </option>
                          ))}
                        </select>
                      </AppFormField>
                      <AppFormField fullWidth>
                        <FieldHelpLabel
                          label={language === "es" ? "Motivo de restauración" : "Restore reason"}
                          help={
                            language === "es"
                              ? "Úsalo para dejar trazabilidad operativa de por qué el tenant vuelve a abrirse."
                              : "Use it to leave operational traceability about why the tenant is being reopened."
                          }
                        />
                        <textarea
                          className="form-control"
                          rows={3}
                          value={restoreReason}
                          onChange={(event) => setRestoreReason(event.target.value)}
                          placeholder={
                            language === "es"
                              ? "Ej: Reactivación operativa autorizada"
                              : "Example: authorized operational reactivation"
                          }
                        />
                      </AppFormField>
                      <div className="app-form-field app-form-field--full">
                        <div className="tenant-inline-note">
                          {language === "es"
                            ? "La restauración es explícita y no equivale a editar el estado a mano."
                            : "Restore is explicit and is not equivalent to editing the status by hand."}
                        </div>
                      </div>
                      <div className="app-form-field app-form-field--full">
                        <div className="tenant-inline-note">
                          {language === "es"
                            ? "Si este tenant archivado todavía conserva base o credenciales técnicas, primero usa `Desprovisionar tenant`. Cuando ya no tenga configuración DB y no deba conservarse, podrás usar `Eliminar tenant` para removerlo definitivamente."
                            : "If this archived tenant still keeps a database or technical credentials, first use `Deprovision tenant`. Once it no longer has DB configuration and should not be preserved, you can use `Delete tenant` to remove it permanently."}
                        </div>
                      </div>
                      <div className="app-form-field app-form-field--full">
                        <div className="tenant-inline-note">
                          {latestCompletedExportJob
                            ? language === "es"
                              ? `Último export portable válido para borrado: job #${latestCompletedExportJob.id} (${latestCompletedExportJob.export_scope}).`
                              : `Latest portable export eligible for deletion: job #${latestCompletedExportJob.id} (${latestCompletedExportJob.export_scope}).`
                            : language === "es"
                              ? "Aún no existe un export portable completado para este tenant. Sin ese respaldo, `Eliminar tenant` queda bloqueado."
                              : "There is no completed portable export for this tenant yet. Without that backup, `Delete tenant` stays blocked."}
                        </div>
                      </div>
                      <AppFormActions>
                        <button className="btn btn-primary" type="submit" disabled={isActionSubmitting}>
                          {language === "es" ? "Restaurar tenant" : "Restore tenant"}
                        </button>
                      </AppFormActions>
                    </AppForm>
                  ) : null}

                  <AppForm className="tenant-action-form" onSubmit={handleIdentitySubmit}>
                    <h3 className="tenant-action-form__title">
                      {language === "es" ? "Identidad básica" : "Basic identity"}
                    </h3>
                    <AppFormField fullWidth>
                      <FieldHelpLabel
                        label={language === "es" ? "Nombre visible" : "Display name"}
                        help={
                          language === "es"
                            ? "Este nombre se usa en catálogo, detalle y operación diaria del tenant."
                            : "This name is used in catalog, detail and daily tenant operations."
                        }
                      />
                      <input
                        className="form-control"
                        value={identityName}
                        onChange={(event) => setIdentityName(event.target.value)}
                      />
                    </AppFormField>
                    <AppFormField fullWidth>
                      <FieldHelpLabel
                        label={language === "es" ? "Tipo de tenant" : "Tenant type"}
                        help={
                          language === "es"
                            ? "Clasifica operativamente el tenant sin tocar su slug ni su historial técnico."
                            : "Operationally classify the tenant without touching its slug or technical history."
                        }
                      />
                      <select
                        className="form-select"
                        value={identityTenantType}
                        onChange={(event) => setIdentityTenantType(event.target.value)}
                      >
                        {tenantTypeOptions.map((value) => (
                          <option key={value} value={value}>
                            {value}
                          </option>
                        ))}
                      </select>
                    </AppFormField>
                    <div className="app-form-field app-form-field--full">
                      <div className="tenant-inline-note">
                        {language === "es"
                          ? "El slug se mantiene estable para no romper accesos, bootstrap ni referencias técnicas."
                          : "The slug stays stable so accesses, bootstrap and technical references do not break."}
                      </div>
                    </div>
                    <AppFormActions>
                      <button
                        className="btn btn-primary"
                        type="submit"
                        disabled={isActionSubmitting || !identityName.trim()}
                      >
                        {language === "es" ? "Actualizar identidad básica" : "Update basic identity"}
                      </button>
                    </AppFormActions>
                  </AppForm>

                  <AppForm className="tenant-action-form" onSubmit={handleStatusSubmit}>
                    <h3 className="tenant-action-form__title">
                      {language === "es" ? "Estado" : "Status"}
                    </h3>
                    <AppFormField fullWidth>
                      <FieldHelpLabel
                        label={language === "es" ? "Estado lifecycle" : "Lifecycle status"}
                        help={
                          language === "es"
                            ? "Controla el estado operativo general del tenant. Puede habilitar, suspender, archivar o dejar pendiente su operación."
                            : "Controls the general tenant operational status. It can enable, suspend, archive or leave its operation pending."
                        }
                      />
                      <select
                        className="form-select"
                        value={statusValue}
                        onChange={(event) => setStatusValue(event.target.value)}
                      >
                        {(capabilities?.tenant_statuses || []).map((value) => (
                          <option key={value} value={value}>
                            {displayPlatformCode(value, language)}
                          </option>
                        ))}
                      </select>
                    </AppFormField>
                    <AppFormField fullWidth>
                      <FieldHelpLabel
                        label={language === "es" ? "Motivo" : "Reason"}
                        help={
                          language === "es"
                            ? "Úsalo para dejar contexto operativo visible cuando cambias el estado del tenant."
                            : "Use it to leave visible operational context when you change the tenant status."
                        }
                      />
                      <textarea
                        className="form-control"
                        rows={3}
                        value={statusReason}
                        onChange={(event) => setStatusReason(event.target.value)}
                      />
                    </AppFormField>
                    <AppFormActions>
                      <button
                        className="btn btn-primary"
                        type="submit"
                        disabled={isActionSubmitting}
                      >
                        {language === "es" ? "Actualizar estado" : "Update status"}
                      </button>
                    </AppFormActions>
                  </AppForm>

                  <AppForm className="tenant-action-form" onSubmit={handleMaintenanceSubmit}>
                    <h3 className="tenant-action-form__title">
                      {language === "es" ? "Mantenimiento" : "Maintenance"}
                    </h3>
                    <div className="app-form-field app-form-field--full">
                      <div className="form-check mb-0">
                        <input
                          id="maintenance-mode"
                          className="form-check-input"
                          type="checkbox"
                          checked={maintenanceMode}
                          onChange={(event) => setMaintenanceMode(event.target.checked)}
                        />
                        <label className="form-check-label" htmlFor="maintenance-mode">
                          {language === "es" ? "Habilitar mantenimiento manual" : "Enable manual maintenance"}
                        </label>
                      </div>
                    </div>
                    <div className="app-form-field app-form-field--full">
                      <p className="tenant-help-text mb-0">
                        {language === "es"
                          ? "Activa una ventana manual cuando necesites restringir temporalmente el uso del tenant o de módulos específicos."
                          : "Enable a manual window when you need to temporarily restrict tenant usage or specific modules."}
                      </p>
                    </div>
                    <AppFormField fullWidth>
                      <FieldHelpLabel
                        label={language === "es" ? "Modo de acceso" : "Access mode"}
                        help={
                          language === "es"
                            ? "Define si durante el mantenimiento se bloquean solo escrituras o todo el acceso del tenant."
                            : "Define whether maintenance blocks only writes or the full tenant access."
                        }
                        placement="left"
                      />
                      <select
                        className="form-select"
                        value={maintenanceAccessMode}
                        onChange={(event) => setMaintenanceAccessMode(event.target.value)}
                      >
                        {(capabilities?.maintenance_access_modes || []).map((value) => (
                          <option key={value} value={value}>
                            {displayMaintenanceAccessMode(value)}
                          </option>
                        ))}
                      </select>
                    </AppFormField>
                    <AppFormField fullWidth>
                      <FieldHelpLabel
                        label="Scopes"
                        help={
                          language === "es"
                            ? "Elige si el mantenimiento aplica a todo el tenant o solo a áreas puntuales como core, users, finance o mantenciones."
                            : "Choose whether maintenance applies to the whole tenant or only to specific areas such as core, users, finance or maintenance."
                        }
                        placement="left"
                      />
                      <AppCheckGrid className="tenant-scope-list">
                        {(capabilities?.maintenance_scopes || []).map((scope) => (
                          <label key={scope} className="form-check tenant-scope-list__item">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              checked={maintenanceScopes.includes(scope)}
                              onChange={() => setMaintenanceScopes(toggleScope(maintenanceScopes, scope))}
                            />
                            <span className="form-check-label">{scope}</span>
                          </label>
                        ))}
                      </AppCheckGrid>
                    </AppFormField>
                    <AppFormField>
                      <FieldHelpLabel
                        label={language === "es" ? "Comienza" : "Starts"}
                        help={
                          language === "es"
                            ? "Marca cuándo parte la ventana de mantenimiento. Si no ajustas la hora, se guardará 00:00."
                            : "Mark when the maintenance window starts. If you do not set the time, `00:00` will be stored."
                        }
                        placement="left"
                      />
                      <div className="tenant-date-time-stack">
                        <input
                          className="form-control"
                          type="date"
                          value={splitLocalDateTime(maintenanceStartsAt).date}
                          onChange={(event) =>
                            setMaintenanceStartsAt(
                              mergeLocalDateTime(
                                maintenanceStartsAt,
                                "date",
                                event.target.value
                              )
                            )
                          }
                        />
                        <input
                          className="form-control"
                          type="time"
                          value={splitLocalDateTime(maintenanceStartsAt).time}
                          onChange={(event) =>
                            setMaintenanceStartsAt(
                              mergeLocalDateTime(
                                maintenanceStartsAt,
                                "time",
                                event.target.value
                              )
                            )
                          }
                        />
                      </div>
                    </AppFormField>
                    <AppFormField>
                      <FieldHelpLabel
                        label={language === "es" ? "Termina" : "Ends"}
                        help={
                          language === "es"
                            ? "Marca cuándo termina la ventana de mantenimiento. Si no ajustas la hora, se guardará 00:00."
                            : "Mark when the maintenance window ends. If you do not set the time, `00:00` will be stored."
                        }
                        placement="left"
                      />
                      <div className="tenant-date-time-stack">
                        <input
                          className="form-control"
                          type="date"
                          value={splitLocalDateTime(maintenanceEndsAt).date}
                          onChange={(event) =>
                            setMaintenanceEndsAt(
                              mergeLocalDateTime(
                                maintenanceEndsAt,
                                "date",
                                event.target.value
                              )
                            )
                          }
                        />
                        <input
                          className="form-control"
                          type="time"
                          value={splitLocalDateTime(maintenanceEndsAt).time}
                          onChange={(event) =>
                            setMaintenanceEndsAt(
                              mergeLocalDateTime(
                                maintenanceEndsAt,
                                "time",
                                event.target.value
                              )
                            )
                          }
                        />
                      </div>
                    </AppFormField>
                    <AppFormField fullWidth>
                      <FieldHelpLabel
                        label={language === "es" ? "Motivo" : "Reason"}
                        help={
                          language === "es"
                            ? "Describe brevemente el motivo operativo del mantenimiento para dejar trazabilidad visible."
                            : "Briefly describe the operational reason for maintenance to leave visible traceability."
                        }
                      />
                      <textarea
                        className="form-control"
                        rows={3}
                        value={maintenanceReason}
                        onChange={(event) => setMaintenanceReason(event.target.value)}
                      />
                    </AppFormField>
                    <AppFormActions>
                      <button
                        className="btn btn-primary"
                        type="submit"
                        disabled={isActionSubmitting}
                      >
                        {language === "es" ? "Actualizar mantenimiento" : "Update maintenance"}
                      </button>
                    </AppFormActions>
                  </AppForm>

                  <AppForm className="tenant-action-form" onSubmit={handleBillingSubmit}>
                    <h3 className="tenant-action-form__title">
                      {language === "es" ? "Facturación" : "Billing"}
                    </h3>
                    <AppFormField fullWidth>
                      <FieldHelpLabel
                        label={language === "es" ? "Estado billing" : "Billing status"}
                        help={
                          language === "es"
                            ? "Representa el estado comercial del tenant frente a cobro y suscripción: trialing, active, past_due, suspended o canceled."
                            : "Represents the tenant commercial status for billing and subscription: trialing, active, past_due, suspended or canceled."
                        }
                      />
                      <select
                        className="form-select"
                        value={billingStatus}
                        onChange={(event) => setBillingStatus(event.target.value)}
                      >
                        <option value="">{language === "es" ? "ninguno" : "none"}</option>
                        {(capabilities?.tenant_billing_statuses || []).map((value) => (
                          <option key={value} value={value}>
                            {displayPlatformCode(value)}
                          </option>
                        ))}
                      </select>
                    </AppFormField>
                    <AppFormField fullWidth>
                      <FieldHelpLabel
                        label={language === "es" ? "Motivo" : "Reason"}
                        help={
                          language === "es"
                            ? "Deja una explicación visible del cambio de facturación o del estado comercial actual."
                            : "Leave a visible explanation of the billing change or current commercial status."
                        }
                      />
                      <textarea
                        className="form-control"
                        rows={3}
                        value={billingReason}
                        onChange={(event) => setBillingReason(event.target.value)}
                      />
                    </AppFormField>
                    <AppFormField>
                      <FieldHelpLabel
                        label={language === "es" ? "Fin período actual" : "Current period end"}
                        help={
                          language === "es"
                            ? "Usa fecha y hora local del cierre de período. Si no ajustas la hora, se guardará 00:00."
                            : "Use the local date and time for the period close. If you do not set the time, `00:00` will be stored."
                        }
                      />
                      <div className="tenant-date-time-stack">
                        <input
                          className="form-control"
                          type="date"
                          value={splitLocalDateTime(billingCurrentPeriodEndsAt).date}
                          onChange={(event) =>
                            setBillingCurrentPeriodEndsAt(
                              mergeLocalDateTime(
                                billingCurrentPeriodEndsAt,
                                "date",
                                event.target.value
                              )
                            )
                          }
                        />
                        <input
                          className="form-control"
                          type="time"
                          value={splitLocalDateTime(billingCurrentPeriodEndsAt).time}
                          onChange={(event) =>
                            setBillingCurrentPeriodEndsAt(
                              mergeLocalDateTime(
                                billingCurrentPeriodEndsAt,
                                "time",
                                event.target.value
                              )
                            )
                          }
                        />
                      </div>
                    </AppFormField>
                    <AppFormField>
                      <FieldHelpLabel
                        label={language === "es" ? "Gracia hasta" : "Grace until"}
                        help={
                          language === "es"
                            ? "Úsalo cuando el tenant sigue operativo por una ventana temporal pese a estar past_due. Si no ajustas la hora, se guardará 00:00."
                            : "Use it when the tenant remains operational for a temporary window despite being past due. If you do not set the time, `00:00` will be stored."
                        }
                      />
                      <div className="tenant-date-time-stack">
                        <input
                          className="form-control"
                          type="date"
                          value={splitLocalDateTime(billingGraceUntil).date}
                          onChange={(event) =>
                            setBillingGraceUntil(
                              mergeLocalDateTime(
                                billingGraceUntil,
                                "date",
                                event.target.value
                              )
                            )
                          }
                        />
                        <input
                          className="form-control"
                          type="time"
                          value={splitLocalDateTime(billingGraceUntil).time}
                          onChange={(event) =>
                            setBillingGraceUntil(
                              mergeLocalDateTime(
                                billingGraceUntil,
                                "time",
                                event.target.value
                              )
                            )
                          }
                        />
                      </div>
                    </AppFormField>
                    <AppFormActions>
                      <button
                        className="btn btn-primary"
                        type="submit"
                        disabled={isActionSubmitting}
                      >
                        {language === "es" ? "Actualizar facturación" : "Update billing"}
                      </button>
                    </AppFormActions>
                  </AppForm>

                  <AppForm
                    className="tenant-action-form"
                    onSubmit={handleSubscriptionContractSubmit}
                  >
                    <h3 className="tenant-action-form__title">
                      {language === "es"
                        ? "Contrato comercial tenant"
                        : "Tenant commercial contract"}
                    </h3>
                    <AppFormField>
                      <FieldHelpLabel
                        label={language === "es" ? "Plan Base" : "Base plan"}
                        help={
                          language === "es"
                          ? "El tenant siempre debe mantener un Plan Base activo. Aquí escribes la suscripción formal."
                          : "The tenant must always keep an active Base plan. This writes the formal subscription."
                        }
                        placement="left"
                      />
                      <select
                        className="form-select"
                        value={subscriptionBasePlanCode}
                        onChange={(event) =>
                          setSubscriptionBasePlanCode(event.target.value)
                        }
                      >
                        {(capabilities?.base_plan_catalog || []).map((entry) => (
                          <option key={entry.plan_code} value={entry.plan_code}>
                            {entry.display_name}
                          </option>
                        ))}
                      </select>
                    </AppFormField>
                    <AppFormField>
                      <FieldHelpLabel
                        label={language === "es" ? "Ciclo base" : "Base cycle"}
                        help={
                          language === "es"
                            ? "La suscripción principal del tenant se alinea a este ciclo."
                            : "The tenant primary subscription aligns to this cycle."
                        }
                      />
                      <select
                        className="form-select"
                        value={subscriptionBillingCycle}
                        onChange={(event) =>
                          setSubscriptionBillingCycle(event.target.value)
                        }
                      >
                        {(capabilities?.subscription_billing_cycles || []).map((value) => (
                          <option key={value} value={value}>
                            {getTenantBillingCycleLabel(value)}
                          </option>
                        ))}
                      </select>
                    </AppFormField>
                    <div className="app-form-field app-form-field--full">
                      <div className="tenant-help-box">
                        <div className="tenant-scope-list">
                          <div className="tenant-scope-list__item">
                            <strong>
                              {language === "es"
                                ? "Estado de suscripción"
                                : "Subscription status"}
                            </strong>
                            :{" "}
                            {displayPlatformCode(
                              selectedTenantSummary?.subscription_status || "active",
                              language
                            )}
                          </div>
                          <div className="tenant-scope-list__item">
                            <strong>
                              {language === "es"
                                ? "Renovación próxima"
                                : "Next renewal"}
                            </strong>
                            :{" "}
                            {formatDateTime(
                              selectedTenantSummary?.subscription_next_renewal_at
                            )}
                          </div>
                          <div className="tenant-scope-list__item">
                            <strong>
                              {language === "es"
                                ? "Fin de período"
                                : "Current period end"}
                            </strong>
                            :{" "}
                            {formatDateTime(
                              selectedTenantSummary?.subscription_current_period_ends_at
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="app-form-field app-form-field--full">
                      <FieldHelpLabel
                        label={
                          language === "es"
                            ? "Add-ons arrendables"
                            : "Rentable add-ons"
                        }
                        help={
                          language === "es"
                            ? "Selecciona los módulos adicionales realmente contratados. Si quitas uno ya activo, quedará programado para salida al cierre del período actual."
                            : "Select the additional modules that are actually contracted. Removing an active one schedules it to leave at the end of the current period."
                        }
                        placement="left"
                      />
                      <div className="tenant-help-box">
                        {rentableModuleCatalog.map((entry) => {
                          const currentItem =
                            selectedTenantContractItems.get(entry.module_key) || null;
                          return (
                            <div
                              key={`subscription-addon-${entry.module_key}`}
                              className="tenant-scope-list__item"
                            >
                              <label className="tenant-checkbox-inline">
                                <input
                                  type="checkbox"
                                  checked={Boolean(
                                    subscriptionAddonSelections[entry.module_key]
                                  )}
                                  onChange={(event) =>
                                    setSubscriptionAddonSelections((current) => ({
                                      ...current,
                                      [entry.module_key]: event.target.checked,
                                    }))
                                  }
                                />
                                <strong>
                                  {getTenantPlanModuleLabel(entry.module_key)}
                                </strong>
                              </label>
                              <div className="tenant-inline-select">
                                <select
                                  className="form-select"
                                  value={
                                    subscriptionAddonBillingCycles[entry.module_key] ||
                                    entry.billing_cycles[0] ||
                                    subscriptionBillingCycle
                                  }
                                  onChange={(event) =>
                                    setSubscriptionAddonBillingCycles((current) => ({
                                      ...current,
                                      [entry.module_key]: event.target.value,
                                    }))
                                  }
                                  disabled={!subscriptionAddonSelections[entry.module_key]}
                                >
                                  {entry.billing_cycles.map((value) => (
                                    <option key={`${entry.module_key}-${value}`} value={value}>
                                      {getTenantBillingCycleLabel(value)}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              {currentItem ? (
                                <div className="tenant-help-text">
                                  {language === "es"
                                    ? "Actual"
                                    : "Current"}
                                  : {displayPlatformCode(currentItem.status, language)}
                                  {currentItem.billing_cycle
                                    ? ` · ${getTenantBillingCycleLabel(
                                        currentItem.billing_cycle
                                      )}`
                                    : ""}
                                </div>
                              ) : (
                                <div className="tenant-help-text">
                                  {language === "es"
                                    ? "Aún no contratado"
                                    : "Not contracted yet"}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className="app-form-field app-form-field--full">
                      <p className="tenant-help-text mt-2 mb-2">
                        {language === "es"
                          ? "Vista previa de la activación efectiva:"
                          : "Effective activation preview:"}
                      </p>
                      <div className="tenant-help-box">
                        <div>
                          <strong>{language === "es" ? "Plan Base" : "Base Plan"}</strong>:{" "}
                          {formatTenantModuleList(
                            defaultBasePlanCatalog?.included_modules || null,
                            language
                          )}
                        </div>
                        <div>
                          <strong>{language === "es" ? "Add-ons" : "Add-ons"}</strong>:{" "}
                          {selectedTenantSubscriptionAddons.length
                            ? selectedTenantSubscriptionAddons
                                .map((moduleKey) => getTenantPlanModuleLabel(moduleKey))
                                .join(", ")
                            : language === "es"
                              ? "sin add-ons arrendados"
                              : "no rented add-ons"}
                        </div>
                        <div>
                          <strong>
                            {language === "es"
                              ? "Dependencias técnicas auto-resueltas"
                              : "Auto-resolved technical dependencies"}
                          </strong>
                          :{" "}
                          {selectedTenantSubscriptionTechnicalPreview.length
                            ? selectedTenantSubscriptionTechnicalPreview
                                .map((moduleKey) => getTenantPlanModuleLabel(moduleKey))
                                .join(", ")
                            : language === "es"
                              ? "sin dependencias técnicas adicionales"
                              : "no extra technical dependencies"}
                        </div>
                      </div>
                    </div>
                    <AppFormActions>
                      <button
                        className="btn btn-primary"
                        type="submit"
                        disabled={
                          isActionSubmitting ||
                          !subscriptionBasePlanCode ||
                          !subscriptionBillingCycle
                        }
                      >
                        {language === "es"
                          ? "Guardar contratación"
                          : "Save subscription contract"}
                      </button>
                    </AppFormActions>
                  </AppForm>

                  {selectedTenantSummary.legacy_plan_fallback_active ? (
                    <AppForm className="tenant-action-form" onSubmit={handlePlanSubmit}>
                      <h3 className="tenant-action-form__title">
                        {language === "es"
                          ? "Baseline legacy por plan_code"
                          : "Legacy plan_code baseline"}
                      </h3>
                    <AppFormField fullWidth>
                      <FieldHelpLabel
                        label={
                          language === "es"
                            ? "Plan operativo actual"
                            : "Current operational plan"
                        }
                        help={
                          language === "es"
                            ? "Este campo sigue escribiendo `plan_code` solo para compatibilidad legacy. Si el tenant ya está gestionado por contrato, la activación y los límites base visibles salen desde `tenant_subscriptions`."
                            : "This field still writes `plan_code` only for legacy compatibility. If the tenant is already contract-managed, visible activation and base limits come from `tenant_subscriptions`."
                        }
                        placement="left"
                      />
                      <select
                        className="form-select"
                        value={planCode}
                        onChange={(event) => setPlanCode(event.target.value)}
                      >
                        <option value="">{language === "es" ? "Sin plan" : "No plan"}</option>
                        {planOptions.map((value) => (
                          <option key={value} value={value}>
                            {value}
                          </option>
                        ))}
                      </select>
                    </AppFormField>
                    <div className="app-form-field app-form-field--full">
                      <div className="tenant-help-box">
                        <p className="tenant-help-text mb-0">
                          {language === "es"
                            ? "Etapa 15 ya no se explica como `plan-driven puro`: el modelo aprobado es `Plan Base + add-ons`, y el baseline técnico también sale desde la suscripción cuando el tenant ya fue recontratado."
                            : "Stage 15 is no longer explained as pure `plan-driven`: the approved model is `Base plan + add-ons`, and the technical baseline also comes from the subscription once the tenant has been recontracted."}
                        </p>
                        <div className="tenant-scope-list">
                          <div className="tenant-scope-list__item">
                            <strong>{language === "es" ? "Plan Base" : "Base plan"}</strong>:{" "}
                            {defaultBasePlanCatalog
                              ? `${defaultBasePlanCatalog.display_name} · ${defaultBasePlanCatalog.included_modules
                                  .map((moduleKey) => getTenantPlanModuleLabel(moduleKey))
                                  .join(", ")}`
                              : language === "es"
                                ? "sin catálogo visible"
                                : "no visible catalog"}
                          </div>
                          {rentableModuleCatalog.map((entry) => (
                            <div key={entry.module_key} className="tenant-scope-list__item">
                              <strong>{getTenantPlanModuleLabel(entry.module_key)}</strong>:{" "}
                              {entry.billing_cycles
                                .map((value) => getTenantBillingCycleLabel(value))
                                .join(", ")}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="app-form-field app-form-field--full">
                      {planCode && planCatalogByCode.get(planCode)?.enabled_modules?.length ? (
                        <>
                          <p className="tenant-help-text mt-2 mb-2">
                            {language === "es"
                              ? "Compatibilidad efectiva actual si aplicas este plan:"
                              : "Current effective compatibility if you apply this plan:"}
                          </p>
                          <div className="tenant-list__chips">
                            {(planCatalogByCode.get(planCode)?.enabled_modules || []).map(
                              (moduleKey) => (
                                <span key={moduleKey} className="tenant-chip">
                                  {getTenantPlanModuleLabel(moduleKey)}
                                </span>
                              )
                            )}
                          </div>
                          {planCatalogByCode.get(planCode)?.module_limits &&
                          Object.keys(planCatalogByCode.get(planCode)?.module_limits || {})
                            .length ? (
                            <>
                              <p className="tenant-help-text mt-3 mb-2">
                                {language === "es"
                                  ? "Límites por módulo que también entrarán por este plan:"
                                  : "Per-module limits that will also come with this plan:"}
                              </p>
                              <div className="tenant-help-box">
                                {Object.entries(
                                  planCatalogByCode.get(planCode)?.module_limits || {}
                                ).map(([limitKey, amount]) => (
                                  <div key={limitKey}>
                                    <strong>{displayPlatformCode(limitKey, language)}</strong>: {amount}
                                  </div>
                                ))}
                              </div>
                            </>
                          ) : null}
                          {selectedTenantPlanDependencyStatus.covered.length ? (
                            <>
                              <p className="tenant-help-text mt-3 mb-2">
                                {language === "es"
                                  ? "Dependencias ya cubiertas por este plan:"
                                  : "Dependencies already covered by this plan:"}
                              </p>
                              <div className="tenant-help-box">
                                {selectedTenantPlanDependencyStatus.covered.map((entry) => (
                                  <div key={`covered-${entry.module_key}`}>
                                    <strong>{getTenantPlanModuleLabel(entry.module_key)}</strong>:{" "}
                                    {entry.requires_modules
                                      .map((moduleKey) => getTenantPlanModuleLabel(moduleKey))
                                      .join(", ")}
                                  </div>
                                ))}
                              </div>
                            </>
                          ) : null}
                          {selectedTenantPlanDependencyStatus.missing.length ? (
                            <>
                              <p className="tenant-help-text mt-3 mb-2">
                                {language === "es"
                                  ? "Dependencias faltantes que este plan todavía no cubre:"
                                  : "Missing dependencies that this plan does not cover yet:"}
                              </p>
                              <div className="tenant-help-box">
                                {selectedTenantPlanDependencyStatus.missing.map((entry) => (
                                  <div key={`missing-${entry.module_key}`}>
                                    <strong>{getTenantPlanModuleLabel(entry.module_key)}</strong>:{" "}
                                    {entry.requires_modules
                                      .filter(
                                        (moduleKey) =>
                                          !selectedTenantPlanDependencyStatus.enabledModules.includes(
                                            moduleKey
                                          )
                                      )
                                      .map((moduleKey) => getTenantPlanModuleLabel(moduleKey))
                                      .join(", ")}
                                  </div>
                                ))}
                              </div>
                            </>
                          ) : null}
                        </>
                      ) : null}
                      <p className="tenant-help-text mt-2 mb-0">
                        {language === "es"
                          ? "Aquí solo ajustas la compatibilidad legacy por `plan_code`. La contratación comercial real y el baseline técnico de tenants gestionados ya viven en la suscripción tenant."
                          : "This block only adjusts legacy `plan_code` compatibility. Real commercial contracting and the technical baseline for managed tenants already live in the tenant subscription above."}
                      </p>
                    </div>
                      <AppFormActions>
                        <button
                          className="btn btn-primary"
                          type="submit"
                          disabled={isActionSubmitting}
                        >
                          {language === "es" ? "Actualizar plan" : "Update plan"}
                        </button>
                      </AppFormActions>
                    </AppForm>
                  ) : (
                    <div className="tenant-inline-note">
                      {language === "es"
                        ? "No hay baseline legacy activo para este tenant. La gestión contractual vigente ya vive por completo en `tenant_subscriptions`."
                        : "There is no active legacy baseline for this tenant. Current contract management already lives entirely in `tenant_subscriptions`."}
                    </div>
                  )}

                  <AppForm className="tenant-action-form" onSubmit={handleRateLimitSubmit}>
                    <h3 className="tenant-action-form__title">
                      {language === "es" ? "Límites de tasa" : "Rate limits"}
                    </h3>
                    <AppFormField>
                      <FieldHelpLabel
                        label={language === "es" ? "Lecturas req/min" : "Read req/min"}
                        help={
                          language === "es"
                            ? "Override específico para el máximo de lecturas por minuto. Vacío hereda; `0` deja sin límite."
                            : "Specific override for the maximum reads per minute. Empty inherits; `0` removes the limit."
                        }
                      />
                      <input
                        className="form-control"
                        type="number"
                        min="0"
                        value={readRateLimit}
                        onChange={(event) => setReadRateLimit(event.target.value)}
                      />
                    </AppFormField>
                    <AppFormField>
                      <FieldHelpLabel
                        label={language === "es" ? "Escrituras req/min" : "Write req/min"}
                        help={
                          language === "es"
                            ? "Override específico para el máximo de escrituras por minuto. Vacío hereda; `0` deja sin límite."
                            : "Specific override for the maximum writes per minute. Empty inherits; `0` removes the limit."
                        }
                      />
                      <input
                        className="form-control"
                        type="number"
                        min="0"
                        value={writeRateLimit}
                        onChange={(event) => setWriteRateLimit(event.target.value)}
                      />
                    </AppFormField>
                    <div className="app-form-field app-form-field--full">
                      <p className="tenant-help-text mt-2 mb-0">
                        {language === "es"
                          ? "Vacío vuelve al plan/global. `0` quita el límite de esa categoría."
                          : "Leave it empty to return to the plan or global configuration. Use `0` to remove the limit for that category."}
                      </p>
                    </div>
                    <AppFormActions>
                      <button
                        className="btn btn-primary"
                        type="submit"
                        disabled={isActionSubmitting}
                      >
                        {language === "es" ? "Actualizar límites de tasa" : "Update rate limits"}
                      </button>
                    </AppFormActions>
                  </AppForm>

                  <AppForm
                    className="tenant-action-form"
                    onSubmit={handleBillingIdentitySubmit}
                  >
                    <h3 className="tenant-action-form__title">
                      {language === "es" ? "Identidad de billing" : "Billing identity"}
                    </h3>
                    <AppFormField fullWidth>
                      <FieldHelpLabel
                        label={language === "es" ? "Proveedor" : "Provider"}
                        help={
                          language === "es"
                            ? "Proveedor externo que gestiona la suscripción o cobro del tenant."
                            : "External provider that manages the tenant subscription or charging."
                        }
                        placement="left"
                      />
                      <select
                        className="form-select"
                        value={billingProvider}
                        onChange={(event) => setBillingProvider(event.target.value)}
                      >
                        <option value="">{language === "es" ? "ninguno" : "none"}</option>
                        {(capabilities?.billing_providers || []).map((value) => (
                          <option key={value} value={value}>
                            {value}
                          </option>
                        ))}
                      </select>
                    </AppFormField>
                    <AppFormField fullWidth>
                      <FieldHelpLabel
                        label="Customer ID"
                        help={
                          language === "es"
                            ? "Identificador del cliente dentro del proveedor de billing."
                            : "Customer identifier inside the billing provider."
                        }
                        placement="left"
                      />
                      <input
                        className="form-control"
                        value={billingProviderCustomerId}
                        onChange={(event) =>
                          setBillingProviderCustomerId(event.target.value)
                        }
                      />
                    </AppFormField>
                    <AppFormField fullWidth>
                      <FieldHelpLabel
                        label="Subscription ID"
                        help={
                          language === "es"
                            ? "Identificador de la suscripción o contrato activo en el proveedor de billing."
                            : "Identifier of the active subscription or contract in the billing provider."
                        }
                        placement="left"
                      />
                      <input
                        className="form-control"
                        value={billingProviderSubscriptionId}
                        onChange={(event) =>
                          setBillingProviderSubscriptionId(event.target.value)
                        }
                      />
                    </AppFormField>
                    <AppFormActions>
                      <button
                        className="btn btn-primary"
                        type="submit"
                        disabled={isActionSubmitting}
                      >
                        {language === "es" ? "Actualizar identidad de billing" : "Update billing identity"}
                      </button>
                    </AppFormActions>
                  </AppForm>

                  <AppForm className="tenant-action-form" onSubmit={handleModuleLimitsSubmit}>
                    <h3 className="tenant-action-form__title">
                      {language === "es" ? "Límites por módulo" : "Module limits"}
                    </h3>
                    <div className="app-form-field app-form-field--full">
                      <p className="tenant-help-text mb-0">
                        {language === "es"
                          ? "Vacío limpia el override tenant para esa clave. `0` significa ilimitado para ese override."
                          : "Empty clears the tenant override for that key. `0` means unlimited for that override."}
                      </p>
                    </div>
                    <AppFormField fullWidth>
                      <div className="tenant-module-limit-grid">
                        {moduleLimitKeys.map((key) => (
                          <div key={key} className="tenant-module-limit-row">
                            <label className="form-label">
                              <span className="tenant-module-limit-key">
                                <code>{key}</code>
                              </span>
                              {moduleLimitCapabilityMap.get(key)?.description ? (
                                <span className="tenant-module-limit-description">
                                  {moduleLimitCapabilityMap.get(key)?.description}
                                </span>
                              ) : null}
                            </label>
                            <input
                              className="form-control"
                              type="number"
                              min="0"
                              value={moduleLimitDrafts[key] || ""}
                              onChange={(event) =>
                                setModuleLimitDrafts((current) => ({
                                  ...current,
                                  [key]: event.target.value,
                                }))
                              }
                            />
                          </div>
                        ))}
                      </div>
                    </AppFormField>
                    <AppFormActions>
                      <button
                        className="btn btn-primary"
                        type="submit"
                        disabled={isActionSubmitting}
                      >
                        {language === "es" ? "Actualizar límites por módulo" : "Update module limits"}
                      </button>
                    </AppFormActions>
                  </AppForm>

                  <AppForm className="tenant-action-form" onSubmit={handleTenantSchemaSync}>
                    <h3 className="tenant-action-form__title">
                      {language === "es" ? "Esquema tenant" : "Tenant schema"}
                    </h3>
                    <div className="app-form-field app-form-field--full">
                      <p className="tenant-help-text mb-0">
                        {language === "es"
                          ? <>Sincroniza migraciones tenant cuando falten tablas como <code>finance_entries</code> o la base no esté al día.</>
                          : <>Run tenant schema sync when tables such as <code>finance_entries</code> are missing or the tenant database is still not up to date.</>}
                      </p>
                    </div>
                    <AppFormActions>
                      <button
                        className="btn btn-primary"
                        type="submit"
                        disabled={isActionSubmitting}
                      >
                        {language === "es" ? "Sincronizar esquema tenant" : "Sync tenant schema"}
                      </button>
                    </AppFormActions>
                  </AppForm>

                  <AppForm
                    className="tenant-action-form"
                    onSubmit={handleResetTenantPortalPassword}
                  >
                    <h3 className="tenant-action-form__title">
                      {language === "es" ? "Acceso portal tenant" : "Tenant portal access"}
                    </h3>
                    <div className="app-form-field app-form-field--full">
                      <p className="tenant-help-text mb-0">
                        {language === "es"
                          ? "Reinicia la contraseña de un usuario del portal. No cambia la credencial técnica de la base."
                          : "Use this block to reset a tenant portal user password when it was forgotten. It does not change the tenant database technical credential."}
                      </p>
                    </div>
                    <AppFormField fullWidth>
                      <FieldHelpLabel
                        label={language === "es" ? "Usuario portal tenant" : "Tenant portal user"}
                        help={
                          language === "es"
                            ? "Selecciona un usuario real cargado desde la base tenant actual. Esto evita intentar reinicios sobre correos que no existen."
                            : "Select a real user loaded from the current tenant database. This avoids trying resets on emails that do not exist."
                        }
                        placement="left"
                      />
                      <select
                        className="form-select"
                        required
                        value={tenantPortalResetEmail}
                        onChange={(event) => setTenantPortalResetEmail(event.target.value)}
                      >
                        <option value="">
                          {tenantPortalUsers.length > 0
                            ? language === "es"
                              ? "Selecciona un usuario tenant"
                              : "Select a tenant user"
                            : language === "es"
                              ? "No hay usuarios tenant disponibles"
                              : "There are no tenant users available"}
                        </option>
                        {tenantPortalUsers.map((user) => (
                          <option key={user.id} value={user.email}>
                            {`${user.email} · ${user.role} · ${
                              user.is_active
                                ? language === "es"
                                  ? "activo"
                                  : "active"
                                : language === "es"
                                  ? "inactivo"
                                  : "inactive"
                            }`}
                          </option>
                        ))}
                      </select>
                    </AppFormField>
                    <div className="app-form-field app-form-field--full">
                      <p className="tenant-help-text mb-0">
                        {language === "es"
                          ? "La lista sale de la base tenant activa. Si no aparecen usuarios, revisa acceso técnico o bootstrap."
                          : "The list is loaded from the active tenant database. If users do not appear, review the tenant technical access or its user bootstrap."}
                      </p>
                    </div>
                    {tenantPortalLastResetEmail && tenantPortalLastResetPassword ? (
                      <div className="app-form-field app-form-field--full">
                        <p className="tenant-help-text mb-0">
                          {language === "es"
                            ? "Contraseña temporal lista: puedes abrir el portal con el botón rápido."
                            : "Temporary password ready: you can open the portal with the quick button. It is only stored in this browser for a few minutes."}
                        </p>
                      </div>
                    ) : null}
                    <AppFormField fullWidth>
                      <FieldHelpLabel
                        label={language === "es" ? "Nueva contraseña portal" : "New portal password"}
                        help={
                          language === "es"
                            ? "La nueva contraseña se aplica al usuario tenant indicado y no toca la contraseña técnica de la DB."
                            : "The new password is applied to the selected tenant user and does not touch the database technical password."
                        }
                        placement="left"
                      />
                      <input
                        className="form-control"
                        type="password"
                        required
                        value={tenantPortalResetPassword}
                        onChange={(event) =>
                          setTenantPortalResetPassword(event.target.value)
                        }
                      />
                    </AppFormField>
                    <AppFormActions>
                      <button
                        className="btn btn-primary"
                        type="submit"
                        disabled={
                          isActionSubmitting ||
                          !tenantPortalResetEmail ||
                          !tenantPortalResetPassword
                        }
                      >
                        {language === "es" ? "Reiniciar contraseña portal" : "Reset portal password"}
                      </button>
                    </AppFormActions>
                  </AppForm>
                </div>
              </PanelCard>

              {moduleUsageError ? (
                <ErrorState
                  title={language === "es" ? "Uso por módulo no disponible" : "Module usage unavailable"}
                  detail={moduleUsageError.payload?.detail || moduleUsageError.message}
                  requestId={moduleUsageError.payload?.request_id}
                />
              ) : null}

              {moduleUsageNotice ? (
                <PanelCard
                  title={language === "es" ? "Uso por módulo no disponible" : "Module usage unavailable"}
                  subtitle={moduleUsageNotice}
                >
                  <div className="text-secondary">
                    {language === "es"
                      ? "Completa el provisioning del tenant o su configuración de base de datos para habilitar esta vista."
                      : "Finish tenant provisioning or its database configuration to enable this view."}
                  </div>
                </PanelCard>
              ) : null}

              {moduleUsage ? (
                <DataTableCard
                  title={language === "es" ? "Uso por módulo" : "Module usage"}
                  rows={moduleUsage.data}
                  columns={[
                    {
                      key: "module_key",
                      header: language === "es" ? "Clave de módulo" : "Module key",
                      render: (row) => <code>{row.module_key}</code>,
                    },
                    {
                      key: "used_units",
                      header: language === "es" ? "Usado" : "Used",
                      render: (row) => row.used_units,
                    },
                    {
                      key: "max_units",
                      header: language === "es" ? "Límite" : "Limit",
                      render: (row) =>
                        row.unlimited ? (language === "es" ? "ilimitado" : "unlimited") : row.max_units ?? "—",
                    },
                    {
                      key: "remaining_units",
                      header: language === "es" ? "Restante" : "Remaining",
                      render: (row) =>
                        row.unlimited ? "—" : row.remaining_units ?? "—",
                    },
                    {
                      key: "limit_source",
                      header: language === "es" ? "Fuente" : "Source",
                      render: (row) => row.limit_source || (language === "es" ? "ninguna" : "none"),
                    },
                    {
                      key: "at_limit",
                      header: language === "es" ? "Estado" : "Status",
                      render: (row) =>
                        row.at_limit ? (
                          <AppBadge tone="warning">{language === "es" ? "al-límite" : "at limit"}</AppBadge>
                        ) : (
                          <AppBadge tone="success">ok</AppBadge>
                        ),
                    },
                  ]}
                />
              ) : null}

              {policyHistoryError ? (
                <ErrorState
                  title={language === "es" ? "Historial de políticas no disponible" : "Policy history unavailable"}
                  detail={policyHistoryError.payload?.detail || policyHistoryError.message}
                  requestId={policyHistoryError.payload?.request_id}
                />
              ) : null}

              {policyHistory.length > 0 ? (
                <DataTableCard
                  title={language === "es" ? "Historial de políticas" : "Policy history"}
                  rows={policyHistory}
                  columns={[
                    {
                      key: "recorded_at",
                      header: language === "es" ? "Registrado en" : "Recorded at",
                      render: (row) => formatDateTime(row.recorded_at),
                    },
                    {
                      key: "event_type",
                      header: language === "es" ? "Evento" : "Event",
                      render: (row) => row.event_type,
                    },
                    {
                      key: "actor_email",
                      header: language === "es" ? "Actor" : "Actor",
                      render: (row) =>
                        row.actor_email ||
                        row.actor_role ||
                        (language === "es" ? "sistema" : "system"),
                    },
                    {
                      key: "changed_fields",
                      header: language === "es" ? "Campos cambiados" : "Changed fields",
                      render: (row) =>
                        row.changed_fields.length > 0
                          ? row.changed_fields.join(", ")
                          : language === "es"
                            ? "ninguno"
                            : "none",
                    },
                  ]}
                />
              ) : !policyHistoryError ? (
                <PanelCard
                  title={language === "es" ? "Historial de políticas" : "Policy history"}
                  subtitle={
                    language === "es"
                      ? "Mutaciones recientes de política aplicadas desde la operación de plataforma."
                      : "Recent policy mutations applied from platform operations."
                  }
                >
                  <div className="text-secondary">
                    {language === "es"
                      ? "Aún no hay mutaciones de política registradas para este tenant."
                      : "There are no policy mutations recorded for this tenant yet."}
                  </div>
                </PanelCard>
              ) : null}
            </>
          ) : !isListLoading ? (
            <PanelCard title={language === "es" ? "Detalle del tenant" : "Tenant detail"}>
              <div className="text-secondary">
                {language === "es"
                  ? "Selecciona un tenant desde el panel izquierdo para inspeccionar estado, billing, políticas y controles administrativos."
                  : "Select a tenant from the left panel to inspect status, billing, policies and administrative controls."}
              </div>
            </PanelCard>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function DetailField({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div>
      <div className="tenant-detail__label">{label}</div>
      <div className="tenant-detail__value">{value}</div>
    </div>
  );
}

function FieldHelpLabel({
  label,
  help,
  placement = "right",
}: {
  label: string;
  help: string;
  placement?: "right" | "left";
}) {
  return (
    <div className={`inline-help inline-help--${placement}`}>
      <span className="form-label mb-0">{label}</span>
      <button
        className="inline-help__trigger"
        type="button"
        aria-label={`${
          getCurrentLanguage() === "es" ? "Ayuda sobre" : "Help about"
        } ${label}`}
      >
        ?
      </button>
      <div className="inline-help__bubble">{help}</div>
    </div>
  );
}

function slugifyTenantName(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function normalizeNullableString(value: string): string | null {
  const normalized = value.trim();
  return normalized ? normalized : null;
}

function parseNullableInteger(value: string): number | null {
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }
  const parsed = Number.parseInt(normalized, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function toApiDateTime(value: string): string | null {
  if (!value.trim()) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString();
}

function splitLocalDateTime(value: string): { date: string; time: string } {
  if (!value.trim()) {
    return {
      date: "",
      time: "",
    };
  }

  const [date = "", time = ""] = value.split("T");
  return {
    date,
    time: time.slice(0, 5),
  };
}

function mergeLocalDateTime(
  currentValue: string,
  part: "date" | "time",
  nextValue: string
): string {
  const current = splitLocalDateTime(currentValue);
  const date = part === "date" ? nextValue : current.date;
  const time = part === "time" ? nextValue : current.time;

  if (!date) {
    return "";
  }

  return `${date}T${time || "00:00"}`;
}

function toDateTimeLocalInput(value: string | null): string {
  if (!value) {
    return "";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }
  const offset = parsed.getTimezoneOffset();
  const local = new Date(parsed.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

function formatDateTime(value: string | null): string {
  const language = getCurrentLanguage();
  if (!value) {
    return language === "es" ? "n/d" : "n/a";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString(getCurrentLocale(language));
}

function formatTenantSchemaSignal(
  language: "es" | "en",
  schemaStatus: PlatformTenantSchemaStatusResponse | null,
  schemaStatusError: ApiError | null
): string {
  if (schemaStatus) {
    if (schemaStatus.pending_count > 0) {
      return language === "es"
        ? `${schemaStatus.pending_count} pendiente(s)`
        : `${schemaStatus.pending_count} pending`;
    }
    return language === "es" ? "al día" : "up to date";
  }

  if (matchesTenantDbCredentialsIssue(schemaStatusError?.payload?.detail)) {
    return language === "es" ? "credencial inválida" : "invalid credential";
  }
  if (matchesTenantSchemaIncompleteIssue(schemaStatusError?.payload?.detail)) {
    return language === "es" ? "esquema incompleto" : "incomplete schema";
  }
  if (schemaStatusError) {
    return language === "es" ? "sin lectura" : "no read";
  }
  return language === "es" ? "sin lectura reciente" : "no recent read";
}

function matchesTenantDbCredentialsIssue(detail: string | null | undefined): boolean {
  return (
    detail ===
    "Tenant database access failed. Rotate or reprovision tenant DB credentials before requesting module usage."
  );
}

function matchesTenantSchemaIncompleteIssue(
  detail: string | null | undefined
): boolean {
  return (
    detail ===
    "Tenant schema is incomplete. Run tenant schema sync or tenant migrations before requesting module usage."
  );
}

function getTenantOperationalPosture({
  language,
  tenant,
  accessPolicy,
  selectedProvisioningJob,
  schemaStatus,
  schemaStatusError,
  moduleUsageAvailabilityReason,
  moduleUsageError,
  canOpenTenantPortal,
}: {
  language: "es" | "en";
  tenant: PlatformTenant | null;
  accessPolicy: PlatformTenantAccessPolicy | null;
  selectedProvisioningJob: ProvisioningJob | null;
  schemaStatus: PlatformTenantSchemaStatusResponse | null;
  schemaStatusError: ApiError | null;
  moduleUsageAvailabilityReason: ModuleUsageAvailabilityReason;
  moduleUsageError: ApiError | null;
  canOpenTenantPortal: boolean;
}): TenantOperationalPosture | null {
  if (!tenant) {
    return null;
  }

  const blockingSource = accessPolicy?.access_blocking_source || null;
  const credentialDriftDetected =
    moduleUsageAvailabilityReason === "db-credentials-invalid" ||
    matchesTenantDbCredentialsIssue(schemaStatusError?.payload?.detail) ||
    matchesTenantDbCredentialsIssue(moduleUsageError?.payload?.detail);
  const schemaDriftDetected =
    moduleUsageAvailabilityReason === "schema-incomplete" ||
    matchesTenantSchemaIncompleteIssue(schemaStatusError?.payload?.detail) ||
    Boolean(schemaStatus && schemaStatus.pending_count > 0);

  if (accessPolicy && !accessPolicy.access_allowed) {
    const maintenanceBlock = blockingSource === "maintenance";
    return {
      tone: maintenanceBlock ? "warning" : "danger",
      label: language === "es" ? "bloqueado" : "blocked",
      dominantSignal: displayAccessBlockingSource(blockingSource, language),
      quickRead: accessPolicy.access_detail
        ? displayTenantAccessDetail(accessPolicy.access_detail, language)
        : language === "es"
          ? "La plataforma está bloqueando el acceso tenant por política efectiva."
          : "The platform is blocking tenant access through effective policy.",
      nextAction: maintenanceBlock
        ? language === "es"
          ? "Revisa la ventana o alcance de mantenimiento antes de tratar esto como incidente técnico."
          : "Review the maintenance window or scope before treating this as a technical incident."
        : language === "es"
          ? "Revisa lifecycle y billing antes de diagnosticar credenciales, frontend o runtime."
          : "Review lifecycle and billing before diagnosing credentials, frontend or runtime.",
      supportingNote:
        language === "es"
          ? "Si este bloqueo era inesperado, usa primero Política de acceso y el runbook de incidente tenant."
          : "If this blocking was unexpected, use Access policy and the tenant incident runbook first.",
      primaryAction: null,
    };
  }

  if (credentialDriftDetected) {
    return {
      tone: "danger",
      label: language === "es" ? "con drift" : "with drift",
      dominantSignal:
        language === "es" ? "credencial DB tenant" : "tenant DB credential",
      quickRead:
        language === "es"
          ? "La base tenant no aceptó la credencial técnica actual o no pudo validarse operativamente."
          : "The tenant database rejected the current technical credential or it could not be validated operationally.",
      nextAction:
        language === "es"
          ? "Rotar credenciales técnicas y luego revalidar schema, defaults y auditoría tenant."
          : "Rotate technical credentials and then revalidate schema, defaults and tenant audit.",
      supportingNote:
        language === "es"
          ? "Esto apunta a drift tenant-local y no a reapertura automática del slice funcional."
          : "This points to tenant-local drift and not to automatic reopening of the functional slice.",
      primaryAction: "rotate-credentials",
    };
  }

  if (!tenant.db_configured || moduleUsageAvailabilityReason === "db-incomplete") {
    if (selectedProvisioningJob?.status === "failed") {
      return {
        tone: "danger",
        label: language === "es" ? "requiere intervención" : "needs intervention",
        dominantSignal: language === "es" ? "provisioning fallido" : "failed provisioning",
        quickRead:
          language === "es"
            ? "El tenant todavía no quedó operativo porque el último job técnico agotó sus intentos."
            : "The tenant is still not operational because the latest technical job exhausted its attempts.",
        nextAction:
          language === "es"
            ? "Reintentar el job o abrir Provisioning para revisar el error técnico real."
            : "Retry the job or open Provisioning to review the real technical error.",
        supportingNote:
          selectedProvisioningJob.error_message ||
          (language === "es"
            ? "No cierres esto como bug funcional hasta confirmar la causa de provisioning."
            : "Do not close this as a functional bug until you confirm the provisioning root cause."),
        primaryAction: "retry-provisioning",
      };
    }

    if (selectedProvisioningJob?.status === "completed") {
      return {
        tone: "warning",
        label: language === "es" ? "incompleto" : "incomplete",
        dominantSignal:
          language === "es"
            ? "DB tenant no convergida"
            : "tenant DB not converged",
        quickRead:
          language === "es"
            ? "Existe historial técnico completado, pero la configuración DB no quedó íntegra."
            : "There is completed technical history, but DB configuration did not remain complete.",
        nextAction:
          language === "es"
            ? "Reprovisionar el tenant para recomponer su base antes de revisar otros bloques."
            : "Reprovision the tenant to rebuild its database before reviewing other blocks.",
        supportingNote:
          language === "es"
            ? "Este patrón suele indicar drift entre job histórico y configuración efectiva."
            : "This pattern usually indicates drift between historical job state and effective configuration.",
        primaryAction: "reprovision",
      };
    }

    if (
      selectedProvisioningJob?.status === "pending" ||
      selectedProvisioningJob?.status === "retry_pending"
    ) {
      return {
        tone: "warning",
        label: language === "es" ? "pendiente" : "pending",
        dominantSignal: language === "es" ? "provisioning en cola" : "queued provisioning",
        quickRead:
          language === "es"
            ? "La base tenant todavía no está lista y el job técnico sigue esperando ejecución."
            : "The tenant database is not ready yet and the technical job is still waiting to run.",
        nextAction:
          language === "es"
            ? "Ejecutar ahora o abrir Provisioning si necesitas revisar el contexto de cola."
            : "Run now or open Provisioning if you need to inspect queue context.",
        supportingNote:
          language === "es"
            ? "No corresponde diagnosticar frontend o credenciales mientras el provisioning sigue pendiente."
            : "Do not diagnose frontend or credentials while provisioning is still pending.",
        primaryAction: "run-provisioning",
      };
    }

    if (selectedProvisioningJob?.status === "running") {
      return {
        tone: "info",
        label: language === "es" ? "en curso" : "in progress",
        dominantSignal: language === "es" ? "provisioning activo" : "active provisioning",
        quickRead:
          language === "es"
            ? "El worker está procesando la preparación técnica del tenant en este momento."
            : "The worker is processing the tenant technical setup right now.",
        nextAction:
          language === "es"
            ? "Abrir Provisioning si necesitas leer el contexto del job; si no, espera cierre del ciclo."
            : "Open Provisioning if you need job context; otherwise wait for the cycle to finish.",
        supportingNote: null,
        primaryAction: "open-provisioning",
      };
    }

    return {
      tone: "warning",
      label: language === "es" ? "no listo" : "not ready",
      dominantSignal: language === "es" ? "DB tenant incompleta" : "incomplete tenant DB",
      quickRead:
        language === "es"
          ? "El tenant todavía no tiene base técnica completamente configurada."
          : "The tenant still does not have a fully configured technical database.",
      nextAction:
        language === "es"
          ? "Abrir Provisioning o reprovisionar el tenant antes de revisar módulos o portal."
          : "Open Provisioning or reprovision the tenant before reviewing modules or portal.",
      supportingNote: null,
      primaryAction: selectedProvisioningJob ? "open-provisioning" : "reprovision",
    };
  }

  if (schemaDriftDetected) {
    return {
      tone: "warning",
      label: language === "es" ? "desalineado" : "misaligned",
      dominantSignal: language === "es" ? "schema tenant" : "tenant schema",
      quickRead:
        language === "es"
          ? "La base tenant existe, pero su schema no está completamente alineado con el backend actual."
          : "The tenant database exists, but its schema is not fully aligned with the current backend.",
      nextAction:
        language === "es"
          ? "Sincronizar esquema tenant y luego revalidar la lectura por módulo."
          : "Sync tenant schema and then revalidate module usage.",
      supportingNote:
        schemaStatus?.pending_count && schemaStatus.pending_count > 0
          ? language === "es"
            ? `Hay ${schemaStatus.pending_count} migración(es) pendiente(s).`
            : `There are ${schemaStatus.pending_count} pending migration(s).`
          : null,
      primaryAction: "sync-schema",
    };
  }

  if (canOpenTenantPortal) {
    return {
      tone: "success",
      label: language === "es" ? "sano" : "healthy",
      dominantSignal: language === "es" ? "sin drift crítico" : "no critical drift",
      quickRead:
        language === "es"
          ? "El tenant está activo, con acceso permitido, DB configurada y sin señales técnicas críticas en esta revisión."
          : "The tenant is active, access is allowed, the DB is configured and there are no critical technical signals in this review.",
      nextAction:
        language === "es"
          ? "Puedes abrir el portal tenant o seguir con lectura operativa fina por módulo."
          : "You can open the tenant portal or continue with detailed operational module reads.",
      supportingNote:
        language === "es"
          ? "Si el usuario reporta un problema igual, tratar primero como revalidación de runtime/caché."
          : "If the user still reports a problem, treat it first as runtime/cache revalidation.",
      primaryAction: "open-tenant-portal",
    };
  }

  return {
    tone: "neutral",
    label: language === "es" ? "en revisión" : "under review",
    dominantSignal: language === "es" ? "sin clasificación dominante" : "no dominant classification",
    quickRead:
      language === "es"
        ? "La señal actual no alcanza para cerrar si el problema es acceso, runtime o drift tenant-local."
        : "The current signal is not enough to close whether the problem is access, runtime or tenant-local drift.",
    nextAction:
      language === "es"
        ? "Revisar Política de acceso, Provisioning y Esquema tenant con el runbook antes de tocar código."
        : "Review Access policy, Provisioning and Tenant schema with the runbook before touching code.",
    supportingNote: null,
    primaryAction: "open-provisioning",
  };
}

function getTenantProvisioningAlertContext({
  language,
  tenantSlug,
  provisioningAlerts,
  provisioningAlertsError,
}: {
  language: "es" | "en";
  tenantSlug: string | null;
  provisioningAlerts: ProvisioningOperationalAlertsResponse | null;
  provisioningAlertsError: ApiError | null;
}): TenantProvisioningAlertContext | null {
  if (!tenantSlug) {
    return null;
  }

  if (provisioningAlertsError) {
    return {
      tone: "warning",
      label: language === "es" ? "sin lectura" : "no read",
      scopeLabel: language === "es" ? "requiere revisión manual" : "manual review required",
      quickRead:
        language === "es"
          ? "No se pudo leer la señal activa del ambiente; si estás investigando un incidente, abre Provisioning para confirmar si el drift es local o más amplio."
          : "The active environment signal could not be read; if you are investigating an incident, open Provisioning to confirm whether the drift is local or broader.",
      supportingNote: getApiErrorDisplayMessage(provisioningAlertsError),
      environmentAlertCount: null,
      tenantAlertCount: null,
      latestCapturedAt: null,
      showProvisioningLink: true,
      provisioningLink: "/provisioning",
    };
  }

  const alertsRows = provisioningAlerts?.data || [];
  const tenantAlerts = alertsRows.filter((row) => row.tenant_slug === tenantSlug);
  const otherTenantAlerts = alertsRows.filter(
    (row) => row.tenant_slug && row.tenant_slug !== tenantSlug
  );
  const sharedAlerts = alertsRows.filter((row) => !row.tenant_slug);
  const environmentAlertCount = provisioningAlerts?.total_alerts ?? 0;
  const tenantAlertCount = tenantAlerts.length;
  const broaderEnvironmentCount = otherTenantAlerts.length + sharedAlerts.length;
  const latestCapturedAt = getLatestProvisioningAlertCaptureAt(alertsRows);
  const tone = getProvisioningAlertsTone(
    tenantAlerts.length > 0 ? tenantAlerts : alertsRows
  );

  if (environmentAlertCount === 0) {
    return {
      tone: "success",
      label: language === "es" ? "sin alertas activas" : "no active alerts",
      scopeLabel: language === "es" ? "sin señal amplia visible" : "no visible broad signal",
      quickRead:
        language === "es"
          ? "El ambiente no muestra alertas activas de provisioning; si este tenant igual presenta drift, lo más probable es que sea un caso aislado o fuera de esta señal."
          : "The environment shows no active provisioning alerts; if this tenant still has drift, it is most likely an isolated case or outside this signal.",
      supportingNote:
        language === "es"
          ? "Usa igual el detalle fino de esquema, provisioning y credenciales si el síntoma sigue presente."
          : "Still use the detailed schema, provisioning and credentials sections if the symptom remains present.",
      environmentAlertCount,
      tenantAlertCount,
      latestCapturedAt,
      showProvisioningLink: false,
      provisioningLink: buildProvisioningWorkspaceLink(tenantSlug, null),
    };
  }

  if (tenantAlertCount > 0 && broaderEnvironmentCount === 0) {
    return {
      tone,
      label: language === "es" ? "alerta tenant-local" : "tenant-local alert",
      scopeLabel: language === "es" ? "centrada en este tenant" : "centered on this tenant",
      quickRead:
        language === "es"
          ? "Las alertas activas visibles apuntan a este tenant y no hay señal equivalente en otros tenants o a nivel compartido."
          : "The visible active alerts point to this tenant and there is no equivalent signal on other tenants or shared scope.",
      supportingNote:
        language === "es"
          ? `Se detectaron ${tenantAlertCount} alertas activas asociadas a ${tenantSlug}.`
          : `${tenantAlertCount} active alerts were detected for ${tenantSlug}.`,
      environmentAlertCount,
      tenantAlertCount,
      latestCapturedAt,
      showProvisioningLink: true,
      provisioningLink: buildProvisioningWorkspaceLink(tenantSlug, null),
    };
  }

  if (tenantAlertCount > 0) {
    return {
      tone,
      label: language === "es" ? "alerta amplia" : "broad alert",
      scopeLabel:
        language === "es"
          ? "tenant afectado dentro de un ambiente con señal"
          : "affected tenant inside a signaled environment",
      quickRead:
        language === "es"
          ? "Este tenant aparece en alertas activas y, además, el ambiente mantiene señal operativa en otros tenants o a nivel compartido."
          : "This tenant appears in active alerts and the environment also keeps an operational signal on other tenants or shared scope.",
      supportingNote:
        language === "es"
          ? `${tenantAlertCount} alertas afectan a este tenant y ${broaderEnvironmentCount} señales adicionales siguen activas fuera de él.`
          : `${tenantAlertCount} alerts affect this tenant and ${broaderEnvironmentCount} additional signals remain active outside it.`,
      environmentAlertCount,
      tenantAlertCount,
      latestCapturedAt,
      showProvisioningLink: true,
      provisioningLink: buildProvisioningWorkspaceLink(tenantSlug, null),
    };
  }

  return {
    tone,
    label: language === "es" ? "sin alerta directa" : "no direct alert",
    scopeLabel:
      language === "es"
        ? "ambiente con señal, tenant sin impacto visible"
        : "signaled environment, tenant without visible impact",
    quickRead:
      language === "es"
        ? "El ambiente tiene alertas activas, pero este tenant no aparece afectado directamente en la captura actual."
        : "The environment has active alerts, but this tenant does not appear directly affected in the current capture.",
    supportingNote:
      language === "es"
        ? `${broaderEnvironmentCount} alertas siguen activas fuera de ${tenantSlug}; revisa Provisioning solo si sospechas degradación compartida.`
        : `${broaderEnvironmentCount} alerts remain active outside ${tenantSlug}; open Provisioning only if you suspect shared degradation.`,
    environmentAlertCount,
    tenantAlertCount,
    latestCapturedAt,
    showProvisioningLink: true,
    provisioningLink: "/provisioning",
  };
}

function getTenantOperationalSummaryCards(
  language: "es" | "en",
  tenantOperationalPosture: TenantOperationalPosture | null,
  tenantProvisioningAlertContext: TenantProvisioningAlertContext | null
): OperationalSummaryCard[] {
  if (!tenantOperationalPosture) {
    return [];
  }

  const cards: OperationalSummaryCard[] = [
    {
      key: "posture",
      eyebrow: language === "es" ? "Prioridad actual" : "Current priority",
      tone: tenantOperationalPosture.tone,
      title: tenantOperationalPosture.label,
      detail: tenantOperationalPosture.dominantSignal,
    },
    {
      key: "next-action",
      eyebrow: language === "es" ? "Haz ahora" : "Do now",
      tone: tenantOperationalPosture.tone,
      title: tenantOperationalPosture.nextAction,
      detail:
        tenantOperationalPosture.supportingNote ||
        tenantOperationalPosture.quickRead,
    },
  ];

  if (tenantProvisioningAlertContext) {
    cards.push({
      key: "scope",
      eyebrow: language === "es" ? "Lectura ambiente" : "Environment read",
      tone: tenantProvisioningAlertContext.tone,
      title: tenantProvisioningAlertContext.label,
      detail: tenantProvisioningAlertContext.scopeLabel,
    });
  }

  return cards;
}

function getProvisioningAlertsTone(
  alertsRows: ProvisioningOperationalAlert[]
): AppBadgeTone {
  const severities = alertsRows.map((row) => row.severity.toLowerCase());
  if (
    severities.some((severity) =>
      ["critical", "danger", "error", "high"].includes(severity)
    )
  ) {
    return "danger";
  }
  if (severities.some((severity) => ["warning", "warn", "medium"].includes(severity))) {
    return "warning";
  }
  if (alertsRows.length === 0) {
    return "neutral";
  }
  return "info";
}

function getLatestProvisioningAlertCaptureAt(
  alertsRows: ProvisioningOperationalAlert[]
): string | null {
  let latest: string | null = null;
  alertsRows.forEach((row) => {
    if (!row.captured_at) {
      return;
    }
    if (!latest || row.captured_at > latest) {
      latest = row.captured_at;
    }
  });
  return latest;
}

function readArchiveObject(
  value: Record<string, unknown> | null | undefined,
  key: string
): Record<string, unknown> | null {
  if (!value) {
    return null;
  }
  const next = value[key];
  if (next && typeof next === "object" && !Array.isArray(next)) {
    return next as Record<string, unknown>;
  }
  return null;
}

function extractArchiveRows(
  value: Record<string, unknown> | null | undefined,
  path: string[]
): Array<Record<string, unknown>> {
  let current: unknown = value;
  for (const key of path) {
    if (!current || typeof current !== "object" || Array.isArray(current)) {
      return [];
    }
    current = (current as Record<string, unknown>)[key];
  }
  if (!Array.isArray(current)) {
    return [];
  }
  return current.filter(
    (row): row is Record<string, unknown> =>
      Boolean(row) && typeof row === "object" && !Array.isArray(row)
  );
}

function readArchiveString(
  row: Record<string, unknown>,
  key: string
): string | null {
  const value = row[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function readArchiveNumber(
  row: Record<string, unknown>,
  key: string
): number | null {
  const value = row[key];
  return typeof value === "number" ? value : null;
}

function formatArchiveStringArray(value: unknown): string {
  const language = getCurrentLanguage();
  if (!Array.isArray(value)) {
    return language === "es" ? "ninguno" : "none";
  }
  const items = value.filter((item): item is string => typeof item === "string");
  return items.length > 0 ? items.join(", ") : language === "es" ? "ninguno" : "none";
}

function formatArchiveAccessPolicy(
  summary: Record<string, unknown> | null
): string {
  const language = getCurrentLanguage();
  const accessPolicy = readArchiveObject(summary, "access_policy");
  if (!accessPolicy) {
    return language === "es" ? "sin snapshot" : "no snapshot";
  }
  const allowed = accessPolicy.allowed === true;
  const detail =
    typeof accessPolicy.detail === "string" ? accessPolicy.detail : null;
  const source =
    typeof accessPolicy.blocking_source === "string"
      ? accessPolicy.blocking_source
      : null;

  if (allowed) {
    return detail
      ? language === "es"
        ? `permitido (${detail})`
        : `allowed (${detail})`
      : language === "es"
        ? "permitido"
        : "allowed";
  }
  return source && detail
    ? language === "es"
      ? `bloqueado por ${source}: ${detail}`
      : `blocked by ${source}: ${detail}`
    : detail || (language === "es" ? "bloqueado" : "blocked");
}

function formatArchiveModuleLimits(
  summary: Record<string, unknown> | null
): string {
  const language = getCurrentLanguage();
  const tenantSnapshot = readArchiveObject(summary, "tenant");
  if (!tenantSnapshot) {
    return language === "es" ? "sin snapshot" : "no snapshot";
  }
  const limits = readArchiveObject(tenantSnapshot, "effective_module_limits");
  if (!limits) {
    return language === "es" ? "sin límites efectivos" : "no effective limits";
  }
  const entries = Object.entries(limits).filter(
    ([, value]) => typeof value === "number"
  );
  if (entries.length === 0) {
    return language === "es" ? "sin límites efectivos" : "no effective limits";
  }
  return entries.map(([key, value]) => `${key}: ${value}`).join(" | ");
}

function selectLatestProvisioningJob(
  jobs: ProvisioningJob[],
  tenantId: number
): ProvisioningJob | null {
  const tenantJobs = jobs
    .filter((job) => job.tenant_id === tenantId)
    .sort((left, right) => right.id - left.id);
  return tenantJobs[0] || null;
}

function buildProvisioningWorkspaceLink(tenantSlug: string, jobType: string | null): string {
  const searchParams = new URLSearchParams({
    tenantSlug,
  });
  const operation = getProvisioningOperationKind(jobType);
  if (operation !== "all") {
    searchParams.set("operation", operation);
  }
  return `/provisioning?${searchParams.toString()}`;
}

function getProvisioningOperationKind(
  jobType: string | null
): "all" | "provision" | "deprovision" | "schema" | "other" {
  if (!jobType) {
    return "all";
  }
  if (jobType === "create_tenant_database") {
    return "provision";
  }
  if (jobType === "deprovision_tenant_database") {
    return "deprovision";
  }
  if (jobType === "sync_tenant_schema" || jobType === "repair_tenant_schema") {
    return "schema";
  }
  return "other";
}

function formatProvisioningJobType(value: string): string {
  const language = getCurrentLanguage();
  const knownLabels: Record<string, string> = {
    create_tenant_database:
      language === "es" ? "Crear base del tenant" : "Create tenant database",
    deprovision_tenant_database:
      language === "es" ? "Desprovisionar base del tenant" : "Deprovision tenant database",
    sync_tenant_schema:
      language === "es" ? "Sincronizar esquema tenant" : "Sync tenant schema",
  };

  return knownLabels[value] || displayPlatformCode(value);
}

function getProvisioningStatusExplanation(status: string): string {
  const language = getCurrentLanguage();
  const knownMessages: Record<string, string> = {
    pending:
      language === "es"
        ? "El job está en cola y todavía no lo toma el worker."
        : "The job is queued and the worker has not picked it up yet.",
    running:
      language === "es"
        ? "El worker está procesando este job ahora mismo."
        : "The worker is processing this job right now.",
    retry_pending:
      language === "es"
        ? "Falló un intento, pero el job volverá a intentarse."
        : "One attempt failed, but the job will be retried.",
    completed:
      language === "es"
        ? "La base tenant y su bootstrap técnico quedaron listos."
        : "The tenant database and its technical bootstrap are ready.",
    failed:
      language === "es"
        ? "El job agotó sus intentos y ya requiere intervención explícita."
        : "The job exhausted its attempts and now requires explicit intervention.",
  };

  return (
    knownMessages[status] ||
    (language === "es"
      ? "Estado operativo de provisioning."
      : "Provisioning operational status.")
  );
}

function toggleScope(currentScopes: string[], scope: string): string[] {
  const current = new Set(currentScopes);

  if (scope === "all") {
    return current.has("all") ? [] : ["all"];
  }

  current.delete("all");
  if (current.has(scope)) {
    current.delete(scope);
  } else {
    current.add(scope);
  }
  return Array.from(current).sort();
}

function normalizeScopes(scopes: string[]): string[] {
  if (scopes.includes("all")) {
    return ["all"];
  }
  return Array.from(new Set(scopes)).sort();
}

function getTenantPlanModuleLabel(moduleKey: string): string {
  const language = getCurrentLanguage();
  const labels: Record<string, string> = {
    all: language === "es" ? "Todos los módulos" : "All modules",
    core: language === "es" ? "Core negocio" : "Business core",
    users: language === "es" ? "Usuarios" : "Users",
    finance: language === "es" ? "Finanzas" : "Finance",
    maintenance: language === "es" ? "Mantenciones" : "Maintenance",
  };

  return labels[moduleKey] || moduleKey;
}

function getTenantBillingCycleLabel(billingCycle: string): string {
  const language = getCurrentLanguage();
  const labels: Record<string, string> = {
    monthly: language === "es" ? "Mensual" : "Monthly",
    quarterly: language === "es" ? "Trimestral" : "Quarterly",
    semiannual: language === "es" ? "Semestral" : "Semiannual",
    annual: language === "es" ? "Anual" : "Annual",
  };

  return labels[billingCycle] || billingCycle;
}

function getTenantActivationSourceLabel(
  activationSource: string | null,
  language: "es" | "en"
): string {
  if (!activationSource) {
    return language === "es" ? "sin fuente visible" : "no visible source";
  }

  const labels: Record<string, string> = {
    subscriptions:
      language === "es" ? "suscripción tenant" : "tenant subscription",
    subscriptions_with_legacy_fallback:
      language === "es"
        ? "suscripción tenant + fallback legacy"
        : "tenant subscription + legacy fallback",
    legacy_plan_only: language === "es" ? "plan legacy" : "legacy plan",
  };

  return labels[activationSource] || activationSource;
}

function getTenantContractManagementLabel(
  subscriptionContractManaged: boolean,
  legacyPlanFallbackActive: boolean,
  language: "es" | "en"
): string {
  if (subscriptionContractManaged) {
    return legacyPlanFallbackActive
      ? language === "es"
        ? "suscripción gestionada + compatibilidad"
        : "managed subscription + compatibility"
      : language === "es"
        ? "suscripción gestionada"
        : "managed subscription";
  }
  return language === "es" ? "tenant legacy" : "legacy tenant";
}

function getTenantBaselinePolicySourceLabel(
  source: string | null,
  language: "es" | "en"
): string {
  if (!source) {
    return language === "es" ? "sin baseline visible" : "no visible baseline";
  }

  const labels: Record<string, string> = {
    subscription_base_plan:
      language === "es" ? "Plan Base por suscripción" : "subscription base plan",
    legacy_plan_code:
      language === "es" ? "compatibilidad legacy por plan_code" : "legacy plan_code compatibility",
  };

  return labels[source] || source;
}

function formatTenantModuleList(
  modules: string[] | null | undefined,
  language: "es" | "en"
): string {
  if (!modules?.length) {
    return language === "es" ? "sin módulos visibles" : "no visible modules";
  }
  return modules.map((moduleKey) => getTenantPlanModuleLabel(moduleKey)).join(", ");
}

function buildTenantPlanDependencyStatus(
  enabledModules: string[] | null,
  dependencyCatalog: PlatformModuleDependency[]
): {
  enabledModules: string[];
  covered: PlatformModuleDependency[];
  missing: PlatformModuleDependency[];
} {
  const normalizedModules = enabledModules ? [...enabledModules] : [];
  if (!normalizedModules.length) {
    return {
      enabledModules: [],
      covered: [],
      missing: [],
    };
  }

  if (normalizedModules.includes("all")) {
    return {
      enabledModules: normalizedModules,
      covered: dependencyCatalog,
      missing: [],
    };
  }

  const moduleSet = new Set(normalizedModules);
  const covered: PlatformModuleDependency[] = [];
  const missing: PlatformModuleDependency[] = [];

  dependencyCatalog.forEach((entry) => {
    if (!moduleSet.has(entry.module_key)) {
      return;
    }
    const unmetDependencies = entry.requires_modules.filter(
      (moduleKey) => !moduleSet.has(moduleKey)
    );
    if (unmetDependencies.length) {
      missing.push(entry);
      return;
    }
    covered.push(entry);
  });

  return {
    enabledModules: normalizedModules,
    covered,
    missing,
  };
}
