from sqlalchemy import func
from sqlalchemy.orm import Session

from app.apps.platform_control.models.tenant_billing_sync_event import (
    TenantBillingSyncEvent,
)


class TenantBillingSyncEventRepository:
    def get_by_id(
        self,
        db: Session,
        *,
        event_id: int,
    ) -> TenantBillingSyncEvent | None:
        return (
            db.query(TenantBillingSyncEvent)
            .filter(TenantBillingSyncEvent.id == event_id)
            .first()
        )

    def get_by_provider_event_id(
        self,
        db: Session,
        *,
        provider: str,
        provider_event_id: str,
    ) -> TenantBillingSyncEvent | None:
        return (
            db.query(TenantBillingSyncEvent)
            .filter(TenantBillingSyncEvent.provider == provider)
            .filter(TenantBillingSyncEvent.provider_event_id == provider_event_id)
            .first()
        )

    def save(
        self,
        db: Session,
        *,
        event: TenantBillingSyncEvent,
    ) -> TenantBillingSyncEvent:
        db.add(event)
        db.commit()
        db.refresh(event)
        return event

    def update_processing_result(
        self,
        db: Session,
        *,
        event: TenantBillingSyncEvent,
        processing_result: str,
    ) -> TenantBillingSyncEvent:
        event.processing_result = processing_result
        db.add(event)
        db.commit()
        db.refresh(event)
        return event

    def list_recent(
        self,
        db: Session,
        *,
        tenant_id: int,
        provider: str | None = None,
        event_type: str | None = None,
        processing_result: str | None = None,
        limit: int = 50,
    ) -> list[TenantBillingSyncEvent]:
        query = db.query(TenantBillingSyncEvent).filter(
            TenantBillingSyncEvent.tenant_id == tenant_id
        )
        if provider:
            query = query.filter(TenantBillingSyncEvent.provider == provider)
        if event_type:
            query = query.filter(TenantBillingSyncEvent.event_type == event_type)
        if processing_result:
            query = query.filter(
                TenantBillingSyncEvent.processing_result == processing_result
            )

        return (
            query.order_by(
                TenantBillingSyncEvent.recorded_at.desc(),
                TenantBillingSyncEvent.id.desc(),
            )
            .limit(limit)
            .all()
        )

    def summarize_recent(
        self,
        db: Session,
        *,
        tenant_id: int,
        provider: str | None = None,
        event_type: str | None = None,
        processing_result: str | None = None,
    ) -> list[dict]:
        query = (
            db.query(
                TenantBillingSyncEvent.provider.label("provider"),
                TenantBillingSyncEvent.event_type.label("event_type"),
                TenantBillingSyncEvent.processing_result.label("processing_result"),
                func.count(TenantBillingSyncEvent.id).label("total_events"),
                func.max(TenantBillingSyncEvent.recorded_at).label("last_recorded_at"),
            )
            .filter(TenantBillingSyncEvent.tenant_id == tenant_id)
        )
        if provider:
            query = query.filter(TenantBillingSyncEvent.provider == provider)
        if event_type:
            query = query.filter(TenantBillingSyncEvent.event_type == event_type)
        if processing_result:
            query = query.filter(
                TenantBillingSyncEvent.processing_result == processing_result
            )

        rows = (
            query.group_by(
                TenantBillingSyncEvent.provider,
                TenantBillingSyncEvent.event_type,
                TenantBillingSyncEvent.processing_result,
            )
            .order_by(
                func.max(TenantBillingSyncEvent.recorded_at).desc(),
                TenantBillingSyncEvent.provider.asc(),
                TenantBillingSyncEvent.event_type.asc(),
                TenantBillingSyncEvent.processing_result.asc(),
            )
            .all()
        )
        return [
            {
                "provider": row.provider,
                "event_type": row.event_type,
                "processing_result": row.processing_result,
                "total_events": row.total_events,
                "last_recorded_at": row.last_recorded_at,
            }
            for row in rows
        ]

    def summarize_all_recent(
        self,
        db: Session,
        *,
        provider: str | None = None,
        event_type: str | None = None,
        processing_result: str | None = None,
    ) -> list[dict]:
        query = db.query(
            TenantBillingSyncEvent.provider.label("provider"),
            TenantBillingSyncEvent.event_type.label("event_type"),
            TenantBillingSyncEvent.processing_result.label("processing_result"),
            func.count(TenantBillingSyncEvent.id).label("total_events"),
            func.count(func.distinct(TenantBillingSyncEvent.tenant_id)).label(
                "total_tenants"
            ),
            func.max(TenantBillingSyncEvent.recorded_at).label("last_recorded_at"),
        )
        if provider:
            query = query.filter(TenantBillingSyncEvent.provider == provider)
        if event_type:
            query = query.filter(TenantBillingSyncEvent.event_type == event_type)
        if processing_result:
            query = query.filter(
                TenantBillingSyncEvent.processing_result == processing_result
            )

        rows = (
            query.group_by(
                TenantBillingSyncEvent.provider,
                TenantBillingSyncEvent.event_type,
                TenantBillingSyncEvent.processing_result,
            )
            .order_by(
                func.max(TenantBillingSyncEvent.recorded_at).desc(),
                TenantBillingSyncEvent.provider.asc(),
                TenantBillingSyncEvent.event_type.asc(),
                TenantBillingSyncEvent.processing_result.asc(),
            )
            .all()
        )
        return [
            {
                "provider": row.provider,
                "event_type": row.event_type,
                "processing_result": row.processing_result,
                "total_events": row.total_events,
                "total_tenants": row.total_tenants,
                "last_recorded_at": row.last_recorded_at,
            }
            for row in rows
        ]
