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
    delete_finance_account,
    get_finance_account,
    reorder_finance_accounts,
    update_finance_account_status,
)
from app.apps.tenant_modules.finance.api.categories import (
    delete_finance_category,
    get_finance_category,
    list_finance_categories,
    reorder_finance_categories,
)
from app.apps.tenant_modules.finance.api.beneficiaries import delete_finance_beneficiary
from app.apps.tenant_modules.finance.api.currencies import (
    create_finance_currency,
    delete_finance_currency,
    delete_finance_exchange_rate,
    get_finance_exchange_rate,
    list_finance_exchange_rates,
)
from app.apps.tenant_modules.finance.api.people import delete_finance_person
from app.apps.tenant_modules.finance.api.projects import delete_finance_project
from app.apps.tenant_modules.finance.api.tags import delete_finance_tag
from app.apps.tenant_modules.finance.schemas import (
    FinanceAccountCreateRequest,
    FinanceCurrencyCreateRequest,
    FinanceReorderRequest,
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

    def test_delete_finance_account_returns_deleted_account(self) -> None:
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
            "app.apps.tenant_modules.finance.api.accounts.account_service.delete_account",
            return_value=account,
        ):
            response = delete_finance_account(
                account_id=3,
                current_user=self._current_user(),
                tenant_db=object(),
            )

        self.assertEqual(response.data.code, "CASH")

    def test_get_finance_account_returns_account_detail(self) -> None:
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
            is_active=True,
            sort_order=100,
            created_at=datetime(2026, 3, 26, 12, 0, tzinfo=timezone.utc),
            updated_at=datetime(2026, 3, 26, 12, 0, tzinfo=timezone.utc),
        )

        with patch(
            "app.apps.tenant_modules.finance.api.accounts.account_service.get_account",
            return_value=account,
        ):
            response = get_finance_account(
                account_id=3,
                current_user=self._current_user(),
                tenant_db=object(),
            )

        self.assertEqual(response.data.code, "CASH")

    def test_reorder_finance_accounts_returns_reordered_items(self) -> None:
        accounts = [
            SimpleNamespace(
                id=1,
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
                is_active=True,
                sort_order=10,
                created_at=datetime(2026, 3, 26, 12, 0, tzinfo=timezone.utc),
                updated_at=datetime(2026, 3, 26, 12, 0, tzinfo=timezone.utc),
            ),
            SimpleNamespace(
                id=2,
                name="Banco",
                code="BANK",
                account_type="bank",
                currency_id=1,
                parent_account_id=None,
                opening_balance=0.0,
                opening_balance_at=None,
                icon=None,
                is_favorite=False,
                is_balance_hidden=False,
                is_active=True,
                sort_order=20,
                created_at=datetime(2026, 3, 26, 12, 0, tzinfo=timezone.utc),
                updated_at=datetime(2026, 3, 26, 12, 0, tzinfo=timezone.utc),
            ),
        ]

        with patch(
            "app.apps.tenant_modules.finance.api.accounts.account_service.reorder_accounts",
            return_value=accounts,
        ):
            response = reorder_finance_accounts(
                payload=FinanceReorderRequest(
                    items=[
                        {"id": 1, "sort_order": 10},
                        {"id": 2, "sort_order": 20},
                    ]
                ),
                current_user=self._current_user(),
                tenant_db=object(),
            )

        self.assertEqual(response.total, 2)

    def test_get_finance_category_returns_detail(self) -> None:
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
            "app.apps.tenant_modules.finance.api.categories.category_service.get_category",
            return_value=category,
        ):
            response = get_finance_category(
                category_id=7,
                current_user=self._current_user(),
                tenant_db=object(),
            )

        self.assertEqual(response.data.category_type, "income")

    def test_reorder_finance_categories_returns_items(self) -> None:
        categories = [
            SimpleNamespace(
                id=1,
                name="Ventas",
                category_type="income",
                parent_category_id=None,
                icon=None,
                color=None,
                note=None,
                is_active=True,
                sort_order=10,
                created_at=datetime(2026, 3, 26, 12, 0, tzinfo=timezone.utc),
                updated_at=datetime(2026, 3, 26, 12, 0, tzinfo=timezone.utc),
            )
        ]

        with patch(
            "app.apps.tenant_modules.finance.api.categories.category_service.reorder_categories",
            return_value=categories,
        ):
            response = reorder_finance_categories(
                payload=FinanceReorderRequest(items=[{"id": 1, "sort_order": 10}]),
                current_user=self._current_user(),
                tenant_db=object(),
            )

        self.assertEqual(response.total, 1)

    def test_delete_finance_category_returns_deleted_item(self) -> None:
        category = SimpleNamespace(
            id=9,
            name="Publicidad impresa",
            category_type="expense",
            parent_category_id=None,
            icon="print",
            color=None,
            note=None,
            is_active=True,
            sort_order=100,
            created_at=datetime(2026, 3, 26, 12, 0, tzinfo=timezone.utc),
            updated_at=datetime(2026, 3, 26, 12, 0, tzinfo=timezone.utc),
        )

        with patch(
            "app.apps.tenant_modules.finance.api.categories.category_service.delete_category",
            return_value=category,
        ):
            response = delete_finance_category(
                category_id=9,
                current_user=self._current_user(),
                tenant_db=object(),
            )

        self.assertTrue(response.success)
        self.assertEqual(response.data.id, 9)

    def test_delete_finance_category_translates_validation_error_to_400(self) -> None:
        with patch(
            "app.apps.tenant_modules.finance.api.categories.category_service.delete_category",
            side_effect=ValueError("No puedes eliminar la categoria porque ya esta asociada a transacciones"),
        ):
            with self.assertRaises(HTTPException) as exc:
                delete_finance_category(
                    category_id=9,
                    current_user=self._current_user(),
                    tenant_db=object(),
                )

        self.assertEqual(exc.exception.status_code, 400)

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

    def test_delete_finance_currency_returns_deleted_item(self) -> None:
        currency = SimpleNamespace(
            id=2,
            code="USD",
            name="US Dollar",
            symbol="$",
            decimal_places=2,
            is_base=False,
            is_active=True,
            sort_order=100,
            created_at=datetime(2026, 3, 26, 12, 0, tzinfo=timezone.utc),
            updated_at=datetime(2026, 3, 26, 12, 0, tzinfo=timezone.utc),
        )

        with patch(
            "app.apps.tenant_modules.finance.api.currencies.currency_service.delete_currency",
            return_value=currency,
        ):
            response = delete_finance_currency(
                currency_id=2,
                current_user=self._current_user(),
                tenant_db=object(),
            )

        self.assertEqual(response.data.code, "USD")

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

    def test_get_finance_exchange_rate_returns_detail(self) -> None:
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
            "app.apps.tenant_modules.finance.api.currencies.currency_service.get_exchange_rate",
            return_value=exchange_rate,
        ):
            response = get_finance_exchange_rate(
                exchange_rate_id=4,
                current_user=self._current_user(),
                tenant_db=object(),
            )

        self.assertEqual(response.data.id, 4)

    def test_delete_finance_exchange_rate_returns_deleted_item(self) -> None:
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
            "app.apps.tenant_modules.finance.api.currencies.currency_service.delete_exchange_rate",
            return_value=exchange_rate,
        ):
            response = delete_finance_exchange_rate(
                exchange_rate_id=4,
                current_user=self._current_user(),
                tenant_db=object(),
            )

        self.assertEqual(response.data.id, 4)

    def test_delete_finance_tag_returns_deleted_item(self) -> None:
        tag = SimpleNamespace(
            id=8,
            name="Urgente",
            color="#ff6600",
            is_active=True,
            sort_order=100,
            created_at=datetime(2026, 3, 26, 12, 0, tzinfo=timezone.utc),
            updated_at=datetime(2026, 3, 26, 12, 0, tzinfo=timezone.utc),
        )

        with patch(
            "app.apps.tenant_modules.finance.api.tags.tag_service.delete_tag",
            return_value=tag,
        ):
            response = delete_finance_tag(
                tag_id=8,
                current_user=self._current_user(),
                tenant_db=object(),
            )

        self.assertEqual(response.data.name, "Urgente")

    def test_delete_finance_beneficiary_returns_deleted_item(self) -> None:
        beneficiary = SimpleNamespace(
            id=5,
            name="Proveedor norte",
            icon="briefcase",
            note=None,
            is_active=True,
            sort_order=100,
            created_at=datetime(2026, 3, 26, 12, 0, tzinfo=timezone.utc),
            updated_at=datetime(2026, 3, 26, 12, 0, tzinfo=timezone.utc),
        )

        with patch(
            "app.apps.tenant_modules.finance.api.beneficiaries.beneficiary_service.delete_beneficiary",
            return_value=beneficiary,
        ):
            response = delete_finance_beneficiary(
                beneficiary_id=5,
                current_user=self._current_user(),
                tenant_db=object(),
            )

        self.assertEqual(response.data.id, 5)

    def test_delete_finance_person_returns_deleted_item(self) -> None:
        person = SimpleNamespace(
            id=6,
            name="Ana Perez",
            icon="person",
            note=None,
            is_active=True,
            sort_order=100,
            created_at=datetime(2026, 3, 26, 12, 0, tzinfo=timezone.utc),
            updated_at=datetime(2026, 3, 26, 12, 0, tzinfo=timezone.utc),
        )

        with patch(
            "app.apps.tenant_modules.finance.api.people.person_service.delete_person",
            return_value=person,
        ):
            response = delete_finance_person(
                person_id=6,
                current_user=self._current_user(),
                tenant_db=object(),
            )

        self.assertEqual(response.data.id, 6)

    def test_delete_finance_project_returns_deleted_item(self) -> None:
        project = SimpleNamespace(
            id=7,
            name="Centro Norte",
            code="CN",
            note=None,
            is_active=True,
            sort_order=100,
            created_at=datetime(2026, 3, 26, 12, 0, tzinfo=timezone.utc),
            updated_at=datetime(2026, 3, 26, 12, 0, tzinfo=timezone.utc),
        )

        with patch(
            "app.apps.tenant_modules.finance.api.projects.project_service.delete_project",
            return_value=project,
        ):
            response = delete_finance_project(
                project_id=7,
                current_user=self._current_user(),
                tenant_db=object(),
            )

        self.assertEqual(response.data.code, "CN")


if __name__ == "__main__":
    unittest.main()
