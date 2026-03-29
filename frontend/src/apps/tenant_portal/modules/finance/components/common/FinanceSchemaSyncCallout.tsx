import { useEffect, useRef, useState } from "react";
import { getApiErrorDisplayMessage } from "../../../../../../services/api";
import {
  getTenantSchemaStatus,
  syncTenantSchema,
} from "../../../../../../services/tenant-api";
import { useLanguage } from "../../../../../../store/language-context";
import { useTenantAuth } from "../../../../../../store/tenant-auth-context";
import type { ApiError, TenantSchemaJobData } from "../../../../../../types";

type FinanceSchemaSyncCalloutProps = {
  error: ApiError | null;
  onSynced: () => Promise<void> | void;
};

type ActionFeedback = {
  type: "success" | "error";
  message: string;
};

export function FinanceSchemaSyncCallout({
  error,
  onSynced,
}: FinanceSchemaSyncCalloutProps) {
  const { language } = useLanguage();
  const { session } = useTenantAuth();
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [statusSummary, setStatusSummary] = useState<{
    currentVersion: string | null;
    latestAvailableVersion: string | null;
    pendingCount: number;
    lastAppliedAt: string | null;
    latestJob: TenantSchemaJobData | null;
  } | null>(null);
  const [actionFeedback, setActionFeedback] = useState<ActionFeedback | null>(null);
  const handledCompletedJobIdRef = useRef<number | null>(null);
  const handledFailedJobKeyRef = useRef<string | null>(null);
  const isPollingStatusRef = useRef(false);

  const schemaIncomplete = isFinanceSchemaIncompleteError(error);
  const accessToken = session?.accessToken || null;
  const canSyncFromTenant = session?.role === "admin" && !!accessToken;
  const liveSchemaJob = statusSummary?.latestJob || null;
  const hasLiveSchemaJob = isLiveSchemaJob(liveSchemaJob);

  useEffect(() => {
    if (!schemaIncomplete || !canSyncFromTenant) {
      setStatusSummary(null);
      return;
    }

    let cancelled = false;

    async function loadSchemaStatus() {
      setIsLoadingStatus(true);
      try {
        if (!accessToken) {
          return;
        }
        const response = await getTenantSchemaStatus(accessToken);
        if (cancelled) {
          return;
        }
        setStatusSummary({
          currentVersion: response.current_version,
          latestAvailableVersion: response.latest_available_version,
          pendingCount: response.pending_count,
          lastAppliedAt: response.last_applied_at,
          latestJob: response.latest_job,
        });
      } catch {
        if (!cancelled) {
          setStatusSummary(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingStatus(false);
        }
      }
    }

    void loadSchemaStatus();
    return () => {
      cancelled = true;
    };
  }, [accessToken, canSyncFromTenant, schemaIncomplete]);

  useEffect(() => {
    if (
      !schemaIncomplete ||
      !canSyncFromTenant ||
      !accessToken ||
      !hasLiveSchemaJob
    ) {
      return;
    }

    let cancelled = false;
    const intervalId = window.setInterval(async () => {
      if (isPollingStatusRef.current) {
        return;
      }

      try {
        isPollingStatusRef.current = true;
        const response = await getTenantSchemaStatus(accessToken);
        if (cancelled) {
          return;
        }
        setStatusSummary({
          currentVersion: response.current_version,
          latestAvailableVersion: response.latest_available_version,
          pendingCount: response.pending_count,
          lastAppliedAt: response.last_applied_at,
          latestJob: response.latest_job,
        });
      } catch {
        if (!cancelled) {
          setStatusSummary((current) => current);
        }
      } finally {
        isPollingStatusRef.current = false;
      }
    }, 15000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      isPollingStatusRef.current = false;
    };
  }, [accessToken, canSyncFromTenant, hasLiveSchemaJob, schemaIncomplete]);

  useEffect(() => {
    if (!liveSchemaJob) {
      return;
    }

    if (
      liveSchemaJob.status === "completed" &&
      handledCompletedJobIdRef.current !== liveSchemaJob.job_id
    ) {
      handledCompletedJobIdRef.current = liveSchemaJob.job_id;
      setActionFeedback({
        type: "success",
        message:
          language === "es"
            ? "La sincronización terminó correctamente. Se recargará la vista."
            : "Schema sync completed successfully. The view will reload.",
      });
      void Promise.resolve(onSynced()).catch(() => undefined);
      return;
    }

    const failedJobKey = `${liveSchemaJob.job_id}:${liveSchemaJob.attempts}`;
    if (
      liveSchemaJob.status === "failed" &&
      handledFailedJobKeyRef.current !== failedJobKey
    ) {
      handledFailedJobKeyRef.current = failedJobKey;
      setActionFeedback({
        type: "error",
        message:
          liveSchemaJob.error_message ||
          (language === "es"
            ? "La sincronización del esquema falló y requiere revisión."
            : "Schema sync failed and requires review."),
      });
    }
  }, [language, liveSchemaJob, onSynced]);

  if (!schemaIncomplete) {
    return null;
  }

  async function handleSync() {
    if (!accessToken) {
      return;
    }

    setIsSyncing(true);
    setActionFeedback(null);

    try {
      const response = await syncTenantSchema(accessToken);
      setStatusSummary({
        currentVersion: response.current_version,
        latestAvailableVersion: response.latest_available_version,
        pendingCount: response.pending_count,
        lastAppliedAt: response.last_applied_at,
        latestJob: response.queued_job,
      });
      setActionFeedback({
        type: "success",
        message:
          language === "es"
            ? "La sincronización quedó en cola. Esta tarjeta seguirá monitoreando el job."
            : "Schema sync was queued. This card will keep monitoring the job.",
      });
    } catch (rawError) {
      setActionFeedback({
        type: "error",
        message: getApiErrorDisplayMessage(rawError as ApiError),
      });
    } finally {
      setIsSyncing(false);
    }
  }

  return (
    <div className="rounded-3 border border-warning-subtle bg-warning-subtle p-4 d-grid gap-3">
      <div>
        <h3 className="h6 mb-2 text-warning-emphasis">
          {language === "es" ? "Actualizar estructura del módulo" : "Update module schema"}
        </h3>
        <p className="mb-2 text-warning-emphasis">
          {language === "es"
            ? "Esta acción aplica las migraciones pendientes del tenant para crear o ajustar tablas, columnas e índices que necesita la versión actual del módulo."
            : "This action applies pending tenant migrations to create or adjust the tables, columns, and indexes required by the current module version."}
        </p>
        <p className="mb-0 text-warning-emphasis">
          {language === "es"
            ? "Úsala después de una actualización cuando una vista nueva todavía no puede leer datos porque la base del tenant quedó en una versión anterior."
            : "Use it after an update when a new view still cannot read data because the tenant database is on an older schema version."}
        </p>
      </div>

      {isLoadingStatus ? (
        <p className="mb-0 small text-warning-emphasis">
          {language === "es" ? "Revisando estado de estructura..." : "Checking schema status..."}
        </p>
      ) : statusSummary ? (
        <div className="small text-warning-emphasis">
          <div>
            {language === "es" ? "Versión actual:" : "Current version:"}{" "}
            <strong>{statusSummary.currentVersion || (language === "es" ? "sin registro" : "not recorded")}</strong>
          </div>
          <div>
            {language === "es" ? "Última versión disponible:" : "Latest available version:"}{" "}
            <strong>{statusSummary.latestAvailableVersion || (language === "es" ? "sin registro" : "not recorded")}</strong>
          </div>
          <div>
            {language === "es" ? "Cambios pendientes:" : "Pending changes:"}{" "}
            <strong>{statusSummary.pendingCount}</strong>
          </div>
          <div>
            {language === "es" ? "Última sincronización:" : "Last sync:"}{" "}
            <strong>{statusSummary.lastAppliedAt ? formatDateTime(statusSummary.lastAppliedAt, language) : "n/a"}</strong>
          </div>
          {statusSummary.latestJob ? (
            <>
              <div>
                {language === "es" ? "Job actual:" : "Current job:"}{" "}
                <strong>#{statusSummary.latestJob.job_id}</strong>
              </div>
              <div>
                {language === "es" ? "Estado job:" : "Job status:"}{" "}
                <strong>{formatJobStatus(statusSummary.latestJob.status, language)}</strong>
              </div>
              <div>
                {language === "es" ? "Intentos:" : "Attempts:"}{" "}
                <strong>
                  {statusSummary.latestJob.attempts}/{statusSummary.latestJob.max_attempts}
                </strong>
              </div>
              {statusSummary.latestJob.next_retry_at ? (
                <div>
                  {language === "es" ? "Próximo reintento:" : "Next retry:"}{" "}
                  <strong>{formatDateTime(statusSummary.latestJob.next_retry_at, language)}</strong>
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}

      {actionFeedback ? (
        <div className={`tenant-action-feedback tenant-action-feedback--${actionFeedback.type}`}>
          <strong>{language === "es" ? "Estructura tenant:" : "Tenant schema:"}</strong> {actionFeedback.message}
        </div>
      ) : null}

      {canSyncFromTenant ? (
        <div className="d-flex flex-wrap gap-2 align-items-center">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => void handleSync()}
            disabled={isSyncing || hasLiveSchemaJob}
          >
            {isSyncing || hasLiveSchemaJob
              ? language === "es"
                ? "Sincronización en curso..."
                : "Schema sync in progress..."
              : language === "es"
                ? "Actualizar estructura del módulo"
                : "Update module schema"}
          </button>
          <span className="small text-warning-emphasis">
            {hasLiveSchemaJob
              ? language === "es"
                ? "Ya existe un job activo de sincronización para este tenant."
                : "There is already an active schema sync job for this tenant."
              : language === "es"
                ? "Disponible solo para admin del tenant."
                : "Available only for the tenant admin."}
          </span>
        </div>
      ) : (
        <p className="mb-0 small text-warning-emphasis">
          {language === "es"
            ? "Pide a un admin del tenant que ejecute esta acción desde el portal o usa Platform Admin como respaldo operativo."
            : "Ask a tenant admin to run this action from the portal or use Platform Admin as an operational fallback."}
        </p>
      )}
    </div>
  );
}

function isLiveSchemaJob(job: TenantSchemaJobData | null) {
  return (
    job?.status === "pending" ||
    job?.status === "retry_pending" ||
    job?.status === "running"
  );
}

function isFinanceSchemaIncompleteError(error: ApiError | null) {
  const detail = error?.payload?.detail?.toLowerCase() || error?.message?.toLowerCase() || "";
  return (
    detail.includes("esquema finance del tenant está incompleto") ||
    detail.includes("sincroniza el esquema tenant")
  );
}

function formatDateTime(value: string, language: "es" | "en") {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat(language === "es" ? "es-CL" : "en-US", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(parsed);
}

function formatJobStatus(status: string, language: "es" | "en") {
  switch (status) {
    case "pending":
      return language === "es" ? "pendiente" : "pending";
    case "retry_pending":
      return language === "es" ? "reintento pendiente" : "retry pending";
    case "running":
      return language === "es" ? "ejecutando" : "running";
    case "completed":
      return language === "es" ? "completado" : "completed";
    case "failed":
      return language === "es" ? "fallido" : "failed";
    default:
      return status;
  }
}
