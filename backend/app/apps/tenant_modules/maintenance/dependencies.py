from app.apps.tenant_modules.core.schemas import TenantUserContextResponse
from app.common.auth.dependencies import require_tenant_permission


require_maintenance_read = require_tenant_permission("tenant.maintenance.read")
require_maintenance_manage = require_tenant_permission("tenant.maintenance.manage")


def build_maintenance_requested_by(context: dict) -> TenantUserContextResponse:
    return TenantUserContextResponse(
        user_id=context["user_id"],
        email=context["email"],
        role=context["role"],
        tenant_slug=context["tenant_slug"],
        token_scope=context["token_scope"],
    )
