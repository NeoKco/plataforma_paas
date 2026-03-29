import unittest
from datetime import datetime, timezone
from unittest.mock import patch

from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.tests.fixtures import build_platform_context, set_test_environment

set_test_environment()

from app.apps.platform_control.models.auth_audit_event import AuthAuditEvent  # noqa: F401,E402
from app.apps.platform_control.models.auth_token import AuthToken  # noqa: F401,E402
from app.apps.platform_control.models.provisioning_job import ProvisioningJob  # noqa: F401,E402
from app.apps.platform_control.models.tenant import Tenant  # noqa: F401,E402
from app.apps.platform_control.models.tenant_billing_sync_event import (  # noqa: F401,E402
    TenantBillingSyncEvent,
)
from app.apps.platform_control.models.tenant_policy_change_event import (  # noqa: F401,E402
    TenantPolicyChangeEvent,
)
from app.apps.platform_control.models.tenant_retirement_archive import (  # noqa: F401,E402
    TenantRetirementArchive,
)
from app.apps.platform_control.api.tenant_routes import (  # noqa: E402
    get_tenant_retirement_archive,
    list_tenant_retirement_archives,
)
from app.apps.platform_control.services.provisioning_job_service import (  # noqa: E402
    ProvisioningJobService,
)
from app.apps.platform_control.services.tenant_service import TenantService  # noqa: E402
from app.apps.provisioning.services.provisioning_service import (  # noqa: E402
    ProvisioningService,
)
from app.apps.tenant_modules.core.api.auth_routes import (  # noqa: E402
    tenant_login,
    tenant_refresh_login,
)
from app.apps.tenant_modules.core.models.role import Role  # noqa: F401,E402
from app.apps.tenant_modules.core.models.tenant_info import TenantInfo  # noqa: F401,E402
from app.apps.tenant_modules.core.models.user import User  # noqa: F401,E402
from app.apps.tenant_modules.core.schemas import (  # noqa: E402
    TenantLoginRequest,
    TenantRefreshTokenRequest,
)
from app.apps.tenant_modules.core.services.tenant_data_service import (  # noqa: E402
    TenantDataService,
)
from app.apps.tenant_modules.finance.models.currency import FinanceCurrency  # noqa: F401,E402
from app.apps.tenant_modules.finance.models.entry import FinanceEntry  # noqa: F401,E402
from app.apps.tenant_modules.finance.services.finance_service import (  # noqa: E402
    FinanceService,
)
from app.common.db.base import Base  # noqa: E402
from app.common.db.tenant_base import TenantBase  # noqa: E402
from app.common.security.password_service import hash_password  # noqa: E402
from app.tests.db_test_utils import build_sqlite_session  # noqa: E402


