import { apiRequest } from "../../../../../services/api";

export type TenantMaintenanceScheduleEstimateLine = {
  id: number;
  schedule_id: number;
  line_type: string;
  description: string | null;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  sort_order: number;
  notes: string | null;
  created_by_user_id: number | null;
  updated_by_user_id: number | null;
  created_at: string;
  updated_at: string;
};

export type TenantMaintenanceScheduleEstimateLineWriteItem = {
  id?: number | null;
  line_type: string;
  description: string | null;
  quantity: number;
  unit_cost: number;
  notes: string | null;
};

export type TenantMaintenanceSchedule = {
  id: number;
  client_id: number;
  site_id: number | null;
  installation_id: number | null;
  task_type_id: number | null;
  cost_template_id: number | null;
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
  estimate_target_margin_percent: number;
  estimate_notes: string | null;
  is_active: boolean;
  auto_create_due_items: boolean;
  notes: string | null;
  estimate_lines: TenantMaintenanceScheduleEstimateLine[];
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

export type TenantMaintenanceScheduleSuggestion = {
  client_id: number;
  site_id: number | null;
  installation_id: number | null;
  suggested_next_due_at: string | null;
  suggested_frequency_value: number | null;
  suggested_frequency_unit: string | null;
  last_executed_at: string | null;
  source: string;
  reference_work_order_id: number | null;
  reference_completed_at: string | null;
};

export type TenantMaintenanceScheduleSuggestionResponse = {
  success: boolean;
  message: string;
  data: TenantMaintenanceScheduleSuggestion;
};

export type TenantMaintenanceScheduleWriteRequest = {
  client_id: number;
  site_id: number | null;
  installation_id: number | null;
  task_type_id: number | null;
  cost_template_id: number | null;
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
  estimate_target_margin_percent: number;
  estimate_notes: string | null;
  is_active: boolean;
  auto_create_due_items: boolean;
  notes: string | null;
  estimate_lines: TenantMaintenanceScheduleEstimateLineWriteItem[];
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

export function getTenantMaintenanceScheduleSuggestion(
  accessToken: string,
  options: {
    clientId: number;
    siteId?: number | null;
    installationId?: number | null;
  }
) {
  const params = new URLSearchParams();
  params.set("client_id", String(options.clientId));
  if (options.siteId !== undefined && options.siteId !== null) {
    params.set("site_id", String(options.siteId));
  }
  if (options.installationId !== undefined && options.installationId !== null) {
    params.set("installation_id", String(options.installationId));
  }
  return apiRequest<TenantMaintenanceScheduleSuggestionResponse>(
    `/tenant/maintenance/schedules/suggestion?${params.toString()}`,
    { token: accessToken }
  );
}
