import { useEffect, useMemo, useState } from "react";
import { LoadingBlock } from "../../../../../../components/feedback/LoadingBlock";
import { getApiErrorDisplayMessage } from "../../../../../../services/api";
import { getTenantUsers } from "../../../../../../services/tenant-api";
import type { ApiError, TenantUsersItem } from "../../../../../../types";
import { useLanguage } from "../../../../../../store/language-context";
import {
  getTenantBusinessClients,
  type TenantBusinessClient,
} from "../../../business_core/services/clientsService";
import {
  getTenantBusinessOrganizations,
  type TenantBusinessOrganization,
} from "../../../business_core/services/organizationsService";
import {
  getTenantBusinessWorkGroups,
  type TenantBusinessWorkGroup,
} from "../../../business_core/services/workGroupsService";
import { getCRMOpportunities, type CRMOpportunity } from "../../../crm/services/crmService";
import {
  getTenantMaintenanceWorkOrders,
  type TenantMaintenanceWorkOrder,
} from "../../../maintenance/services/workOrdersService";
import {
  createTaskOpsTask,
  createTaskOpsTaskComment,
  deleteTaskOpsTask,
  deleteTaskOpsTaskAttachment,
  deleteTaskOpsTaskComment,
  downloadTaskOpsTaskAttachment,
  getTaskOpsTaskDetail,
  updateTaskOpsTask,
  updateTaskOpsTaskStatus,
  uploadTaskOpsTaskAttachment,
  type TaskOpsTask,
  type TaskOpsTaskDetail,
  type TaskOpsTaskWriteRequest,
} from "../../services/taskopsService";

type TaskOpsTaskModalProps = {
  accessToken: string | null;
  isOpen: boolean;
  taskId: number | null;
  currentUserId: number | null;
  canAssignOthers: boolean;
  initialStatus?: string;
  onClose: () => void;
  onChanged: () => Promise<void> | void;
};

function buildDefaultForm(currentUserId: number | null, canAssignOthers: boolean, initialStatus = "todo"): TaskOpsTaskWriteRequest {
  return {
    client_id: null,
    opportunity_id: null,
    work_order_id: null,
    assigned_user_id: canAssignOthers ? null : currentUserId,
    assigned_work_group_id: null,
    title: "",
    description: null,
    status: initialStatus,
    priority: "normal",
    due_at: null,
    is_active: true,
    sort_order: 100,
  };
}

