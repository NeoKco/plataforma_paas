import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "../../../../../components/common/PageHeader";
import { DataTableCard } from "../../../../../components/data-display/DataTableCard";
import { ErrorState } from "../../../../../components/feedback/ErrorState";
import { LoadingBlock } from "../../../../../components/feedback/LoadingBlock";
import { AppToolbar } from "../../../../../design-system/AppLayout";
import { getApiErrorDisplayMessage } from "../../../../../services/api";
import { useLanguage } from "../../../../../store/language-context";
import { useTenantAuth } from "../../../../../store/tenant-auth-context";
import type { ApiError } from "../../../../../types";
import { TaskOpsModuleNav } from "../components/common/TaskOpsModuleNav";
import { TaskOpsTaskModal } from "../components/common/TaskOpsTaskModal";
import { getTaskOpsHistory, type TaskOpsTask } from "../services/taskopsService";
import { getTenantPermissionSet, hasTenantPermission } from "../../../utils/tenant-permissions";

function formatDateTime(value: string | null, language: "es" | "en") {
  if (!value) return "—";
  return new Intl.DateTimeFormat(language === "es" ? "es-CL" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getStatusLabel(status: string, language: "es" | "en") {
  const labels: Record<string, string> =
    language === "es"
      ? { done: "Cerrada", cancelled: "Cancelada" }
      : { done: "Closed", cancelled: "Cancelled" };
  return labels[status] || status;
}

export function TaskOpsHistoryPage() {
  const { session, tenantUser } = useTenantAuth();
  const { language } = useLanguage();
  const [rows, setRows] = useState<TaskOpsTask[]>([]);
  const [query, setQuery] = useState("");
  const [modalTaskId, setModalTaskId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  const permissionSet = useMemo(() => getTenantPermissionSet(tenantUser), [tenantUser]);
  const canAssignOthers =
    permissionSet.has("tenant.taskops.assign_others") ||
    permissionSet.has("tenant.taskops.manage");
  const canReadUsers = hasTenantPermission(tenantUser, "tenant.users.read");
  const canReadBusinessCore = hasTenantPermission(tenantUser, "tenant.business_core.read");
  const canReadCRM = hasTenantPermission(tenantUser, "tenant.crm.read");
  const canReadMaintenance = hasTenantPermission(tenantUser, "tenant.maintenance.read");

  async function loadRows(search = "") {
    if (!session?.accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await getTaskOpsHistory(session.accessToken, search || undefined);
      setRows(response.data);
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadRows();
  }, [session?.accessToken]);

  const visibleRows = useMemo(() => rows, [rows]);

  if (isLoading) {
    return <LoadingBlock label={language === "es" ? "Cargando histórico..." : "Loading history..."} />;
  }

  if (error) {
    return (
      <ErrorState
        title={language === "es" ? "No pudimos cargar el histórico" : "We could not load history"}
        detail={getApiErrorDisplayMessage(error)}
      />
    );
  }

  return (
    <div className="taskops-page">
      <PageHeader
        eyebrow={language === "es" ? "TAREAS" : "TASKS"}
        title={language === "es" ? "Histórico" : "History"}
        description={
          language === "es"
            ? "Consulta tareas cerradas con todo su detalle operativo, comentarios, adjuntos y trazabilidad."
            : "Review closed tasks with their full operational detail, comments, attachments and traceability."
        }
        icon="tenant-history"
      />
      <AppToolbar>
        <TaskOpsModuleNav />
      </AppToolbar>
      <DataTableCard<TaskOpsTask>
        title={language === "es" ? "Tareas cerradas" : "Closed tasks"}
        subtitle={
          language === "es"
            ? "Completadas o canceladas, listas para revisar en detalle."
            : "Completed or cancelled, ready for detailed review."
        }
        rows={visibleRows}
        actions={
          <div className="d-flex gap-2">
            <input
              className="form-control"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={language === "es" ? "Buscar..." : "Search..."}
            />
            <button className="btn btn-outline-secondary" type="button" onClick={() => void loadRows(query)}>
              {language === "es" ? "Buscar" : "Search"}
            </button>
          </div>
        }
        columns={[
          {
            key: "task",
            header: language === "es" ? "Tarea" : "Task",
            render: (row) => (
              <div>
                <strong>{row.title}</strong>
                <div className="text-muted small">{row.description || "—"}</div>
              </div>
            ),
          },
          {
            key: "client",
            header: language === "es" ? "Cliente" : "Client",
            render: (row) => <div className="small">{row.client_display_name || "—"}</div>,
          },
          {
            key: "status",
            header: language === "es" ? "Estado final" : "Final status",
            render: (row) => (
              <div className="small">
                {getStatusLabel(row.status, language)}
                <br />
                {row.priority}
              </div>
            ),
          },
          {
            key: "owner",
            header: language === "es" ? "Responsable" : "Owner",
            render: (row) => (
              <div className="small">
                {row.assigned_user_display_name || "—"}
                <br />
                {row.assigned_work_group_name || "—"}
              </div>
            ),
          },
          {
            key: "closed",
            header: language === "es" ? "Cierre" : "Closed",
            render: (row) => <div className="small">{formatDateTime(row.completed_at, language)}</div>,
          },
          {
            key: "actions",
            header: language === "es" ? "Acciones" : "Actions",
            render: (row) => (
              <button className="btn btn-outline-secondary btn-sm" type="button" onClick={() => setModalTaskId(row.id)}>
                {language === "es" ? "Ver detalle" : "View detail"}
              </button>
            ),
          },
        ]}
      />

      <TaskOpsTaskModal
        accessToken={session?.accessToken ?? null}
        isOpen={modalTaskId !== null}
        taskId={modalTaskId}
        currentUserId={tenantUser?.id ?? null}
        canAssignOthers={canAssignOthers}
        canReadUsers={canReadUsers}
        canReadBusinessCore={canReadBusinessCore}
        canReadCRM={canReadCRM}
        canReadMaintenance={canReadMaintenance}
        onClose={() => setModalTaskId(null)}
        onChanged={loadRows}
      />
    </div>
  );
}
