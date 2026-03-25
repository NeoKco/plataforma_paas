import type {
  PlatformCapabilities,
  PlatformLoginResponse,
  PlatformTenant,
  PlatformTenantAccessPolicy,
  PlatformTenantBillingResponse,
  PlatformTenantCreateRequest,
  PlatformTenantIdentityResponse,
  PlatformTenantListResponse,
  PlatformTenantMaintenanceResponse,
  PlatformTenantModuleLimitsResponse,
  PlatformTenantSchemaSyncResponse,
  PlatformTenantModuleUsageSummary,
  PlatformTenantPolicyHistoryResponse,
  PlatformTenantPlanResponse,
  PlatformTenantRateLimitResponse,
  PlatformTenantRestoreResponse,
  PlatformTenantStatusResponse,
  PlatformBillingAlertHistoryResponse,
  PlatformBillingAlertsResponse,
  PlatformBillingSyncSummaryResponse,
  ProvisioningBrokerDeadLetterResponse,
  ProvisioningBrokerRequeueResponse,
  ProvisioningJob,
  ProvisioningJobDetailedMetricsResponse,
  ProvisioningJobMetricsResponse,
  ProvisioningOperationalAlertsResponse,
  TenantBillingReconcileBatchResponse,
  TenantBillingReconcileResponse,
  TenantBillingSyncHistoryResponse,
  TenantBillingSyncSummaryResponse,
} from "../types";
import { apiRequest } from "./api";

export function loginPlatform(email: string, password: string) {
  return apiRequest<PlatformLoginResponse>("/platform/auth/login", {
    method: "POST",
    body: { email, password },
  });
}

export function refreshPlatformSession(refreshToken: string) {
  return apiRequest<PlatformLoginResponse>("/platform/auth/refresh", {
    method: "POST",
    body: { refresh_token: refreshToken },
  });
}

export function logoutPlatform(accessToken: string) {
  return apiRequest<{ success: boolean; message: string }>(
    "/platform/auth/logout",
    {
      method: "POST",
      token: accessToken,
    }
  );
}

export function getPlatformCapabilities(accessToken: string) {
  return apiRequest<PlatformCapabilities>("/platform/capabilities", {
    token: accessToken,
  });
}

export function listPlatformTenants(accessToken: string) {
  return apiRequest<PlatformTenantListResponse>("/platform/tenants/", {
    token: accessToken,
  });
}

export function createPlatformTenant(
  accessToken: string,
  payload: PlatformTenantCreateRequest
) {
  return apiRequest<PlatformTenant>("/platform/tenants/", {
    method: "POST",
    token: accessToken,
    body: payload,
  });
}

export function getPlatformTenant(accessToken: string, tenantId: number) {
  return apiRequest<PlatformTenant>(`/platform/tenants/${tenantId}`, {
    token: accessToken,
  });
}

export function updatePlatformTenantIdentity(
  accessToken: string,
  tenantId: number,
  payload: {
    name: string;
    tenant_type: string;
  }
) {
  return apiRequest<PlatformTenantIdentityResponse>(
    `/platform/tenants/${tenantId}`,
    {
      method: "PATCH",
      token: accessToken,
      body: payload,
    }
  );
}

export function getPlatformTenantAccessPolicy(
  accessToken: string,
  tenantId: number
) {
  return apiRequest<PlatformTenantAccessPolicy>(
    `/platform/tenants/${tenantId}/access-policy`,
    {
      token: accessToken,
    }
  );
}

export function getPlatformTenantModuleUsage(
  accessToken: string,
  tenantId: number
) {
  return apiRequest<PlatformTenantModuleUsageSummary>(
    `/platform/tenants/${tenantId}/module-usage`,
    {
      token: accessToken,
    }
  );
}

export function updatePlatformTenantStatus(
  accessToken: string,
  tenantId: number,
  payload: {
    status: string;
    status_reason: string | null;
  }
) {
  return apiRequest<PlatformTenantStatusResponse>(
    `/platform/tenants/${tenantId}/status`,
    {
      method: "PATCH",
      token: accessToken,
      body: payload,
    }
  );
}

