from app.apps.tenant_modules.taskops.services.task_service import TaskOpsTaskService


class TaskOpsOverviewService:
    def __init__(self, task_service: TaskOpsTaskService | None = None) -> None:
        self.task_service = task_service or TaskOpsTaskService()

    def build_overview(self, tenant_db) -> dict[str, int]:
        return self.task_service.build_overview_metrics(tenant_db)
