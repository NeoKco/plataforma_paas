from __future__ import annotations

from datetime import datetime, timezone

from app.apps.tenant_modules.products.models import ProductConnector, ProductPriceHistory, ProductSource


class ProductConnectorService:
    VALID_CONNECTOR_KINDS = {"generic_url", "vendor_site", "vendor_feed", "ai_scrape"}
    VALID_SYNC_STATUSES = {"idle", "ready", "warning", "error"}
    VALID_SYNC_MODES = {"manual", "connector_sync"}
    VALID_FETCH_STRATEGIES = {"html_generic", "html_vendor", "json_feed", "html_ai"}

    def list_connectors(self, tenant_db, *, include_inactive: bool = True) -> list[ProductConnector]:
        query = tenant_db.query(ProductConnector)
        if not include_inactive:
            query = query.filter(ProductConnector.is_active.is_(True))
        return query.order_by(ProductConnector.is_active.desc(), ProductConnector.name.asc()).all()

    def get_connector(self, tenant_db, connector_id: int) -> ProductConnector:
        item = tenant_db.get(ProductConnector, connector_id)
        if item is None:
            raise ValueError("Conector no encontrado")
        return item

    def create_connector(self, tenant_db, payload) -> ProductConnector:
        name = self._normalize_required(payload.name, field_label="El nombre del conector es obligatorio")
        item = ProductConnector(
            name=name,
            connector_kind=self._normalize_connector_kind(payload.connector_kind),
            base_url=self._normalize_optional(payload.base_url),
            default_currency_code=self._normalize_currency(payload.default_currency_code),
            supports_batch=bool(payload.supports_batch),
            supports_price_tracking=bool(payload.supports_price_tracking),
            is_active=bool(payload.is_active),
            sync_mode=self._normalize_sync_mode(getattr(payload, "sync_mode", "manual")),
            fetch_strategy=self._normalize_fetch_strategy(
                getattr(payload, "fetch_strategy", "html_generic")
            ),
            run_ai_enrichment=bool(getattr(payload, "run_ai_enrichment", False)),
            config_notes=self._normalize_optional(payload.config_notes),
            last_sync_at=None,
            last_sync_status="ready" if payload.is_active else "idle",
            last_sync_summary=None,
        )
        tenant_db.add(item)
        tenant_db.commit()
        tenant_db.refresh(item)
        return item

    def update_connector(self, tenant_db, connector_id: int, payload) -> ProductConnector:
        item = self.get_connector(tenant_db, connector_id)
        item.name = self._normalize_required(payload.name, field_label="El nombre del conector es obligatorio")
        item.connector_kind = self._normalize_connector_kind(payload.connector_kind)
        item.base_url = self._normalize_optional(payload.base_url)
        item.default_currency_code = self._normalize_currency(payload.default_currency_code)
        item.supports_batch = bool(payload.supports_batch)
        item.supports_price_tracking = bool(payload.supports_price_tracking)
        item.is_active = bool(payload.is_active)
        item.sync_mode = self._normalize_sync_mode(getattr(payload, "sync_mode", "manual"))
        item.fetch_strategy = self._normalize_fetch_strategy(
            getattr(payload, "fetch_strategy", "html_generic")
        )
        item.run_ai_enrichment = bool(getattr(payload, "run_ai_enrichment", False))
        item.config_notes = self._normalize_optional(payload.config_notes)
        item.updated_at = self._now()
        tenant_db.add(item)
        tenant_db.commit()
        tenant_db.refresh(item)
        return item

    def set_connector_active(self, tenant_db, connector_id: int, *, is_active: bool) -> ProductConnector:
        item = self.get_connector(tenant_db, connector_id)
        item.is_active = bool(is_active)
        item.last_sync_status = "ready" if item.is_active else "idle"
        item.updated_at = self._now()
        tenant_db.add(item)
        tenant_db.commit()
        tenant_db.refresh(item)
        return item

    def delete_connector(self, tenant_db, connector_id: int) -> ProductConnector:
        item = self.get_connector(tenant_db, connector_id)
        tenant_db.delete(item)
        tenant_db.commit()
        return item

    def touch_connector_sync(
        self,
        tenant_db,
        connector_id: int | None,
        *,
        status: str = "ready",
        summary: str | None = None,
    ) -> None:
        if not connector_id:
            return
        item = tenant_db.get(ProductConnector, connector_id)
        if item is None:
            return
        item.last_sync_at = self._now()
        item.last_sync_status = status if status in self.VALID_SYNC_STATUSES else "ready"
        if summary is not None:
            item.last_sync_summary = self._normalize_optional(summary)
        item.updated_at = self._now()
        tenant_db.add(item)
        tenant_db.flush()

    def build_usage_maps(
        self,
        tenant_db,
        connector_ids: list[int],
    ) -> tuple[dict[int, int], dict[int, int]]:
        normalized_ids = [item for item in connector_ids if item]
        if not normalized_ids:
            return {}, {}

        source_rows = (
            tenant_db.query(ProductSource.connector_id)
            .filter(ProductSource.connector_id.in_(normalized_ids))
            .all()
        )
        price_rows = (
            tenant_db.query(ProductPriceHistory.connector_id)
            .filter(ProductPriceHistory.connector_id.in_(normalized_ids))
            .all()
        )
        source_map: dict[int, int] = {}
        for (connector_id,) in source_rows:
            if connector_id:
                source_map[connector_id] = source_map.get(connector_id, 0) + 1
        price_map: dict[int, int] = {}
        for (connector_id,) in price_rows:
            if connector_id:
                price_map[connector_id] = price_map.get(connector_id, 0) + 1
        return source_map, price_map

    @staticmethod
    def _normalize_optional(value: str | None) -> str | None:
        text = (value or "").strip()
        return text or None

    def _normalize_required(self, value: str | None, *, field_label: str) -> str:
        text = self._normalize_optional(value)
        if not text:
            raise ValueError(field_label)
        return text

    def _normalize_connector_kind(self, value: str | None) -> str:
        normalized = (value or "generic_url").strip().lower()
        if normalized not in self.VALID_CONNECTOR_KINDS:
            raise ValueError("Tipo de conector inválido")
        return normalized

    def _normalize_sync_mode(self, value: str | None) -> str:
        normalized = (value or "manual").strip().lower()
        if normalized not in self.VALID_SYNC_MODES:
            raise ValueError("Modo de sincronización inválido")
        return normalized

    def _normalize_fetch_strategy(self, value: str | None) -> str:
        normalized = (value or "html_generic").strip().lower()
        if normalized not in self.VALID_FETCH_STRATEGIES:
            raise ValueError("Estrategia de extracción inválida")
        return normalized

    @staticmethod
    def _normalize_currency(value: str | None) -> str:
        normalized = ((value or "CLP").strip().upper())[:12]
        return normalized or "CLP"

    @staticmethod
    def _now() -> datetime:
        return datetime.now(timezone.utc)
