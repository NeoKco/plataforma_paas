from datetime import datetime

from pydantic import BaseModel, Field

from app.apps.tenant_modules.core.schemas import TenantUserContextResponse


class CRMStatusUpdateRequest(BaseModel):
    is_active: bool


class CRMProductCreateRequest(BaseModel):
    sku: str | None = None
    name: str
    product_type: str = "service"
    unit_label: str | None = None
    unit_price: float = 0
    description: str | None = None
    is_active: bool = True
    sort_order: int = 100


class CRMProductUpdateRequest(CRMProductCreateRequest):
    pass


class CRMProductItemResponse(BaseModel):
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

    class Config:
        from_attributes = True


class CRMProductsResponse(BaseModel):
    success: bool
    message: str
    requested_by: TenantUserContextResponse
    total: int
    data: list[CRMProductItemResponse]


class CRMProductMutationResponse(BaseModel):
    success: bool
    message: str
    requested_by: TenantUserContextResponse
    data: CRMProductItemResponse


class CRMOpportunityCreateRequest(BaseModel):
    client_id: int | None = None
    title: str
    stage: str = "lead"
    owner_user_id: int | None = None
    expected_value: float | None = None
    probability_percent: int = Field(default=0, ge=0, le=100)
    expected_close_at: datetime | None = None
    source_channel: str | None = None
    summary: str | None = None
    next_step: str | None = None
    is_active: bool = True
    sort_order: int = 100


class CRMOpportunityUpdateRequest(CRMOpportunityCreateRequest):
    pass


class CRMOpportunityItemResponse(BaseModel):
    id: int
    client_id: int | None = None
    client_display_name: str | None = None
    title: str
    stage: str
    owner_user_id: int | None = None
    expected_value: float | None = None
    probability_percent: int
    expected_close_at: datetime | None = None
    source_channel: str | None = None
    summary: str | None = None
    next_step: str | None = None
    is_active: bool
    sort_order: int
    created_at: datetime | None = None
    updated_at: datetime | None = None

    class Config:
        from_attributes = True


class CRMOpportunitiesResponse(BaseModel):
    success: bool
    message: str
    requested_by: TenantUserContextResponse
    total: int
    pipeline_value: float
    data: list[CRMOpportunityItemResponse]


class CRMOpportunityMutationResponse(BaseModel):
    success: bool
    message: str
    requested_by: TenantUserContextResponse
    data: CRMOpportunityItemResponse


class CRMQuoteLineWriteRequest(BaseModel):
    id: int | None = None
    product_id: int | None = None
    line_type: str = "catalog_item"
    name: str
    description: str | None = None
    quantity: float = 1
    unit_price: float = 0
    sort_order: int = 100


class CRMQuoteCreateRequest(BaseModel):
    client_id: int | None = None
    opportunity_id: int | None = None
    quote_number: str | None = None
    title: str
    quote_status: str = "draft"
    valid_until: datetime | None = None
    discount_amount: float = 0
    tax_amount: float = 0
    summary: str | None = None
    notes: str | None = None
    is_active: bool = True
    sort_order: int = 100
    lines: list[CRMQuoteLineWriteRequest] = Field(default_factory=list)


class CRMQuoteUpdateRequest(CRMQuoteCreateRequest):
    pass


class CRMQuoteLineItemResponse(BaseModel):
    id: int
    product_id: int | None = None
    product_name: str | None = None
    line_type: str
    name: str
    description: str | None = None
    quantity: float
    unit_price: float
    line_total: float
    sort_order: int

    class Config:
        from_attributes = True


class CRMQuoteItemResponse(BaseModel):
    id: int
    client_id: int | None = None
    client_display_name: str | None = None
    opportunity_id: int | None = None
    opportunity_title: str | None = None
    quote_number: str | None = None
    title: str
    quote_status: str
    valid_until: datetime | None = None
    subtotal_amount: float
    discount_amount: float
    tax_amount: float
    total_amount: float
    summary: str | None = None
    notes: str | None = None
    is_active: bool
    sort_order: int
    created_at: datetime | None = None
    updated_at: datetime | None = None
    lines: list[CRMQuoteLineItemResponse] = Field(default_factory=list)

    class Config:
        from_attributes = True


class CRMQuotesResponse(BaseModel):
    success: bool
    message: str
    requested_by: TenantUserContextResponse
    total: int
    quoted_amount: float
    data: list[CRMQuoteItemResponse]


class CRMQuoteMutationResponse(BaseModel):
    success: bool
    message: str
    requested_by: TenantUserContextResponse
    data: CRMQuoteItemResponse


class CRMModuleOverviewResponse(BaseModel):
    success: bool
    message: str
    requested_by: TenantUserContextResponse
    metrics: dict
    recent_opportunities: list[CRMOpportunityItemResponse]
    recent_quotes: list[CRMQuoteItemResponse]
