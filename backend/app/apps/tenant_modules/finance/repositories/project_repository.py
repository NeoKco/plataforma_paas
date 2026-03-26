from sqlalchemy.orm import Session

from app.apps.tenant_modules.finance.models.project import FinanceProject
from app.apps.tenant_modules.finance.repositories.catalog_repository import (
    FinanceCatalogRepository,
)


class FinanceProjectRepository(FinanceCatalogRepository[FinanceProject]):
    model_class = FinanceProject

    def get_by_code(self, tenant_db: Session, code: str) -> FinanceProject | None:
        return (
            tenant_db.query(FinanceProject)
            .filter(FinanceProject.code == code)
            .first()
        )
