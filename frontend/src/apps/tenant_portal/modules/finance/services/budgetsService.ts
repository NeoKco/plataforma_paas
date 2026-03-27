import { apiRequest } from "../../../../../services/api";

export type TenantFinanceBudget = {
  id: number;
  period_month: string;
  category_id: number;
  category_name: string;
  category_type: string;
  budget_status: string;
  amount: number;
  actual_amount: number;
  variance_amount: number;
  utilization_ratio: number | null;
  note: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type TenantFinanceBudgetsSummary = {
  period_month: string;
  total_budgeted: number;
  total_actual: number;
  total_variance: number;
  total_items: number;
  income_budgeted: number;
  income_actual: number;
  expense_budgeted: number;
  expense_actual: number;
};

export type TenantFinanceBudgetsResponse = {
  success: boolean;
  message: string;
  total: number;
  summary: TenantFinanceBudgetsSummary;
  data: TenantFinanceBudget[];
};

export type TenantFinanceBudgetMutationResponse = {
  success: boolean;
  message: string;
  data: TenantFinanceBudget;
};

export type TenantFinanceBudgetWriteRequest = {
  period_month: string;
  category_id: number;
  amount: number;
  note: string | null;
  is_active: boolean;
};

export function getTenantFinanceBudgets(
  accessToken: string,
  periodMonth: string,
  options?: {
    includeInactive?: boolean;
    categoryType?: string;
    budgetStatus?: string;
  }
) {
  const params = new URLSearchParams();
  params.set("period_month", periodMonth);
  params.set("include_inactive", options?.includeInactive === false ? "false" : "true");
  if (options?.categoryType) {
    params.set("category_type", options.categoryType);
  }
  if (options?.budgetStatus) {
    params.set("budget_status", options.budgetStatus);
  }
  return apiRequest<TenantFinanceBudgetsResponse>(
    `/tenant/finance/budgets?${params.toString()}`,
    { token: accessToken }
  );
}

export function createTenantFinanceBudget(
  accessToken: string,
  payload: TenantFinanceBudgetWriteRequest
) {
  return apiRequest<TenantFinanceBudgetMutationResponse>("/tenant/finance/budgets", {
    method: "POST",
    token: accessToken,
    body: payload,
  });
}

export function updateTenantFinanceBudget(
  accessToken: string,
  budgetId: number,
  payload: TenantFinanceBudgetWriteRequest
) {
  return apiRequest<TenantFinanceBudgetMutationResponse>(
    `/tenant/finance/budgets/${budgetId}`,
    {
      method: "PUT",
      token: accessToken,
      body: payload,
    }
  );
}
