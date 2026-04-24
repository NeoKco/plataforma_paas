from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.apps.tenant_modules.chat.api.serializers import (
    build_activity_item,
    build_conversation_item,
)
from app.apps.tenant_modules.chat.dependencies import (
    build_chat_requested_by,
    require_chat_read,
)
from app.apps.tenant_modules.chat.schemas import (
    ChatModuleOverviewResponse,
    ChatOverviewMetricsResponse,
)
from app.apps.tenant_modules.chat.services import ChatOverviewService
from app.common.db.session_manager import get_tenant_db

router = APIRouter(prefix="/tenant/chat", tags=["Tenant Chat"])
overview_service = ChatOverviewService()


@router.get("/overview", response_model=ChatModuleOverviewResponse)
def get_chat_module_overview(
    current_user=Depends(require_chat_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> ChatModuleOverviewResponse:
    data = overview_service.build_overview(
        tenant_db,
        current_user_id=current_user["user_id"],
    )
    return ChatModuleOverviewResponse(
        success=True,
        message="Resumen de chat recuperado correctamente",
        requested_by=build_chat_requested_by(current_user),
        metrics=ChatOverviewMetricsResponse(**data["metrics"]),
        recent_conversations=[
            build_conversation_item(item) for item in data["recent_conversations"]
        ],
        recent_messages=[build_activity_item(item) for item in data["recent_messages"]],
    )
