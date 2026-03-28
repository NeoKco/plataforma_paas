from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.apps.tenant_modules.core.schemas import (
    TenantDbInfoPayload,
    TenantDbInfoResponse,
    TenantHealthResponse,
    TenantInfoData,
    TenantInfoResponse,
    TenantMeDbResponse,
    TenantMeResponse,
    TenantSchemaStatusResponse,
    TenantSchemaSyncResponse,
    TenantModuleUsageItemResponse,
    TenantModuleUsageResponse,
    TenantUserCreateRequest,
    TenantUserContextResponse,
    TenantUserData,
    TenantUserDetailResponse,
    TenantUserMutationResponse,
    TenantUserStatusUpdateRequest,
    TenantUserUpdateRequest,
    TenantUsersItemResponse,
    TenantUsersResponse,
)
from app.apps.tenant_modules.core.services.tenant_connection_service import (
    TenantConnectionService,
)
from app.apps.tenant_modules.core.services.module_usage_service import (
    TenantModuleUsageService,
)
from app.apps.tenant_modules.core.services.tenant_data_service import (
    TenantDataService,
    TenantUserLimitExceededError,
)
from app.apps.platform_control.services.tenant_service import TenantService
from app.common.auth.dependencies import (
    get_current_tenant_context,
    require_tenant_admin,
    require_tenant_permission,
)
from app.common.config.settings import settings
from app.common.db.session_manager import get_control_db, get_tenant_db

router = APIRouter(prefix="/tenant", tags=["Tenant Protected"])
tenant_data_service = TenantDataService()
tenant_module_usage_service = TenantModuleUsageService()
tenant_service = TenantService()
tenant_connection_service = TenantConnectionService()


def _build_tenant_user_context(context: dict) -> TenantUserContextResponse:
    return TenantUserContextResponse(
        user_id=context["user_id"],
        email=context["email"],
        role=context["role"],
        tenant_slug=context["tenant_slug"],
        token_scope=context["token_scope"],
        maintenance_mode=context.get("maintenance_mode", False),
    )


def _build_tenant_user_item(user) -> TenantUsersItemResponse:
    return TenantUsersItemResponse(
        id=user.id,
        full_name=user.full_name,
        email=user.email,
        role=user.role,
        is_active=user.is_active,
    )


def _get_current_platform_tenant(control_db: Session, tenant_slug: str):
    tenant = tenant_connection_service.get_tenant_by_slug(control_db, tenant_slug)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return tenant


@router.get("/health", response_model=TenantHealthResponse)
def tenant_health() -> TenantHealthResponse:
    return TenantHealthResponse(status="ok", scope="tenant")


@router.get("/me", response_model=TenantMeResponse)
def tenant_me(current_user=Depends(get_current_tenant_context)) -> TenantMeResponse:
    return TenantMeResponse(
        success=True,
        message="Usuario tenant autenticado",
        data=_build_tenant_user_context(current_user),
    )


