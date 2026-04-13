import { apiRequest } from "../../../../../services/api";

export type TenantMaintenanceCostEstimate = {
  id: number;
  work_order_id: number;
  labor_cost: number;
  travel_cost: number;
  materials_cost: number;
  external_services_cost: number;
  overhead_cost: number;
  total_estimated_cost: number;
  target_margin_percent: number;
  suggested_price: number;
  notes: string | null;
  created_by_user_id: number | null;
  updated_by_user_id: number | null;
  created_at: string;
  updated_at: string;
};

export type TenantMaintenanceCostLine = {
  id: number;
  work_order_id: number;
  cost_stage: string;
  line_type: string;
  description: string | null;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  include_in_expense: boolean;
  finance_transaction_id: number | null;
  notes: string | null;
  created_by_user_id: number | null;
  updated_by_user_id: number | null;
  created_at: string;
  updated_at: string;
};

export type TenantMaintenanceCostActual = {
  id: number;
  work_order_id: number;
  labor_cost: number;
  travel_cost: number;
  materials_cost: number;
  external_services_cost: number;
  overhead_cost: number;
  total_actual_cost: number;
  actual_price_charged: number;
  actual_income: number;
  actual_profit: number;
  actual_margin_percent: number | null;
  applied_cost_template_id: number | null;
  applied_cost_template_name_snapshot: string | null;
  notes: string | null;
  income_transaction_id: number | null;
  expense_transaction_id: number | null;
  finance_synced_at: string | null;
  created_by_user_id: number | null;
  updated_by_user_id: number | null;
  created_at: string;
  updated_at: string;
};

export type TenantMaintenanceCostingDetail = {
  work_order_id: number;
  estimate: TenantMaintenanceCostEstimate | null;
  estimate_lines: TenantMaintenanceCostLine[];
  actual: TenantMaintenanceCostActual | null;
  actual_lines: TenantMaintenanceCostLine[];
};

export type TenantMaintenanceCostingResponse = {
  success: boolean;
  message: string;
  data: TenantMaintenanceCostingDetail;
};

export type TenantMaintenanceCostEstimateWriteRequest = {
  labor_cost: number;
  travel_cost: number;
  materials_cost: number;
  external_services_cost: number;
  overhead_cost: number;
  target_margin_percent: number;
  suggested_price: number | null;
  notes: string | null;
  lines: TenantMaintenanceCostLineWriteItem[];
};

export type TenantMaintenanceCostActualWriteRequest = {
  labor_cost: number;
  travel_cost: number;
  materials_cost: number;
  external_services_cost: number;
  overhead_cost: number;
  actual_price_charged: number;
  applied_template_id?: number | null;
  notes: string | null;
  lines: TenantMaintenanceCostLineWriteItem[];
};

export type TenantMaintenanceCostLineWriteItem = {
  id: number | null;
  line_type: string;
  description: string | null;
  quantity: number;
  unit_cost: number;
  notes: string | null;
  include_in_expense: boolean;
};

export type TenantMaintenanceFinanceSyncRequest = {
  sync_income: boolean;
  sync_expense: boolean;
  income_account_id: number | null;
  expense_account_id: number | null;
  income_category_id: number | null;
  expense_category_id: number | null;
  currency_id: number;
  transaction_at: string | null;
  income_description: string | null;
  expense_description: string | null;
  notes: string | null;
};

export type TenantMaintenanceFinanceSyncDefaults = {
  maintenance_finance_sync_mode: string;
  maintenance_finance_auto_sync_income: boolean;
  maintenance_finance_auto_sync_expense: boolean;
  maintenance_finance_income_account_id: number | null;
  maintenance_finance_income_account_source: string | null;
  maintenance_finance_expense_account_id: number | null;
  maintenance_finance_expense_account_source: string | null;
  maintenance_finance_income_category_id: number | null;
  maintenance_finance_income_category_source: string | null;
  maintenance_finance_expense_category_id: number | null;
  maintenance_finance_expense_category_source: string | null;
  maintenance_finance_currency_id: number | null;
  maintenance_finance_currency_source: string | null;
};

export type TenantMaintenanceFinanceSyncDefaultsResponse = {
  success: boolean;
  message: string;
  data: TenantMaintenanceFinanceSyncDefaults;
};

export function getTenantMaintenanceWorkOrderCosting(
  accessToken: string,
  workOrderId: number
) {
  return apiRequest<TenantMaintenanceCostingResponse>(
    `/tenant/maintenance/work-orders/${workOrderId}/costing`,
    { token: accessToken }
  );
}

export function updateTenantMaintenanceWorkOrderCostEstimate(
  accessToken: string,
  workOrderId: number,
  payload: TenantMaintenanceCostEstimateWriteRequest
) {
  return apiRequest<TenantMaintenanceCostingResponse>(
    `/tenant/maintenance/work-orders/${workOrderId}/cost-estimate`,
    {
      method: "PUT",
      token: accessToken,
      body: payload,
    }
  );
}

export function updateTenantMaintenanceWorkOrderCostActual(
  accessToken: string,
  workOrderId: number,
  payload: TenantMaintenanceCostActualWriteRequest
) {
  return apiRequest<TenantMaintenanceCostingResponse>(
    `/tenant/maintenance/work-orders/${workOrderId}/cost-actual`,
    {
      method: "PUT",
      token: accessToken,
      body: payload,
    }
  );
}

export function syncTenantMaintenanceWorkOrderToFinance(
  accessToken: string,
  workOrderId: number,
  payload: TenantMaintenanceFinanceSyncRequest
) {
  return apiRequest<TenantMaintenanceCostingResponse>(
    `/tenant/maintenance/work-orders/${workOrderId}/finance-sync`,
    {
      method: "POST",
      token: accessToken,
      body: payload,
    }
  );
}

export function getTenantMaintenanceFinanceSyncDefaults(accessToken: string) {
  return apiRequest<TenantMaintenanceFinanceSyncDefaultsResponse>(
    "/tenant/maintenance/finance-sync-defaults",
    { token: accessToken }
  );
}
