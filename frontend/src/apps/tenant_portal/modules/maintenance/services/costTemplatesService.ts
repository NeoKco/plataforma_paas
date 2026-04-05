import { apiRequest } from "../../../../../services/api";

export type TenantMaintenanceCostTemplateLine = {
  id: number;
  template_id: number;
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

export type TenantMaintenanceCostTemplateLineWriteItem = {
  id?: number | null;
  line_type: string;
  description: string | null;
  quantity: number;
  unit_cost: number;
  notes: string | null;
};

export type TenantMaintenanceCostTemplate = {
  id: number;
  name: string;
  description: string | null;
  task_type_id: number | null;
  estimate_target_margin_percent: number;
  estimate_notes: string | null;
  is_active: boolean;
  usage_count: number;
  lines: TenantMaintenanceCostTemplateLine[];
  created_by_user_id: number | null;
  updated_by_user_id: number | null;
  created_at: string;
  updated_at: string;
};

export type TenantMaintenanceCostTemplatesResponse = {
  success: boolean;
  message: string;
  total: number;
  data: TenantMaintenanceCostTemplate[];
};

export type TenantMaintenanceCostTemplateMutationResponse = {
  success: boolean;
  message: string;
  data: TenantMaintenanceCostTemplate;
};

export type TenantMaintenanceCostTemplateWriteRequest = {
  name: string;
  description: string | null;
  task_type_id: number | null;
  estimate_target_margin_percent: number;
  estimate_notes: string | null;
  is_active: boolean;
  lines: TenantMaintenanceCostTemplateLineWriteItem[];
};

export function getTenantMaintenanceCostTemplates(
  accessToken: string,
  options: {
    taskTypeId?: number | null;
    includeInactive?: boolean;
  } = {}
) {
  const params = new URLSearchParams();
  params.set("include_inactive", options.includeInactive === true ? "true" : "false");
  if (options.taskTypeId !== undefined && options.taskTypeId !== null) {
    params.set("task_type_id", String(options.taskTypeId));
  }
  return apiRequest<TenantMaintenanceCostTemplatesResponse>(
    `/tenant/maintenance/cost-templates?${params.toString()}`,
    { token: accessToken }
  );
}

export function createTenantMaintenanceCostTemplate(
  accessToken: string,
  payload: TenantMaintenanceCostTemplateWriteRequest
) {
  return apiRequest<TenantMaintenanceCostTemplateMutationResponse>(
    "/tenant/maintenance/cost-templates",
    {
      method: "POST",
      token: accessToken,
      body: payload,
    }
  );
}

export function updateTenantMaintenanceCostTemplate(
  accessToken: string,
  templateId: number,
  payload: TenantMaintenanceCostTemplateWriteRequest
) {
  return apiRequest<TenantMaintenanceCostTemplateMutationResponse>(
    `/tenant/maintenance/cost-templates/${templateId}`,
    {
      method: "PUT",
      token: accessToken,
      body: payload,
    }
  );
}

export function updateTenantMaintenanceCostTemplateStatus(
  accessToken: string,
  templateId: number,
  isActive: boolean
) {
  return apiRequest<TenantMaintenanceCostTemplateMutationResponse>(
    `/tenant/maintenance/cost-templates/${templateId}/status`,
    {
      method: "PATCH",
      token: accessToken,
      body: { is_active: isActive },
    }
  );
}
