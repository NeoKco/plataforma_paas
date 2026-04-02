import { apiRequest } from "../../../../../services/api";

export type TenantBusinessContact = {
  id: number;
  organization_id: number;
  full_name: string;
  email: string | null;
  phone: string | null;
  role_title: string | null;
  is_primary: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type TenantBusinessContactsResponse = {
  success: boolean;
  message: string;
  total: number;
  data: TenantBusinessContact[];
};

export type TenantBusinessContactMutationResponse = {
  success: boolean;
  message: string;
  data: TenantBusinessContact;
};

export type TenantBusinessContactWriteRequest = {
  organization_id: number;
  full_name: string;
  email: string | null;
  phone: string | null;
  role_title: string | null;
  is_primary: boolean;
  is_active: boolean;
  sort_order: number;
};

export function getTenantBusinessContacts(
  accessToken: string,
  options: { includeInactive?: boolean; organizationId?: number } = {}
) {
  const params = new URLSearchParams();
  params.set("include_inactive", options.includeInactive === false ? "false" : "true");
  if (options.organizationId !== undefined) {
    params.set("organization_id", String(options.organizationId));
  }
  return apiRequest<TenantBusinessContactsResponse>(
    `/tenant/business-core/contacts?${params.toString()}`,
    { token: accessToken }
  );
}

export function createTenantBusinessContact(
  accessToken: string,
  payload: TenantBusinessContactWriteRequest
) {
  return apiRequest<TenantBusinessContactMutationResponse>("/tenant/business-core/contacts", {
    method: "POST",
    token: accessToken,
    body: payload,
  });
}

export function updateTenantBusinessContact(
  accessToken: string,
  contactId: number,
  payload: TenantBusinessContactWriteRequest
) {
  return apiRequest<TenantBusinessContactMutationResponse>(
    `/tenant/business-core/contacts/${contactId}`,
    {
      method: "PUT",
      token: accessToken,
      body: payload,
    }
  );
}

export function updateTenantBusinessContactStatus(
  accessToken: string,
  contactId: number,
  isActive: boolean
) {
  return apiRequest<TenantBusinessContactMutationResponse>(
    `/tenant/business-core/contacts/${contactId}/status`,
    {
      method: "PATCH",
      token: accessToken,
      body: { is_active: isActive },
    }
  );
}

export function deleteTenantBusinessContact(accessToken: string, contactId: number) {
  return apiRequest<TenantBusinessContactMutationResponse>(
    `/tenant/business-core/contacts/${contactId}`,
    {
      method: "DELETE",
      token: accessToken,
    }
  );
}
