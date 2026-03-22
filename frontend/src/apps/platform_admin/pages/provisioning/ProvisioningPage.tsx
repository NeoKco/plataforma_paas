import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { MetricCard } from "../../../../components/common/MetricCard";
import { PageHeader } from "../../../../components/common/PageHeader";
import { PanelCard } from "../../../../components/common/PanelCard";
import { StatusBadge } from "../../../../components/common/StatusBadge";
import { DataTableCard } from "../../../../components/data-display/DataTableCard";
import { ErrorState } from "../../../../components/feedback/ErrorState";
import { LoadingBlock } from "../../../../components/feedback/LoadingBlock";
import {
  getProvisioningAlerts,
  getProvisioningBrokerDlq,
  getProvisioningMetrics,
  getProvisioningMetricsByJobType,
  listProvisioningJobs,
  requeueProvisioningBrokerDlq,
  requeueProvisioningJob,
} from "../../../../services/platform-api";
import { useAuth } from "../../../../store/auth-context";
import type {
  ApiError,
  ProvisioningBrokerDeadLetterResponse,
  ProvisioningJob,
  ProvisioningJobDetailedMetricsResponse,
  ProvisioningJobMetricsResponse,
  ProvisioningOperationalAlertsResponse,
} from "../../../../types";

type ActionFeedback = {
  scope: string;
  type: "success" | "error";
  message: string;
};

