from datetime import datetime

from pydantic import BaseModel, Field

from app.apps.tenant_modules.core.schemas import TenantUserContextResponse


class ProductCatalogStatusUpdateRequest(BaseModel):
    is_active: bool


class ProductCatalogProductCharacteristicWriteRequest(BaseModel):
    id: int | None = None
    label: str
    value: str
    sort_order: int = 100


class ProductCatalogProductCharacteristicItemResponse(BaseModel):
    id: int
    product_id: int
    label: str
    value: str
    sort_order: int
    created_at: datetime | None = None

    class Config:
        from_attributes = True


class ProductCatalogProductCreateRequest(BaseModel):
    sku: str | None = None
    name: str
    product_type: str = "service"
    unit_label: str | None = None
    unit_price: float = 0
    description: str | None = None
    is_active: bool = True
    sort_order: int = 100
    characteristics: list[ProductCatalogProductCharacteristicWriteRequest] = Field(default_factory=list)


class ProductCatalogProductUpdateRequest(ProductCatalogProductCreateRequest):
    pass


class ProductCatalogConnectorCreateRequest(BaseModel):
    name: str
    connector_kind: str = "generic_url"
    base_url: str | None = None
    default_currency_code: str = "CLP"
    supports_batch: bool = True
    supports_price_tracking: bool = True
    is_active: bool = True
    sync_mode: str = "manual"
    fetch_strategy: str = "html_generic"
    run_ai_enrichment: bool = False
    config_notes: str | None = None


class ProductCatalogConnectorUpdateRequest(ProductCatalogConnectorCreateRequest):
    pass


class ProductCatalogConnectorStatusUpdateRequest(BaseModel):
    is_active: bool


class ProductCatalogConnectorItemResponse(BaseModel):
    id: int
    name: str
    connector_kind: str
    base_url: str | None = None
    default_currency_code: str
    supports_batch: bool
    supports_price_tracking: bool
    is_active: bool
    sync_mode: str
    fetch_strategy: str
    run_ai_enrichment: bool
    config_notes: str | None = None
    last_sync_at: datetime | None = None
    last_sync_status: str
    last_sync_summary: str | None = None
    source_total: int = 0
    price_event_total: int = 0
    created_at: datetime | None = None
    updated_at: datetime | None = None

    class Config:
        from_attributes = True


class ProductCatalogConnectorsResponse(BaseModel):
    success: bool
    message: str
    requested_by: TenantUserContextResponse
    total: int
    data: list[ProductCatalogConnectorItemResponse]


class ProductCatalogConnectorMutationResponse(BaseModel):
    success: bool
    message: str
    requested_by: TenantUserContextResponse
    data: ProductCatalogConnectorItemResponse


class ProductCatalogItemResponse(BaseModel):
    id: int
    sku: str | None = None
    name: str
    product_type: str
    unit_label: str | None = None
    unit_price: float
    description: str | None = None
    is_active: bool
    sort_order: int
    source_count: int = 0
    active_source_count: int = 0
    health_status: str = "no_source"
    last_refresh_at: datetime | None = None
    next_refresh_at: datetime | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
    characteristics: list[ProductCatalogProductCharacteristicItemResponse] = Field(default_factory=list)

    class Config:
        from_attributes = True


class ProductCatalogProductsResponse(BaseModel):
    success: bool
    message: str
    requested_by: TenantUserContextResponse
    total: int
    data: list[ProductCatalogItemResponse]


class ProductCatalogMutationResponse(BaseModel):
    success: bool
    message: str
    requested_by: TenantUserContextResponse
    data: ProductCatalogItemResponse


class ProductCatalogProductSourceCreateRequest(BaseModel):
    connector_id: int | None = None
    source_kind: str = "manual_capture"
    source_label: str | None = None
    source_url: str | None = None
    external_reference: str | None = None
    source_status: str = "active"
    refresh_mode: str = "manual"
    refresh_merge_policy: str = "safe_merge"
    refresh_prompt: str | None = None
    latest_unit_price: float = 0
    currency_code: str = "CLP"
    source_summary: str | None = None


class ProductCatalogProductSourceUpdateRequest(ProductCatalogProductSourceCreateRequest):
    pass


class ProductCatalogPriceHistoryCreateRequest(BaseModel):
    connector_id: int | None = None
    source_label: str | None = None
    source_url: str | None = None
    unit_price: float = 0
    currency_code: str = "CLP"
    price_kind: str = "reference"
    notes: str | None = None


