import os
import unittest
from types import SimpleNamespace
from unittest.mock import Mock

os.environ["DEBUG"] = "true"
os.environ["APP_ENV"] = "test"

from app.apps.tenant_modules.business_core.models import BusinessClient  # noqa: E402
from app.apps.tenant_modules.crm.models import (  # noqa: E402
    CRMOpportunity,
    CRMProduct,
    CRMProductIngestionCharacteristic,
    CRMProductIngestionDraft,
    CRMProductCharacteristic,
    CRMQuote,
    CRMQuoteLine,
    CRMQuoteSection,
    CRMQuoteTemplate,
)
from app.apps.tenant_modules.crm.schemas import (  # noqa: E402
    CRMOpportunityCloseRequest,
    CRMOpportunityCreateRequest,
    CRMProductCreateRequest,
    CRMProductIngestionDraftCreateRequest,
    CRMProductIngestionCharacteristicWriteRequest,
    CRMProductCharacteristicWriteRequest,
    CRMQuoteCreateRequest,
    CRMQuoteLineWriteRequest,
    CRMQuoteSectionWriteRequest,
    CRMQuoteTemplateCreateRequest,
    CRMQuoteTemplateItemWriteRequest,
    CRMQuoteTemplateSectionWriteRequest,
)
from app.apps.tenant_modules.crm.services.opportunity_service import (  # noqa: E402
    CRMOpportunityService,
)
from app.apps.tenant_modules.crm.services.product_ingestion_service import (  # noqa: E402
    CRMProductIngestionService,
)
from app.apps.tenant_modules.crm.services.product_service import CRMProductService  # noqa: E402
from app.apps.tenant_modules.crm.services.quote_service import CRMQuoteService  # noqa: E402
from app.apps.tenant_modules.crm.services.template_service import (  # noqa: E402
    CRMQuoteTemplateService,
)


