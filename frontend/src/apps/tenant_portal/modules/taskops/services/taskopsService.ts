import { apiDownload, apiRequest } from "../../../../../services/api";

export type TaskOpsRequestedBy = {
  user_id: number;
  email: string;
  role: string;
  tenant_slug: string;
  token_scope: string;
};

export type TaskOpsTask = {
  id: number;
  client_id: number | null;
  client_display_name: string | null;
  opportunity_id: number | null;
  opportunity_title: string | null;
  work_order_id: number | null;
  work_order_title: string | null;
  assigned_user_id: number | null;
  assigned_user_display_name: string | null;
  assigned_work_group_id: number | null;
  assigned_work_group_name: string | null;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_by_user_id: number | null;
  updated_by_user_id: number | null;
  is_active: boolean;
  sort_order: number;
  created_at: string | null;
  updated_at: string | null;
};

export type TaskOpsTaskWriteRequest = {
  client_id: number | null;
  opportunity_id: number | null;
  work_order_id: number | null;
  assigned_user_id: number | null;
  assigned_work_group_id: number | null;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_at: string | null;
  is_active: boolean;
  sort_order: number;
};

export type TaskOpsTaskComment = {
  id: number;
  task_id: number;
  comment: string;
  created_by_user_id: number | null;
  created_by_display_name: string | null;
  created_at: string | null;
};

export type TaskOpsTaskAttachment = {
  id: number;
  task_id: number;
  file_name: string;
  content_type: string | null;
  file_size: number;
  notes: string | null;
  uploaded_by_user_id: number | null;
  uploaded_by_display_name: string | null;
  created_at: string | null;
};

export type TaskOpsTaskStatusEvent = {
  id: number;
  task_id: number;
  event_type: string;
  from_status: string | null;
  to_status: string | null;
  summary: string | null;
  notes: string | null;
  created_by_user_id: number | null;
  created_by_display_name: string | null;
  created_at: string | null;
};

export type TaskOpsTaskDetail = {
  task: TaskOpsTask;
  comments: TaskOpsTaskComment[];
  attachments: TaskOpsTaskAttachment[];
  status_events: TaskOpsTaskStatusEvent[];
};

export type TaskOpsKanbanColumn = {
  status: string;
  total: number;
  items: TaskOpsTask[];
};

type TaskOpsTasksResponse = {
  success: boolean;
  message: string;
  requested_by: TaskOpsRequestedBy;
  total: number;
  data: TaskOpsTask[];
};

type TaskOpsTaskMutationResponse = {
  success: boolean;
  message: string;
  requested_by: TaskOpsRequestedBy;
  data: TaskOpsTask;
};

type TaskOpsTaskDetailResponse = {
  success: boolean;
  message: string;
  requested_by: TaskOpsRequestedBy;
  data: TaskOpsTaskDetail;
};

type TaskOpsSubresourceMutationResponse = {
  success: boolean;
  message: string;
  requested_by: TaskOpsRequestedBy;
  detail: TaskOpsTaskDetail;
};

type TaskOpsKanbanResponse = {
  success: boolean;
  message: string;
  requested_by: TaskOpsRequestedBy;
  columns: TaskOpsKanbanColumn[];
};

export type TaskOpsOverviewResponse = {
  success: boolean;
  message: string;
  requested_by: TaskOpsRequestedBy;
  metrics: {
    open_total: number;
    in_progress_total: number;
    blocked_total: number;
    due_soon_total: number;
    closed_total: number;
  };
  recent_tasks: TaskOpsTask[];
  recent_history: TaskOpsTask[];
};

export function getTaskOpsOverview(accessToken: string) {
  return apiRequest<TaskOpsOverviewResponse>("/tenant/taskops/overview", {
    token: accessToken,
  });
}

export function getTaskOpsTasks(
  accessToken: string,
  options: {
    includeInactive?: boolean;
    includeClosed?: boolean;
    status?: string;
    assignedUserId?: number;
    clientId?: number;
    q?: string;
  } = {}
) {
  const params = new URLSearchParams();
  params.set("include_inactive", options.includeInactive === false ? "false" : "true");
  params.set("include_closed", options.includeClosed === false ? "false" : "true");
  if (options.status) params.set("status", options.status);
  if (options.assignedUserId !== undefined) params.set("assigned_user_id", String(options.assignedUserId));
  if (options.clientId !== undefined) params.set("client_id", String(options.clientId));
  if (options.q?.trim()) params.set("q", options.q.trim());
  return apiRequest<TaskOpsTasksResponse>(`/tenant/taskops/tasks?${params.toString()}`, {
    token: accessToken,
  });
}

