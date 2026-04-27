import { apiRequest } from "../../../../../services/api";
import { apiDownload } from "../../../../../services/api";

export type ProductCatalogProductCharacteristic = {
  id: number | null;
  label: string;
  value: string;
  sort_order: number;
};

export type ProductCatalogProductImage = {
  id: number;
  product_id: number;
  file_name: string;
  content_type: string | null;
  file_size: number;
  caption: string | null;
  is_primary: boolean;
  uploaded_by_user_id: number | null;
  created_at: string | null;
  download_url: string;
};

export type ProductCatalogProductImagePreviewResponse = {
  success: boolean;
  message: string;
  product_id: number;
  image_id: number;
  file_name: string | null;
  content_type: string | null;
  file_size: number | null;
  data_url: string;
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
  source_count: number;
  active_source_count: number;
  health_status: string;
  last_refresh_at: string | null;
  next_refresh_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  characteristics: ProductCatalogProductCharacteristic[];
  images: ProductCatalogProductImage[];
};

export type ProductCatalogConnector = {
  id: number;
  name: string;
  connector_kind: string;
  provider_key: string;
  provider_profile: string;
  base_url: string | null;
  default_currency_code: string;
  supports_batch: boolean;
  supports_price_tracking: boolean;
  is_active: boolean;
  auth_mode: string;
  auth_reference: string | null;
  request_timeout_seconds: number;
  retry_limit: number;
  retry_backoff_seconds: number;
  sync_mode: string;
  fetch_strategy: string;
  run_ai_enrichment: boolean;
  schedule_enabled: boolean;
  schedule_scope: string;
  schedule_frequency: string;
  schedule_batch_limit: number;
  next_scheduled_run_at: string | null;
  last_scheduled_run_at: string | null;
  last_schedule_status: string;
  last_schedule_summary: string | null;
  config_notes: string | null;
  last_validation_at: string | null;
  last_validation_status: string;
  last_validation_summary: string | null;
  last_sync_at: string | null;
  last_sync_status: string;
  last_sync_summary: string | null;
  source_total: number;
  price_event_total: number;
  created_at: string | null;
  updated_at: string | null;
};

