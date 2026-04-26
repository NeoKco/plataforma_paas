from __future__ import annotations

from app.apps.tenant_modules.crm.models import CRMProductIngestionDraft
from app.apps.tenant_modules.crm.services.product_ingestion_service import (
    CRMProductIngestionService,
)
from app.apps.tenant_modules.products.services.connector_service import ProductConnectorService
from app.apps.tenant_modules.products.services.source_service import ProductSourceService


class ProductCatalogIngestionService(CRMProductIngestionService):
    def __init__(self) -> None:
        super().__init__()
        self._connector_service = ProductConnectorService()
        self._source_service = ProductSourceService()

    def create_draft(self, tenant_db, payload, *, actor_user_id: int | None = None) -> CRMProductIngestionDraft:
        connector_id = getattr(payload, "connector_id", None)
        connector = self._connector_service.get_connector(tenant_db, connector_id) if connector_id else None
        item = super().create_draft(tenant_db, payload, actor_user_id=actor_user_id)
        item.connector_id = connector.id if connector else None
        tenant_db.add(item)
        if connector:
            self._connector_service.touch_connector_sync(tenant_db, connector.id, status="ready")
        tenant_db.commit()
        tenant_db.refresh(item)
        return item

    def update_draft(self, tenant_db, draft_id: int, payload, *, actor_user_id: int | None = None) -> CRMProductIngestionDraft:
        connector_id = getattr(payload, "connector_id", None)
        connector = self._connector_service.get_connector(tenant_db, connector_id) if connector_id else None
        item = super().update_draft(tenant_db, draft_id, payload, actor_user_id=actor_user_id)
        item.connector_id = connector.id if connector else None
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
    ):
        draft, product = super().approve_draft(
            tenant_db,
            draft_id,
            actor_user_id=actor_user_id,
            review_notes=review_notes,
        )
        source, price_event = self._source_service.record_from_draft(
            tenant_db,
            product_id=product.id,
            draft=draft,
            connector_id=draft.connector_id,
            notes=review_notes,
        )
        if draft.connector_id:
            self._connector_service.touch_connector_sync(tenant_db, draft.connector_id, status="ready")
        tenant_db.commit()
        tenant_db.refresh(draft)
        tenant_db.refresh(product)
        tenant_db.refresh(source)
        tenant_db.refresh(price_event)
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
    ):
        draft, product = super().resolve_duplicate_to_existing_product(
            tenant_db,
            draft_id,
            target_product_id=target_product_id,
            resolution_mode=resolution_mode,
            actor_user_id=actor_user_id,
            review_notes=review_notes,
        )
        self._source_service.record_from_draft(
            tenant_db,
            product_id=product.id,
            draft=draft,
            connector_id=draft.connector_id,
            notes=review_notes or resolution_mode,
        )
        if draft.connector_id:
            self._connector_service.touch_connector_sync(tenant_db, draft.connector_id, status="ready")
        tenant_db.commit()
        tenant_db.refresh(draft)
        tenant_db.refresh(product)
        return draft, product

    def build_overview(self, tenant_db) -> dict[str, int]:
        base = super().build_overview(tenant_db)
        source_metrics = self._source_service.build_metrics(tenant_db)
        return {
            "total": int(base["ingestion_total"]),
            "draft": int(base["ingestion_draft"]),
            "approved": int(base["ingestion_approved"]),
            "discarded": int(base["ingestion_discarded"]),
            "with_url": int(base["ingestion_with_url"]),
            "source_total": int(source_metrics["source_total"]),
            "price_event_total": int(source_metrics["price_event_total"]),
            "connectors_total": int(source_metrics["connectors_total"]),
        }
