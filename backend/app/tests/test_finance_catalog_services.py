import os
import unittest
from datetime import datetime, timezone

os.environ["DEBUG"] = "true"
os.environ["APP_ENV"] = "test"

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.apps.tenant_modules.finance.schemas import (
    FinanceAccountCreateRequest,
    FinanceCategoryCreateRequest,
    FinanceCurrencyCreateRequest,
)
from app.apps.tenant_modules.finance.services.account_service import FinanceAccountService
from app.apps.tenant_modules.finance.services.category_service import FinanceCategoryService
from app.apps.tenant_modules.finance.services.currency_service import FinanceCurrencyService
from app.common.db.tenant_base import TenantBase


class FinanceCatalogServicesTestCase(unittest.TestCase):
    def setUp(self) -> None:
        engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        TenantBase.metadata.create_all(bind=engine)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        self.db = SessionLocal()

        self.currency_service = FinanceCurrencyService()
        self.account_service = FinanceAccountService()
        self.category_service = FinanceCategoryService()

        self.base_currency = self.currency_service.create_currency(
            self.db,
            FinanceCurrencyCreateRequest(
                code="USD",
                name="US Dollar",
                symbol="$",
                decimal_places=2,
                is_base=True,
                is_active=True,
                sort_order=10,
            ),
        )

    def tearDown(self) -> None:
        self.db.close()

    def test_account_service_rejects_unknown_currency(self) -> None:
        with self.assertRaises(ValueError) as exc:
            self.account_service.create_account(
                self.db,
                FinanceAccountCreateRequest(
                    name="Caja",
                    code="cash-main",
                    account_type="cash",
                    currency_id=999,
                    opening_balance=0,
                    opening_balance_at=None,
                    icon=None,
                    is_favorite=False,
                    is_balance_hidden=False,
                    is_active=True,
                    sort_order=100,
                ),
            )

        self.assertIn("moneda", str(exc.exception).lower())

    def test_category_service_rejects_parent_with_different_type(self) -> None:
        parent = self.category_service.create_category(
            self.db,
            FinanceCategoryCreateRequest(
                name="Ventas",
                category_type="income",
                parent_category_id=None,
                icon=None,
                color=None,
                note=None,
                is_active=True,
                sort_order=100,
            ),
        )

        with self.assertRaises(ValueError) as exc:
            self.category_service.create_category(
                self.db,
                FinanceCategoryCreateRequest(
                    name="Arriendo",
                    category_type="expense",
                    parent_category_id=parent.id,
                    icon=None,
                    color=None,
                    note=None,
                    is_active=True,
                    sort_order=100,
                ),
            )

        self.assertIn("mismo tipo", str(exc.exception).lower())

    def test_currency_service_demotes_previous_base_currency(self) -> None:
        clp = self.currency_service.create_currency(
            self.db,
            FinanceCurrencyCreateRequest(
                code="CLP",
                name="Peso Chileno",
                symbol="$",
                decimal_places=0,
                is_base=True,
                is_active=True,
                sort_order=20,
            ),
        )

        self.db.refresh(self.base_currency)
        self.assertTrue(clp.is_base)
        self.assertFalse(self.base_currency.is_base)


if __name__ == "__main__":
    unittest.main()