export function getTaskOpsKanban(accessToken: string, includeInactive = false) {
  const params = new URLSearchParams();
  if (includeInactive) params.set("include_inactive", "true");
  return apiRequest<TaskOpsKanbanResponse>(`/tenant/taskops/tasks/kanban?${params.toString()}`, {
    token: accessToken,
  });
}

export function getTaskOpsHistory(accessToken: string, q?: string) {
  const params = new URLSearchParams();
  if (q?.trim()) params.set("q", q.trim());
  return apiRequest<TaskOpsTasksResponse>(`/tenant/taskops/tasks/history?${params.toString()}`, {
    token: accessToken,
  });
}

export function getTaskOpsTaskDetail(accessToken: string, taskId: number) {
  return apiRequest<TaskOpsTaskDetailResponse>(`/tenant/taskops/tasks/${taskId}/detail`, {
    token: accessToken,
  });
}

export function createTaskOpsTask(accessToken: string, payload: TaskOpsTaskWriteRequest) {
  return apiRequest<TaskOpsTaskMutationResponse>("/tenant/taskops/tasks", {
    method: "POST",
    token: accessToken,
    body: payload,
  });
}

export function updateTaskOpsTask(
  accessToken: string,
  taskId: number,
  payload: TaskOpsTaskWriteRequest
) {
  return apiRequest<TaskOpsTaskMutationResponse>(`/tenant/taskops/tasks/${taskId}`, {
    method: "PUT",
    token: accessToken,
    body: payload,
  });
}

export function updateTaskOpsTaskStatus(
  accessToken: string,
  taskId: number,
  status: string,
  notes?: string | null
) {
  return apiRequest<TaskOpsTaskMutationResponse>(`/tenant/taskops/tasks/${taskId}/status`, {
    method: "PATCH",
    token: accessToken,
    body: { status, notes: notes || null },
  });
}

export function updateTaskOpsTaskActive(accessToken: string, taskId: number, isActive: boolean) {
  return apiRequest<TaskOpsTaskMutationResponse>(`/tenant/taskops/tasks/${taskId}/active`, {
    method: "PATCH",
    token: accessToken,
    body: { is_active: isActive },
  });
}

export function deleteTaskOpsTask(accessToken: string, taskId: number) {
  return apiRequest<TaskOpsTaskMutationResponse>(`/tenant/taskops/tasks/${taskId}`, {
    method: "DELETE",
    token: accessToken,
  });
}

export function createTaskOpsTaskComment(accessToken: string, taskId: number, comment: string) {
  return apiRequest<TaskOpsSubresourceMutationResponse>(`/tenant/taskops/tasks/${taskId}/comments`, {
    method: "POST",
    token: accessToken,
    body: { comment },
  });
}

export function deleteTaskOpsTaskComment(accessToken: string, taskId: number, commentId: number) {
  return apiRequest<TaskOpsSubresourceMutationResponse>(
    `/tenant/taskops/tasks/${taskId}/comments/${commentId}`,
    {
      method: "DELETE",
      token: accessToken,
    }
  );
}

export function uploadTaskOpsTaskAttachment(
  accessToken: string,
  taskId: number,
  file: File,
  notes?: string
) {
  const body = new FormData();
  body.append("file", file);
  if (notes?.trim()) body.append("notes", notes.trim());
  return apiRequest<TaskOpsSubresourceMutationResponse>(`/tenant/taskops/tasks/${taskId}/attachments`, {
    method: "POST",
    token: accessToken,
    body,
  });
}

export function deleteTaskOpsTaskAttachment(accessToken: string, taskId: number, attachmentId: number) {
  return apiRequest<TaskOpsSubresourceMutationResponse>(
    `/tenant/taskops/tasks/${taskId}/attachments/${attachmentId}`,
    {
      method: "DELETE",
      token: accessToken,
    }
  );
}

export function downloadTaskOpsTaskAttachment(accessToken: string, taskId: number, attachmentId: number) {
  return apiDownload(`/tenant/taskops/tasks/${taskId}/attachments/${attachmentId}/download`, {
    token: accessToken,
  });
}
