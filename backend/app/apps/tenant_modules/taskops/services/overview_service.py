from app.apps.tenant_modules.taskops.services.task_service import TaskOpsTaskService


class TaskOpsOverviewService:
    def __init__(self, task_service: TaskOpsTaskService | None = None) -> None:
        self.task_service = task_service or TaskOpsTaskService()

    def build_overview(
        self,
        tenant_db,
        *,
        viewer_user_id: int | None = None,
        viewer_can_manage_all: bool = True,
    ) -> dict[str, int]:
        return self.task_service.build_overview_metrics(
            tenant_db,
            viewer_user_id=viewer_user_id,
            viewer_can_manage_all=viewer_can_manage_all,
        )