class ProductCatalogProductSourceItemResponse(BaseModel):
    id: int
    product_id: int
    connector_id: int | None = None
    connector_name: str | None = None
    draft_id: int | None = None
    run_item_id: int | None = None
    source_kind: str
    source_label: str | None = None
    source_url: str | None = None
    external_reference: str | None = None
    source_status: str
    sync_status: str
    refresh_mode: str
    refresh_merge_policy: str
    refresh_prompt: str | None = None
    latest_unit_price: float
    currency_code: str
    source_summary: str | None = None
    captured_at: datetime | None = None
    last_seen_at: datetime | None = None
    last_sync_attempt_at: datetime | None = None
    next_refresh_at: datetime | None = None
    last_refresh_success_at: datetime | None = None
    last_sync_error: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    class Config:
        from_attributes = True


class ProductCatalogPriceHistoryItemResponse(BaseModel):
    id: int
    product_id: int
    product_name: str | None = None
    product_source_id: int | None = None
    connector_id: int | None = None
    connector_name: str | None = None
    draft_id: int | None = None
    price_kind: str
    unit_price: float
    currency_code: str
    source_label: str | None = None
    source_url: str | None = None
    notes: str | None = None
    captured_at: datetime | None = None
    created_at: datetime | None = None

    class Config:
        from_attributes = True


class ProductCatalogSourcesResponse(BaseModel):
    success: bool
    message: str
    requested_by: TenantUserContextResponse
    total: int
    data: list[ProductCatalogProductSourceItemResponse]


class ProductCatalogSourceMutationResponse(BaseModel):
    success: bool
    message: str
    requested_by: TenantUserContextResponse
    data: ProductCatalogProductSourceItemResponse


class ProductCatalogPriceHistoryResponse(BaseModel):
    success: bool
    message: str
    requested_by: TenantUserContextResponse
    total: int
    data: list[ProductCatalogPriceHistoryItemResponse]


class ProductCatalogConnectorSyncRequest(BaseModel):
    product_id: int | None = None
    limit: int = 25


class ProductCatalogConnectorSyncItemResponse(BaseModel):
    source_id: int
    product_id: int
    connector_id: int | None = None
    source_label: str | None = None
    source_url: str | None = None
    sync_status: str
    unit_price: float = 0
    currency_code: str = "CLP"
    detail: str | None = None


class ProductCatalogConnectorSyncResponse(BaseModel):
    success: bool
    message: str
    requested_by: TenantUserContextResponse
    connector_id: int
    connector_name: str
    processed: int
    synced: int
    failed: int
    skipped: int
    price_updates: int
    data: list[ProductCatalogConnectorSyncItemResponse] = Field(default_factory=list)


class ProductCatalogRefreshNowRequest(BaseModel):
    prefer_ai: bool = True


class ProductCatalogRefreshResultResponse(BaseModel):
    product_id: int
    product_name: str
    refreshed_sources: int
    completed_sources: int
    error_sources: int
    changed_fields: list[str] = Field(default_factory=list)
    merge_policies: list[str] = Field(default_factory=list)
    message: str | None = None


class ProductCatalogRefreshMutationResponse(BaseModel):
    success: bool
    message: str
    requested_by: TenantUserContextResponse
    product: ProductCatalogItemResponse
    result: ProductCatalogRefreshResultResponse


class ProductCatalogRefreshRunCreateRequest(BaseModel):
    scope: str = "due_sources"
    connector_id: int | None = None
    product_ids: list[int] = Field(default_factory=list)
    limit: int = 100
    prefer_ai: bool = True


class ProductCatalogRefreshRunItemResponse(BaseModel):
    id: int
    run_id: int
    product_id: int
    product_name: str | None = None
    product_source_id: int | None = None
    item_status: str
    source_url: str | None = None
    source_label: str | None = None
    merge_policy: str
    used_ai_enrichment: bool
    changed_fields: list[str] = Field(default_factory=list)
    error_message: str | None = None
    processed_at: datetime | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    class Config:
        from_attributes = True


class ProductCatalogRefreshRunResponse(BaseModel):
    id: int
    status: str
    scope: str
    scope_label: str | None = None
    connector_id: int | None = None
    connector_name: str | None = None
    requested_count: int
    processed_count: int
    completed_count: int
    error_count: int
    cancelled_count: int
    prefer_ai: bool
    created_by_user_id: int | None = None
    started_at: datetime | None = None
    finished_at: datetime | None = None
    cancelled_at: datetime | None = None
    last_error: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
    items: list[ProductCatalogRefreshRunItemResponse] = Field(default_factory=list)

    class Config:
        from_attributes = True


