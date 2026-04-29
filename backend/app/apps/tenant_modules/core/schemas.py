from datetime import datetime

from pydantic import BaseModel


class TenantLoginRequest(BaseModel):
    tenant_slug: str
    email: str
    password: str


class TenantLoginResponse(BaseModel):
    success: bool
    message: str
    access_token: str | None = None
    refresh_token: str | None = None
    token_type: str | None = None
    tenant_slug: str | None = None
    user_id: int | None = None
    full_name: str | None = None
    email: str | None = None
    role: str | None = None


class TenantRefreshTokenRequest(BaseModel):
    refresh_token: str


class TenantLogoutResponse(BaseModel):
    success: bool
    message: str
    revoked_refresh_tokens: int = 0


class TenantHealthResponse(BaseModel):
    status: str
    scope: str


class TenantUserContextResponse(BaseModel):
    user_id: int
    email: str
    role: str
    tenant_slug: str
    token_scope: str
    maintenance_mode: bool = False


class TenantMeResponse(BaseModel):
    success: bool
    message: str
    data: TenantUserContextResponse


class TenantInfoData(BaseModel):
    tenant_slug: str
    tenant_name: str | None = None
    tenant_type: str | None = None
    timezone: str | None = None
    user_timezone: str | None = None
    effective_timezone: str | None = None
    plan_code: str | None = None
    subscription_contract_managed: bool = False
    legacy_plan_fallback_active: bool = False
    baseline_policy_source: str | None = None
    baseline_compatibility_policy_code: str | None = None
    plan_enabled_modules: list[str] | None = None
    subscription_base_plan_code: str | None = None
    subscription_status: str | None = None
    subscription_billing_cycle: str | None = None
    subscription_included_modules: list[str] | None = None
    subscription_addon_modules: list[str] | None = None
    subscription_technical_modules: list[str] | None = None
    subscription_legacy_fallback_modules: list[str] | None = None
    effective_activation_source: str | None = None
    billing_status: str | None = None
    billing_status_reason: str | None = None
    billing_current_period_ends_at: datetime | None = None
    billing_grace_until: datetime | None = None
    billing_in_grace: bool = False
    billing_grace_enabled_modules: list[str] | None = None
    billing_grace_module_limits: dict[str, int] | None = None
    billing_grace_api_read_requests_per_minute: int | None = None
    billing_grace_api_write_requests_per_minute: int | None = None
    tenant_status: str | None = None
    tenant_status_reason: str | None = None
    access_allowed: bool = True
    access_blocking_source: str | None = None
    access_detail: str | None = None
    maintenance_mode: bool = False
    maintenance_starts_at: datetime | None = None
    maintenance_ends_at: datetime | None = None
    maintenance_reason: str | None = None
    maintenance_scopes: list[str] | None = None
    maintenance_access_mode: str = "write_block"
    plan_api_read_requests_per_minute: int | None = None
    plan_api_write_requests_per_minute: int | None = None
    plan_module_limits: dict[str, int] | None = None
    module_limits: dict[str, int] | None = None
    api_read_requests_per_minute: int | None = None
    api_write_requests_per_minute: int | None = None
    effective_enabled_modules: list[str] | None = None
    effective_module_limits: dict[str, int] | None = None
    effective_module_limit_sources: dict[str, str] | None = None
    effective_api_read_requests_per_minute: int | None = None
    effective_api_write_requests_per_minute: int | None = None
    maintenance_finance_sync_mode: str = "auto_on_close"
    maintenance_finance_auto_sync_income: bool = True
    maintenance_finance_auto_sync_expense: bool = True
    maintenance_finance_income_account_id: int | None = None
    maintenance_finance_expense_account_id: int | None = None
    maintenance_finance_income_category_id: int | None = None
    maintenance_finance_expense_category_id: int | None = None
    maintenance_finance_currency_id: int | None = None


class TenantUserData(BaseModel):
    id: int
    email: str
    role: str
    permissions: list[str] = []
    effective_permissions: list[str] = []
    timezone: str | None = None
    effective_timezone: str | None = None


class TenantInfoResponse(BaseModel):
    success: bool
    tenant: TenantInfoData
    user: TenantUserData
    token_scope: str
    ui_label_catalog: dict[str, dict[str, dict[str, str]]]


class TenantModuleUsageItemResponse(BaseModel):
    module_name: str
    module_key: str
    used_units: int
    max_units: int | None = None
    remaining_units: int | None = None
    unlimited: bool = False
    at_limit: bool = False
    limit_source: str | None = None


class TenantModuleUsageResponse(BaseModel):
    success: bool
    message: str
    requested_by: TenantUserContextResponse
    total_modules: int
    data: list[TenantModuleUsageItemResponse]


class TenantDataExportJobCreateRequest(BaseModel):
    export_scope: str = "portable_full"


class TenantDataTransferArtifactResponse(BaseModel):
    id: int
    artifact_type: str
    file_name: str
    content_type: str
    sha256_hex: str
    size_bytes: int
    created_at: datetime | None = None


class TenantDataExportJobResponse(BaseModel):
    id: int
    tenant_id: int
    direction: str
    data_format: str
    export_scope: str
    status: str
    requested_by_email: str | None = None
    error_message: str | None = None
    summary_json: str | None = None
    created_at: datetime | None = None
    completed_at: datetime | None = None
    artifacts: list[TenantDataTransferArtifactResponse] = []


