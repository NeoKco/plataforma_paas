import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { ConfirmDialog } from "../../../../components/common/ConfirmDialog";
import { MetricCard } from "../../../../components/common/MetricCard";
import { PageHeader } from "../../../../components/common/PageHeader";
import { PanelCard } from "../../../../components/common/PanelCard";
import { StatusBadge } from "../../../../components/common/StatusBadge";
import { DataTableCard } from "../../../../components/data-display/DataTableCard";
import { AppBadge } from "../../../../design-system/AppBadge";
import { AppForm, AppFormActions, AppFormField } from "../../../../design-system/AppForm";
import { AppTableWrap, AppToolbar } from "../../../../design-system/AppLayout";
import { EmptyState } from "../../../../components/feedback/EmptyState";
import { ErrorState } from "../../../../components/feedback/ErrorState";
import { LoadingBlock } from "../../../../components/feedback/LoadingBlock";
import { useSearchParams } from "react-router-dom";
import { getApiErrorDisplayMessage } from "../../../../services/api";
import {
  getPlatformActionFeedbackLabel,
  getPlatformActionSuccessMessage,
} from "../../../../utils/action-feedback";
import {
  bulkSyncPlatformTenantSchemas,
  getPlatformCapabilities,
  getProvisioningAlertHistory,
  getProvisioningCycleHistory,
  getProvisioningAlerts,
  getProvisioningBrokerDlq,
  getProvisioningMetricsByErrorCode,
  getProvisioningMetricsHistory,
  getProvisioningMetrics,
  getProvisioningMetricsByJobType,
  listProvisioningJobs,
  requeueProvisioningBrokerDlq,
  requeueProvisioningJob,
  runProvisioningJob,
} from "../../../../services/platform-api";
import { useAuth } from "../../../../store/auth-context";
import { useLanguage } from "../../../../store/language-context";
import { getCurrentLanguage, getCurrentLocale } from "../../../../utils/i18n";
import type {
  ApiError,
  ProvisioningBrokerDeadLetterResponse,
  ProvisioningBrokerDeadLetterJob,
  ProvisioningJobErrorCodeMetricsResponse,
  ProvisioningJob,
  ProvisioningJobDetailedMetricsResponse,
  ProvisioningJobMetricsHistoryResponse,
  ProvisioningJobMetricsResponse,
  ProvisioningOperationalAlertHistoryResponse,
  ProvisioningJobTenantErrorCodeSummary,
  ProvisioningOperationalAlert,
  ProvisioningOperationalAlertsResponse,
  PlatformCapabilities,
  ProvisioningWorkerCycleTraceHistoryResponse,
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
  action: () => Promise<unknown>;
};

type DlqFormFilters = {
  limit: string;
  jobType: string;
  tenantSlug: string;
  errorCode: string;
  errorContains: string;
};

type DlqFamilySummary = {
  key: string;
  tenantSlug: string;
  jobType: string;
  errorCode: string | null;
  errorContains: string | null;
  errorLabel: string;
  totalRows: number;
  representativeJobId: number;
  latestRecordedAt: string | null;
};

