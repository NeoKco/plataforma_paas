from app.apps.tenant_modules.crm.schemas import (
    CRMOpportunityActivityItemResponse,
    CRMOpportunityAttachmentItemResponse,
    CRMOpportunityContactItemResponse,
    CRMOpportunityItemResponse,
    CRMOpportunityNoteItemResponse,
    CRMOpportunityStageEventItemResponse,
    CRMProductCharacteristicItemResponse,
    CRMProductIngestionCharacteristicItemResponse,
    CRMProductIngestionDraftItemResponse,
    CRMProductItemResponse,
    CRMQuoteItemResponse,
    CRMQuoteLineItemResponse,
    CRMQuoteSectionItemResponse,
    CRMQuoteTemplateItemEnvelopeResponse,
    CRMQuoteTemplateItemResponse,
    CRMQuoteTemplateSectionItemResponse,
)


def build_product_item(item, *, characteristics: list | None = None) -> CRMProductItemResponse:
    return CRMProductItemResponse(
        id=item.id,
        sku=item.sku,
        name=item.name,
        product_type=item.product_type,
        unit_label=item.unit_label,
        unit_price=item.unit_price,
        description=item.description,
        is_active=item.is_active,
        sort_order=item.sort_order,
        created_at=item.created_at,
        updated_at=item.updated_at,
        characteristics=[
            CRMProductCharacteristicItemResponse(
                id=characteristic.id,
                product_id=characteristic.product_id,
                label=characteristic.label,
                value=characteristic.value,
                sort_order=characteristic.sort_order,
                created_at=characteristic.created_at,
            )
            for characteristic in (characteristics or [])
        ],
    )


def build_product_ingestion_draft_item(
    item,
    *,
    characteristics: list | None = None,
    published_product_name: str | None = None,
) -> CRMProductIngestionDraftItemResponse:
    return CRMProductIngestionDraftItemResponse(
        id=item.id,
        source_kind=item.source_kind,
        source_label=item.source_label,
        source_url=item.source_url,
        external_reference=item.external_reference,
        capture_status=item.capture_status,
        sku=item.sku,
        name=item.name,
        brand=item.brand,
        category_label=item.category_label,
        product_type=item.product_type,
        unit_label=item.unit_label,
        unit_price=item.unit_price,
        currency_code=item.currency_code,
        description=item.description,
        source_excerpt=item.source_excerpt,
        extraction_notes=item.extraction_notes,
        review_notes=item.review_notes,
        created_by_user_id=item.created_by_user_id,
        reviewed_by_user_id=item.reviewed_by_user_id,
        published_product_id=item.published_product_id,
        published_product_name=published_product_name,
        published_at=item.published_at,
        discarded_at=item.discarded_at,
        created_at=item.created_at,
        updated_at=item.updated_at,
        characteristics=[
            CRMProductIngestionCharacteristicItemResponse(
                id=characteristic.id,
                draft_id=characteristic.draft_id,
                label=characteristic.label,
                value=characteristic.value,
                sort_order=characteristic.sort_order,
                created_at=characteristic.created_at,
            )
            for characteristic in (characteristics or [])
        ],
    )


def build_opportunity_item(item, *, client_display_name: str | None = None) -> CRMOpportunityItemResponse:
    return CRMOpportunityItemResponse(
        id=item.id,
        client_id=item.client_id,
        client_display_name=client_display_name,
        title=item.title,
        stage=item.stage,
        owner_user_id=item.owner_user_id,
        expected_value=item.expected_value,
        probability_percent=item.probability_percent,
        expected_close_at=item.expected_close_at,
        source_channel=item.source_channel,
        summary=item.summary,
        next_step=item.next_step,
        closed_at=item.closed_at,
        close_reason=item.close_reason,
        close_notes=item.close_notes,
        is_active=item.is_active,
        sort_order=item.sort_order,
        created_at=item.created_at,
        updated_at=item.updated_at,
    )


def build_opportunity_contact_item(item) -> CRMOpportunityContactItemResponse:
    return CRMOpportunityContactItemResponse(
        id=item.id,
        opportunity_id=item.opportunity_id,
        full_name=item.full_name,
        role=item.role,
        email=item.email,
        phone=item.phone,
        notes=item.notes,
        sort_order=item.sort_order,
        created_at=item.created_at,
    )


def build_opportunity_note_item(item) -> CRMOpportunityNoteItemResponse:
    return CRMOpportunityNoteItemResponse(
        id=item.id,
        opportunity_id=item.opportunity_id,
        note=item.note,
        created_by_user_id=item.created_by_user_id,
        created_at=item.created_at,
    )


def build_opportunity_activity_item(item) -> CRMOpportunityActivityItemResponse:
    return CRMOpportunityActivityItemResponse(
        id=item.id,
        opportunity_id=item.opportunity_id,
        activity_type=item.activity_type,
        description=item.description,
        scheduled_at=item.scheduled_at,
        status=item.status,
        created_by_user_id=item.created_by_user_id,
        completed_at=item.completed_at,
        created_at=item.created_at,
    )


