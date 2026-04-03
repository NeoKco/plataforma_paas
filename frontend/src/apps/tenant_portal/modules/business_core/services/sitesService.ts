import { apiRequest } from "../../../../../services/api";

export type TenantBusinessSite = {
  id: number;
  client_id: number;
  name: string;
  site_code: string | null;
  address_line: string | null;
  commune: string | null;
  city: string | null;
  region: string | null;
  country_code: string | null;
  reference_notes: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type TenantBusinessSitesResponse = {
  success: boolean;
  message: string;
  total: number;
  data: TenantBusinessSite[];
};

export type TenantBusinessSiteMutationResponse = {
  success: boolean;
  message: string;
  data: TenantBusinessSite;
};

export type TenantBusinessSiteWriteRequest = {
  client_id: number;
  name: string;
  site_code: string | null;
  address_line: string | null;
  commune: string | null;
  city: string | null;
  region: string | null;
  country_code: string | null;
  reference_notes: string | null;
  is_active: boolean;
  sort_order: number;
};

export function getTenantBusinessSites(
  accessToken: string,
  options: { includeInactive?: boolean; clientId?: number } = {}
) {
  const params = new URLSearchParams();
  params.set("include_inactive", options.includeInactive === false ? "false" : "true");
  if (options.clientId !== undefined) {
    params.set("client_id", String(options.clientId));
  }
  return apiRequest<TenantBusinessSitesResponse>(
    `/tenant/business-core/sites?${params.toString()}`,
    { token: accessToken }
  );
}

export function createTenantBusinessSite(
  accessToken: string,
  payload: TenantBusinessSiteWriteRequest
) {
  return apiRequest<TenantBusinessSiteMutationResponse>("/tenant/business-core/sites", {
    method: "POST",
    token: accessToken,
    body: payload,
  });
}

export function updateTenantBusinessSite(
  accessToken: string,
  siteId: number,
  payload: TenantBusinessSiteWriteRequest
) {
  return apiRequest<TenantBusinessSiteMutationResponse>(
    `/tenant/business-core/sites/${siteId}`,
    {
      method: "PUT",
      token: accessToken,
      body: payload,
    }
  );
}

export function updateTenantBusinessSiteStatus(
  accessToken: string,
  siteId: number,
  isActive: boolean
) {
  return apiRequest<TenantBusinessSiteMutationResponse>(
    `/tenant/business-core/sites/${siteId}/status`,
    {
      method: "PATCH",
      token: accessToken,
      body: { is_active: isActive },
    }
  );
}

export function deleteTenantBusinessSite(accessToken: string, siteId: number) {
  return apiRequest<TenantBusinessSiteMutationResponse>(
    `/tenant/business-core/sites/${siteId}`,
    {
      method: "DELETE",
      token: accessToken,
    }
  );
}