@router.get("/info", response_model=TenantInfoResponse)
def tenant_info(
    request: Request,
    current_user=Depends(get_current_tenant_context),
    tenant_db: Session = Depends(get_tenant_db),
) -> TenantInfoResponse:
    tenant_record = tenant_data_service.get_tenant_info(tenant_db)

    return TenantInfoResponse(
        success=True,
        tenant=TenantInfoData(
            tenant_slug=request.state.tenant_slug,
            tenant_name=tenant_record.tenant_name if tenant_record else None,
            tenant_type=tenant_record.tenant_type if tenant_record else None,
            plan_code=getattr(request.state, "tenant_plan_code", None),
            plan_enabled_modules=(
                list(getattr(request.state, "tenant_plan_enabled_modules", ()))
                if getattr(request.state, "tenant_plan_enabled_modules", None)
                is not None
                else None
            ),
            billing_status=getattr(request.state, "tenant_billing_status", None),
            billing_status_reason=getattr(
                request.state,
                "tenant_billing_status_reason",
                None,
            ),
            billing_current_period_ends_at=getattr(
                request.state,
                "tenant_billing_current_period_ends_at",
                None,
            ),
            billing_grace_until=getattr(
                request.state,
                "tenant_billing_grace_until",
                None,
            ),
            billing_in_grace=getattr(request.state, "tenant_billing_in_grace", False),
            billing_grace_enabled_modules=(
                list(getattr(request.state, "tenant_billing_grace_enabled_modules", ()))
                if getattr(request.state, "tenant_billing_grace_enabled_modules", None)
                is not None
                else None
            ),
            billing_grace_module_limits=getattr(
                request.state,
                "tenant_billing_grace_module_limits",
                None,
            ),
            billing_grace_api_read_requests_per_minute=getattr(
                request.state,
                "tenant_billing_grace_api_read_requests_per_minute",
                None,
            ),
            billing_grace_api_write_requests_per_minute=getattr(
                request.state,
                "tenant_billing_grace_api_write_requests_per_minute",
                None,
            ),
            tenant_status=getattr(request.state, "tenant_status", None),
            tenant_status_reason=getattr(
                request.state,
                "tenant_status_reason",
                None,
            ),
            access_allowed=getattr(request.state, "tenant_access_allowed", True),
            access_blocking_source=getattr(
                request.state,
                "tenant_access_blocking_source",
                None,
            ),
            access_detail=getattr(request.state, "tenant_access_detail", None),
            maintenance_mode=getattr(
                request.state,
                "tenant_maintenance_mode",
                False,
            ),
            maintenance_starts_at=getattr(
                request.state,
                "tenant_maintenance_starts_at",
                None,
            ),
            maintenance_ends_at=getattr(
                request.state,
                "tenant_maintenance_ends_at",
                None,
            ),
            maintenance_reason=getattr(
                request.state,
                "tenant_maintenance_reason",
                None,
            ),
            maintenance_scopes=getattr(
                request.state,
                "tenant_maintenance_scopes",
                None,
            ),
            maintenance_access_mode=getattr(
                request.state,
                "tenant_maintenance_access_mode",
                "write_block",
            ),
            plan_api_read_requests_per_minute=getattr(
                request.state,
                "tenant_plan_api_read_requests_per_minute",
                None,
            ),
            plan_api_write_requests_per_minute=getattr(
                request.state,
                "tenant_plan_api_write_requests_per_minute",
                None,
            ),
            plan_module_limits=getattr(
                request.state,
                "tenant_plan_module_limits",
                None,
            ),
            module_limits=getattr(
                request.state,
                "tenant_module_limits",
                None,
            ),
            api_read_requests_per_minute=getattr(
                request.state,
                "tenant_api_read_requests_per_minute",
                None,
            ),
            api_write_requests_per_minute=getattr(
                request.state,
                "tenant_api_write_requests_per_minute",
                None,
            ),
            effective_enabled_modules=(
                list(getattr(request.state, "tenant_effective_enabled_modules", ()))
                if getattr(request.state, "tenant_effective_enabled_modules", None)
                is not None
                else None
            ),
            effective_module_limits=getattr(
                request.state,
                "tenant_effective_module_limits",
                None,
            ),
            effective_module_limit_sources=getattr(
                request.state,
                "tenant_effective_module_limit_sources",
                None,
            ),
            effective_api_read_requests_per_minute=(
                getattr(
                    request.state,
                    "tenant_billing_grace_api_read_requests_per_minute",
                    None,
                )
                if getattr(
                    request.state,
                    "tenant_billing_grace_api_read_requests_per_minute",
                    None,
                )
                is not None
                else (
                    getattr(
                        request.state,
                        "tenant_api_read_requests_per_minute",
                        None,
                    )
                    if getattr(
                        request.state,
                        "tenant_api_read_requests_per_minute",
                        None,
                    )
                    is not None
                    else (
                        getattr(
                            request.state,
                            "tenant_plan_api_read_requests_per_minute",
                            None,
                        )
                        if getattr(
                            request.state,
                            "tenant_plan_api_read_requests_per_minute",
                            None,
                        )
                        is not None
                        else settings.TENANT_API_READ_REQUESTS_PER_MINUTE
                    )
                )
            ),
            effective_api_write_requests_per_minute=(
                getattr(
                    request.state,
                    "tenant_billing_grace_api_write_requests_per_minute",
                    None,
                )
                if getattr(
                    request.state,
                    "tenant_billing_grace_api_write_requests_per_minute",
                    None,
                )
                is not None
                else (
                    getattr(
                        request.state,
                        "tenant_api_write_requests_per_minute",
                        None,
                    )
                    if getattr(
                        request.state,
                        "tenant_api_write_requests_per_minute",
                        None,
                    )
                    is not None
                    else (
                        getattr(
                            request.state,
                            "tenant_plan_api_write_requests_per_minute",
                            None,
                        )
                        if getattr(
                            request.state,
                            "tenant_plan_api_write_requests_per_minute",
                            None,
                        )
                        is not None
                        else settings.TENANT_API_WRITE_REQUESTS_PER_MINUTE
                    )
                )
            ),
        ),
        user=TenantUserData(
            id=request.state.tenant_user_id,
            email=request.state.tenant_email,
            role=request.state.tenant_role,
        ),
        token_scope=request.state.token_scope,
    )


