from app.apps.tenant_modules.finance.models.tag import FinanceTag
from app.apps.tenant_modules.finance.repositories.catalog_repository import (
    FinanceCatalogRepository,
)


class FinanceTagRepository(FinanceCatalogRepository[FinanceTag]):
    model_class = FinanceTag
