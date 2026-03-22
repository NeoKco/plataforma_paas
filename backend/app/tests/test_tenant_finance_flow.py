import os
import unittest
from types import SimpleNamespace
from unittest.mock import patch

from fastapi import HTTPException

from app.tests.fixtures import (  # noqa: E402
    build_finance_entry_stub,
    build_tenant_context,
    build_tenant_request,
    set_test_environment,
)

set_test_environment()

from app.apps.tenant_modules.finance.api.routes import (  # noqa: E402
    create_finance_entry,
    finance_usage,
    finance_summary,
    list_finance_entries,
)
from app.apps.tenant_modules.finance.schemas import FinanceEntryCreateRequest  # noqa: E402
from app.apps.tenant_modules.finance.services.finance_service import (  # noqa: E402
    FinanceService,
    FinanceUsageLimitExceededError,
)
from app.common.auth.dependencies import require_tenant_permission  # noqa: E402


class TenantFinancePermissionsTestCase(unittest.TestCase):
    def _request(self, role: str):
        return build_tenant_request(role=role)

    def test_operator_can_read_finance(self) -> None:
        checker = require_tenant_permission("tenant.finance.read")
        context = checker(self._request("operator"))
        self.assertIn("tenant.finance.read", context["permissions"])

    def test_operator_cannot_create_finance_entry(self) -> None:
        checker = require_tenant_permission("tenant.finance.create")
        with self.assertRaises(HTTPException) as exc:
            checker(self._request("operator"))
        self.assertEqual(exc.exception.status_code, 403)


class TenantFinanceServiceTestCase(unittest.TestCase):
    def test_create_entry_rejects_invalid_movement_type(self) -> None:
        service = FinanceService(entry_repository=SimpleNamespace())

        with self.assertRaises(ValueError) as exc:
            service.create_entry(
                tenant_db=object(),
                movement_type="transfer",
                concept="Movimiento invalido",
                amount=100,
                created_by_user_id=1,
            )

        self.assertIn("movement_type", str(exc.exception))

    def test_get_summary_aggregates_entries(self) -> None:
        entries = [
            SimpleNamespace(movement_type="income", amount=1000.0),
            SimpleNamespace(movement_type="expense", amount=250.0),
            SimpleNamespace(movement_type="expense", amount=100.0),
        ]

        class FakeEntryRepository:
            def list_all(self, tenant_db):
                return entries

        service = FinanceService(entry_repository=FakeEntryRepository())
        summary = service.get_summary(object())

        self.assertEqual(summary["total_income"], 1000.0)
        self.assertEqual(summary["total_expense"], 350.0)
        self.assertEqual(summary["balance"], 650.0)

    def test_create_entry_rejects_when_plan_limit_is_reached(self) -> None:
        class FakeEntryRepository:
            def count_all(self, tenant_db):
                return 5

            def count_created_since(self, tenant_db, created_since):
                return 0

            def count_created_since_by_type(self, tenant_db, created_since, movement_type):
                return 0

        service = FinanceService(entry_repository=FakeEntryRepository())

        with self.assertRaises(FinanceUsageLimitExceededError) as exc:
            service.create_entry(
                tenant_db=object(),
                movement_type="income",
                concept="Cobro",
                amount=100,
                created_by_user_id=1,
                max_entries=5,
            )

        self.assertIn("finance.entries", str(exc.exception))

    def test_create_entry_rejects_when_monthly_limit_is_reached(self) -> None:
        class FakeEntryRepository:
            def count_all(self, tenant_db):
                return 1

            def count_created_since(self, tenant_db, created_since):
                return 3

            def count_created_since_by_type(self, tenant_db, created_since, movement_type):
                return 0

        service = FinanceService(entry_repository=FakeEntryRepository())

        with self.assertRaises(FinanceUsageLimitExceededError) as exc:
            service.create_entry(
                tenant_db=object(),
                movement_type="income",
                concept="Cobro",
                amount=100,
                created_by_user_id=1,
                max_monthly_entries=3,
            )

        self.assertIn("finance.entries.monthly", str(exc.exception))

    def test_create_entry_rejects_when_monthly_income_limit_is_reached(self) -> None:
        class FakeEntryRepository:
            def count_all(self, tenant_db):
                return 1

            def count_created_since(self, tenant_db, created_since):
                return 1

            def count_created_since_by_type(self, tenant_db, created_since, movement_type):
                return 2 if movement_type == "income" else 0

        service = FinanceService(entry_repository=FakeEntryRepository())

        with self.assertRaises(FinanceUsageLimitExceededError) as exc:
            service.create_entry(
                tenant_db=object(),
                movement_type="income",
                concept="Cobro",
                amount=100,
                created_by_user_id=1,
                max_monthly_entries_by_type={"income": 2},
            )

        self.assertIn("finance.entries.monthly.income", str(exc.exception))