class ProductCatalogRefreshRunsResponse(BaseModel):
    success: bool
    message: str
    requested_by: TenantUserContextResponse
    total: int
    data: list[ProductCatalogRefreshRunResponse]


class ProductCatalogRefreshRunMutationResponse(BaseModel):
    success: bool
    message: str
    requested_by: TenantUserContextResponse
    data: ProductCatalogRefreshRunResponse


class ProductCatalogComparisonSourceResponse(BaseModel):
    source_id: int
    connector_id: int | None = None
    connector_name: str | None = None
    source_label: str | None = None
    source_url: str | None = None
    source_status: str
    sync_status: str
    latest_unit_price: float
    currency_code: str
    last_seen_at: datetime | None = None


class ProductCatalogComparisonItemResponse(BaseModel):
    product_id: int
    product_name: str
    product_sku: str | None = None
    source_count: int
    active_source_count: int
    recommended_source_id: int | None = None
    recommended_reason: str | None = None
    recommended_price: float | None = None
    recommended_currency_code: str | None = None
    lowest_price: float | None = None
    highest_price: float | None = None
    price_spread: float | None = None
    price_spread_percent: float | None = None
    latest_seen_at: datetime | None = None
    sources: list[ProductCatalogComparisonSourceResponse] = Field(default_factory=list)


class ProductCatalogComparisonsResponse(BaseModel):
    success: bool
    message: str
    requested_by: TenantUserContextResponse
    total: int
    data: list[ProductCatalogComparisonItemResponse]


class ProductCatalogIngestionCharacteristicWriteRequest(BaseModel):
    id: int | None = None
    label: str
    value: str
    sort_order: int = 100


class ProductCatalogIngestionCharacteristicItemResponse(BaseModel):
    id: int
    draft_id: int
    label: str
    value: str
    sort_order: int
    created_at: datetime | None = None

    class Config:
        from_attributes = True


class ProductCatalogIngestionDraftCreateRequest(BaseModel):
    source_kind: str = "manual_capture"
    source_label: str | None = None
    source_url: str | None = None
    connector_id: int | None = None
    external_reference: str | None = None
    sku: str | None = None
    name: str | None = None
    brand: str | None = None
    category_label: str | None = None
    product_type: str = "service"
    unit_label: str | None = None
    unit_price: float = 0
    currency_code: str = "CLP"
    description: str | None = None
    source_excerpt: str | None = None
    extraction_notes: str | None = None
    characteristics: list[ProductCatalogIngestionCharacteristicWriteRequest] = Field(default_factory=list)


class ProductCatalogIngestionDraftUpdateRequest(ProductCatalogIngestionDraftCreateRequest):
    pass


class ProductCatalogStatusUpdateDraftRequest(BaseModel):
    capture_status: str
    review_notes: str | None = None


class ProductCatalogApproveRequest(BaseModel):
    review_notes: str | None = None


class ProductCatalogIngestionEnrichRequest(BaseModel):
    prefer_ai: bool = True


class ProductCatalogDuplicateResolutionRequest(BaseModel):
    target_product_id: int
    resolution_mode: str = "update_existing"
    review_notes: str | None = None


class ProductCatalogIngestionExtractUrlRequest(BaseModel):
    source_url: str
    source_label: str | None = None
    connector_id: int | None = None
    external_reference: str | None = None


class ProductCatalogIngestionRunEntryRequest(BaseModel):
    source_url: str
    source_label: str | None = None
    connector_id: int | None = None
    external_reference: str | None = None


class ProductCatalogIngestionRunCreateRequest(BaseModel):
    source_label: str | None = None
    connector_id: int | None = None
    entries: list[ProductCatalogIngestionRunEntryRequest] = Field(default_factory=list)


class ProductCatalogDuplicateCandidateResponse(BaseModel):
    candidate_kind: str
    candidate_id: int
    label: str
    sku: str | None = None
    brand: str | None = None
    capture_status: str | None = None
    score: int
    reasons: list[str] = Field(default_factory=list)


class ProductCatalogDuplicateSummaryResponse(BaseModel):
    status: str
    top_score: int = 0
    candidate_count: int = 0
    top_reason: str | None = None


