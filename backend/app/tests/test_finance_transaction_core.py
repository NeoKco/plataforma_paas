import os
import unittest
from datetime import datetime, timezone

os.environ["DEBUG"] = "true"
os.environ["APP_ENV"] = "test"

from app.apps.tenant_modules.finance.models.account import FinanceAccount  # noqa: E402
from app.apps.tenant_modules.finance.models.currency import FinanceCurrency  # noqa: E402
from app.apps.tenant_modules.finance.schemas import (  # noqa: E402
    FinanceTransactionCreateRequest,
    FinanceTransactionUpdateRequest,
)
from app.apps.tenant_modules.finance.services.finance_service import FinanceService  # noqa: E402
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


if __name__ == "__main__":
    unittest.main()
