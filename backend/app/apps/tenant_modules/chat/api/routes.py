from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.apps.tenant_modules.chat.api.serializers import build_activity_item
from app.apps.tenant_modules.chat.dependencies import (
    build_chat_requested_by,
    require_chat_read,
)
from app.apps.tenant_modules.chat.schemas import ChatActivityResponse
from app.apps.tenant_modules.chat.services import ChatService
from app.common.db.session_manager import get_tenant_db

router = APIRouter(prefix="/tenant/chat", tags=["Tenant Chat"])
service = ChatService()


@router.get("/activity", response_model=ChatActivityResponse)
def get_chat_activity(
    q: str | None = None,
    current_user=Depends(require_chat_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> ChatActivityResponse:
    rows = service.list_activity(
        tenant_db,
        current_user_id=current_user["user_id"],
        q=q,
    )
    return ChatActivityResponse(
        success=True,
        message="Actividad de chat recuperada correctamente",
        requested_by=build_chat_requested_by(current_user),
        total=len(rows),
        data=[build_activity_item(item) for item in rows],
    )
