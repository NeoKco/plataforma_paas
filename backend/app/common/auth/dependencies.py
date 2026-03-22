from typing import Any, Dict

from fastapi import HTTPException, Request, status

from app.apps.tenant_modules.core.permissions import get_permissions_for_role


def get_current_token_payload(request: Request) -> Dict[str, Any]:
    payload = getattr(request.state, "jwt_payload", None)

    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token no autenticado o payload no disponible",
        )

    return payload


def get_current_tenant_context(request: Request) -> Dict[str, Any]:
    tenant_slug = getattr(request.state, "tenant_slug", None)
    tenant_user_id = getattr(request.state, "tenant_user_id", None)
    tenant_email = getattr(request.state, "tenant_email", None)
    tenant_role = getattr(request.state, "tenant_role", None)
    token_scope = getattr(request.state, "token_scope", None)
    maintenance_mode = getattr(request.state, "tenant_maintenance_mode", False)

    if token_scope != "tenant":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="El token no corresponde al scope tenant",
        )

    if tenant_slug is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Contexto tenant sin tenant_slug",
        )

    if tenant_user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Contexto tenant sin user_id",
        )

    if not tenant_email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Contexto tenant sin email",
        )

    if not tenant_role:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Contexto tenant sin role",
        )

    return {
        "user_id": tenant_user_id,
        "email": tenant_email,
        "role": tenant_role,
        "tenant_slug": tenant_slug,
        "token_scope": token_scope,
        "maintenance_mode": bool(maintenance_mode),
        "permissions": sorted(get_permissions_for_role(tenant_role)),
    }


def get_current_platform_context(request: Request) -> Dict[str, Any]:
    platform_user_id = getattr(request.state, "platform_user_id", None)
    platform_email = getattr(request.state, "platform_email", None)
    platform_role = getattr(request.state, "platform_role", None)
    token_scope = getattr(request.state, "token_scope", None)

    if token_scope != "platform":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="El token no corresponde al scope platform",
        )

    if platform_user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Contexto platform sin user_id",
        )

    if not platform_email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Contexto platform sin email",
        )

    if not platform_role:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Contexto platform sin role",
        )

    return {
        "user_id": platform_user_id,
        "email": platform_email,
        "role": platform_role,
        "token_scope": token_scope,
    }


def require_tenant_admin(request: Request) -> Dict[str, Any]:
    current_user = get_current_tenant_context(request)

    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Se requiere rol admin del tenant",
        )

    return current_user


def require_tenant_permission(permission: str):
    def dependency(request: Request) -> Dict[str, Any]:
        current_user = get_current_tenant_context(request)
        permissions = set(current_user.get("permissions", []))

        if permission not in permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Se requiere permiso tenant: {permission}",
            )

        return current_user

    return dependency
