from dataclasses import dataclass


@dataclass(frozen=True)
class CRMModuleDefinition:
    key: str
    name: str
    route_prefix: str
    tenant_portal_base_path: str
    description: str


CRM_MODULE = CRMModuleDefinition(
    key="crm",
    name="CRM",
    route_prefix="/tenant/crm",
    tenant_portal_base_path="/tenant-portal/crm",
    description=(
        "Modulo comercial tenant para oportunidades, cotizaciones y catalogo "
        "de productos/servicios."
    ),
)
