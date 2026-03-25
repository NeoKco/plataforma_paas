export type PlatformSession = {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  email: string;
  role: string;
  fullName?: string | null;
  accessTokenExpiresAt: number;
  refreshTokenExpiresAt: number;
  lastActivityAt: number;
};

export type TenantSession = {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  tenantSlug: string;
  userId: number;
  email: string;
  role: string;
  fullName?: string | null;
  accessTokenExpiresAt: number;
  refreshTokenExpiresAt: number;
  lastActivityAt: number;
};

export type ApiErrorPayload = {
  success?: false;
  detail?: string;
  request_id?: string | null;
  errors?: Array<Record<string, unknown>>;
  error_type?: string;
};

export type ApiError = Error & {
  status?: number;
  payload?: ApiErrorPayload;
};

export type HealthStatusResponse = {
  status: string;
  app: string;
  version: string;
  installed: boolean;
};

export type InstallStatusResponse = {
  success: boolean;
  message: string;
};

export type InstallSetupRequest = {
  admin_db_host: string;
  admin_db_port: number;
  admin_db_name: string;
  admin_db_user: string;
  admin_db_password: string;
  control_db_name: string;
  control_db_user: string;
  control_db_password: string;
  app_name: string;
  app_version: string;
};

export type InstallSetupResponse = {
  success: boolean;
  message: string;
};

export type PlatformModuleLimitCapability = {
  key: string;
  module_name: string;
  resource_name: string;
  period: string;
  segment: string | null;
  unit: string;
  description: string | null;
};

export type PlatformCapabilities = {
  success: boolean;
  message: string;
  tenant_statuses: string[];
  tenant_billing_statuses: string[];
  maintenance_scopes: string[];
  maintenance_access_modes: string[];
  available_plan_codes: string[];
  plan_modules: string[];
  supported_module_limit_keys: string[];
  module_limit_capabilities: PlatformModuleLimitCapability[];
  billing_providers: string[];
  billing_sync_processing_results: string[];
  provisioning_dispatch_backends: string[];
};

export type PlatformLoginResponse = {
  success: boolean;
  message: string;
  access_token: string;
  refresh_token: string;
  token_type: string;
  email: string;
  role: string;
  full_name?: string | null;
};

export type PlatformUser = {
  id: number;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string | null;
};

export type PlatformUserListResponse = {
  success: boolean;
  message: string;
  total_users: number;
  data: PlatformUser[];
};

export type PlatformUserCreateRequest = {
  full_name: string;
  email: string;
  role: string;
  password: string;
  is_active: boolean;
};

export type PlatformUserUpdateRequest = {
  full_name: string;
  role: string;
};

export type PlatformUserStatusUpdateRequest = {
  is_active: boolean;
};

export type PlatformUserPasswordResetRequest = {
  new_password: string;
};

export type PlatformUserWriteResponse = {
  success: boolean;
  message: string;
  user_id: number;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
};

export type PlatformUserDeleteResponse = {
  success: boolean;
  message: string;
  user_id: number;
  full_name: string;
  email: string;
  role: string;
};

export type TenantLoginResponse = {
  success: boolean;
  message: string;
  access_token: string;
  refresh_token: string;
  token_type: string;
  tenant_slug: string;
  user_id: number;
  full_name?: string | null;
  email: string;
  role: string;
};

export type PlatformTenant = {
  id: number;
  name: string;
  slug: string;
  tenant_type: string;
  plan_code: string | null;
  billing_provider: string | null;
  billing_provider_customer_id: string | null;
  billing_provider_subscription_id: string | null;
  plan_enabled_modules: string[] | null;
  plan_module_limits: Record<string, number> | null;
  module_limits: Record<string, number> | null;
  billing_status: string | null;
  billing_status_reason: string | null;
  billing_current_period_ends_at: string | null;
  billing_grace_until: string | null;
  status: string;
  status_reason: string | null;
  maintenance_mode: boolean;
  maintenance_starts_at: string | null;
  maintenance_ends_at: string | null;
  maintenance_reason: string | null;
  maintenance_scopes: string[] | null;
  maintenance_access_mode: string;
  api_read_requests_per_minute: number | null;
  api_write_requests_per_minute: number | null;
};

export type PlatformTenantListResponse = {
  success: boolean;
  message: string;
  total_tenants: number;
  data: PlatformTenant[];
};

export type PlatformTenantCreateRequest = {
  name: string;
  slug: string;
  tenant_type: string;
  plan_code: string | null;
};

