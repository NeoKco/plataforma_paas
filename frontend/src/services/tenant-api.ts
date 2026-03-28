import type {
  TenantFinanceEntriesResponse,
  TenantFinanceEntryMutationResponse,
  TenantFinanceSummaryResponse,
  TenantFinanceUsageResponse,
  TenantInfoResponse,
  TenantLoginResponse,
  TenantModuleUsageResponse,
  TenantSchemaStatusResponse,
  TenantSchemaSyncResponse,
  TenantUserMutationResponse,
  TenantUsersResponse,
} from "../types";
import { apiRequest } from "./api";

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
