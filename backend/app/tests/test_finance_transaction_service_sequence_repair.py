import unittest
from unittest.mock import MagicMock

from sqlalchemy.exc import IntegrityError

from app.apps.tenant_modules.finance.services.transaction_service import FinanceService


class FinanceServiceSequenceRepairTestCase(unittest.TestCase):
    def _build_pk_collision(self) -> IntegrityError:
        original = Exception("duplicate key value violates unique constraint finance_transactions_pkey")
        original.diag = type("Diag", (), {"constraint_name": "finance_transactions_pkey"})()
        return IntegrityError("INSERT", {}, original)

    def test_stage_system_transaction_repairs_sequence_on_pk_collision(self) -> None:
        service = FinanceService()
        tenant_db = MagicMock()
        tenant_db.flush.side_effect = [self._build_pk_collision(), None]

        service._build_transaction_values = MagicMock(
            return_value={
                "transaction_type": "income",
                "account_id": None,
                "target_account_id": None,
                "category_id": None,
                "beneficiary_id": None,
                "person_id": None,
                "project_id": None,
                "currency_id": 1,
                "loan_id": None,
                "amount": 65000.0,
                "amount_in_base_currency": 65000.0,
                "exchange_rate": 1,
                "discount_amount": 0,
                "amortization_months": None,
                "transaction_at": None,
                "alternative_date": None,
                "description": "Ingreso mantencion",
                "notes": None,
                "is_favorite": False,
                "favorite_flag": False,
                "is_reconciled": False,
                "reconciled_at": None,
                "is_voided": False,
                "voided_at": None,
                "void_reason": None,
                "voided_by_user_id": None,
            }
        )
        service._normalize_tag_ids = MagicMock(return_value=[])
        service.transaction_tag_repository.replace_for_transaction = MagicMock()
        service.transaction_audit_repository.build_event = MagicMock(return_value=MagicMock())
        payload = MagicMock(tag_ids=[])

        transaction = service.stage_system_transaction(
            tenant_db,
            payload,
            source_type="maintenance_work_order_income",
            source_id=212,
        )

        self.assertIsNone(transaction.id)
        self.assertEqual(2, tenant_db.flush.call_count)
        tenant_db.rollback.assert_called_once()
        tenant_db.execute.assert_called_once()
        self.assertEqual(3, tenant_db.add.call_count)


if __name__ == "__main__":
    unittest.main()
