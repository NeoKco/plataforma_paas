import { useEffect, useState } from "react";
import { getApiErrorDisplayMessage } from "../../../../../../services/api";
import {
  getTenantSchemaStatus,
  syncTenantSchema,
} from "../../../../../../services/tenant-api";
import { useLanguage } from "../../../../../../store/language-context";
import { useTenantAuth } from "../../../../../../store/tenant-auth-context";
import type { ApiError } from "../../../../../../types";

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
  } | null>(null);
  const [actionFeedback, setActionFeedback] = useState<ActionFeedback | null>(null);

  const schemaIncomplete = isFinanceSchemaIncompleteError(error);
  const accessToken = session?.accessToken || null;
  const canSyncFromTenant = session?.role === "admin" && !!accessToken;

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
      });
      setActionFeedback({
        type: "success",
        message:
          response.applied_now.length > 0
            ? language === "es"
              ? `Se aplicaron ${response.applied_now.length} cambios de estructura y la vista se recargará.`
              : `${response.applied_now.length} schema changes were applied and the view will reload.`
            : language === "es"
              ? "La estructura ya quedó al día y la vista se recargará."
              : "The schema is already up to date and the view will reload.",
      });
      await onSynced();
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
        <h3 className="h6 mb-2 text-warning-emphasis">Actualizar estructura del módulo</h3>
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
            disabled={isSyncing}
          >
            {isSyncing
              ? language === "es"
                ? "Actualizando estructura..."
                : "Updating schema..."
              : language === "es"
                ? "Actualizar estructura del módulo"
                : "Update module schema"}
          </button>
          <span className="small text-warning-emphasis">
            {language === "es" ? "Disponible solo para admin del tenant." : "Available only for the tenant admin."}
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
