import json

from sqlalchemy.orm import Session

from app.apps.tenant_modules.business_core.models.merge_audit import BusinessCoreMergeAudit


class BusinessCoreMergeAuditRepository:
    def build_event(
        self,
        *,
        entity_kind: str,
        entity_id: int,
        summary: str,
        requested_by_user_id: int | None,
        requested_by_email: str | None,
        requested_by_role: str | None,
        payload: dict | None = None,
    ) -> BusinessCoreMergeAudit:
        return BusinessCoreMergeAudit(
            entity_kind=entity_kind,
            entity_id=entity_id,
            summary=summary,
            requested_by_user_id=requested_by_user_id,
            requested_by_email=requested_by_email,
            requested_by_role=requested_by_role,
            payload_json=json.dumps(payload, ensure_ascii=False) if payload else None,
        )

    def save_event(
        self,
        tenant_db: Session,
        *,
        entity_kind: str,
        entity_id: int,
        summary: str,
        requested_by_user_id: int | None,
        requested_by_email: str | None,
        requested_by_role: str | None,
        payload: dict | None = None,
    ) -> BusinessCoreMergeAudit:
        event = self.build_event(
            entity_kind=entity_kind,
            entity_id=entity_id,
            summary=summary,
            requested_by_user_id=requested_by_user_id,
            requested_by_email=requested_by_email,
            requested_by_role=requested_by_role,
            payload=payload,
        )
        tenant_db.add(event)
        tenant_db.commit()
        tenant_db.refresh(event)
        return event

    def list_recent_events(
        self,
        tenant_db: Session,
        *,
        entity_kind: str | None = None,
        entity_id: int | None = None,
        limit: int = 50,
    ) -> list[BusinessCoreMergeAudit]:
        query = tenant_db.query(BusinessCoreMergeAudit)
        if entity_kind:
            query = query.filter(BusinessCoreMergeAudit.entity_kind == entity_kind)
        if entity_id is not None:
            query = query.filter(BusinessCoreMergeAudit.entity_id == entity_id)
        return (
            query.order_by(BusinessCoreMergeAudit.created_at.desc(), BusinessCoreMergeAudit.id.desc())
            .limit(limit)
            .all()
        )
