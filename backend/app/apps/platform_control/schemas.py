from datetime import datetime

from pydantic import BaseModel


class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    success: bool
    message: str
    access_token: str | None = None
    refresh_token: str | None = None
    token_type: str | None = None
    user_id: int | None = None
    full_name: str | None = None
    email: str | None = None
    role: str | None = None


class PlatformRootRecoveryStatusResponse(BaseModel):
    success: bool
    message: str
    recovery_configured: bool
    has_active_superadmin: bool
    recovery_available: bool


class PlatformRootRecoveryRequest(BaseModel):
    recovery_key: str
    full_name: str
    email: str
    password: str


class PlatformRootRecoveryResponse(BaseModel):
    success: bool
    message: str
    full_name: str
    email: str


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class LogoutResponse(BaseModel):
    success: bool
    message: str
    revoked_refresh_tokens: int = 0


class PlatformUserResponse(BaseModel):
    id: int
    full_name: str
    email: str
    role: str
    is_active: bool
    created_at: datetime | None = None

    class Config:
        from_attributes = True


class PlatformUserListResponse(BaseModel):
    success: bool
    message: str
    total_users: int
    data: list[PlatformUserResponse]


class PlatformUserCreateRequest(BaseModel):
    full_name: str
    email: str
    role: str
    password: str
    is_active: bool = True


class PlatformUserUpdateRequest(BaseModel):
    full_name: str
    role: str


class PlatformUserStatusUpdateRequest(BaseModel):
    is_active: bool


class PlatformUserPasswordResetRequest(BaseModel):
    new_password: str


class PlatformUserWriteResponse(BaseModel):
    success: bool
    message: str
    user_id: int
    full_name: str
    email: str
    role: str
    is_active: bool


class PlatformUserDeleteResponse(BaseModel):
    success: bool
    message: str
    user_id: int
    full_name: str
    email: str
    role: str


class AuthAuditEventResponse(BaseModel):
    id: int
    event_type: str
    subject_scope: str
    outcome: str
    subject_user_id: int | None = None
    tenant_slug: str | None = None
    email: str | None = None
    token_jti: str | None = None
    detail: str | None = None
    created_at: datetime | None = None

    class Config:
        from_attributes = True


class AuthAuditEventListResponse(BaseModel):
    success: bool
    message: str
    total_events: int
    data: list[AuthAuditEventResponse]


class PlatformModuleLimitCapabilityResponse(BaseModel):
    key: str
    module_name: str
    resource_name: str
    period: str
    segment: str | None = None
    unit: str
    description: str | None = None


class PlatformCapabilityCatalogResponse(BaseModel):
    success: bool
    message: str
    tenant_statuses: list[str]
    tenant_billing_statuses: list[str]
    maintenance_scopes: list[str]
    maintenance_access_modes: list[str]
    available_plan_codes: list[str]
    plan_modules: list[str]
    supported_module_limit_keys: list[str]
    module_limit_capabilities: list[PlatformModuleLimitCapabilityResponse]
    billing_providers: list[str]
    billing_sync_processing_results: list[str]
    provisioning_dispatch_backends: list[str]


class PlatformRuntimeSecurityPostureResponse(BaseModel):
    success: bool
    message: str
    app_env: str
    production_ready: bool
    findings_count: int
    findings: list[str]


class TenantCreateRequest(BaseModel):
    name: str
    slug: str
    tenant_type: str
    plan_code: str | None = None


class TenantIdentityUpdateRequest(BaseModel):
    name: str
    tenant_type: str


class TenantResponse(BaseModel):
    id: int
    name: str
    slug: str
    tenant_type: str
    db_configured: bool = False
    tenant_schema_version: str | None = None
    tenant_schema_synced_at: datetime | None = None
    tenant_db_credentials_rotated_at: datetime | None = None
    plan_code: str | None = None
    billing_provider: str | None = None
    billing_provider_customer_id: str | None = None
    billing_provider_subscription_id: str | None = None
    plan_enabled_modules: list[str] | None = None
    plan_module_limits: dict[str, int] | None = None
    module_limits: dict[str, int] | None = None
    billing_status: str | None = None
    billing_status_reason: str | None = None
    billing_current_period_ends_at: datetime | None = None
    billing_grace_until: datetime | None = None
    status: str
    status_reason: str | None = None
    maintenance_mode: bool = False
    maintenance_starts_at: datetime | None = None
    maintenance_ends_at: datetime | None = None
    maintenance_reason: str | None = None
    maintenance_scopes: list[str] | None = None
    maintenance_access_mode: str = "write_block"
    api_read_requests_per_minute: int | None = None
    api_write_requests_per_minute: int | None = None

    class Config:
        from_attributes = True


