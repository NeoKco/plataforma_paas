from datetime import datetime

from pydantic import BaseModel, Field

from app.apps.tenant_modules.core.schemas import TenantUserContextResponse


class ChatConversationCreateRequest(BaseModel):
    conversation_kind: str = "direct"
    target_user_id: int | None = None
    participant_user_ids: list[int] = Field(default_factory=list)
    context_type: str = "general"
    client_id: int | None = None
    opportunity_id: int | None = None
    work_order_id: int | None = None
    task_id: int | None = None
    title: str | None = None
    description: str | None = None


class ChatMessageCreateRequest(BaseModel):
    body: str


class ChatMarkReadRequest(BaseModel):
    last_message_id: int | None = None


class ChatConversationArchiveRequest(BaseModel):
    is_archived: bool


class ChatParticipantItemResponse(BaseModel):
    id: int
    conversation_id: int
    user_id: int
    user_display_name: str | None = None
    user_email: str | None = None
    participant_role: str
    is_archived: bool
    last_read_message_id: int | None = None
    last_read_at: datetime | None = None
    joined_at: datetime | None = None

    class Config:
        from_attributes = True


class ChatConversationMessageItemResponse(BaseModel):
    id: int
    conversation_id: int
    sender_user_id: int | None = None
    sender_display_name: str | None = None
    message_kind: str
    body: str
    is_own: bool
    created_at: datetime | None = None
    edited_at: datetime | None = None

    class Config:
        from_attributes = True


class ChatConversationItemResponse(BaseModel):
    id: int
    conversation_kind: str
    context_type: str
    title: str
    description: str | None = None
    client_id: int | None = None
    client_display_name: str | None = None
    opportunity_id: int | None = None
    opportunity_title: str | None = None
    work_order_id: int | None = None
    work_order_title: str | None = None
    task_id: int | None = None
    task_title: str | None = None
    created_by_user_id: int | None = None
    created_by_display_name: str | None = None
    participant_count: int
    participant_display_names: list[str]
    last_message_preview: str | None = None
    last_message_at: datetime | None = None
    last_sender_display_name: str | None = None
    unread_count: int
    is_archived: bool
    last_read_message_id: int | None = None
    last_read_at: datetime | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    class Config:
        from_attributes = True


class ChatConversationDetailItemResponse(BaseModel):
    conversation: ChatConversationItemResponse
    participants: list[ChatParticipantItemResponse]
    messages: list[ChatConversationMessageItemResponse]


class ChatConversationMutationResponse(BaseModel):
    success: bool
    message: str
    requested_by: TenantUserContextResponse
    data: ChatConversationItemResponse


class ChatConversationDetailResponse(BaseModel):
    success: bool
    message: str
    requested_by: TenantUserContextResponse
    data: ChatConversationDetailItemResponse


class ChatMessageMutationResponse(BaseModel):
    success: bool
    message: str
    requested_by: TenantUserContextResponse
    detail: ChatConversationDetailItemResponse


class ChatConversationsResponse(BaseModel):
    success: bool
    message: str
    requested_by: TenantUserContextResponse
    total: int
    data: list[ChatConversationItemResponse]


class ChatConversationMessagesResponse(BaseModel):
    success: bool
    message: str
    requested_by: TenantUserContextResponse
    total: int
    data: list[ChatConversationMessageItemResponse]


class ChatActivityItemResponse(BaseModel):
    conversation_id: int
    conversation_title: str
    conversation_kind: str
    context_type: str
    message_id: int
    sender_user_id: int | None = None
    sender_display_name: str | None = None
    body: str
    created_at: datetime | None = None


class ChatActivityResponse(BaseModel):
    success: bool
    message: str
    requested_by: TenantUserContextResponse
    total: int
    data: list[ChatActivityItemResponse]


class ChatOverviewMetricsResponse(BaseModel):
    conversation_total: int
    direct_total: int
    context_total: int
    unread_conversation_total: int
    unread_message_total: int


class ChatModuleOverviewResponse(BaseModel):
    success: bool
    message: str
    requested_by: TenantUserContextResponse
    metrics: ChatOverviewMetricsResponse
    recent_conversations: list[ChatConversationItemResponse]
    recent_messages: list[ChatActivityItemResponse]
