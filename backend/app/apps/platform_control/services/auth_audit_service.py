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
        request_id: str | None = None,
        request_path: str | None = None,
        request_method: str | None = None,
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
            request_id=request_id,
            request_path=request_path,
            request_method=request_method,
            detail=detail,
        )
        return self.auth_audit_event_repository.save(db, event)

    def list_recent_events(
        self,
        db: Session,
        *,
        limit: int = 50,
        subject_scope: str | None = None,
        outcome: str | None = None,
        event_type: str | None = None,
        tenant_slug: str | None = None,
        request_id: str | None = None,
        search: str | None = None,
    ) -> list[AuthAuditEvent]:
        normalized_scope = subject_scope.strip().lower() if subject_scope else None
        normalized_outcome = outcome.strip().lower() if outcome else None
        normalized_event_type = event_type.strip() if event_type else None
        normalized_tenant_slug = tenant_slug.strip() if tenant_slug else None
        normalized_request_id = request_id.strip() if request_id else None
        normalized_search = search.strip() if search else None

        return self.auth_audit_event_repository.list_recent(
            db,
            limit=max(1, min(limit, 100)),
            subject_scope=normalized_scope or None,
            outcome=normalized_outcome or None,
            event_type=normalized_event_type or None,
            tenant_slug=normalized_tenant_slug or None,
            request_id=normalized_request_id or None,
            search=normalized_search or None,
        )
