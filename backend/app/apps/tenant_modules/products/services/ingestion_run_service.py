from app.apps.tenant_modules.products.services.ingestion_extraction_service import (
    ProductCatalogIngestionExtractionService,
)
from app.apps.tenant_modules.products.services.ingestion_service import (
    ProductCatalogIngestionService,
)
from app.apps.tenant_modules.products.services.connector_service import (
    ProductConnectorService,
)
from app.apps.tenant_modules.crm.services.product_ingestion_run_service import (
    CRMProductIngestionRunService,
)
from app.apps.tenant_modules.crm.schemas import CRMProductIngestionDraftCreateRequest


class ProductCatalogIngestionRunService(CRMProductIngestionRunService):
    def __init__(
        self,
        *,
        extraction_service=None,
        ingestion_service=None,
        tenant_connection_service=None,
    ):
        self._connector_service = ProductConnectorService()
        super().__init__(
            extraction_service=extraction_service or ProductCatalogIngestionExtractionService(),
            ingestion_service=ingestion_service or ProductCatalogIngestionService(),
            tenant_connection_service=tenant_connection_service,
        )

    def create_run(self, tenant_db, payload, *, actor_user_id: int | None = None):
        connector = self._connector_service.get_connector(tenant_db, payload.connector_id) if payload.connector_id else None
        run = super().create_run(tenant_db, payload, actor_user_id=actor_user_id)
        run.connector_id = connector.id if connector else None
        tenant_db.add(run)
        tenant_db.flush()
        items = self.get_run_items(tenant_db, run.id)
        for item in items:
            matching_entry = next(
                (
                    entry
                    for entry in payload.entries
                    if (entry.source_url or "").strip() == item.source_url
                ),
                None,
            )
            item.connector_id = (
                matching_entry.connector_id
                if matching_entry and matching_entry.connector_id
                else (connector.id if connector else None)
            )
            tenant_db.add(item)
        if connector:
            self._connector_service.touch_connector_sync(tenant_db, connector.id, status="ready")
        tenant_db.commit()
        tenant_db.refresh(run)
        return run

    def extract_url_to_draft(self, tenant_db, payload, *, actor_user_id: int | None = None):
        connector = self._connector_service.get_connector(tenant_db, payload.connector_id) if payload.connector_id else None
        extraction = self._extraction_service.extract_from_url(
            payload.source_url,
            provider_key=getattr(connector, "provider_key", "generic"),
        )
        draft_payload = CRMProductIngestionDraftCreateRequest(
            source_kind="url_reference",
            source_label=self._normalize_optional(payload.source_label),
            source_url=payload.source_url.strip(),
            external_reference=self._normalize_optional(payload.external_reference),
            sku=extraction.get("sku"),
            name=extraction.get("name"),
            brand=extraction.get("brand"),
            category_label=extraction.get("category_label"),
            product_type=extraction.get("product_type") or "product",
            unit_label=extraction.get("unit_label"),
            unit_price=float(extraction.get("unit_price") or 0),
            currency_code=extraction.get("currency_code") or "CLP",
            description=extraction.get("description"),
            source_excerpt=extraction.get("source_excerpt"),
            extraction_notes=extraction.get("extraction_notes"),
            characteristics=extraction.get("characteristics") or [],
        )
        draft = self._ingestion_service.create_draft(tenant_db, draft_payload, actor_user_id=actor_user_id)
        if connector:
            draft.connector_id = connector.id
            tenant_db.add(draft)
            self._connector_service.touch_connector_sync(tenant_db, connector.id, status="ready")
            tenant_db.commit()
            tenant_db.refresh(draft)
        return draft

    def get_run_items(self, tenant_db, run_id: int):
        return self.get_run_item_map(tenant_db, [run_id]).get(run_id, [])
