import { apiRequest } from "../../../../../services/api";

export type TenantFinanceTag = {
  id: number;
  name: string;
  color: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type TenantFinanceTagsResponse = {
  success: boolean;
  message: string;
  total: number;
  data: TenantFinanceTag[];
};

export type TenantFinanceTagMutationResponse = {
  success: boolean;
  message: string;
  data: TenantFinanceTag;
};

export type TenantFinanceTagWriteRequest = {
  name: string;
  color: string | null;
  is_active: boolean;
  sort_order: number;
};

export function getTenantFinanceTags(accessToken: string, includeInactive = true) {
  return apiRequest<TenantFinanceTagsResponse>(
    `/tenant/finance/tags?include_inactive=${includeInactive ? "true" : "false"}`,
    { token: accessToken }
  );
}

export function createTenantFinanceTag(
  accessToken: string,
  payload: TenantFinanceTagWriteRequest
) {
  return apiRequest<TenantFinanceTagMutationResponse>("/tenant/finance/tags", {
    method: "POST",
    token: accessToken,
    body: payload,
  });
}

export function updateTenantFinanceTag(
  accessToken: string,
  tagId: number,
  payload: TenantFinanceTagWriteRequest
) {
  return apiRequest<TenantFinanceTagMutationResponse>(`/tenant/finance/tags/${tagId}`, {
    method: "PUT",
    token: accessToken,
    body: payload,
  });
}

export function updateTenantFinanceTagStatus(
  accessToken: string,
  tagId: number,
  isActive: boolean
) {
  return apiRequest<TenantFinanceTagMutationResponse>(`/tenant/finance/tags/${tagId}/status`, {
    method: "PATCH",
    token: accessToken,
    body: { is_active: isActive },
  });
}
