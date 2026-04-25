from __future__ import annotations

from app.apps.tenant_modules.crm.models import CRMProduct
from app.apps.tenant_modules.products.models import ProductSource
from app.apps.tenant_modules.products.services.source_service import ProductSourceService


class ProductCatalogComparisonService:
    def __init__(self) -> None:
        self._source_service = ProductSourceService()

    def list_comparisons(
        self,
        tenant_db,
        *,
        product_id: int | None = None,
        connector_id: int | None = None,
        limit: int = 100,
    ) -> list[dict]:
        query = tenant_db.query(ProductSource).filter(
            ProductSource.source_status.in_(("active", "stale", "archived"))
        )
        if product_id:
            query = query.filter(ProductSource.product_id == product_id)
        if connector_id:
            query = query.filter(ProductSource.connector_id == connector_id)
        source_rows = (
            query.order_by(
                ProductSource.product_id.asc(),
                ProductSource.last_seen_at.desc().nullslast(),
                ProductSource.id.desc(),
            )
            .all()
        )
        if not source_rows:
            return []

        product_map = {
            item.id: item
            for item in tenant_db.query(CRMProduct)
            .filter(CRMProduct.id.in_({row.product_id for row in source_rows}))
            .all()
        }
        connector_map, _ = self._source_service.build_maps(
            tenant_db,
            connector_ids=[row.connector_id for row in source_rows if row.connector_id],
        )

        grouped: dict[int, list[ProductSource]] = {}
        for row in source_rows:
            grouped.setdefault(row.product_id, []).append(row)

        comparisons: list[dict] = []
        for grouped_product_id, rows in grouped.items():
            product = product_map.get(grouped_product_id)
            if product is None:
                continue
            comparisons.append(
                self._build_product_comparison(
                    product=product,
                    rows=rows,
                    connector_map=connector_map,
                )
            )
        comparisons.sort(
            key=lambda item: (
                item["recommended_price"] is None,
                item["recommended_price"] if item["recommended_price"] is not None else 0,
                item["product_name"].lower(),
            )
        )
        return comparisons[: max(int(limit or 100), 1)]

    def _build_product_comparison(
        self,
        *,
        product,
        rows: list[ProductSource],
        connector_map: dict[int, str],
    ) -> dict:
        active_rows = [row for row in rows if row.source_status == "active"]
        price_rows = [row for row in active_rows if float(row.latest_unit_price or 0) > 0]
        ranked_rows = sorted(
            rows,
            key=lambda row: (
                row.source_status != "active",
                row.sync_status == "error",
                float(row.latest_unit_price or 0) <= 0,
                float(row.latest_unit_price or 0),
                -(row.last_seen_at.timestamp() if row.last_seen_at else 0),
                row.id,
            ),
        )
        recommended = ranked_rows[0] if ranked_rows else None
        lowest_price = min((float(row.latest_unit_price or 0) for row in price_rows), default=None)
        highest_price = max((float(row.latest_unit_price or 0) for row in price_rows), default=None)
        latest_seen_at = max((row.last_seen_at for row in rows if row.last_seen_at), default=None)
        spread = (
            float(highest_price - lowest_price)
            if lowest_price is not None and highest_price is not None
            else None
        )
        spread_percent = (
            float((spread / lowest_price) * 100)
            if spread is not None and lowest_price and lowest_price > 0
            else None
        )
        recommended_reason = None
        if recommended is not None:
            if recommended.source_status != "active":
                recommended_reason = "Fuente más reciente disponible"
            elif float(recommended.latest_unit_price or 0) > 0:
                recommended_reason = "Mejor precio activo"
            else:
                recommended_reason = "Fuente activa sin precio confirmado"

        return {
            "product_id": product.id,
            "product_name": product.name,
            "product_sku": product.sku,
            "source_count": len(rows),
            "active_source_count": len(active_rows),
            "recommended_source_id": recommended.id if recommended else None,
            "recommended_reason": recommended_reason,
            "recommended_price": float(recommended.latest_unit_price or 0) if recommended and float(recommended.latest_unit_price or 0) > 0 else None,
            "recommended_currency_code": recommended.currency_code if recommended else None,
            "lowest_price": float(lowest_price) if lowest_price is not None else None,
            "highest_price": float(highest_price) if highest_price is not None else None,
            "price_spread": spread,
            "price_spread_percent": spread_percent,
            "latest_seen_at": latest_seen_at,
            "sources": [
                {
                    "source_id": row.id,
                    "connector_id": row.connector_id,
                    "connector_name": connector_map.get(row.connector_id),
                    "source_label": row.source_label,
                    "source_url": row.source_url,
                    "source_status": row.source_status,
                    "sync_status": row.sync_status,
                    "latest_unit_price": float(row.latest_unit_price or 0),
                    "currency_code": row.currency_code,
                    "last_seen_at": row.last_seen_at,
                }
                for row in ranked_rows
            ],
        }
