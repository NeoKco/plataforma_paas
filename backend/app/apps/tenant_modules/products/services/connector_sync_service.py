from __future__ import annotations

import json
import time
from datetime import datetime, timezone
from typing import Any

from app.apps.tenant_modules.crm.models import CRMProduct
from app.apps.tenant_modules.products.models import ProductSource
from app.apps.tenant_modules.products.services.connector_service import ProductConnectorService
from app.apps.tenant_modules.products.services.enrichment_service import ProductCatalogEnrichmentService
from app.apps.tenant_modules.products.services.generic_ai_extraction_service import (
    ProductCatalogGenericAiExtractionService,
)
from app.apps.tenant_modules.products.services.ingestion_extraction_service import (
    ProductCatalogIngestionExtractionService,
)
from app.apps.tenant_modules.products.services.source_service import ProductSourceService
from app.common.config.settings import settings


class ProductConnectorSyncService:
    VALID_FETCH_STRATEGIES = {"html_generic", "html_vendor", "json_feed", "html_ai"}

    def __init__(self) -> None:
        self._connector_service = ProductConnectorService()
        self._source_service = ProductSourceService()
        self._extraction_service = ProductCatalogIngestionExtractionService()
        self._enrichment_service = ProductCatalogEnrichmentService()
        self._generic_ai_extraction_service = ProductCatalogGenericAiExtractionService()

    def sync_connector(
        self,
        tenant_db,
        connector_id: int,
        *,
        product_id: int | None = None,
        limit: int = 25,
    ) -> dict[str, Any]:
        connector = self._connector_service.get_connector(tenant_db, connector_id)
        if not connector.is_active:
            raise ValueError("El conector está inactivo")

        rows = self._list_sync_sources(
            tenant_db,
            connector_id=connector_id,
            product_id=product_id,
            limit=limit,
        )
        results: list[dict[str, Any]] = []
        synced = 0
        failed = 0
        skipped = 0
        price_updates = 0

        for source in rows:
            if not source.source_url:
                self._source_service.mark_source_sync_attempt(
                    tenant_db,
                    source,
                    sync_status="warning",
                    error_detail="La fuente no tiene URL para sincronizar",
                )
                results.append(
                    self._build_sync_result(
                        source,
                        sync_status="warning",
                        detail="La fuente no tiene URL para sincronizar",
                    )
                )
                skipped += 1
                continue

            previous_price = float(source.latest_unit_price or 0)
            try:
                extracted = self.extract_capture_payload(
                    connector=connector,
                    url=source.source_url,
                    source_label=source.source_label,
                )
                enriched = self._enrichment_service.enrich_capture_payload(
                    extracted,
                    prefer_ai=(
                        not bool(extracted.get("used_ai_enrichment"))
                        and (
                            bool(connector.run_ai_enrichment)
                            or connector.fetch_strategy == "html_ai"
                        )
                    ),
                    prompt_override=getattr(source, "refresh_prompt", None)
                    or getattr(connector, "config_notes", None),
                )
                currency_code = enriched.get("currency_code") or connector.default_currency_code or source.currency_code
                latest_price = max(float(enriched.get("unit_price") or 0), 0)
                self._source_service.mark_source_sync_attempt(
                    tenant_db,
                    source,
                    sync_status="synced",
                    latest_unit_price=latest_price,
                    currency_code=currency_code,
                    source_label=enriched.get("source_label") or source.source_label,
                    source_summary=enriched.get("source_excerpt") or enriched.get("description"),
                    external_reference=enriched.get("external_reference") or source.external_reference,
                    source_kind=enriched.get("source_kind") or source.source_kind,
                )
                if latest_price > 0 and (
                    previous_price <= 0
                    or abs(latest_price - previous_price) > 0.009
                ):
                    self._source_service.register_price_event(
                        tenant_db,
                        product_id=source.product_id,
                        product_source_id=source.id,
                        connector_id=connector.id,
                        price_kind="connector_sync",
                        unit_price=latest_price,
                        currency_code=currency_code,
                        source_label=enriched.get("source_label") or source.source_label,
                        source_url=source.source_url,
                        notes=f"sync:{connector.fetch_strategy}",
                    )
                    price_updates += 1
                synced += 1
                results.append(
                    self._build_sync_result(
                        source,
                        sync_status="synced",
                        unit_price=latest_price,
                        currency_code=currency_code,
                        detail="Sincronizado correctamente",
                    )
                )
            except Exception as exc:  # noqa: BLE001
                failed += 1
                self._source_service.mark_source_sync_attempt(
                    tenant_db,
                    source,
                    sync_status="error",
                    error_detail=str(exc),
                )
                results.append(
                    self._build_sync_result(
                        source,
                        sync_status="error",
                        detail=str(exc),
                    )
                )

        processed = len(rows)
        summary = (
            f"processed={processed}, synced={synced}, failed={failed}, "
            f"skipped={skipped}, price_updates={price_updates}"
        )
        self._connector_service.touch_connector_sync(
            tenant_db,
            connector.id,
            status="error" if failed else ("warning" if skipped else "ready"),
            summary=summary,
        )
        tenant_db.commit()
        return {
            "connector_id": connector.id,
            "connector_name": connector.name,
            "processed": processed,
            "synced": synced,
            "failed": failed,
            "skipped": skipped,
            "price_updates": price_updates,
            "items": results,
        }

    def _list_sync_sources(
        self,
        tenant_db,
        *,
        connector_id: int,
        product_id: int | None,
        limit: int,
    ) -> list[ProductSource]:
        query = tenant_db.query(ProductSource).filter(
            ProductSource.connector_id == connector_id,
            ProductSource.source_status.in_(("active", "stale")),
        )
        if product_id:
            query = query.filter(ProductSource.product_id == product_id)
        return (
            query.order_by(
                ProductSource.last_seen_at.desc().nullslast(),
                ProductSource.id.desc(),
            )
            .limit(max(int(limit or 25), 1))
            .all()
        )

    def _extract_for_connector(
        self,
        *,
        connector,
        url: str,
        source_label: str | None,
    ) -> dict[str, Any]:
        return self.extract_capture_payload(
            connector=connector,
            url=url,
            source_label=source_label,
        )

    def extract_capture_payload(
        self,
        *,
        connector,
        url: str,
        source_label: str | None,
    ) -> dict[str, Any]:
        strategy = (connector.fetch_strategy or "html_generic").strip().lower()
        if strategy not in self.VALID_FETCH_STRATEGIES:
            raise ValueError("Estrategia de extracción inválida")
        payload = self._extract_with_runtime_profile(
            connector=connector,
            url=url,
            strategy=strategy,
        )
        payload["source_url"] = url
        payload["source_label"] = source_label or payload.get("source_label") or connector.name
        payload["source_kind"] = (
            "vendor_feed"
            if strategy == "json_feed"
            else "marketplace_product"
            if getattr(connector, "provider_key", "generic") == "mercadolibre"
            else "vendor_site"
        )
        notes = payload.get("extraction_notes")
        profile = getattr(connector, "provider_profile", None)
        if profile:
            payload["extraction_notes"] = f"{notes} · profile={profile}" if notes else f"profile={profile}"
        return payload

    def _extract_with_runtime_profile(self, *, connector, url: str, strategy: str) -> dict[str, Any]:
        attempts = max(int(getattr(connector, "retry_limit", 2) or 0), 0) + 1
        backoff_seconds = max(int(getattr(connector, "retry_backoff_seconds", 3) or 0), 0)
        timeout_seconds = max(int(getattr(connector, "request_timeout_seconds", 25) or 25), 5)
        last_error = None
        for attempt in range(attempts):
            try:
                if strategy == "json_feed":
                    return self._extract_from_json_feed(url, timeout_seconds=timeout_seconds)
                if strategy == "html_ai":
                    ai_payload = self._generic_ai_extraction_service.extract_from_url(
                        url,
                        timeout_seconds=max(timeout_seconds, int(settings.API_IA_TIMEOUT or 45)),
                        prompt_override=getattr(connector, "config_notes", None),
                    )
                    try:
                        base_payload = self._extraction_service.extract_from_url(
                            url,
                            provider_key=getattr(connector, "provider_key", "generic"),
                            timeout_seconds=timeout_seconds,
                        )
                    except Exception:
                        base_payload = {}
                    return self._merge_capture_payloads(base_payload, ai_payload)
                return self._extraction_service.extract_from_url(
                    url,
                    provider_key=getattr(connector, "provider_key", "generic"),
                    timeout_seconds=timeout_seconds,
                )
            except Exception as exc:  # noqa: BLE001
                last_error = exc
                if attempt + 1 < attempts and backoff_seconds > 0:
                    time.sleep(min(backoff_seconds, 2))
        if last_error is not None:
            raise last_error
        raise RuntimeError("No fue posible extraer el payload del conector")

    @staticmethod
    def _merge_capture_payloads(base_payload: dict | None, ai_payload: dict | None) -> dict[str, Any]:
        merged = dict(base_payload or {})
        for key, value in dict(ai_payload or {}).items():
            if key == "characteristics":
                if value:
                    merged[key] = value
                continue
            if value not in (None, "", []):
                merged[key] = value
        return merged

    def _extract_from_json_feed(self, url: str, *, timeout_seconds: int = 25) -> dict[str, Any]:
        try:
            import requests
        except ModuleNotFoundError as exc:  # pragma: no cover - runtime dependency
            raise RuntimeError("La extracción JSON requiere requests instalado") from exc

        response = requests.get(
            url,
            headers={"User-Agent": self._extraction_service.USER_AGENT},
            timeout=max(int(timeout_seconds or 25), 5),
        )
        response.raise_for_status()
        payload = response.json()
        item = self._resolve_json_product_candidate(payload)
        if not isinstance(item, dict):
            raise ValueError("El feed JSON no devolvió un producto legible")

        characteristics = []
        specs = item.get("specs") or item.get("attributes") or {}
        if isinstance(specs, dict):
            for index, (label, value) in enumerate(specs.items()):
                if value in (None, "", []):
                    continue
                characteristics.append(
                    {
                        "label": str(label).strip()[:120],
                        "value": str(value).strip()[:4000],
                        "sort_order": (index + 1) * 10,
                    }
                )

        description = (
            item.get("description")
            or item.get("summary")
            or item.get("details")
        )
        return {
            "name": item.get("name") or item.get("title"),
            "sku": item.get("sku") or item.get("code") or item.get("id"),
            "brand": item.get("brand") or item.get("vendor"),
            "category_label": item.get("category") or item.get("family"),
            "product_type": item.get("product_type") or "product",
            "unit_label": item.get("unit") or item.get("unit_label"),
            "unit_price": self._parse_json_price(
                item.get("price")
                or item.get("unit_price")
                or item.get("amount")
            ),
            "currency_code": (item.get("currency_code") or item.get("currency") or "CLP"),
            "description": str(description).strip()[:4000] if description else None,
            "source_excerpt": str(description).strip()[:4000] if description else None,
            "extraction_notes": "Sincronización automática desde feed JSON",
            "external_reference": item.get("external_reference") or item.get("reference"),
            "characteristics": characteristics,
        }

    @staticmethod
    def _resolve_json_product_candidate(payload: Any) -> dict[str, Any] | None:
        if isinstance(payload, dict):
            for key in ("product", "item", "result", "data"):
                value = payload.get(key)
                if isinstance(value, dict):
                    return value
            return payload
        if isinstance(payload, list) and payload and isinstance(payload[0], dict):
            return payload[0]
        return None

    @staticmethod
    def _parse_json_price(value: Any) -> float:
        try:
            return max(float(value or 0), 0)
        except (TypeError, ValueError):
            return 0.0

    @staticmethod
    def _build_sync_result(
        source: ProductSource,
        *,
        sync_status: str,
        detail: str | None = None,
        unit_price: float | None = None,
        currency_code: str | None = None,
    ) -> dict[str, Any]:
        return {
            "source_id": source.id,
            "product_id": source.product_id,
            "connector_id": source.connector_id,
            "source_label": source.source_label,
            "source_url": source.source_url,
            "sync_status": sync_status,
            "unit_price": float(unit_price if unit_price is not None else (source.latest_unit_price or 0)),
            "currency_code": currency_code or source.currency_code or "CLP",
            "detail": detail,
        }
