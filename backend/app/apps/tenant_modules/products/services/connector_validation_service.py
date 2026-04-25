from __future__ import annotations

import time
from typing import Any

from app.apps.tenant_modules.products.models import ProductSource
from app.apps.tenant_modules.products.services.connector_service import ProductConnectorService
from app.apps.tenant_modules.products.services.connector_sync_service import ProductConnectorSyncService


class ProductConnectorValidationService:
    def __init__(
        self,
        *,
        connector_service: ProductConnectorService | None = None,
        connector_sync_service: ProductConnectorSyncService | None = None,
    ) -> None:
        self._connector_service = connector_service or ProductConnectorService()
        self._connector_sync_service = connector_sync_service or ProductConnectorSyncService()

    def validate_connector(self, tenant_db, connector_id: int) -> dict[str, Any]:
        connector = self._connector_service.get_connector(tenant_db, connector_id)
        validation_url = self._resolve_validation_url(tenant_db, connector)
        if not validation_url:
            message = "El conector no tiene base_url ni fuentes activas para validar"
            self._connector_service.touch_connector_validation(
                tenant_db,
                connector.id,
                status="warning",
                summary=message,
            )
            tenant_db.commit()
            return {
                "connector_id": connector.id,
                "connector_name": connector.name,
                "status": "warning",
                "detail": message,
                "preview": None,
            }

        last_error = None
        attempts = max(int(getattr(connector, "retry_limit", 2) or 0), 0) + 1
        backoff_seconds = max(int(getattr(connector, "retry_backoff_seconds", 3) or 0), 0)
        for attempt in range(attempts):
            try:
                payload = self._connector_sync_service.extract_capture_payload(
                    connector=connector,
                    url=validation_url,
                    source_label=connector.name,
                )
                preview = {
                    "source_url": validation_url,
                    "source_kind": payload.get("source_kind") or "vendor_site",
                    "source_label": payload.get("source_label") or connector.name,
                    "name": payload.get("name"),
                    "sku": payload.get("sku"),
                    "brand": payload.get("brand"),
                    "category_label": payload.get("category_label"),
                    "product_type": payload.get("product_type"),
                    "unit_price": float(payload.get("unit_price") or 0),
                    "currency_code": payload.get("currency_code"),
                    "characteristic_count": len(payload.get("characteristics") or []),
                    "extraction_notes": payload.get("extraction_notes"),
                }
                summary = (
                    f"url={validation_url} name={preview['name'] or 'n/a'} "
                    f"sku={preview['sku'] or 'n/a'} price={preview['unit_price']}"
                )
                self._connector_service.touch_connector_validation(
                    tenant_db,
                    connector.id,
                    status="validated",
                    summary=summary[:500],
                )
                tenant_db.commit()
                return {
                    "connector_id": connector.id,
                    "connector_name": connector.name,
                    "status": "validated",
                    "detail": "Conector validado correctamente",
                    "preview": preview,
                }
            except Exception as exc:  # noqa: BLE001
                last_error = str(exc)
                if attempt + 1 < attempts and backoff_seconds > 0:
                    time.sleep(min(backoff_seconds, 2))

        summary = (last_error or "Validación fallida")[:500]
        self._connector_service.touch_connector_validation(
            tenant_db,
            connector.id,
            status="error",
            summary=summary,
        )
        tenant_db.commit()
        return {
            "connector_id": connector.id,
            "connector_name": connector.name,
            "status": "error",
            "detail": last_error or "Validación fallida",
            "preview": None,
        }

    @staticmethod
    def _resolve_validation_url(tenant_db, connector) -> str | None:
        if getattr(connector, "base_url", None):
            return connector.base_url
        source = (
            tenant_db.query(ProductSource)
            .filter(
                ProductSource.connector_id == connector.id,
                ProductSource.source_status.in_(("active", "stale")),
                ProductSource.source_url.isnot(None),
            )
            .order_by(
                ProductSource.last_seen_at.desc().nullslast(),
                ProductSource.id.desc(),
            )
            .first()
        )
        return getattr(source, "source_url", None)
