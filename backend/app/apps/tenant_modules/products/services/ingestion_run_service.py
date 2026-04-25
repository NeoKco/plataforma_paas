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
        draft = super().extract_url_to_draft(tenant_db, payload, actor_user_id=actor_user_id)
        if payload.connector_id:
            draft.connector_id = payload.connector_id
            tenant_db.add(draft)
            self._connector_service.touch_connector_sync(tenant_db, payload.connector_id, status="ready")
            tenant_db.commit()
            tenant_db.refresh(draft)
        return draft

    def get_run_items(self, tenant_db, run_id: int):
        return self.get_run_item_map(tenant_db, [run_id]).get(run_id, [])
