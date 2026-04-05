import { apiRequest } from "../../../../../services/api";

export type TenantBusinessTaskType = {
  id: number;
  code: string;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  is_active: boolean;
  sort_order: number;
  compatible_function_profile_ids: number[];
  compatible_function_profile_names: string[];
  created_at: string;
  updated_at: string;
};

export type TenantBusinessTaskTypesResponse = {
  success: boolean;
  message: string;
  total: number;
  data: TenantBusinessTaskType[];
};

export type TenantBusinessTaskTypeMutationResponse = {
  success: boolean;
  message: string;
  data: TenantBusinessTaskType;
};

export type TenantBusinessTaskTypeWriteRequest = {
  code?: string | null;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  is_active: boolean;
  sort_order: number;
  compatible_function_profile_ids: number[];
};

export function getTenantBusinessTaskTypes(
  accessToken: string,
  options: { includeInactive?: boolean } = {}
) {
  const params = new URLSearchParams();
  params.set("include_inactive", options.includeInactive === false ? "false" : "true");
  return apiRequest<TenantBusinessTaskTypesResponse>(
    `/tenant/business-core/task-types?${params.toString()}`,
    { token: accessToken }
  );
}

export function createTenantBusinessTaskType(
  accessToken: string,
  payload: TenantBusinessTaskTypeWriteRequest
) {
  return apiRequest<TenantBusinessTaskTypeMutationResponse>(
    "/tenant/business-core/task-types",
    { method: "POST", token: accessToken, body: payload }
  );
}

export function updateTenantBusinessTaskType(
  accessToken: string,
  taskTypeId: number,
  payload: TenantBusinessTaskTypeWriteRequest
) {
  return apiRequest<TenantBusinessTaskTypeMutationResponse>(
    `/tenant/business-core/task-types/${taskTypeId}`,
    { method: "PUT", token: accessToken, body: payload }
  );
}

export function updateTenantBusinessTaskTypeStatus(
  accessToken: string,
  taskTypeId: number,
  isActive: boolean
) {
  return apiRequest<TenantBusinessTaskTypeMutationResponse>(
    `/tenant/business-core/task-types/${taskTypeId}/status`,
    { method: "PATCH", token: accessToken, body: { is_active: isActive } }
  );
}

export function deleteTenantBusinessTaskType(
  accessToken: string,
  taskTypeId: number
) {
  return apiRequest<TenantBusinessTaskTypeMutationResponse>(
    `/tenant/business-core/task-types/${taskTypeId}`,
    { method: "DELETE", token: accessToken }
  );
}
