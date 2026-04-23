from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.apps.platform_control.schemas import (
    PlatformCapabilityCatalogResponse,
    PlatformRuntimeSecurityPostureResponse,
    PlatformTenantRuntimeSecretBatchSyncResponse,
)
from app.apps.platform_control.repositories.tenant_repository import TenantRepository
from app.apps.platform_control.services.auth_audit_service import AuthAuditService
from app.apps.platform_control.services.platform_capability_service import (
    PlatformCapabilityService,
)
from app.apps.platform_control.services.platform_runtime_service import (
    PlatformRuntimeService,
)
from app.apps.platform_control.services.tenant_service import TenantService
from app.common.auth.dependencies import get_current_token_payload
from app.common.auth.role_dependencies import require_role
from app.common.config.settings import settings
from app.common.db.session_manager import get_control_db
from app.common.security.runtime_security_service import RuntimeSecurityService

router = APIRouter(prefix="/platform", tags=["platform-control"])
platform_runtime_service = PlatformRuntimeService()
platform_capability_service = PlatformCapabilityService()
runtime_security_service = RuntimeSecurityService()
tenant_repository = TenantRepository()
tenant_service = TenantService()
auth_audit_service = AuthAuditService()


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
    db: Session = Depends(get_control_db),
    _token: dict = Depends(require_role("superadmin")),
) -> PlatformRuntimeSecurityPostureResponse:
    active_configured_tenant_slugs = [
        tenant.slug
        for tenant in tenant_repository.list_active(db)
        if tenant.db_name and tenant.db_user and tenant.db_host and tenant.db_port
    ]
    try:
        posture = runtime_security_service.describe_security_posture(
            settings,
            tenant_slugs=active_configured_tenant_slugs,
        )
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
            "tenant_secret_distribution_summary": runtime_security_service.tenant_secret_service.build_tenant_secret_distribution_summary(
                settings,
                active_configured_tenant_slugs,
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
        tenant_secret_distribution_summary=posture[
            "tenant_secret_distribution_summary"
        ],
    )


@router.post(
    "/security-posture/sync-runtime-secrets",
    response_model=PlatformTenantRuntimeSecretBatchSyncResponse,
)
def sync_platform_runtime_secrets(
    db: Session = Depends(get_control_db),
    token: dict = Depends(require_role("superadmin")),
) -> PlatformTenantRuntimeSecretBatchSyncResponse:
    result = tenant_service.sync_active_tenant_runtime_secrets(db=db)
    auth_audit_service.log_event(
        db=db,
        event_type="platform.tenant_runtime_secret_sync_batch",
        subject_scope="platform",
        outcome="success" if result["failed"] == 0 else "warning",
        subject_user_id=token.get("user_id"),
        email=token.get("email"),
        token_jti=token.get("jti"),
        detail=(
            f"processed={result['processed']} synced={result['synced']} "
            f"already_runtime_managed={result['already_runtime_managed']} "
            f"skipped_legacy_rescue_required={result['skipped_legacy_rescue_required']} "
            f"failed={result['failed']}"
        ),
    )
    return PlatformTenantRuntimeSecretBatchSyncResponse(
        success=True,
        message="Sincronización centralizada de secretos runtime completada",
        processed=result["processed"],
        synced=result["synced"],
        already_runtime_managed=result["already_runtime_managed"],
        skipped_not_configured=result["skipped_not_configured"],
        skipped_legacy_rescue_required=result["skipped_legacy_rescue_required"],
        failed=result["failed"],
        synced_at=result["synced_at"],
        data=result["data"],
    )