class TenantListResponse(BaseModel):
    success: bool
    message: str
    total_tenants: int
    data: list[TenantResponse]


class TenantIdentityResponse(BaseModel):
    success: bool
    message: str
    tenant_id: int
    tenant_slug: str
    tenant_name: str
    tenant_type: str
    tenant_status: str


class TenantMaintenanceUpdateRequest(BaseModel):
    maintenance_mode: bool
    maintenance_starts_at: datetime | None = None
    maintenance_ends_at: datetime | None = None
    maintenance_reason: str | None = None
    maintenance_scopes: list[str] | None = None
    maintenance_access_mode: str = "write_block"


class TenantMaintenanceResponse(BaseModel):
    success: bool
    message: str
    tenant_id: int
    tenant_slug: str
    tenant_status: str
    maintenance_mode: bool
    maintenance_starts_at: datetime | None = None
    maintenance_ends_at: datetime | None = None
    maintenance_reason: str | None = None
    maintenance_scopes: list[str] | None = None
    maintenance_access_mode: str = "write_block"
    maintenance_active_now: bool = False


class TenantRateLimitUpdateRequest(BaseModel):
    api_read_requests_per_minute: int | None = None
    api_write_requests_per_minute: int | None = None


class TenantRateLimitResponse(BaseModel):
    success: bool
    message: str
    tenant_id: int
    tenant_slug: str
    tenant_status: str
    tenant_plan_code: str | None = None
    api_read_requests_per_minute: int | None = None
    api_write_requests_per_minute: int | None = None


class TenantModuleLimitsUpdateRequest(BaseModel):
    module_limits: dict[str, int | None] | None = None


class TenantModuleLimitsResponse(BaseModel):
    success: bool
    message: str
    tenant_id: int
    tenant_slug: str
    tenant_status: str
    tenant_plan_code: str | None = None
    tenant_plan_module_limits: dict[str, int] | None = None
    module_limits: dict[str, int] | None = None


class TenantFinanceUsageDataResponse(BaseModel):
    module_key: str
    used_entries: int
    max_entries: int | None = None
    remaining_entries: int | None = None
    unlimited: bool = False
    at_limit: bool = False


class TenantFinanceUsageResponse(BaseModel):
    success: bool
    message: str
    tenant_id: int
    tenant_slug: str
    tenant_status: str
    tenant_plan_code: str | None = None
    billing_in_grace: bool = False
    tenant_plan_module_limits: dict[str, int] | None = None
    tenant_module_limits: dict[str, int] | None = None
    billing_grace_module_limits: dict[str, int] | None = None
    effective_module_limit: int | None = None
    effective_module_limit_source: str | None = None
    data: TenantFinanceUsageDataResponse


class TenantModuleUsageItemResponse(BaseModel):
    module_name: str
    module_key: str
    used_units: int
    max_units: int | None = None
    remaining_units: int | None = None
    unlimited: bool = False
    at_limit: bool = False
    limit_source: str | None = None


class TenantModuleUsageSummaryResponse(BaseModel):
    success: bool
    message: str
    tenant_id: int
    tenant_slug: str
    tenant_status: str
    tenant_plan_code: str | None = None
    billing_in_grace: bool = False
    total_modules: int
    data: list[TenantModuleUsageItemResponse]


class TenantPlanUpdateRequest(BaseModel):
    plan_code: str | None = None


class TenantPlanResponse(BaseModel):
    success: bool
    message: str
    tenant_id: int
    tenant_slug: str
    tenant_status: str
    tenant_plan_code: str | None = None
    tenant_plan_enabled_modules: list[str] | None = None
    tenant_plan_module_limits: dict[str, int] | None = None


class TenantBillingUpdateRequest(BaseModel):
    billing_status: str | None = None
    billing_status_reason: str | None = None
    billing_current_period_ends_at: datetime | None = None
    billing_grace_until: datetime | None = None


