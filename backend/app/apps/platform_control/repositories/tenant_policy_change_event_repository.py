from sqlalchemy.orm import Session

from app.apps.platform_control.models.tenant_policy_change_event import (
    TenantPolicyChangeEvent,
)


class TenantPolicyChangeEventRepository:
    def save(
        self,
        db: Session,
        *,
        row: dict,
    ) -> TenantPolicyChangeEvent:
        event = TenantPolicyChangeEvent(**row)
        db.add(event)
        db.commit()
        db.refresh(event)
        return event

    def list_recent(
        self,
        db: Session,
        *,
        tenant_id: int,
        event_type: str | None = None,
        limit: int = 50,
    ) -> list[TenantPolicyChangeEvent]:
        query = db.query(TenantPolicyChangeEvent).filter(
            TenantPolicyChangeEvent.tenant_id == tenant_id
        )

        if event_type:
            query = query.filter(TenantPolicyChangeEvent.event_type == event_type)

        return (
            query.order_by(
                TenantPolicyChangeEvent.recorded_at.desc(),
                TenantPolicyChangeEvent.id.desc(),
            )
            .limit(limit)
            .all()
        )
