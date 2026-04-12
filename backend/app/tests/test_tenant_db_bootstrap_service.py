import unittest

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

import app.apps.tenant_modules.business_core.models  # noqa: F401
import app.apps.tenant_modules.core.models  # noqa: F401
import app.apps.tenant_modules.finance.models  # noqa: F401
from app.apps.provisioning.services.tenant_db_bootstrap_service import (  # noqa: E402
    TenantDatabaseBootstrapService,
)
from app.apps.tenant_modules.business_core.models import (  # noqa: E402
    BusinessFunctionProfile,
    BusinessTaskType,
    BusinessTaskTypeFunctionProfile,
)
from app.apps.tenant_modules.finance.models.category import FinanceCategory  # noqa: E402
from app.apps.tenant_modules.finance.models.currency import FinanceCurrency  # noqa: E402
from app.apps.tenant_modules.finance.models.settings import FinanceSetting  # noqa: E402
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

    def test_seed_finance_defaults_promotes_clp_and_seeds_both_families(self) -> None:
        db = self._db()
        try:
            self.service.seed_defaults(
                db,
                tenant_name="Ieris Ltda",
                tenant_slug="ieris-ltda",
                tenant_type="empresa",
                enabled_modules=["core"],
            )
            db.commit()

            categories = {
                (item.name, item.category_type)
                for item in db.query(FinanceCategory).all()
            }
            currencies = {item.code: item for item in db.query(FinanceCurrency).all()}
            settings = {
                item.setting_key: item.setting_value
                for item in db.query(FinanceSetting).all()
            }

            self.assertIn(("Mantenciones y servicios", "income"), categories)
            self.assertIn(("Costos de mantencion", "expense"), categories)
            self.assertIn(("Empresa - Herramientas y equipos", "expense"), categories)
            self.assertIn(("Casa - Mantenimiento del hogar", "expense"), categories)
            self.assertIn(("Transferencia interna", "transfer"), categories)
            self.assertTrue(currencies["CLP"].is_base)
            self.assertEqual(currencies["CLP"].decimal_places, 0)
            self.assertEqual(settings["base_currency_code"], "CLP")
        finally:
            db.close()

    def test_seed_business_core_defaults_creates_profiles_task_types_and_links(self) -> None:
        db = self._db()
        try:
            self.service.seed_defaults(
                db,
                tenant_name="Empresa Demo",
                tenant_slug="empresa-demo",
                tenant_type="empresa",
                enabled_modules=["core"],
            )
            db.commit()

            profile_codes = {
                item.code for item in db.query(BusinessFunctionProfile).all()
            }
            task_types = {
                item.code: item for item in db.query(BusinessTaskType).all()
            }
            links = {
                (item.task_type_id, item.function_profile_id)
                for item in db.query(BusinessTaskTypeFunctionProfile).all()
            }

            self.assertEqual(
                profile_codes,
                {
                    "tecnico",
                    "lider",
                    "administrativo",
                    "vendedor",
                    "otro",
                    "supervisor",
                },
            )
            self.assertIn("mantencion", task_types)
            self.assertIn("instalacion", task_types)
            self.assertIn("tareas-generales", task_types)
            self.assertIn("ventas", task_types)
            self.assertIn("administracion", task_types)

            mantencion = task_types["mantencion"]
            tecnico = (
                db.query(BusinessFunctionProfile)
                .filter(BusinessFunctionProfile.code == "tecnico")
                .one()
            )
            supervisor = (
                db.query(BusinessFunctionProfile)
                .filter(BusinessFunctionProfile.code == "supervisor")
                .one()
            )
            self.assertIn((mantencion.id, tecnico.id), links)
            self.assertIn((mantencion.id, supervisor.id), links)
        finally:
            db.close()

    def test_seed_finance_categories_replaces_existing_catalog_when_no_usage_exists(self) -> None:
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

            self.service._seed_finance_defaults(db, tenant_type="empresa")
            db.commit()

            names = {
                (item.name, item.category_type)
                for item in db.query(FinanceCategory).all()
            }
            self.assertNotIn(("General temporal", "expense"), names)
            self.assertIn(("Empresa - Software y suscripciones", "expense"), names)
            self.assertIn(("Casa - Luz", "expense"), names)
        finally:
            db.close()


if __name__ == "__main__":
    unittest.main()
