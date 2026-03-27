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

export type TenantFinanceTransactionFilters = {
  transactionType?: string;
  accountId?: number | null;
  categoryId?: number | null;
  isFavorite?: boolean | null;
  isReconciled?: boolean | null;
  search?: string;
};

export type TenantFinanceTransactionBatchMutationResponse = {
  success: boolean;
  message: string;
  data: {
    affected_count: number;
    transaction_ids: number[];
  };
};

export function getTenantFinanceTransactions(
  accessToken: string,
  filters: TenantFinanceTransactionFilters = {}
) {
  const params = new URLSearchParams();
  if (filters.transactionType) {
    params.set("transaction_type", filters.transactionType);
  }
  if (filters.accountId != null) {
    params.set("account_id", String(filters.accountId));
  }
  if (filters.categoryId != null) {
    params.set("category_id", String(filters.categoryId));
  }
  if (filters.isFavorite != null) {
    params.set("is_favorite", filters.isFavorite ? "true" : "false");
  }
  if (filters.isReconciled != null) {
    params.set("is_reconciled", filters.isReconciled ? "true" : "false");
  }
  if (filters.search?.trim()) {
    params.set("search", filters.search.trim());
  }
  const query = params.toString();
  return apiRequest<TenantFinanceTransactionsResponse>(
    `/tenant/finance/transactions${query ? `?${query}` : ""}`,
    {
      token: accessToken,
    }
  );
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

export function updateTenantFinanceTransaction(
  accessToken: string,
  transactionId: number,
  payload: TenantFinanceTransactionWriteRequest
) {
  return apiRequest<TenantFinanceTransactionMutationResponse>(
    `/tenant/finance/transactions/${transactionId}`,
    {
      method: "PUT",
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

export function updateTenantFinanceTransactionFavorite(
  accessToken: string,
  transactionId: number,
  isFavorite: boolean
) {
  return apiRequest<TenantFinanceTransactionMutationResponse>(
    `/tenant/finance/transactions/${transactionId}/favorite`,
    {
      method: "PATCH",
      token: accessToken,
      body: { is_favorite: isFavorite },
    }
  );
}

export function updateTenantFinanceTransactionsFavoriteBatch(
  accessToken: string,
  transactionIds: number[],
  isFavorite: boolean
) {
  return apiRequest<TenantFinanceTransactionBatchMutationResponse>(
    "/tenant/finance/transactions/favorite/batch",
    {
      method: "PATCH",
      token: accessToken,
      body: { transaction_ids: transactionIds, is_favorite: isFavorite },
    }
  );
}

export function updateTenantFinanceTransactionReconciliation(
  accessToken: string,
  transactionId: number,
  isReconciled: boolean,
  note?: string
) {
  return apiRequest<TenantFinanceTransactionMutationResponse>(
    `/tenant/finance/transactions/${transactionId}/reconciliation`,
    {
      method: "PATCH",
      token: accessToken,
      body: { is_reconciled: isReconciled, note: note || null },
    }
  );
}

export function updateTenantFinanceTransactionsReconciliationBatch(
  accessToken: string,
  transactionIds: number[],
  isReconciled: boolean,
  note?: string
) {
  return apiRequest<TenantFinanceTransactionBatchMutationResponse>(
    "/tenant/finance/transactions/reconciliation/batch",
    {
      method: "PATCH",
      token: accessToken,
      body: {
        transaction_ids: transactionIds,
        is_reconciled: isReconciled,
        note: note || null,
      },
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
