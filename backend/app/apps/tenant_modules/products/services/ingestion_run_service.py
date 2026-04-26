from app.apps.tenant_modules.products.services.ingestion_extraction_service import (
    ProductCatalogIngestionExtractionService,
)
from app.apps.tenant_modules.products.services.enrichment_service import (
    ProductCatalogEnrichmentService,
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
from app.apps.tenant_modules.products.schemas import ProductCatalogIngestionDraftCreateRequest
from app.common.config.settings import settings


class ProductCatalogIngestionRunService(CRMProductIngestionRunService):
    URL_EXTRACTION_AI_TIMEOUT_SECONDS = 300

    def __init__(
        self,
        *,
        extraction_service=None,
        ingestion_service=None,
        tenant_connection_service=None,
    ):
        self._connector_service = ProductConnectorService()
        self._enrichment_service = ProductCatalogEnrichmentService()
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
            timeout_seconds=getattr(connector, "request_timeout_seconds", None),
        )
        source_label = self._normalize_optional(payload.source_label) or extraction.get("source_label") or getattr(connector, "name", None)
        enriched = self._enrichment_service.enrich_capture_payload(
            {
                **extraction,
                "source_url": payload.source_url.strip(),
                "source_label": source_label,
            },
            prefer_ai=True,
            prompt_override=getattr(connector, "config_notes", None),
            timeout_seconds=max(
                int(settings.API_IA_TIMEOUT or 45),
                self.URL_EXTRACTION_AI_TIMEOUT_SECONDS,
            ),
        )
        draft_payload = ProductCatalogIngestionDraftCreateRequest(
            source_kind="url_reference",
            source_label=source_label,
            source_url=payload.source_url.strip(),
            external_reference=self._normalize_optional(payload.external_reference),
            connector_id=getattr(connector, "id", None),
            sku=enriched.get("sku"),
            name=enriched.get("name"),
            brand=enriched.get("brand"),
            category_label=enriched.get("category_label"),
            product_type=enriched.get("product_type") or "product",
            unit_label=enriched.get("unit_label"),
            unit_price=float(enriched.get("unit_price") or 0),
            currency_code=enriched.get("currency_code") or "CLP",
            description=enriched.get("description"),
            source_excerpt=enriched.get("source_excerpt"),
            extraction_notes=enriched.get("extraction_notes") or extraction.get("extraction_notes"),
            characteristics=self._normalize_draft_characteristics(
                enriched.get("characteristics") or extraction.get("characteristics") or [],
            ),
        )
        draft = self._ingestion_service.create_draft(tenant_db, draft_payload, actor_user_id=actor_user_id)
        if connector:
            draft.connector_id = connector.id
            tenant_db.add(draft)
            self._connector_service.touch_connector_sync(tenant_db, connector.id, status="ready")
            tenant_db.commit()
            tenant_db.refresh(draft)
        return draft

    def _normalize_draft_characteristics(self, items) -> list[dict[str, object]]:
        normalized: list[dict[str, object]] = []
        for index, item in enumerate(items or []):
            if isinstance(item, dict):
                label = item.get("label")
                value = item.get("value")
                sort_order = item.get("sort_order")
            else:
                label = getattr(item, "label", None)
                value = getattr(item, "value", None)
                sort_order = getattr(item, "sort_order", None)
            if not label or not value:
                continue
            normalized.append(
                {
                    "label": str(label),
                    "value": str(value),
                    "sort_order": int(sort_order) if sort_order is not None else (index + 1) * 10,
                }
            )
        return normalized

    def get_run_items(self, tenant_db, run_id: int):
        return self.get_run_item_map(tenant_db, [run_id]).get(run_id, [])
