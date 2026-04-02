import { apiRequest } from "../../../../../services/api";

export type TenantBusinessClient = {
  id: number;
  organization_id: number;
  client_code: string | null;
  service_status: string;
  commercial_notes: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type TenantBusinessClientsResponse = {
  success: boolean;
  message: string;
  total: number;
  data: TenantBusinessClient[];
};

export type TenantBusinessClientMutationResponse = {
  success: boolean;
  message: string;
  data: TenantBusinessClient;
};

export type TenantBusinessClientWriteRequest = {
  organization_id: number;
  client_code: string | null;
  service_status: string;
  commercial_notes: string | null;
  is_active: boolean;
  sort_order: number;
};

export function getTenantBusinessClients(
  accessToken: string,
  options: { includeInactive?: boolean; organizationId?: number } = {}
) {
  const params = new URLSearchParams();
  params.set("include_inactive", options.includeInactive === false ? "false" : "true");
  if (options.organizationId !== undefined) {
    params.set("organization_id", String(options.organizationId));
  }
  return apiRequest<TenantBusinessClientsResponse>(
    `/tenant/business-core/clients?${params.toString()}`,
    { token: accessToken }
  );
}

export function createTenantBusinessClient(
  accessToken: string,
  payload: TenantBusinessClientWriteRequest
) {
  return apiRequest<TenantBusinessClientMutationResponse>("/tenant/business-core/clients", {
    method: "POST",
    token: accessToken,
    body: payload,
  });
}

export function updateTenantBusinessClient(
  accessToken: string,
  clientId: number,
  payload: TenantBusinessClientWriteRequest
) {
  return apiRequest<TenantBusinessClientMutationResponse>(
    `/tenant/business-core/clients/${clientId}`,
    {
      method: "PUT",
      token: accessToken,
      body: payload,
    }
  );
}

export function updateTenantBusinessClientStatus(
  accessToken: string,
  clientId: number,
  isActive: boolean
) {
  return apiRequest<TenantBusinessClientMutationResponse>(
    `/tenant/business-core/clients/${clientId}/status`,
    {
      method: "PATCH",
      token: accessToken,
      body: { is_active: isActive },
    }
  );
}

export function deleteTenantBusinessClient(accessToken: string, clientId: number) {
  return apiRequest<TenantBusinessClientMutationResponse>(
    `/tenant/business-core/clients/${clientId}`,
    {
      method: "DELETE",
      token: accessToken,
    }
  );
}
