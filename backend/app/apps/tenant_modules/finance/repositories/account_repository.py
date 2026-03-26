from sqlalchemy.orm import Session

from app.apps.tenant_modules.finance.models.account import FinanceAccount
from app.apps.tenant_modules.finance.repositories.catalog_repository import (
    FinanceCatalogRepository,
)


class FinanceAccountRepository(FinanceCatalogRepository[FinanceAccount]):
    model_class = FinanceAccount

    def get_by_code(self, tenant_db: Session, code: str) -> FinanceAccount | None:
        return (
            tenant_db.query(FinanceAccount)
            .filter(FinanceAccount.code == code)
            .first()
        )
