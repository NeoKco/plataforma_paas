from sqlalchemy.orm import Session

from app.apps.platform_control.models.auth_audit_event import AuthAuditEvent
from app.apps.platform_control.repositories.auth_audit_event_repository import (
    AuthAuditEventRepository,
)


class AuthAuditService:
    def __init__(
        self,
        auth_audit_event_repository: AuthAuditEventRepository | None = None,
    ):
        self.auth_audit_event_repository = (
            auth_audit_event_repository or AuthAuditEventRepository()
        )

    def log_event(
        self,
        db: Session,
        *,
        event_type: str,
        subject_scope: str,
        outcome: str,
        subject_user_id: int | None = None,
        tenant_slug: str | None = None,
        email: str | None = None,
        token_jti: str | None = None,
        detail: str | None = None,
    ) -> AuthAuditEvent:
        event = AuthAuditEvent(
            event_type=event_type,
            subject_scope=subject_scope,
            outcome=outcome,
            subject_user_id=subject_user_id,
            tenant_slug=tenant_slug,
            email=email,
            token_jti=token_jti,
            detail=detail,
        )
        return self.auth_audit_event_repository.save(db, event)
