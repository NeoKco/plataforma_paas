import os
import unittest
from unittest.mock import Mock

os.environ["DEBUG"] = "true"
os.environ["APP_ENV"] = "test"

from app.apps.tenant_modules.crm.models import (  # noqa: E402
    CRMProduct,
    CRMProductIngestionCharacteristic,
    CRMProductIngestionDraft,
)
from app.apps.tenant_modules.products.services.enrichment_service import (  # noqa: E402
    ProductCatalogEnrichmentService,
)


class ProductCatalogEnrichmentServiceTestCase(unittest.TestCase):
    def test_duplicate_analysis_flags_catalog_and_draft_candidates(self) -> None:
        service = ProductCatalogEnrichmentService()
        tenant_db = Mock()

        current = CRMProductIngestionDraft(
            id=10,
            source_kind="url_reference",
            source_label="Proveedor Solar",
            source_url="https://proveedor.local/panel-200",
            external_reference="ref-200",
            capture_status="draft",
            sku="PNL-200",
            name="Panel Solar 200W",
            brand="Sun Corp",
            category_label="Solar",
            product_type="product",
            unit_label="unidad",
            unit_price=199990,
            currency_code="CLP",
            description="Panel fotovoltaico",
            source_excerpt=None,
            extraction_notes=None,
            review_notes=None,
            created_by_user_id=1,
            reviewed_by_user_id=None,
            published_product_id=None,
            published_at=None,
            discarded_at=None,
        )
        other_draft = CRMProductIngestionDraft(
            id=11,
            source_kind="url_reference",
            source_label="Proveedor Solar",
            source_url="https://proveedor.local/panel-200",
            external_reference="ref-201",
            capture_status="draft",
            sku="PNL-200",
            name="Panel solar 200w",
            brand="Sun Corp",
            category_label="Solar",
            product_type="product",
            unit_label="unidad",
            unit_price=200000,
            currency_code="CLP",
            description="Panel fotovoltaico similar",
            source_excerpt=None,
            extraction_notes=None,
            review_notes=None,
            created_by_user_id=2,
            reviewed_by_user_id=None,
            published_product_id=None,
            published_at=None,
            discarded_at=None,
        )
        catalog_product = CRMProduct(
            id=7,
            sku="PNL-200",
            name="Panel Solar 200W",
            product_type="product",
            unit_label="unidad",
            unit_price=210000,
            description="Marca: Sun Corp",
            is_active=True,
            sort_order=100,
        )

        product_query = Mock()
        product_query.order_by.return_value.all.return_value = [catalog_product]
        draft_query = Mock()
        draft_query.all.return_value = [current, other_draft]
        tenant_db.query.side_effect = lambda model: (
            product_query if model is CRMProduct else draft_query
        )

        analysis_map = service.build_duplicate_analysis_map(tenant_db, [current])
        analysis = analysis_map[current.id]

        self.assertEqual(analysis["status"], "high")
        self.assertGreaterEqual(analysis["candidate_count"], 2)
        self.assertEqual(analysis["candidates"][0]["score"], 100)
        self.assertIn(
            analysis["candidates"][0]["candidate_kind"],
            {"catalog_product", "ingestion_draft"},
        )

    def test_enrich_draft_normalizes_fields_and_characteristics(self) -> None:
        service = ProductCatalogEnrichmentService()
        draft = CRMProductIngestionDraft(
            id=21,
            source_kind="manual_capture",
            source_label="lista caliente",
            source_url=None,
            external_reference=None,
            capture_status="draft",
            sku=" kit  20 ",
            name="kit SOLAR premium",
            brand="solarpro",
            category_label=None,
            product_type="product",
            unit_label=None,
            unit_price=150000,
            currency_code="CLP",
            description="  kit   solar para techo   ",
            source_excerpt=None,
            extraction_notes="captura manual",
            review_notes=None,
            created_by_user_id=1,
            reviewed_by_user_id=None,
            published_product_id=None,
            published_at=None,
            discarded_at=None,
        )
        current_characteristic = CRMProductIngestionCharacteristic(
            id=1,
            draft_id=21,
            label=" potencia ",
            value=" 200W ",
            sort_order=10,
        )

        tenant_db = Mock()
        tenant_db.get.side_effect = lambda model, item_id: (
            draft if model is CRMProductIngestionDraft and item_id == 21 else None
        )
        characteristic_filter = Mock()
        characteristic_filter.order_by.return_value.all.return_value = [current_characteristic]
        characteristic_filter.delete.return_value = None
        characteristic_query = Mock()
        characteristic_query.filter.return_value = characteristic_filter
        tenant_db.query.side_effect = lambda model: characteristic_query
        tenant_db.add.return_value = None
        tenant_db.flush.return_value = None
        tenant_db.commit.return_value = None
        tenant_db.refresh.return_value = None

        enriched = service.enrich_draft(tenant_db, 21, actor_user_id=8, prefer_ai=False)

        self.assertEqual(enriched.sku, "KIT-20")
        self.assertEqual(enriched.name, "Kit Solar Premium")
        self.assertEqual(enriched.brand, "Solarpro")
        self.assertEqual(enriched.category_label, "Solar")
        self.assertEqual(enriched.unit_label, "kit")
        self.assertEqual(enriched.reviewed_by_user_id, 8)
        self.assertIn("[products-enrichment:heuristic]", enriched.extraction_notes or "")
        added_labels = [
            getattr(call.args[0], "label", None)
            for call in tenant_db.add.call_args_list
            if getattr(call.args[0], "label", None)
        ]
        self.assertIn("Potencia", added_labels)


