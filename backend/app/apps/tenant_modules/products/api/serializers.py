from app.apps.tenant_modules.products.schemas import (
    ProductCatalogComparisonItemResponse,
    ProductCatalogComparisonSourceResponse,
    ProductCatalogDuplicateCandidateResponse,
    ProductCatalogDuplicateSummaryResponse,
    ProductCatalogConnectorItemResponse,
    ProductCatalogConnectorSyncItemResponse,
    ProductCatalogEnrichmentStateResponse,
    ProductCatalogIngestionCharacteristicItemResponse,
    ProductCatalogIngestionDraftItemResponse,
    ProductCatalogIngestionRunItemResponse,
    ProductCatalogIngestionRunResponse,
    ProductCatalogItemResponse,
    ProductCatalogPriceHistoryItemResponse,
    ProductCatalogRefreshResultResponse,
    ProductCatalogRefreshRunItemResponse,
    ProductCatalogRefreshRunResponse,
    ProductCatalogProductSourceItemResponse,
    ProductCatalogProductCharacteristicItemResponse,
)


def build_product_catalog_item(
    item,
    *,
    characteristics: list | None = None,
    health: dict | None = None,
) -> ProductCatalogItemResponse:
    health = health or {}
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
        source_count=int(health.get("source_count", 0) or 0),
        active_source_count=int(health.get("active_source_count", 0) or 0),
        health_status=health.get("health_status", "no_source"),
        last_refresh_at=health.get("last_refresh_at"),
        next_refresh_at=health.get("next_refresh_at"),
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


def build_product_connector_item(
    item,
    *,
    source_total: int = 0,
    price_event_total: int = 0,
) -> ProductCatalogConnectorItemResponse:
    return ProductCatalogConnectorItemResponse(
        id=item.id,
        name=item.name,
        connector_kind=item.connector_kind,
        provider_key=getattr(item, "provider_key", "generic"),
        provider_profile=getattr(item, "provider_profile", "generic_v1"),
        base_url=item.base_url,
        default_currency_code=item.default_currency_code,
        supports_batch=bool(item.supports_batch),
        supports_price_tracking=bool(item.supports_price_tracking),
        is_active=bool(item.is_active),
        auth_mode=getattr(item, "auth_mode", "none"),
        auth_reference=getattr(item, "auth_reference", None),
        request_timeout_seconds=int(getattr(item, "request_timeout_seconds", 25) or 25),
        retry_limit=int(getattr(item, "retry_limit", 2) or 2),
        retry_backoff_seconds=int(getattr(item, "retry_backoff_seconds", 3) or 3),
        sync_mode=item.sync_mode,
        fetch_strategy=item.fetch_strategy,
        run_ai_enrichment=bool(getattr(item, "run_ai_enrichment", False)),
        schedule_enabled=bool(getattr(item, "schedule_enabled", False)),
        schedule_scope=getattr(item, "schedule_scope", "due_sources"),
        schedule_frequency=getattr(item, "schedule_frequency", "daily"),
        schedule_batch_limit=int(getattr(item, "schedule_batch_limit", 25) or 25),
        next_scheduled_run_at=getattr(item, "next_scheduled_run_at", None),
        last_scheduled_run_at=getattr(item, "last_scheduled_run_at", None),
        last_schedule_status=getattr(item, "last_schedule_status", "idle"),
        last_schedule_summary=getattr(item, "last_schedule_summary", None),
        config_notes=item.config_notes,
        last_validation_at=getattr(item, "last_validation_at", None),
        last_validation_status=getattr(item, "last_validation_status", "idle"),
        last_validation_summary=getattr(item, "last_validation_summary", None),
        last_sync_at=item.last_sync_at,
        last_sync_status=item.last_sync_status,
        last_sync_summary=getattr(item, "last_sync_summary", None),
        source_total=int(source_total or 0),
        price_event_total=int(price_event_total or 0),
        created_at=item.created_at,
        updated_at=getattr(item, "updated_at", None),
    )


def build_product_source_item(
    item,
    *,
    connector_name: str | None = None,
) -> ProductCatalogProductSourceItemResponse:
    return ProductCatalogProductSourceItemResponse(
        id=item.id,
        product_id=item.product_id,
        connector_id=item.connector_id,
        connector_name=connector_name,
        draft_id=item.draft_id,
        run_item_id=item.run_item_id,
        source_kind=item.source_kind,
        source_label=item.source_label,
        source_url=item.source_url,
        external_reference=item.external_reference,
        source_status=item.source_status,
        sync_status=getattr(item, "sync_status", "idle"),
        refresh_mode=getattr(item, "refresh_mode", "manual"),
        refresh_merge_policy=getattr(item, "refresh_merge_policy", "safe_merge"),
        refresh_prompt=getattr(item, "refresh_prompt", None),
        latest_unit_price=float(item.latest_unit_price or 0),
        currency_code=item.currency_code,
        source_summary=item.source_summary,
        captured_at=item.captured_at,
        last_seen_at=item.last_seen_at,
        last_sync_attempt_at=getattr(item, "last_sync_attempt_at", None),
        next_refresh_at=getattr(item, "next_refresh_at", None),
        last_refresh_success_at=getattr(item, "last_refresh_success_at", None),
        last_sync_error=getattr(item, "last_sync_error", None),
        created_at=item.created_at,
        updated_at=getattr(item, "updated_at", None),
    )


