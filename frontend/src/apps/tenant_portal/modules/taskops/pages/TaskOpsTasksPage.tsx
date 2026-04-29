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
import { getTaskOpsTasks, type TaskOpsTask } from "../services/taskopsService";

function getStatusLabel(status: string, language: "es" | "en") {
  const labels: Record<string, string> =
    language === "es"
      ? {
          backlog: "Backlog",
          todo: "Por hacer",
          in_progress: "En curso",
          blocked: "Bloqueada",
          done: "Cerrada",
          cancelled: "Cancelada",
        }
      : {
          backlog: "Backlog",
          todo: "Todo",
          in_progress: "In progress",
          blocked: "Blocked",
          done: "Closed",
          cancelled: "Cancelled",
        };
  return labels[status] || status;
}

function formatDateTime(value: string | null, language: "es" | "en") {
  if (!value) return "—";
  return new Intl.DateTimeFormat(language === "es" ? "es-CL" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function TaskOpsTasksPage() {
  const { session, tenantUser } = useTenantAuth();
  const { language } = useLanguage();
  const [rows, setRows] = useState<TaskOpsTask[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [modalTaskId, setModalTaskId] = useState<number | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  const permissionSet = useMemo(
    () => new Set(tenantUser?.permissions ?? []),
    [tenantUser?.permissions]
  );
  const canCreateOwn = permissionSet.has("tenant.taskops.create_own");
  const canAssignOthers =
    permissionSet.has("tenant.taskops.assign_others") ||
    permissionSet.has("tenant.taskops.manage");

  async function loadRows() {
    if (!session?.accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await getTaskOpsTasks(session.accessToken, {
        includeInactive: true,
        includeClosed: false,
        status: status || undefined,
        q: query || undefined,
      });
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
    return <LoadingBlock label={language === "es" ? "Cargando tareas..." : "Loading tasks..."} />;
  }

  if (error && !rows.length) {
    return (
      <ErrorState
        title={language === "es" ? "No pudimos cargar tareas" : "We could not load tasks"}
        detail={getApiErrorDisplayMessage(error)}
      />
    );
  }

  return (
    <div className="taskops-page">
      <PageHeader
        eyebrow={language === "es" ? "TAREAS" : "TASKS"}
        title={language === "es" ? "Asignación" : "Assignment"}
        description={
          language === "es"
            ? "Revisa tus tareas activas y, si tu perfil lo permite, crea o asigna trabajo operativo a otros usuarios."
            : "Review your active tasks and, if your profile allows it, create or assign operational work to other users."
        }
        icon="taskops"
      />
      <AppToolbar>
        <TaskOpsModuleNav />
      </AppToolbar>

      {error ? <div className="alert alert-danger">{getApiErrorDisplayMessage(error)}</div> : null}

      <DataTableCard<TaskOpsTask>
        title={language === "es" ? "Tareas activas" : "Active tasks"}
        subtitle={
          language === "es"
            ? canAssignOthers
              ? "Vista operativa del tenant. Si tu perfil lo permite, puedes asignar tareas a otros usuarios."
              : canCreateOwn
                ? "Vista de tus tareas activas. Puedes crear y cerrar tus propias tareas."
                : "Vista de tus tareas activas y asignadas. Tu perfil actual es de lectura operativa."
            : canAssignOthers
              ? "Operational tenant view. If your profile allows it, you can assign tasks to other users."
              : canCreateOwn
                ? "View of your active tasks. You can create and close your own tasks."
                : "View of your active assigned tasks. Your current profile is read-only."
        }
        rows={visibleRows}
        actions={
          <div className="d-flex flex-wrap gap-2">
            <input
              className="form-control"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={language === "es" ? "Buscar tarea..." : "Search task..."}
            />
            <select
              className="form-select"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="">{language === "es" ? "Todos los estados" : "All statuses"}</option>
              <option value="backlog">{getStatusLabel("backlog", language)}</option>
              <option value="todo">{getStatusLabel("todo", language)}</option>
              <option value="in_progress">{getStatusLabel("in_progress", language)}</option>
              <option value="blocked">{getStatusLabel("blocked", language)}</option>
            </select>
            <button className="btn btn-outline-secondary" type="button" onClick={() => void loadRows()}>
              {language === "es" ? "Filtrar" : "Filter"}
            </button>
            {canCreateOwn ? (
              <button className="btn btn-primary" type="button" onClick={() => setIsCreateModalOpen(true)}>
                {language === "es"
                  ? canAssignOthers
                    ? "Asignar tarea"
                    : "Nueva tarea propia"
                  : canAssignOthers
                    ? "Assign task"
                    : "New own task"}
              </button>
            ) : null}
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
                {row.agenda_linked ? (
                  <div className="small taskops-linked-badge">
                    {language === "es" ? "Ligada a agenda" : "Agenda linked"}
                  </div>
                ) : null}
              </div>
            ),
          },
          {
            key: "assignment",
            header: language === "es" ? "Asignación" : "Assignment",
            render: (row) => (
              <div className="small">
                {row.assigned_user_display_name || "—"}
                <br />
                {row.assigned_work_group_name || "—"}
              </div>
            ),
          },
          {
            key: "references",
            header: language === "es" ? "Referencias" : "References",
            render: (row) => (
              <div className="small">
                {row.client_display_name || "—"}
                <br />
                {row.opportunity_title || row.work_order_title || "—"}
              </div>
            ),
          },
          {
            key: "status",
            header: language === "es" ? "Estado" : "Status",
            render: (row) => (
              <div className="small">
                {getStatusLabel(row.status, language)}
                <br />
                {row.priority}
              </div>
            ),
          },
          {
            key: "due",
            header: language === "es" ? "Vence" : "Due",
            render: (row) => <div className="small">{formatDateTime(row.due_at, language)}</div>,
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
        isOpen={isCreateModalOpen}
        taskId={null}
        currentUserId={tenantUser?.id ?? null}
        canAssignOthers={canAssignOthers}
        onClose={() => setIsCreateModalOpen(false)}
        onChanged={loadRows}
      />

      <TaskOpsTaskModal
        accessToken={session?.accessToken ?? null}
        isOpen={modalTaskId !== null}
        taskId={modalTaskId}
        currentUserId={tenantUser?.id ?? null}
        canAssignOthers={canAssignOthers}
        onClose={() => setModalTaskId(null)}
        onChanged={loadRows}
      />
    </div>
  );
}
