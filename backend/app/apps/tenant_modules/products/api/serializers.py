from app.apps.tenant_modules.products.schemas import (
    ProductCatalogIngestionCharacteristicItemResponse,
    ProductCatalogIngestionDraftItemResponse,
    ProductCatalogIngestionRunItemResponse,
    ProductCatalogIngestionRunResponse,
    ProductCatalogItemResponse,
    ProductCatalogProductCharacteristicItemResponse,
)


def build_product_catalog_item(item, *, characteristics: list | None = None) -> ProductCatalogItemResponse:
    return ProductCatalogItemResponse(
        id=item.id,
        sku=item.sku,
        name=item.name,
        product_type=item.product_type,
        unit_label=item.unit_label,
        unit_price=float(item.unit_price or 0),
        description=item.description,
        is_active=bool(item.is_active),
        sort_order=int(item.sort_order or 0),
        created_at=item.created_at,
        updated_at=getattr(item, "updated_at", None),
        characteristics=[
            ProductCatalogProductCharacteristicItemResponse(
                id=characteristic.id,
                product_id=characteristic.product_id,
                label=characteristic.label,
                value=characteristic.value,
                sort_order=characteristic.sort_order,
                created_at=getattr(characteristic, "created_at", None),
            )
            for characteristic in (characteristics or [])
        ],
    )


def build_product_catalog_ingestion_draft_item(
    item,
    *,
    characteristics: list | None = None,
    published_product_name: str | None = None,
) -> ProductCatalogIngestionDraftItemResponse:
    return ProductCatalogIngestionDraftItemResponse(
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
        unit_price=float(item.unit_price or 0),
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
        updated_at=getattr(item, "updated_at", None),
        characteristics=[
            ProductCatalogIngestionCharacteristicItemResponse(
                id=characteristic.id,
                draft_id=characteristic.draft_id,
                label=characteristic.label,
                value=characteristic.value,
                sort_order=characteristic.sort_order,
                created_at=getattr(characteristic, "created_at", None),
            )
            for characteristic in (characteristics or [])
        ],
    )


def build_product_catalog_ingestion_run_item(item) -> ProductCatalogIngestionRunItemResponse:
    return ProductCatalogIngestionRunItemResponse(
        id=item.id,
        run_id=item.run_id,
        source_url=item.source_url,
        source_label=item.source_label,
        external_reference=item.external_reference,
        item_status=item.item_status,
        draft_id=item.draft_id,
        extracted_name=item.extracted_name,
        error_message=item.error_message,
        processed_at=item.processed_at,
        created_at=getattr(item, "created_at", None),
        updated_at=getattr(item, "updated_at", None),
    )


def build_product_catalog_ingestion_run(item, *, items: list | None = None) -> ProductCatalogIngestionRunResponse:
    return ProductCatalogIngestionRunResponse(
        id=item.id,
        status=item.status,
        source_mode=item.source_mode,
        source_label=item.source_label,
        requested_count=int(item.requested_count or 0),
        processed_count=int(item.processed_count or 0),
        completed_count=int(item.completed_count or 0),
        error_count=int(item.error_count or 0),
        cancelled_count=int(item.cancelled_count or 0),
        created_by_user_id=item.created_by_user_id,
        started_at=item.started_at,
        finished_at=item.finished_at,
        cancelled_at=item.cancelled_at,
        last_error=item.last_error,
        created_at=getattr(item, "created_at", None),
        updated_at=getattr(item, "updated_at", None),
        items=[build_product_catalog_ingestion_run_item(run_item) for run_item in (items or [])],
    )