class ProductCatalogEnrichmentStateResponse(BaseModel):
    status: str
    strategy: str | None = None
    summary: str | None = None
    ai_available: bool = False


class ProductCatalogIngestionDraftItemResponse(BaseModel):
    id: int
    source_kind: str
    source_label: str | None = None
    source_url: str | None = None
    connector_id: int | None = None
    connector_name: str | None = None
    external_reference: str | None = None
    capture_status: str
    sku: str | None = None
    name: str | None = None
    brand: str | None = None
    category_label: str | None = None
    product_type: str
    unit_label: str | None = None
    unit_price: float
    currency_code: str
    description: str | None = None
    source_excerpt: str | None = None
    extraction_notes: str | None = None
    review_notes: str | None = None
    created_by_user_id: int | None = None
    reviewed_by_user_id: int | None = None
    published_product_id: int | None = None
    published_product_name: str | None = None
    published_at: datetime | None = None
    discarded_at: datetime | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
    characteristics: list[ProductCatalogIngestionCharacteristicItemResponse] = Field(default_factory=list)
    duplicate_summary: ProductCatalogDuplicateSummaryResponse | None = None
    duplicate_candidates: list[ProductCatalogDuplicateCandidateResponse] = Field(default_factory=list)
    enrichment_state: ProductCatalogEnrichmentStateResponse | None = None

    class Config:
        from_attributes = True


class ProductCatalogIngestionOverviewResponse(BaseModel):
    success: bool
    message: str
    requested_by: TenantUserContextResponse
    metrics: dict
    recent_drafts: list[ProductCatalogIngestionDraftItemResponse]


class ProductCatalogIngestionDraftsResponse(BaseModel):
    success: bool
    message: str
    requested_by: TenantUserContextResponse
    total: int
    data: list[ProductCatalogIngestionDraftItemResponse]


class ProductCatalogIngestionDraftMutationResponse(BaseModel):
    success: bool
    message: str
    requested_by: TenantUserContextResponse
    data: ProductCatalogIngestionDraftItemResponse


class ProductCatalogIngestionApprovalResponse(BaseModel):
    success: bool
    message: str
    requested_by: TenantUserContextResponse
    data: ProductCatalogIngestionDraftItemResponse
    published_product: ProductCatalogItemResponse


class ProductCatalogIngestionRunItemResponse(BaseModel):
    id: int
    run_id: int
    source_url: str
    source_label: str | None = None
    connector_id: int | None = None
    connector_name: str | None = None
    external_reference: str | None = None
    item_status: str
    draft_id: int | None = None
    extracted_name: str | None = None
    error_message: str | None = None
    processed_at: datetime | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    class Config:
        from_attributes = True


class ProductCatalogIngestionRunResponse(BaseModel):
    id: int
    status: str
    source_mode: str
    source_label: str | None = None
    connector_id: int | None = None
    connector_name: str | None = None
    requested_count: int
    processed_count: int
    completed_count: int
    error_count: int
    cancelled_count: int
    created_by_user_id: int | None = None
    started_at: datetime | None = None
    finished_at: datetime | None = None
    cancelled_at: datetime | None = None
    last_error: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
    items: list[ProductCatalogIngestionRunItemResponse] = Field(default_factory=list)

    class Config:
        from_attributes = True


class ProductCatalogIngestionRunsResponse(BaseModel):
    success: bool
    message: str
    requested_by: TenantUserContextResponse
    total: int
    data: list[ProductCatalogIngestionRunResponse]


class ProductCatalogIngestionRunMutationResponse(BaseModel):
    success: bool
    message: str
    requested_by: TenantUserContextResponse
    data: ProductCatalogIngestionRunResponse


class ProductCatalogModuleOverviewResponse(BaseModel):
    success: bool
    message: str
    requested_by: TenantUserContextResponse
    metrics: dict
    recent_products: list[ProductCatalogItemResponse] = Field(default_factory=list)
    recent_drafts: list[ProductCatalogIngestionDraftItemResponse] = Field(default_factory=list)
    recent_sources: list[ProductCatalogProductSourceItemResponse] = Field(default_factory=list)
    recent_prices: list[ProductCatalogPriceHistoryItemResponse] = Field(default_factory=list)
    recent_connectors: list[ProductCatalogConnectorItemResponse] = Field(default_factory=list)
    recent_comparisons: list[ProductCatalogComparisonItemResponse] = Field(default_factory=list)
    recent_refresh_runs: list[ProductCatalogRefreshRunResponse] = Field(default_factory=list)
