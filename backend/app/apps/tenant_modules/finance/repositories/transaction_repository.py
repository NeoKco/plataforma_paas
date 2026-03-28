from datetime import datetime

from sqlalchemy import or_

from sqlalchemy.orm import Session

from app.apps.tenant_modules.finance.models.transaction import FinanceTransaction
from app.apps.tenant_modules.finance.models.transaction_tag import FinanceTransactionTag


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

    def list_filtered(
        self,
        tenant_db: Session,
        *,
        transaction_type: str | None = None,
        account_id: int | None = None,
        category_id: int | None = None,
        tag_id: int | None = None,
        is_favorite: bool | None = None,
        is_reconciled: bool | None = None,
        search: str | None = None,
    ) -> list[FinanceTransaction]:
        query = tenant_db.query(FinanceTransaction)

        if transaction_type:
            query = query.filter(
                FinanceTransaction.transaction_type == transaction_type.strip().lower()
            )
        if account_id is not None:
            query = query.filter(
                or_(
                    FinanceTransaction.account_id == account_id,
                    FinanceTransaction.target_account_id == account_id,
                )
            )
        if category_id is not None:
            query = query.filter(FinanceTransaction.category_id == category_id)
        if tag_id is not None:
            query = query.join(
                FinanceTransactionTag,
                FinanceTransactionTag.transaction_id == FinanceTransaction.id,
            ).filter(FinanceTransactionTag.tag_id == tag_id)
        if is_favorite is not None:
            query = query.filter(FinanceTransaction.is_favorite == is_favorite)
        if is_reconciled is not None:
            query = query.filter(FinanceTransaction.is_reconciled == is_reconciled)
        if search:
            search_term = f"%{search.strip()}%"
            query = query.filter(
                or_(
                    FinanceTransaction.description.ilike(search_term),
                    FinanceTransaction.notes.ilike(search_term),
                )
            )

        return query.order_by(
            FinanceTransaction.transaction_at.desc(),
            FinanceTransaction.id.desc(),
        ).all()

    def list_by_loan(
        self,
        tenant_db: Session,
        loan_id: int,
        *,
        limit: int | None = None,
    ) -> list[FinanceTransaction]:
        query = (
            tenant_db.query(FinanceTransaction)
            .filter(FinanceTransaction.loan_id == loan_id)
            .order_by(
                FinanceTransaction.transaction_at.desc(),
                FinanceTransaction.id.desc(),
            )
        )
        if limit is not None:
            query = query.limit(limit)
        return query.all()

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

    def list_by_ids(
        self,
        tenant_db: Session,
        transaction_ids: list[int],
    ) -> list[FinanceTransaction]:
        if not transaction_ids:
            return []
        return (
            tenant_db.query(FinanceTransaction)
            .filter(FinanceTransaction.id.in_(transaction_ids))
            .order_by(FinanceTransaction.id.asc())
            .all()
        )

    def persist(self, tenant_db: Session, transaction: FinanceTransaction) -> FinanceTransaction:
        tenant_db.add(transaction)
        tenant_db.commit()
        tenant_db.refresh(transaction)
        return transaction
