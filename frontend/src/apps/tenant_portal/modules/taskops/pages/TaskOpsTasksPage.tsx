import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "../../../../../components/common/PageHeader";
import { PanelCard } from "../../../../../components/common/PanelCard";
import { DataTableCard } from "../../../../../components/data-display/DataTableCard";
import { ErrorState } from "../../../../../components/feedback/ErrorState";
import { LoadingBlock } from "../../../../../components/feedback/LoadingBlock";
import { AppToolbar } from "../../../../../design-system/AppLayout";
import { getApiErrorDisplayMessage } from "../../../../../services/api";
import { getTenantUsers } from "../../../../../services/tenant-api";
import { useLanguage } from "../../../../../store/language-context";
import { useTenantAuth } from "../../../../../store/tenant-auth-context";
import type { ApiError, TenantUsersItem } from "../../../../../types";
import { getTenantBusinessClients, type TenantBusinessClient } from "../../business_core/services/clientsService";
import {
  getTenantBusinessOrganizations,
  type TenantBusinessOrganization,
} from "../../business_core/services/organizationsService";
import {
  getTenantBusinessWorkGroups,
  type TenantBusinessWorkGroup,
} from "../../business_core/services/workGroupsService";
import {
  getCRMOpportunities,
  type CRMOpportunity,
} from "../../crm/services/crmService";
import {
  getTenantMaintenanceWorkOrders,
  type TenantMaintenanceWorkOrder,
} from "../../maintenance/services/workOrdersService";
import { TaskOpsModuleNav } from "../components/common/TaskOpsModuleNav";
import {
  createTaskOpsTask,
  createTaskOpsTaskComment,
  deleteTaskOpsTask,
  deleteTaskOpsTaskAttachment,
  deleteTaskOpsTaskComment,
  downloadTaskOpsTaskAttachment,
  getTaskOpsTaskDetail,
  getTaskOpsTasks,
  updateTaskOpsTask,
  updateTaskOpsTaskActive,
  updateTaskOpsTaskStatus,
  uploadTaskOpsTaskAttachment,
  type TaskOpsTask,
  type TaskOpsTaskDetail,
  type TaskOpsTaskWriteRequest,
} from "../services/taskopsService";

function buildDefaultForm(): TaskOpsTaskWriteRequest {
  return {
    client_id: null,
    opportunity_id: null,
    work_order_id: null,
    assigned_user_id: null,
    assigned_work_group_id: null,
    title: "",
    description: null,
    status: "backlog",
    priority: "normal",
    due_at: null,
    is_active: true,
    sort_order: 100,
  };
}

