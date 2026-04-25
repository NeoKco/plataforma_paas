import os
import unittest
from types import SimpleNamespace
from unittest.mock import Mock, patch

os.environ["DEBUG"] = "true"
os.environ["APP_ENV"] = "test"

from app.apps.tenant_modules.crm.models import CRMProduct, CRMProductIngestionDraft  # noqa: E402
from app.apps.tenant_modules.products.models import (  # noqa: E402
    ProductConnector,
    ProductPriceHistory,
    ProductRefreshRunItem,
    ProductSource,
)
from app.apps.tenant_modules.products.schemas import (  # noqa: E402
    ProductCatalogConnectorCreateRequest,
)
from app.apps.tenant_modules.products.services.connector_service import (  # noqa: E402
    ProductConnectorService,
)
from app.apps.tenant_modules.products.services.connector_sync_service import (  # noqa: E402
    ProductConnectorSyncService,
)
from app.apps.tenant_modules.products.services.comparison_service import (  # noqa: E402
    ProductCatalogComparisonService,
)
from app.apps.tenant_modules.products.services.refresh_run_service import (  # noqa: E402
    ProductCatalogRefreshRunService,
)
from app.apps.tenant_modules.products.services.refresh_service import (  # noqa: E402
    ProductCatalogRefreshService,
)
from app.apps.tenant_modules.products.services.source_service import (  # noqa: E402
    ProductSourceService,
)


