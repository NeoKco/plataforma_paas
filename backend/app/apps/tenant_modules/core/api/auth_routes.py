from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

from app.apps.tenant_modules.core.schemas import (
    TenantLogoutResponse,
    TenantLoginRequest,
    TenantLoginResponse,
    TenantRefreshTokenRequest,
)
from app.apps.platform_control.services.auth_audit_service import AuthAuditService
from app.apps.tenant_modules.core.services.tenant_auth_service import TenantAuthService
from app.apps.tenant_modules.core.services.tenant_connection_service import (
    TenantConnectionService,
)
from app.common.auth.auth_token_service import AuthTokenService
from app.common.auth.dependencies import get_current_token_payload
from app.common.config.settings import settings
from app.common.db.session_manager import get_control_db
from app.apps.platform_control.services.tenant_service import TenantService

router = APIRouter(prefix="/tenant/auth", tags=["tenant-auth"])
auth_token_service = AuthTokenService()
auth_audit_service = AuthAuditService()
tenant_service = TenantService()


def _raise_tenant_operational_http_error(exc: Exception) -> None:
    detail = str(exc).lower()

    if (
        "password authentication failed" in detail
        or "autentificación password falló" in detail
        or "authentication failed" in detail
        or "connection refused" in detail
        or "could not connect to server" in detail
    ):
        raise HTTPException(
            status_code=503,
            detail="Tenant unavailable due to operational error",
        ) from exc

    raise exc


@router.post("/login", response_model=TenantLoginResponse)
def tenant_login(
    payload: TenantLoginRequest,
    control_db: Session = Depends(get_control_db),
) -> TenantLoginResponse:
    connection_service = TenantConnectionService()
    tenant = connection_service.get_tenant_by_slug(control_db, payload.tenant_slug)

    if not tenant:
        auth_audit_service.log_event(
            control_db,
            event_type="tenant.login",
            subject_scope="tenant",
            outcome="failed",
            tenant_slug=payload.tenant_slug,
            email=payload.email,
            detail="Tenant not found or inactive",
        )
        raise HTTPException(status_code=404, detail="Tenant not found or inactive")

    tenant_status_error = tenant_service.get_tenant_status_error(tenant)
    if tenant_status_error is not None:
        status_code, detail = tenant_status_error
        auth_audit_service.log_event(
            control_db,
            event_type="tenant.login",
            subject_scope="tenant",
            outcome="failed",
            tenant_slug=tenant.slug,
            email=payload.email,
            detail=detail,
        )
        raise HTTPException(status_code=status_code, detail=detail)

    try:
        tenant_session_factory = connection_service.get_tenant_session(tenant)
        tenant_db = tenant_session_factory()
        if hasattr(tenant_db, "execute"):
            tenant_db.execute(text("SELECT 1"))
    except OperationalError as exc:
        _raise_tenant_operational_http_error(exc)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    try:
        auth_service = TenantAuthService()
        try:
            user = auth_service.login(
                tenant_db=tenant_db,
                email=payload.email,
                password=payload.password,
            )
        except OperationalError as exc:
            _raise_tenant_operational_http_error(exc)

        if not user:
            auth_audit_service.log_event(
                control_db,
                event_type="tenant.login",
                subject_scope="tenant",
                outcome="failed",
                tenant_slug=tenant.slug,
                email=payload.email,
                detail="Invalid credentials",
            )
            raise HTTPException(status_code=401, detail="Invalid credentials")

        token_pair = auth_token_service.issue_token_pair(
            db=control_db,
            user_id=user.id,
            email=user.email,
            role=user.role,
            token_scope="tenant",
            audience=settings.JWT_TENANT_AUDIENCE,
            tenant_slug=tenant.slug,
        )
        access_payload = auth_token_service.jwt_service.decode_token(
            token_pair["access_token"],
            audience=settings.JWT_TENANT_AUDIENCE,
        )
        auth_audit_service.log_event(
            control_db,
            event_type="tenant.login",
            subject_scope="tenant",
            outcome="success",
            subject_user_id=user.id,
            tenant_slug=tenant.slug,
            email=user.email,
            token_jti=access_payload["jti"],
            detail="Tenant login successful",
        )

        return TenantLoginResponse(
            success=True,
            message="Tenant login successful",
            access_token=token_pair["access_token"],
            refresh_token=token_pair["refresh_token"],
            token_type="bearer",
            tenant_slug=tenant.slug,
            user_id=user.id,
            full_name=user.full_name,
            email=user.email,
            role=user.role,
        )
    finally:
        tenant_db.close()