export function restorePlatformTenant(
  accessToken: string,
  tenantId: number,
  payload: {
    target_status: string;
    restore_reason: string | null;
  }
) {
  return apiRequest<PlatformTenantRestoreResponse>(
    `/platform/tenants/${tenantId}/restore`,
    {
      method: "POST",
      token: accessToken,
      body: payload,
    }
  );
}

export function updatePlatformTenantMaintenance(
  accessToken: string,
  tenantId: number,
  payload: {
    maintenance_mode: boolean;
    maintenance_starts_at: string | null;
    maintenance_ends_at: string | null;
    maintenance_reason: string | null;
    maintenance_scopes: string[] | null;
    maintenance_access_mode: string;
  }
) {
  return apiRequest<PlatformTenantMaintenanceResponse>(
    `/platform/tenants/${tenantId}/maintenance`,
    {
      method: "PATCH",
      token: accessToken,
      body: payload,
    }
  );
}

export function updatePlatformTenantBilling(
  accessToken: string,
  tenantId: number,
  payload: {
    billing_status: string | null;
    billing_status_reason: string | null;
    billing_current_period_ends_at: string | null;
    billing_grace_until: string | null;
  }
) {
  return apiRequest<PlatformTenantBillingResponse>(
    `/platform/tenants/${tenantId}/billing`,
    {
      method: "PATCH",
      token: accessToken,
      body: payload,
    }
  );
}

export function updatePlatformTenantPlan(
  accessToken: string,
  tenantId: number,
  payload: {
    plan_code: string | null;
  }
) {
  return apiRequest<PlatformTenantPlanResponse>(
    `/platform/tenants/${tenantId}/plan`,
    {
      method: "PATCH",
      token: accessToken,
      body: payload,
    }
  );
}

export function updatePlatformTenantRateLimits(
  accessToken: string,
  tenantId: number,
  payload: {
    api_read_requests_per_minute: number | null;
    api_write_requests_per_minute: number | null;
  }
) {
  return apiRequest<PlatformTenantRateLimitResponse>(
    `/platform/tenants/${tenantId}/rate-limit`,
    {
      method: "PATCH",
      token: accessToken,
      body: payload,
    }
  );
}

export function updatePlatformTenantModuleLimits(
  accessToken: string,
  tenantId: number,
  payload: {
    module_limits: Record<string, number | null> | null;
  }
) {
  return apiRequest<PlatformTenantModuleLimitsResponse>(
    `/platform/tenants/${tenantId}/module-limits`,
    {
      method: "PATCH",
      token: accessToken,
      body: payload,
    }
  );
}

export function syncPlatformTenantSchema(
  accessToken: string,
  tenantId: number
) {
  return apiRequest<PlatformTenantSchemaSyncResponse>(
    `/platform/tenants/${tenantId}/sync-schema`,
    {
      method: "POST",
      token: accessToken,
    }
  );
}

export function updatePlatformTenantBillingIdentity(
  accessToken: string,
  tenantId: number,
  payload: {
    billing_provider: string | null;
    billing_provider_customer_id: string | null;
    billing_provider_subscription_id: string | null;
  }
) {
  return apiRequest<PlatformTenantBillingResponse>(
    `/platform/tenants/${tenantId}/billing-identity`,
    {
      method: "PATCH",
      token: accessToken,
      body: payload,
    }
  );
}

export function getPlatformTenantPolicyHistory(
  accessToken: string,
  tenantId: number,
  options: {
    eventType?: string | null;
    limit?: number;
  } = {}
) {
  const params = new URLSearchParams();
  if (options.eventType) {
    params.set("event_type", options.eventType);
  }
  if (options.limit !== undefined) {
    params.set("limit", String(options.limit));
  }
  const query = params.toString();

  return apiRequest<PlatformTenantPolicyHistoryResponse>(
    `/platform/tenants/${tenantId}/policy-history${query ? `?${query}` : ""}`,
    {
      token: accessToken,
    }
  );
}

export function listProvisioningJobs(accessToken: string) {
  return apiRequest<ProvisioningJob[]>("/platform/provisioning-jobs/", {
    token: accessToken,
  });
}

