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
    CRMQuote,
    CRMQuoteLine,
)
from app.apps.tenant_modules.crm.schemas import (  # noqa: E402
    CRMOpportunityCreateRequest,
    CRMProductCreateRequest,
    CRMQuoteCreateRequest,
    CRMQuoteLineWriteRequest,
)
from app.apps.tenant_modules.crm.services.opportunity_service import (  # noqa: E402
    CRMOpportunityService,
)
from app.apps.tenant_modules.crm.services.product_service import CRMProductService  # noqa: E402
from app.apps.tenant_modules.crm.services.quote_service import CRMQuoteService  # noqa: E402


class CRMServicesTestCase(unittest.TestCase):
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

        tenant_db = Mock()
        tenant_db.query.side_effect = lambda model: (
            quote_query
            if model is CRMQuote
            else quote_line_query
            if model is CRMQuoteLine
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


if __name__ == "__main__":
    unittest.main()
