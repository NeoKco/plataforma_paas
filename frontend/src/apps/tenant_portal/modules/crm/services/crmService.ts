import { apiRequest } from "../../../../../services/api";

export type CRMRequestedBy = {
  user_id: number;
  email: string;
  role: string;
  tenant_slug: string;
  token_scope: string;
};

export type CRMProduct = {
  id: number;
  sku: string | null;
  name: string;
  product_type: string;
  unit_label: string | null;
  unit_price: number;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string | null;
  updated_at: string | null;
};

export type CRMProductWriteRequest = {
  sku: string | null;
  name: string;
  product_type: string;
  unit_label: string | null;
  unit_price: number;
  description: string | null;
  is_active: boolean;
  sort_order: number;
};

export type CRMOpportunity = {
  id: number;
  client_id: number | null;
  client_display_name: string | null;
  title: string;
  stage: string;
  owner_user_id: number | null;
  expected_value: number | null;
  probability_percent: number;
  expected_close_at: string | null;
  source_channel: string | null;
  summary: string | null;
  next_step: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string | null;
  updated_at: string | null;
};

export type CRMOpportunityWriteRequest = {
  client_id: number | null;
  title: string;
  stage: string;
  owner_user_id: number | null;
  expected_value: number | null;
  probability_percent: number;
  expected_close_at: string | null;
  source_channel: string | null;
  summary: string | null;
  next_step: string | null;
  is_active: boolean;
  sort_order: number;
};

export type CRMQuoteLine = {
  id: number | null;
  product_id: number | null;
  product_name?: string | null;
  line_type: string;
  name: string;
  description: string | null;
  quantity: number;
  unit_price: number;
  line_total: number;
  sort_order: number;
};

export type CRMQuote = {
  id: number;
  client_id: number | null;
  client_display_name: string | null;
  opportunity_id: number | null;
  opportunity_title: string | null;
  quote_number: string | null;
  title: string;
  quote_status: string;
  valid_until: string | null;
  subtotal_amount: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  summary: string | null;
  notes: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string | null;
  updated_at: string | null;
  lines: CRMQuoteLine[];
};

export type CRMQuoteWriteRequest = {
  client_id: number | null;
  opportunity_id: number | null;
  quote_number: string | null;
  title: string;
  quote_status: string;
  valid_until: string | null;
  discount_amount: number;
  tax_amount: number;
  summary: string | null;
  notes: string | null;
  is_active: boolean;
  sort_order: number;
  lines: Array<{
    id: number | null;
    product_id: number | null;
    line_type: string;
    name: string;
    description: string | null;
    quantity: number;
    unit_price: number;
    sort_order: number;
  }>;
};

type CRMProductsResponse = {
  success: boolean;
  message: string;
  requested_by: CRMRequestedBy;
  total: number;
  data: CRMProduct[];
};

type CRMProductMutationResponse = {
  success: boolean;
  message: string;
  requested_by: CRMRequestedBy;
  data: CRMProduct;
};

type CRMOpportunitiesResponse = {
  success: boolean;
  message: string;
  requested_by: CRMRequestedBy;
  total: number;
  pipeline_value: number;
  data: CRMOpportunity[];
};

type CRMOpportunityMutationResponse = {
  success: boolean;
  message: string;
  requested_by: CRMRequestedBy;
  data: CRMOpportunity;
};

type CRMQuotesResponse = {
  success: boolean;
  message: string;
  requested_by: CRMRequestedBy;
  total: number;
  quoted_amount: number;
  data: CRMQuote[];
};

type CRMQuoteMutationResponse = {
  success: boolean;
  message: string;
  requested_by: CRMRequestedBy;
  data: CRMQuote;
};

export type CRMOverviewResponse = {
  success: boolean;
  message: string;
  requested_by: CRMRequestedBy;
  metrics: {
    products_total: number;
    products_active: number;
    opportunities_total: number;
    pipeline_value: number;
    quotes_total: number;
    quoted_amount: number;
  };
  recent_opportunities: CRMOpportunity[];
  recent_quotes: CRMQuote[];
};

