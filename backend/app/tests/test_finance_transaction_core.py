import json
import os
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

os.environ["DEBUG"] = "true"
os.environ["APP_ENV"] = "test"

from app.apps.tenant_modules.finance.models.account import FinanceAccount  # noqa: E402
from app.apps.tenant_modules.finance.models.currency import FinanceCurrency  # noqa: E402
from app.apps.tenant_modules.finance.models.transaction_attachment import (  # noqa: E402
    FinanceTransactionAttachment,
)
from app.apps.tenant_modules.finance.models.tag import FinanceTag  # noqa: E402
from app.common.config.settings import settings  # noqa: E402
from app.apps.tenant_modules.finance.schemas import (  # noqa: E402
    FinanceTransactionCreateRequest,
    FinanceTransactionUpdateRequest,
)
from app.apps.tenant_modules.finance.services.finance_service import FinanceService  # noqa: E402
from app.apps.tenant_modules.finance.services.transaction_service import (  # noqa: E402
    FinanceUsageLimitExceededError,
)
from app.common.db.tenant_base import TenantBase  # noqa: E402
from app.tests.db_test_utils import build_sqlite_session  # noqa: E402


class FinanceTransactionCoreTestCase(unittest.TestCase):
    def setUp(self) -> None:
        self.db, self.engine = build_sqlite_session(TenantBase)
        self.service = FinanceService()

    def tearDown(self) -> None:
        self.db.close()
        self.engine.dispose()

    def _seed_currency(self, *, code: str, is_base: bool, sort_order: int) -> FinanceCurrency:
        currency = FinanceCurrency(
            code=code,
            name=code,
            symbol=code,
            decimal_places=2,
            is_base=is_base,
            is_active=True,
            sort_order=sort_order,
        )
        self.db.add(currency)
        self.db.commit()
        self.db.refresh(currency)
        return currency

    def _seed_account(
        self,
        *,
        name: str,
        code: str,
        currency_id: int,
        opening_balance: float = 0,
        sort_order: int = 10,
    ) -> FinanceAccount:
        account = FinanceAccount(
            name=name,
            code=code,
            account_type="cash",
            currency_id=currency_id,
            opening_balance=opening_balance,
            is_active=True,
            sort_order=sort_order,
        )
        self.db.add(account)
        self.db.commit()
        self.db.refresh(account)
        return account

    def _seed_tag(self, *, name: str, sort_order: int = 10) -> FinanceTag:
        tag = FinanceTag(
            name=name,
            color=None,
            is_active=True,
            sort_order=sort_order,
        )
        self.db.add(tag)
        self.db.commit()
        self.db.refresh(tag)
        return tag

    def test_rejects_transfer_with_same_account(self) -> None:
        usd = self._seed_currency(code="USD", is_base=True, sort_order=10)
        caja = self._seed_account(
            name="Caja",
            code="CAJA",
            currency_id=usd.id,
            opening_balance=100.0,
        )

        with self.assertRaises(ValueError) as exc:
            self.service.create_transaction(
                tenant_db=self.db,
                payload=FinanceTransactionCreateRequest(
                    transaction_type="transfer",
                    account_id=caja.id,
                    target_account_id=caja.id,
                    currency_id=usd.id,
                    amount=10.0,
                    transaction_at=datetime.now(timezone.utc),
                    description="Transferencia inválida",
                ),
                created_by_user_id=1,
            )

        self.assertIn("cuentas distintas", str(exc.exception))

    def test_rejects_non_base_currency_without_exchange_rate(self) -> None:
        usd = self._seed_currency(code="USD", is_base=True, sort_order=10)
        clp = self._seed_currency(code="CLP", is_base=False, sort_order=20)
        caja_clp = self._seed_account(
            name="Caja CLP",
            code="CAJA_CLP",
            currency_id=clp.id,
            opening_balance=0.0,
        )
        self._seed_account(
            name="Caja USD",
            code="CAJA_USD",
            currency_id=usd.id,
            opening_balance=0.0,
            sort_order=20,
        )

        with self.assertRaises(ValueError) as exc:
            self.service.create_transaction(
                tenant_db=self.db,
                payload=FinanceTransactionCreateRequest(
                    transaction_type="income",
                    account_id=caja_clp.id,
                    currency_id=clp.id,
                    amount=10000.0,
                    transaction_at=datetime.now(timezone.utc),
                    description="Ingreso CLP sin tipo de cambio",
                ),
                created_by_user_id=1,
            )

        self.assertIn("exchange_rate", str(exc.exception))

    def test_creates_non_base_transaction_with_frozen_base_amount(self) -> None:
        self._seed_currency(code="USD", is_base=True, sort_order=10)
        clp = self._seed_currency(code="CLP", is_base=False, sort_order=20)
        caja_clp = self._seed_account(
            name="Caja CLP",
            code="CAJA_CLP",
            currency_id=clp.id,
            opening_balance=0.0,
        )

        transaction = self.service.create_transaction(
            tenant_db=self.db,
            payload=FinanceTransactionCreateRequest(
                transaction_type="income",
                account_id=caja_clp.id,
                currency_id=clp.id,
                amount=10000.0,
                exchange_rate=0.0011,
                transaction_at=datetime.now(timezone.utc),
                description="Ingreso CLP",
            ),
            created_by_user_id=1,
        )

        self.assertEqual(transaction.exchange_rate, 0.0011)
        self.assertAlmostEqual(transaction.amount_in_base_currency, 11.0, places=6)

    def test_create_transaction_rejects_when_entries_limit_is_reached(self) -> None:
        usd = self._seed_currency(code="USD", is_base=True, sort_order=10)
        caja = self._seed_account(
            name="Caja",
            code="CAJA",
            currency_id=usd.id,
            opening_balance=0.0,
        )

        self.service.create_transaction(
            tenant_db=self.db,
            payload=FinanceTransactionCreateRequest(
                transaction_type="expense",
                account_id=caja.id,
                currency_id=usd.id,
                amount=10.0,
                transaction_at=datetime.now(timezone.utc),
                description="Base",
            ),
            created_by_user_id=1,
        )

        with self.assertRaises(FinanceUsageLimitExceededError) as exc:
            self.service.create_transaction(
                tenant_db=self.db,
                payload=FinanceTransactionCreateRequest(
                    transaction_type="expense",
                    account_id=caja.id,
                    currency_id=usd.id,
                    amount=20.0,
                    transaction_at=datetime.now(timezone.utc),
                    description="Bloqueada",
                ),
                created_by_user_id=1,
                max_entries=1,
            )

        self.assertIn("finance.entries", str(exc.exception))

    def test_create_transaction_rejects_when_monthly_entries_limit_is_reached(self) -> None:
        usd = self._seed_currency(code="USD", is_base=True, sort_order=10)
        caja = self._seed_account(
            name="Caja",
            code="CAJA",
            currency_id=usd.id,
            opening_balance=0.0,
        )

        self.service.create_transaction(
            tenant_db=self.db,
            payload=FinanceTransactionCreateRequest(
                transaction_type="expense",
                account_id=caja.id,
                currency_id=usd.id,
                amount=10.0,
                transaction_at=datetime.now(timezone.utc),
                description="Base mensual",
            ),
            created_by_user_id=1,
        )

        with self.assertRaises(FinanceUsageLimitExceededError) as exc:
            self.service.create_transaction(
                tenant_db=self.db,
                payload=FinanceTransactionCreateRequest(
                    transaction_type="expense",
                    account_id=caja.id,
                    currency_id=usd.id,
                    amount=20.0,
                    transaction_at=datetime.now(timezone.utc),
                    description="Bloqueada mensual",
                ),
                created_by_user_id=1,
                max_monthly_entries=1,
            )

        self.assertIn("finance.entries.monthly", str(exc.exception))

    def test_create_transaction_rejects_when_monthly_income_limit_is_reached(self) -> None:
        usd = self._seed_currency(code="USD", is_base=True, sort_order=10)
        caja = self._seed_account(
            name="Caja",
            code="CAJA",
            currency_id=usd.id,
            opening_balance=0.0,
        )

        self.service.create_transaction(
            tenant_db=self.db,
            payload=FinanceTransactionCreateRequest(
                transaction_type="income",
                account_id=caja.id,
                currency_id=usd.id,
                amount=10.0,
                transaction_at=datetime.now(timezone.utc),
                description="Ingreso base mensual",
            ),
            created_by_user_id=1,
        )

        with self.assertRaises(FinanceUsageLimitExceededError) as exc:
            self.service.create_transaction(
                tenant_db=self.db,
                payload=FinanceTransactionCreateRequest(
                    transaction_type="income",
                    account_id=caja.id,
                    currency_id=usd.id,
                    amount=20.0,
                    transaction_at=datetime.now(timezone.utc),
                    description="Ingreso bloqueado mensual",
                ),
                created_by_user_id=1,
                max_monthly_entries_by_type={"income": 1},
            )

        self.assertIn("finance.entries.monthly.income", str(exc.exception))

    def test_create_transaction_rejects_when_monthly_expense_limit_is_reached(self) -> None:
        usd = self._seed_currency(code="USD", is_base=True, sort_order=10)
        caja = self._seed_account(
            name="Caja",
            code="CAJA",
            currency_id=usd.id,
            opening_balance=0.0,
        )

        self.service.create_transaction(
            tenant_db=self.db,
            payload=FinanceTransactionCreateRequest(
                transaction_type="expense",
                account_id=caja.id,
                currency_id=usd.id,
                amount=10.0,
                transaction_at=datetime.now(timezone.utc),
                description="Egreso base mensual",
            ),
            created_by_user_id=1,
        )

        with self.assertRaises(FinanceUsageLimitExceededError) as exc:
            self.service.create_transaction(
                tenant_db=self.db,
                payload=FinanceTransactionCreateRequest(
                    transaction_type="expense",
                    account_id=caja.id,
                    currency_id=usd.id,
                    amount=20.0,
                    transaction_at=datetime.now(timezone.utc),
                    description="Egreso bloqueado mensual",
                ),
                created_by_user_id=1,
                max_monthly_entries_by_type={"expense": 1},
            )

        self.assertIn("finance.entries.monthly.expense", str(exc.exception))

    def test_create_transaction_prioritizes_total_limit_before_monthly_limit(self) -> None:
        usd = self._seed_currency(code="USD", is_base=True, sort_order=10)
        caja = self._seed_account(
            name="Caja",
            code="CAJA",
            currency_id=usd.id,
            opening_balance=0.0,
        )

        self.service.create_transaction(
            tenant_db=self.db,
            payload=FinanceTransactionCreateRequest(
                transaction_type="expense",
                account_id=caja.id,
                currency_id=usd.id,
                amount=10.0,
                transaction_at=datetime.now(timezone.utc),
                description="Base precedencia",
            ),
            created_by_user_id=1,
        )

        with self.assertRaises(FinanceUsageLimitExceededError) as exc:
            self.service.create_transaction(
                tenant_db=self.db,
                payload=FinanceTransactionCreateRequest(
                    transaction_type="expense",
                    account_id=caja.id,
                    currency_id=usd.id,
                    amount=20.0,
                    transaction_at=datetime.now(timezone.utc),
                    description="Bloqueada precedencia",
                ),
                created_by_user_id=1,
                max_entries=1,
                max_monthly_entries=1,
                max_monthly_entries_by_type={"expense": 1},
            )

        self.assertIn("finance.entries", str(exc.exception))
        self.assertNotIn("finance.entries.monthly", str(exc.exception))

    def test_create_transaction_allows_new_entry_when_only_previous_month_consumed_quota(self) -> None:
        usd = self._seed_currency(code="USD", is_base=True, sort_order=10)
        caja = self._seed_account(
            name="Caja",
            code="CAJA",
            currency_id=usd.id,
            opening_balance=0.0,
        )

        previous_month_transaction = self.service.create_transaction(
            tenant_db=self.db,
            payload=FinanceTransactionCreateRequest(
                transaction_type="expense",
                account_id=caja.id,
                currency_id=usd.id,
                amount=10.0,
                transaction_at=datetime.now(timezone.utc),
                description="Base mes anterior",
            ),
            created_by_user_id=1,
        )
        previous_month_transaction.created_at = self.service._get_current_month_start() - timedelta(
            days=1
        )
        self.db.add(previous_month_transaction)
        self.db.commit()

        allowed_transaction = self.service.create_transaction(
            tenant_db=self.db,
            payload=FinanceTransactionCreateRequest(
                transaction_type="expense",
                account_id=caja.id,
                currency_id=usd.id,
                amount=20.0,
                transaction_at=datetime.now(timezone.utc),
                description="Permitida mes actual",
            ),
            created_by_user_id=1,
            max_monthly_entries=1,
        )

        self.assertEqual(allowed_transaction.description, "Permitida mes actual")

    def test_create_transaction_allows_new_entry_when_only_previous_month_type_quota_was_used(self) -> None:
        usd = self._seed_currency(code="USD", is_base=True, sort_order=10)
        caja = self._seed_account(
            name="Caja",
            code="CAJA",
            currency_id=usd.id,
            opening_balance=0.0,
        )

        previous_month_income = self.service.create_transaction(
            tenant_db=self.db,
            payload=FinanceTransactionCreateRequest(
                transaction_type="income",
                account_id=caja.id,
                currency_id=usd.id,
                amount=10.0,
                transaction_at=datetime.now(timezone.utc),
                description="Ingreso mes anterior",
            ),
            created_by_user_id=1,
        )
        previous_month_income.created_at = self.service._get_current_month_start() - timedelta(
            days=1
        )
        self.db.add(previous_month_income)
        self.db.commit()

        allowed_transaction = self.service.create_transaction(
            tenant_db=self.db,
            payload=FinanceTransactionCreateRequest(
                transaction_type="income",
                account_id=caja.id,
                currency_id=usd.id,
                amount=20.0,
                transaction_at=datetime.now(timezone.utc),
                description="Ingreso permitido mes actual",
            ),
            created_by_user_id=1,
            max_monthly_entries_by_type={"income": 1},
        )

        self.assertEqual(allowed_transaction.description, "Ingreso permitido mes actual")

    def test_account_balances_remain_consistent_with_income_expense_and_transfer(self) -> None:
        usd = self._seed_currency(code="USD", is_base=True, sort_order=10)
        caja = self._seed_account(
            name="Caja",
            code="CAJA",
            currency_id=usd.id,
            opening_balance=100.0,
        )
        banco = self._seed_account(
            name="Banco",
            code="BANCO",
            currency_id=usd.id,
            opening_balance=50.0,
            sort_order=20,
        )

        self.service.create_transaction(
            tenant_db=self.db,
            payload=FinanceTransactionCreateRequest(
                transaction_type="income",
                account_id=caja.id,
                currency_id=usd.id,
                amount=200.0,
                transaction_at=datetime.now(timezone.utc),
                description="Cobro",
            ),
            created_by_user_id=1,
        )
        self.service.create_transaction(
            tenant_db=self.db,
            payload=FinanceTransactionCreateRequest(
                transaction_type="expense",
                account_id=caja.id,
                currency_id=usd.id,
                amount=20.0,
                transaction_at=datetime.now(timezone.utc),
                description="Gasto",
            ),
            created_by_user_id=1,
        )
        self.service.create_transaction(
            tenant_db=self.db,
            payload=FinanceTransactionCreateRequest(
                transaction_type="transfer",
                account_id=caja.id,
                target_account_id=banco.id,
                currency_id=usd.id,
                amount=30.0,
                transaction_at=datetime.now(timezone.utc),
                description="Pase a banco",
            ),
            created_by_user_id=1,
        )

        balances = self.service.get_account_balances(self.db)

        self.assertEqual(balances[caja.id], 250.0)
        self.assertEqual(balances[banco.id], 80.0)
        self.assertEqual(sum(balances.values()), 330.0)

    def test_can_filter_transactions_and_toggle_operational_flags(self) -> None:
        usd = self._seed_currency(code="USD", is_base=True, sort_order=10)
        caja = self._seed_account(
            name="Caja",
            code="CAJA",
            currency_id=usd.id,
            opening_balance=0.0,
        )

        created = self.service.create_transaction(
            tenant_db=self.db,
            payload=FinanceTransactionCreateRequest(
                transaction_type="expense",
                account_id=caja.id,
                currency_id=usd.id,
                amount=45.0,
                transaction_at=datetime.now(timezone.utc),
                description="Pago de limpieza",
                notes="mantencion mensual",
            ),
            created_by_user_id=1,
        )

        filtered = self.service.list_transactions_filtered(
            self.db,
            transaction_type="expense",
            account_id=caja.id,
            is_reconciled=False,
            search="limpieza",
        )
        self.assertEqual(len(filtered), 1)
        self.assertEqual(filtered[0].id, created.id)

        favorited = self.service.update_transaction_favorite(
            self.db,
            created.id,
            is_favorite=True,
            actor_user_id=2,
        )
        reconciled = self.service.update_transaction_reconciliation(
            self.db,
            created.id,
            is_reconciled=True,
            actor_user_id=3,
        )

        self.assertTrue(favorited.is_favorite)
        self.assertTrue(reconciled.is_reconciled)
        self.assertIsNotNone(reconciled.reconciled_at)

    def test_can_update_transaction_and_recalculate_amounts(self) -> None:
        usd = self._seed_currency(code="USD", is_base=True, sort_order=10)
        clp = self._seed_currency(code="CLP", is_base=False, sort_order=20)
        caja_usd = self._seed_account(
            name="Caja USD",
            code="CAJA_USD",
            currency_id=usd.id,
            opening_balance=0.0,
        )
        caja_clp = self._seed_account(
            name="Caja CLP",
            code="CAJA_CLP",
            currency_id=clp.id,
            opening_balance=0.0,
            sort_order=20,
        )

        created = self.service.create_transaction(
            tenant_db=self.db,
            payload=FinanceTransactionCreateRequest(
                transaction_type="income",
                account_id=caja_usd.id,
                currency_id=usd.id,
                amount=100.0,
                transaction_at=datetime.now(timezone.utc),
                description="Cobro inicial",
            ),
            created_by_user_id=1,
        )

        updated = self.service.update_transaction(
            tenant_db=self.db,
            transaction_id=created.id,
            payload=FinanceTransactionUpdateRequest(
                transaction_type="expense",
                account_id=caja_clp.id,
                target_account_id=None,
                category_id=None,
                beneficiary_id=None,
                person_id=None,
                project_id=None,
                currency_id=clp.id,
                loan_id=None,
                amount=10000.0,
                discount_amount=0.0,
                exchange_rate=0.001,
                amortization_months=None,
                transaction_at=datetime.now(timezone.utc),
                alternative_date=None,
                description="Pago actualizado",
                notes="ajuste",
                is_favorite=True,
                is_reconciled=True,
                tag_ids=None,
            ),
            actor_user_id=2,
        )

        self.assertEqual(updated.transaction_type, "expense")
        self.assertEqual(updated.account_id, caja_clp.id)
        self.assertAlmostEqual(updated.amount_in_base_currency, 10.0, places=6)
        self.assertEqual(updated.updated_by_user_id, 2)
        self.assertTrue(updated.is_favorite)
        self.assertTrue(updated.is_reconciled)

    def test_can_filter_by_favorite_and_update_batch_flags(self) -> None:
        usd = self._seed_currency(code="USD", is_base=True, sort_order=10)
        caja = self._seed_account(
            name="Caja",
            code="CAJA",
            currency_id=usd.id,
            opening_balance=0.0,
        )

        first = self.service.create_transaction(
            tenant_db=self.db,
            payload=FinanceTransactionCreateRequest(
                transaction_type="expense",
                account_id=caja.id,
                currency_id=usd.id,
                amount=15.0,
                transaction_at=datetime.now(timezone.utc),
                description="Pago 1",
            ),
            created_by_user_id=1,
        )
        second = self.service.create_transaction(
            tenant_db=self.db,
            payload=FinanceTransactionCreateRequest(
                transaction_type="expense",
                account_id=caja.id,
                currency_id=usd.id,
                amount=25.0,
                transaction_at=datetime.now(timezone.utc),
                description="Pago 2",
            ),
            created_by_user_id=1,
        )

        updated_favorites = self.service.update_transactions_favorite_batch(
            self.db,
            [first.id, second.id],
            is_favorite=True,
            actor_user_id=7,
        )
        updated_reconciliation = self.service.update_transactions_reconciliation_batch(
            self.db,
            [first.id, second.id],
            is_reconciled=True,
            actor_user_id=8,
        )
        favorites = self.service.list_transactions_filtered(self.db, is_favorite=True)

        self.assertEqual(len(updated_favorites), 2)
        self.assertEqual(len(updated_reconciliation), 2)
        self.assertEqual(len(favorites), 2)
        self.assertTrue(all(transaction.is_favorite for transaction in favorites))
        self.assertTrue(all(transaction.is_reconciled for transaction in favorites))

    def test_reconciliation_audit_persists_reason_code(self) -> None:
        usd = self._seed_currency(code="USD", is_base=True, sort_order=10)
        caja = self._seed_account(
            name="Caja",
            code="CAJA",
            currency_id=usd.id,
            opening_balance=0.0,
        )

        created = self.service.create_transaction(
            tenant_db=self.db,
            payload=FinanceTransactionCreateRequest(
                transaction_type="expense",
                account_id=caja.id,
                currency_id=usd.id,
                amount=35.0,
                transaction_at=datetime.now(timezone.utc),
                description="Pago conciliable",
            ),
            created_by_user_id=1,
        )

        self.service.update_transaction_reconciliation(
            self.db,
            created.id,
            is_reconciled=True,
            reason_code="bank_statement_match",
            note="match diario",
            actor_user_id=3,
        )

        _transaction, audit_events, _attachments = self.service.get_transaction_detail(self.db, created.id)
        reconciliation_event = next(
            event
            for event in audit_events
            if event.event_type == "transaction.reconciliation.updated"
        )
        payload = json.loads(reconciliation_event.payload_json)

        self.assertEqual(payload["reason_code"], "bank_statement_match")
        self.assertEqual(payload["note"], "match diario")

    def test_can_filter_transactions_by_tag(self) -> None:
        usd = self._seed_currency(code="USD", is_base=True, sort_order=10)
        caja = self._seed_account(
            name="Caja",
            code="CAJA",
            currency_id=usd.id,
            opening_balance=0.0,
        )
        urgent = self._seed_tag(name="Urgente", sort_order=10)
        taxes = self._seed_tag(name="Impuestos", sort_order=20)

        tagged = self.service.create_transaction(
            tenant_db=self.db,
            payload=FinanceTransactionCreateRequest(
                transaction_type="expense",
                account_id=caja.id,
                currency_id=usd.id,
                amount=90.0,
                transaction_at=datetime.now(timezone.utc),
                description="Pago con tag",
                tag_ids=[urgent.id],
            ),
            created_by_user_id=1,
        )
        self.service.create_transaction(
            tenant_db=self.db,
            payload=FinanceTransactionCreateRequest(
                transaction_type="expense",
                account_id=caja.id,
                currency_id=usd.id,
                amount=45.0,
                transaction_at=datetime.now(timezone.utc),
                description="Pago con otro tag",
                tag_ids=[taxes.id],
            ),
            created_by_user_id=1,
        )

        filtered = self.service.list_transactions_filtered(self.db, tag_id=urgent.id)

        self.assertEqual(len(filtered), 1)
        self.assertEqual(filtered[0].id, tagged.id)
        self.assertEqual(filtered[0].tag_ids, [urgent.id])

    def test_persists_transaction_tag_ids_on_create_and_update(self) -> None:
        usd = self._seed_currency(code="USD", is_base=True, sort_order=10)
        caja = self._seed_account(
            name="Caja",
            code="CAJA",
            currency_id=usd.id,
            opening_balance=0.0,
        )
        urgent = self._seed_tag(name="Urgente", sort_order=10)
        taxes = self._seed_tag(name="Impuestos", sort_order=20)

        created = self.service.create_transaction(
            tenant_db=self.db,
            payload=FinanceTransactionCreateRequest(
                transaction_type="expense",
                account_id=caja.id,
                target_account_id=None,
                category_id=None,
                beneficiary_id=None,
                person_id=None,
                project_id=None,
                currency_id=usd.id,
                loan_id=None,
                amount=90.0,
                discount_amount=0.0,
                exchange_rate=1.0,
                amortization_months=None,
                transaction_at=datetime.now(timezone.utc),
                alternative_date=None,
                description="Pago con etiquetas",
                notes=None,
                is_favorite=False,
                is_reconciled=False,
                tag_ids=[urgent.id, taxes.id],
            ),
            created_by_user_id=1,
        )
        self.assertEqual(created.tag_ids, [urgent.id, taxes.id])

        updated = self.service.update_transaction(
            tenant_db=self.db,
            transaction_id=created.id,
            payload=FinanceTransactionUpdateRequest(
                transaction_type="expense",
                account_id=caja.id,
                target_account_id=None,
                category_id=None,
                beneficiary_id=None,
                person_id=None,
                project_id=None,
                currency_id=usd.id,
                loan_id=None,
                amount=95.0,
                discount_amount=0.0,
                exchange_rate=1.0,
                amortization_months=None,
                transaction_at=datetime.now(timezone.utc),
                alternative_date=None,
                description="Pago con etiquetas actualizado",
                notes=None,
                is_favorite=False,
                is_reconciled=False,
                tag_ids=[taxes.id],
            ),
            actor_user_id=2,
        )
        self.assertEqual(updated.tag_ids, [taxes.id])

        detail_transaction, _, _attachments = self.service.get_transaction_detail(self.db, created.id)
        self.assertEqual(detail_transaction.tag_ids, [taxes.id])

    def test_can_create_and_delete_transaction_attachment(self) -> None:
        usd = self._seed_currency(code="USD", is_base=True, sort_order=10)
        caja = self._seed_account(
            name="Caja",
            code="CAJA",
            currency_id=usd.id,
            opening_balance=0.0,
        )
        created = self.service.create_transaction(
            tenant_db=self.db,
            payload=FinanceTransactionCreateRequest(
                transaction_type="expense",
                account_id=caja.id,
                currency_id=usd.id,
                amount=45.0,
                transaction_at=datetime.now(timezone.utc),
                description="Compra con boleta",
            ),
            created_by_user_id=1,
        )

        original_dir = settings.FINANCE_ATTACHMENTS_DIR
        try:
            with tempfile.TemporaryDirectory() as temp_dir:
                settings.FINANCE_ATTACHMENTS_DIR = temp_dir
                attachment = self.service.create_transaction_attachment(
                    self.db,
                    created.id,
                    file_name="boleta.webp",
                    content_type="image/webp",
                    content_bytes=b"fake-image-content",
                    notes="boleta principal",
                    actor_user_id=9,
                )

                detail_transaction, audit_events, attachments = self.service.get_transaction_detail(
                    self.db, created.id
                )
                self.assertEqual(detail_transaction.id, created.id)
                self.assertEqual(len(attachments), 1)
                self.assertEqual(attachments[0].file_name, "boleta.webp")
                self.assertTrue(
                    any(event.event_type == "transaction.attachment.created" for event in audit_events)
                )
                _loaded_attachment, attachment_path = self.service.get_transaction_attachment(
                    self.db,
                    created.id,
                    attachment.id,
                )
                self.assertTrue(attachment_path.exists())

                deleted = self.service.delete_transaction_attachment(
                    self.db,
                    created.id,
                    attachment.id,
                    actor_user_id=10,
                )
                self.assertEqual(deleted.id, attachment.id)
                self.assertFalse(attachment_path.exists())
        finally:
            settings.FINANCE_ATTACHMENTS_DIR = original_dir

    def test_can_resolve_and_delete_legacy_transaction_attachment(self) -> None:
        usd = self._seed_currency(code="USD", is_base=True, sort_order=10)
        caja = self._seed_account(
            name="Caja",
            code="CAJA",
            currency_id=usd.id,
            opening_balance=0.0,
        )
        created = self.service.create_transaction(
            tenant_db=self.db,
            payload=FinanceTransactionCreateRequest(
                transaction_type="expense",
                account_id=caja.id,
                currency_id=usd.id,
                amount=60.0,
                transaction_at=datetime.now(timezone.utc),
                description="Compra con adjunto legacy",
            ),
            created_by_user_id=1,
        )

        original_dir = settings.FINANCE_ATTACHMENTS_DIR
        original_base_dir = settings.BASE_DIR
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = tempfile.TemporaryDirectory()
            try:
                settings.FINANCE_ATTACHMENTS_DIR = temp_dir
                settings.BASE_DIR = temp_path.name
                legacy_root = (
                    Path(settings.BASE_DIR)
                    / "backend"
                    / "app"
                    / "apps"
                    / "tenant_modules"
                    / "finance"
                    / "storage"
                    / "attachments"
                )
                storage_key = f"transaction_{created.id}/legacy.pdf"
                legacy_file_path = legacy_root / storage_key
                legacy_file_path.parent.mkdir(parents=True, exist_ok=True)
                legacy_file_path.write_bytes(b"legacy-pdf")

                attachment = self.service.transaction_attachment_repository.save(
                    self.db,
                    FinanceTransactionAttachment(
                        transaction_id=created.id,
                        file_name="legacy.pdf",
                        storage_key=storage_key,
                        content_type="application/pdf",
                        file_size=10,
                        notes="migrated",
                        uploaded_by_user_id=8,
                    ),
                )

                _loaded_attachment, resolved_path = self.service.get_transaction_attachment(
                    self.db,
                    created.id,
                    attachment.id,
                )
                self.assertEqual(resolved_path, legacy_file_path)
                self.assertTrue(resolved_path.exists())

                deleted = self.service.delete_transaction_attachment(
                    self.db,
                    created.id,
                    attachment.id,
                    actor_user_id=9,
                )
                self.assertEqual(deleted.id, attachment.id)
                self.assertFalse(legacy_file_path.exists())
            finally:
                temp_path.cleanup()
                settings.FINANCE_ATTACHMENTS_DIR = original_dir
                settings.BASE_DIR = original_base_dir

    def test_can_void_transaction_and_exclude_it_from_active_reads(self) -> None:
        usd = self._seed_currency(code="USD", is_base=True, sort_order=10)
        caja = self._seed_account(
            name="Caja",
            code="CAJA",
            currency_id=usd.id,
            opening_balance=100.0,
        )

        created = self.service.create_transaction(
            tenant_db=self.db,
            payload=FinanceTransactionCreateRequest(
                transaction_type="expense",
                account_id=caja.id,
                currency_id=usd.id,
                amount=20.0,
                transaction_at=datetime.now(timezone.utc),
                description="Gasto a anular",
            ),
            created_by_user_id=1,
        )

        voided = self.service.void_transaction(
            self.db,
            created.id,
            reason="carga duplicada",
            actor_user_id=9,
        )

        self.assertTrue(voided.is_voided)
        self.assertEqual(voided.void_reason, "carga duplicada")
        self.assertEqual(voided.voided_by_user_id, 9)
        self.assertEqual(self.service.list_transactions(self.db), [])

        balances = self.service.get_account_balances(self.db)
        self.assertEqual(balances[caja.id], 100.0)

        detail_transaction, audit_events, _attachments = self.service.get_transaction_detail(
            self.db, created.id
        )
        self.assertTrue(detail_transaction.is_voided)
        self.assertTrue(any(event.event_type == "transaction.voided" for event in audit_events))

    def test_rejects_void_for_loan_derived_transactions(self) -> None:
        usd = self._seed_currency(code="USD", is_base=True, sort_order=10)
        caja = self._seed_account(
            name="Caja",
            code="CAJA",
            currency_id=usd.id,
            opening_balance=0.0,
        )

        created = self.service.create_transaction(
            tenant_db=self.db,
            payload=FinanceTransactionCreateRequest(
                transaction_type="expense",
                account_id=caja.id,
                currency_id=usd.id,
                amount=25.0,
                transaction_at=datetime.now(timezone.utc),
                description="Pago derivado",
            ),
            created_by_user_id=1,
            source_type="loan_installment_payment",
            source_id=99,
        )

        with self.assertRaises(ValueError) as exc:
            self.service.void_transaction(
                self.db,
                created.id,
                reason="error",
                actor_user_id=7,
            )

        self.assertIn("Préstamos", str(exc.exception))

    def test_rejects_unknown_tag_ids(self) -> None:
        usd = self._seed_currency(code="USD", is_base=True, sort_order=10)
        caja = self._seed_account(
            name="Caja",
            code="CAJA",
            currency_id=usd.id,
            opening_balance=0.0,
        )

        with self.assertRaises(ValueError) as exc:
            self.service.create_transaction(
                tenant_db=self.db,
                payload=FinanceTransactionCreateRequest(
                    transaction_type="expense",
                    account_id=caja.id,
                    target_account_id=None,
                    category_id=None,
                    beneficiary_id=None,
                    person_id=None,
                    project_id=None,
                    currency_id=usd.id,
                    loan_id=None,
                    amount=12.0,
                    discount_amount=0.0,
                    exchange_rate=1.0,
                    amortization_months=None,
                    transaction_at=datetime.now(timezone.utc),
                    alternative_date=None,
                    description="Pago invalido",
                    notes=None,
                    is_favorite=False,
                    is_reconciled=False,
                    tag_ids=[9999],
                ),
                created_by_user_id=1,
            )

        self.assertIn("etiquetas", str(exc.exception))


if __name__ == "__main__":
    unittest.main()
