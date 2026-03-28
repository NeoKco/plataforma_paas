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
  over_budget_items: number;
  within_budget_items: number;
  unused_items: number;
  inactive_items: number;
};

export type TenantFinanceBudgetFocusItem = {
  id: number;
  category_id: number;
  category_name: string;
  category_type: string;
  budget_status: string;
  recommended_action: string;
  amount: number;
  actual_amount: number;
  variance_amount: number;
  utilization_ratio: number | null;
  is_active: boolean;
};

export type TenantFinanceBudgetsResponse = {
  success: boolean;
  message: string;
  total: number;
  summary: TenantFinanceBudgetsSummary;
  focus_items: TenantFinanceBudgetFocusItem[];
  data: TenantFinanceBudget[];
};

export type TenantFinanceBudgetMutationResponse = {
  success: boolean;
  message: string;
  data: TenantFinanceBudget;
};

export type TenantFinanceBudgetCloneRequest = {
  source_period_month: string;
  target_period_month: string;
  overwrite_existing: boolean;
};

export type TenantFinanceBudgetCloneResponse = {
  success: boolean;
  message: string;
  data: {
    source_period_month: string;
    target_period_month: string;
    cloned_count: number;
    updated_count: number;
    skipped_count: number;
  };
};

export type TenantFinanceBudgetGuidedAdjustmentRequest = {
  adjustment_mode: string;
  margin_percent?: number;
};

export type TenantFinanceBudgetGuidedAdjustmentResponse = {
  success: boolean;
  message: string;
  data: {
    adjustment_mode: string;
    budget: TenantFinanceBudget;
  };
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

export function cloneTenantFinanceBudgets(
  accessToken: string,
  payload: TenantFinanceBudgetCloneRequest
) {
  return apiRequest<TenantFinanceBudgetCloneResponse>("/tenant/finance/budgets/clone", {
    method: "POST",
    token: accessToken,
    body: payload,
  });
}

export function applyTenantFinanceBudgetGuidedAdjustment(
  accessToken: string,
  budgetId: number,
  payload: TenantFinanceBudgetGuidedAdjustmentRequest
) {
  return apiRequest<TenantFinanceBudgetGuidedAdjustmentResponse>(
    `/tenant/finance/budgets/${budgetId}/guided-adjustment`,
    {
      method: "POST",
      token: accessToken,
      body: payload,
    }
  );
}
