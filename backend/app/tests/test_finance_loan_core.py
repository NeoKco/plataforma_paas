import os
import unittest
from datetime import date

os.environ["DEBUG"] = "true"
os.environ["APP_ENV"] = "test"

from app.apps.tenant_modules.finance.models.currency import FinanceCurrency  # noqa: E402
from app.apps.tenant_modules.finance.schemas import FinanceLoanCreateRequest  # noqa: E402
from app.apps.tenant_modules.finance.services.loan_service import (  # noqa: E402
    FinanceLoanService,
)
from app.common.db.tenant_base import TenantBase  # noqa: E402
from app.tests.db_test_utils import build_sqlite_session  # noqa: E402


class FinanceLoanCoreTestCase(unittest.TestCase):
    def setUp(self) -> None:
        self.db, self.engine = build_sqlite_session(TenantBase)
        self.loan_service = FinanceLoanService()

    def tearDown(self) -> None:
        self.db.close()
        self.engine.dispose()

    def _seed_currency(self) -> FinanceCurrency:
        currency = FinanceCurrency(
            code="USD",
            name="USD",
            symbol="$",
            decimal_places=2,
            is_base=True,
            is_active=True,
            sort_order=10,
        )
        self.db.add(currency)
        self.db.commit()
        self.db.refresh(currency)
        return currency

    def test_loan_summary_groups_borrowed_and_lent_balances(self) -> None:
        currency = self._seed_currency()
        self.loan_service.create_loan(
            self.db,
            FinanceLoanCreateRequest(
                name="Crédito auto",
                loan_type="borrowed",
                counterparty_name="Banco Sur",
                currency_id=currency.id,
                principal_amount=1000.0,
                current_balance=650.0,
                interest_rate=8.5,
                start_date=date(2026, 3, 1),
                due_date=date(2027, 3, 1),
                note=None,
                is_active=True,
            ),
        )
        self.loan_service.create_loan(
            self.db,
            FinanceLoanCreateRequest(
                name="Préstamo socio",
                loan_type="lent",
                counterparty_name="Socio A",
                currency_id=currency.id,
                principal_amount=300.0,
                current_balance=120.0,
                interest_rate=None,
                start_date=date(2026, 2, 1),
                due_date=None,
                note=None,
                is_active=True,
            ),
        )

        rows, summary = self.loan_service.list_loans(self.db, include_inactive=True)

        self.assertEqual(len(rows), 2)
        self.assertEqual(summary["borrowed_balance"], 650.0)
        self.assertEqual(summary["lent_balance"], 120.0)
        self.assertEqual(summary["total_principal"], 1300.0)
        self.assertEqual(summary["active_items"], 2)
        self.assertEqual(rows[0]["currency_code"], "USD")

    def test_loan_filters_support_type_and_status(self) -> None:
        currency = self._seed_currency()
        self.loan_service.create_loan(
            self.db,
            FinanceLoanCreateRequest(
                name="Crédito activo",
                loan_type="borrowed",
                counterparty_name="Banco Uno",
                currency_id=currency.id,
                principal_amount=800.0,
                current_balance=400.0,
                interest_rate=4.2,
                start_date=date(2026, 1, 1),
                due_date=None,
                note=None,
                is_active=True,
            ),
        )
        self.loan_service.create_loan(
            self.db,
            FinanceLoanCreateRequest(
                name="Préstamo cerrado",
                loan_type="lent",
                counterparty_name="Cliente Dos",
                currency_id=currency.id,
                principal_amount=200.0,
                current_balance=0.0,
                interest_rate=None,
                start_date=date(2026, 1, 10),
                due_date=None,
                note=None,
                is_active=True,
            ),
        )

        open_rows, _summary = self.loan_service.list_loans(
            self.db,
            include_inactive=True,
            loan_status="open",
        )
        lent_rows, _summary = self.loan_service.list_loans(
            self.db,
            include_inactive=True,
            loan_type="lent",
        )

        self.assertEqual(len(open_rows), 1)
        self.assertEqual(open_rows[0]["loan_status"], "open")
        self.assertEqual(len(lent_rows), 1)
        self.assertEqual(lent_rows[0]["loan"].loan_type, "lent")

    def test_create_loan_generates_monthly_installments_and_detail(self) -> None:
        currency = self._seed_currency()
        loan = self.loan_service.create_loan(
            self.db,
            FinanceLoanCreateRequest(
                name="Crédito oficina",
                loan_type="borrowed",
                counterparty_name="Banco Tres",
                currency_id=currency.id,
                principal_amount=1200.0,
                current_balance=1200.0,
                interest_rate=12.0,
                installments_count=4,
                payment_frequency="monthly",
                start_date=date(2027, 3, 15),
                due_date=date(2027, 6, 15),
                note=None,
                is_active=True,
            ),
        )

        loan_row, installments = self.loan_service.get_loan_detail(self.db, loan.id)

        self.assertEqual(loan_row["installments_total"], 4)
        self.assertEqual(loan_row["installments_paid"], 0)
        self.assertEqual(loan_row["next_due_date"], date(2027, 3, 15))
        self.assertEqual(len(installments), 4)
        self.assertEqual(installments[0]["installment"].due_date, date(2027, 3, 15))
        self.assertEqual(installments[1]["installment"].due_date, date(2027, 4, 15))
        self.assertEqual(installments[0]["installment_status"], "pending")

    def test_apply_installment_payment_updates_installment_and_loan_balance(self) -> None:
        currency = self._seed_currency()
        loan = self.loan_service.create_loan(
            self.db,
            FinanceLoanCreateRequest(
                name="Credito laptop",
                loan_type="borrowed",
                counterparty_name="Banco Pago",
                currency_id=currency.id,
                principal_amount=1000.0,
                current_balance=1000.0,
                interest_rate=20.0,
                installments_count=5,
                payment_frequency="monthly",
                start_date=date(2027, 1, 10),
                due_date=date(2027, 5, 10),
                note=None,
                is_active=True,
            ),
        )

        loan_row, installments = self.loan_service.get_loan_detail(self.db, loan.id)
        installment = installments[0]["installment"]

        updated_loan_row, updated_installment_row = self.loan_service.apply_installment_payment(
            self.db,
            loan_id=loan.id,
            installment_id=installment.id,
            paid_amount=200.0,
            note="Pago inicial",
        )

        self.assertEqual(updated_installment_row["installment"].paid_amount, 200.0)
        self.assertEqual(updated_installment_row["installment"].paid_interest_amount, 40.0)
        self.assertEqual(updated_installment_row["installment"].paid_principal_amount, 160.0)
        self.assertEqual(updated_installment_row["installment_status"], "partial")
        self.assertEqual(updated_installment_row["installment"].note, "Pago inicial")
        self.assertEqual(updated_loan_row["loan"].current_balance, 840.0)
        self.assertEqual(updated_loan_row["installments_paid"], 0)

    def test_reverse_installment_payment_restores_installment_and_loan_balance(self) -> None:
        currency = self._seed_currency()
        loan = self.loan_service.create_loan(
            self.db,
            FinanceLoanCreateRequest(
                name="Credito maquinaria",
                loan_type="borrowed",
                counterparty_name="Banco Sur",
                currency_id=currency.id,
                principal_amount=900.0,
                current_balance=900.0,
                interest_rate=10.0,
                installments_count=3,
                payment_frequency="monthly",
                start_date=date(2027, 2, 1),
                due_date=date(2027, 4, 1),
                note=None,
                is_active=True,
            ),
        )
        _loan_row, installments = self.loan_service.get_loan_detail(self.db, loan.id)
        installment = installments[0]["installment"]

        self.loan_service.apply_installment_payment(
            self.db,
            loan_id=loan.id,
            installment_id=installment.id,
            paid_amount=150.0,
            note="Pago parcial",
        )

        updated_loan_row, updated_installment_row = self.loan_service.reverse_installment_payment(
            self.db,
            loan_id=loan.id,
            installment_id=installment.id,
            reversed_amount=50.0,
            note="Reversa parcial",
        )

        self.assertEqual(updated_installment_row["installment"].paid_amount, 100.0)
        self.assertEqual(updated_installment_row["installment"].paid_principal_amount, 70.0)
        self.assertEqual(updated_installment_row["installment"].paid_interest_amount, 30.0)
        self.assertEqual(updated_installment_row["installment"].note, "Reversa parcial")
        self.assertEqual(updated_installment_row["installment_status"], "partial")
        self.assertEqual(updated_loan_row["loan"].current_balance, 830.0)

    def test_apply_installment_payment_supports_principal_first_allocation(self) -> None:
        currency = self._seed_currency()
        loan = self.loan_service.create_loan(
            self.db,
            FinanceLoanCreateRequest(
                name="Credito capital primero",
                loan_type="borrowed",
                counterparty_name="Banco Mix",
                currency_id=currency.id,
                principal_amount=1000.0,
                current_balance=1000.0,
                interest_rate=20.0,
                installments_count=5,
                payment_frequency="monthly",
                start_date=date(2027, 1, 10),
                due_date=date(2027, 5, 10),
                note=None,
                is_active=True,
            ),
        )
        _loan_row, installments = self.loan_service.get_loan_detail(self.db, loan.id)
        installment = installments[0]["installment"]

        updated_loan_row, updated_installment_row = self.loan_service.apply_installment_payment(
            self.db,
            loan_id=loan.id,
            installment_id=installment.id,
            paid_amount=200.0,
            allocation_mode="principal_first",
            note="Pago capital",
        )

        self.assertEqual(updated_installment_row["installment"].paid_principal_amount, 200.0)
        self.assertEqual(updated_installment_row["installment"].paid_interest_amount, 0.0)
        self.assertEqual(updated_loan_row["loan"].current_balance, 800.0)


if __name__ == "__main__":
    unittest.main()
