from sqlalchemy.orm import Session

from app.apps.tenant_modules.finance.models.currency import FinanceCurrency
from app.apps.tenant_modules.finance.repositories.catalog_repository import (
    FinanceCatalogRepository,
)


class FinanceCurrencyRepository(FinanceCatalogRepository[FinanceCurrency]):
    model_class = FinanceCurrency
    name_field = "code"

    def get_base_currency(self, tenant_db: Session) -> FinanceCurrency | None:
        return (
            tenant_db.query(FinanceCurrency)
            .filter(FinanceCurrency.is_base.is_(True))
            .first()
        )
