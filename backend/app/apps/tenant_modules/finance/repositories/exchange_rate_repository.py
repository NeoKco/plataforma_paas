from app.apps.tenant_modules.finance.models.exchange_rate import FinanceExchangeRate
from app.apps.tenant_modules.finance.repositories.catalog_repository import (
    FinanceCatalogRepository,
)


class FinanceExchangeRateRepository(FinanceCatalogRepository[FinanceExchangeRate]):
    model_class = FinanceExchangeRate
    name_field = None
