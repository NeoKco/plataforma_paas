from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.apps.tenant_modules.taskops.api.serializers import build_task_item
from app.apps.tenant_modules.taskops.dependencies import (
    build_taskops_requested_by,
    require_taskops_read,
)
from app.apps.tenant_modules.taskops.schemas import (
    TaskOpsModuleOverviewResponse,
    TaskOpsOverviewMetricsResponse,
)
from app.apps.tenant_modules.taskops.services import TaskOpsOverviewService, TaskOpsTaskService
from app.common.db.session_manager import get_tenant_db

router = APIRouter(prefix="/tenant/taskops", tags=["Tenant TaskOps"])
overview_service = TaskOpsOverviewService()
task_service = TaskOpsTaskService()


@router.get("/overview", response_model=TaskOpsModuleOverviewResponse)
def get_taskops_module_overview(
    current_user=Depends(require_taskops_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> TaskOpsModuleOverviewResponse:
    viewer_can_manage_all = task_service.can_manage_all_tasks(current_user)
    recent_tasks = task_service.list_tasks(
        tenant_db,
        include_inactive=False,
        include_closed=False,
        viewer_user_id=current_user["user_id"],
        viewer_can_manage_all=viewer_can_manage_all,
    )[:5]
    recent_history = task_service.list_history(
        tenant_db,
        viewer_user_id=current_user["user_id"],
        viewer_can_manage_all=viewer_can_manage_all,
    )[:5]
    maps = task_service.get_reference_maps(tenant_db, recent_tasks + recent_history)
    metrics = overview_service.build_overview(
        tenant_db,
        viewer_user_id=current_user["user_id"],
        viewer_can_manage_all=viewer_can_manage_all,
    )
    return TaskOpsModuleOverviewResponse(
        success=True,
        message="Resumen TaskOps recuperado correctamente",
        requested_by=build_taskops_requested_by(current_user),
        metrics=TaskOpsOverviewMetricsResponse(**metrics),
        recent_tasks=[build_task_item(item, maps=maps) for item in recent_tasks],
        recent_history=[build_task_item(item, maps=maps) for item in recent_history],
    )
