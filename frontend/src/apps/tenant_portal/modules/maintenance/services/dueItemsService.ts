import { apiRequest } from "../../../../../services/api";
import type { TenantMaintenanceWorkOrder } from "./workOrdersService";

export type TenantMaintenanceDueItem = {
  id: number;
  schedule_id: number;
  client_id: number;
  site_id: number | null;
  installation_id: number | null;
  due_at: string;
  visible_from: string;
  due_status: string;
  contact_status: string;
  assigned_work_group_id: number | null;
  assigned_tenant_user_id: number | null;
  work_order_id: number | null;
  postponed_until: string | null;
  contact_note: string | null;
  resolution_note: string | null;
  schedule_name: string;
  schedule_description: string | null;
  task_type_id: number | null;
  default_priority: string;
  billing_mode: string;
  created_at: string;
  updated_at: string;
};

export type TenantMaintenanceDueItemsResponse = {
  success: boolean;
  message: string;
  total: number;
  data: TenantMaintenanceDueItem[];
};

export type TenantMaintenanceDueItemMutationResponse = {
  success: boolean;
  message: string;
  data: TenantMaintenanceDueItem;
};

export type TenantMaintenanceDueItemScheduleRequest = {
  scheduled_for: string | null;
  site_id: number | null;
  installation_id: number | null;
  title: string | null;
  description: string | null;
  priority: string | null;
  assigned_work_group_id: number | null;
  assigned_tenant_user_id: number | null;
};

export type TenantMaintenanceDueItemScheduleResponse = {
  success: boolean;
  message: string;
  data: TenantMaintenanceDueItem;
  work_order: TenantMaintenanceWorkOrder;
};

export function getTenantMaintenanceDueItems(
  accessToken: string,
  options: { clientId?: number; siteId?: number; dueStatus?: string } = {}
) {
  const params = new URLSearchParams();
  if (options.clientId !== undefined) {
    params.set("client_id", String(options.clientId));
  }
  if (options.siteId !== undefined) {
    params.set("site_id", String(options.siteId));
  }
  if (options.dueStatus) {
    params.set("due_status", options.dueStatus);
  }
  const suffix = params.toString();
  return apiRequest<TenantMaintenanceDueItemsResponse>(
    `/tenant/maintenance/due-items${suffix ? `?${suffix}` : ""}`,
    { token: accessToken }
  );
}

export function scheduleTenantMaintenanceDueItem(
  accessToken: string,
  dueItemId: number,
  payload: TenantMaintenanceDueItemScheduleRequest
) {
  return apiRequest<TenantMaintenanceDueItemScheduleResponse>(
    `/tenant/maintenance/due-items/${dueItemId}/schedule`,
    {
      method: "POST",
      token: accessToken,
      body: payload,
    }
  );
}
