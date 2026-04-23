from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from sqlalchemy import func

from app.apps.tenant_modules.business_core.models import BusinessClient, BusinessOrganization
from app.apps.tenant_modules.crm.models import (
    CRMOpportunity,
    CRMOpportunityActivity,
    CRMOpportunityAttachment,
    CRMOpportunityContact,
    CRMOpportunityNote,
    CRMOpportunityStageEvent,
)
from app.common.config.settings import settings


class CRMOpportunityService:
    VALID_STAGES = {
        "lead",
        "qualified",
        "proposal",
        "negotiation",
        "won",
        "lost",
    }
    OPEN_STAGES = {"lead", "qualified", "proposal", "negotiation"}
    CLOSED_STAGES = {"won", "lost"}
    VALID_ACTIVITY_TYPES = {"call", "email", "meeting", "task", "other"}
    VALID_ACTIVITY_STATUSES = {"scheduled", "completed", "cancelled"}
    ATTACHMENT_ALLOWED_CONTENT_TYPES = {
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/webp",
        "text/plain",
    }
    ATTACHMENT_MAX_SIZE_BYTES = 8 * 1024 * 1024

    def list_opportunities(
        self,
        tenant_db,
        *,
        include_inactive: bool = True,
        include_closed: bool = False,
        stage: str | None = None,
        client_id: int | None = None,
        q: str | None = None,
    ) -> list[CRMOpportunity]:
        query = tenant_db.query(CRMOpportunity)
        if not include_inactive:
            query = query.filter(CRMOpportunity.is_active.is_(True))
        if not include_closed:
            query = query.filter(~CRMOpportunity.stage.in_(sorted(self.CLOSED_STAGES)))
        if stage:
            query = query.filter(CRMOpportunity.stage == stage.strip().lower())
        if client_id:
            query = query.filter(CRMOpportunity.client_id == client_id)
        if q and q.strip():
            token = f"%{q.strip().lower()}%"
            query = query.filter(
                func.lower(CRMOpportunity.title).like(token)
                | func.lower(func.coalesce(CRMOpportunity.summary, "")).like(token)
            )
        return (
            query.order_by(
                CRMOpportunity.is_active.desc(),
                CRMOpportunity.sort_order.asc(),
                CRMOpportunity.expected_close_at.asc(),
                CRMOpportunity.created_at.desc(),
            ).all()
        )

    def list_historical(
        self,
        tenant_db,
        *,
        client_id: int | None = None,
        q: str | None = None,
    ) -> list[CRMOpportunity]:
        query = tenant_db.query(CRMOpportunity).filter(
            CRMOpportunity.stage.in_(sorted(self.CLOSED_STAGES))
        )
        if client_id:
            query = query.filter(CRMOpportunity.client_id == client_id)
        if q and q.strip():
            token = f"%{q.strip().lower()}%"
            query = query.filter(
                func.lower(CRMOpportunity.title).like(token)
                | func.lower(func.coalesce(CRMOpportunity.close_reason, "")).like(token)
            )
        return (
            query.order_by(
                CRMOpportunity.closed_at.desc(),
                CRMOpportunity.updated_at.desc(),
                CRMOpportunity.id.desc(),
            ).all()
        )

    def get_opportunity(self, tenant_db, opportunity_id: int) -> CRMOpportunity:
        item = tenant_db.get(CRMOpportunity, opportunity_id)
        if item is None:
            raise ValueError("Oportunidad no encontrada")
        return item

    def get_opportunity_detail(self, tenant_db, opportunity_id: int) -> dict:
        opportunity = self.get_opportunity(tenant_db, opportunity_id)
        return {
            "opportunity": opportunity,
            "contacts": self.list_contacts(tenant_db, opportunity.id),
            "notes": self.list_notes(tenant_db, opportunity.id),
            "activities": self.list_activities(tenant_db, opportunity.id),
            "attachments": self.list_attachments(tenant_db, opportunity.id),
            "stage_events": self.list_stage_events(tenant_db, opportunity.id),
        }

    def list_kanban_columns(self, tenant_db, *, include_inactive: bool = False) -> list[dict]:
        rows = self.list_opportunities(
            tenant_db,
            include_inactive=include_inactive,
            include_closed=False,
        )
        grouped: dict[str, list[CRMOpportunity]] = {stage: [] for stage in sorted(self.OPEN_STAGES)}
        for row in rows:
            grouped.setdefault(row.stage, []).append(row)
        return [
            {
                "stage": stage,
                "items": grouped.get(stage, []),
                "total": len(grouped.get(stage, [])),
                "stage_value": round(sum(float(item.expected_value or 0) for item in grouped.get(stage, [])), 2),
            }
            for stage in ["lead", "qualified", "proposal", "negotiation"]
        ]

    def create_opportunity(self, tenant_db, payload, *, actor_user_id: int | None = None) -> CRMOpportunity:
        client_id = self._validate_client(tenant_db, payload.client_id)
        stage = self._validate_stage(payload.stage)
        item = CRMOpportunity(
            client_id=client_id,
            title=self._normalize_required(payload.title, field_name="titulo"),
            stage=stage,
            owner_user_id=payload.owner_user_id,
            expected_value=None if payload.expected_value is None else max(float(payload.expected_value), 0),
            probability_percent=int(payload.probability_percent),
            expected_close_at=payload.expected_close_at,
            source_channel=self._normalize_optional(payload.source_channel),
            summary=self._normalize_optional(payload.summary),
            next_step=self._normalize_optional(payload.next_step),
            closed_at=self._now() if stage in self.CLOSED_STAGES else None,
            close_reason=None,
            close_notes=None,
            is_active=bool(payload.is_active),
            sort_order=int(payload.sort_order),
        )
        tenant_db.add(item)
        tenant_db.flush()
        self._record_stage_event(
            tenant_db,
            item.id,
            event_type="created",
            from_stage=None,
            to_stage=stage,
            summary="Oportunidad creada",
            notes=item.summary,
            actor_user_id=actor_user_id,
        )
        tenant_db.commit()
        tenant_db.refresh(item)
        return item

    def update_opportunity(self, tenant_db, opportunity_id: int, payload, *, actor_user_id: int | None = None) -> CRMOpportunity:
        item = self.get_opportunity(tenant_db, opportunity_id)
        previous_stage = item.stage
        next_stage = self._validate_stage(payload.stage)
        item.client_id = self._validate_client(tenant_db, payload.client_id)
        item.title = self._normalize_required(payload.title, field_name="titulo")
        item.stage = next_stage
        item.owner_user_id = payload.owner_user_id
        item.expected_value = None if payload.expected_value is None else max(float(payload.expected_value), 0)
        item.probability_percent = int(payload.probability_percent)
        item.expected_close_at = payload.expected_close_at
        item.source_channel = self._normalize_optional(payload.source_channel)
        item.summary = self._normalize_optional(payload.summary)
        item.next_step = self._normalize_optional(payload.next_step)
        item.is_active = bool(payload.is_active)
        item.sort_order = int(payload.sort_order)

        if previous_stage != next_stage:
            if next_stage in self.CLOSED_STAGES:
                item.closed_at = item.closed_at or self._now()
            elif previous_stage in self.CLOSED_STAGES:
                item.closed_at = None
                item.close_reason = None
                item.close_notes = None
            self._record_stage_event(
                tenant_db,
                item.id,
                event_type="stage_changed",
                from_stage=previous_stage,
                to_stage=next_stage,
                summary="Etapa actualizada",
                notes=item.next_step,
                actor_user_id=actor_user_id,
            )

        tenant_db.add(item)
        tenant_db.commit()
        tenant_db.refresh(item)
        return item

    def close_opportunity(
        self,
        tenant_db,
        opportunity_id: int,
        payload,
        *,
        actor_user_id: int | None = None,
    ) -> CRMOpportunity:
        item = self.get_opportunity(tenant_db, opportunity_id)
        final_stage = self._validate_stage(payload.final_stage)
        if final_stage not in self.CLOSED_STAGES:
            raise ValueError("El cierre solo acepta estados finales won o lost")
        previous_stage = item.stage
        item.stage = final_stage
        item.closed_at = self._now()
        item.close_reason = self._normalize_optional(payload.close_reason)
        item.close_notes = self._normalize_optional(payload.close_notes)
        item.is_active = False
        tenant_db.add(item)
        self._record_stage_event(
            tenant_db,
            item.id,
            event_type="closed",
            from_stage=previous_stage,
            to_stage=final_stage,
            summary="Oportunidad cerrada",
            notes=item.close_notes or item.close_reason,
            actor_user_id=actor_user_id,
        )
        tenant_db.commit()
        tenant_db.refresh(item)
        return item

    def set_opportunity_active(self, tenant_db, opportunity_id: int, is_active: bool) -> CRMOpportunity:
        item = self.get_opportunity(tenant_db, opportunity_id)
        item.is_active = bool(is_active)
        tenant_db.add(item)
        tenant_db.commit()
        tenant_db.refresh(item)
        return item

    def delete_opportunity(self, tenant_db, opportunity_id: int) -> CRMOpportunity:
        item = self.get_opportunity(tenant_db, opportunity_id)
        attachments = self.list_attachments(tenant_db, item.id)
        absolute_paths = [self._attachments_root() / attachment.storage_key for attachment in attachments]
        tenant_db.delete(item)
        tenant_db.commit()
        for path in absolute_paths:
            if path.exists():
                path.unlink()
        return item

    def list_contacts(self, tenant_db, opportunity_id: int) -> list[CRMOpportunityContact]:
        self.get_opportunity(tenant_db, opportunity_id)
        return (
            tenant_db.query(CRMOpportunityContact)
            .filter(CRMOpportunityContact.opportunity_id == opportunity_id)
            .order_by(CRMOpportunityContact.sort_order.asc(), CRMOpportunityContact.id.asc())
            .all()
        )

    def save_contact(
        self,
        tenant_db,
        opportunity_id: int,
        payload,
        *,
        contact_id: int | None = None,
    ) -> CRMOpportunityContact:
        self.get_opportunity(tenant_db, opportunity_id)
        if contact_id is None:
            item = CRMOpportunityContact(opportunity_id=opportunity_id, full_name="")
        else:
            item = tenant_db.get(CRMOpportunityContact, contact_id)
            if item is None or item.opportunity_id != opportunity_id:
                raise ValueError("Contacto comercial no encontrado")
        item.full_name = self._normalize_required(payload.full_name, field_name="nombre")
        item.role = self._normalize_optional(payload.role)
        item.email = self._normalize_optional(payload.email)
        item.phone = self._normalize_optional(payload.phone)
        item.notes = self._normalize_optional(payload.notes)
        item.sort_order = int(payload.sort_order)
        tenant_db.add(item)
        tenant_db.commit()
        tenant_db.refresh(item)
        return item

    def delete_contact(self, tenant_db, opportunity_id: int, contact_id: int) -> CRMOpportunityContact:
        self.get_opportunity(tenant_db, opportunity_id)
        item = tenant_db.get(CRMOpportunityContact, contact_id)
        if item is None or item.opportunity_id != opportunity_id:
            raise ValueError("Contacto comercial no encontrado")
        tenant_db.delete(item)
        tenant_db.commit()
        return item

    def list_notes(self, tenant_db, opportunity_id: int) -> list[CRMOpportunityNote]:
        self.get_opportunity(tenant_db, opportunity_id)
        return (
            tenant_db.query(CRMOpportunityNote)
            .filter(CRMOpportunityNote.opportunity_id == opportunity_id)
            .order_by(CRMOpportunityNote.created_at.desc(), CRMOpportunityNote.id.desc())
            .all()
        )

    def save_note(
        self,
        tenant_db,
        opportunity_id: int,
        payload,
        *,
        actor_user_id: int | None = None,
        note_id: int | None = None,
    ) -> CRMOpportunityNote:
        self.get_opportunity(tenant_db, opportunity_id)
        if note_id is None:
            item = CRMOpportunityNote(
                opportunity_id=opportunity_id,
                note="",
                created_by_user_id=actor_user_id,
            )
        else:
            item = tenant_db.get(CRMOpportunityNote, note_id)
            if item is None or item.opportunity_id != opportunity_id:
                raise ValueError("Nota comercial no encontrada")
        item.note = self._normalize_required(payload.note, field_name="nota")
        tenant_db.add(item)
        tenant_db.commit()
        tenant_db.refresh(item)
        return item

    def delete_note(self, tenant_db, opportunity_id: int, note_id: int) -> CRMOpportunityNote:
        self.get_opportunity(tenant_db, opportunity_id)
        item = tenant_db.get(CRMOpportunityNote, note_id)
        if item is None or item.opportunity_id != opportunity_id:
            raise ValueError("Nota comercial no encontrada")
        tenant_db.delete(item)
        tenant_db.commit()
        return item

    def list_activities(self, tenant_db, opportunity_id: int) -> list[CRMOpportunityActivity]:
        self.get_opportunity(tenant_db, opportunity_id)
        return (
            tenant_db.query(CRMOpportunityActivity)
            .filter(CRMOpportunityActivity.opportunity_id == opportunity_id)
            .order_by(
                CRMOpportunityActivity.scheduled_at.asc(),
                CRMOpportunityActivity.created_at.desc(),
                CRMOpportunityActivity.id.desc(),
            )
            .all()
        )

    def save_activity(
        self,
        tenant_db,
        opportunity_id: int,
        payload,
        *,
        actor_user_id: int | None = None,
        activity_id: int | None = None,
    ) -> CRMOpportunityActivity:
        self.get_opportunity(tenant_db, opportunity_id)
        activity_type = self._validate_activity_type(payload.activity_type)
        status = self._validate_activity_status(payload.status)
        if activity_id is None:
            item = CRMOpportunityActivity(
                opportunity_id=opportunity_id,
                activity_type=activity_type,
                created_by_user_id=actor_user_id,
            )
        else:
            item = tenant_db.get(CRMOpportunityActivity, activity_id)
            if item is None or item.opportunity_id != opportunity_id:
                raise ValueError("Actividad comercial no encontrada")
        item.activity_type = activity_type
        item.description = self._normalize_optional(payload.description)
        item.scheduled_at = payload.scheduled_at
        item.status = status
        item.completed_at = self._now() if status == "completed" else None
        tenant_db.add(item)
        tenant_db.commit()
        tenant_db.refresh(item)
        return item

    def set_activity_status(
        self,
        tenant_db,
        opportunity_id: int,
        activity_id: int,
        status: str,
    ) -> CRMOpportunityActivity:
        self.get_opportunity(tenant_db, opportunity_id)
        item = tenant_db.get(CRMOpportunityActivity, activity_id)
        if item is None or item.opportunity_id != opportunity_id:
            raise ValueError("Actividad comercial no encontrada")
        normalized = self._validate_activity_status(status)
        item.status = normalized
        item.completed_at = self._now() if normalized == "completed" else None
        tenant_db.add(item)
        tenant_db.commit()
        tenant_db.refresh(item)
        return item

    def delete_activity(self, tenant_db, opportunity_id: int, activity_id: int) -> CRMOpportunityActivity:
        self.get_opportunity(tenant_db, opportunity_id)
        item = tenant_db.get(CRMOpportunityActivity, activity_id)
        if item is None or item.opportunity_id != opportunity_id:
            raise ValueError("Actividad comercial no encontrada")
        tenant_db.delete(item)
        tenant_db.commit()
        return item

    def list_attachments(self, tenant_db, opportunity_id: int) -> list[CRMOpportunityAttachment]:
        self.get_opportunity(tenant_db, opportunity_id)
        return (
            tenant_db.query(CRMOpportunityAttachment)
            .filter(CRMOpportunityAttachment.opportunity_id == opportunity_id)
            .order_by(CRMOpportunityAttachment.created_at.desc(), CRMOpportunityAttachment.id.desc())
            .all()
        )

    def create_attachment(
        self,
        tenant_db,
        opportunity_id: int,
        *,
        file_name: str,
        content_type: str | None,
        content_bytes: bytes,
        notes: str | None = None,
        actor_user_id: int | None = None,
    ) -> CRMOpportunityAttachment:
        self.get_opportunity(tenant_db, opportunity_id)
        normalized_file_name = self._normalize_attachment_file_name(file_name)
        normalized_content_type = (content_type or "").strip().lower() or None
        if normalized_content_type not in self.ATTACHMENT_ALLOWED_CONTENT_TYPES:
            raise ValueError("Tipo de archivo no soportado para adjuntos CRM")
        if not content_bytes:
            raise ValueError("El adjunto CRM no puede estar vacío")
        if len(content_bytes) > self.ATTACHMENT_MAX_SIZE_BYTES:
            raise ValueError("El adjunto CRM supera el tamaño máximo permitido de 8 MB")
        suffix = Path(normalized_file_name).suffix.lower() or self._content_type_to_suffix(
            normalized_content_type
        )
        storage_key = str(Path(f"opportunity_{opportunity_id}") / f"{uuid4().hex}{suffix}")
        absolute_path = self._attachments_root() / storage_key
        absolute_path.parent.mkdir(parents=True, exist_ok=True)
        absolute_path.write_bytes(content_bytes)
        item = CRMOpportunityAttachment(
            opportunity_id=opportunity_id,
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

    def delete_attachment(self, tenant_db, opportunity_id: int, attachment_id: int) -> CRMOpportunityAttachment:
        self.get_opportunity(tenant_db, opportunity_id)
        item = tenant_db.get(CRMOpportunityAttachment, attachment_id)
        if item is None or item.opportunity_id != opportunity_id:
            raise ValueError("Adjunto CRM no encontrado")
        absolute_path = self._attachments_root() / item.storage_key
        tenant_db.delete(item)
        tenant_db.commit()
        if absolute_path.exists():
            absolute_path.unlink()
        return item

    def get_attachment_file(
        self,
        tenant_db,
        opportunity_id: int,
        attachment_id: int,
    ) -> tuple[CRMOpportunityAttachment, Path]:
        self.get_opportunity(tenant_db, opportunity_id)
        item = tenant_db.get(CRMOpportunityAttachment, attachment_id)
        if item is None or item.opportunity_id != opportunity_id:
            raise ValueError("Adjunto CRM no encontrado")
        absolute_path = self._attachments_root() / item.storage_key
        if not absolute_path.exists():
            raise ValueError("El adjunto CRM no está disponible en almacenamiento")
        return item, absolute_path

    def list_stage_events(self, tenant_db, opportunity_id: int) -> list[CRMOpportunityStageEvent]:
        self.get_opportunity(tenant_db, opportunity_id)
        return (
            tenant_db.query(CRMOpportunityStageEvent)
            .filter(CRMOpportunityStageEvent.opportunity_id == opportunity_id)
            .order_by(CRMOpportunityStageEvent.created_at.desc(), CRMOpportunityStageEvent.id.desc())
            .all()
        )

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

    def _record_stage_event(
        self,
        tenant_db,
        opportunity_id: int,
        *,
        event_type: str,
        from_stage: str | None,
        to_stage: str | None,
        summary: str | None,
        notes: str | None,
        actor_user_id: int | None,
    ) -> None:
        tenant_db.add(
            CRMOpportunityStageEvent(
                opportunity_id=opportunity_id,
                event_type=event_type,
                from_stage=from_stage,
                to_stage=to_stage,
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

    def _validate_stage(self, stage: str | None) -> str:
        normalized = (stage or "lead").strip().lower()
        if normalized not in self.VALID_STAGES:
            raise ValueError("Etapa de oportunidad invalida")
        return normalized

    def _validate_activity_type(self, activity_type: str | None) -> str:
        normalized = (activity_type or "other").strip().lower()
        if normalized not in self.VALID_ACTIVITY_TYPES:
            raise ValueError("Tipo de actividad comercial invalido")
        return normalized

    def _validate_activity_status(self, status: str | None) -> str:
        normalized = (status or "scheduled").strip().lower()
        if normalized not in self.VALID_ACTIVITY_STATUSES:
            raise ValueError("Estado de actividad comercial invalido")
        return normalized

    def _attachments_root(self) -> Path:
        root = Path(settings.CRM_ATTACHMENTS_DIR)
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
