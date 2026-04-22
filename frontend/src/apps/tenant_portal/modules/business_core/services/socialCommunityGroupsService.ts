import { apiRequest } from "../../../../../services/api";

export type TenantSocialCommunityGroup = {
  id: number;
  name: string;
  commune: string | null;
  sector: string | null;
  zone: string | null;
  territorial_classification: string | null;
  notes: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type TenantSocialCommunityGroupsResponse = {
  success: boolean;
  message: string;
  total: number;
  data: TenantSocialCommunityGroup[];
};

export type TenantSocialCommunityGroupMutationResponse = {
  success: boolean;
  message: string;
  data: TenantSocialCommunityGroup;
};

export type TenantSocialCommunityGroupWriteRequest = {
  name: string;
  commune: string | null;
  sector: string | null;
  zone: string | null;
  territorial_classification: string | null;
  notes: string | null;
  is_active: boolean;
  sort_order: number;
};

export function getTenantSocialCommunityGroups(
  accessToken: string,
  options: { includeInactive?: boolean } = {}
) {
  const params = new URLSearchParams();
  params.set("include_inactive", options.includeInactive === false ? "false" : "true");
  return apiRequest<TenantSocialCommunityGroupsResponse>(
    `/tenant/business-core/social-community-groups?${params.toString()}`,
    { token: accessToken }
  );
}

export function createTenantSocialCommunityGroup(
  accessToken: string,
  payload: TenantSocialCommunityGroupWriteRequest
) {
  return apiRequest<TenantSocialCommunityGroupMutationResponse>(
    "/tenant/business-core/social-community-groups",
    {
      method: "POST",
      token: accessToken,
      body: payload,
    }
  );
}

export function updateTenantSocialCommunityGroup(
  accessToken: string,
  groupId: number,
  payload: TenantSocialCommunityGroupWriteRequest
) {
  return apiRequest<TenantSocialCommunityGroupMutationResponse>(
    `/tenant/business-core/social-community-groups/${groupId}`,
    {
      method: "PUT",
      token: accessToken,
      body: payload,
    }
  );
}

export function updateTenantSocialCommunityGroupStatus(
  accessToken: string,
  groupId: number,
  isActive: boolean
) {
  return apiRequest<TenantSocialCommunityGroupMutationResponse>(
    `/tenant/business-core/social-community-groups/${groupId}/status`,
    {
      method: "PATCH",
      token: accessToken,
      body: { is_active: isActive },
    }
  );
}

export function deleteTenantSocialCommunityGroup(
  accessToken: string,
  groupId: number
) {
  return apiRequest<TenantSocialCommunityGroupMutationResponse>(
    `/tenant/business-core/social-community-groups/${groupId}`,
    {
      method: "DELETE",
      token: accessToken,
    }
  );
}
