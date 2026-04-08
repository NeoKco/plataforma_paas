import os
import unittest

os.environ["DEBUG"] = "true"
os.environ["APP_ENV"] = "test"

from app.apps.platform_control.models.platform_user import PlatformUser  # noqa: F401,E402
from app.apps.platform_control.models.provisioning_job import (  # noqa: F401,E402
    ProvisioningJob,
)
from app.apps.platform_control.models.tenant import Tenant  # noqa: F401,E402
from app.apps.platform_control.services.auth_service import PlatformAuthService  # noqa: E402
from app.apps.platform_control.services.provisioning_job_service import (  # noqa: E402
    ProvisioningJobService,
)
from app.apps.platform_control.services.tenant_service import TenantService  # noqa: E402
from app.common.db.base import Base  # noqa: E402
from app.common.security.password_service import hash_password  # noqa: E402
from app.tests.db_test_utils import (  # noqa: E402
    build_postgres_session,
    drop_postgres_database,
    get_postgres_test_config,
)


@unittest.skipUnless(
    get_postgres_test_config() is not None,
    "PGTEST_* no configurado para pruebas PostgreSQL",
)
class PlatformPostgresIntegrationTestCase(unittest.TestCase):
    def setUp(self) -> None:
        self.db, self.engine, self.database_name = build_postgres_session(
            Base,
            "platform_it",
        )
        self.auth_service = PlatformAuthService()
        self.tenant_service = TenantService()
        self.provisioning_job_service = ProvisioningJobService()

    def tearDown(self) -> None:
        self.db.close()
        self.engine.dispose()
        drop_postgres_database(self.database_name)

    def test_platform_auth_and_tenant_creation_against_postgres(self) -> None:
        self.db.add(
            PlatformUser(
                full_name="Platform PG",
                email="platform.pg@platform.local",
                password_hash=hash_password("PlatformPg123!"),
                role="superadmin",
                is_active=True,
            )
        )
        self.db.commit()

        logged_user = self.auth_service.login(
            self.db,
            "platform.pg@platform.local",
            "PlatformPg123!",
        )
        tenant = self.tenant_service.create_tenant(
            db=self.db,
            name="Empresa PG",
            slug="empresa-pg",
            tenant_type="empresa",
            admin_full_name="Admin PG",
            admin_email="admin@empresa-pg.local",
            admin_password="AdminEmpresaPg123!",
        )
        jobs = self.provisioning_job_service.list_jobs(self.db)

        self.assertIsNotNone(logged_user)
        self.assertEqual(tenant.slug, "empresa-pg")
        self.assertEqual(len(jobs), 1)


if __name__ == "__main__":
    unittest.main()
