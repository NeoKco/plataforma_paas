import { apiRequest } from "../../../../../services/api";

export type TenantBusinessWorkGroup = {
  id: number;
  code: string | null;
  name: string;
  description: string | null;
  group_kind: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type TenantBusinessWorkGroupsResponse = {
  success: boolean;
  message: string;
  total: number;
  data: TenantBusinessWorkGroup[];
};

export type TenantBusinessWorkGroupMutationResponse = {
  success: boolean;
  message: string;
  data: TenantBusinessWorkGroup;
};

export type TenantBusinessWorkGroupWriteRequest = {
  code?: string | null;
  name: string;
  description: string | null;
  group_kind: string;
  is_active: boolean;
  sort_order: number;
};

export function getTenantBusinessWorkGroups(
  accessToken: string,
  options: { includeInactive?: boolean; groupKind?: string } = {}
) {
  const params = new URLSearchParams();
  params.set("include_inactive", options.includeInactive === false ? "false" : "true");
  if (options.groupKind) {
    params.set("group_kind", options.groupKind);
  }
  return apiRequest<TenantBusinessWorkGroupsResponse>(
    `/tenant/business-core/work-groups?${params.toString()}`,
    { token: accessToken }
  );
}

export function createTenantBusinessWorkGroup(
  accessToken: string,
  payload: TenantBusinessWorkGroupWriteRequest
) {
  return apiRequest<TenantBusinessWorkGroupMutationResponse>(
    "/tenant/business-core/work-groups",
    { method: "POST", token: accessToken, body: payload }
  );
}

export function updateTenantBusinessWorkGroup(
  accessToken: string,
  workGroupId: number,
  payload: TenantBusinessWorkGroupWriteRequest
) {
  return apiRequest<TenantBusinessWorkGroupMutationResponse>(
    `/tenant/business-core/work-groups/${workGroupId}`,
    { method: "PUT", token: accessToken, body: payload }
  );
}

export function updateTenantBusinessWorkGroupStatus(
  accessToken: string,
  workGroupId: number,
  isActive: boolean
) {
  return apiRequest<TenantBusinessWorkGroupMutationResponse>(
    `/tenant/business-core/work-groups/${workGroupId}/status`,
    { method: "PATCH", token: accessToken, body: { is_active: isActive } }
  );
}

export function deleteTenantBusinessWorkGroup(
  accessToken: string,
  workGroupId: number
) {
  return apiRequest<TenantBusinessWorkGroupMutationResponse>(
    `/tenant/business-core/work-groups/${workGroupId}`,
    { method: "DELETE", token: accessToken }
  );
}
