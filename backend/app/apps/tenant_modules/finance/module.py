from dataclasses import dataclass


@dataclass(frozen=True)
class FinanceModuleDefinition:
    key: str
    name: str
    route_prefix: str
    tenant_portal_base_path: str
    description: str


FINANCE_MODULE = FinanceModuleDefinition(
    key="finance",
    name="Finance",
    route_prefix="/tenant/finance",
    tenant_portal_base_path="/tenant-portal/finance",
    description=(
        "Modulo financiero base del SaaS. Actua como modulo piloto para la "
        "convencion de vertical slices del tenant portal."
    ),
)
