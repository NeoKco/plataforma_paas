from contextlib import contextmanager
from datetime import date
import json

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy import desc, func, or_, text
from sqlalchemy.exc import OperationalError, ProgrammingError
from sqlalchemy.orm import Session

from app.apps.platform_control.schemas import (
    PlatformBillingAlertsResponse,
    PlatformBillingAlertHistoryResponse,
    PlatformBillingAlertHistoryEntryResponse,
    PlatformBillingSyncSummaryResponse,
    TenantAccessPolicyResponse,
    TenantBillingReconcileBatchResponse,
    TenantBillingResponse,
    TenantBillingReconcileResponse,
    TenantBillingIdentityUpdateRequest,
    TenantBillingSyncApplyResponse,
    TenantBillingSyncEventRequest,
    TenantBillingSyncEventResponse,
    TenantBillingSyncHistoryResponse,
    TenantBillingSyncSummaryResponse,
    TenantIdentityResponse,
    TenantIdentityUpdateRequest,
    TenantBillingUpdateRequest,
    TenantPolicyChangeHistoryResponse,
    PlatformTenantPolicyChangeHistoryResponse,
    TenantMaintenanceResponse,
    TenantMaintenanceUpdateRequest,
    TenantFinanceUsageDataResponse,
    TenantFinanceUsageResponse,
    TenantModuleUsageItemResponse,
    TenantModuleUsageSummaryResponse,
    TenantModuleLimitsResponse,
    TenantModuleLimitsUpdateRequest,
    TenantCreateRequest,
    TenantRestoreRequest,
    TenantListResponse,
    TenantPlanResponse,
    TenantPlanUpdateRequest,
    ProvisioningJobResponse,
    TenantRateLimitResponse,
    TenantRateLimitUpdateRequest,
    TenantDeleteRequest,
    TenantDeleteResponse,
    TenantDataExportJobCreateRequest,
    TenantDataExportJobListResponse,
    TenantDataExportJobResponse,
    TenantDataImportJobListResponse,
    TenantDataImportJobResponse,
    TenantDataTransferArtifactResponse,
    TenantStatusResponse,
    TenantStatusUpdateRequest,
    TenantResponse,
    TenantSchemaSyncResponse,
    TenantSchemaStatusResponse,
    TenantSchemaAutoSyncResponse,
    TenantSchemaAutoSyncJobResponse,
    TenantDbCredentialsRotateResponse,
    TenantPortalUserPasswordResetRequest,
    TenantPortalUserPasswordResetResponse,
    TenantPortalUsersItemResponse,
    TenantPortalUsersResponse,
    TenantRetirementArchiveItemResponse,
    TenantRetirementArchiveListResponse,
    TenantRetirementArchiveDetailResponse,
)
from app.apps.platform_control.models.tenant_retirement_archive import (
    TenantRetirementArchive,
)
from app.apps.platform_control.services.billing_alert_service import (
    BillingAlertService,
)
from app.apps.platform_control.services.auth_audit_service import AuthAuditService
from app.apps.tenant_modules.core.services.tenant_connection_service import (
    TenantConnectionService,
)
from app.apps.tenant_modules.core.services.module_usage_service import (
    TenantModuleUsageService,
)
from app.apps.tenant_modules.core.services.tenant_data_service import TenantDataService
from app.apps.tenant_modules.finance.services.finance_service import FinanceService
from app.apps.platform_control.services.tenant_billing_sync_service import (
    TenantBillingSyncService,
)
from app.apps.platform_control.services.tenant_policy_event_service import (
    TenantPolicyEventService,
)
from app.apps.platform_control.services.tenant_service import TenantService
from app.apps.platform_control.services.tenant_data_portability_service import (
    TenantDataPortabilityService,
)
from app.common.auth.role_dependencies import require_role
from app.common.db.session_manager import get_control_db

router = APIRouter(prefix="/platform/tenants", tags=["platform-tenants"])
tenant_service = TenantService()
tenant_policy_event_service = TenantPolicyEventService()
auth_audit_service = AuthAuditService()
tenant_billing_sync_service = TenantBillingSyncService(
    tenant_service=tenant_service,
    tenant_policy_event_service=tenant_policy_event_service,
)
billing_alert_service = BillingAlertService(
    tenant_billing_sync_service=tenant_billing_sync_service
)
tenant_connection_service = TenantConnectionService()
finance_service = FinanceService()
tenant_module_usage_service = TenantModuleUsageService(finance_service=finance_service)
tenant_data_service = TenantDataService()
tenant_data_portability_service = TenantDataPortabilityService()


def _raise_tenant_schema_http_error(exc: Exception) -> None:
    detail = str(exc).lower()

    if "finance_entries" in detail or "tenant_info" in detail or "users" in detail:
        raise HTTPException(
            status_code=400,
            detail=(
                "Tenant schema is incomplete. Run tenant schema sync or tenant migrations "
                "before requesting module usage."
            ),
        ) from exc

    if "no such table" in detail or "undefinedtable" in detail:
        raise HTTPException(
            status_code=400,
            detail=(
                "Tenant schema is incomplete. Run tenant schema sync or tenant migrations "
                "before requesting module usage."
            ),
        ) from exc

    if (
        "password authentication failed" in detail
        or "autentificación password falló" in detail
        or "authentication failed" in detail
        or "connection refused" in detail
        or "could not connect to server" in detail
    ):
        raise HTTPException(
            status_code=503,
            detail=(
                "Tenant database access failed. Rotate or reprovision tenant DB "
                "credentials before requesting module usage."
            ),
        ) from exc

    raise exc


def _raise_tenant_db_credentials_rotation_http_error(exc: ValueError) -> None:
    detail = str(exc)

    if detail == "Tenant database role not found":
        raise HTTPException(
            status_code=409,
            detail=(
                "Tenant database role not found. Reprovision tenant database before "
                "rotating technical credentials."
            ),
        ) from exc

    if detail == "Tenant database not found":
        raise HTTPException(
            status_code=409,
            detail=(
                "Tenant database not found. Reprovision tenant database before "
                "rotating technical credentials."
            ),
        ) from exc

    if detail == "Rotated credentials failed validation and the previous password was restored":
        raise HTTPException(
            status_code=409,
            detail=(
                "The rotated tenant credentials could not be validated and the previous "
                "password was restored. Verify PostgreSQL admin access and tenant "
                "database reachability before retrying."
            ),
        ) from exc

    status_code = 404 if detail == "Tenant not found" else 400
    raise HTTPException(status_code=status_code, detail=detail) from exc


def _build_tenant_response(tenant) -> TenantResponse:
    activation_state = tenant_service.get_tenant_module_activation_state(tenant)
    effective_enabled_modules = tenant_service.get_effective_enabled_modules(tenant)
    return TenantResponse(
        id=tenant.id,
        name=tenant.name,
        slug=tenant.slug,
        tenant_type=tenant.tenant_type,
        db_configured=bool(
            getattr(tenant, "db_name", None)
            and getattr(tenant, "db_user", None)
            and getattr(tenant, "db_host", None)
            and getattr(tenant, "db_port", None)
        ),
        tenant_schema_version=getattr(tenant, "tenant_schema_version", None),
        tenant_schema_synced_at=getattr(tenant, "tenant_schema_synced_at", None),
        tenant_db_credentials_rotated_at=getattr(
            tenant, "tenant_db_credentials_rotated_at", None
        ),
        plan_code=tenant.plan_code,
        billing_provider=tenant.billing_provider,
        billing_provider_customer_id=tenant.billing_provider_customer_id,
        billing_provider_subscription_id=tenant.billing_provider_subscription_id,
        plan_enabled_modules=tenant_service.tenant_plan_policy_service.get_enabled_modules(
            tenant.plan_code
        ),
        subscription_base_plan_code=activation_state.subscription_base_plan_code,
        subscription_status=activation_state.subscription_status,
        subscription_billing_cycle=activation_state.subscription_billing_cycle,
        subscription_included_modules=(
            list(activation_state.subscription_included_modules)
            if activation_state.subscription_included_modules is not None
            else None
        ),
        subscription_addon_modules=(
            list(activation_state.subscription_addon_modules)
            if activation_state.subscription_addon_modules is not None
            else None
        ),
        subscription_technical_modules=(
            list(activation_state.subscription_technical_modules)
            if activation_state.subscription_technical_modules is not None
            else None
        ),
        subscription_legacy_fallback_modules=(
            list(activation_state.subscription_legacy_fallback_modules)
            if activation_state.subscription_legacy_fallback_modules is not None
            else None
        ),
        effective_enabled_modules=(
            list(effective_enabled_modules)
            if effective_enabled_modules is not None
            else None
        ),
        effective_activation_source=activation_state.activation_source,
        plan_module_limits=tenant_service.tenant_plan_policy_service.get_module_limits(
            tenant.plan_code
        ),
        module_limits=tenant_service.get_tenant_module_limits(tenant),
        billing_status=tenant.billing_status,
        billing_status_reason=tenant.billing_status_reason,
        billing_current_period_ends_at=tenant.billing_current_period_ends_at,
        billing_grace_until=tenant.billing_grace_until,
        status=tenant.status,
        status_reason=tenant.status_reason,
        maintenance_mode=tenant.maintenance_mode,
        maintenance_starts_at=tenant.maintenance_starts_at,
        maintenance_ends_at=tenant.maintenance_ends_at,
        maintenance_reason=tenant.maintenance_reason,
        maintenance_scopes=(
            tenant_service.get_tenant_maintenance_scopes(tenant)
            if tenant.maintenance_scopes is not None
            else None
        ),
        maintenance_access_mode=tenant.maintenance_access_mode,
        api_read_requests_per_minute=tenant.api_read_requests_per_minute,
        api_write_requests_per_minute=tenant.api_write_requests_per_minute,
    )


