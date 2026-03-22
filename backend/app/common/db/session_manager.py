from collections.abc import Generator

from fastapi import HTTPException, Request, status
from sqlalchemy.orm import Session

from app.apps.tenant_modules.core.services.tenant_connection_service import (
    TenantConnectionService,
)
from app.apps.platform_control.services.tenant_service import TenantService
from app.common.db.control_database import ControlSessionLocal


def get_control_db() -> Generator:
    db = ControlSessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_tenant_db(request: Request) -> Generator[Session, None, None]:
    tenant_slug = getattr(request.state, "tenant_slug", None)
    token_scope = getattr(request.state, "token_scope", None)

    if token_scope != "tenant":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="El request no corresponde al scope tenant",
        )

    if not tenant_slug:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="tenant_slug no disponible en el contexto actual",
        )

    control_db = ControlSessionLocal()
    tenant_db: Session | None = None

    try:
        connection_service = TenantConnectionService()
        tenant_service = TenantService()
        tenant = connection_service.get_tenant_by_slug(control_db, tenant_slug)

        if tenant is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tenant no encontrado",
            )

        tenant_status_error = tenant_service.get_tenant_status_error(tenant)
        if tenant_status_error is not None:
            status_code, detail = tenant_status_error
            raise HTTPException(
                status_code=status_code,
                detail=detail,
            )

        try:
            tenant_session_factory = connection_service.get_tenant_session(tenant)
            tenant_db = tenant_session_factory()
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=str(exc),
            ) from exc

        yield tenant_db
    finally:
        if tenant_db is not None:
            tenant_db.close()
        control_db.close()
