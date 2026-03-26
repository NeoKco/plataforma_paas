import os
import unittest
from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import patch

os.environ["DEBUG"] = "true"
os.environ["APP_ENV"] = "test"

from fastapi import HTTPException

from app.tests.fixtures import build_tenant_context
from app.apps.tenant_modules.finance.api.accounts import (
    create_finance_account,
    update_finance_account_status,
)
from app.apps.tenant_modules.finance.api.categories import list_finance_categories
from app.apps.tenant_modules.finance.api.currencies import (
    create_finance_currency,
    list_finance_exchange_rates,
)
from app.apps.tenant_modules.finance.schemas import (
    FinanceAccountCreateRequest,
    FinanceCategoryItemResponse,
    FinanceCurrencyCreateRequest,
    FinanceStatusUpdateRequest,
)


class FinanceCatalogRoutesTestCase(unittest.TestCase):
    def _current_user(self) -> dict:
        return build_tenant_context(role="manager", email="manager@empresa-bootstrap.local")

    def test_list_finance_categories_returns_filtered_data(self) -> None:
        category = SimpleNamespace(
            id=7,
            name="Ventas",
            category_type="income",
            parent_category_id=None,
            icon=None,
            color=None,
            note=None,
            is_active=True,
            sort_order=100,
            created_at=datetime(2026, 3, 26, 12, 0, tzinfo=timezone.utc),
            updated_at=datetime(2026, 3, 26, 12, 0, tzinfo=timezone.utc),
        )

        with patch(
            "app.apps.tenant_modules.finance.api.categories.category_service.list_categories",
            return_value=[category],
        ) as list_mock:
            response = list_finance_categories(
                category_type="income",
                include_inactive=False,
                current_user=self._current_user(),
                tenant_db=object(),
            )

        self.assertEqual(response.total, 1)
        self.assertEqual(response.data[0].name, "Ventas")
        self.assertEqual(
            list_mock.call_args.kwargs,
            {"category_type": "income", "include_inactive": False},
        )

    def test_create_finance_account_translates_validation_error_to_400(self) -> None:
        with patch(
            "app.apps.tenant_modules.finance.api.accounts.account_service.create_account",
            side_effect=ValueError("La moneda seleccionada no existe"),
        ):
            with self.assertRaises(HTTPException) as exc:
                create_finance_account(
                    payload=FinanceAccountCreateRequest(
                        name="Caja",
                        code="cash",
                        account_type="cash",
                        currency_id=99,
                        parent_account_id=None,
                        opening_balance=0,
                        opening_balance_at=None,
                        icon=None,
                        is_favorite=False,
                        is_balance_hidden=False,
                        is_active=True,
                        sort_order=100,
                    ),
                    current_user=self._current_user(),
                    tenant_db=object(),
                )

        self.assertEqual(exc.exception.status_code, 400)

    def test_update_finance_account_status_returns_mutated_account(self) -> None:
        account = SimpleNamespace(
            id=3,
            name="Caja",
            code="CASH",
            account_type="cash",
            currency_id=1,
            parent_account_id=None,
            opening_balance=0.0,
            opening_balance_at=None,
            icon=None,
            is_favorite=False,
            is_balance_hidden=False,
            is_active=False,
            sort_order=100,
            created_at=datetime(2026, 3, 26, 12, 0, tzinfo=timezone.utc),
            updated_at=datetime(2026, 3, 26, 12, 0, tzinfo=timezone.utc),
        )

        with patch(
            "app.apps.tenant_modules.finance.api.accounts.account_service.set_account_active",
            return_value=account,
        ):
            response = update_finance_account_status(
                account_id=3,
                payload=FinanceStatusUpdateRequest(is_active=False),
                current_user=self._current_user(),
                tenant_db=object(),
            )

        self.assertTrue(response.success)
        self.assertFalse(response.data.is_active)

    def test_create_finance_currency_returns_created_item(self) -> None:
        currency = SimpleNamespace(
            id=2,
            code="CLP",
            name="Peso Chileno",
            symbol="$",
            decimal_places=0,
            is_base=False,
            is_active=True,
            sort_order=100,
            created_at=datetime(2026, 3, 26, 12, 0, tzinfo=timezone.utc),
            updated_at=datetime(2026, 3, 26, 12, 0, tzinfo=timezone.utc),
        )

        with patch(
            "app.apps.tenant_modules.finance.api.currencies.currency_service.create_currency",
            return_value=currency,
        ):
            response = create_finance_currency(
                payload=FinanceCurrencyCreateRequest(
                    code="CLP",
                    name="Peso Chileno",
                    symbol="$",
                    decimal_places=0,
                    is_base=False,
                    is_active=True,
                    sort_order=100,
                ),
                current_user=self._current_user(),
                tenant_db=object(),
            )

        self.assertEqual(response.data.code, "CLP")

    def test_list_finance_exchange_rates_returns_entries(self) -> None:
        exchange_rate = SimpleNamespace(
            id=4,
            source_currency_id=2,
            target_currency_id=1,
            rate=0.0011,
            effective_at=datetime(2026, 3, 26, 12, 0, tzinfo=timezone.utc),
            source="manual",
            note=None,
            created_at=datetime(2026, 3, 26, 12, 0, tzinfo=timezone.utc),
        )

        with patch(
            "app.apps.tenant_modules.finance.api.currencies.currency_service.list_exchange_rates",
            return_value=[exchange_rate],
        ):
            response = list_finance_exchange_rates(
                current_user=self._current_user(),
                tenant_db=object(),
            )

        self.assertEqual(response.total, 1)
        self.assertEqual(response.data[0].rate, 0.0011)


if __name__ == "__main__":
    unittest.main()
