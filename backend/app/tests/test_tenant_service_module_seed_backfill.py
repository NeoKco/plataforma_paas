import unittest
from types import SimpleNamespace
from unittest.mock import Mock

from app.apps.platform_control.services.tenant_service import TenantService
from app.common.policies.tenant_plan_policy_service import TenantPlanPolicyService


class TenantServiceModuleSeedBackfillTests(unittest.TestCase):
    def test_set_plan_backfills_defaults_for_active_tenant_with_core(self) -> None:
        tenant = SimpleNamespace(
            id=7,
            name="Empresa Demo",
            slug="empresa-demo",
            tenant_type="empresa",
            status="active",
            db_name="tenant_empresa_demo",
            db_user="user_empresa_demo",
            db_host="127.0.0.1",
            db_port=5432,
            plan_code="basic",
        )
        tenant_repository = Mock()
        tenant_repository.get_by_id.return_value = tenant
        tenant_repository.save.side_effect = lambda _db, item: item

        tenant_db_session = Mock()
        tenant_db_session.get_bind.return_value = Mock(dispose=Mock())
        tenant_connection_service = Mock()
        tenant_connection_service.get_tenant_session.return_value = Mock(
            return_value=tenant_db_session
        )
        tenant_bootstrap_service = Mock()
        policy_service = TenantPlanPolicyService(
            plan_enabled_modules="basic=users;pro=core,finance,maintenance,users"
        )

        service = TenantService(
            tenant_repository=tenant_repository,
            tenant_connection_service=tenant_connection_service,
            tenant_database_bootstrap_service=tenant_bootstrap_service,
            tenant_plan_policy_service=policy_service,
        )

        updated = service.set_plan(Mock(), tenant.id, plan_code="pro")

        self.assertEqual(updated.plan_code, "pro")
        tenant_bootstrap_service.seed_defaults.assert_called_once_with(
            tenant_db_session,
            tenant_name="Empresa Demo",
            tenant_slug="empresa-demo",
            tenant_type="empresa",
            enabled_modules=["core", "finance", "maintenance", "users"],
        )
        tenant_db_session.commit.assert_called_once()
        tenant_db_session.close.assert_called_once()

    def test_set_plan_skips_backfill_when_modules_do_not_require_catalogs(self) -> None:
        tenant = SimpleNamespace(
            id=8,
            name="Tenant Liviano",
            slug="tenant-liviano",
            tenant_type="condominio",
            status="active",
            db_name="tenant_liviano",
            db_user="user_tenant_liviano",
            db_host="127.0.0.1",
            db_port=5432,
            plan_code="basic",
        )
        tenant_repository = Mock()
        tenant_repository.get_by_id.return_value = tenant
        tenant_repository.save.side_effect = lambda _db, item: item
        tenant_connection_service = Mock()
        tenant_bootstrap_service = Mock()
        policy_service = TenantPlanPolicyService(
            plan_enabled_modules="basic=users;users-only=users"
        )

        service = TenantService(
            tenant_repository=tenant_repository,
            tenant_connection_service=tenant_connection_service,
            tenant_database_bootstrap_service=tenant_bootstrap_service,
            tenant_plan_policy_service=policy_service,
        )

        updated = service.set_plan(Mock(), tenant.id, plan_code="users-only")

        self.assertEqual(updated.plan_code, "users-only")
        tenant_connection_service.get_tenant_session.assert_not_called()
        tenant_bootstrap_service.seed_defaults.assert_not_called()


if __name__ == "__main__":
    unittest.main()
