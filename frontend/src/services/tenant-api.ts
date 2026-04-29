import type {
  TenantDataExportJob,
  TenantDataExportJobListResponse,
  TenantDataExportScope,
  TenantFinanceEntriesResponse,
  TenantFinanceEntryMutationResponse,
  TenantDataImportJob,
  TenantDataImportJobListResponse,
  TenantFinanceSummaryResponse,
  TenantFinanceUsageResponse,
  TenantInfoResponse,
  TenantLoginResponse,
  TenantModuleUsageResponse,
  TenantSchemaStatusResponse,
  TenantSchemaSyncResponse,
  TenantUserDeleteResponse,
  TenantUserMutationResponse,
  TenantUsersResponse,
} from "../types";
import { apiDownload, apiRequest } from "./api";

export function loginTenant(
  tenantSlug: string,
  email: string,
  password: string
) {
  return apiRequest<TenantLoginResponse>("/tenant/auth/login", {
    method: "POST",
    body: {
      tenant_slug: tenantSlug,
      email,
      password,
    },
  });
}

export function refreshTenantSession(refreshToken: string) {
  return apiRequest<TenantLoginResponse>("/tenant/auth/refresh", {
    method: "POST",
    body: { refresh_token: refreshToken },
  });
}

export function logoutTenant(accessToken: string) {
  return apiRequest<{ success: boolean; message: string }>(
    "/tenant/auth/logout",
    {
      method: "POST",
      token: accessToken,
    }
  );
}

export function getTenantInfo(accessToken: string) {
  return apiRequest<TenantInfoResponse>("/tenant/info", {
    token: accessToken,
  });
}

export function createTenantDataExportJob(
  accessToken: string,
  payload: {
    export_scope?: TenantDataExportScope;
  } = {}
) {
  return apiRequest<TenantDataExportJob>("/tenant/data-export-jobs", {
    method: "POST",
    token: accessToken,
    body: payload,
  });
}

export function listTenantDataExportJobs(
  accessToken: string,
  params?: { limit?: number }
) {
  const query = new URLSearchParams();
  if (params?.limit) {
    query.set("limit", String(params.limit));
  }
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiRequest<TenantDataExportJobListResponse>(
    `/tenant/data-export-jobs${suffix}`,
    {
      token: accessToken,
    }
  );
}

export function createTenantDataImportJob(
  accessToken: string,
  payload: {
    file: File;
    dry_run?: boolean;
    import_strategy?: string;
  }
) {
  const formData = new FormData();
  formData.append("package_file", payload.file);
  formData.append("dry_run", String(payload.dry_run ?? true));
  formData.append("import_strategy", payload.import_strategy ?? "skip_existing");
  return apiRequest<TenantDataImportJob>("/tenant/data-import-jobs", {
    method: "POST",
    token: accessToken,
    body: formData,
  });
}

export function listTenantDataImportJobs(
  accessToken: string,
  params?: { limit?: number }
) {
  const query = new URLSearchParams();
  if (params?.limit) {
    query.set("limit", String(params.limit));
  }
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiRequest<TenantDataImportJobListResponse>(
    `/tenant/data-import-jobs${suffix}`,
    {
      token: accessToken,
    }
  );
}

