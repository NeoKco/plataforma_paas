from sqlalchemy.orm import Session

from app.apps.tenant_modules.finance.models.category import FinanceCategory
from app.apps.tenant_modules.finance.repositories.catalog_repository import (
    FinanceCatalogRepository,
)


class FinanceCategoryRepository(FinanceCatalogRepository[FinanceCategory]):
    model_class = FinanceCategory

    def list_by_type(
        self,
        tenant_db: Session,
        category_type: str,
        *,
        include_inactive: bool = True,
    ) -> list[FinanceCategory]:
        query = tenant_db.query(FinanceCategory).filter(
            FinanceCategory.category_type == category_type.strip().lower()
        )
        if not include_inactive:
            query = query.filter(FinanceCategory.is_active.is_(True))
        return query.order_by(FinanceCategory.sort_order.asc(), FinanceCategory.id.asc()).all()