export type PlatformTenantIdentityResponse = {
  success: boolean;
  message: string;
  tenant_id: number;
  tenant_slug: string;
  tenant_name: string;
  tenant_type: string;
  tenant_status: string;
};

export type PlatformTenantAccessPolicy = {
  success: boolean;
  message: string;
  tenant_id: number;
  tenant_slug: string;
  tenant_status: string;
  tenant_status_reason: string | null;
  billing_status: string | null;
  billing_status_reason: string | null;
  billing_current_period_ends_at: string | null;
  billing_grace_until: string | null;
  billing_in_grace: boolean;
  access_allowed: boolean;
  access_blocking_source: string | null;
  access_status_code: number | null;
  access_detail: string | null;
};

export type PlatformTenantModuleUsageItem = {
  module_name: string;
  module_key: string;
  used_units: number;
  max_units: number | null;
  remaining_units: number | null;
  unlimited: boolean;
  at_limit: boolean;
  limit_source: string | null;
};

export type PlatformTenantModuleUsageSummary = {
  success: boolean;
  message: string;
  tenant_id: number;
  tenant_slug: string;
  tenant_status: string;
  tenant_plan_code: string | null;
  billing_in_grace: boolean;
  total_modules: number;
  data: PlatformTenantModuleUsageItem[];
};

export type PlatformTenantStatusResponse = {
  success: boolean;
  message: string;
  tenant_id: number;
  tenant_slug: string;
  tenant_status: string;
  tenant_status_reason: string | null;
};

export type PlatformTenantRestoreResponse = PlatformTenantStatusResponse;

export type PlatformTenantMaintenanceResponse = {
  success: boolean;
  message: string;
  tenant_id: number;
  tenant_slug: string;
  tenant_status: string;
  maintenance_mode: boolean;
  maintenance_starts_at: string | null;
  maintenance_ends_at: string | null;
  maintenance_reason: string | null;
  maintenance_scopes: string[] | null;
  maintenance_access_mode: string;
  maintenance_active_now: boolean;
};

export type PlatformTenantRateLimitResponse = {
  success: boolean;
  message: string;
  tenant_id: number;
  tenant_slug: string;
  tenant_status: string;
  tenant_plan_code: string | null;
  api_read_requests_per_minute: number | null;
  api_write_requests_per_minute: number | null;
};

export type PlatformTenantPlanResponse = {
  success: boolean;
  message: string;
  tenant_id: number;
  tenant_slug: string;
  tenant_status: string;
  tenant_plan_code: string | null;
  tenant_plan_enabled_modules: string[] | null;
  tenant_plan_module_limits: Record<string, number> | null;
};

export type PlatformTenantBillingResponse = {
  success: boolean;
  message: string;
  tenant_id: number;
  tenant_slug: string;
  tenant_status: string;
  billing_provider: string | null;
  billing_provider_customer_id: string | null;
  billing_provider_subscription_id: string | null;
  billing_status: string | null;
  billing_status_reason: string | null;
  billing_current_period_ends_at: string | null;
  billing_grace_until: string | null;
};

export type PlatformTenantModuleLimitsResponse = {
  success: boolean;
  message: string;
  tenant_id: number;
  tenant_slug: string;
  tenant_status: string;
  tenant_plan_code: string | null;
  tenant_plan_module_limits: Record<string, number> | null;
  module_limits: Record<string, number> | null;
};

export type PlatformTenantSchemaSyncResponse = {
  success: boolean;
  message: string;
  tenant_id: number;
  tenant_slug: string;
  tenant_status: string;
};

export type PlatformTenantPolicyChangeEvent = {
  id: number;
  tenant_id: number;
  tenant_slug: string;
  event_type: string;
  actor_user_id: number | null;
  actor_email: string | null;
  actor_role: string | null;
  previous_state: Record<string, unknown>;
  new_state: Record<string, unknown>;
  changed_fields: string[];
  recorded_at: string;
};

export type PlatformTenantPolicyHistoryResponse = {
  success: boolean;
  message: string;
  tenant_id: number;
  tenant_slug: string;
  event_type: string | null;
  total_events: number;
  data: PlatformTenantPolicyChangeEvent[];
};

export type ProvisioningJob = {
  id: number;
  tenant_id: number;
  job_type: string;
  status: string;
  attempts: number;
  max_attempts: number;
  error_code: string | null;
  error_message: string | null;
  next_retry_at: string | null;
};

export type ProvisioningJobTenantSummary = {
  tenant_id: number;
  tenant_slug: string;
  total_jobs: number;
  pending_jobs: number;
  retry_pending_jobs: number;
  running_jobs: number;
  completed_jobs: number;
  failed_jobs: number;
  max_attempts_seen: number;
};

