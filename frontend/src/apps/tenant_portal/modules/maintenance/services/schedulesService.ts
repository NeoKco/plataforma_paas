import { apiRequest } from "../../../../../services/api";

export type TenantMaintenanceSchedule = {
  id: number;
  client_id: number;
  site_id: number | null;
  installation_id: number | null;
  task_type_id: number | null;
  name: string;
  description: string | null;
  frequency_value: number;
  frequency_unit: string;
  lead_days: number;
  start_mode: string;
  base_date: string | null;
  last_executed_at: string | null;
  next_due_at: string;
  default_priority: string;
  estimated_duration_minutes: number | null;
  billing_mode: string;
  is_active: boolean;
  auto_create_due_items: boolean;
  notes: string | null;
  created_by_user_id: number | null;
  created_at: string;
  updated_at: string;
};

export type TenantMaintenanceSchedulesResponse = {
  success: boolean;
  message: string;
  total: number;
  data: TenantMaintenanceSchedule[];
};

export type TenantMaintenanceScheduleMutationResponse = {
  success: boolean;
  message: string;
  data: TenantMaintenanceSchedule;
};

export type TenantMaintenanceScheduleWriteRequest = {
  client_id: number;
  site_id: number | null;
  installation_id: number | null;
  task_type_id: number | null;
  name: string;
  description: string | null;
  frequency_value: number;
  frequency_unit: string;
  lead_days: number;
  start_mode: string;
  base_date: string | null;
  last_executed_at: string | null;
  next_due_at: string;
  default_priority: string;
  estimated_duration_minutes: number | null;
  billing_mode: string;
  is_active: boolean;
  auto_create_due_items: boolean;
  notes: string | null;
};

export function getTenantMaintenanceSchedules(
  accessToken: string,
  options: {
    clientId?: number;
    siteId?: number;
    installationId?: number;
    includeInactive?: boolean;
  } = {}
) {
  const params = new URLSearchParams();
  if (options.clientId !== undefined) {
    params.set("client_id", String(options.clientId));
  }
  if (options.siteId !== undefined) {
    params.set("site_id", String(options.siteId));
  }
  if (options.installationId !== undefined) {
    params.set("installation_id", String(options.installationId));
  }
  params.set("include_inactive", options.includeInactive === false ? "false" : "true");
  return apiRequest<TenantMaintenanceSchedulesResponse>(
    `/tenant/maintenance/schedules?${params.toString()}`,
    { token: accessToken }
  );
}

export function createTenantMaintenanceSchedule(
  accessToken: string,
  payload: TenantMaintenanceScheduleWriteRequest
) {
  return apiRequest<TenantMaintenanceScheduleMutationResponse>(
    "/tenant/maintenance/schedules",
    {
      method: "POST",
      token: accessToken,
      body: payload,
    }
  );
}
