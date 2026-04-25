from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.apps.tenant_modules.taskops.api.serializers import (
    build_attachment_item,
    build_comment_item,
    build_status_event_item,
    build_task_item,
)
from app.apps.tenant_modules.taskops.dependencies import (
    build_taskops_requested_by,
    require_taskops_create_own,
    require_taskops_manage,
    require_taskops_read,
)
from app.apps.tenant_modules.taskops.schemas import (
    TaskOpsActiveStatusRequest,
    TaskOpsCommentWriteRequest,
    TaskOpsKanbanColumnResponse,
    TaskOpsKanbanResponse,
    TaskOpsStatusUpdateRequest,
    TaskOpsSubresourceMutationResponse,
    TaskOpsTaskCreateRequest,
    TaskOpsTaskDetailItemResponse,
    TaskOpsTaskDetailResponse,
    TaskOpsTaskMutationResponse,
    TaskOpsTaskUpdateRequest,
    TaskOpsTasksResponse,
)
from app.apps.tenant_modules.taskops.services import TaskOpsTaskService
from app.common.db.session_manager import get_tenant_db

router = APIRouter(prefix="/tenant/taskops/tasks", tags=["Tenant TaskOps"])
service = TaskOpsTaskService()


def _actor_can_manage_all(current_user: dict) -> bool:
    return service.can_manage_all_tasks(current_user)


def _actor_can_assign_others(current_user: dict) -> bool:
    return service.can_assign_tasks_to_others(current_user)


def _build_detail(tenant_db, detail: dict) -> TaskOpsTaskDetailItemResponse:
    task = detail["task"]
    maps = service.get_reference_maps(tenant_db, [task])
    user_display_map = maps["users"]
    return TaskOpsTaskDetailItemResponse(
        task=build_task_item(task, maps=maps),
        comments=[build_comment_item(item, user_display_map=user_display_map) for item in detail["comments"]],
        attachments=[
            build_attachment_item(item, user_display_map=user_display_map)
            for item in detail["attachments"]
        ],
        status_events=[
            build_status_event_item(item, user_display_map=user_display_map)
            for item in detail["status_events"]
        ],
    )