export function ProvisioningPage() {
  const showDevelopmentBootstrapHelp = import.meta.env.DEV;
  const { session } = useAuth();
  const { language } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTenantSlug = normalizeNullableString(searchParams.get("tenantSlug") || "") || "";
  const requestedOperationFilter = normalizeProvisioningOperationFilter(
    searchParams.get("operation")
  );
  const [jobs, setJobs] = useState<ProvisioningJob[]>([]);
  const [capabilities, setCapabilities] = useState<PlatformCapabilities | null>(null);
  const [metrics, setMetrics] = useState<ProvisioningJobMetricsResponse | null>(null);
  const [metricsByJobType, setMetricsByJobType] =
    useState<ProvisioningJobDetailedMetricsResponse | null>(null);
  const [metricsByErrorCode, setMetricsByErrorCode] =
    useState<ProvisioningJobErrorCodeMetricsResponse | null>(null);
  const [metricsHistory, setMetricsHistory] =
    useState<ProvisioningJobMetricsHistoryResponse | null>(null);
  const [cycleHistory, setCycleHistory] =
    useState<ProvisioningWorkerCycleTraceHistoryResponse | null>(null);
  const [alerts, setAlerts] = useState<ProvisioningOperationalAlertsResponse | null>(
    null
  );
  const [alertHistory, setAlertHistory] =
    useState<ProvisioningOperationalAlertHistoryResponse | null>(null);
  const [dlq, setDlq] = useState<ProvisioningBrokerDeadLetterResponse | null>(null);
  const [jobsError, setJobsError] = useState<ApiError | null>(null);
  const [capabilitiesError, setCapabilitiesError] = useState<ApiError | null>(null);
  const [metricsError, setMetricsError] = useState<ApiError | null>(null);
  const [alertsError, setAlertsError] = useState<ApiError | null>(null);
  const [dlqError, setDlqError] = useState<ApiError | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionSubmitting, setIsActionSubmitting] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<ActionFeedback | null>(null);
  const [pendingConfirmation, setPendingConfirmation] =
    useState<PendingConfirmation | null>(null);
  const [guidedDlqJobId, setGuidedDlqJobId] = useState<number | null>(null);

  const [dlqLimit, setDlqLimit] = useState("25");
  const [dlqJobType, setDlqJobType] = useState("");
  const [dlqTenantSlug, setDlqTenantSlug] = useState(requestedTenantSlug);
  const [dlqErrorCode, setDlqErrorCode] = useState("");
  const [dlqErrorContains, setDlqErrorContains] = useState("");
  const [dlqResetAttempts, setDlqResetAttempts] = useState(true);
  const [dlqDelaySeconds, setDlqDelaySeconds] = useState("0");
  const [historyLimit, setHistoryLimit] = useState("10");
  const [workerProfileFilter, setWorkerProfileFilter] = useState("");
  const [alertHistorySeverity, setAlertHistorySeverity] = useState("");
  const [alertHistoryCode, setAlertHistoryCode] = useState("");
  const [jobOperationFilter, setJobOperationFilter] = useState(requestedOperationFilter);
  const [tenantSlugFilter, setTenantSlugFilter] = useState(requestedTenantSlug);

  const tenantSlugById = useMemo(() => {
    const entries = new Map<number, string>();
    metrics?.data.forEach((row) => entries.set(row.tenant_id, row.tenant_slug));
    metricsByJobType?.data.forEach((row) => {
      if (!entries.has(row.tenant_id)) {
        entries.set(row.tenant_id, row.tenant_slug);
      }
    });
    jobs.forEach((job) => {
      if (!entries.has(job.tenant_id)) {
        entries.set(job.tenant_id, `tenant-${job.tenant_id}`);
      }
    });
    return entries;
  }, [jobs, metrics?.data, metricsByJobType?.data]);

  const normalizedTenantSlugFilter = tenantSlugFilter.trim().toLowerCase();
  const currentDispatchBackend =
    capabilities?.current_provisioning_dispatch_backend?.trim().toLowerCase() || null;
  const isBrokerDispatchActive = currentDispatchBackend === "broker";

  const tenantScopedJobs = useMemo(() => {
    if (!normalizedTenantSlugFilter) {
      return jobs;
    }
    return jobs.filter((job) =>
      (tenantSlugById.get(job.tenant_id) || `tenant-${job.tenant_id}`)
        .toLowerCase()
        .includes(normalizedTenantSlugFilter)
    );
  }, [jobs, normalizedTenantSlugFilter, tenantSlugById]);

  const filteredMetricsByTenantRows = useMemo(() => {
    if (!normalizedTenantSlugFilter) {
      return metrics?.data || [];
    }
    return (metrics?.data || []).filter((row) =>
      row.tenant_slug.toLowerCase().includes(normalizedTenantSlugFilter)
    );
  }, [metrics?.data, normalizedTenantSlugFilter]);

  const filteredMetricsByJobTypeRows = useMemo(() => {
    if (!normalizedTenantSlugFilter) {
      return metricsByJobType?.data || [];
    }
    return (metricsByJobType?.data || []).filter((row) =>
      row.tenant_slug.toLowerCase().includes(normalizedTenantSlugFilter)
    );
  }, [metricsByJobType?.data, normalizedTenantSlugFilter]);

  const filteredMetricsByErrorCodeRows = useMemo(() => {
    if (!normalizedTenantSlugFilter) {
      return metricsByErrorCode?.data || [];
    }
    return (metricsByErrorCode?.data || []).filter((row) =>
      row.tenant_slug.toLowerCase().includes(normalizedTenantSlugFilter)
    );
  }, [metricsByErrorCode?.data, normalizedTenantSlugFilter]);

  const filteredAlertsRows = useMemo(() => {
    if (!normalizedTenantSlugFilter) {
      return alerts?.data || [];
    }
    return (alerts?.data || []).filter((row) =>
      (row.tenant_slug || "").toLowerCase().includes(normalizedTenantSlugFilter)
    );
  }, [alerts?.data, normalizedTenantSlugFilter]);

  const filteredDlqRows = useMemo(() => {
    if (!normalizedTenantSlugFilter) {
      return dlq?.data || [];
    }
    return (dlq?.data || []).filter((row) =>
      (tenantSlugById.get(row.tenant_id) || `tenant-${row.tenant_id}`)
        .toLowerCase()
        .includes(normalizedTenantSlugFilter)
    );
  }, [dlq?.data, normalizedTenantSlugFilter, tenantSlugById]);

  const guidedDlqRow = useMemo(() => {
    if (guidedDlqJobId !== null) {
      return filteredDlqRows.find((row) => row.job_id === guidedDlqJobId) || null;
    }
    if (filteredDlqRows.length === 1) {
      return filteredDlqRows[0];
    }
    return null;
  }, [filteredDlqRows, guidedDlqJobId]);

  const dlqFamilySummaries = useMemo(() => {
    const summaries = new Map<string, DlqFamilySummary>();

    filteredDlqRows.forEach((row) => {
      const tenantSlug = tenantSlugById.get(row.tenant_id) || `tenant-${row.tenant_id}`;
      const errorCode = normalizeNullableString(row.error_code || "");
      const errorContains = errorCode
        ? null
        : buildDlqErrorContainsFingerprint(row.error_message || "");
      const familyKey = [
        tenantSlug.toLowerCase(),
        row.job_type,
        errorCode || `message:${errorContains || "n/a"}`,
      ].join("|");
      const errorLabel = errorCode
        ? formatProvisioningCodeLabel(errorCode)
        : normalizeNullableString(row.error_message || "") || "n/a";
      const existing = summaries.get(familyKey);

      if (!existing) {
        summaries.set(familyKey, {
          key: familyKey,
          tenantSlug,
          jobType: row.job_type,
          errorCode,
          errorContains,
          errorLabel,
          totalRows: 1,
          representativeJobId: row.job_id,
          latestRecordedAt: row.recorded_at,
        });
        return;
      }

      existing.totalRows += 1;
      if (
        buildComparableTimestamp(row.recorded_at) >
        buildComparableTimestamp(existing.latestRecordedAt)
      ) {
        existing.latestRecordedAt = row.recorded_at;
      }
    });

    return Array.from(summaries.values()).sort((left, right) => {
      if (right.totalRows !== left.totalRows) {
        return right.totalRows - left.totalRows;
      }
      return (
        buildComparableTimestamp(right.latestRecordedAt) -
        buildComparableTimestamp(left.latestRecordedAt)
      );
    });
  }, [filteredDlqRows, tenantSlugById]);

  const dlqGuidance = useMemo(() => {
    const tenantLabels = Array.from(
      new Set(
        filteredDlqRows.map(
          (row) => tenantSlugById.get(row.tenant_id) || `tenant-${row.tenant_id}`
        )
      )
    );
    const errorCodes = Array.from(
      new Set(filteredDlqRows.map((row) => normalizeNullableString(row.error_code || "") || ""))
    ).filter(Boolean);
    const jobTypes = Array.from(new Set(filteredDlqRows.map((row) => row.job_type)));
    const hasHomogeneousBatch =
      filteredDlqRows.length > 1 &&
      tenantLabels.length === 1 &&
      jobTypes.length === 1 &&
      errorCodes.length <= 1;

    if (filteredDlqRows.length === 0) {
      return {
        tone: "neutral" as const,
        title:
          language === "es" ? "Sin candidato visible para requeue" : "No visible requeue candidate",
        detail:
          language === "es"
            ? "Primero acota el DLQ hasta obtener una fila concreta o una familia homogénea de fallos."
            : "First narrow the DLQ until you get a concrete row or a homogeneous failure family.",
        bullets: [
          `${language === "es" ? "Tenant" : "Tenant"}: ${
            normalizeNullableString(dlqTenantSlug) || (language === "es" ? "sin filtro" : "no filter")
          }`,
          `${language === "es" ? "Código de error" : "Error code"}: ${
            normalizeNullableString(dlqErrorCode) || (language === "es" ? "sin filtro" : "no filter")
          }`,
        ],
        primaryAction: "none" as const,
        secondaryAction: "none" as const,
      };
    }

    if (guidedDlqRow) {
      const tenantLabel =
        tenantSlugById.get(guidedDlqRow.tenant_id) || `tenant-${guidedDlqRow.tenant_id}`;
      return {
        tone: "info" as const,
        title:
          language === "es"
            ? `Requeue guiado sobre job #${guidedDlqRow.job_id}`
            : `Guided requeue for job #${guidedDlqRow.job_id}`,
        detail:
          language === "es"
            ? "Ya hay una fila concreta enfocada. Puedes reencolar sólo ese job o, si el subconjunto sigue homogéneo, devolver también el lote visible."
            : "A concrete row is already focused. You can requeue only that job or, if the visible subset is still homogeneous, return the visible batch as well.",
        bullets: [
          `Tenant: ${tenantLabel}`,
          `${language === "es" ? "Tipo de job" : "Job type"}: ${formatProvisioningJobType(
            guidedDlqRow.job_type
          )}`,
          `${language === "es" ? "Error" : "Error"}: ${
            guidedDlqRow.error_code
              ? formatProvisioningCodeLabel(guidedDlqRow.error_code)
              : guidedDlqRow.error_message || "—"
          }`,
          `${language === "es" ? "Filas visibles del mismo set" : "Visible rows in the same set"}: ${
            filteredDlqRows.length
          }`,
        ],
        primaryAction: "single" as const,
        secondaryAction: hasHomogeneousBatch ? ("batch" as const) : ("none" as const),
      };
    }

    if (hasHomogeneousBatch) {
      return {
        tone: "success" as const,
        title:
          language === "es" ? "Lote seguro para requeue" : "Safe batch requeue candidate",
        detail:
          language === "es"
            ? "El subconjunto visible pertenece a la misma familia operativa. Puedes reencolar el lote completo con bajo riesgo de mezclar fallos distintos."
            : "The visible subset belongs to the same operational family. You can requeue the full batch with low risk of mixing different failures.",
        bullets: [
          `Tenant: ${tenantLabels[0]}`,
          `${language === "es" ? "Tipo de job" : "Job type"}: ${formatProvisioningJobType(jobTypes[0])}`,
          `${language === "es" ? "Código de error" : "Error code"}: ${
            errorCodes[0] ? formatProvisioningCodeLabel(errorCodes[0]) : "n/a"
          }`,
          `${language === "es" ? "Filas candidatas" : "Candidate rows"}: ${filteredDlqRows.length}`,
        ],
        primaryAction: "batch" as const,
        secondaryAction: "none" as const,
      };
    }

    return {
      tone: "warning" as const,
      title:
        language === "es"
          ? "Refina el DLQ antes de reencolar"
          : "Refine the DLQ before requeuing",
      detail:
        language === "es"
          ? "El set visible mezcla tenants, tipos de job o códigos de error. Enfoca una fila o ajusta filtros antes de ejecutar un lote."
          : "The visible set mixes tenants, job types or error codes. Focus a row or tighten filters before running a batch.",
      bullets: [
        `${language === "es" ? "Tenants visibles" : "Visible tenants"}: ${tenantLabels.length}`,
        `${language === "es" ? "Tipos de job" : "Job types"}: ${jobTypes.length}`,
        `${language === "es" ? "Códigos de error" : "Error codes"}: ${errorCodes.length || 0}`,
        `${language === "es" ? "Filas visibles" : "Visible rows"}: ${filteredDlqRows.length}`,
      ],
      primaryAction: "none" as const,
      secondaryAction: "none" as const,
    };
  }, [
    dlqErrorCode,
    dlqTenantSlug,
    filteredDlqRows,
    guidedDlqRow,
    language,
    tenantSlugById,
  ]);

  const overview = useMemo(() => {
    const totalJobs = tenantScopedJobs.length;
    const failedJobs = tenantScopedJobs.filter((job) => job.status === "failed").length;
    const runningJobs = tenantScopedJobs.filter((job) => job.status === "running").length;
    const activeAlerts = filteredAlertsRows.length;
    const dlqJobs = filteredDlqRows.length;

    return {
      totalJobs,
      failedJobs,
      runningJobs,
      activeAlerts,
      dlqJobs,
    };
  }, [filteredAlertsRows.length, filteredDlqRows.length, tenantScopedJobs]);

  const jobsRequiringAction = useMemo(() => {
    return tenantScopedJobs.filter(
      (job) =>
        job.status === "failed" ||
        job.status === "retry_pending" ||
        job.status === "pending"
    );
  }, [tenantScopedJobs]);

  const filteredJobs = useMemo(() => {
    if (jobOperationFilter === "all") {
      return tenantScopedJobs;
    }
    return tenantScopedJobs.filter(
      (job) => getProvisioningOperationKind(job.job_type) === jobOperationFilter
    );
  }, [jobOperationFilter, tenantScopedJobs]);

  const filteredJobsRequiringAction = useMemo(() => {
    if (jobOperationFilter === "all") {
      return jobsRequiringAction;
    }
    return jobsRequiringAction.filter(
      (job) => getProvisioningOperationKind(job.job_type) === jobOperationFilter
    );
  }, [jobOperationFilter, jobsRequiringAction]);

  const operationalSignals = useMemo(() => {
    const signals: Array<{
      key: string;
      title: string;
      detail: string;
    }> = [];

    const latestCycle = cycleHistory?.data[0];
    const failedJobCount = tenantScopedJobs.filter((job) => job.status === "failed").length;
    const retryJobCount = tenantScopedJobs.filter((job) => job.status === "retry_pending").length;
    const pendingJobCount = tenantScopedJobs.filter((job) => job.status === "pending").length;
    const activeDeprovisionJobs = tenantScopedJobs.filter(
      (job) =>
        job.job_type === "deprovision_tenant_database" &&
        (job.status === "failed" ||
          job.status === "retry_pending" ||
          job.status === "pending")
    ).length;

    if (failedJobCount > 0) {
      signals.push({
        key: "failed-jobs",
        title: `${failedJobCount} jobs agotaron intentos`,
        detail:
          "Revisa primero el panel de jobs que requieren acción y luego inspecciona el error agrupado por código para decidir si conviene reencolar o corregir antes la causa.",
      });
    }

    if (activeDeprovisionJobs > 0) {
      signals.push({
        key: "deprovision-jobs",
        title:
          language === "es"
            ? `${activeDeprovisionJobs} retiros técnicos siguen abiertos`
            : `${activeDeprovisionJobs} technical retirements are still open`,
        detail:
          language === "es"
            ? "No los leas como backlog normal de altas. Revisa si hay tenants archivados esperando liberar infraestructura antes de intentar borrarlos del catálogo."
            : "Do not read them as normal onboarding backlog. Check whether archived tenants are waiting to release infrastructure before trying to delete them from the catalog.",
      });
    }

    if (filteredDlqRows.length > 0) {
      signals.push({
        key: "dlq-jobs",
        title:
          language === "es"
            ? `${filteredDlqRows.length} filas quedaron en DLQ`
            : `${filteredDlqRows.length} rows landed in the DLQ`,
        detail:
          language === "es"
            ? "Usa los filtros DLQ para aislar una familia de fallos y reencola solo el subconjunto necesario en vez de devolver toda la cola."
            : "Use the DLQ filters to isolate one failure family and requeue only the required subset instead of returning the whole queue.",
      });
    }

    if (retryJobCount > 0) {
      signals.push({
        key: "retry-jobs",
        title:
          language === "es"
            ? `${retryJobCount} jobs esperan reintento`
            : `${retryJobCount} jobs are waiting for retry`,
        detail:
          language === "es"
            ? "No están muertos: puedes esperar el próximo ciclo del worker o forzar ejecución ahora si necesitas acelerar la recuperación."
            : "They are not dead: you can wait for the next worker cycle or force execution now if you need to speed up recovery.",
      });
    }

    if (pendingJobCount > 0) {
      signals.push({
        key: "pending-jobs",
        title:
          language === "es"
            ? `${pendingJobCount} jobs siguen en cola`
            : `${pendingJobCount} jobs are still queued`,
        detail:
          language === "es"
            ? "Esto suele indicar backlog normal. Si el alta de un tenant es urgente, puedes ejecutar el job manualmente desde la consola."
            : "This usually indicates normal backlog. If onboarding a tenant is urgent, you can run the job manually from the console.",
      });
    }

    if (latestCycle?.stopped_due_to_failure_limit) {
      signals.push({
        key: "failure-limit",
        title:
          language === "es"
            ? "El último ciclo del worker se detuvo por límite de fallos"
            : "The latest worker cycle stopped due to the failure limit",
        detail:
          language === "es"
            ? "La corrida reciente cortó procesamiento para no seguir acumulando errores. Revisa los jobs fallidos y los códigos de error antes de reintentar masivamente."
            : "The recent run stopped processing to avoid accumulating more errors. Review failed jobs and error codes before retrying in bulk.",
      });
    }

    if ((latestCycle?.failed_count || 0) > 0 && failedJobCount === 0) {
      signals.push({
        key: "cycle-failed-count",
        title:
          language === "es"
            ? `${latestCycle?.failed_count || 0} fallos en el último ciclo`
            : `${latestCycle?.failed_count || 0} failures in the latest cycle`,
        detail:
          language === "es"
            ? "Aunque no haya jobs marcados como fallidos definitivos, el worker sí vio errores recientes. Revisa alertas activas y familias de error para evitar deuda silenciosa."
            : "Even if no jobs are marked as permanently failed, the worker did see recent errors. Review active alerts and error families to avoid silent debt.",
      });
    }

    return signals;
  }, [cycleHistory?.data, filteredDlqRows.length, language, tenantScopedJobs]);

  const jobTypeOptions = useMemo(() => {
    const keys = new Set<string>();
    jobs.forEach((job) => keys.add(job.job_type));
    metricsByJobType?.data.forEach((row) => keys.add(row.job_type));
    dlq?.data.forEach((row) => keys.add(row.job_type));
    return Array.from(keys).sort();
  }, [dlq?.data, jobs, metricsByJobType?.data]);

  const workerProfileOptions = useMemo(() => {
    const keys = new Set<string>();
    cycleHistory?.data.forEach((row) => {
      if (row.worker_profile) {
        keys.add(row.worker_profile);
      }
    });
    alerts?.data.forEach((row) => {
      if (row.worker_profile) {
        keys.add(row.worker_profile);
      }
    });
    alertHistory?.data.forEach((row) => {
      if (row.worker_profile) {
        keys.add(row.worker_profile);
      }
    });
    return Array.from(keys).sort();
  }, [alertHistory?.data, alerts?.data, cycleHistory?.data]);

  const jobsByOperation = useMemo(() => {
    return {
      provision: tenantScopedJobs.filter(
        (job) => getProvisioningOperationKind(job.job_type) === "provision"
      ).length,
      deprovision: tenantScopedJobs.filter(
        (job) => getProvisioningOperationKind(job.job_type) === "deprovision"
      ).length,
      schema: tenantScopedJobs.filter(
        (job) => getProvisioningOperationKind(job.job_type) === "schema"
      ).length,
      other: tenantScopedJobs.filter(
        (job) => getProvisioningOperationKind(job.job_type) === "other"
      ).length,
    };
  }, [tenantScopedJobs]);

  async function loadProvisioningWorkspace(overrides?: Partial<DlqFormFilters>) {
    if (!session?.accessToken) {
      return;
    }

    setIsLoading(true);
    const effectiveTenantFocus = normalizeNullableString(
      overrides?.tenantSlug ?? tenantSlugFilter
    );
    const normalizedWorkerProfile = normalizeNullableString(workerProfileFilter);
    const normalizedAlertHistorySeverity = normalizeNullableString(alertHistorySeverity);
    const normalizedAlertHistoryCode = normalizeNullableString(alertHistoryCode);

    const dlqOptions = buildDlqOptions({
      limit: overrides?.limit ?? dlqLimit,
      jobType: overrides?.jobType ?? dlqJobType,
      tenantSlug: overrides?.tenantSlug ?? dlqTenantSlug,
      errorCode: overrides?.errorCode ?? dlqErrorCode,
      errorContains: overrides?.errorContains ?? dlqErrorContains,
    });

    const results = await Promise.allSettled([
      getPlatformCapabilities(session.accessToken),
      listProvisioningJobs(session.accessToken),
      getProvisioningMetrics(session.accessToken),
      getProvisioningMetricsByJobType(session.accessToken),
      getProvisioningMetricsByErrorCode(session.accessToken),
      getProvisioningMetricsHistory(session.accessToken, {
        limit: parsePositiveInteger(historyLimit, 10),
        tenantSlug: effectiveTenantFocus,
      }),
      getProvisioningCycleHistory(session.accessToken, {
        limit: parsePositiveInteger(historyLimit, 10),
        workerProfile: normalizedWorkerProfile,
      }),
      getProvisioningAlerts(session.accessToken, {
        tenantSlug: effectiveTenantFocus,
        workerProfile: normalizedWorkerProfile,
      }),
      getProvisioningAlertHistory(session.accessToken, {
        limit: parsePositiveInteger(historyLimit, 10),
        tenantSlug: effectiveTenantFocus,
        workerProfile: normalizedWorkerProfile,
        alertCode: normalizedAlertHistoryCode,
        severity: normalizedAlertHistorySeverity,
      }),
      getProvisioningBrokerDlq(session.accessToken, dlqOptions),
    ]);

    const [
      capabilitiesResult,
      jobsResult,
      metricsResult,
      jobTypeResult,
      errorCodeResult,
      metricsHistoryResult,
      cycleHistoryResult,
      alertsResult,
      alertHistoryResult,
      dlqResult,
    ] = results;

    if (capabilitiesResult.status === "fulfilled") {
      setCapabilities(capabilitiesResult.value);
      setCapabilitiesError(null);
    } else {
      setCapabilities(null);
      setCapabilitiesError(capabilitiesResult.reason as ApiError);
    }

    if (jobsResult.status === "fulfilled") {
      setJobs(jobsResult.value);
      setJobsError(null);
    } else {
      setJobs([]);
      setJobsError(jobsResult.reason as ApiError);
    }

    if (metricsResult.status === "fulfilled") {
      setMetrics(metricsResult.value);
      setMetricsError(null);
    } else {
      setMetrics(null);
      setMetricsError(metricsResult.reason as ApiError);
    }

    if (jobTypeResult.status === "fulfilled") {
      setMetricsByJobType(jobTypeResult.value);
      setMetricsError(null);
    } else {
      setMetricsByJobType(null);
      setMetricsError(jobTypeResult.reason as ApiError);
    }

    if (errorCodeResult.status === "fulfilled") {
      setMetricsByErrorCode(errorCodeResult.value);
      setMetricsError(null);
    } else {
      setMetricsByErrorCode(null);
      setMetricsError(errorCodeResult.reason as ApiError);
    }

    if (metricsHistoryResult.status === "fulfilled") {
      setMetricsHistory(metricsHistoryResult.value);
      setMetricsError(null);
    } else {
      setMetricsHistory(null);
      setMetricsError(metricsHistoryResult.reason as ApiError);
    }

    if (cycleHistoryResult.status === "fulfilled") {
      setCycleHistory(cycleHistoryResult.value);
      setMetricsError(null);
    } else {
      setCycleHistory(null);
      setMetricsError(cycleHistoryResult.reason as ApiError);
    }

    if (alertsResult.status === "fulfilled") {
      setAlerts(alertsResult.value);
      setAlertsError(null);
    } else {
      setAlerts(null);
      setAlertsError(alertsResult.reason as ApiError);
    }

    if (alertHistoryResult.status === "fulfilled") {
      setAlertHistory(alertHistoryResult.value);
      setAlertsError(null);
    } else {
      setAlertHistory(null);
      setAlertsError(alertHistoryResult.reason as ApiError);
    }

    if (dlqResult.status === "fulfilled") {
      setDlq(dlqResult.value);
      setDlqError(null);
    } else {
      setDlq(null);
      setDlqError(dlqResult.reason as ApiError);
    }

    setIsLoading(false);
  }

  useEffect(() => {
    if (!session?.accessToken) {
      return;
    }
    void loadProvisioningWorkspace();
  }, [session?.accessToken]);

  useEffect(() => {
    if (requestedTenantSlug !== tenantSlugFilter) {
      setTenantSlugFilter(requestedTenantSlug);
    }
    if (requestedTenantSlug !== dlqTenantSlug) {
      setDlqTenantSlug(requestedTenantSlug);
    }
    if (requestedOperationFilter !== jobOperationFilter) {
      setJobOperationFilter(requestedOperationFilter);
    }
  }, [
    dlqTenantSlug,
    jobOperationFilter,
    requestedOperationFilter,
    requestedTenantSlug,
    tenantSlugFilter,
  ]);

  useEffect(() => {
    const nextSearchParams = new URLSearchParams(searchParams);
    const normalizedTenantSlug = normalizeNullableString(tenantSlugFilter);

    if (normalizedTenantSlug) {
      nextSearchParams.set("tenantSlug", normalizedTenantSlug);
    } else {
      nextSearchParams.delete("tenantSlug");
    }

    if (jobOperationFilter !== "all") {
      nextSearchParams.set("operation", jobOperationFilter);
    } else {
      nextSearchParams.delete("operation");
    }

    if (nextSearchParams.toString() !== searchParams.toString()) {
      setSearchParams(nextSearchParams, { replace: true });
    }
  }, [jobOperationFilter, searchParams, setSearchParams, tenantSlugFilter]);

  useEffect(() => {
    if (
      guidedDlqJobId !== null &&
      !filteredDlqRows.some((row) => row.job_id === guidedDlqJobId)
    ) {
      setGuidedDlqJobId(null);
    }
  }, [filteredDlqRows, guidedDlqJobId]);

  async function runAction(
    scope: string,
    action: () => Promise<unknown>
  ) {
    setIsActionSubmitting(true);
    setActionFeedback(null);

    try {
      const result = await action();
      const message =
        result && typeof result === "object" && "message" in result
          ? String((result as { message?: unknown }).message || "")
          : "";
      await loadProvisioningWorkspace();
      setActionFeedback({
        scope,
        type: "success",
        message: getPlatformActionSuccessMessage(
          scope,
          message ||
            (language === "es"
              ? "La acción de provisioning se completó correctamente."
              : "The provisioning action completed successfully.")
        ),
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

  function getProvisioningActionRecommendation(job: ProvisioningJob): string {
    if (job.job_type === "deprovision_tenant_database") {
      switch (job.status) {
        case "failed":
          return language === "es"
            ? "Corrige el bloqueo del retiro técnico y reencola el job antes de intentar borrar el tenant."
            : "Fix the technical retirement blocker and requeue the job before trying to delete the tenant.";
        case "retry_pending":
          return language === "es"
            ? "El retiro técnico volverá a intentarse. Puedes esperar el worker o forzar la ejecución si quieres cerrar el tenant ahora."
            : "The technical retirement will be retried. You can wait for the worker or force execution if you want to close the tenant now.";
        case "pending":
          return language === "es"
            ? "El retiro técnico quedó en cola. Ejecútalo ahora si necesitas liberar infraestructura sin esperar al worker."
            : "The technical retirement is queued. Run it now if you need to release infrastructure without waiting for the worker.";
        default:
          return "n/a";
      }
    }

    switch (job.status) {
      case "failed":
        return language === "es"
          ? "Reencola el job o revisa el error antes de volver a intentar."
          : "Requeue the job or review the error before trying again.";
      case "retry_pending":
        return language === "es"
          ? "Puedes esperar el próximo ciclo del worker o forzar ejecución ahora."
          : "You can wait for the next worker cycle or force execution now.";
      case "pending":
        return language === "es"
          ? "Puedes dejarlo en cola o ejecutarlo ahora si necesitas acelerar el alta."
          : "You can leave it queued or run it now if you need to speed up provisioning.";
      default:
        return "n/a";
    }
  }

  function handleRefresh() {
    void loadProvisioningWorkspace();
  }

  function handleDlqFilterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setGuidedDlqJobId(null);
    void loadProvisioningWorkspace();
  }

  function handleObservabilityFilterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void loadProvisioningWorkspace();
  }

  function focusDlqPanel() {
    window.requestAnimationFrame(() => {
      document
        .getElementById("provisioning-dlq-panel")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function handleDlqInvestigation(filters: {
    sourceLabel: string;
    tenantSlug?: string | null;
    errorCode?: string | null;
    errorContains?: string | null;
    jobType?: string | null;
  }) {
    const nextTenantSlug = normalizeNullableString(filters.tenantSlug || "") || "";
    const nextErrorCode = normalizeNullableString(filters.errorCode || "") || "";
    const nextErrorContains = normalizeNullableString(filters.errorContains || "") || "";
    const nextJobType = normalizeNullableString(filters.jobType || "") || "";

    setTenantSlugFilter(nextTenantSlug);
    setDlqTenantSlug(nextTenantSlug);
    setDlqErrorCode(nextErrorCode);
    setDlqErrorContains(nextErrorContains);
    setDlqJobType(nextJobType);
    setActionFeedback({
      scope: "focus-dlq",
      type: "success",
      message:
        language === "es"
          ? `Se precargó la investigación DLQ desde ${filters.sourceLabel}. Revisa el panel inferior y ajusta el filtro si quieres ampliar el alcance.`
          : `DLQ investigation was prefilled from ${filters.sourceLabel}. Review the panel below and adjust the filter if you want to broaden the scope.`,
    });
    focusDlqPanel();
    void loadProvisioningWorkspace({
      limit: dlqLimit,
      tenantSlug: nextTenantSlug,
      errorCode: nextErrorCode,
      errorContains: nextErrorContains,
      jobType: nextJobType,
    });
  }

  function handleDlqBatchRequeue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    openDlqBatchRequeueConfirmation();
  }

  function openDlqBatchRequeueConfirmation() {
    if (!session?.accessToken) {
      return;
    }

    setPendingConfirmation({
      scope: "requeue-dlq-batch",
      title: language === "es" ? "Reencolar filas DLQ filtradas" : "Requeue filtered DLQ rows",
      description:
        language === "es"
          ? "Esta acción vuelve a poner en cola el subconjunto actual del DLQ usando los filtros visibles en pantalla."
          : "This action puts the current DLQ subset back in queue using the filters currently visible on screen.",
      details: [
        `${language === "es" ? "Filas candidatas" : "Candidate rows"}: ${filteredDlqRows.length}`,
        `${language === "es" ? "Tipo de job" : "Job type"}: ${
          normalizeNullableString(dlqJobType) || (language === "es" ? "todos" : "all")
        }`,
        `Tenant: ${normalizeNullableString(dlqTenantSlug) || (language === "es" ? "todos" : "all")}`,
        `${language === "es" ? "Resetear intentos" : "Reset attempts"}: ${
          dlqResetAttempts
            ? language === "es"
              ? "sí"
              : "yes"
            : language === "es"
              ? "no"
              : "no"
        }`,
        `${language === "es" ? "Demora antes de reencolar" : "Delay before requeue"}: ${parseNonNegativeInteger(dlqDelaySeconds, 0)} s`,
      ],
      confirmLabel: language === "es" ? "Reencolar lote" : "Requeue batch",
      action: () =>
        requeueProvisioningBrokerDlq(session.accessToken, {
          limit: parsePositiveInteger(dlqLimit, 25),
          job_type: normalizeNullableString(dlqJobType),
          tenant_slug: normalizeNullableString(dlqTenantSlug),
          error_code: normalizeNullableString(dlqErrorCode),
          error_contains: normalizeNullableString(dlqErrorContains),
          reset_attempts: dlqResetAttempts,
          delay_seconds: parseNonNegativeInteger(dlqDelaySeconds, 0),
        }),
    });
  }

  function handleGuidedDlqFocus(row: ProvisioningBrokerDeadLetterJob) {
    const tenantSlug = tenantSlugById.get(row.tenant_id) || `tenant-${row.tenant_id}`;
    const nextErrorCode = normalizeNullableString(row.error_code || "") || "";
    const nextErrorContains = nextErrorCode
      ? ""
      : normalizeNullableString(row.error_message || "") || "";

    setGuidedDlqJobId(row.job_id);
    setTenantSlugFilter(tenantSlug);
    setDlqTenantSlug(tenantSlug);
    setDlqJobType(row.job_type);
    setDlqErrorCode(nextErrorCode);
    setDlqErrorContains(nextErrorContains);
    setActionFeedback({
      scope: "focus-dlq",
      type: "success",
      message:
        language === "es"
          ? `Se enfocó requeue guiado desde el job #${row.job_id}. El DLQ quedó acotado a su familia operativa.`
          : `Guided requeue was focused from job #${row.job_id}. The DLQ is now narrowed to its operational family.`,
    });
    focusDlqPanel();
    void loadProvisioningWorkspace({
      limit: dlqLimit,
      tenantSlug,
      errorCode: nextErrorCode,
      errorContains: nextErrorContains,
      jobType: row.job_type,
    });
  }

  function handleDlqFamilyFocus(family: DlqFamilySummary) {
    setGuidedDlqJobId(family.totalRows === 1 ? family.representativeJobId : null);
    setTenantSlugFilter(family.tenantSlug);
    setDlqTenantSlug(family.tenantSlug);
    setDlqJobType(family.jobType);
    setDlqErrorCode(family.errorCode || "");
    setDlqErrorContains(family.errorCode ? "" : family.errorContains || "");
    setActionFeedback({
      scope: "focus-dlq-family",
      type: "success",
      message:
        language === "es"
          ? `Se enfocó la familia DLQ ${formatProvisioningJobType(
              family.jobType
            )} / ${family.errorLabel}.`
          : `DLQ family ${formatProvisioningJobType(
              family.jobType
            )} / ${family.errorLabel} is now focused.`,
    });
    focusDlqPanel();
    void loadProvisioningWorkspace({
      limit: dlqLimit,
      tenantSlug: family.tenantSlug,
      errorCode: family.errorCode || "",
      errorContains: family.errorCode ? "" : family.errorContains || "",
      jobType: family.jobType,
    });
  }

  function handleSingleRequeue(jobId: number) {
    if (!session?.accessToken) {
      return;
    }

    setPendingConfirmation({
      scope: "requeue-provisioning-job",
      title: language === "es" ? `Reencolar job #${jobId}` : `Requeue job #${jobId}`,
      description:
        language === "es"
          ? "Esta acción devuelve el job a cola para que vuelva a entrar al ciclo normal del worker."
          : "This action returns the job to queue so it re-enters the normal worker cycle.",
      details: [
        `Job: #${jobId}`,
        `${language === "es" ? "Resetear intentos" : "Reset attempts"}: ${
          dlqResetAttempts ? (language === "es" ? "sí" : "yes") : "no"
        }`,
        `${language === "es" ? "Demora antes de reencolar" : "Delay before requeue"}: ${parseNonNegativeInteger(dlqDelaySeconds, 0)} s`,
      ],
      confirmLabel: language === "es" ? "Reencolar job" : "Requeue job",
      action: () =>
        requeueProvisioningJob(session.accessToken, jobId, {
          resetAttempts: dlqResetAttempts,
          delaySeconds: parseNonNegativeInteger(dlqDelaySeconds, 0),
        }),
    });
  }

  function handleRunNow(job: ProvisioningJob) {
    if (!session?.accessToken) {
      return;
    }

    setPendingConfirmation({
      scope: "run-provisioning-job",
      title: language === "es" ? `Ejecutar ahora el job #${job.id}` : `Run job #${job.id} now`,
      description:
        job.job_type === "deprovision_tenant_database"
          ? language === "es"
            ? "Esta acción intenta ejecutar inmediatamente el retiro técnico del tenant seleccionado, sin esperar al siguiente ciclo del worker."
            : "This action tries to run the selected tenant technical retirement immediately, without waiting for the next worker cycle."
          : language === "es"
            ? "Esta acción intenta procesar inmediatamente el job seleccionado, sin esperar al siguiente ciclo del worker."
            : "This action tries to process the selected job immediately, without waiting for the next worker cycle.",
      details: [
        `Tenant: ${tenantSlugById.get(job.tenant_id) || `tenant-${job.tenant_id}`}`,
        `${language === "es" ? "Operación" : "Operation"}: ${formatProvisioningJobType(job.job_type)}`,
        `${language === "es" ? "Estado actual" : "Current status"}: ${formatProvisioningCodeLabel(job.status)}`,
        `${language === "es" ? "Intentos usados" : "Used attempts"}: ${job.attempts}/${job.max_attempts}`,
      ],
      confirmLabel:
        job.job_type === "deprovision_tenant_database"
          ? language === "es"
            ? "Ejecutar retiro técnico"
            : "Run technical retirement"
          : language === "es"
            ? "Ejecutar ahora"
            : "Run now",
      action: () => runProvisioningJob(session.accessToken, job.id),
    });
  }

  function handleBulkSchemaAutoSync() {
    if (!session?.accessToken) {
      return;
    }

    setPendingConfirmation({
      scope: "bulk-sync-schema",
      title:
        language === "es"
          ? "Encolar auto-sync de esquema tenant"
          : "Queue tenant schema auto-sync",
      description:
        language === "es"
          ? "Esta acción crea jobs de sincronización para tenants activos con base configurada y sin jobs vivos de provisioning."
          : "This action creates sync jobs for active tenants with configured databases and no live provisioning jobs.",
      details: [
        language === "es"
          ? "Alcance: tenants activos con DB tenant lista."
          : "Scope: active tenants with a ready tenant DB.",
        language === "es"
          ? "Se omiten tenants sin base configurada, con credenciales inválidas o con jobs vivos."
          : "Tenants without a configured database, with invalid credentials or with live jobs are skipped.",
        language === "es"
          ? "Úsalo después de un deploy backend para empujar migraciones tenant sin esperar el primer error de uso."
          : "Use it after a backend deploy to push tenant migrations without waiting for the first usage error.",
      ],
      confirmLabel: language === "es" ? "Encolar auto-sync" : "Queue auto-sync",
      action: () => bulkSyncPlatformTenantSchemas(session.accessToken),
    });
  }

  return (
    <div className="d-grid gap-4">
      <PageHeader
        eyebrow={language === "es" ? "Plataforma" : "Platform"}
        title="Provisioning"
        description={
          language === "es"
            ? "Vista operativa sobre jobs, backlog por tenant, alertas activas y recuperación por DLQ usando los contratos backend ya cerrados."
            : "Operational view of jobs, per-tenant backlog, active alerts and DLQ recovery using the already closed backend contracts."
        }
        icon="provisioning"
        actions={
          <AppToolbar compact>
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() =>
                downloadTextFile(
                  buildProvisioningJobsCsv(filteredJobs, tenantSlugById, language),
                  `provisioning-jobs-${jobOperationFilter}${normalizedTenantSlugFilter ? `-${normalizedTenantSlugFilter}` : ""}.csv`,
                  "text/csv;charset=utf-8;"
                )
              }
              disabled={filteredJobs.length === 0}
            >
              {language === "es" ? "Exportar CSV jobs" : "Export jobs CSV"}
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() =>
                downloadTextFile(
                  JSON.stringify(
                    buildProvisioningWorkspaceExportPayload({
                      operationFilter: jobOperationFilter,
                      tenantSlugFilter,
                      dlqLimit,
                      dlqJobType,
                      dlqTenantSlug,
                      dlqErrorCode,
                      dlqErrorContains,
                      dlqResetAttempts,
                      dlqDelaySeconds,
                      jobs: filteredJobs,
                      metricsByTenantRows: filteredMetricsByTenantRows,
                      metricsByJobTypeRows: filteredMetricsByJobTypeRows,
                      metricsByErrorCodeRows: filteredMetricsByErrorCodeRows,
                      cycleHistory,
                      alertsRows: filteredAlertsRows,
                      dlqRows: filteredDlqRows,
                      dlqFamilySummaries,
                    }),
                    null,
                    2
                  ),
                  "provisioning-workspace.json",
                  "application/json;charset=utf-8;"
                )
              }
              disabled={
                filteredJobs.length === 0 &&
                filteredMetricsByTenantRows.length === 0 &&
                filteredMetricsByJobTypeRows.length === 0 &&
                filteredMetricsByErrorCodeRows.length === 0 &&
                !cycleHistory &&
                filteredAlertsRows.length === 0 &&
                filteredDlqRows.length === 0
              }
            >
              {language === "es" ? "Exportar JSON" : "Export JSON"}
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={handleBulkSchemaAutoSync}
              disabled={isLoading || isActionSubmitting}
            >
              {language === "es" ? "Auto-sync esquemas" : "Schema auto-sync"}
            </button>
            <button
              type="button"
              className="btn btn-outline-primary"
              onClick={handleRefresh}
              disabled={isLoading || isActionSubmitting}
            >
              {language === "es" ? "Recargar datos" : "Reload data"}
            </button>
          </AppToolbar>
        }
      />

        <ConfirmDialog
        isOpen={Boolean(pendingConfirmation)}
        title={pendingConfirmation?.title || ""}
        description={pendingConfirmation?.description || ""}
        details={pendingConfirmation?.details || []}
        confirmLabel={pendingConfirmation?.confirmLabel || (language === "es" ? "Confirmar" : "Confirm")}
        onConfirm={() => {
          if (!pendingConfirmation) {
            return;
          }
          const currentAction = pendingConfirmation;
          setPendingConfirmation(null);
          void runAction(currentAction.scope, currentAction.action);
        }}
        onCancel={() => setPendingConfirmation(null)}
        isSubmitting={isActionSubmitting}
      />

      {!isLoading && !capabilitiesError && capabilities ? (
        <PanelCard
          icon="settings"
          title={language === "es" ? "Capacidad activa de provisioning" : "Active provisioning capability"}
          subtitle={
            language === "es"
              ? "La consola deja explícito si este entorno puede operar DLQ broker-only o solo backlog por base de datos."
              : "The console makes it explicit whether this environment can operate broker-only DLQ or only database-backed backlog."
          }
        >
          <div
            style={{
              display: "grid",
              gap: "0.75rem",
            }}
          >
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
              <strong>{language === "es" ? "Dispatch backend activo" : "Active dispatch backend"}</strong>
              <AppBadge tone={isBrokerDispatchActive ? "success" : "warning"}>
                {currentDispatchBackend || "n/a"}
              </AppBadge>
              <span className="tenant-help-text">
                {language === "es"
                  ? `Backends soportados por la plataforma: ${(capabilities.provisioning_dispatch_backends || []).join(", ")}`
                  : `Backends supported by the platform: ${(capabilities.provisioning_dispatch_backends || []).join(", ")}`}
              </span>
            </div>
            <p className="tenant-help-text mb-0">
              {isBrokerDispatchActive
                ? language === "es"
                  ? "Este entorno sí permite operación DLQ broker-only: filtros DLQ, requeue individual, batch y requeue guiado se leen como superficie activa."
                  : "This environment does support broker-only DLQ operations: DLQ filters, individual requeue, batch and guided requeue are an active surface."
                : language === "es"
                  ? "Este entorno no corre hoy con backend broker. Puedes seguir leyendo jobs, métricas y alertas, pero los recorridos DLQ broker-only deben validarse en staging u otro entorno broker."
                  : "This environment is not currently running with the broker backend. You can still read jobs, metrics and alerts, but broker-only DLQ flows must be validated in staging or another broker environment."}
            </p>
          </div>
        </PanelCard>
      ) : null}

      {!isLoading && capabilitiesError ? (
        <ErrorState
          title={
            language === "es"
              ? "Capacidad de provisioning no disponible"
              : "Provisioning capability unavailable"
          }
          detail={capabilitiesError.payload?.detail || capabilitiesError.message}
          requestId={capabilitiesError.payload?.request_id}
        />
      ) : null}

      {actionFeedback ? (
        <div
          className={`tenant-action-feedback tenant-action-feedback--${actionFeedback.type}`}
        >
          <strong>{getPlatformActionFeedbackLabel(actionFeedback.scope, language)}:</strong>{" "}
          {actionFeedback.message}
        </div>
      ) : null}

      {isLoading ? (
        <LoadingBlock
          label={
            language === "es"
              ? "Cargando operación de provisioning..."
              : "Loading provisioning operations..."
          }
        />
      ) : null}

      <PanelCard
        icon="catalogs"
        title={language === "es" ? "Qué hace provisioning" : "What provisioning does"}
        subtitle={
          language === "es"
            ? "Referencia corta para no confundir el alta en catálogo con la preparación técnica real del tenant."
            : "Short reference so you do not confuse catalog creation with the actual technical preparation of the tenant."
        }
      >
        <div className="dashboard-quick-hints mt-0">
          <div>
            {language === "es"
              ? "`Crear tenant` da de alta la entidad en `platform_control` y dispara el job inicial."
              : "`Create tenant` registers the entity in `platform_control` and triggers the initial job."}
          </div>
          <div>
            {language === "es"
              ? "`Provisionar` prepara la DB tenant, el usuario técnico, el esquema y el admin inicial que se capturó al crear el tenant."
              : "`Provision` prepares the tenant DB, the technical user, the schema and the initial admin captured during tenant creation."}
          </div>
          <div>
            {language === "es"
              ? "`Desprovisionar tenant` crea un job de retiro técnico para soltar DB, rol y secretos técnicos sin borrar todavía la fila viva del tenant."
              : "`Deprovision tenant` creates a technical retirement job to release the DB, role and technical secrets without deleting the live tenant row yet."}
          </div>
          <div>
            {language === "es"
              ? "`Pending` espera worker, `retry_pending` volverá a intentarse, `failed` requiere intervención y `completed` deja el tenant listo."
              : "`Pending` waits for the worker, `retry_pending` will retry, `failed` requires intervention and `completed` leaves the tenant ready."}
          </div>
        </div>
      </PanelCard>

      <PanelCard
        icon="focus"
        title={language === "es" ? "Foco por operación" : "Focus by operation"}
        subtitle={
          language === "es"
            ? "Separa altas, retiros técnicos y cambios de esquema para no mezclar deudas distintas en la misma lectura."
            : "Separate creations, technical retirements and schema changes so different debts do not mix in the same view."
        }
      >
        <AppToolbar className="provisioning-filter-strip">
          <button
            type="button"
            className={`btn btn-sm ${jobOperationFilter === "all" ? "btn-primary" : "btn-outline-primary"}`}
            onClick={() => setJobOperationFilter("all")}
          >
            {language === "es" ? "Todas" : "All"}
          </button>
          <button
            type="button"
            className={`btn btn-sm ${jobOperationFilter === "provision" ? "btn-primary" : "btn-outline-primary"}`}
            onClick={() => setJobOperationFilter("provision")}
          >
            {language === "es" ? "Altas" : "Creates"}
          </button>
          <button
            type="button"
            className={`btn btn-sm ${jobOperationFilter === "deprovision" ? "btn-primary" : "btn-outline-primary"}`}
            onClick={() => setJobOperationFilter("deprovision")}
          >
            {language === "es" ? "Retiros técnicos" : "Technical retirements"}
          </button>
          <button
            type="button"
            className={`btn btn-sm ${jobOperationFilter === "schema" ? "btn-primary" : "btn-outline-primary"}`}
            onClick={() => setJobOperationFilter("schema")}
          >
            {language === "es" ? "Esquema" : "Schema"}
          </button>
        </AppToolbar>
        <div className="row g-3 mt-1">
          <div className="col-12 col-md-6 col-xl-4">
            <label className="form-label" htmlFor="provisioning-tenant-focus">
              {language === "es" ? "Foco tenant" : "Tenant focus"}
            </label>
            <input
              id="provisioning-tenant-focus"
              className="form-control"
              value={tenantSlugFilter}
              onChange={(event) => setTenantSlugFilter(event.target.value)}
              placeholder={
                language === "es"
                  ? "Filtra jobs y métricas por slug tenant"
                  : "Filter jobs and metrics by tenant slug"
              }
            />
          </div>
        </div>
        {normalizedTenantSlugFilter ? (
          <div className="tenant-inline-note mt-2">
            {language === "es"
              ? `La consola está enfocada en tenants que coinciden con "${tenantSlugFilter.trim()}". El DLQ mantiene su filtro propio, pero la lectura operativa ya quedó acotada a ese tenant.`
              : `The console is focused on tenants matching "${tenantSlugFilter.trim()}". DLQ keeps its own filter, but the operational read is now scoped to that tenant.`}
          </div>
        ) : null}
        <div className="provisioning-operation-summary">
          <ProvisioningOperationSummaryItem
            label={language === "es" ? "Altas" : "Creates"}
            count={jobsByOperation.provision}
            kind="provision"
          />
          <ProvisioningOperationSummaryItem
            label={language === "es" ? "Retiros técnicos" : "Technical retirements"}
            count={jobsByOperation.deprovision}
            kind="deprovision"
          />
          <ProvisioningOperationSummaryItem
            label={language === "es" ? "Esquema" : "Schema"}
            count={jobsByOperation.schema}
            kind="schema"
          />
          {jobsByOperation.other > 0 ? (
            <ProvisioningOperationSummaryItem
              label={language === "es" ? "Otros" : "Other"}
              count={jobsByOperation.other}
              kind="other"
            />
          ) : null}
        </div>
      </PanelCard>

      <div className="provisioning-overview-grid">
        <MetricCard label={language === "es" ? "Jobs en catálogo" : "Jobs in catalog"} icon="catalogs" tone="default" value={overview.totalJobs} />
        <MetricCard label={language === "es" ? "Jobs en ejecución" : "Running jobs"} icon="provisioning" tone="info" value={overview.runningJobs} />
        <MetricCard label={language === "es" ? "Jobs fallidos" : "Failed jobs"} icon="focus" tone="danger" value={overview.failedJobs} />
        <MetricCard label={language === "es" ? "Alertas activas" : "Active alerts"} icon="pulse" tone="warning" value={overview.activeAlerts} />
        <MetricCard
          label={language === "es" ? "Filas DLQ" : "DLQ rows"}
          icon="activity"
          tone="warning"
          value={overview.dlqJobs}
        />
      </div>

      <PanelCard
        icon="focus"
        title={language === "es" ? "Jobs que requieren acción" : "Jobs requiring action"}
        subtitle={
          language === "es"
            ? "Vista corta para decidir rápido si debes ejecutar, esperar retry o reencolar."
            : "Short view to quickly decide whether to run, wait for retry or requeue."
        }
      >
        {filteredJobsRequiringAction.length === 0 ? (
          <EmptyState
            title={
              language === "es"
                ? "No hay jobs que requieran intervención"
                : "There are no jobs requiring intervention"
            }
            detail={
              jobOperationFilter === "all"
                ? language === "es"
                  ? "No existen jobs pendientes, en retry o fallidos. El worker quedó sin deuda operativa inmediata."
                  : "There are no pending, retrying or failed jobs. The worker has no immediate operational debt."
                : language === "es"
                  ? "No hay jobs abiertos para la operación filtrada en este momento."
                  : "There are no open jobs for the filtered operation right now."
            }
          />
        ) : (
          <AppTableWrap>
            <table className="table align-middle">
              <thead>
                <tr>
                  <th>Job</th>
                  <th>Tenant</th>
                  <th>{language === "es" ? "Operación" : "Operation"}</th>
                  <th>{language === "es" ? "Estado" : "Status"}</th>
                  <th>{language === "es" ? "Acción recomendada" : "Recommended action"}</th>
                  <th>{language === "es" ? "Siguiente paso" : "Next step"}</th>
                </tr>
              </thead>
              <tbody>
                {filteredJobsRequiringAction.map((job) => (
                  <tr key={`action-${job.id}`}>
                    <td><code>#{job.id}</code></td>
                    <td><code>{tenantSlugById.get(job.tenant_id) || `tenant-${job.tenant_id}`}</code></td>
                    <td><ProvisioningOperationBadge jobType={job.job_type} /></td>
                    <td><StatusBadge value={job.status} /></td>
                    <td>{getProvisioningActionRecommendation(job)}</td>
                    <td>
                      {job.status === "failed" ? (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => handleSingleRequeue(job.id)}
                          disabled={isActionSubmitting}
                        >
                          {language === "es" ? "Reencolar" : "Requeue"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => handleRunNow(job)}
                          disabled={isActionSubmitting}
                        >
                          {language === "es" ? "Ejecutar ahora" : "Run now"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </AppTableWrap>
        )}
      </PanelCard>

      <PanelCard
        icon="activity"
        title={language === "es" ? "Qué revisar ahora" : "What to review now"}
        subtitle={
          language === "es"
            ? "Lectura operativa rápida para distinguir backlog normal de deuda que ya requiere intervención."
            : "Quick operational read to distinguish normal backlog from debt that already requires intervention."
        }
      >
        {operationalSignals.length === 0 ? (
          <EmptyState
            title={
              language === "es"
                ? "No hay señales operativas abiertas"
                : "There are no open operational signals"
            }
            detail={
              language === "es"
                ? "No hay jobs fallidos, DLQ relevante ni señales recientes de ciclos cortados por error. Provisioning se ve estable en este momento."
                : "There are no failed jobs, relevant DLQ rows or recent signs of worker cycles cut by errors. Provisioning looks stable right now."
            }
          />
        ) : (
          <div className="dashboard-quick-hints mt-0">
            {operationalSignals.map((signal) => (
              <div key={signal.key}>
                <strong>{signal.title}.</strong> {signal.detail}
              </div>
            ))}
          </div>
        )}
      </PanelCard>

      <PanelCard
        icon="pulse"
        title={
          language === "es" ? "Observabilidad visible" : "Visible observability"
        }
        subtitle={
          language === "es"
            ? "Lee tendencia reciente por tenant y alertas persistidas sin depender solo del estado activo actual."
            : "Read recent tenant trends and persisted alerts without depending only on the current active state."
        }
      >
        <AppForm className="tenant-action-form" onSubmit={handleObservabilityFilterSubmit}>
          <AppFormField>
            <FieldHelpLabel
              label={language === "es" ? "Límite de historial" : "History limit"}
              help={
                language === "es"
                  ? "Cantidad máxima de snapshots, alertas históricas y ciclos recientes a recuperar por consulta."
                  : "Maximum number of snapshots, historical alerts and recent cycles to fetch per query."
              }
            />
            <input
              className="form-control"
              type="number"
              min="1"
              value={historyLimit}
              onChange={(event) => setHistoryLimit(event.target.value)}
            />
          </AppFormField>
          <AppFormField>
            <FieldHelpLabel
              label={language === "es" ? "Worker profile" : "Worker profile"}
              help={
                language === "es"
                  ? "Acota ciclos recientes y alertas históricas a un worker específico cuando operas más de un perfil."
                  : "Scope recent cycles and alert history to a specific worker when more than one profile is operating."
              }
            />
            <input
              className="form-control"
              list="provisioning-worker-profile-options"
              value={workerProfileFilter}
              onChange={(event) => setWorkerProfileFilter(event.target.value)}
            />
            <datalist id="provisioning-worker-profile-options">
              {workerProfileOptions.map((value) => (
                <option key={value} value={value} />
              ))}
            </datalist>
          </AppFormField>
          <AppFormField>
            <FieldHelpLabel
              label={language === "es" ? "Código de alerta" : "Alert code"}
              help={
                language === "es"
                  ? "Permite revisar solo una familia histórica de alertas operativas."
                  : "Lets you review only one historical family of operational alerts."
              }
            />
            <input
              className="form-control"
              value={alertHistoryCode}
              onChange={(event) => setAlertHistoryCode(event.target.value)}
            />
          </AppFormField>
          <AppFormField>
            <FieldHelpLabel
              label={language === "es" ? "Severidad" : "Severity"}
              help={
                language === "es"
                  ? "Usa warning o error para separar degradación leve de fallos ya críticos."
                  : "Use warning or error to separate mild degradation from already critical failures."
              }
            />
            <select
              className="form-select"
              value={alertHistorySeverity}
              onChange={(event) => setAlertHistorySeverity(event.target.value)}
            >
              <option value="">{language === "es" ? "Todas" : "All"}</option>
              <option value="warning">warning</option>
              <option value="error">error</option>
              <option value="critical">critical</option>
            </select>
          </AppFormField>
          <div className="app-form-field app-form-field--full">
            <p className="tenant-help-text mt-0 mb-0">
              {language === "es"
                ? `El foco tenant superior también se reutiliza aquí${normalizeNullableString(tenantSlugFilter) ? ` para ${tenantSlugFilter.trim()}` : ""}, así que puedes alternar entre lectura global o acotada sin cambiar de pantalla.`
                : `The tenant focus above is also reused here${normalizeNullableString(tenantSlugFilter) ? ` for ${tenantSlugFilter.trim()}` : ""}, so you can switch between global and scoped readings without leaving the screen.`}
            </p>
          </div>
          <AppFormActions>
            <button
              type="submit"
              className="btn btn-outline-primary"
              disabled={isLoading || isActionSubmitting}
            >
              {language === "es" ? "Recargar observabilidad" : "Reload observability"}
            </button>
          </AppFormActions>
        </AppForm>
      </PanelCard>

      {!metricsError && metricsHistory ? (
        metricsHistory.data.length > 0 ? (
          <DataTableCard
            title={
              language === "es"
                ? "Snapshots recientes por tenant"
                : "Recent tenant snapshots"
            }
            subtitle={
              language === "es"
                ? "Serie corta de backlog y fallos para distinguir tendencia reciente del tenant enfocado."
                : "Short series of backlog and failures to distinguish the recent trend of the focused tenant."
            }
            rows={metricsHistory.data}
            columns={[
              {
                key: "captured_at",
                header: language === "es" ? "Capturado en" : "Captured at",
                render: (row) => formatDateTime(row.captured_at),
              },
              {
                key: "tenant_slug",
                header: language === "es" ? "Tenant" : "Tenant",
                render: (row) => <code>{row.tenant_slug}</code>,
              },
              {
                key: "total_jobs",
                header: language === "es" ? "Total" : "Total",
                render: (row) => row.total_jobs,
              },
              {
                key: "pending_jobs",
                header: language === "es" ? "Pendientes" : "Pending",
                render: (row) => row.pending_jobs,
              },
              {
                key: "retry_pending_jobs",
                header: language === "es" ? "Reintento" : "Retrying",
                render: (row) => row.retry_pending_jobs,
              },
              {
                key: "failed_jobs",
                header: language === "es" ? "Fallidos" : "Failed",
                render: (row) => row.failed_jobs,
              },
              {
                key: "max_attempts_seen",
                header: language === "es" ? "Máx. intentos" : "Max attempts",
                render: (row) => row.max_attempts_seen,
              },
            ]}
          />
        ) : (
          <PanelCard
            icon="activity"
            title={
              language === "es"
                ? "Snapshots recientes por tenant"
                : "Recent tenant snapshots"
            }
            subtitle={
              language === "es"
                ? "Todavía no hay snapshots persistidos para el filtro visible."
                : "There are no persisted snapshots for the visible filter yet."
            }
          >
            <EmptyState
              title={
                language === "es"
                  ? "No hay snapshots recientes"
                  : "There are no recent snapshots"
              }
              detail={
                language === "es"
                  ? "Esto suele pasar cuando el worker aún no capturó métricas persistidas o el filtro actual es demasiado estrecho."
                  : "This usually happens when the worker has not captured persisted metrics yet or the current filter is too narrow."
              }
            />
          </PanelCard>
        )
      ) : null}

      {showDevelopmentBootstrapHelp ? (
        <PanelCard
          icon="users"
          title={
            language === "es"
              ? "Referencia bootstrap en desarrollo"
              : "Development bootstrap reference"
          }
          subtitle={
            language === "es"
              ? "Ayuda visible solo en entorno local para recordar que el admin inicial ahora se define al crear el tenant."
              : "Helper visible only in local environments to remind that the initial admin is now defined during tenant creation."
          }
        >
          <div className="text-secondary">
            {language === "es"
              ? "Correo del admin inicial:"
              : "Initial admin email:"}
            {" "}
            <code>{language === "es" ? "el que ingresaste en `Crear tenant`" : "the one entered in `Create tenant`"}</code>
          </div>
          <div className="text-secondary">
            {language === "es"
              ? "Contraseña del admin inicial:"
              : "Initial admin password:"}
            {" "}
            <code>{language === "es" ? "la que definiste en `Crear tenant`" : "the one defined in `Create tenant`"}</code>
          </div>
          <div className="tenant-inline-note">
            {language === "es"
              ? "Los tenants demo seed pueden seguir usando credenciales conocidas de prueba, pero las altas nuevas ya no heredan un admin fijo."
              : "Seeded demo tenants may still use known test credentials, but new tenants no longer inherit a fixed admin."}
          </div>
        </PanelCard>
      ) : null}

      {jobsError ? (
        <ErrorState
          title={
            language === "es"
              ? "Jobs de provisioning no disponibles"
              : "Provisioning jobs unavailable"
          }
          detail={jobsError.payload?.detail || jobsError.message}
          requestId={jobsError.payload?.request_id}
        />
      ) : null}

      {!jobsError && filteredJobs.length > 0 ? (
        <DataTableCard
            title={language === "es" ? "Jobs de provisioning" : "Provisioning jobs"}
          subtitle={
            jobOperationFilter === "all"
              ? language === "es"
                ? "Catálogo completo de jobs técnicos."
                : "Complete catalog of technical jobs."
              : language === "es"
                ? `Vista filtrada por ${formatProvisioningOperationFilterLabel(jobOperationFilter)}.`
                : `Filtered view by ${formatProvisioningOperationFilterLabel(jobOperationFilter)}.`
          }
          rows={filteredJobs}
          columns={[
            {
              key: "id",
              header: language === "es" ? "Job" : "Job",
              render: (row) => <code>#{row.id}</code>,
            },
            {
              key: "tenant_id",
              header: language === "es" ? "Tenant" : "Tenant",
              render: (row) => (
                <code>{tenantSlugById.get(row.tenant_id) || `tenant-${row.tenant_id}`}</code>
              ),
            },
            {
              key: "operation",
              header: language === "es" ? "Operación" : "Operation",
              render: (row) => <ProvisioningOperationBadge jobType={row.job_type} />,
            },
            {
              key: "job_type",
              header: language === "es" ? "Tipo de job" : "Job type",
              render: (row) => (
                <ProvisioningCodeCell
                  label={formatProvisioningJobType(row.job_type)}
                  code={row.job_type}
                />
              ),
            },
            {
              key: "status",
              header: language === "es" ? "Estado" : "Status",
              render: (row) => <StatusBadge value={row.status} />,
            },
            {
              key: "attempts",
              header: language === "es" ? "Intentos" : "Attempts",
              render: (row) => `${row.attempts}/${row.max_attempts}`,
            },
            {
              key: "error_code",
              header: language === "es" ? "Código de error" : "Error code",
              render: (row) =>
                row.error_code ? (
                  <ProvisioningCodeCell
                    label={formatProvisioningCodeLabel(row.error_code)}
                    code={row.error_code}
                  />
                ) : (
                  "—"
                ),
            },
            {
              key: "next_retry_at",
              header: language === "es" ? "Próximo reintento" : "Next retry",
              render: (row) => formatDateTime(row.next_retry_at),
            },
              {
                key: "actions",
                header: language === "es" ? "Acciones" : "Actions",
                render: (row) =>
                  row.status === "failed" ? (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary"
                      onClick={() => handleSingleRequeue(row.id)}
                      disabled={isActionSubmitting}
                    >
                      {language === "es" ? "Reencolar" : "Requeue"}
                    </button>
                  ) : row.status === "pending" || row.status === "retry_pending" ? (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary"
                      onClick={() => handleRunNow(row)}
                      disabled={isActionSubmitting}
                    >
                      {language === "es" ? "Ejecutar ahora" : "Run now"}
                    </button>
                  ) : (
                    "—"
                  ),
              },
            ]}
        />
      ) : !jobsError && !isLoading ? (
        <PanelCard
          icon="provisioning"
          title={language === "es" ? "Jobs de provisioning" : "Provisioning jobs"}
          subtitle={
            jobs.length === 0
              ? language === "es"
                ? "El backend no devolvió jobs en el catálogo actual."
                : "The backend did not return jobs in the current catalog."
              : language === "es"
                ? "El filtro actual no dejó jobs visibles en la tabla."
                : "The current filter left no visible jobs in the table."
          }
        >
          <EmptyState
            title={
              jobs.length === 0
                ? language === "es"
                  ? "Todavía no hay jobs de provisioning"
                  : "There are no provisioning jobs yet"
                : language === "es"
                  ? "No hay jobs para la operación filtrada"
                  : "There are no jobs for the filtered operation"
            }
            detail={
              jobs.length === 0
                ? language === "es"
                  ? "Esto suele pasar cuando aún no se crean tenants nuevos o cuando no hubo automatizaciones pendientes en este entorno."
                  : "This usually happens when no new tenants have been created yet or there were no pending automations in this environment."
                : language === "es"
                  ? "Prueba con otra operación o vuelve a `Todas` para recuperar el catálogo completo."
                  : "Try another operation or return to `All` to recover the full catalog."
            }
          />
        </PanelCard>
      ) : null}

      {metricsError ? (
        <ErrorState
            title={
              language === "es"
                ? "Métricas de provisioning no disponibles"
                : "Provisioning metrics unavailable"
            }
          detail={metricsError.payload?.detail || metricsError.message}
          requestId={metricsError.payload?.request_id}
        />
      ) : null}

      {!metricsError && metrics ? (
        <div className="provisioning-data-grid">
          <DataTableCard
            title={language === "es" ? "Métricas por tenant" : "Metrics by tenant"}
            rows={filteredMetricsByTenantRows}
            columns={[
              {
                key: "tenant_slug",
                header: language === "es" ? "Tenant" : "Tenant",
                render: (row) => <code>{row.tenant_slug}</code>,
              },
              {
                key: "total_jobs",
                header: language === "es" ? "Total" : "Total",
                render: (row) => row.total_jobs,
              },
              {
                key: "pending_jobs",
                header: language === "es" ? "Pendientes" : "Pending",
                render: (row) => row.pending_jobs,
              },
              {
                key: "retry_pending_jobs",
                header: language === "es" ? "Reintento" : "Retrying",
                render: (row) => row.retry_pending_jobs,
              },
              {
                key: "failed_jobs",
                header: language === "es" ? "Fallidos" : "Failed",
                render: (row) => row.failed_jobs,
              },
              {
                key: "max_attempts_seen",
                header: language === "es" ? "Máx. intentos" : "Max attempts",
                render: (row) => row.max_attempts_seen,
              },
            ]}
          />

          {metricsByJobType ? (
            <DataTableCard
              title={language === "es" ? "Métricas por tipo de job" : "Metrics by job type"}
              rows={filteredMetricsByJobTypeRows}
              columns={[
                {
                  key: "tenant_slug",
                  header: language === "es" ? "Tenant" : "Tenant",
                render: (row) => <code>{row.tenant_slug}</code>,
              },
                {
                  key: "job_type",
                  header: language === "es" ? "Tipo de job" : "Job type",
                  render: (row) => (
                    <ProvisioningCodeCell
                      label={formatProvisioningJobType(row.job_type)}
                    code={row.job_type}
                  />
                ),
              },
                {
                  key: "total_jobs",
                  header: language === "es" ? "Total" : "Total",
                  render: (row) => row.total_jobs,
                },
                {
                  key: "running_jobs",
                  header: language === "es" ? "En ejecución" : "Running",
                  render: (row) => row.running_jobs,
                },
                {
                  key: "failed_jobs",
                  header: language === "es" ? "Fallidos" : "Failed",
                  render: (row) => row.failed_jobs,
                },
              ]}
            />
          ) : null}

          {metricsByErrorCode ? (
            <DataTableCard
              title={language === "es" ? "Fallos por código" : "Failures by code"}
              subtitle={
                language === "es"
                  ? "Agrupa familias de error para no depender solo del texto libre del último intento."
                  : "Groups error families so you do not depend only on the free text of the latest attempt."
              }
              rows={filteredMetricsByErrorCodeRows}
              columns={[
                {
                  key: "tenant_slug",
                  header: language === "es" ? "Tenant" : "Tenant",
                  render: (row) => <code>{row.tenant_slug}</code>,
                },
                {
                  key: "error_code",
                  header: language === "es" ? "Código de error" : "Error code",
                  render: (row) => (
                    <ProvisioningCodeCell
                      label={formatProvisioningCodeLabel(row.error_code)}
                      code={row.error_code}
                    />
                  ),
                },
                {
                  key: "total_jobs",
                  header: language === "es" ? "Total" : "Total",
                  render: (row) => row.total_jobs,
                },
                {
                  key: "retry_pending_jobs",
                  header: language === "es" ? "Reintento" : "Retrying",
                  render: (row) => row.retry_pending_jobs,
                },
                {
                  key: "failed_jobs",
                  header: language === "es" ? "Fallidos" : "Failed",
                  render: (row) => row.failed_jobs,
                },
                {
                  key: "actions",
                  header: language === "es" ? "Acciones" : "Actions",
                  render: (row) => (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary"
                      onClick={() =>
                        handleDlqInvestigation(buildDlqInvestigationFromErrorMetric(row))
                      }
                    >
                      {language === "es" ? "Investigar en DLQ" : "Investigate in DLQ"}
                    </button>
                  ),
                },
              ]}
            />
          ) : null}
        </div>
      ) : null}

      {alertsError ? (
        <ErrorState
          title={
            language === "es"
              ? "Alertas de provisioning no disponibles"
              : "Provisioning alerts unavailable"
          }
          detail={alertsError.payload?.detail || alertsError.message}
          requestId={alertsError.payload?.request_id}
        />
      ) : null}

      {!alertsError && alerts ? (
        filteredAlertsRows.length > 0 ? (
          <DataTableCard
            title={language === "es" ? "Alertas activas" : "Active alerts"}
            rows={filteredAlertsRows}
            columns={[
              {
                key: "severity",
                header: language === "es" ? "Severidad" : "Severity",
                render: (row) => <SeverityBadge value={row.severity} />,
              },
              {
                key: "alert_code",
                header: language === "es" ? "Alerta" : "Alert",
                render: (row) => (
                  <ProvisioningCodeCell
                    label={formatProvisioningAlertCode(row.alert_code)}
                    code={row.alert_code}
                  />
                ),
              },
              {
                key: "tenant_slug",
                header: language === "es" ? "Tenant" : "Tenant",
                render: (row) => row.tenant_slug || "—",
              },
              {
                key: "worker_profile",
                header: language === "es" ? "Worker" : "Worker",
                render: (row) => row.worker_profile || "—",
              },
              {
                key: "message",
                header: language === "es" ? "Mensaje" : "Message",
                render: (row) => row.message,
              },
              {
                key: "captured_at",
                header: language === "es" ? "Capturada en" : "Captured at",
                render: (row) => formatDateTime(row.captured_at),
              },
              {
                key: "actions",
                header: language === "es" ? "Acciones" : "Actions",
                render: (row) => (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-primary"
                    onClick={() =>
                      handleDlqInvestigation(buildDlqInvestigationFromAlert(row))
                    }
                  >
                    {language === "es" ? "Investigar en DLQ" : "Investigate in DLQ"}
                  </button>
                ),
              },
            ]}
          />
        ) : (
          <PanelCard
            icon="pulse"
            title={language === "es" ? "Alertas activas" : "Active alerts"}
            subtitle={
              language === "es"
                ? "No se reportaron alertas activas de provisioning en la última lectura."
                : "No active provisioning alerts were reported in the latest read."
            }
          >
            <EmptyState
              title={
                language === "es"
                  ? "No hay alertas activas de provisioning"
                  : "There are no active provisioning alerts"
              }
              detail={
                language === "es"
                  ? "La operación está estable y no hay señales abiertas de backlog, fallos o degradación."
                  : "Operations are stable and there are no open signs of backlog, failures or degradation."
              }
            />
          </PanelCard>
        )
      ) : null}

      {!alertsError && alertHistory ? (
        alertHistory.data.length > 0 ? (
          <DataTableCard
            title={
              language === "es"
                ? "Historial de alertas operativas"
                : "Operational alert history"
            }
            subtitle={
              language === "es"
                ? "Lectura persistida para revisar si un problema fue puntual o ya viene repitiéndose entre ciclos."
                : "Persisted reading to review whether a problem was isolated or already repeating across cycles."
            }
            rows={alertHistory.data}
            columns={[
              {
                key: "recorded_at",
                header: language === "es" ? "Registrada en" : "Recorded at",
                render: (row) => formatDateTime(row.recorded_at),
              },
              {
                key: "severity",
                header: language === "es" ? "Severidad" : "Severity",
                render: (row) => <SeverityBadge value={row.severity} />,
              },
              {
                key: "alert_code",
                header: language === "es" ? "Alerta" : "Alert",
                render: (row) => (
                  <ProvisioningCodeCell
                    label={formatProvisioningAlertCode(row.alert_code)}
                    code={row.alert_code}
                  />
                ),
              },
              {
                key: "tenant_slug",
                header: language === "es" ? "Tenant" : "Tenant",
                render: (row) => row.tenant_slug || "—",
              },
              {
                key: "worker_profile",
                header: language === "es" ? "Worker" : "Worker",
                render: (row) => row.worker_profile || "—",
              },
              {
                key: "message",
                header: language === "es" ? "Mensaje" : "Message",
                render: (row) => row.message,
              },
              {
                key: "observed_value",
                header: language === "es" ? "Valor observado" : "Observed value",
                render: (row) => formatScalarValue(row.observed_value),
              },
              {
                key: "threshold_value",
                header: language === "es" ? "Umbral" : "Threshold",
                render: (row) =>
                  row.threshold_value === null ? "—" : formatScalarValue(row.threshold_value),
              },
              {
                key: "actions",
                header: language === "es" ? "Acciones" : "Actions",
                render: (row) => (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-primary"
                    onClick={() =>
                      handleDlqInvestigation(buildDlqInvestigationFromAlertHistory(row))
                    }
                  >
                    {language === "es" ? "Investigar en DLQ" : "Investigate in DLQ"}
                  </button>
                ),
              },
            ]}
          />
        ) : (
          <PanelCard
            icon="reports"
            title={
              language === "es"
                ? "Historial de alertas operativas"
                : "Operational alert history"
            }
            subtitle={
              language === "es"
                ? "No hay alertas persistidas para el set visible de filtros."
                : "There are no persisted alerts for the current visible filter set."
            }
          >
            <EmptyState
              title={
                language === "es"
                  ? "No hay historial reciente de alertas"
                  : "There is no recent alert history"
              }
              detail={
                language === "es"
                  ? "Esto es esperable cuando la operación estuvo estable o cuando el filtro por worker, severidad o código es demasiado específico."
                  : "This is expected when operations were stable or when the worker, severity or code filter is too specific."
              }
            />
          </PanelCard>
        )
      ) : null}

      <div id="provisioning-dlq-panel">
        <PanelCard
          icon="reports"
          title={language === "es" ? "Operación DLQ" : "DLQ operations"}
          subtitle={
            isBrokerDispatchActive
              ? language === "es"
                ? "Inspecciona filas dead-letter del broker y reencólalas individualmente o en lote."
                : "Inspect broker dead-letter rows and requeue them individually or in batches."
              : language === "es"
                ? "Este entorno no expone DLQ broker-only. La consola deja visible el estado y te deriva al entorno broker cuando corresponda."
                : "This environment does not expose broker-only DLQ. The console keeps the state visible and points you to a broker environment when needed."
          }
        >
          {isBrokerDispatchActive ? (
            <>
              {dlqFamilySummaries.length > 0 ? (
                <div
                  className="tenant-help-text"
                  style={{
                    display: "grid",
                    gap: "0.75rem",
                    marginBottom: "1rem",
                    padding: "1rem",
                    border: "1px solid var(--border-subtle, #d7deed)",
                    borderRadius: "0.875rem",
                    background: "var(--surface-muted, #f8fbff)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                    <strong>{language === "es" ? "Familias DLQ visibles" : "Visible DLQ families"}</strong>
                    <AppBadge tone="info">{dlqFamilySummaries.length}</AppBadge>
                  </div>
                  <p className="mb-0">
                    {language === "es"
                      ? "Agrupa el subconjunto broker visible por tenant, tipo de job y error para enfocar una familia homogénea antes de reencolar."
                      : "Groups the visible broker subset by tenant, job type and error so you can focus one homogeneous family before requeueing."}
                  </p>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                      gap: "0.75rem",
                    }}
                  >
                    {dlqFamilySummaries.slice(0, 6).map((family) => (
                      <div
                        key={family.key}
                        data-testid="provisioning-dlq-family-card"
                        style={{
                          display: "grid",
                          gap: "0.5rem",
                          padding: "0.875rem",
                          border: "1px solid var(--border-subtle, #d7deed)",
                          borderRadius: "0.75rem",
                          background: "#fff",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                          <AppBadge tone={family.totalRows > 1 ? "success" : "neutral"}>
                            {language === "es"
                              ? `${family.totalRows} fila${family.totalRows === 1 ? "" : "s"}`
                              : `${family.totalRows} row${family.totalRows === 1 ? "" : "s"}`}
                          </AppBadge>
                          <code>#{family.representativeJobId}</code>
                        </div>
                        <div>
                          <strong>{family.tenantSlug}</strong>
                        </div>
                        <div>{formatProvisioningJobType(family.jobType)}</div>
                        <div style={{ color: "var(--text-muted, #51607a)" }}>{family.errorLabel}</div>
                        <div style={{ color: "var(--text-muted, #51607a)", fontSize: "0.9rem" }}>
                          {language === "es" ? "Último registro" : "Latest record"}:{" "}
                          {formatDateTime(family.latestRecordedAt)}
                        </div>
                        <div>
                          <button
                            type="button"
                            data-testid="provisioning-dlq-family-focus"
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => handleDlqFamilyFocus(family)}
                            disabled={isActionSubmitting}
                          >
                            {language === "es" ? "Enfocar familia" : "Focus family"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  {dlqFamilySummaries.length > 6 ? (
                    <p className="mb-0" style={{ color: "var(--text-muted, #51607a)" }}>
                      {language === "es"
                        ? `Se muestran las 6 familias más relevantes. Ajusta filtros para aislar el resto (${dlqFamilySummaries.length - 6} adicionales).`
                        : `Showing the top 6 relevant families. Tighten filters to isolate the remaining ${dlqFamilySummaries.length - 6}.`}
                    </p>
                  ) : null}
                </div>
              ) : null}
              <div
                className="tenant-help-text"
                style={{
                  display: "grid",
                  gap: "0.75rem",
                  marginBottom: "1rem",
                  padding: "1rem",
                  border: "1px solid var(--border-subtle, #d7deed)",
                  borderRadius: "0.875rem",
                  background: "var(--surface-muted, #f8fbff)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                  <strong>{language === "es" ? "Requeue guiado" : "Guided requeue"}</strong>
                  <AppBadge tone={dlqGuidance.tone}>{dlqGuidance.title}</AppBadge>
                  {guidedDlqRow ? (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => setGuidedDlqJobId(null)}
                      disabled={isActionSubmitting}
                    >
                      {language === "es" ? "Quitar foco" : "Clear focus"}
                    </button>
                  ) : null}
                </div>
                <p className="mb-0">{dlqGuidance.detail}</p>
                <ul className="mb-0 ps-3">
                  {dlqGuidance.bullets.map((detail) => (
                    <li key={detail}>{detail}</li>
                  ))}
                </ul>
                <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                  {dlqGuidance.primaryAction === "single" && guidedDlqRow ? (
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => handleSingleRequeue(guidedDlqRow.job_id)}
                      disabled={isActionSubmitting}
                    >
                      {language === "es" ? "Reencolar job sugerido" : "Requeue suggested job"}
                    </button>
                  ) : null}
                  {dlqGuidance.primaryAction === "batch" ? (
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={openDlqBatchRequeueConfirmation}
                      disabled={isActionSubmitting}
                    >
                      {language === "es" ? "Reencolar lote sugerido" : "Requeue suggested batch"}
                    </button>
                  ) : null}
                  {dlqGuidance.secondaryAction === "batch" ? (
                    <button
                      type="button"
                      className="btn btn-outline-primary"
                      onClick={openDlqBatchRequeueConfirmation}
                      disabled={isActionSubmitting}
                    >
                      {language === "es" ? "Reencolar lote visible" : "Requeue visible batch"}
                    </button>
                  ) : null}
                </div>
              </div>
              <div className="provisioning-dlq-grid">
                <AppForm className="tenant-action-form" onSubmit={handleDlqFilterSubmit}>
                  <h3 className="tenant-action-form__title">
                    {language === "es" ? "Filtros DLQ" : "DLQ filters"}
                  </h3>
                  <AppFormField>
                      <FieldHelpLabel
                        label={language === "es" ? "Límite" : "Limit"}
                        help={
                          language === "es"
                            ? "Máximo de filas DLQ que quieres inspeccionar en la consulta actual."
                            : "Maximum number of DLQ rows you want to inspect in the current query."
                        }
                      />
                      <input
                        className="form-control"
                        type="number"
                        min="1"
                        value={dlqLimit}
                        onChange={(event) => setDlqLimit(event.target.value)}
                      />
                  </AppFormField>
                  <AppFormField>
                      <FieldHelpLabel
                        label={language === "es" ? "Tipo de job" : "Job type"}
                        help={
                          language === "es"
                            ? "Filtra por operación interna de provisioning, por ejemplo crear base tenant, sincronizar esquema o retirar infraestructura técnica."
                            : "Filter by internal provisioning operation, for example create tenant DB, sync schema or retire technical infrastructure."
                        }
                      />
                      <input
                        className="form-control"
                        list="provisioning-job-type-options"
                        value={dlqJobType}
                        onChange={(event) => setDlqJobType(event.target.value)}
                      />
                      <datalist id="provisioning-job-type-options">
                        {jobTypeOptions.map((value) => (
                          <option key={value} value={value} />
                        ))}
                      </datalist>
                  </AppFormField>
                  <AppFormField>
                      <FieldHelpLabel
                        label={language === "es" ? "Slug tenant" : "Tenant slug"}
                        help={
                          language === "es"
                            ? "Código técnico del tenant sobre el que quieres revisar filas DLQ."
                            : "Technical code of the tenant whose DLQ rows you want to review."
                        }
                      />
                      <input
                        className="form-control"
                        value={dlqTenantSlug}
                        onChange={(event) => setDlqTenantSlug(event.target.value)}
                      />
                  </AppFormField>
                  <AppFormField>
                      <FieldHelpLabel
                        label={language === "es" ? "Código de error" : "Error code"}
                        help={
                          language === "es"
                            ? "Usa el código interno cuando quieras acotar una familia específica de fallos."
                            : "Use the internal code when you want to narrow a specific failure family."
                        }
                      />
                      <input
                        className="form-control"
                        value={dlqErrorCode}
                        onChange={(event) => setDlqErrorCode(event.target.value)}
                      />
                  </AppFormField>
                  <AppFormField fullWidth>
                    <FieldHelpLabel
                      label={language === "es" ? "Error contiene" : "Error contains"}
                      help={
                        language === "es"
                          ? "Busca un texto dentro del mensaje de error para aislar casos similares."
                          : "Search for text inside the error message to isolate similar cases."
                      }
                    />
                    <input
                      className="form-control"
                      value={dlqErrorContains}
                      onChange={(event) => setDlqErrorContains(event.target.value)}
                    />
                  </AppFormField>
                  <AppFormActions>
                    <button
                      type="submit"
                      className="btn btn-outline-primary"
                      disabled={isLoading || isActionSubmitting}
                    >
                      {language === "es" ? "Aplicar filtros" : "Apply filters"}
                    </button>
                  </AppFormActions>
                </AppForm>

                <AppForm className="tenant-action-form" onSubmit={handleDlqBatchRequeue}>
                  <h3 className="tenant-action-form__title">
                    {language === "es" ? "Reencolado en lote" : "Batch requeue"}
                  </h3>
                  <AppFormField>
                      <FieldHelpLabel
                        label={language === "es" ? "Límite" : "Limit"}
                        help={
                          language === "es"
                            ? "Cantidad máxima de filas filtradas que se van a devolver a la cola."
                            : "Maximum amount of filtered rows that will be returned to the queue."
                        }
                        placement="left"
                      />
                      <input
                        className="form-control"
                        type="number"
                        min="1"
                        value={dlqLimit}
                        onChange={(event) => setDlqLimit(event.target.value)}
                      />
                  </AppFormField>
                  <AppFormField>
                      <FieldHelpLabel
                        label={language === "es" ? "Segundos de demora" : "Delay seconds"}
                        help={
                          language === "es"
                            ? "Espera opcional antes de volver a entregar el job al worker."
                            : "Optional wait before handing the job back to the worker."
                        }
                        placement="left"
                      />
                      <input
                        className="form-control"
                        type="number"
                        min="0"
                        value={dlqDelaySeconds}
                        onChange={(event) => setDlqDelaySeconds(event.target.value)}
                      />
                  </AppFormField>
                  <div className="app-form-field app-form-field--full">
                    <div className="form-check mt-0">
                      <input
                        id="dlq-reset-attempts"
                        className="form-check-input"
                        type="checkbox"
                        checked={dlqResetAttempts}
                        onChange={(event) => setDlqResetAttempts(event.target.checked)}
                      />
                      <label className="form-check-label" htmlFor="dlq-reset-attempts">
                        {language === "es" ? "Reiniciar intentos al reencolar" : "Reset attempts when requeuing"}
                      </label>
                    </div>
                  </div>
                  <div className="app-form-field app-form-field--full">
                    <p className="tenant-help-text mt-0 mb-0">
                      {language === "es"
                        ? "La acción en lote reutiliza el set actual de filtros, así que puedes reprocesar una porción focalizada del DLQ en vez de toda la cola."
                        : "The batch action reuses the current filter set, so you can reprocess a focused slice of the DLQ instead of the whole queue."}
                    </p>
                  </div>
                  <AppFormActions>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={isActionSubmitting}
                    >
                      {language === "es" ? "Reencolar filas DLQ filtradas" : "Requeue filtered DLQ rows"}
                    </button>
                  </AppFormActions>
                </AppForm>
              </div>
            </>
          ) : (
            <div
              className="tenant-help-text"
              style={{
                display: "grid",
                gap: "0.75rem",
                padding: "1rem",
                border: "1px solid var(--border-subtle, #d7deed)",
                borderRadius: "0.875rem",
                background: "var(--surface-muted, #f8fbff)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                <strong>
                  {language === "es"
                    ? "Superficie broker-only no activa"
                    : "Broker-only surface is not active"}
                </strong>
                <AppBadge tone="warning">{currentDispatchBackend || "n/a"}</AppBadge>
              </div>
              <p className="mb-0">
                {language === "es"
                  ? "Este host sigue siendo útil para leer jobs, métricas, alertas y contexto por tenant, pero el panel DLQ broker-only no se opera aquí."
                  : "This host is still useful to read jobs, metrics, alerts and tenant context, but the broker-only DLQ panel is not operated here."}
              </p>
              <ul className="mb-0 ps-3">
                <li>
                  {language === "es"
                    ? "Backend activo: la cola visible se procesa por base de datos, no por broker."
                    : "Active backend: visible backlog is processed through the database, not through the broker."}
                </li>
                <li>
                  {language === "es"
                    ? "Usa este entorno para análisis y correlación con métricas/alertas."
                    : "Use this environment for analysis and correlation with metrics/alerts."}
                </li>
                <li>
                  {language === "es"
                    ? "Valida filas DLQ, requeue individual, batch y requeue guiado en staging u otro entorno con backend broker."
                    : "Validate DLQ rows, individual requeue, batch and guided requeue in staging or another broker-backed environment."}
                </li>
              </ul>
            </div>
          )}
        </PanelCard>
      </div>

      {dlqError ? (
        <ErrorState
          title={language === "es" ? "DLQ de provisioning no disponible" : "Provisioning DLQ unavailable"}
          detail={dlqError.payload?.detail || dlqError.message}
          requestId={dlqError.payload?.request_id}
        />
      ) : null}

      {!dlqError && dlq && isBrokerDispatchActive ? (
        filteredDlqRows.length > 0 ? (
          <DataTableCard
            title={language === "es" ? "Filas DLQ" : "DLQ rows"}
            rows={filteredDlqRows}
            columns={[
              {
                key: "job_id",
                header: language === "es" ? "Job" : "Job",
                render: (row) => <code>#{row.job_id}</code>,
              },
              {
                key: "job_type",
                header: language === "es" ? "Tipo de job" : "Job type",
                render: (row) => (
                  <ProvisioningCodeCell
                    label={formatProvisioningJobType(row.job_type)}
                    code={row.job_type}
                  />
                ),
              },
              {
                key: "status",
                header: language === "es" ? "Estado" : "Status",
                render: (row) => <StatusBadge value={row.status} />,
              },
              {
                key: "attempts",
                header: language === "es" ? "Intentos" : "Attempts",
                render: (row) => `${row.attempts}/${row.max_attempts}`,
              },
              {
                key: "error_code",
                header: language === "es" ? "Código de error" : "Error code",
                render: (row) =>
                  row.error_code ? (
                    <ProvisioningCodeCell
                      label={formatProvisioningCodeLabel(row.error_code)}
                      code={row.error_code}
                    />
                  ) : (
                    "—"
                  ),
              },
              {
                key: "error_message",
                header: language === "es" ? "Mensaje de error" : "Error message",
                render: (row) => row.error_message || "—",
              },
              {
                key: "recorded_at",
                header: language === "es" ? "Registrado en" : "Recorded at",
                render: (row) => formatDateTime(row.recorded_at),
              },
              {
                key: "actions",
                header: language === "es" ? "Acciones" : "Actions",
                render: (row) => (
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => handleGuidedDlqFocus(row)}
                      disabled={isActionSubmitting}
                    >
                      {language === "es" ? "Guiar requeue" : "Guide requeue"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary"
                      onClick={() => handleSingleRequeue(row.job_id)}
                      disabled={isActionSubmitting}
                    >
                      {language === "es" ? "Reencolar" : "Requeue"}
                    </button>
                  </div>
                ),
              },
            ]}
          />
        ) : (
          <PanelCard
            icon="reports"
            title={language === "es" ? "Filas DLQ" : "DLQ rows"}
            subtitle={
              language === "es"
                ? "Ninguna fila dead-letter del broker coincide con el set actual de filtros."
                : "No broker dead-letter rows match the current filter set."
            }
          >
            <EmptyState
              title={
                language === "es"
                  ? "No hay filas DLQ para este filtro"
                  : "There are no DLQ rows for this filter"
              }
              detail={
                language === "es"
                  ? "Esto es esperable cuando el broker está estable o cuando el filtro actual es muy específico."
                  : "This is expected when the broker is stable or when the current filter is very specific."
              }
            />
          </PanelCard>
        )
      ) : null}

      {!metricsError && cycleHistory ? (
        cycleHistory.data.length > 0 ? (
          <DataTableCard
            title={language === "es" ? "Ciclos recientes del worker" : "Recent worker cycles"}
            subtitle={
              language === "es"
                ? "Resumen corto de las últimas corridas para distinguir si el problema es de backlog o de ejecución."
                : "Short summary of recent runs to distinguish whether the issue is backlog or execution."
            }
            rows={cycleHistory.data}
            columns={[
              {
                key: "captured_at",
                header: language === "es" ? "Capturado en" : "Captured at",
                render: (row) => formatDateTime(row.captured_at),
              },
              {
                key: "worker_profile",
                header: language === "es" ? "Worker" : "Worker",
                render: (row) => row.worker_profile || "default",
              },
              {
                key: "eligible_jobs",
                header: language === "es" ? "Elegibles" : "Eligible",
                render: (row) => row.eligible_jobs,
              },
              {
                key: "processed_count",
                header: language === "es" ? "Procesados" : "Processed",
                render: (row) => row.processed_count,
              },
              {
                key: "failed_count",
                header: language === "es" ? "Fallidos" : "Failed",
                render: (row) => row.failed_count,
              },
              {
                key: "duration_ms",
                header: language === "es" ? "Duración" : "Duration",
                render: (row) => `${row.duration_ms} ms`,
              },
            ]}
          />
        ) : (
          <PanelCard
            icon="activity"
            title={language === "es" ? "Ciclos recientes del worker" : "Recent worker cycles"}
            subtitle={
              language === "es"
                ? "Todavía no hay trazas persistidas de ciclos en este entorno."
                : "There are no persisted cycle traces in this environment yet."
            }
          >
            <EmptyState
              title={
                language === "es"
                  ? "No hay historial reciente del worker"
                  : "There is no recent worker history"
              }
              detail={
                language === "es"
                  ? "Esto suele pasar cuando todavía no se ejecutó el worker con persistencia de trazas o el entorno es nuevo."
                  : "This usually happens when the worker has not run yet with trace persistence or the environment is new."
              }
            />
          </PanelCard>
        )
      ) : null}
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

function ProvisioningCodeCell({
  label,
  code,
}: {
  label: string;
  code: string;
}) {
  return (
    <div>
      <div>{label}</div>
      <code>{code}</code>
    </div>
  );
}

function ProvisioningOperationBadge({ jobType }: { jobType: string }) {
  const kind = getProvisioningOperationKind(jobType);
  const toneByKind: Record<string, "success" | "warning" | "info" | "neutral"> = {
    provision: "success",
    deprovision: "warning",
    schema: "info",
    other: "neutral",
  };
  return (
    <AppBadge tone={toneByKind[kind]}>
      {formatProvisioningOperationKind(kind)}
    </AppBadge>
  );
}

function ProvisioningOperationSummaryItem({
  label,
  count,
  kind,
}: {
  label: string;
  count: number;
  kind: "provision" | "deprovision" | "schema" | "other";
}) {
  return (
    <div className="provisioning-operation-summary__item">
      <ProvisioningOperationBadge jobType={kindToRepresentativeJobType(kind)} />
      <strong>{count}</strong>
      <span>{label}</span>
    </div>
  );
}

function SeverityBadge({ value }: { value: string }) {
  const normalized = value.trim().toLowerCase();
  const tone =
    normalized === "critical" || normalized === "error"
      ? "danger"
      : normalized === "warning"
        ? "warning"
        : "info";
  return <AppBadge tone={tone}>{normalized}</AppBadge>;
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
    repair_tenant_schema:
      language === "es" ? "Reparar esquema tenant" : "Repair tenant schema",
  };

  return knownLabels[value] || formatProvisioningCodeLabel(value);
}

function getProvisioningOperationKind(
  jobType: string
): "provision" | "deprovision" | "schema" | "other" {
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

function formatProvisioningOperationKind(
  kind: "provision" | "deprovision" | "schema" | "other"
): string {
  const language = getCurrentLanguage();
  const labels: Record<string, string> = {
    provision: language === "es" ? "alta" : "create",
    deprovision: language === "es" ? "retiro técnico" : "technical retirement",
    schema: language === "es" ? "esquema" : "schema",
    other: language === "es" ? "otro" : "other",
  };
  return labels[kind] || kind;
}

function formatProvisioningOperationFilterLabel(value: string): string {
  if (value === "all") {
    return getCurrentLanguage() === "es" ? "todas las operaciones" : "all operations";
  }
  return formatProvisioningOperationKind(
    value as "provision" | "deprovision" | "schema" | "other"
  );
}

function normalizeProvisioningOperationFilter(value: string | null): string {
  if (
    value === "provision" ||
    value === "deprovision" ||
    value === "schema" ||
    value === "other"
  ) {
    return value;
  }
  return "all";
}

function kindToRepresentativeJobType(
  kind: "provision" | "deprovision" | "schema" | "other"
): string {
  if (kind === "provision") {
    return "create_tenant_database";
  }
  if (kind === "deprovision") {
    return "deprovision_tenant_database";
  }
  if (kind === "schema") {
    return "sync_tenant_schema";
  }
  return "other";
}

function formatProvisioningAlertCode(value: string): string {
  const language = getCurrentLanguage();
  const knownLabels: Record<string, string> = {
    tenant_failed_jobs_threshold_exceeded:
      language === "es"
        ? "Tenant con jobs fallidos sobre el umbral"
        : "Tenant with failed jobs over threshold",
    worker_cycle_duration_threshold_exceeded:
      language === "es"
        ? "Worker con ciclo sobre el umbral"
        : "Worker with cycle over threshold",
    billing_provider_event_volume_threshold_exceeded:
      language === "es"
        ? "Volumen de eventos billing sobre el umbral"
        : "Billing event volume over threshold",
    billing_duplicate_events_threshold_exceeded:
      language === "es"
        ? "Eventos billing duplicados sobre el umbral"
        : "Duplicate billing events over threshold",
  };

  return knownLabels[value] || formatProvisioningCodeLabel(value);
}

function buildDlqInvestigationFromErrorMetric(
  row: ProvisioningJobTenantErrorCodeSummary
): {
  sourceLabel: string;
  tenantSlug: string;
  errorCode: string;
} {
  return {
    sourceLabel: `${row.tenant_slug} / ${formatProvisioningCodeLabel(row.error_code)}`,
    tenantSlug: row.tenant_slug,
    errorCode: row.error_code,
  };
}

function buildDlqInvestigationFromAlert(
  row: ProvisioningOperationalAlert
): {
  sourceLabel: string;
  tenantSlug?: string | null;
  errorCode?: string | null;
  errorContains?: string | null;
} {
  return {
    sourceLabel: formatProvisioningAlertCode(row.alert_code),
    tenantSlug: row.tenant_slug,
    errorCode: row.error_code,
    errorContains: row.error_code ? null : row.message,
  };
}

function buildDlqInvestigationFromAlertHistory(row: {
  alert_code: string;
  tenant_slug?: string | null;
  error_code?: string | null;
  message: string;
}): {
  sourceLabel: string;
  tenantSlug?: string | null;
  errorCode?: string | null;
  errorContains?: string | null;
} {
  return {
    sourceLabel: formatProvisioningAlertCode(row.alert_code),
    tenantSlug: row.tenant_slug,
    errorCode: row.error_code,
    errorContains: row.error_code ? null : row.message,
  };
}

function formatProvisioningCodeLabel(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function normalizeNullableString(value: string): string | null {
  const normalized = value.trim();
  return normalized ? normalized : null;
}

function parsePositiveInteger(value: string, fallback: number): number {
  const parsed = Number.parseInt(value.trim(), 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function parseNonNegativeInteger(value: string, fallback: number): number {
  const parsed = Number.parseInt(value.trim(), 10);
  if (Number.isNaN(parsed) || parsed < 0) {
    return fallback;
  }
  return parsed;
}

function formatDateTime(value: string | null): string {
  const language = getCurrentLanguage();
  if (!value) {
    return "—";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString(getCurrentLocale(language));
}

function formatScalarValue(value: string | number | boolean): string {
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  return String(value);
}

function buildDlqOptions(filters: {
  limit: string;
  jobType: string;
  tenantSlug: string;
  errorCode: string;
  errorContains: string;
}) {
  return {
    limit: parsePositiveInteger(filters.limit, 25),
    jobType: normalizeNullableString(filters.jobType),
    tenantSlug: normalizeNullableString(filters.tenantSlug),
    errorCode: normalizeNullableString(filters.errorCode),
    errorContains: normalizeNullableString(filters.errorContains),
  };
}

function buildProvisioningWorkspaceExportPayload({
  operationFilter,
  tenantSlugFilter,
  dlqLimit,
  dlqJobType,
  dlqTenantSlug,
  dlqErrorCode,
  dlqErrorContains,
  dlqResetAttempts,
  dlqDelaySeconds,
  jobs,
  metricsByTenantRows,
  metricsByJobTypeRows,
  metricsByErrorCodeRows,
  cycleHistory,
  alertsRows,
  dlqRows,
  dlqFamilySummaries,
}: {
  operationFilter: string;
  tenantSlugFilter: string;
  dlqLimit: string;
  dlqJobType: string;
  dlqTenantSlug: string;
  dlqErrorCode: string;
  dlqErrorContains: string;
  dlqResetAttempts: boolean;
  dlqDelaySeconds: string;
  jobs: ProvisioningJob[];
  metricsByTenantRows: ProvisioningJobMetricsResponse["data"];
  metricsByJobTypeRows: ProvisioningJobDetailedMetricsResponse["data"];
  metricsByErrorCodeRows: ProvisioningJobErrorCodeMetricsResponse["data"];
  cycleHistory: ProvisioningWorkerCycleTraceHistoryResponse | null;
  alertsRows: ProvisioningOperationalAlertsResponse["data"];
  dlqRows: ProvisioningBrokerDeadLetterResponse["data"];
  dlqFamilySummaries: DlqFamilySummary[];
}) {
  return {
    exported_at: new Date().toISOString(),
    filters: {
      operation: operationFilter,
      tenant_slug: normalizeNullableString(tenantSlugFilter),
      dlq_limit: parsePositiveInteger(dlqLimit, 25),
      dlq_job_type: normalizeNullableString(dlqJobType),
      dlq_tenant_slug: normalizeNullableString(dlqTenantSlug),
      dlq_error_code: normalizeNullableString(dlqErrorCode),
      dlq_error_contains: normalizeNullableString(dlqErrorContains),
      dlq_reset_attempts: dlqResetAttempts,
      dlq_delay_seconds: parseNonNegativeInteger(dlqDelaySeconds, 0),
    },
    jobs,
    metrics_by_tenant: metricsByTenantRows,
    metrics_by_job_type: metricsByJobTypeRows,
    metrics_by_error_code: metricsByErrorCodeRows,
    cycle_history: cycleHistory?.data || [],
    alerts: alertsRows,
    dlq_rows: dlqRows,
    dlq_family_summaries: dlqFamilySummaries,
  };
}

function buildDlqErrorContainsFingerprint(value: string): string | null {
  const normalized = normalizeNullableString(value.replace(/\s+/g, " "));
  if (!normalized) {
    return null;
  }
  return normalized.slice(0, 120);
}

function buildComparableTimestamp(value: string | null): number {
  if (!value) {
    return 0;
  }
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function buildProvisioningJobsCsv(
  rows: ProvisioningJob[],
  tenantSlugById: Map<number, string>,
  language: "es" | "en"
): string {
  const csvRows = [
    [
      "job_id",
      "tenant_slug",
      "operation_kind",
      "job_type",
      "status",
      "attempts",
      "max_attempts",
      "error_code",
      "next_retry_at",
    ],
    ...rows.map((row) => [
      String(row.id),
      tenantSlugById.get(row.tenant_id) || `tenant-${row.tenant_id}`,
      formatProvisioningOperationKind(getProvisioningOperationKind(row.job_type)),
      formatProvisioningJobType(row.job_type),
      formatProvisioningCodeLabel(row.status),
      String(row.attempts),
      String(row.max_attempts),
      row.error_code ? formatProvisioningCodeLabel(row.error_code) : "",
      formatDateTime(row.next_retry_at),
    ]),
  ];

  return csvRows
    .map((row) => row.map((value) => escapeCsvValue(value)).join(","))
    .join("\n");
}

function escapeCsvValue(value: string): string {
  const normalized = value.split('"').join('""');
  return /[",\n]/.test(normalized) ? `"${normalized}"` : normalized;
}

function downloadTextFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
