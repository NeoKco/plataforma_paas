import { apiRequest } from "../../../../../services/api";

export type TenantMaintenanceVisit = {
  id: number;
  work_order_id: number;
  visit_type: string;
  visit_status: string;
  visit_result: string | null;
  scheduled_start_at: string | null;
  scheduled_end_at: string | null;
  actual_start_at: string | null;
  actual_end_at: string | null;
  assigned_work_group_id: number | null;
  assigned_tenant_user_id: number | null;
  assigned_group_label: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type TenantMaintenanceVisitsResponse = {
  success: boolean;
  message: string;
  total: number;
  data: TenantMaintenanceVisit[];
};

export type TenantMaintenanceVisitMutationResponse = {
  success: boolean;
  message: string;
  data: TenantMaintenanceVisit;
};

export type TenantMaintenanceVisitWriteRequest = {
  work_order_id: number;
  visit_type: string;
  visit_status: string;
  visit_result: string | null;
  scheduled_start_at: string | null;
  scheduled_end_at: string | null;
  actual_start_at: string | null;
  actual_end_at: string | null;
  assigned_work_group_id: number | null;
  assigned_tenant_user_id: number | null;
  assigned_group_label: string | null;
  notes: string | null;
};

export function getTenantMaintenanceVisits(
  accessToken: string,
  options: { workOrderId?: number; visitStatus?: string } = {}
) {
  const params = new URLSearchParams();
  if (options.workOrderId !== undefined) {
    params.set("work_order_id", String(options.workOrderId));
  }
  if (options.visitStatus) {
    params.set("visit_status", options.visitStatus);
  }
  return apiRequest<TenantMaintenanceVisitsResponse>(
    `/tenant/maintenance/visits${params.toString() ? `?${params.toString()}` : ""}`,
    { token: accessToken }
  );
}

export function createTenantMaintenanceVisit(
  accessToken: string,
  payload: TenantMaintenanceVisitWriteRequest
) {
  return apiRequest<TenantMaintenanceVisitMutationResponse>("/tenant/maintenance/visits", {
    method: "POST",
    token: accessToken,
    body: payload,
  });
}

export function updateTenantMaintenanceVisit(
  accessToken: string,
  visitId: number,
  payload: TenantMaintenanceVisitWriteRequest
) {
  return apiRequest<TenantMaintenanceVisitMutationResponse>(
    `/tenant/maintenance/visits/${visitId}`,
    {
      method: "PUT",
      token: accessToken,
      body: payload,
    }
  );
}

export function deleteTenantMaintenanceVisit(accessToken: string, visitId: number) {
  return apiRequest<TenantMaintenanceVisitMutationResponse>(
    `/tenant/maintenance/visits/${visitId}`,
    {
      method: "DELETE",
      token: accessToken,
    }
  );
}
