import { apiRequest } from "../../../../../services/api";

export type TenantMaintenanceEquipmentType = {
  id: number;
  code: string | null;
  name: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type TenantMaintenanceEquipmentTypesResponse = {
  success: boolean;
  message: string;
  total: number;
  data: TenantMaintenanceEquipmentType[];
};

export type TenantMaintenanceEquipmentTypeMutationResponse = {
  success: boolean;
  message: string;
  data: TenantMaintenanceEquipmentType;
};

export type TenantMaintenanceEquipmentTypeWriteRequest = {
  code: string | null;
  name: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
};

export function getTenantMaintenanceEquipmentTypes(
  accessToken: string,
  options: { includeInactive?: boolean } = {}
) {
  const params = new URLSearchParams();
  params.set("include_inactive", options.includeInactive === false ? "false" : "true");
  return apiRequest<TenantMaintenanceEquipmentTypesResponse>(
    `/tenant/maintenance/equipment-types?${params.toString()}`,
    { token: accessToken }
  );
}

export function createTenantMaintenanceEquipmentType(
  accessToken: string,
  payload: TenantMaintenanceEquipmentTypeWriteRequest
) {
  return apiRequest<TenantMaintenanceEquipmentTypeMutationResponse>(
    "/tenant/maintenance/equipment-types",
    {
      method: "POST",
      token: accessToken,
      body: payload,
    }
  );
}

export function updateTenantMaintenanceEquipmentType(
  accessToken: string,
  equipmentTypeId: number,
  payload: TenantMaintenanceEquipmentTypeWriteRequest
) {
  return apiRequest<TenantMaintenanceEquipmentTypeMutationResponse>(
    `/tenant/maintenance/equipment-types/${equipmentTypeId}`,
    {
      method: "PUT",
      token: accessToken,
      body: payload,
    }
  );
}

export function updateTenantMaintenanceEquipmentTypeStatus(
  accessToken: string,
  equipmentTypeId: number,
  isActive: boolean
) {
  return apiRequest<TenantMaintenanceEquipmentTypeMutationResponse>(
    `/tenant/maintenance/equipment-types/${equipmentTypeId}/status`,
    {
      method: "PATCH",
      token: accessToken,
      body: { maintenance_status: isActive ? "active" : "inactive" },
    }
  );
}

export function deleteTenantMaintenanceEquipmentType(
  accessToken: string,
  equipmentTypeId: number
) {
  return apiRequest<TenantMaintenanceEquipmentTypeMutationResponse>(
    `/tenant/maintenance/equipment-types/${equipmentTypeId}`,
    {
      method: "DELETE",
      token: accessToken,
    }
  );
}
