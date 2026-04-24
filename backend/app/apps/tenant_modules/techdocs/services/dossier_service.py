import json
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from sqlalchemy import func

from app.apps.tenant_modules.business_core.models import BusinessClient, BusinessOrganization, BusinessSite
from app.apps.tenant_modules.core.models.user import User
from app.apps.tenant_modules.crm.models import CRMOpportunity
from app.apps.tenant_modules.maintenance.models import MaintenanceInstallation, MaintenanceWorkOrder
from app.apps.tenant_modules.taskops.models import TaskOpsTask
from app.apps.tenant_modules.techdocs.models import (
    TechDocsAuditEvent,
    TechDocsDossier,
    TechDocsEvidence,
    TechDocsMeasurement,
    TechDocsSection,
)
from app.common.config.settings import settings


class TechDocsDossierService:
    VALID_DOSSIER_TYPES = {
        "installation",
        "diagnosis",
        "maintenance_support",
        "commercial_support",
        "compliance",
        "custom",
    }
    VALID_STATUSES = {"draft", "in_review", "approved", "archived"}
    VALID_SECTION_KINDS = {"dc", "ac", "grounding", "inspection", "documents", "custom"}
    VALID_EVIDENCE_KINDS = {"photo", "report", "certificate", "plan", "support", "note"}
    ATTACHMENT_ALLOWED_CONTENT_TYPES = {
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/webp",
        "text/plain",
    }
    ATTACHMENT_MAX_SIZE_BYTES = 12 * 1024 * 1024

    def list_dossiers(
        self,
        tenant_db,
        *,
        include_inactive: bool = True,
        include_archived: bool = True,
        status: str | None = None,
        dossier_type: str | None = None,
        client_id: int | None = None,
        installation_id: int | None = None,
        q: str | None = None,
    ) -> list[TechDocsDossier]:
        query = tenant_db.query(TechDocsDossier)
        if not include_inactive:
            query = query.filter(TechDocsDossier.is_active.is_(True))
        if not include_archived:
            query = query.filter(TechDocsDossier.status != "archived")
        if status:
            query = query.filter(TechDocsDossier.status == self._validate_status(status))
        if dossier_type:
            query = query.filter(
                TechDocsDossier.dossier_type == self._validate_dossier_type(dossier_type)
            )
        if client_id:
            query = query.filter(TechDocsDossier.client_id == client_id)
        if installation_id:
            query = query.filter(TechDocsDossier.installation_id == installation_id)
        if q and q.strip():
            token = f"%{q.strip().lower()}%"
            query = query.filter(
                func.lower(TechDocsDossier.title).like(token)
                | func.lower(func.coalesce(TechDocsDossier.summary, "")).like(token)
                | func.lower(func.coalesce(TechDocsDossier.technical_notes, "")).like(token)
            )
        return (
            query.order_by(
                TechDocsDossier.is_active.desc(),
                TechDocsDossier.updated_at.desc(),
                TechDocsDossier.id.desc(),
            ).all()
        )

    def list_audit_events(
        self,
        tenant_db,
        *,
        dossier_id: int | None = None,
        q: str | None = None,
    ) -> list[TechDocsAuditEvent]:
        query = tenant_db.query(TechDocsAuditEvent)
        if dossier_id:
            query = query.filter(TechDocsAuditEvent.dossier_id == dossier_id)
        if q and q.strip():
            token = f"%{q.strip().lower()}%"
            query = query.filter(
                func.lower(TechDocsAuditEvent.event_type).like(token)
                | func.lower(func.coalesce(TechDocsAuditEvent.summary, "")).like(token)
                | func.lower(func.coalesce(TechDocsAuditEvent.payload_json, "")).like(token)
            )
        return (
            query.order_by(TechDocsAuditEvent.created_at.desc(), TechDocsAuditEvent.id.desc()).all()
        )

    def get_dossier(self, tenant_db, dossier_id: int) -> TechDocsDossier:
        item = tenant_db.get(TechDocsDossier, dossier_id)
        if item is None:
            raise ValueError("Expediente técnico no encontrado")
        return item

    def get_dossier_detail(self, tenant_db, dossier_id: int) -> dict:
        dossier = self.get_dossier(tenant_db, dossier_id)
        sections = self.list_sections(tenant_db, dossier.id)
        measurements = self.list_measurements(tenant_db, dossier.id)
        measurements_by_section: dict[int, list[TechDocsMeasurement]] = {}
        for row in measurements:
            measurements_by_section.setdefault(row.section_id, []).append(row)
        return {
            "dossier": dossier,
            "sections": sections,
            "measurements_by_section": measurements_by_section,
            "evidences": self.list_evidences(tenant_db, dossier.id),
            "audit_events": self.list_audit_events(tenant_db, dossier_id=dossier.id),
        }

    def create_dossier(self, tenant_db, payload, *, actor_user_id: int | None = None) -> TechDocsDossier:
        status = self._validate_status(payload.status)
        item = TechDocsDossier(
            client_id=self._validate_client(tenant_db, payload.client_id),
            site_id=self._validate_site(tenant_db, payload.site_id),
            installation_id=self._validate_installation(tenant_db, payload.installation_id),
            opportunity_id=self._validate_opportunity(tenant_db, payload.opportunity_id),
            work_order_id=self._validate_work_order(tenant_db, payload.work_order_id),
            task_id=self._validate_task(tenant_db, payload.task_id),
            owner_user_id=self._validate_user(tenant_db, payload.owner_user_id),
            title=self._normalize_required(payload.title, field_name="titulo"),
            dossier_type=self._validate_dossier_type(payload.dossier_type),
            status=status,
            summary=self._normalize_optional(payload.summary),
            objective=self._normalize_optional(payload.objective),
            scope_notes=self._normalize_optional(payload.scope_notes),
            technical_notes=self._normalize_optional(payload.technical_notes),
            version=1,
            approved_by_user_id=actor_user_id if status == "approved" else None,
            approved_at=self._now() if status == "approved" else None,
            is_active=bool(payload.is_active),
            created_by_user_id=actor_user_id,
            updated_by_user_id=actor_user_id,
        )
        tenant_db.add(item)
        tenant_db.flush()
        self._audit(
            tenant_db,
            item.id,
            event_type="created",
            summary="Expediente creado",
            payload={"status": item.status, "dossier_type": item.dossier_type},
            actor_user_id=actor_user_id,
        )
        tenant_db.commit()
        tenant_db.refresh(item)
        return item

    def update_dossier(self, tenant_db, dossier_id: int, payload, *, actor_user_id: int | None = None) -> TechDocsDossier:
        item = self.get_dossier(tenant_db, dossier_id)
        previous_status = item.status
        changes: dict[str, dict[str, object | None]] = {}
        updated_values = {
            "client_id": self._validate_client(tenant_db, payload.client_id),
            "site_id": self._validate_site(tenant_db, payload.site_id),
            "installation_id": self._validate_installation(tenant_db, payload.installation_id),
            "opportunity_id": self._validate_opportunity(tenant_db, payload.opportunity_id),
            "work_order_id": self._validate_work_order(tenant_db, payload.work_order_id),
            "task_id": self._validate_task(tenant_db, payload.task_id),
            "owner_user_id": self._validate_user(tenant_db, payload.owner_user_id),
            "title": self._normalize_required(payload.title, field_name="titulo"),
            "dossier_type": self._validate_dossier_type(payload.dossier_type),
            "status": self._validate_status(payload.status),
            "summary": self._normalize_optional(payload.summary),
            "objective": self._normalize_optional(payload.objective),
            "scope_notes": self._normalize_optional(payload.scope_notes),
            "technical_notes": self._normalize_optional(payload.technical_notes),
            "is_active": bool(payload.is_active),
        }
        for field_name, new_value in updated_values.items():
            old_value = getattr(item, field_name)
            if old_value != new_value:
                changes[field_name] = {"from": old_value, "to": new_value}
                setattr(item, field_name, new_value)
        if item.status == "approved" and previous_status != "approved":
            item.approved_by_user_id = actor_user_id
            item.approved_at = self._now()
        elif item.status != "approved" and previous_status == "approved":
            item.approved_by_user_id = None
            item.approved_at = None
        item.updated_by_user_id = actor_user_id
        self._touch_dossier(item)
        if changes:
            self._audit(
                tenant_db,
                item.id,
                event_type="updated",
                summary="Expediente actualizado",
                payload=changes,
                actor_user_id=actor_user_id,
            )
        if previous_status != item.status:
            self._audit(
                tenant_db,
                item.id,
                event_type="status_changed",
                summary="Estado actualizado",
                payload={"from": previous_status, "to": item.status},
                actor_user_id=actor_user_id,
            )
        tenant_db.add(item)
        tenant_db.commit()
        tenant_db.refresh(item)
        return item

    def set_dossier_status(
        self,
        tenant_db,
        dossier_id: int,
        status: str,
        *,
        notes: str | None = None,
        actor_user_id: int | None = None,
    ) -> TechDocsDossier:
        item = self.get_dossier(tenant_db, dossier_id)
        previous_status = item.status
        item.status = self._validate_status(status)
        if item.status == "approved":
            item.approved_by_user_id = actor_user_id
            item.approved_at = self._now()
        elif previous_status == "approved":
            item.approved_by_user_id = None
            item.approved_at = None
        item.updated_by_user_id = actor_user_id
        self._touch_dossier(item)
        self._audit(
            tenant_db,
            item.id,
            event_type="status_changed",
            summary="Estado actualizado",
            payload={"from": previous_status, "to": item.status, "notes": self._normalize_optional(notes)},
            actor_user_id=actor_user_id,
        )
        tenant_db.add(item)
        tenant_db.commit()
        tenant_db.refresh(item)
        return item

    def delete_dossier(self, tenant_db, dossier_id: int, *, actor_user_id: int | None = None) -> TechDocsDossier:
        item = self.get_dossier(tenant_db, dossier_id)
        item.is_active = False
        previous_status = item.status
        item.status = "archived"
        item.updated_by_user_id = actor_user_id
        self._touch_dossier(item)
        self._audit(
            tenant_db,
            item.id,
            event_type="archived",
            summary="Expediente archivado",
            payload={"from": previous_status, "to": "archived"},
            actor_user_id=actor_user_id,
        )
        tenant_db.add(item)
        tenant_db.commit()
        tenant_db.refresh(item)
        return item

    def list_sections(self, tenant_db, dossier_id: int) -> list[TechDocsSection]:
        self.get_dossier(tenant_db, dossier_id)
        return (
            tenant_db.query(TechDocsSection)
            .filter(TechDocsSection.dossier_id == dossier_id)
            .order_by(TechDocsSection.sort_order.asc(), TechDocsSection.id.asc())
            .all()
        )

    def create_section(self, tenant_db, dossier_id: int, payload, *, actor_user_id: int | None = None) -> TechDocsSection:
        dossier = self.get_dossier(tenant_db, dossier_id)
        item = TechDocsSection(
            dossier_id=dossier.id,
            section_kind=self._validate_section_kind(payload.section_kind),
            title=self._normalize_required(payload.title, field_name="sección"),
            notes=self._normalize_optional(payload.notes),
            sort_order=int(payload.sort_order),
        )
        tenant_db.add(item)
        tenant_db.flush()
        self._touch_dossier(dossier, actor_user_id=actor_user_id)
        self._audit(
            tenant_db,
            dossier.id,
            event_type="section_created",
            summary="Sección agregada",
            payload={"section_id": item.id, "title": item.title, "section_kind": item.section_kind},
            actor_user_id=actor_user_id,
        )
        tenant_db.commit()
        tenant_db.refresh(item)
        return item

    def update_section(self, tenant_db, section_id: int, payload, *, actor_user_id: int | None = None) -> TechDocsSection:
        item = tenant_db.get(TechDocsSection, section_id)
        if item is None:
            raise ValueError("Sección técnica no encontrada")
        dossier = self.get_dossier(tenant_db, item.dossier_id)
        changes = {}
        updated_values = {
            "section_kind": self._validate_section_kind(payload.section_kind),
            "title": self._normalize_required(payload.title, field_name="sección"),
            "notes": self._normalize_optional(payload.notes),
            "sort_order": int(payload.sort_order),
        }
        for field_name, new_value in updated_values.items():
            old_value = getattr(item, field_name)
            if old_value != new_value:
                changes[field_name] = {"from": old_value, "to": new_value}
                setattr(item, field_name, new_value)
        self._touch_dossier(dossier, actor_user_id=actor_user_id)
        if changes:
            self._audit(
                tenant_db,
                dossier.id,
                event_type="section_updated",
                summary="Sección actualizada",
                payload={"section_id": item.id, "changes": changes},
                actor_user_id=actor_user_id,
            )
        tenant_db.add(item)
        tenant_db.commit()
        tenant_db.refresh(item)
        return item

    def delete_section(self, tenant_db, section_id: int, *, actor_user_id: int | None = None) -> TechDocsSection:
        item = tenant_db.get(TechDocsSection, section_id)
        if item is None:
            raise ValueError("Sección técnica no encontrada")
        dossier = self.get_dossier(tenant_db, item.dossier_id)
        tenant_db.query(TechDocsMeasurement).filter(TechDocsMeasurement.section_id == item.id).delete()
        tenant_db.delete(item)
        self._touch_dossier(dossier, actor_user_id=actor_user_id)
        self._audit(
            tenant_db,
            dossier.id,
            event_type="section_deleted",
            summary="Sección eliminada",
            payload={"section_id": item.id, "title": item.title},
            actor_user_id=actor_user_id,
        )
        tenant_db.commit()
        return item

    def list_measurements(self, tenant_db, dossier_id: int) -> list[TechDocsMeasurement]:
        self.get_dossier(tenant_db, dossier_id)
        return (
            tenant_db.query(TechDocsMeasurement)
            .filter(TechDocsMeasurement.dossier_id == dossier_id)
            .order_by(TechDocsMeasurement.sort_order.asc(), TechDocsMeasurement.id.asc())
            .all()
        )

    def create_measurement(self, tenant_db, section_id: int, payload, *, actor_user_id: int | None = None) -> TechDocsMeasurement:
        section = tenant_db.get(TechDocsSection, section_id)
        if section is None:
            raise ValueError("Sección técnica no encontrada")
        dossier = self.get_dossier(tenant_db, section.dossier_id)
        item = TechDocsMeasurement(
            dossier_id=dossier.id,
            section_id=section.id,
            label=self._normalize_required(payload.label, field_name="medición"),
            measured_value=self._normalize_optional(payload.measured_value),
            unit=self._normalize_optional(payload.unit),
            expected_range=self._normalize_optional(payload.expected_range),
            notes=self._normalize_optional(payload.notes),
            sort_order=int(payload.sort_order),
        )
        tenant_db.add(item)
        tenant_db.flush()
        self._touch_dossier(dossier, actor_user_id=actor_user_id)
        self._audit(
            tenant_db,
            dossier.id,
            event_type="measurement_created",
            summary="Medición agregada",
            payload={"measurement_id": item.id, "section_id": section.id, "label": item.label},
            actor_user_id=actor_user_id,
        )
        tenant_db.commit()
        tenant_db.refresh(item)
        return item

    def update_measurement(self, tenant_db, measurement_id: int, payload, *, actor_user_id: int | None = None) -> TechDocsMeasurement:
        item = tenant_db.get(TechDocsMeasurement, measurement_id)
        if item is None:
            raise ValueError("Medición técnica no encontrada")
        dossier = self.get_dossier(tenant_db, item.dossier_id)
        changes = {}
        updated_values = {
            "label": self._normalize_required(payload.label, field_name="medición"),
            "measured_value": self._normalize_optional(payload.measured_value),
            "unit": self._normalize_optional(payload.unit),
            "expected_range": self._normalize_optional(payload.expected_range),
            "notes": self._normalize_optional(payload.notes),
            "sort_order": int(payload.sort_order),
        }
        for field_name, new_value in updated_values.items():
            old_value = getattr(item, field_name)
            if old_value != new_value:
                changes[field_name] = {"from": old_value, "to": new_value}
                setattr(item, field_name, new_value)
        self._touch_dossier(dossier, actor_user_id=actor_user_id)
        if changes:
            self._audit(
                tenant_db,
                dossier.id,
                event_type="measurement_updated",
                summary="Medición actualizada",
                payload={"measurement_id": item.id, "changes": changes},
                actor_user_id=actor_user_id,
            )
        tenant_db.add(item)
        tenant_db.commit()
        tenant_db.refresh(item)
        return item

    def delete_measurement(self, tenant_db, measurement_id: int, *, actor_user_id: int | None = None) -> TechDocsMeasurement:
        item = tenant_db.get(TechDocsMeasurement, measurement_id)
        if item is None:
            raise ValueError("Medición técnica no encontrada")
        dossier = self.get_dossier(tenant_db, item.dossier_id)
        tenant_db.delete(item)
        self._touch_dossier(dossier, actor_user_id=actor_user_id)
        self._audit(
            tenant_db,
            dossier.id,
            event_type="measurement_deleted",
            summary="Medición eliminada",
            payload={"measurement_id": item.id, "label": item.label},
            actor_user_id=actor_user_id,
        )
        tenant_db.commit()
        return item

    def list_evidences(self, tenant_db, dossier_id: int) -> list[TechDocsEvidence]:
        self.get_dossier(tenant_db, dossier_id)
        return (
            tenant_db.query(TechDocsEvidence)
            .filter(TechDocsEvidence.dossier_id == dossier_id)
            .order_by(TechDocsEvidence.created_at.desc(), TechDocsEvidence.id.desc())
            .all()
        )

    def add_evidence(
        self,
        tenant_db,
        dossier_id: int,
        *,
        file_name: str,
        content_type: str | None,
        content_bytes: bytes,
        evidence_kind: str,
        description: str | None = None,
        actor_user_id: int | None = None,
    ) -> TechDocsEvidence:
        dossier = self.get_dossier(tenant_db, dossier_id)
        normalized_file_name = self._normalize_attachment_file_name(file_name)
        normalized_content_type = (content_type or "").strip().lower() or None
        if normalized_content_type not in self.ATTACHMENT_ALLOWED_CONTENT_TYPES:
            raise ValueError("Tipo de archivo no soportado para expediente técnico")
        if not content_bytes:
            raise ValueError("La evidencia no puede estar vacía")
        if len(content_bytes) > self.ATTACHMENT_MAX_SIZE_BYTES:
            raise ValueError("La evidencia supera el tamaño máximo permitido de 12 MB")
        suffix = Path(normalized_file_name).suffix.lower() or self._content_type_to_suffix(
            normalized_content_type
        )
        storage_key = str(Path(f"dossier_{dossier_id}") / f"{uuid4().hex}{suffix}")
        absolute_path = self._attachments_root() / storage_key
        absolute_path.parent.mkdir(parents=True, exist_ok=True)
        absolute_path.write_bytes(content_bytes)
        item = TechDocsEvidence(
            dossier_id=dossier.id,
            evidence_kind=self._validate_evidence_kind(evidence_kind),
            file_name=normalized_file_name,
            storage_key=storage_key,
            content_type=normalized_content_type,
            file_size=len(content_bytes),
            description=self._normalize_optional(description),
            uploaded_by_user_id=actor_user_id,
        )
        try:
            tenant_db.add(item)
            tenant_db.flush()
            self._touch_dossier(dossier, actor_user_id=actor_user_id)
            self._audit(
                tenant_db,
                dossier.id,
                event_type="evidence_uploaded",
                summary="Evidencia agregada",
                payload={"evidence_id": item.id, "file_name": item.file_name, "evidence_kind": item.evidence_kind},
                actor_user_id=actor_user_id,
            )
            tenant_db.commit()
        except Exception:
            tenant_db.rollback()
            if absolute_path.exists():
                absolute_path.unlink()
            raise
        tenant_db.refresh(item)
        return item

    def delete_evidence(self, tenant_db, dossier_id: int, evidence_id: int, *, actor_user_id: int | None = None) -> TechDocsEvidence:
        dossier = self.get_dossier(tenant_db, dossier_id)
        item = tenant_db.get(TechDocsEvidence, evidence_id)
        if item is None or item.dossier_id != dossier.id:
            raise ValueError("Evidencia no encontrada")
        absolute_path = self._attachments_root() / item.storage_key
        tenant_db.delete(item)
        self._touch_dossier(dossier, actor_user_id=actor_user_id)
        self._audit(
            tenant_db,
            dossier.id,
            event_type="evidence_deleted",
            summary="Evidencia eliminada",
            payload={"evidence_id": item.id, "file_name": item.file_name},
            actor_user_id=actor_user_id,
        )
        tenant_db.commit()
        if absolute_path.exists():
            absolute_path.unlink()
        return item

    def get_evidence_file(self, tenant_db, dossier_id: int, evidence_id: int) -> tuple[TechDocsEvidence, Path]:
        dossier = self.get_dossier(tenant_db, dossier_id)
        item = tenant_db.get(TechDocsEvidence, evidence_id)
        if item is None or item.dossier_id != dossier.id:
            raise ValueError("Evidencia no encontrada")
        absolute_path = self._attachments_root() / item.storage_key
        if not absolute_path.exists():
            raise ValueError("La evidencia no está disponible en almacenamiento")
        return item, absolute_path

    def get_reference_maps(self, tenant_db, dossiers: list[TechDocsDossier]) -> dict[str, dict[int, str]]:
        client_ids = [item.client_id for item in dossiers if item.client_id]
        site_ids = [item.site_id for item in dossiers if item.site_id]
        installation_ids = [item.installation_id for item in dossiers if item.installation_id]
        opportunity_ids = [item.opportunity_id for item in dossiers if item.opportunity_id]
        work_order_ids = [item.work_order_id for item in dossiers if item.work_order_id]
        task_ids = [item.task_id for item in dossiers if item.task_id]
        user_ids = [
            user_id
            for item in dossiers
            for user_id in (
                item.owner_user_id,
                item.created_by_user_id,
                item.updated_by_user_id,
                item.approved_by_user_id,
            )
            if user_id
        ]
        return {
            "clients": self.get_client_display_map(tenant_db, client_ids),
            "sites": self.get_site_display_map(tenant_db, site_ids),
            "installations": self.get_installation_display_map(tenant_db, installation_ids),
            "opportunities": self.get_opportunity_title_map(tenant_db, opportunity_ids),
            "work_orders": self.get_work_order_title_map(tenant_db, work_order_ids),
            "tasks": self.get_task_title_map(tenant_db, task_ids),
            "users": self.get_user_display_map(tenant_db, user_ids),
        }

    def build_overview_metrics(self, tenant_db) -> dict[str, int]:
        active_total = tenant_db.query(TechDocsDossier).filter(
            TechDocsDossier.is_active.is_(True),
            TechDocsDossier.status != "archived",
        ).count()
        review_total = tenant_db.query(TechDocsDossier).filter(
            TechDocsDossier.status == "in_review",
            TechDocsDossier.is_active.is_(True),
        ).count()
        approved_total = tenant_db.query(TechDocsDossier).filter(
            TechDocsDossier.status == "approved",
            TechDocsDossier.is_active.is_(True),
        ).count()
        archived_total = tenant_db.query(TechDocsDossier).filter(
            TechDocsDossier.status == "archived"
        ).count()
        evidence_total = tenant_db.query(TechDocsEvidence).count()
        return {
            "active_total": active_total,
            "review_total": review_total,
            "approved_total": approved_total,
            "archived_total": archived_total,
            "evidence_total": evidence_total,
        }

    def list_recent_evidences(self, tenant_db, *, limit: int = 8) -> list[TechDocsEvidence]:
        return (
            tenant_db.query(TechDocsEvidence)
            .order_by(TechDocsEvidence.created_at.desc(), TechDocsEvidence.id.desc())
            .limit(limit)
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
        return {row_id: name for row_id, name in rows}

    def get_site_display_map(self, tenant_db, site_ids: list[int]) -> dict[int, str]:
        normalized_ids = [item for item in site_ids if item]
        if not normalized_ids:
            return {}
        rows = (
            tenant_db.query(BusinessSite.id, BusinessSite.name)
            .filter(BusinessSite.id.in_(normalized_ids))
            .all()
        )
        return {row_id: name for row_id, name in rows}

    def get_installation_display_map(self, tenant_db, installation_ids: list[int]) -> dict[int, str]:
        normalized_ids = [item for item in installation_ids if item]
        if not normalized_ids:
            return {}
        rows = (
            tenant_db.query(MaintenanceInstallation.id, MaintenanceInstallation.name)
            .filter(MaintenanceInstallation.id.in_(normalized_ids))
            .all()
        )
        return {row_id: name for row_id, name in rows}

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

    def get_task_title_map(self, tenant_db, task_ids: list[int]) -> dict[int, str]:
        normalized_ids = [item for item in task_ids if item]
        if not normalized_ids:
            return {}
        rows = (
            tenant_db.query(TaskOpsTask.id, TaskOpsTask.title)
            .filter(TaskOpsTask.id.in_(normalized_ids))
            .all()
        )
        return {row_id: title for row_id, title in rows}

    def get_user_display_map(self, tenant_db, user_ids: list[int]) -> dict[int, str]:
        normalized_ids = [item for item in user_ids if item]
        if not normalized_ids:
            return {}
        rows = tenant_db.query(User.id, User.full_name).filter(User.id.in_(normalized_ids)).all()
        return {row_id: name for row_id, name in rows}

    def _touch_dossier(self, dossier: TechDocsDossier, *, actor_user_id: int | None = None) -> None:
        dossier.version = int(dossier.version or 0) + 1
        dossier.updated_at = self._now()
        dossier.updated_by_user_id = actor_user_id

    def _audit(
        self,
        tenant_db,
        dossier_id: int,
        *,
        event_type: str,
        summary: str | None,
        payload: dict | None,
        actor_user_id: int | None,
    ) -> None:
        tenant_db.add(
            TechDocsAuditEvent(
                dossier_id=dossier_id,
                event_type=event_type,
                summary=self._normalize_optional(summary),
                payload_json=(json.dumps(payload, ensure_ascii=True, default=str) if payload else None),
                created_by_user_id=actor_user_id,
            )
        )
        tenant_db.flush()

    def _validate_client(self, tenant_db, client_id: int | None) -> int | None:
        if client_id is None:
            return None
        item = tenant_db.get(BusinessClient, client_id)
        if item is None:
            raise ValueError("Cliente no encontrado")
        return item.id

    def _validate_site(self, tenant_db, site_id: int | None) -> int | None:
        if site_id is None:
            return None
        item = tenant_db.get(BusinessSite, site_id)
        if item is None:
            raise ValueError("Sitio no encontrado")
        return item.id

    def _validate_installation(self, tenant_db, installation_id: int | None) -> int | None:
        if installation_id is None:
            return None
        item = tenant_db.get(MaintenanceInstallation, installation_id)
        if item is None:
            raise ValueError("Instalación no encontrada")
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
            raise ValueError("Tarea TaskOps no encontrada")
        return item.id

    def _validate_user(self, tenant_db, user_id: int | None) -> int | None:
        if user_id is None:
            return None
        item = tenant_db.get(User, user_id)
        if item is None:
            raise ValueError("Usuario no encontrado")
        return item.id

    def _validate_dossier_type(self, dossier_type: str | None) -> str:
        normalized = (dossier_type or "custom").strip().lower()
        if normalized not in self.VALID_DOSSIER_TYPES:
            raise ValueError("Tipo de expediente inválido")
        return normalized

    def _validate_status(self, status: str | None) -> str:
        normalized = (status or "draft").strip().lower()
        if normalized not in self.VALID_STATUSES:
            raise ValueError("Estado de expediente inválido")
        return normalized

    def _validate_section_kind(self, section_kind: str | None) -> str:
        normalized = (section_kind or "custom").strip().lower()
        if normalized not in self.VALID_SECTION_KINDS:
            raise ValueError("Tipo de sección inválido")
        return normalized

    def _validate_evidence_kind(self, evidence_kind: str | None) -> str:
        normalized = (evidence_kind or "photo").strip().lower()
        if normalized not in self.VALID_EVIDENCE_KINDS:
            raise ValueError("Tipo de evidencia inválido")
        return normalized

    def _attachments_root(self) -> Path:
        root = Path(settings.TECHDOCS_ATTACHMENTS_DIR)
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
        normalized = Path(file_name or "evidence").name.strip()
        return normalized or "evidence"

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