class CRMServicesTestCase(unittest.TestCase):
    def test_product_ingestion_create_persists_draft_and_characteristics(self) -> None:
        characteristic_query = Mock()
        characteristic_query.filter.return_value.delete.return_value = None

        tenant_db = Mock()
        tenant_db.query.side_effect = lambda model: (
            characteristic_query if model is CRMProductIngestionCharacteristic else Mock()
        )

        added_items: list[object] = []

        def add_side_effect(item) -> None:
            added_items.append(item)

        def flush_side_effect() -> None:
            for item in added_items:
                if isinstance(item, CRMProductIngestionDraft) and getattr(item, "id", None) is None:
                    item.id = 41

        tenant_db.add.side_effect = add_side_effect
        tenant_db.flush.side_effect = flush_side_effect

        service = CRMProductIngestionService()
        created = service.create_draft(
            tenant_db,
            CRMProductIngestionDraftCreateRequest(
                source_kind="url_reference",
                source_label="Proveedor A",
                source_url="https://proveedor-a.local/producto",
                external_reference="ref-100",
                sku="SKU-100",
                name="Panel térmico",
                brand="Marca Uno",
                category_label="Solar",
                product_type="product",
                unit_label="unidad",
                unit_price=450000,
                currency_code="CLP",
                description="Panel base",
                source_excerpt="Panel 150L",
                extraction_notes="captura manual",
                characteristics=[
                    CRMProductIngestionCharacteristicWriteRequest(
                        label="Capacidad",
                        value="150L",
                        sort_order=10,
                    )
                ],
            ),
            actor_user_id=7,
        )

        characteristic_rows = [item for item in added_items if isinstance(item, CRMProductIngestionCharacteristic)]
        self.assertEqual(created.id, 41)
        self.assertEqual(created.capture_status, "draft")
        self.assertEqual(created.created_by_user_id, 7)
        self.assertEqual(len(characteristic_rows), 1)
        self.assertEqual(characteristic_rows[0].draft_id, 41)
        self.assertEqual(characteristic_rows[0].label, "Capacidad")

    def test_product_ingestion_approve_creates_catalog_product(self) -> None:
        draft = CRMProductIngestionDraft(
            id=31,
            source_kind="url_reference",
            source_label="Proveedor B",
            source_url="https://proveedor-b.local/p-1",
            external_reference=None,
            capture_status="draft",
            sku="KIT-31",
            name="Kit solar premium",
            brand="SolarPro",
            category_label="Solar",
            product_type="product",
            unit_label="kit",
            unit_price=990000,
            currency_code="CLP",
            description="Kit comercial",
            source_excerpt=None,
            extraction_notes=None,
            review_notes=None,
            created_by_user_id=5,
            reviewed_by_user_id=None,
            published_product_id=None,
            published_at=None,
            discarded_at=None,
        )
        draft_query = Mock()
        draft_query.filter.return_value.delete.return_value = None
        product_query = Mock()
        product_query.all.return_value = []
        characteristic_query = Mock()
        characteristic_query.filter.return_value.delete.return_value = None
        characteristic_query.filter.return_value.order_by.return_value.all.return_value = [
            SimpleNamespace(
                id=1,
                draft_id=31,
                label="Potencia",
                value="150L",
                sort_order=10,
                created_at=None,
            )
        ]
        tenant_db = Mock()
        tenant_db.get.side_effect = lambda model, item_id: (
            draft
            if model is CRMProductIngestionDraft and item_id == 31
            else None
        )
        tenant_db.query.side_effect = lambda model: (
            product_query
            if model is CRMProduct
            else characteristic_query
            if model is CRMProductIngestionCharacteristic
            else draft_query
            if model is CRMProductCharacteristic
            else Mock()
        )

        added_items: list[object] = []

        def add_side_effect(item) -> None:
            added_items.append(item)

        def flush_side_effect() -> None:
            for item in added_items:
                if isinstance(item, CRMProduct) and getattr(item, "id", None) is None:
                    item.id = 88

        tenant_db.add.side_effect = add_side_effect
        tenant_db.flush.side_effect = flush_side_effect

        service = CRMProductIngestionService()
        updated_draft, product = service.approve_draft(
            tenant_db,
            31,
            actor_user_id=9,
            review_notes="Listo para catálogo",
        )

        self.assertEqual(product.id, 88)
        self.assertEqual(product.name, "Kit solar premium")
        self.assertEqual(updated_draft.capture_status, "approved")
        self.assertEqual(updated_draft.published_product_id, 88)
        self.assertEqual(updated_draft.reviewed_by_user_id, 9)
        product_characteristics = [
            item for item in added_items if isinstance(item, CRMProductCharacteristic)
        ]
        self.assertGreaterEqual(len(product_characteristics), 3)
        self.assertIn("Marca", {item.label for item in product_characteristics})
        self.assertIn("Categoría", {item.label for item in product_characteristics})

    def test_product_rejects_duplicate_sku_case_insensitive(self) -> None:
        tenant_db = Mock()
        tenant_db.query.return_value.all.return_value = [
            SimpleNamespace(id=1, name="Kit bomba", sku="SKU-001"),
        ]
        service = CRMProductService()

        with self.assertRaises(ValueError) as exc:
            service.create_product(
                tenant_db,
                CRMProductCreateRequest(
                    sku=" sku-001 ",
                    name="Kit bomba nuevo",
                    product_type="product",
                    unit_label="unidad",
                    unit_price=10000,
                    description=None,
                    is_active=True,
                    sort_order=100,
                ),
            )

        self.assertIn("SKU", str(exc.exception))

    def test_opportunity_rejects_invalid_stage(self) -> None:
        service = CRMOpportunityService()

        with self.assertRaises(ValueError) as exc:
            service.create_opportunity(
                Mock(),
                CRMOpportunityCreateRequest(
                    client_id=None,
                    title="Nuevo convenio",
                    stage="closing-soon",
                    owner_user_id=None,
                    expected_value=250000,
                    probability_percent=30,
                    expected_close_at=None,
                    source_channel=None,
                    summary=None,
                    next_step=None,
                    is_active=True,
                    sort_order=100,
                ),
            )

        self.assertIn("Etapa de oportunidad invalida", str(exc.exception))

    def test_quote_create_recalculates_totals_from_lines(self) -> None:
        quote_query = Mock()
        quote_query.all.return_value = []

        quote_line_query = Mock()
        quote_line_query.filter.return_value.delete.return_value = None
        quote_section_query = Mock()
        quote_section_query.filter.return_value.delete.return_value = None
        quote_section_query.filter.return_value.all.return_value = []

        tenant_db = Mock()
        tenant_db.query.side_effect = lambda model: (
            quote_query
            if model is CRMQuote
            else quote_line_query
            if model is CRMQuoteLine
            else quote_section_query
            if model is CRMQuoteSection
            else Mock()
        )
        tenant_db.get.side_effect = lambda model, item_id: (
            SimpleNamespace(id=item_id)
            if (
                (model is BusinessClient and item_id == 7)
                or (model is CRMOpportunity and item_id == 5)
                or (model is CRMProduct and item_id == 11)
            )
            else None
        )

        added_items: list[object] = []

        def add_side_effect(item) -> None:
            added_items.append(item)

        def flush_side_effect() -> None:
            for item in added_items:
                if isinstance(item, CRMQuote) and getattr(item, "id", None) is None:
                    item.id = 99

        tenant_db.add.side_effect = add_side_effect
        tenant_db.flush.side_effect = flush_side_effect
        tenant_db.commit.return_value = None
        tenant_db.refresh.return_value = None

        service = CRMQuoteService()
        created = service.create_quote(
            tenant_db,
            CRMQuoteCreateRequest(
                client_id=7,
                opportunity_id=5,
                quote_number="COT-001",
                title="Propuesta mantención central",
                quote_status="draft",
                valid_until=None,
                discount_amount=1000,
                tax_amount=2000,
                summary=None,
                notes=None,
                is_active=True,
                sort_order=100,
                lines=[
                    CRMQuoteLineWriteRequest(
                        product_id=11,
                        line_type="catalog_item",
                        name="Servicio principal",
                        description=None,
                        quantity=2,
                        unit_price=15000,
                        sort_order=10,
                    )
                ],
            ),
        )

        self.assertEqual(created.subtotal_amount, 30000)
        self.assertEqual(created.total_amount, 31000)
        self.assertEqual(created.client_id, 7)
        self.assertEqual(created.opportunity_id, 5)

    def test_product_create_persists_characteristics(self) -> None:
        product_query = Mock()
        product_query.all.return_value = []

        characteristic_query = Mock()
        characteristic_query.filter.return_value.delete.return_value = None

        tenant_db = Mock()
        tenant_db.query.side_effect = lambda model: (
            product_query if model is CRMProduct else characteristic_query if model is CRMProductCharacteristic else Mock()
        )

        added_items: list[object] = []

        def add_side_effect(item) -> None:
            added_items.append(item)

        def flush_side_effect() -> None:
            for item in added_items:
                if isinstance(item, CRMProduct) and getattr(item, "id", None) is None:
                    item.id = 88

        tenant_db.add.side_effect = add_side_effect
        tenant_db.flush.side_effect = flush_side_effect

        service = CRMProductService()
        created = service.create_product(
            tenant_db,
            CRMProductCreateRequest(
                sku="KIT-10",
                name="Kit calor",
                product_type="product",
                unit_label="unidad",
                unit_price=24990,
                description="Kit comercial",
                is_active=True,
                sort_order=100,
                characteristics=[
                    CRMProductCharacteristicWriteRequest(label="Potencia", value="150L", sort_order=10),
                    CRMProductCharacteristicWriteRequest(label="Garantia", value="12 meses", sort_order=20),
                ],
            ),
        )

        characteristic_rows = [item for item in added_items if isinstance(item, CRMProductCharacteristic)]
        self.assertEqual(created.id, 88)
        self.assertEqual(len(characteristic_rows), 2)
        self.assertEqual(characteristic_rows[0].product_id, 88)
        self.assertEqual(characteristic_rows[0].label, "Potencia")

    def test_opportunity_close_marks_item_as_historical(self) -> None:
        opportunity = CRMOpportunity(
            id=11,
            client_id=7,
            title="Renovacion anual",
            stage="proposal",
            owner_user_id=None,
            expected_value=500000,
            probability_percent=70,
            expected_close_at=None,
            source_channel=None,
            summary=None,
            next_step=None,
            closed_at=None,
            close_reason=None,
            close_notes=None,
            is_active=True,
            sort_order=100,
        )

        event_query = Mock()
        tenant_db = Mock()
        tenant_db.get.side_effect = lambda model, item_id: opportunity if model is CRMOpportunity and item_id == 11 else None
        tenant_db.query.return_value = event_query

        service = CRMOpportunityService()
        closed = service.close_opportunity(
            tenant_db,
            11,
            CRMOpportunityCloseRequest(
                final_stage="won",
                close_reason="Aceptada",
                close_notes="Cierre correcto",
            ),
            actor_user_id=3,
        )

        self.assertEqual(closed.stage, "won")
        self.assertFalse(closed.is_active)
        self.assertEqual(closed.close_reason, "Aceptada")
        self.assertIsNotNone(closed.closed_at)

    def test_quote_create_recalculates_totals_from_free_lines_and_sections(self) -> None:
        quote_query = Mock()
        quote_query.all.return_value = []
        line_query = Mock()
        line_query.filter.return_value.delete.return_value = None
        section_query = Mock()
        section_query.filter.return_value.delete.return_value = None
        section_query.filter.return_value.all.return_value = []
        section_id_query = Mock()
        section_id_query.filter.return_value.all.return_value = []

        tenant_db = Mock()

        def query_side_effect(model):
            if model is CRMQuote:
                return quote_query
            if model is CRMQuoteLine:
                return line_query
            if model is CRMQuoteSection:
                return section_query
            return section_id_query

        tenant_db.query.side_effect = query_side_effect
        tenant_db.get.side_effect = lambda model, item_id: (
            SimpleNamespace(id=item_id)
            if (
                (model is BusinessClient and item_id == 7)
                or (model is CRMOpportunity and item_id == 5)
                or (model is CRMProduct and item_id in {11, 12})
            )
            else None
        )

        added_items: list[object] = []

        def add_side_effect(item) -> None:
            added_items.append(item)

        def flush_side_effect() -> None:
            next_quote_id = 90
            next_section_id = 700
            for item in added_items:
                if isinstance(item, CRMQuote) and getattr(item, "id", None) is None:
                    item.id = next_quote_id
                    next_quote_id += 1
                if isinstance(item, CRMQuoteSection) and getattr(item, "id", None) is None:
                    item.id = next_section_id
                    next_section_id += 1

        tenant_db.add.side_effect = add_side_effect
        tenant_db.flush.side_effect = flush_side_effect

        service = CRMQuoteService()
        created = service.create_quote(
            tenant_db,
            CRMQuoteCreateRequest(
                client_id=7,
                opportunity_id=5,
                template_id=None,
                quote_number="COT-EXP-001",
                title="Propuesta expandida",
                quote_status="draft",
                valid_until=None,
                discount_amount=1000,
                tax_amount=2000,
                summary=None,
                notes=None,
                is_active=True,
                sort_order=100,
                lines=[
                    CRMQuoteLineWriteRequest(
                        product_id=11,
                        line_type="catalog_item",
                        name="Servicio principal",
                        description=None,
                        quantity=2,
                        unit_price=15000,
                        sort_order=10,
                    )
                ],
                sections=[
                    CRMQuoteSectionWriteRequest(
                        title="Opcionales",
                        description=None,
                        sort_order=10,
                        lines=[
                            CRMQuoteLineWriteRequest(
                                product_id=12,
                                line_type="catalog_item",
                                name="Panel extra",
                                description=None,
                                quantity=1,
                                unit_price=5000,
                                sort_order=10,
                            )
                        ],
                    )
                ],
            ),
        )

        self.assertEqual(created.subtotal_amount, 35000)
        self.assertEqual(created.total_amount, 36000)

    def test_template_create_persists_sections_and_items(self) -> None:
        template_query = Mock()
        template_query.all.return_value = []
        section_query = Mock()
        section_query.filter.return_value.delete.return_value = None
        section_query.filter.return_value.all.return_value = []
        item_query = Mock()
        item_query.filter.return_value.delete.return_value = None

        tenant_db = Mock()
        tenant_db.query.side_effect = lambda model: (
            template_query
            if model is CRMQuoteTemplate
            else section_query
            if model.__name__ == "CRMQuoteTemplateSection"
            else item_query
        )
        tenant_db.get.side_effect = lambda model, item_id: (
            SimpleNamespace(id=item_id) if model is CRMProduct and item_id == 12 else None
        )

        added_items: list[object] = []

        def add_side_effect(item) -> None:
            added_items.append(item)

        def flush_side_effect() -> None:
            template_id = 55
            section_id = 501
            for item in added_items:
                if isinstance(item, CRMQuoteTemplate) and getattr(item, "id", None) is None:
                    item.id = template_id
                if item.__class__.__name__ == "CRMQuoteTemplateSection" and getattr(item, "id", None) is None:
                    item.id = section_id
                    section_id += 1

        tenant_db.add.side_effect = add_side_effect
        tenant_db.flush.side_effect = flush_side_effect

        service = CRMQuoteTemplateService()
        created = service.create_template(
            tenant_db,
            CRMQuoteTemplateCreateRequest(
                name="Base comercial 150L",
                summary="Template base",
                notes=None,
                is_active=True,
                sort_order=100,
                sections=[
                    CRMQuoteTemplateSectionWriteRequest(
                        title="Equipo",
                        description=None,
                        sort_order=10,
                        items=[
                            CRMQuoteTemplateItemWriteRequest(
                                product_id=12,
                                line_type="catalog_item",
                                name="Heat pipe 150L",
                                description=None,
                                quantity=1,
                                unit_price=199990,
                                sort_order=10,
                            )
                        ],
                    )
                ],
            ),
        )

        self.assertEqual(created.id, 55)
        self.assertTrue(any(item.__class__.__name__ == "CRMQuoteTemplateSection" for item in added_items))
        self.assertTrue(any(item.__class__.__name__ == "CRMQuoteTemplateItem" for item in added_items))


if __name__ == "__main__":
    unittest.main()
