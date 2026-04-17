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

export type TenantMaintenanceHistoryFinanceSummary = {
  has_actual_cost: boolean;
  is_synced_to_finance: boolean;
  income_transaction_id: number | null;
  expense_transaction_id: number | null;
  finance_synced_at: string | null;
  income_is_reconciled: boolean;
  expense_is_reconciled: boolean;
  income_is_voided: boolean;
  expense_is_voided: boolean;
  income_has_account: boolean;
  expense_has_account: boolean;
  income_has_category: boolean;
  expense_has_category: boolean;
};

export type TenantMaintenanceHistoryWorkOrder = {
  id: number;
  client_id: number;
  site_id: number;
  installation_id: number | null;
  task_type_id: number | null;
  schedule_id: number | null;
  due_item_id: number | null;
  billing_mode: string | null;
  external_reference: string | null;
  title: string;
  description: string | null;
  priority: string;
  cancellation_reason: string | null;
  closure_notes: string | null;
  assigned_work_group_id: number | null;
  assigned_tenant_user_id: number | null;
  maintenance_status: string;
  requested_at: string;
  scheduled_for: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  created_by_user_id: number | null;
  created_at: string;
  updated_at: string;
  finance_summary?: TenantMaintenanceHistoryFinanceSummary;
  status_logs: TenantMaintenanceStatusLog[];
  visits: TenantMaintenanceVisit[];
};

export type TenantMaintenanceHistoryResponse = {
  success: boolean;
  message: string;
  total: number;
  data: TenantMaintenanceHistoryWorkOrder[];
};

export type TenantMaintenanceStatusLogsResponse = {
  success: boolean;
  message: string;
  total: number;
  data: TenantMaintenanceStatusLog[];
};

export type TenantMaintenanceVisitsResponse = {
  success: boolean;
  message: string;
  total: number;
  data: TenantMaintenanceVisit[];
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
  ).then((response) => ({
    ...response,
    data: (response.data ?? []).map((item) => ({
      ...item,
      finance_summary: {
        has_actual_cost: false,
        is_synced_to_finance: false,
        income_transaction_id: null,
        expense_transaction_id: null,
        finance_synced_at: null,
        income_is_reconciled: false,
        expense_is_reconciled: false,
        income_is_voided: false,
        expense_is_voided: false,
        income_has_account: false,
        expense_has_account: false,
        income_has_category: false,
        expense_has_category: false,
        ...(item.finance_summary ?? {}),
      },
      status_logs: item.status_logs ?? [],
      visits: item.visits ?? [],
    })),
  }));
}

export function getTenantMaintenanceStatusLogs(accessToken: string, workOrderId: number) {
  return apiRequest<TenantMaintenanceStatusLogsResponse>(
    `/tenant/maintenance/work-orders/${workOrderId}/status-logs`,
    { token: accessToken }
  );
}

export function getTenantMaintenanceVisits(accessToken: string, workOrderId: number) {
  return apiRequest<TenantMaintenanceVisitsResponse>(
    `/tenant/maintenance/work-orders/${workOrderId}/visits`,
    { token: accessToken }
  );
}