@router.post("/refresh", response_model=TenantLoginResponse)
def tenant_refresh_login(
    payload: TenantRefreshTokenRequest,
    control_db: Session = Depends(get_control_db),
) -> TenantLoginResponse:
    refresh_payload = auth_token_service.jwt_service.decode_token(
        payload.refresh_token,
        audience=settings.JWT_TENANT_AUDIENCE,
    )
    tenant_slug = refresh_payload.get("tenant_slug")

    if tenant_slug:
        tenant = TenantConnectionService().get_tenant_by_slug(control_db, tenant_slug)
        if not tenant:
            auth_audit_service.log_event(
                control_db,
                event_type="tenant.refresh",
                subject_scope="tenant",
                outcome="failed",
                tenant_slug=tenant_slug,
                detail="Tenant not found",
            )
            raise HTTPException(status_code=404, detail="Tenant not found")

        tenant_status_error = tenant_service.get_tenant_status_error(tenant)
        if tenant_status_error is not None:
            status_code, detail = tenant_status_error
            auth_audit_service.log_event(
                control_db,
                event_type="tenant.refresh",
                subject_scope="tenant",
                outcome="failed",
                tenant_slug=tenant_slug,
                detail=detail,
            )
            raise HTTPException(status_code=status_code, detail=detail)

    try:
        token_payload, token_pair = auth_token_service.refresh_token_pair(
            db=control_db,
            refresh_token=payload.refresh_token,
            expected_scope="tenant",
            audience=settings.JWT_TENANT_AUDIENCE,
        )
    except HTTPException as exc:
        auth_audit_service.log_event(
            control_db,
            event_type="tenant.refresh",
            subject_scope="tenant",
            outcome="failed",
            detail=exc.detail,
        )
        raise

    access_payload = auth_token_service.jwt_service.decode_token(
        token_pair["access_token"],
        audience=settings.JWT_TENANT_AUDIENCE,
    )
    auth_audit_service.log_event(
        control_db,
        event_type="tenant.refresh",
        subject_scope="tenant",
        outcome="success",
        subject_user_id=int(token_payload["sub"]),
        tenant_slug=token_payload["tenant_slug"],
        email=token_payload["email"],
        token_jti=access_payload["jti"],
        detail="Tenant token refreshed successfully",
    )

    return TenantLoginResponse(
        success=True,
        message="Tenant token refreshed successfully",
        access_token=token_pair["access_token"],
        refresh_token=token_pair["refresh_token"],
        token_type="bearer",
        tenant_slug=token_payload["tenant_slug"],
        user_id=int(token_payload["sub"]),
        full_name=None,
        email=token_payload["email"],
        role=token_payload["role"],
    )


@router.post("/logout", response_model=TenantLogoutResponse)
def tenant_logout(
    control_db: Session = Depends(get_control_db),
    payload: dict = Depends(get_current_token_payload),
) -> TenantLogoutResponse:
    revoked_refresh_tokens = auth_token_service.revoke_session(
        db=control_db,
        access_payload=payload,
    )
    auth_audit_service.log_event(
        control_db,
        event_type="tenant.logout",
        subject_scope="tenant",
        outcome="success",
        subject_user_id=int(payload["sub"]),
        tenant_slug=payload.get("tenant_slug"),
        email=payload["email"],
        token_jti=payload["jti"],
        detail="Tenant session revoked successfully",
    )

    return TenantLogoutResponse(
        success=True,
        message="Tenant session revoked successfully",
        revoked_refresh_tokens=revoked_refresh_tokens,
    )