class TenantBillingIdentityUpdateRequest(BaseModel):
    billing_provider: str | None = None
    billing_provider_customer_id: str | None = None
    billing_provider_subscription_id: str | None = None


class TenantBillingSyncEventRequest(BaseModel):
    provider: str
    provider_event_id: str
    event_type: str
    billing_status: str | None = None
    billing_status_reason: str | None = None
    billing_current_period_ends_at: datetime | None = None
    billing_grace_until: datetime | None = None
    provider_customer_id: str | None = None
    provider_subscription_id: str | None = None
    raw_payload: dict | None = None


class TenantBillingResponse(BaseModel):
    success: bool
    message: str
    tenant_id: int
    tenant_slug: str
    tenant_status: str
    billing_provider: str | None = None
    billing_provider_customer_id: str | None = None
    billing_provider_subscription_id: str | None = None
    billing_status: str | None = None
    billing_status_reason: str | None = None
    billing_current_period_ends_at: datetime | None = None
    billing_grace_until: datetime | None = None


class TenantBillingSyncEventResponse(BaseModel):
    id: int
    tenant_id: int
    tenant_slug: str
    provider: str
    provider_event_id: str
    provider_customer_id: str | None = None
    provider_subscription_id: str | None = None
    event_type: str
    billing_status: str | None = None
    billing_status_reason: str | None = None
    billing_current_period_ends_at: datetime | None = None
    billing_grace_until: datetime | None = None
    processing_result: str
    recorded_at: datetime


class TenantBillingSyncApplyResponse(BaseModel):
    success: bool
    message: str
    tenant_id: int
    tenant_slug: str
    tenant_status: str
    billing_status: str | None = None
    billing_status_reason: str | None = None
    billing_current_period_ends_at: datetime | None = None
    billing_grace_until: datetime | None = None
    was_duplicate: bool = False
    sync_event: TenantBillingSyncEventResponse


class TenantBillingReconcileResponse(BaseModel):
    success: bool
    message: str
    tenant_id: int
    tenant_slug: str
    tenant_status: str
    billing_status: str | None = None
    billing_status_reason: str | None = None
    billing_current_period_ends_at: datetime | None = None
    billing_grace_until: datetime | None = None
    sync_event: TenantBillingSyncEventResponse


class TenantBillingSyncHistoryResponse(BaseModel):
    success: bool
    message: str
    tenant_id: int
    tenant_slug: str
    provider: str | None = None
    event_type: str | None = None
    processing_result: str | None = None
    total_events: int
    data: list[TenantBillingSyncEventResponse]


class TenantBillingReconcileBatchResponse(BaseModel):
    success: bool
    message: str
    tenant_id: int
    tenant_slug: str
    provider: str | None = None
    event_type: str | None = None
    processing_result: str | None = None
    total_events: int
    data: list[TenantBillingSyncEventResponse]


class TenantBillingSyncSummaryEntryResponse(BaseModel):
    provider: str
    event_type: str
    processing_result: str
    total_events: int
    last_recorded_at: datetime


class TenantBillingSyncSummaryResponse(BaseModel):
    success: bool
    message: str
    tenant_id: int
    tenant_slug: str
    provider: str | None = None
    event_type: str | None = None
    processing_result: str | None = None
    total_rows: int
    data: list[TenantBillingSyncSummaryEntryResponse]


class PlatformBillingSyncSummaryEntryResponse(BaseModel):
    provider: str
    event_type: str
    processing_result: str
    total_events: int
    total_tenants: int
    last_recorded_at: datetime


class PlatformBillingSyncSummaryResponse(BaseModel):
    success: bool
    message: str
    provider: str | None = None
    event_type: str | None = None
    processing_result: str | None = None
    total_rows: int
    data: list[PlatformBillingSyncSummaryEntryResponse]


class PlatformBillingAlertEntryResponse(BaseModel):
    alert_code: str
    severity: str
    provider: str
    event_type: str | None = None
    processing_result: str | None = None
    message: str
    observed_value: int
    threshold_value: int
    total_tenants: int
    last_recorded_at: datetime


class PlatformBillingAlertsResponse(BaseModel):
    success: bool
    message: str
    provider: str | None = None
    event_type: str | None = None
    total_alerts: int
    data: list[PlatformBillingAlertEntryResponse]


