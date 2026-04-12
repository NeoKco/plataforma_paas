import unittest

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

import app.apps.tenant_modules.finance.models  # noqa: F401
from app.apps.provisioning.services.tenant_db_bootstrap_service import (  # noqa: E402
    TenantDatabaseBootstrapService,
)
from app.apps.tenant_modules.finance.models.category import FinanceCategory  # noqa: E402
from app.common.db.tenant_base import TenantBase  # noqa: E402


class TenantDatabaseBootstrapServiceTests(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = create_engine("sqlite+pysqlite:///:memory:", future=True)
        TenantBase.metadata.create_all(self.engine)
        self.session_factory = sessionmaker(bind=self.engine)
        self.service = TenantDatabaseBootstrapService()

    def tearDown(self) -> None:
        TenantBase.metadata.drop_all(self.engine)
        self.engine.dispose()

    def _db(self) -> Session:
        return self.session_factory()

    def test_seed_finance_categories_uses_company_profile_for_empresa(self) -> None:
        db = self._db()
        try:
            self.service._seed_finance_categories(db, tenant_type="empresa")
            db.commit()

            names = {
                (item.name, item.category_type)
                for item in db.query(FinanceCategory).all()
            }

            self.assertIn(("Mantenciones y servicios", "income"), names)
            self.assertIn(("Costos de mantencion", "expense"), names)
            self.assertIn(("Transferencia interna", "transfer"), names)
            self.assertNotIn(("Mascotas", "expense"), names)
        finally:
            db.close()

    def test_seed_finance_categories_uses_home_profile_for_condominio(self) -> None:
        db = self._db()
        try:
            self.service._seed_finance_categories(db, tenant_type="condominio")
            db.commit()

            names = {
                (item.name, item.category_type)
                for item in db.query(FinanceCategory).all()
            }

            self.assertIn(("Sueldo", "income"), names)
            self.assertIn(("Mascotas", "expense"), names)
            self.assertIn(("Transferencia interna", "transfer"), names)
            self.assertNotIn(("Costos de mantencion", "expense"), names)
        finally:
            db.close()

    def test_seed_finance_categories_replaces_neutral_catalog_when_no_usage_exists(self) -> None:
        db = self._db()
        try:
            db.add(
                FinanceCategory(
                    name="General temporal",
                    category_type="expense",
                    is_active=True,
                    sort_order=100,
                )
            )
            db.commit()

            self.service._seed_finance_categories(db, tenant_type="empresa")
            db.commit()

            names = {
                (item.name, item.category_type)
                for item in db.query(FinanceCategory).all()
            }
            self.assertNotIn(("General temporal", "expense"), names)
            self.assertIn(("Mantenciones y servicios", "income"), names)
        finally:
            db.close()


if __name__ == "__main__":
    unittest.main()
