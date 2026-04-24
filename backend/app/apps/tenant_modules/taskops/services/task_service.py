from datetime import datetime, timedelta, timezone
from pathlib import Path
from uuid import uuid4

from sqlalchemy import func

from app.apps.tenant_modules.business_core.models import (
    BusinessClient,
    BusinessOrganization,
    BusinessWorkGroup,
)
from app.apps.tenant_modules.core.models.user import User
from app.apps.tenant_modules.crm.models import CRMOpportunity
from app.apps.tenant_modules.maintenance.models import MaintenanceWorkOrder
from app.apps.tenant_modules.taskops.models import (
    TaskOpsTask,
    TaskOpsTaskAttachment,
    TaskOpsTaskComment,
    TaskOpsTaskStatusEvent,
)
from app.common.config.settings import settings


class TaskOpsTaskService:
    VALID_STATUSES = {
        "backlog",
        "todo",
        "in_progress",
        "blocked",
        "done",
        "cancelled",
    }
    OPEN_STATUSES = {"backlog", "todo", "in_progress", "blocked"}
    CLOSED_STATUSES = {"done", "cancelled"}
    KANBAN_STATUSES = ("backlog", "todo", "in_progress", "blocked", "done")
    VALID_PRIORITIES = {"low", "normal", "high", "urgent"}
    ATTACHMENT_ALLOWED_CONTENT_TYPES = {
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/webp",
        "text/plain",
    }
    ATTACHMENT_MAX_SIZE_BYTES = 8 * 1024 * 1024

    def list_tasks(
        self,
        tenant_db,
        *,
        include_inactive: bool = True,
        include_closed: bool = True,
        status: str | None = None,
        assigned_user_id: int | None = None,
        client_id: int | None = None,
        q: str | None = None,
    ) -> list[TaskOpsTask]:
        query = tenant_db.query(TaskOpsTask)
        if not include_inactive:
            query = query.filter(TaskOpsTask.is_active.is_(True))
        if not include_closed:
            query = query.filter(~TaskOpsTask.status.in_(sorted(self.CLOSED_STATUSES)))
        if status:
            query = query.filter(TaskOpsTask.status == self._validate_status(status))
        if assigned_user_id:
            query = query.filter(TaskOpsTask.assigned_user_id == assigned_user_id)
        if client_id:
            query = query.filter(TaskOpsTask.client_id == client_id)
        if q and q.strip():
            token = f"%{q.strip().lower()}%"
            query = query.filter(
                func.lower(TaskOpsTask.title).like(token)
                | func.lower(func.coalesce(TaskOpsTask.description, "")).like(token)
            )
        return (
            query.order_by(
                TaskOpsTask.is_active.desc(),
                TaskOpsTask.sort_order.asc(),
                TaskOpsTask.due_at.asc(),
                TaskOpsTask.created_at.desc(),
            ).all()
        )

    def list_history(self, tenant_db, *, q: str | None = None) -> list[TaskOpsTask]:
        query = tenant_db.query(TaskOpsTask).filter(
            TaskOpsTask.status.in_(sorted(self.CLOSED_STATUSES))
        )
        if q and q.strip():
            token = f"%{q.strip().lower()}%"
            query = query.filter(
                func.lower(TaskOpsTask.title).like(token)
                | func.lower(func.coalesce(TaskOpsTask.description, "")).like(token)
            )
        return (
            query.order_by(
                TaskOpsTask.completed_at.desc(),
                TaskOpsTask.updated_at.desc(),
                TaskOpsTask.id.desc(),
            ).all()
        )

    def get_task(self, tenant_db, task_id: int) -> TaskOpsTask:
        item = tenant_db.get(TaskOpsTask, task_id)
        if item is None:
            raise ValueError("Tarea no encontrada")
        return item

    def get_task_detail(self, tenant_db, task_id: int) -> dict:
        task = self.get_task(tenant_db, task_id)
        return {
            "task": task,
            "comments": self.list_comments(tenant_db, task.id),
            "attachments": self.list_attachments(tenant_db, task.id),
            "status_events": self.list_status_events(tenant_db, task.id),
        }

    def list_kanban_columns(self, tenant_db, *, include_inactive: bool = False) -> list[dict]:
        rows = self.list_tasks(
            tenant_db,
            include_inactive=include_inactive,
            include_closed=True,
        )
        grouped: dict[str, list[TaskOpsTask]] = {status: [] for status in self.KANBAN_STATUSES}
        for row in rows:
            if row.status == "cancelled":
                continue
            grouped.setdefault(row.status, []).append(row)
        return [
            {
                "status": status,
                "items": grouped.get(status, []),
                "total": len(grouped.get(status, [])),
            }
            for status in self.KANBAN_STATUSES
        ]

    def create_task(self, tenant_db, payload, *, actor_user_id: int | None = None) -> TaskOpsTask:
        status = self._validate_status(payload.status)
        item = TaskOpsTask(
            client_id=self._validate_client(tenant_db, payload.client_id),
            opportunity_id=self._validate_opportunity(tenant_db, payload.opportunity_id),
            work_order_id=self._validate_work_order(tenant_db, payload.work_order_id),
            assigned_user_id=self._validate_user(tenant_db, payload.assigned_user_id),
            assigned_work_group_id=self._validate_work_group(tenant_db, payload.assigned_work_group_id),
            title=self._normalize_required(payload.title, field_name="titulo"),
            description=self._normalize_optional(payload.description),
            status=status,
            priority=self._validate_priority(payload.priority),
            due_at=payload.due_at,
            started_at=self._now() if status == "in_progress" else None,
            completed_at=self._now() if status in self.CLOSED_STATUSES else None,
            created_by_user_id=actor_user_id,
            updated_by_user_id=actor_user_id,
            is_active=bool(payload.is_active),
            sort_order=int(payload.sort_order),
        )
        tenant_db.add(item)
        tenant_db.flush()
        self._record_status_event(
            tenant_db,
            item.id,
            event_type="created",
            from_status=None,
            to_status=status,
            summary="Tarea creada",
            notes=item.description,
            actor_user_id=actor_user_id,
        )
        tenant_db.commit()
        tenant_db.refresh(item)
        return item

    def update_task(self, tenant_db, task_id: int, payload, *, actor_user_id: int | None = None) -> TaskOpsTask:
        item = self.get_task(tenant_db, task_id)
        previous_status = item.status
        next_status = self._validate_status(payload.status)
        item.client_id = self._validate_client(tenant_db, payload.client_id)
        item.opportunity_id = self._validate_opportunity(tenant_db, payload.opportunity_id)
        item.work_order_id = self._validate_work_order(tenant_db, payload.work_order_id)
        item.assigned_user_id = self._validate_user(tenant_db, payload.assigned_user_id)
        item.assigned_work_group_id = self._validate_work_group(
            tenant_db,
            payload.assigned_work_group_id,
        )
        item.title = self._normalize_required(payload.title, field_name="titulo")
        item.description = self._normalize_optional(payload.description)
        item.status = next_status
        item.priority = self._validate_priority(payload.priority)
        item.due_at = payload.due_at
        item.is_active = bool(payload.is_active)
        item.sort_order = int(payload.sort_order)
        item.updated_by_user_id = actor_user_id

        self._apply_status_transition(
            tenant_db,
            item,
            previous_status=previous_status,
            next_status=next_status,
            actor_user_id=actor_user_id,
            notes=item.description,
        )
        tenant_db.add(item)
        tenant_db.commit()
        tenant_db.refresh(item)
        return item

    def set_task_status(
        self,
        tenant_db,
        task_id: int,
        status: str,
        *,
        notes: str | None = None,
        actor_user_id: int | None = None,
    ) -> TaskOpsTask:
        item = self.get_task(tenant_db, task_id)
        previous_status = item.status
        next_status = self._validate_status(status)
        item.status = next_status
        item.updated_by_user_id = actor_user_id
        self._apply_status_transition(
            tenant_db,
            item,
            previous_status=previous_status,
            next_status=next_status,
            actor_user_id=actor_user_id,
            notes=notes,
        )
        tenant_db.add(item)
        tenant_db.commit()
        tenant_db.refresh(item)
        return item

    def set_task_active(self, tenant_db, task_id: int, is_active: bool) -> TaskOpsTask:
        item = self.get_task(tenant_db, task_id)
        item.is_active = bool(is_active)
        tenant_db.add(item)
        tenant_db.commit()
        tenant_db.refresh(item)
        return item

    def delete_task(self, tenant_db, task_id: int) -> TaskOpsTask:
        item = self.get_task(tenant_db, task_id)
        attachments = self.list_attachments(tenant_db, item.id)
        absolute_paths = [self._attachments_root() / attachment.storage_key for attachment in attachments]
        tenant_db.delete(item)
        tenant_db.commit()
        for path in absolute_paths:
            if path.exists():
                path.unlink()
        return item

    def list_comments(self, tenant_db, task_id: int) -> list[TaskOpsTaskComment]:
        self.get_task(tenant_db, task_id)
        return (
            tenant_db.query(TaskOpsTaskComment)
            .filter(TaskOpsTaskComment.task_id == task_id)
            .order_by(TaskOpsTaskComment.created_at.desc(), TaskOpsTaskComment.id.desc())
            .all()
        )

    def create_comment(
        self,
        tenant_db,
        task_id: int,
        payload,
        *,
        actor_user_id: int | None = None,
    ) -> TaskOpsTaskComment:
        self.get_task(tenant_db, task_id)
        item = TaskOpsTaskComment(
            task_id=task_id,
            comment=self._normalize_required(payload.comment, field_name="comentario"),
            created_by_user_id=actor_user_id,
        )
        tenant_db.add(item)
        tenant_db.commit()
        tenant_db.refresh(item)
        return item

    def delete_comment(self, tenant_db, task_id: int, comment_id: int) -> TaskOpsTaskComment:
        self.get_task(tenant_db, task_id)
        item = tenant_db.get(TaskOpsTaskComment, comment_id)
        if item is None or item.task_id != task_id:
            raise ValueError("Comentario no encontrado")
        tenant_db.delete(item)
        tenant_db.commit()
        return item

    def list_attachments(self, tenant_db, task_id: int) -> list[TaskOpsTaskAttachment]:
        self.get_task(tenant_db, task_id)
        return (
            tenant_db.query(TaskOpsTaskAttachment)
            .filter(TaskOpsTaskAttachment.task_id == task_id)
            .order_by(TaskOpsTaskAttachment.created_at.desc(), TaskOpsTaskAttachment.id.desc())
            .all()
        )

    def create_attachment(
        self,
        tenant_db,
        task_id: int,
        *,
        file_name: str,
        content_type: str | None,
        content_bytes: bytes,
        notes: str | None = None,
        actor_user_id: int | None = None,
    ) -> TaskOpsTaskAttachment:
        self.get_task(tenant_db, task_id)
        normalized_file_name = self._normalize_attachment_file_name(file_name)
        normalized_content_type = (content_type or "").strip().lower() or None
        if normalized_content_type not in self.ATTACHMENT_ALLOWED_CONTENT_TYPES:
            raise ValueError("Tipo de archivo no soportado para adjuntos TaskOps")
        if not content_bytes:
            raise ValueError("El adjunto TaskOps no puede estar vacío")
        if len(content_bytes) > self.ATTACHMENT_MAX_SIZE_BYTES:
            raise ValueError("El adjunto TaskOps supera el tamaño máximo permitido de 8 MB")
        suffix = Path(normalized_file_name).suffix.lower() or self._content_type_to_suffix(
            normalized_content_type
        )
        storage_key = str(Path(f"task_{task_id}") / f"{uuid4().hex}{suffix}")
        absolute_path = self._attachments_root() / storage_key
        absolute_path.parent.mkdir(parents=True, exist_ok=True)
        absolute_path.write_bytes(content_bytes)
        item = TaskOpsTaskAttachment(
            task_id=task_id,
            file_name=normalized_file_name,
            storage_key=storage_key,
            content_type=normalized_content_type,
            file_size=len(content_bytes),
            notes=self._normalize_optional(notes),
            uploaded_by_user_id=actor_user_id,
        )
        try:
            tenant_db.add(item)
            tenant_db.commit()
        except Exception:
            tenant_db.rollback()
            if absolute_path.exists():
                absolute_path.unlink()
            raise
        tenant_db.refresh(item)
        return item

    def delete_attachment(self, tenant_db, task_id: int, attachment_id: int) -> TaskOpsTaskAttachment:
        self.get_task(tenant_db, task_id)
        item = tenant_db.get(TaskOpsTaskAttachment, attachment_id)
        if item is None or item.task_id != task_id:
            raise ValueError("Adjunto no encontrado")
        absolute_path = self._attachments_root() / item.storage_key
        tenant_db.delete(item)
        tenant_db.commit()
        if absolute_path.exists():
            absolute_path.unlink()
        return item

    def get_attachment_file(self, tenant_db, task_id: int, attachment_id: int) -> tuple[TaskOpsTaskAttachment, Path]:
        self.get_task(tenant_db, task_id)
        item = tenant_db.get(TaskOpsTaskAttachment, attachment_id)
        if item is None or item.task_id != task_id:
            raise ValueError("Adjunto no encontrado")
        absolute_path = self._attachments_root() / item.storage_key
        if not absolute_path.exists():
            raise ValueError("El adjunto TaskOps no está disponible en almacenamiento")
        return item, absolute_path

    def list_status_events(self, tenant_db, task_id: int) -> list[TaskOpsTaskStatusEvent]:
        self.get_task(tenant_db, task_id)
        return (
            tenant_db.query(TaskOpsTaskStatusEvent)
            .filter(TaskOpsTaskStatusEvent.task_id == task_id)
            .order_by(TaskOpsTaskStatusEvent.created_at.desc(), TaskOpsTaskStatusEvent.id.desc())
            .all()
        )

    def get_reference_maps(self, tenant_db, task_rows: list[TaskOpsTask]) -> dict[str, dict[int, str]]:
        client_ids = [item.client_id for item in task_rows if item.client_id]
        opportunity_ids = [item.opportunity_id for item in task_rows if item.opportunity_id]
        work_order_ids = [item.work_order_id for item in task_rows if item.work_order_id]
        user_ids = [
            user_id
            for item in task_rows
            for user_id in (item.assigned_user_id, item.created_by_user_id, item.updated_by_user_id)
            if user_id
        ]
        work_group_ids = [item.assigned_work_group_id for item in task_rows if item.assigned_work_group_id]
        return {
            "clients": self.get_client_display_map(tenant_db, client_ids),
            "opportunities": self.get_opportunity_title_map(tenant_db, opportunity_ids),
            "work_orders": self.get_work_order_title_map(tenant_db, work_order_ids),
            "users": self.get_user_display_map(tenant_db, user_ids),
            "work_groups": self.get_work_group_name_map(tenant_db, work_group_ids),
        }

    def get_client_display_map(self, tenant_db, client_ids: list[int]) -> dict[int, str]:
        normalized_ids = [item for item in client_ids if item]
        if not normalized_ids:
            return {}
        rows = (
            tenant_db.query(BusinessClient.id, BusinessOrganization.name)
            .join(BusinessOrganization, BusinessOrganization.id == BusinessClient.organization_id)
            .filter(BusinessClient.id.in_(normalized_ids))
            .all()
        )
        return {client_id: name for client_id, name in rows}

    def get_opportunity_title_map(self, tenant_db, opportunity_ids: list[int]) -> dict[int, str]:
        normalized_ids = [item for item in opportunity_ids if item]
        if not normalized_ids:
            return {}
        rows = (
            tenant_db.query(CRMOpportunity.id, CRMOpportunity.title)
            .filter(CRMOpportunity.id.in_(normalized_ids))
            .all()
        )
        return {row_id: title for row_id, title in rows}

    def get_work_order_title_map(self, tenant_db, work_order_ids: list[int]) -> dict[int, str]:
        normalized_ids = [item for item in work_order_ids if item]
        if not normalized_ids:
            return {}
        rows = (
            tenant_db.query(MaintenanceWorkOrder.id, MaintenanceWorkOrder.title)
            .filter(MaintenanceWorkOrder.id.in_(normalized_ids))
            .all()
        )
        return {row_id: title for row_id, title in rows}

    def get_user_display_map(self, tenant_db, user_ids: list[int]) -> dict[int, str]:
        normalized_ids = [item for item in user_ids if item]
        if not normalized_ids:
            return {}
        rows = (
            tenant_db.query(User.id, User.full_name)
            .filter(User.id.in_(normalized_ids))
            .all()
        )
        return {row_id: full_name for row_id, full_name in rows}

    def get_work_group_name_map(self, tenant_db, work_group_ids: list[int]) -> dict[int, str]:
        normalized_ids = [item for item in work_group_ids if item]
        if not normalized_ids:
            return {}
        rows = (
            tenant_db.query(BusinessWorkGroup.id, BusinessWorkGroup.name)
            .filter(BusinessWorkGroup.id.in_(normalized_ids))
            .all()
        )
        return {row_id: name for row_id, name in rows}

    def build_overview_metrics(self, tenant_db) -> dict[str, int]:
        open_total = tenant_db.query(TaskOpsTask).filter(
            TaskOpsTask.status.in_(sorted(self.OPEN_STATUSES)),
            TaskOpsTask.is_active.is_(True),
        ).count()
        in_progress_total = tenant_db.query(TaskOpsTask).filter(
            TaskOpsTask.status == "in_progress",
            TaskOpsTask.is_active.is_(True),
        ).count()
        blocked_total = tenant_db.query(TaskOpsTask).filter(
            TaskOpsTask.status == "blocked",
            TaskOpsTask.is_active.is_(True),
        ).count()
        due_soon_total = tenant_db.query(TaskOpsTask).filter(
            TaskOpsTask.status.in_(sorted(self.OPEN_STATUSES)),
            TaskOpsTask.due_at.is_not(None),
            TaskOpsTask.due_at <= self._now() + timedelta(days=7),
            TaskOpsTask.is_active.is_(True),
        ).count()
        closed_total = tenant_db.query(TaskOpsTask).filter(
            TaskOpsTask.status.in_(sorted(self.CLOSED_STATUSES))
        ).count()
        return {
            "open_total": open_total,
            "in_progress_total": in_progress_total,
            "blocked_total": blocked_total,
            "due_soon_total": due_soon_total,
            "closed_total": closed_total,
        }

    def _apply_status_transition(
        self,
        tenant_db,
        item: TaskOpsTask,
        *,
        previous_status: str,
        next_status: str,
        actor_user_id: int | None,
        notes: str | None,
    ) -> None:
        if previous_status == next_status:
            return
        if next_status == "in_progress" and item.started_at is None:
            item.started_at = self._now()
        if next_status in self.CLOSED_STATUSES:
            item.completed_at = self._now()
            item.is_active = False
        elif previous_status in self.CLOSED_STATUSES:
            item.completed_at = None
            item.is_active = True
        self._record_status_event(
            tenant_db,
            item.id,
            event_type="status_changed",
            from_status=previous_status,
            to_status=next_status,
            summary="Estado actualizado",
            notes=notes,
            actor_user_id=actor_user_id,
        )

    def _record_status_event(
        self,
        tenant_db,
        task_id: int,
        *,
        event_type: str,
        from_status: str | None,
        to_status: str | None,
        summary: str | None,
        notes: str | None,
        actor_user_id: int | None,
    ) -> None:
        tenant_db.add(
            TaskOpsTaskStatusEvent(
                task_id=task_id,
                event_type=event_type,
                from_status=from_status,
                to_status=to_status,
                summary=self._normalize_optional(summary),
                notes=self._normalize_optional(notes),
                created_by_user_id=actor_user_id,
            )
        )
        tenant_db.flush()

    def _validate_client(self, tenant_db, client_id: int | None) -> int | None:
        if client_id is None:
            return None
        client = tenant_db.get(BusinessClient, client_id)
        if client is None:
            raise ValueError("Cliente no encontrado")
        return client.id

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
            raise ValueError("OT de mantención no encontrada")
        return item.id

    def _validate_user(self, tenant_db, user_id: int | None) -> int | None:
        if user_id is None:
            return None
        item = tenant_db.get(User, user_id)
        if item is None:
            raise ValueError("Usuario asignado no encontrado")
        return item.id

    def _validate_work_group(self, tenant_db, work_group_id: int | None) -> int | None:
        if work_group_id is None:
            return None
        item = tenant_db.get(BusinessWorkGroup, work_group_id)
        if item is None:
            raise ValueError("Grupo de trabajo no encontrado")
        return item.id

    def _validate_status(self, status: str | None) -> str:
        normalized = (status or "backlog").strip().lower()
        if normalized not in self.VALID_STATUSES:
            raise ValueError("Estado de tarea inválido")
        return normalized

    def _validate_priority(self, priority: str | None) -> str:
        normalized = (priority or "normal").strip().lower()
        if normalized not in self.VALID_PRIORITIES:
            raise ValueError("Prioridad de tarea inválida")
        return normalized

    def _attachments_root(self) -> Path:
        root = Path(settings.TASKOPS_ATTACHMENTS_DIR)
        root.mkdir(parents=True, exist_ok=True)
        return root

    @staticmethod
    def _content_type_to_suffix(content_type: str | None) -> str:
        mapping = {
            "application/pdf": ".pdf",
            "image/jpeg": ".jpg",
            "image/png": ".png",
            "image/webp": ".webp",
            "text/plain": ".txt",
        }
        return mapping.get(content_type or "", ".bin")

    @staticmethod
    def _normalize_attachment_file_name(file_name: str) -> str:
        normalized = Path(file_name or "attachment").name.strip()
        return normalized or "attachment"

    @staticmethod
    def _normalize_required(value: str | None, *, field_name: str) -> str:
        text = " ".join((value or "").strip().split())
        if not text:
            raise ValueError(f"El campo {field_name} es obligatorio")
        return text

    @staticmethod
    def _normalize_optional(value: str | None) -> str | None:
        text = (value or "").strip()
        return text or None

    @staticmethod
    def _now() -> datetime:
        return datetime.now(timezone.utc)