class TenantFinanceRoutesTestCase(unittest.TestCase):
    def _current_user(self, role: str = "manager") -> dict:
        return build_tenant_context(
            role=role,
            email="manager@empresa-bootstrap.local",
        )

    def test_list_finance_entries_returns_data(self) -> None:
        entries = [build_finance_entry_stub(entry_id=2, concept="Internet")]

        with patch(
            "app.apps.tenant_modules.finance.api.routes.finance_service.list_entries",
            return_value=entries,
        ):
            response = list_finance_entries(
                current_user=self._current_user(),
                tenant_db=object(),
            )

        self.assertEqual(response.total, 1)
        self.assertEqual(response.data[0].concept, "Internet")

    def test_create_finance_entry_returns_created_entry(self) -> None:
        entry = build_finance_entry_stub(
            entry_id=3,
            movement_type="income",
            concept="Cobro mensual",
            amount=1200.0,
            category="billing",
        )

        with patch(
            "app.apps.tenant_modules.finance.api.routes.finance_service.create_entry",
            return_value=entry,
        ) as create_entry_mock:
            response = create_finance_entry(
                request=SimpleNamespace(
                    state=SimpleNamespace(
                        tenant_effective_module_limits={
                            "finance.entries": 20,
                            "finance.entries.monthly": 50,
                            "finance.entries.monthly.income": 30,
                        }
                    )
                ),
                payload=FinanceEntryCreateRequest(
                    movement_type="income",
                    concept="Cobro mensual",
                    amount=1200.0,
                    category="billing",
                ),
                current_user=self._current_user(),
                tenant_db=object(),
            )

        self.assertTrue(response.success)
        self.assertEqual(response.data.amount, 1200.0)
        self.assertEqual(create_entry_mock.call_args.kwargs["max_monthly_entries"], 50)
        self.assertEqual(
            create_entry_mock.call_args.kwargs["max_monthly_entries_by_type"],
            {"income": 30, "expense": None},
        )

    def test_create_finance_entry_returns_403_when_plan_limit_is_reached(self) -> None:
        with patch(
            "app.apps.tenant_modules.finance.api.routes.finance_service.create_entry",
            side_effect=FinanceUsageLimitExceededError(
                "El plan actual alcanzo el limite de finance.entries"
            ),
        ):
            with self.assertRaises(HTTPException) as exc:
                create_finance_entry(
                    request=SimpleNamespace(
                        state=SimpleNamespace(
                            tenant_effective_module_limits={"finance.entries": 5}
                        )
                    ),
                    payload=FinanceEntryCreateRequest(
                        movement_type="income",
                        concept="Cobro mensual",
                        amount=1200.0,
                        category="billing",
                    ),
                    current_user=self._current_user(),
                    tenant_db=object(),
                )

        self.assertEqual(exc.exception.status_code, 403)

    def test_finance_summary_returns_aggregates(self) -> None:
        summary = {
            "total_income": 1000.0,
            "total_expense": 400.0,
            "balance": 600.0,
            "total_entries": 3,
        }

        with patch(
            "app.apps.tenant_modules.finance.api.routes.finance_service.get_summary",
            return_value=summary,
        ):
            response = finance_summary(
                current_user=self._current_user(role="operator"),
                tenant_db=object(),
            )

        self.assertEqual(response.data.balance, 600.0)

    def test_finance_usage_returns_effective_limit_and_source(self) -> None:
        usage = {
            "module_key": "finance.entries",
            "used_entries": 12,
            "max_entries": 25,
            "remaining_entries": 13,
            "unlimited": False,
            "at_limit": False,
        }

        with patch(
            "app.apps.tenant_modules.finance.api.routes.finance_service.get_usage",
            return_value=usage,
        ):
            response = finance_usage(
                request=SimpleNamespace(
                    state=SimpleNamespace(
                        tenant_effective_module_limits={"finance.entries": 25},
                        tenant_effective_module_limit_sources={
                            "finance.entries": "billing_grace"
                        },
                    )
                ),
                current_user=self._current_user(role="operator"),
                tenant_db=object(),
            )

        self.assertTrue(response.success)
        self.assertEqual(response.data.module_key, "finance.entries")
        self.assertEqual(response.data.max_entries, 25)
        self.assertEqual(response.data.limit_source, "billing_grace")


if __name__ == "__main__":
    unittest.main()
