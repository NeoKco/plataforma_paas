from datetime import datetime

from sqlalchemy.orm import Session

from app.apps.tenant_modules.finance.models.transaction import FinanceTransaction


class FinanceTransactionRepository:
    def save(self, tenant_db: Session, transaction: FinanceTransaction) -> FinanceTransaction:
        tenant_db.add(transaction)
        tenant_db.commit()
        tenant_db.refresh(transaction)
        return transaction

    def list_all(self, tenant_db: Session) -> list[FinanceTransaction]:
        return (
            tenant_db.query(FinanceTransaction)
            .order_by(FinanceTransaction.transaction_at.desc(), FinanceTransaction.id.desc())
            .all()
        )

    def count_all(self, tenant_db: Session) -> int:
        return tenant_db.query(FinanceTransaction).count()

    def count_created_since(self, tenant_db: Session, created_since: datetime) -> int:
        return (
            tenant_db.query(FinanceTransaction)
            .filter(FinanceTransaction.created_at >= created_since)
            .count()
        )

    def count_created_since_by_type(
        self,
        tenant_db: Session,
        created_since: datetime,
        transaction_type: str,
    ) -> int:
        return (
            tenant_db.query(FinanceTransaction)
            .filter(FinanceTransaction.created_at >= created_since)
            .filter(FinanceTransaction.transaction_type == transaction_type.strip().lower())
            .count()
        )

    def get_by_id(self, tenant_db: Session, transaction_id: int) -> FinanceTransaction | None:
        return (
            tenant_db.query(FinanceTransaction)
            .filter(FinanceTransaction.id == transaction_id)
            .first()
        )
