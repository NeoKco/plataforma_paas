import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Link } from "react-router-dom";
import { ConfirmDialog } from "../../../../components/common/ConfirmDialog";
import { PanelCard } from "../../../../components/common/PanelCard";
import { PageHeader } from "../../../../components/common/PageHeader";
import { StatusBadge } from "../../../../components/common/StatusBadge";
import { DataTableCard } from "../../../../components/data-display/DataTableCard";
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
} from "../../../../utils/platform-labels";
import {
  createPlatformTenant,
  getPlatformCapabilities,
  getPlatformTenant,
  getPlatformTenantAccessPolicy,
  getPlatformTenantModuleUsage,
  getPlatformTenantPolicyHistory,
  listProvisioningJobs,
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
  updatePlatformTenantPlan,
  updatePlatformTenantRateLimits,
  updatePlatformTenantStatus,
} from "../../../../services/platform-api";
import { useAuth } from "../../../../store/auth-context";
import type {
  ApiError,
  PlatformCapabilities,
  ProvisioningJob,
  PlatformTenant,
  PlatformTenantAccessPolicy,
  PlatformTenantPolicyChangeEvent,
  PlatformTenantModuleUsageSummary,
} from "../../../../types";

type ActionFeedback = {
  scope: string;
  type: "success" | "error";
  message: string;
};

type PendingConfirmation = {
  scope: string;
  title: string;
  description: string;
  details: string[];
  confirmLabel: string;
  tone?: "warning" | "danger";
  action: () => Promise<{ message: string }>;
};

