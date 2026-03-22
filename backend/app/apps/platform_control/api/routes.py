from fastapi import APIRouter, Depends

from app.apps.platform_control.schemas import PlatformCapabilityCatalogResponse
from app.apps.platform_control.services.platform_capability_service import (
    PlatformCapabilityService,
)
from app.common.auth.dependencies import get_current_token_payload
from app.common.auth.role_dependencies import require_role
from app.apps.platform_control.services.platform_runtime_service import (
    PlatformRuntimeService,
)

router = APIRouter(prefix="/platform", tags=["platform-control"])
platform_runtime_service = PlatformRuntimeService()
platform_capability_service = PlatformCapabilityService()


@router.get("/ping-db")
def ping_control_db(payload: dict = Depends(get_current_token_payload)) -> dict:
    return {
        "status": "ok",
        "control_database": platform_runtime_service.get_control_database_name(),
        "token_payload": payload,
    }


@router.get("/admin-only")
def admin_only_route(
    payload: dict = Depends(require_role("superadmin")),
) -> dict:
    return {
        "status": "ok",
        "message": "Only superadmin can access this route",
        "token_payload": payload,
    }


@router.get(
    "/capabilities",
    response_model=PlatformCapabilityCatalogResponse,
)
def get_platform_capabilities(
    _token: dict = Depends(require_role("superadmin")),
) -> PlatformCapabilityCatalogResponse:
    catalog = platform_capability_service.get_catalog()
    return PlatformCapabilityCatalogResponse(
        success=True,
        message="Catalogo de capacidades de backend recuperado correctamente",
        **catalog,
    )
