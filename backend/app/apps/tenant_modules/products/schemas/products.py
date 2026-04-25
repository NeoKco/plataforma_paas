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
    external_reference: str | None = None


class ProductCatalogIngestionRunEntryRequest(BaseModel):
    source_url: str
    source_label: str | None = None
    external_reference: str | None = None


class ProductCatalogIngestionRunCreateRequest(BaseModel):
    source_label: str | None = None
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