export function getProvisioningMetrics(accessToken: string) {
  return apiRequest<ProvisioningJobMetricsResponse>(
    "/platform/provisioning-jobs/metrics",
    {
      token: accessToken,
    }
  );
}

export function getProvisioningMetricsByJobType(accessToken: string) {
  return apiRequest<ProvisioningJobDetailedMetricsResponse>(
    "/platform/provisioning-jobs/metrics/by-job-type",
    {
      token: accessToken,
    }
  );
}

export function getProvisioningAlerts(
  accessToken: string,
  options: {
    tenantSlug?: string | null;
    workerProfile?: string | null;
  } = {}
) {
  const params = new URLSearchParams();
  if (options.tenantSlug) {
    params.set("tenant_slug", options.tenantSlug);
  }
  if (options.workerProfile) {
    params.set("worker_profile", options.workerProfile);
  }
  const query = params.toString();

  return apiRequest<ProvisioningOperationalAlertsResponse>(
    `/platform/provisioning-jobs/metrics/alerts${query ? `?${query}` : ""}`,
    {
      token: accessToken,
    }
  );
}

export function getProvisioningBrokerDlq(
  accessToken: string,
  options: {
    limit?: number;
    jobType?: string | null;
    tenantSlug?: string | null;
    errorCode?: string | null;
    errorContains?: string | null;
  } = {}
) {
  const params = new URLSearchParams();
  if (options.limit !== undefined) {
    params.set("limit", String(options.limit));
  }
  if (options.jobType) {
    params.set("job_type", options.jobType);
  }
  if (options.tenantSlug) {
    params.set("tenant_slug", options.tenantSlug);
  }
  if (options.errorCode) {
    params.set("error_code", options.errorCode);
  }
  if (options.errorContains) {
    params.set("error_contains", options.errorContains);
  }
  const query = params.toString();

  return apiRequest<ProvisioningBrokerDeadLetterResponse>(
    `/platform/provisioning-jobs/broker/dlq${query ? `?${query}` : ""}`,
    {
      token: accessToken,
    }
  );
}

export function requeueProvisioningJob(
  accessToken: string,
  jobId: number,
  options: {
    resetAttempts?: boolean;
    delaySeconds?: number;
  } = {}
) {
  const params = new URLSearchParams();
  params.set("reset_attempts", String(options.resetAttempts ?? true));
  params.set("delay_seconds", String(options.delaySeconds ?? 0));

  return apiRequest<ProvisioningJob>(
    `/platform/provisioning-jobs/${jobId}/requeue?${params.toString()}`,
    {
      method: "POST",
      token: accessToken,
    }
  );
}

export function requeueProvisioningBrokerDlq(
  accessToken: string,
  payload: {
    limit: number;
    job_type: string | null;
    tenant_slug: string | null;
    error_code: string | null;
    error_contains: string | null;
    reset_attempts: boolean;
    delay_seconds: number;
  }
) {
  return apiRequest<ProvisioningBrokerRequeueResponse>(
    "/platform/provisioning-jobs/broker/dlq/requeue",
    {
      method: "POST",
      token: accessToken,
      body: payload,
    }
  );
}

export function getPlatformBillingEventsSummary(
  accessToken: string,
  options: {
    provider?: string | null;
    eventType?: string | null;
    processingResult?: string | null;
  } = {}
) {
  const params = new URLSearchParams();
  if (options.provider) {
    params.set("provider", options.provider);
  }
  if (options.eventType) {
    params.set("event_type", options.eventType);
  }
  if (options.processingResult) {
    params.set("processing_result", options.processingResult);
  }
  const query = params.toString();

  return apiRequest<PlatformBillingSyncSummaryResponse>(
    `/platform/tenants/billing/events/summary${query ? `?${query}` : ""}`,
    {
      token: accessToken,
    }
  );
}

