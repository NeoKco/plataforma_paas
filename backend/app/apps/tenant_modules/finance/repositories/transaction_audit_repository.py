import json

from sqlalchemy.orm import Session

from app.apps.tenant_modules.finance.models.transaction_audit import FinanceTransactionAudit


class FinanceTransactionAuditRepository:
    def save_event(
        self,
        tenant_db: Session,
        *,
        transaction_id: int,
        event_type: str,
        actor_user_id: int | None,
        summary: str,
        payload: dict | None = None,
    ) -> FinanceTransactionAudit:
        event = FinanceTransactionAudit(
            transaction_id=transaction_id,
            event_type=event_type,
            actor_user_id=actor_user_id,
            summary=summary,
            payload_json=json.dumps(payload) if payload else None,
        )
        tenant_db.add(event)
        tenant_db.commit()
        tenant_db.refresh(event)
        return event

    def list_by_transaction(
        self,
        tenant_db: Session,
        *,
        transaction_id: int,
    ) -> list[FinanceTransactionAudit]:
        return (
            tenant_db.query(FinanceTransactionAudit)
            .filter(FinanceTransactionAudit.transaction_id == transaction_id)
            .order_by(FinanceTransactionAudit.created_at.desc(), FinanceTransactionAudit.id.desc())
            .all()
        )
