import { apiRequest } from "../../../../../services/api";

export type TenantBusinessAssetType = {
  id: number;
  code: string | null;
  name: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type TenantBusinessAssetTypesResponse = {
  success: boolean;
  message: string;
  total: number;
  data: TenantBusinessAssetType[];
};

export type TenantBusinessAssetTypeMutationResponse = {
  success: boolean;
  message: string;
  data: TenantBusinessAssetType;
};

export type TenantBusinessAssetTypeWriteRequest = {
  code: string | null;
  name: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
};

export function getTenantBusinessAssetTypes(accessToken: string, options: { includeInactive?: boolean } = {}) {
  const params = new URLSearchParams();
  params.set("include_inactive", options.includeInactive === false ? "false" : "true");
  return apiRequest<TenantBusinessAssetTypesResponse>(`/tenant/business-core/asset-types?${params.toString()}`, {
    token: accessToken,
  });
}

export function createTenantBusinessAssetType(accessToken: string, payload: TenantBusinessAssetTypeWriteRequest) {
  return apiRequest<TenantBusinessAssetTypeMutationResponse>("/tenant/business-core/asset-types", {
    method: "POST",
    token: accessToken,
    body: payload,
  });
}

export function updateTenantBusinessAssetType(accessToken: string, assetTypeId: number, payload: TenantBusinessAssetTypeWriteRequest) {
  return apiRequest<TenantBusinessAssetTypeMutationResponse>(`/tenant/business-core/asset-types/${assetTypeId}`, {
    method: "PUT",
    token: accessToken,
    body: payload,
  });
}

export function updateTenantBusinessAssetTypeStatus(accessToken: string, assetTypeId: number, isActive: boolean) {
  return apiRequest<TenantBusinessAssetTypeMutationResponse>(`/tenant/business-core/asset-types/${assetTypeId}/status`, {
    method: "PATCH",
    token: accessToken,
    body: { is_active: isActive },
  });
}

export function deleteTenantBusinessAssetType(accessToken: string, assetTypeId: number) {
  return apiRequest<TenantBusinessAssetTypeMutationResponse>(`/tenant/business-core/asset-types/${assetTypeId}`, {
    method: "DELETE",
    token: accessToken,
  });
}
