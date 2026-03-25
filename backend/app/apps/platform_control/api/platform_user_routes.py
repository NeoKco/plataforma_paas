from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.apps.platform_control.schemas import (
    PlatformUserCreateRequest,
    PlatformUserDeleteResponse,
    PlatformUserListResponse,
    PlatformUserResponse,
    PlatformUserPasswordResetRequest,
    PlatformUserStatusUpdateRequest,
    PlatformUserUpdateRequest,
    PlatformUserWriteResponse,
)
from app.apps.platform_control.services.platform_user_service import (
    PlatformUserService,
)
from app.common.auth.role_dependencies import require_role
from app.common.db.session_manager import get_control_db

router = APIRouter(prefix="/platform/users", tags=["platform-users"])
platform_user_service = PlatformUserService()


def _build_write_response(
    user,
    *,
    message: str,
) -> PlatformUserWriteResponse:
    return PlatformUserWriteResponse(
        success=True,
        message=message,
        user_id=user.id,
        full_name=user.full_name,
        email=user.email,
        role=user.role,
        is_active=user.is_active,
    )


@router.get("/", response_model=PlatformUserListResponse)
def list_platform_users(
    db: Session = Depends(get_control_db),
    _token: dict = Depends(require_role("superadmin", "admin", "support")),
) -> PlatformUserListResponse:
    users = platform_user_service.list_users(db)
    return PlatformUserListResponse(
        success=True,
        message="Usuarios de plataforma recuperados correctamente",
        total_users=len(users),
        data=[PlatformUserResponse.model_validate(user) for user in users],
    )


@router.post("/", response_model=PlatformUserWriteResponse)
def create_platform_user(
    payload: PlatformUserCreateRequest,
    db: Session = Depends(get_control_db),
    _token: dict = Depends(require_role("superadmin", "admin")),
) -> PlatformUserWriteResponse:
    try:
        user = platform_user_service.create_user(
            db,
            full_name=payload.full_name,
            email=payload.email,
            role=payload.role,
            password=payload.password,
            is_active=payload.is_active,
            actor_role=_token.get("role", "superadmin"),
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return _build_write_response(
        user,
        message="El usuario de plataforma fue creado correctamente.",
    )


@router.patch("/{user_id}", response_model=PlatformUserWriteResponse)
def update_platform_user(
    user_id: int,
    payload: PlatformUserUpdateRequest,
    db: Session = Depends(get_control_db),
    _token: dict = Depends(require_role("superadmin", "admin")),
) -> PlatformUserWriteResponse:
    try:
        user = platform_user_service.update_user(
            db,
            user_id=user_id,
            full_name=payload.full_name,
            role=payload.role,
            actor_role=_token.get("role", "superadmin"),
        )
    except ValueError as exc:
        detail = str(exc)
        status_code = 404 if detail == "Platform user not found" else 400
        raise HTTPException(status_code=status_code, detail=detail) from exc

    return _build_write_response(
        user,
        message="El usuario de plataforma fue actualizado correctamente.",
    )


@router.patch("/{user_id}/status", response_model=PlatformUserWriteResponse)
def update_platform_user_status(
    user_id: int,
    payload: PlatformUserStatusUpdateRequest,
    db: Session = Depends(get_control_db),
    _token: dict = Depends(require_role("superadmin", "admin")),
) -> PlatformUserWriteResponse:
    try:
        user = platform_user_service.set_user_status(
            db,
            user_id=user_id,
            is_active=payload.is_active,
            actor_role=_token.get("role", "superadmin"),
        )
    except ValueError as exc:
        detail = str(exc)
        status_code = 404 if detail == "Platform user not found" else 400
        raise HTTPException(status_code=status_code, detail=detail) from exc

    return _build_write_response(
        user,
        message="El estado del usuario de plataforma fue actualizado correctamente.",
    )


@router.post("/{user_id}/reset-password", response_model=PlatformUserWriteResponse)
def reset_platform_user_password(
    user_id: int,
    payload: PlatformUserPasswordResetRequest,
    db: Session = Depends(get_control_db),
    _token: dict = Depends(require_role("superadmin", "admin")),
) -> PlatformUserWriteResponse:
    try:
        user = platform_user_service.reset_password(
            db,
            user_id=user_id,
            new_password=payload.new_password,
            actor_role=_token.get("role", "superadmin"),
        )
    except ValueError as exc:
        detail = str(exc)
        status_code = 404 if detail == "Platform user not found" else 400
        raise HTTPException(status_code=status_code, detail=detail) from exc

    return _build_write_response(
        user,
        message="La contraseña del usuario de plataforma fue actualizada correctamente.",
    )


@router.delete("/{user_id}", response_model=PlatformUserDeleteResponse)
def delete_platform_user(
    user_id: int,
    db: Session = Depends(get_control_db),
    _token: dict = Depends(require_role("superadmin", "admin")),
) -> PlatformUserDeleteResponse:
    try:
        user = platform_user_service.delete_user(
            db,
            user_id=user_id,
            actor_role=_token.get("role", "superadmin"),
            actor_user_id=int(_token["sub"]) if _token.get("sub") is not None else None,
        )
    except ValueError as exc:
        detail = str(exc)
        status_code = 404 if detail == "Platform user not found" else 400
        raise HTTPException(status_code=status_code, detail=detail) from exc

    return PlatformUserDeleteResponse(
        success=True,
        message="El usuario de plataforma fue eliminado correctamente.",
        user_id=user.id,
        full_name=user.full_name,
        email=user.email,
        role=user.role,
    )
