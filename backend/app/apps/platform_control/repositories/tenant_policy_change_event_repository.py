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

    def list_global_recent(
        self,
        db: Session,
        *,
        event_type: str | None = None,
        tenant_slug: str | None = None,
        actor_email: str | None = None,
        search: str | None = None,
        limit: int = 50,
    ) -> list[TenantPolicyChangeEvent]:
        query = db.query(TenantPolicyChangeEvent)

        if event_type:
            query = query.filter(TenantPolicyChangeEvent.event_type == event_type)
        if tenant_slug:
            query = query.filter(TenantPolicyChangeEvent.tenant_slug == tenant_slug)
        if actor_email:
            query = query.filter(TenantPolicyChangeEvent.actor_email == actor_email)
        if search:
            pattern = f"%{search.strip()}%"
            query = query.filter(
                (TenantPolicyChangeEvent.event_type.ilike(pattern))
                | (TenantPolicyChangeEvent.tenant_slug.ilike(pattern))
                | (TenantPolicyChangeEvent.actor_email.ilike(pattern))
            )

        return (
            query.order_by(
                TenantPolicyChangeEvent.recorded_at.desc(),
                TenantPolicyChangeEvent.id.desc(),
            )
            .limit(limit)
            .all()
        )