export type ProvisioningJobMetricsResponse = {
  success: boolean;
  message: string;
  total_tenants: number;
  data: ProvisioningJobTenantSummary[];
};

export type ProvisioningJobTenantJobTypeSummary = {
  tenant_id: number;
  tenant_slug: string;
  job_type: string;
  total_jobs: number;
  pending_jobs: number;
  retry_pending_jobs: number;
  running_jobs: number;
  completed_jobs: number;
  failed_jobs: number;
  max_attempts_seen: number;
};

export type ProvisioningJobDetailedMetricsResponse = {
  success: boolean;
  message: string;
  total_rows: number;
  data: ProvisioningJobTenantJobTypeSummary[];
};

export type ProvisioningOperationalAlert = {
  alert_code: string;
  severity: string;
  source_type: string;
  error_code: string | null;
  tenant_slug: string | null;
  worker_profile: string | null;
  capture_key: string;
  message: string;
  observed_value: number | string | boolean;
  threshold_value: number | string | boolean | null;
  captured_at: string;
};

export type ProvisioningOperationalAlertsResponse = {
  success: boolean;
  message: string;
  total_alerts: number;
  data: ProvisioningOperationalAlert[];
};

export type ProvisioningBrokerDeadLetterJob = {
  job_id: number;
  tenant_id: number;
  job_type: string;
  status: string;
  attempts: number;
  max_attempts: number;
  error_code: string | null;
  error_message: string | null;
  recorded_at: string;
};

export type ProvisioningBrokerDeadLetterResponse = {
  success: boolean;
  message: string;
  total_jobs: number;
  data: ProvisioningBrokerDeadLetterJob[];
};

export type ProvisioningBrokerRequeueResponse = {
  success: boolean;
  message: string;
  total_jobs: number;
  data: ProvisioningJob[];
};

export type TenantBillingSyncEvent = {
  id: number;
  tenant_id: number;
  tenant_slug: string;
  provider: string;
  provider_event_id: string;
  provider_customer_id: string | null;
  provider_subscription_id: string | null;
  event_type: string;
  billing_status: string | null;
  billing_status_reason: string | null;
  billing_current_period_ends_at: string | null;
  billing_grace_until: string | null;
  processing_result: string;
  recorded_at: string;
};

export type TenantBillingSyncHistoryResponse = {
  success: boolean;
  message: string;
  tenant_id: number;
  tenant_slug: string;
  provider: string | null;
  event_type: string | null;
  processing_result: string | null;
  total_events: number;
  data: TenantBillingSyncEvent[];
};

export type TenantBillingSyncSummaryEntry = {
  provider: string;
  event_type: string;
  processing_result: string;
  total_events: number;
  last_recorded_at: string;
};

export type TenantBillingSyncSummaryResponse = {
  success: boolean;
  message: string;
  tenant_id: number;
  tenant_slug: string;
  provider: string | null;
  event_type: string | null;
  processing_result: string | null;
  total_rows: number;
  data: TenantBillingSyncSummaryEntry[];
};

export type PlatformBillingSyncSummaryEntry = {
  provider: string;
  event_type: string;
  processing_result: string;
  total_events: number;
  total_tenants: number;
  last_recorded_at: string;
};

export type PlatformBillingSyncSummaryResponse = {
  success: boolean;
  message: string;
  provider: string | null;
  event_type: string | null;
  processing_result: string | null;
  total_rows: number;
  data: PlatformBillingSyncSummaryEntry[];
};

export type PlatformBillingAlertEntry = {
  alert_code: string;
  severity: string;
  provider: string;
  event_type: string | null;
  processing_result: string | null;
  message: string;
  observed_value: number;
  threshold_value: number;
  total_tenants: number;
  last_recorded_at: string;
};

export type PlatformBillingAlertsResponse = {
  success: boolean;
  message: string;
  provider: string | null;
  event_type: string | null;
  total_alerts: number;
  data: PlatformBillingAlertEntry[];
};

export type PlatformBillingAlertHistoryEntry = {
  id: number;
  alert_code: string;
  severity: string;
  provider: string;
  event_type: string | null;
  processing_result: string | null;
  message: string;
  observed_value: number;
  threshold_value: number | null;
  total_tenants: number;
  source_recorded_at: string;
  recorded_at: string;
};

export type PlatformBillingAlertHistoryResponse = {
  success: boolean;
  message: string;
  total_alerts: number;
  data: PlatformBillingAlertHistoryEntry[];
};

