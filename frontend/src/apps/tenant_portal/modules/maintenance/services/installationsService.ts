import { apiRequest } from "../../../../../services/api";

export type TenantMaintenanceInstallation = {
  id: number;
  site_id: number;
  equipment_type_id: number;
  name: string;
  serial_number: string | null;
  manufacturer: string | null;
  model: string | null;
  installed_at: string | null;
  last_service_at: string | null;
  warranty_until: string | null;
  installation_status: string;
  location_note: string | null;
  technical_notes: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type TenantMaintenanceInstallationsResponse = {
  success: boolean;
  message: string;
  total: number;
  data: TenantMaintenanceInstallation[];
};

export type TenantMaintenanceInstallationMutationResponse = {
  success: boolean;
  message: string;
  data: TenantMaintenanceInstallation;
};

export type TenantMaintenanceInstallationWriteRequest = {
  site_id: number;
  equipment_type_id: number;
  name: string;
  serial_number: string | null;
  manufacturer: string | null;
  model: string | null;
  installed_at?: string | null;
  last_service_at?: string | null;
  warranty_until?: string | null;
  installation_status: string;
  location_note: string | null;
  technical_notes: string | null;
  is_active: boolean;
  sort_order: number;
};

export function getTenantMaintenanceInstallations(
  accessToken: string,
  options: { includeInactive?: boolean; siteId?: number; equipmentTypeId?: number } = {}
) {
  const params = new URLSearchParams();
  params.set("include_inactive", options.includeInactive === false ? "false" : "true");
  if (options.siteId !== undefined) {
    params.set("site_id", String(options.siteId));
  }
  if (options.equipmentTypeId !== undefined) {
    params.set("equipment_type_id", String(options.equipmentTypeId));
  }
  return apiRequest<TenantMaintenanceInstallationsResponse>(
    `/tenant/maintenance/installations?${params.toString()}`,
    { token: accessToken }
  );
}

export function createTenantMaintenanceInstallation(
  accessToken: string,
  payload: TenantMaintenanceInstallationWriteRequest
) {
  return apiRequest<TenantMaintenanceInstallationMutationResponse>(
    "/tenant/maintenance/installations",
    {
      method: "POST",
      token: accessToken,
      body: payload,
    }
  );
}

export function updateTenantMaintenanceInstallation(
  accessToken: string,
  installationId: number,
  payload: TenantMaintenanceInstallationWriteRequest
) {
  return apiRequest<TenantMaintenanceInstallationMutationResponse>(
    `/tenant/maintenance/installations/${installationId}`,
    {
      method: "PUT",
      token: accessToken,
      body: payload,
    }
  );
}

export function updateTenantMaintenanceInstallationStatus(
  accessToken: string,
  installationId: number,
  isActive: boolean
) {
  return apiRequest<TenantMaintenanceInstallationMutationResponse>(
    `/tenant/maintenance/installations/${installationId}/status`,
    {
      method: "PATCH",
      token: accessToken,
      body: { maintenance_status: isActive ? "active" : "inactive" },
    }
  );
}

export function deleteTenantMaintenanceInstallation(
  accessToken: string,
  installationId: number
) {
  return apiRequest<TenantMaintenanceInstallationMutationResponse>(
    `/tenant/maintenance/installations/${installationId}`,
    {
      method: "DELETE",
      token: accessToken,
    }
  );
}
