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
import { API_BASE_URL, apiRequest } from "../../../../../services/api";
import type { ApiError, ApiErrorPayload } from "../../../../../types";

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
  tag_ids: number[];
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

export type TenantFinanceTransactionAttachment = {
  id: number;
  transaction_id: number;
  file_name: string;
  content_type: string | null;
  file_size: number;
  notes: string | null;
  uploaded_by_user_id: number | null;
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
    attachments: TenantFinanceTransactionAttachment[];
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
  tagId?: number | null;
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

export type TenantFinanceTransactionAttachmentMutationResponse = {
  success: boolean;
  message: string;
  data: TenantFinanceTransactionAttachment;
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
  if (filters.tagId != null) {
    params.set("tag_id", String(filters.tagId));
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

export function uploadTenantFinanceTransactionAttachment(
  accessToken: string,
  transactionId: number,
  file: File,
  notes?: string
) {
  const body = new FormData();
  body.append("file", file);
  if (notes?.trim()) {
    body.append("notes", notes.trim());
  }
  return apiRequest<TenantFinanceTransactionAttachmentMutationResponse>(
    `/tenant/finance/transactions/${transactionId}/attachments`,
    {
      method: "POST",
      token: accessToken,
      body,
    }
  );
}

export function deleteTenantFinanceTransactionAttachment(
  accessToken: string,
  transactionId: number,
  attachmentId: number
) {
  return apiRequest<{
    success: boolean;
    message: string;
    data: { attachment_id: number; transaction_id: number };
  }>(`/tenant/finance/transactions/${transactionId}/attachments/${attachmentId}`, {
    method: "DELETE",
    token: accessToken,
  });
}

export async function downloadTenantFinanceTransactionAttachment(
  accessToken: string,
  transactionId: number,
  attachmentId: number
) {
  let response: Response;
  try {
    response = await fetch(
      `${API_BASE_URL}/tenant/finance/transactions/${transactionId}/attachments/${attachmentId}/download`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
  } catch {
    const error = new Error(
      `No se pudo conectar con la API en ${API_BASE_URL}. Revisa VITE_API_BASE_URL, CORS y que el backend esté levantado.`
    ) as ApiError;
    error.payload = {
      detail:
        `No se pudo conectar con la API en ${API_BASE_URL}. ` +
        "Revisa VITE_API_BASE_URL, CORS y que el backend esté levantado.",
      error_type: "network_error",
    };
    throw error;
  }

  if (!response.ok) {
    let payload: ApiErrorPayload | undefined;
    try {
      payload = (await response.json()) as ApiErrorPayload;
    } catch {
      payload = undefined;
    }
    const error = new Error(
      payload?.detail || `Request failed with status ${response.status}`
    ) as ApiError;
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return {
    blob: await response.blob(),
    contentType: response.headers.get("content-type"),
  };
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
  note?: string,
  reasonCode?: string
) {
  return apiRequest<TenantFinanceTransactionMutationResponse>(
    `/tenant/finance/transactions/${transactionId}/reconciliation`,
    {
      method: "PATCH",
      token: accessToken,
      body: {
        is_reconciled: isReconciled,
        note: note || null,
        reason_code: reasonCode || null,
      },
    }
  );
}

export function updateTenantFinanceTransactionsReconciliationBatch(
  accessToken: string,
  transactionIds: number[],
  isReconciled: boolean,
  note?: string,
  reasonCode?: string
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
        reason_code: reasonCode || null,
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