export type TenantUserContext = {
  user_id: number;
  email: string;
  role: string;
  tenant_slug: string;
  token_scope: string;
  maintenance_mode: boolean;
};

export type TenantInfoData = {
  tenant_slug: string;
  tenant_name: string | null;
  tenant_type: string | null;
  plan_code: string | null;
  plan_enabled_modules: string[] | null;
  billing_status: string | null;
  billing_status_reason: string | null;
  billing_current_period_ends_at: string | null;
  billing_grace_until: string | null;
  billing_in_grace: boolean;
  billing_grace_enabled_modules: string[] | null;
  billing_grace_module_limits: Record<string, number> | null;
  billing_grace_api_read_requests_per_minute: number | null;
  billing_grace_api_write_requests_per_minute: number | null;
  tenant_status: string | null;
  tenant_status_reason: string | null;
  access_allowed: boolean;
  access_blocking_source: string | null;
  access_detail: string | null;
  maintenance_mode: boolean;
  maintenance_starts_at: string | null;
  maintenance_ends_at: string | null;
  maintenance_reason: string | null;
  maintenance_scopes: string[] | null;
  maintenance_access_mode: string;
  plan_api_read_requests_per_minute: number | null;
  plan_api_write_requests_per_minute: number | null;
  plan_module_limits: Record<string, number> | null;
  module_limits: Record<string, number> | null;
  api_read_requests_per_minute: number | null;
  api_write_requests_per_minute: number | null;
  effective_enabled_modules: string[] | null;
  effective_module_limits: Record<string, number> | null;
  effective_module_limit_sources: Record<string, string> | null;
  effective_api_read_requests_per_minute: number | null;
  effective_api_write_requests_per_minute: number | null;
};

export type TenantUserData = {
  id: number;
  email: string;
  role: string;
};

export type TenantInfoResponse = {
  success: boolean;
  tenant: TenantInfoData;
  user: TenantUserData;
  token_scope: string;
};

export type TenantModuleUsageItem = {
  module_name: string;
  module_key: string;
  used_units: number;
  max_units: number | null;
  remaining_units: number | null;
  unlimited: boolean;
  at_limit: boolean;
  limit_source: string | null;
};

export type TenantModuleUsageResponse = {
  success: boolean;
  message: string;
  requested_by: TenantUserContext;
  total_modules: number;
  data: TenantModuleUsageItem[];
};

export type TenantUsersItem = {
  id: number;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
};

export type TenantUsersResponse = {
  success: boolean;
  message: string;
  requested_by: TenantUserContext;
  total: number;
  data: TenantUsersItem[];
};

export type TenantUserMutationResponse = {
  success: boolean;
  message: string;
  requested_by: TenantUserContext;
  data: TenantUsersItem;
};

export type TenantFinanceEntryItem = {
  id: number;
  movement_type: string;
  concept: string;
  amount: number;
  category: string | null;
  created_by_user_id: number | null;
};

export type TenantFinanceEntryMutationResponse = {
  success: boolean;
  message: string;
  requested_by: TenantUserContext;
  data: TenantFinanceEntryItem;
};

export type TenantFinanceEntriesResponse = {
  success: boolean;
  message: string;
  requested_by: TenantUserContext;
  total: number;
  data: TenantFinanceEntryItem[];
};

export type TenantFinanceSummaryData = {
  total_income: number;
  total_expense: number;
  balance: number;
  total_entries: number;
};

export type TenantFinanceSummaryResponse = {
  success: boolean;
  message: string;
  requested_by: TenantUserContext;
  data: TenantFinanceSummaryData;
};

export type TenantFinanceUsageData = {
  module_key: string;
  used_entries: number;
  max_entries: number | null;
  remaining_entries: number | null;
  unlimited: boolean;
  at_limit: boolean;
  limit_source: string | null;
};

export type TenantFinanceUsageResponse = {
  success: boolean;
  message: string;
  requested_by: TenantUserContext;
  data: TenantFinanceUsageData;
};

export type TenantBillingReconcileResponse = {
  success: boolean;
  message: string;
  tenant_id: number;
  tenant_slug: string;
  tenant_status: string;
  billing_status: string | null;
  billing_status_reason: string | null;
  billing_current_period_ends_at: string | null;
  billing_grace_until: string | null;
  sync_event: TenantBillingSyncEvent;
};

export type TenantBillingReconcileBatchResponse = {
  success: boolean;
  message: string;
  tenant_id: number;
  tenant_slug: string;
  provider: string | null;
  event_type: string | null;
  processing_result: string | null;
  total_events: number;
  data: TenantBillingSyncEvent[];
};