def _build_tenant_portal_user_reset_response(tenant, user):
    return TenantPortalUserPasswordResetResponse(
        success=True,
        message="La contraseña del usuario tenant fue actualizada correctamente.",
        tenant_id=tenant.id,
        tenant_slug=tenant.slug,
        tenant_status=tenant.status,
        user_id=user.id,
        full_name=user.full_name,
        email=user.email,
        role=user.role,
        is_active=user.is_active,
    )


def _build_tenant_portal_user_item(user) -> TenantPortalUsersItemResponse:
    return TenantPortalUsersItemResponse(
        id=user.id,
        full_name=user.full_name,
        email=user.email,
        role=user.role,
        is_active=user.is_active,
    )


def _build_tenant_retirement_archive_item(
    archive,
) -> TenantRetirementArchiveItemResponse:
    return TenantRetirementArchiveItemResponse(
        id=archive.id,
        original_tenant_id=archive.original_tenant_id,
        tenant_slug=archive.tenant_slug,
        tenant_name=archive.tenant_name,
        tenant_type=archive.tenant_type,
        plan_code=archive.plan_code,
        tenant_status=archive.tenant_status,
        billing_provider=archive.billing_provider,
        billing_status=archive.billing_status,
        billing_events_count=archive.billing_events_count,
        policy_events_count=archive.policy_events_count,
        provisioning_jobs_count=archive.provisioning_jobs_count,
        deleted_by_email=archive.deleted_by_email,
        tenant_created_at=archive.tenant_created_at,
        deleted_at=archive.deleted_at,
    )


def _build_tenant_data_export_job_response(job) -> TenantDataExportJobResponse:
    return TenantDataExportJobResponse(
        id=job.id,
        tenant_id=job.tenant_id,
        direction=job.direction,
        data_format=job.data_format,
        export_scope=job.export_scope,
        status=job.status,
        requested_by_email=job.requested_by_email,
        error_message=job.error_message,
        summary_json=job.summary_json,
        created_at=job.created_at,
        completed_at=job.completed_at,
        artifacts=[
            TenantDataTransferArtifactResponse(
                id=artifact.id,
                artifact_type=artifact.artifact_type,
                file_name=artifact.file_name,
                content_type=artifact.content_type,
                sha256_hex=artifact.sha256_hex,
                size_bytes=artifact.size_bytes,
                created_at=artifact.created_at,
            )
            for artifact in getattr(job, "artifacts", [])
        ],
    )


def _build_tenant_data_import_job_response(job) -> TenantDataImportJobResponse:
    return TenantDataImportJobResponse(
        id=job.id,
        tenant_id=job.tenant_id,
        direction=job.direction,
        data_format=job.data_format,
        export_scope=job.export_scope,
        status=job.status,
        requested_by_email=job.requested_by_email,
        error_message=job.error_message,
        summary_json=job.summary_json,
        created_at=job.created_at,
        completed_at=job.completed_at,
        artifacts=[
            TenantDataTransferArtifactResponse(
                id=artifact.id,
                artifact_type=artifact.artifact_type,
                file_name=artifact.file_name,
                content_type=artifact.content_type,
                sha256_hex=artifact.sha256_hex,
                size_bytes=artifact.size_bytes,
                created_at=artifact.created_at,
            )
            for artifact in getattr(job, "artifacts", [])
        ],
    )


def _capture_tenant_snapshot(db: Session, tenant_id: int) -> dict | None:
    tenant = tenant_service.tenant_repository.get_by_id(db, tenant_id)
    if not tenant:
        return None
    return tenant_policy_event_service.build_snapshot(tenant)


def _record_tenant_policy_event(
    db: Session,
    *,
    tenant,
    event_type: str,
    previous_state: dict | None,
    actor_context: dict,
) -> None:
    if previous_state is None:
        return
    tenant_policy_event_service.record_change(
        db,
        tenant=tenant,
        event_type=event_type,
        previous_state=previous_state,
        new_state=tenant_policy_event_service.build_snapshot(tenant),
        actor_context=actor_context,
    )


@contextmanager
def _open_platform_tenant_db(tenant):
    tenant_db = None
    try:
        tenant_session_factory = tenant_connection_service.get_tenant_session(tenant)
        tenant_db = tenant_session_factory()
        if hasattr(tenant_db, "execute"):
            tenant_db.execute(text("SELECT 1"))
        yield tenant_db
    finally:
        if tenant_db is not None:
            tenant_db.close()


@router.get(
    "/billing/events/summary",
    response_model=PlatformBillingSyncSummaryResponse,
)
def get_platform_billing_events_summary(
    provider: str | None = None,
    event_type: str | None = None,
    processing_result: str | None = None,
    db: Session = Depends(get_control_db),
    _token: dict = Depends(require_role("superadmin")),
) -> PlatformBillingSyncSummaryResponse:
    rows = tenant_billing_sync_service.summarize_all_recent_events(
        db,
        provider=provider,
        event_type=event_type,
        processing_result=processing_result,
    )

    return PlatformBillingSyncSummaryResponse(
        success=True,
        message="Resumen global de eventos de billing recuperado correctamente",
        provider=provider,
        event_type=event_type,
        processing_result=processing_result,
        total_rows=len(rows),
        data=rows,
    )


@router.get(
    "/billing/events/alerts",
    response_model=PlatformBillingAlertsResponse,
)
def get_platform_billing_event_alerts(
    provider: str | None = None,
    event_type: str | None = None,
    persist_history: bool = False,
    db: Session = Depends(get_control_db),
    _token: dict = Depends(require_role("superadmin")),
) -> PlatformBillingAlertsResponse:
    alerts = billing_alert_service.list_active_alerts(
        db,
        provider=provider,
        event_type=event_type,
    )
    if persist_history and alerts:
        billing_alert_service.save_alert_history(
            db,
            alerts=alerts,
        )

    return PlatformBillingAlertsResponse(
        success=True,
        message="Alertas operativas de billing recuperadas correctamente",
        provider=provider,
        event_type=event_type,
        total_alerts=len(alerts),
        data=alerts,
    )


@router.get(
    "/billing/events/alerts/history",
    response_model=PlatformBillingAlertHistoryResponse,
)
def get_platform_billing_event_alert_history(
    limit: int = 100,
    provider: str | None = None,
    event_type: str | None = None,
    processing_result: str | None = None,
    alert_code: str | None = None,
    severity: str | None = None,
    db: Session = Depends(get_control_db),
    _token: dict = Depends(require_role("superadmin")),
) -> PlatformBillingAlertHistoryResponse:
    alerts = billing_alert_service.list_recent_alert_history(
        db,
        limit=limit,
        provider=provider,
        event_type=event_type,
        processing_result=processing_result,
        alert_code=alert_code,
        severity=severity,
    )
    return PlatformBillingAlertHistoryResponse(
        success=True,
        message="Historial de alertas operativas de billing recuperado correctamente",
        total_alerts=len(alerts),
        data=[
            PlatformBillingAlertHistoryEntryResponse(**item)
            for item in alerts
        ],
    )


