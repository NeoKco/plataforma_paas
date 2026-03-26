from app.apps.tenant_modules.finance.models.settings import FinanceSetting
from app.apps.tenant_modules.finance.repositories.catalog_repository import (
    FinanceCatalogRepository,
)


class FinanceSettingsRepository(FinanceCatalogRepository[FinanceSetting]):
    model_class = FinanceSetting
    name_field = "setting_key"
