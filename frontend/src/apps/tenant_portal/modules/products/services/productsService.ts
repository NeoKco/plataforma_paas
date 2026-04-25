import { apiRequest } from "../../../../../services/api";

export type ProductCatalogProductCharacteristic = {
  id: number | null;
  label: string;
  value: string;
  sort_order: number;
};

export type ProductCatalogItem = {
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
  characteristics: ProductCatalogProductCharacteristic[];
};

export type ProductCatalogConnector = {
  id: number;
  name: string;
  connector_kind: string;
  base_url: string | null;
  default_currency_code: string;
  supports_batch: boolean;
  supports_price_tracking: boolean;
  is_active: boolean;
  config_notes: string | null;
  last_sync_at: string | null;
  last_sync_status: string;
  source_total: number;
  price_event_total: number;
  created_at: string | null;
  updated_at: string | null;
};

export type ProductCatalogConnectorWriteRequest = {
  name: string;
  connector_kind: string;
  base_url: string | null;
  default_currency_code: string;
  supports_batch: boolean;
  supports_price_tracking: boolean;
  is_active: boolean;
  config_notes: string | null;
};

export type ProductCatalogProductSource = {
  id: number;
  product_id: number;
  connector_id: number | null;
  connector_name: string | null;
  draft_id: number | null;
  run_item_id: number | null;
  source_kind: string;
  source_label: string | null;
  source_url: string | null;
  external_reference: string | null;
  source_status: string;
  latest_unit_price: number;
  currency_code: string;
  source_summary: string | null;
  captured_at: string | null;
  last_seen_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type ProductCatalogProductSourceWriteRequest = {
  connector_id: number | null;
  source_kind: string;
  source_label: string | null;
  source_url: string | null;
  external_reference: string | null;
  source_status: string;
  latest_unit_price: number;
  currency_code: string;
  source_summary: string | null;
};

export type ProductCatalogPriceHistoryItem = {
  id: number;
  product_id: number;
  product_name: string | null;
  product_source_id: number | null;
  connector_id: number | null;
  connector_name: string | null;
  draft_id: number | null;
  price_kind: string;
  unit_price: number;
  currency_code: string;
  source_label: string | null;
  source_url: string | null;
  notes: string | null;
  captured_at: string | null;
  created_at: string | null;
};

export type ProductCatalogPriceHistoryWriteRequest = {
  connector_id: number | null;
  source_label: string | null;
  source_url: string | null;
  unit_price: number;
  currency_code: string;
  price_kind: string;
  notes: string | null;
};

export type ProductCatalogWriteRequest = {
  sku: string | null;
  name: string;
  product_type: string;
  unit_label: string | null;
  unit_price: number;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  characteristics: ProductCatalogProductCharacteristic[];
};

export type ProductCatalogIngestionCharacteristic = {
  id: number | null;
  label: string;
  value: string;
  sort_order: number;
};

export type ProductCatalogIngestionDraft = {
  id: number;
  source_kind: string;
  source_label: string | null;
  source_url: string | null;
  connector_id: number | null;
  connector_name: string | null;
  external_reference: string | null;
  capture_status: string;
  sku: string | null;
  name: string | null;
  brand: string | null;
  category_label: string | null;
  product_type: string;
  unit_label: string | null;
  unit_price: number;
  currency_code: string;
  description: string | null;
  source_excerpt: string | null;
  extraction_notes: string | null;
  review_notes: string | null;
  created_by_user_id: number | null;
  reviewed_by_user_id: number | null;
  published_product_id: number | null;
  published_product_name: string | null;
  published_at: string | null;
  discarded_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  characteristics: ProductCatalogIngestionCharacteristic[];
  duplicate_summary: ProductCatalogDuplicateSummary | null;
  duplicate_candidates: ProductCatalogDuplicateCandidate[];
  enrichment_state: ProductCatalogEnrichmentState | null;
};

export type ProductCatalogDuplicateCandidate = {
  candidate_kind: string;
  candidate_id: number;
  label: string;
  sku: string | null;
  brand: string | null;
  capture_status: string | null;
  score: number;
  reasons: string[];
};

export type ProductCatalogDuplicateSummary = {
  status: string;
  top_score: number;
  candidate_count: number;
  top_reason: string | null;
};

export type ProductCatalogEnrichmentState = {
  status: string;
  strategy: string | null;
  summary: string | null;
  ai_available: boolean;
};

export type ProductCatalogDuplicateResolutionMode = "update_existing" | "link_existing";

export type ProductCatalogIngestionDraftWriteRequest = {
  source_kind: string;
  source_label: string | null;
  source_url: string | null;
  connector_id: number | null;
  external_reference: string | null;
  sku: string | null;
  name: string | null;
  brand: string | null;
  category_label: string | null;
  product_type: string;
  unit_label: string | null;
  unit_price: number;
  currency_code: string;
  description: string | null;
  source_excerpt: string | null;
  extraction_notes: string | null;
  characteristics: ProductCatalogIngestionCharacteristic[];
};

export type ProductCatalogIngestionExtractUrlRequest = {
  source_url: string;
  source_label: string | null;
  connector_id: number | null;
  external_reference: string | null;
};

export type ProductCatalogIngestionRunEntry = {
  source_url: string;
  source_label: string | null;
  connector_id: number | null;
  external_reference: string | null;
};

export type ProductCatalogIngestionRunItem = {
  id: number;
  run_id: number;
  source_url: string;
  source_label: string | null;
  connector_id: number | null;
  connector_name: string | null;
  external_reference: string | null;
  item_status: string;
  draft_id: number | null;
  extracted_name: string | null;
  error_message: string | null;
  processed_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type ProductCatalogIngestionRun = {
  id: number;
  status: string;
  source_mode: string;
  source_label: string | null;
  connector_id: number | null;
  connector_name: string | null;
  requested_count: number;
  processed_count: number;
  completed_count: number;
  error_count: number;
  cancelled_count: number;
  created_by_user_id: number | null;
  started_at: string | null;
  finished_at: string | null;
  cancelled_at: string | null;
  last_error: string | null;
  created_at: string | null;
  updated_at: string | null;
  items: ProductCatalogIngestionRunItem[];
};

export type ProductCatalogIngestionRunCreateRequest = {
  source_label: string | null;
  connector_id: number | null;
  entries: ProductCatalogIngestionRunEntry[];
};

type ProductCatalogProductsResponse = {
  success: boolean;
  message: string;
  total: number;
  data: ProductCatalogItem[];
};

type ProductCatalogMutationResponse = {
  success: boolean;
  message: string;
  data: ProductCatalogItem;
};

type ProductCatalogConnectorsResponse = {
  success: boolean;
  message: string;
  total: number;
  data: ProductCatalogConnector[];
};

type ProductCatalogConnectorMutationResponse = {
  success: boolean;
  message: string;
  data: ProductCatalogConnector;
};

type ProductCatalogSourcesResponse = {
  success: boolean;
  message: string;
  total: number;
  data: ProductCatalogProductSource[];
};

type ProductCatalogSourceMutationResponse = {
  success: boolean;
  message: string;
  data: ProductCatalogProductSource;
};

type ProductCatalogPriceHistoryResponse = {
  success: boolean;
  message: string;
  total: number;
  data: ProductCatalogPriceHistoryItem[];
};

type ProductCatalogIngestionDraftsResponse = {
  success: boolean;
  message: string;
  total: number;
  data: ProductCatalogIngestionDraft[];
};

type ProductCatalogIngestionDraftMutationResponse = {
  success: boolean;
  message: string;
  data: ProductCatalogIngestionDraft;
};

type ProductCatalogIngestionApprovalResponse = {
  success: boolean;
  message: string;
  data: ProductCatalogIngestionDraft;
  published_product: ProductCatalogItem;
};

type ProductCatalogIngestionRunsResponse = {
  success: boolean;
  message: string;
  total: number;
  data: ProductCatalogIngestionRun[];
};

type ProductCatalogIngestionRunMutationResponse = {
  success: boolean;
  message: string;
  data: ProductCatalogIngestionRun;
};

export type ProductCatalogOverviewResponse = {
  success: boolean;
  message: string;
  metrics: {
    products_total: number;
    products_active: number;
    ingestion_total: number;
    ingestion_draft: number;
    approved_total: number;
    discarded_total: number;
    url_source_total: number;
    run_total: number;
    run_active: number;
    source_total: number;
    source_active: number;
    price_event_total: number;
    connector_total: number;
    connector_active: number;
  };
  recent_products: ProductCatalogItem[];
  recent_drafts: ProductCatalogIngestionDraft[];
  recent_sources: ProductCatalogProductSource[];
  recent_prices: ProductCatalogPriceHistoryItem[];
  recent_connectors: ProductCatalogConnector[];
};

type ProductCatalogIngestionOverviewResponse = {
  success: boolean;
  message: string;
  metrics: {
    total: number;
    draft: number;
    approved: number;
    discarded: number;
    with_url: number;
  };
  recent_drafts: ProductCatalogIngestionDraft[];
};

export function getProductCatalogOverview(accessToken: string) {
  return apiRequest<ProductCatalogOverviewResponse>("/tenant/products/overview", {
    token: accessToken,
  });
}

export function getProductCatalogItems(accessToken: string) {
  return apiRequest<ProductCatalogProductsResponse>("/tenant/products/catalog", {
    token: accessToken,
  });
}

export function createProductCatalogItem(accessToken: string, payload: ProductCatalogWriteRequest) {
  return apiRequest<ProductCatalogMutationResponse>("/tenant/products/catalog", {
    method: "POST",
    token: accessToken,
    body: payload,
  });
}

export function updateProductCatalogItem(accessToken: string, productId: number, payload: ProductCatalogWriteRequest) {
  return apiRequest<ProductCatalogMutationResponse>(`/tenant/products/catalog/${productId}`, {
    method: "PUT",
    token: accessToken,
    body: payload,
  });
}

export function updateProductCatalogItemStatus(accessToken: string, productId: number, isActive: boolean) {
  return apiRequest<ProductCatalogMutationResponse>(`/tenant/products/catalog/${productId}/status`, {
    method: "PATCH",
    token: accessToken,
    body: { is_active: isActive },
  });
}

export function deleteProductCatalogItem(accessToken: string, productId: number) {
  return apiRequest<ProductCatalogMutationResponse>(`/tenant/products/catalog/${productId}`, {
    method: "DELETE",
    token: accessToken,
  });
}

export function getProductCatalogConnectors(accessToken: string, includeInactive = true) {
  const suffix = includeInactive ? "?include_inactive=true" : "?include_inactive=false";
  return apiRequest<ProductCatalogConnectorsResponse>(`/tenant/products/connectors${suffix}`, {
    token: accessToken,
  });
}

export function createProductCatalogConnector(accessToken: string, payload: ProductCatalogConnectorWriteRequest) {
  return apiRequest<ProductCatalogConnectorMutationResponse>("/tenant/products/connectors", {
    method: "POST",
    token: accessToken,
    body: payload,
  });
}

export function updateProductCatalogConnector(accessToken: string, connectorId: number, payload: ProductCatalogConnectorWriteRequest) {
  return apiRequest<ProductCatalogConnectorMutationResponse>(`/tenant/products/connectors/${connectorId}`, {
    method: "PUT",
    token: accessToken,
    body: payload,
  });
}

export function updateProductCatalogConnectorStatus(accessToken: string, connectorId: number, isActive: boolean) {
  return apiRequest<ProductCatalogConnectorMutationResponse>(`/tenant/products/connectors/${connectorId}/status`, {
    method: "PATCH",
    token: accessToken,
    body: { is_active: isActive },
  });
}

export function deleteProductCatalogConnector(accessToken: string, connectorId: number) {
  return apiRequest<ProductCatalogConnectorMutationResponse>(`/tenant/products/connectors/${connectorId}`, {
    method: "DELETE",
    token: accessToken,
  });
}

export function getProductCatalogSources(
  accessToken: string,
  params: { product_id?: number | null; connector_id?: number | null; source_status?: string | null } = {},
) {
  const search = new URLSearchParams();
  if (params.product_id) search.set("product_id", String(params.product_id));
  if (params.connector_id) search.set("connector_id", String(params.connector_id));
  if (params.source_status) search.set("source_status", params.source_status);
  const suffix = search.size > 0 ? `?${search.toString()}` : "";
  return apiRequest<ProductCatalogSourcesResponse>(`/tenant/products/sources${suffix}`, {
    token: accessToken,
  });
}

export function createProductCatalogSource(
  accessToken: string,
  productId: number,
  payload: ProductCatalogProductSourceWriteRequest,
) {
  return apiRequest<ProductCatalogSourceMutationResponse>(`/tenant/products/catalog/${productId}/sources`, {
    method: "POST",
    token: accessToken,
    body: payload,
  });
}

export function updateProductCatalogSource(
  accessToken: string,
  sourceId: number,
  payload: ProductCatalogProductSourceWriteRequest,
) {
  return apiRequest<ProductCatalogSourceMutationResponse>(`/tenant/products/sources/${sourceId}`, {
    method: "PUT",
    token: accessToken,
    body: payload,
  });
}

export function getProductCatalogPriceHistory(
  accessToken: string,
  params: { product_id?: number | null; connector_id?: number | null } = {},
) {
  const search = new URLSearchParams();
  if (params.product_id) search.set("product_id", String(params.product_id));
  if (params.connector_id) search.set("connector_id", String(params.connector_id));
  const suffix = search.size > 0 ? `?${search.toString()}` : "";
  return apiRequest<ProductCatalogPriceHistoryResponse>(`/tenant/products/price-history${suffix}`, {
    token: accessToken,
  });
}

export function createProductCatalogPriceHistory(
  accessToken: string,
  productId: number,
  payload: ProductCatalogPriceHistoryWriteRequest,
) {
  return apiRequest<ProductCatalogPriceHistoryResponse>(`/tenant/products/catalog/${productId}/price-history`, {
    method: "POST",
    token: accessToken,
    body: payload,
  });
}

export function getProductCatalogIngestionOverview(accessToken: string) {
  return apiRequest<ProductCatalogIngestionOverviewResponse>("/tenant/products/ingestion/overview", {
    token: accessToken,
  });
}

export function getProductCatalogIngestionDrafts(
  accessToken: string,
  params: { capture_status?: string | null; q?: string | null } = {},
) {
  const search = new URLSearchParams();
  if (params.capture_status) search.set("capture_status", params.capture_status);
  if (params.q) search.set("q", params.q);
  const suffix = search.size > 0 ? `?${search.toString()}` : "";
  return apiRequest<ProductCatalogIngestionDraftsResponse>(`/tenant/products/ingestion/drafts${suffix}`, {
    token: accessToken,
  });
}

export function createProductCatalogIngestionDraft(accessToken: string, payload: ProductCatalogIngestionDraftWriteRequest) {
  return apiRequest<ProductCatalogIngestionDraftMutationResponse>("/tenant/products/ingestion/drafts", {
    method: "POST",
    token: accessToken,
    body: payload,
  });
}

export function extractProductCatalogUrl(accessToken: string, payload: ProductCatalogIngestionExtractUrlRequest) {
  return apiRequest<ProductCatalogIngestionDraftMutationResponse>("/tenant/products/ingestion/extract-url", {
    method: "POST",
    token: accessToken,
    body: payload,
  });
}

export function getProductCatalogIngestionRuns(accessToken: string) {
  return apiRequest<ProductCatalogIngestionRunsResponse>("/tenant/products/ingestion/runs", {
    token: accessToken,
  });
}

export function createProductCatalogIngestionRun(accessToken: string, payload: ProductCatalogIngestionRunCreateRequest) {
  return apiRequest<ProductCatalogIngestionRunMutationResponse>("/tenant/products/ingestion/runs", {
    method: "POST",
    token: accessToken,
    body: payload,
  });
}

export function cancelProductCatalogIngestionRun(accessToken: string, runId: number) {
  return apiRequest<ProductCatalogIngestionRunMutationResponse>(`/tenant/products/ingestion/runs/${runId}/cancel`, {
    method: "POST",
    token: accessToken,
  });
}

export function updateProductCatalogIngestionDraft(
  accessToken: string,
  draftId: number,
  payload: ProductCatalogIngestionDraftWriteRequest,
) {
  return apiRequest<ProductCatalogIngestionDraftMutationResponse>(`/tenant/products/ingestion/drafts/${draftId}`, {
    method: "PUT",
    token: accessToken,
    body: payload,
  });
}

export function updateProductCatalogIngestionDraftStatus(
  accessToken: string,
  draftId: number,
  captureStatus: "draft" | "discarded",
  reviewNotes: string | null,
) {
  return apiRequest<ProductCatalogIngestionDraftMutationResponse>(`/tenant/products/ingestion/drafts/${draftId}/status`, {
    method: "PATCH",
    token: accessToken,
    body: { capture_status: captureStatus, review_notes: reviewNotes },
  });
}

export function enrichProductCatalogIngestionDraft(
  accessToken: string,
  draftId: number,
  preferAi = true,
) {
  return apiRequest<ProductCatalogIngestionDraftMutationResponse>(`/tenant/products/ingestion/drafts/${draftId}/enrich`, {
    method: "POST",
    token: accessToken,
    body: { prefer_ai: preferAi },
  });
}

export function approveProductCatalogIngestionDraft(accessToken: string, draftId: number, reviewNotes: string | null) {
  return apiRequest<ProductCatalogIngestionApprovalResponse>(`/tenant/products/ingestion/drafts/${draftId}/approve`, {
    method: "POST",
    token: accessToken,
    body: { review_notes: reviewNotes },
  });
}

export function resolveProductCatalogDuplicate(
  accessToken: string,
  draftId: number,
  targetProductId: number,
  resolutionMode: ProductCatalogDuplicateResolutionMode,
  reviewNotes: string | null,
) {
  return apiRequest<ProductCatalogIngestionApprovalResponse>(`/tenant/products/ingestion/drafts/${draftId}/resolve-duplicate`, {
    method: "POST",
    token: accessToken,
    body: {
      target_product_id: targetProductId,
      resolution_mode: resolutionMode,
      review_notes: reviewNotes,
    },
  });
}