@router.post(
    "/{tenant_id}/data-export-jobs",
    response_model=TenantDataExportJobResponse,
)
def create_tenant_data_export_job(
    tenant_id: int,
    payload: TenantDataExportJobCreateRequest,
    db: Session = Depends(get_control_db),
    _token: dict = Depends(require_role("superadmin")),
) -> TenantDataExportJobResponse:
    try:
        job = tenant_data_portability_service.create_export_job(
            db,
            tenant_id=tenant_id,
            requested_by_email=_token.get("email"),
            export_scope=payload.export_scope,
        )
        tenant = tenant_service.tenant_repository.get_by_id(db, tenant_id)
        auth_audit_service.log_event(
            db,
            event_type="platform.tenant.data_export.create",
            subject_scope="platform",
            outcome="success",
            subject_user_id=int(_token["sub"]) if _token.get("sub") is not None else None,
            email=_token.get("email"),
            tenant_slug=None if tenant is None else tenant.slug,
            detail=f"Genero export portable CSV para tenant_id={tenant_id}",
        )
        return _build_tenant_data_export_job_response(job)
    except ValueError as exc:
        detail = str(exc)
        status_code = 404 if detail == "Tenant not found" else 409
        raise HTTPException(status_code=status_code, detail=detail) from exc


@router.get(
    "/{tenant_id}/data-export-jobs",
    response_model=TenantDataExportJobListResponse,
)
def list_tenant_data_export_jobs(
    tenant_id: int,
    limit: int = 10,
    db: Session = Depends(get_control_db),
    _token: dict = Depends(require_role("superadmin")),
) -> TenantDataExportJobListResponse:
    try:
        jobs = tenant_data_portability_service.list_export_jobs(
            db,
            tenant_id=tenant_id,
            limit=max(1, min(limit, 25)),
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    return TenantDataExportJobListResponse(
        success=True,
        message="Jobs de exportación portable recuperados correctamente",
        total_jobs=len(jobs),
        data=[_build_tenant_data_export_job_response(job) for job in jobs],
    )


@router.get(
    "/{tenant_id}/data-export-jobs/{job_id}",
    response_model=TenantDataExportJobResponse,
)
def get_tenant_data_export_job(
    tenant_id: int,
    job_id: int,
    db: Session = Depends(get_control_db),
    _token: dict = Depends(require_role("superadmin")),
) -> TenantDataExportJobResponse:
    try:
        job = tenant_data_portability_service.get_export_job(
            db,
            tenant_id=tenant_id,
            job_id=job_id,
        )
    except ValueError as exc:
        detail = str(exc)
        status_code = 404 if detail in {"Tenant not found", "Tenant data export job not found"} else 409
        raise HTTPException(status_code=status_code, detail=detail) from exc
    return _build_tenant_data_export_job_response(job)


@router.get("/{tenant_id}/data-export-jobs/{job_id}/download")
def download_tenant_data_export_job(
    tenant_id: int,
    job_id: int,
    db: Session = Depends(get_control_db),
    _token: dict = Depends(require_role("superadmin")),
):
    try:
        _job, artifact, artifact_path = tenant_data_portability_service.get_export_artifact(
            db,
            tenant_id=tenant_id,
            job_id=job_id,
        )
    except ValueError as exc:
        detail = str(exc)
        status_code = (
            404
            if detail
            in {
                "Tenant data export job not found",
                "Tenant data export artifact not found",
                "Tenant data export artifact file is missing",
            }
            else 409
        )
        raise HTTPException(status_code=status_code, detail=detail) from exc

    return FileResponse(
        path=str(artifact_path),
        filename=artifact.file_name,
        media_type=artifact.content_type,
    )


@router.post(
    "/{tenant_id}/data-import-jobs",
    response_model=TenantDataImportJobResponse,
)
def create_tenant_data_import_job(
    tenant_id: int,
    package_file: UploadFile = File(...),
    dry_run: bool = Form(True),
    import_strategy: str = Form("skip_existing"),
    db: Session = Depends(get_control_db),
    _token: dict = Depends(require_role("superadmin")),
) -> TenantDataImportJobResponse:
    try:
        job = tenant_data_portability_service.create_import_job(
            db,
            tenant_id=tenant_id,
            requested_by_email=_token.get("email"),
            package_bytes=package_file.file.read(),
            package_file_name=package_file.filename or "tenant-import.zip",
            dry_run=dry_run,
            import_strategy=import_strategy,
        )
        tenant = tenant_service.tenant_repository.get_by_id(db, tenant_id)
        auth_audit_service.log_event(
            db,
            event_type="platform.tenant.data_import.create",
            subject_scope="platform",
            outcome="success",
            subject_user_id=int(_token["sub"]) if _token.get("sub") is not None else None,
            email=_token.get("email"),
            tenant_slug=None if tenant is None else tenant.slug,
            detail=(
                f"Genero import portable CSV para tenant_id={tenant_id} "
                f"(dry_run={str(dry_run).lower()})"
            ),
        )
        return _build_tenant_data_import_job_response(job)
    except ValueError as exc:
        detail = str(exc)
        status_code = 404 if detail == "Tenant not found" else 409
        raise HTTPException(status_code=status_code, detail=detail) from exc


@router.get(
    "/{tenant_id}/data-import-jobs",
    response_model=TenantDataImportJobListResponse,
)
def list_tenant_data_import_jobs(
    tenant_id: int,
    limit: int = 10,
    db: Session = Depends(get_control_db),
    _token: dict = Depends(require_role("superadmin")),
) -> TenantDataImportJobListResponse:
    try:
        jobs = tenant_data_portability_service.list_import_jobs(
            db,
            tenant_id=tenant_id,
            limit=max(1, min(limit, 25)),
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    return TenantDataImportJobListResponse(
        success=True,
        message="Jobs de importación portable recuperados correctamente",
        total_jobs=len(jobs),
        data=[_build_tenant_data_import_job_response(job) for job in jobs],
    )


@router.get(
    "/{tenant_id}/data-import-jobs/{job_id}",
    response_model=TenantDataImportJobResponse,
)
def get_tenant_data_import_job(
    tenant_id: int,
    job_id: int,
    db: Session = Depends(get_control_db),
    _token: dict = Depends(require_role("superadmin")),
) -> TenantDataImportJobResponse:
    try:
        job = tenant_data_portability_service.get_import_job(
            db,
            tenant_id=tenant_id,
            job_id=job_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    return _build_tenant_data_import_job_response(job)


@router.post("/", response_model=TenantResponse)
def create_tenant(
    payload: TenantCreateRequest,
    db: Session = Depends(get_control_db),
    _token: dict = Depends(require_role("superadmin")),
) -> TenantResponse:
    try:
        tenant = tenant_service.create_tenant(
            db=db,
            name=payload.name,
            slug=payload.slug,
            tenant_type=payload.tenant_type,
            admin_full_name=payload.admin_full_name,
            admin_email=payload.admin_email,
            admin_password=payload.admin_password,
            plan_code=payload.plan_code,
        )
        auth_audit_service.log_event(
            db,
            event_type="platform.tenant.create",
            subject_scope="platform",
            outcome="success",
            subject_user_id=int(_token["sub"]) if _token.get("sub") is not None else None,
            email=_token.get("email"),
            tenant_slug=tenant.slug,
            detail=(
                f"Creo tenant {tenant.slug} de tipo {tenant.tenant_type} "
                f"con admin bootstrap {payload.admin_email}"
            ),
        )
        return _build_tenant_response(tenant)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/{tenant_id}/reprovision", response_model=ProvisioningJobResponse)
def reprovision_tenant(
    tenant_id: int,
    db: Session = Depends(get_control_db),
    _token: dict = Depends(require_role("superadmin")),
) -> ProvisioningJobResponse:
    try:
        job = tenant_service.reprovision_tenant(db=db, tenant_id=tenant_id)
        tenant = tenant_service.tenant_repository.get_by_id(db, tenant_id)
        auth_audit_service.log_event(
            db,
            event_type="platform.tenant.reprovision",
            subject_scope="platform",
            outcome="success",
            subject_user_id=int(_token["sub"]) if _token.get("sub") is not None else None,
            email=_token.get("email"),
            tenant_slug=None if tenant is None else tenant.slug,
            detail=(
                f"Reencolo provisioning inicial para tenant "
                f"{tenant.slug if tenant is not None else tenant_id}"
            ),
        )
        return ProvisioningJobResponse.model_validate(job)
    except ValueError as exc:
        detail = str(exc)
        status_code = 404 if detail == "Tenant not found" else 400
        raise HTTPException(status_code=status_code, detail=detail) from exc


@router.patch("/{tenant_id}", response_model=TenantIdentityResponse)
def update_tenant_identity(
    tenant_id: int,
    payload: TenantIdentityUpdateRequest,
    db: Session = Depends(get_control_db),
    _token: dict = Depends(require_role("superadmin")),
) -> TenantIdentityResponse:
    previous_state = _capture_tenant_snapshot(db, tenant_id)
    try:
        tenant = tenant_service.update_basic_identity(
            db=db,
            tenant_id=tenant_id,
            name=payload.name,
            tenant_type=payload.tenant_type,
        )
    except ValueError as exc:
        detail = str(exc)
        status_code = 404 if detail == "Tenant not found" else 400
        raise HTTPException(status_code=status_code, detail=detail) from exc

    _record_tenant_policy_event(
        db,
        tenant=tenant,
        event_type="identity",
        previous_state=previous_state,
        actor_context=_token,
    )

    return TenantIdentityResponse(
        success=True,
        message="Identidad basica del tenant actualizada correctamente",
        tenant_id=tenant.id,
        tenant_slug=tenant.slug,
        tenant_name=tenant.name,
        tenant_type=tenant.tenant_type,
        tenant_status=tenant.status,
    )


@router.get("/", response_model=TenantListResponse)
def list_tenants(
    db: Session = Depends(get_control_db),
    _token: dict = Depends(require_role("superadmin")),
) -> TenantListResponse:
    tenants = tenant_service.tenant_repository.list_all(db)
    return TenantListResponse(
        success=True,
        message="Tenants recuperados correctamente",
        total_tenants=len(tenants),
        data=[_build_tenant_response(tenant) for tenant in tenants],
    )


@router.get(
    "/retirement-archives",
    response_model=TenantRetirementArchiveListResponse,
)
def list_tenant_retirement_archives(
    limit: int = 25,
    search: str | None = None,
    tenant_type: str | None = None,
    billing_status: str | None = None,
    deleted_by_email: str | None = None,
    deleted_from: date | None = None,
    deleted_to: date | None = None,
    db: Session = Depends(get_control_db),
    _token: dict = Depends(require_role("superadmin")),
) -> TenantRetirementArchiveListResponse:
    normalized_limit = max(1, min(limit, 200))
    query = db.query(TenantRetirementArchive)

    normalized_search = None if search is None else search.strip()
    if normalized_search:
        search_term = f"%{normalized_search}%"
        query = query.filter(
            or_(
                TenantRetirementArchive.tenant_name.ilike(search_term),
                TenantRetirementArchive.tenant_slug.ilike(search_term),
                TenantRetirementArchive.tenant_type.ilike(search_term),
                TenantRetirementArchive.deleted_by_email.ilike(search_term),
                TenantRetirementArchive.billing_provider.ilike(search_term),
                TenantRetirementArchive.billing_status.ilike(search_term),
            )
        )

    normalized_tenant_type = None if tenant_type is None else tenant_type.strip()
    if normalized_tenant_type:
        query = query.filter(
            TenantRetirementArchive.tenant_type == normalized_tenant_type
        )

    normalized_billing_status = (
        None if billing_status is None else billing_status.strip()
    )
    if normalized_billing_status:
        query = query.filter(
            TenantRetirementArchive.billing_status == normalized_billing_status
        )

    normalized_deleted_by_email = (
        None if deleted_by_email is None else deleted_by_email.strip()
    )
    if normalized_deleted_by_email:
        query = query.filter(
            TenantRetirementArchive.deleted_by_email.ilike(
                f"%{normalized_deleted_by_email}%"
            )
        )

    if deleted_from is not None:
        query = query.filter(
            func.date(TenantRetirementArchive.deleted_at) >= deleted_from.isoformat()
        )

    if deleted_to is not None:
        query = query.filter(
            func.date(TenantRetirementArchive.deleted_at) <= deleted_to.isoformat()
        )

    rows = (
        query.order_by(
            desc(TenantRetirementArchive.deleted_at),
            desc(TenantRetirementArchive.id),
        )
        .limit(normalized_limit)
        .all()
    )

    return TenantRetirementArchiveListResponse(
        success=True,
        message="Archivo histórico de tenants recuperado correctamente",
        total=len(rows),
        limit=normalized_limit,
        search=normalized_search or None,
        data=[_build_tenant_retirement_archive_item(row) for row in rows],
    )


@router.get(
    "/retirement-archives/{archive_id}",
    response_model=TenantRetirementArchiveDetailResponse,
)
def get_tenant_retirement_archive(
    archive_id: int,
    db: Session = Depends(get_control_db),
    _token: dict = Depends(require_role("superadmin")),
) -> TenantRetirementArchiveDetailResponse:
    archive = (
        db.query(TenantRetirementArchive)
        .filter(TenantRetirementArchive.id == archive_id)
        .first()
    )
    if archive is None:
        raise HTTPException(status_code=404, detail="Tenant retirement archive not found")

    try:
        summary = json.loads(archive.summary_json)
    except (TypeError, ValueError, json.JSONDecodeError):
        summary = {}

    return TenantRetirementArchiveDetailResponse(
        success=True,
        message="Detalle del archivo histórico recuperado correctamente",
        data=_build_tenant_retirement_archive_item(archive),
        summary=summary,
    )


@router.get(
    "/{tenant_id}",
    response_model=TenantResponse,
)
def get_tenant(
    tenant_id: int,
    db: Session = Depends(get_control_db),
    _token: dict = Depends(require_role("superadmin")),
) -> TenantResponse:
    tenant = tenant_service.tenant_repository.get_by_id(db, tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return _build_tenant_response(tenant)


@router.get(
    "/{tenant_id}/finance/usage",
    response_model=TenantFinanceUsageResponse,
)
def get_tenant_finance_usage(
    tenant_id: int,
    db: Session = Depends(get_control_db),
    _token: dict = Depends(require_role("superadmin")),
) -> TenantFinanceUsageResponse:
    tenant = tenant_service.tenant_repository.get_by_id(db, tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    effective_module_limits = tenant_service.get_effective_module_limits(tenant)
    effective_module_limit_sources = tenant_service.get_effective_module_limit_sources(
        tenant
    )
    billing_grace_policy = tenant_service.tenant_billing_grace_policy_service.get_policy()
    access_policy = tenant_service.get_tenant_access_policy(tenant)

    try:
        with _open_platform_tenant_db(tenant) as tenant_db:
            usage = finance_service.get_usage(
                tenant_db,
                max_entries=(effective_module_limits or {}).get(
                    FinanceService.MODULE_LIMIT_KEY
                ),
            )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except (ProgrammingError, OperationalError) as exc:
        _raise_tenant_schema_http_error(exc)

    return TenantFinanceUsageResponse(
        success=True,
        message="Uso de finance recuperado correctamente",
        tenant_id=tenant.id,
        tenant_slug=tenant.slug,
        tenant_status=tenant.status,
        tenant_plan_code=tenant.plan_code,
        billing_in_grace=access_policy.billing_in_grace,
        tenant_plan_module_limits=tenant_service.tenant_plan_policy_service.get_module_limits(
            tenant.plan_code
        ),
        tenant_module_limits=tenant_service.get_tenant_module_limits(tenant),
        billing_grace_module_limits=(
            None
            if not access_policy.billing_in_grace or billing_grace_policy is None
            else billing_grace_policy.module_limits
        ),
        effective_module_limit=(effective_module_limits or {}).get(
            FinanceService.MODULE_LIMIT_KEY
        ),
        effective_module_limit_source=(effective_module_limit_sources or {}).get(
            FinanceService.MODULE_LIMIT_KEY
        ),
        data=TenantFinanceUsageDataResponse(**usage),
    )


@router.get(
    "/{tenant_id}/module-usage",
    response_model=TenantModuleUsageSummaryResponse,
)
def get_tenant_module_usage(
    tenant_id: int,
    db: Session = Depends(get_control_db),
    _token: dict = Depends(require_role("superadmin")),
) -> TenantModuleUsageSummaryResponse:
    tenant = tenant_service.tenant_repository.get_by_id(db, tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    access_policy = tenant_service.get_tenant_access_policy(tenant)
    effective_module_limits = tenant_service.get_effective_module_limits(tenant)
    effective_module_limit_sources = tenant_service.get_effective_module_limit_sources(
        tenant
    )

    try:
        with _open_platform_tenant_db(tenant) as tenant_db:
            usage_rows = tenant_module_usage_service.list_usage(
                tenant_db,
                effective_module_limits=effective_module_limits,
                effective_module_limit_sources=effective_module_limit_sources,
            )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except (ProgrammingError, OperationalError) as exc:
        _raise_tenant_schema_http_error(exc)

    return TenantModuleUsageSummaryResponse(
        success=True,
        message="Uso de modulos tenant recuperado correctamente",
        tenant_id=tenant.id,
        tenant_slug=tenant.slug,
        tenant_status=tenant.status,
        tenant_plan_code=tenant.plan_code,
        billing_in_grace=access_policy.billing_in_grace,
        total_modules=len(usage_rows),
        data=[TenantModuleUsageItemResponse(**item) for item in usage_rows],
    )


@router.post("/{tenant_id}/sync-schema", response_model=TenantSchemaSyncResponse)
def sync_tenant_schema(
    tenant_id: int,
    db: Session = Depends(get_control_db),
    _token: dict = Depends(require_role("superadmin")),
) -> TenantSchemaSyncResponse:
    try:
        tenant = tenant_service.sync_tenant_schema(db=db, tenant_id=tenant_id)
        schema_status = tenant_service.get_tenant_schema_status(db=db, tenant_id=tenant_id)
    except ValueError as exc:
        detail = str(exc)
        status_code = 404 if detail == "Tenant not found" else 400
        raise HTTPException(status_code=status_code, detail=detail) from exc

    return TenantSchemaSyncResponse(
        success=True,
        message="Tenant schema synchronized successfully",
        tenant_id=tenant.id,
        tenant_slug=tenant.slug,
        tenant_status=tenant.status,
        current_version=schema_status.get("current_version"),
        latest_available_version=schema_status.get("latest_available_version"),
        pending_count=schema_status.get("pending_count", 0),
        last_applied_at=schema_status.get("last_applied_at"),
        applied_now=schema_status.get("applied_now", []),
    )


@router.post("/schema-sync/bulk", response_model=TenantSchemaAutoSyncResponse)
def bulk_sync_tenant_schemas(
    limit: int = 100,
    db: Session = Depends(get_control_db),
    _token: dict = Depends(require_role("superadmin")),
) -> TenantSchemaAutoSyncResponse:
    result = tenant_service.request_bulk_tenant_schema_sync(
        db=db,
        limit=limit,
    )

    return TenantSchemaAutoSyncResponse(
        success=True,
        message="Tenant schema auto-sync jobs queued successfully",
        limit=result["limit"],
        total_tenants=result["total_tenants"],
        eligible_tenants=result["eligible_tenants"],
        queued_jobs=result["queued_jobs"],
        skipped_inactive=result["skipped_inactive"],
        skipped_not_configured=result["skipped_not_configured"],
        skipped_live_jobs=result["skipped_live_jobs"],
        skipped_invalid_credentials=result["skipped_invalid_credentials"],
        data=[
            TenantSchemaAutoSyncJobResponse(**item)
            for item in result.get("data", [])
        ],
    )


@router.get("/{tenant_id}/schema-status", response_model=TenantSchemaStatusResponse)
def get_tenant_schema_status(
    tenant_id: int,
    db: Session = Depends(get_control_db),
    _token: dict = Depends(require_role("superadmin")),
) -> TenantSchemaStatusResponse:
    try:
        schema_status = tenant_service.get_tenant_schema_status(db=db, tenant_id=tenant_id)
    except ValueError as exc:
        detail = str(exc)
        status_code = 404 if detail == "Tenant not found" else 400
        raise HTTPException(status_code=status_code, detail=detail) from exc

    tenant = schema_status["tenant"]
    return TenantSchemaStatusResponse(
        success=True,
        message="Estado de esquema tenant recuperado correctamente",
        tenant_id=tenant.id,
        tenant_slug=tenant.slug,
        tenant_status=tenant.status,
        current_version=schema_status.get("current_version"),
        latest_available_version=schema_status.get("latest_available_version"),
        pending_count=schema_status.get("pending_count", 0),
        pending_versions=schema_status.get("pending_versions", []),
        last_applied_at=schema_status.get("last_applied_at"),
    )


@router.post(
    "/{tenant_id}/rotate-db-credentials",
    response_model=TenantDbCredentialsRotateResponse,
)
def rotate_tenant_db_credentials(
    tenant_id: int,
    db: Session = Depends(get_control_db),
    _token: dict = Depends(require_role("superadmin")),
) -> TenantDbCredentialsRotateResponse:
    previous_state = _capture_tenant_snapshot(db, tenant_id)
    try:
        result = tenant_service.rotate_tenant_db_credentials(db=db, tenant_id=tenant_id)
    except ValueError as exc:
        _raise_tenant_db_credentials_rotation_http_error(exc)

    tenant = result["tenant"]
    _record_tenant_policy_event(
        db,
        tenant=tenant,
        event_type="technical_credentials",
        previous_state=previous_state,
        actor_context=_token,
    )
    auth_audit_service.log_event(
        db,
        event_type="platform.tenant_db_credentials_rotated",
        subject_scope="platform",
        outcome="success",
        subject_user_id=int(_token.get("sub")) if _token.get("sub") else None,
        tenant_slug=tenant.slug,
        email=_token.get("email"),
        detail="Credenciales tecnicas tenant rotadas desde plataforma",
    )

    return TenantDbCredentialsRotateResponse(
        success=True,
        message="Las credenciales técnicas tenant fueron rotadas correctamente",
        tenant_id=tenant.id,
        tenant_slug=tenant.slug,
        tenant_status=tenant.status,
        env_var_name=result["env_var_name"],
        rotated_at=result["rotated_at"],
    )


@router.post(
    "/{tenant_id}/users/reset-password",
    response_model=TenantPortalUserPasswordResetResponse,
)
def reset_tenant_portal_user_password(
    tenant_id: int,
    payload: TenantPortalUserPasswordResetRequest,
    db: Session = Depends(get_control_db),
    _token: dict = Depends(require_role("superadmin")),
) -> TenantPortalUserPasswordResetResponse:
    tenant = tenant_service.tenant_repository.get_by_id(db, tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    try:
        with _open_platform_tenant_db(tenant) as tenant_db:
            user = tenant_data_service.reset_user_password_by_email(
                tenant_db,
                email=payload.email,
                new_password=payload.new_password,
            )
    except ValueError as exc:
        detail = str(exc)
        status_code = 404 if detail == "Tenant user not found" else 400
        raise HTTPException(status_code=status_code, detail=detail) from exc
    except (OperationalError, ProgrammingError) as exc:
        _raise_tenant_schema_http_error(exc)

    auth_audit_service.log_event(
        db,
        event_type="platform.tenant_user.password_reset",
        subject_scope="platform",
        outcome="success",
        subject_user_id=int(_token["sub"]) if _token.get("sub") is not None else None,
        tenant_slug=tenant.slug,
        email=_token.get("email"),
        detail=f"Reinicio contraseña portal tenant de {user.email}",
    )

    return _build_tenant_portal_user_reset_response(tenant, user)


@router.post(
    "/{tenant_id}/deprovision",
    response_model=ProvisioningJobResponse,
)
def deprovision_tenant(
    tenant_id: int,
    db: Session = Depends(get_control_db),
    _token: dict = Depends(require_role("superadmin")),
) -> ProvisioningJobResponse:
    try:
        job = tenant_service.request_deprovision_tenant(db, tenant_id)
    except ValueError as exc:
        detail = str(exc)
        status_code = 404 if detail == "Tenant not found" else 400
        raise HTTPException(status_code=status_code, detail=detail) from exc
    tenant = tenant_service.tenant_repository.get_by_id(db, tenant_id)
    auth_audit_service.log_event(
        db,
        event_type="platform.tenant.deprovision_requested",
        subject_scope="platform",
        outcome="success",
        subject_user_id=int(_token["sub"]) if _token.get("sub") is not None else None,
        email=_token.get("email"),
        tenant_slug=None if tenant is None else tenant.slug,
        detail=(
            f"Encolo desprovision tecnico para tenant "
            f"{tenant.slug if tenant is not None else tenant_id}"
        ),
    )
    return ProvisioningJobResponse.model_validate(job)


@router.get(
    "/{tenant_id}/users",
    response_model=TenantPortalUsersResponse,
)
def list_tenant_portal_users(
    tenant_id: int,
    db: Session = Depends(get_control_db),
    _token: dict = Depends(require_role("superadmin")),
) -> TenantPortalUsersResponse:
    tenant = tenant_service.tenant_repository.get_by_id(db, tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    try:
        with _open_platform_tenant_db(tenant) as tenant_db:
            users = tenant_data_service.list_users(tenant_db)
    except ValueError as exc:
        detail = str(exc)
        raise HTTPException(status_code=400, detail=detail) from exc
    except (OperationalError, ProgrammingError) as exc:
        _raise_tenant_schema_http_error(exc)

    return TenantPortalUsersResponse(
        success=True,
        message="Usuarios del portal tenant recuperados correctamente.",
        tenant_id=tenant.id,
        tenant_slug=tenant.slug,
        tenant_status=tenant.status,
        total=len(users),
        data=[_build_tenant_portal_user_item(user) for user in users],
    )


@router.patch(
    "/{tenant_id}/maintenance",
    response_model=TenantMaintenanceResponse,
)
def update_tenant_maintenance_mode(
    tenant_id: int,
    payload: TenantMaintenanceUpdateRequest,
    db: Session = Depends(get_control_db),
    _token: dict = Depends(require_role("superadmin")),
) -> TenantMaintenanceResponse:
    previous_state = _capture_tenant_snapshot(db, tenant_id)
    try:
        tenant = tenant_service.set_maintenance_mode(
            db=db,
            tenant_id=tenant_id,
            maintenance_mode=payload.maintenance_mode,
            maintenance_starts_at=payload.maintenance_starts_at,
            maintenance_ends_at=payload.maintenance_ends_at,
            maintenance_reason=payload.maintenance_reason,
        )
    except ValueError as exc:
        detail = str(exc)
        status_code = 404 if detail == "Tenant not found" else 400
        raise HTTPException(status_code=status_code, detail=detail) from exc
    _record_tenant_policy_event(
        db,
        tenant=tenant,
        event_type="maintenance",
        previous_state=previous_state,
        actor_context=_token,
    )

    action = "actualizada"
    return TenantMaintenanceResponse(
        success=True,
        message=f"Politica de mantenimiento {action} correctamente",
        tenant_id=tenant.id,
        tenant_slug=tenant.slug,
        tenant_status=tenant.status,
        maintenance_mode=tenant.maintenance_mode,
        maintenance_starts_at=tenant.maintenance_starts_at,
        maintenance_ends_at=tenant.maintenance_ends_at,
        maintenance_reason=tenant.maintenance_reason,
        maintenance_scopes=tenant_service.get_tenant_maintenance_scopes(tenant),
        maintenance_access_mode=tenant.maintenance_access_mode,
        maintenance_active_now=tenant_service.is_tenant_under_maintenance(tenant),
    )


@router.patch(
    "/{tenant_id}/rate-limit",
    response_model=TenantRateLimitResponse,
)
def update_tenant_rate_limits(
    tenant_id: int,
    payload: TenantRateLimitUpdateRequest,
    db: Session = Depends(get_control_db),
    _token: dict = Depends(require_role("superadmin")),
) -> TenantRateLimitResponse:
    previous_state = _capture_tenant_snapshot(db, tenant_id)
    try:
        tenant = tenant_service.set_api_rate_limits(
            db=db,
            tenant_id=tenant_id,
            api_read_requests_per_minute=payload.api_read_requests_per_minute,
            api_write_requests_per_minute=payload.api_write_requests_per_minute,
        )
    except ValueError as exc:
        detail = str(exc)
        status_code = 404 if detail == "Tenant not found" else 400
        raise HTTPException(status_code=status_code, detail=detail) from exc
    _record_tenant_policy_event(
        db,
        tenant=tenant,
        event_type="rate_limit",
        previous_state=previous_state,
        actor_context=_token,
    )

    return TenantRateLimitResponse(
        success=True,
        message="Politica de rate limit tenant actualizada correctamente",
        tenant_id=tenant.id,
        tenant_slug=tenant.slug,
        tenant_status=tenant.status,
        tenant_plan_code=tenant.plan_code,
        api_read_requests_per_minute=tenant.api_read_requests_per_minute,
        api_write_requests_per_minute=tenant.api_write_requests_per_minute,
    )


@router.patch(
    "/{tenant_id}/module-limits",
    response_model=TenantModuleLimitsResponse,
)
def update_tenant_module_limits(
    tenant_id: int,
    payload: TenantModuleLimitsUpdateRequest,
    db: Session = Depends(get_control_db),
    _token: dict = Depends(require_role("superadmin")),
) -> TenantModuleLimitsResponse:
    previous_state = _capture_tenant_snapshot(db, tenant_id)
    try:
        tenant = tenant_service.set_module_limits(
            db=db,
            tenant_id=tenant_id,
            module_limits=payload.module_limits,
        )
    except ValueError as exc:
        detail = str(exc)
        status_code = 404 if detail == "Tenant not found" else 400
        raise HTTPException(status_code=status_code, detail=detail) from exc
    _record_tenant_policy_event(
        db,
        tenant=tenant,
        event_type="module_limits",
        previous_state=previous_state,
        actor_context=_token,
    )

    return TenantModuleLimitsResponse(
        success=True,
        message="Politica de limites por modulo actualizada correctamente",
        tenant_id=tenant.id,
        tenant_slug=tenant.slug,
        tenant_status=tenant.status,
        tenant_plan_code=tenant.plan_code,
        tenant_plan_module_limits=tenant_service.tenant_plan_policy_service.get_module_limits(
            tenant.plan_code
        ),
        module_limits=tenant_service.get_tenant_module_limits(tenant),
    )


@router.patch(
    "/{tenant_id}/plan",
    response_model=TenantPlanResponse,
)
def update_tenant_plan(
    tenant_id: int,
    payload: TenantPlanUpdateRequest,
    db: Session = Depends(get_control_db),
    _token: dict = Depends(require_role("superadmin")),
) -> TenantPlanResponse:
    previous_state = _capture_tenant_snapshot(db, tenant_id)
    try:
        tenant = tenant_service.set_plan(
            db=db,
            tenant_id=tenant_id,
            plan_code=payload.plan_code,
        )
    except ValueError as exc:
        detail = str(exc)
        status_code = 404 if detail == "Tenant not found" else 400
        raise HTTPException(status_code=status_code, detail=detail) from exc
    _record_tenant_policy_event(
        db,
        tenant=tenant,
        event_type="plan",
        previous_state=previous_state,
        actor_context=_token,
    )
    activation_state = tenant_service.get_tenant_module_activation_state(tenant)

    return TenantPlanResponse(
        success=True,
        message="Plan de tenant actualizado correctamente",
        tenant_id=tenant.id,
        tenant_slug=tenant.slug,
        tenant_status=tenant.status,
        tenant_plan_code=tenant.plan_code,
        tenant_plan_enabled_modules=tenant_service.tenant_plan_policy_service.get_enabled_modules(
            tenant.plan_code
        ),
        subscription_base_plan_code=activation_state.subscription_base_plan_code,
        subscription_effective_enabled_modules=(
            list(activation_state.subscription_effective_enabled_modules)
            if activation_state.subscription_effective_enabled_modules is not None
            else None
        ),
        effective_activation_source=activation_state.activation_source,
        tenant_plan_module_limits=tenant_service.tenant_plan_policy_service.get_module_limits(
            tenant.plan_code
        ),
    )


@router.patch(
    "/{tenant_id}/billing-identity",
    response_model=TenantBillingResponse,
)
def update_tenant_billing_identity(
    tenant_id: int,
    payload: TenantBillingIdentityUpdateRequest,
    db: Session = Depends(get_control_db),
    _token: dict = Depends(require_role("superadmin")),
) -> TenantBillingResponse:
    previous_state = _capture_tenant_snapshot(db, tenant_id)
    try:
        tenant = tenant_service.set_billing_identity(
            db=db,
            tenant_id=tenant_id,
            billing_provider=payload.billing_provider,
            billing_provider_customer_id=payload.billing_provider_customer_id,
            billing_provider_subscription_id=payload.billing_provider_subscription_id,
        )
    except ValueError as exc:
        detail = str(exc)
        status_code = 404 if detail == "Tenant not found" else 400
        raise HTTPException(status_code=status_code, detail=detail) from exc
    _record_tenant_policy_event(
        db,
        tenant=tenant,
        event_type="billing_identity",
        previous_state=previous_state,
        actor_context=_token,
    )

    return TenantBillingResponse(
        success=True,
        message="Identidad externa de billing actualizada correctamente",
        tenant_id=tenant.id,
        tenant_slug=tenant.slug,
        tenant_status=tenant.status,
        billing_provider=tenant.billing_provider,
        billing_provider_customer_id=tenant.billing_provider_customer_id,
        billing_provider_subscription_id=tenant.billing_provider_subscription_id,
        billing_status=tenant.billing_status,
        billing_status_reason=tenant.billing_status_reason,
        billing_current_period_ends_at=tenant.billing_current_period_ends_at,
        billing_grace_until=tenant.billing_grace_until,
    )


@router.patch(
    "/{tenant_id}/billing",
    response_model=TenantBillingResponse,
)
def update_tenant_billing(
    tenant_id: int,
    payload: TenantBillingUpdateRequest,
    db: Session = Depends(get_control_db),
    _token: dict = Depends(require_role("superadmin")),
) -> TenantBillingResponse:
    previous_state = _capture_tenant_snapshot(db, tenant_id)
    try:
        tenant = tenant_service.set_billing_state(
            db=db,
            tenant_id=tenant_id,
            billing_status=payload.billing_status,
            billing_status_reason=payload.billing_status_reason,
            billing_current_period_ends_at=payload.billing_current_period_ends_at,
            billing_grace_until=payload.billing_grace_until,
        )
    except ValueError as exc:
        detail = str(exc)
        status_code = 404 if detail == "Tenant not found" else 400
        raise HTTPException(status_code=status_code, detail=detail) from exc
    _record_tenant_policy_event(
        db,
        tenant=tenant,
        event_type="billing",
        previous_state=previous_state,
        actor_context=_token,
    )

    return TenantBillingResponse(
        success=True,
        message="Estado de billing tenant actualizado correctamente",
        tenant_id=tenant.id,
        tenant_slug=tenant.slug,
        tenant_status=tenant.status,
        billing_provider=tenant.billing_provider,
        billing_provider_customer_id=tenant.billing_provider_customer_id,
        billing_provider_subscription_id=tenant.billing_provider_subscription_id,
        billing_status=tenant.billing_status,
        billing_status_reason=tenant.billing_status_reason,
        billing_current_period_ends_at=tenant.billing_current_period_ends_at,
        billing_grace_until=tenant.billing_grace_until,
    )


@router.post(
    "/{tenant_id}/billing/sync-event",
    response_model=TenantBillingSyncApplyResponse,
)
def sync_tenant_billing_event(
    tenant_id: int,
    payload: TenantBillingSyncEventRequest,
    db: Session = Depends(get_control_db),
    _token: dict = Depends(require_role("superadmin")),
) -> TenantBillingSyncApplyResponse:
    try:
        result = tenant_billing_sync_service.apply_sync_event(
            db=db,
            tenant_id=tenant_id,
            provider=payload.provider,
            provider_event_id=payload.provider_event_id,
            event_type=payload.event_type,
            billing_status=payload.billing_status,
            billing_status_reason=payload.billing_status_reason,
            billing_current_period_ends_at=payload.billing_current_period_ends_at,
            billing_grace_until=payload.billing_grace_until,
            provider_customer_id=payload.provider_customer_id,
            provider_subscription_id=payload.provider_subscription_id,
            raw_payload=payload.raw_payload,
            actor_context=_token,
        )
    except ValueError as exc:
        detail = str(exc)
        status_code = 404 if detail == "Tenant not found" else 400
        raise HTTPException(status_code=status_code, detail=detail) from exc

    sync_event = tenant_billing_sync_service._serialize_event(result.sync_event)
    return TenantBillingSyncApplyResponse(
        success=True,
        message=(
            "Evento de billing ignorado sin cambios operativos"
            if getattr(result, "was_ignored", False)
            else "Evento de billing sincronizado sin cambios"
            if result.was_duplicate
            else "Evento de billing sincronizado correctamente"
        ),
        tenant_id=result.tenant.id,
        tenant_slug=result.tenant.slug,
        tenant_status=result.tenant.status,
        billing_status=result.tenant.billing_status,
        billing_status_reason=result.tenant.billing_status_reason,
        billing_current_period_ends_at=result.tenant.billing_current_period_ends_at,
        billing_grace_until=result.tenant.billing_grace_until,
        was_duplicate=result.was_duplicate,
        sync_event=sync_event,
    )


@router.get(
    "/{tenant_id}/billing/events",
    response_model=TenantBillingSyncHistoryResponse,
)
def get_tenant_billing_events(
    tenant_id: int,
    provider: str | None = None,
    event_type: str | None = None,
    processing_result: str | None = None,
    limit: int = 50,
    db: Session = Depends(get_control_db),
    _token: dict = Depends(require_role("superadmin")),
) -> TenantBillingSyncHistoryResponse:
    tenant = tenant_service.tenant_repository.get_by_id(db, tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    events = tenant_billing_sync_service.list_recent_events(
        db,
        tenant_id=tenant_id,
        provider=provider,
        event_type=event_type,
        processing_result=processing_result,
        limit=limit,
    )

    return TenantBillingSyncHistoryResponse(
        success=True,
        message="Eventos de billing tenant recuperados correctamente",
        tenant_id=tenant.id,
        tenant_slug=tenant.slug,
        provider=provider,
        event_type=event_type,
        processing_result=processing_result,
        total_events=len(events),
        data=events,
    )


@router.get(
    "/{tenant_id}/billing/events/summary",
    response_model=TenantBillingSyncSummaryResponse,
)
def get_tenant_billing_events_summary(
    tenant_id: int,
    provider: str | None = None,
    event_type: str | None = None,
    processing_result: str | None = None,
    db: Session = Depends(get_control_db),
    _token: dict = Depends(require_role("superadmin")),
) -> TenantBillingSyncSummaryResponse:
    tenant = tenant_service.tenant_repository.get_by_id(db, tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    rows = tenant_billing_sync_service.summarize_recent_events(
        db,
        tenant_id=tenant_id,
        provider=provider,
        event_type=event_type,
        processing_result=processing_result,
    )

    return TenantBillingSyncSummaryResponse(
        success=True,
        message="Resumen de eventos de billing tenant recuperado correctamente",
        tenant_id=tenant.id,
        tenant_slug=tenant.slug,
        provider=provider,
        event_type=event_type,
        processing_result=processing_result,
        total_rows=len(rows),
        data=rows,
    )


@router.post(
    "/{tenant_id}/billing/events/reconcile",
    response_model=TenantBillingReconcileBatchResponse,
)
def reconcile_tenant_billing_events_batch(
    tenant_id: int,
    provider: str | None = None,
    event_type: str | None = None,
    processing_result: str | None = None,
    limit: int = 20,
    db: Session = Depends(get_control_db),
    _token: dict = Depends(require_role("superadmin")),
) -> TenantBillingReconcileBatchResponse:
    tenant = tenant_service.tenant_repository.get_by_id(db, tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    try:
        results = tenant_billing_sync_service.reconcile_recent_events(
            db,
            tenant_id=tenant_id,
            provider=provider,
            event_type=event_type,
            processing_result=processing_result,
            limit=limit,
            actor_context=_token,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return TenantBillingReconcileBatchResponse(
        success=True,
        message="Eventos de billing reconciliados correctamente",
        tenant_id=tenant.id,
        tenant_slug=tenant.slug,
        provider=provider,
        event_type=event_type,
        processing_result=processing_result,
        total_events=len(results),
        data=[
            TenantBillingSyncEventResponse(
                **tenant_billing_sync_service._serialize_event(result.sync_event)
            )
            for result in results
        ],
    )


@router.post(
    "/{tenant_id}/billing/events/{sync_event_id}/reconcile",
    response_model=TenantBillingReconcileResponse,
)
def reconcile_tenant_billing_from_event(
    tenant_id: int,
    sync_event_id: int,
    db: Session = Depends(get_control_db),
    _token: dict = Depends(require_role("superadmin")),
) -> TenantBillingReconcileResponse:
    try:
        result = tenant_billing_sync_service.reconcile_from_stored_event(
            db=db,
            tenant_id=tenant_id,
            sync_event_id=sync_event_id,
            actor_context=_token,
        )
    except ValueError as exc:
        detail = str(exc)
        status_code = (
            404
            if detail in {"Tenant not found", "Billing sync event not found"}
            else 400
        )
        raise HTTPException(status_code=status_code, detail=detail) from exc

    sync_event = tenant_billing_sync_service._serialize_event(result.sync_event)
    return TenantBillingReconcileResponse(
        success=True,
        message="Estado de billing reconciliado correctamente desde evento persistido",
        tenant_id=result.tenant.id,
        tenant_slug=result.tenant.slug,
        tenant_status=result.tenant.status,
        billing_status=result.tenant.billing_status,
        billing_status_reason=result.tenant.billing_status_reason,
        billing_current_period_ends_at=result.tenant.billing_current_period_ends_at,
        billing_grace_until=result.tenant.billing_grace_until,
        sync_event=sync_event,
    )


@router.get(
    "/{tenant_id}/access-policy",
    response_model=TenantAccessPolicyResponse,
)
def get_tenant_access_policy(
    tenant_id: int,
    db: Session = Depends(get_control_db),
    _token: dict = Depends(require_role("superadmin")),
) -> TenantAccessPolicyResponse:
    tenant = tenant_service.tenant_repository.get_by_id(db, tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    access_policy = tenant_service.get_tenant_access_policy(tenant)

    return TenantAccessPolicyResponse(
        success=True,
        message="Politica efectiva de acceso tenant recuperada correctamente",
        tenant_id=tenant.id,
        tenant_slug=tenant.slug,
        tenant_status=tenant.status,
        tenant_status_reason=tenant.status_reason,
        billing_status=tenant.billing_status,
        billing_status_reason=tenant.billing_status_reason,
        billing_current_period_ends_at=tenant.billing_current_period_ends_at,
        billing_grace_until=tenant.billing_grace_until,
        billing_in_grace=access_policy.billing_in_grace,
        access_allowed=access_policy.allowed,
        access_blocking_source=access_policy.blocking_source,
        access_status_code=access_policy.status_code,
        access_detail=access_policy.detail,
    )


@router.patch(
    "/{tenant_id}/status",
    response_model=TenantStatusResponse,
)
def update_tenant_status(
    tenant_id: int,
    payload: TenantStatusUpdateRequest,
    db: Session = Depends(get_control_db),
    _token: dict = Depends(require_role("superadmin")),
) -> TenantStatusResponse:
    previous_state = _capture_tenant_snapshot(db, tenant_id)
    try:
        tenant = tenant_service.set_status(
            db=db,
            tenant_id=tenant_id,
            status=payload.status,
            status_reason=payload.status_reason,
        )
    except ValueError as exc:
        detail = str(exc)
        status_code = 404 if detail == "Tenant not found" else 400
        raise HTTPException(status_code=status_code, detail=detail) from exc
    _record_tenant_policy_event(
        db,
        tenant=tenant,
        event_type="status",
        previous_state=previous_state,
        actor_context=_token,
    )

    return TenantStatusResponse(
        success=True,
        message="Estado de tenant actualizado correctamente",
        tenant_id=tenant.id,
        tenant_slug=tenant.slug,
        tenant_status=tenant.status,
        tenant_status_reason=tenant.status_reason,
    )


@router.post(
    "/{tenant_id}/restore",
    response_model=TenantStatusResponse,
)
def restore_tenant(
    tenant_id: int,
    payload: TenantRestoreRequest,
    db: Session = Depends(get_control_db),
    _token: dict = Depends(require_role("superadmin")),
) -> TenantStatusResponse:
    previous_state = _capture_tenant_snapshot(db, tenant_id)
    try:
        tenant = tenant_service.restore_tenant(
            db=db,
            tenant_id=tenant_id,
            target_status=payload.target_status,
            restore_reason=payload.restore_reason,
        )
    except ValueError as exc:
        detail = str(exc)
        status_code = 404 if detail == "Tenant not found" else 400
        raise HTTPException(status_code=status_code, detail=detail) from exc

    _record_tenant_policy_event(
        db,
        tenant=tenant,
        event_type="restore",
        previous_state=previous_state,
        actor_context=_token,
    )
    auth_audit_service.log_event(
        db,
        event_type="platform.tenant.restore",
        subject_scope="platform",
        outcome="success",
        subject_user_id=int(_token["sub"]) if _token.get("sub") is not None else None,
        email=_token.get("email"),
        tenant_slug=tenant.slug,
        detail=f"Restauro tenant a estado {tenant.status}",
    )

    return TenantStatusResponse(
        success=True,
        message="Tenant restaurado correctamente",
        tenant_id=tenant.id,
        tenant_slug=tenant.slug,
        tenant_status=tenant.status,
        tenant_status_reason=tenant.status_reason,
    )


@router.delete(
    "/{tenant_id}",
    response_model=TenantDeleteResponse,
)
def delete_tenant(
    tenant_id: int,
    payload: TenantDeleteRequest,
    db: Session = Depends(get_control_db),
    _token: dict = Depends(require_role("superadmin")),
) -> TenantDeleteResponse:
    try:
        tenant = tenant_service.delete_tenant(
            db,
            tenant_id,
            confirm_tenant_slug=payload.confirm_tenant_slug,
            portable_export_job_id=payload.portable_export_job_id,
            deleted_by_user_id=(
                int(_token["sub"]) if _token.get("sub") is not None else None
            ),
            deleted_by_email=_token.get("email"),
        )
    except ValueError as exc:
        detail = str(exc)
        status_code = 404 if detail == "Tenant not found" else 400
        raise HTTPException(status_code=status_code, detail=detail) from exc

    auth_audit_service.log_event(
        db,
        event_type="platform.tenant.delete",
        subject_scope="platform",
        outcome="success",
        subject_user_id=int(_token["sub"]) if _token.get("sub") is not None else None,
        email=_token.get("email"),
        tenant_slug=tenant.slug,
        detail=f"Elimino tenant archivado {tenant.slug}",
    )
    return TenantDeleteResponse(
        success=True,
        message="Tenant eliminado correctamente",
        tenant_id=tenant.id,
        tenant_slug=tenant.slug,
        tenant_name=tenant.name,
    )


@router.get(
    "/{tenant_id}/policy-history",
    response_model=TenantPolicyChangeHistoryResponse,
)
def get_tenant_policy_history(
    tenant_id: int,
    event_type: str | None = None,
    limit: int = 50,
    db: Session = Depends(get_control_db),
    _token: dict = Depends(require_role("superadmin")),
) -> TenantPolicyChangeHistoryResponse:
    tenant = tenant_service.tenant_repository.get_by_id(db, tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    history = tenant_policy_event_service.list_recent_history(
        db,
        tenant_id=tenant_id,
        event_type=event_type,
        limit=limit,
    )

    return TenantPolicyChangeHistoryResponse(
        success=True,
        message="Historial de cambios tenant recuperado correctamente",
        tenant_id=tenant.id,
        tenant_slug=tenant.slug,
        event_type=event_type,
        total_events=len(history),
        data=history,
    )


@router.get(
    "/policy-history/recent",
    response_model=PlatformTenantPolicyChangeHistoryResponse,
)
def get_platform_tenant_policy_history(
    event_type: str | None = None,
    tenant_slug: str | None = None,
    actor_email: str | None = None,
    search: str | None = None,
    limit: int = 50,
    db: Session = Depends(get_control_db),
    _token: dict = Depends(require_role("superadmin", "admin")),
) -> PlatformTenantPolicyChangeHistoryResponse:
    history = tenant_policy_event_service.list_global_recent_history(
        db,
        event_type=event_type,
        tenant_slug=tenant_slug,
        actor_email=actor_email,
        search=search,
        limit=limit,
    )

    return PlatformTenantPolicyChangeHistoryResponse(
        success=True,
        message="Historial reciente de cambios administrativos tenant recuperado correctamente",
        event_type=event_type,
        tenant_slug=tenant_slug,
        actor_email=actor_email,
        total_events=len(history),
        data=history,
    )