function normalizeNullableString(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function toLocalDateTimeValue(value: string | null) {
  if (!value) return "";
  return value.slice(0, 16);
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

function formatDateTime(value: string | null, language: "es" | "en") {
  if (!value) return "—";
  return new Intl.DateTimeFormat(language === "es" ? "es-CL" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getTaskStatusLabel(status: string, language: "es" | "en") {
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

export function TaskOpsTaskModal({
  accessToken,
  isOpen,
  taskId,
  currentUserId,
  canAssignOthers,
  initialStatus = "todo",
  onClose,
  onChanged,
}: TaskOpsTaskModalProps) {
  const { language } = useLanguage();
  const [clients, setClients] = useState<TenantBusinessClient[]>([]);
  const [organizations, setOrganizations] = useState<TenantBusinessOrganization[]>([]);
  const [workGroups, setWorkGroups] = useState<TenantBusinessWorkGroup[]>([]);
  const [tenantUsers, setTenantUsers] = useState<TenantUsersItem[]>([]);
  const [opportunities, setOpportunities] = useState<CRMOpportunity[]>([]);
  const [workOrders, setWorkOrders] = useState<TenantMaintenanceWorkOrder[]>([]);
  const [detail, setDetail] = useState<TaskOpsTaskDetail | null>(null);
  const [form, setForm] = useState<TaskOpsTaskWriteRequest>(
    buildDefaultForm(currentUserId, canAssignOthers, initialStatus)
  );
  const [commentText, setCommentText] = useState("");
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentNotes, setAttachmentNotes] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  async function loadCatalogs() {
    if (!accessToken) return;
    const [
      clientsResponse,
      organizationsResponse,
      workGroupsResponse,
      usersResponse,
      opportunitiesResponse,
      workOrdersResponse,
    ] = await Promise.all([
      getTenantBusinessClients(accessToken, { includeInactive: false }),
      getTenantBusinessOrganizations(accessToken, { includeInactive: false }),
      getTenantBusinessWorkGroups(accessToken, { includeInactive: false }),
      getTenantUsers(accessToken),
      getCRMOpportunities(accessToken),
      getTenantMaintenanceWorkOrders(accessToken),
    ]);
    setClients(clientsResponse.data);
    setOrganizations(organizationsResponse.data);
    setWorkGroups(workGroupsResponse.data);
    setTenantUsers(usersResponse.data);
    setOpportunities(opportunitiesResponse.data);
    setWorkOrders(workOrdersResponse.data);
  }

  async function loadDetail(nextTaskId: number) {
    if (!accessToken) return;
    const response = await getTaskOpsTaskDetail(accessToken, nextTaskId);
    setDetail(response.data);
    setForm(normalizeTaskToWrite(response.data.task));
  }

  useEffect(() => {
    if (!isOpen) return;
    if (!accessToken) return;
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    setFeedback(null);
    setCommentText("");
    setAttachmentFile(null);
    setAttachmentNotes("");
    (async () => {
      try {
        await loadCatalogs();
        if (cancelled) return;
        if (taskId) {
          await loadDetail(taskId);
        } else {
          setDetail(null);
          setForm(buildDefaultForm(currentUserId, canAssignOthers, initialStatus));
        }
      } catch (rawError) {
        if (!cancelled) {
          setError(rawError as ApiError);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, accessToken, taskId, currentUserId, canAssignOthers, initialStatus]);

  if (!isOpen) {
    return null;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const payload: TaskOpsTaskWriteRequest = {
        ...form,
        title: form.title.trim(),
        description: normalizeNullableString(form.description || ""),
        due_at: form.due_at ? form.due_at : null,
      };
      const response = taskId
        ? await updateTaskOpsTask(accessToken, taskId, payload)
        : await createTaskOpsTask(accessToken, payload);
      setFeedback(response.message);
      await onChanged();
      await loadDetail(response.data.id);
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleStatus(status: string) {
    if (!accessToken || !detail?.task.id) return;
    const isClosing = status === "done" || status === "cancelled";
    if (
      isClosing &&
      !window.confirm(
        language === "es"
          ? "¿Confirmas cerrar esta tarea? Al cerrarla pasará al histórico."
          : "Do you confirm closing this task? It will move to history."
      )
    ) {
      return;
    }
    try {
      const response = await updateTaskOpsTaskStatus(accessToken, detail.task.id, status);
      setFeedback(response.message);
      await onChanged();
      await loadDetail(detail.task.id);
    } catch (rawError) {
      setError(rawError as ApiError);
    }
  }

  async function handleDelete() {
    if (!accessToken || !detail?.task) return;
    if (
      !window.confirm(
        language === "es"
          ? `¿Eliminar "${detail.task.title}"?`
          : `Delete "${detail.task.title}"?`
      )
    ) {
      return;
    }
    try {
      await deleteTaskOpsTask(accessToken, detail.task.id);
      await onChanged();
      onClose();
    } catch (rawError) {
      setError(rawError as ApiError);
    }
  }

  async function handleCreateComment() {
    if (!accessToken || !detail?.task.id || !commentText.trim()) return;
    try {
      const response = await createTaskOpsTaskComment(accessToken, detail.task.id, commentText.trim());
      setDetail(response.detail);
      setCommentText("");
      setFeedback(response.message);
      await onChanged();
    } catch (rawError) {
      setError(rawError as ApiError);
    }
  }

  async function handleDeleteComment(commentId: number) {
    if (!accessToken || !detail?.task.id) return;
    try {
      const response = await deleteTaskOpsTaskComment(accessToken, detail.task.id, commentId);
      setDetail(response.detail);
      setFeedback(response.message);
      await onChanged();
    } catch (rawError) {
      setError(rawError as ApiError);
    }
  }

  async function handleUploadAttachment() {
    if (!accessToken || !detail?.task.id || !attachmentFile) return;
    try {
      const response = await uploadTaskOpsTaskAttachment(
        accessToken,
        detail.task.id,
        attachmentFile,
        attachmentNotes
      );
      setDetail(response.detail);
      setAttachmentFile(null);
      setAttachmentNotes("");
      setFeedback(response.message);
      await onChanged();
    } catch (rawError) {
      setError(rawError as ApiError);
    }
  }

  async function handleDeleteAttachment(attachmentId: number) {
    if (!accessToken || !detail?.task.id) return;
    try {
      const response = await deleteTaskOpsTaskAttachment(accessToken, detail.task.id, attachmentId);
      setDetail(response.detail);
      setFeedback(response.message);
      await onChanged();
    } catch (rawError) {
      setError(rawError as ApiError);
    }
  }

  async function handleDownloadAttachment(attachmentId: number) {
    if (!accessToken || !detail?.task.id) return;
    try {
      const download = await downloadTaskOpsTaskAttachment(accessToken, detail.task.id, attachmentId);
      downloadBlobFile(download.blob, download.fileName || "tarea-adjunto", download.contentType);
    } catch (rawError) {
      setError(rawError as ApiError);
    }
  }

  return (
    <div className="confirm-dialog-backdrop" role="presentation" onClick={onClose}>
      <div
        className="confirm-dialog platform-admin-form-modal taskops-task-modal"
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="taskops-task-modal__header">
          <div>
            <div className="confirm-dialog__tone confirm-dialog__tone--warning">
              {language === "es" ? "Tareas" : "Tasks"}
            </div>
            <h2 className="confirm-dialog__title">
              {taskId
                ? detail?.task.title || (language === "es" ? "Detalle de tarea" : "Task detail")
                : language === "es"
                  ? "Registrar tarea"
                  : "Register task"}
            </h2>
            {detail?.task ? (
              <p className="confirm-dialog__description">
                {getTaskStatusLabel(detail.task.status, language)} ·{" "}
                {detail.task.assigned_user_display_name || (language === "es" ? "Sin responsable" : "No assignee")}
                {detail.task.agenda_linked
                  ? ` · ${language === "es" ? "Ligada a agenda" : "Agenda linked"}`
                  : ""}
              </p>
            ) : (
              <p className="confirm-dialog__description">
                {language === "es"
                  ? "Crea tareas propias o asigna a otros usuarios si tu perfil lo permite."
                  : "Create your own tasks or assign others if your profile allows it."}
              </p>
            )}
          </div>
          <button className="btn btn-outline-secondary" type="button" onClick={onClose}>
            {language === "es" ? "Cerrar" : "Close"}
          </button>
        </div>

        {error ? <div className="alert alert-danger">{getApiErrorDisplayMessage(error)}</div> : null}
        {feedback ? <div className="alert alert-success">{feedback}</div> : null}

        {isLoading ? (
          <LoadingBlock label={language === "es" ? "Cargando tarea..." : "Loading task..."} />
        ) : (
          <div className="taskops-task-modal__body">
            <form className="taskops-form taskops-task-modal__form" onSubmit={handleSubmit}>
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
                    <option value="backlog">{getTaskStatusLabel("backlog", language)}</option>
                    <option value="todo">{getTaskStatusLabel("todo", language)}</option>
                    <option value="in_progress">{getTaskStatusLabel("in_progress", language)}</option>
                    <option value="blocked">{getTaskStatusLabel("blocked", language)}</option>
                    <option value="done">{getTaskStatusLabel("done", language)}</option>
                    <option value="cancelled">{getTaskStatusLabel("cancelled", language)}</option>
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
                      setForm((current) => ({
                        ...current,
                        opportunity_id: event.target.value ? Number(event.target.value) : null,
                      }))
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
                  <label className="form-label">{language === "es" ? "Agenda / OT" : "Agenda / work order"}</label>
                  <select
                    className="form-select"
                    value={form.work_order_id ?? ""}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, work_order_id: event.target.value ? Number(event.target.value) : null }))
                    }
                  >
                    <option value="">{language === "es" ? "Sin agenda" : "No agenda link"}</option>
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
                    disabled={!canAssignOthers}
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
                  {!canAssignOthers ? (
                    <div className="form-text">
                      {language === "es"
                        ? "Tu perfil actual solo permite crear o editar tareas propias."
                        : "Your current profile only allows creating or editing your own tasks."}
                    </div>
                  ) : null}
                </div>
                <div className="col-md-6">
                  <label className="form-label">{language === "es" ? "Grupo de trabajo" : "Work group"}</label>
                  <select
                    className="form-select"
                    value={form.assigned_work_group_id ?? ""}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        assigned_work_group_id: event.target.value ? Number(event.target.value) : null,
                      }))
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

              <div className="taskops-task-modal__actions">
                <button className="btn btn-primary" type="submit" disabled={isSubmitting}>
                  {taskId
                    ? language === "es"
                      ? "Guardar cambios"
                      : "Save changes"
                    : language === "es"
                      ? "Crear tarea"
                      : "Create task"}
                </button>
                {detail ? (
                  <>
                    <button
                      className="btn btn-outline-success"
                      type="button"
                      onClick={() => void handleStatus("done")}
                    >
                      {language === "es" ? "Cerrar tarea" : "Close task"}
                    </button>
                    <button
                      className="btn btn-outline-danger"
                      type="button"
                      onClick={() => void handleDelete()}
                    >
                      {language === "es" ? "Eliminar" : "Delete"}
                    </button>
                  </>
                ) : null}
              </div>
            </form>

            {detail ? (
              <div className="taskops-task-modal__detail">
                <div className="taskops-detail__summary">
                  <h3>{language === "es" ? "Detalle operativo" : "Operational detail"}</h3>
                  <div className="small">
                    {language === "es" ? "Creada" : "Created"}: {formatDateTime(detail.task.created_at, language)}
                  </div>
                  <div className="small">
                    {language === "es" ? "Actualizada" : "Updated"}: {formatDateTime(detail.task.updated_at, language)}
                  </div>
                  <div className="small">
                    {language === "es" ? "Agenda" : "Agenda"}:{" "}
                    {detail.task.agenda_linked
                      ? `${language === "es" ? "Ligada a mantención" : "Linked to maintenance"} · ${detail.task.work_order_title || "—"}`
                      : language === "es"
                        ? "Sin agenda"
                        : "No agenda link"}
                  </div>
                </div>

                <div className="d-flex flex-wrap gap-2 mb-3">
                  <button className="btn btn-outline-secondary btn-sm" type="button" onClick={() => void handleStatus("backlog")}>
                    {getTaskStatusLabel("backlog", language)}
                  </button>
                  <button className="btn btn-outline-secondary btn-sm" type="button" onClick={() => void handleStatus("todo")}>
                    {getTaskStatusLabel("todo", language)}
                  </button>
                  <button className="btn btn-outline-primary btn-sm" type="button" onClick={() => void handleStatus("in_progress")}>
                    {getTaskStatusLabel("in_progress", language)}
                  </button>
                  <button className="btn btn-outline-warning btn-sm" type="button" onClick={() => void handleStatus("blocked")}>
                    {getTaskStatusLabel("blocked", language)}
                  </button>
                  {detail.task.status === "done" || detail.task.status === "cancelled" ? (
                    <button className="btn btn-outline-secondary btn-sm" type="button" onClick={() => void handleStatus("todo")}>
                      {language === "es" ? "Reabrir" : "Reopen"}
                    </button>
                  ) : (
                    <button className="btn btn-outline-danger btn-sm" type="button" onClick={() => void handleStatus("cancelled")}>
                      {getTaskStatusLabel("cancelled", language)}
                    </button>
                  )}
                </div>

                <div className="taskops-detail__section">
                  <h4>{language === "es" ? "Comentarios" : "Comments"}</h4>
                  <div className="d-flex gap-2">
                    <input
                      className="form-control"
                      value={commentText}
                      onChange={(event) => setCommentText(event.target.value)}
                      placeholder={language === "es" ? "Agregar comentario..." : "Add comment..."}
                    />
                    <button className="btn btn-primary" type="button" onClick={() => void handleCreateComment()}>
                      {language === "es" ? "Agregar" : "Add"}
                    </button>
                  </div>
                  <div className="taskops-detail__stack">
                    {detail.comments.map((item) => (
                      <div className="taskops-detail__item" key={item.id}>
                        <div>
                          <strong>{item.created_by_display_name || "—"}</strong>
                          <div className="small text-muted">{formatDateTime(item.created_at, language)}</div>
                          <div className="small">{item.comment}</div>
                        </div>
                        <button className="btn btn-outline-danger btn-sm" type="button" onClick={() => void handleDeleteComment(item.id)}>
                          {language === "es" ? "Borrar" : "Delete"}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="taskops-detail__section">
                  <h4>{language === "es" ? "Adjuntos" : "Attachments"}</h4>
                  <div className="row g-2">
                    <div className="col-12">
                      <input
                        type="file"
                        className="form-control"
                        onChange={(event) => setAttachmentFile(event.target.files?.[0] || null)}
                      />
                    </div>
                    <div className="col-md-8">
                      <input
                        className="form-control"
                        value={attachmentNotes}
                        onChange={(event) => setAttachmentNotes(event.target.value)}
                        placeholder={language === "es" ? "Notas del adjunto" : "Attachment notes"}
                      />
                    </div>
                    <div className="col-md-4 d-grid">
                      <button className="btn btn-outline-primary" type="button" onClick={() => void handleUploadAttachment()}>
                        {language === "es" ? "Subir archivo" : "Upload file"}
                      </button>
                    </div>
                  </div>
                  <div className="taskops-detail__stack">
                    {detail.attachments.map((item) => (
                      <div className="taskops-detail__item" key={item.id}>
                        <div>
                          <strong>{item.file_name}</strong>
                          <div className="small text-muted">{item.notes || "—"}</div>
                        </div>
                        <div className="d-flex gap-2">
                          <button className="btn btn-outline-secondary btn-sm" type="button" onClick={() => void handleDownloadAttachment(item.id)}>
                            {language === "es" ? "Descargar" : "Download"}
                          </button>
                          <button className="btn btn-outline-danger btn-sm" type="button" onClick={() => void handleDeleteAttachment(item.id)}>
                            {language === "es" ? "Borrar" : "Delete"}
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
                            {formatDateTime(item.created_at, language)} · {item.created_by_display_name || "—"}
                          </div>
                          <div className="small">
                            {item.from_status || "—"} → {item.to_status || "—"}
                          </div>
                          {item.notes ? <div className="small">{item.notes}</div> : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
