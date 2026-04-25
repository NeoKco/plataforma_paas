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


if __name__ == "__main__":
    unittest.main()