export async function downloadTenantDataExportJob(
  accessToken: string,
  jobId: number
) {
  const result = await apiDownload(`/tenant/data-export-jobs/${jobId}/download`, {
    token: accessToken,
  });
  const url = URL.createObjectURL(result.blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = result.fileName || `tenant-export-job-${jobId}.zip`;
  link.click();
  URL.revokeObjectURL(url);
}

export function updateTenantTimeZone(
  accessToken: string,
  payload: { timezone: string }
) {
  return apiRequest<{ success: boolean; message: string; tenant_timezone: string }>(
    "/tenant/info/timezone",
    {
      method: "PATCH",
      token: accessToken,
      body: payload,
    }
  );
}

export function updateTenantMaintenanceFinanceSync(
  accessToken: string,
  payload: {
    maintenance_finance_sync_mode: string;
    maintenance_finance_auto_sync_income: boolean;
    maintenance_finance_auto_sync_expense: boolean;
    maintenance_finance_income_account_id?: number | null;
    maintenance_finance_expense_account_id?: number | null;
    maintenance_finance_income_category_id?: number | null;
    maintenance_finance_expense_category_id?: number | null;
    maintenance_finance_currency_id?: number | null;
  }
) {
  return apiRequest<{
    success: boolean;
    message: string;
    data: {
      maintenance_finance_sync_mode: string;
      maintenance_finance_auto_sync_income: boolean;
      maintenance_finance_auto_sync_expense: boolean;
      maintenance_finance_income_account_id: number | null;
      maintenance_finance_expense_account_id: number | null;
      maintenance_finance_income_category_id: number | null;
      maintenance_finance_expense_category_id: number | null;
      maintenance_finance_currency_id: number | null;
    };
  }>("/tenant/info/maintenance-finance-sync", {
    method: "PATCH",
    token: accessToken,
    body: payload,
  });
}

export function getTenantModuleUsage(accessToken: string) {
  return apiRequest<TenantModuleUsageResponse>("/tenant/module-usage", {
    token: accessToken,
  });
}

export function getTenantUsers(accessToken: string) {
  return apiRequest<TenantUsersResponse>("/tenant/users", {
    token: accessToken,
  });
}

export function getTenantSchemaStatus(accessToken: string) {
  return apiRequest<TenantSchemaStatusResponse>("/tenant/schema-status", {
    token: accessToken,
  });
}

export function syncTenantSchema(accessToken: string) {
  return apiRequest<TenantSchemaSyncResponse>("/tenant/sync-schema", {
    method: "POST",
    token: accessToken,
  });
}

export function createTenantUser(
  accessToken: string,
  payload: {
    full_name: string;
    email: string;
    password: string;
    role: string;
    is_active: boolean;
    timezone?: string | null;
    granted_permissions?: string[];
    revoked_permissions?: string[];
  }
) {
  return apiRequest<TenantUserMutationResponse>("/tenant/users", {
    method: "POST",
    token: accessToken,
    body: payload,
  });
}

export function updateTenantUserStatus(
  accessToken: string,
  userId: number,
  payload: {
    is_active: boolean;
  }
) {
  return apiRequest<TenantUserMutationResponse>(`/tenant/users/${userId}/status`, {
    method: "PATCH",
    token: accessToken,
    body: payload,
  });
}

export function updateTenantUser(
  accessToken: string,
  userId: number,
  payload: {
    full_name: string;
    email: string;
    role: string;
    password?: string | null;
    timezone?: string | null;
    granted_permissions?: string[];
    revoked_permissions?: string[];
  }
) {
  return apiRequest<TenantUserMutationResponse>(`/tenant/users/${userId}`, {
    method: "PUT",
    token: accessToken,
    body: payload,
  });
}

export function deleteTenantUser(accessToken: string, userId: number) {
  return apiRequest<TenantUserDeleteResponse>(`/tenant/users/${userId}`, {
    method: "DELETE",
    token: accessToken,
  });
}

export function getTenantFinanceEntries(accessToken: string) {
  return apiRequest<TenantFinanceEntriesResponse>("/tenant/finance/entries", {
    token: accessToken,
  });
}

export function createTenantFinanceEntry(
  accessToken: string,
  payload: {
    movement_type: string;
    concept: string;
    amount: number;
    category: string | null;
  }
) {
  return apiRequest<TenantFinanceEntryMutationResponse>("/tenant/finance/entries", {
    method: "POST",
    token: accessToken,
    body: payload,
  });
}

export function getTenantFinanceSummary(accessToken: string) {
  return apiRequest<TenantFinanceSummaryResponse>("/tenant/finance/summary", {
    token: accessToken,
  });
}

export function getTenantFinanceUsage(accessToken: string) {
  return apiRequest<TenantFinanceUsageResponse>("/tenant/finance/usage", {
    token: accessToken,
  });
}
