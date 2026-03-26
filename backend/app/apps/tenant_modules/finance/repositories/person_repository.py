from app.apps.tenant_modules.finance.models.person import FinancePerson
from app.apps.tenant_modules.finance.repositories.catalog_repository import (
    FinanceCatalogRepository,
)


class FinancePersonRepository(FinanceCatalogRepository[FinancePerson]):
    model_class = FinancePerson
