from datetime import datetime

from pydantic import BaseModel, Field

from app.apps.tenant_modules.core.schemas import TenantUserContextResponse


class CRMStatusUpdateRequest(BaseModel):
    is_active: bool


class CRMProductCharacteristicWriteRequest(BaseModel):
    id: int | None = None
    label: str
    value: str
    sort_order: int = 100


class CRMProductCharacteristicItemResponse(BaseModel):
    id: int
    product_id: int
    label: str
    value: str
    sort_order: int
    created_at: datetime | None = None

    class Config:
        from_attributes = True


class CRMProductCreateRequest(BaseModel):
    sku: str | None = None
    name: str
    product_type: str = "service"
    unit_label: str | None = None
    unit_price: float = 0
    description: str | None = None
    is_active: bool = True
    sort_order: int = 100
    characteristics: list[CRMProductCharacteristicWriteRequest] = Field(default_factory=list)


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
    characteristics: list[CRMProductCharacteristicItemResponse] = Field(default_factory=list)

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


class CRMProductIngestionCharacteristicWriteRequest(BaseModel):
    id: int | None = None
    label: str
    value: str
    sort_order: int = 100


class CRMProductIngestionCharacteristicItemResponse(BaseModel):
    id: int
    draft_id: int
    label: str
    value: str
    sort_order: int
    created_at: datetime | None = None

    class Config:
        from_attributes = True


class CRMProductIngestionDraftCreateRequest(BaseModel):
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
    characteristics: list[CRMProductIngestionCharacteristicWriteRequest] = Field(default_factory=list)


class CRMProductIngestionDraftUpdateRequest(CRMProductIngestionDraftCreateRequest):
    pass


class CRMProductIngestionStatusRequest(BaseModel):
    capture_status: str
    review_notes: str | None = None


class CRMProductIngestionApproveRequest(BaseModel):
    review_notes: str | None = None


class CRMProductIngestionExtractUrlRequest(BaseModel):
    source_url: str
    source_label: str | None = None
    external_reference: str | None = None


class CRMProductIngestionRunEntryRequest(BaseModel):
    source_url: str
    source_label: str | None = None
    external_reference: str | None = None


class CRMProductIngestionRunCreateRequest(BaseModel):
    source_label: str | None = None
    entries: list[CRMProductIngestionRunEntryRequest] = Field(default_factory=list)


class CRMProductIngestionDraftItemResponse(BaseModel):
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
    characteristics: list[CRMProductIngestionCharacteristicItemResponse] = Field(default_factory=list)

    class Config:
        from_attributes = True


class CRMProductIngestionOverviewResponse(BaseModel):
    success: bool
    message: str
    requested_by: TenantUserContextResponse
    metrics: dict
    recent_drafts: list[CRMProductIngestionDraftItemResponse]


class CRMProductIngestionDraftsResponse(BaseModel):
    success: bool
    message: str
    requested_by: TenantUserContextResponse
    total: int
    data: list[CRMProductIngestionDraftItemResponse]


class CRMProductIngestionDraftMutationResponse(BaseModel):
    success: bool
    message: str
    requested_by: TenantUserContextResponse
    data: CRMProductIngestionDraftItemResponse


class CRMProductIngestionApprovalResponse(BaseModel):
    success: bool
    message: str
    requested_by: TenantUserContextResponse
    data: CRMProductIngestionDraftItemResponse
    published_product: CRMProductItemResponse


class CRMProductIngestionRunItemResponse(BaseModel):
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


class CRMProductIngestionRunResponse(BaseModel):
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
    items: list[CRMProductIngestionRunItemResponse] = Field(default_factory=list)

    class Config:
        from_attributes = True


class CRMProductIngestionRunsResponse(BaseModel):
    success: bool
    message: str
    requested_by: TenantUserContextResponse
    total: int
    data: list[CRMProductIngestionRunResponse]


class CRMProductIngestionRunMutationResponse(BaseModel):
    success: bool
    message: str
    requested_by: TenantUserContextResponse
    data: CRMProductIngestionRunResponse


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


