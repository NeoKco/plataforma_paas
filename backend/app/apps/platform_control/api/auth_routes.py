from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.apps.platform_control.schemas import (
    LoginRequest,
    LoginResponse,
    LogoutResponse,
    RefreshTokenRequest,
)
from app.apps.platform_control.services.auth_audit_service import AuthAuditService
from app.apps.platform_control.services.auth_service import PlatformAuthService
from app.common.auth.auth_token_service import AuthTokenService
from app.common.auth.dependencies import get_current_token_payload
from app.common.config.settings import settings
from app.common.db.session_manager import get_control_db

router = APIRouter(prefix="/platform/auth", tags=["platform-auth"])
platform_auth_service = PlatformAuthService()
auth_token_service = AuthTokenService()
auth_audit_service = AuthAuditService()


@router.post("/login", response_model=LoginResponse)
def login(
    payload: LoginRequest,
    db: Session = Depends(get_control_db),
) -> LoginResponse:
    user = platform_auth_service.login(
        db=db,
        email=payload.email,
        password=payload.password,
    )

    if not user:
        auth_audit_service.log_event(
            db,
            event_type="platform.login",
            subject_scope="platform",
            outcome="failed",
            email=payload.email,
            detail="Invalid credentials",
        )
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token_pair = auth_token_service.issue_token_pair(
        db=db,
        user_id=user.id,
        email=user.email,
        role=user.role,
        token_scope="platform",
        audience=settings.JWT_PLATFORM_AUDIENCE,
    )
    access_payload = auth_token_service.jwt_service.decode_token(
        token_pair["access_token"],
        audience=settings.JWT_PLATFORM_AUDIENCE,
    )
    auth_audit_service.log_event(
        db,
        event_type="platform.login",
        subject_scope="platform",
        outcome="success",
        subject_user_id=user.id,
        email=user.email,
        token_jti=access_payload["jti"],
        detail="Platform login successful",
    )

    return LoginResponse(
        success=True,
        message="Login successful",
        access_token=token_pair["access_token"],
        refresh_token=token_pair["refresh_token"],
        token_type="bearer",
        user_id=user.id,
        full_name=user.full_name,
        email=user.email,
        role=user.role,
    )


@router.post("/refresh", response_model=LoginResponse)
def refresh_login(
    payload: RefreshTokenRequest,
    db: Session = Depends(get_control_db),
) -> LoginResponse:
    try:
        token_payload, token_pair = auth_token_service.refresh_token_pair(
            db=db,
            refresh_token=payload.refresh_token,
            expected_scope="platform",
            audience=settings.JWT_PLATFORM_AUDIENCE,
        )
    except HTTPException as exc:
        auth_audit_service.log_event(
            db,
            event_type="platform.refresh",
            subject_scope="platform",
            outcome="failed",
            detail=exc.detail,
        )
        raise

    access_payload = auth_token_service.jwt_service.decode_token(
        token_pair["access_token"],
        audience=settings.JWT_PLATFORM_AUDIENCE,
    )
    auth_audit_service.log_event(
        db,
        event_type="platform.refresh",
        subject_scope="platform",
        outcome="success",
        subject_user_id=int(token_payload["sub"]),
        email=token_payload["email"],
        token_jti=access_payload["jti"],
        detail="Platform token refreshed successfully",
    )

    return LoginResponse(
        success=True,
        message="Token refreshed successfully",
        access_token=token_pair["access_token"],
        refresh_token=token_pair["refresh_token"],
        token_type="bearer",
        user_id=int(token_payload["sub"]),
        full_name=None,
        email=token_payload["email"],
        role=token_payload["role"],
    )


@router.post("/logout", response_model=LogoutResponse)
def logout(
    db: Session = Depends(get_control_db),
    payload: dict = Depends(get_current_token_payload),
) -> LogoutResponse:
    revoked_refresh_tokens = auth_token_service.revoke_session(
        db=db,
        access_payload=payload,
    )
    auth_audit_service.log_event(
        db,
        event_type="platform.logout",
        subject_scope="platform",
        outcome="success",
        subject_user_id=int(payload["sub"]),
        email=payload["email"],
        token_jti=payload["jti"],
        detail="Platform session revoked successfully",
    )

    return LogoutResponse(
        success=True,
        message="Session revoked successfully",
        revoked_refresh_tokens=revoked_refresh_tokens,
    )