def build_opportunity_attachment_item(item) -> CRMOpportunityAttachmentItemResponse:
    return CRMOpportunityAttachmentItemResponse(
        id=item.id,
        opportunity_id=item.opportunity_id,
        file_name=item.file_name,
        content_type=item.content_type,
        file_size=item.file_size,
        notes=item.notes,
        uploaded_by_user_id=item.uploaded_by_user_id,
        created_at=item.created_at,
    )


def build_opportunity_stage_event_item(item) -> CRMOpportunityStageEventItemResponse:
    return CRMOpportunityStageEventItemResponse(
        id=item.id,
        opportunity_id=item.opportunity_id,
        event_type=item.event_type,
        from_stage=item.from_stage,
        to_stage=item.to_stage,
        summary=item.summary,
        notes=item.notes,
        created_by_user_id=item.created_by_user_id,
        created_at=item.created_at,
    )


def build_quote_line_item(item, *, product_name: str | None = None) -> CRMQuoteLineItemResponse:
    return CRMQuoteLineItemResponse(
        id=item.id,
        product_id=item.product_id,
        product_name=product_name,
        section_id=getattr(item, "section_id", None),
        line_type=item.line_type,
        name=item.name,
        description=item.description,
        quantity=item.quantity,
        unit_price=item.unit_price,
        line_total=item.line_total,
        sort_order=item.sort_order,
    )


def build_quote_section_item(section, *, section_lines: list | None = None, product_name_map: dict[int, str] | None = None) -> CRMQuoteSectionItemResponse:
    product_name_map = product_name_map or {}
    return CRMQuoteSectionItemResponse(
        id=section.id,
        quote_id=section.quote_id,
        title=section.title,
        description=section.description,
        sort_order=section.sort_order,
        lines=[
            build_quote_line_item(
                line,
                product_name=product_name_map.get(line.product_id),
            )
            for line in (section_lines or [])
        ],
    )


def build_quote_item(
    item,
    *,
    client_display_name: str | None = None,
    opportunity_title: str | None = None,
    template_name: str | None = None,
    lines: list | None = None,
    sections: list | None = None,
    section_lines_map: dict[int, list] | None = None,
    product_name_map: dict[int, str] | None = None,
) -> CRMQuoteItemResponse:
    product_name_map = product_name_map or {}
    section_lines_map = section_lines_map or {}
    return CRMQuoteItemResponse(
        id=item.id,
        client_id=item.client_id,
        client_display_name=client_display_name,
        opportunity_id=item.opportunity_id,
        opportunity_title=opportunity_title,
        template_id=item.template_id,
        template_name=template_name,
        quote_number=item.quote_number,
        title=item.title,
        quote_status=item.quote_status,
        valid_until=item.valid_until,
        subtotal_amount=item.subtotal_amount,
        discount_amount=item.discount_amount,
        tax_amount=item.tax_amount,
        total_amount=item.total_amount,
        summary=item.summary,
        notes=item.notes,
        is_active=item.is_active,
        sort_order=item.sort_order,
        created_at=item.created_at,
        updated_at=item.updated_at,
        lines=[
            build_quote_line_item(
                line,
                product_name=product_name_map.get(line.product_id),
            )
            for line in (lines or [])
        ],
        sections=[
            build_quote_section_item(
                section,
                section_lines=section_lines_map.get(section.id, []),
                product_name_map=product_name_map,
            )
            for section in (sections or [])
        ],
    )


def build_template_item(item, *, product_name: str | None = None) -> CRMQuoteTemplateItemResponse:
    return CRMQuoteTemplateItemResponse(
        id=item.id,
        section_id=item.section_id,
        product_id=item.product_id,
        product_name=product_name,
        line_type=item.line_type,
        name=item.name,
        description=item.description,
        quantity=item.quantity,
        unit_price=item.unit_price,
        sort_order=item.sort_order,
    )


def build_template_section_item(section, *, items: list | None = None, product_name_map: dict[int, str] | None = None) -> CRMQuoteTemplateSectionItemResponse:
    product_name_map = product_name_map or {}
    return CRMQuoteTemplateSectionItemResponse(
        id=section.id,
        template_id=section.template_id,
        title=section.title,
        description=section.description,
        sort_order=section.sort_order,
        items=[
            build_template_item(
                item,
                product_name=product_name_map.get(item.product_id),
            )
            for item in (items or [])
        ],
    )


def build_template_envelope(item, *, sections: list | None = None, section_items_map: dict[int, list] | None = None, product_name_map: dict[int, str] | None = None) -> CRMQuoteTemplateItemEnvelopeResponse:
    section_items_map = section_items_map or {}
    product_name_map = product_name_map or {}
    return CRMQuoteTemplateItemEnvelopeResponse(
        id=item.id,
        name=item.name,
        summary=item.summary,
        notes=item.notes,
        is_active=item.is_active,
        sort_order=item.sort_order,
        created_at=item.created_at,
        updated_at=item.updated_at,
        sections=[
            build_template_section_item(
                section,
                items=section_items_map.get(section.id, []),
                product_name_map=product_name_map,
            )
            for section in (sections or [])
        ],
    )
