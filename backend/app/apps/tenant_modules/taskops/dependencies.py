from app.apps.tenant_modules.core.schemas import TenantUserContextResponse
from app.common.auth.dependencies import require_tenant_permission


require_taskops_read = require_tenant_permission("tenant.taskops.read")
require_taskops_manage = require_tenant_permission("tenant.taskops.manage")
require_taskops_create_own = require_tenant_permission("tenant.taskops.create_own")


def build_taskops_requested_by(context: dict) -> TenantUserContextResponse:
    return TenantUserContextResponse(
        user_id=context["user_id"],
        email=context["email"],
        role=context["role"],
        tenant_slug=context["tenant_slug"],
        token_scope=context["token_scope"],
    )
