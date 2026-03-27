import { apiRequest } from "../../../../../services/api";

export type TenantFinanceBeneficiary = {
  id: number;
  name: string;
  icon: string | null;
  note: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type TenantFinanceBeneficiariesResponse = {
  success: boolean;
  message: string;
  total: number;
  data: TenantFinanceBeneficiary[];
};

export type TenantFinanceBeneficiaryMutationResponse = {
  success: boolean;
  message: string;
  data: TenantFinanceBeneficiary;
};

export type TenantFinanceBeneficiaryWriteRequest = {
  name: string;
  icon: string | null;
  note: string | null;
  is_active: boolean;
  sort_order: number;
};

export function getTenantFinanceBeneficiaries(accessToken: string, includeInactive = true) {
  return apiRequest<TenantFinanceBeneficiariesResponse>(
    `/tenant/finance/beneficiaries?include_inactive=${includeInactive ? "true" : "false"}`,
    { token: accessToken }
  );
}

export function createTenantFinanceBeneficiary(
  accessToken: string,
  payload: TenantFinanceBeneficiaryWriteRequest
) {
  return apiRequest<TenantFinanceBeneficiaryMutationResponse>(
    "/tenant/finance/beneficiaries",
    {
      method: "POST",
      token: accessToken,
      body: payload,
    }
  );
}

export function updateTenantFinanceBeneficiary(
  accessToken: string,
  beneficiaryId: number,
  payload: TenantFinanceBeneficiaryWriteRequest
) {
  return apiRequest<TenantFinanceBeneficiaryMutationResponse>(
    `/tenant/finance/beneficiaries/${beneficiaryId}`,
    {
      method: "PUT",
      token: accessToken,
      body: payload,
    }
  );
}

export function updateTenantFinanceBeneficiaryStatus(
  accessToken: string,
  beneficiaryId: number,
  isActive: boolean
) {
  return apiRequest<TenantFinanceBeneficiaryMutationResponse>(
    `/tenant/finance/beneficiaries/${beneficiaryId}/status`,
    {
      method: "PATCH",
      token: accessToken,
      body: { is_active: isActive },
    }
  );
}
