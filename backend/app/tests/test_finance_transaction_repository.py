import unittest
from unittest.mock import MagicMock

from sqlalchemy.exc import IntegrityError

from app.apps.tenant_modules.finance.repositories.transaction_repository import (
    FinanceTransactionRepository,
)


class FinanceTransactionRepositoryTestCase(unittest.TestCase):
    def setUp(self) -> None:
        self.repository = FinanceTransactionRepository()

    def _build_pk_collision(self) -> IntegrityError:
        original = Exception("duplicate key value violates unique constraint finance_transactions_pkey")
        original.diag = type("Diag", (), {"constraint_name": "finance_transactions_pkey"})()
        return IntegrityError("INSERT", {}, original)

    def test_save_repairs_sequence_on_primary_key_collision(self) -> None:
        tenant_db = MagicMock()
        tenant_db.commit.side_effect = [self._build_pk_collision(), None]
        transaction = MagicMock()
        transaction.id = 99

        saved = self.repository.save(tenant_db, transaction)

        self.assertIs(saved, transaction)
        self.assertIsNone(transaction.id)
        self.assertEqual(2, tenant_db.commit.call_count)
        tenant_db.rollback.assert_called_once()
        tenant_db.execute.assert_called_once()
        tenant_db.refresh.assert_called_once_with(transaction)

    def test_persist_repairs_sequence_on_primary_key_collision(self) -> None:
        tenant_db = MagicMock()
        tenant_db.commit.side_effect = [self._build_pk_collision(), None]
        transaction = MagicMock()
        transaction.id = 45

        saved = self.repository.persist(tenant_db, transaction)

        self.assertIs(saved, transaction)
        self.assertIsNone(transaction.id)
        self.assertEqual(2, tenant_db.commit.call_count)
        tenant_db.rollback.assert_called_once()
        tenant_db.execute.assert_called_once()
        tenant_db.refresh.assert_called_once_with(transaction)


if __name__ == "__main__":
    unittest.main()
