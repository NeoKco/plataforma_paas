from sqlalchemy.orm import Session

from app.apps.tenant_modules.finance.models.exchange_rate import FinanceExchangeRate
from app.apps.tenant_modules.finance.repositories.catalog_repository import (
    FinanceCatalogRepository,
)


class FinanceExchangeRateRepository(FinanceCatalogRepository[FinanceExchangeRate]):
    model_class = FinanceExchangeRate

    def list_all(
        self,
        tenant_db: Session,
        *,
        include_inactive: bool = True,
    ) -> list[FinanceExchangeRate]:
        del include_inactive
        return (
            tenant_db.query(FinanceExchangeRate)
            .order_by(
                FinanceExchangeRate.effective_at.desc(),
                FinanceExchangeRate.id.desc(),
            )
            .all()
        )

    def get_by_pair_effective_at(
        self,
        tenant_db: Session,
        source_currency_id: int,
        target_currency_id: int,
        effective_at,
    ) -> FinanceExchangeRate | None:
        return (
            tenant_db.query(FinanceExchangeRate)
            .filter(
                FinanceExchangeRate.source_currency_id == source_currency_id,
                FinanceExchangeRate.target_currency_id == target_currency_id,
                FinanceExchangeRate.effective_at == effective_at,
            )
            .first()
        )
    name_field = None
