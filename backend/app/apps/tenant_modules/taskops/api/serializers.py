from app.apps.tenant_modules.taskops.schemas import (
    TaskOpsTaskAttachmentItemResponse,
    TaskOpsTaskCommentItemResponse,
    TaskOpsTaskItemResponse,
    TaskOpsTaskStatusEventItemResponse,
)


def build_task_item(item, *, maps: dict[str, dict[int, str]] | None = None) -> TaskOpsTaskItemResponse:
    maps = maps or {}
    return TaskOpsTaskItemResponse(
        id=item.id,
        client_id=item.client_id,
        client_display_name=maps.get("clients", {}).get(item.client_id),
        opportunity_id=item.opportunity_id,
        opportunity_title=maps.get("opportunities", {}).get(item.opportunity_id),
        work_order_id=item.work_order_id,
        work_order_title=maps.get("work_orders", {}).get(item.work_order_id),
        assigned_user_id=item.assigned_user_id,
        assigned_user_display_name=maps.get("users", {}).get(item.assigned_user_id),
        assigned_work_group_id=item.assigned_work_group_id,
        assigned_work_group_name=maps.get("work_groups", {}).get(item.assigned_work_group_id),
        title=item.title,
        description=item.description,
        status=item.status,
        priority=item.priority,
        due_at=item.due_at,
        started_at=item.started_at,
        completed_at=item.completed_at,
        created_by_user_id=item.created_by_user_id,
        updated_by_user_id=item.updated_by_user_id,
        is_active=item.is_active,
        sort_order=item.sort_order,
        created_at=item.created_at,
        updated_at=item.updated_at,
    )


def build_comment_item(item, *, user_display_map: dict[int, str] | None = None) -> TaskOpsTaskCommentItemResponse:
    user_display_map = user_display_map or {}
    return TaskOpsTaskCommentItemResponse(
        id=item.id,
        task_id=item.task_id,
        comment=item.comment,
        created_by_user_id=item.created_by_user_id,
        created_by_display_name=user_display_map.get(item.created_by_user_id),
        created_at=item.created_at,
    )


def build_attachment_item(
    item,
    *,
    user_display_map: dict[int, str] | None = None,
) -> TaskOpsTaskAttachmentItemResponse:
    user_display_map = user_display_map or {}
    return TaskOpsTaskAttachmentItemResponse(
        id=item.id,
        task_id=item.task_id,
        file_name=item.file_name,
        content_type=item.content_type,
        file_size=item.file_size,
        notes=item.notes,
        uploaded_by_user_id=item.uploaded_by_user_id,
        uploaded_by_display_name=user_display_map.get(item.uploaded_by_user_id),
        created_at=item.created_at,
    )


def build_status_event_item(
    item,
    *,
    user_display_map: dict[int, str] | None = None,
) -> TaskOpsTaskStatusEventItemResponse:
    user_display_map = user_display_map or {}
    return TaskOpsTaskStatusEventItemResponse(
        id=item.id,
        task_id=item.task_id,
        event_type=item.event_type,
        from_status=item.from_status,
        to_status=item.to_status,
        summary=item.summary,
        notes=item.notes,
        created_by_user_id=item.created_by_user_id,
        created_by_display_name=user_display_map.get(item.created_by_user_id),
        created_at=item.created_at,
    )
