import { apiRequest } from "../../../../../services/api";

export type TenantFinanceSetting = {
  id: number;
  setting_key: string;
  setting_value: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type TenantFinanceSettingsResponse = {
  success: boolean;
  message: string;
  total: number;
  data: TenantFinanceSetting[];
};

export type TenantFinanceSettingMutationResponse = {
  success: boolean;
  message: string;
  data: TenantFinanceSetting;
};

export type TenantFinanceSettingWriteRequest = {
  setting_key: string;
  setting_value: string;
  is_active: boolean;
};

export function getTenantFinanceSettings(accessToken: string, includeInactive = true) {
  return apiRequest<TenantFinanceSettingsResponse>(
    `/tenant/finance/settings?include_inactive=${includeInactive ? "true" : "false"}`,
    { token: accessToken }
  );
}

export function createTenantFinanceSetting(
  accessToken: string,
  payload: TenantFinanceSettingWriteRequest
) {
  return apiRequest<TenantFinanceSettingMutationResponse>("/tenant/finance/settings", {
    method: "POST",
    token: accessToken,
    body: payload,
  });
}

export function updateTenantFinanceSetting(
  accessToken: string,
  settingId: number,
  payload: TenantFinanceSettingWriteRequest
) {
  return apiRequest<TenantFinanceSettingMutationResponse>(`/tenant/finance/settings/${settingId}`, {
    method: "PUT",
    token: accessToken,
    body: payload,
  });
}

export function updateTenantFinanceSettingStatus(
  accessToken: string,
  settingId: number,
  isActive: boolean
) {
  return apiRequest<TenantFinanceSettingMutationResponse>(
    `/tenant/finance/settings/${settingId}/status`,
    {
      method: "PATCH",
      token: accessToken,
      body: { is_active: isActive },
    }
  );
}
