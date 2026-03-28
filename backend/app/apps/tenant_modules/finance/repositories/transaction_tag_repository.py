from sqlalchemy.orm import Session

from app.apps.tenant_modules.finance.models.transaction_tag import (
    FinanceTransactionTag,
)


class FinanceTransactionTagRepository:
    def list_tag_ids_by_transaction_ids(
        self,
        tenant_db: Session,
        transaction_ids: list[int],
    ) -> dict[int, list[int]]:
        if not transaction_ids:
            return {}

        rows = (
            tenant_db.query(FinanceTransactionTag)
            .filter(FinanceTransactionTag.transaction_id.in_(transaction_ids))
            .order_by(
                FinanceTransactionTag.transaction_id.asc(),
                FinanceTransactionTag.tag_id.asc(),
            )
            .all()
        )
        tag_ids_by_transaction_id = {transaction_id: [] for transaction_id in transaction_ids}
        for row in rows:
            tag_ids_by_transaction_id.setdefault(row.transaction_id, []).append(row.tag_id)
        return tag_ids_by_transaction_id

    def replace_for_transaction(
        self,
        tenant_db: Session,
        transaction_id: int,
        tag_ids: list[int],
    ) -> None:
        (
            tenant_db.query(FinanceTransactionTag)
            .filter(FinanceTransactionTag.transaction_id == transaction_id)
            .delete(synchronize_session=False)
        )
        for tag_id in tag_ids:
            tenant_db.add(
                FinanceTransactionTag(
                    transaction_id=transaction_id,
                    tag_id=tag_id,
                )
            )
