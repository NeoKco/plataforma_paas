from app.apps.tenant_modules.finance.models.beneficiary import FinanceBeneficiary
from app.apps.tenant_modules.finance.repositories.catalog_repository import (
    FinanceCatalogRepository,
)


class FinanceBeneficiaryRepository(FinanceCatalogRepository[FinanceBeneficiary]):
    model_class = FinanceBeneficiary
