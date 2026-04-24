from datetime import datetime

from pydantic import BaseModel, Field

from app.apps.tenant_modules.core.schemas import TenantUserContextResponse


class TaskOpsStatusUpdateRequest(BaseModel):
    status: str
    notes: str | None = None


class TaskOpsActiveStatusRequest(BaseModel):
    is_active: bool


class TaskOpsTaskCreateRequest(BaseModel):
    client_id: int | None = None
    opportunity_id: int | None = None
    work_order_id: int | None = None
    assigned_user_id: int | None = None
    assigned_work_group_id: int | None = None
    title: str
    description: str | None = None
    status: str = "backlog"
    priority: str = "normal"
    due_at: datetime | None = None
    is_active: bool = True
    sort_order: int = 100


class TaskOpsTaskUpdateRequest(TaskOpsTaskCreateRequest):
    pass


class TaskOpsCommentWriteRequest(BaseModel):
    comment: str


class TaskOpsTaskCommentItemResponse(BaseModel):
    id: int
    task_id: int
    comment: str
    created_by_user_id: int | None = None
    created_by_display_name: str | None = None
    created_at: datetime | None = None

    class Config:
        from_attributes = True


class TaskOpsTaskAttachmentItemResponse(BaseModel):
    id: int
    task_id: int
    file_name: str
    content_type: str | None = None
    file_size: int
    notes: str | None = None
    uploaded_by_user_id: int | None = None
    uploaded_by_display_name: str | None = None
    created_at: datetime | None = None

    class Config:
        from_attributes = True


class TaskOpsTaskStatusEventItemResponse(BaseModel):
    id: int
    task_id: int
    event_type: str
    from_status: str | None = None
    to_status: str | None = None
    summary: str | None = None
    notes: str | None = None
    created_by_user_id: int | None = None
    created_by_display_name: str | None = None
    created_at: datetime | None = None

    class Config:
        from_attributes = True


class TaskOpsTaskItemResponse(BaseModel):
    id: int
    client_id: int | None = None
    client_display_name: str | None = None
    opportunity_id: int | None = None
    opportunity_title: str | None = None
    work_order_id: int | None = None
    work_order_title: str | None = None
    assigned_user_id: int | None = None
    assigned_user_display_name: str | None = None
    assigned_work_group_id: int | None = None
    assigned_work_group_name: str | None = None
    title: str
    description: str | None = None
    status: str
    priority: str
    due_at: datetime | None = None
    started_at: datetime | None = None
    completed_at: datetime | None = None
    created_by_user_id: int | None = None
    updated_by_user_id: int | None = None
    is_active: bool
    sort_order: int
    created_at: datetime | None = None
    updated_at: datetime | None = None

    class Config:
        from_attributes = True


class TaskOpsTaskDetailItemResponse(BaseModel):
    task: TaskOpsTaskItemResponse
    comments: list[TaskOpsTaskCommentItemResponse]
    attachments: list[TaskOpsTaskAttachmentItemResponse]
    status_events: list[TaskOpsTaskStatusEventItemResponse]


class TaskOpsTaskMutationResponse(BaseModel):
    success: bool
    message: str
    requested_by: TenantUserContextResponse
    data: TaskOpsTaskItemResponse


class TaskOpsTaskDetailResponse(BaseModel):
    success: bool
    message: str
    requested_by: TenantUserContextResponse
    data: TaskOpsTaskDetailItemResponse


class TaskOpsSubresourceMutationResponse(BaseModel):
    success: bool
    message: str
    requested_by: TenantUserContextResponse
    detail: TaskOpsTaskDetailItemResponse


class TaskOpsTasksResponse(BaseModel):
    success: bool
    message: str
    requested_by: TenantUserContextResponse
    total: int
    data: list[TaskOpsTaskItemResponse]


class TaskOpsKanbanColumnResponse(BaseModel):
    status: str
    total: int
    items: list[TaskOpsTaskItemResponse]


class TaskOpsKanbanResponse(BaseModel):
    success: bool
    message: str
    requested_by: TenantUserContextResponse
    columns: list[TaskOpsKanbanColumnResponse]


class TaskOpsOverviewMetricsResponse(BaseModel):
    open_total: int
    in_progress_total: int
    blocked_total: int
    due_soon_total: int
    closed_total: int


class TaskOpsModuleOverviewResponse(BaseModel):
    success: bool
    message: str
    requested_by: TenantUserContextResponse
    metrics: TaskOpsOverviewMetricsResponse
    recent_tasks: list[TaskOpsTaskItemResponse]
    recent_history: list[TaskOpsTaskItemResponse]