def build_product_price_history_item(
    item,
    *,
    product_name: str | None = None,
    connector_name: str | None = None,
) -> ProductCatalogPriceHistoryItemResponse:
    return ProductCatalogPriceHistoryItemResponse(
        id=item.id,
        product_id=item.product_id,
        product_name=product_name,
        product_source_id=item.product_source_id,
        connector_id=item.connector_id,
        connector_name=connector_name,
        draft_id=item.draft_id,
        price_kind=item.price_kind,
        unit_price=float(item.unit_price or 0),
        currency_code=item.currency_code,
        source_label=item.source_label,
        source_url=item.source_url,
        notes=item.notes,
        captured_at=item.captured_at,
        created_at=item.created_at,
    )


def build_product_connector_sync_item(item: dict) -> ProductCatalogConnectorSyncItemResponse:
    return ProductCatalogConnectorSyncItemResponse(
        source_id=int(item["source_id"]),
        product_id=int(item["product_id"]),
        connector_id=item.get("connector_id"),
        source_label=item.get("source_label"),
        source_url=item.get("source_url"),
        sync_status=item.get("sync_status", "idle"),
        unit_price=float(item.get("unit_price", 0) or 0),
        currency_code=item.get("currency_code") or "CLP",
        detail=item.get("detail"),
    )


def build_product_comparison_item(item: dict) -> ProductCatalogComparisonItemResponse:
    return ProductCatalogComparisonItemResponse(
        product_id=int(item["product_id"]),
        product_name=item["product_name"],
        product_sku=item.get("product_sku"),
        source_count=int(item.get("source_count", 0) or 0),
        active_source_count=int(item.get("active_source_count", 0) or 0),
        recommended_source_id=item.get("recommended_source_id"),
        recommended_reason=item.get("recommended_reason"),
        recommended_price=float(item["recommended_price"]) if item.get("recommended_price") is not None else None,
        recommended_currency_code=item.get("recommended_currency_code"),
        lowest_price=float(item["lowest_price"]) if item.get("lowest_price") is not None else None,
        highest_price=float(item["highest_price"]) if item.get("highest_price") is not None else None,
        price_spread=float(item["price_spread"]) if item.get("price_spread") is not None else None,
        price_spread_percent=float(item["price_spread_percent"]) if item.get("price_spread_percent") is not None else None,
        latest_seen_at=item.get("latest_seen_at"),
        sources=[
            ProductCatalogComparisonSourceResponse(
                source_id=int(source["source_id"]),
                connector_id=source.get("connector_id"),
                connector_name=source.get("connector_name"),
                source_label=source.get("source_label"),
                source_url=source.get("source_url"),
                source_status=source.get("source_status", "active"),
                sync_status=source.get("sync_status", "idle"),
                latest_unit_price=float(source.get("latest_unit_price", 0) or 0),
                currency_code=source.get("currency_code") or "CLP",
                last_seen_at=source.get("last_seen_at"),
            )
            for source in item.get("sources", [])
        ],
    )


def build_product_refresh_result(item: dict) -> ProductCatalogRefreshResultResponse:
    return ProductCatalogRefreshResultResponse(
        product_id=int(item["product_id"]),
        product_name=item["product_name"],
        refreshed_sources=int(item.get("refreshed_sources", 0) or 0),
        completed_sources=int(item.get("completed_sources", 0) or 0),
        error_sources=int(item.get("error_sources", 0) or 0),
        changed_fields=list(item.get("changed_fields") or []),
        merge_policies=list(item.get("merge_policies") or []),
        message=item.get("message"),
    )


def build_product_refresh_run_item(item, *, product_name: str | None = None) -> ProductCatalogRefreshRunItemResponse:
    import json

    changed_fields: list[str] = []
    try:
        payload = json.loads(item.detected_changes_json or "{}")
    except Exception:  # noqa: BLE001
        payload = {}
    changed_fields = list(payload.get("changed_fields") or [])
    return ProductCatalogRefreshRunItemResponse(
        id=item.id,
        run_id=item.run_id,
        product_id=item.product_id,
        product_name=product_name,
        product_source_id=item.product_source_id,
        item_status=item.item_status,
        source_url=item.source_url,
        source_label=item.source_label,
        merge_policy=item.merge_policy,
        used_ai_enrichment=bool(item.used_ai_enrichment),
        changed_fields=changed_fields,
        error_message=item.error_message,
        processed_at=item.processed_at,
        created_at=getattr(item, "created_at", None),
        updated_at=getattr(item, "updated_at", None),
    )


