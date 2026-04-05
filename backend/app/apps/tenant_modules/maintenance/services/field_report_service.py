from pathlib import Path
from types import SimpleNamespace
from uuid import uuid4

from sqlalchemy.orm import Session

from app.apps.tenant_modules.maintenance.models import (
    MaintenanceWorkOrder,
    MaintenanceWorkOrderChecklistItem,
    MaintenanceWorkOrderEvidence,
)
from app.apps.tenant_modules.maintenance.schemas import MaintenanceFieldReportUpdateRequest
from app.common.config.settings import settings

DEFAULT_CHECKLIST_ITEMS = [
    ("site_access", "Acceso y condiciones del área"),
    ("safety_lockout", "Bloqueo o resguardo de seguridad verificado"),
    ("visual_inspection", "Inspección visual y técnica ejecutada"),
    ("functional_test", "Pruebas funcionales realizadas"),
    ("cleanup_handover", "Limpieza final y entrega al cliente"),
]


class MaintenanceFieldReportService:
    ATTACHMENT_ALLOWED_CONTENT_TYPES = {
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/webp",
    }
    ATTACHMENT_MAX_SIZE_BYTES = 5 * 1024 * 1024

    def get_field_report(self, tenant_db: Session, work_order_id: int) -> dict:
        work_order = self._get_work_order_or_raise(tenant_db, work_order_id)
        checklist_items = self._list_checklist_items(tenant_db, work_order.id)
        evidences = self._list_evidences(tenant_db, work_order.id)
        return {
            "work_order": work_order,
            "closure_notes": getattr(work_order, "closure_notes", None),
            "checklist_items": checklist_items,
            "evidences": evidences,
        }

    def update_field_report(
        self,
        tenant_db: Session,
        work_order_id: int,
        payload: MaintenanceFieldReportUpdateRequest,
        *,
        actor_user_id: int | None = None,
    ) -> dict:
        work_order = self._get_work_order_or_raise(tenant_db, work_order_id)
        work_order.closure_notes = (
            payload.closure_notes.strip()
            if payload.closure_notes and payload.closure_notes.strip()
            else None
        )
        tenant_db.add(work_order)
        self._sync_checklist_items(
            tenant_db,
            work_order.id,
            payload.checklist_items,
            actor_user_id=actor_user_id,
        )
        tenant_db.commit()
        tenant_db.refresh(work_order)
        return self.get_field_report(tenant_db, work_order.id)

    def create_evidence(
        self,
        tenant_db: Session,
        work_order_id: int,
        *,
        file_name: str,
        content_type: str | None,
        content_bytes: bytes,
        notes: str | None = None,
        actor_user_id: int | None = None,
    ) -> MaintenanceWorkOrderEvidence:
        self._get_work_order_or_raise(tenant_db, work_order_id)
        normalized_file_name = self._normalize_attachment_file_name(file_name)
        normalized_content_type = (content_type or "").strip().lower() or None
        if normalized_content_type not in self.ATTACHMENT_ALLOWED_CONTENT_TYPES:
            raise ValueError("Tipo de archivo no soportado para evidencias de mantención")
        if not content_bytes:
            raise ValueError("La evidencia no puede estar vacía")
        if len(content_bytes) > self.ATTACHMENT_MAX_SIZE_BYTES:
            raise ValueError("La evidencia supera el tamaño máximo permitido de 5 MB")

        suffix = Path(normalized_file_name).suffix.lower() or self._content_type_to_suffix(
            normalized_content_type
        )
        storage_key = str(Path(f"work_order_{work_order_id}") / f"{uuid4().hex}{suffix}")
        absolute_path = self._attachments_root() / storage_key
        absolute_path.parent.mkdir(parents=True, exist_ok=True)
        absolute_path.write_bytes(content_bytes)

        evidence = MaintenanceWorkOrderEvidence(
            work_order_id=work_order_id,
            file_name=normalized_file_name,
            storage_key=storage_key,
            content_type=normalized_content_type,
            file_size=len(content_bytes),
            notes=notes.strip() if notes and notes.strip() else None,
            uploaded_by_user_id=actor_user_id,
        )
        try:
            tenant_db.add(evidence)
            tenant_db.commit()
        except Exception:
            tenant_db.rollback()
            if absolute_path.exists():
                absolute_path.unlink()
            raise
        tenant_db.refresh(evidence)
        return evidence

    def delete_evidence(
        self,
        tenant_db: Session,
        work_order_id: int,
        evidence_id: int,
    ) -> MaintenanceWorkOrderEvidence:
        self._get_work_order_or_raise(tenant_db, work_order_id)
        evidence = (
            tenant_db.query(MaintenanceWorkOrderEvidence)
            .filter(MaintenanceWorkOrderEvidence.id == evidence_id)
            .first()
        )
        if evidence is None or evidence.work_order_id != work_order_id:
            raise ValueError("La evidencia solicitada no existe")
        absolute_path = self._attachments_root() / evidence.storage_key
        tenant_db.delete(evidence)
        tenant_db.commit()
        if absolute_path.exists():
            absolute_path.unlink()
        return evidence

    def get_evidence_file(
        self,
        tenant_db: Session,
        work_order_id: int,
        evidence_id: int,
    ) -> tuple[MaintenanceWorkOrderEvidence, Path]:
        self._get_work_order_or_raise(tenant_db, work_order_id)
        evidence = (
            tenant_db.query(MaintenanceWorkOrderEvidence)
            .filter(MaintenanceWorkOrderEvidence.id == evidence_id)
            .first()
        )
        if evidence is None or evidence.work_order_id != work_order_id:
            raise ValueError("La evidencia solicitada no existe")
        absolute_path = self._attachments_root() / evidence.storage_key
        if not absolute_path.exists():
            raise ValueError("La evidencia no está disponible en almacenamiento")
        return evidence, absolute_path

    def _get_work_order_or_raise(self, tenant_db: Session, work_order_id: int) -> MaintenanceWorkOrder:
        item = (
            tenant_db.query(MaintenanceWorkOrder)
            .filter(MaintenanceWorkOrder.id == work_order_id)
            .first()
        )
        if item is None:
            raise ValueError("La mantención solicitada no existe")
        return item

    def _list_checklist_items(self, tenant_db: Session, work_order_id: int) -> list:
        items = (
            tenant_db.query(MaintenanceWorkOrderChecklistItem)
            .filter(MaintenanceWorkOrderChecklistItem.work_order_id == work_order_id)
            .order_by(
                MaintenanceWorkOrderChecklistItem.sort_order.asc(),
                MaintenanceWorkOrderChecklistItem.id.asc(),
            )
            .all()
        )
        if items:
            return items
        return [
            SimpleNamespace(
                id=None,
                work_order_id=work_order_id,
                item_key=item_key,
                label=label,
                is_completed=False,
                notes=None,
                sort_order=index,
                updated_by_user_id=None,
                created_at=None,
                updated_at=None,
            )
            for index, (item_key, label) in enumerate(DEFAULT_CHECKLIST_ITEMS)
        ]

    def _list_evidences(self, tenant_db: Session, work_order_id: int) -> list[MaintenanceWorkOrderEvidence]:
        return (
            tenant_db.query(MaintenanceWorkOrderEvidence)
            .filter(MaintenanceWorkOrderEvidence.work_order_id == work_order_id)
            .order_by(
                MaintenanceWorkOrderEvidence.created_at.desc(),
                MaintenanceWorkOrderEvidence.id.desc(),
            )
            .all()
        )

    def _sync_checklist_items(
        self,
        tenant_db: Session,
        work_order_id: int,
        payload_items,
        *,
        actor_user_id: int | None = None,
    ) -> None:
        effective_items = payload_items or [
            {"item_key": item_key, "label": label, "is_completed": False, "notes": None}
            for item_key, label in DEFAULT_CHECKLIST_ITEMS
        ]
        existing = (
            tenant_db.query(MaintenanceWorkOrderChecklistItem)
            .filter(MaintenanceWorkOrderChecklistItem.work_order_id == work_order_id)
            .all()
        )
        existing_by_key = {item.item_key: item for item in existing}
        keep_keys: set[str] = set()

        for index, raw_item in enumerate(effective_items):
            item_key = raw_item.item_key.strip().lower()
            label = raw_item.label.strip()
            if not item_key:
                raise ValueError("Cada ítem del checklist debe tener una clave")
            if not label:
                raise ValueError("Cada ítem del checklist debe tener una etiqueta")
            current = existing_by_key.get(item_key)
            if current is None:
                current = MaintenanceWorkOrderChecklistItem(
                    work_order_id=work_order_id,
                    item_key=item_key,
                )
                tenant_db.add(current)
            current.label = label
            current.is_completed = bool(raw_item.is_completed)
            current.notes = raw_item.notes.strip() if raw_item.notes and raw_item.notes.strip() else None
            current.sort_order = index
            current.updated_by_user_id = actor_user_id
            keep_keys.add(item_key)

        for current in existing:
            if current.item_key not in keep_keys:
                tenant_db.delete(current)

        tenant_db.flush()

    def _attachments_root(self) -> Path:
        root = Path(settings.MAINTENANCE_EVIDENCE_DIR)
        root.mkdir(parents=True, exist_ok=True)
        return root

    def _normalize_attachment_file_name(self, file_name: str) -> str:
        normalized = Path(file_name or "evidence").name.strip()
        return normalized or "evidence"

    def _content_type_to_suffix(self, content_type: str | None) -> str:
        if content_type == "image/jpeg":
            return ".jpg"
        if content_type == "image/png":
            return ".png"
        if content_type == "image/webp":
            return ".webp"
        if content_type == "application/pdf":
            return ".pdf"
        return ""