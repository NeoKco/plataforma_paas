import unittest

from app.tests.fixtures import set_test_environment

set_test_environment()

from app.apps.platform_control.models.provisioning_job import ProvisioningJob  # noqa: E402
from app.apps.platform_control.models.tenant import Tenant  # noqa: E402
from app.apps.platform_control.models.tenant_subscription import TenantSubscription  # noqa: E402
from app.common.db.base import Base  # noqa: E402
from app.scripts.seed_frontend_demo_baseline import (  # noqa: E402
    _ensure_subscription_contract,
    _mark_pending_without_db_config,
)
from app.tests.db_test_utils import build_sqlite_session  # noqa: E402


class SeedFrontendDemoBaselineTestCase(unittest.TestCase):
    def setUp(self) -> None:
        self.control_db, self.control_engine = build_sqlite_session(Base)

    def tearDown(self) -> None:
        self.control_db.close()
        self.control_engine.dispose()

    def test_mark_pending_without_db_config_neutralizes_live_jobs(self) -> None:
        tenant = Tenant(
            name="Empresa Demo",
            slug="empresa-demo",
            tenant_type="empresa",
            status="active",
            db_name="tenant_empresa_demo",
            db_user="user_empresa_demo",
            db_host="127.0.0.1",
            db_port=5432,
            tenant_schema_version="0024_maintenance_finance_sync_policy",
        )
        self.control_db.add(tenant)
        self.control_db.commit()
        self.control_db.refresh(tenant)

        live_job = ProvisioningJob(
            tenant_id=tenant.id,
            job_type="sync_tenant_schema",
            status="retry_pending",
            attempts=2,
            max_attempts=3,
            error_code="tenant_schema_sync_failed",
            error_message="Tenant database configuration is incomplete",
        )
        self.control_db.add(live_job)
        self.control_db.commit()
        self.control_db.refresh(live_job)

        updated = _mark_pending_without_db_config(self.control_db, tenant)
        self.control_db.refresh(updated)
        updated_job = self.control_db.query(ProvisioningJob).filter(ProvisioningJob.id == live_job.id).one()

        self.assertEqual(updated.status, "pending")
        self.assertEqual(updated.status_reason, "Pendiente de provisioning inicial")
        self.assertIsNone(updated.db_name)
        self.assertIsNone(updated.db_user)
        self.assertIsNone(updated.db_host)
        self.assertIsNone(updated.db_port)
        self.assertIsNone(updated.tenant_schema_version)
        self.assertIsNone(updated.tenant_schema_synced_at)
        self.assertIsNone(updated.tenant_db_credentials_rotated_at)

        self.assertEqual(updated_job.status, "failed")
        self.assertEqual(updated_job.error_code, "tenant_db_config_reset")
        self.assertIn("reset to pending without DB config", updated_job.error_message)
        self.assertIsNone(updated_job.next_retry_at)

    def test_ensure_subscription_contract_keeps_tenant_contractual_and_clears_plan_code(self) -> None:
        tenant = Tenant(
            name="Empresa Demo",
            slug="empresa-demo",
            tenant_type="empresa",
            status="active",
            plan_code="mensual",
        )
        self.control_db.add(tenant)
        self.control_db.commit()
        self.control_db.refresh(tenant)

        updated = _ensure_subscription_contract(
            self.control_db,
            tenant,
            base_plan_code="base_finance",
            billing_cycle="monthly",
        )
        self.control_db.refresh(updated)
        subscription = (
            self.control_db.query(TenantSubscription)
            .filter(TenantSubscription.tenant_id == updated.id)
            .one()
        )

        self.assertIsNone(updated.plan_code)
        self.assertEqual(subscription.base_plan_code, "base_finance")
        self.assertEqual(subscription.billing_cycle, "monthly")
        self.assertEqual(subscription.status, "active")


if __name__ == "__main__":
    unittest.main()
