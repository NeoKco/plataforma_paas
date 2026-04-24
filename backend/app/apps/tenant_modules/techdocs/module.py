from dataclasses import dataclass


@dataclass(frozen=True)
class TechDocsModuleDefinition:
    key: str
    name: str
    route_prefix: str
    tenant_portal_base_path: str
    description: str


TECHDOCS_MODULE = TechDocsModuleDefinition(
    key="techdocs",
    name="Expediente técnico",
    route_prefix="/tenant/techdocs",
    tenant_portal_base_path="/tenant-portal/techdocs",
    description=(
        "Módulo tenant para expediente técnico, evidencias, mediciones y auditoría reusable."
    ),
)
