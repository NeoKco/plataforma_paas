import { apiRequest } from "../../../../../services/api";

export type TenantFinanceProject = {
  id: number;
  name: string;
  code: string | null;
  note: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type TenantFinanceProjectsResponse = {
  success: boolean;
  message: string;
  total: number;
  data: TenantFinanceProject[];
};

export type TenantFinanceProjectMutationResponse = {
  success: boolean;
  message: string;
  data: TenantFinanceProject;
};

export type TenantFinanceProjectWriteRequest = {
  name: string;
  code: string | null;
  note: string | null;
  is_active: boolean;
  sort_order: number;
};

export function getTenantFinanceProjects(accessToken: string, includeInactive = true) {
  return apiRequest<TenantFinanceProjectsResponse>(
    `/tenant/finance/projects?include_inactive=${includeInactive ? "true" : "false"}`,
    { token: accessToken }
  );
}

export function createTenantFinanceProject(
  accessToken: string,
  payload: TenantFinanceProjectWriteRequest
) {
  return apiRequest<TenantFinanceProjectMutationResponse>("/tenant/finance/projects", {
    method: "POST",
    token: accessToken,
    body: payload,
  });
}

export function updateTenantFinanceProject(
  accessToken: string,
  projectId: number,
  payload: TenantFinanceProjectWriteRequest
) {
  return apiRequest<TenantFinanceProjectMutationResponse>(`/tenant/finance/projects/${projectId}`, {
    method: "PUT",
    token: accessToken,
    body: payload,
  });
}

export function updateTenantFinanceProjectStatus(
  accessToken: string,
  projectId: number,
  isActive: boolean
) {
  return apiRequest<TenantFinanceProjectMutationResponse>(
    `/tenant/finance/projects/${projectId}/status`,
    {
      method: "PATCH",
      token: accessToken,
      body: { is_active: isActive },
    }
  );
}
