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

export type TenantFinanceReportOverviewResponse = {
  success: boolean;
  message: string;
  data: {
    period_month: string;
    transaction_snapshot: TenantFinanceReportTransactionSnapshot;
    budget_snapshot: TenantFinanceReportBudgetSnapshot;
    loan_snapshot: TenantFinanceReportLoanSnapshot;
    top_income_categories: TenantFinanceReportCategoryAmount[];
    top_expense_categories: TenantFinanceReportCategoryAmount[];
  };
};

export function getTenantFinanceReportOverview(
  accessToken: string,
  periodMonth: string
) {
  const params = new URLSearchParams();
  params.set("period_month", periodMonth);
  return apiRequest<TenantFinanceReportOverviewResponse>(
    `/tenant/finance/reports/overview?${params.toString()}`,
    {
      token: accessToken,
    }
  );
}