@router.get("", response_model=TaskOpsTasksResponse)
def list_taskops_tasks(
    include_inactive: bool = True,
    include_closed: bool = True,
    status: str | None = None,
    assigned_user_id: int | None = None,
    client_id: int | None = None,
    q: str | None = None,
    current_user=Depends(require_taskops_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> TaskOpsTasksResponse:
    try:
        rows = service.list_tasks(
        tenant_db,
        include_inactive=include_inactive,
        include_closed=include_closed,
        status=status,
        assigned_user_id=assigned_user_id,
        client_id=client_id,
        q=q,
        viewer_user_id=current_user["user_id"],
        viewer_can_manage_all=_actor_can_manage_all(current_user),
    )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    maps = service.get_reference_maps(tenant_db, rows)
    return TaskOpsTasksResponse(
        success=True,
        message="Tareas recuperadas correctamente",
        requested_by=build_taskops_requested_by(current_user),
        total=len(rows),
        data=[build_task_item(item, maps=maps) for item in rows],
    )


@router.get("/kanban", response_model=TaskOpsKanbanResponse)
def get_taskops_kanban(
    include_inactive: bool = False,
    current_user=Depends(require_taskops_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> TaskOpsKanbanResponse:
    columns = service.list_kanban_columns(
        tenant_db,
        include_inactive=include_inactive,
    )
    if not _actor_can_manage_all(current_user):
        columns = [
            {
                **column,
                "items": [
                    item
                    for item in column["items"]
                    if item.assigned_user_id == current_user["user_id"]
                    or item.created_by_user_id == current_user["user_id"]
                ],
                "total": len(
                    [
                        item
                        for item in column["items"]
                        if item.assigned_user_id == current_user["user_id"]
                        or item.created_by_user_id == current_user["user_id"]
                    ]
                ),
            }
            for column in columns
        ]
    maps = service.get_reference_maps(
        tenant_db,
        [item for column in columns for item in column["items"]],
    )
    return TaskOpsKanbanResponse(
        success=True,
        message="Kanban TaskOps recuperado correctamente",
        requested_by=build_taskops_requested_by(current_user),
        columns=[
            TaskOpsKanbanColumnResponse(
                status=column["status"],
                total=column["total"],
                items=[build_task_item(item, maps=maps) for item in column["items"]],
            )
            for column in columns
        ],
    )


@router.get("/history", response_model=TaskOpsTasksResponse)
def list_taskops_history(
    q: str | None = None,
    current_user=Depends(require_taskops_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> TaskOpsTasksResponse:
    rows = service.list_history(
        tenant_db,
        q=q,
        viewer_user_id=current_user["user_id"],
        viewer_can_manage_all=_actor_can_manage_all(current_user),
    )
    maps = service.get_reference_maps(tenant_db, rows)
    return TaskOpsTasksResponse(
        success=True,
        message="Histórico TaskOps recuperado correctamente",
        requested_by=build_taskops_requested_by(current_user),
        total=len(rows),
        data=[build_task_item(item, maps=maps) for item in rows],
    )


@router.post("", response_model=TaskOpsTaskMutationResponse)
def create_taskops_task(
    payload: TaskOpsTaskCreateRequest,
    current_user=Depends(require_taskops_create_own),
    tenant_db: Session = Depends(get_tenant_db),
) -> TaskOpsTaskMutationResponse:
    try:
        item = service.create_task(
            tenant_db,
            payload,
            actor_user_id=current_user["user_id"],
            actor_can_assign_others=_actor_can_assign_others(current_user),
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    maps = service.get_reference_maps(tenant_db, [item])
    return TaskOpsTaskMutationResponse(
        success=True,
        message="Tarea creada correctamente",
        requested_by=build_taskops_requested_by(current_user),
        data=build_task_item(item, maps=maps),
    )


@router.get("/{task_id}", response_model=TaskOpsTaskMutationResponse)
def get_taskops_task(
    task_id: int,
    current_user=Depends(require_taskops_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> TaskOpsTaskMutationResponse:
    try:
        item = service.get_task(
            tenant_db,
            task_id,
            actor_user_id=current_user["user_id"],
            actor_can_manage_all=_actor_can_manage_all(current_user),
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    maps = service.get_reference_maps(tenant_db, [item])
    return TaskOpsTaskMutationResponse(
        success=True,
        message="Tarea recuperada correctamente",
        requested_by=build_taskops_requested_by(current_user),
        data=build_task_item(item, maps=maps),
    )


@router.get("/{task_id}/detail", response_model=TaskOpsTaskDetailResponse)
def get_taskops_task_detail(
    task_id: int,
    current_user=Depends(require_taskops_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> TaskOpsTaskDetailResponse:
    try:
        detail = service.get_task_detail(
            tenant_db,
            task_id,
            actor_user_id=current_user["user_id"],
            actor_can_manage_all=_actor_can_manage_all(current_user),
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return TaskOpsTaskDetailResponse(
        success=True,
        message="Detalle TaskOps recuperado correctamente",
        requested_by=build_taskops_requested_by(current_user),
        data=_build_detail(tenant_db, detail),
    )


@router.put("/{task_id}", response_model=TaskOpsTaskMutationResponse)
def update_taskops_task(
    task_id: int,
    payload: TaskOpsTaskUpdateRequest,
    current_user=Depends(require_taskops_create_own),
    tenant_db: Session = Depends(get_tenant_db),
) -> TaskOpsTaskMutationResponse:
    try:
        item = service.update_task(
            tenant_db,
            task_id,
            payload,
            actor_user_id=current_user["user_id"],
            actor_can_manage_all=_actor_can_manage_all(current_user),
            actor_can_assign_others=_actor_can_assign_others(current_user),
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    maps = service.get_reference_maps(tenant_db, [item])
    return TaskOpsTaskMutationResponse(
        success=True,
        message="Tarea actualizada correctamente",
        requested_by=build_taskops_requested_by(current_user),
        data=build_task_item(item, maps=maps),
    )


@router.patch("/{task_id}/status", response_model=TaskOpsTaskMutationResponse)
def update_taskops_task_status(
    task_id: int,
    payload: TaskOpsStatusUpdateRequest,
    current_user=Depends(require_taskops_create_own),
    tenant_db: Session = Depends(get_tenant_db),
) -> TaskOpsTaskMutationResponse:
    try:
        item = service.set_task_status(
            tenant_db,
            task_id,
            payload.status,
            notes=payload.notes,
            actor_user_id=current_user["user_id"],
            actor_can_manage_all=_actor_can_manage_all(current_user),
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    maps = service.get_reference_maps(tenant_db, [item])
    return TaskOpsTaskMutationResponse(
        success=True,
        message="Estado de la tarea actualizado correctamente",
        requested_by=build_taskops_requested_by(current_user),
        data=build_task_item(item, maps=maps),
    )


@router.patch("/{task_id}/active", response_model=TaskOpsTaskMutationResponse)
def update_taskops_task_active(
    task_id: int,
    payload: TaskOpsActiveStatusRequest,
    current_user=Depends(require_taskops_create_own),
    tenant_db: Session = Depends(get_tenant_db),
) -> TaskOpsTaskMutationResponse:
    try:
        item = service.set_task_active(
            tenant_db,
            task_id,
            payload.is_active,
            actor_user_id=current_user["user_id"],
            actor_can_manage_all=_actor_can_manage_all(current_user),
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    maps = service.get_reference_maps(tenant_db, [item])
    return TaskOpsTaskMutationResponse(
        success=True,
        message="Estado operativo de la tarea actualizado correctamente",
        requested_by=build_taskops_requested_by(current_user),
        data=build_task_item(item, maps=maps),
    )


@router.delete("/{task_id}", response_model=TaskOpsTaskMutationResponse)
def delete_taskops_task(
    task_id: int,
    current_user=Depends(require_taskops_create_own),
    tenant_db: Session = Depends(get_tenant_db),
) -> TaskOpsTaskMutationResponse:
    try:
        item = service.delete_task(
            tenant_db,
            task_id,
            actor_user_id=current_user["user_id"],
            actor_can_manage_all=_actor_can_manage_all(current_user),
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    maps = service.get_reference_maps(tenant_db, [item])
    return TaskOpsTaskMutationResponse(
        success=True,
        message="Tarea eliminada correctamente",
        requested_by=build_taskops_requested_by(current_user),
        data=build_task_item(item, maps=maps),
    )


@router.post("/{task_id}/comments", response_model=TaskOpsSubresourceMutationResponse)
def create_taskops_task_comment(
    task_id: int,
    payload: TaskOpsCommentWriteRequest,
    current_user=Depends(require_taskops_create_own),
    tenant_db: Session = Depends(get_tenant_db),
) -> TaskOpsSubresourceMutationResponse:
    try:
        service.create_comment(
            tenant_db,
            task_id,
            payload,
            actor_user_id=current_user["user_id"],
            actor_can_manage_all=_actor_can_manage_all(current_user),
        )
        detail = service.get_task_detail(
            tenant_db,
            task_id,
            actor_user_id=current_user["user_id"],
            actor_can_manage_all=_actor_can_manage_all(current_user),
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return TaskOpsSubresourceMutationResponse(
        success=True,
        message="Comentario agregado correctamente",
        requested_by=build_taskops_requested_by(current_user),
        detail=_build_detail(tenant_db, detail),
    )


@router.delete("/{task_id}/comments/{comment_id}", response_model=TaskOpsSubresourceMutationResponse)
def delete_taskops_task_comment(
    task_id: int,
    comment_id: int,
    current_user=Depends(require_taskops_create_own),
    tenant_db: Session = Depends(get_tenant_db),
) -> TaskOpsSubresourceMutationResponse:
    try:
        service.delete_comment(
            tenant_db,
            task_id,
            comment_id,
            actor_user_id=current_user["user_id"],
            actor_can_manage_all=_actor_can_manage_all(current_user),
        )
        detail = service.get_task_detail(
            tenant_db,
            task_id,
            actor_user_id=current_user["user_id"],
            actor_can_manage_all=_actor_can_manage_all(current_user),
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return TaskOpsSubresourceMutationResponse(
        success=True,
        message="Comentario eliminado correctamente",
        requested_by=build_taskops_requested_by(current_user),
        detail=_build_detail(tenant_db, detail),
    )


@router.post("/{task_id}/attachments", response_model=TaskOpsSubresourceMutationResponse)
async def create_taskops_task_attachment(
    task_id: int,
    file: UploadFile = File(...),
    notes: str | None = Form(default=None),
    current_user=Depends(require_taskops_create_own),
    tenant_db: Session = Depends(get_tenant_db),
) -> TaskOpsSubresourceMutationResponse:
    try:
        content_bytes = await file.read()
        service.create_attachment(
            tenant_db,
            task_id,
            file_name=file.filename or "taskops-attachment",
            content_type=file.content_type,
            content_bytes=content_bytes,
            notes=notes,
            actor_user_id=current_user["user_id"],
            actor_can_manage_all=_actor_can_manage_all(current_user),
        )
        detail = service.get_task_detail(
            tenant_db,
            task_id,
            actor_user_id=current_user["user_id"],
            actor_can_manage_all=_actor_can_manage_all(current_user),
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return TaskOpsSubresourceMutationResponse(
        success=True,
        message="Adjunto agregado correctamente",
        requested_by=build_taskops_requested_by(current_user),
        detail=_build_detail(tenant_db, detail),
    )


@router.delete("/{task_id}/attachments/{attachment_id}", response_model=TaskOpsSubresourceMutationResponse)
def delete_taskops_task_attachment(
    task_id: int,
    attachment_id: int,
    current_user=Depends(require_taskops_create_own),
    tenant_db: Session = Depends(get_tenant_db),
) -> TaskOpsSubresourceMutationResponse:
    try:
        service.delete_attachment(
            tenant_db,
            task_id,
            attachment_id,
            actor_user_id=current_user["user_id"],
            actor_can_manage_all=_actor_can_manage_all(current_user),
        )
        detail = service.get_task_detail(
            tenant_db,
            task_id,
            actor_user_id=current_user["user_id"],
            actor_can_manage_all=_actor_can_manage_all(current_user),
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return TaskOpsSubresourceMutationResponse(
        success=True,
        message="Adjunto eliminado correctamente",
        requested_by=build_taskops_requested_by(current_user),
        detail=_build_detail(tenant_db, detail),
    )


@router.get("/{task_id}/attachments/{attachment_id}/download")
def download_taskops_task_attachment(
    task_id: int,
    attachment_id: int,
    current_user=Depends(require_taskops_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> FileResponse:
    try:
        item, absolute_path = service.get_attachment_file(
            tenant_db,
            task_id,
            attachment_id,
            actor_user_id=current_user["user_id"],
            actor_can_manage_all=_actor_can_manage_all(current_user),
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    media_type = item.content_type or "application/octet-stream"
    return FileResponse(
        path=absolute_path,
        filename=item.file_name,
        media_type=media_type,
    )
