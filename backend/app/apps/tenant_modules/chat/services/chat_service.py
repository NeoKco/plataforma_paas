from collections import defaultdict
from datetime import datetime, timezone

from sqlalchemy import and_, func
from sqlalchemy.orm import aliased

from app.apps.tenant_modules.business_core.models import BusinessClient, BusinessOrganization
from app.apps.tenant_modules.chat.models import (
    ChatConversation,
    ChatConversationParticipant,
    ChatMessage,
)
from app.apps.tenant_modules.core.models.user import User
from app.apps.tenant_modules.crm.models import CRMOpportunity
from app.apps.tenant_modules.maintenance.models import MaintenanceWorkOrder
from app.apps.tenant_modules.taskops.models import TaskOpsTask


class ChatService:
    VALID_CONVERSATION_KINDS = {"direct", "context"}
    VALID_CONTEXT_TYPES = {"general", "client", "opportunity", "work_order", "task"}
    DIRECT_CONTEXT_TYPE = "general"

    def list_conversations(
        self,
        tenant_db,
        *,
        current_user_id: int,
        include_archived: bool = False,
        q: str | None = None,
    ) -> list[dict]:
        memberships = self._participant_memberships(
            tenant_db,
            current_user_id=current_user_id,
            include_archived=include_archived,
        )
        conversations = [membership["conversation"] for membership in memberships]
        if q and q.strip():
            token = q.strip().lower()
            conversations = [
                item
                for item in conversations
                if token in self._conversation_search_blob(item).lower()
            ]
        return self._build_conversation_summaries(
            tenant_db,
            conversations,
            memberships=memberships,
            current_user_id=current_user_id,
        )

    def list_activity(
        self,
        tenant_db,
        *,
        current_user_id: int,
        limit: int = 60,
        q: str | None = None,
    ) -> list[dict]:
        conversation_ids = self._participant_conversation_ids(
            tenant_db,
            current_user_id=current_user_id,
            include_archived=True,
        )
        if not conversation_ids:
            return []

        query = tenant_db.query(ChatMessage).filter(ChatMessage.conversation_id.in_(conversation_ids))
        if q and q.strip():
            token = f"%{q.strip().lower()}%"
            query = query.filter(func.lower(ChatMessage.body).like(token))
        rows = (
            query.order_by(ChatMessage.created_at.desc(), ChatMessage.id.desc())
            .limit(limit)
            .all()
        )
        conversations = (
            tenant_db.query(ChatConversation)
            .filter(ChatConversation.id.in_(sorted({row.conversation_id for row in rows})))
            .all()
        )
        conversation_summary_map = {
            item["id"]: item
            for item in self._build_conversation_summaries(
                tenant_db,
                conversations,
                memberships=self._participant_memberships(
                    tenant_db,
                    current_user_id=current_user_id,
                    include_archived=True,
                ),
                current_user_id=current_user_id,
            )
        }
        user_display_map = self.get_user_display_map(
            tenant_db,
            [row.sender_user_id for row in rows if row.sender_user_id],
        )
        return [
            {
                "conversation_id": row.conversation_id,
                "conversation_title": conversation_summary_map.get(row.conversation_id, {}).get(
                    "title", f"Conversación #{row.conversation_id}"
                ),
                "conversation_kind": conversation_summary_map.get(row.conversation_id, {}).get(
                    "conversation_kind", "context"
                ),
                "context_type": conversation_summary_map.get(row.conversation_id, {}).get(
                    "context_type", "general"
                ),
                "message_id": row.id,
                "sender_user_id": row.sender_user_id,
                "sender_display_name": user_display_map.get(row.sender_user_id),
                "body": row.body,
                "created_at": row.created_at,
            }
            for row in rows
        ]

    def get_conversation_detail(self, tenant_db, conversation_id: int, *, current_user_id: int) -> dict:
        conversation, membership = self._get_accessible_conversation(
            tenant_db,
            conversation_id,
            current_user_id=current_user_id,
        )
        summary = self._build_conversation_summaries(
            tenant_db,
            [conversation],
            memberships=[membership],
            current_user_id=current_user_id,
        )[0]
        participants = self._build_participants(tenant_db, conversation.id)
        messages = self._build_messages(
            tenant_db,
            conversation.id,
            current_user_id=current_user_id,
        )
        return {
            "conversation": summary,
            "participants": participants,
            "messages": messages,
        }

    def list_messages(
        self,
        tenant_db,
        conversation_id: int,
        *,
        current_user_id: int,
        limit: int = 120,
    ) -> list[dict]:
        self._get_accessible_conversation(
            tenant_db,
            conversation_id,
            current_user_id=current_user_id,
        )
        return self._build_messages(
            tenant_db,
            conversation_id,
            current_user_id=current_user_id,
            limit=limit,
        )

    def create_conversation(
        self,
        tenant_db,
        payload,
        *,
        actor_user_id: int,
    ) -> ChatConversation:
        conversation_kind = self._validate_conversation_kind(payload.conversation_kind)
        if conversation_kind == "direct":
            target_user_id = self._validate_user(tenant_db, payload.target_user_id)
            if target_user_id is None:
                raise ValueError("Debes indicar el usuario destino del chat directo")
            if target_user_id == actor_user_id:
                raise ValueError("No puedes iniciar un chat directo contigo mismo")
            existing = self._find_direct_conversation(
                tenant_db,
                actor_user_id=actor_user_id,
                target_user_id=target_user_id,
            )
            if existing is not None:
                return existing
            participant_ids = [actor_user_id, target_user_id]
            title = None
            context_type = self.DIRECT_CONTEXT_TYPE
        else:
            participant_ids = sorted(
                {
                    actor_user_id,
                    *[
                        user_id
                        for user_id in (
                            self._validate_user(tenant_db, item)
                            for item in payload.participant_user_ids
                        )
                        if user_id is not None
                    ],
                }
            )
            if len(participant_ids) < 2:
                raise ValueError("El hilo interno necesita al menos dos participantes")
            context_type = self._validate_context_type(payload.context_type)
            title = self._normalize_optional(payload.title)
            if context_type == "general" and not title:
                raise ValueError("El hilo general requiere un título visible")

        refs = self._validate_context_refs(
            tenant_db,
            client_id=payload.client_id,
            opportunity_id=payload.opportunity_id,
            work_order_id=payload.work_order_id,
            task_id=payload.task_id,
        )
        if conversation_kind == "direct":
            refs = {
                "client_id": None,
                "opportunity_id": None,
                "work_order_id": None,
                "task_id": None,
            }

        item = ChatConversation(
            conversation_kind=conversation_kind,
            context_type=context_type,
            client_id=refs["client_id"],
            opportunity_id=refs["opportunity_id"],
            work_order_id=refs["work_order_id"],
            task_id=refs["task_id"],
            title=title,
            description=self._normalize_optional(payload.description),
            created_by_user_id=actor_user_id,
            last_message_at=None,
            is_active=True,
        )
        tenant_db.add(item)
        tenant_db.flush()
        for user_id in participant_ids:
            tenant_db.add(
                ChatConversationParticipant(
                    conversation_id=item.id,
                    user_id=user_id,
                    participant_role="owner" if user_id == actor_user_id else "member",
                    is_archived=False,
                    last_read_message_id=None,
                    last_read_at=self._now() if user_id == actor_user_id else None,
                )
            )
        tenant_db.commit()
        tenant_db.refresh(item)
        return item

    def send_message(
        self,
        tenant_db,
        conversation_id: int,
        payload,
        *,
        actor_user_id: int,
    ) -> ChatMessage:
        conversation, _ = self._get_accessible_conversation(
            tenant_db,
            conversation_id,
            current_user_id=actor_user_id,
        )
        body = self._normalize_required(payload.body, field_name="mensaje")
        item = ChatMessage(
            conversation_id=conversation.id,
            sender_user_id=actor_user_id,
            message_kind="text",
            body=body,
        )
        tenant_db.add(item)
        tenant_db.flush()
        conversation.last_message_at = item.created_at or self._now()
        conversation.updated_at = self._now()
        tenant_db.add(conversation)
        participants = (
            tenant_db.query(ChatConversationParticipant)
            .filter(ChatConversationParticipant.conversation_id == conversation.id)
            .all()
        )
        for participant in participants:
            if participant.user_id == actor_user_id:
                participant.last_read_message_id = item.id
                participant.last_read_at = self._now()
                participant.is_archived = False
            tenant_db.add(participant)
        tenant_db.commit()
        tenant_db.refresh(item)
        return item

    def mark_conversation_read(
        self,
        tenant_db,
        conversation_id: int,
        *,
        current_user_id: int,
        last_message_id: int | None = None,
    ) -> ChatConversationParticipant:
        conversation, membership = self._get_accessible_conversation(
            tenant_db,
            conversation_id,
            current_user_id=current_user_id,
        )
        if last_message_id is None:
            last_message = (
                tenant_db.query(ChatMessage)
                .filter(ChatMessage.conversation_id == conversation.id)
                .order_by(ChatMessage.id.desc())
                .first()
            )
            last_message_id = last_message.id if last_message else None
        membership.last_read_message_id = last_message_id
        membership.last_read_at = self._now()
        membership.is_archived = False
        tenant_db.add(membership)
        tenant_db.commit()
        tenant_db.refresh(membership)
        return membership

    def set_conversation_archived(
        self,
        tenant_db,
        conversation_id: int,
        *,
        current_user_id: int,
        is_archived: bool,
    ) -> ChatConversationParticipant:
        _, membership = self._get_accessible_conversation(
            tenant_db,
            conversation_id,
            current_user_id=current_user_id,
        )
        membership.is_archived = bool(is_archived)
        tenant_db.add(membership)
        tenant_db.commit()
        tenant_db.refresh(membership)
        return membership

    def get_overview_metrics(self, tenant_db, *, current_user_id: int) -> dict[str, int]:
        memberships = self._participant_memberships(
            tenant_db,
            current_user_id=current_user_id,
            include_archived=True,
        )
        summaries = self._build_conversation_summaries(
            tenant_db,
            [membership["conversation"] for membership in memberships],
            memberships=memberships,
            current_user_id=current_user_id,
        )
        return {
            "conversation_total": len(summaries),
            "direct_total": sum(1 for item in summaries if item["conversation_kind"] == "direct"),
            "context_total": sum(1 for item in summaries if item["conversation_kind"] == "context"),
            "unread_conversation_total": sum(1 for item in summaries if item["unread_count"] > 0),
            "unread_message_total": sum(item["unread_count"] for item in summaries),
        }

    def _participant_conversation_ids(
        self,
        tenant_db,
        *,
        current_user_id: int,
        include_archived: bool,
    ) -> list[int]:
        query = tenant_db.query(ChatConversationParticipant.conversation_id).filter(
            ChatConversationParticipant.user_id == current_user_id
        )
        if not include_archived:
            query = query.filter(ChatConversationParticipant.is_archived.is_(False))
        return [row[0] for row in query.all()]

    def _participant_memberships(
        self,
        tenant_db,
        *,
        current_user_id: int,
        include_archived: bool,
    ) -> list[dict]:
        query = (
            tenant_db.query(ChatConversationParticipant, ChatConversation)
            .join(
                ChatConversation,
                ChatConversation.id == ChatConversationParticipant.conversation_id,
            )
            .filter(ChatConversationParticipant.user_id == current_user_id)
            .filter(ChatConversation.is_active.is_(True))
        )
        if not include_archived:
            query = query.filter(ChatConversationParticipant.is_archived.is_(False))
        rows = query.order_by(
            ChatConversation.last_message_at.desc().nullslast(),
            ChatConversation.updated_at.desc(),
            ChatConversation.id.desc(),
        ).all()
        return [
            {
                "participant": participant,
                "conversation": conversation,
            }
            for participant, conversation in rows
        ]

    def _build_conversation_summaries(
        self,
        tenant_db,
        conversations: list[ChatConversation],
        *,
        memberships: list[dict],
        current_user_id: int,
    ) -> list[dict]:
        if not conversations:
            return []
        conversation_ids = sorted({item.id for item in conversations})
        membership_map = {
            item["conversation"].id: item["participant"]
            for item in memberships
            if item["conversation"].id in conversation_ids
        }
        participants = (
            tenant_db.query(ChatConversationParticipant)
            .filter(ChatConversationParticipant.conversation_id.in_(conversation_ids))
            .all()
        )
        participants_by_conversation: dict[int, list[ChatConversationParticipant]] = defaultdict(list)
        user_ids: list[int] = []
        for participant in participants:
            participants_by_conversation[participant.conversation_id].append(participant)
            user_ids.append(participant.user_id)
        user_maps = self.get_user_maps(tenant_db, user_ids)
        last_messages = (
            tenant_db.query(ChatMessage)
            .filter(ChatMessage.conversation_id.in_(conversation_ids))
            .order_by(ChatMessage.conversation_id.asc(), ChatMessage.id.desc())
            .all()
        )
        last_message_map: dict[int, ChatMessage] = {}
        unread_count_map: dict[int, int] = defaultdict(int)
        for message in last_messages:
            last_message_map.setdefault(message.conversation_id, message)
            membership = membership_map.get(message.conversation_id)
            if membership is None or message.sender_user_id == current_user_id:
                continue
            if membership.last_read_message_id is None or message.id > membership.last_read_message_id:
                unread_count_map[message.conversation_id] += 1
        refs = self.get_reference_maps(tenant_db, conversations)
        summaries = []
        for item in conversations:
            membership = membership_map[item.id]
            participant_rows = participants_by_conversation.get(item.id, [])
            participant_names = [
                user_maps["display"].get(participant.user_id, f"Usuario #{participant.user_id}")
                for participant in participant_rows
                if participant.user_id != current_user_id or item.conversation_kind != "direct"
            ]
            direct_counterpart = None
            if item.conversation_kind == "direct":
                other = next(
                    (participant for participant in participant_rows if participant.user_id != current_user_id),
                    None,
                )
                if other is not None:
                    direct_counterpart = user_maps["display"].get(other.user_id)
            last_message = last_message_map.get(item.id)
            summaries.append(
                {
                    "id": item.id,
                    "conversation_kind": item.conversation_kind,
                    "context_type": item.context_type,
                    "title": self._build_conversation_title(
                        item,
                        refs=refs,
                        direct_counterpart=direct_counterpart,
                    ),
                    "description": item.description,
                    "client_id": item.client_id,
                    "client_display_name": refs["clients"].get(item.client_id),
                    "opportunity_id": item.opportunity_id,
                    "opportunity_title": refs["opportunities"].get(item.opportunity_id),
                    "work_order_id": item.work_order_id,
                    "work_order_title": refs["work_orders"].get(item.work_order_id),
                    "task_id": item.task_id,
                    "task_title": refs["tasks"].get(item.task_id),
                    "created_by_user_id": item.created_by_user_id,
                    "created_by_display_name": user_maps["display"].get(item.created_by_user_id),
                    "participant_count": len(participant_rows),
                    "participant_display_names": participant_names,
                    "last_message_preview": None if last_message is None else last_message.body[:180],
                    "last_message_at": item.last_message_at or getattr(last_message, "created_at", None),
                    "last_sender_display_name": None
                    if last_message is None
                    else user_maps["display"].get(last_message.sender_user_id),
                    "unread_count": unread_count_map.get(item.id, 0),
                    "is_archived": membership.is_archived,
                    "last_read_message_id": membership.last_read_message_id,
                    "last_read_at": membership.last_read_at,
                    "created_at": item.created_at,
                    "updated_at": item.updated_at,
                }
            )
        summaries.sort(
            key=lambda row: (
                row["last_message_at"] or row["updated_at"] or row["created_at"] or self._now()
            ),
            reverse=True,
        )
        return summaries

    def _build_participants(self, tenant_db, conversation_id: int) -> list[dict]:
        rows = (
            tenant_db.query(ChatConversationParticipant)
            .filter(ChatConversationParticipant.conversation_id == conversation_id)
            .order_by(ChatConversationParticipant.joined_at.asc(), ChatConversationParticipant.id.asc())
            .all()
        )
        user_maps = self.get_user_maps(tenant_db, [row.user_id for row in rows])
        return [
            {
                "id": row.id,
                "conversation_id": row.conversation_id,
                "user_id": row.user_id,
                "user_display_name": user_maps["display"].get(row.user_id),
                "user_email": user_maps["email"].get(row.user_id),
                "participant_role": row.participant_role,
                "is_archived": row.is_archived,
                "last_read_message_id": row.last_read_message_id,
                "last_read_at": row.last_read_at,
                "joined_at": row.joined_at,
            }
            for row in rows
        ]

    def _build_messages(
        self,
        tenant_db,
        conversation_id: int,
        *,
        current_user_id: int,
        limit: int = 120,
    ) -> list[dict]:
        rows = (
            tenant_db.query(ChatMessage)
            .filter(ChatMessage.conversation_id == conversation_id)
            .order_by(ChatMessage.created_at.desc(), ChatMessage.id.desc())
            .limit(limit)
            .all()
        )
        rows = list(reversed(rows))
        user_maps = self.get_user_maps(
            tenant_db,
            [row.sender_user_id for row in rows if row.sender_user_id],
        )
        return [
            {
                "id": row.id,
                "conversation_id": row.conversation_id,
                "sender_user_id": row.sender_user_id,
                "sender_display_name": user_maps["display"].get(row.sender_user_id),
                "message_kind": row.message_kind,
                "body": row.body,
                "is_own": row.sender_user_id == current_user_id,
                "created_at": row.created_at,
                "edited_at": row.edited_at,
            }
            for row in rows
        ]

    def get_reference_maps(self, tenant_db, conversations: list[ChatConversation]) -> dict[str, dict[int, str]]:
        client_ids = [item.client_id for item in conversations if item.client_id]
        opportunity_ids = [item.opportunity_id for item in conversations if item.opportunity_id]
        work_order_ids = [item.work_order_id for item in conversations if item.work_order_id]
        task_ids = [item.task_id for item in conversations if item.task_id]
        return {
            "clients": self.get_client_display_map(tenant_db, client_ids),
            "opportunities": self.get_opportunity_title_map(tenant_db, opportunity_ids),
            "work_orders": self.get_work_order_title_map(tenant_db, work_order_ids),
            "tasks": self.get_task_title_map(tenant_db, task_ids),
        }

    def get_user_maps(self, tenant_db, user_ids: list[int]) -> dict[str, dict[int, str]]:
        normalized_ids = sorted({item for item in user_ids if item})
        if not normalized_ids:
            return {"display": {}, "email": {}}
        rows = tenant_db.query(User.id, User.full_name, User.email).filter(User.id.in_(normalized_ids)).all()
        return {
            "display": {row_id: full_name for row_id, full_name, _ in rows},
            "email": {row_id: email for row_id, _, email in rows},
        }

    def get_user_display_map(self, tenant_db, user_ids: list[int]) -> dict[int, str]:
        return self.get_user_maps(tenant_db, user_ids)["display"]

    def get_client_display_map(self, tenant_db, client_ids: list[int]) -> dict[int, str]:
        normalized_ids = sorted({item for item in client_ids if item})
        if not normalized_ids:
            return {}
        rows = (
            tenant_db.query(BusinessClient.id, BusinessOrganization.name)
            .join(BusinessOrganization, BusinessOrganization.id == BusinessClient.organization_id)
            .filter(BusinessClient.id.in_(normalized_ids))
            .all()
        )
        return {row_id: name for row_id, name in rows}

    def get_opportunity_title_map(self, tenant_db, opportunity_ids: list[int]) -> dict[int, str]:
        normalized_ids = sorted({item for item in opportunity_ids if item})
        if not normalized_ids:
            return {}
        rows = (
            tenant_db.query(CRMOpportunity.id, CRMOpportunity.title)
            .filter(CRMOpportunity.id.in_(normalized_ids))
            .all()
        )
        return {row_id: title for row_id, title in rows}

    def get_work_order_title_map(self, tenant_db, work_order_ids: list[int]) -> dict[int, str]:
        normalized_ids = sorted({item for item in work_order_ids if item})
        if not normalized_ids:
            return {}
        rows = (
            tenant_db.query(MaintenanceWorkOrder.id, MaintenanceWorkOrder.title)
            .filter(MaintenanceWorkOrder.id.in_(normalized_ids))
            .all()
        )
        return {row_id: title for row_id, title in rows}

    def get_task_title_map(self, tenant_db, task_ids: list[int]) -> dict[int, str]:
        normalized_ids = sorted({item for item in task_ids if item})
        if not normalized_ids:
            return {}
        rows = (
            tenant_db.query(TaskOpsTask.id, TaskOpsTask.title)
            .filter(TaskOpsTask.id.in_(normalized_ids))
            .all()
        )
        return {row_id: title for row_id, title in rows}

    def _get_accessible_conversation(self, tenant_db, conversation_id: int, *, current_user_id: int):
        row = (
            tenant_db.query(ChatConversationParticipant, ChatConversation)
            .join(ChatConversation, ChatConversation.id == ChatConversationParticipant.conversation_id)
            .filter(ChatConversationParticipant.conversation_id == conversation_id)
            .filter(ChatConversationParticipant.user_id == current_user_id)
            .first()
        )
        if row is None:
            raise ValueError("Conversación no encontrada")
        return row[1], row[0]

    def _find_direct_conversation(self, tenant_db, *, actor_user_id: int, target_user_id: int):
        actor_alias = aliased(ChatConversationParticipant)
        target_alias = aliased(ChatConversationParticipant)
        return (
            tenant_db.query(ChatConversation)
            .join(
                actor_alias,
                and_(
                    actor_alias.conversation_id == ChatConversation.id,
                    actor_alias.user_id == actor_user_id,
                ),
            )
            .join(
                target_alias,
                and_(
                    target_alias.conversation_id == ChatConversation.id,
                    target_alias.user_id == target_user_id,
                ),
            )
            .filter(ChatConversation.conversation_kind == "direct")
            .first()
        )

    def _validate_conversation_kind(self, value: str | None) -> str:
        normalized = (value or "").strip().lower() or "direct"
        if normalized not in self.VALID_CONVERSATION_KINDS:
            raise ValueError("Tipo de conversación inválido")
        return normalized

    def _validate_context_type(self, value: str | None) -> str:
        normalized = (value or "").strip().lower() or "general"
        if normalized not in self.VALID_CONTEXT_TYPES:
            raise ValueError("Tipo de contexto inválido")
        return normalized

    def _validate_context_refs(
        self,
        tenant_db,
        *,
        client_id: int | None,
        opportunity_id: int | None,
        work_order_id: int | None,
        task_id: int | None,
    ) -> dict[str, int | None]:
        refs = {
            "client_id": self._validate_client(tenant_db, client_id),
            "opportunity_id": self._validate_opportunity(tenant_db, opportunity_id),
            "work_order_id": self._validate_work_order(tenant_db, work_order_id),
            "task_id": self._validate_task(tenant_db, task_id),
        }
        non_null_count = sum(1 for value in refs.values() if value is not None)
        if non_null_count > 1:
            raise ValueError("Cada hilo interno solo puede referenciar un contexto principal")
        return refs

    def _validate_user(self, tenant_db, user_id: int | None) -> int | None:
        if user_id is None:
            return None
        item = tenant_db.get(User, user_id)
        if item is None:
            raise ValueError("Usuario chat no encontrado")
        if not item.is_active:
            raise ValueError("El usuario chat está inactivo")
        return item.id

    def _validate_client(self, tenant_db, client_id: int | None) -> int | None:
        if client_id is None:
            return None
        item = tenant_db.get(BusinessClient, client_id)
        if item is None:
            raise ValueError("Cliente no encontrado")
        return item.id

    def _validate_opportunity(self, tenant_db, opportunity_id: int | None) -> int | None:
        if opportunity_id is None:
            return None
        item = tenant_db.get(CRMOpportunity, opportunity_id)
        if item is None:
            raise ValueError("Oportunidad no encontrada")
        return item.id

    def _validate_work_order(self, tenant_db, work_order_id: int | None) -> int | None:
        if work_order_id is None:
            return None
        item = tenant_db.get(MaintenanceWorkOrder, work_order_id)
        if item is None:
            raise ValueError("OT no encontrada")
        return item.id

    def _validate_task(self, tenant_db, task_id: int | None) -> int | None:
        if task_id is None:
            return None
        item = tenant_db.get(TaskOpsTask, task_id)
        if item is None:
            raise ValueError("Tarea no encontrada")
        return item.id

    def _build_conversation_title(
        self,
        conversation: ChatConversation,
        *,
        refs: dict[str, dict[int, str]],
        direct_counterpart: str | None,
    ) -> str:
        if conversation.conversation_kind == "direct":
            return direct_counterpart or "Chat directo"
        if conversation.title:
            return conversation.title
        if conversation.client_id:
            return refs["clients"].get(conversation.client_id, "Hilo cliente")
        if conversation.opportunity_id:
            return refs["opportunities"].get(conversation.opportunity_id, "Hilo oportunidad")
        if conversation.work_order_id:
            return refs["work_orders"].get(conversation.work_order_id, "Hilo OT")
        if conversation.task_id:
            return refs["tasks"].get(conversation.task_id, "Hilo tarea")
        return "Hilo interno"

    def _conversation_search_blob(self, item: ChatConversation) -> str:
        return " ".join(
            filter(
                None,
                [
                    item.title,
                    item.description,
                    item.context_type,
                    item.conversation_kind,
                ],
            )
        )

    def _normalize_required(self, value: str | None, *, field_name: str) -> str:
        normalized = (value or "").strip()
        if not normalized:
            raise ValueError(f"Debes indicar {field_name}")
        return normalized

    def _normalize_optional(self, value: str | None) -> str | None:
        normalized = (value or "").strip()
        return normalized or None

    def _now(self) -> datetime:
        return datetime.now(timezone.utc)
