import os
import unittest

os.environ["DEBUG"] = "true"
os.environ["APP_ENV"] = "test"

from app.apps.platform_control.models.auth_audit_event import AuthAuditEvent  # noqa: F401,E402
from app.apps.platform_control.models.auth_token import AuthToken  # noqa: F401,E402
from app.apps.platform_control.models.platform_user import PlatformUser  # noqa: F401,E402
from app.apps.platform_control.models.provisioning_job import (  # noqa: F401,E402
    ProvisioningJob,
)
from app.apps.platform_control.models.tenant import Tenant  # noqa: F401,E402
from app.apps.platform_control.services.auth_audit_service import AuthAuditService  # noqa: E402
from app.common.auth.auth_token_service import AuthTokenService  # noqa: E402
from app.apps.platform_control.services.auth_service import PlatformAuthService  # noqa: E402
from app.apps.platform_control.services.provisioning_job_service import (  # noqa: E402
    ProvisioningJobService,
)
from app.apps.platform_control.services.tenant_service import TenantService  # noqa: E402
from app.common.db.base import Base  # noqa: E402
from app.common.security.password_service import hash_password  # noqa: E402
from app.tests.db_test_utils import build_sqlite_session  # noqa: E402


class PlatformIntegrationTestCase(unittest.TestCase):
    def setUp(self) -> None:
        self.db, self.engine = build_sqlite_session(Base)
        self.tenant_service = TenantService()
        self.provisioning_job_service = ProvisioningJobService()
        self.auth_service = PlatformAuthService()
        self.auth_token_service = AuthTokenService()
        self.auth_audit_service = AuthAuditService()

    def tearDown(self) -> None:
        self.db.close()
        self.engine.dispose()

    def test_platform_auth_service_login_against_real_control_db(self) -> None:
        user = PlatformUser(
            full_name="Platform Admin",
            email="admin@platform.local",
            password_hash=hash_password("AdminTemporal123!"),
            role="superadmin",
            is_active=True,
        )
        self.db.add(user)
        self.db.commit()

        logged_user = self.auth_service.login(
            self.db,
            "admin@platform.local",
            "AdminTemporal123!",
        )

        self.assertIsNotNone(logged_user)
        self.assertEqual(logged_user.role, "superadmin")

    def test_create_tenant_persists_tenant_and_provisioning_job(self) -> None:
        tenant = self.tenant_service.create_tenant(
            db=self.db,
            name="Empresa Bootstrap",
            slug="empresa-bootstrap",
            tenant_type="empresa",
        )

        jobs = self.provisioning_job_service.list_jobs(self.db)

        self.assertIsNotNone(tenant.id)
        self.assertEqual(tenant.status, "pending")
        self.assertEqual(len(jobs), 1)
        self.assertEqual(jobs[0].tenant_id, tenant.id)
        self.assertEqual(jobs[0].job_type, "create_tenant_database")

    def test_issue_and_revoke_platform_session_persists_auth_tokens(self) -> None:
        token_pair = self.auth_token_service.issue_token_pair(
            db=self.db,
            user_id=1,
            email="admin@platform.local",
            role="superadmin",
            token_scope="platform",
            audience="platform-api",
        )

        token_payload, rotated_pair = self.auth_token_service.refresh_token_pair(
            db=self.db,
            refresh_token=token_pair["refresh_token"],
            expected_scope="platform",
            audience="platform-api",
        )
        revoked_refresh_tokens = self.auth_token_service.revoke_session(
            db=self.db,
            access_payload={
                **token_payload,
                "jti": self.auth_token_service.jwt_service.decode_token(
                    rotated_pair["access_token"],
                    audience="platform-api",
                )["jti"],
                "token_type": "access",
            },
        )

        auth_tokens = self.db.query(AuthToken).all()

        self.assertEqual(len(auth_tokens), 3)
        self.assertGreaterEqual(revoked_refresh_tokens, 1)
        self.assertTrue(
            any(token.token_type == "access" and token.revoked_at is not None for token in auth_tokens)
        )

    def test_auth_audit_service_persists_event(self) -> None:
        event = self.auth_audit_service.log_event(
            self.db,
            event_type="platform.login",
            subject_scope="platform",
            outcome="success",
            subject_user_id=1,
            email="admin@platform.local",
            token_jti="access-jti",
            detail="Platform login successful",
        )

        persisted = self.db.query(AuthAuditEvent).filter(AuthAuditEvent.id == event.id).first()

        self.assertIsNotNone(persisted)
        self.assertEqual(persisted.event_type, "platform.login")
        self.assertEqual(persisted.outcome, "success")

    def test_list_jobs_returns_desc_order_against_real_control_db(self) -> None:
        first_tenant = self.tenant_service.create_tenant(
            db=self.db,
            name="Tenant Uno",
            slug="tenant-uno",
            tenant_type="empresa",
        )
        second_tenant = self.tenant_service.create_tenant(
            db=self.db,
            name="Tenant Dos",
            slug="tenant-dos",
            tenant_type="empresa",
        )

        jobs = self.provisioning_job_service.list_jobs(self.db)

        self.assertEqual(len(jobs), 2)
        self.assertEqual(jobs[0].tenant_id, second_tenant.id)
        self.assertEqual(jobs[1].tenant_id, first_tenant.id)


if __name__ == "__main__":
    unittest.main()