class TenantLifecycleIntegrationTestCase(unittest.TestCase):
    def setUp(self) -> None:
        self.control_db, self.control_engine = build_sqlite_session(Base)
        self.tenant_engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        TenantBase.metadata.create_all(bind=self.tenant_engine)
        self.tenant_session_local = sessionmaker(
            autocommit=False,
            autoflush=False,
            bind=self.tenant_engine,
        )
        self.tenant_service = TenantService()
        self.provisioning_job_service = ProvisioningJobService()
        self.provisioning_service = ProvisioningService()
        self.tenant_data_service = TenantDataService()
        self.finance_service = FinanceService()

    def tearDown(self) -> None:
        self.control_db.close()
        self.control_engine.dispose()
        self.tenant_engine.dispose()

    def _seed_bootstrap_tenant_database(self, tenant: Tenant) -> None:
        tenant_db: Session = self.tenant_session_local()
        try:
            if tenant_db.query(TenantInfo).first() is None:
                tenant_db.add(
                    TenantInfo(
                        tenant_name=tenant.name,
                        tenant_slug=tenant.slug,
                        tenant_type=tenant.tenant_type,
                    )
                )

            existing_roles = {row.code for row in tenant_db.query(Role).all()}
            for code, name in (
                ("admin", "Administrator"),
                ("manager", "Manager"),
                ("operator", "Operator"),
            ):
                if code not in existing_roles:
                    tenant_db.add(Role(code=code, name=name))

            admin_email = f"admin@{tenant.slug}.local"
            admin_user = tenant_db.query(User).filter(User.email == admin_email).first()
            if admin_user is None:
                tenant_db.add(
                    User(
                        full_name="Tenant Admin",
                        email=admin_email,
                        password_hash=hash_password("TenantAdmin123!"),
                        role="admin",
                        is_active=True,
                    )
                )

            if tenant_db.query(FinanceCurrency).filter(FinanceCurrency.code == "USD").first() is None:
                tenant_db.add(
                    FinanceCurrency(
                        code="USD",
                        name="US Dollar",
                        symbol="$",
                        decimal_places=2,
                        is_base=True,
                        is_active=True,
                        sort_order=10,
                    )
                )

            tenant_db.commit()
        finally:
            tenant_db.close()

    def _fake_create_tenant_database(self, db: Session, tenant: Tenant) -> dict:
        self._seed_bootstrap_tenant_database(tenant)
        tenant.db_name = f"tenant_{tenant.slug}"
        tenant.db_user = f"user_{tenant.slug}"
        tenant.db_host = "sqlite-test"
        tenant.db_port = 15432
        tenant.status = "active"
        tenant.tenant_schema_version = "2026.03"
        tenant.tenant_schema_synced_at = datetime.now(timezone.utc)
        db.commit()
        return {
            "db_name": tenant.db_name,
            "db_user": tenant.db_user,
            "db_password": "not-used-in-sqlite",
            "env_var_name": f"TENANT_{tenant.slug.upper().replace('-', '_')}_DB_PASSWORD",
        }

    def _fake_deprovision_tenant_database(self, db: Session, tenant: Tenant) -> dict:
        tenant.db_name = None
        tenant.db_user = None
        tenant.db_host = None
        tenant.db_port = None
        tenant.tenant_schema_version = None
        tenant.tenant_schema_synced_at = None
        tenant.tenant_db_credentials_rotated_at = None
        db.commit()
        return {
            "tenant": tenant,
            "dropped_database": True,
            "dropped_role": True,
        }

    def test_full_tenant_lifecycle_until_retirement_archive(self) -> None:
        tenant = self.tenant_service.create_tenant(
            db=self.control_db,
            name="Empresa Demo",
            slug="empresa-demo",
            tenant_type="empresa",
        )

        create_job = self.provisioning_job_service.list_jobs(self.control_db)[0]
        self.assertEqual(create_job.job_type, "create_tenant_database")
        self.assertEqual(create_job.status, "pending")

        with patch.object(
            self.provisioning_service,
            "_run_create_tenant_database",
            side_effect=self._fake_create_tenant_database,
        ), patch.object(
            self.provisioning_service,
            "_enqueue_post_provision_schema_sync",
            return_value=None,
        ), patch("builtins.print"):
            create_job = self.provisioning_service.run_job(self.control_db, create_job.id)

        self.control_db.refresh(tenant)
        self.assertEqual(create_job.status, "completed")
        self.assertEqual(tenant.status, "active")
        self.assertEqual(tenant.db_name, "tenant_empresa-demo")

        with patch(
            "app.apps.tenant_modules.core.api.auth_routes.TenantConnectionService.get_tenant_session",
            return_value=self.tenant_session_local,
        ):
            login_response = tenant_login(
                TenantLoginRequest(
                    tenant_slug=tenant.slug,
                    email=f"admin@{tenant.slug}.local",
                    password="TenantAdmin123!",
                ),
                control_db=self.control_db,
            )

        self.assertTrue(login_response.success)
        self.assertEqual(login_response.role, "admin")
        self.assertEqual(login_response.tenant_slug, tenant.slug)

        tenant_db = self.tenant_session_local()
        try:
            created_user = self.tenant_data_service.create_user(
                tenant_db=tenant_db,
                full_name="Operador Tenant",
                email="operador@empresa-demo.local",
                password="Operador123!",
                role="operator",
                is_active=True,
            )
            self.finance_service.create_entry(
                tenant_db=tenant_db,
                movement_type="income",
                concept="Cobro operativo",
                amount=250.0,
                category="billing",
                created_by_user_id=created_user.id,
            )
            finance_summary = self.finance_service.get_summary(tenant_db)
        finally:
            tenant_db.close()

        self.assertEqual(finance_summary["total_income"], 250.0)
        self.assertEqual(finance_summary["balance"], 250.0)

        archived = self.tenant_service.set_status(
            self.control_db,
            tenant.id,
            status="archived",
            status_reason="Archivado para retiro controlado",
        )
        self.assertEqual(archived.status, "archived")

        with self.assertRaises(HTTPException) as login_exc:
            with patch(
                "app.apps.tenant_modules.core.api.auth_routes.TenantConnectionService.get_tenant_session",
                return_value=self.tenant_session_local,
            ):
                tenant_login(
                    TenantLoginRequest(
                        tenant_slug=tenant.slug,
                        email=f"admin@{tenant.slug}.local",
                        password="TenantAdmin123!",
                    ),
                    control_db=self.control_db,
                )
        self.assertEqual(login_exc.exception.status_code, 403)
        self.assertEqual(login_exc.exception.detail, "Tenant archived")

        with self.assertRaises(HTTPException) as refresh_exc:
            tenant_refresh_login(
                TenantRefreshTokenRequest(refresh_token=login_response.refresh_token),
                control_db=self.control_db,
            )
        self.assertEqual(refresh_exc.exception.status_code, 403)
        self.assertEqual(refresh_exc.exception.detail, "Tenant archived")

        restored = self.tenant_service.restore_tenant(
            self.control_db,
            tenant.id,
            target_status="active",
            restore_reason="Reapertura operativa",
        )
        self.assertEqual(restored.status, "active")

        with patch(
            "app.apps.tenant_modules.core.api.auth_routes.TenantConnectionService.get_tenant_session",
            return_value=self.tenant_session_local,
        ):
            restored_login = tenant_login(
                TenantLoginRequest(
                    tenant_slug=tenant.slug,
                    email=f"admin@{tenant.slug}.local",
                    password="TenantAdmin123!",
                ),
                control_db=self.control_db,
            )
        self.assertTrue(restored_login.success)

        self.tenant_service.set_status(
            self.control_db,
            tenant.id,
            status="archived",
            status_reason="Archivado para cierre final",
        )
        deprovision_job = self.tenant_service.request_deprovision_tenant(
            self.control_db,
            tenant.id,
        )

        with patch.object(
            self.provisioning_service,
            "_run_deprovision_tenant_database",
            side_effect=self._fake_deprovision_tenant_database,
        ):
            deprovision_job = self.provisioning_service.run_job(
                self.control_db,
                deprovision_job.id,
            )

        self.control_db.refresh(tenant)
        self.assertEqual(deprovision_job.status, "completed")
        self.assertIsNone(tenant.db_name)
        self.assertIsNone(tenant.db_user)

        self.tenant_service.delete_tenant(
            self.control_db,
            tenant.id,
            deleted_by_email="admin@platform.local",
        )

        self.assertIsNone(
            self.control_db.query(Tenant).filter(Tenant.id == tenant.id).first()
        )

        archive_list = list_tenant_retirement_archives(
            db=self.control_db,
            _token=build_platform_context(),
        )
        self.assertEqual(archive_list.total, 1)
        self.assertEqual(archive_list.data[0].tenant_slug, tenant.slug)
        self.assertEqual(archive_list.data[0].deleted_by_email, "admin@platform.local")
        self.assertEqual(archive_list.data[0].provisioning_jobs_count, 2)

        archive_detail = get_tenant_retirement_archive(
            archive_list.data[0].id,
            db=self.control_db,
            _token=build_platform_context(),
        )
        self.assertEqual(
            archive_detail.summary["retirement"]["provisioning_jobs_count"],
            2,
        )
        self.assertEqual(
            archive_detail.summary["retirement"]["deleted_by_email"],
            "admin@platform.local",
        )


if __name__ == "__main__":
    unittest.main()
