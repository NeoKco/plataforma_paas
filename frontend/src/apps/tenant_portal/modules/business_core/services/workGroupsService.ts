import { apiRequest } from "../../../../../services/api";

export type TenantBusinessWorkGroup = {
  id: number;
  code: string | null;
  name: string;
  description: string | null;
  group_kind: string;
  is_active: boolean;
  sort_order: number;
  member_count: number;
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

export type TenantBusinessWorkGroupMember = {
  id: number;
  group_id: number;
  tenant_user_id: number;
  function_profile_id: number | null;
  is_primary: boolean;
  is_lead: boolean;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  notes: string | null;
  user_full_name: string | null;
  user_email: string | null;
  function_profile_name: string | null;
  created_at: string;
  updated_at: string;
};

export type TenantBusinessWorkGroupMembersResponse = {
  success: boolean;
  message: string;
  total: number;
  data: TenantBusinessWorkGroupMember[];
};

export type TenantBusinessWorkGroupMemberMutationResponse = {
  success: boolean;
  message: string;
  data: TenantBusinessWorkGroupMember;
};

export type TenantBusinessWorkGroupMemberWriteRequest = {
  tenant_user_id: number;
  function_profile_id: number | null;
  is_primary: boolean;
  is_lead: boolean;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  notes: string | null;
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

export function getTenantBusinessWorkGroup(
  accessToken: string,
  workGroupId: number
) {
  return apiRequest<TenantBusinessWorkGroupMutationResponse>(
    `/tenant/business-core/work-groups/${workGroupId}`,
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

export function getTenantBusinessWorkGroupMembers(
  accessToken: string,
  workGroupId: number
) {
  return apiRequest<TenantBusinessWorkGroupMembersResponse>(
    `/tenant/business-core/work-groups/${workGroupId}/members`,
    { token: accessToken }
  );
}

export function createTenantBusinessWorkGroupMember(
  accessToken: string,
  workGroupId: number,
  payload: TenantBusinessWorkGroupMemberWriteRequest
) {
  return apiRequest<TenantBusinessWorkGroupMemberMutationResponse>(
    `/tenant/business-core/work-groups/${workGroupId}/members`,
    { method: "POST", token: accessToken, body: payload }
  );
}

export function updateTenantBusinessWorkGroupMember(
  accessToken: string,
  workGroupId: number,
  memberId: number,
  payload: TenantBusinessWorkGroupMemberWriteRequest
) {
  return apiRequest<TenantBusinessWorkGroupMemberMutationResponse>(
    `/tenant/business-core/work-groups/${workGroupId}/members/${memberId}`,
    { method: "PUT", token: accessToken, body: payload }
  );
}

export function deleteTenantBusinessWorkGroupMember(
  accessToken: string,
  workGroupId: number,
  memberId: number
) {
  return apiRequest<TenantBusinessWorkGroupMemberMutationResponse>(
    `/tenant/business-core/work-groups/${workGroupId}/members/${memberId}`,
    { method: "DELETE", token: accessToken }
  );
}
