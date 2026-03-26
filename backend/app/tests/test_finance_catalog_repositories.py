import os
import unittest
from datetime import datetime, timezone

os.environ["DEBUG"] = "true"
os.environ["APP_ENV"] = "test"

from sqlalchemy import create_engine
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.apps.tenant_modules.finance.models import (
    FinanceAccount,
    FinanceBeneficiary,
    FinanceCategory,
    FinanceCurrency,
    FinanceExchangeRate,
    FinancePerson,
    FinanceProject,
    FinanceSetting,
    FinanceTag,
)
from app.apps.tenant_modules.finance.repositories.account_repository import (
    FinanceAccountRepository,
)
from app.apps.tenant_modules.finance.repositories.beneficiary_repository import (
    FinanceBeneficiaryRepository,
)
from app.apps.tenant_modules.finance.repositories.category_repository import (
    FinanceCategoryRepository,
)
from app.apps.tenant_modules.finance.repositories.currency_repository import (
    FinanceCurrencyRepository,
)
from app.apps.tenant_modules.finance.repositories.exchange_rate_repository import (
    FinanceExchangeRateRepository,
)
from app.apps.tenant_modules.finance.repositories.person_repository import (
    FinancePersonRepository,
)
from app.apps.tenant_modules.finance.repositories.project_repository import (
    FinanceProjectRepository,
)
from app.apps.tenant_modules.finance.repositories.settings_repository import (
    FinanceSettingsRepository,
)
from app.apps.tenant_modules.finance.repositories.tag_repository import (
    FinanceTagRepository,
)
from app.common.db.tenant_base import TenantBase


class FinanceCatalogRepositoriesTestCase(unittest.TestCase):
    def setUp(self) -> None:
        engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        TenantBase.metadata.create_all(bind=engine)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        self.db = SessionLocal()

        self.currency_repo = FinanceCurrencyRepository()
        self.account_repo = FinanceAccountRepository()
        self.category_repo = FinanceCategoryRepository()
        self.beneficiary_repo = FinanceBeneficiaryRepository()
        self.person_repo = FinancePersonRepository()
        self.project_repo = FinanceProjectRepository()
        self.tag_repo = FinanceTagRepository()
        self.exchange_rate_repo = FinanceExchangeRateRepository()
        self.settings_repo = FinanceSettingsRepository()

        self.base_currency = self.currency_repo.save(
            self.db,
            FinanceCurrency(
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

    def test_account_repository_supports_crud_basics(self) -> None:
        account = self.account_repo.save(
            self.db,
            FinanceAccount(
                name="Caja general",
                code="cash-main",
                account_type="cash",
                currency_id=self.base_currency.id,
                opening_balance=150.0,
            ),
        )

        self.assertIsNotNone(account.id)
        self.assertEqual(self.account_repo.get_by_id(self.db, account.id).name, "Caja general")
        self.assertEqual(self.account_repo.get_by_name(self.db, "Caja general").id, account.id)
        self.assertEqual(len(self.account_repo.list_all(self.db)), 1)

        self.account_repo.set_active(self.db, account, False)
        self.assertEqual(len(self.account_repo.list_all(self.db, include_inactive=False)), 0)

    def test_category_repository_enforces_unique_name_per_type(self) -> None:
        self.category_repo.save(
            self.db,
            FinanceCategory(name="Ventas", category_type="income"),
        )

        with self.assertRaises(IntegrityError):
            self.category_repo.save(
                self.db,
                FinanceCategory(name="Ventas", category_type="income"),
            )

        self.category_repo.save(
            self.db,
            FinanceCategory(name="Ventas", category_type="expense"),
        )
        self.assertEqual(len(self.category_repo.list_by_type(self.db, "income")), 1)
        self.assertEqual(len(self.category_repo.list_by_type(self.db, "expense")), 1)

    def test_simple_catalog_repositories_filter_active_rows(self) -> None:
        rows = [
            (self.beneficiary_repo, FinanceBeneficiary(name="Proveedor Uno")),
            (self.person_repo, FinancePerson(name="Felipe")),
            (self.project_repo, FinanceProject(name="Proyecto Norte", code="north")),
            (self.tag_repo, FinanceTag(name="Urgente")),
            (
                self.settings_repo,
                FinanceSetting(setting_key="base_currency_code", setting_value="USD"),
            ),
        ]

        for repository, model in rows:
            saved = repository.save(self.db, model)
            self.assertIsNotNone(saved.id)
            repository.set_active(self.db, saved, False)
            self.assertEqual(len(repository.list_all(self.db, include_inactive=False)), 0)

    def test_currency_repository_returns_base_currency_and_enforces_unique_code(self) -> None:
        self.assertEqual(self.currency_repo.get_base_currency(self.db).code, "USD")

        with self.assertRaises(IntegrityError):
            self.currency_repo.save(
                self.db,
                FinanceCurrency(
                    code="USD",
                    name="Dollar Duplicate",
                    symbol="$",
                    decimal_places=2,
                ),
            )

    def test_exchange_rate_repository_persists_unique_pair_and_timestamp(self) -> None:
        clp = self.currency_repo.save(
            self.db,
            FinanceCurrency(
                code="CLP",
                name="Peso Chileno",
                symbol="$",
                decimal_places=0,
                is_base=False,
            ),
        )
        effective_at = datetime(2026, 3, 26, 12, 0, tzinfo=timezone.utc)
        rate = self.exchange_rate_repo.save(
            self.db,
            FinanceExchangeRate(
                source_currency_id=clp.id,
                target_currency_id=self.base_currency.id,
                rate=0.001,
                effective_at=effective_at,
            ),
        )

        self.assertIsNotNone(rate.id)
        self.assertEqual(len(self.exchange_rate_repo.list_all(self.db)), 1)

        with self.assertRaises(IntegrityError):
            self.exchange_rate_repo.save(
                self.db,
                FinanceExchangeRate(
                    source_currency_id=clp.id,
                    target_currency_id=self.base_currency.id,
                    rate=0.002,
                    effective_at=effective_at,
                ),
            )


if __name__ == "__main__":
    unittest.main()
