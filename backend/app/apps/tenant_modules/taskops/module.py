from dataclasses import dataclass


@dataclass(frozen=True)
class TaskOpsModuleDefinition:
    key: str
    name: str
    route_prefix: str
    tenant_portal_base_path: str
    description: str


TASKOPS_MODULE = TaskOpsModuleDefinition(
    key="taskops",
    name="TaskOps",
    route_prefix="/tenant/taskops",
    tenant_portal_base_path="/tenant-portal/taskops",
    description=(
        "Módulo tenant para tareas internas con kanban, comentarios, adjuntos e histórico."
    ),
)
