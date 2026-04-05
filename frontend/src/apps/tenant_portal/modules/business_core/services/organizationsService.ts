import { apiRequest } from "../../../../../services/api";

export type TenantBusinessOrganization = {
  id: number;
  name: string;
  legal_name: string | null;
  tax_id: string | null;
  organization_kind: string;
  phone: string | null;
  email: string | null;
  address_line: string | null;
  commune: string | null;
  city: string | null;
  region: string | null;
  country_code: string | null;
  notes: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type TenantBusinessOrganizationsResponse = {
  success: boolean;
  message: string;
  total: number;
  data: TenantBusinessOrganization[];
};

export type TenantBusinessOrganizationMutationResponse = {
  success: boolean;
  message: string;
  data: TenantBusinessOrganization;
};

export type TenantBusinessOrganizationWriteRequest = {
  name: string;
  legal_name: string | null;
  tax_id: string | null;
  organization_kind: string;
  phone: string | null;
  email: string | null;
  address_line: string | null;
  commune: string | null;
  city: string | null;
  region: string | null;
  country_code: string | null;
  notes: string | null;
  is_active: boolean;
  sort_order: number;
};

export function getTenantBusinessOrganizations(
  accessToken: string,
  options: {
    includeInactive?: boolean;
    organizationKind?: string;
    excludeClientOrganizations?: boolean;
  } = {}
) {
  const params = new URLSearchParams();
  params.set("include_inactive", options.includeInactive === false ? "false" : "true");
  if (options.organizationKind) {
    params.set("organization_kind", options.organizationKind);
  }
  if (options.excludeClientOrganizations) {
    params.set("exclude_client_organizations", "true");
  }
  return apiRequest<TenantBusinessOrganizationsResponse>(
    `/tenant/business-core/organizations?${params.toString()}`,
    { token: accessToken }
  );
}

export function createTenantBusinessOrganization(
  accessToken: string,
  payload: TenantBusinessOrganizationWriteRequest
) {
  return apiRequest<TenantBusinessOrganizationMutationResponse>(
    "/tenant/business-core/organizations",
    {
      method: "POST",
      token: accessToken,
      body: payload,
    }
  );
}

export function getTenantBusinessOrganization(
  accessToken: string,
  organizationId: number
) {
  return apiRequest<TenantBusinessOrganizationMutationResponse>(
    `/tenant/business-core/organizations/${organizationId}`,
    {
      token: accessToken,
    }
  );
}

export function updateTenantBusinessOrganization(
  accessToken: string,
  organizationId: number,
  payload: TenantBusinessOrganizationWriteRequest
) {
  return apiRequest<TenantBusinessOrganizationMutationResponse>(
    `/tenant/business-core/organizations/${organizationId}`,
    {
      method: "PUT",
      token: accessToken,
      body: payload,
    }
  );
}

export function updateTenantBusinessOrganizationStatus(
  accessToken: string,
  organizationId: number,
  isActive: boolean
) {
  return apiRequest<TenantBusinessOrganizationMutationResponse>(
    `/tenant/business-core/organizations/${organizationId}/status`,
    {
      method: "PATCH",
      token: accessToken,
      body: { is_active: isActive },
    }
  );
}

export function deleteTenantBusinessOrganization(
  accessToken: string,
  organizationId: number
) {
  return apiRequest<TenantBusinessOrganizationMutationResponse>(
    `/tenant/business-core/organizations/${organizationId}`,
    {
      method: "DELETE",
      token: accessToken,
    }
  );
}
