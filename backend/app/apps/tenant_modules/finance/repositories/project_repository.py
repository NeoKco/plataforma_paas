from app.apps.tenant_modules.finance.models.project import FinanceProject
from app.apps.tenant_modules.finance.repositories.catalog_repository import (
    FinanceCatalogRepository,
)


class FinanceProjectRepository(FinanceCatalogRepository[FinanceProject]):
    model_class = FinanceProject