class PlatformBillingAlertHistoryEntryResponse(BaseModel):
    id: int
    alert_code: str
    severity: str
    provider: str
    event_type: str | None = None
    processing_result: str | None = None
    message: str
    observed_value: int
    threshold_value: int | None = None
    total_tenants: int
    source_recorded_at: datetime
    recorded_at: datetime


class PlatformBillingAlertHistoryResponse(BaseModel):
    success: bool
    message: str
    total_alerts: int
    data: list[PlatformBillingAlertHistoryEntryResponse]


class TenantAccessPolicyResponse(BaseModel):
    success: bool
    message: str
    tenant_id: int
    tenant_slug: str
    tenant_status: str
    tenant_status_reason: str | None = None
    billing_status: str | None = None
    billing_status_reason: str | None = None
    billing_current_period_ends_at: datetime | None = None
    billing_grace_until: datetime | None = None
    billing_in_grace: bool = False
    access_allowed: bool = True
    access_blocking_source: str | None = None
    access_status_code: int | None = None
    access_detail: str | None = None


class TenantSchemaSyncResponse(BaseModel):
    success: bool
    message: str
    tenant_id: int
    tenant_slug: str
    tenant_status: str
    current_version: str | None = None
    latest_available_version: str | None = None
    pending_count: int = 0
    last_applied_at: datetime | None = None
    applied_now: list[str] = []


class TenantSchemaStatusResponse(BaseModel):
    success: bool
    message: str
    tenant_id: int
    tenant_slug: str
    tenant_status: str
    current_version: str | None = None
    latest_available_version: str | None = None
    pending_count: int = 0
    pending_versions: list[str] = []
    last_applied_at: datetime | None = None


class TenantDbCredentialsRotateResponse(BaseModel):
    success: bool
    message: str
    tenant_id: int
    tenant_slug: str
    tenant_status: str
    env_var_name: str
    rotated_at: datetime | None = None


class TenantStatusUpdateRequest(BaseModel):
    status: str
    status_reason: str | None = None


class TenantRestoreRequest(BaseModel):
    target_status: str = "active"
    restore_reason: str | None = None


class TenantStatusResponse(BaseModel):
    success: bool
    message: str
    tenant_id: int
    tenant_slug: str
    tenant_status: str
    tenant_status_reason: str | None = None


class TenantDeleteResponse(BaseModel):
    success: bool
    message: str
    tenant_id: int
    tenant_slug: str
    tenant_name: str


class TenantPolicyChangeEventResponse(BaseModel):
    id: int
    tenant_id: int
    tenant_slug: str
    event_type: str
    actor_user_id: int | None = None
    actor_email: str | None = None
    actor_role: str | None = None
    previous_state: dict
    new_state: dict
    changed_fields: list[str]
    recorded_at: datetime


class TenantPolicyChangeHistoryResponse(BaseModel):
    success: bool
    message: str
    tenant_id: int
    tenant_slug: str
    event_type: str | None = None
    total_events: int
    data: list[TenantPolicyChangeEventResponse]


class PlatformTenantPolicyChangeHistoryResponse(BaseModel):
    success: bool
    message: str
    event_type: str | None = None
    tenant_slug: str | None = None
    actor_email: str | None = None
    total_events: int
    data: list[TenantPolicyChangeEventResponse]


class ProvisioningJobResponse(BaseModel):
    id: int
    tenant_id: int
    job_type: str
    status: str
    attempts: int = 0
    max_attempts: int = 3
    error_code: str | None = None
    error_message: str | None = None
    next_retry_at: datetime | None = None

    class Config:
        from_attributes = True


class ProvisioningJobTenantSummary(BaseModel):
    tenant_id: int
    tenant_slug: str
    total_jobs: int
    pending_jobs: int
    retry_pending_jobs: int
    running_jobs: int
    completed_jobs: int
    failed_jobs: int
    max_attempts_seen: int


class ProvisioningJobMetricsResponse(BaseModel):
    success: bool
    message: str
    total_tenants: int
    data: list[ProvisioningJobTenantSummary]


