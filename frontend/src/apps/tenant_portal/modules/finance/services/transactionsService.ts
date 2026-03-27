import type {
  TenantFinanceSummaryResponse,
  TenantFinanceUsageResponse,
} from "../../../../../types";
import {
  createTenantFinanceEntry,
  getTenantFinanceEntries,
  getTenantFinanceSummary,
  getTenantFinanceUsage,
} from "../../../../../services/tenant-api";
import { apiRequest } from "../../../../../services/api";

export type TenantFinanceTransaction = {
  id: number;
  transaction_type: string;
  account_id: number | null;
  target_account_id: number | null;
  category_id: number | null;
  beneficiary_id: number | null;
  person_id: number | null;
  project_id: number | null;
  currency_id: number;
  loan_id: number | null;
  amount: number;
  amount_in_base_currency: number | null;
  exchange_rate: number | null;
  discount_amount: number;
  amortization_months: number | null;
  transaction_at: string;
  alternative_date: string | null;
  description: string;
  notes: string | null;
  is_favorite: boolean;
  favorite_flag: boolean;
  is_reconciled: boolean;
  reconciled_at: string | null;
  is_template_origin: boolean;
  source_type: string | null;
  source_id: number | null;
  created_by_user_id: number | null;
  updated_by_user_id: number | null;
  created_at: string;
  updated_at: string;
};

export type TenantFinanceTransactionAuditEvent = {
  id: number;
  event_type: string;
  actor_user_id: number | null;
  summary: string;
  payload: Record<string, unknown> | null;
  created_at: string;
};

export type TenantFinanceTransactionsResponse = {
  success: boolean;
  message: string;
  total: number;
  data: TenantFinanceTransaction[];
};

export type TenantFinanceTransactionMutationResponse = {
  success: boolean;
  message: string;
  data: TenantFinanceTransaction;
};

export type TenantFinanceTransactionDetailResponse = {
  success: boolean;
  message: string;
  data: {
    transaction: TenantFinanceTransaction;
    audit_events: TenantFinanceTransactionAuditEvent[];
  };
};

export type TenantFinanceAccountBalance = {
  account_id: number;
  account_name: string;
  account_type: string;
  currency_id: number;
  balance: number;
  is_balance_hidden: boolean;
};

export type TenantFinanceAccountBalancesResponse = {
  success: boolean;
  message: string;
  total: number;
  data: TenantFinanceAccountBalance[];
};

export type TenantFinanceTransactionWriteRequest = {
  transaction_type: string;
  account_id: number | null;
  target_account_id: number | null;
  category_id: number | null;
  beneficiary_id: number | null;
  person_id: number | null;
  project_id: number | null;
  currency_id: number;
  loan_id: number | null;
  amount: number;
  discount_amount: number;
  exchange_rate: number | null;
  amortization_months: number | null;
  transaction_at: string;
  alternative_date: string | null;
  description: string;
  notes: string | null;
  is_favorite: boolean;
  is_reconciled: boolean;
  tag_ids: number[] | null;
};

export function getTenantFinanceTransactions(accessToken: string) {
  return apiRequest<TenantFinanceTransactionsResponse>("/tenant/finance/transactions", {
    token: accessToken,
  });
}

export function createTenantFinanceTransaction(
  accessToken: string,
  payload: TenantFinanceTransactionWriteRequest
) {
  return apiRequest<TenantFinanceTransactionMutationResponse>(
    "/tenant/finance/transactions",
    {
      method: "POST",
      token: accessToken,
      body: payload,
    }
  );
}

export function getTenantFinanceTransactionDetail(
  accessToken: string,
  transactionId: number
) {
  return apiRequest<TenantFinanceTransactionDetailResponse>(
    `/tenant/finance/transactions/${transactionId}`,
    {
      token: accessToken,
    }
  );
}

export function getTenantFinanceAccountBalances(accessToken: string) {
  return apiRequest<TenantFinanceAccountBalancesResponse>(
    "/tenant/finance/account-balances",
    {
      token: accessToken,
    }
  );
}

export {
  createTenantFinanceEntry,
  getTenantFinanceEntries,
  getTenantFinanceSummary,
  getTenantFinanceUsage,
};
export type { TenantFinanceSummaryResponse, TenantFinanceUsageResponse };
