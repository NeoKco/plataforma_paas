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
  actual: TenantMaintenanceCostActual | null;
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
  notes: string | null;
};

export type TenantMaintenanceCostActualWriteRequest = {
  labor_cost: number;
  travel_cost: number;
  materials_cost: number;
  external_services_cost: number;
  overhead_cost: number;
  actual_price_charged: number;
  notes: string | null;
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
  notes: string | null;
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
