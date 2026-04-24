from app.apps.tenant_modules.chat.permissions import (
    CHAT_MANAGE_PERMISSION,
    CHAT_READ_PERMISSION,
)
from app.apps.tenant_modules.core.schemas import TenantUserContextResponse
from app.common.auth.dependencies import require_tenant_permission


require_chat_read = require_tenant_permission(CHAT_READ_PERMISSION)
require_chat_manage = require_tenant_permission(CHAT_MANAGE_PERMISSION)


def build_chat_requested_by(context: dict) -> TenantUserContextResponse:
    return TenantUserContextResponse(
        user_id=context["user_id"],
        email=context["email"],
        role=context["role"],
        tenant_slug=context["tenant_slug"],
        token_scope=context["token_scope"],
        maintenance_mode=context.get("maintenance_mode", False),
    )