class ProductsServicesTestCase(unittest.TestCase):
    def test_create_connector_persists_profile(self) -> None:
        tenant_db = Mock()
        added_items: list[object] = []
        tenant_db.add.side_effect = lambda item: added_items.append(item)
        tenant_db.commit.return_value = None
        tenant_db.refresh.return_value = None

        service = ProductConnectorService()
        created = service.create_connector(
            tenant_db,
            ProductCatalogConnectorCreateRequest(
                name="Proveedor Solar",
                connector_kind="vendor_site",
                base_url="https://solar.local",
                default_currency_code="CLP",
                supports_batch=True,
                supports_price_tracking=True,
                is_active=True,
                config_notes="catálogo principal",
            ),
        )

        self.assertEqual(created.name, "Proveedor Solar")
        self.assertEqual(created.connector_kind, "vendor_site")
        self.assertTrue(any(isinstance(item, ProductConnector) for item in added_items))

    def test_record_from_draft_creates_source_and_price_event(self) -> None:
        product = CRMProduct(id=14, name="Heat Pipe 150L")
        draft = CRMProductIngestionDraft(
            id=77,
            source_kind="url_reference",
            source_label="Proveedor Demo",
            source_url="https://proveedor.local/heat-pipe-150",
            connector_id=3,
            external_reference="sku-150",
            capture_status="draft",
            sku="HP-150",
            name="Heat Pipe 150L",
            brand="Solar Demo",
            category_label="Solar",
            product_type="product",
            unit_label="unidad",
            unit_price=345000,
            currency_code="CLP",
            description="Equipo",
            source_excerpt="Ficha comercial",
            extraction_notes=None,
            review_notes=None,
            created_by_user_id=None,
            reviewed_by_user_id=None,
            published_product_id=None,
            published_at=None,
            discarded_at=None,
        )
        connector = ProductConnector(id=3, name="Proveedor Demo", connector_kind="vendor_site")

        tenant_db = Mock()
        tenant_db.get.side_effect = lambda model, item_id: (
            product
            if model is CRMProduct and item_id == 14
            else connector
            if model is ProductConnector and item_id == 3
            else None
        )
        source_query = Mock()
        scoped_query = Mock()
        nested_query = Mock()
        source_query.filter.return_value = scoped_query
        scoped_query.filter.return_value = nested_query
        nested_query.first.side_effect = [None, None]
        nested_query.order_by.return_value.first.return_value = None
        tenant_db.query.return_value = source_query

        added_items: list[object] = []

        def add_side_effect(item) -> None:
            added_items.append(item)

        def flush_side_effect() -> None:
            source_id = 501
            price_id = 601
            for item in added_items:
                if isinstance(item, ProductSource) and getattr(item, "id", None) is None:
                    item.id = source_id
                if isinstance(item, ProductPriceHistory) and getattr(item, "id", None) is None:
                    item.id = price_id

        tenant_db.add.side_effect = add_side_effect
        tenant_db.flush.side_effect = flush_side_effect

        service = ProductSourceService()
        source, price_event = service.record_from_draft(
            tenant_db,
            product_id=14,
            draft=draft,
            connector_id=3,
            notes="approved",
        )

        self.assertEqual(source.product_id, 14)
        self.assertEqual(source.connector_id, 3)
        self.assertEqual(source.latest_unit_price, 345000)
        self.assertEqual(price_event.product_source_id, 501)
        self.assertEqual(price_event.unit_price, 345000)
        self.assertTrue(any(isinstance(item, ProductSource) for item in added_items))
        self.assertTrue(any(isinstance(item, ProductPriceHistory) for item in added_items))

    def test_record_from_draft_rejects_unknown_product(self) -> None:
        tenant_db = Mock()
        tenant_db.get.return_value = None
        service = ProductSourceService()

        with self.assertRaises(ValueError) as exc:
            service.record_from_draft(
                tenant_db,
                product_id=999,
                draft=SimpleNamespace(
                    connector_id=None,
                    source_url=None,
                    external_reference=None,
                    source_kind="manual_capture",
                    source_label=None,
                    unit_price=0,
                    currency_code="CLP",
                    brand=None,
                    category_label=None,
                    source_excerpt=None,
                    id=1,
                ),
            )

        self.assertIn("Producto no encontrado", str(exc.exception))

    def test_connector_sync_updates_price_history_from_active_source(self) -> None:
        tenant_db = Mock()
        connector = ProductConnector(
            id=9,
            name="Feed JSON Demo",
            connector_kind="vendor_feed",
            default_currency_code="CLP",
            is_active=True,
            fetch_strategy="json_feed",
            run_ai_enrichment=False,
            config_notes=None,
        )
        source = ProductSource(
            id=31,
            product_id=14,
            connector_id=9,
            source_kind="vendor_feed",
            source_label="Demo JSON",
            source_url="https://vendor.local/product.json",
            external_reference=None,
            source_status="active",
            sync_status="idle",
            refresh_prompt=None,
            latest_unit_price=1000,
            currency_code="CLP",
        )

        service = ProductConnectorSyncService()
        service._connector_service.get_connector = Mock(return_value=connector)
        service._source_service.mark_source_sync_attempt = Mock()
        service._source_service.register_price_event = Mock()
        service._connector_service.touch_connector_sync = Mock()

        with patch.object(service, "_list_sync_sources", return_value=[source]):
            with patch.object(
                service,
                "extract_capture_payload",
                return_value={
                    "name": "Panel 550W",
                    "unit_price": 1250,
                    "currency_code": "CLP",
                    "source_excerpt": "actualizado",
                    "source_kind": "vendor_feed",
                },
            ):
                with patch.object(
                    service._enrichment_service,
                    "enrich_capture_payload",
                    return_value={
                        "name": "Panel 550W",
                        "unit_price": 1250,
                        "currency_code": "CLP",
                        "source_excerpt": "actualizado",
                        "source_kind": "vendor_feed",
                    },
                ):
                    result = service.sync_connector(tenant_db, connector_id=9, limit=10)

        self.assertEqual(result["processed"], 1)
        self.assertEqual(result["synced"], 1)
        self.assertEqual(result["price_updates"], 1)
        self.assertEqual(result["items"][0]["sync_status"], "synced")
        service._source_service.register_price_event.assert_called_once()
        tenant_db.commit.assert_called_once()

    def test_comparison_service_prefers_best_active_price(self) -> None:
        source_a = ProductSource(
            id=10,
            product_id=14,
            connector_id=1,
            source_label="Proveedor A",
            source_status="active",
            sync_status="synced",
            latest_unit_price=1200,
            currency_code="CLP",
        )
        source_b = ProductSource(
            id=11,
            product_id=14,
            connector_id=2,
            source_label="Proveedor B",
            source_status="active",
            sync_status="synced",
            latest_unit_price=900,
            currency_code="CLP",
        )

        source_query = Mock()
        filtered_query = Mock()
        ordered_query = Mock()
        product_query = Mock()
        product_filter = Mock()
        tenant_db = Mock()
        tenant_db.query.side_effect = [source_query, product_query]
        source_query.filter.return_value = filtered_query
        filtered_query.order_by.return_value = ordered_query
        ordered_query.all.return_value = [source_a, source_b]
        product_query.filter.return_value = product_filter
        product_filter.all.return_value = [CRMProduct(id=14, name="Inversor 5kW", sku="INV-5K")]

        service = ProductCatalogComparisonService()
        service._source_service.build_maps = Mock(return_value=({1: "Proveedor A", 2: "Proveedor B"}, {}))

        rows = service.list_comparisons(tenant_db, limit=10)

        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["product_id"], 14)
        self.assertEqual(rows[0]["recommended_source_id"], 11)
        self.assertEqual(rows[0]["recommended_price"], 900.0)
        self.assertEqual(rows[0]["source_count"], 2)

    def test_refresh_product_updates_catalog_and_price(self) -> None:
        tenant_db = Mock()
        product = CRMProduct(
            id=14,
            name="Panel antiguo",
            sku=None,
            product_type="service",
            unit_label=None,
            unit_price=1000,
            description=None,
        )
        source = ProductSource(
            id=31,
            product_id=14,
            connector_id=None,
            source_label="Proveedor Demo",
            source_url="https://proveedor.local/panel",
            source_status="active",
            sync_status="idle",
            refresh_merge_policy="safe_merge",
            refresh_mode="daily",
            latest_unit_price=1000,
            currency_code="CLP",
        )
        service = ProductCatalogRefreshService()
        service._product_service.get_product = Mock(return_value=product)
        service._source_service.list_sources = Mock(return_value=[source])
        service._connector_sync_service._extraction_service.extract_from_url = Mock(
            return_value={
                "name": "Panel 550W",
                "product_type": "product",
                "unit_label": "unidad",
                "unit_price": 1250,
                "description": "Panel fotovoltaico",
                "characteristics": [{"label": "Potencia", "value": "550W", "sort_order": 10}],
            }
        )
        service._connector_sync_service._enrichment_service.enrich_capture_payload = Mock(
            return_value={
                "name": "Panel 550W",
                "product_type": "product",
                "unit_label": "unidad",
                "unit_price": 1250,
                "description": "Panel fotovoltaico",
                "characteristics": [{"label": "Potencia", "value": "550W", "sort_order": 10}],
            }
        )
        service._product_service.apply_capture_refresh = Mock(
            side_effect=lambda tenant_db, product_id, capture_payload, merge_policy="safe_merge": (
                SimpleNamespace(
                    id=14,
                    name="Panel antiguo",
                    sku=None,
                    product_type="product",
                    unit_label="unidad",
                    unit_price=1250,
                    description="Panel fotovoltaico",
                ),
                ["unit_price", "product_type", "unit_label", "description", "characteristics"],
            )
        )
        service._source_service.mark_source_sync_attempt = Mock()
        service._source_service.register_price_event = Mock()

        refreshed_product, result = service.refresh_product(tenant_db, 14, prefer_ai=True)

        self.assertEqual(refreshed_product.unit_price, 1250)
        self.assertEqual(refreshed_product.product_type, "product")
        self.assertEqual(result["completed_sources"], 1)
        self.assertIn("unit_price", result["changed_fields"])
        tenant_db.commit.assert_called_once()

    def test_refresh_run_create_builds_items_for_due_sources(self) -> None:
        tenant_db = Mock()
        connector = ProductConnector(id=5, name="Proveedor Demo", is_active=True)
        source = ProductSource(
            id=31,
            product_id=14,
            connector_id=5,
            source_url="https://proveedor.local/panel",
            source_label="Proveedor Demo",
            source_status="active",
            refresh_mode="daily",
            refresh_merge_policy="safe_merge",
        )
        service = ProductCatalogRefreshRunService()
        service._connector_service.get_connector = Mock(return_value=connector)
        service._select_sources = Mock(return_value=[source])

        added_items: list[object] = []

        def add_side_effect(item) -> None:
            added_items.append(item)

        def flush_side_effect() -> None:
            for item in added_items:
                if getattr(item, "id", None) is None and item.__class__.__name__ == "ProductRefreshRun":
                    item.id = 9

        tenant_db.add.side_effect = add_side_effect
        tenant_db.flush.side_effect = flush_side_effect
        tenant_db.commit.return_value = None
        tenant_db.refresh.return_value = None

        run = service.create_run(
            tenant_db,
            SimpleNamespace(
                scope="due_sources",
                connector_id=5,
                product_ids=[],
                limit=50,
                prefer_ai=True,
            ),
            actor_user_id=44,
        )

        self.assertEqual(run.requested_count, 1)
        self.assertTrue(any(isinstance(item, ProductRefreshRunItem) for item in added_items))