@router.get("/schema-status", response_model=TenantSchemaStatusResponse)
def tenant_schema_status(
    current_user=Depends(require_tenant_admin),
    control_db: Session = Depends(get_control_db),
) -> TenantSchemaStatusResponse:
    tenant = _get_current_platform_tenant(control_db, current_user["tenant_slug"])

    try:
        schema_status = tenant_service.get_tenant_schema_status(
            db=control_db,
            tenant_id=tenant.id,
        )
    except ValueError as exc:
        detail = str(exc)
        status_code = 404 if detail == "Tenant not found" else 400
        raise HTTPException(status_code=status_code, detail=detail) from exc

    return TenantSchemaStatusResponse(
        success=True,
        message="Estado de esquema tenant recuperado correctamente",
        requested_by=_build_tenant_user_context(current_user),
        tenant_slug=tenant.slug,
        current_version=schema_status.get("current_version"),
        latest_available_version=schema_status.get("latest_available_version"),
        pending_count=schema_status.get("pending_count", 0),
        pending_versions=schema_status.get("pending_versions", []),
        last_applied_at=schema_status.get("last_applied_at"),
    )


@router.post("/sync-schema", response_model=TenantSchemaSyncResponse)
def tenant_sync_schema(
    current_user=Depends(require_tenant_admin),
    control_db: Session = Depends(get_control_db),
) -> TenantSchemaSyncResponse:
    tenant = _get_current_platform_tenant(control_db, current_user["tenant_slug"])

    try:
        synced_tenant = tenant_service.sync_tenant_schema(
            db=control_db,
            tenant_id=tenant.id,
        )
        schema_status = tenant_service.get_tenant_schema_status(
            db=control_db,
            tenant_id=tenant.id,
        )
    except ValueError as exc:
        detail = str(exc)
        status_code = 404 if detail == "Tenant not found" else 400
        raise HTTPException(status_code=status_code, detail=detail) from exc

    return TenantSchemaSyncResponse(
        success=True,
        message="Estructura tenant sincronizada correctamente",
        requested_by=_build_tenant_user_context(current_user),
        tenant_slug=synced_tenant.slug,
        current_version=schema_status.get("current_version"),
        latest_available_version=schema_status.get("latest_available_version"),
        pending_count=schema_status.get("pending_count", 0),
        last_applied_at=schema_status.get("last_applied_at"),
        applied_now=schema_status.get("applied_now", []),
    )


