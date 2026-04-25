import { useEffect, useState } from "react";
import { PageHeader } from "../../../../../components/common/PageHeader";
import { PanelCard } from "../../../../../components/common/PanelCard";
import { DataTableCard } from "../../../../../components/data-display/DataTableCard";
import { ErrorState } from "../../../../../components/feedback/ErrorState";
import { LoadingBlock } from "../../../../../components/feedback/LoadingBlock";
import { AppToolbar } from "../../../../../design-system/AppLayout";
import { getApiErrorDisplayMessage } from "../../../../../services/api";
import { useLanguage } from "../../../../../store/language-context";
import { useTenantAuth } from "../../../../../store/tenant-auth-context";
import type { ApiError } from "../../../../../types";
import { TaskOpsModuleNav } from "../components/common/TaskOpsModuleNav";
import { getTaskOpsOverview, type TaskOpsOverviewResponse, type TaskOpsTask } from "../services/taskopsService";

function formatDateTime(value: string | null, language: "es" | "en") {
  if (!value) return "—";
  return new Intl.DateTimeFormat(language === "es" ? "es-CL" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function TaskOpsOverviewPage() {
  const { session } = useTenantAuth();
  const { language } = useLanguage();
  const [response, setResponse] = useState<TaskOpsOverviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  async function loadOverview() {
    if (!session?.accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const next = await getTaskOpsOverview(session.accessToken);
      setResponse(next);
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadOverview();
  }, [session?.accessToken]);

  if (isLoading) {
    return <LoadingBlock label={language === "es" ? "Cargando tareas..." : "Loading tasks..."} />;
  }

  if (error || !response) {
    return (
      <ErrorState
        title={language === "es" ? "No pudimos cargar tareas" : "We could not load tasks"}
        detail={error ? getApiErrorDisplayMessage(error) : language === "es" ? "Sin respuesta del servidor." : "No response from server."}
      />
    );
  }

  const metrics = response.metrics;
  const recentTasks = response.recent_tasks;
  const recentHistory = response.recent_history;

  return (
    <div className="taskops-page">
      <PageHeader
        eyebrow={language === "es" ? "TAREAS" : "TASKS"}
        title={language === "es" ? "Tareas" : "Tasks"}
        description={
          language === "es"
            ? "Coordina tareas internas, propias o asignadas, con kanban, comentarios, adjuntos e histórico."
            : "Coordinate internal tasks, your own or assigned, with kanban, comments, attachments and history."
        }
        icon="taskops"
      />

      <AppToolbar>
        <TaskOpsModuleNav />
      </AppToolbar>

      <div className="taskops-metric-grid">
        <PanelCard title={language === "es" ? "Abiertas" : "Open"}>
          <div className="taskops-metric">{metrics.open_total}</div>
          <div className="taskops-metric__caption">
            {language === "es" ? "Backlog, por hacer, en curso y bloqueadas." : "Backlog, todo, in progress and blocked."}
          </div>
        </PanelCard>
        <PanelCard title={language === "es" ? "En curso" : "In progress"}>
          <div className="taskops-metric">{metrics.in_progress_total}</div>
          <div className="taskops-metric__caption">
            {language === "es" ? "Tareas actualmente en ejecución." : "Tasks currently under execution."}
          </div>
        </PanelCard>
        <PanelCard title={language === "es" ? "Bloqueadas" : "Blocked"}>
          <div className="taskops-metric">{metrics.blocked_total}</div>
          <div className="taskops-metric__caption">
            {language === "es" ? "Requieren destrabe operativo." : "Need operational unblock."}
          </div>
        </PanelCard>
        <PanelCard title={language === "es" ? "Vencen pronto" : "Due soon"}>
          <div className="taskops-metric">{metrics.due_soon_total}</div>
          <div className="taskops-metric__caption">
            {language === "es" ? "Con vencimiento en los próximos 7 días." : "Due within the next 7 days."}
          </div>
        </PanelCard>
      </div>

      <DataTableCard<TaskOpsTask>
        title={language === "es" ? "Pendientes recientes" : "Recent open tasks"}
        subtitle={
          language === "es"
            ? "Muestra abreviada del frente activo para entrar rápido a ejecución."
            : "Short active queue to jump quickly into execution."
        }
        rows={recentTasks}
        columns={[
          { key: "title", header: language === "es" ? "Tarea" : "Task", render: (row) => <div><strong>{row.title}</strong><div className="text-muted small">{row.description || "—"}</div></div> },
          { key: "links", header: language === "es" ? "Referencias" : "References", render: (row) => <div className="small">{row.client_display_name || "—"}<br />{row.opportunity_title || row.work_order_title || "—"}</div> },
          { key: "assignment", header: language === "es" ? "Asignación" : "Assignment", render: (row) => <div className="small">{row.assigned_user_display_name || "—"}<br />{row.assigned_work_group_name || "—"}</div> },
          { key: "status", header: language === "es" ? "Estado" : "Status", render: (row) => <div className="small">{row.status}<br />{row.priority}</div> },
          { key: "due", header: language === "es" ? "Vence" : "Due", render: (row) => <div className="small">{formatDateTime(row.due_at, language)}</div> },
        ]}
      />

      <DataTableCard<TaskOpsTask>
        title={language === "es" ? "Cierres recientes" : "Recent closures"}
        subtitle={
          language === "es"
            ? "Últimas tareas completadas o canceladas."
            : "Last completed or cancelled tasks."
        }
        rows={recentHistory}
        columns={[
          { key: "title", header: language === "es" ? "Tarea" : "Task", render: (row) => <div><strong>{row.title}</strong><div className="text-muted small">{row.client_display_name || "—"}</div></div> },
          { key: "status", header: language === "es" ? "Cierre" : "Closure", render: (row) => <div className="small">{row.status}<br />{formatDateTime(row.completed_at, language)}</div> },
          { key: "assignment", header: language === "es" ? "Responsable" : "Owner", render: (row) => <div className="small">{row.assigned_user_display_name || "—"}</div> },
        ]}
      />
    </div>
  );
}
