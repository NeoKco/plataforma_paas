import { apiRequest } from "../../../../../services/api";

export type TenantBusinessAsset = {
  id: number;
  site_id: number;
  asset_type_id: number;
  name: string;
  asset_code: string | null;
  serial_number: string | null;
  manufacturer: string | null;
  model: string | null;
  asset_status: string;
  installed_at: string | null;
  last_service_at: string | null;
  warranty_until: string | null;
  location_note: string | null;
  technical_notes: string | null;
  is_active: boolean;
  sort_order: number;
  site_name: string;
  site_label: string;
  asset_type_name: string;
  created_at: string;
  updated_at: string;
};

export type TenantBusinessAssetsResponse = {
  success: boolean;
  message: string;
  total: number;
  data: TenantBusinessAsset[];
};

export type TenantBusinessAssetMutationResponse = {
  success: boolean;
  message: string;
  data: TenantBusinessAsset;
};

export type TenantBusinessAssetWriteRequest = {
  site_id: number;
  asset_type_id: number;
  name: string;
  asset_code: string | null;
  serial_number: string | null;
  manufacturer: string | null;
  model: string | null;
  asset_status: string;
  installed_at: string | null;
  last_service_at: string | null;
  warranty_until: string | null;
  location_note: string | null;
  technical_notes: string | null;
  is_active: boolean;
  sort_order: number;
};

export function getTenantBusinessAssets(accessToken: string, options: { includeInactive?: boolean; siteId?: number } = {}) {
  const params = new URLSearchParams();
  params.set("include_inactive", options.includeInactive === false ? "false" : "true");
  if (options.siteId !== undefined) {
    params.set("site_id", String(options.siteId));
  }
  return apiRequest<TenantBusinessAssetsResponse>(`/tenant/business-core/assets?${params.toString()}`, {
    token: accessToken,
  });
}

export function createTenantBusinessAsset(accessToken: string, payload: TenantBusinessAssetWriteRequest) {
  return apiRequest<TenantBusinessAssetMutationResponse>("/tenant/business-core/assets", {
    method: "POST",
    token: accessToken,
    body: payload,
  });
}

export function updateTenantBusinessAsset(accessToken: string, assetId: number, payload: TenantBusinessAssetWriteRequest) {
  return apiRequest<TenantBusinessAssetMutationResponse>(`/tenant/business-core/assets/${assetId}`, {
    method: "PUT",
    token: accessToken,
    body: payload,
  });
}

export function updateTenantBusinessAssetStatus(accessToken: string, assetId: number, isActive: boolean) {
  return apiRequest<TenantBusinessAssetMutationResponse>(`/tenant/business-core/assets/${assetId}/status`, {
    method: "PATCH",
    token: accessToken,
    body: { is_active: isActive },
  });
}

export function deleteTenantBusinessAsset(accessToken: string, assetId: number) {
  return apiRequest<TenantBusinessAssetMutationResponse>(`/tenant/business-core/assets/${assetId}`, {
    method: "DELETE",
    token: accessToken,
  });
}