function formatDateTime(value: string | null, language: "es" | "en") {
  if (!value) return "—";
  return new Intl.DateTimeFormat(language === "es" ? "es-CL" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function toLocalDateTimeValue(value: string | null) {
  if (!value) return "";
  return value.slice(0, 16);
}

function normalizeNullableString(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeTaskToWrite(task: TaskOpsTask): TaskOpsTaskWriteRequest {
  return {
    client_id: task.client_id,
    opportunity_id: task.opportunity_id,
    work_order_id: task.work_order_id,
    assigned_user_id: task.assigned_user_id,
    assigned_work_group_id: task.assigned_work_group_id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    due_at: task.due_at ? task.due_at.slice(0, 16) : null,
    is_active: task.is_active,
    sort_order: task.sort_order,
  };
}

function downloadBlobFile(blob: Blob, filename: string, mimeType: string) {
  const nextBlob = new Blob([blob], { type: mimeType });
  const blobUrl = URL.createObjectURL(nextBlob);
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(blobUrl);
}

export function TaskOpsTasksPage() {
  const { session } = useTenantAuth();
  const { language } = useLanguage();
  const [rows, setRows] = useState<TaskOpsTask[]>([]);
  const [detail, setDetail] = useState<TaskOpsTaskDetail | null>(null);
  const [clients, setClients] = useState<TenantBusinessClient[]>([]);
  const [organizations, setOrganizations] = useState<TenantBusinessOrganization[]>([]);
  const [workGroups, setWorkGroups] = useState<TenantBusinessWorkGroup[]>([]);
  const [tenantUsers, setTenantUsers] = useState<TenantUsersItem[]>([]);
  const [opportunities, setOpportunities] = useState<CRMOpportunity[]>([]);
  const [workOrders, setWorkOrders] = useState<TenantMaintenanceWorkOrder[]>([]);
  const [form, setForm] = useState<TaskOpsTaskWriteRequest>(buildDefaultForm());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [commentText, setCommentText] = useState("");
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentNotes, setAttachmentNotes] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const organizationById = useMemo(
    () => new Map(organizations.map((item) => [item.id, item])),
    [organizations]
  );

  const clientOptions = useMemo(
    () =>
      clients.map((item) => ({
        ...item,
        display_name: organizationById.get(item.organization_id)?.name || `#${item.id}`,
      })),
    [clients, organizationById]
  );

  async function loadRows() {
    if (!session?.accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const [
        tasksResponse,
        clientsResponse,
        organizationsResponse,
        workGroupsResponse,
        usersResponse,
        opportunitiesResponse,
        workOrdersResponse,
      ] = await Promise.all([
        getTaskOpsTasks(session.accessToken, { includeInactive: true, includeClosed: true }),
        getTenantBusinessClients(session.accessToken, { includeInactive: false }),
        getTenantBusinessOrganizations(session.accessToken, { includeInactive: false }),
        getTenantBusinessWorkGroups(session.accessToken, { includeInactive: false }),
        getTenantUsers(session.accessToken),
        getCRMOpportunities(session.accessToken),
        getTenantMaintenanceWorkOrders(session.accessToken),
      ]);
      setRows(tasksResponse.data);
      setClients(clientsResponse.data);
      setOrganizations(organizationsResponse.data);
      setWorkGroups(workGroupsResponse.data);
      setTenantUsers(usersResponse.data);
      setOpportunities(opportunitiesResponse.data);
      setWorkOrders(workOrdersResponse.data);
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsLoading(false);
    }
  }

  async function loadDetail(taskId: number) {
    if (!session?.accessToken) return;
    setIsDetailLoading(true);
    try {
      const response = await getTaskOpsTaskDetail(session.accessToken, taskId);
      setDetail(response.data);
      setSelectedTaskId(taskId);
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsDetailLoading(false);
    }
  }

  useEffect(() => {
    void loadRows();
  }, [session?.accessToken]);

  function startNew() {
    setEditingId(null);
    setSelectedTaskId(null);
    setDetail(null);
    setForm(buildDefaultForm());
    setCommentText("");
    setAttachmentFile(null);
    setAttachmentNotes("");
    setFeedback(null);
  }

  function startEdit(item: TaskOpsTask) {
    setEditingId(item.id);
    setForm(normalizeTaskToWrite(item));
    setFeedback(null);
    void loadDetail(item.id);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.accessToken) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const payload: TaskOpsTaskWriteRequest = {
        ...form,
        title: form.title.trim(),
        description: normalizeNullableString(form.description || ""),
        due_at: form.due_at ? form.due_at : null,
      };
      const response = editingId
        ? await updateTaskOpsTask(session.accessToken, editingId, payload)
        : await createTaskOpsTask(session.accessToken, payload);
      setFeedback(response.message);
      setEditingId(response.data.id);
      setForm(normalizeTaskToWrite(response.data));
      await loadRows();
      await loadDetail(response.data.id);
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleStatus(taskId: number, status: string) {
    if (!session?.accessToken) return;
    try {
      const response = await updateTaskOpsTaskStatus(session.accessToken, taskId, status);
      setFeedback(response.message);
      await loadRows();
      await loadDetail(taskId);
    } catch (rawError) {
      setError(rawError as ApiError);
    }
  }

  async function handleToggleActive(task: TaskOpsTask) {
    if (!session?.accessToken) return;
    try {
      const response = await updateTaskOpsTaskActive(session.accessToken, task.id, !task.is_active);
      setFeedback(response.message);
      await loadRows();
      if (selectedTaskId === task.id) {
        await loadDetail(task.id);
      }
    } catch (rawError) {
      setError(rawError as ApiError);
    }
  }

  async function handleDelete(task: TaskOpsTask) {
    if (!session?.accessToken) return;
    if (!window.confirm(language === "es" ? `Eliminar "${task.title}"?` : `Delete "${task.title}"?`)) {
      return;
    }
    try {
      const response = await deleteTaskOpsTask(session.accessToken, task.id);
      setFeedback(response.message);
      await loadRows();
      if (selectedTaskId === task.id) {
        startNew();
      }
    } catch (rawError) {
      setError(rawError as ApiError);
    }
  }

  async function handleCreateComment() {
    if (!session?.accessToken || !selectedTaskId || !commentText.trim()) return;
    try {
      const response = await createTaskOpsTaskComment(session.accessToken, selectedTaskId, commentText.trim());
      setDetail(response.detail);
      setCommentText("");
      setFeedback(response.message);
      await loadRows();
    } catch (rawError) {
      setError(rawError as ApiError);
    }
  }

  async function handleDeleteComment(commentId: number) {
    if (!session?.accessToken || !selectedTaskId) return;
    try {
      const response = await deleteTaskOpsTaskComment(session.accessToken, selectedTaskId, commentId);
      setDetail(response.detail);
      setFeedback(response.message);
    } catch (rawError) {
      setError(rawError as ApiError);
    }
  }

  async function handleUploadAttachment() {
    if (!session?.accessToken || !selectedTaskId || !attachmentFile) return;
    try {
      const response = await uploadTaskOpsTaskAttachment(
        session.accessToken,
        selectedTaskId,
        attachmentFile,
        attachmentNotes
      );
      setDetail(response.detail);
      setAttachmentFile(null);
      setAttachmentNotes("");
      setFeedback(response.message);
    } catch (rawError) {
      setError(rawError as ApiError);
    }
  }

  async function handleDeleteAttachment(attachmentId: number) {
    if (!session?.accessToken || !selectedTaskId) return;
    try {
      const response = await deleteTaskOpsTaskAttachment(session.accessToken, selectedTaskId, attachmentId);
      setDetail(response.detail);
      setFeedback(response.message);
    } catch (rawError) {
      setError(rawError as ApiError);
    }
  }

  async function handleDownloadAttachment(attachmentId: number) {
    if (!session?.accessToken || !selectedTaskId) return;
    try {
      const download = await downloadTaskOpsTaskAttachment(session.accessToken, selectedTaskId, attachmentId);
      downloadBlobFile(download.blob, download.fileName || "taskops-attachment", download.contentType);
    } catch (rawError) {
      setError(rawError as ApiError);
    }
  }

  if (isLoading) {
    return <LoadingBlock label={language === "es" ? "Cargando TaskOps..." : "Loading TaskOps..."} />;
  }

  if (error && !rows.length) {
    return (
      <ErrorState
        title={language === "es" ? "No pudimos cargar TaskOps" : "We could not load TaskOps"}
        detail={getApiErrorDisplayMessage(error)}
      />
    );
  }

  return (
    <div className="taskops-page">
      <PageHeader
        eyebrow="TASKOPS"
        title={language === "es" ? "Tareas" : "Tasks"}
        description={
          language === "es"
            ? "Gestiona pendientes internos, enlázalos con clientes, oportunidades u OT y deja trazabilidad."
            : "Manage internal tasks, link them to clients, opportunities or work orders and keep traceability."
        }
        icon="taskops"
      />
      <AppToolbar>
        <TaskOpsModuleNav />
      </AppToolbar>

      {error ? <div className="alert alert-danger">{getApiErrorDisplayMessage(error)}</div> : null}
      {feedback ? <div className="alert alert-success">{feedback}</div> : null}

      <div className="taskops-page__grid">
        <PanelCard title={editingId ? (language === "es" ? "Editar tarea" : "Edit task") : language === "es" ? "Nueva tarea" : "New task"}>
          <form className="taskops-form" onSubmit={handleSubmit}>
            <div className="row g-3">
              <div className="col-md-8">
                <label className="form-label">{language === "es" ? "Título" : "Title"}</label>
                <input
                  className="form-control"
                  value={form.title}
                  onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                  required
                />
              </div>
              <div className="col-md-4">
                <label className="form-label">{language === "es" ? "Prioridad" : "Priority"}</label>
                <select
                  className="form-select"
                  value={form.priority}
                  onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value }))}
                >
                  <option value="low">{language === "es" ? "Baja" : "Low"}</option>
                  <option value="normal">{language === "es" ? "Normal" : "Normal"}</option>
                  <option value="high">{language === "es" ? "Alta" : "High"}</option>
                  <option value="urgent">{language === "es" ? "Urgente" : "Urgent"}</option>
                </select>
              </div>
              <div className="col-12">
                <label className="form-label">{language === "es" ? "Descripción" : "Description"}</label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={form.description || ""}
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                />
              </div>
              <div className="col-md-4">
                <label className="form-label">{language === "es" ? "Estado" : "Status"}</label>
                <select
                  className="form-select"
                  value={form.status}
                  onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
                >
                  <option value="backlog">backlog</option>
                  <option value="todo">todo</option>
                  <option value="in_progress">in_progress</option>
                  <option value="blocked">blocked</option>
                  <option value="done">done</option>
                  <option value="cancelled">cancelled</option>
                </select>
              </div>
              <div className="col-md-4">
                <label className="form-label">{language === "es" ? "Vence" : "Due at"}</label>
                <input
                  type="datetime-local"
                  className="form-control"
                  value={form.due_at || ""}
                  onChange={(event) => setForm((current) => ({ ...current, due_at: event.target.value || null }))}
                />
              </div>
              <div className="col-md-4">
                <label className="form-label">{language === "es" ? "Orden" : "Sort order"}</label>
                <input
                  type="number"
                  className="form-control"
                  value={form.sort_order}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, sort_order: Number(event.target.value) || 100 }))
                  }
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">{language === "es" ? "Cliente" : "Client"}</label>
                <select
                  className="form-select"
                  value={form.client_id ?? ""}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, client_id: event.target.value ? Number(event.target.value) : null }))
                  }
                >
                  <option value="">{language === "es" ? "Sin cliente" : "No client"}</option>
                  {clientOptions.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.display_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label">{language === "es" ? "Oportunidad CRM" : "CRM opportunity"}</label>
                <select
                  className="form-select"
                  value={form.opportunity_id ?? ""}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, opportunity_id: event.target.value ? Number(event.target.value) : null }))
                  }
                >
                  <option value="">{language === "es" ? "Sin oportunidad" : "No opportunity"}</option>
                  {opportunities.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label">{language === "es" ? "OT Mantención" : "Maintenance work order"}</label>
                <select
                  className="form-select"
                  value={form.work_order_id ?? ""}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, work_order_id: event.target.value ? Number(event.target.value) : null }))
                  }
                >
                  <option value="">{language === "es" ? "Sin OT" : "No work order"}</option>
                  {workOrders.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label">{language === "es" ? "Responsable" : "Assigned user"}</label>
                <select
                  className="form-select"
                  value={form.assigned_user_id ?? ""}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, assigned_user_id: event.target.value ? Number(event.target.value) : null }))
                  }
                >
                  <option value="">{language === "es" ? "Sin responsable" : "No assignee"}</option>
                  {tenantUsers
                    .filter((item) => item.is_active)
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.full_name}
                      </option>
                    ))}
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label">{language === "es" ? "Grupo de trabajo" : "Work group"}</label>
                <select
                  className="form-select"
                  value={form.assigned_work_group_id ?? ""}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, assigned_work_group_id: event.target.value ? Number(event.target.value) : null }))
                  }
                >
                  <option value="">{language === "es" ? "Sin grupo" : "No group"}</option>
                  {workGroups.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="d-flex gap-2 mt-3">
              <button className="btn btn-primary" type="submit" disabled={isSubmitting}>
                {editingId
                  ? language === "es"
                    ? "Actualizar tarea"
                    : "Update task"
                  : language === "es"
                    ? "Crear tarea"
                    : "Create task"}
              </button>
              <button className="btn btn-outline-secondary" type="button" onClick={startNew}>
                {language === "es" ? "Limpiar" : "Reset"}
              </button>
            </div>
          </form>
        </PanelCard>

        <PanelCard title={language === "es" ? "Detalle operativo" : "Operational detail"}>
          {isDetailLoading ? (
            <LoadingBlock label={language === "es" ? "Cargando detalle..." : "Loading detail..."} />
          ) : detail ? (
            <div className="taskops-detail">
              <div className="taskops-detail__summary">
                <h3>{detail.task.title}</h3>
                <p className="text-muted mb-2">{detail.task.description || "—"}</p>
                <div className="small">
                  {language === "es" ? "Estado" : "Status"}: {detail.task.status} · {detail.task.priority}
                </div>
                <div className="small">
                  {language === "es" ? "Cliente" : "Client"}: {detail.task.client_display_name || "—"}
                </div>
                <div className="small">
                  {language === "es" ? "Responsable" : "Assignee"}: {detail.task.assigned_user_display_name || "—"}
                </div>
                <div className="small">
                  {language === "es" ? "Grupo" : "Group"}: {detail.task.assigned_work_group_name || "—"}
                </div>
                <div className="small">
                  {language === "es" ? "Vence" : "Due"}: {formatDateTime(detail.task.due_at, language)}
                </div>
              </div>
              <div className="d-flex flex-wrap gap-2 mb-3">
                <button className="btn btn-outline-secondary btn-sm" onClick={() => void handleStatus(detail.task.id, "backlog")}>backlog</button>
                <button className="btn btn-outline-secondary btn-sm" onClick={() => void handleStatus(detail.task.id, "todo")}>todo</button>
                <button className="btn btn-outline-primary btn-sm" onClick={() => void handleStatus(detail.task.id, "in_progress")}>in_progress</button>
                <button className="btn btn-outline-warning btn-sm" onClick={() => void handleStatus(detail.task.id, "blocked")}>blocked</button>
                <button className="btn btn-outline-success btn-sm" onClick={() => void handleStatus(detail.task.id, "done")}>done</button>
                <button className="btn btn-outline-danger btn-sm" onClick={() => void handleStatus(detail.task.id, "cancelled")}>cancelled</button>
              </div>
              <div className="d-flex flex-wrap gap-2 mb-4">
                <button className="btn btn-outline-secondary btn-sm" onClick={() => void handleToggleActive(detail.task)}>
                  {detail.task.is_active
                    ? language === "es" ? "Desactivar" : "Deactivate"
                    : language === "es" ? "Reactivar" : "Reactivate"}
                </button>
                <button className="btn btn-outline-secondary btn-sm" onClick={() => startEdit(detail.task)}>
                  {language === "es" ? "Editar" : "Edit"}
                </button>
                <button className="btn btn-outline-danger btn-sm" onClick={() => void handleDelete(detail.task)}>
                  {language === "es" ? "Eliminar" : "Delete"}
                </button>
              </div>

              <div className="taskops-detail__section">
                <h4>{language === "es" ? "Comentarios" : "Comments"}</h4>
                <div className="d-flex gap-2 mb-3">
                  <input
                    className="form-control"
                    value={commentText}
                    onChange={(event) => setCommentText(event.target.value)}
                    placeholder={language === "es" ? "Agregar comentario..." : "Add comment..."}
                  />
                  <button className="btn btn-primary" onClick={() => void handleCreateComment()}>
                    {language === "es" ? "Agregar" : "Add"}
                  </button>
                </div>
                <div className="taskops-detail__stack">
                  {detail.comments.map((item) => (
                    <div className="taskops-detail__item" key={item.id}>
                      <div>
                        <strong>{item.created_by_display_name || "—"}</strong>
                        <div className="small text-muted">{formatDateTime(item.created_at, language)}</div>
                        <div>{item.comment}</div>
                      </div>
                      <button className="btn btn-outline-danger btn-sm" onClick={() => void handleDeleteComment(item.id)}>
                        {language === "es" ? "Eliminar" : "Delete"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="taskops-detail__section">
                <h4>{language === "es" ? "Adjuntos" : "Attachments"}</h4>
                <div className="row g-2 mb-3">
                  <div className="col-md-6">
                    <input
                      type="file"
                      className="form-control"
                      onChange={(event) => setAttachmentFile(event.target.files?.[0] || null)}
                    />
                  </div>
                  <div className="col-md-4">
                    <input
                      className="form-control"
                      value={attachmentNotes}
                      onChange={(event) => setAttachmentNotes(event.target.value)}
                      placeholder={language === "es" ? "Notas del adjunto" : "Attachment notes"}
                    />
                  </div>
                  <div className="col-md-2">
                    <button className="btn btn-primary w-100" onClick={() => void handleUploadAttachment()}>
                      {language === "es" ? "Subir" : "Upload"}
                    </button>
                  </div>
                </div>
                <div className="taskops-detail__stack">
                  {detail.attachments.map((item) => (
                    <div className="taskops-detail__item" key={item.id}>
                      <div>
                        <strong>{item.file_name}</strong>
                        <div className="small text-muted">
                          {(item.file_size / 1024).toFixed(1)} KB · {item.uploaded_by_display_name || "—"}
                        </div>
                        <div className="small">{item.notes || "—"}</div>
                      </div>
                      <div className="d-flex gap-2">
                        <button className="btn btn-outline-secondary btn-sm" onClick={() => void handleDownloadAttachment(item.id)}>
                          {language === "es" ? "Descargar" : "Download"}
                        </button>
                        <button className="btn btn-outline-danger btn-sm" onClick={() => void handleDeleteAttachment(item.id)}>
                          {language === "es" ? "Eliminar" : "Delete"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="taskops-detail__section">
                <h4>{language === "es" ? "Trazabilidad" : "Traceability"}</h4>
                <div className="taskops-detail__stack">
                  {detail.status_events.map((item) => (
                    <div className="taskops-detail__item" key={item.id}>
                      <div>
                        <strong>{item.summary || item.event_type}</strong>
                        <div className="small text-muted">
                          {item.from_status || "—"} → {item.to_status || "—"} · {item.created_by_display_name || "—"}
                        </div>
                        <div className="small">{formatDateTime(item.created_at, language)}</div>
                        <div>{item.notes || "—"}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-muted small">
              {language === "es"
                ? "Selecciona una tarea para ver comentarios, adjuntos e histórico."
                : "Select a task to inspect comments, attachments and history."}
            </div>
          )}
        </PanelCard>
      </div>

      <DataTableCard<TaskOpsTask>
        title={language === "es" ? "Tareas activas" : "Active tasks"}
        subtitle={
          language === "es"
            ? "Incluye abiertas y cerradas para control operativo rápido."
            : "Includes open and closed items for quick operational control."
        }
        rows={rows}
        columns={[
          { key: "title", header: language === "es" ? "Tarea" : "Task", render: (row) => <div><strong>{row.title}</strong><div className="text-muted small">{row.description || "—"}</div></div> },
          { key: "refs", header: language === "es" ? "Referencias" : "References", render: (row) => <div className="small">{row.client_display_name || "—"}<br />{row.opportunity_title || row.work_order_title || "—"}</div> },
          { key: "assignment", header: language === "es" ? "Asignación" : "Assignment", render: (row) => <div className="small">{row.assigned_user_display_name || "—"}<br />{row.assigned_work_group_name || "—"}</div> },
          { key: "state", header: language === "es" ? "Estado" : "State", render: (row) => <div className="small">{row.status}<br />{row.priority}</div> },
          { key: "due", header: language === "es" ? "Vence" : "Due", render: (row) => <div className="small">{formatDateTime(row.due_at, language)}</div> },
          {
            key: "actions",
            header: language === "es" ? "Acciones" : "Actions",
            render: (row) => (
              <div className="d-flex flex-wrap gap-2">
                <button className="btn btn-outline-secondary btn-sm" onClick={() => void loadDetail(row.id)}>
                  {language === "es" ? "Ver" : "View"}
                </button>
                <button className="btn btn-outline-primary btn-sm" onClick={() => startEdit(row)}>
                  {language === "es" ? "Editar" : "Edit"}
                </button>
                <button className="btn btn-outline-danger btn-sm" onClick={() => void handleDelete(row)}>
                  {language === "es" ? "Eliminar" : "Delete"}
                </button>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
