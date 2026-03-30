import { apiRequest } from "../../../../../services/api";

export type TenantFinancePerson = {
  id: number;
  name: string;
  icon: string | null;
  note: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type TenantFinancePeopleResponse = {
  success: boolean;
  message: string;
  total: number;
  data: TenantFinancePerson[];
};

export type TenantFinancePersonMutationResponse = {
  success: boolean;
  message: string;
  data: TenantFinancePerson;
};

export type TenantFinancePersonWriteRequest = {
  name: string;
  icon: string | null;
  note: string | null;
  is_active: boolean;
  sort_order: number;
};

export function getTenantFinancePeople(accessToken: string, includeInactive = true) {
  return apiRequest<TenantFinancePeopleResponse>(
    `/tenant/finance/people?include_inactive=${includeInactive ? "true" : "false"}`,
    { token: accessToken }
  );
}

export function createTenantFinancePerson(
  accessToken: string,
  payload: TenantFinancePersonWriteRequest
) {
  return apiRequest<TenantFinancePersonMutationResponse>("/tenant/finance/people", {
    method: "POST",
    token: accessToken,
    body: payload,
  });
}

export function updateTenantFinancePerson(
  accessToken: string,
  personId: number,
  payload: TenantFinancePersonWriteRequest
) {
  return apiRequest<TenantFinancePersonMutationResponse>(`/tenant/finance/people/${personId}`, {
    method: "PUT",
    token: accessToken,
    body: payload,
  });
}

export function updateTenantFinancePersonStatus(
  accessToken: string,
  personId: number,
  isActive: boolean
) {
  return apiRequest<TenantFinancePersonMutationResponse>(
    `/tenant/finance/people/${personId}/status`,
    {
      method: "PATCH",
      token: accessToken,
      body: { is_active: isActive },
    }
  );
}

export function deleteTenantFinancePerson(accessToken: string, personId: number) {
  return apiRequest<TenantFinancePersonMutationResponse>(`/tenant/finance/people/${personId}`, {
    method: "DELETE",
    token: accessToken,
  });
}
