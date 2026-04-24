from app.apps.tenant_modules.crm.services.opportunity_service import CRMOpportunityService
from app.apps.tenant_modules.crm.services.overview_service import CRMOverviewService
from app.apps.tenant_modules.crm.services.product_ingestion_service import (
    CRMProductIngestionService,
)
from app.apps.tenant_modules.crm.services.product_service import CRMProductService
from app.apps.tenant_modules.crm.services.quote_service import CRMQuoteService
from app.apps.tenant_modules.crm.services.template_service import CRMQuoteTemplateService

__all__ = [
    "CRMOpportunityService",
    "CRMOverviewService",
    "CRMProductIngestionService",
    "CRMProductService",
    "CRMQuoteService",
    "CRMQuoteTemplateService",
]