class ProductCatalogDuplicateResolutionTestCase(unittest.TestCase):
    def test_resolve_duplicate_updates_existing_product_and_links_draft(self) -> None:
        from app.apps.tenant_modules.crm.models import CRMProductCharacteristic  # noqa: E402
        from app.apps.tenant_modules.crm.services.product_ingestion_service import (  # noqa: E402
            CRMProductIngestionService,
        )

        service = CRMProductIngestionService()
        draft = CRMProductIngestionDraft(
            id=30,
            source_kind="url_reference",
            source_label="Proveedor Solar",
            source_url="https://proveedor.local/panel-200",
            external_reference="PANEL-200X",
            capture_status="draft",
            sku="PNL-200",
            name="Panel Solar 200W",
            brand="Sun Corp",
            category_label="Solar",
            product_type="product",
            unit_label="unidad",
            unit_price=219990,
            currency_code="CLP",
            description="Panel solar 200W 24V 12A",
            source_excerpt=None,
            extraction_notes=None,
            review_notes=None,
            created_by_user_id=1,
            reviewed_by_user_id=None,
            published_product_id=None,
            published_at=None,
            discarded_at=None,
        )
        product = CRMProduct(
            id=7,
            sku="PNL-200",
            name="Panel Solar 200W Legacy",
            product_type="product",
            unit_label="unidad",
            unit_price=150000,
            description="Producto anterior",
            is_active=True,
            sort_order=100,
        )
        draft_characteristic = CRMProductIngestionCharacteristic(
            id=1,
            draft_id=30,
            label="Potencia",
            value="200 W",
            sort_order=10,
        )

        tenant_db = Mock()

        def get_side_effect(model, item_id):
            if model is CRMProductIngestionDraft and item_id == 30:
                return draft
            if model is CRMProduct and item_id == 7:
                return product
            return None

        tenant_db.get.side_effect = get_side_effect
        tenant_db.add.return_value = None
        tenant_db.flush.return_value = None
        tenant_db.commit.return_value = None
        tenant_db.refresh.return_value = None

        draft_characteristics_filter = Mock()
        draft_characteristics_filter.order_by.return_value.all.return_value = [draft_characteristic]
        product_characteristics_filter = Mock()
        product_characteristics_filter.order_by.return_value.all.return_value = []
        product_characteristics_filter.delete.return_value = None

        def query_side_effect(model):
            query = Mock()
            query.all.return_value = []
            if model is CRMProductIngestionCharacteristic:
                query.filter.return_value = draft_characteristics_filter
                return query
            if model is CRMProductCharacteristic:
                query.filter.return_value = product_characteristics_filter
                return query
            if model is CRMProduct:
                return query
            return query

        tenant_db.query.side_effect = query_side_effect

        resolved_draft, resolved_product = service.resolve_duplicate_to_existing_product(
            tenant_db,
            30,
            target_product_id=7,
            resolution_mode="update_existing",
            actor_user_id=9,
            review_notes="merge desde ingesta",
        )

        self.assertEqual(resolved_product.name, "Panel Solar 200W")
        self.assertEqual(resolved_product.unit_price, 219990)
        self.assertEqual(resolved_draft.capture_status, "approved")
        self.assertEqual(resolved_draft.published_product_id, 7)
        self.assertEqual(resolved_draft.reviewed_by_user_id, 9)


if __name__ == "__main__":
    unittest.main()
