import os
import unittest
from datetime import date
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
    apply_finance_loan_installment_payment,
    create_finance_budget,
    create_finance_loan,
    create_finance_transaction,
    create_finance_entry,
    finance_account_balances,
    finance_usage,
    finance_summary,
    get_finance_loan_detail,
    get_finance_transaction_detail,
    list_finance_budgets,
    list_finance_loans,
    update_finance_transaction,
    update_finance_loan,
    update_finance_transactions_favorite_batch,
    update_finance_transactions_reconciliation_batch,
    update_finance_transaction_favorite,
    update_finance_transaction_reconciliation,
    list_finance_transactions,
    list_finance_entries,
)
from app.apps.tenant_modules.finance.schemas import (  # noqa: E402
    FinanceBudgetCreateRequest,
    FinanceEntryCreateRequest,
    FinanceLoanCreateRequest,
    FinanceLoanInstallmentPaymentRequest,
    FinanceLoanUpdateRequest,
    FinanceTransactionCreateRequest,
    FinanceTransactionUpdateRequest,
)
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

    def test_get_transaction_detail_returns_transaction_and_audit_events(self) -> None:
        transaction = SimpleNamespace(id=10, description="Pago proveedor")
        audit_events = [SimpleNamespace(id=91, summary="Creada")]

        class FakeEntryRepository:
            def get_by_id(self, tenant_db, transaction_id):
                return transaction if transaction_id == 10 else None

        class FakeAuditRepository:
            def list_by_transaction(self, tenant_db, transaction_id):
                return audit_events if transaction_id == 10 else []

        service = FinanceService(
            entry_repository=FakeEntryRepository(),
            transaction_audit_repository=FakeAuditRepository(),
        )

        loaded_transaction, loaded_events = service.get_transaction_detail(object(), 10)

        self.assertIs(loaded_transaction, transaction)
        self.assertEqual(loaded_events, audit_events)


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

    def test_list_finance_transactions_returns_modern_rows(self) -> None:
        transactions = [
            SimpleNamespace(
                id=7,
                transaction_type="income",
                account_id=1,
                target_account_id=None,
                category_id=2,
                beneficiary_id=None,
                person_id=None,
                project_id=None,
                currency_id=1,
                loan_id=None,
                amount=1250.0,
                amount_in_base_currency=1250.0,
                exchange_rate=1.0,
                discount_amount=0.0,
                amortization_months=None,
                transaction_at="2026-03-27T12:00:00+00:00",
                alternative_date=None,
                description="Cobro arriendo",
                notes="marzo",
                is_favorite=False,
                favorite_flag=False,
                is_reconciled=True,
                reconciled_at="2026-03-27T12:00:00+00:00",
                is_template_origin=False,
                source_type=None,
                source_id=None,
                created_by_user_id=8,
                updated_by_user_id=8,
                created_at="2026-03-27T12:00:00+00:00",
                updated_at="2026-03-27T12:00:00+00:00",
            )
        ]

        with patch(
            "app.apps.tenant_modules.finance.api.routes.finance_service.list_transactions_filtered",
            return_value=transactions,
        ):
            response = list_finance_transactions(
                current_user=self._current_user(role="operator"),
                tenant_db=object(),
            )

        self.assertTrue(response.success)
        self.assertEqual(response.total, 1)
        self.assertEqual(response.data[0].description, "Cobro arriendo")

    def test_list_finance_transactions_forwards_filters(self) -> None:
        with patch(
            "app.apps.tenant_modules.finance.api.routes.finance_service.list_transactions_filtered",
            return_value=[],
        ) as list_transactions_mock:
            response = list_finance_transactions(
                transaction_type="expense",
                account_id=4,
                category_id=9,
                is_favorite=True,
                is_reconciled=False,
                search="mantencion",
                current_user=self._current_user(role="operator"),
                tenant_db=object(),
            )

        self.assertTrue(response.success)
        self.assertEqual(list_transactions_mock.call_args.kwargs["transaction_type"], "expense")
        self.assertEqual(list_transactions_mock.call_args.kwargs["account_id"], 4)
        self.assertEqual(list_transactions_mock.call_args.kwargs["category_id"], 9)
        self.assertTrue(list_transactions_mock.call_args.kwargs["is_favorite"])
        self.assertFalse(list_transactions_mock.call_args.kwargs["is_reconciled"])
        self.assertEqual(list_transactions_mock.call_args.kwargs["search"], "mantencion")

    def test_create_finance_transaction_returns_created_transaction(self) -> None:
        transaction = SimpleNamespace(
            id=12,
            transaction_type="expense",
            account_id=1,
            target_account_id=None,
            category_id=2,
            beneficiary_id=None,
            person_id=None,
            project_id=None,
            currency_id=1,
            loan_id=None,
            amount=300.0,
            amount_in_base_currency=300.0,
            exchange_rate=1.0,
            discount_amount=0.0,
            amortization_months=None,
            transaction_at="2026-03-27T13:00:00+00:00",
            alternative_date=None,
            description="Compra insumos",
            notes=None,
            is_favorite=False,
            favorite_flag=False,
            is_reconciled=False,
            reconciled_at=None,
            is_template_origin=False,
            source_type=None,
            source_id=None,
            created_by_user_id=5,
            updated_by_user_id=5,
            created_at="2026-03-27T13:00:00+00:00",
            updated_at="2026-03-27T13:00:00+00:00",
        )

        with patch(
            "app.apps.tenant_modules.finance.api.routes.finance_service.create_transaction",
            return_value=transaction,
        ) as create_transaction_mock:
            response = create_finance_transaction(
                payload=FinanceTransactionCreateRequest(
                    transaction_type="expense",
                    account_id=1,
                    target_account_id=None,
                    category_id=2,
                    beneficiary_id=None,
                    person_id=None,
                    project_id=None,
                    currency_id=1,
                    loan_id=None,
                    amount=300.0,
                    discount_amount=0.0,
                    exchange_rate=1.0,
                    amortization_months=None,
                    transaction_at="2026-03-27T13:00:00+00:00",
                    alternative_date=None,
                    description="Compra insumos",
                    notes=None,
                    is_favorite=False,
                    is_reconciled=False,
                    tag_ids=None,
                ),
                current_user=self._current_user(),
                tenant_db=object(),
            )

        self.assertTrue(response.success)
        self.assertEqual(response.data.transaction_type, "expense")
        self.assertEqual(create_transaction_mock.call_args.kwargs["created_by_user_id"], 1)

    def test_get_finance_transaction_detail_returns_audit_history(self) -> None:
        transaction = SimpleNamespace(
            id=14,
            transaction_type="transfer",
            account_id=1,
            target_account_id=2,
            category_id=None,
            beneficiary_id=None,
            person_id=None,
            project_id=None,
            currency_id=1,
            loan_id=None,
            amount=80.0,
            amount_in_base_currency=80.0,
            exchange_rate=1.0,
            discount_amount=0.0,
            amortization_months=None,
            transaction_at="2026-03-27T14:00:00+00:00",
            alternative_date=None,
            description="Traspaso caja",
            notes=None,
            is_favorite=False,
            favorite_flag=False,
            is_reconciled=False,
            reconciled_at=None,
            is_template_origin=False,
            source_type=None,
            source_id=None,
            created_by_user_id=9,
            updated_by_user_id=9,
            created_at="2026-03-27T14:00:00+00:00",
            updated_at="2026-03-27T14:00:00+00:00",
        )
        audit_events = [
            SimpleNamespace(
                id=1,
                event_type="transaction.created",
                actor_user_id=9,
                summary="Transaccion creada",
                payload_json='{"amount": 80}',
                created_at="2026-03-27T14:00:00+00:00",
            )
        ]

        with patch(
            "app.apps.tenant_modules.finance.api.routes.finance_service.get_transaction_detail",
            return_value=(transaction, audit_events),
        ):
            response = get_finance_transaction_detail(
                transaction_id=14,
                current_user=self._current_user(role="operator"),
                tenant_db=object(),
            )

        self.assertTrue(response.success)
        self.assertEqual(response.data.transaction.id, 14)
        self.assertEqual(response.data.audit_events[0].payload, {"amount": 80})

    def test_update_finance_transaction_returns_updated_transaction(self) -> None:
        transaction = SimpleNamespace(
            id=15,
            transaction_type="expense",
            account_id=1,
            target_account_id=None,
            category_id=2,
            beneficiary_id=None,
            person_id=None,
            project_id=None,
            currency_id=1,
            loan_id=None,
            amount=420.0,
            amount_in_base_currency=420.0,
            exchange_rate=1.0,
            discount_amount=0.0,
            amortization_months=None,
            transaction_at="2026-03-27T14:30:00+00:00",
            alternative_date=None,
            description="Gasto reajustado",
            notes="actualizado",
            is_favorite=True,
            favorite_flag=True,
            is_reconciled=True,
            reconciled_at="2026-03-27T14:30:00+00:00",
            is_template_origin=False,
            source_type=None,
            source_id=None,
            created_by_user_id=5,
            updated_by_user_id=6,
            created_at="2026-03-27T14:00:00+00:00",
            updated_at="2026-03-27T14:30:00+00:00",
        )

        with patch(
            "app.apps.tenant_modules.finance.api.routes.finance_service.update_transaction",
            return_value=transaction,
        ) as update_transaction_mock:
            response = update_finance_transaction(
                transaction_id=15,
                payload=FinanceTransactionUpdateRequest(
                    transaction_type="expense",
                    account_id=1,
                    target_account_id=None,
                    category_id=2,
                    beneficiary_id=None,
                    person_id=None,
                    project_id=None,
                    currency_id=1,
                    loan_id=None,
                    amount=420.0,
                    discount_amount=0.0,
                    exchange_rate=1.0,
                    amortization_months=None,
                    transaction_at="2026-03-27T14:30:00+00:00",
                    alternative_date=None,
                    description="Gasto reajustado",
                    notes="actualizado",
                    is_favorite=True,
                    is_reconciled=True,
                    tag_ids=None,
                ),
                current_user=self._current_user(),
                tenant_db=object(),
            )

        self.assertTrue(response.success)
        self.assertEqual(response.data.description, "Gasto reajustado")
        self.assertEqual(update_transaction_mock.call_args.kwargs["actor_user_id"], 1)

    def test_finance_account_balances_returns_named_accounts(self) -> None:
        accounts = [
            SimpleNamespace(
                id=1,
                name="Caja principal",
                account_type="cash",
                currency_id=1,
                is_balance_hidden=False,
            )
        ]

        with patch(
            "app.apps.tenant_modules.finance.api.routes.finance_service.account_repository.list_all",
            return_value=accounts,
        ), patch(
            "app.apps.tenant_modules.finance.api.routes.finance_service.get_account_balances",
            return_value={1: 980.5},
        ):
            response = finance_account_balances(
                current_user=self._current_user(role="operator"),
                tenant_db=object(),
            )

        self.assertTrue(response.success)
        self.assertEqual(response.data[0].account_name, "Caja principal")
        self.assertEqual(response.data[0].balance, 980.5)

    def test_list_finance_budgets_returns_budget_rows(self) -> None:
        rows = [
            {
                "budget": SimpleNamespace(
                    id=5,
                    period_month=date(2026, 3, 1),
                    category_id=9,
                    amount=500.0,
                    note="Marzo",
                    is_active=True,
                    created_at="2026-03-27T16:00:00+00:00",
                    updated_at="2026-03-27T16:00:00+00:00",
                ),
                "category_name": "Marketing",
                "category_type": "expense",
                "budget_status": "within_budget",
                "actual_amount": 200.0,
                "variance_amount": 300.0,
                "utilization_ratio": 0.4,
            }
        ]
        summary = {
            "period_month": date(2026, 3, 1),
            "total_budgeted": 500.0,
            "total_actual": 200.0,
            "total_variance": 300.0,
            "total_items": 1,
            "income_budgeted": 0.0,
            "income_actual": 0.0,
            "expense_budgeted": 500.0,
            "expense_actual": 200.0,
        }

        with patch(
            "app.apps.tenant_modules.finance.api.routes.budget_service.list_budgets",
            return_value=(rows, summary),
        ):
            response = list_finance_budgets(
                period_month=date(2026, 3, 8),
                current_user=self._current_user(role="operator"),
                tenant_db=object(),
            )

        self.assertTrue(response.success)
        self.assertEqual(response.total, 1)
        self.assertEqual(response.data[0].category_name, "Marketing")
        self.assertEqual(response.summary.total_actual, 200.0)

    def test_create_finance_budget_returns_created_budget(self) -> None:
        budget = SimpleNamespace(id=5, period_month=date(2026, 3, 1))
        rows = [
            {
                "budget": SimpleNamespace(
                    id=5,
                    period_month=date(2026, 3, 1),
                    category_id=9,
                    amount=500.0,
                    note="Marzo",
                    is_active=True,
                    created_at="2026-03-27T16:00:00+00:00",
                    updated_at="2026-03-27T16:00:00+00:00",
                ),
                "category_name": "Marketing",
                "category_type": "expense",
                "budget_status": "unused",
                "actual_amount": 0.0,
                "variance_amount": 500.0,
                "utilization_ratio": 0.0,
            }
        ]

        with patch(
            "app.apps.tenant_modules.finance.api.routes.budget_service.create_budget",
            return_value=budget,
        ), patch(
            "app.apps.tenant_modules.finance.api.routes.budget_service.list_budgets",
            return_value=(rows, {}),
        ):
            response = create_finance_budget(
                payload=FinanceBudgetCreateRequest(
                    period_month=date(2026, 3, 18),
                    category_id=9,
                    amount=500.0,
                    note="Marzo",
                    is_active=True,
                ),
                current_user=self._current_user(),
                tenant_db=object(),
            )

        self.assertTrue(response.success)
        self.assertEqual(response.data.amount, 500.0)

    def test_list_finance_loans_returns_rows(self) -> None:
        rows = [
            {
                "loan": SimpleNamespace(
                    id=3,
                    name="Crédito local",
                    loan_type="borrowed",
                    counterparty_name="Banco Centro",
                    currency_id=1,
                    principal_amount=1000.0,
                    current_balance=700.0,
                    interest_rate=7.5,
                    installments_count=12,
                    payment_frequency="monthly",
                    start_date=date(2026, 3, 1),
                    due_date=date(2027, 3, 1),
                    note="Renegociado",
                    is_active=True,
                    created_at="2026-03-27T16:00:00+00:00",
                    updated_at="2026-03-27T16:00:00+00:00",
                ),
                "currency_code": "USD",
                "loan_status": "open",
                "paid_amount": 300.0,
                "next_due_date": date(2026, 4, 1),
                "installments_total": 12,
                "installments_paid": 3,
            }
        ]
        summary = {
            "total_items": 1,
            "active_items": 1,
            "borrowed_balance": 700.0,
            "lent_balance": 0.0,
            "total_principal": 1000.0,
        }

        with patch(
            "app.apps.tenant_modules.finance.api.routes.loan_service.list_loans",
            return_value=(rows, summary),
        ):
            response = list_finance_loans(
                current_user=self._current_user(role="operator"),
                tenant_db=object(),
            )

        self.assertTrue(response.success)
        self.assertEqual(response.total, 1)
        self.assertEqual(response.data[0].loan_status, "open")
        self.assertEqual(response.summary.borrowed_balance, 700.0)

    def test_create_finance_loan_returns_created_row(self) -> None:
        loan = SimpleNamespace(id=3)
        rows = [
            {
                "loan": SimpleNamespace(
                    id=3,
                    name="Préstamo socio",
                    loan_type="lent",
                    counterparty_name="Socio Uno",
                    currency_id=1,
                    principal_amount=500.0,
                    current_balance=250.0,
                    interest_rate=None,
                    installments_count=10,
                    payment_frequency="monthly",
                    start_date=date(2026, 3, 1),
                    due_date=None,
                    note=None,
                    is_active=True,
                    created_at="2026-03-27T16:00:00+00:00",
                    updated_at="2026-03-27T16:00:00+00:00",
                ),
                "currency_code": "USD",
                "loan_status": "open",
                "paid_amount": 250.0,
                "next_due_date": date(2026, 4, 1),
                "installments_total": 10,
                "installments_paid": 5,
            }
        ]

        with patch(
            "app.apps.tenant_modules.finance.api.routes.loan_service.create_loan",
            return_value=loan,
        ), patch(
            "app.apps.tenant_modules.finance.api.routes.loan_service.list_loans",
            return_value=(rows, {}),
        ):
            response = create_finance_loan(
                payload=FinanceLoanCreateRequest(
                    name="Préstamo socio",
                    loan_type="lent",
                    counterparty_name="Socio Uno",
                    currency_id=1,
                    principal_amount=500.0,
                    current_balance=250.0,
                    interest_rate=None,
                    installments_count=10,
                    payment_frequency="monthly",
                    start_date=date(2026, 3, 1),
                    due_date=None,
                    note=None,
                    is_active=True,
                ),
                current_user=self._current_user(),
                tenant_db=object(),
            )

        self.assertTrue(response.success)
        self.assertEqual(response.data.current_balance, 250.0)
        self.assertEqual(response.data.installments_total, 10)

    def test_update_finance_loan_returns_updated_row(self) -> None:
        loan = SimpleNamespace(id=3)
        rows = [
            {
                "loan": SimpleNamespace(
                    id=3,
                    name="Crédito local",
                    loan_type="borrowed",
                    counterparty_name="Banco Centro",
                    currency_id=1,
                    principal_amount=1000.0,
                    current_balance=650.0,
                    interest_rate=7.0,
                    installments_count=8,
                    payment_frequency="monthly",
                    start_date=date(2026, 3, 1),
                    due_date=None,
                    note="Actualizado",
                    is_active=True,
                    created_at="2026-03-27T16:00:00+00:00",
                    updated_at="2026-03-27T17:00:00+00:00",
                ),
                "currency_code": "USD",
                "loan_status": "open",
                "paid_amount": 350.0,
                "next_due_date": date(2026, 4, 1),
                "installments_total": 8,
                "installments_paid": 2,
            }
        ]

        with patch(
            "app.apps.tenant_modules.finance.api.routes.loan_service.update_loan",
            return_value=loan,
        ), patch(
            "app.apps.tenant_modules.finance.api.routes.loan_service.list_loans",
            return_value=(rows, {}),
        ):
            response = update_finance_loan(
                loan_id=3,
                payload=FinanceLoanUpdateRequest(
                    name="Crédito local",
                    loan_type="borrowed",
                    counterparty_name="Banco Centro",
                    currency_id=1,
                    principal_amount=1000.0,
                    current_balance=650.0,
                    interest_rate=7.0,
                    installments_count=8,
                    payment_frequency="monthly",
                    start_date=date(2026, 3, 1),
                    due_date=None,
                    note="Actualizado",
                    is_active=True,
                ),
                current_user=self._current_user(),
                tenant_db=object(),
            )

        self.assertTrue(response.success)
        self.assertEqual(response.data.paid_amount, 350.0)
        self.assertEqual(response.data.installments_paid, 2)

    def test_get_finance_loan_detail_returns_installments(self) -> None:
        loan_row = {
            "loan": SimpleNamespace(
                id=4,
                name="Crédito equipo",
                loan_type="borrowed",
                counterparty_name="Banco Norte",
                currency_id=1,
                principal_amount=1200.0,
                current_balance=900.0,
                interest_rate=6.5,
                installments_count=12,
                payment_frequency="monthly",
                start_date=date(2026, 3, 1),
                due_date=date(2027, 2, 1),
                note=None,
                is_active=True,
                created_at="2026-03-27T16:00:00+00:00",
                updated_at="2026-03-27T16:00:00+00:00",
            ),
            "currency_code": "USD",
            "loan_status": "open",
            "paid_amount": 300.0,
            "next_due_date": date(2026, 4, 1),
            "installments_total": 12,
            "installments_paid": 3,
        }
        installments = [
            {
                "installment": SimpleNamespace(
                    id=21,
                    loan_id=4,
                    installment_number=1,
                    due_date=date(2026, 3, 1),
                    planned_amount=110.0,
                    principal_amount=100.0,
                    interest_amount=10.0,
                    paid_amount=110.0,
                    paid_at=date(2026, 3, 1),
                    note=None,
                    created_at="2026-03-27T16:00:00+00:00",
                    updated_at="2026-03-27T16:00:00+00:00",
                ),
                "installment_status": "paid",
            }
        ]

        with patch(
            "app.apps.tenant_modules.finance.api.routes.loan_service.get_loan_detail",
            return_value=(loan_row, installments),
        ):
            response = get_finance_loan_detail(
                loan_id=4,
                current_user=self._current_user(role="operator"),
                tenant_db=object(),
            )

        self.assertTrue(response.success)
        self.assertEqual(response.data.loan.installments_total, 12)
        self.assertEqual(response.data.installments[0].installment_status, "paid")

    def test_apply_finance_loan_installment_payment_returns_mutated_rows(self) -> None:
        loan_row = {
            "loan": SimpleNamespace(
                id=4,
                name="Credito equipo",
                loan_type="borrowed",
                counterparty_name="Banco Norte",
                currency_id=1,
                principal_amount=1200.0,
                current_balance=800.0,
                interest_rate=6.5,
                installments_count=12,
                payment_frequency="monthly",
                start_date=date(2026, 3, 1),
                due_date=date(2027, 2, 1),
                note=None,
                is_active=True,
                created_at="2026-03-27T16:00:00+00:00",
                updated_at="2026-03-27T16:00:00+00:00",
            ),
            "currency_code": "USD",
            "loan_status": "open",
            "paid_amount": 400.0,
            "next_due_date": date(2026, 5, 1),
            "installments_total": 12,
            "installments_paid": 1,
        }
        installment_row = {
            "installment": SimpleNamespace(
                id=22,
                loan_id=4,
                installment_number=2,
                due_date=date(2026, 4, 1),
                planned_amount=110.0,
                principal_amount=100.0,
                interest_amount=10.0,
                paid_amount=50.0,
                paid_at=date(2026, 4, 1),
                note="Abono parcial",
                created_at="2026-03-27T16:00:00+00:00",
                updated_at="2026-03-27T16:00:00+00:00",
            ),
            "installment_status": "partial",
        }

        with patch(
            "app.apps.tenant_modules.finance.api.routes.loan_service.apply_installment_payment",
            return_value=(loan_row, installment_row),
        ) as apply_payment_mock:
            response = apply_finance_loan_installment_payment(
                loan_id=4,
                installment_id=22,
                payload=FinanceLoanInstallmentPaymentRequest(
                    paid_amount=50.0,
                    paid_at=date(2026, 4, 1),
                    note="Abono parcial",
                ),
                current_user=self._current_user(),
                tenant_db=object(),
            )

        self.assertTrue(response.success)
        self.assertEqual(response.data.loan.current_balance, 800.0)
        self.assertEqual(response.data.installment.installment_status, "partial")
        self.assertEqual(apply_payment_mock.call_args.kwargs["paid_amount"], 50.0)

    def test_update_finance_transaction_favorite_returns_mutated_transaction(self) -> None:
        transaction = SimpleNamespace(
            id=21,
            transaction_type="expense",
            account_id=1,
            target_account_id=None,
            category_id=None,
            beneficiary_id=None,
            person_id=None,
            project_id=None,
            currency_id=1,
            loan_id=None,
            amount=150.0,
            amount_in_base_currency=150.0,
            exchange_rate=1.0,
            discount_amount=0.0,
            amortization_months=None,
            transaction_at="2026-03-27T15:00:00+00:00",
            alternative_date=None,
            description="Factura agua",
            notes=None,
            is_favorite=True,
            favorite_flag=True,
            is_reconciled=False,
            reconciled_at=None,
            is_template_origin=False,
            source_type=None,
            source_id=None,
            created_by_user_id=1,
            updated_by_user_id=1,
            created_at="2026-03-27T15:00:00+00:00",
            updated_at="2026-03-27T15:00:00+00:00",
        )

        with patch(
            "app.apps.tenant_modules.finance.api.routes.finance_service.update_transaction_favorite",
            return_value=transaction,
        ):
            response = update_finance_transaction_favorite(
                transaction_id=21,
                payload=SimpleNamespace(is_favorite=True),
                current_user=self._current_user(),
                tenant_db=object(),
            )

        self.assertTrue(response.success)
        self.assertTrue(response.data.is_favorite)

    def test_update_finance_transactions_favorite_batch_returns_affected_ids(self) -> None:
        transactions = [SimpleNamespace(id=21), SimpleNamespace(id=22)]

        with patch(
            "app.apps.tenant_modules.finance.api.routes.finance_service.update_transactions_favorite_batch",
            return_value=transactions,
        ):
            response = update_finance_transactions_favorite_batch(
                payload=SimpleNamespace(transaction_ids=[21, 22], is_favorite=True),
                current_user=self._current_user(),
                tenant_db=object(),
            )

        self.assertTrue(response.success)
        self.assertEqual(response.data.affected_count, 2)
        self.assertEqual(response.data.transaction_ids, [21, 22])

    def test_update_finance_transaction_reconciliation_returns_mutated_transaction(self) -> None:
        transaction = SimpleNamespace(
            id=22,
            transaction_type="income",
            account_id=1,
            target_account_id=None,
            category_id=None,
            beneficiary_id=None,
            person_id=None,
            project_id=None,
            currency_id=1,
            loan_id=None,
            amount=200.0,
            amount_in_base_currency=200.0,
            exchange_rate=1.0,
            discount_amount=0.0,
            amortization_months=None,
            transaction_at="2026-03-27T15:10:00+00:00",
            alternative_date=None,
            description="Cobro",
            notes=None,
            is_favorite=False,
            favorite_flag=False,
            is_reconciled=True,
            reconciled_at="2026-03-27T15:11:00+00:00",
            is_template_origin=False,
            source_type=None,
            source_id=None,
            created_by_user_id=1,
            updated_by_user_id=1,
            created_at="2026-03-27T15:10:00+00:00",
            updated_at="2026-03-27T15:11:00+00:00",
        )

        with patch(
            "app.apps.tenant_modules.finance.api.routes.finance_service.update_transaction_reconciliation",
            return_value=transaction,
        ):
            response = update_finance_transaction_reconciliation(
                transaction_id=22,
                payload=SimpleNamespace(is_reconciled=True),
                current_user=self._current_user(),
                tenant_db=object(),
            )

        self.assertTrue(response.success)
        self.assertTrue(response.data.is_reconciled)

    def test_update_finance_transactions_reconciliation_batch_returns_affected_ids(self) -> None:
        transactions = [SimpleNamespace(id=31), SimpleNamespace(id=32), SimpleNamespace(id=33)]

        with patch(
            "app.apps.tenant_modules.finance.api.routes.finance_service.update_transactions_reconciliation_batch",
            return_value=transactions,
        ):
            response = update_finance_transactions_reconciliation_batch(
                payload=SimpleNamespace(transaction_ids=[31, 32, 33], is_reconciled=True),
                current_user=self._current_user(),
                tenant_db=object(),
            )

        self.assertTrue(response.success)
        self.assertEqual(response.data.affected_count, 3)
        self.assertEqual(response.data.transaction_ids, [31, 32, 33])

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
