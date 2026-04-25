from app.apps.tenant_modules.products.services.ingestion_extraction_service import (
    ProductCatalogIngestionExtractionService,
)
from app.apps.tenant_modules.products.services.ingestion_service import (
    ProductCatalogIngestionService,
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
        super().__init__(
            extraction_service=extraction_service or ProductCatalogIngestionExtractionService(),
            ingestion_service=ingestion_service or ProductCatalogIngestionService(),
            tenant_connection_service=tenant_connection_service,
        )
