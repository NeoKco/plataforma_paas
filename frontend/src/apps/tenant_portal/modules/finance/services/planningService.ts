import { apiRequest } from "../../../../../services/api";

export type TenantFinancePlanningSummary = {
  period_month: string;
  total_income: number;
  total_expense: number;
  net_total: number;
  total_transactions: number;
  due_installments_count: number;
  pending_installments_count: number;
  expected_loan_cashflow: number;
  total_budgeted: number;
  total_actual: number;
  total_variance: number;
};

export type TenantFinancePlanningDayItem = {
  day: string;
  income_total: number;
  expense_total: number;
  net_total: number;
  transaction_count: number;
  due_installments_count: number;
};

export type TenantFinancePlanningLoanDueItem = {
  loan_id: number;
  loan_name: string;
  loan_type: string;
  installment_id: number;
  installment_number: number;
  due_date: string;
  planned_amount: number;
  paid_amount: number;
  remaining_amount: number;
  installment_status: string;
};

export type TenantFinancePlanningBudgetFocusItem = {
  category_id: number;
  category_name: string;
  category_type: string;
  planned_amount: number;
  actual_amount: number;
  variance_amount: number;
  budget_status: string;
};

export type TenantFinancePlanningOverviewResponse = {
  success: boolean;
  message: string;
  data: {
    period_month: string;
    summary: TenantFinancePlanningSummary;
    calendar_days: TenantFinancePlanningDayItem[];
    loan_due_items: TenantFinancePlanningLoanDueItem[];
    budget_focus: TenantFinancePlanningBudgetFocusItem[];
  };
};

export function getTenantFinancePlanningOverview(
  accessToken: string,
  periodMonth: string
) {
  const params = new URLSearchParams();
  params.set("period_month", periodMonth);
  return apiRequest<TenantFinancePlanningOverviewResponse>(
    `/tenant/finance/planning/overview?${params.toString()}`,
    {
      token: accessToken,
    }
  );
}
