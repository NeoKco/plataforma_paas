from __future__ import annotations

from app.apps.tenant_modules.products.services.connector_sync_service import ProductConnectorSyncService
from app.apps.tenant_modules.products.services.product_service import ProductCatalogService
from app.apps.tenant_modules.products.services.source_service import ProductSourceService


class ProductCatalogRefreshService:
    def __init__(self) -> None:
        self._product_service = ProductCatalogService()
        self._source_service = ProductSourceService()
        self._connector_sync_service = ProductConnectorSyncService()

    def refresh_product(
        self,
        tenant_db,
        product_id: int,
        *,
        prefer_ai: bool = True,
        source_ids: list[int] | None = None,
    ) -> tuple[object, dict]:
        product = self._product_service.get_product(tenant_db, product_id)
        sources = [
            item
            for item in self._source_service.list_sources(tenant_db, product_id=product_id)
            if item.source_status in {"active", "stale"} and item.source_url
        ]
        if source_ids:
            source_id_set = {item for item in source_ids if item}
            sources = [item for item in sources if item.id in source_id_set]
        if not sources:
            raise ValueError("El producto no tiene fuentes activas con URL para actualizar")

        changed_fields: set[str] = set()
        merge_policies: list[str] = []
        completed_sources = 0
        error_sources = 0

        for source in sources:
            try:
                connector = (
                    self._connector_sync_service._connector_service.get_connector(tenant_db, source.connector_id)
                    if source.connector_id
                    else None
                )
                extracted = self._extract_for_source(source, connector)
                enriched = self._connector_sync_service._enrichment_service.enrich_capture_payload(
                    extracted,
                    prefer_ai=prefer_ai or bool(getattr(connector, "run_ai_enrichment", False)),
                    prompt_override=getattr(source, "refresh_prompt", None)
                    or getattr(connector, "config_notes", None),
                )
                merge_policy = getattr(source, "refresh_merge_policy", "safe_merge") or "safe_merge"
                product, product_changes = self._product_service.apply_capture_refresh(
                    tenant_db,
                    product.id,
                    enriched,
                    merge_policy=merge_policy,
                )
                self._source_service.mark_source_sync_attempt(
                    tenant_db,
                    source,
                    sync_status="synced",
                    latest_unit_price=float(enriched.get("unit_price") or 0),
                    currency_code=enriched.get("currency_code") or getattr(connector, "default_currency_code", None),
                    source_label=enriched.get("source_label") or source.source_label,
                    source_summary=enriched.get("source_excerpt") or enriched.get("description"),
                    external_reference=enriched.get("external_reference") or source.external_reference,
                    source_kind=enriched.get("source_kind") or source.source_kind,
                )
                if float(enriched.get("unit_price") or 0) > 0:
                    self._source_service.register_price_event(
                        tenant_db,
                        product_id=product.id,
                        product_source_id=source.id,
                        connector_id=getattr(connector, "id", None),
                        price_kind="connector_sync",
                        unit_price=float(enriched.get("unit_price") or 0),
                        currency_code=enriched.get("currency_code")
                        or getattr(connector, "default_currency_code", None)
                        or source.currency_code,
                        source_label=enriched.get("source_label") or source.source_label,
                        source_url=source.source_url,
                        notes=f"refresh:{merge_policy}",
                    )
                changed_fields.update(product_changes)
                merge_policies.append(merge_policy)
                completed_sources += 1
            except Exception as exc:  # noqa: BLE001
                error_sources += 1
                self._source_service.mark_source_sync_attempt(
                    tenant_db,
                    source,
                    sync_status="error",
                    error_detail=str(exc),
                )

        tenant_db.commit()
        tenant_db.refresh(product)
        return product, {
            "product_id": product.id,
            "product_name": product.name,
            "refreshed_sources": len(sources),
            "completed_sources": completed_sources,
            "error_sources": error_sources,
            "changed_fields": sorted(changed_fields),
            "merge_policies": sorted(set(merge_policies)),
            "message": "Actualización viva aplicada al catálogo",
        }

    def _extract_for_source(self, source, connector):
        if connector is not None:
            return self._connector_sync_service.extract_capture_payload(
                connector=connector,
                url=source.source_url,
                source_label=source.source_label,
            )
        payload = self._connector_sync_service._extraction_service.extract_from_url(source.source_url)
        payload["source_label"] = source.source_label or payload.get("source_label")
        payload["source_kind"] = source.source_kind or payload.get("source_kind") or "url_reference"
        return payload
