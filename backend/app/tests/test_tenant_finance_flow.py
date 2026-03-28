import os
import unittest
from datetime import date
from types import SimpleNamespace
from unittest.mock import patch

from fastapi import HTTPException
from sqlalchemy.exc import ProgrammingError

from app.tests.fixtures import (  # noqa: E402
    build_finance_entry_stub,
    build_tenant_context,
    build_tenant_request,
    set_test_environment,
)

set_test_environment()

from app.apps.tenant_modules.finance.api.routes import (  # noqa: E402
    apply_finance_loan_installment_payment,
    apply_finance_loan_installment_payment_batch,
    create_finance_budget,
    create_finance_loan,
    create_finance_transaction,
    create_finance_entry,
    finance_account_balances,
    get_finance_planning_overview,
    get_finance_reports_overview,
    finance_usage,
    finance_summary,
    get_finance_loan_detail,
    get_finance_transaction_detail,
    list_finance_budgets,
    list_finance_loans,
    reverse_finance_loan_installment_payment,
    reverse_finance_loan_installment_payment_batch,
    update_finance_transaction,
    update_finance_loan,
    update_finance_transactions_favorite_batch,
    update_finance_transactions_reconciliation_batch,
    update_finance_transaction_favorite,
    update_finance_transaction_reconciliation,
    list_finance_transactions,
    list_finance_entries,
)
from app.apps.tenant_modules.finance.api.currencies import router as currencies_router  # noqa: E402
from app.apps.tenant_modules.finance.schemas import (  # noqa: E402
    FinanceBudgetCreateRequest,
    FinanceEntryCreateRequest,
    FinanceLoanCreateRequest,
    FinanceLoanInstallmentPaymentBatchRequest,
    FinanceLoanInstallmentPaymentRequest,
    FinanceLoanInstallmentReversalBatchRequest,
    FinanceLoanInstallmentReversalRequest,
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
                paid_principal_amount=100.0,
                paid_interest_amount=10.0,
                paid_at=date(2026, 3, 1),
                reversal_reason_code=None,
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

    def test_get_finance_reports_overview_returns_consolidated_payload(self) -> None:
        overview = {
            "period_month": date(2026, 4, 1),
            "movement_scope": "all",
            "analysis_scope": "period",
            "budget_category_scope": "all",
            "budget_status_filter": "all",
            "transaction_snapshot": {
                "period_month": date(2026, 4, 1),
                "total_income": 500.0,
                "total_expense": 120.0,
                "net_balance": 380.0,
                "total_transactions": 2,
                "reconciled_count": 1,
                "unreconciled_count": 1,
                "favorite_count": 1,
                "loan_linked_count": 0,
            },
            "budget_snapshot": {
                "period_month": date(2026, 4, 1),
                "total_budgeted": 300.0,
                "total_actual": 120.0,
                "total_variance": 180.0,
                "total_items": 1,
                "over_budget_count": 0,
                "within_budget_count": 1,
                "inactive_count": 0,
                "unused_count": 0,
            },
            "loan_snapshot": {
                "borrowed_balance": 700.0,
                "lent_balance": 0.0,
                "total_principal": 1000.0,
                "total_items": 1,
                "active_items": 1,
                "open_items": 1,
                "settled_items": 0,
            },
            "top_income_categories": [
                {
                    "category_id": 1,
                    "category_name": "General Income",
                    "category_type": "income",
                    "total_amount": 500.0,
                }
            ],
            "top_expense_categories": [
                {
                    "category_id": 2,
                    "category_name": "General Expense",
                    "category_type": "expense",
                    "total_amount": 120.0,
                }
            ],
            "daily_cashflow": [
                {
                    "day": date(2026, 4, 5),
                    "income_total": 500.0,
                    "expense_total": 0.0,
                    "net_total": 500.0,
                    "transaction_count": 1,
                },
                {
                    "day": date(2026, 4, 7),
                    "income_total": 0.0,
                    "expense_total": 120.0,
                    "net_total": -120.0,
                    "transaction_count": 1,
                },
            ],
            "budget_variances": [
                {
                    "category_id": 2,
                    "category_name": "General Expense",
                    "category_type": "expense",
                    "budget_status": "within_budget",
                    "planned_amount": 300.0,
                    "actual_amount": 120.0,
                    "variance_amount": 180.0,
                    "utilization_ratio": 0.4,
                    "is_active": True,
                }
            ],
            "period_comparison": {
                "current_period_month": date(2026, 4, 1),
                "compare_period_month": date(2026, 3, 1),
                "previous_period_month": date(2026, 3, 1),
                "previous_income": 300.0,
                "previous_expense": 50.0,
                "previous_net_balance": 250.0,
                "previous_transactions": 2,
                "previous_budgeted": 200.0,
                "previous_actual": 50.0,
                "previous_variance": 150.0,
                "income_delta": 200.0,
                "expense_delta": 70.0,
                "net_balance_delta": 130.0,
                "transaction_delta": 0,
                "budgeted_delta": 100.0,
                "actual_delta": 70.0,
                "variance_delta": 30.0,
            },
            "monthly_trend": [
                {
                    "period_month": date(2025, 11, 1),
                    "total_income": 0.0,
                    "total_expense": 0.0,
                    "net_balance": 0.0,
                    "total_transactions": 0,
                    "total_budgeted": 0.0,
                    "total_actual": 0.0,
                    "total_variance": 0.0,
                },
                {
                    "period_month": date(2026, 4, 1),
                    "total_income": 500.0,
                    "total_expense": 120.0,
                    "net_balance": 380.0,
                    "total_transactions": 2,
                    "total_budgeted": 300.0,
                    "total_actual": 120.0,
                    "total_variance": 180.0,
                },
            ],
            "trend_summary": {
                "months_covered": 2,
                "first_period_month": date(2025, 11, 1),
                "last_period_month": date(2026, 4, 1),
                "total_income": 500.0,
                "total_expense": 120.0,
                "total_net_balance": 380.0,
                "average_income": 250.0,
                "average_expense": 60.0,
                "average_net_balance": 190.0,
                "best_period_month": date(2026, 4, 1),
                "best_net_balance": 380.0,
                "worst_period_month": date(2025, 11, 1),
                "worst_net_balance": 0.0,
                "net_balance_delta_vs_first": 380.0,
            },
            "horizon_comparison": {
                "trend_months": 2,
                "current_first_period_month": date(2025, 11, 1),
                "current_last_period_month": date(2026, 4, 1),
                "compare_first_period_month": date(2025, 10, 1),
                "compare_last_period_month": date(2026, 3, 1),
                "compare_months_covered": 2,
                "compare_total_income": 300.0,
                "compare_total_expense": 50.0,
                "compare_total_net_balance": 250.0,
                "compare_average_income": 150.0,
                "compare_average_expense": 25.0,
                "compare_average_net_balance": 125.0,
                "total_income_delta_vs_compare": 200.0,
                "total_expense_delta_vs_compare": 70.0,
                "total_net_balance_delta_vs_compare": 130.0,
                "average_net_balance_delta_vs_compare": 65.0,
            },
            "year_to_date_comparison": {
                "current_first_period_month": date(2026, 1, 1),
                "current_last_period_month": date(2026, 4, 1),
                "current_months_covered": 4,
                "current_total_income": 500.0,
                "current_total_expense": 120.0,
                "current_total_net_balance": 380.0,
                "compare_first_period_month": date(2026, 1, 1),
                "compare_last_period_month": date(2026, 3, 1),
                "compare_months_covered": 3,
                "compare_total_income": 300.0,
                "compare_total_expense": 50.0,
                "compare_total_net_balance": 250.0,
                "total_income_delta_vs_compare": 200.0,
                "total_expense_delta_vs_compare": 70.0,
                "total_net_balance_delta_vs_compare": 130.0,
            },
            "custom_range_comparison": {
                "current_label": "periodo",
                "current_first_period_month": date(2026, 4, 1),
                "current_last_period_month": date(2026, 4, 1),
                "current_months_covered": 1,
                "current_total_income": 500.0,
                "current_total_expense": 120.0,
                "current_total_net_balance": 380.0,
                "custom_first_period_month": date(2026, 3, 1),
                "custom_last_period_month": date(2026, 3, 1),
                "custom_months_covered": 1,
                "custom_total_income": 300.0,
                "custom_total_expense": 50.0,
                "custom_total_net_balance": 250.0,
                "total_income_delta_vs_custom": 200.0,
                "total_expense_delta_vs_custom": 70.0,
                "total_net_balance_delta_vs_custom": 130.0,
            },
        }

        with patch(
            "app.apps.tenant_modules.finance.api.routes.reports_service.get_overview",
            return_value=overview,
        ):
            response = get_finance_reports_overview(
                period_month=date(2026, 4, 1),
                trend_months=6,
                movement_scope="all",
                analysis_scope="period",
                budget_category_scope="all",
                budget_status_filter="all",
                current_user=self._current_user(role="operator"),
                tenant_db=object(),
            )

        self.assertTrue(response.success)
        self.assertEqual(response.data.transaction_snapshot.total_income, 500.0)
        self.assertEqual(response.data.budget_snapshot.total_budgeted, 300.0)
        self.assertEqual(response.data.loan_snapshot.borrowed_balance, 700.0)
        self.assertEqual(response.data.top_expense_categories[0].category_name, "General Expense")
        self.assertEqual(response.data.daily_cashflow[0].transaction_count, 1)
        self.assertEqual(
            response.data.budget_variances[0].budget_status,
            "within_budget",
        )
        self.assertEqual(
            response.data.period_comparison.compare_period_month,
            date(2026, 3, 1),
        )
        self.assertEqual(
            response.data.period_comparison.previous_period_month,
            date(2026, 3, 1),
        )
        self.assertEqual(response.data.monthly_trend[-1].net_balance, 380.0)
        self.assertEqual(response.data.movement_scope, "all")
        self.assertEqual(response.data.analysis_scope, "period")
        self.assertEqual(response.data.budget_category_scope, "all")
        self.assertEqual(response.data.trend_summary.best_net_balance, 380.0)
        self.assertEqual(
            response.data.horizon_comparison.compare_last_period_month,
            date(2026, 3, 1),
        )
        self.assertEqual(
            response.data.year_to_date_comparison.compare_last_period_month,
            date(2026, 3, 1),
        )
        self.assertEqual(
            response.data.custom_range_comparison.custom_last_period_month,
            date(2026, 3, 1),
        )

    def test_get_finance_reports_overview_forwards_trend_months(self) -> None:
        with patch(
            "app.apps.tenant_modules.finance.api.routes.reports_service.get_overview",
            return_value={
                "period_month": date(2026, 4, 1),
                "movement_scope": "all",
                "analysis_scope": "period",
                "budget_category_scope": "all",
                "budget_status_filter": "all",
                "transaction_snapshot": {
                    "period_month": date(2026, 4, 1),
                    "total_income": 0.0,
                    "total_expense": 0.0,
                    "net_balance": 0.0,
                    "total_transactions": 0,
                    "reconciled_count": 0,
                    "unreconciled_count": 0,
                    "favorite_count": 0,
                    "loan_linked_count": 0,
                },
                "budget_snapshot": {
                    "period_month": date(2026, 4, 1),
                    "total_budgeted": 0.0,
                    "total_actual": 0.0,
                    "total_variance": 0.0,
                    "total_items": 0,
                    "over_budget_count": 0,
                    "within_budget_count": 0,
                    "inactive_count": 0,
                    "unused_count": 0,
                },
                "loan_snapshot": {
                    "borrowed_balance": 0.0,
                    "lent_balance": 0.0,
                    "total_principal": 0.0,
                    "total_items": 0,
                    "active_items": 0,
                    "open_items": 0,
                    "settled_items": 0,
                },
                "top_income_categories": [],
                "top_expense_categories": [],
                "daily_cashflow": [],
                "budget_variances": [],
                "period_comparison": {
                    "current_period_month": date(2026, 4, 1),
                    "compare_period_month": date(2026, 3, 1),
                    "previous_period_month": date(2026, 3, 1),
                    "previous_income": 0.0,
                    "previous_expense": 0.0,
                    "previous_net_balance": 0.0,
                    "previous_transactions": 0,
                    "previous_budgeted": 0.0,
                    "previous_actual": 0.0,
                    "previous_variance": 0.0,
                    "income_delta": 0.0,
                    "expense_delta": 0.0,
                    "net_balance_delta": 0.0,
                    "transaction_delta": 0,
                    "budgeted_delta": 0.0,
                    "actual_delta": 0.0,
                    "variance_delta": 0.0,
                },
                "monthly_trend": [],
                "trend_summary": {
                    "months_covered": 0,
                    "first_period_month": None,
                    "last_period_month": None,
                    "total_income": 0.0,
                    "total_expense": 0.0,
                    "total_net_balance": 0.0,
                    "average_income": 0.0,
                    "average_expense": 0.0,
                    "average_net_balance": 0.0,
                    "best_period_month": None,
                    "best_net_balance": None,
                    "worst_period_month": None,
                    "worst_net_balance": None,
                    "net_balance_delta_vs_first": 0.0,
                },
                "horizon_comparison": {
                    "trend_months": 12,
                    "current_first_period_month": None,
                    "current_last_period_month": None,
                    "compare_first_period_month": None,
                    "compare_last_period_month": None,
                    "compare_months_covered": 0,
                    "compare_total_income": 0.0,
                    "compare_total_expense": 0.0,
                    "compare_total_net_balance": 0.0,
                    "compare_average_income": 0.0,
                    "compare_average_expense": 0.0,
                    "compare_average_net_balance": 0.0,
                    "total_income_delta_vs_compare": 0.0,
                    "total_expense_delta_vs_compare": 0.0,
                    "total_net_balance_delta_vs_compare": 0.0,
                    "average_net_balance_delta_vs_compare": 0.0,
                },
                "year_to_date_comparison": {
                    "current_first_period_month": None,
                    "current_last_period_month": None,
                    "current_months_covered": 0,
                    "current_total_income": 0.0,
                    "current_total_expense": 0.0,
                    "current_total_net_balance": 0.0,
                    "compare_first_period_month": None,
                    "compare_last_period_month": None,
                    "compare_months_covered": 0,
                    "compare_total_income": 0.0,
                    "compare_total_expense": 0.0,
                    "compare_total_net_balance": 0.0,
                    "total_income_delta_vs_compare": 0.0,
                    "total_expense_delta_vs_compare": 0.0,
                    "total_net_balance_delta_vs_compare": 0.0,
                },
                "custom_range_comparison": None,
            },
        ) as get_overview_mock:
            get_finance_reports_overview(
                period_month=date(2026, 4, 1),
                compare_period_month=date(2026, 2, 1),
                custom_compare_start_month=date(2025, 12, 1),
                custom_compare_end_month=date(2026, 2, 1),
                trend_months=12,
                movement_scope="favorites",
                analysis_scope="year_to_date",
                budget_category_scope="expense",
                budget_status_filter="over_budget",
                current_user=self._current_user(role="operator"),
                tenant_db=object(),
            )

        _, kwargs = get_overview_mock.call_args
        self.assertEqual(kwargs["compare_period_month"], date(2026, 2, 1))
        self.assertEqual(kwargs["custom_compare_start_month"], date(2025, 12, 1))
        self.assertEqual(kwargs["custom_compare_end_month"], date(2026, 2, 1))
        self.assertEqual(kwargs["trend_months"], 12)
        self.assertEqual(kwargs["movement_scope"], "favorites")
        self.assertEqual(kwargs["analysis_scope"], "year_to_date")
        self.assertEqual(kwargs["budget_category_scope"], "expense")
        self.assertEqual(kwargs["budget_status_filter"], "over_budget")

    def test_get_finance_planning_overview_returns_monthly_payload(self) -> None:
        overview = {
            "period_month": date(2026, 5, 1),
            "summary": {
                "period_month": date(2026, 5, 1),
                "total_income": 500.0,
                "total_expense": 120.0,
                "net_total": 380.0,
                "total_transactions": 2,
                "due_installments_count": 1,
                "pending_installments_count": 1,
                "expected_loan_cashflow": 220.0,
                "total_budgeted": 300.0,
                "total_actual": 120.0,
                "total_variance": 180.0,
            },
            "calendar_days": [
                {
                    "day": date(2026, 5, 3),
                    "income_total": 500.0,
                    "expense_total": 0.0,
                    "net_total": 500.0,
                    "transaction_count": 1,
                    "due_installments_count": 0,
                }
            ],
            "loan_due_items": [
                {
                    "loan_id": 4,
                    "loan_name": "Prestamo operativo",
                    "loan_type": "borrowed",
                    "installment_id": 21,
                    "installment_number": 1,
                    "due_date": date(2026, 5, 1),
                    "planned_amount": 220.0,
                    "paid_amount": 0.0,
                    "remaining_amount": 220.0,
                    "installment_status": "pending",
                }
            ],
            "budget_focus": [
                {
                    "category_id": 2,
                    "category_name": "General Expense",
                    "category_type": "expense",
                    "planned_amount": 300.0,
                    "actual_amount": 120.0,
                    "variance_amount": 180.0,
                    "budget_status": "within_budget",
                }
            ],
        }

        with patch(
            "app.apps.tenant_modules.finance.api.routes.planning_service.get_monthly_overview",
            return_value=overview,
        ):
            response = get_finance_planning_overview(
                period_month=date(2026, 5, 1),
                current_user=self._current_user(role="operator"),
                tenant_db=object(),
            )

        self.assertTrue(response.success)
        self.assertEqual(response.data.summary.total_income, 500.0)
        self.assertEqual(response.data.loan_due_items[0].loan_name, "Prestamo operativo")
        self.assertEqual(response.data.budget_focus[0].budget_status, "within_budget")

    def test_list_finance_budgets_returns_controlled_error_when_schema_is_incomplete(self) -> None:
        with patch(
            "app.apps.tenant_modules.finance.api.budgets.budget_service.list_budgets",
            side_effect=ProgrammingError(
                "SELECT * FROM finance_budgets",
                {},
                Exception("UndefinedTable: finance_budgets"),
            ),
        ):
            with self.assertRaises(HTTPException) as exc:
                list_finance_budgets(
                    period_month=date(2026, 3, 1),
                    include_inactive=True,
                    category_type=None,
                    budget_status=None,
                    current_user=self._current_user(role="operator"),
                    tenant_db=object(),
                )

        self.assertEqual(exc.exception.status_code, 400)
        self.assertIn("esquema finance del tenant está incompleto", exc.exception.detail)

    def test_get_finance_reports_overview_returns_controlled_error_when_schema_is_incomplete(self) -> None:
        with patch(
            "app.apps.tenant_modules.finance.api.routes.reports_service.get_overview",
            side_effect=ProgrammingError(
                "SELECT * FROM finance_budgets",
                {},
                Exception("UndefinedTable: finance_budgets"),
            ),
        ):
            with self.assertRaises(HTTPException) as exc:
                get_finance_reports_overview(
                    period_month=date(2026, 3, 1),
                    current_user=self._current_user(role="operator"),
                    tenant_db=object(),
                )

        self.assertEqual(exc.exception.status_code, 400)
        self.assertIn("esquema finance del tenant está incompleto", exc.exception.detail)


class TenantFinanceRouteOrderTestCase(unittest.TestCase):
    def _current_user(self, role: str = "manager") -> dict:
        return build_tenant_context(
            role=role,
            email="manager@empresa-bootstrap.local",
        )

    def test_exchange_rates_routes_are_registered_before_dynamic_currency_route(self) -> None:
        route_paths = [route.path for route in currencies_router.routes]
        self.assertLess(
            route_paths.index("/tenant/finance/currencies/exchange-rates"),
            route_paths.index("/tenant/finance/currencies/{currency_id}"),
        )

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
                paid_principal_amount=40.0,
                paid_interest_amount=10.0,
                paid_at=date(2026, 4, 1),
                reversal_reason_code=None,
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
        self.assertEqual(response.data.installment.paid_principal_amount, 40.0)
        self.assertEqual(response.data.installment.paid_interest_amount, 10.0)
        self.assertEqual(apply_payment_mock.call_args.kwargs["paid_amount"], 50.0)
        self.assertEqual(apply_payment_mock.call_args.kwargs["actor_user_id"], 1)
        self.assertEqual(
            apply_payment_mock.call_args.kwargs["allocation_mode"], "interest_first"
        )

    def test_reverse_finance_loan_installment_payment_returns_mutated_rows(self) -> None:
        loan_row = {
            "loan": SimpleNamespace(
                id=4,
                name="Credito equipo",
                loan_type="borrowed",
                counterparty_name="Banco Norte",
                currency_id=1,
                principal_amount=1200.0,
                current_balance=850.0,
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
            "paid_amount": 350.0,
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
                paid_amount=60.0,
                paid_principal_amount=50.0,
                paid_interest_amount=10.0,
                paid_at=date(2026, 4, 1),
                reversal_reason_code="operator_error",
                note="Reversa parcial",
                created_at="2026-03-27T16:00:00+00:00",
                updated_at="2026-03-27T16:00:00+00:00",
            ),
            "installment_status": "partial",
        }

        with patch(
            "app.apps.tenant_modules.finance.api.routes.loan_service.reverse_installment_payment",
            return_value=(loan_row, installment_row),
        ) as reverse_payment_mock:
            response = reverse_finance_loan_installment_payment(
                loan_id=4,
                installment_id=22,
                payload=FinanceLoanInstallmentReversalRequest(
                    reversed_amount=40.0,
                    reversal_reason_code="operator_error",
                    note="Reversa parcial",
                ),
                current_user=self._current_user(),
                tenant_db=object(),
            )

        self.assertTrue(response.success)
        self.assertEqual(response.data.loan.current_balance, 850.0)
        self.assertEqual(response.data.installment.installment_status, "partial")
        self.assertEqual(response.data.installment.paid_principal_amount, 50.0)
        self.assertEqual(response.data.installment.paid_interest_amount, 10.0)
        self.assertEqual(response.data.installment.reversal_reason_code, "operator_error")
        self.assertEqual(reverse_payment_mock.call_args.kwargs["reversed_amount"], 40.0)
        self.assertEqual(reverse_payment_mock.call_args.kwargs["actor_user_id"], 1)
        self.assertEqual(
            reverse_payment_mock.call_args.kwargs["reversal_reason_code"],
            "operator_error",
        )

    def test_apply_finance_loan_installment_payment_batch_returns_affected_rows(self) -> None:
        loan_row = {
            "loan": SimpleNamespace(
                id=4,
                name="Credito equipo",
                loan_type="borrowed",
                counterparty_name="Banco Norte",
                currency_id=1,
                principal_amount=1200.0,
                current_balance=700.0,
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
            "paid_amount": 500.0,
            "next_due_date": date(2026, 6, 1),
            "installments_total": 12,
            "installments_paid": 2,
        }

        with patch(
            "app.apps.tenant_modules.finance.api.routes.loan_service.apply_installment_payment_batch",
            return_value=(loan_row, [21, 22]),
        ) as apply_payment_batch_mock:
            response = apply_finance_loan_installment_payment_batch(
                loan_id=4,
                payload=FinanceLoanInstallmentPaymentBatchRequest(
                    installment_ids=[21, 22],
                    amount_mode="full_remaining",
                    paid_amount=None,
                    paid_at=None,
                    allocation_mode="interest_first",
                    note="Pago batch",
                ),
                current_user=self._current_user(),
                tenant_db=object(),
            )

        self.assertTrue(response.success)
        self.assertEqual(response.data.affected_count, 2)
        self.assertEqual(response.data.installment_ids, [21, 22])
        self.assertEqual(response.data.loan.current_balance, 700.0)
        self.assertEqual(apply_payment_batch_mock.call_args.kwargs["actor_user_id"], 1)
        self.assertEqual(apply_payment_batch_mock.call_args.kwargs["amount_mode"], "full_remaining")

    def test_reverse_finance_loan_installment_payment_batch_returns_affected_rows(self) -> None:
        loan_row = {
            "loan": SimpleNamespace(
                id=4,
                name="Credito equipo",
                loan_type="borrowed",
                counterparty_name="Banco Norte",
                currency_id=1,
                principal_amount=1200.0,
                current_balance=780.0,
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
            "paid_amount": 420.0,
            "next_due_date": date(2026, 6, 1),
            "installments_total": 12,
            "installments_paid": 1,
        }

        with patch(
            "app.apps.tenant_modules.finance.api.routes.loan_service.reverse_installment_payment_batch",
            return_value=(loan_row, [21, 22]),
        ) as reverse_payment_batch_mock:
            response = reverse_finance_loan_installment_payment_batch(
                loan_id=4,
                payload=FinanceLoanInstallmentReversalBatchRequest(
                    installment_ids=[21, 22],
                    amount_mode="fixed_per_installment",
                    reversed_amount=40.0,
                    reversal_reason_code="duplicate_payment",
                    note="Reversa batch",
                ),
                current_user=self._current_user(),
                tenant_db=object(),
            )

        self.assertTrue(response.success)
        self.assertEqual(response.data.affected_count, 2)
        self.assertEqual(response.data.installment_ids, [21, 22])
        self.assertEqual(response.data.loan.current_balance, 780.0)
        self.assertEqual(reverse_payment_batch_mock.call_args.kwargs["actor_user_id"], 1)
        self.assertEqual(
            reverse_payment_batch_mock.call_args.kwargs["amount_mode"],
            "fixed_per_installment",
        )
        self.assertEqual(
            reverse_payment_batch_mock.call_args.kwargs["reversal_reason_code"],
            "duplicate_payment",
        )

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