class ProvisioningJobTenantJobTypeSummary(BaseModel):
    tenant_id: int
    tenant_slug: str
    job_type: str
    total_jobs: int
    pending_jobs: int
    retry_pending_jobs: int
    running_jobs: int
    completed_jobs: int
    failed_jobs: int
    max_attempts_seen: int


class ProvisioningJobDetailedMetricsResponse(BaseModel):
    success: bool
    message: str
    total_rows: int
    data: list[ProvisioningJobTenantJobTypeSummary]


class ProvisioningJobTenantErrorCodeSummary(BaseModel):
    tenant_id: int
    tenant_slug: str
    error_code: str
    total_jobs: int
    pending_jobs: int
    retry_pending_jobs: int
    running_jobs: int
    completed_jobs: int
    failed_jobs: int
    max_attempts_seen: int


class ProvisioningJobErrorCodeMetricsResponse(BaseModel):
    success: bool
    message: str
    total_rows: int
    data: list[ProvisioningJobTenantErrorCodeSummary]


class ProvisioningJobMetricSnapshotResponse(BaseModel):
    id: int
    capture_key: str
    tenant_id: int
    tenant_slug: str
    total_jobs: int
    pending_jobs: int
    retry_pending_jobs: int
    running_jobs: int
    completed_jobs: int
    failed_jobs: int
    max_attempts_seen: int
    captured_at: datetime

    class Config:
        from_attributes = True


class ProvisioningJobMetricsHistoryResponse(BaseModel):
    success: bool
    message: str
    total_snapshots: int
    data: list[ProvisioningJobMetricSnapshotResponse]


class ProvisioningWorkerCycleTraceResponse(BaseModel):
    id: int
    capture_key: str
    worker_profile: str | None = None
    selection_strategy: str
    eligible_jobs: int
    aged_eligible_jobs: int
    queued_jobs: int
    processed_count: int
    failed_count: int
    stopped_due_to_failure_limit: bool
    duration_ms: int
    priority_order_json: str
    tenant_type_priority_order_json: str
    top_eligible_job_scores_json: str
    captured_at: datetime

    class Config:
        from_attributes = True


class ProvisioningWorkerCycleTraceHistoryResponse(BaseModel):
    success: bool
    message: str
    total_traces: int
    data: list[ProvisioningWorkerCycleTraceResponse]


class ProvisioningOperationalAlertResponse(BaseModel):
    alert_code: str
    severity: str
    source_type: str
    error_code: str | None = None
    tenant_slug: str | None = None
    worker_profile: str | None = None
    capture_key: str
    message: str
    observed_value: int | float | bool
    threshold_value: int | float | bool | None = None
    captured_at: datetime


class ProvisioningOperationalAlertsResponse(BaseModel):
    success: bool
    message: str
    total_alerts: int
    data: list[ProvisioningOperationalAlertResponse]


class ProvisioningOperationalAlertHistoryEntryResponse(BaseModel):
    id: int
    alert_code: str
    severity: str
    source_type: str
    error_code: str | None = None
    tenant_slug: str | None = None
    worker_profile: str | None = None
    capture_key: str
    message: str
    observed_value: int | float | bool | str
    threshold_value: int | float | bool | str | None = None
    source_captured_at: datetime
    recorded_at: datetime


class ProvisioningOperationalAlertHistoryResponse(BaseModel):
    success: bool
    message: str
    total_alerts: int
    data: list[ProvisioningOperationalAlertHistoryEntryResponse]


class ProvisioningBrokerDeadLetterJobResponse(BaseModel):
    job_id: int
    tenant_id: int
    job_type: str
    status: str
    attempts: int = 0
    max_attempts: int = 3
    error_code: str | None = None
    error_message: str | None = None
    recorded_at: datetime


class ProvisioningBrokerDeadLetterResponse(BaseModel):
    success: bool
    message: str
    total_jobs: int
    data: list[ProvisioningBrokerDeadLetterJobResponse]


class ProvisioningBrokerRequeueRequest(BaseModel):
    limit: int = 50
    job_type: str | None = None
    tenant_slug: str | None = None
    error_code: str | None = None
    error_contains: str | None = None
    reset_attempts: bool = True
    delay_seconds: int = 0


class ProvisioningBrokerRequeueResponse(BaseModel):
    success: bool
    message: str
    total_jobs: int
    data: list[ProvisioningJobResponse]
