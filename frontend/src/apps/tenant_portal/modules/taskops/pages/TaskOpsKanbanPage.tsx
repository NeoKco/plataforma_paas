import { useEffect, useState } from "react";
import { PageHeader } from "../../../../../components/common/PageHeader";
import { ErrorState } from "../../../../../components/feedback/ErrorState";
import { LoadingBlock } from "../../../../../components/feedback/LoadingBlock";
import { AppToolbar } from "../../../../../design-system/AppLayout";
import { getApiErrorDisplayMessage } from "../../../../../services/api";
import { useLanguage } from "../../../../../store/language-context";
import { useTenantAuth } from "../../../../../store/tenant-auth-context";
import type { ApiError } from "../../../../../types";
import { TaskOpsModuleNav } from "../components/common/TaskOpsModuleNav";
import { TaskOpsTaskModal } from "../components/common/TaskOpsTaskModal";
import {
  getTaskOpsKanban,
  type TaskOpsKanbanColumn,
} from "../services/taskopsService";

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

export function TaskOpsKanbanPage() {
  const { session, tenantUser } = useTenantAuth();
  const { language } = useLanguage();
  const [columns, setColumns] = useState<TaskOpsKanbanColumn[]>([]);
  const [modalTaskId, setModalTaskId] = useState<number | null>(null);
  const [createStatus, setCreateStatus] = useState<string>("todo");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  const permissionSet = new Set(tenantUser?.permissions ?? []);
  const canCreateOwn = permissionSet.has("tenant.taskops.create_own");
  const canAssignOthers =
    permissionSet.has("tenant.taskops.assign_others") ||
    permissionSet.has("tenant.taskops.manage");

  async function loadKanban() {
    if (!session?.accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await getTaskOpsKanban(session.accessToken);
      setColumns(response.columns);
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadKanban();
  }, [session?.accessToken]);

  function openCreateModal(initial: string) {
    setCreateStatus(initial);
    setIsCreateModalOpen(true);
    setFeedback(null);
  }

  if (isLoading) {
    return <LoadingBlock label={language === "es" ? "Cargando kanban..." : "Loading kanban..."} />;
  }

  if (error) {
    return (
      <ErrorState
        title={language === "es" ? "No pudimos cargar el kanban" : "We could not load kanban"}
        detail={getApiErrorDisplayMessage(error)}
      />
    );
  }

  return (
    <div className="taskops-page">
      <PageHeader
        eyebrow={language === "es" ? "TAREAS" : "TASKS"}
        title="Kanban"
        description={
          language === "es"
            ? "Crea tareas desde el tablero y entra al detalle operativo con comentarios, adjuntos y cierre a histórico."
            : "Create tasks from the board and open operational detail with comments, attachments and historical closure."
        }
        icon="pipeline"
      />
      <AppToolbar>
        <TaskOpsModuleNav />
      </AppToolbar>

      {feedback ? <div className="alert alert-success">{feedback}</div> : null}

      <div className="taskops-kanban__toolbar">
        <button className="btn btn-primary" type="button" onClick={() => openCreateModal("todo")}>
          {language === "es"
            ? canAssignOthers
              ? "Asignar tarea"
              : "Nueva tarea propia"
            : canAssignOthers
              ? "Assign task"
              : "New own task"}
        </button>
        <div className="small text-muted">
          {language === "es"
            ? canAssignOthers
              ? "Tu perfil puede crear tareas propias y asignarlas a otros usuarios."
              : canCreateOwn
                ? "Tu perfil puede crear tareas propias; la asignación a otros usuarios depende de permisos."
                : "Tu perfil actual puede revisar el tablero, pero no crear ni asignar tareas."
            : canAssignOthers
              ? "Your profile can create tasks and assign them to other users."
              : canCreateOwn
                ? "Your profile can create your own tasks; assigning others depends on permissions."
                : "Your profile can review the board, but not create or assign tasks."}
        </div>
      </div>

      <div className="taskops-kanban">
        {columns.map((column) => (
          <div className="taskops-kanban__column" key={column.status}>
            <div className="taskops-kanban__column-header">
              <div>
                <strong>{getStatusLabel(column.status, language)}</strong>
                <div className="small text-muted">{column.total}</div>
              </div>
              {canCreateOwn ? (
                <button className="btn btn-outline-secondary btn-sm" type="button" onClick={() => openCreateModal(column.status)}>
                  {language === "es" ? "Crear" : "Create"}
                </button>
              ) : null}
            </div>
            <div className="taskops-kanban__list">
              {column.items.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className="taskops-kanban__card"
                  onClick={() => setModalTaskId(item.id)}
                >
                  <strong>{item.title}</strong>
                  <div className="small text-muted">{item.client_display_name || "—"}</div>
                  <div className="small">{item.assigned_user_display_name || "—"}</div>
                  {item.agenda_linked ? (
                    <div className="small taskops-linked-badge">
                      {language === "es" ? "Ligada a agenda" : "Agenda linked"}
                    </div>
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <TaskOpsTaskModal
        accessToken={session?.accessToken ?? null}
        isOpen={isCreateModalOpen}
        taskId={null}
        currentUserId={tenantUser?.id ?? null}
        canAssignOthers={canAssignOthers}
        initialStatus={createStatus}
        onClose={() => setIsCreateModalOpen(false)}
        onChanged={loadKanban}
      />

      <TaskOpsTaskModal
        accessToken={session?.accessToken ?? null}
        isOpen={modalTaskId !== null}
        taskId={modalTaskId}
        currentUserId={tenantUser?.id ?? null}
        canAssignOthers={canAssignOthers}
        onClose={() => setModalTaskId(null)}
        onChanged={loadKanban}
      />
    </div>
  );
}
