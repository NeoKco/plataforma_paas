from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.apps.platform_control.schemas import (
    AuthAuditEventListResponse,
    AuthAuditEventResponse,
)
from app.apps.platform_control.services.auth_audit_service import AuthAuditService
from app.common.auth.role_dependencies import require_role
from app.common.db.session_manager import get_control_db

router = APIRouter(prefix="/platform/auth-audit", tags=["platform-auth-audit"])
auth_audit_service = AuthAuditService()


@router.get("/", response_model=AuthAuditEventListResponse)
def list_platform_auth_audit(
    limit: int = Query(default=50, ge=1, le=100),
    subject_scope: str | None = Query(default=None),
    outcome: str | None = Query(default=None),
    search: str | None = Query(default=None),
    db: Session = Depends(get_control_db),
    _token: dict = Depends(require_role("superadmin", "admin")),
) -> AuthAuditEventListResponse:
    events = auth_audit_service.list_recent_events(
        db,
        limit=limit,
        subject_scope=subject_scope,
        outcome=outcome,
        search=search,
    )
    return AuthAuditEventListResponse(
        success=True,
        message="Actividad de autenticación recuperada correctamente.",
        total_events=len(events),
        data=[AuthAuditEventResponse.model_validate(item) for item in events],
    )