export function TenantsPage() {
  const { session } = useAuth();
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
  const [policyHistory, setPolicyHistory] = useState<PlatformTenantPolicyChangeEvent[]>(
    []
  );
  const [listError, setListError] = useState<ApiError | null>(null);
  const [detailError, setDetailError] = useState<ApiError | null>(null);
  const [moduleUsageError, setModuleUsageError] = useState<ApiError | null>(null);
  const [policyHistoryError, setPolicyHistoryError] = useState<ApiError | null>(null);
  const [provisioningJobError, setProvisioningJobError] = useState<ApiError | null>(null);
  const [isListLoading, setIsListLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
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
  const [readRateLimit, setReadRateLimit] = useState("");
  const [writeRateLimit, setWriteRateLimit] = useState("");
  const [billingProvider, setBillingProvider] = useState("");
  const [billingProviderCustomerId, setBillingProviderCustomerId] = useState("");
  const [billingProviderSubscriptionId, setBillingProviderSubscriptionId] =
    useState("");
  const [moduleLimitDrafts, setModuleLimitDrafts] = useState<Record<string, string>>(
    {}
  );
  const [createTenantName, setCreateTenantName] = useState("");
  const [createTenantSlug, setCreateTenantSlug] = useState("");
  const [createTenantSlugTouched, setCreateTenantSlugTouched] = useState(false);
  const [createTenantType, setCreateTenantType] = useState("empresa");
  const [createTenantPlanCode, setCreateTenantPlanCode] = useState("");
  const [catalogSearch, setCatalogSearch] = useState("");
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
      email: `admin@${selectedTenantSummary.slug}.local`,
    });
    return `/tenant-portal/login?${searchParams.toString()}`;
  }, [selectedTenantSummary]);

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

  async function loadTenantWorkspace(tenantId: number) {
    if (!session?.accessToken) {
      return;
    }

    setIsDetailLoading(true);
    setDetailError(null);
    setModuleUsageError(null);
    setModuleUsageNotice(null);
    setPolicyHistoryError(null);
    setProvisioningJobError(null);
    setSelectedTenant(null);
    setAccessPolicy(null);
    setModuleUsage(null);
    setPolicyHistory([]);
    setSelectedProvisioningJob(null);
    let tenantStatus: string | null = null;

    try {
      const [tenantResponse, accessPolicyResponse] = await Promise.all([
        getPlatformTenant(session.accessToken, tenantId),
        getPlatformTenantAccessPolicy(session.accessToken, tenantId),
      ]);
      setSelectedTenant(tenantResponse);
      setAccessPolicy(accessPolicyResponse);
      tenantStatus = tenantResponse.status;

      if (tenantResponse.status !== "active") {
        setModuleUsage(null);
        setModuleUsageNotice(
          "El uso por módulo estará disponible cuando el tenant esté activo y su base tenant quede provisionada."
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
      }
    } catch (rawError) {
      const typedError = rawError as ApiError;
      setModuleUsage(null);
      if (
        typedError.payload?.detail === "Tenant database configuration is incomplete"
      ) {
        setModuleUsageNotice(
          "El tenant todavía no tiene completa su configuración de base de datos, por eso el uso por módulo no está disponible."
        );
      } else if (
        typedError.payload?.detail ===
        "Tenant schema is incomplete. Run tenant schema sync or tenant migrations before requesting module usage."
      ) {
        setModuleUsageNotice(
          "La base tenant existe, pero su esquema está incompleto. Debes sincronizar migraciones tenant antes de ver el uso por módulo."
        );
      } else {
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
      const provisioningJobs = await listProvisioningJobs(session.accessToken);
      setSelectedProvisioningJob(selectLatestProvisioningJob(provisioningJobs, tenantId));
    } catch (rawError) {
      setSelectedProvisioningJob(null);
      setProvisioningJobError(rawError as ApiError);
    }

    setIsDetailLoading(false);
  }

  async function reloadSelectedTenantWorkspace() {
    if (selectedTenantId === null) {
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
    setPlanCode(selectedTenantSummary.plan_code || "");
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
  }, [moduleLimitKeys, selectedTenantSummary]);

  async function runAction(
    scope: string,
    action: () => Promise<{ message: string }>
  ) {
    setIsActionSubmitting(true);
    setActionFeedback(null);

    try {
      const result = await action();
      await reloadSelectedTenantWorkspace();
      setActionFeedback({
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
        plan_code: normalizeNullableString(createTenantPlanCode),
      });
      await loadTenantsCatalog();
      setSelectedTenantId(createdTenant.id);
      await loadTenantWorkspace(createdTenant.id);
      setCreateTenantName("");
      setCreateTenantSlug("");
      setCreateTenantSlugTouched(false);
      setCreateTenantType("empresa");
      setCreateTenantPlanCode("");
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

  function handleIdentitySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.accessToken || selectedTenantId === null) {
      return;
    }

    requestConfirmation({
      scope: "identity-tenant",
      title: "Confirmar actualización de identidad básica",
      description:
        "Esta acción actualiza el nombre visible y el tipo operativo del tenant. El slug se mantiene estable.",
      details: [
        `Tenant actual: ${selectedTenantSummary?.name || "n/a"}`,
        `Nuevo nombre: ${identityName.trim() || "n/a"}`,
        `Tipo actual: ${selectedTenantSummary?.tenant_type || "n/a"}`,
        `Nuevo tipo: ${identityTenantType || "n/a"}`,
        `Slug estable: ${selectedTenantSummary?.slug || "n/a"}`,
      ],
      confirmLabel: "Actualizar identidad",
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
      title: "Confirmar cambio de estado tenant",
      description:
        "Este cambio modifica el lifecycle efectivo del tenant y puede afectar su acceso operativo.",
      details: [
        `Tenant: ${selectedTenantSummary?.name || "n/a"}`,
        `Estado actual: ${selectedTenantSummary?.status || "n/a"}`,
        `Nuevo estado: ${statusValue || "n/a"}`,
        `Motivo: ${normalizeNullableString(statusReason) || "sin motivo"}`,
      ],
      confirmLabel: "Aplicar cambio",
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
      title: "Confirmar actualización de mantenimiento",
      description:
        "Esta acción puede bloquear escritura o acceso total según el modo configurado.",
      details: [
        `Tenant: ${selectedTenantSummary?.name || "n/a"}`,
        `Modo manual: ${maintenanceMode ? "habilitado" : "deshabilitado"}`,
        `Modo de acceso: ${maintenanceAccessMode}`,
        `Scopes: ${
          maintenanceScopes.length > 0
            ? normalizeScopes(maintenanceScopes).join(", ")
            : "ninguno"
        }`,
        `Ventana: ${maintenanceStartsAt || "sin inicio"} -> ${maintenanceEndsAt || "sin fin"}`,
      ],
      confirmLabel: "Actualizar mantenimiento",
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
      title: "Confirmar actualización de facturación",
      description:
        "Este cambio impacta la política de acceso y la lectura operativa del tenant.",
      details: [
        `Tenant: ${selectedTenantSummary?.name || "n/a"}`,
        `Estado billing actual: ${selectedTenantSummary?.billing_status || "ninguno"}`,
        `Nuevo estado billing: ${normalizeNullableString(billingStatus) || "ninguno"}`,
        `Gracia hasta: ${billingGraceUntil || "sin fecha"}`,
      ],
      confirmLabel: "Actualizar facturación",
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
      title: "Confirmar cambio de plan",
      description:
        "El plan puede alterar módulos habilitados, límites y políticas derivadas del tenant.",
      details: [
        `Tenant: ${selectedTenantSummary?.name || "n/a"}`,
        `Plan actual: ${selectedTenantSummary?.plan_code || "sin plan"}`,
        `Nuevo plan: ${normalizeNullableString(planCode) || "sin plan"}`,
      ],
      confirmLabel: "Actualizar plan",
      action: () =>
        updatePlatformTenantPlan(session.accessToken, selectedTenantId, {
          plan_code: normalizeNullableString(planCode),
        }),
    });
  }

  function handleRateLimitSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.accessToken || selectedTenantId === null) {
      return;
    }
    requestConfirmation({
      scope: "rate-limit",
      title: "Confirmar actualización de límites de tasa",
      description:
        "Estos overrides cambian el throughput efectivo del tenant por sobre el plan o la política global.",
      details: [
        `Tenant: ${selectedTenantSummary?.name || "n/a"}`,
        `Lecturas req/min: ${readRateLimit.trim() || "heredado"}`,
        `Escrituras req/min: ${writeRateLimit.trim() || "heredado"}`,
      ],
      confirmLabel: "Actualizar límites",
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
      title: "Confirmar actualización de identidad de billing",
      description:
        "Se actualizarán los identificadores que conectan este tenant con el proveedor de billing.",
      details: [
        `Tenant: ${selectedTenantSummary?.name || "n/a"}`,
        `Proveedor: ${normalizeNullableString(billingProvider) || "ninguno"}`,
        `Customer ID: ${normalizeNullableString(billingProviderCustomerId) || "vacío"}`,
        `Subscription ID: ${
          normalizeNullableString(billingProviderSubscriptionId) || "vacío"
        }`,
      ],
      confirmLabel: "Actualizar identidad",
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
      title: "Confirmar actualización de límites por módulo",
      description:
        "Se aplicarán overrides tenant sobre los límites efectivos de módulos y cuotas operativas.",
      details: [
        `Tenant: ${selectedTenantSummary?.name || "n/a"}`,
        `Claves evaluadas: ${moduleLimitKeys.length}`,
        `Overrides con valor explícito: ${
          Object.values(moduleLimitDrafts).filter((value) => value.trim()).length
        }`,
      ],
      confirmLabel: "Actualizar límites por módulo",
      action: () =>
        updatePlatformTenantModuleLimits(session.accessToken, selectedTenantId, {
          module_limits: payload,
        }),
    });
  }

  function handleTenantSchemaSync(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.accessToken || selectedTenantId === null) {
      return;
    }
    requestConfirmation({
      scope: "sync-schema",
      title: "Confirmar sincronización de esquema tenant",
      description:
        "Se ejecutarán migraciones tenant sobre la base configurada del tenant seleccionado.",
      details: [
        `Tenant: ${selectedTenantSummary?.name || "n/a"}`,
        `Slug: ${selectedTenantSummary?.slug || "n/a"}`,
        "Usa esta acción cuando falten tablas o el schema tenant no esté al día.",
      ],
      confirmLabel: "Sincronizar esquema",
      action: () => syncPlatformTenantSchema(session.accessToken, selectedTenantId),
    });
  }

  function handleRunProvisioningJob() {
    if (!session?.accessToken || !selectedProvisioningJob) {
      return;
    }

    requestConfirmation({
      scope: "run-provisioning-job",
      title: "Confirmar ejecución del provisioning",
      description:
        "Esta acción intenta procesar ahora mismo el job de provisioning visible para este tenant.",
      details: [
        `Tenant: ${selectedTenantSummary?.name || "n/a"}`,
        `Job: #${selectedProvisioningJob.id}`,
        `Tipo: ${formatProvisioningJobType(selectedProvisioningJob.job_type)}`,
        `Estado actual: ${displayPlatformCode(selectedProvisioningJob.status)}`,
      ],
      confirmLabel: "Ejecutar ahora",
      action: async () => {
        await runProvisioningJob(session.accessToken, selectedProvisioningJob.id);
        return { message: "El worker procesó el job seleccionado." };
      },
    });
  }

  function handleRequeueProvisioningJob() {
    if (!session?.accessToken || !selectedProvisioningJob) {
      return;
    }

    requestConfirmation({
      scope: "requeue-provisioning-job",
      title: "Confirmar nuevo intento de provisioning",
      description:
        "Esta acción vuelve a poner el job en cola para que pueda ejecutarse otra vez.",
      details: [
        `Tenant: ${selectedTenantSummary?.name || "n/a"}`,
        `Job: #${selectedProvisioningJob.id}`,
        `Estado actual: ${displayPlatformCode(selectedProvisioningJob.status)}`,
        `Intentos usados: ${selectedProvisioningJob.attempts}/${selectedProvisioningJob.max_attempts}`,
      ],
      confirmLabel: "Reencolar job",
      action: async () => {
        await requeueProvisioningJob(session.accessToken, selectedProvisioningJob.id);
        return { message: "El job quedó reencolado para un nuevo intento." };
      },
    });
  }

  function handleArchiveTenant() {
    if (!session?.accessToken || selectedTenantId === null || !selectedTenantSummary) {
      return;
    }

    requestConfirmation({
      scope: "archive-tenant",
      title: "Confirmar archivo del tenant",
      description:
        "Archivar deja al tenant fuera de operación normal sin eliminar su historial, jobs ni referencias técnicas.",
      details: [
        `Tenant: ${selectedTenantSummary.name}`,
        `Slug: ${selectedTenantSummary.slug}`,
        "La reapertura posterior debe hacerse usando el flujo explícito de restauración.",
      ],
      confirmLabel: "Archivar tenant",
      tone: "danger",
      action: () =>
        updatePlatformTenantStatus(session.accessToken, selectedTenantId, {
          status: "archived",
          status_reason:
            normalizeNullableString(statusReason) ||
            "Archivado desde consola de plataforma",
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
      title: "Confirmar restauración del tenant",
      description:
        "Restaurar vuelve a abrir el tenant archivado y lo deja en el lifecycle destino elegido, sin perder historial ni referencias operativas.",
      details: [
        `Tenant: ${selectedTenantSummary.name}`,
        `Slug: ${selectedTenantSummary.slug}`,
        `Estado actual: ${selectedTenantSummary.status}`,
        `Estado de restauración: ${restoreTargetStatus}`,
        `Motivo: ${normalizeNullableString(restoreReason) || "sin motivo"}`,
      ],
      confirmLabel: "Restaurar tenant",
      tone: "warning",
      action: () =>
        restorePlatformTenant(session.accessToken, selectedTenantId, {
          target_status: restoreTargetStatus,
          restore_reason: normalizeNullableString(restoreReason),
        }),
    });
  }

  return (
    <div className="d-grid gap-4">
      <ConfirmDialog
        isOpen={pendingConfirmation !== null}
        title={pendingConfirmation?.title || ""}
        description={pendingConfirmation?.description || ""}
        details={pendingConfirmation?.details || []}
        confirmLabel={pendingConfirmation?.confirmLabel || "Confirmar"}
        tone={pendingConfirmation?.tone || "warning"}
        isSubmitting={isActionSubmitting}
        onCancel={() => setPendingConfirmation(null)}
        onConfirm={() => void handleConfirmAction()}
      />

      <PageHeader
        eyebrow="Plataforma"
        title="Tenants"
        description="Vista operativa sobre lifecycle tenant, billing, mantenimiento, política de acceso y uso actual por módulo."
      />

      {listError ? (
        <ErrorState
          detail={listError.payload?.detail || listError.message}
          requestId={listError.payload?.request_id}
        />
      ) : null}

      <div className="tenants-page-grid">
        <div className="d-grid gap-4">
          <PanelCard
            title="Crear tenant"
            subtitle="Alta operativa básica: nombre, slug, tipo y plan inicial para disparar provisioning."
          >
            <form className="tenant-action-form tenant-create-form" onSubmit={handleCreateTenantSubmit}>
              <FieldHelpLabel
                label="Nombre visible"
                help="Nombre con el que el operador reconocerá el tenant en la consola."
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
                placeholder="Ej: Empresa Centro"
                required
              />
              <FieldHelpLabel
                label="Slug"
                help="Identificador estable del tenant. Conviene definirlo bien al inicio porque se usa en portal tenant, bootstrap y referencias técnicas."
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
              <div className="tenant-inline-form-grid">
                <div>
                  <FieldHelpLabel
                    label="Tipo de tenant"
                    help="Clasifica el tenant según su vertical principal. Puedes empezar por empresa o condominio."
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
                </div>
                <div>
                  <FieldHelpLabel
                    label="Plan inicial"
                    help="Puedes partir sin plan o asignar uno desde el alta para que el tenant nazca con su política base."
                  />
                  <select
                    className="form-select"
                    value={createTenantPlanCode}
                    onChange={(event) => setCreateTenantPlanCode(event.target.value)}
                  >
                    <option value="">Sin plan</option>
                    {planOptions.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="tenant-help-text mt-2">
                Al crear el tenant se dispara provisioning para preparar su base tenant y
                dejar el acceso bootstrap listo.
              </p>
              <button
                className="btn btn-primary mt-3"
                type="submit"
                disabled={
                  isActionSubmitting ||
                  !createTenantName.trim() ||
                  !createTenantSlug.trim()
                }
              >
                Crear tenant
              </button>
            </form>
          </PanelCard>

          <PanelCard
            title="Catálogo de tenants"
            subtitle="Busca, filtra y selecciona tenants para entrar a su operación central."
          >
            <div className="tenant-catalog-filters">
              <input
                className="form-control"
                value={catalogSearch}
                onChange={(event) => setCatalogSearch(event.target.value)}
                placeholder="Buscar por nombre, slug o tipo"
              />
              <div className="tenant-inline-form-grid">
                <select
                  className="form-select"
                  value={catalogStatusFilter}
                  onChange={(event) => setCatalogStatusFilter(event.target.value)}
                >
                  <option value="">Todos los estados</option>
                  {(capabilities?.tenant_statuses || []).map((value) => (
                    <option key={value} value={value}>
                      {displayPlatformCode(value)}
                    </option>
                  ))}
                </select>
                <select
                  className="form-select"
                  value={catalogBillingFilter}
                  onChange={(event) => setCatalogBillingFilter(event.target.value)}
                >
                  <option value="">Toda la facturación</option>
                  {(capabilities?.tenant_billing_statuses || []).map((value) => (
                    <option key={value} value={value}>
                      {displayPlatformCode(value)}
                    </option>
                  ))}
                </select>
              </div>
              <select
                className="form-select"
                value={catalogTypeFilter}
                onChange={(event) => setCatalogTypeFilter(event.target.value)}
              >
                <option value="">Todos los tipos</option>
                {tenantTypeOptions.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>

            {isListLoading ? <LoadingBlock label="Cargando tenants..." /> : null}

            {!isListLoading && tenants.length === 0 ? (
              <div className="text-secondary">
                Aún no hay tenants creados. Usa el formulario superior para dar de alta el
                primero y disparar su provisioning inicial.
              </div>
            ) : null}

            {!isListLoading && tenants.length > 0 && filteredTenants.length === 0 ? (
              <div className="text-secondary">
                No hay tenants que coincidan con los filtros actuales.
              </div>
            ) : null}

            {filteredTenants.length > 0 ? (
              <>
                <div className="tenant-catalog-summary">
                  {filteredTenants.length} de {tenants.length} tenants visibles
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
                            billing: {displayPlatformCode(tenant.billing_status || "none")}
                          </span>
                          <span className="tenant-chip">
                            plan: {tenant.plan_code || "ninguno"}
                          </span>
                          {tenant.maintenance_mode ? (
                            <span className="tenant-chip tenant-chip--warning">
                              mantenimiento
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
            <LoadingBlock label="Cargando detalle del tenant..." />
          ) : null}

          {detailError ? (
            <ErrorState
              title="Falló el detalle del tenant"
              detail={detailError.payload?.detail || detailError.message}
              requestId={detailError.payload?.request_id}
            />
          ) : null}

          {selectedTenantSummary ? (
            <>
              <PanelCard
                title={selectedTenantSummary.name}
                subtitle="Identidad operativa central y contexto efectivo de plataforma."
              >
                <div className="tenant-context-actions">
                  <div className="tenant-help-text">
                    Acceso rápido para superadmin al portal tenant con el slug ya
                    precargado.
                  </div>
                  <div className="tenant-context-actions__buttons">
                    {selectedTenantSummary.status !== "archived" ? (
                      <button
                        className="btn btn-outline-danger btn-sm"
                        type="button"
                        onClick={handleArchiveTenant}
                        disabled={isActionSubmitting}
                      >
                        Archivar tenant
                      </button>
                    ) : (
                      <div className="tenant-help-text">
                        Este tenant está archivado. Usa el bloque de restauración para reabrirlo
                        con un lifecycle explícito.
                      </div>
                    )}
                    {tenantPortalHref ? (
                      <Link className="btn btn-outline-primary btn-sm" to={tenantPortalHref}>
                        Abrir portal tenant
                      </Link>
                    ) : null}
                  </div>
                </div>
                <div className="tenant-detail-grid">
                  <DetailField label="Slug" value={<code>{selectedTenantSummary.slug}</code>} />
                  <DetailField label="Tipo de tenant" value={selectedTenantSummary.tenant_type} />
                  <DetailField
                    label="Ciclo de vida"
                    value={<StatusBadge value={selectedTenantSummary.status} />}
                  />
                  <DetailField
                    label="Facturación"
                    value={
                      <StatusBadge value={selectedTenantSummary.billing_status || "unknown"} />
                    }
                  />
                  <DetailField
                    label="Plan"
                    value={selectedTenantSummary.plan_code || "Sin plan"}
                  />
                  <DetailField
                    label="Mantenimiento"
                    value={selectedTenantSummary.maintenance_mode ? "Manual" : "Apagado"}
                  />
                  <DetailField
                    label="Fin de período billing"
                    value={formatDateTime(selectedTenantSummary.billing_current_period_ends_at)}
                  />
                  <DetailField
                    label="Gracia billing hasta"
                    value={formatDateTime(selectedTenantSummary.billing_grace_until)}
                  />
                  <DetailField
                    label="Inicio mantenimiento"
                    value={formatDateTime(selectedTenantSummary.maintenance_starts_at)}
                  />
                  <DetailField
                    label="Fin mantenimiento"
                    value={formatDateTime(selectedTenantSummary.maintenance_ends_at)}
                  />
                </div>

                {selectedTenantSummary.status_reason ? (
                  <div className="tenant-inline-note">
                    Motivo de estado: {selectedTenantSummary.status_reason}
                  </div>
                ) : null}
                {selectedTenantSummary.billing_status_reason ? (
                  <div className="tenant-inline-note">
                    Motivo de facturación: {selectedTenantSummary.billing_status_reason}
                  </div>
                ) : null}
                {selectedTenantSummary.maintenance_reason ? (
                  <div className="tenant-inline-note">
                    Motivo de mantenimiento: {selectedTenantSummary.maintenance_reason}
                  </div>
                ) : null}
              </PanelCard>

              {accessPolicy ? (
                <PanelCard
                  title="Política de acceso"
                  subtitle="Lectura efectiva del enforcement de lifecycle y billing."
                >
                  <div className="tenant-access-grid">
                    <DetailField
                      label="Permitido"
                      value={
                        <span
                          className={`status-badge ${
                            accessPolicy.access_allowed
                              ? "status-badge--success"
                              : "status-badge--danger"
                          }`}
                        >
                          {accessPolicy.access_allowed ? "permitido" : "bloqueado"}
                        </span>
                      }
                    />
                    <DetailField
                      label="Fuente de bloqueo"
                      value={displayAccessBlockingSource(accessPolicy.access_blocking_source)}
                    />
                    <DetailField
                      label="Código de estado"
                      value={accessPolicy.access_status_code || "n/a"}
                    />
                    <DetailField
                      label="Billing en gracia"
                      value={accessPolicy.billing_in_grace ? "sí" : "no"}
                    />
                  </div>
                  {accessPolicy.access_detail ? (
                    <div className="tenant-inline-note">{accessPolicy.access_detail}</div>
                  ) : null}
                </PanelCard>
              ) : null}

              <PanelCard
                title="Provisioning"
                subtitle="Estado del job técnico que prepara la base tenant y deja el acceso bootstrap listo."
              >
                {provisioningJobError ? (
                  <ErrorState
                    title="Falló la lectura de provisioning"
                    detail={
                      provisioningJobError.payload?.detail || provisioningJobError.message
                    }
                    requestId={provisioningJobError.payload?.request_id}
                  />
                ) : selectedProvisioningJob ? (
                  <>
                    <div className="tenant-detail-grid">
                      <DetailField
                        label="Último job"
                        value={`#${selectedProvisioningJob.id}`}
                      />
                      <DetailField
                        label="Operación"
                        value={formatProvisioningJobType(selectedProvisioningJob.job_type)}
                      />
                      <DetailField
                        label="Estado"
                        value={<StatusBadge value={selectedProvisioningJob.status} />}
                      />
                      <DetailField
                        label="Intentos"
                        value={`${selectedProvisioningJob.attempts}/${selectedProvisioningJob.max_attempts}`}
                      />
                      <DetailField
                        label="Próximo reintento"
                        value={formatDateTime(selectedProvisioningJob.next_retry_at)}
                      />
                      <DetailField
                        label="Lectura rápida"
                        value={getProvisioningStatusExplanation(selectedProvisioningJob.status)}
                      />
                    </div>

                    {selectedProvisioningJob.error_code ? (
                      <div className="tenant-inline-note">
                        Error técnico: {displayPlatformCode(selectedProvisioningJob.error_code)}
                      </div>
                    ) : null}
                    {selectedProvisioningJob.error_message ? (
                      <div className="tenant-inline-note">
                        Detalle último error: {selectedProvisioningJob.error_message}
                      </div>
                    ) : null}

                    <div className="tenant-context-actions tenant-context-actions--compact">
                      <div className="tenant-help-text">
                        Crear tenant dispara provisioning automáticamente. Aquí puedes ver si la
                        base tenant quedó lista o si el job necesita intervención.
                      </div>
                      <div className="tenant-context-actions__buttons">
                        <Link className="btn btn-outline-primary btn-sm" to="/provisioning">
                          Abrir provisioning
                        </Link>
                        {(selectedProvisioningJob.status === "pending" ||
                          selectedProvisioningJob.status === "retry_pending") && (
                          <button
                            className="btn btn-outline-secondary btn-sm"
                            type="button"
                            onClick={handleRunProvisioningJob}
                            disabled={isActionSubmitting}
                          >
                            Ejecutar ahora
                          </button>
                        )}
                        {selectedProvisioningJob.status === "failed" && (
                          <button
                            className="btn btn-outline-secondary btn-sm"
                            type="button"
                            onClick={handleRequeueProvisioningJob}
                            disabled={isActionSubmitting}
                          >
                            Reintentar
                          </button>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-secondary">
                    Este tenant todavía no tiene jobs visibles de provisioning. Si acaba de ser
                    creado, recarga el catálogo o abre la consola de provisioning para revisar la
                    cola global.
                  </div>
                )}
              </PanelCard>

              <PanelCard
                title="Acciones administrativas"
                subtitle="Gobierna lifecycle, mantenimiento, billing, plan, límites y operación técnica del tenant seleccionado."
              >
                {actionFeedback ? (
                  <div
                    className={`tenant-action-feedback tenant-action-feedback--${actionFeedback.type}`}
                  >
                    <strong>{getPlatformActionFeedbackLabel(actionFeedback.scope)}:</strong>{" "}
                    {actionFeedback.message}
                  </div>
                ) : null}

                <div className="tenant-action-grid">
                  {selectedTenantSummary.status === "archived" ? (
                    <form className="tenant-action-form" onSubmit={handleRestoreTenantSubmit}>
                      <h3 className="tenant-action-form__title">Restauración</h3>
                      <FieldHelpLabel
                        label="Estado destino"
                        help="La restauración no cambia el slug ni elimina historial. Solo reabre el tenant archivado en el lifecycle que definas aquí."
                      />
                      <select
                        className="form-select"
                        value={restoreTargetStatus}
                        onChange={(event) => setRestoreTargetStatus(event.target.value)}
                      >
                        {["pending", "active", "suspended"].map((value) => (
                          <option key={value} value={value}>
                            {displayPlatformCode(value)}
                          </option>
                        ))}
                      </select>
                      <FieldHelpLabel
                        label="Motivo de restauración"
                        help="Úsalo para dejar trazabilidad operativa de por qué el tenant vuelve a abrirse."
                      />
                      <textarea
                        className="form-control"
                        rows={3}
                        value={restoreReason}
                        onChange={(event) => setRestoreReason(event.target.value)}
                        placeholder="Ej: Reactivación operativa autorizada"
                      />
                      <div className="tenant-inline-note mt-3">
                        La restauración es explícita y no equivale a editar el estado a mano.
                      </div>
                      <button className="btn btn-primary mt-3" type="submit" disabled={isActionSubmitting}>
                        Restaurar tenant
                      </button>
                    </form>
                  ) : null}

                  <form className="tenant-action-form" onSubmit={handleIdentitySubmit}>
                    <h3 className="tenant-action-form__title">Identidad básica</h3>
                    <FieldHelpLabel
                      label="Nombre visible"
                      help="Este nombre se usa en catálogo, detalle y operación diaria del tenant."
                    />
                    <input
                      className="form-control"
                      value={identityName}
                      onChange={(event) => setIdentityName(event.target.value)}
                    />
                    <FieldHelpLabel
                      label="Tipo de tenant"
                      help="Clasifica operativamente el tenant sin tocar su slug ni su historial técnico."
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
                    <div className="tenant-inline-note mt-3">
                      El slug se mantiene estable para no romper accesos, bootstrap ni referencias
                      técnicas.
                    </div>
                    <button
                      className="btn btn-primary mt-3"
                      type="submit"
                      disabled={isActionSubmitting || !identityName.trim()}
                    >
                      Actualizar identidad básica
                    </button>
                  </form>

                  <form className="tenant-action-form" onSubmit={handleStatusSubmit}>
                    <h3 className="tenant-action-form__title">Estado</h3>
                    <FieldHelpLabel
                      label="Estado lifecycle"
                      help="Controla el estado operativo general del tenant. Puede habilitar, suspender, archivar o dejar pendiente su operación."
                    />
                    <select
                      className="form-select"
                      value={statusValue}
                      onChange={(event) => setStatusValue(event.target.value)}
                    >
                      {(capabilities?.tenant_statuses || []).map((value) => (
                        <option key={value} value={value}>
                          {displayPlatformCode(value)}
                        </option>
                      ))}
                    </select>
                    <FieldHelpLabel
                      label="Motivo"
                      help="Úsalo para dejar contexto operativo visible cuando cambias el estado del tenant."
                    />
                    <textarea
                      className="form-control"
                      rows={3}
                      value={statusReason}
                      onChange={(event) => setStatusReason(event.target.value)}
                    />
                    <button
                      className="btn btn-primary mt-3"
                      type="submit"
                      disabled={isActionSubmitting}
                    >
                      Actualizar estado
                    </button>
                  </form>

                  <form className="tenant-action-form" onSubmit={handleMaintenanceSubmit}>
                    <h3 className="tenant-action-form__title">Mantenimiento</h3>
                    <div className="form-check mb-3">
                      <input
                        id="maintenance-mode"
                        className="form-check-input"
                        type="checkbox"
                        checked={maintenanceMode}
                        onChange={(event) => setMaintenanceMode(event.target.checked)}
                      />
                      <label className="form-check-label" htmlFor="maintenance-mode">
                        Habilitar mantenimiento manual
                      </label>
                    </div>
                    <p className="tenant-help-text mb-3">
                      Activa una ventana manual cuando necesites restringir temporalmente el uso
                      del tenant o de módulos específicos.
                    </p>
                    <FieldHelpLabel
                      label="Modo de acceso"
                      help="Define si durante el mantenimiento se bloquean solo escrituras o todo el acceso del tenant."
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
                    <FieldHelpLabel
                      label="Scopes"
                      help="Elige si el mantenimiento aplica a todo el tenant o solo a áreas puntuales como core, users o finance."
                      placement="left"
                    />
                    <div className="tenant-scope-list">
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
                    </div>
                    <div className="tenant-inline-form-grid mt-3">
                      <div>
                        <FieldHelpLabel
                          label="Comienza"
                          help="Marca cuándo parte la ventana de mantenimiento. Si no ajustas la hora, se guardará 00:00."
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
                      </div>
                      <div>
                        <FieldHelpLabel
                          label="Termina"
                          help="Marca cuándo termina la ventana de mantenimiento. Si no ajustas la hora, se guardará 00:00."
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
                      </div>
                    </div>
                    <FieldHelpLabel
                      label="Motivo"
                      help="Describe brevemente el motivo operativo del mantenimiento para dejar trazabilidad visible."
                    />
                    <textarea
                      className="form-control"
                      rows={3}
                      value={maintenanceReason}
                      onChange={(event) => setMaintenanceReason(event.target.value)}
                    />
                    <button
                      className="btn btn-primary mt-3"
                      type="submit"
                      disabled={isActionSubmitting}
                    >
                      Actualizar mantenimiento
                    </button>
                  </form>

                  <form className="tenant-action-form" onSubmit={handleBillingSubmit}>
                    <h3 className="tenant-action-form__title">Facturación</h3>
                    <FieldHelpLabel
                      label="Estado billing"
                      help="Representa el estado comercial del tenant frente a cobro y suscripción: trialing, active, past_due, suspended o canceled."
                    />
                    <select
                      className="form-select"
                      value={billingStatus}
                      onChange={(event) => setBillingStatus(event.target.value)}
                    >
                      <option value="">ninguno</option>
                      {(capabilities?.tenant_billing_statuses || []).map((value) => (
                        <option key={value} value={value}>
                          {displayPlatformCode(value)}
                        </option>
                      ))}
                    </select>
                    <FieldHelpLabel
                      label="Motivo"
                      help="Deja una explicación visible del cambio de facturación o del estado comercial actual."
                    />
                    <textarea
                      className="form-control"
                      rows={3}
                      value={billingReason}
                      onChange={(event) => setBillingReason(event.target.value)}
                    />
                    <div className="tenant-inline-form-grid mt-3">
                      <div>
                        <FieldHelpLabel
                          label="Fin período actual"
                          help="Usa fecha y hora local del cierre de período. Si no ajustas la hora, se guardará 00:00."
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
                      </div>
                      <div>
                        <FieldHelpLabel
                          label="Gracia hasta"
                          help="Úsalo cuando el tenant sigue operativo por una ventana temporal pese a estar past_due. Si no ajustas la hora, se guardará 00:00."
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
                      </div>
                    </div>
                    <button
                      className="btn btn-primary mt-3"
                      type="submit"
                      disabled={isActionSubmitting}
                    >
                      Actualizar facturación
                    </button>
                  </form>

                  <form className="tenant-action-form" onSubmit={handlePlanSubmit}>
                    <h3 className="tenant-action-form__title">Plan</h3>
                    <FieldHelpLabel
                      label="Código de plan"
                      help="Selecciona uno de los planes válidos que conoce el backend. Si eliges vacío, el tenant queda sin plan."
                      placement="left"
                    />
                    <select
                      className="form-select"
                      value={planCode}
                      onChange={(event) => setPlanCode(event.target.value)}
                    >
                      <option value="">Sin plan</option>
                      {planOptions.map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                    <p className="tenant-help-text mt-2">
                      Solo puedes aplicar planes definidos en la política de backend. Si no
                      seleccionas ninguno, el tenant opera sin plan asociado.
                    </p>
                    <button
                      className="btn btn-primary mt-3"
                      type="submit"
                      disabled={isActionSubmitting}
                    >
                      Actualizar plan
                    </button>
                  </form>

                  <form className="tenant-action-form" onSubmit={handleRateLimitSubmit}>
                    <h3 className="tenant-action-form__title">Límites de tasa</h3>
                    <div className="tenant-inline-form-grid">
                      <div>
                        <FieldHelpLabel
                          label="Lecturas req/min"
                          help="Override específico para el máximo de lecturas por minuto. Vacío hereda; `0` deja sin límite."
                        />
                        <input
                          className="form-control"
                          type="number"
                          min="0"
                          value={readRateLimit}
                          onChange={(event) => setReadRateLimit(event.target.value)}
                        />
                      </div>
                      <div>
                        <FieldHelpLabel
                          label="Escrituras req/min"
                          help="Override específico para el máximo de escrituras por minuto. Vacío hereda; `0` deja sin límite."
                        />
                        <input
                          className="form-control"
                          type="number"
                          min="0"
                          value={writeRateLimit}
                          onChange={(event) => setWriteRateLimit(event.target.value)}
                        />
                      </div>
                    </div>
                    <p className="tenant-help-text mt-2">
                      Déjalo vacío para volver al plan o a la configuración global. Usa `0`
                      para quitar el límite de esa categoría.
                    </p>
                    <button
                      className="btn btn-primary mt-3"
                      type="submit"
                      disabled={isActionSubmitting}
                    >
                      Actualizar límites de tasa
                    </button>
                  </form>

                  <form
                    className="tenant-action-form"
                    onSubmit={handleBillingIdentitySubmit}
                  >
                    <h3 className="tenant-action-form__title">Identidad de billing</h3>
                    <FieldHelpLabel
                      label="Proveedor"
                      help="Proveedor externo que gestiona la suscripción o cobro del tenant."
                      placement="left"
                    />
                    <select
                      className="form-select"
                      value={billingProvider}
                      onChange={(event) => setBillingProvider(event.target.value)}
                    >
                      <option value="">ninguno</option>
                      {(capabilities?.billing_providers || []).map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                    <FieldHelpLabel
                      label="Customer ID"
                      help="Identificador del cliente dentro del proveedor de billing."
                      placement="left"
                    />
                    <input
                      className="form-control"
                      value={billingProviderCustomerId}
                      onChange={(event) =>
                        setBillingProviderCustomerId(event.target.value)
                      }
                    />
                    <FieldHelpLabel
                      label="Subscription ID"
                      help="Identificador de la suscripción o contrato activo en el proveedor de billing."
                      placement="left"
                    />
                    <input
                      className="form-control"
                      value={billingProviderSubscriptionId}
                      onChange={(event) =>
                        setBillingProviderSubscriptionId(event.target.value)
                      }
                    />
                    <button
                      className="btn btn-primary mt-3"
                      type="submit"
                      disabled={isActionSubmitting}
                    >
                      Actualizar identidad de billing
                    </button>
                  </form>

                  <form className="tenant-action-form" onSubmit={handleModuleLimitsSubmit}>
                    <h3 className="tenant-action-form__title">Límites por módulo</h3>
                    <p className="tenant-help-text mb-3">
                      Vacío limpia el override tenant para esa clave. `0` significa ilimitado
                      para ese override.
                    </p>
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
                    <button
                      className="btn btn-primary mt-3"
                      type="submit"
                      disabled={isActionSubmitting}
                    >
                      Actualizar límites por módulo
                    </button>
                  </form>

                  <form className="tenant-action-form" onSubmit={handleTenantSchemaSync}>
                    <h3 className="tenant-action-form__title">Esquema tenant</h3>
                    <p className="tenant-help-text mb-3">
                      Ejecuta la sincronización de migraciones tenant cuando falten tablas
                      como <code>finance_entries</code> o la base tenant aún no esté al día.
                    </p>
                    <button
                      className="btn btn-primary"
                      type="submit"
                      disabled={isActionSubmitting}
                    >
                      Sincronizar esquema tenant
                    </button>
                  </form>
                </div>
              </PanelCard>

              {moduleUsageError ? (
                <ErrorState
                  title="Uso por módulo no disponible"
                  detail={moduleUsageError.payload?.detail || moduleUsageError.message}
                  requestId={moduleUsageError.payload?.request_id}
                />
              ) : null}

              {moduleUsageNotice ? (
                <PanelCard
                  title="Uso por módulo no disponible"
                  subtitle={moduleUsageNotice}
                >
                  <div className="text-secondary">
                    Completa el provisioning del tenant o su configuración de base de
                    datos para habilitar esta vista.
                  </div>
                </PanelCard>
              ) : null}

              {moduleUsage ? (
                <DataTableCard
                  title="Uso por módulo"
                  rows={moduleUsage.data}
                  columns={[
                    {
                      key: "module_key",
                      header: "Clave de módulo",
                      render: (row) => <code>{row.module_key}</code>,
                    },
                    {
                      key: "used_units",
                      header: "Usado",
                      render: (row) => row.used_units,
                    },
                    {
                      key: "max_units",
                      header: "Límite",
                      render: (row) => (row.unlimited ? "ilimitado" : row.max_units ?? "—"),
                    },
                    {
                      key: "remaining_units",
                      header: "Restante",
                      render: (row) =>
                        row.unlimited ? "—" : row.remaining_units ?? "—",
                    },
                    {
                      key: "limit_source",
                      header: "Fuente",
                      render: (row) => row.limit_source || "ninguna",
                    },
                    {
                      key: "at_limit",
                      header: "Estado",
                      render: (row) =>
                        row.at_limit ? (
                          <span className="status-badge status-badge--warning">al_límite</span>
                        ) : (
                          <span className="status-badge status-badge--success">ok</span>
                        ),
                    },
                  ]}
                />
              ) : null}

              {policyHistoryError ? (
                <ErrorState
                  title="Historial de políticas no disponible"
                  detail={policyHistoryError.payload?.detail || policyHistoryError.message}
                  requestId={policyHistoryError.payload?.request_id}
                />
              ) : null}

              {policyHistory.length > 0 ? (
                <DataTableCard
                  title="Historial de políticas"
                  rows={policyHistory}
                  columns={[
                    {
                      key: "recorded_at",
                      header: "Registrado en",
                      render: (row) => formatDateTime(row.recorded_at),
                    },
                    {
                      key: "event_type",
                      header: "Evento",
                      render: (row) => row.event_type,
                    },
                    {
                      key: "actor_email",
                      header: "Actor",
                      render: (row) => row.actor_email || row.actor_role || "sistema",
                    },
                    {
                      key: "changed_fields",
                      header: "Campos cambiados",
                      render: (row) =>
                        row.changed_fields.length > 0
                          ? row.changed_fields.join(", ")
                          : "ninguno",
                    },
                  ]}
                />
              ) : !policyHistoryError ? (
                <PanelCard
                  title="Historial de políticas"
                  subtitle="Mutaciones recientes de política aplicadas desde la operación de plataforma."
                >
                  <div className="text-secondary">
                    Aún no hay mutaciones de política registradas para este tenant.
                  </div>
                </PanelCard>
              ) : null}
            </>
          ) : !isListLoading ? (
            <PanelCard title="Detalle del tenant">
              <div className="text-secondary">
                Selecciona un tenant desde el panel izquierdo para inspeccionar estado, billing,
                políticas y controles administrativos.
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
      <button className="inline-help__trigger" type="button" aria-label={`Ayuda sobre ${label}`}>
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
  if (!value) {
    return "n/a";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString();
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

function formatProvisioningJobType(value: string): string {
  const knownLabels: Record<string, string> = {
    create_tenant_database: "Crear base del tenant",
    sync_tenant_schema: "Sincronizar esquema tenant",
  };

  return knownLabels[value] || displayPlatformCode(value);
}

function getProvisioningStatusExplanation(status: string): string {
  const knownMessages: Record<string, string> = {
    pending: "El job está en cola y todavía no lo toma el worker.",
    running: "El worker está procesando este job ahora mismo.",
    retry_pending: "Falló un intento, pero el job volverá a intentarse.",
    completed: "La base tenant y su bootstrap técnico quedaron listos.",
    failed: "El job agotó sus intentos y ya requiere intervención explícita.",
  };

  return knownMessages[status] || "Estado operativo de provisioning.";
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
