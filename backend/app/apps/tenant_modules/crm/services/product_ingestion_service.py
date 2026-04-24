from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import func

from app.apps.tenant_modules.crm.models import (
    CRMProduct,
    CRMProductIngestionCharacteristic,
    CRMProductIngestionDraft,
)
from app.apps.tenant_modules.crm.schemas import CRMProductCreateRequest, CRMProductCharacteristicWriteRequest
from app.apps.tenant_modules.crm.services.product_service import CRMProductService


class CRMProductIngestionService:
    VALID_SOURCE_KINDS = {"manual_capture", "url_reference"}
    VALID_CAPTURE_STATUSES = {"draft", "approved", "discarded"}

    def __init__(self) -> None:
        self._product_service = CRMProductService()

    def list_drafts(
        self,
        tenant_db,
        *,
        capture_status: str | None = None,
        q: str | None = None,
    ) -> list[CRMProductIngestionDraft]:
        query = tenant_db.query(CRMProductIngestionDraft)
        if capture_status and capture_status.strip():
            normalized_status = capture_status.strip().lower()
            if normalized_status in self.VALID_CAPTURE_STATUSES:
                query = query.filter(CRMProductIngestionDraft.capture_status == normalized_status)
        if q and q.strip():
            token = f"%{q.strip().lower()}%"
            query = query.filter(
                func.lower(func.coalesce(CRMProductIngestionDraft.name, "")).like(token)
                | func.lower(func.coalesce(CRMProductIngestionDraft.sku, "")).like(token)
                | func.lower(func.coalesce(CRMProductIngestionDraft.brand, "")).like(token)
                | func.lower(func.coalesce(CRMProductIngestionDraft.category_label, "")).like(token)
                | func.lower(func.coalesce(CRMProductIngestionDraft.source_label, "")).like(token)
                | func.lower(func.coalesce(CRMProductIngestionDraft.source_url, "")).like(token)
            )
        return query.order_by(
            CRMProductIngestionDraft.capture_status.asc(),
            CRMProductIngestionDraft.updated_at.desc(),
            CRMProductIngestionDraft.id.desc(),
        ).all()

    def get_draft(self, tenant_db, draft_id: int) -> CRMProductIngestionDraft:
        item = tenant_db.get(CRMProductIngestionDraft, draft_id)
        if item is None:
            raise ValueError("Borrador de ingesta no encontrado")
        return item

    def create_draft(self, tenant_db, payload, *, actor_user_id: int | None = None) -> CRMProductIngestionDraft:
        item = CRMProductIngestionDraft(
            source_kind=self._normalize_source_kind(payload.source_kind),
            source_label=self._normalize_optional(payload.source_label),
            source_url=self._normalize_optional(payload.source_url),
            external_reference=self._normalize_optional(payload.external_reference),
            capture_status="draft",
            sku=self._normalize_optional(payload.sku),
            name=self._normalize_optional(payload.name),
            brand=self._normalize_optional(payload.brand),
            category_label=self._normalize_optional(payload.category_label),
            product_type=self._product_service._validate_type(payload.product_type),
            unit_label=self._normalize_optional(payload.unit_label),
            unit_price=max(float(payload.unit_price or 0), 0),
            currency_code=self._normalize_currency(payload.currency_code),
            description=self._normalize_optional(payload.description),
            source_excerpt=self._normalize_optional(payload.source_excerpt),
            extraction_notes=self._normalize_optional(payload.extraction_notes),
            review_notes=None,
            created_by_user_id=actor_user_id,
            reviewed_by_user_id=None,
            published_product_id=None,
            published_at=None,
            discarded_at=None,
        )
        tenant_db.add(item)
        tenant_db.flush()
        self._replace_characteristics(tenant_db, item.id, payload.characteristics)
        tenant_db.commit()
        tenant_db.refresh(item)
        return item

    def update_draft(self, tenant_db, draft_id: int, payload, *, actor_user_id: int | None = None) -> CRMProductIngestionDraft:
        item = self.get_draft(tenant_db, draft_id)
        if item.capture_status == "approved":
            raise ValueError("No se puede editar un borrador ya aprobado")
        item.source_kind = self._normalize_source_kind(payload.source_kind)
        item.source_label = self._normalize_optional(payload.source_label)
        item.source_url = self._normalize_optional(payload.source_url)
        item.external_reference = self._normalize_optional(payload.external_reference)
        item.sku = self._normalize_optional(payload.sku)
        item.name = self._normalize_optional(payload.name)
        item.brand = self._normalize_optional(payload.brand)
        item.category_label = self._normalize_optional(payload.category_label)
        item.product_type = self._product_service._validate_type(payload.product_type)
        item.unit_label = self._normalize_optional(payload.unit_label)
        item.unit_price = max(float(payload.unit_price or 0), 0)
        item.currency_code = self._normalize_currency(payload.currency_code)
        item.description = self._normalize_optional(payload.description)
        item.source_excerpt = self._normalize_optional(payload.source_excerpt)
        item.extraction_notes = self._normalize_optional(payload.extraction_notes)
        if actor_user_id is not None and item.capture_status == "discarded":
            item.reviewed_by_user_id = actor_user_id
        item.updated_at = self._now()
        tenant_db.add(item)
        tenant_db.flush()
        self._replace_characteristics(tenant_db, item.id, payload.characteristics)
        tenant_db.commit()
        tenant_db.refresh(item)
        return item

    def set_draft_status(
        self,
        tenant_db,
        draft_id: int,
        *,
        capture_status: str,
        review_notes: str | None,
        actor_user_id: int | None = None,
    ) -> CRMProductIngestionDraft:
        item = self.get_draft(tenant_db, draft_id)
        normalized_status = capture_status.strip().lower()
        if normalized_status not in {"draft", "discarded"}:
            raise ValueError("Estado de borrador inválido")
        if item.capture_status == "approved" and normalized_status != "approved":
            raise ValueError("Un borrador aprobado no puede volver a edición")
        item.capture_status = normalized_status
        item.review_notes = self._normalize_optional(review_notes)
        item.reviewed_by_user_id = actor_user_id
        item.discarded_at = self._now() if normalized_status == "discarded" else None
        item.updated_at = self._now()
        tenant_db.add(item)
        tenant_db.commit()
        tenant_db.refresh(item)
        return item

    def approve_draft(
        self,
        tenant_db,
        draft_id: int,
        *,
        actor_user_id: int | None = None,
        review_notes: str | None = None,
    ) -> tuple[CRMProductIngestionDraft, CRMProduct]:
        draft = self.get_draft(tenant_db, draft_id)
        if draft.capture_status == "approved" and draft.published_product_id:
            product = tenant_db.get(CRMProduct, draft.published_product_id)
            if product is None:
                raise ValueError("El borrador figura aprobado pero el producto final no existe")
            return draft, product

        normalized_name = self._normalize_required_name(draft.name)
        characteristics = self.get_characteristics_map(tenant_db, [draft.id]).get(draft.id, [])
        publish_characteristics = [
            CRMProductCharacteristicWriteRequest(
                label=row.label,
                value=row.value,
                sort_order=row.sort_order,
            )
            for row in characteristics
        ]
        self._append_auto_characteristic(publish_characteristics, label="Marca", value=draft.brand)
        self._append_auto_characteristic(publish_characteristics, label="Categoría", value=draft.category_label)
        self._append_auto_characteristic(publish_characteristics, label="Origen", value=draft.source_label)

        payload = CRMProductCreateRequest(
            sku=self._normalize_optional(draft.sku),
            name=normalized_name,
            product_type=self._product_service._validate_type(draft.product_type),
            unit_label=self._normalize_optional(draft.unit_label),
            unit_price=max(float(draft.unit_price or 0), 0),
            description=self._normalize_optional(draft.description),
            is_active=True,
            sort_order=100,
            characteristics=publish_characteristics,
        )
        product = self._product_service.create_product(tenant_db, payload)
        draft.capture_status = "approved"
        draft.review_notes = self._normalize_optional(review_notes)
        draft.reviewed_by_user_id = actor_user_id
        draft.published_product_id = product.id
        draft.published_at = self._now()
        draft.discarded_at = None
        draft.updated_at = self._now()
        tenant_db.add(draft)
        tenant_db.commit()
        tenant_db.refresh(draft)
        return draft, product

    def get_characteristics_map(
        self,
        tenant_db,
        draft_ids: list[int],
    ) -> dict[int, list[CRMProductIngestionCharacteristic]]:
        normalized_ids = [item for item in draft_ids if item]
        if not normalized_ids:
            return {}
        rows = (
            tenant_db.query(CRMProductIngestionCharacteristic)
            .filter(CRMProductIngestionCharacteristic.draft_id.in_(normalized_ids))
            .order_by(
                CRMProductIngestionCharacteristic.draft_id.asc(),
                CRMProductIngestionCharacteristic.sort_order.asc(),
                CRMProductIngestionCharacteristic.id.asc(),
            )
            .all()
        )
        grouped: dict[int, list[CRMProductIngestionCharacteristic]] = {}
        for row in rows:
            grouped.setdefault(row.draft_id, []).append(row)
        return grouped

    def build_overview(self, tenant_db) -> dict[str, int]:
        total = tenant_db.query(func.count(CRMProductIngestionDraft.id)).scalar() or 0
        draft = (
            tenant_db.query(func.count(CRMProductIngestionDraft.id))
            .filter(CRMProductIngestionDraft.capture_status == "draft")
            .scalar()
            or 0
        )
        approved = (
            tenant_db.query(func.count(CRMProductIngestionDraft.id))
            .filter(CRMProductIngestionDraft.capture_status == "approved")
            .scalar()
            or 0
        )
        discarded = (
            tenant_db.query(func.count(CRMProductIngestionDraft.id))
            .filter(CRMProductIngestionDraft.capture_status == "discarded")
            .scalar()
            or 0
        )
        with_url = (
            tenant_db.query(func.count(CRMProductIngestionDraft.id))
            .filter(func.coalesce(CRMProductIngestionDraft.source_url, "") != "")
            .scalar()
            or 0
        )
        return {
            "ingestion_total": int(total),
            "ingestion_draft": int(draft),
            "ingestion_approved": int(approved),
            "ingestion_discarded": int(discarded),
            "ingestion_with_url": int(with_url),
        }

    def _replace_characteristics(self, tenant_db, draft_id: int, characteristics_payload: list) -> None:
        tenant_db.query(CRMProductIngestionCharacteristic).filter(
            CRMProductIngestionCharacteristic.draft_id == draft_id
        ).delete()
        for index, item in enumerate(characteristics_payload or []):
            label = self._normalize_optional(getattr(item, "label", None))
            value = self._normalize_optional(getattr(item, "value", None))
            if not label or not value:
                continue
            tenant_db.add(
                CRMProductIngestionCharacteristic(
                    draft_id=draft_id,
                    label=label,
                    value=value,
                    sort_order=int(
                        getattr(item, "sort_order", None)
                        if getattr(item, "sort_order", None) is not None
                        else (index + 1) * 10
                    ),
                )
            )
        tenant_db.flush()

    def _append_auto_characteristic(self, target: list[CRMProductCharacteristicWriteRequest], *, label: str, value: str | None) -> None:
        normalized_value = self._normalize_optional(value)
        if not normalized_value:
            return
        existing = {item.label.strip().lower() for item in target if item.label}
        if label.strip().lower() in existing:
            return
        target.append(
            CRMProductCharacteristicWriteRequest(
                label=label,
                value=normalized_value,
                sort_order=(len(target) + 1) * 10,
            )
        )

    @staticmethod
    def _normalize_required_name(value: str | None) -> str:
        text = " ".join((value or "").strip().split())
        if not text:
            raise ValueError("El nombre del borrador es obligatorio para aprobar")
        return text

    @staticmethod
    def _normalize_optional(value: str | None) -> str | None:
        text = (value or "").strip()
        return text or None

    def _normalize_source_kind(self, value: str | None) -> str:
        normalized = (value or "manual_capture").strip().lower()
        if normalized not in self.VALID_SOURCE_KINDS:
            raise ValueError("Origen de ingesta inválido")
        return normalized

    @staticmethod
    def _normalize_currency(value: str | None) -> str:
        text = (value or "CLP").strip().upper()
        return text or "CLP"

    @staticmethod
    def _now() -> datetime:
        return datetime.now(timezone.utc)
