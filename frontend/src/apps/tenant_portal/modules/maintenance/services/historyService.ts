import { apiRequest } from "../../../../../services/api";

export type TenantMaintenanceStatusLog = {
  id: number;
  work_order_id: number;
  from_status: string | null;
  to_status: string;
  note: string | null;
  changed_by_user_id: number | null;
  changed_at: string;
};

export type TenantMaintenanceVisit = {
  id: number;
  work_order_id: number;
  visit_status: string;
  scheduled_start_at: string | null;
  scheduled_end_at: string | null;
  actual_start_at: string | null;
  actual_end_at: string | null;
  assigned_tenant_user_id: number | null;
  assigned_group_label: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type TenantMaintenanceHistoryWorkOrder = {
  id: number;
  client_id: number;
  site_id: number;
  installation_id: number | null;
  external_reference: string | null;
  title: string;
  description: string | null;
  priority: string;
  cancellation_reason: string | null;
  closure_notes: string | null;
  maintenance_status: string;
  requested_at: string;
  scheduled_for: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  created_by_user_id: number | null;
  created_at: string;
  updated_at: string;
  status_logs: TenantMaintenanceStatusLog[];
  visits: TenantMaintenanceVisit[];
};

export type TenantMaintenanceHistoryResponse = {
  success: boolean;
  message: string;
  total: number;
  data: TenantMaintenanceHistoryWorkOrder[];
};

export function getTenantMaintenanceHistory(
  accessToken: string,
  options: { clientId?: number; siteId?: number } = {}
) {
  const params = new URLSearchParams();
  if (options.clientId !== undefined) {
    params.set("client_id", String(options.clientId));
  }
  if (options.siteId !== undefined) {
    params.set("site_id", String(options.siteId));
  }
  return apiRequest<TenantMaintenanceHistoryResponse>(
    `/tenant/maintenance/history${params.toString() ? `?${params.toString()}` : ""}`,
    { token: accessToken }
  );
}
