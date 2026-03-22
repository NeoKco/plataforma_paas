from sqlalchemy.orm import Session

from app.apps.platform_control.models.auth_audit_event import AuthAuditEvent


class AuthAuditEventRepository:
    def save(self, db: Session, event: AuthAuditEvent) -> AuthAuditEvent:
        db.add(event)
        db.commit()
        db.refresh(event)
        return event
