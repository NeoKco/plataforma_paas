import os
import unittest
from types import SimpleNamespace
from unittest.mock import Mock

os.environ["DEBUG"] = "true"
os.environ["APP_ENV"] = "test"

from app.apps.tenant_modules.crm.models import CRMProduct, CRMProductIngestionDraft  # noqa: E402
from app.apps.tenant_modules.products.models import (  # noqa: E402
    ProductConnector,
    ProductPriceHistory,
    ProductSource,
)
from app.apps.tenant_modules.products.schemas import (  # noqa: E402
    ProductCatalogConnectorCreateRequest,
)
from app.apps.tenant_modules.products.services.connector_service import (  # noqa: E402
    ProductConnectorService,
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
