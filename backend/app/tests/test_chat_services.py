import os
import unittest
from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import Mock, patch

os.environ["DEBUG"] = "true"
os.environ["APP_ENV"] = "test"

from app.apps.tenant_modules.business_core.models import BusinessClient  # noqa: E402
from app.apps.tenant_modules.chat.models import (  # noqa: E402
    ChatConversation,
    ChatConversationParticipant,
    ChatMessage,
)
from app.apps.tenant_modules.chat.schemas import (  # noqa: E402
    ChatConversationCreateRequest,
    ChatMessageCreateRequest,
)
from app.apps.tenant_modules.chat.services.chat_service import ChatService  # noqa: E402
from app.apps.tenant_modules.core.models.user import User  # noqa: E402
from app.apps.tenant_modules.crm.models import CRMOpportunity  # noqa: E402
from app.apps.tenant_modules.maintenance.models import MaintenanceWorkOrder  # noqa: E402
from app.apps.tenant_modules.taskops.models import TaskOpsTask  # noqa: E402


class ChatServicesTestCase(unittest.TestCase):
    def test_context_conversation_requires_title_for_general_thread(self) -> None:
        service = ChatService()
        tenant_db = Mock()
        tenant_db.get.side_effect = lambda model, item_id: (
            SimpleNamespace(id=item_id, is_active=True)
            if model is User and item_id == 5
            else None
        )

        with self.assertRaises(ValueError) as exc:
            service.create_conversation(
                tenant_db,
                ChatConversationCreateRequest(
                    conversation_kind="context",
                    target_user_id=None,
                    participant_user_ids=[5],
                    context_type="general",
                    client_id=None,
                    opportunity_id=None,
                    work_order_id=None,
                    task_id=None,
                    title=None,
                    description=None,
                ),
                actor_user_id=1,
            )

        self.assertIn("requiere un título visible", str(exc.exception))

    def test_create_direct_conversation_reuses_existing_thread(self) -> None:
        tenant_db = Mock()
        tenant_db.get.side_effect = lambda model, item_id: (
            SimpleNamespace(id=item_id, is_active=True)
            if model is User and item_id in {1, 5}
            else None
        )

        existing = ChatConversation(
            id=22,
            conversation_kind="direct",
            context_type="general",
            created_by_user_id=1,
            last_message_at=None,
            is_active=True,
        )
        service = ChatService()
        with patch.object(service, "_find_direct_conversation", return_value=existing):
            created = service.create_conversation(
                tenant_db,
                ChatConversationCreateRequest(
                    conversation_kind="direct",
                    target_user_id=5,
                    participant_user_ids=[],
                    context_type="general",
                    client_id=None,
                    opportunity_id=None,
                    work_order_id=None,
                    task_id=None,
                    title=None,
                    description=None,
                ),
                actor_user_id=1,
            )

        self.assertEqual(created.id, 22)
        tenant_db.add.assert_not_called()

    def test_create_context_conversation_persists_participants(self) -> None:
        tenant_db = Mock()
        tenant_db.get.side_effect = lambda model, item_id: (
            SimpleNamespace(id=item_id, is_active=True)
            if (
                (model is User and item_id in {3, 4, 7})
                or (model is BusinessClient and item_id == 11)
                or (model is CRMOpportunity and item_id == 12)
                or (model is MaintenanceWorkOrder and item_id == 13)
                or (model is TaskOpsTask and item_id == 14)
            )
            else None
        )

        added_items: list[object] = []

        def add_side_effect(item) -> None:
            added_items.append(item)

        def flush_side_effect() -> None:
            for item in added_items:
                if isinstance(item, ChatConversation) and getattr(item, "id", None) is None:
                    item.id = 90

        tenant_db.add.side_effect = add_side_effect
        tenant_db.flush.side_effect = flush_side_effect
        tenant_db.commit.return_value = None
        tenant_db.refresh.return_value = None

        service = ChatService()
        created = service.create_conversation(
            tenant_db,
            ChatConversationCreateRequest(
                conversation_kind="context",
                target_user_id=None,
                participant_user_ids=[4, 7],
                context_type="client",
                client_id=11,
                opportunity_id=None,
                work_order_id=None,
                task_id=None,
                title="Seguimiento cliente",
                description="Coordinar respuesta",
            ),
            actor_user_id=3,
        )

        participant_rows = [
            item for item in added_items if isinstance(item, ChatConversationParticipant)
        ]
        self.assertEqual(created.id, 90)
        self.assertEqual(created.client_id, 11)
        self.assertEqual(len(participant_rows), 3)
        self.assertEqual(participant_rows[0].conversation_id, 90)

    def test_send_message_updates_conversation_and_marks_sender_read(self) -> None:
        conversation = ChatConversation(
            id=33,
            conversation_kind="direct",
            context_type="general",
            created_by_user_id=1,
            last_message_at=None,
            is_active=True,
        )
        sender_membership = ChatConversationParticipant(
            id=10,
            conversation_id=33,
            user_id=1,
            participant_role="owner",
            is_archived=True,
            last_read_message_id=None,
            last_read_at=None,
        )
        peer_membership = ChatConversationParticipant(
            id=11,
            conversation_id=33,
            user_id=5,
            participant_role="member",
            is_archived=False,
            last_read_message_id=None,
            last_read_at=None,
        )
        tenant_db = Mock()
        added_items: list[object] = []

        def add_side_effect(item) -> None:
            added_items.append(item)

        def flush_side_effect() -> None:
            for item in added_items:
                if isinstance(item, ChatMessage) and getattr(item, "id", None) is None:
                    item.id = 77
                    item.created_at = datetime(2026, 4, 24, 12, 0, tzinfo=timezone.utc)

        tenant_db.add.side_effect = add_side_effect
        tenant_db.flush.side_effect = flush_side_effect
        tenant_db.commit.return_value = None
        tenant_db.refresh.return_value = None
        tenant_db.query.return_value.filter.return_value.all.return_value = [
            sender_membership,
            peer_membership,
        ]

        service = ChatService()
        with patch.object(
            service,
            "_get_accessible_conversation",
            return_value=(conversation, sender_membership),
        ):
            created = service.send_message(
                tenant_db,
                33,
                ChatMessageCreateRequest(body="Hola equipo"),
                actor_user_id=1,
            )

        self.assertEqual(created.id, 77)
        self.assertEqual(conversation.last_message_at, created.created_at)
        self.assertEqual(sender_membership.last_read_message_id, 77)
        self.assertFalse(sender_membership.is_archived)
        self.assertIsNone(peer_membership.last_read_message_id)

    def test_overview_metrics_summarize_conversation_mix(self) -> None:
        service = ChatService()
        memberships = [
            {
                "participant": SimpleNamespace(
                    is_archived=False,
                    last_read_message_id=3,
                    last_read_at=None,
                ),
                "conversation": SimpleNamespace(id=1),
            },
            {
                "participant": SimpleNamespace(
                    is_archived=False,
                    last_read_message_id=None,
                    last_read_at=None,
                ),
                "conversation": SimpleNamespace(id=2),
            },
        ]
        summaries = [
            {"conversation_kind": "direct", "unread_count": 0},
            {"conversation_kind": "context", "unread_count": 3},
        ]

        with patch.object(service, "_participant_memberships", return_value=memberships), patch.object(
            service, "_build_conversation_summaries", return_value=summaries
        ):
            metrics = service.get_overview_metrics(Mock(), current_user_id=1)

        self.assertEqual(
            metrics,
            {
                "conversation_total": 2,
                "direct_total": 1,
                "context_total": 1,
                "unread_conversation_total": 1,
                "unread_message_total": 3,
            },
        )


if __name__ == "__main__":
    unittest.main()