export function ProvisioningPage() {
  const { session } = useAuth();
  const [jobs, setJobs] = useState<ProvisioningJob[]>([]);
  const [metrics, setMetrics] = useState<ProvisioningJobMetricsResponse | null>(null);
  const [metricsByJobType, setMetricsByJobType] =
    useState<ProvisioningJobDetailedMetricsResponse | null>(null);
  const [alerts, setAlerts] = useState<ProvisioningOperationalAlertsResponse | null>(
    null
  );
  const [dlq, setDlq] = useState<ProvisioningBrokerDeadLetterResponse | null>(null);
  const [jobsError, setJobsError] = useState<ApiError | null>(null);
  const [metricsError, setMetricsError] = useState<ApiError | null>(null);
  const [alertsError, setAlertsError] = useState<ApiError | null>(null);
  const [dlqError, setDlqError] = useState<ApiError | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionSubmitting, setIsActionSubmitting] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<ActionFeedback | null>(null);

  const [dlqLimit, setDlqLimit] = useState("25");
  const [dlqJobType, setDlqJobType] = useState("");
  const [dlqTenantSlug, setDlqTenantSlug] = useState("");
  const [dlqErrorCode, setDlqErrorCode] = useState("");
  const [dlqErrorContains, setDlqErrorContains] = useState("");
  const [dlqResetAttempts, setDlqResetAttempts] = useState(true);
  const [dlqDelaySeconds, setDlqDelaySeconds] = useState("0");

  const overview = useMemo(() => {
    const totalJobs = jobs.length;
    const failedJobs = jobs.filter((job) => job.status === "failed").length;
    const runningJobs = jobs.filter((job) => job.status === "running").length;
    const activeAlerts = alerts?.total_alerts || 0;
    const dlqJobs = dlq?.total_jobs || 0;

    return {
      totalJobs,
      failedJobs,
      runningJobs,
      activeAlerts,
      dlqJobs,
    };
  }, [alerts?.total_alerts, dlq?.total_jobs, jobs]);

  const jobTypeOptions = useMemo(() => {
    const keys = new Set<string>();
    jobs.forEach((job) => keys.add(job.job_type));
    metricsByJobType?.data.forEach((row) => keys.add(row.job_type));
    dlq?.data.forEach((row) => keys.add(row.job_type));
    return Array.from(keys).sort();
  }, [dlq?.data, jobs, metricsByJobType?.data]);

  async function loadProvisioningWorkspace() {
    if (!session?.accessToken) {
      return;
    }

    setIsLoading(true);

    const dlqOptions = buildDlqOptions({
      limit: dlqLimit,
      jobType: dlqJobType,
      tenantSlug: dlqTenantSlug,
      errorCode: dlqErrorCode,
      errorContains: dlqErrorContains,
    });

    const results = await Promise.allSettled([
      listProvisioningJobs(session.accessToken),
      getProvisioningMetrics(session.accessToken),
      getProvisioningMetricsByJobType(session.accessToken),
      getProvisioningAlerts(session.accessToken),
      getProvisioningBrokerDlq(session.accessToken, dlqOptions),
    ]);

    const [jobsResult, metricsResult, jobTypeResult, alertsResult, dlqResult] = results;

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

    if (alertsResult.status === "fulfilled") {
      setAlerts(alertsResult.value);
      setAlertsError(null);
    } else {
      setAlerts(null);
      setAlertsError(alertsResult.reason as ApiError);
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
        message: message || "La acción de provisioning se completó correctamente.",
      });
    } catch (rawError) {
      const typedError = rawError as ApiError;
      setActionFeedback({
        scope,
        type: "error",
        message: typedError.payload?.detail || typedError.message,
      });
    } finally {
      setIsActionSubmitting(false);
    }
  }

  function handleRefresh() {
    void loadProvisioningWorkspace();
  }

  function handleDlqFilterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void loadProvisioningWorkspace();
  }

  function handleDlqBatchRequeue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.accessToken) {
      return;
    }

    void runAction("dlq-batch-requeue", () =>
      requeueProvisioningBrokerDlq(session.accessToken, {
        limit: parsePositiveInteger(dlqLimit, 25),
        job_type: normalizeNullableString(dlqJobType),
        tenant_slug: normalizeNullableString(dlqTenantSlug),
        error_code: normalizeNullableString(dlqErrorCode),
        error_contains: normalizeNullableString(dlqErrorContains),
        reset_attempts: dlqResetAttempts,
        delay_seconds: parseNonNegativeInteger(dlqDelaySeconds, 0),
      })
    );
  }

  function handleSingleRequeue(jobId: number) {
    if (!session?.accessToken) {
      return;
    }

    void runAction(`requeue-${jobId}`, () =>
      requeueProvisioningJob(session.accessToken, jobId, {
        resetAttempts: dlqResetAttempts,
        delaySeconds: parseNonNegativeInteger(dlqDelaySeconds, 0),
      })
    );
  }

  return (
    <div className="d-grid gap-4">
      <PageHeader
        eyebrow="Plataforma"
        title="Provisioning"
        description="Vista operativa sobre jobs, backlog por tenant, alertas activas y recuperación por DLQ usando los contratos backend ya cerrados."
        actions={
          <button
            type="button"
            className="btn btn-outline-primary"
            onClick={handleRefresh}
            disabled={isLoading || isActionSubmitting}
          >
            Actualizar
          </button>
        }
      />

      {actionFeedback ? (
        <div
          className={`tenant-action-feedback tenant-action-feedback--${actionFeedback.type}`}
        >
          <strong>{actionFeedback.scope}:</strong> {actionFeedback.message}
        </div>
      ) : null}

      {isLoading ? <LoadingBlock label="Cargando operación de provisioning..." /> : null}

      <div className="provisioning-overview-grid">
        <MetricCard label="Jobs en catálogo" value={overview.totalJobs} />
        <MetricCard label="Jobs en ejecución" value={overview.runningJobs} />
        <MetricCard label="Jobs fallidos" value={overview.failedJobs} />
        <MetricCard label="Alertas activas" value={overview.activeAlerts} />
        <MetricCard label="Filas DLQ" value={overview.dlqJobs} />
      </div>

      {jobsError ? (
        <ErrorState
          title="Jobs de provisioning no disponibles"
          detail={jobsError.payload?.detail || jobsError.message}
          requestId={jobsError.payload?.request_id}
        />
      ) : null}

      {!jobsError && jobs.length > 0 ? (
        <DataTableCard
          title="Jobs de provisioning"
          rows={jobs}
          columns={[
            {
              key: "id",
              header: "Job",
              render: (row) => <code>#{row.id}</code>,
            },
            {
              key: "tenant_id",
              header: "Tenant",
              render: (row) => row.tenant_id,
            },
            {
              key: "job_type",
              header: "Tipo de job",
              render: (row) => <code>{row.job_type}</code>,
            },
            {
              key: "status",
              header: "Estado",
              render: (row) => <StatusBadge value={row.status} />,
            },
            {
              key: "attempts",
              header: "Intentos",
              render: (row) => `${row.attempts}/${row.max_attempts}`,
            },
            {
              key: "error_code",
              header: "Código de error",
              render: (row) => row.error_code || "—",
            },
            {
              key: "next_retry_at",
              header: "Próximo reintento",
              render: (row) => formatDateTime(row.next_retry_at),
            },
            {
              key: "actions",
              header: "Acciones",
              render: (row) =>
                row.status === "failed" ? (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-primary"
                    onClick={() => handleSingleRequeue(row.id)}
                    disabled={isActionSubmitting}
                  >
                    Reencolar
                  </button>
                ) : (
                  "—"
                ),
            },
          ]}
        />
      ) : !jobsError && !isLoading ? (
        <PanelCard
          title="Jobs de provisioning"
          subtitle="El backend no devolvió jobs en el catálogo actual."
        >
          <div className="text-secondary">
            Aún no se registran jobs de provisioning.
          </div>
        </PanelCard>
      ) : null}

      {metricsError ? (
        <ErrorState
          title="Métricas de provisioning no disponibles"
          detail={metricsError.payload?.detail || metricsError.message}
          requestId={metricsError.payload?.request_id}
        />
      ) : null}

      {!metricsError && metrics ? (
        <div className="provisioning-data-grid">
          <DataTableCard
            title="Métricas por tenant"
            rows={metrics.data}
            columns={[
              {
                key: "tenant_slug",
                header: "Tenant",
                render: (row) => <code>{row.tenant_slug}</code>,
              },
              {
                key: "total_jobs",
                header: "Total",
                render: (row) => row.total_jobs,
              },
              {
                key: "pending_jobs",
                header: "Pendientes",
                render: (row) => row.pending_jobs,
              },
              {
                key: "retry_pending_jobs",
                header: "Reintento",
                render: (row) => row.retry_pending_jobs,
              },
              {
                key: "failed_jobs",
                header: "Fallidos",
                render: (row) => row.failed_jobs,
              },
              {
                key: "max_attempts_seen",
                header: "Máx. intentos",
                render: (row) => row.max_attempts_seen,
              },
            ]}
          />

          {metricsByJobType ? (
            <DataTableCard
              title="Métricas por tipo de job"
              rows={metricsByJobType.data}
              columns={[
                {
                  key: "tenant_slug",
                  header: "Tenant",
                  render: (row) => <code>{row.tenant_slug}</code>,
                },
                {
                  key: "job_type",
                  header: "Tipo de job",
                  render: (row) => <code>{row.job_type}</code>,
                },
                {
                  key: "total_jobs",
                  header: "Total",
                  render: (row) => row.total_jobs,
                },
                {
                  key: "running_jobs",
                  header: "En ejecución",
                  render: (row) => row.running_jobs,
                },
                {
                  key: "failed_jobs",
                  header: "Fallidos",
                  render: (row) => row.failed_jobs,
                },
              ]}
            />
          ) : null}
        </div>
      ) : null}

      {alertsError ? (
        <ErrorState
          title="Alertas de provisioning no disponibles"
          detail={alertsError.payload?.detail || alertsError.message}
          requestId={alertsError.payload?.request_id}
        />
      ) : null}

      {!alertsError && alerts ? (
        alerts.data.length > 0 ? (
          <DataTableCard
            title="Alertas activas"
            rows={alerts.data}
            columns={[
              {
                key: "severity",
                header: "Severidad",
                render: (row) => <SeverityBadge value={row.severity} />,
              },
              {
                key: "alert_code",
                header: "Alerta",
                render: (row) => <code>{row.alert_code}</code>,
              },
              {
                key: "tenant_slug",
                header: "Tenant",
                render: (row) => row.tenant_slug || "—",
              },
              {
                key: "worker_profile",
                  header: "Worker",
                render: (row) => row.worker_profile || "—",
              },
              {
                key: "message",
                header: "Mensaje",
                render: (row) => row.message,
              },
              {
                key: "captured_at",
                header: "Capturada en",
                render: (row) => formatDateTime(row.captured_at),
              },
            ]}
          />
        ) : (
          <PanelCard
            title="Alertas activas"
            subtitle="No se reportaron alertas activas de provisioning en la última lectura."
          >
            <div className="text-secondary">
              Provisioning está tranquilo desde la perspectiva de alertamiento backend.
            </div>
          </PanelCard>
        )
      ) : null}

      <PanelCard
        title="Operación DLQ"
        subtitle="Inspecciona filas dead-letter del broker y reencólalas individualmente o en lote."
      >
        <div className="provisioning-dlq-grid">
          <form className="tenant-action-form" onSubmit={handleDlqFilterSubmit}>
            <h3 className="tenant-action-form__title">Filtros DLQ</h3>
            <div className="tenant-inline-form-grid">
              <div>
                <label className="form-label">Límite</label>
                <input
                  className="form-control"
                  type="number"
                  min="1"
                  value={dlqLimit}
                  onChange={(event) => setDlqLimit(event.target.value)}
                />
              </div>
              <div>
                <label className="form-label">Tipo de job</label>
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
              </div>
              <div>
                <label className="form-label">Slug tenant</label>
                <input
                  className="form-control"
                  value={dlqTenantSlug}
                  onChange={(event) => setDlqTenantSlug(event.target.value)}
                />
              </div>
              <div>
                <label className="form-label">Código de error</label>
                <input
                  className="form-control"
                  value={dlqErrorCode}
                  onChange={(event) => setDlqErrorCode(event.target.value)}
                />
              </div>
            </div>
            <label className="form-label mt-3">Error contiene</label>
            <input
              className="form-control"
              value={dlqErrorContains}
              onChange={(event) => setDlqErrorContains(event.target.value)}
            />
            <button
              type="submit"
              className="btn btn-outline-primary mt-3"
              disabled={isLoading || isActionSubmitting}
            >
              Aplicar filtros
            </button>
          </form>

          <form className="tenant-action-form" onSubmit={handleDlqBatchRequeue}>
            <h3 className="tenant-action-form__title">Reencolado en lote</h3>
            <div className="tenant-inline-form-grid">
              <div>
                <label className="form-label">Límite</label>
                <input
                  className="form-control"
                  type="number"
                  min="1"
                  value={dlqLimit}
                  onChange={(event) => setDlqLimit(event.target.value)}
                />
              </div>
              <div>
                <label className="form-label">Segundos de demora</label>
                <input
                  className="form-control"
                  type="number"
                  min="0"
                  value={dlqDelaySeconds}
                  onChange={(event) => setDlqDelaySeconds(event.target.value)}
                />
              </div>
            </div>
            <div className="form-check mt-3">
              <input
                id="dlq-reset-attempts"
                className="form-check-input"
                type="checkbox"
                checked={dlqResetAttempts}
                onChange={(event) => setDlqResetAttempts(event.target.checked)}
              />
              <label className="form-check-label" htmlFor="dlq-reset-attempts">
                Reiniciar intentos al reencolar
              </label>
            </div>
            <p className="tenant-help-text mt-3">
              La acción en lote reutiliza el set actual de filtros, así que puedes reprocesar
              una porción focalizada del DLQ en vez de toda la cola.
            </p>
            <button
              type="submit"
              className="btn btn-primary mt-3"
              disabled={isActionSubmitting}
            >
              Reencolar filas DLQ filtradas
            </button>
          </form>
        </div>
      </PanelCard>

      {dlqError ? (
        <ErrorState
          title="DLQ de provisioning no disponible"
          detail={dlqError.payload?.detail || dlqError.message}
          requestId={dlqError.payload?.request_id}
        />
      ) : null}

      {!dlqError && dlq ? (
        dlq.data.length > 0 ? (
          <DataTableCard
            title="Filas DLQ"
            rows={dlq.data}
            columns={[
              {
                key: "job_id",
                header: "Job",
                render: (row) => <code>#{row.job_id}</code>,
              },
              {
                key: "job_type",
                header: "Tipo de job",
                render: (row) => <code>{row.job_type}</code>,
              },
              {
                key: "status",
                header: "Estado",
                render: (row) => <StatusBadge value={row.status} />,
              },
              {
                key: "attempts",
                header: "Intentos",
                render: (row) => `${row.attempts}/${row.max_attempts}`,
              },
              {
                key: "error_code",
                header: "Código de error",
                render: (row) => row.error_code || "—",
              },
              {
                key: "error_message",
                header: "Mensaje de error",
                render: (row) => row.error_message || "—",
              },
              {
                key: "recorded_at",
                header: "Registrado en",
                render: (row) => formatDateTime(row.recorded_at),
              },
              {
                key: "actions",
                header: "Acciones",
                render: (row) => (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-primary"
                    onClick={() => handleSingleRequeue(row.job_id)}
                    disabled={isActionSubmitting}
                  >
                    Reencolar
                  </button>
                ),
              },
            ]}
          />
        ) : (
          <PanelCard
            title="Filas DLQ"
            subtitle="Ninguna fila dead-letter del broker coincide con el set actual de filtros."
          >
            <div className="text-secondary">
              Esto es esperable cuando el broker está tranquilo o cuando los filtros
              actuales son muy estrechos.
            </div>
          </PanelCard>
        )
      ) : null}
    </div>
  );
}

function SeverityBadge({ value }: { value: string }) {
  const normalized = value.trim().toLowerCase();
  const className =
    normalized === "critical" || normalized === "error"
      ? "status-badge status-badge--danger"
      : normalized === "warning"
        ? "status-badge status-badge--warning"
        : "status-badge status-badge--info";
  return <span className={className}>{normalized}</span>;
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
  if (!value) {
    return "—";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString();
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