class TenantDataExportJobListResponse(BaseModel):
    success: bool
    message: str
    requested_by: TenantUserContextResponse
    total_jobs: int
    data: list[TenantDataExportJobResponse]


class TenantDataImportJobResponse(TenantDataExportJobResponse):
    pass


class TenantDataImportJobListResponse(BaseModel):
    success: bool
    message: str
    requested_by: TenantUserContextResponse
    total_jobs: int
    data: list[TenantDataImportJobResponse]


class TenantDbInfoPayload(BaseModel):
    tenant_name: str | None = None
    tenant_slug: str | None = None
    tenant_type: str | None = None


class TenantDbInfoResponse(BaseModel):
    success: bool
    message: str
    auth_context: TenantUserContextResponse
    tenant_info: TenantDbInfoPayload


class TenantDbUserData(BaseModel):
    id: int
    full_name: str
    email: str
    role: str
    is_active: bool


class TenantUserCreateRequest(BaseModel):
    full_name: str
    email: str
    password: str
    role: str = "operator"
    is_active: bool = True
    timezone: str | None = None
    granted_permissions: list[str] = []
    revoked_permissions: list[str] = []


class TenantUserUpdateRequest(BaseModel):
    full_name: str
    email: str
    role: str
    password: str | None = None
    timezone: str | None = None
    granted_permissions: list[str] = []
    revoked_permissions: list[str] = []


class TenantTimezoneUpdateRequest(BaseModel):
    timezone: str


class TenantMaintenanceFinanceSyncUpdateRequest(BaseModel):
    maintenance_finance_sync_mode: str = "auto_on_close"
    maintenance_finance_auto_sync_income: bool = True
    maintenance_finance_auto_sync_expense: bool = True
    maintenance_finance_income_account_id: int | None = None
    maintenance_finance_expense_account_id: int | None = None
    maintenance_finance_income_category_id: int | None = None
    maintenance_finance_expense_category_id: int | None = None
    maintenance_finance_currency_id: int | None = None


class TenantUserStatusUpdateRequest(BaseModel):
    is_active: bool


class TenantMeDbResponse(BaseModel):
    success: bool
    message: str
    auth_context: TenantUserContextResponse
    db_user: TenantDbUserData | None = None


class TenantUsersItemResponse(BaseModel):
    id: int
    full_name: str
    email: str
    role: str
    timezone: str | None = None
    effective_timezone: str | None = None
    granted_permissions: list[str] = []
    revoked_permissions: list[str] = []
    effective_permissions: list[str] = []
    is_active: bool


class TenantUsersResponse(BaseModel):
    success: bool
    message: str
    requested_by: TenantUserContextResponse
    total: int
    data: list[TenantUsersItemResponse]


class TenantUserDetailResponse(BaseModel):
    success: bool
    message: str
    requested_by: TenantUserContextResponse
    data: TenantUsersItemResponse


class TenantUserMutationResponse(BaseModel):
    success: bool
    message: str
    requested_by: TenantUserContextResponse
    data: TenantUsersItemResponse


class TenantUserDeleteResponse(BaseModel):
    success: bool
    message: str
    requested_by: TenantUserContextResponse
    data: TenantUsersItemResponse


class TenantTimezoneMutationResponse(BaseModel):
    success: bool
    message: str
    requested_by: TenantUserContextResponse
    tenant_timezone: str


class TenantMaintenanceFinanceSyncData(BaseModel):
    maintenance_finance_sync_mode: str = "auto_on_close"
    maintenance_finance_auto_sync_income: bool = True
    maintenance_finance_auto_sync_expense: bool = True
    maintenance_finance_income_account_id: int | None = None
    maintenance_finance_expense_account_id: int | None = None
    maintenance_finance_income_category_id: int | None = None
    maintenance_finance_expense_category_id: int | None = None
    maintenance_finance_currency_id: int | None = None


class TenantMaintenanceFinanceSyncMutationResponse(BaseModel):
    success: bool
    message: str
    requested_by: TenantUserContextResponse
    data: TenantMaintenanceFinanceSyncData


class TenantSchemaJobData(BaseModel):
    job_id: int
    job_type: str
    status: str
    attempts: int = 0
    max_attempts: int = 3
    error_code: str | None = None
    error_message: str | None = None
    created_at: datetime | None = None
    last_attempt_at: datetime | None = None
    next_retry_at: datetime | None = None


class TenantSchemaStatusResponse(BaseModel):
    success: bool
    message: str
    requested_by: TenantUserContextResponse
    tenant_slug: str
    current_version: str | None = None
    latest_available_version: str | None = None
    pending_count: int = 0
    pending_versions: list[str] = []
    last_applied_at: datetime | None = None
    latest_job: TenantSchemaJobData | None = None


class TenantSchemaSyncResponse(BaseModel):
    success: bool
    message: str
    requested_by: TenantUserContextResponse
    tenant_slug: str
    current_version: str | None = None
    latest_available_version: str | None = None
    pending_count: int = 0
    last_applied_at: datetime | None = None
    applied_now: list[str] = []
    queued_job: TenantSchemaJobData | None = None