@router.get("/db-info", response_model=TenantDbInfoResponse)
def tenant_db_info(
    current_user=Depends(get_current_tenant_context),
    tenant_db: Session = Depends(get_tenant_db),
) -> TenantDbInfoResponse:
    tenant_record = tenant_data_service.get_tenant_info(tenant_db)

    return TenantDbInfoResponse(
        success=True,
        message="Conexion tenant resuelta correctamente",
        auth_context=_build_tenant_user_context(current_user),
        tenant_info=TenantDbInfoPayload(
            tenant_name=tenant_record.tenant_name if tenant_record else None,
            tenant_slug=tenant_record.tenant_slug if tenant_record else None,
            tenant_type=tenant_record.tenant_type if tenant_record else None,
        ),
    )


@router.get("/module-usage", response_model=TenantModuleUsageResponse)
def tenant_module_usage(
    request: Request,
    current_user=Depends(get_current_tenant_context),
    tenant_db: Session = Depends(get_tenant_db),
) -> TenantModuleUsageResponse:
    usage_rows = tenant_module_usage_service.list_usage(
        tenant_db,
        effective_module_limits=getattr(
            request.state,
            "tenant_effective_module_limits",
            None,
        ),
        effective_module_limit_sources=getattr(
            request.state,
            "tenant_effective_module_limit_sources",
            None,
        ),
    )

    return TenantModuleUsageResponse(
        success=True,
        message="Uso de modulos recuperado correctamente",
        requested_by=_build_tenant_user_context(current_user),
        total_modules=len(usage_rows),
        data=[TenantModuleUsageItemResponse(**item) for item in usage_rows],
    )


@router.get("/users/me-db", response_model=TenantMeDbResponse)
def tenant_me_db(
    current_user=Depends(get_current_tenant_context),
    tenant_db: Session = Depends(get_tenant_db),
) -> TenantMeDbResponse:
    user = tenant_data_service.get_user_by_id(tenant_db, current_user["user_id"])

    if not user:
        return TenantMeDbResponse(
            success=False,
            message="Usuario no encontrado en la base del tenant",
            auth_context=_build_tenant_user_context(current_user),
            db_user=None,
        )

    return TenantMeDbResponse(
        success=True,
        message="Usuario recuperado desde la base del tenant",
        auth_context=_build_tenant_user_context(current_user),
        db_user={
            "id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "role": user.role,
            "is_active": user.is_active,
        },
    )


@router.get("/users", response_model=TenantUsersResponse)
def tenant_users(
    current_user=Depends(require_tenant_permission("tenant.users.read")),
    tenant_db: Session = Depends(get_tenant_db),
) -> TenantUsersResponse:
    users = tenant_data_service.list_users(tenant_db)

    return TenantUsersResponse(
        success=True,
        message="Usuarios del tenant recuperados correctamente",
        requested_by=_build_tenant_user_context(current_user),
        total=len(users),
        data=[_build_tenant_user_item(user) for user in users],
    )


