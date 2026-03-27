import json

from sqlalchemy.orm import Session

from app.apps.tenant_modules.finance.models.transaction_audit import FinanceTransactionAudit


class FinanceTransactionAuditRepository:
    def build_event(
        self,
        *,
        transaction_id: int,
        event_type: str,
        actor_user_id: int | None,
        summary: str,
        payload: dict | None = None,
    ) -> FinanceTransactionAudit:
        return FinanceTransactionAudit(
            transaction_id=transaction_id,
            event_type=event_type,
            actor_user_id=actor_user_id,
            summary=summary,
            payload_json=json.dumps(payload) if payload else None,
        )

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
        event = self.build_event(
            transaction_id=transaction_id,
            event_type=event_type,
            actor_user_id=actor_user_id,
            summary=summary,
            payload=payload,
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
