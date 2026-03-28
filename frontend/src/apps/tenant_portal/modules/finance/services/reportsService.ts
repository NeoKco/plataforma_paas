import { apiRequest } from "../../../../../services/api";

export type TenantFinanceReportCategoryAmount = {
  category_id: number;
  category_name: string;
  category_type: string;
  total_amount: number;
};

export type TenantFinanceReportTransactionSnapshot = {
  period_month: string;
  total_income: number;
  total_expense: number;
  net_balance: number;
  total_transactions: number;
  reconciled_count: number;
  unreconciled_count: number;
  favorite_count: number;
  loan_linked_count: number;
};

export type TenantFinanceReportBudgetSnapshot = {
  period_month: string;
  total_budgeted: number;
  total_actual: number;
  total_variance: number;
  total_items: number;
  over_budget_count: number;
  within_budget_count: number;
  inactive_count: number;
  unused_count: number;
};

export type TenantFinanceReportLoanSnapshot = {
  borrowed_balance: number;
  lent_balance: number;
  total_principal: number;
  total_items: number;
  active_items: number;
  open_items: number;
  settled_items: number;
};

export type TenantFinanceReportDailyCashflowItem = {
  day: string;
  income_total: number;
  expense_total: number;
  net_total: number;
  transaction_count: number;
};

export type TenantFinanceReportBudgetVarianceItem = {
  category_id: number;
  category_name: string;
  category_type: string;
  budget_status: string;
  planned_amount: number;
  actual_amount: number;
  variance_amount: number;
  utilization_ratio: number | null;
  is_active: boolean;
};

export type TenantFinanceReportPeriodComparison = {
  current_period_month: string;
  previous_period_month: string;
  previous_income: number;
  previous_expense: number;
  previous_net_balance: number;
  previous_transactions: number;
  previous_budgeted: number;
  previous_actual: number;
  previous_variance: number;
  income_delta: number;
  expense_delta: number;
  net_balance_delta: number;
  transaction_delta: number;
  budgeted_delta: number;
  actual_delta: number;
  variance_delta: number;
};

export type TenantFinanceReportMonthlyTrendItem = {
  period_month: string;
  total_income: number;
  total_expense: number;
  net_balance: number;
  total_transactions: number;
  total_budgeted: number;
  total_actual: number;
  total_variance: number;
};

export type TenantFinanceReportOverviewResponse = {
  success: boolean;
  message: string;
  data: {
    period_month: string;
    movement_scope: string;
    transaction_snapshot: TenantFinanceReportTransactionSnapshot;
    budget_snapshot: TenantFinanceReportBudgetSnapshot;
    loan_snapshot: TenantFinanceReportLoanSnapshot;
    top_income_categories: TenantFinanceReportCategoryAmount[];
    top_expense_categories: TenantFinanceReportCategoryAmount[];
    daily_cashflow: TenantFinanceReportDailyCashflowItem[];
    budget_variances: TenantFinanceReportBudgetVarianceItem[];
    period_comparison: TenantFinanceReportPeriodComparison;
    monthly_trend: TenantFinanceReportMonthlyTrendItem[];
  };
};

export function getTenantFinanceReportOverview(
  accessToken: string,
  periodMonth: string,
  trendMonths = 6,
  movementScope = "all"
) {
  const params = new URLSearchParams();
  params.set("period_month", periodMonth);
  params.set("trend_months", String(trendMonths));
  params.set("movement_scope", movementScope);
  return apiRequest<TenantFinanceReportOverviewResponse>(
    `/tenant/finance/reports/overview?${params.toString()}`,
    {
      token: accessToken,
    }
  );
}
