import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { ConfirmDialog } from "../../../../components/common/ConfirmDialog";
import { MetricCard } from "../../../../components/common/MetricCard";
import { PageHeader } from "../../../../components/common/PageHeader";
import { PanelCard } from "../../../../components/common/PanelCard";
import { StatusBadge } from "../../../../components/common/StatusBadge";
import { DataTableCard } from "../../../../components/data-display/DataTableCard";
import { EmptyState } from "../../../../components/feedback/EmptyState";
import { ErrorState } from "../../../../components/feedback/ErrorState";
import { LoadingBlock } from "../../../../components/feedback/LoadingBlock";
import { getApiErrorDisplayMessage } from "../../../../services/api";
import {
  getPlatformActionFeedbackLabel,
  getPlatformActionSuccessMessage,
} from "../../../../utils/action-feedback";
import {
  getProvisioningCycleHistory,
  getProvisioningAlerts,
  getProvisioningBrokerDlq,
  getProvisioningMetricsByErrorCode,
  getProvisioningMetrics,
  getProvisioningMetricsByJobType,
  listProvisioningJobs,
  requeueProvisioningBrokerDlq,
  requeueProvisioningJob,
  runProvisioningJob,
} from "../../../../services/platform-api";
import { useAuth } from "../../../../store/auth-context";
import type {
  ApiError,
  ProvisioningBrokerDeadLetterResponse,
  ProvisioningJobErrorCodeMetricsResponse,
  ProvisioningJob,
  ProvisioningJobDetailedMetricsResponse,
  ProvisioningJobMetricsResponse,
  ProvisioningOperationalAlertsResponse,
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

export function ProvisioningPage() {
  const showDevelopmentBootstrapHelp = import.meta.env.DEV;
  const { session } = useAuth();
  const [jobs, setJobs] = useState<ProvisioningJob[]>([]);
  const [metrics, setMetrics] = useState<ProvisioningJobMetricsResponse | null>(null);
  const [metricsByJobType, setMetricsByJobType] =
    useState<ProvisioningJobDetailedMetricsResponse | null>(null);
  const [metricsByErrorCode, setMetricsByErrorCode] =
    useState<ProvisioningJobErrorCodeMetricsResponse | null>(null);
  const [cycleHistory, setCycleHistory] =
    useState<ProvisioningWorkerCycleTraceHistoryResponse | null>(null);
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
  const [pendingConfirmation, setPendingConfirmation] =
    useState<PendingConfirmation | null>(null);

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

  const jobsRequiringAction = useMemo(() => {
    return jobs.filter(
      (job) =>
        job.status === "failed" ||
        job.status === "retry_pending" ||
        job.status === "pending"
    );
  }, [jobs]);

  const jobTypeOptions = useMemo(() => {
    const keys = new Set<string>();
    jobs.forEach((job) => keys.add(job.job_type));
    metricsByJobType?.data.forEach((row) => keys.add(row.job_type));
    dlq?.data.forEach((row) => keys.add(row.job_type));
    return Array.from(keys).sort();
  }, [dlq?.data, jobs, metricsByJobType?.data]);

  const tenantSlugById = useMemo(() => {
    const entries = new Map<number, string>();
    metrics?.data.forEach((row) => entries.set(row.tenant_id, row.tenant_slug));
    metricsByJobType?.data.forEach((row) => {
      if (!entries.has(row.tenant_id)) {
        entries.set(row.tenant_id, row.tenant_slug);
      }
    });
    return entries;
  }, [metrics?.data, metricsByJobType?.data]);

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
      getProvisioningMetricsByErrorCode(session.accessToken),
      getProvisioningCycleHistory(session.accessToken, { limit: 10 }),
      getProvisioningAlerts(session.accessToken),
      getProvisioningBrokerDlq(session.accessToken, dlqOptions),
    ]);

    const [
      jobsResult,
      metricsResult,
      jobTypeResult,
      errorCodeResult,
      cycleHistoryResult,
      alertsResult,
      dlqResult,
    ] = results;

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
        message: getPlatformActionSuccessMessage(
          scope,
          message || "La acción de provisioning se completó correctamente."
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

    setPendingConfirmation({
      scope: "requeue-dlq-batch",
      title: "Reencolar filas DLQ filtradas",
      description:
        "Esta acción vuelve a poner en cola el subconjunto actual del DLQ usando los filtros visibles en pantalla.",
      details: [
        `Filas candidatas: ${dlq?.total_jobs || 0}`,
        `Tipo de job: ${normalizeNullableString(dlqJobType) || "todos"}`,
        `Tenant: ${normalizeNullableString(dlqTenantSlug) || "todos"}`,
        `Resetear intentos: ${dlqResetAttempts ? "sí" : "no"}`,
        `Demora antes de reencolar: ${parseNonNegativeInteger(dlqDelaySeconds, 0)} s`,
      ],
      confirmLabel: "Reencolar lote",
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

  function handleSingleRequeue(jobId: number) {
    if (!session?.accessToken) {
      return;
    }

    setPendingConfirmation({
      scope: "requeue-provisioning-job",
      title: `Reencolar job #${jobId}`,
      description:
        "Esta acción devuelve el job a cola para que vuelva a entrar al ciclo normal del worker.",
      details: [
        `Job: #${jobId}`,
        `Resetear intentos: ${dlqResetAttempts ? "sí" : "no"}`,
        `Demora antes de reencolar: ${parseNonNegativeInteger(dlqDelaySeconds, 0)} s`,
      ],
      confirmLabel: "Reencolar job",
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
      title: `Ejecutar ahora el job #${job.id}`,
      description:
        "Esta acción intenta procesar inmediatamente el job seleccionado, sin esperar al siguiente ciclo del worker.",
      details: [
        `Tenant: ${tenantSlugById.get(job.tenant_id) || `tenant-${job.tenant_id}`}`,
        `Operación: ${formatProvisioningJobType(job.job_type)}`,
        `Estado actual: ${formatProvisioningCodeLabel(job.status)}`,
        `Intentos usados: ${job.attempts}/${job.max_attempts}`,
      ],
      confirmLabel: "Ejecutar ahora",
      action: () => runProvisioningJob(session.accessToken, job.id),
    });
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
            Recargar datos
          </button>
        }
      />

        <ConfirmDialog
        isOpen={Boolean(pendingConfirmation)}
        title={pendingConfirmation?.title || ""}
        description={pendingConfirmation?.description || ""}
        details={pendingConfirmation?.details || []}
        confirmLabel={pendingConfirmation?.confirmLabel || "Confirmar"}
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

      {actionFeedback ? (
        <div
          className={`tenant-action-feedback tenant-action-feedback--${actionFeedback.type}`}
        >
          <strong>{getPlatformActionFeedbackLabel(actionFeedback.scope)}:</strong>{" "}
          {actionFeedback.message}
        </div>
      ) : null}

      {isLoading ? <LoadingBlock label="Cargando operación de provisioning..." /> : null}

      <PanelCard
        title="Qué hace provisioning"
        subtitle="Referencia corta para no confundir el alta en catálogo con la preparación técnica real del tenant."
      >
        <div className="dashboard-quick-hints mt-0">
          <div>`Crear tenant` da de alta la entidad en `platform_control` y dispara el job inicial.</div>
          <div>`Provisionar` prepara la DB tenant, el usuario técnico, el esquema y el admin bootstrap.</div>
          <div>`Pending` espera worker, `retry_pending` volverá a intentarse, `failed` requiere intervención y `completed` deja el tenant listo.</div>
        </div>
      </PanelCard>

      <div className="provisioning-overview-grid">
        <MetricCard label="Jobs en catálogo" value={overview.totalJobs} />
        <MetricCard label="Jobs en ejecución" value={overview.runningJobs} />
        <MetricCard label="Jobs fallidos" value={overview.failedJobs} />
        <MetricCard label="Alertas activas" value={overview.activeAlerts} />
        <MetricCard label="Filas DLQ" value={overview.dlqJobs} />
      </div>

      <PanelCard
        title="Jobs que requieren acción"
        subtitle="Vista corta para decidir rápido si debes ejecutar, esperar retry o reencolar."
      >
        {jobsRequiringAction.length === 0 ? (
          <EmptyState
            title="No hay jobs que requieran intervención"
            detail="No existen jobs pendientes, en retry o fallidos. El worker quedó sin deuda operativa inmediata."
          />
        ) : (
          <div className="table-responsive">
            <table className="table align-middle">
              <thead>
                <tr>
                  <th>Job</th>
                  <th>Tenant</th>
                  <th>Estado</th>
                  <th>Acción recomendada</th>
                  <th>Siguiente paso</th>
                </tr>
              </thead>
              <tbody>
                {jobsRequiringAction.map((job) => (
                  <tr key={`action-${job.id}`}>
                    <td><code>#{job.id}</code></td>
                    <td><code>{tenantSlugById.get(job.tenant_id) || `tenant-${job.tenant_id}`}</code></td>
                    <td><StatusBadge value={job.status} /></td>
                    <td>{getProvisioningActionRecommendation(job.status)}</td>
                    <td>
                      {job.status === "failed" ? (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => handleSingleRequeue(job.id)}
                          disabled={isActionSubmitting}
                        >
                          Reencolar
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => handleRunNow(job)}
                          disabled={isActionSubmitting}
                        >
                          Ejecutar ahora
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PanelCard>

      {showDevelopmentBootstrapHelp ? (
        <PanelCard
          title="Credenciales bootstrap de desarrollo"
          subtitle="Ayuda visible solo en entorno local para validar rápido el acceso al portal tenant después del provisioning."
        >
          <div className="text-secondary">
            Usuario bootstrap tenant:
            {" "}
            <code>admin@{"<tenant_slug>"}.local</code>
          </div>
          <div className="text-secondary">
            Contraseña bootstrap tenant:
            {" "}
            <code>TenantAdmin123!</code>
          </div>
          <div className="tenant-inline-note">
            Usa esta referencia solo para pruebas de desarrollo. No representa una política válida de producción.
          </div>
        </PanelCard>
      ) : null}

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
              render: (row) => (
                <code>{tenantSlugById.get(row.tenant_id) || `tenant-${row.tenant_id}`}</code>
              ),
            },
            {
              key: "job_type",
              header: "Tipo de job",
              render: (row) => (
                <ProvisioningCodeCell
                  label={formatProvisioningJobType(row.job_type)}
                  code={row.job_type}
                />
              ),
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
                  ) : row.status === "pending" || row.status === "retry_pending" ? (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary"
                      onClick={() => handleRunNow(row)}
                      disabled={isActionSubmitting}
                    >
                      Ejecutar ahora
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
          <EmptyState
            title="Todavía no hay jobs de provisioning"
            detail="Esto suele pasar cuando aún no se crean tenants nuevos o cuando no hubo automatizaciones pendientes en este entorno."
          />
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
                render: (row) => (
                  <ProvisioningCodeCell
                    label={formatProvisioningJobType(row.job_type)}
                    code={row.job_type}
                  />
                ),
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

          {metricsByErrorCode ? (
            <DataTableCard
              title="Fallos por código"
              subtitle="Agrupa familias de error para no depender solo del texto libre del último intento."
              rows={metricsByErrorCode.data}
              columns={[
                {
                  key: "tenant_slug",
                  header: "Tenant",
                  render: (row) => <code>{row.tenant_slug}</code>,
                },
                {
                  key: "error_code",
                  header: "Código de error",
                  render: (row) => (
                    <ProvisioningCodeCell
                      label={formatProvisioningCodeLabel(row.error_code)}
                      code={row.error_code}
                    />
                  ),
                },
                {
                  key: "total_jobs",
                  header: "Total",
                  render: (row) => row.total_jobs,
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
                render: (row) => (
                  <ProvisioningCodeCell
                    label={formatProvisioningAlertCode(row.alert_code)}
                    code={row.alert_code}
                  />
                ),
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
            <EmptyState
              title="No hay alertas activas de provisioning"
              detail="La operación está estable y no hay señales abiertas de backlog, fallos o degradación."
            />
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
                <FieldHelpLabel
                  label="Límite"
                  help="Máximo de filas DLQ que quieres inspeccionar en la consulta actual."
                />
                <input
                  className="form-control"
                  type="number"
                  min="1"
                  value={dlqLimit}
                  onChange={(event) => setDlqLimit(event.target.value)}
                />
              </div>
              <div>
                <FieldHelpLabel
                  label="Tipo de job"
                  help="Filtra por operación interna de provisioning, por ejemplo crear base tenant o sincronizar esquema."
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
              </div>
              <div>
                <FieldHelpLabel
                  label="Slug tenant"
                  help="Código técnico del tenant sobre el que quieres revisar filas DLQ."
                />
                <input
                  className="form-control"
                  value={dlqTenantSlug}
                  onChange={(event) => setDlqTenantSlug(event.target.value)}
                />
              </div>
              <div>
                <FieldHelpLabel
                  label="Código de error"
                  help="Usa el código interno cuando quieras acotar una familia específica de fallos."
                />
                <input
                  className="form-control"
                  value={dlqErrorCode}
                  onChange={(event) => setDlqErrorCode(event.target.value)}
                />
              </div>
            </div>
            <FieldHelpLabel
              label="Error contiene"
              help="Busca un texto dentro del mensaje de error para aislar casos similares."
            />
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
                <FieldHelpLabel
                  label="Límite"
                  help="Cantidad máxima de filas filtradas que se van a devolver a la cola."
                  placement="left"
                />
                <input
                  className="form-control"
                  type="number"
                  min="1"
                  value={dlqLimit}
                  onChange={(event) => setDlqLimit(event.target.value)}
                />
              </div>
              <div>
                <FieldHelpLabel
                  label="Segundos de demora"
                  help="Espera opcional antes de volver a entregar el job al worker."
                  placement="left"
                />
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
                render: (row) => (
                  <ProvisioningCodeCell
                    label={formatProvisioningJobType(row.job_type)}
                    code={row.job_type}
                  />
                ),
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
            <EmptyState
              title="No hay filas DLQ para este filtro"
              detail="Esto es esperable cuando el broker está estable o cuando el filtro actual es muy específico."
            />
          </PanelCard>
        )
      ) : null}

      {!metricsError && cycleHistory ? (
        cycleHistory.data.length > 0 ? (
          <DataTableCard
            title="Ciclos recientes del worker"
            subtitle="Resumen corto de las últimas corridas para distinguir si el problema es de backlog o de ejecución."
            rows={cycleHistory.data}
            columns={[
              {
                key: "captured_at",
                header: "Capturado en",
                render: (row) => formatDateTime(row.captured_at),
              },
              {
                key: "worker_profile",
                header: "Worker",
                render: (row) => row.worker_profile || "default",
              },
              {
                key: "eligible_jobs",
                header: "Elegibles",
                render: (row) => row.eligible_jobs,
              },
              {
                key: "processed_count",
                header: "Procesados",
                render: (row) => row.processed_count,
              },
              {
                key: "failed_count",
                header: "Fallidos",
                render: (row) => row.failed_count,
              },
              {
                key: "duration_ms",
                header: "Duración",
                render: (row) => `${row.duration_ms} ms`,
              },
            ]}
          />
        ) : (
          <PanelCard
            title="Ciclos recientes del worker"
            subtitle="Todavía no hay trazas persistidas de ciclos en este entorno."
          >
            <EmptyState
              title="No hay historial reciente del worker"
              detail="Esto suele pasar cuando todavía no se ejecutó el worker con persistencia de trazas o el entorno es nuevo."
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
      <button className="inline-help__trigger" type="button" aria-label={`Ayuda sobre ${label}`}>
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

function formatProvisioningJobType(value: string): string {
  const knownLabels: Record<string, string> = {
    create_tenant_database: "Crear base del tenant",
    sync_tenant_schema: "Sincronizar esquema tenant",
    repair_tenant_schema: "Reparar esquema tenant",
  };

  return knownLabels[value] || formatProvisioningCodeLabel(value);
}

function formatProvisioningAlertCode(value: string): string {
  const knownLabels: Record<string, string> = {
    tenant_failed_jobs_threshold_exceeded: "Tenant con jobs fallidos sobre el umbral",
    worker_cycle_duration_threshold_exceeded: "Worker con ciclo sobre el umbral",
    billing_provider_event_volume_threshold_exceeded:
      "Volumen de eventos billing sobre el umbral",
    billing_duplicate_events_threshold_exceeded:
      "Eventos billing duplicados sobre el umbral",
  };

  return knownLabels[value] || formatProvisioningCodeLabel(value);
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
