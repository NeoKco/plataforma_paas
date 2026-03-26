from app.apps.tenant_modules.finance.models.account import FinanceAccount
from app.apps.tenant_modules.finance.repositories.catalog_repository import (
    FinanceCatalogRepository,
)


class FinanceAccountRepository(FinanceCatalogRepository[FinanceAccount]):
    model_class = FinanceAccount
