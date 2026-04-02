from dataclasses import dataclass


@dataclass(frozen=True)
class MaintenanceModuleDefinition:
    key: str
    name: str
    route_prefix: str
    tenant_portal_base_path: str
    description: str


MAINTENANCE_MODULE = MaintenanceModuleDefinition(
    key="maintenance",
    name="Maintenance",
    route_prefix="/tenant/maintenance",
    tenant_portal_base_path="/tenant-portal/maintenance",
    description=(
        "Modulo de mantenciones tecnicas e instalaciones por cliente. "
        "Se abre como segundo vertical slice tenant priorizado del SaaS."
    ),
)
