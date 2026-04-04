import { apiRequest } from "../../../../../services/api";

export type TenantMaintenanceWorkOrder = {
  id: number;
  client_id: number;
  site_id: number;
  installation_id: number | null;
  assigned_work_group_id: number | null;
  external_reference: string | null;
  title: string;
  description: string | null;
  priority: string;
  scheduled_for: string | null;
  cancellation_reason: string | null;
  closure_notes: string | null;
  assigned_work_group_id: number | null;
  assigned_tenant_user_id: number | null;
  maintenance_status: string;
  requested_at: string;
  completed_at: string | null;
  cancelled_at: string | null;
  created_by_user_id: number | null;
  created_at: string;
  updated_at: string;
};

export type TenantMaintenanceWorkOrdersResponse = {
  success: boolean;
  message: string;
  total: number;
  data: TenantMaintenanceWorkOrder[];
};

export type TenantMaintenanceWorkOrderMutationResponse = {
  success: boolean;
  message: string;
  data: TenantMaintenanceWorkOrder;
};

export type TenantMaintenanceWorkOrderWriteRequest = {
  client_id: number;
  site_id: number;
  installation_id: number | null;
  assigned_work_group_id: number | null;
  external_reference: string | null;
  title: string;
  description: string | null;
  priority: string;
  scheduled_for: string | null;
  cancellation_reason: string | null;
  closure_notes: string | null;
  assigned_tenant_user_id: number | null;
  maintenance_status?: string;
};

export function getTenantMaintenanceWorkOrders(
  accessToken: string,
  options: { clientId?: number; siteId?: number; maintenanceStatus?: string } = {}
) {
  const params = new URLSearchParams();
  if (options.clientId !== undefined) {
    params.set("client_id", String(options.clientId));
  }
  if (options.siteId !== undefined) {
    params.set("site_id", String(options.siteId));
  }
  if (options.maintenanceStatus) {
    params.set("maintenance_status", options.maintenanceStatus);
  }
  const suffix = params.toString();
  return apiRequest<TenantMaintenanceWorkOrdersResponse>(
    `/tenant/maintenance/work-orders${suffix ? `?${suffix}` : ""}`,
    { token: accessToken }
  );
}

export function createTenantMaintenanceWorkOrder(
  accessToken: string,
  payload: TenantMaintenanceWorkOrderWriteRequest
) {
  return apiRequest<TenantMaintenanceWorkOrderMutationResponse>(
    "/tenant/maintenance/work-orders",
    {
      method: "POST",
      token: accessToken,
      body: payload,
    }
  );
}

export function updateTenantMaintenanceWorkOrder(
  accessToken: string,
  workOrderId: number,
  payload: TenantMaintenanceWorkOrderWriteRequest
) {
  return apiRequest<TenantMaintenanceWorkOrderMutationResponse>(
    `/tenant/maintenance/work-orders/${workOrderId}`,
    {
      method: "PUT",
      token: accessToken,
      body: payload,
    }
  );
}

export function updateTenantMaintenanceWorkOrderStatus(
  accessToken: string,
  workOrderId: number,
  maintenanceStatus: string,
  note: string | null = null
) {
  return apiRequest<TenantMaintenanceWorkOrderMutationResponse>(
    `/tenant/maintenance/work-orders/${workOrderId}/status`,
    {
      method: "PATCH",
      token: accessToken,
      body: {
        maintenance_status: maintenanceStatus,
        note,
      },
    }
  );
}

export function deleteTenantMaintenanceWorkOrder(
  accessToken: string,
  workOrderId: number
) {
  return apiRequest<TenantMaintenanceWorkOrderMutationResponse>(
    `/tenant/maintenance/work-orders/${workOrderId}`,
    {
      method: "DELETE",
      token: accessToken,
    }
  );
}
