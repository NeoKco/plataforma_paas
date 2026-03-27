import { apiRequest } from "../../../../../services/api";

export type TenantFinanceCurrency = {
  id: number;
  code: string;
  name: string;
  symbol: string;
  decimal_places: number;
  is_base: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type TenantFinanceExchangeRate = {
  id: number;
  source_currency_id: number;
  target_currency_id: number;
  rate: number;
  effective_at: string;
  source: string | null;
  note: string | null;
  created_at: string;
};

export type TenantFinanceCurrenciesResponse = {
  success: boolean;
  message: string;
  total: number;
  data: TenantFinanceCurrency[];
};

export type TenantFinanceCurrencyMutationResponse = {
  success: boolean;
  message: string;
  data: TenantFinanceCurrency;
};

export type TenantFinanceExchangeRatesResponse = {
  success: boolean;
  message: string;
  total: number;
  data: TenantFinanceExchangeRate[];
};

export type TenantFinanceExchangeRateMutationResponse = {
  success: boolean;
  message: string;
  data: TenantFinanceExchangeRate;
};

export type TenantFinanceCurrencyWriteRequest = {
  code: string;
  name: string;
  symbol: string;
  decimal_places: number;
  is_base: boolean;
  is_active: boolean;
  sort_order: number;
};

export type TenantFinanceExchangeRateWriteRequest = {
  source_currency_id: number;
  target_currency_id: number;
  rate: number;
  effective_at: string;
  source: string | null;
  note: string | null;
};

export function getTenantFinanceCurrencies(accessToken: string, includeInactive = true) {
  return apiRequest<TenantFinanceCurrenciesResponse>(
    `/tenant/finance/currencies?include_inactive=${includeInactive ? "true" : "false"}`,
    { token: accessToken }
  );
}

export function createTenantFinanceCurrency(
  accessToken: string,
  payload: TenantFinanceCurrencyWriteRequest
) {
  return apiRequest<TenantFinanceCurrencyMutationResponse>("/tenant/finance/currencies", {
    method: "POST",
    token: accessToken,
    body: payload,
  });
}

export function updateTenantFinanceCurrency(
  accessToken: string,
  currencyId: number,
  payload: TenantFinanceCurrencyWriteRequest
) {
  return apiRequest<TenantFinanceCurrencyMutationResponse>(
    `/tenant/finance/currencies/${currencyId}`,
    {
      method: "PUT",
      token: accessToken,
      body: payload,
    }
  );
}

export function updateTenantFinanceCurrencyStatus(
  accessToken: string,
  currencyId: number,
  isActive: boolean
) {
  return apiRequest<TenantFinanceCurrencyMutationResponse>(
    `/tenant/finance/currencies/${currencyId}/status`,
    {
      method: "PATCH",
      token: accessToken,
      body: { is_active: isActive },
    }
  );
}

export function getTenantFinanceExchangeRates(accessToken: string) {
  return apiRequest<TenantFinanceExchangeRatesResponse>(
    "/tenant/finance/currencies/exchange-rates",
    { token: accessToken }
  );
}

export function createTenantFinanceExchangeRate(
  accessToken: string,
  payload: TenantFinanceExchangeRateWriteRequest
) {
  return apiRequest<TenantFinanceExchangeRateMutationResponse>(
    "/tenant/finance/currencies/exchange-rates",
    {
      method: "POST",
      token: accessToken,
      body: payload,
    }
  );
}

export function updateTenantFinanceExchangeRate(
  accessToken: string,
  exchangeRateId: number,
  payload: TenantFinanceExchangeRateWriteRequest
) {
  return apiRequest<TenantFinanceExchangeRateMutationResponse>(
    `/tenant/finance/currencies/exchange-rates/${exchangeRateId}`,
    {
      method: "PUT",
      token: accessToken,
      body: payload,
    }
  );
}
