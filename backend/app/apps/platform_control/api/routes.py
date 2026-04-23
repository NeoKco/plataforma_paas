from fastapi import APIRouter, Depends

from app.apps.platform_control.schemas import (
    PlatformCapabilityCatalogResponse,
    PlatformRuntimeSecurityPostureResponse,
)
from app.apps.platform_control.services.platform_capability_service import (
    PlatformCapabilityService,
)
from app.apps.platform_control.services.platform_runtime_service import (
    PlatformRuntimeService,
)
from app.common.auth.dependencies import get_current_token_payload
from app.common.auth.role_dependencies import require_role
from app.common.config.settings import settings
from app.common.security.runtime_security_service import RuntimeSecurityService

router = APIRouter(prefix="/platform", tags=["platform-control"])
platform_runtime_service = PlatformRuntimeService()
platform_capability_service = PlatformCapabilityService()
runtime_security_service = RuntimeSecurityService()


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


@router.get(
    "/security-posture",
    response_model=PlatformRuntimeSecurityPostureResponse,
)
def get_platform_security_posture(
    _token: dict = Depends(require_role("superadmin")),
) -> PlatformRuntimeSecurityPostureResponse:
    try:
        posture = runtime_security_service.describe_security_posture(settings)
    except RuntimeError as exc:
        posture = runtime_security_service.tenant_secret_service.build_secret_posture(
            settings
        )
        posture = {
            "findings": [str(exc)],
            "production_ready": False,
            "tenant_secrets_runtime": posture["runtime"],
            "tenant_secrets_legacy": posture["legacy"],
            "tenant_secrets_isolated_from_legacy": (
                posture["runtime"]["path"] != posture["legacy"]["path"]
                and posture["runtime"]["classification"] != "legacy_env_file"
            ),
        }

    return PlatformRuntimeSecurityPostureResponse(
        success=True,
        message="Postura de seguridad de runtime recuperada correctamente",
        app_env=settings.APP_ENV,
        production_ready=posture["production_ready"],
        findings_count=len(posture["findings"]),
        findings=posture["findings"],
        tenant_secrets_runtime=posture["tenant_secrets_runtime"],
        tenant_secrets_legacy=posture["tenant_secrets_legacy"],
        tenant_secrets_isolated_from_legacy=posture[
            "tenant_secrets_isolated_from_legacy"
        ],
    )
