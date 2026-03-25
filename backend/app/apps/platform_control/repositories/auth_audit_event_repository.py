from sqlalchemy.orm import Session

from app.apps.platform_control.models.auth_audit_event import AuthAuditEvent


class AuthAuditEventRepository:
    def save(self, db: Session, event: AuthAuditEvent) -> AuthAuditEvent:
        db.add(event)
        db.commit()
        db.refresh(event)
        return event

    def list_recent(
        self,
        db: Session,
        *,
        limit: int = 50,
        subject_scope: str | None = None,
        outcome: str | None = None,
        search: str | None = None,
    ) -> list[AuthAuditEvent]:
        query = db.query(AuthAuditEvent)

        if subject_scope:
            query = query.filter(AuthAuditEvent.subject_scope == subject_scope)
        if outcome:
            query = query.filter(AuthAuditEvent.outcome == outcome)
        if search:
            pattern = f"%{search}%"
            query = query.filter(
                (AuthAuditEvent.event_type.ilike(pattern))
                | (AuthAuditEvent.email.ilike(pattern))
                | (AuthAuditEvent.detail.ilike(pattern))
                | (AuthAuditEvent.tenant_slug.ilike(pattern))
            )

        return (
            query.order_by(AuthAuditEvent.created_at.desc(), AuthAuditEvent.id.desc())
            .limit(limit)
            .all()
        )
