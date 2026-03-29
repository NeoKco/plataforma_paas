from sqlalchemy.orm import Session

from app.apps.tenant_modules.finance.models import FinanceTransactionAttachment


class FinanceTransactionAttachmentRepository:
    def save(
        self,
        tenant_db: Session,
        attachment: FinanceTransactionAttachment,
    ) -> FinanceTransactionAttachment:
        tenant_db.add(attachment)
        tenant_db.commit()
        tenant_db.refresh(attachment)
        return attachment

    def list_by_transaction(
        self,
        tenant_db: Session,
        transaction_id: int,
    ) -> list[FinanceTransactionAttachment]:
        return (
            tenant_db.query(FinanceTransactionAttachment)
            .filter(FinanceTransactionAttachment.transaction_id == transaction_id)
            .order_by(
                FinanceTransactionAttachment.created_at.desc(),
                FinanceTransactionAttachment.id.desc(),
            )
            .all()
        )

    def get_by_id(
        self,
        tenant_db: Session,
        attachment_id: int,
    ) -> FinanceTransactionAttachment | None:
        return (
            tenant_db.query(FinanceTransactionAttachment)
            .filter(FinanceTransactionAttachment.id == attachment_id)
            .first()
        )

    def delete(
        self,
        tenant_db: Session,
        attachment: FinanceTransactionAttachment,
    ) -> None:
        tenant_db.delete(attachment)
        tenant_db.commit()
