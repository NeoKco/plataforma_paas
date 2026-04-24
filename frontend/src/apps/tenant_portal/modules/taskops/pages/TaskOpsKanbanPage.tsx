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
import {
  getTaskOpsKanban,
  getTaskOpsTaskDetail,
  updateTaskOpsTaskStatus,
  type TaskOpsKanbanColumn,
  type TaskOpsTaskDetail,
} from "../services/taskopsService";

export function TaskOpsKanbanPage() {
  const { session } = useTenantAuth();
  const { language } = useLanguage();
  const [columns, setColumns] = useState<TaskOpsKanbanColumn[]>([]);
  const [detail, setDetail] = useState<TaskOpsTaskDetail | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

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

  async function loadDetail(taskId: number) {
    if (!session?.accessToken) return;
    try {
      const response = await getTaskOpsTaskDetail(session.accessToken, taskId);
      setDetail(response.data);
    } catch (rawError) {
      setError(rawError as ApiError);
    }
  }

  useEffect(() => {
    void loadKanban();
  }, [session?.accessToken]);

  async function moveTask(taskId: number, status: string) {
    if (!session?.accessToken) return;
    try {
      const response = await updateTaskOpsTaskStatus(session.accessToken, taskId, status);
      setFeedback(response.message);
      await loadKanban();
      await loadDetail(taskId);
    } catch (rawError) {
      setError(rawError as ApiError);
    }
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
        eyebrow="TASKOPS"
        title="Kanban"
        description={
          language === "es"
            ? "Mueve tareas entre backlog, por hacer, en curso, bloqueadas y cerradas."
            : "Move tasks between backlog, todo, in progress, blocked and done."
        }
        icon="pipeline"
      />
      <AppToolbar>
        <TaskOpsModuleNav />
      </AppToolbar>

      {feedback ? <div className="alert alert-success">{feedback}</div> : null}

      <div className="taskops-kanban">
        {columns.map((column) => (
          <div className="taskops-kanban__column" key={column.status}>
            <div className="taskops-kanban__column-header">
              <strong>{column.status}</strong>
              <span>{column.total}</span>
            </div>
            <div className="taskops-kanban__list">
              {column.items.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className="taskops-kanban__card"
                  onClick={() => void loadDetail(item.id)}
                >
                  <strong>{item.title}</strong>
                  <div className="small text-muted">{item.client_display_name || "—"}</div>
                  <div className="small">{item.assigned_user_display_name || "—"}</div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {detail ? (
        <div className="panel-card">
          <div className="panel-card__header">
            <h2 className="panel-card__title">{detail.task.title}</h2>
          </div>
          <div className="taskops-detail-grid">
            <div>
              <div className="small text-muted">{detail.task.description || "—"}</div>
              <div className="small mt-2">
                {language === "es" ? "Cliente" : "Client"}: {detail.task.client_display_name || "—"}
              </div>
              <div className="small">
                {language === "es" ? "Responsable" : "Owner"}: {detail.task.assigned_user_display_name || "—"}
              </div>
            </div>
            <div className="d-flex flex-wrap gap-2 align-items-start">
              <button className="btn btn-outline-secondary btn-sm" onClick={() => void moveTask(detail.task.id, "backlog")}>Backlog</button>
              <button className="btn btn-outline-secondary btn-sm" onClick={() => void moveTask(detail.task.id, "todo")}>{language === "es" ? "Por hacer" : "Todo"}</button>
              <button className="btn btn-outline-primary btn-sm" onClick={() => void moveTask(detail.task.id, "in_progress")}>{language === "es" ? "En curso" : "In progress"}</button>
              <button className="btn btn-outline-warning btn-sm" onClick={() => void moveTask(detail.task.id, "blocked")}>{language === "es" ? "Bloqueada" : "Blocked"}</button>
              <button className="btn btn-outline-success btn-sm" onClick={() => void moveTask(detail.task.id, "done")}>{language === "es" ? "Completar" : "Done"}</button>
              <button className="btn btn-outline-danger btn-sm" onClick={() => void moveTask(detail.task.id, "cancelled")}>{language === "es" ? "Cancelar" : "Cancel"}</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
