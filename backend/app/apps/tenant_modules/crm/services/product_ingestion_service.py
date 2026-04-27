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

    def delete_draft(self, tenant_db, draft_id: int) -> CRMProductIngestionDraft:
        item = self.get_draft(tenant_db, draft_id)
        if item.capture_status == "approved" or item.published_product_id:
            raise ValueError("No se puede eliminar un borrador ya aprobado")
        tenant_db.delete(item)
        tenant_db.commit()
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

    def resolve_duplicate_to_existing_product(
        self,
        tenant_db,
        draft_id: int,
        *,
        target_product_id: int,
        resolution_mode: str,
        actor_user_id: int | None = None,
        review_notes: str | None = None,
    ) -> tuple[CRMProductIngestionDraft, CRMProduct]:
        draft = self.get_draft(tenant_db, draft_id)
        product = self._product_service.get_product(tenant_db, target_product_id)
        normalized_mode = (resolution_mode or "update_existing").strip().lower()
        if normalized_mode not in {"update_existing", "link_existing"}:
            raise ValueError("Modo de resolución inválido")
        if normalized_mode == "update_existing":
            self._apply_draft_to_existing_product(tenant_db, draft, product)
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
        tenant_db.refresh(product)
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

    def _apply_draft_to_existing_product(
        self,
        tenant_db,
        draft: CRMProductIngestionDraft,
        product: CRMProduct,
    ) -> CRMProduct:
        next_name = self._normalize_optional(draft.name) or product.name
        next_name = self._normalize_required_name(next_name)
        next_sku = self._normalize_optional(draft.sku) or product.sku
        if self._product_service._has_duplicate_name(tenant_db, next_name, exclude_id=product.id):
            raise ValueError("Ya existe otro producto/servicio con ese nombre")
        if next_sku and self._product_service._has_duplicate_sku(tenant_db, next_sku, exclude_id=product.id):
            raise ValueError("Ya existe otro producto/servicio con ese SKU")

        product.sku = next_sku
        product.name = next_name
        product.product_type = self._product_service._validate_type(draft.product_type or product.product_type)
        product.unit_label = self._normalize_optional(draft.unit_label) or product.unit_label
        product.unit_price = max(float(draft.unit_price or 0), 0) or max(float(product.unit_price or 0), 0)
        product.description = self._normalize_optional(draft.description) or product.description
        product.is_active = True
        tenant_db.add(product)
        tenant_db.flush()

        existing_characteristics = self._product_service.get_characteristics_map(tenant_db, [product.id]).get(product.id, [])
        draft_characteristics = self.get_characteristics_map(tenant_db, [draft.id]).get(draft.id, [])
        merged_characteristics = self._merge_product_characteristics(
            draft_characteristics=draft_characteristics,
            existing_characteristics=existing_characteristics,
            brand=draft.brand,
            category_label=draft.category_label,
            source_label=draft.source_label,
        )
        self._product_service._replace_characteristics(tenant_db, product.id, merged_characteristics)
        tenant_db.flush()
        return product

    def _merge_product_characteristics(
        self,
        *,
        draft_characteristics: list,
        existing_characteristics: list,
        brand: str | None,
        category_label: str | None,
        source_label: str | None,
    ) -> list[CRMProductCharacteristicWriteRequest]:
        ordered: list[CRMProductCharacteristicWriteRequest] = []
        by_label: dict[str, CRMProductCharacteristicWriteRequest] = {}

        def add_or_update(label: str | None, value: str | None, *, prefer_new: bool) -> None:
            normalized_label = self._normalize_optional(label)
            normalized_value = self._normalize_optional(value)
            if not normalized_label or not normalized_value:
                return
            key = normalized_label.strip().lower()
            current = by_label.get(key)
            if current is None:
                item = CRMProductCharacteristicWriteRequest(
                    label=normalized_label,
                    value=normalized_value,
                    sort_order=(len(ordered) + 1) * 10,
                )
                by_label[key] = item
                ordered.append(item)
                return
            if prefer_new:
                current.value = normalized_value

        for row in existing_characteristics or []:
            add_or_update(getattr(row, "label", None), getattr(row, "value", None), prefer_new=False)
        for row in draft_characteristics or []:
            add_or_update(getattr(row, "label", None), getattr(row, "value", None), prefer_new=True)
        self._append_auto_characteristic(ordered, label="Marca", value=brand)
        self._append_auto_characteristic(ordered, label="Categoría", value=category_label)
        self._append_auto_characteristic(ordered, label="Origen", value=source_label)
        for index, item in enumerate(ordered):
            item.sort_order = (index + 1) * 10
        return ordered

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
