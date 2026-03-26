from app.apps.tenant_modules.core.schemas import TenantUserContextResponse
from app.common.auth.dependencies import require_tenant_permission


require_finance_read = require_tenant_permission("tenant.finance.read")
require_finance_create = require_tenant_permission("tenant.finance.create")
require_finance_manage = require_finance_create


def build_finance_requested_by(context: dict) -> TenantUserContextResponse:
    return TenantUserContextResponse(
        user_id=context["user_id"],
        email=context["email"],
        role=context["role"],
        tenant_slug=context["tenant_slug"],
        token_scope=context["token_scope"],
    )