export function getCRMOverview(accessToken: string) {
  return apiRequest<CRMOverviewResponse>("/tenant/crm/overview", {
    token: accessToken,
  });
}

export function getCRMProducts(accessToken: string) {
  return apiRequest<CRMProductsResponse>("/tenant/crm/products", {
    token: accessToken,
  });
}

export function createCRMProduct(accessToken: string, payload: CRMProductWriteRequest) {
  return apiRequest<CRMProductMutationResponse>("/tenant/crm/products", {
    method: "POST",
    token: accessToken,
    body: payload,
  });
}

export function updateCRMProduct(accessToken: string, productId: number, payload: CRMProductWriteRequest) {
  return apiRequest<CRMProductMutationResponse>(`/tenant/crm/products/${productId}`, {
    method: "PUT",
    token: accessToken,
    body: payload,
  });
}

export function updateCRMProductStatus(accessToken: string, productId: number, isActive: boolean) {
  return apiRequest<CRMProductMutationResponse>(`/tenant/crm/products/${productId}/status`, {
    method: "PATCH",
    token: accessToken,
    body: { is_active: isActive },
  });
}

export function deleteCRMProduct(accessToken: string, productId: number) {
  return apiRequest<CRMProductMutationResponse>(`/tenant/crm/products/${productId}`, {
    method: "DELETE",
    token: accessToken,
  });
}

export function getCRMOpportunities(accessToken: string) {
  return apiRequest<CRMOpportunitiesResponse>("/tenant/crm/opportunities", {
    token: accessToken,
  });
}

export function createCRMOpportunity(accessToken: string, payload: CRMOpportunityWriteRequest) {
  return apiRequest<CRMOpportunityMutationResponse>("/tenant/crm/opportunities", {
    method: "POST",
    token: accessToken,
    body: payload,
  });
}

export function updateCRMOpportunity(accessToken: string, opportunityId: number, payload: CRMOpportunityWriteRequest) {
  return apiRequest<CRMOpportunityMutationResponse>(`/tenant/crm/opportunities/${opportunityId}`, {
    method: "PUT",
    token: accessToken,
    body: payload,
  });
}

export function updateCRMOpportunityStatus(accessToken: string, opportunityId: number, isActive: boolean) {
  return apiRequest<CRMOpportunityMutationResponse>(`/tenant/crm/opportunities/${opportunityId}/status`, {
    method: "PATCH",
    token: accessToken,
    body: { is_active: isActive },
  });
}

export function deleteCRMOpportunity(accessToken: string, opportunityId: number) {
  return apiRequest<CRMOpportunityMutationResponse>(`/tenant/crm/opportunities/${opportunityId}`, {
    method: "DELETE",
    token: accessToken,
  });
}

export function getCRMQuotes(accessToken: string) {
  return apiRequest<CRMQuotesResponse>("/tenant/crm/quotes", {
    token: accessToken,
  });
}

export function createCRMQuote(accessToken: string, payload: CRMQuoteWriteRequest) {
  return apiRequest<CRMQuoteMutationResponse>("/tenant/crm/quotes", {
    method: "POST",
    token: accessToken,
    body: payload,
  });
}

export function updateCRMQuote(accessToken: string, quoteId: number, payload: CRMQuoteWriteRequest) {
  return apiRequest<CRMQuoteMutationResponse>(`/tenant/crm/quotes/${quoteId}`, {
    method: "PUT",
    token: accessToken,
    body: payload,
  });
}

export function updateCRMQuoteStatus(accessToken: string, quoteId: number, isActive: boolean) {
  return apiRequest<CRMQuoteMutationResponse>(`/tenant/crm/quotes/${quoteId}/status`, {
    method: "PATCH",
    token: accessToken,
    body: { is_active: isActive },
  });
}

export function deleteCRMQuote(accessToken: string, quoteId: number) {
  return apiRequest<CRMQuoteMutationResponse>(`/tenant/crm/quotes/${quoteId}`, {
    method: "DELETE",
    token: accessToken,
  });
}
