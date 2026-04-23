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
  initial_superadmin_full_name: string;
  initial_superadmin_email: string;
  initial_superadmin_password: string;
};

export type InstallSetupResponse = {
  success: boolean;
  message: string;
  initial_superadmin_email?: string | null;
  recovery_key?: string | null;
};

export type PlatformRootRecoveryStatusResponse = {
  success: boolean;
  message: string;
  recovery_configured: boolean;
  has_active_superadmin: boolean;
  recovery_available: boolean;
};

export type PlatformRootRecoveryRequest = {
  recovery_key: string;
  full_name: string;
  email: string;
  password: string;
};

export type PlatformRootRecoveryResponse = {
  success: boolean;
  message: string;
  full_name: string;
  email: string;
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

export type PlatformPlanCatalogEntry = {
  plan_code: string;
  read_requests_per_minute: number | null;
  write_requests_per_minute: number | null;
  enabled_modules: string[] | null;
  module_limits: Record<string, number> | null;
};

export type PlatformModuleDependency = {
  module_key: string;
  requires_modules: string[];
  reason: string | null;
};

export type PlatformBasePlanCatalogEntry = {
  plan_code: string;
  display_name: string;
  description: string | null;
  included_modules: string[];
  compatibility_policy_code: string | null;
  read_requests_per_minute: number | null;
  write_requests_per_minute: number | null;
  module_limits: Record<string, number> | null;
  default_billing_cycle: string;
  allowed_billing_cycles: string[];
  is_default: boolean;
};

export type PlatformModuleSubscriptionCatalogEntry = {
  module_key: string;
  display_name: string;
  description: string | null;
  activation_kind: string;
  billing_cycles: string[];
  is_active: boolean;
};

export type PlatformTenantSubscriptionItem = {
  module_key: string;
  item_kind: string;
  billing_cycle: string | null;
  status: string;
  starts_at: string | null;
  renews_at: string | null;
  ends_at: string | null;
  is_prorated: boolean;
};

export type PlatformCapabilities = {
  success: boolean;
  message: string;
  tenant_statuses: string[];
  tenant_billing_statuses: string[];
  maintenance_scopes: string[];
  maintenance_access_modes: string[];
  plan_modules: string[];
  module_dependency_catalog: PlatformModuleDependency[];
  legacy_plan_fallback_available: boolean;
  subscription_activation_model: string;
  subscription_billing_cycles: string[];
  base_plan_catalog: PlatformBasePlanCatalogEntry[];
  module_subscription_catalog: PlatformModuleSubscriptionCatalogEntry[];
  legacy_plan_catalog: PlatformPlanCatalogEntry[];
  supported_module_limit_keys: string[];
  module_limit_capabilities: PlatformModuleLimitCapability[];
  billing_providers: string[];
  billing_sync_processing_results: string[];
  current_provisioning_dispatch_backend: string;
  provisioning_dispatch_backends: string[];
};

export type PlatformRuntimeSecurityPostureResponse = {
  success: boolean;
  message: string;
  app_env: string;
  production_ready: boolean;
  findings_count: number;
  findings: string[];
  tenant_secrets_runtime: {
    path: string;
    classification: string;
    exists: boolean;
    readable: boolean;
    writable: boolean;
  };
  tenant_secrets_legacy: {
    path: string;
    classification: string;
    exists: boolean;
    readable: boolean;
    writable: boolean;
  };
  tenant_secrets_isolated_from_legacy: boolean;
  tenant_secret_distribution_summary: {
    audited_tenants: number;
    runtime_ready_tenants: number;
    missing_runtime_secret_tenants: number;
    legacy_rescue_available_tenants: number;
    distribution_ready: boolean;
    missing_runtime_secret_slugs: string[];
    legacy_rescue_available_slugs: string[];
  } | null;
};

export type PlatformTenantRuntimeSecretBatchSyncItem = {
  tenant_id: number;
  tenant_slug: string;
  outcome: string;
  detail: string | null;
  source: string | null;
  already_runtime_managed: boolean;
};

export type PlatformTenantRuntimeSecretBatchSyncResponse = {
  success: boolean;
  message: string;
  campaign_id: number | null;
  processed: number;
  synced: number;
  already_runtime_managed: number;
  skipped_not_configured: number;
  skipped_legacy_rescue_required: number;
  failed: number;
  synced_at: string | null;
  data: PlatformTenantRuntimeSecretBatchSyncItem[];
};

export type PlatformTenantRuntimeSecretBatchRequest = {
  tenant_slugs?: string[];
  excluded_tenant_slugs?: string[];
};

export type PlatformTenantDbCredentialsRotateBatchItem = {
  tenant_id: number;
  tenant_slug: string;
  outcome: string;
  detail: string | null;
  env_var_name: string | null;
  managed_secret_path: string | null;
  rotated_at: string | null;
};

export type PlatformTenantDbCredentialsRotateBatchResponse = {
  success: boolean;
  message: string;
  campaign_id: number | null;
  processed: number;
  rotated: number;
  skipped_not_configured: number;
  skipped_legacy_rescue_required: number;
  failed: number;
  rotated_at: string | null;
  data: PlatformTenantDbCredentialsRotateBatchItem[];
};

export type PlatformTenantRuntimeSecretPlanItem = {
  tenant_id: number;
  tenant_slug: string;
  outcome: string;
  recommended_action: string;
  detail: string | null;
  source: string | null;
  eligible_for_sync_batch: boolean;
  eligible_for_rotation_batch: boolean;
};

export type PlatformTenantRuntimeSecretPlanResponse = {
  success: boolean;
  message: string;
  processed: number;
  runtime_ready: number;
  sync_recommended: number;
  skipped_not_configured: number;
  legacy_rescue_required: number;
  missing_secret: number;
  planned_at: string | null;
  data: PlatformTenantRuntimeSecretPlanItem[];
};

export type PlatformTenantRuntimeSecretCampaignItem = {
  id: number;
  tenant_id: number | null;
  tenant_slug: string;
  outcome: string;
  detail: string | null;
  source: string | null;
  env_var_name: string | null;
  managed_secret_path: string | null;
  already_runtime_managed: boolean;
  rotated_at: string | null;
  recorded_at: string | null;
};

export type PlatformTenantRuntimeSecretCampaign = {
  id: number;
  campaign_type: string;
  scope_mode: string;
  tenant_slugs: string[];
  excluded_tenant_slugs: string[];
  processed: number;
  success_count: number;
  already_runtime_managed: number;
  skipped_not_configured: number;
  skipped_legacy_rescue_required: number;
  failed: number;
  actor_user_id: number | null;
  actor_email: string | null;
  actor_role: string | null;
  recorded_at: string | null;
  items: PlatformTenantRuntimeSecretCampaignItem[];
};

export type PlatformTenantRuntimeSecretCampaignListResponse = {
  success: boolean;
  message: string;
  total_campaigns: number;
  data: PlatformTenantRuntimeSecretCampaign[];
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

export type PlatformAuthAuditEvent = {
  id: number;
  event_type: string;
  subject_scope: string;
  outcome: string;
  subject_user_id: number | null;
  tenant_slug: string | null;
  email: string | null;
  token_jti: string | null;
  request_id: string | null;
  request_path: string | null;
  request_method: string | null;
  detail: string | null;
  created_at: string | null;
};

export type PlatformAuthAuditEventListResponse = {
  success: boolean;
  message: string;
  total_events: number;
  data: PlatformAuthAuditEvent[];
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

export type TenantSchemaStatusResponse = {
  success: boolean;
  message: string;
  tenant_slug: string;
  current_version: string | null;
  latest_available_version: string | null;
  pending_count: number;
  pending_versions: string[];
  last_applied_at: string | null;
  latest_job: TenantSchemaJobData | null;
};

export type TenantSchemaSyncResponse = {
  success: boolean;
  message: string;
  tenant_slug: string;
  current_version: string | null;
  latest_available_version: string | null;
  pending_count: number;
  last_applied_at: string | null;
  applied_now: string[];
  queued_job: TenantSchemaJobData | null;
};

export type TenantSchemaJobData = {
  job_id: number;
  job_type: string;
  status: string;
  attempts: number;
  max_attempts: number;
  error_code: string | null;
  error_message: string | null;
  created_at: string | null;
  last_attempt_at: string | null;
  next_retry_at: string | null;
};

export type PlatformTenant = {
  id: number;
  name: string;
  slug: string;
  tenant_type: string;
  db_configured: boolean;
  tenant_schema_version: string | null;
  tenant_schema_synced_at: string | null;
  tenant_db_credentials_rotated_at: string | null;
  plan_code: string | null;
  subscription_contract_managed: boolean;
  legacy_plan_fallback_active: boolean;
  baseline_policy_source: string | null;
  baseline_compatibility_policy_code: string | null;
  billing_provider: string | null;
  billing_provider_customer_id: string | null;
  billing_provider_subscription_id: string | null;
  plan_enabled_modules: string[] | null;
  subscription_base_plan_code: string | null;
  subscription_status: string | null;
  subscription_billing_cycle: string | null;
  subscription_current_period_starts_at: string | null;
  subscription_current_period_ends_at: string | null;
  subscription_next_renewal_at: string | null;
  subscription_grace_until: string | null;
  subscription_is_co_termed: boolean | null;
  subscription_included_modules: string[] | null;
  subscription_addon_modules: string[] | null;
  subscription_technical_modules: string[] | null;
  subscription_legacy_fallback_modules: string[] | null;
  subscription_items: PlatformTenantSubscriptionItem[] | null;
  effective_enabled_modules: string[] | null;
  effective_activation_source: string | null;
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

export type PlatformTenantDataTransferArtifact = {
  id: number;
  artifact_type: string;
  file_name: string;
  content_type: string;
  sha256_hex: string;
  size_bytes: number;
  created_at: string | null;
};

export type TenantDataExportScope =
  | "portable_minimum"
  | "portable_full"
  | "functional_data_only";

export type PlatformTenantDataExportJob = {
  id: number;
  tenant_id: number;
  direction: string;
  data_format: string;
  export_scope: string;
  status: string;
  requested_by_email: string | null;
  error_message: string | null;
  summary_json: string | null;
  created_at: string | null;
  completed_at: string | null;
  artifacts: PlatformTenantDataTransferArtifact[];
};

export type PlatformTenantDataImportJob = PlatformTenantDataExportJob;

export type PlatformTenantDataExportJobCreateRequest = {
  export_scope?: TenantDataExportScope;
};

export type PlatformTenantDataExportJobListResponse = {
  success: boolean;
  message: string;
  total_jobs: number;
  data: PlatformTenantDataExportJob[];
};

export type PlatformTenantDataImportJobListResponse = {
  success: boolean;
  message: string;
  total_jobs: number;
  data: PlatformTenantDataImportJob[];
};

export type PlatformTenantCreateRequest = {
  name: string;
  slug: string;
  tenant_type: string;
  base_plan_code: string | null;
  admin_full_name: string;
  admin_email: string;
  admin_password: string;
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
  subscription_contract_managed: boolean;
  legacy_plan_fallback_active: boolean;
  baseline_policy_source: string | null;
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

export type PlatformTenantDeleteRequest = {
  confirm_tenant_slug: string;
  portable_export_job_id: number;
};

export type PlatformTenantDeleteResponse = {
  success: boolean;
  message: string;
  tenant_id: number;
  tenant_slug: string;
  tenant_name: string;
};

export type PlatformTenantRetirementArchiveItem = {
  id: number;
  original_tenant_id: number;
  tenant_slug: string;
  tenant_name: string;
  tenant_type: string;
  plan_code: string | null;
  tenant_status: string;
  billing_provider: string | null;
  billing_status: string | null;
  billing_events_count: number;
  policy_events_count: number;
  provisioning_jobs_count: number;
  deleted_by_email: string | null;
  tenant_created_at: string | null;
  deleted_at: string;
};

export type PlatformTenantRetirementArchiveListResponse = {
  success: boolean;
  message: string;
  total: number;
  limit: number;
  search: string | null;
  data: PlatformTenantRetirementArchiveItem[];
};

export type PlatformTenantRetirementArchiveDetailResponse = {
  success: boolean;
  message: string;
  data: PlatformTenantRetirementArchiveItem;
  summary: Record<string, unknown>;
};

export type PlatformTenantDeprovisionResponse = {
  success: boolean;
  message: string;
  tenant_id: number;
  tenant_slug: string;
  tenant_status: string;
  dropped_database: boolean;
  dropped_role: boolean;
};

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
  subscription_contract_managed: boolean;
  legacy_plan_fallback_active: boolean;
  baseline_policy_source: string | null;
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
  subscription_contract_managed: boolean;
  legacy_plan_fallback_active: boolean;
  baseline_policy_source: string | null;
  tenant_plan_enabled_modules: string[] | null;
  subscription_base_plan_code: string | null;
  subscription_effective_enabled_modules: string[] | null;
  effective_activation_source: string | null;
  tenant_plan_module_limits: Record<string, number> | null;
};

export type PlatformTenantSubscriptionItemWriteRequest = {
  module_key: string;
  billing_cycle: string;
};

export type PlatformTenantSubscriptionContractResponse = {
  success: boolean;
  message: string;
  tenant_id: number;
  tenant_slug: string;
  tenant_status: string;
  base_plan_code: string;
  subscription_status: string;
  billing_cycle: string;
  current_period_starts_at: string | null;
  current_period_ends_at: string | null;
  next_renewal_at: string | null;
  grace_until: string | null;
  is_co_termed: boolean;
  included_modules: string[] | null;
  addon_modules: string[] | null;
  technical_modules: string[] | null;
  legacy_fallback_modules: string[] | null;
  effective_enabled_modules: string[] | null;
  effective_activation_source: string | null;
  items: PlatformTenantSubscriptionItem[];
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
  subscription_contract_managed: boolean;
  legacy_plan_fallback_active: boolean;
  baseline_policy_source: string | null;
  tenant_plan_module_limits: Record<string, number> | null;
  module_limits: Record<string, number> | null;
};

export type PlatformTenantSchemaSyncResponse = {
  success: boolean;
  message: string;
  tenant_id: number;
  tenant_slug: string;
  tenant_status: string;
  current_version: string | null;
  latest_available_version: string | null;
  pending_count: number;
  last_applied_at: string | null;
  applied_now: string[];
};

export type PlatformTenantSchemaStatusResponse = {
  success: boolean;
  message: string;
  tenant_id: number;
  tenant_slug: string;
  tenant_status: string;
  current_version: string | null;
  latest_available_version: string | null;
  pending_count: number;
  pending_versions: string[];
  last_applied_at: string | null;
};

export type PlatformTenantSchemaAutoSyncJob = {
  tenant_id: number;
  tenant_slug: string;
  job_id: number;
  job_type: string;
  status: string;
};

export type PlatformTenantSchemaAutoSyncResponse = {
  success: boolean;
  message: string;
  limit: number;
  total_tenants: number;
  eligible_tenants: number;
  queued_jobs: number;
  skipped_inactive: number;
  skipped_not_configured: number;
  skipped_live_jobs: number;
  skipped_invalid_credentials: number;
  data: PlatformTenantSchemaAutoSyncJob[];
};

export type PlatformTenantDbCredentialsRotateResponse = {
  success: boolean;
  message: string;
  tenant_id: number;
  tenant_slug: string;
  tenant_status: string;
  env_var_name: string;
  managed_secret_path: string | null;
  rotated_at: string | null;
};

export type PlatformTenantRuntimeSecretSyncResponse = {
  success: boolean;
  message: string;
  tenant_id: number;
  tenant_slug: string;
  tenant_status: string;
  env_var_name: string;
  managed_secret_path: string;
  source: string;
  source_path: string | null;
  already_runtime_managed: boolean;
  synced_at: string | null;
};

export type PlatformTenantUserPasswordResetRequest = {
  email: string;
  new_password: string;
};

export type PlatformTenantUserPasswordResetResponse = {
  success: boolean;
  message: string;
  tenant_id: number;
  tenant_slug: string;
  tenant_status: string;
  user_id: number;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
};

export type PlatformTenantPortalUserItem = {
  id: number;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
};

export type PlatformTenantPortalUsersResponse = {
  success: boolean;
  message: string;
  tenant_id: number;
  tenant_slug: string;
  tenant_status: string;
  total: number;
  data: PlatformTenantPortalUserItem[];
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

export type PlatformTenantPolicyActivityResponse = {
  success: boolean;
  message: string;
  event_type: string | null;
  tenant_slug: string | null;
  actor_email: string | null;
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

export type ProvisioningJobTenantErrorCodeSummary = {
  tenant_id: number;
  tenant_slug: string;
  error_code: string;
  total_jobs: number;
  pending_jobs: number;
  retry_pending_jobs: number;
  running_jobs: number;
  completed_jobs: number;
  failed_jobs: number;
  max_attempts_seen: number;
};

export type ProvisioningJobErrorCodeMetricsResponse = {
  success: boolean;
  message: string;
  total_rows: number;
  data: ProvisioningJobTenantErrorCodeSummary[];
};

export type ProvisioningJobMetricSnapshot = {
  id: number;
  capture_key: string;
  tenant_id: number;
  tenant_slug: string;
  total_jobs: number;
  pending_jobs: number;
  retry_pending_jobs: number;
  running_jobs: number;
  completed_jobs: number;
  failed_jobs: number;
  max_attempts_seen: number;
  captured_at: string;
};

export type ProvisioningJobMetricsHistoryResponse = {
  success: boolean;
  message: string;
  total_snapshots: number;
  data: ProvisioningJobMetricSnapshot[];
};

export type ProvisioningWorkerCycleTrace = {
  id: number;
  capture_key: string;
  worker_profile: string | null;
  selection_strategy: string;
  eligible_jobs: number;
  aged_eligible_jobs: number;
  queued_jobs: number;
  processed_count: number;
  failed_count: number;
  stopped_due_to_failure_limit: boolean;
  duration_ms: number;
  priority_order_json: string;
  tenant_type_priority_order_json: string;
  top_eligible_job_scores_json: string;
  captured_at: string;
};

export type ProvisioningWorkerCycleTraceHistoryResponse = {
  success: boolean;
  message: string;
  total_traces: number;
  data: ProvisioningWorkerCycleTrace[];
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

export type ProvisioningOperationalAlertHistoryEntry = {
  id: number;
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
  source_captured_at: string;
  recorded_at: string;
};

export type ProvisioningOperationalAlertHistoryResponse = {
  success: boolean;
  message: string;
  total_alerts: number;
  data: ProvisioningOperationalAlertHistoryEntry[];
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
  timezone: string | null;
  user_timezone: string | null;
  effective_timezone: string | null;
  plan_code: string | null;
  subscription_contract_managed: boolean;
  legacy_plan_fallback_active: boolean;
  baseline_policy_source: string | null;
  baseline_compatibility_policy_code: string | null;
  plan_enabled_modules: string[] | null;
  subscription_base_plan_code: string | null;
  subscription_status: string | null;
  subscription_billing_cycle: string | null;
  subscription_included_modules: string[] | null;
  subscription_addon_modules: string[] | null;
  subscription_technical_modules: string[] | null;
  subscription_legacy_fallback_modules: string[] | null;
  effective_activation_source: string | null;
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
  maintenance_finance_sync_mode: string;
  maintenance_finance_auto_sync_income: boolean;
  maintenance_finance_auto_sync_expense: boolean;
  maintenance_finance_income_account_id: number | null;
  maintenance_finance_expense_account_id: number | null;
  maintenance_finance_income_category_id: number | null;
  maintenance_finance_expense_category_id: number | null;
  maintenance_finance_currency_id: number | null;
};

export type TenantUserData = {
  id: number;
  email: string;
  role: string;
  timezone: string | null;
  effective_timezone: string | null;
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
  timezone: string | null;
  effective_timezone: string | null;
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

export type TenantUserDeleteResponse = {
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

export type TenantDataTransferArtifact = PlatformTenantDataTransferArtifact;

export type TenantDataExportJob = PlatformTenantDataExportJob;

export type TenantDataImportJob = PlatformTenantDataImportJob;

export type TenantDataExportJobListResponse = {
  success: boolean;
  message: string;
  requested_by: TenantUserContext;
  total_jobs: number;
  data: TenantDataExportJob[];
};

export type TenantDataImportJobListResponse = {
  success: boolean;
  message: string;
  requested_by: TenantUserContext;
  total_jobs: number;
  data: TenantDataImportJob[];
};

export type TenantFinanceSummaryData = {
  total_income: number;
  total_expense: number;
  balance: number;
  net_result: number;
  total_account_balance: number;
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