def build_product_refresh_run(
    item,
    *,
    items: list | None = None,
    connector_name: str | None = None,
    product_names: dict[int, str] | None = None,
) -> ProductCatalogRefreshRunResponse:
    product_names = product_names or {}
    return ProductCatalogRefreshRunResponse(
        id=item.id,
        status=item.status,
        scope=item.scope,
        scope_label=item.scope_label,
        connector_id=getattr(item, "connector_id", None),
        connector_name=connector_name,
        requested_count=int(item.requested_count or 0),
        processed_count=int(item.processed_count or 0),
        completed_count=int(item.completed_count or 0),
        error_count=int(item.error_count or 0),
        cancelled_count=int(item.cancelled_count or 0),
        prefer_ai=bool(getattr(item, "prefer_ai", False)),
        created_by_user_id=item.created_by_user_id,
        started_at=item.started_at,
        finished_at=item.finished_at,
        cancelled_at=item.cancelled_at,
        last_error=item.last_error,
        created_at=getattr(item, "created_at", None),
        updated_at=getattr(item, "updated_at", None),
        items=[
            build_product_refresh_run_item(run_item, product_name=product_names.get(run_item.product_id))
            for run_item in (items or [])
        ],
    )


def build_product_catalog_ingestion_draft_item(
    item,
    *,
    characteristics: list | None = None,
    published_product_name: str | None = None,
    connector_name: str | None = None,
    duplicate_analysis: dict | None = None,
    enrichment_state: dict | None = None,
) -> ProductCatalogIngestionDraftItemResponse:
    return ProductCatalogIngestionDraftItemResponse(
        id=item.id,
        source_kind=item.source_kind,
        source_label=item.source_label,
        source_url=item.source_url,
        connector_id=getattr(item, "connector_id", None),
        connector_name=connector_name,
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
        duplicate_summary=(
            ProductCatalogDuplicateSummaryResponse(
                status=duplicate_analysis.get("status", "none"),
                top_score=int(duplicate_analysis.get("top_score", 0) or 0),
                candidate_count=int(duplicate_analysis.get("candidate_count", 0) or 0),
                top_reason=duplicate_analysis.get("top_reason"),
            )
            if duplicate_analysis
            else None
        ),
        duplicate_candidates=[
            ProductCatalogDuplicateCandidateResponse(
                candidate_kind=candidate["candidate_kind"],
                candidate_id=int(candidate["candidate_id"]),
                label=candidate["label"],
                sku=candidate.get("sku"),
                brand=candidate.get("brand"),
                capture_status=candidate.get("capture_status"),
                score=int(candidate.get("score", 0) or 0),
                reasons=list(candidate.get("reasons") or []),
            )
            for candidate in ((duplicate_analysis or {}).get("candidates") or [])
        ],
        enrichment_state=(
            ProductCatalogEnrichmentStateResponse(
                status=enrichment_state.get("status", "pending"),
                strategy=enrichment_state.get("strategy"),
                summary=enrichment_state.get("summary"),
                ai_available=bool(enrichment_state.get("ai_available")),
            )
            if enrichment_state
            else None
        ),
    )


def build_product_catalog_ingestion_run_item(item, *, connector_name: str | None = None) -> ProductCatalogIngestionRunItemResponse:
    return ProductCatalogIngestionRunItemResponse(
        id=item.id,
        run_id=item.run_id,
        source_url=item.source_url,
        source_label=item.source_label,
        connector_id=getattr(item, "connector_id", None),
        connector_name=connector_name,
        external_reference=item.external_reference,
        item_status=item.item_status,
        draft_id=item.draft_id,
        extracted_name=item.extracted_name,
        error_message=item.error_message,
        processed_at=item.processed_at,
        created_at=getattr(item, "created_at", None),
        updated_at=getattr(item, "updated_at", None),
    )


def build_product_catalog_ingestion_run(
    item,
    *,
    items: list | None = None,
    connector_name: str | None = None,
    item_connector_names: dict[int, str] | None = None,
) -> ProductCatalogIngestionRunResponse:
    return ProductCatalogIngestionRunResponse(
        id=item.id,
        status=item.status,
        source_mode=item.source_mode,
        source_label=item.source_label,
        connector_id=getattr(item, "connector_id", None),
        connector_name=connector_name,
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
        items=[
            build_product_catalog_ingestion_run_item(
                run_item,
                connector_name=(item_connector_names or {}).get(run_item.id),
            )
            for run_item in (items or [])
        ],
    )