class CRMOpportunityCloseRequest(BaseModel):
    final_stage: str
    close_reason: str | None = None
    close_notes: str | None = None


class CRMOpportunityContactWriteRequest(BaseModel):
    full_name: str
    role: str | None = None
    email: str | None = None
    phone: str | None = None
    notes: str | None = None
    sort_order: int = 100


class CRMOpportunityNoteWriteRequest(BaseModel):
    note: str


class CRMOpportunityActivityWriteRequest(BaseModel):
    activity_type: str
    description: str | None = None
    scheduled_at: datetime | None = None
    status: str = "scheduled"


class CRMOpportunityActivityStatusRequest(BaseModel):
    status: str


class CRMOpportunityContactItemResponse(BaseModel):
    id: int
    opportunity_id: int
    full_name: str
    role: str | None = None
    email: str | None = None
    phone: str | None = None
    notes: str | None = None
    sort_order: int
    created_at: datetime | None = None

    class Config:
        from_attributes = True


class CRMOpportunityNoteItemResponse(BaseModel):
    id: int
    opportunity_id: int
    note: str
    created_by_user_id: int | None = None
    created_at: datetime | None = None

    class Config:
        from_attributes = True


class CRMOpportunityActivityItemResponse(BaseModel):
    id: int
    opportunity_id: int
    activity_type: str
    description: str | None = None
    scheduled_at: datetime | None = None
    status: str
    created_by_user_id: int | None = None
    completed_at: datetime | None = None
    created_at: datetime | None = None

    class Config:
        from_attributes = True


class CRMOpportunityAttachmentItemResponse(BaseModel):
    id: int
    opportunity_id: int
    file_name: str
    content_type: str | None = None
    file_size: int
    notes: str | None = None
    uploaded_by_user_id: int | None = None
    created_at: datetime | None = None

    class Config:
        from_attributes = True


class CRMOpportunityStageEventItemResponse(BaseModel):
    id: int
    opportunity_id: int
    event_type: str
    from_stage: str | None = None
    to_stage: str | None = None
    summary: str | None = None
    notes: str | None = None
    created_by_user_id: int | None = None
    created_at: datetime | None = None

    class Config:
        from_attributes = True


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
    closed_at: datetime | None = None
    close_reason: str | None = None
    close_notes: str | None = None
    is_active: bool
    sort_order: int
    created_at: datetime | None = None
    updated_at: datetime | None = None

    class Config:
        from_attributes = True


class CRMOpportunityDetailItemResponse(BaseModel):
    opportunity: CRMOpportunityItemResponse
    contacts: list[CRMOpportunityContactItemResponse]
    notes: list[CRMOpportunityNoteItemResponse]
    activities: list[CRMOpportunityActivityItemResponse]
    attachments: list[CRMOpportunityAttachmentItemResponse]
    stage_events: list[CRMOpportunityStageEventItemResponse]


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


class CRMOpportunityDetailResponse(BaseModel):
    success: bool
    message: str
    requested_by: TenantUserContextResponse
    data: CRMOpportunityDetailItemResponse


class CRMOpportunityKanbanColumnResponse(BaseModel):
    stage: str
    total: int
    stage_value: float
    items: list[CRMOpportunityItemResponse]


class CRMOpportunityKanbanResponse(BaseModel):
    success: bool
    message: str
    requested_by: TenantUserContextResponse
    columns: list[CRMOpportunityKanbanColumnResponse]


class CRMOpportunitySubresourceMutationResponse(BaseModel):
    success: bool
    message: str
    requested_by: TenantUserContextResponse
    data: dict


class CRMQuoteLineWriteRequest(BaseModel):
    id: int | None = None
    product_id: int | None = None
    line_type: str = "catalog_item"
    name: str
    description: str | None = None
    quantity: float = 1
    unit_price: float = 0
    sort_order: int = 100


class CRMQuoteSectionWriteRequest(BaseModel):
    id: int | None = None
    title: str
    description: str | None = None
    sort_order: int = 100
    lines: list[CRMQuoteLineWriteRequest] = Field(default_factory=list)


