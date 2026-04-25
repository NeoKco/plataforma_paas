from app.apps.tenant_modules.crm.services.product_ingestion_extraction_service import (
    CRMProductIngestionExtractionService,
)


class ProductCatalogIngestionExtractionService(CRMProductIngestionExtractionService):
    USER_AGENT = "Mozilla/5.0 (compatible; orkestia-products-ingestion/1.0)"
