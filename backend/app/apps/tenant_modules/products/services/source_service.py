from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import func

from app.apps.tenant_modules.crm.models import CRMProduct, CRMProductIngestionDraft, CRMProductIngestionRunItem
from app.apps.tenant_modules.products.models import ProductConnector, ProductPriceHistory, ProductSource


class ProductSourceService:
    VALID_SOURCE_KINDS = {"manual_capture", "url_reference", "vendor_site", "vendor_feed"}
    VALID_SOURCE_STATUSES = {"active", "stale", "archived"}
    VALID_PRICE_KINDS = {"reference", "quoted", "list_price", "offer"}

    def list_sources(
        self,
        tenant_db,
        *,
        product_id: int | None = None,
        connector_id: int | None = None,
        source_status: str | None = None,
    ) -> list[ProductSource]:
        query = tenant_db.query(ProductSource)
        if product_id:
            query = query.filter(ProductSource.product_id == product_id)
        if connector_id:
            query = query.filter(ProductSource.connector_id == connector_id)
        if source_status and source_status.strip():
            normalized = source_status.strip().lower()
            if normalized in self.VALID_SOURCE_STATUSES:
                query = query.filter(ProductSource.source_status == normalized)
        return (
            query.order_by(
                ProductSource.last_seen_at.desc().nullslast(),
                ProductSource.created_at.desc(),
                ProductSource.id.desc(),
            ).all()
        )

    def get_source(self, tenant_db, source_id: int) -> ProductSource:
        item = tenant_db.get(ProductSource, source_id)
        if item is None:
            raise ValueError("Fuente no encontrada")
        return item

    def create_source(self, tenant_db, product_id: int, payload) -> ProductSource:
        self._require_product(tenant_db, product_id)
        connector = self._get_connector_if_any(tenant_db, payload.connector_id)
        item = ProductSource(
            product_id=product_id,
            connector_id=connector.id if connector else None,
            draft_id=None,
            run_item_id=None,
            source_kind=self._normalize_source_kind(payload.source_kind),
            source_label=self._normalize_optional(payload.source_label),
            source_url=self._normalize_optional(payload.source_url),
            external_reference=self._normalize_optional(payload.external_reference),
            source_status=self._normalize_source_status(payload.source_status),
            latest_unit_price=max(float(payload.latest_unit_price or 0), 0),
            currency_code=self._normalize_currency(payload.currency_code),
            source_summary=self._normalize_optional(payload.source_summary),
            captured_at=self._now(),
            last_seen_at=self._now(),
        )
        tenant_db.add(item)
        tenant_db.commit()
        tenant_db.refresh(item)
        return item

    def update_source(self, tenant_db, source_id: int, payload) -> ProductSource:
        item = self.get_source(tenant_db, source_id)
        connector = self._get_connector_if_any(tenant_db, payload.connector_id)
        item.connector_id = connector.id if connector else None
        item.source_kind = self._normalize_source_kind(payload.source_kind)
        item.source_label = self._normalize_optional(payload.source_label)
        item.source_url = self._normalize_optional(payload.source_url)
        item.external_reference = self._normalize_optional(payload.external_reference)
        item.source_status = self._normalize_source_status(payload.source_status)
        item.latest_unit_price = max(float(payload.latest_unit_price or 0), 0)
        item.currency_code = self._normalize_currency(payload.currency_code)
        item.source_summary = self._normalize_optional(payload.source_summary)
        item.last_seen_at = self._now()
        item.updated_at = self._now()
        tenant_db.add(item)
        tenant_db.commit()
        tenant_db.refresh(item)
        return item

    def list_price_history(
        self,
        tenant_db,
        *,
        product_id: int | None = None,
        connector_id: int | None = None,
        limit: int = 200,
    ) -> list[ProductPriceHistory]:
        query = tenant_db.query(ProductPriceHistory)
        if product_id:
            query = query.filter(ProductPriceHistory.product_id == product_id)
        if connector_id:
            query = query.filter(ProductPriceHistory.connector_id == connector_id)
        return (
            query.order_by(ProductPriceHistory.captured_at.desc(), ProductPriceHistory.id.desc())
            .limit(max(limit, 1))
            .all()
        )

    def create_price_entry(self, tenant_db, product_id: int, payload) -> ProductPriceHistory:
        self._require_product(tenant_db, product_id)
        connector = self._get_connector_if_any(tenant_db, payload.connector_id)
        item = ProductPriceHistory(
            product_id=product_id,
            product_source_id=None,
            connector_id=connector.id if connector else None,
            draft_id=None,
            price_kind=self._normalize_price_kind(payload.price_kind),
            unit_price=max(float(payload.unit_price or 0), 0),
            currency_code=self._normalize_currency(payload.currency_code),
            source_label=self._normalize_optional(payload.source_label),
            source_url=self._normalize_optional(payload.source_url),
            notes=self._normalize_optional(payload.notes),
            captured_at=self._now(),
        )
        tenant_db.add(item)
        tenant_db.commit()
        tenant_db.refresh(item)
        return item

    def record_from_draft(
        self,
        tenant_db,
        *,
        product_id: int,
        draft: CRMProductIngestionDraft,
        connector_id: int | None = None,
        run_item_id: int | None = None,
        notes: str | None = None,
    ) -> tuple[ProductSource, ProductPriceHistory]:
        self._require_product(tenant_db, product_id)
        connector = self._get_connector_if_any(tenant_db, connector_id or draft.connector_id)
        source = self._find_matching_source(
            tenant_db,
            product_id=product_id,
            source_url=draft.source_url,
            external_reference=draft.external_reference,
            connector_id=connector.id if connector else None,
        )
        timestamp = self._now()
        if source is None:
            source = ProductSource(
                product_id=product_id,
                connector_id=connector.id if connector else None,
                draft_id=draft.id,
                run_item_id=run_item_id,
                source_kind=self._normalize_source_kind(draft.source_kind),
                source_label=self._normalize_optional(draft.source_label),
                source_url=self._normalize_optional(draft.source_url),
                external_reference=self._normalize_optional(draft.external_reference),
                source_status="active",
                latest_unit_price=max(float(draft.unit_price or 0), 0),
                currency_code=self._normalize_currency(draft.currency_code),
                source_summary=self._build_source_summary(draft),
                captured_at=timestamp,
                last_seen_at=timestamp,
            )
            tenant_db.add(source)
            tenant_db.flush()
        else:
            source.connector_id = connector.id if connector else source.connector_id
            source.draft_id = draft.id
            source.run_item_id = run_item_id or source.run_item_id
            source.source_kind = self._normalize_source_kind(draft.source_kind)
            source.source_label = self._normalize_optional(draft.source_label)
            source.source_url = self._normalize_optional(draft.source_url)
            source.external_reference = self._normalize_optional(draft.external_reference)
            source.source_status = "active"
            source.latest_unit_price = max(float(draft.unit_price or 0), 0)
            source.currency_code = self._normalize_currency(draft.currency_code)
            source.source_summary = self._build_source_summary(draft)
            source.last_seen_at = timestamp
            source.updated_at = timestamp
            tenant_db.add(source)
            tenant_db.flush()

        price_event = ProductPriceHistory(
            product_id=product_id,
            product_source_id=source.id,
            connector_id=connector.id if connector else None,
            draft_id=draft.id,
            price_kind="reference",
            unit_price=max(float(draft.unit_price or 0), 0),
            currency_code=self._normalize_currency(draft.currency_code),
            source_label=self._normalize_optional(draft.source_label),
            source_url=self._normalize_optional(draft.source_url),
            notes=self._normalize_optional(notes),
            captured_at=timestamp,
        )
        tenant_db.add(price_event)
        tenant_db.flush()
        return source, price_event

    def build_maps(
        self,
        tenant_db,
        *,
        connector_ids: list[int] | None = None,
        product_ids: list[int] | None = None,
    ) -> tuple[dict[int, str], dict[int, str]]:
        connector_map: dict[int, str] = {}
        product_map: dict[int, str] = {}
        normalized_connector_ids = [item for item in (connector_ids or []) if item]
        normalized_product_ids = [item for item in (product_ids or []) if item]
        if normalized_connector_ids:
            connectors = (
                tenant_db.query(ProductConnector)
                .filter(ProductConnector.id.in_(normalized_connector_ids))
                .all()
            )
            connector_map = {item.id: item.name for item in connectors}
        if normalized_product_ids:
            products = (
                tenant_db.query(CRMProduct)
                .filter(CRMProduct.id.in_(normalized_product_ids))
                .all()
            )
            product_map = {item.id: item.name for item in products}
        return connector_map, product_map

    def build_metrics(self, tenant_db) -> dict[str, int]:
        source_total = tenant_db.query(func.count(ProductSource.id)).scalar() or 0
        source_active = (
            tenant_db.query(func.count(ProductSource.id))
            .filter(ProductSource.source_status == "active")
            .scalar()
            or 0
        )
        connectors_total = tenant_db.query(func.count(ProductConnector.id)).scalar() or 0
        connectors_active = (
            tenant_db.query(func.count(ProductConnector.id))
            .filter(ProductConnector.is_active.is_(True))
            .scalar()
            or 0
        )
        price_event_total = tenant_db.query(func.count(ProductPriceHistory.id)).scalar() or 0
        products_with_source = (
            tenant_db.query(func.count(func.distinct(ProductSource.product_id))).scalar() or 0
        )
        return {
            "source_total": int(source_total),
            "source_active": int(source_active),
            "connectors_total": int(connectors_total),
            "connectors_active": int(connectors_active),
            "price_event_total": int(price_event_total),
            "products_with_source": int(products_with_source),
        }

    def _find_matching_source(
        self,
        tenant_db,
        *,
        product_id: int,
        source_url: str | None,
        external_reference: str | None,
        connector_id: int | None,
    ) -> ProductSource | None:
        normalized_url = self._normalize_optional(source_url)
        normalized_reference = self._normalize_optional(external_reference)
        query = tenant_db.query(ProductSource).filter(ProductSource.product_id == product_id)
        if normalized_url:
            item = query.filter(ProductSource.source_url == normalized_url).first()
            if item is not None:
                return item
        if normalized_reference:
            item = query.filter(ProductSource.external_reference == normalized_reference).first()
            if item is not None:
                return item
        if connector_id:
            return (
                query.filter(ProductSource.connector_id == connector_id)
                .order_by(ProductSource.last_seen_at.desc().nullslast(), ProductSource.id.desc())
                .first()
            )
        return None

    def _require_product(self, tenant_db, product_id: int) -> CRMProduct:
        item = tenant_db.get(CRMProduct, product_id)
        if item is None:
            raise ValueError("Producto no encontrado")
        return item

    def _get_connector_if_any(self, tenant_db, connector_id: int | None) -> ProductConnector | None:
        if not connector_id:
            return None
        item = tenant_db.get(ProductConnector, connector_id)
        if item is None:
            raise ValueError("Conector no encontrado")
        return item

    def _build_source_summary(self, draft: CRMProductIngestionDraft) -> str | None:
        parts = [self._normalize_optional(draft.brand), self._normalize_optional(draft.category_label)]
        return " · ".join([part for part in parts if part]) or self._normalize_optional(draft.source_excerpt)

    @staticmethod
    def _normalize_optional(value: str | None) -> str | None:
        text = (value or "").strip()
        return text or None

    def _normalize_source_kind(self, value: str | None) -> str:
        normalized = (value or "manual_capture").strip().lower()
        if normalized not in self.VALID_SOURCE_KINDS:
            raise ValueError("Tipo de fuente inválido")
        return normalized

    def _normalize_source_status(self, value: str | None) -> str:
        normalized = (value or "active").strip().lower()
        if normalized not in self.VALID_SOURCE_STATUSES:
            raise ValueError("Estado de fuente inválido")
        return normalized

    def _normalize_price_kind(self, value: str | None) -> str:
        normalized = (value or "reference").strip().lower()
        if normalized not in self.VALID_PRICE_KINDS:
            raise ValueError("Tipo de precio inválido")
        return normalized

    @staticmethod
    def _normalize_currency(value: str | None) -> str:
        normalized = ((value or "CLP").strip().upper())[:12]
        return normalized or "CLP"

    @staticmethod
    def _now() -> datetime:
        return datetime.now(timezone.utc)
