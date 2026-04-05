import { apiRequest } from "../../../../../services/api";

export type TenantBusinessSiteResponsible = {
  id: number;
  site_id: number;
  tenant_user_id: number;
  responsibility_kind: string;
  is_primary: boolean;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  notes: string | null;
  site_name: string;
  site_label: string;
  user_full_name: string;
  user_email: string;
  created_at: string;
  updated_at: string;
};

export type TenantBusinessSiteResponsiblesResponse = {
  success: boolean;
  message: string;
  total: number;
  data: TenantBusinessSiteResponsible[];
};

export type TenantBusinessSiteResponsibleMutationResponse = {
  success: boolean;
  message: string;
  data: TenantBusinessSiteResponsible;
};

export type TenantBusinessSiteResponsibleWriteRequest = {
  site_id: number;
  tenant_user_id: number;
  responsibility_kind: string;
  is_primary: boolean;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  notes: string | null;
};

export function getTenantBusinessSiteResponsibles(
  accessToken: string,
  options: { siteId?: number } = {}
) {
  const params = new URLSearchParams();
  if (options.siteId !== undefined) {
    params.set("site_id", String(options.siteId));
  }
  return apiRequest<TenantBusinessSiteResponsiblesResponse>(
    `/tenant/business-core/site-responsibles${params.toString() ? `?${params.toString()}` : ""}`,
    { token: accessToken }
  );
}

export function createTenantBusinessSiteResponsible(
  accessToken: string,
  payload: TenantBusinessSiteResponsibleWriteRequest
) {
  return apiRequest<TenantBusinessSiteResponsibleMutationResponse>(
    "/tenant/business-core/site-responsibles",
    { method: "POST", token: accessToken, body: payload }
  );
}

export function updateTenantBusinessSiteResponsible(
  accessToken: string,
  responsibleId: number,
  payload: TenantBusinessSiteResponsibleWriteRequest
) {
  return apiRequest<TenantBusinessSiteResponsibleMutationResponse>(
    `/tenant/business-core/site-responsibles/${responsibleId}`,
    { method: "PUT", token: accessToken, body: payload }
  );
}

export function deleteTenantBusinessSiteResponsible(
  accessToken: string,
  responsibleId: number
) {
  return apiRequest<TenantBusinessSiteResponsibleMutationResponse>(
    `/tenant/business-core/site-responsibles/${responsibleId}`,
    { method: "DELETE", token: accessToken }
  );
}
