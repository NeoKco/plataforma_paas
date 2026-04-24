from app.apps.tenant_modules.chat.schemas import (
    ChatActivityItemResponse,
    ChatConversationItemResponse,
    ChatConversationMessageItemResponse,
    ChatParticipantItemResponse,
)


def build_conversation_item(item: dict) -> ChatConversationItemResponse:
    return ChatConversationItemResponse(**item)


def build_participant_item(item: dict) -> ChatParticipantItemResponse:
    return ChatParticipantItemResponse(**item)


def build_message_item(item: dict) -> ChatConversationMessageItemResponse:
    return ChatConversationMessageItemResponse(**item)


def build_activity_item(item: dict) -> ChatActivityItemResponse:
    return ChatActivityItemResponse(**item)
