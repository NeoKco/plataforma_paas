import { apiRequest } from "../../../../../services/api";

export type TenantBusinessFunctionProfile = {
  id: number;
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type TenantBusinessFunctionProfilesResponse = {
  success: boolean;
  message: string;
  total: number;
  data: TenantBusinessFunctionProfile[];
};

export type TenantBusinessFunctionProfileMutationResponse = {
  success: boolean;
  message: string;
  data: TenantBusinessFunctionProfile;
};

export type TenantBusinessFunctionProfileWriteRequest = {
  code?: string | null;
  name: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
};

export function getTenantBusinessFunctionProfiles(
  accessToken: string,
  options: { includeInactive?: boolean } = {}
) {
  const params = new URLSearchParams();
  params.set("include_inactive", options.includeInactive === false ? "false" : "true");
  return apiRequest<TenantBusinessFunctionProfilesResponse>(
    `/tenant/business-core/function-profiles?${params.toString()}`,
    { token: accessToken }
  );
}

export function createTenantBusinessFunctionProfile(
  accessToken: string,
  payload: TenantBusinessFunctionProfileWriteRequest
) {
  return apiRequest<TenantBusinessFunctionProfileMutationResponse>(
    "/tenant/business-core/function-profiles",
    { method: "POST", token: accessToken, body: payload }
  );
}

export function updateTenantBusinessFunctionProfile(
  accessToken: string,
  functionProfileId: number,
  payload: TenantBusinessFunctionProfileWriteRequest
) {
  return apiRequest<TenantBusinessFunctionProfileMutationResponse>(
    `/tenant/business-core/function-profiles/${functionProfileId}`,
    { method: "PUT", token: accessToken, body: payload }
  );
}

export function updateTenantBusinessFunctionProfileStatus(
  accessToken: string,
  functionProfileId: number,
  isActive: boolean
) {
  return apiRequest<TenantBusinessFunctionProfileMutationResponse>(
    `/tenant/business-core/function-profiles/${functionProfileId}/status`,
    { method: "PATCH", token: accessToken, body: { is_active: isActive } }
  );
}

export function deleteTenantBusinessFunctionProfile(
  accessToken: string,
  functionProfileId: number
) {
  return apiRequest<TenantBusinessFunctionProfileMutationResponse>(
    `/tenant/business-core/function-profiles/${functionProfileId}`,
    { method: "DELETE", token: accessToken }
  );
}
