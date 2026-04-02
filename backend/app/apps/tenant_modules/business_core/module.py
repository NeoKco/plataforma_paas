from dataclasses import dataclass

from app.apps.tenant_modules.business_core.constants import (
    BUSINESS_CORE_MODULE_KEY,
    BUSINESS_CORE_MODULE_NAME,
    BUSINESS_CORE_PORTAL_BASE,
    BUSINESS_CORE_ROUTE_PREFIX,
)


@dataclass(frozen=True)
class TenantModuleDescriptor:
    key: str
    name: str
    route_prefix: str
    tenant_portal_base: str


BUSINESS_CORE_MODULE = TenantModuleDescriptor(
    key=BUSINESS_CORE_MODULE_KEY,
    name=BUSINESS_CORE_MODULE_NAME,
    route_prefix=BUSINESS_CORE_ROUTE_PREFIX,
    tenant_portal_base=BUSINESS_CORE_PORTAL_BASE,
)
