from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.apps.tenant_modules.chat.api.serializers import (
    build_conversation_item,
    build_message_item,
    build_participant_item,
)
from app.apps.tenant_modules.chat.dependencies import (
    build_chat_requested_by,
    require_chat_manage,
    require_chat_read,
)
from app.apps.tenant_modules.chat.schemas import (
    ChatConversationArchiveRequest,
    ChatConversationCreateRequest,
    ChatConversationDetailItemResponse,
    ChatConversationDetailResponse,
    ChatConversationMessagesResponse,
    ChatConversationMutationResponse,
    ChatConversationsResponse,
    ChatMarkReadRequest,
    ChatMessageCreateRequest,
    ChatMessageMutationResponse,
)
from app.apps.tenant_modules.chat.services import ChatService
from app.common.db.session_manager import get_tenant_db

router = APIRouter(prefix="/tenant/chat/conversations", tags=["Tenant Chat"])
service = ChatService()


def _build_detail(detail: dict) -> ChatConversationDetailItemResponse:
    return ChatConversationDetailItemResponse(
        conversation=build_conversation_item(detail["conversation"]),
        participants=[
            build_participant_item(item)
            for item in detail["participants"]
        ],
        messages=[build_message_item(item) for item in detail["messages"]],
    )


@router.get("", response_model=ChatConversationsResponse)
def list_chat_conversations(
    include_archived: bool = False,
    q: str | None = None,
    current_user=Depends(require_chat_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> ChatConversationsResponse:
    rows = service.list_conversations(
        tenant_db,
        current_user_id=current_user["user_id"],
        include_archived=include_archived,
        q=q,
    )
    return ChatConversationsResponse(
        success=True,
        message="Conversaciones recuperadas correctamente",
        requested_by=build_chat_requested_by(current_user),
        total=len(rows),
        data=[build_conversation_item(item) for item in rows],
    )


@router.post("", response_model=ChatConversationMutationResponse)
def create_chat_conversation(
    payload: ChatConversationCreateRequest,
    current_user=Depends(require_chat_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> ChatConversationMutationResponse:
    try:
        item = service.create_conversation(
            tenant_db,
            payload,
            actor_user_id=current_user["user_id"],
        )
        summary = service.list_conversations(
            tenant_db,
            current_user_id=current_user["user_id"],
            include_archived=True,
        )
        row = next((conversation for conversation in summary if conversation["id"] == item.id), None)
        if row is None:
            raise ValueError("No se pudo reconstruir la conversación creada")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return ChatConversationMutationResponse(
        success=True,
        message="Conversación creada correctamente",
        requested_by=build_chat_requested_by(current_user),
        data=build_conversation_item(row),
    )


@router.get("/{conversation_id}", response_model=ChatConversationDetailResponse)
def get_chat_conversation_detail(
    conversation_id: int,
    current_user=Depends(require_chat_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> ChatConversationDetailResponse:
    try:
        detail = service.get_conversation_detail(
            tenant_db,
            conversation_id,
            current_user_id=current_user["user_id"],
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return ChatConversationDetailResponse(
        success=True,
        message="Detalle de conversación recuperado correctamente",
        requested_by=build_chat_requested_by(current_user),
        data=_build_detail(detail),
    )


@router.get("/{conversation_id}/messages", response_model=ChatConversationMessagesResponse)
def list_chat_conversation_messages(
    conversation_id: int,
    limit: int = 120,
    current_user=Depends(require_chat_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> ChatConversationMessagesResponse:
    try:
        rows = service.list_messages(
            tenant_db,
            conversation_id,
            current_user_id=current_user["user_id"],
            limit=max(1, min(limit, 300)),
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return ChatConversationMessagesResponse(
        success=True,
        message="Mensajes recuperados correctamente",
        requested_by=build_chat_requested_by(current_user),
        total=len(rows),
        data=[build_message_item(item) for item in rows],
    )


@router.post("/{conversation_id}/messages", response_model=ChatMessageMutationResponse)
def send_chat_message(
    conversation_id: int,
    payload: ChatMessageCreateRequest,
    current_user=Depends(require_chat_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> ChatMessageMutationResponse:
    try:
        service.send_message(
            tenant_db,
            conversation_id,
            payload,
            actor_user_id=current_user["user_id"],
        )
        detail = service.get_conversation_detail(
            tenant_db,
            conversation_id,
            current_user_id=current_user["user_id"],
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return ChatMessageMutationResponse(
        success=True,
        message="Mensaje enviado correctamente",
        requested_by=build_chat_requested_by(current_user),
        detail=_build_detail(detail),
    )


@router.post("/{conversation_id}/read", response_model=ChatConversationDetailResponse)
def mark_chat_conversation_read(
    conversation_id: int,
    payload: ChatMarkReadRequest,
    current_user=Depends(require_chat_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> ChatConversationDetailResponse:
    try:
        service.mark_conversation_read(
            tenant_db,
            conversation_id,
            current_user_id=current_user["user_id"],
            last_message_id=payload.last_message_id,
        )
        detail = service.get_conversation_detail(
            tenant_db,
            conversation_id,
            current_user_id=current_user["user_id"],
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return ChatConversationDetailResponse(
        success=True,
        message="Lectura de conversación actualizada",
        requested_by=build_chat_requested_by(current_user),
        data=_build_detail(detail),
    )


@router.patch("/{conversation_id}/archive", response_model=ChatConversationMutationResponse)
def archive_chat_conversation(
    conversation_id: int,
    payload: ChatConversationArchiveRequest,
    current_user=Depends(require_chat_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> ChatConversationMutationResponse:
    try:
        service.set_conversation_archived(
            tenant_db,
            conversation_id,
            current_user_id=current_user["user_id"],
            is_archived=payload.is_archived,
        )
        row = next(
            (
                item
                for item in service.list_conversations(
                    tenant_db,
                    current_user_id=current_user["user_id"],
                    include_archived=True,
                )
                if item["id"] == conversation_id
            ),
            None,
        )
        if row is None:
            raise ValueError("Conversación no encontrada")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return ChatConversationMutationResponse(
        success=True,
        message="Estado de archivo actualizado",
        requested_by=build_chat_requested_by(current_user),
        data=build_conversation_item(row),
    )
