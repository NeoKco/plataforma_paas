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
};

export type ProductCatalogIngestionDraftWriteRequest = {
  source_kind: string;
  source_label: string | null;
  source_url: string | null;
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
  external_reference: string | null;
};

export type ProductCatalogIngestionRunEntry = {
  source_url: string;
  source_label: string | null;
  external_reference: string | null;
};

export type ProductCatalogIngestionRunItem = {
  id: number;
  run_id: number;
  source_url: string;
  source_label: string | null;
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
  };
  recent_products: ProductCatalogItem[];
  recent_drafts: ProductCatalogIngestionDraft[];
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

export function approveProductCatalogIngestionDraft(accessToken: string, draftId: number, reviewNotes: string | null) {
  return apiRequest<ProductCatalogIngestionApprovalResponse>(`/tenant/products/ingestion/drafts/${draftId}/approve`, {
    method: "POST",
    token: accessToken,
    body: { review_notes: reviewNotes },
  });
}
