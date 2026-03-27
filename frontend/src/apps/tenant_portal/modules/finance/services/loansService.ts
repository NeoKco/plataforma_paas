import { apiRequest } from "../../../../../services/api";

export type TenantFinanceLoan = {
  id: number;
  name: string;
  loan_type: string;
  loan_status: string;
  counterparty_name: string;
  currency_id: number;
  currency_code: string;
  principal_amount: number;
  current_balance: number;
  paid_amount: number;
  interest_rate: number | null;
  installments_count: number | null;
  payment_frequency: string;
  next_due_date: string | null;
  installments_total: number;
  installments_paid: number;
  start_date: string;
  due_date: string | null;
  note: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type TenantFinanceLoansSummary = {
  total_items: number;
  active_items: number;
  borrowed_balance: number;
  lent_balance: number;
  total_principal: number;
};

export type TenantFinanceLoansResponse = {
  success: boolean;
  message: string;
  total: number;
  summary: TenantFinanceLoansSummary;
  data: TenantFinanceLoan[];
};

export type TenantFinanceLoanMutationResponse = {
  success: boolean;
  message: string;
  data: TenantFinanceLoan;
};

export type TenantFinanceLoanInstallment = {
  id: number;
  loan_id: number;
  installment_number: number;
  due_date: string;
  planned_amount: number;
  principal_amount: number;
  interest_amount: number;
  paid_amount: number;
  paid_at: string | null;
  installment_status: string;
  note: string | null;
  created_at: string;
  updated_at: string;
};

export type TenantFinanceLoanDetailResponse = {
  success: boolean;
  message: string;
  data: {
    loan: TenantFinanceLoan;
    installments: TenantFinanceLoanInstallment[];
  };
};

export type TenantFinanceLoanWriteRequest = {
  name: string;
  loan_type: string;
  counterparty_name: string;
  currency_id: number;
  principal_amount: number;
  current_balance: number;
  interest_rate: number | null;
  installments_count: number | null;
  payment_frequency: string;
  start_date: string;
  due_date: string | null;
  note: string | null;
  is_active: boolean;
};

export function getTenantFinanceLoans(
  accessToken: string,
  options?: {
    includeInactive?: boolean;
    loanType?: string;
    loanStatus?: string;
  }
) {
  const params = new URLSearchParams();
  params.set("include_inactive", options?.includeInactive === false ? "false" : "true");
  if (options?.loanType) {
    params.set("loan_type", options.loanType);
  }
  if (options?.loanStatus) {
    params.set("loan_status", options.loanStatus);
  }
  return apiRequest<TenantFinanceLoansResponse>(`/tenant/finance/loans?${params.toString()}`, {
    token: accessToken,
  });
}

export function createTenantFinanceLoan(
  accessToken: string,
  payload: TenantFinanceLoanWriteRequest
) {
  return apiRequest<TenantFinanceLoanMutationResponse>("/tenant/finance/loans", {
    method: "POST",
    token: accessToken,
    body: payload,
  });
}

export function updateTenantFinanceLoan(
  accessToken: string,
  loanId: number,
  payload: TenantFinanceLoanWriteRequest
) {
  return apiRequest<TenantFinanceLoanMutationResponse>(`/tenant/finance/loans/${loanId}`, {
    method: "PUT",
    token: accessToken,
    body: payload,
  });
}

export function getTenantFinanceLoanDetail(accessToken: string, loanId: number) {
  return apiRequest<TenantFinanceLoanDetailResponse>(`/tenant/finance/loans/${loanId}`, {
    token: accessToken,
  });
}