@router.get("/users/{user_id}", response_model=TenantUserDetailResponse)
def tenant_user_detail(
    user_id: int,
    current_user=Depends(require_tenant_permission("tenant.users.read")),
    tenant_db: Session = Depends(get_tenant_db),
) -> TenantUserDetailResponse:
    user = tenant_data_service.get_user_by_id(tenant_db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario tenant no encontrado")

    return TenantUserDetailResponse(
        success=True,
        message="Usuario tenant recuperado correctamente",
        requested_by=_build_tenant_user_context(current_user),
        data=_build_tenant_user_item(user),
    )


@router.post("/users", response_model=TenantUserMutationResponse)
def tenant_create_user(
    request: Request,
    payload: TenantUserCreateRequest,
    current_user=Depends(require_tenant_permission("tenant.users.create")),
    tenant_db: Session = Depends(get_tenant_db),
) -> TenantUserMutationResponse:
    try:
        user = tenant_data_service.create_user(
            tenant_db=tenant_db,
            full_name=payload.full_name,
            email=payload.email,
            password=payload.password,
            role=payload.role,
            is_active=payload.is_active,
            max_users=(
                getattr(
                    request.state,
                    "tenant_effective_module_limits",
                    {},
                )
                or {}
            ).get(TenantDataService.MODULE_LIMIT_KEY),
            max_active_users=(
                getattr(
                    request.state,
                    "tenant_effective_module_limits",
                    {},
                )
                or {}
            ).get(TenantDataService.ACTIVE_MODULE_LIMIT_KEY),
            max_monthly_users=(
                getattr(
                    request.state,
                    "tenant_effective_module_limits",
                    {},
                )
                or {}
            ).get(TenantDataService.MONTHLY_MODULE_LIMIT_KEY),
            role_module_limits=(
                getattr(
                    request.state,
                    "tenant_effective_module_limits",
                    {},
                )
                or {}
            ),
        )
    except TenantUserLimitExceededError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return TenantUserMutationResponse(
        success=True,
        message="Usuario tenant creado correctamente",
        requested_by=_build_tenant_user_context(current_user),
        data=_build_tenant_user_item(user),
    )


@router.put("/users/{user_id}", response_model=TenantUserMutationResponse)
def tenant_update_user(
    request: Request,
    user_id: int,
    payload: TenantUserUpdateRequest,
    current_user=Depends(require_tenant_permission("tenant.users.update")),
    tenant_db: Session = Depends(get_tenant_db),
) -> TenantUserMutationResponse:
    try:
        user = tenant_data_service.update_user(
            tenant_db=tenant_db,
            user_id=user_id,
            full_name=payload.full_name,
            email=payload.email,
            role=payload.role,
            password=payload.password,
            role_module_limits=(
                getattr(
                    request.state,
                    "tenant_effective_module_limits",
                    {},
                )
                or {}
            ),
        )
    except TenantUserLimitExceededError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except ValueError as exc:
        status_code = 404 if "no encontrado" in str(exc).lower() else 400
        raise HTTPException(status_code=status_code, detail=str(exc)) from exc

    return TenantUserMutationResponse(
        success=True,
        message="Usuario tenant actualizado correctamente",
        requested_by=_build_tenant_user_context(current_user),
        data=_build_tenant_user_item(user),
    )


@router.patch("/users/{user_id}/status", response_model=TenantUserMutationResponse)
def tenant_update_user_status(
    request: Request,
    user_id: int,
    payload: TenantUserStatusUpdateRequest,
    current_user=Depends(require_tenant_permission("tenant.users.change_status")),
    tenant_db: Session = Depends(get_tenant_db),
) -> TenantUserMutationResponse:
    try:
        user = tenant_data_service.update_user_status(
            tenant_db=tenant_db,
            user_id=user_id,
            is_active=payload.is_active,
            actor_user_id=current_user["user_id"],
            max_active_users=(
                getattr(
                    request.state,
                    "tenant_effective_module_limits",
                    {},
                )
                or {}
            ).get(TenantDataService.ACTIVE_MODULE_LIMIT_KEY),
            role_module_limits=(
                getattr(
                    request.state,
                    "tenant_effective_module_limits",
                    {},
                )
                or {}
            ),
        )
    except TenantUserLimitExceededError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except ValueError as exc:
        status_code = 404 if "no encontrado" in str(exc).lower() else 400
        raise HTTPException(status_code=status_code, detail=str(exc)) from exc

    return TenantUserMutationResponse(
        success=True,
        message="Estado del usuario tenant actualizado correctamente",
        requested_by=_build_tenant_user_context(current_user),
        data=_build_tenant_user_item(user),
    )


@router.get("/admin-only", response_model=TenantMeResponse)
def tenant_admin_only(current_user=Depends(require_tenant_admin)) -> TenantMeResponse:
    return TenantMeResponse(
        success=True,
        message=f"Acceso admin permitido para tenant {current_user['tenant_slug']}",
        data=_build_tenant_user_context(current_user),
    )
