import { apiRequest } from "../../../../../services/api";

export type TenantFinanceLoan = {
  id: number;
  name: string;
  loan_type: string;
  loan_status: string;
  counterparty_name: string;
  currency_id: number;
  currency_code: string;
  account_id: number | null;
  account_name: string | null;
  account_code: string | null;
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
  paid_principal_amount: number;
  paid_interest_amount: number;
  paid_at: string | null;
  reversal_reason_code: string | null;
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
    accounting_summary: TenantFinanceLoanDerivedTransactionsSummary;
    accounting_transactions: TenantFinanceLoanDerivedTransaction[];
  };
};

export type TenantFinanceLoanDerivedTransactionsSummary = {
  total_items: number;
  payment_items: number;
  reversal_items: number;
  reconciled_items: number;
  unreconciled_items: number;
  total_inflow: number;
  total_outflow: number;
  net_cash_effect: number;
  total_inflow_in_base_currency: number;
  total_outflow_in_base_currency: number;
  net_cash_effect_in_base_currency: number;
  last_transaction_at: string | null;
};

export type TenantFinanceLoanDerivedTransaction = {
  id: number;
  action_type: string;
  transaction_type: string;
  loan_type: string;
  counterparty_name: string;
  installment_number: number | null;
  account_id: number | null;
  account_name: string | null;
  account_code: string | null;
  currency_id: number;
  currency_code: string;
  amount: number;
  signed_amount: number;
  amount_in_base_currency: number | null;
  signed_amount_in_base_currency: number;
  exchange_rate: number | null;
  description: string;
  notes: string | null;
  source_type: string | null;
  source_id: number | null;
  is_reconciled: boolean;
  transaction_at: string;
  alternative_date: string | null;
};

export type TenantFinanceLoanInstallmentPaymentRequest = {
  paid_amount: number;
  account_id: number | null;
  paid_at: string | null;
  allocation_mode: string;
  note: string | null;
};

export type TenantFinanceLoanInstallmentPaymentResponse = {
  success: boolean;
  message: string;
  data: {
    loan: TenantFinanceLoan;
    installment: TenantFinanceLoanInstallment;
  };
};

export type TenantFinanceLoanInstallmentReversalRequest = {
  reversed_amount: number;
  account_id: number | null;
  reversal_reason_code: string;
  note: string | null;
};

export type TenantFinanceLoanInstallmentReversalResponse = {
  success: boolean;
  message: string;
  data: {
    loan: TenantFinanceLoan;
    installment: TenantFinanceLoanInstallment;
  };
};

export type TenantFinanceLoanInstallmentBatchMutationResponse = {
  success: boolean;
  message: string;
  data: {
    loan: TenantFinanceLoan;
    affected_count: number;
    installment_ids: number[];
  };
};

export type TenantFinanceLoanInstallmentPaymentBatchRequest = {
  installment_ids: number[];
  amount_mode: string;
  paid_amount: number | null;
  account_id: number | null;
  paid_at: string | null;
  allocation_mode: string;
  note: string | null;
};

export type TenantFinanceLoanInstallmentReversalBatchRequest = {
  installment_ids: number[];
  amount_mode: string;
  reversed_amount: number | null;
  account_id: number | null;
  reversal_reason_code: string;
  note: string | null;
};

export type TenantFinanceLoanWriteRequest = {
  name: string;
  loan_type: string;
  counterparty_name: string;
  currency_id: number;
  account_id: number | null;
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

export function applyTenantFinanceLoanInstallmentPayment(
  accessToken: string,
  loanId: number,
  installmentId: number,
  payload: TenantFinanceLoanInstallmentPaymentRequest
) {
  return apiRequest<TenantFinanceLoanInstallmentPaymentResponse>(
    `/tenant/finance/loans/${loanId}/installments/${installmentId}/payment`,
    {
      method: "PATCH",
      token: accessToken,
      body: payload,
    }
  );
}

export function reverseTenantFinanceLoanInstallmentPayment(
  accessToken: string,
  loanId: number,
  installmentId: number,
  payload: TenantFinanceLoanInstallmentReversalRequest
) {
  return apiRequest<TenantFinanceLoanInstallmentReversalResponse>(
    `/tenant/finance/loans/${loanId}/installments/${installmentId}/payment/reversal`,
    {
      method: "PATCH",
      token: accessToken,
      body: payload,
    }
  );
}

export function applyTenantFinanceLoanInstallmentPaymentBatch(
  accessToken: string,
  loanId: number,
  payload: TenantFinanceLoanInstallmentPaymentBatchRequest
) {
  return apiRequest<TenantFinanceLoanInstallmentBatchMutationResponse>(
    `/tenant/finance/loans/${loanId}/installments/payment/batch`,
    {
      method: "PATCH",
      token: accessToken,
      body: payload,
    }
  );
}

export function reverseTenantFinanceLoanInstallmentPaymentBatch(
  accessToken: string,
  loanId: number,
  payload: TenantFinanceLoanInstallmentReversalBatchRequest
) {
  return apiRequest<TenantFinanceLoanInstallmentBatchMutationResponse>(
    `/tenant/finance/loans/${loanId}/installments/payment/reversal/batch`,
    {
      method: "PATCH",
      token: accessToken,
      body: payload,
    }
  );
}