export type ProductCatalogConnectorWriteRequest = {
  name: string;
  connector_kind: string;
  provider_key: string;
  provider_profile: string;
  base_url: string | null;
  default_currency_code: string;
  supports_batch: boolean;
  supports_price_tracking: boolean;
  is_active: boolean;
  auth_mode: string;
  auth_reference: string | null;
  request_timeout_seconds: number;
  retry_limit: number;
  retry_backoff_seconds: number;
  sync_mode: string;
  fetch_strategy: string;
  run_ai_enrichment: boolean;
  schedule_enabled: boolean;
  schedule_scope: string;
  schedule_frequency: string;
  schedule_batch_limit: number;
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
  sync_status: string;
  refresh_mode: string;
  refresh_merge_policy: string;
  refresh_prompt: string | null;
  latest_unit_price: number;
  currency_code: string;
  source_summary: string | null;
  captured_at: string | null;
  last_seen_at: string | null;
  last_sync_attempt_at: string | null;
  next_refresh_at: string | null;
  last_refresh_success_at: string | null;
  last_sync_error: string | null;
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
  refresh_mode: string;
  refresh_merge_policy: string;
  refresh_prompt: string | null;
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

type ProductCatalogImageMutationResponse = {
  success: boolean;
  message: string;
  data: ProductCatalogProductImage;
};

type ProductCatalogImageDeleteResponse = {
  success: boolean;
  message: string;
  product_id: number;
  deleted_id: number;
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

type ProductCatalogConnectorScheduleRunResponse = {
  success: boolean;
  message: string;
  data: ProductCatalogRefreshRun;
};

export type ProductCatalogConnectorValidationPreview = {
  source_url: string;
  source_kind: string;
  source_label: string | null;
  name: string | null;
  sku: string | null;
  brand: string | null;
  category_label: string | null;
  product_type: string | null;
  unit_price: number;
  currency_code: string | null;
  characteristic_count: number;
  extraction_notes: string | null;
};

export type ProductCatalogConnectorValidationResponse = {
  success: boolean;
  message: string;
  connector_id: number;
  connector_name: string;
  status: string;
  detail: string | null;
  preview: ProductCatalogConnectorValidationPreview | null;
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

type ProductCatalogIngestionDraftDeleteResponse = {
  success: boolean;
  message: string;
  deleted_id: number;
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
    connector_scheduled: number;
    connector_schedule_due: number;
    products_with_source: number;
    products_with_multi_source: number;
    refresh_run_total: number;
    refresh_run_active: number;
    source_due: number;
    source_error: number;
  };
  recent_products: ProductCatalogItem[];
  recent_drafts: ProductCatalogIngestionDraft[];
  recent_sources: ProductCatalogProductSource[];
  recent_prices: ProductCatalogPriceHistoryItem[];
  recent_connectors: ProductCatalogConnector[];
  recent_comparisons: ProductCatalogComparisonItem[];
  recent_refresh_runs: ProductCatalogRefreshRun[];
};

export type ProductCatalogRefreshResult = {
  product_id: number;
  product_name: string;
  refreshed_sources: number;
  completed_sources: number;
  error_sources: number;
  changed_fields: string[];
  merge_policies: string[];
  message: string | null;
};

export type ProductCatalogRefreshMutationResponse = {
  success: boolean;
  message: string;
  product: ProductCatalogItem;
  result: ProductCatalogRefreshResult;
};

export type ProductCatalogRefreshRunItem = {
  id: number;
  run_id: number;
  product_id: number;
  product_name: string | null;
  product_source_id: number | null;
  item_status: string;
  source_url: string | null;
  source_label: string | null;
  merge_policy: string;
  used_ai_enrichment: boolean;
  changed_fields: string[];
  error_message: string | null;
  processed_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type ProductCatalogRefreshRun = {
  id: number;
  status: string;
  scope: string;
  scope_label: string | null;
  connector_id: number | null;
  connector_name: string | null;
  requested_count: number;
  processed_count: number;
  completed_count: number;
  error_count: number;
  cancelled_count: number;
  prefer_ai: boolean;
  created_by_user_id: number | null;
  started_at: string | null;
  finished_at: string | null;
  cancelled_at: string | null;
  last_error: string | null;
  created_at: string | null;
  updated_at: string | null;
  items: ProductCatalogRefreshRunItem[];
};

export type ProductCatalogRefreshRunCreateRequest = {
  scope: "due_sources" | "active_sources" | "selected_products";
  connector_id: number | null;
  product_ids: number[];
  limit: number;
  prefer_ai: boolean;
};

export type ProductCatalogConnectorSyncItem = {
  source_id: number;
  product_id: number;
  connector_id: number | null;
  source_label: string | null;
  source_url: string | null;
  sync_status: string;
  unit_price: number;
  currency_code: string;
  detail: string | null;
};

export type ProductCatalogConnectorSyncResponse = {
  success: boolean;
  message: string;
  connector_id: number;
  connector_name: string;
  processed: number;
  synced: number;
  failed: number;
  skipped: number;
  price_updates: number;
  data: ProductCatalogConnectorSyncItem[];
};

export type ProductCatalogSchedulerConnectorItem = {
  id: number;
  name: string;
  provider_key: string;
  provider_profile: string;
  schedule_frequency: string;
  schedule_batch_limit: number;
  next_scheduled_run_at: string | null;
  last_scheduled_run_at: string | null;
  last_schedule_status: string;
  last_schedule_summary: string | null;
  due_source_count: number;
};

export type ProductCatalogSchedulerOverviewResponse = {
  success: boolean;
  message: string;
  due_total: number;
  data: ProductCatalogSchedulerConnectorItem[];
  recent_runs: ProductCatalogRefreshRun[];
};

export type ProductCatalogSchedulerBatchRunItem = {
  connector_id: number;
  connector_name: string;
  status: string;
  run_id: number | null;
  processed_count: number;
  completed_count: number;
  error_count: number;
  detail: string | null;
};

export type ProductCatalogSchedulerBatchRunResponse = {
  success: boolean;
  message: string;
  processed: number;
  launched: number;
  failed: number;
  data: ProductCatalogSchedulerBatchRunItem[];
};

export type ProductCatalogComparisonSource = {
  source_id: number;
  connector_id: number | null;
  connector_name: string | null;
  source_label: string | null;
  source_url: string | null;
  source_status: string;
  sync_status: string;
  latest_unit_price: number;
  currency_code: string;
  last_seen_at: string | null;
};

export type ProductCatalogComparisonItem = {
  product_id: number;
  product_name: string;
  product_sku: string | null;
  source_count: number;
  active_source_count: number;
  recommended_source_id: number | null;
  recommended_reason: string | null;
  recommended_price: number | null;
  recommended_currency_code: string | null;
  lowest_price: number | null;
  highest_price: number | null;
  price_spread: number | null;
  price_spread_percent: number | null;
  latest_seen_at: string | null;
  sources: ProductCatalogComparisonSource[];
};

type ProductCatalogComparisonsResponse = {
  success: boolean;
  message: string;
  total: number;
  data: ProductCatalogComparisonItem[];
};

type ProductCatalogRefreshRunsResponse = {
  success: boolean;
  message: string;
  total: number;
  data: ProductCatalogRefreshRun[];
};

type ProductCatalogRefreshRunMutationResponse = {
  success: boolean;
  message: string;
  data: ProductCatalogRefreshRun;
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

export function getProductCatalogItem(accessToken: string, productId: number) {
  return apiRequest<ProductCatalogMutationResponse>(`/tenant/products/catalog/${productId}`, {
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

export function uploadProductCatalogImage(
  accessToken: string,
  productId: number,
  file: File,
  caption: string | null,
  isPrimary = false
) {
  const body = new FormData();
  body.append("file", file);
  if (caption && caption.trim()) {
    body.append("caption", caption.trim());
  }
  body.append("is_primary", String(isPrimary));
  return apiRequest<ProductCatalogImageMutationResponse>(`/tenant/products/catalog/${productId}/images`, {
    method: "POST",
    token: accessToken,
    body,
  });
}

export function setPrimaryProductCatalogImage(
  accessToken: string,
  productId: number,
  imageId: number
) {
  return apiRequest<ProductCatalogImageMutationResponse>(
    `/tenant/products/catalog/${productId}/images/${imageId}/primary`,
    {
      method: "PATCH",
      token: accessToken,
    }
  );
}

export function deleteProductCatalogImage(
  accessToken: string,
  productId: number,
  imageId: number
) {
  return apiRequest<ProductCatalogImageDeleteResponse>(
    `/tenant/products/catalog/${productId}/images/${imageId}`,
    {
      method: "DELETE",
      token: accessToken,
    }
  );
}

export function downloadProductCatalogImage(
  accessToken: string,
  productId: number,
  imageId: number
) {
  return apiDownload(`/tenant/products/catalog/${productId}/images/${imageId}/download`, {
    token: accessToken,
  });
}

export function getProductCatalogImagePreview(
  accessToken: string,
  productId: number,
  imageId: number
) {
  return apiRequest<ProductCatalogProductImagePreviewResponse>(
    `/tenant/products/catalog/${productId}/images/${imageId}/preview`,
    {
      token: accessToken,
    }
  );
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

export function syncProductCatalogConnector(
  accessToken: string,
  connectorId: number,
  payload: { product_id?: number | null; limit?: number },
) {
  return apiRequest<ProductCatalogConnectorSyncResponse>(`/tenant/products/connectors/${connectorId}/sync`, {
    method: "POST",
    token: accessToken,
    body: payload,
  });
}

export function runProductCatalogConnectorSchedule(accessToken: string, connectorId: number) {
  return apiRequest<ProductCatalogConnectorScheduleRunResponse>(`/tenant/products/connectors/${connectorId}/schedule/run`, {
    method: "POST",
    token: accessToken,
  });
}

export function validateProductCatalogConnector(accessToken: string, connectorId: number) {
  return apiRequest<ProductCatalogConnectorValidationResponse>(`/tenant/products/connectors/${connectorId}/validate`, {
    method: "POST",
    token: accessToken,
  });
}

export function getProductCatalogSchedulerOverview(accessToken: string) {
  return apiRequest<ProductCatalogSchedulerOverviewResponse>("/tenant/products/scheduler/overview", {
    token: accessToken,
  });
}

export function runProductCatalogDueScheduler(accessToken: string) {
  return apiRequest<ProductCatalogSchedulerBatchRunResponse>("/tenant/products/scheduler/run-due", {
    method: "POST",
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

export function getProductCatalogComparisons(
  accessToken: string,
  params: { product_id?: number | null; connector_id?: number | null; limit?: number | null } = {},
) {
  const search = new URLSearchParams();
  if (params.product_id) search.set("product_id", String(params.product_id));
  if (params.connector_id) search.set("connector_id", String(params.connector_id));
  if (params.limit) search.set("limit", String(params.limit));
  const suffix = search.size > 0 ? `?${search.toString()}` : "";
  return apiRequest<ProductCatalogComparisonsResponse>(`/tenant/products/comparisons${suffix}`, {
    token: accessToken,
  });
}

export function refreshProductCatalogItemNow(accessToken: string, productId: number, preferAi = true) {
  return apiRequest<ProductCatalogRefreshMutationResponse>(`/tenant/products/catalog/${productId}/refresh`, {
    method: "POST",
    token: accessToken,
    body: { prefer_ai: preferAi },
  });
}

export function getProductCatalogRefreshRuns(accessToken: string) {
  return apiRequest<ProductCatalogRefreshRunsResponse>("/tenant/products/refresh-runs", {
    token: accessToken,
  });
}

export function createProductCatalogRefreshRun(
  accessToken: string,
  payload: ProductCatalogRefreshRunCreateRequest,
) {
  return apiRequest<ProductCatalogRefreshRunMutationResponse>("/tenant/products/refresh-runs", {
    method: "POST",
    token: accessToken,
    body: payload,
  });
}

export function cancelProductCatalogRefreshRun(accessToken: string, runId: number) {
  return apiRequest<ProductCatalogRefreshRunMutationResponse>(`/tenant/products/refresh-runs/${runId}/cancel`, {
    method: "POST",
    token: accessToken,
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

export function deleteProductCatalogIngestionDraft(accessToken: string, draftId: number) {
  return apiRequest<ProductCatalogIngestionDraftDeleteResponse>(`/tenant/products/ingestion/drafts/${draftId}`, {
    method: "DELETE",
    token: accessToken,
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