export function getPlatformBillingAlerts(
  accessToken: string,
  options: {
    provider?: string | null;
    eventType?: string | null;
    persistHistory?: boolean;
  } = {}
) {
  const params = new URLSearchParams();
  if (options.provider) {
    params.set("provider", options.provider);
  }
  if (options.eventType) {
    params.set("event_type", options.eventType);
  }
  if (options.persistHistory !== undefined) {
    params.set("persist_history", String(options.persistHistory));
  }
  const query = params.toString();

  return apiRequest<PlatformBillingAlertsResponse>(
    `/platform/tenants/billing/events/alerts${query ? `?${query}` : ""}`,
    {
      token: accessToken,
    }
  );
}

export function getPlatformBillingAlertHistory(
  accessToken: string,
  options: {
    limit?: number;
    provider?: string | null;
    eventType?: string | null;
    processingResult?: string | null;
    alertCode?: string | null;
    severity?: string | null;
  } = {}
) {
  const params = new URLSearchParams();
  if (options.limit !== undefined) {
    params.set("limit", String(options.limit));
  }
  if (options.provider) {
    params.set("provider", options.provider);
  }
  if (options.eventType) {
    params.set("event_type", options.eventType);
  }
  if (options.processingResult) {
    params.set("processing_result", options.processingResult);
  }
  if (options.alertCode) {
    params.set("alert_code", options.alertCode);
  }
  if (options.severity) {
    params.set("severity", options.severity);
  }
  const query = params.toString();

  return apiRequest<PlatformBillingAlertHistoryResponse>(
    `/platform/tenants/billing/events/alerts/history${query ? `?${query}` : ""}`,
    {
      token: accessToken,
    }
  );
}

export function getTenantBillingEvents(
  accessToken: string,
  tenantId: number,
  options: {
    provider?: string | null;
    eventType?: string | null;
    processingResult?: string | null;
    limit?: number;
  } = {}
) {
  const params = new URLSearchParams();
  if (options.provider) {
    params.set("provider", options.provider);
  }
  if (options.eventType) {
    params.set("event_type", options.eventType);
  }
  if (options.processingResult) {
    params.set("processing_result", options.processingResult);
  }
  if (options.limit !== undefined) {
    params.set("limit", String(options.limit));
  }
  const query = params.toString();

  return apiRequest<TenantBillingSyncHistoryResponse>(
    `/platform/tenants/${tenantId}/billing/events${query ? `?${query}` : ""}`,
    {
      token: accessToken,
    }
  );
}

export function getTenantBillingEventsSummary(
  accessToken: string,
  tenantId: number,
  options: {
    provider?: string | null;
    eventType?: string | null;
    processingResult?: string | null;
  } = {}
) {
  const params = new URLSearchParams();
  if (options.provider) {
    params.set("provider", options.provider);
  }
  if (options.eventType) {
    params.set("event_type", options.eventType);
  }
  if (options.processingResult) {
    params.set("processing_result", options.processingResult);
  }
  const query = params.toString();

  return apiRequest<TenantBillingSyncSummaryResponse>(
    `/platform/tenants/${tenantId}/billing/events/summary${query ? `?${query}` : ""}`,
    {
      token: accessToken,
    }
  );
}

export function reconcileTenantBillingEvent(
  accessToken: string,
  tenantId: number,
  syncEventId: number
) {
  return apiRequest<TenantBillingReconcileResponse>(
    `/platform/tenants/${tenantId}/billing/events/${syncEventId}/reconcile`,
    {
      method: "POST",
      token: accessToken,
    }
  );
}

export function reconcileTenantBillingEventsBatch(
  accessToken: string,
  tenantId: number,
  options: {
    provider?: string | null;
    eventType?: string | null;
    processingResult?: string | null;
    limit?: number;
  } = {}
) {
  const params = new URLSearchParams();
  if (options.provider) {
    params.set("provider", options.provider);
  }
  if (options.eventType) {
    params.set("event_type", options.eventType);
  }
  if (options.processingResult) {
    params.set("processing_result", options.processingResult);
  }
  if (options.limit !== undefined) {
    params.set("limit", String(options.limit));
  }
  const query = params.toString();

  return apiRequest<TenantBillingReconcileBatchResponse>(
    `/platform/tenants/${tenantId}/billing/events/reconcile${query ? `?${query}` : ""}`,
    {
      method: "POST",
      token: accessToken,
    }
  );
}
