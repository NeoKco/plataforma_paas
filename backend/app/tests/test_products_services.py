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
    ProductCatalogIngestionDraftCreateRequest,
    ProductCatalogIngestionExtractUrlRequest,
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
from app.apps.tenant_modules.products.services.ingestion_extraction_service import (  # noqa: E402
    ProductCatalogIngestionExtractionService,
)
from app.apps.tenant_modules.products.services.generic_ai_extraction_service import (  # noqa: E402
    ProductCatalogGenericAiExtractionService,
)
from app.apps.tenant_modules.products.services.ingestion_run_service import (  # noqa: E402
    ProductCatalogIngestionRunService,
)
from app.apps.tenant_modules.products.services.ingestion_service import (  # noqa: E402
    ProductCatalogIngestionService,
)
from app.apps.tenant_modules.products.services.connector_scheduler_service import (  # noqa: E402
    ProductConnectorSchedulerService,
)
from app.apps.tenant_modules.products.services.connector_validation_service import (  # noqa: E402
    ProductConnectorValidationService,
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
                provider_key="mercadolibre",
                provider_profile="mercadolibre_v1",
                auth_mode="none",
                auth_reference=None,
                request_timeout_seconds=20,
                retry_limit=2,
                retry_backoff_seconds=3,
                sync_mode="connector_sync",
                fetch_strategy="html_ai",
                run_ai_enrichment=True,
                schedule_enabled=True,
                schedule_scope="due_sources",
                schedule_frequency="daily",
                schedule_batch_limit=30,
                config_notes="catálogo principal",
            ),
        )

        self.assertEqual(created.name, "Proveedor Solar")
        self.assertEqual(created.connector_kind, "vendor_site")
        self.assertEqual(created.provider_key, "mercadolibre")
        self.assertEqual(created.provider_profile, "mercadolibre_v1")
        self.assertEqual(created.request_timeout_seconds, 20)
        self.assertEqual(created.retry_limit, 2)
        self.assertTrue(created.schedule_enabled)
        self.assertEqual(created.schedule_frequency, "daily")
        self.assertEqual(created.schedule_batch_limit, 30)
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

    def test_connector_sync_uses_provider_specific_extraction(self) -> None:
        service = ProductConnectorSyncService()
        connector = ProductConnector(
            id=4,
            name="ML Demo",
            connector_kind="vendor_site",
            provider_key="mercadolibre",
            fetch_strategy="html_ai",
            default_currency_code="CLP",
        )
        service._generic_ai_extraction_service.extract_from_url = Mock(
            return_value={
                "name": "Producto ML",
                "unit_price": 9990,
                "currency_code": "CLP",
                "used_ai_enrichment": True,
            }
        )
        service._extraction_service.extract_from_url = Mock(
            return_value={"sku": "MLC-123", "brand": "Marca ML"},
        )

        payload = service.extract_capture_payload(
            connector=connector,
            url="https://articulo.mercadolibre.cl/demo",
            source_label="Mercado Libre",
        )

        service._generic_ai_extraction_service.extract_from_url.assert_called_once()
        service._extraction_service.extract_from_url.assert_called_once_with(
            "https://articulo.mercadolibre.cl/demo",
            provider_key="mercadolibre",
            timeout_seconds=25,
        )
        self.assertEqual(payload["source_kind"], "marketplace_product")
        self.assertEqual(payload["source_label"], "Mercado Libre")
        self.assertEqual(payload["sku"], "MLC-123")

    def test_connector_validation_uses_base_url_preview(self) -> None:
        tenant_db = Mock()
        connector = ProductConnector(
            id=12,
            name="Mercado Libre CL",
            base_url="https://articulo.mercadolibre.cl/MLC-123",
            provider_key="mercadolibre",
            provider_profile="mercadolibre_v1",
            is_active=True,
        )
        service = ProductConnectorValidationService()
        service._connector_service.get_connector = Mock(return_value=connector)
        service._connector_service.touch_connector_validation = Mock()
        service._connector_sync_service.extract_capture_payload = Mock(
            return_value={
                "source_kind": "marketplace_product",
                "source_label": "Mercado Libre CL",
                "name": "Inversor Solar",
                "sku": "MLC-123",
                "brand": "Demo",
                "category_label": "Energía",
                "product_type": "product",
                "unit_price": 129990,
                "currency_code": "CLP",
                "characteristics": [{"label": "Potencia", "value": "5kW"}],
                "extraction_notes": "Extracción automática dedicada para Mercado Libre",
            }
        )

        result = service.validate_connector(tenant_db, connector.id)

        self.assertEqual(result["status"], "validated")
        self.assertEqual(result["preview"]["sku"], "MLC-123")
        service._connector_sync_service.extract_capture_payload.assert_called_once()
        tenant_db.commit.assert_called_once()

    def test_provider_specific_sodimac_payload_returns_reference_and_brand(self) -> None:
        service = ProductCatalogIngestionExtractionService()
        script = Mock()
        script.string = '{"productId":"SOD-7788","sellerName":"Sodimac","deliveryType":"despacho_programado"}'
        script.get_text.return_value = script.string
        soup = Mock()
        soup.find_all.side_effect = lambda name, *args, **kwargs: [script] if name == "script" else []
        soup.select_one.return_value = None
        service._extract_category = Mock(return_value="Herramientas")
        service._extract_table_value_by_label = Mock(side_effect=["Bosch", "GSB 13 RE"])

        payload = service._extract_sodimac_payload(
            soup,
            source_url="https://www.sodimac.cl/sodimac-cl/product/7788/demo",
        )

        self.assertEqual(payload["external_reference"], "SOD-7788")
        self.assertEqual(payload["brand"], "Bosch")
        self.assertEqual(payload["category_label"], "Herramientas")
        self.assertEqual(payload["extraction_notes"], "Extracción automática dedicada para Sodimac")
        self.assertTrue(any(item["label"] == "Marca" for item in payload["characteristics"]))

    def test_provider_specific_easy_payload_returns_reference_and_brand(self) -> None:
        service = ProductCatalogIngestionExtractionService()
        script = Mock()
        script.string = '{"productReference":"EASY-900"}'
        script.get_text.return_value = script.string
        sku_candidate = Mock()
        sku_candidate.get.return_value = None
        sku_candidate.get_text.return_value = "EASY-900"
        soup = Mock()
        soup.find_all.side_effect = lambda name, *args, **kwargs: [script] if name == "script" else []
        soup.select_one.side_effect = [sku_candidate]
        service._extract_category = Mock(return_value="Servicios")
        service._extract_table_value_by_label = Mock(side_effect=["Easy Home", None, "Servicio"])

        payload = service._extract_easy_payload(
            soup,
            source_url="https://www.easy.cl/producto/demo",
        )

        self.assertEqual(payload["external_reference"], "EASY-900")
        self.assertEqual(payload["brand"], "Easy Home")
        self.assertEqual(payload["category_label"], "Servicios")
        self.assertEqual(payload["extraction_notes"], "Extracción automática dedicada para Easy")

    def test_extract_characteristics_ignores_empty_list_item_text(self) -> None:
        service = ProductCatalogIngestionExtractionService()
        empty_item = Mock()
        empty_item.get_text.return_value = None
        valid_item = Mock()
        valid_item.get_text.return_value = "Marca: Ferrelectrica"
        soup = Mock()

        def find_all_side_effect(name, *args, **kwargs):
            if name == "table":
                return []
            if name == "dl":
                return []
            if name == "li":
                return [empty_item, valid_item]
            return []

        soup.find_all.side_effect = find_all_side_effect

        characteristics = service._extract_characteristics(soup)

        self.assertEqual(
            characteristics,
            [{"label": "Marca", "value": "Ferrelectrica", "sort_order": 10}],
        )

    def test_ingestion_service_accepts_payload_without_connector_id(self) -> None:
        tenant_db = Mock()
        created = SimpleNamespace(connector_id=None)
        payload = ProductCatalogIngestionDraftCreateRequest(
            source_kind="url_reference",
            source_url="https://proveedor.local/demo",
            name="Demo",
        )
        service = ProductCatalogIngestionService()
        service._connector_service.get_connector = Mock()

        with patch(
            "app.apps.tenant_modules.products.services.ingestion_service.CRMProductIngestionService.create_draft",
            return_value=created,
        ) as super_create:
            result = service.create_draft(tenant_db, payload, actor_user_id=5)

        self.assertIs(result, created)
        super_create.assert_called_once()
        service._connector_service.get_connector.assert_not_called()

    def test_generic_ai_extraction_maps_llm_response(self) -> None:
        service = ProductCatalogGenericAiExtractionService()
        service._ensure_ai_configured = Mock()
        service._preprocess_url = Mock(
            return_value=(
                "Cordón Multipolar RV-K 3x4mm",
                "2850",
                [("Marca", "Marca Cable"), ("Sección", "4 mm")],
            )
        )
        service._analyze_prompt = Mock(
            return_value='[{"clave":"Marca","valor":"Marca Cable","unidad":""},{"clave":"Sección","valor":"4","unidad":"mm"},{"clave":"Descripción","valor":"Cable RV-K para instalaciones interiores y exteriores.","unidad":""}]'
        )
        payload = service.extract_from_url(
            "https://proveedor.local/demo",
            timeout_seconds=300,
        )

        self.assertTrue(payload["used_ai_enrichment"])
        self.assertEqual(payload["extraction_strategy"], "ai_full_generic")
        self.assertEqual(payload["name"], "Cordón Multipolar RV-K 3x4mm")
        self.assertEqual(payload["unit_price"], 2850.0)
        self.assertTrue(any(item["label"] == "Sección" and item["value"] == "4 mm" for item in payload["characteristics"]))
        self.assertIn("Extracción IA genérica", payload["extraction_notes"])

    def test_extract_url_to_draft_uses_generic_ai_pipeline(self) -> None:
        tenant_db = Mock()
        draft = SimpleNamespace(connector_id=None)
        service = ProductCatalogIngestionRunService()
        service._connector_service.get_connector = Mock(return_value=None)
        service._generic_ai_extraction_service.extract_from_url = Mock(
            return_value={
                "name": "Cordón Multipolar RV-K 3x4mm",
                "product_type": "product",
                "unit_price": 1234,
                "currency_code": "CLP",
                "characteristics": [{"label": "Voltaje", "value": "0.6/1kV", "sort_order": 10}],
                "description": "Descripción enriquecida por IA",
                "source_excerpt": "Resumen IA",
                "extraction_notes": "Extracción IA genérica desde URL",
                "used_ai_enrichment": True,
            }
        )
        service._extraction_service.extract_from_url = Mock(
            return_value={
                "sku": "MULTI-RVK3X4MTS",
                "brand": "Marca Cable",
                "category_label": "Conductores",
            }
        )
        service._enrichment_service.enrich_capture_payload = Mock(
            return_value={
                "name": "Cordón Multipolar RV-K 3x4mm",
                "product_type": "product",
                "unit_price": 1234,
                "currency_code": "CLP",
                "description": "Descripción enriquecida por IA",
                "source_excerpt": "Resumen IA",
                "characteristics": [{"label": "Voltaje", "value": "0.6/1kV", "sort_order": 10}],
                "sku": "MULTI-RVK3X4MTS",
                "extraction_notes": "Extracción automática desde URL (generic)",
            }
        )
        service._ingestion_service.create_draft = Mock(return_value=draft)

        result = service.extract_url_to_draft(
            tenant_db,
            ProductCatalogIngestionExtractUrlRequest(
                source_url="https://proveedor.local/demo",
                source_label="Ferrelectrica",
            ),
            actor_user_id=9,
        )

        self.assertIs(result, draft)
        service._generic_ai_extraction_service.extract_from_url.assert_called_once()
        service._enrichment_service.enrich_capture_payload.assert_called_once()
        _, kwargs = service._enrichment_service.enrich_capture_payload.call_args
        self.assertFalse(kwargs["prefer_ai"])
        created_payload = service._ingestion_service.create_draft.call_args.args[1]
        self.assertIsInstance(created_payload, ProductCatalogIngestionDraftCreateRequest)
        self.assertEqual(created_payload.name, "Cordón Multipolar RV-K 3x4mm")
        self.assertEqual(created_payload.source_label, "Ferrelectrica")
        self.assertEqual(created_payload.sku, "MULTI-RVK3X4MTS")
        self.assertEqual(len(created_payload.characteristics), 1)
        self.assertEqual(created_payload.characteristics[0].label, "Voltaje")
        self.assertEqual(created_payload.characteristics[0].value, "0.6/1kV")
        self.assertEqual(created_payload.characteristics[0].sort_order, 10)

    def test_connector_sync_does_not_reinvoke_ai_after_full_ai_extraction(self) -> None:
        tenant_db = Mock()
        connector = ProductConnector(
            id=9,
            name="Proveedor IA",
            connector_kind="vendor_site",
            provider_key="generic",
            fetch_strategy="html_ai",
            default_currency_code="CLP",
            is_active=True,
            run_ai_enrichment=True,
        )
        source = ProductSource(
            id=31,
            product_id=14,
            connector_id=9,
            source_kind="vendor_site",
            source_label="Proveedor IA",
            source_url="https://vendor.local/producto",
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
        service.extract_capture_payload = Mock(
            return_value={
                "name": "Producto IA",
                "unit_price": 1250,
                "currency_code": "CLP",
                "source_excerpt": "actualizado",
                "source_kind": "vendor_site",
                "used_ai_enrichment": True,
            }
        )
        service._enrichment_service.enrich_capture_payload = Mock(
            return_value={
                "name": "Producto IA",
                "unit_price": 1250,
                "currency_code": "CLP",
                "source_excerpt": "actualizado",
                "source_kind": "vendor_site",
            }
        )

        with patch.object(service, "_list_sync_sources", return_value=[source]):
            result = service.sync_connector(tenant_db, connector_id=9, limit=10)

        self.assertEqual(result["processed"], 1)
        _, kwargs = service._enrichment_service.enrich_capture_payload.call_args
        self.assertFalse(kwargs["prefer_ai"])

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
        service._generic_ai_extraction_service.extract_from_url = Mock(
            return_value={
                "name": "Panel 550W",
                "product_type": "product",
                "unit_label": "unidad",
                "unit_price": 1250,
                "description": "Panel fotovoltaico",
                "characteristics": [{"label": "Potencia", "value": "550W", "sort_order": 10}],
                "used_ai_enrichment": True,
            }
        )
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
        _, kwargs = service._connector_sync_service._enrichment_service.enrich_capture_payload.call_args
        self.assertFalse(kwargs["prefer_ai"])
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

    def test_connector_scheduler_runs_due_connector_now(self) -> None:
        tenant_db = Mock()
        connector = ProductConnector(
            id=7,
            name="Proveedor Programado",
            is_active=True,
            schedule_scope="due_sources",
            schedule_batch_limit=15,
            run_ai_enrichment=True,
        )
        run = SimpleNamespace(
            id=22,
            processed_count=15,
            completed_count=13,
            error_count=0,
            cancelled_count=0,
        )

        service = ProductConnectorSchedulerService()
        service._connector_service.get_connector = Mock(return_value=connector)
        service._connector_service.touch_connector_schedule = Mock()
        service._refresh_run_service.create_run = Mock(return_value=run)
        service._refresh_run_service._process_run = Mock(return_value=None)  # noqa: SLF001
        tenant_db.refresh.side_effect = lambda item: None

        result = service.run_connector_schedule_now(tenant_db, connector.id, actor_user_id=12)

        self.assertEqual(result.id, 22)
        service._refresh_run_service.create_run.assert_called_once()
        self.assertEqual(service._connector_service.touch_connector_schedule.call_count, 2)
        tenant_db.commit.assert_called()

    def test_connector_scheduler_forwards_actor_user_id_in_batch_runs(self) -> None:
        tenant_db = Mock()
        connector = ProductConnector(id=41, name="Mercado Libre Scheduler", is_active=True)
        run = SimpleNamespace(id=501, processed_count=3, completed_count=3, error_count=0)

        service = ProductConnectorSchedulerService()
        service.list_due_connectors = Mock(return_value=[connector])
        service.run_connector_schedule_now = Mock(return_value=run)

        summary = service.run_due_connector_schedules_for_tenant(
            tenant_db,
            limit=10,
            actor_user_id=77,
        )

        service.run_connector_schedule_now.assert_called_once_with(
            tenant_db,
            41,
            actor_user_id=77,
        )
        self.assertEqual(summary["processed"], 1)
        self.assertEqual(summary["launched"], 1)
        self.assertEqual(summary["items"][0]["run_id"], 501)
