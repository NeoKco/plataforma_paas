import { apiRequest } from "../../../../../services/api";

export type TenantFinanceAccount = {
  id: number;
  name: string;
  code: string | null;
  account_type: string;
  currency_id: number;
  parent_account_id: number | null;
  opening_balance: number;
  opening_balance_at: string | null;
  icon: string | null;
  is_favorite: boolean;
  is_balance_hidden: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type TenantFinanceAccountsResponse = {
  success: boolean;
  message: string;
  total: number;
  data: TenantFinanceAccount[];
};

export type TenantFinanceAccountMutationResponse = {
  success: boolean;
  message: string;
  data: TenantFinanceAccount;
};

export type TenantFinanceAccountWriteRequest = {
  name: string;
  code: string | null;
  account_type: string;
  currency_id: number;
  parent_account_id: number | null;
  opening_balance: number;
  opening_balance_at: string | null;
  icon: string | null;
  is_favorite: boolean;
  is_balance_hidden: boolean;
  is_active: boolean;
  sort_order: number;
};

export function getTenantFinanceAccounts(accessToken: string, includeInactive = true) {
  return apiRequest<TenantFinanceAccountsResponse>(
    `/tenant/finance/accounts?include_inactive=${includeInactive ? "true" : "false"}`,
    { token: accessToken }
  );
}

export function createTenantFinanceAccount(
  accessToken: string,
  payload: TenantFinanceAccountWriteRequest
) {
  return apiRequest<TenantFinanceAccountMutationResponse>("/tenant/finance/accounts", {
    method: "POST",
    token: accessToken,
    body: payload,
  });
}

export function updateTenantFinanceAccount(
  accessToken: string,
  accountId: number,
  payload: TenantFinanceAccountWriteRequest
) {
  return apiRequest<TenantFinanceAccountMutationResponse>(`/tenant/finance/accounts/${accountId}`, {
    method: "PUT",
    token: accessToken,
    body: payload,
  });
}

export function updateTenantFinanceAccountStatus(
  accessToken: string,
  accountId: number,
  isActive: boolean
) {
  return apiRequest<TenantFinanceAccountMutationResponse>(
    `/tenant/finance/accounts/${accountId}/status`,
    {
      method: "PATCH",
      token: accessToken,
      body: { is_active: isActive },
    }
  );
}
