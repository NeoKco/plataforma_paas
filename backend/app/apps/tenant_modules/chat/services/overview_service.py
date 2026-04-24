from app.apps.tenant_modules.chat.services.chat_service import ChatService


class ChatOverviewService:
    def __init__(self) -> None:
        self.chat_service = ChatService()

    def build_overview(self, tenant_db, *, current_user_id: int) -> dict:
        metrics = self.chat_service.get_overview_metrics(
            tenant_db,
            current_user_id=current_user_id,
        )
        recent_conversations = self.chat_service.list_conversations(
            tenant_db,
            current_user_id=current_user_id,
            include_archived=False,
        )[:6]
        recent_messages = self.chat_service.list_activity(
            tenant_db,
            current_user_id=current_user_id,
            limit=8,
        )
        return {
            "metrics": metrics,
            "recent_conversations": recent_conversations,
            "recent_messages": recent_messages,
        }