class CRMQuoteCreateRequest(BaseModel):
    client_id: int | None = None
    opportunity_id: int | None = None
    template_id: int | None = None
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
    sections: list[CRMQuoteSectionWriteRequest] = Field(default_factory=list)


class CRMQuoteUpdateRequest(CRMQuoteCreateRequest):
    pass


class CRMQuoteLineItemResponse(BaseModel):
    id: int
    product_id: int | None = None
    product_name: str | None = None
    section_id: int | None = None
    line_type: str
    name: str
    description: str | None = None
    quantity: float
    unit_price: float
    line_total: float
    sort_order: int

    class Config:
        from_attributes = True


class CRMQuoteSectionItemResponse(BaseModel):
    id: int
    quote_id: int
    title: str
    description: str | None = None
    sort_order: int
    lines: list[CRMQuoteLineItemResponse] = Field(default_factory=list)

    class Config:
        from_attributes = True


class CRMQuoteItemResponse(BaseModel):
    id: int
    client_id: int | None = None
    client_display_name: str | None = None
    opportunity_id: int | None = None
    opportunity_title: str | None = None
    template_id: int | None = None
    template_name: str | None = None
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
    sections: list[CRMQuoteSectionItemResponse] = Field(default_factory=list)

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


class CRMQuoteTemplateItemWriteRequest(BaseModel):
    id: int | None = None
    product_id: int | None = None
    line_type: str = "catalog_item"
    name: str
    description: str | None = None
    quantity: float = 1
    unit_price: float = 0
    sort_order: int = 100


class CRMQuoteTemplateSectionWriteRequest(BaseModel):
    id: int | None = None
    title: str
    description: str | None = None
    sort_order: int = 100
    items: list[CRMQuoteTemplateItemWriteRequest] = Field(default_factory=list)


class CRMQuoteTemplateCreateRequest(BaseModel):
    name: str
    summary: str | None = None
    notes: str | None = None
    is_active: bool = True
    sort_order: int = 100
    sections: list[CRMQuoteTemplateSectionWriteRequest] = Field(default_factory=list)


class CRMQuoteTemplateUpdateRequest(CRMQuoteTemplateCreateRequest):
    pass


class CRMQuoteTemplateItemResponse(BaseModel):
    id: int
    section_id: int
    product_id: int | None = None
    product_name: str | None = None
    line_type: str
    name: str
    description: str | None = None
    quantity: float
    unit_price: float
    sort_order: int

    class Config:
        from_attributes = True


class CRMQuoteTemplateSectionItemResponse(BaseModel):
    id: int
    template_id: int
    title: str
    description: str | None = None
    sort_order: int
    items: list[CRMQuoteTemplateItemResponse] = Field(default_factory=list)

    class Config:
        from_attributes = True


class CRMQuoteTemplateItemEnvelopeResponse(BaseModel):
    id: int
    name: str
    summary: str | None = None
    notes: str | None = None
    is_active: bool
    sort_order: int
    created_at: datetime | None = None
    updated_at: datetime | None = None
    sections: list[CRMQuoteTemplateSectionItemResponse] = Field(default_factory=list)

    class Config:
        from_attributes = True


class CRMQuoteTemplatesResponse(BaseModel):
    success: bool
    message: str
    requested_by: TenantUserContextResponse
    total: int
    data: list[CRMQuoteTemplateItemEnvelopeResponse]


class CRMQuoteTemplateMutationResponse(BaseModel):
    success: bool
    message: str
    requested_by: TenantUserContextResponse
    data: CRMQuoteTemplateItemEnvelopeResponse


class CRMModuleOverviewResponse(BaseModel):
    success: bool
    message: str
    requested_by: TenantUserContextResponse
    metrics: dict
    recent_opportunities: list[CRMOpportunityItemResponse]
    recent_quotes: list[CRMQuoteItemResponse]
    recent_product_drafts: list[CRMProductIngestionDraftItemResponse] = Field(default_factory=list)
