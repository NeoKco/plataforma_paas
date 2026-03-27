import asyncio
import hashlib
import hmac
import os
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from fastapi import HTTPException
from sqlalchemy.exc import OperationalError

from app.tests.fixtures import (  # noqa: E402
    build_platform_context,
    build_platform_request,
    build_platform_user_stub,
    build_tenant_record_stub,
    build_tenant_user_stub,
    set_test_environment,
)

set_test_environment()

from app.apps.platform_control.api.auth_routes import (  # noqa: E402
    get_platform_root_recovery_status,
    login,
    logout,
    recover_platform_root_account,
    refresh_login,
)
from app.apps.platform_control.api.auth_audit_routes import (  # noqa: E402
    list_platform_auth_audit,
)
from app.apps.platform_control.api.billing_webhook_routes import (  # noqa: E402
    sync_stripe_billing_webhook,
)
from app.apps.platform_control.api.platform_user_routes import (  # noqa: E402
    create_platform_user,
    delete_platform_user,
    list_platform_users,
    reset_platform_user_password,
    update_platform_user,
    update_platform_user_status,
)
from app.apps.platform_control.api.provisioning_job_routes import (  # noqa: E402
    list_provisioning_jobs,
    provisioning_broker_dead_letter_jobs,
    provisioning_job_alerts,
    provisioning_job_alert_history,
    provisioning_job_cycle_history,
    provisioning_job_metrics_by_error_code,
    provisioning_job_metrics_by_job_type,
    provisioning_job_metrics,
    provisioning_job_metrics_history,
    requeue_provisioning_broker_dead_letter_jobs,
    requeue_provisioning_job,
    run_provisioning_job,
)
from app.apps.platform_control.api.routes import (  # noqa: E402
    admin_only_route,
    get_platform_capabilities,
    get_platform_security_posture,
    ping_control_db,
)
from app.apps.platform_control.api.tenant_routes import (  # noqa: E402
    create_tenant,
    deprovision_tenant,
    delete_tenant,
    get_platform_billing_event_alerts,
    get_platform_billing_event_alert_history,
    get_platform_billing_events_summary,
    get_tenant,
    get_tenant_finance_usage,
    get_tenant_module_usage,
    list_tenant_portal_users,
    list_tenant_retirement_archives,
    get_tenant_retirement_archive,
    get_tenant_schema_status,
    list_tenants,
    get_tenant_access_policy,
    get_tenant_billing_events,
    get_tenant_billing_events_summary,
    get_tenant_policy_history,
    reconcile_tenant_billing_events_batch,
    reconcile_tenant_billing_from_event,
    reprovision_tenant,
    reset_tenant_portal_user_password,
    rotate_tenant_db_credentials,
    sync_tenant_billing_event,
    restore_tenant,
    update_tenant_identity,
    update_tenant_billing_identity,
    update_tenant_billing,
    sync_tenant_schema,
    update_tenant_maintenance_mode,
    update_tenant_module_limits,
    update_tenant_plan,
    update_tenant_rate_limits,
    update_tenant_status,
)
from app.apps.platform_control.schemas import (  # noqa: E402
    LoginRequest,
    PlatformRootRecoveryRequest,
    PlatformUserCreateRequest,
    PlatformUserPasswordResetRequest,
    PlatformUserStatusUpdateRequest,
    PlatformUserUpdateRequest,
    ProvisioningBrokerRequeueRequest,
    RefreshTokenRequest,
    TenantBillingIdentityUpdateRequest,
    TenantBillingSyncEventRequest,
    TenantBillingUpdateRequest,
    TenantCreateRequest,
    TenantIdentityUpdateRequest,
    TenantMaintenanceUpdateRequest,
    TenantModuleLimitsUpdateRequest,
    TenantPlanUpdateRequest,
    TenantRateLimitUpdateRequest,
    TenantRestoreRequest,
    TenantPortalUserPasswordResetRequest,
    TenantPortalUsersResponse,
    TenantRetirementArchiveDetailResponse,
    TenantRetirementArchiveListResponse,
    TenantStatusUpdateRequest,
)
from app.apps.platform_control.services.auth_service import PlatformAuthService  # noqa: E402
from app.apps.platform_control.services.platform_user_service import (  # noqa: E402
    PlatformUserService,
)
from app.apps.platform_control.services.provisioning_job_service import (  # noqa: E402
    ProvisioningJobService,
)
from app.apps.platform_control.services.provisioning_metrics_service import (  # noqa: E402
    ProvisioningMetricsService,
)
from app.apps.platform_control.services.provisioning_alert_service import (  # noqa: E402
    ProvisioningAlertService,
)
from app.apps.platform_control.services.provisioning_worker_cycle_trace_service import (  # noqa: E402
    ProvisioningWorkerCycleTraceService,
)
from app.apps.platform_control.services.provisioning_metrics_export_service import (  # noqa: E402
    ProvisioningMetricsExportService,
)
from app.apps.provisioning.services.provisioning_dispatch_service import (  # noqa: E402
    BrokerProvisioningDispatchBackend,
    ProvisioningDispatchService,
)
from app.apps.platform_control.services.tenant_service import TenantService  # noqa: E402
from app.apps.platform_control.services.tenant_policy_event_service import (  # noqa: E402
    TenantPolicyEventService,
)
from app.apps.platform_control.services.tenant_billing_sync_service import (  # noqa: E402
    TenantBillingSyncService,
)
from app.apps.platform_control.services.billing_provider_adapter_service import (  # noqa: E402
    BillingProviderAdapterService,
)
from app.apps.platform_control.services.billing_alert_service import (  # noqa: E402
    BillingAlertService,
)
from app.apps.platform_control.services.platform_capability_service import (  # noqa: E402
    PlatformCapabilityService,
)
from app.apps.platform_control.services.stripe_webhook_signature_service import (  # noqa: E402
    StripeWebhookSignatureService,
)
from app.common.auth.dependencies import get_current_platform_context  # noqa: E402
from app.common.auth.role_dependencies import require_role  # noqa: E402
from app.common.policies.tenant_plan_policy_service import (  # noqa: E402
    TenantPlanPolicyService,
)


class PlatformDependenciesTestCase(unittest.TestCase):
    def _request(
        self,
        role: str = "superadmin",
        token_scope: str = "platform",
    ):
        return build_platform_request(
            role=role,
            token_scope=token_scope,
        )

    def test_get_current_platform_context_returns_expected_data(self) -> None:
        context = get_current_platform_context(self._request())

        self.assertEqual(context["role"], "superadmin")
        self.assertEqual(context["token_scope"], "platform")

    def test_require_role_rejects_invalid_role(self) -> None:
        checker = require_role("superadmin")

        with self.assertRaises(HTTPException) as exc:
            checker(payload={"role": "support"})

        self.assertEqual(exc.exception.status_code, 403)


class PlatformServicesTestCase(unittest.TestCase):
    class _FakeRedis:
        def __init__(self):
            self.sets: dict[str, set[str]] = {}
            self.sorted_sets: dict[str, dict[str, float]] = {}

        def sadd(self, key: str, *values) -> int:
            bucket = self.sets.setdefault(key, set())
            for value in values:
                bucket.add(str(value))
            return len(values)

        def smembers(self, key: str):
            return set(self.sets.get(key, set()))

        def zadd(self, key: str, mapping: dict) -> int:
            bucket = self.sorted_sets.setdefault(key, {})
            for member, score in mapping.items():
                bucket[str(member)] = float(score)
            return len(mapping)

        def zrangebyscore(
            self,
            key: str,
            min,
            max,
            start: int = 0,
            num: int | None = None,
            withscores: bool = False,
        ):
            bucket = self.sorted_sets.get(key, {})

            def _bound(value, default):
                if value == "-inf":
                    return float("-inf")
                if value == "+inf":
                    return float("inf")
                return float(value if value is not None else default)

            min_score = _bound(min, float("-inf"))
            max_score = _bound(max, float("inf"))
            rows = sorted(
                [
                    (member, score)
                    for member, score in bucket.items()
                    if min_score <= score <= max_score
                ],
                key=lambda item: (item[1], int(item[0])),
            )
            if start:
                rows = rows[start:]
            if num is not None:
                rows = rows[:num]
            if withscores:
                return rows
            return [member for member, _ in rows]

        def zrem(self, key: str, *members) -> int:
            bucket = self.sorted_sets.setdefault(key, {})
            removed = 0
            for member in members:
                if str(member) in bucket:
                    removed += 1
                    bucket.pop(str(member), None)
            return removed

    def test_platform_auth_service_returns_none_for_inactive_user(self) -> None:
        inactive_user = build_platform_user_stub(
            is_active=False,
        )
        fake_repo = SimpleNamespace(get_by_email=lambda db, email: inactive_user)

        service = PlatformAuthService(platform_user_repository=fake_repo)
        result = service.login(object(), "admin@platform.local", "secret")

        self.assertIsNone(result)

    def test_platform_auth_service_returns_user_for_valid_credentials(self) -> None:
        user = build_platform_user_stub()
        fake_repo = SimpleNamespace(get_by_email=lambda db, email: user)

        service = PlatformAuthService(platform_user_repository=fake_repo)
        with patch(
            "app.apps.platform_control.services.auth_service.verify_password",
            return_value=True,
        ):
            result = service.login(object(), "admin@platform.local", "secret")

        self.assertIs(result, user)

    def test_platform_user_service_creates_user_with_normalized_email(self) -> None:
        saved_users = []

        class FakePlatformUserRepository:
            def get_by_email(self, db, email):
                return None

            def save(self, db, user):
                user.id = 11
                saved_users.append(user)
                return user

        service = PlatformUserService(
            platform_user_repository=FakePlatformUserRepository()
        )

        with patch(
            "app.apps.platform_control.services.platform_user_service.hash_password",
            return_value="hashed-password",
        ):
            result = service.create_user(
                db=object(),
                full_name="  Support User  ",
                email="  SUPPORT@Platform.dev  ",
                role="support",
                password="Support123!",
                is_active=True,
            )

        self.assertEqual(result.id, 11)
        self.assertEqual(result.full_name, "Support User")
        self.assertEqual(result.email, "support@platform.dev")
        self.assertEqual(result.role, "support")
        self.assertEqual(result.password_hash, "hashed-password")
        self.assertTrue(saved_users[0].is_active)

    def test_platform_user_service_rejects_duplicate_email(self) -> None:
        existing_user = build_platform_user_stub(email="support@platform.dev")
        service = PlatformUserService(
            platform_user_repository=SimpleNamespace(
                get_by_email=lambda db, email: existing_user
            )
        )

        with self.assertRaises(ValueError):
            service.create_user(
                db=object(),
                full_name="Support User",
                email="support@platform.dev",
                role="support",
                password="Support123!",
            )

    def test_platform_user_service_prevents_last_active_superadmin_deactivation(self) -> None:
        user = build_platform_user_stub(role="superadmin", is_active=True)

        class FakePlatformUserRepository:
            def get_by_id(self, db, user_id):
                return user

            def count_active_by_role(self, db, role):
                return 1

        service = PlatformUserService(
            platform_user_repository=FakePlatformUserRepository()
        )

        with self.assertRaises(ValueError):
            service.set_user_status(
                db=object(),
                user_id=1,
                is_active=False,
            )

    def test_platform_user_service_prevents_last_active_superadmin_role_change(self) -> None:
        user = build_platform_user_stub(role="superadmin", is_active=True)

        class FakePlatformUserRepository:
            def get_by_id(self, db, user_id):
                return user

            def count_active_by_role(self, db, role):
                return 1

        service = PlatformUserService(
            platform_user_repository=FakePlatformUserRepository()
        )

        with self.assertRaises(ValueError):
            service.update_user(
                db=object(),
                user_id=1,
                full_name="Platform Admin",
                role="support",
            )

    def test_platform_user_service_prevents_second_active_superadmin_creation(self) -> None:
        class FakePlatformUserRepository:
            def get_by_email(self, db, email):
                return None

            def count_active_by_role(self, db, role):
                return 1

        service = PlatformUserService(
            platform_user_repository=FakePlatformUserRepository()
        )

        with self.assertRaises(ValueError):
            service.create_user(
                db=object(),
                full_name="Otro Admin",
                email="otro-admin@platform.dev",
                role="superadmin",
                password="Admin123!",
                is_active=True,
            )

    def test_platform_user_service_prevents_support_promotion_when_active_superadmin_exists(self) -> None:
        user = build_platform_user_stub(role="support", is_active=True)

        class FakePlatformUserRepository:
            def get_by_id(self, db, user_id):
                return user

            def count_active_by_role(self, db, role):
                return 1

        service = PlatformUserService(
            platform_user_repository=FakePlatformUserRepository()
        )

        with self.assertRaises(ValueError):
            service.update_user(
                db=object(),
                user_id=1,
                full_name="Support User",
                role="superadmin",
            )

    def test_platform_user_service_prevents_archived_superadmin_reactivation_when_another_exists(self) -> None:
        user = build_platform_user_stub(role="superadmin", is_active=False)

        class FakePlatformUserRepository:
            def get_by_id(self, db, user_id):
                return user

            def count_active_by_role(self, db, role):
                return 1

        service = PlatformUserService(
            platform_user_repository=FakePlatformUserRepository()
        )

        with self.assertRaises(ValueError):
            service.set_user_status(
                db=object(),
                user_id=1,
                is_active=True,
            )

    def test_platform_user_service_allows_superadmin_to_create_admin(self) -> None:
        saved_users = []

        class FakePlatformUserRepository:
            def get_by_email(self, db, email):
                return None

            def save(self, db, user):
                user.id = 12
                saved_users.append(user)
                return user

        service = PlatformUserService(
            platform_user_repository=FakePlatformUserRepository()
        )

        with patch(
            "app.apps.platform_control.services.platform_user_service.hash_password",
            return_value="hashed-password",
        ):
            result = service.create_user(
                db=object(),
                full_name="Admin Operativo",
                email="admin-operativo@platform.dev",
                role="admin",
                password="Admin123!",
                actor_role="superadmin",
            )

        self.assertEqual(result.role, "admin")
        self.assertEqual(saved_users[0].role, "admin")

    def test_platform_user_service_allows_admin_to_create_support(self) -> None:
        class FakePlatformUserRepository:
            def get_by_email(self, db, email):
                return None

            def save(self, db, user):
                user.id = 13
                return user

        service = PlatformUserService(
            platform_user_repository=FakePlatformUserRepository()
        )

        with patch(
            "app.apps.platform_control.services.platform_user_service.hash_password",
            return_value="hashed-password",
        ):
            result = service.create_user(
                db=object(),
                full_name="Mesa Soporte",
                email="mesa@platform.dev",
                role="support",
                password="Support123!",
                actor_role="admin",
            )

        self.assertEqual(result.role, "support")

    def test_platform_user_service_blocks_admin_from_creating_admin(self) -> None:
        class FakePlatformUserRepository:
            def get_by_email(self, db, email):
                return None

        service = PlatformUserService(
            platform_user_repository=FakePlatformUserRepository()
        )

        with self.assertRaises(ValueError):
            service.create_user(
                db=object(),
                full_name="Nuevo Admin",
                email="nuevo-admin@platform.dev",
                role="admin",
                password="Admin123!",
                actor_role="admin",
            )

    def test_platform_user_service_blocks_superadmin_deletion(self) -> None:
        user = build_platform_user_stub(role="superadmin", is_active=True)

        class FakePlatformUserRepository:
            def get_by_id(self, db, user_id):
                return user

        service = PlatformUserService(
            platform_user_repository=FakePlatformUserRepository()
        )

        with self.assertRaises(ValueError):
            service.delete_user(
                db=object(),
                user_id=1,
                actor_role="superadmin",
                actor_user_id=99,
            )

    def test_platform_user_service_allows_admin_to_delete_support(self) -> None:
        deleted = []
        user = build_platform_user_stub(user_id=7, role="support", is_active=True)

        class FakePlatformUserRepository:
            def get_by_id(self, db, user_id):
                return user

            def delete(self, db, target):
                deleted.append(target.id)

        service = PlatformUserService(
            platform_user_repository=FakePlatformUserRepository()
        )

        result = service.delete_user(
            db=object(),
            user_id=7,
            actor_role="admin",
            actor_user_id=1,
        )

        self.assertEqual(result.id, 7)
        self.assertEqual(deleted, [7])

    def test_platform_user_service_blocks_self_deletion(self) -> None:
        user = build_platform_user_stub(user_id=7, role="support", is_active=True)

        class FakePlatformUserRepository:
            def get_by_id(self, db, user_id):
                return user

        service = PlatformUserService(
            platform_user_repository=FakePlatformUserRepository()
        )

        with self.assertRaises(ValueError):
            service.delete_user(
                db=object(),
                user_id=7,
                actor_role="admin",
                actor_user_id=7,
            )

    def test_auth_audit_service_lists_recent_events_with_normalized_filters(self) -> None:
        captured = {}

        class FakeAuthAuditRepository:
            def list_recent(self, db, **kwargs):
                captured.update(kwargs)
                return []

        from app.apps.platform_control.services.auth_audit_service import AuthAuditService

        service = AuthAuditService(
            auth_audit_event_repository=FakeAuthAuditRepository()
        )

        result = service.list_recent_events(
            db=object(),
            limit=500,
            subject_scope=" PLATFORM ",
            outcome=" SUCCESS ",
            search="  admin@platform.local  ",
        )

        self.assertEqual(result, [])
        self.assertEqual(captured["limit"], 100)
        self.assertEqual(captured["subject_scope"], "platform")
        self.assertEqual(captured["outcome"], "success")
        self.assertEqual(captured["search"], "admin@platform.local")

    def test_tenant_service_creates_tenant_and_provisioning_job(self) -> None:
        saved_tenant = build_tenant_record_stub()
        saved_tenant.id = 1
        saved_tenant.status = "pending"
        calls: list[tuple] = []

        class FakeTenantRepository:
            def get_by_slug(self, db, slug):
                calls.append(("get_by_slug", slug))
                return None

            def save(self, db, tenant):
                calls.append(("save", tenant.slug, tenant.status))
                return saved_tenant

        class FakeProvisioningJobService:
            def create_job(self, db, tenant_id, job_type, status):
                calls.append(("create_job", tenant_id, job_type, status))

        service = TenantService(
            tenant_repository=FakeTenantRepository(),
            provisioning_job_service=FakeProvisioningJobService(),
        )

        tenant = service.create_tenant(
            db=object(),
            name="Empresa Bootstrap",
            slug="empresa-bootstrap",
            tenant_type="empresa",
        )

        self.assertIs(tenant, saved_tenant)
        self.assertEqual(
            calls,
            [
                ("get_by_slug", "empresa-bootstrap"),
                ("save", "empresa-bootstrap", "pending"),
                ("create_job", 1, "create_tenant_database", "pending"),
            ],
        )

    def test_tenant_service_updates_basic_identity(self) -> None:
        tenant = build_tenant_record_stub(
            tenant_name="Empresa Demo",
            tenant_slug="empresa-demo",
            tenant_type="empresa",
        )
        calls: list[tuple] = []

        class FakeTenantRepository:
            def get_by_id(self, db, tenant_id):
                calls.append(("get_by_id", tenant_id))
                return tenant

            def save(self, db, tenant_to_save):
                calls.append(("save", tenant_to_save.name, tenant_to_save.tenant_type))
                return tenant_to_save

        service = TenantService(tenant_repository=FakeTenantRepository())

        result = service.update_basic_identity(
            db=object(),
            tenant_id=7,
            name="Empresa Centro",
            tenant_type="condominio",
        )

        self.assertEqual(result.name, "Empresa Centro")
        self.assertEqual(result.tenant_type, "condominio")
        self.assertEqual(
            calls,
            [("get_by_id", 7), ("save", "Empresa Centro", "condominio")],
        )

    def test_tenant_service_rejects_empty_basic_identity_fields(self) -> None:
        tenant = build_tenant_record_stub()
        service = TenantService(
            tenant_repository=SimpleNamespace(get_by_id=lambda db, tenant_id: tenant)
        )

        with self.assertRaises(ValueError):
            service.update_basic_identity(
                db=object(),
                tenant_id=1,
                name="   ",
                tenant_type="empresa",
            )

        with self.assertRaises(ValueError):
            service.update_basic_identity(
                db=object(),
                tenant_id=1,
                name="Empresa Demo",
                tenant_type="   ",
            )

    def test_tenant_service_restores_archived_tenant_with_explicit_target_status(self) -> None:
        tenant = build_tenant_record_stub(
            status="archived",
            status_reason="Archivado por baja operativa",
        )
        calls: list[tuple] = []

        class FakeTenantRepository:
            def get_by_id(self, db, tenant_id):
                calls.append(("get_by_id", tenant_id))
                return tenant

            def save(self, db, tenant_to_save):
                calls.append(("save", tenant_to_save.status, tenant_to_save.status_reason))
                return tenant_to_save

        service = TenantService(tenant_repository=FakeTenantRepository())

        result = service.restore_tenant(
            db=object(),
            tenant_id=9,
            target_status="suspended",
            restore_reason="Restauración controlada",
        )

        self.assertEqual(result.status, "suspended")
        self.assertEqual(result.status_reason, "Restauración controlada")
        self.assertEqual(
            calls,
            [("get_by_id", 9), ("save", "suspended", "Restauración controlada")],
        )

    def test_tenant_service_rejects_restore_for_non_archived_tenant(self) -> None:
        tenant = build_tenant_record_stub(status="active")
        service = TenantService(
            tenant_repository=SimpleNamespace(get_by_id=lambda db, tenant_id: tenant)
        )

        with self.assertRaises(ValueError):
            service.restore_tenant(
                db=object(),
                tenant_id=1,
                target_status="active",
            )

    def test_tenant_service_rejects_delete_for_non_archived_tenant(self) -> None:
        tenant = build_tenant_record_stub(status="active")
        service = TenantService(
            tenant_repository=SimpleNamespace(get_by_id=lambda db, tenant_id: tenant)
        )

        with self.assertRaises(ValueError):
            service.delete_tenant(db=object(), tenant_id=1)

    def test_tenant_service_rejects_delete_for_archived_tenant_with_db_config(self) -> None:
        tenant = build_tenant_record_stub(status="archived")
        tenant.db_name = "tenant_empresa_demo"
        tenant.db_user = "user_empresa_demo"
        tenant.db_host = "127.0.0.1"
        tenant.db_port = 5432
        service = TenantService(
            tenant_repository=SimpleNamespace(get_by_id=lambda db, tenant_id: tenant)
        )

        with self.assertRaises(ValueError):
            service.delete_tenant(db=object(), tenant_id=1)

    def test_tenant_service_archives_billing_history_before_delete(self) -> None:
        tenant = build_tenant_record_stub(status="archived")
        tenant.id = 1
        deleted_targets: list[int] = []
        added_archives: list[object] = []

        class FakeQuery:
            def __init__(self, model_name: str):
                self.model_name = model_name
                self.filter_calls = 0

            def filter(self, *args, **kwargs):
                self.filter_calls += 1
                return self

            def count(self):
                if self.model_name == "TenantBillingSyncEvent":
                    return 1
                if self.model_name == "TenantPolicyChangeEvent":
                    return 2
                if self.model_name == "ProvisioningJob":
                    return 3
                return 0

            def delete(self, synchronize_session=False):
                return 1

        class FakeDb:
            def query(self, model):
                return FakeQuery(model.__name__)

            def add(self, item):
                added_archives.append(item)

        class FakeTenantRepository:
            def get_by_id(self, db, tenant_id):
                return tenant

            def delete(self, db, target):
                deleted_targets.append(target.id)

        service = TenantService(
            tenant_repository=FakeTenantRepository()
        )

        result = service.delete_tenant(
            db=FakeDb(),
            tenant_id=1,
            deleted_by_user_id=99,
            deleted_by_email="admin@platform.local",
        )

        self.assertIs(result, tenant)
        self.assertEqual(deleted_targets, [1])
        self.assertEqual(len(added_archives), 1)
        self.assertEqual(added_archives[0].original_tenant_id, 1)
        self.assertEqual(added_archives[0].billing_events_count, 1)
        self.assertEqual(added_archives[0].policy_events_count, 2)
        self.assertEqual(added_archives[0].provisioning_jobs_count, 3)
        self.assertEqual(added_archives[0].deleted_by_user_id, 99)
        self.assertEqual(added_archives[0].deleted_by_email, "admin@platform.local")
        self.assertIn('"billing_events_count": 1', added_archives[0].summary_json)
        self.assertIn('"recent_billing_events"', added_archives[0].summary_json)
        self.assertIn('"recent_policy_events"', added_archives[0].summary_json)
        self.assertIn('"recent_provisioning_jobs"', added_archives[0].summary_json)

    def test_tenant_service_rejects_deprovision_request_for_non_archived_tenant(self) -> None:
        tenant = build_tenant_record_stub(status="active")
        tenant.db_name = "tenant_empresa_demo"
        tenant.db_user = "user_empresa_demo"
        tenant.db_host = "127.0.0.1"
        tenant.db_port = 5432
        service = TenantService(
            tenant_repository=SimpleNamespace(get_by_id=lambda db, tenant_id: tenant)
        )

        with self.assertRaises(ValueError) as exc:
            service.request_deprovision_tenant(db=MagicMock(), tenant_id=1)

        self.assertEqual(
            str(exc.exception),
            "Only archived tenants can be deprovisioned",
        )

    def test_tenant_service_enqueues_deprovision_for_archived_tenant_with_db(self) -> None:
        tenant = build_tenant_record_stub(status="archived", tenant_slug="empresa-demo")
        tenant.id = 1
        tenant.db_name = "tenant_empresa_demo"
        tenant.db_user = "user_empresa_demo"
        tenant.db_host = "127.0.0.1"
        tenant.db_port = 5432
        db = MagicMock()
        query = db.query.return_value
        query.filter.return_value = query
        query.order_by.return_value = query
        query.first.return_value = None
        dispatch = MagicMock()
        dispatch.enqueue_job.return_value = SimpleNamespace(
            id=31,
            tenant_id=1,
            job_type="deprovision_tenant_database",
            status="pending",
        )
        service = TenantService(
            tenant_repository=SimpleNamespace(get_by_id=lambda db, tenant_id: tenant),
            provisioning_dispatch_service=dispatch,
        )

        result = service.request_deprovision_tenant(db=db, tenant_id=1)

        self.assertEqual(result.id, 31)
        dispatch.enqueue_job.assert_called_once_with(
            db=db,
            tenant_id=1,
            job_type="deprovision_tenant_database",
            status="pending",
        )

    def test_tenant_service_deprovisions_archived_tenant_and_clears_db_config(self) -> None:
        tenant = build_tenant_record_stub(status="archived", tenant_slug="empresa-demo")
        tenant.id = 1
        tenant.db_name = "tenant_empresa_demo"
        tenant.db_user = "user_empresa_demo"
        tenant.db_host = "127.0.0.1"
        tenant.db_port = 5432
        tenant.tenant_schema_version = "0005_finance_transactions"
        tenant.tenant_schema_synced_at = datetime.now(timezone.utc)
        tenant.tenant_db_credentials_rotated_at = datetime.now(timezone.utc)

        class FakeTenantRepository:
            def get_by_id(self, db, tenant_id):
                return tenant

            def save(self, db, tenant_to_save):
                return tenant_to_save

        tenant_secret_service = MagicMock()
        db = MagicMock()
        query = db.query.return_value
        query.filter.return_value = query
        query.order_by.return_value = query
        query.first.return_value = None

        service = TenantService(
            tenant_repository=FakeTenantRepository(),
            tenant_secret_service=tenant_secret_service,
        )

        with patch(
            "app.apps.platform_control.services.tenant_service.PostgresBootstrapService"
        ) as bootstrap_cls:
            bootstrap = bootstrap_cls.return_value

            result = service.deprovision_tenant(db=db, tenant_id=1)

        self.assertIs(result["tenant"], tenant)
        self.assertTrue(result["dropped_database"])
        self.assertTrue(result["dropped_role"])
        bootstrap.drop_database_if_exists.assert_called_once_with("tenant_empresa_demo")
        bootstrap.drop_role_if_exists.assert_called_once_with("user_empresa_demo")
        tenant_secret_service.clear_tenant_db_password.assert_called_once()
        tenant_secret_service.clear_tenant_bootstrap_db_password.assert_called_once()
        self.assertIsNone(tenant.db_name)
        self.assertIsNone(tenant.db_user)
        self.assertIsNone(tenant.db_host)
        self.assertIsNone(tenant.db_port)
        self.assertIsNone(tenant.tenant_schema_version)
        self.assertIsNone(tenant.tenant_schema_synced_at)
        self.assertIsNone(tenant.tenant_db_credentials_rotated_at)

    def test_tenant_service_tags_database_drop_failure_during_deprovision(self) -> None:
        tenant = build_tenant_record_stub(status="archived", tenant_slug="empresa-demo")
        tenant.id = 1
        tenant.db_name = "tenant_empresa_demo"
        tenant.db_user = "user_empresa_demo"
        tenant.db_host = "127.0.0.1"
        tenant.db_port = 5432

        class FakeTenantRepository:
            def get_by_id(self, db, tenant_id):
                return tenant

            def save(self, db, tenant_to_save):
                return tenant_to_save

        service = TenantService(
            tenant_repository=FakeTenantRepository(),
            tenant_secret_service=MagicMock(),
        )

        with patch(
            "app.apps.platform_control.services.tenant_service.PostgresBootstrapService"
        ) as bootstrap_cls:
            bootstrap_cls.return_value.drop_database_if_exists.side_effect = RuntimeError(
                "drop database blocked"
            )

            with self.assertRaises(RuntimeError) as raised:
                service.deprovision_tenant(db=MagicMock(), tenant_id=1)

        self.assertEqual(
            getattr(raised.exception, "_provisioning_stage", None),
            "deprovision_tenant_database",
        )

    def test_tenant_service_deletes_archived_unprovisioned_tenant_and_technical_history(self) -> None:
        tenant = build_tenant_record_stub(status="archived")
        tenant.id = 1
        deleted_targets: list[int] = []
        deleted_queries: list[tuple[str, bool]] = []
        added_archives: list[object] = []

        class FakeQuery:
            def __init__(self, model_name: str):
                self.model_name = model_name
                self.filter_calls = 0

            def filter(self, *args, **kwargs):
                self.filter_calls += 1
                return self

            def count(self):
                return 0

            def delete(self, synchronize_session=False):
                deleted_queries.append((self.model_name, synchronize_session))
                return 1

        class FakeDb:
            def query(self, model):
                return FakeQuery(model.__name__)

            def add(self, item):
                added_archives.append(item)

        class FakeTenantRepository:
            def get_by_id(self, db, tenant_id):
                return tenant

            def delete(self, db, target):
                deleted_targets.append(target.id)

        service = TenantService(tenant_repository=FakeTenantRepository())

        result = service.delete_tenant(db=FakeDb(), tenant_id=1)

        self.assertIs(result, tenant)
        self.assertEqual(deleted_targets, [tenant.id])
        self.assertEqual(len(added_archives), 1)
        self.assertEqual(
            deleted_queries,
            [
                ("ProvisioningJob", False),
                ("TenantBillingSyncEvent", False),
                ("TenantPolicyChangeEvent", False),
            ],
        )

    def test_tenant_service_allows_delete_after_completed_provisioning_when_unprovisioned(self) -> None:
        tenant = build_tenant_record_stub(status="archived")
        tenant.id = 1
        deleted_targets: list[int] = []
        added_archives: list[object] = []

        class FakeQuery:
            def __init__(self, model_name: str):
                self.model_name = model_name

            def filter(self, *args, **kwargs):
                return self

            def count(self):
                if self.model_name == "TenantBillingSyncEvent":
                    return 0
                if self.model_name == "ProvisioningJob":
                    return 1
                return 0

            def delete(self, synchronize_session=False):
                return 1

        class FakeDb:
            def query(self, model):
                return FakeQuery(model.__name__)

            def add(self, item):
                added_archives.append(item)

        class FakeTenantRepository:
            def get_by_id(self, db, tenant_id):
                return tenant

            def delete(self, db, target):
                deleted_targets.append(target.id)

        service = TenantService(tenant_repository=FakeTenantRepository())

        result = service.delete_tenant(db=FakeDb(), tenant_id=1)

        self.assertIs(result, tenant)
        self.assertEqual(deleted_targets, [1])
        self.assertEqual(len(added_archives), 1)

    def test_tenant_service_rejects_reprovision_for_archived_tenant(self) -> None:
        tenant = build_tenant_record_stub(status="archived")
        tenant.id = 1
        service = TenantService(
            tenant_repository=SimpleNamespace(get_by_id=lambda db, tenant_id: tenant)
        )

        with self.assertRaises(ValueError) as exc:
            service.reprovision_tenant(db=object(), tenant_id=1)

        self.assertEqual(
            str(exc.exception),
            "Archived tenants must be restored before reprovisioning",
        )

    def test_tenant_service_rejects_reprovision_for_complete_db(self) -> None:
        tenant = build_tenant_record_stub(status="active")
        tenant.id = 1
        tenant.db_name = "tenant_empresa_demo"
        tenant.db_user = "user_empresa_demo"
        tenant.db_host = "127.0.0.1"
        tenant.db_port = 5432
        service = TenantService(
            tenant_repository=SimpleNamespace(get_by_id=lambda db, tenant_id: tenant)
        )

        with self.assertRaises(ValueError) as exc:
            service.reprovision_tenant(db=MagicMock(), tenant_id=1)

        self.assertEqual(
            str(exc.exception),
            "Tenant database configuration is already complete",
        )

    def test_tenant_service_rejects_reprovision_with_live_job(self) -> None:
        tenant = build_tenant_record_stub(status="active")
        tenant.id = 1
        db = MagicMock()
        query = db.query.return_value
        query.filter.return_value = query
        query.order_by.return_value = query
        query.first.return_value = SimpleNamespace(id=9, status="pending")
        dispatch = MagicMock()
        service = TenantService(
            tenant_repository=SimpleNamespace(get_by_id=lambda db, tenant_id: tenant),
            provisioning_dispatch_service=dispatch,
        )

        with self.assertRaises(ValueError) as exc:
            service.reprovision_tenant(db=db, tenant_id=1)

        self.assertEqual(
            str(exc.exception),
            "Tenant already has a live provisioning job",
        )
        dispatch.enqueue_job.assert_not_called()

    def test_tenant_service_enqueues_reprovision_for_incomplete_db(self) -> None:
        tenant = build_tenant_record_stub(status="active", tenant_slug="empresa-demo")
        tenant.id = 1
        db = MagicMock()
        query = db.query.return_value
        query.filter.return_value = query
        query.order_by.return_value = query
        query.first.return_value = None
        dispatch = MagicMock()
        dispatch.enqueue_job.return_value = SimpleNamespace(
            id=21,
            tenant_id=1,
            job_type="create_tenant_database",
            status="pending",
        )
        service = TenantService(
            tenant_repository=SimpleNamespace(get_by_id=lambda db, tenant_id: tenant),
            provisioning_dispatch_service=dispatch,
        )

        result = service.reprovision_tenant(db=db, tenant_id=1)

        self.assertEqual(result.id, 21)
        dispatch.enqueue_job.assert_called_once_with(
            db=db,
            tenant_id=1,
            job_type="create_tenant_database",
            status="pending",
        )

    def test_tenant_service_rotates_db_credentials_and_clears_bootstrap_secret(self) -> None:
        tenant = build_tenant_record_stub(status="active", tenant_slug="empresa-demo")
        tenant.id = 1
        tenant.db_name = "tenant_empresa_demo"
        tenant.db_user = "user_empresa_demo"
        tenant.db_host = "127.0.0.1"
        tenant.db_port = 5432

        class FakeTenantRepository:
            def get_by_id(self, db, tenant_id):
                return tenant

            def save(self, db, tenant_to_save):
                return tenant_to_save

        tenant_secret_service = MagicMock()
        tenant_secret_service.store_tenant_db_password.return_value = (
            "TENANT_DB_PASSWORD__EMPRESA_DEMO"
        )
        tenant_connection_service = MagicMock()
        tenant_connection_service.get_tenant_database_credentials.return_value = {
            "host": "127.0.0.1",
            "port": 5432,
            "database": "tenant_empresa_demo",
            "username": "user_empresa_demo",
            "password": "old-secret",
        }

        service = TenantService(
            tenant_repository=FakeTenantRepository(),
            tenant_connection_service=tenant_connection_service,
            tenant_secret_service=tenant_secret_service,
        )

        with patch(
            "app.apps.platform_control.services.tenant_service.PostgresBootstrapService"
        ) as bootstrap_cls, patch.object(
            service,
            "_validate_tenant_db_connection",
        ) as validate_mock, patch.object(
            service,
            "_generate_tenant_db_password",
            return_value="new-tenant-secret",
        ):
            bootstrap = bootstrap_cls.return_value
            bootstrap.role_exists.return_value = True
            bootstrap.database_exists.return_value = True

            result = service.rotate_tenant_db_credentials(db=object(), tenant_id=1)

        self.assertIs(result["tenant"], tenant)
        self.assertEqual(
            result["env_var_name"], "TENANT_DB_PASSWORD__EMPRESA_DEMO"
        )
        self.assertIsNotNone(result["rotated_at"])
        self.assertIsNotNone(tenant.tenant_db_credentials_rotated_at)
        validate_mock.assert_called_once_with(
            host="127.0.0.1",
            port=5432,
            database="tenant_empresa_demo",
            username="user_empresa_demo",
            password="new-tenant-secret",
        )
        bootstrap.create_role_if_not_exists.assert_called_once_with(
            "user_empresa_demo", "new-tenant-secret"
        )
        tenant_secret_service.store_tenant_db_password.assert_called_once()
        tenant_secret_service.clear_tenant_bootstrap_db_password.assert_called_once()

    def test_tenant_service_restores_previous_password_when_rotation_validation_fails(self) -> None:
        tenant = build_tenant_record_stub(status="active", tenant_slug="empresa-demo")
        tenant.id = 1
        tenant.db_name = "tenant_empresa_demo"
        tenant.db_user = "user_empresa_demo"
        tenant.db_host = "127.0.0.1"
        tenant.db_port = 5432

        service = TenantService(
            tenant_repository=SimpleNamespace(get_by_id=lambda db, tenant_id: tenant),
            tenant_connection_service=SimpleNamespace(
                get_tenant_database_credentials=lambda tenant: {
                    "host": "127.0.0.1",
                    "port": 5432,
                    "database": "tenant_empresa_demo",
                    "username": "user_empresa_demo",
                    "password": "old-secret",
                }
            ),
            tenant_secret_service=MagicMock(),
        )

        with patch(
            "app.apps.platform_control.services.tenant_service.PostgresBootstrapService"
        ) as bootstrap_cls, patch.object(
            service,
            "_validate_tenant_db_connection",
            side_effect=RuntimeError("cannot connect"),
        ), patch.object(
            service,
            "_generate_tenant_db_password",
            return_value="new-tenant-secret",
        ):
            bootstrap = bootstrap_cls.return_value
            bootstrap.role_exists.return_value = True
            bootstrap.database_exists.return_value = True

            with self.assertRaises(ValueError) as exc:
                service.rotate_tenant_db_credentials(db=object(), tenant_id=1)

        self.assertEqual(
            str(exc.exception),
            "Rotated credentials failed validation and the previous password was restored",
        )
        self.assertEqual(
            bootstrap.create_role_if_not_exists.call_args_list[0].args,
            ("user_empresa_demo", "new-tenant-secret"),
        )
        self.assertEqual(
            bootstrap.create_role_if_not_exists.call_args_list[1].args,
            ("user_empresa_demo", "old-secret"),
        )

    def test_tenant_service_resolves_effective_module_limits_with_sources(self) -> None:
        tenant = build_tenant_record_stub(
            plan_code="pro",
            billing_status="past_due",
            billing_grace_until=datetime.now(timezone.utc) + timedelta(days=2),
            module_limits_json='{"finance.entries": 40}',
        )

        service = TenantService(
            tenant_plan_policy_service=TenantPlanPolicyService(
                plan_module_limits="pro=finance.entries:250"
            ),
        )

        with patch(
            "app.apps.platform_control.services.tenant_service."
            "TenantBillingGracePolicyService.get_policy",
            return_value=SimpleNamespace(module_limits={"finance.entries": 25}),
        ):
            self.assertEqual(
                service.get_effective_module_limits(tenant),
                {"finance.entries": 25},
            )
            self.assertEqual(
                service.get_effective_module_limit_sources(tenant),
                {"finance.entries": "billing_grace"},
            )

    def test_tenant_service_updates_maintenance_mode(self) -> None:
        tenant = build_tenant_record_stub(maintenance_mode=False)
        calls: list[tuple] = []

        class FakeTenantRepository:
            def get_by_id(self, db, tenant_id):
                calls.append(("get_by_id", tenant_id))
                return tenant

            def save(self, db, tenant_to_save):
                calls.append(("save", tenant_to_save.maintenance_mode))
                return tenant_to_save

        service = TenantService(
            tenant_repository=FakeTenantRepository(),
        )

        result = service.set_maintenance_mode(
            db=object(),
            tenant_id=7,
            maintenance_mode=True,
        )

        self.assertTrue(result.maintenance_mode)
        self.assertEqual(calls, [("get_by_id", 7), ("save", True)])

    def test_tenant_service_validates_maintenance_window(self) -> None:
        tenant = build_tenant_record_stub()

        class FakeTenantRepository:
            def get_by_id(self, db, tenant_id):
                return tenant

            def save(self, db, tenant_to_save):
                return tenant_to_save

        service = TenantService(tenant_repository=FakeTenantRepository())
        now = datetime.now(timezone.utc)

        with self.assertRaises(ValueError):
            service.set_maintenance_mode(
                db=object(),
                tenant_id=1,
                maintenance_mode=False,
                maintenance_starts_at=now,
                maintenance_ends_at=None,
            )

    def test_tenant_service_detects_active_maintenance_window(self) -> None:
        now = datetime.now(timezone.utc)
        tenant = build_tenant_record_stub(
            maintenance_mode=False,
            maintenance_starts_at=now - timedelta(minutes=5),
            maintenance_ends_at=now + timedelta(minutes=5),
        )
        service = TenantService(tenant_repository=SimpleNamespace())

        self.assertTrue(service.is_tenant_under_maintenance(tenant, now=now))

    def test_tenant_service_detects_active_maintenance_window_with_naive_datetimes(self) -> None:
        now = datetime.now(timezone.utc)
        tenant = build_tenant_record_stub(
            maintenance_mode=False,
            maintenance_starts_at=(now - timedelta(minutes=5)).replace(tzinfo=None),
            maintenance_ends_at=(now + timedelta(minutes=5)).replace(tzinfo=None),
        )
        service = TenantService(tenant_repository=SimpleNamespace())

        self.assertTrue(service.is_tenant_under_maintenance(tenant, now=now))

    def test_tenant_service_normalizes_maintenance_scopes(self) -> None:
        tenant = build_tenant_record_stub(maintenance_scopes=None)

        class FakeTenantRepository:
            def get_by_id(self, db, tenant_id):
                return tenant

            def save(self, db, tenant_to_save):
                return tenant_to_save

        service = TenantService(tenant_repository=FakeTenantRepository())

        result = service.set_maintenance_mode(
            db=object(),
            tenant_id=1,
            maintenance_mode=False,
            maintenance_scopes=["finance", "users"],
            maintenance_access_mode="full_block",
        )

        self.assertEqual(result.maintenance_scopes, "finance,users")
        self.assertEqual(result.maintenance_access_mode, "full_block")

    def test_tenant_service_rejects_invalid_maintenance_scope(self) -> None:
        tenant = build_tenant_record_stub()

        class FakeTenantRepository:
            def get_by_id(self, db, tenant_id):
                return tenant

            def save(self, db, tenant_to_save):
                return tenant_to_save

        service = TenantService(tenant_repository=FakeTenantRepository())

        with self.assertRaises(ValueError):
            service.set_maintenance_mode(
                db=object(),
                tenant_id=1,
                maintenance_mode=True,
                maintenance_scopes=["billing"],
            )

    def test_tenant_service_updates_status(self) -> None:
        tenant = build_tenant_record_stub(status="active", status_reason=None)

        class FakeTenantRepository:
            def get_by_id(self, db, tenant_id):
                return tenant

            def save(self, db, tenant_to_save):
                return tenant_to_save

        service = TenantService(tenant_repository=FakeTenantRepository())

        result = service.set_status(
            db=object(),
            tenant_id=1,
            status="suspended",
            status_reason="billing overdue",
        )

        self.assertEqual(result.status, "suspended")
        self.assertEqual(result.status_reason, "billing overdue")

    def test_tenant_service_gets_schema_status_and_tracks_version(self) -> None:
        tenant = build_tenant_record_stub(status="active")
        tenant.db_name = "tenant_empresa_demo"
        tenant.db_user = "user_empresa_demo"
        tenant.db_host = "127.0.0.1"
        tenant.db_port = 5432

        class FakeTenantRepository:
            def get_by_id(self, db, tenant_id):
                return tenant

            def save(self, db, tenant_to_save):
                return tenant_to_save

        fake_schema_service = SimpleNamespace(
            get_schema_status=lambda **kwargs: {
                "current_version": "0002_finance_entries",
                "latest_available_version": "0002_finance_entries",
                "pending_versions": [],
                "pending_count": 0,
                "last_applied_at": datetime.now(timezone.utc),
            }
        )

        service = TenantService(
            tenant_repository=FakeTenantRepository(),
            tenant_schema_service=fake_schema_service,
        )

        result = service.get_tenant_schema_status(db=object(), tenant_id=1)

        self.assertEqual(result["current_version"], "0002_finance_entries")
        self.assertEqual(tenant.tenant_schema_version, "0002_finance_entries")
        self.assertEqual(result["tenant"], tenant)

    def test_tenant_service_updates_billing_state(self) -> None:
        tenant = build_tenant_record_stub(
            billing_status=None,
            billing_status_reason=None,
        )
        grace_until = datetime.now(timezone.utc) + timedelta(days=3)

        class FakeTenantRepository:
            def get_by_id(self, db, tenant_id):
                return tenant

            def save(self, db, tenant_to_save):
                return tenant_to_save

        service = TenantService(tenant_repository=FakeTenantRepository())

        result = service.set_billing_state(
            db=object(),
            tenant_id=1,
            billing_status="past_due",
            billing_status_reason="invoice overdue",
            billing_grace_until=grace_until,
        )

        self.assertEqual(result.billing_status, "past_due")
        self.assertEqual(result.billing_status_reason, "invoice overdue")
        self.assertEqual(result.billing_grace_until, grace_until)

    def test_tenant_service_updates_billing_identity(self) -> None:
        tenant = build_tenant_record_stub()
        tenant.id = 1

        class FakeTenantRepository:
            def get_by_id(self, db, tenant_id):
                return tenant

            def save(self, db, tenant_to_save):
                return tenant_to_save

        service = TenantService(tenant_repository=FakeTenantRepository())

        result = service.set_billing_identity(
            db=object(),
            tenant_id=1,
            billing_provider="stripe",
            billing_provider_customer_id="cus_1",
            billing_provider_subscription_id="sub_1",
        )

        self.assertEqual(result.billing_provider, "stripe")
        self.assertEqual(result.billing_provider_customer_id, "cus_1")
        self.assertEqual(result.billing_provider_subscription_id, "sub_1")

    def test_tenant_service_resolves_tenant_for_billing_provider_event_by_subscription_first(self) -> None:
        tenant = build_tenant_record_stub(
            billing_provider="stripe",
            billing_provider_customer_id="cus_1",
            billing_provider_subscription_id="sub_1",
        )

        class FakeTenantRepository:
            def get_by_billing_provider_subscription_id(
                self,
                db,
                *,
                provider,
                provider_subscription_id,
            ):
                return tenant if provider == "stripe" and provider_subscription_id == "sub_1" else None

            def get_by_billing_provider_customer_id(
                self,
                db,
                *,
                provider,
                provider_customer_id,
            ):
                return None

            def get_by_slug(self, db, slug):
                return None

        service = TenantService(tenant_repository=FakeTenantRepository())

        result = service.resolve_tenant_for_billing_provider_event(
            object(),
            provider="stripe",
            tenant_slug="empresa-bootstrap",
            provider_customer_id="cus_1",
            provider_subscription_id="sub_1",
        )

        self.assertIs(result, tenant)

    def test_tenant_policy_event_service_builds_snapshot_and_changed_fields(self) -> None:
        before_tenant = build_tenant_record_stub(
            plan_code="basic",
            billing_status="active",
            api_read_requests_per_minute=60,
        )
        before_tenant.id = 1
        after_tenant = build_tenant_record_stub(
            plan_code="pro",
            billing_status="past_due",
            billing_status_reason="invoice overdue",
            api_read_requests_per_minute=20,
        )
        after_tenant.id = 1
        calls = []

        class FakeEventRepository:
            def save(self, db, *, row):
                calls.append(row)
                return SimpleNamespace(
                    id=10,
                    **row,
                    recorded_at=datetime.now(timezone.utc),
                )

        service = TenantPolicyEventService(
            tenant_policy_change_event_repository=FakeEventRepository()
        )
        before_snapshot = service.build_snapshot(before_tenant)
        after_snapshot = service.build_snapshot(after_tenant)

        event = service.record_change(
            object(),
            tenant=after_tenant,
            event_type="billing",
            previous_state=before_snapshot,
            new_state=after_snapshot,
            actor_context={
                "sub": "1",
                "email": "admin@platform.local",
                "role": "superadmin",
            },
        )

        self.assertEqual(event.event_type, "billing")
        self.assertEqual(calls[0]["tenant_slug"], "empresa-bootstrap")
        self.assertIn("plan_code", calls[0]["changed_fields_json"])
        self.assertIn("billing_status", calls[0]["changed_fields_json"])

    def test_tenant_billing_sync_service_applies_event_idempotently(self) -> None:
        tenant = build_tenant_record_stub(
            billing_status="active",
            billing_status_reason=None,
        )
        tenant.id = 1
        saved_events = []

        class FakeTenantRepository:
            def get_by_id(self, db, tenant_id):
                return tenant

            def save(self, db, tenant_to_save):
                return tenant_to_save

        class FakeSyncRepository:
            def __init__(self):
                self.saved = []

            def get_by_provider_event_id(self, db, *, provider, provider_event_id):
                for row in self.saved:
                    if (
                        row.provider == provider
                        and row.provider_event_id == provider_event_id
                    ):
                        return row
                return None

            def save(self, db, *, event):
                event.id = len(self.saved) + 1
                event.recorded_at = datetime.now(timezone.utc)
                self.saved.append(event)
                saved_events.append(event)
                return event

            def update_processing_result(self, db, *, event, processing_result):
                event.processing_result = processing_result
                return event

            def list_recent(self, db, *, tenant_id, provider=None, limit=50):
                return list(self.saved)[:limit]

        fake_sync_repository = FakeSyncRepository()
        fake_policy_event_service = SimpleNamespace(
            build_snapshot=lambda current_tenant: {
                "billing_status": current_tenant.billing_status,
                "billing_status_reason": current_tenant.billing_status_reason,
            },
            record_change=lambda *args, **kwargs: None,
        )
        service = TenantBillingSyncService(
            tenant_service=TenantService(tenant_repository=FakeTenantRepository()),
            tenant_policy_event_service=fake_policy_event_service,
            tenant_billing_sync_event_repository=fake_sync_repository,
        )

        first = service.apply_sync_event(
            object(),
            tenant_id=1,
            provider="stripe",
            provider_event_id="evt_1",
            event_type="invoice.payment_failed",
            billing_status="past_due",
            billing_status_reason="invoice overdue",
        )
        second = service.apply_sync_event(
            object(),
            tenant_id=1,
            provider="stripe",
            provider_event_id="evt_1",
            event_type="invoice.payment_failed",
            billing_status="past_due",
            billing_status_reason="invoice overdue",
        )

        self.assertFalse(first.was_duplicate)
        self.assertTrue(second.was_duplicate)
        self.assertEqual(len(saved_events), 1)
        self.assertEqual(tenant.billing_status, "past_due")
        self.assertEqual(second.sync_event.processing_result, "duplicate")

    def test_tenant_billing_sync_service_preserves_existing_identity_when_event_is_partial(self) -> None:
        tenant = build_tenant_record_stub(
            billing_provider="stripe",
            billing_provider_customer_id="cus_existing",
            billing_provider_subscription_id="sub_existing",
            billing_status="active",
        )
        tenant.id = 1

        class FakeTenantRepository:
            def get_by_id(self, db, tenant_id):
                return tenant

            def save(self, db, tenant_to_save):
                return tenant_to_save

        class FakeSyncRepository:
            def get_by_provider_event_id(self, db, *, provider, provider_event_id):
                return None

            def save(self, db, *, event):
                event.id = 1
                event.recorded_at = datetime.now(timezone.utc)
                return event

            def update_processing_result(self, db, *, event, processing_result):
                event.processing_result = processing_result
                return event

        service = TenantBillingSyncService(
            tenant_service=TenantService(tenant_repository=FakeTenantRepository()),
            tenant_policy_event_service=SimpleNamespace(
                build_snapshot=lambda current_tenant: {
                    "billing_provider_customer_id": current_tenant.billing_provider_customer_id,
                    "billing_provider_subscription_id": current_tenant.billing_provider_subscription_id,
                    "billing_status": current_tenant.billing_status,
                },
                record_change=lambda *args, **kwargs: None,
            ),
            tenant_billing_sync_event_repository=FakeSyncRepository(),
        )

        service.apply_sync_event(
            object(),
            tenant_id=1,
            provider="stripe",
            provider_event_id="evt_partial",
            event_type="invoice.paid",
            billing_status="active",
            billing_status_reason="invoice.paid",
            provider_customer_id=None,
            provider_subscription_id=None,
        )

        self.assertEqual(tenant.billing_provider, "stripe")
        self.assertEqual(tenant.billing_provider_customer_id, "cus_existing")
        self.assertEqual(tenant.billing_provider_subscription_id, "sub_existing")

    def test_tenant_billing_sync_service_ignores_event_without_operational_change(self) -> None:
        tenant = build_tenant_record_stub(
            billing_provider="stripe",
            billing_status="active",
            billing_status_reason="seeded",
        )
        tenant.id = 1

        class FakeTenantRepository:
            def get_by_id(self, db, tenant_id):
                return tenant

            def save(self, db, tenant_to_save):
                return tenant_to_save

        class FakeSyncRepository:
            def get_by_provider_event_id(self, db, *, provider, provider_event_id):
                return None

            def save(self, db, *, event):
                event.id = 7
                event.recorded_at = datetime.now(timezone.utc)
                return event

            def update_processing_result(self, db, *, event, processing_result):
                event.processing_result = processing_result
                return event

        service = TenantBillingSyncService(
            tenant_service=TenantService(tenant_repository=FakeTenantRepository()),
            tenant_policy_event_service=SimpleNamespace(
                build_snapshot=lambda current_tenant: {
                    "billing_status": current_tenant.billing_status,
                },
                record_change=lambda *args, **kwargs: self.fail(
                    "record_change should not be called for ignored events"
                ),
            ),
            tenant_billing_sync_event_repository=FakeSyncRepository(),
        )

        result = service.apply_sync_event(
            object(),
            tenant_id=1,
            provider="stripe",
            provider_event_id="evt_ignored",
            event_type="customer.created",
            billing_status=None,
            billing_status_reason=None,
            provider_customer_id="cus_1",
            provider_subscription_id=None,
        )

        self.assertTrue(result.was_ignored)
        self.assertEqual(result.sync_event.processing_result, "ignored")
        self.assertEqual(tenant.billing_status, "active")

    def test_billing_provider_adapter_service_normalizes_stripe_subscription_event(self) -> None:
        service = BillingProviderAdapterService()

        normalized = service.normalize_event(
            provider="stripe",
            payload={
                "id": "evt_1",
                "type": "customer.subscription.updated",
                "data": {
                    "object": {
                        "id": "sub_1",
                        "customer": "cus_1",
                        "status": "past_due",
                        "current_period_end": 1770000000,
                        "metadata": {"tenant_slug": "empresa-bootstrap"},
                    }
                },
            },
        )

        self.assertEqual(normalized.provider, "stripe")
        self.assertEqual(normalized.provider_event_id, "evt_1")
        self.assertEqual(normalized.tenant_slug, "empresa-bootstrap")
        self.assertEqual(normalized.provider_subscription_id, "sub_1")
        self.assertEqual(normalized.billing_status, "past_due")

    def test_billing_provider_adapter_service_normalizes_stripe_invoice_action_required(self) -> None:
        service = BillingProviderAdapterService()

        normalized = service.normalize_event(
            provider="stripe",
            payload={
                "id": "evt_2",
                "type": "invoice.payment_action_required",
                "data": {
                    "object": {
                        "customer": "cus_1",
                        "subscription": "sub_1",
                        "period_end": 1770000000,
                        "metadata": {"tenant_slug": "empresa-bootstrap"},
                    }
                },
            },
        )

        self.assertEqual(normalized.provider_event_id, "evt_2")
        self.assertEqual(normalized.billing_status, "past_due")

    def test_billing_provider_adapter_service_accepts_provider_ids_without_tenant_slug(self) -> None:
        service = BillingProviderAdapterService()

        normalized = service.normalize_event(
            provider="stripe",
            payload={
                "id": "evt_3",
                "type": "invoice.paid",
                "data": {
                    "object": {
                        "customer": "cus_42",
                        "subscription": "sub_42",
                        "period_end": 1770000000,
                        "metadata": {},
                    }
                },
            },
        )

        self.assertIsNone(normalized.tenant_slug)
        self.assertEqual(normalized.provider_customer_id, "cus_42")
        self.assertEqual(normalized.provider_subscription_id, "sub_42")

    def test_tenant_billing_sync_service_reconciles_from_stored_event(self) -> None:
        tenant = build_tenant_record_stub(
            billing_provider="stripe",
            billing_provider_customer_id="cus_old",
            billing_provider_subscription_id="sub_old",
            billing_status="active",
        )
        tenant.id = 1
        recorded_at = datetime.now(timezone.utc)
        sync_event = SimpleNamespace(
            id=9,
            tenant_id=1,
            tenant_slug="empresa-bootstrap",
            provider="stripe",
            provider_event_id="evt_reconcile",
            provider_customer_id="cus_new",
            provider_subscription_id="sub_new",
            event_type="invoice.payment_failed",
            billing_status="past_due",
            billing_status_reason="invoice.payment_failed",
            billing_current_period_ends_at=None,
            billing_grace_until=None,
            processing_result="applied",
            recorded_at=recorded_at,
        )
        recorded_changes = []

        class FakeTenantRepository:
            def get_by_id(self, db, tenant_id):
                return tenant

            def save(self, db, tenant_to_save):
                return tenant_to_save

        class FakeSyncRepository:
            def get_by_id(self, db, *, event_id):
                if event_id == 9:
                    return sync_event
                return None

            def update_processing_result(self, db, *, event, processing_result):
                event.processing_result = processing_result
                return event

        service = TenantBillingSyncService(
            tenant_service=TenantService(tenant_repository=FakeTenantRepository()),
            tenant_policy_event_service=SimpleNamespace(
                build_snapshot=lambda current_tenant: {
                    "billing_status": current_tenant.billing_status,
                    "billing_provider_customer_id": current_tenant.billing_provider_customer_id,
                },
                record_change=lambda *args, **kwargs: recorded_changes.append(kwargs),
            ),
            tenant_billing_sync_event_repository=FakeSyncRepository(),
        )

        result = service.reconcile_from_stored_event(
            object(),
            tenant_id=1,
            sync_event_id=9,
            actor_context={"email": "admin@platform.local"},
        )

        self.assertTrue(result.was_reconciled)
        self.assertEqual(tenant.billing_status, "past_due")
        self.assertEqual(tenant.billing_provider_customer_id, "cus_new")
        self.assertEqual(tenant.billing_provider_subscription_id, "sub_new")
        self.assertEqual(recorded_changes[0]["event_type"], "billing_reconcile")
        self.assertEqual(result.sync_event.processing_result, "reconciled")

    def test_tenant_billing_sync_service_reconciles_recent_events_with_filters(self) -> None:
        tenant = build_tenant_record_stub()
        tenant.id = 1
        row_one = SimpleNamespace(id=11)
        row_two = SimpleNamespace(id=12)
        calls = []

        class FakeTenantRepository:
            def get_by_id(self, db, tenant_id):
                return tenant

        class FakeSyncRepository:
            def list_recent(
                self,
                db,
                *,
                tenant_id,
                provider=None,
                event_type=None,
                processing_result=None,
                limit=50,
            ):
                calls.append(
                    (
                        tenant_id,
                        provider,
                        event_type,
                        processing_result,
                        limit,
                    )
                )
                return [row_one, row_two]

        service = TenantBillingSyncService(
            tenant_service=TenantService(tenant_repository=FakeTenantRepository()),
            tenant_policy_event_service=SimpleNamespace(),
            tenant_billing_sync_event_repository=FakeSyncRepository(),
        )

        with patch.object(
            service,
            "reconcile_from_stored_event",
            side_effect=[
                SimpleNamespace(sync_event=SimpleNamespace(id=11)),
                SimpleNamespace(sync_event=SimpleNamespace(id=12)),
            ],
        ) as reconcile_from_stored_event:
            results = service.reconcile_recent_events(
                object(),
                tenant_id=1,
                provider="stripe",
                event_type="invoice.payment_failed",
                processing_result="applied",
                limit=2,
                actor_context={"email": "admin@platform.local"},
            )

        self.assertEqual(len(results), 2)
        self.assertEqual(
            calls,
            [(1, "stripe", "invoice.payment_failed", "applied", 2)],
        )
        self.assertEqual(reconcile_from_stored_event.call_count, 2)

    def test_tenant_billing_sync_service_summarizes_recent_events(self) -> None:
        calls = []

        class FakeSyncRepository:
            def summarize_recent(
                self,
                db,
                *,
                tenant_id,
                provider=None,
                event_type=None,
                processing_result=None,
            ):
                calls.append(
                    (
                        tenant_id,
                        provider,
                        event_type,
                        processing_result,
                    )
                )
                return [
                    {
                        "provider": "stripe",
                        "event_type": "invoice.payment_failed",
                        "processing_result": "duplicate",
                        "total_events": 3,
                        "last_recorded_at": datetime.now(timezone.utc),
                    }
                ]

        service = TenantBillingSyncService(
            tenant_service=SimpleNamespace(),
            tenant_policy_event_service=SimpleNamespace(),
            tenant_billing_sync_event_repository=FakeSyncRepository(),
        )

        rows = service.summarize_recent_events(
            object(),
            tenant_id=1,
            provider="stripe",
            event_type="invoice.payment_failed",
            processing_result="duplicate",
        )

        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["processing_result"], "duplicate")
        self.assertEqual(
            calls,
            [(1, "stripe", "invoice.payment_failed", "duplicate")],
        )

    def test_tenant_billing_sync_service_summarizes_all_recent_events(self) -> None:
        calls = []

        class FakeSyncRepository:
            def summarize_all_recent(
                self,
                db,
                *,
                provider=None,
                event_type=None,
                processing_result=None,
            ):
                calls.append((provider, event_type, processing_result))
                return [
                    {
                        "provider": "stripe",
                        "event_type": "invoice.payment_failed",
                        "processing_result": "duplicate",
                        "total_events": 4,
                        "total_tenants": 2,
                        "last_recorded_at": datetime.now(timezone.utc),
                    }
                ]

        service = TenantBillingSyncService(
            tenant_service=SimpleNamespace(),
            tenant_policy_event_service=SimpleNamespace(),
            tenant_billing_sync_event_repository=FakeSyncRepository(),
        )

        rows = service.summarize_all_recent_events(
            object(),
            provider="stripe",
            event_type="invoice.payment_failed",
            processing_result="duplicate",
        )

        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["total_tenants"], 2)
        self.assertEqual(
            calls,
            [("stripe", "invoice.payment_failed", "duplicate")],
        )

    def test_billing_alert_service_builds_operational_alerts(self) -> None:
        recorded_at = datetime.now(timezone.utc)

        fake_sync_service = SimpleNamespace(
            summarize_all_recent_events=lambda db, provider=None, event_type=None: [
                {
                    "provider": "stripe",
                    "event_type": "invoice.payment_failed",
                    "processing_result": "duplicate",
                    "total_events": 4,
                    "total_tenants": 2,
                    "last_recorded_at": recorded_at,
                },
                {
                    "provider": "stripe",
                    "event_type": "invoice.payment_failed",
                    "processing_result": "ignored",
                    "total_events": 3,
                    "total_tenants": 2,
                    "last_recorded_at": recorded_at,
                },
                {
                    "provider": "stripe",
                    "event_type": "invoice.paid",
                    "processing_result": "applied",
                    "total_events": 5,
                    "total_tenants": 3,
                    "last_recorded_at": recorded_at,
                },
            ]
        )
        service = BillingAlertService(tenant_billing_sync_service=fake_sync_service)

        with patch(
            "app.apps.platform_control.services.billing_alert_service."
            "settings.BILLING_ALERT_DUPLICATE_EVENTS_THRESHOLD",
            4,
        ), patch(
            "app.apps.platform_control.services.billing_alert_service."
            "settings.BILLING_ALERT_IGNORED_EVENTS_THRESHOLD",
            3,
        ), patch(
            "app.apps.platform_control.services.billing_alert_service."
            "settings.BILLING_ALERT_PROVIDER_EVENTS_THRESHOLD",
            10,
        ):
            alerts = service.list_active_alerts(object(), provider="stripe")

        self.assertEqual(len(alerts), 3)
        self.assertEqual(alerts[0]["alert_code"], "billing_provider_event_volume_threshold_exceeded")
        self.assertEqual(alerts[0]["severity"], "critical")
        self.assertEqual(alerts[1]["processing_result"], "duplicate")
        self.assertEqual(alerts[2]["processing_result"], "ignored")
        self.assertEqual(alerts[0]["observed_value"], 12)
        self.assertEqual(alerts[1]["threshold_value"], 4)
        self.assertEqual(alerts[2]["threshold_value"], 3)

    def test_billing_alert_service_delegates_history_to_repository(self) -> None:
        recorded_at = datetime(2026, 3, 19, 12, 0, tzinfo=timezone.utc)
        stored_alert = SimpleNamespace(
            id=1,
            alert_code="billing_duplicate_events_threshold_exceeded",
            severity="warning",
            provider="stripe",
            event_type="invoice.payment_failed",
            processing_result="duplicate",
            message="duplicates detectados",
            observed_value=4,
            threshold_value=3,
            total_tenants=2,
            source_recorded_at=recorded_at,
            recorded_at=recorded_at,
        )

        class FakeAlertRepository:
            def list_recent(
                self,
                db,
                limit,
                provider,
                event_type,
                processing_result,
                alert_code,
                severity,
            ):
                self.calls = (
                    db,
                    limit,
                    provider,
                    event_type,
                    processing_result,
                    alert_code,
                    severity,
                )
                return [stored_alert]

        service = BillingAlertService(
            billing_operational_alert_repository=FakeAlertRepository(),
        )

        result = service.list_recent_alert_history(
            object(),
            limit=25,
            provider="stripe",
            event_type="invoice.payment_failed",
            processing_result="duplicate",
            alert_code="billing_duplicate_events_threshold_exceeded",
            severity="warning",
        )

        self.assertEqual(result[0]["observed_value"], 4)
        self.assertEqual(
            service.billing_operational_alert_repository.calls,
            (
                unittest.mock.ANY,
                25,
                "stripe",
                "invoice.payment_failed",
                "duplicate",
                "billing_duplicate_events_threshold_exceeded",
                "warning",
            ),
        )

    def test_stripe_webhook_signature_service_validates_signature(self) -> None:
        service = StripeWebhookSignatureService(tolerance_seconds=300)
        secret = "whsec_test"
        payload = b'{"id":"evt_1"}'
        timestamp = 1770000000
        signed_payload = f"{timestamp}.".encode("utf-8") + payload
        signature = hmac.new(
            secret.encode("utf-8"),
            signed_payload,
            hashlib.sha256,
        ).hexdigest()

        result = service.validate_signature(
            payload=payload,
            signature_header=f"t={timestamp},v1={signature}",
            secret=secret,
            now_timestamp=timestamp + 10,
        )

        self.assertTrue(result)

    def test_tenant_policy_event_service_builds_snapshot_and_changed_fields(self) -> None:
        before_tenant = build_tenant_record_stub(
            plan_code="basic",
            billing_status="active",
            api_read_requests_per_minute=60,
        )
        before_tenant.id = 1
        after_tenant = build_tenant_record_stub(
            plan_code="pro",
            billing_status="past_due",
            billing_status_reason="invoice overdue",
            api_read_requests_per_minute=20,
        )
        after_tenant.id = 1
        calls = []

        class FakeEventRepository:
            def save(self, db, *, row):
                calls.append(row)
                return SimpleNamespace(id=10, **row, recorded_at=datetime.now(timezone.utc))

        service = TenantPolicyEventService(
            tenant_policy_change_event_repository=FakeEventRepository()
        )
        before_snapshot = service.build_snapshot(before_tenant)
        after_snapshot = service.build_snapshot(after_tenant)

        event = service.record_change(
            object(),
            tenant=after_tenant,
            event_type="billing",
            previous_state=before_snapshot,
            new_state=after_snapshot,
            actor_context={"sub": "1", "email": "admin@platform.local", "role": "superadmin"},
        )

        self.assertEqual(event.event_type, "billing")
        self.assertEqual(calls[0]["tenant_slug"], "empresa-bootstrap")
        self.assertIn("plan_code", calls[0]["changed_fields_json"])
        self.assertIn("billing_status", calls[0]["changed_fields_json"])

    def test_tenant_service_rejects_invalid_billing_status(self) -> None:
        tenant = build_tenant_record_stub()

        class FakeTenantRepository:
            def get_by_id(self, db, tenant_id):
                return tenant

            def save(self, db, tenant_to_save):
                return tenant_to_save

        service = TenantService(tenant_repository=FakeTenantRepository())

        with self.assertRaises(ValueError):
            service.set_billing_state(
                db=object(),
                tenant_id=1,
                billing_status="paused",
            )

    def test_tenant_service_billing_error_allows_past_due_with_grace(self) -> None:
        grace_until = datetime.now(timezone.utc) + timedelta(days=1)
        tenant = build_tenant_record_stub(
            status="active",
            billing_status="past_due",
            billing_grace_until=grace_until,
        )
        service = TenantService(tenant_repository=SimpleNamespace())

        self.assertIsNone(service.get_tenant_status_error(tenant))

    def test_tenant_service_billing_error_blocks_past_due_without_grace(self) -> None:
        grace_until = datetime.now(timezone.utc) - timedelta(days=1)
        tenant = build_tenant_record_stub(
            status="active",
            billing_status="past_due",
            billing_status_reason="invoice overdue",
            billing_grace_until=grace_until,
        )
        service = TenantService(tenant_repository=SimpleNamespace())

        result = service.get_tenant_status_error(tenant)

        self.assertEqual(result, (423, "invoice overdue"))

    def test_tenant_service_billing_error_allows_canceled_inside_current_period(self) -> None:
        current_period_ends_at = datetime.now(timezone.utc) + timedelta(days=1)
        tenant = build_tenant_record_stub(
            status="active",
            billing_status="canceled",
            billing_status_reason="subscription canceled by customer",
            billing_current_period_ends_at=current_period_ends_at,
        )
        service = TenantService(tenant_repository=SimpleNamespace())

        self.assertIsNone(service.get_tenant_billing_error(tenant))

    def test_tenant_service_billing_error_blocks_canceled_after_current_period(self) -> None:
        current_period_ends_at = datetime.now(timezone.utc) - timedelta(days=1)
        tenant = build_tenant_record_stub(
            status="active",
            billing_status="canceled",
            billing_status_reason="subscription canceled by customer",
            billing_current_period_ends_at=current_period_ends_at,
        )
        service = TenantService(tenant_repository=SimpleNamespace())

        result = service.get_tenant_billing_error(tenant)

        self.assertEqual(result, (403, "subscription canceled by customer"))

    def test_tenant_service_access_policy_allows_canceled_inside_current_period(self) -> None:
        tenant = build_tenant_record_stub(
            status="active",
            billing_status="canceled",
            billing_current_period_ends_at=datetime.now(timezone.utc) + timedelta(days=1),
        )
        service = TenantService(tenant_repository=SimpleNamespace())

        policy = service.get_tenant_access_policy(tenant)

        self.assertTrue(policy.allowed)
        self.assertEqual(policy.blocking_source, None)

    def test_tenant_service_access_policy_blocks_canceled_after_current_period(self) -> None:
        tenant = build_tenant_record_stub(
            status="active",
            billing_status="canceled",
            billing_status_reason="subscription canceled by customer",
            billing_current_period_ends_at=datetime.now(timezone.utc) - timedelta(days=1),
        )
        service = TenantService(tenant_repository=SimpleNamespace())

        policy = service.get_tenant_access_policy(tenant)

        self.assertFalse(policy.allowed)
        self.assertEqual(policy.blocking_source, "billing")
        self.assertEqual(policy.status_code, 403)
        self.assertEqual(policy.detail, "subscription canceled by customer")

    def test_tenant_service_billing_error_blocks_suspended_billing(self) -> None:
        tenant = build_tenant_record_stub(
            status="active",
            billing_status="suspended",
            billing_status_reason="billing policy suspended this tenant",
        )
        service = TenantService(tenant_repository=SimpleNamespace())

        result = service.get_tenant_billing_error(tenant)

        self.assertEqual(result, (423, "billing policy suspended this tenant"))

    def test_tenant_service_access_policy_blocks_suspended_billing(self) -> None:
        tenant = build_tenant_record_stub(
            status="active",
            billing_status="suspended",
            billing_status_reason="billing policy suspended this tenant",
        )
        service = TenantService(tenant_repository=SimpleNamespace())

        policy = service.get_tenant_access_policy(tenant)

        self.assertFalse(policy.allowed)
        self.assertEqual(policy.blocking_source, "billing")
        self.assertEqual(policy.status_code, 423)
        self.assertEqual(policy.detail, "billing policy suspended this tenant")

    def test_tenant_service_access_policy_prefers_status_blocking_source(self) -> None:
        tenant = build_tenant_record_stub(
            status="suspended",
            status_reason="manual suspension",
            billing_status="past_due",
        )
        service = TenantService(tenant_repository=SimpleNamespace())

        policy = service.get_tenant_access_policy(tenant)

        self.assertFalse(policy.allowed)
        self.assertEqual(policy.blocking_source, "status")
        self.assertEqual(policy.status_code, 423)

    def test_tenant_service_rejects_invalid_status(self) -> None:
        tenant = build_tenant_record_stub()

        class FakeTenantRepository:
            def get_by_id(self, db, tenant_id):
                return tenant

            def save(self, db, tenant_to_save):
                return tenant_to_save

        service = TenantService(tenant_repository=FakeTenantRepository())

        with self.assertRaises(ValueError):
            service.set_status(
                db=object(),
                tenant_id=1,
                status="deleted",
            )

    def test_tenant_plan_policy_service_parses_plan_limits(self) -> None:
        service = TenantPlanPolicyService(
            plan_rate_limits="basic=60:20;pro=180:60;broken=oops"
        )

        policy = service.get_policy("pro")

        self.assertIsNotNone(policy)
        self.assertEqual(policy.plan_code, "pro")
        self.assertEqual(policy.read_requests_per_minute, 180)
        self.assertEqual(policy.write_requests_per_minute, 60)
        self.assertIsNone(policy.enabled_modules)

    def test_tenant_plan_policy_service_parses_enabled_modules(self) -> None:
        service = TenantPlanPolicyService(
            plan_enabled_modules="basic=core,users;pro=core,users,finance;enterprise=all"
        )

        policy = service.get_policy("pro")

        self.assertIsNotNone(policy)
        self.assertEqual(policy.plan_code, "pro")
        self.assertEqual(policy.enabled_modules, ("core", "finance", "users"))

    def test_tenant_plan_policy_service_parses_module_limits(self) -> None:
        service = TenantPlanPolicyService(
            plan_module_limits=(
                "basic=finance.entries:50,finance.entries.monthly:10,finance.entries.monthly.income:7,core.users:5,core.users.active:3,core.users.monthly:4,core.users.admin:1;"
                "pro=finance.entries:0,finance.entries.monthly:0,finance.entries.monthly.income:0,core.users:0,core.users.active:0,core.users.monthly:0,core.users.admin:0"
            )
        )

        self.assertEqual(
            service.get_module_limits("basic"),
            {
                "finance.entries": 50,
                "finance.entries.monthly": 10,
                "finance.entries.monthly.income": 7,
                "core.users": 5,
                "core.users.active": 3,
                "core.users.monthly": 4,
                "core.users.admin": 1,
            },
        )
        self.assertEqual(
            service.get_module_limits("pro"),
            {
                "finance.entries": 0,
                "finance.entries.monthly": 0,
                "finance.entries.monthly.income": 0,
                "core.users": 0,
                "core.users.active": 0,
                "core.users.monthly": 0,
                "core.users.admin": 0,
            },
        )

    def test_platform_capability_service_returns_supported_catalog(self) -> None:
        service = PlatformCapabilityService(
            tenant_service=TenantService(tenant_repository=SimpleNamespace()),
            tenant_plan_policy_service=TenantPlanPolicyService(),
        )

        catalog = service.get_catalog()

        self.assertIn("active", catalog["tenant_statuses"])
        self.assertIn("past_due", catalog["tenant_billing_statuses"])
        self.assertIn("finance", catalog["maintenance_scopes"])
        self.assertIn("full_block", catalog["maintenance_access_modes"])
        self.assertIn("all", catalog["plan_modules"])
        self.assertIn(
            "finance.entries.monthly.income",
            catalog["supported_module_limit_keys"],
        )
        self.assertIn(
            "core.users.admin",
            catalog["supported_module_limit_keys"],
        )
        self.assertEqual(
            catalog["module_limit_capabilities"][0]["key"],
            "core.users",
        )
        self.assertEqual(
            catalog["module_limit_capabilities"][0]["resource_name"],
            "users",
        )
        self.assertEqual(catalog["billing_providers"], ["stripe"])
        self.assertIn(
            "reconciled",
            catalog["billing_sync_processing_results"],
        )
        self.assertIn("broker", catalog["provisioning_dispatch_backends"])

    def test_tenant_service_accepts_plan_defined_only_by_modules(self) -> None:
        tenant = build_tenant_record_stub(plan_code=None)

        class FakeTenantRepository:
            def get_by_id(self, db, tenant_id):
                return tenant

            def save(self, db, tenant_to_save):
                return tenant_to_save

        service = TenantService(
            tenant_repository=FakeTenantRepository(),
            tenant_plan_policy_service=TenantPlanPolicyService(
                plan_enabled_modules="starter=core,users"
            ),
        )

        result = service.set_plan(
            db=object(),
            tenant_id=1,
            plan_code="starter",
        )

        self.assertEqual(result.plan_code, "starter")

    def test_tenant_service_updates_api_rate_limit_overrides(self) -> None:
        tenant = build_tenant_record_stub()

        class FakeTenantRepository:
            def get_by_id(self, db, tenant_id):
                return tenant

            def save(self, db, tenant_to_save):
                return tenant_to_save

        service = TenantService(tenant_repository=FakeTenantRepository())

        result = service.set_api_rate_limits(
            db=object(),
            tenant_id=1,
            api_read_requests_per_minute=25,
            api_write_requests_per_minute=10,
        )

        self.assertEqual(result.api_read_requests_per_minute, 25)
        self.assertEqual(result.api_write_requests_per_minute, 10)

    def test_tenant_service_updates_plan(self) -> None:
        tenant = build_tenant_record_stub(plan_code=None)

        class FakeTenantRepository:
            def get_by_id(self, db, tenant_id):
                return tenant

            def save(self, db, tenant_to_save):
                return tenant_to_save

        service = TenantService(
            tenant_repository=FakeTenantRepository(),
            tenant_plan_policy_service=TenantPlanPolicyService(
                plan_rate_limits="basic=60:20;pro=180:60"
            ),
        )

        result = service.set_plan(
            db=object(),
            tenant_id=1,
            plan_code="pro",
        )

        self.assertEqual(result.plan_code, "pro")

    def test_tenant_plan_policy_service_lists_plan_codes_from_policy_sources(self) -> None:
        service = TenantPlanPolicyService(
            plan_rate_limits="mensual=120:40;anual=360:120",
            plan_enabled_modules="trimestral=all",
            plan_module_limits="semestral=core.users:35",
        )

        self.assertEqual(
            service.list_plan_codes(),
            ["anual", "mensual", "semestral", "trimestral"],
        )

    def test_tenant_service_rejects_negative_api_rate_limit_override(self) -> None:
        tenant = build_tenant_record_stub()

        class FakeTenantRepository:
            def get_by_id(self, db, tenant_id):
                return tenant

            def save(self, db, tenant_to_save):
                return tenant_to_save

        service = TenantService(tenant_repository=FakeTenantRepository())

        with self.assertRaises(ValueError):
            service.set_api_rate_limits(
                db=object(),
                tenant_id=1,
                api_read_requests_per_minute=-1,
            )

    def test_tenant_service_rejects_invalid_plan(self) -> None:
        tenant = build_tenant_record_stub(plan_code=None)

        class FakeTenantRepository:
            def get_by_id(self, db, tenant_id):
                return tenant

            def save(self, db, tenant_to_save):
                return tenant_to_save

        service = TenantService(
            tenant_repository=FakeTenantRepository(),
            tenant_plan_policy_service=TenantPlanPolicyService(
                plan_rate_limits="basic=60:20"
            ),
        )

        with self.assertRaises(ValueError):
            service.set_plan(
                db=object(),
                tenant_id=1,
                plan_code="enterprise",
            )

    def test_provisioning_job_service_delegates_listing_to_repository(self) -> None:
        jobs = [SimpleNamespace(id=1, status="pending")]

        class FakeProvisioningJobRepository:
            def list_all(self, db):
                return jobs

        service = ProvisioningJobService(
            provisioning_job_repository=FakeProvisioningJobRepository()
        )

        self.assertEqual(service.list_jobs(object()), jobs)

    def test_provisioning_job_service_delegates_summary_to_repository(self) -> None:
        summary = [{"tenant_slug": "empresa-bootstrap"}]

        class FakeProvisioningJobRepository:
            def summarize_by_tenant(self, db):
                return summary

        service = ProvisioningJobService(
            provisioning_job_repository=FakeProvisioningJobRepository()
        )

        self.assertEqual(service.summarize_jobs_by_tenant(object()), summary)

    def test_provisioning_job_service_delegates_detailed_summary_to_repository(self) -> None:
        summary = [{"tenant_slug": "empresa-bootstrap", "job_type": "create_tenant_database"}]

        class FakeProvisioningJobRepository:
            def summarize_by_tenant_and_job_type(self, db):
                return summary

        service = ProvisioningJobService(
            provisioning_job_repository=FakeProvisioningJobRepository()
        )

        self.assertEqual(
            service.summarize_jobs_by_tenant_and_job_type(object()),
            summary,
        )

    def test_provisioning_metrics_service_delegates_history_to_repository(self) -> None:
        snapshots = [SimpleNamespace(id=1, tenant_slug="empresa-bootstrap")]

        class FakeSnapshotRepository:
            def list_recent(self, db, limit, tenant_slug):
                self.calls = (db, limit, tenant_slug)
                return snapshots

        service = ProvisioningMetricsService(
            snapshot_repository=FakeSnapshotRepository()
        )

        result = service.list_recent_snapshots(
            object(),
            limit=20,
            tenant_slug="empresa-bootstrap",
        )

        self.assertEqual(result, snapshots)
        self.assertEqual(
            service.snapshot_repository.calls,
            (unittest.mock.ANY, 20, "empresa-bootstrap"),
        )

    def test_provisioning_worker_cycle_trace_service_delegates_history_to_repository(self) -> None:
        traces = [SimpleNamespace(id=1, worker_profile="default")]

        class FakeTraceRepository:
            def list_recent(self, db, limit, worker_profile):
                self.calls = (db, limit, worker_profile)
                return traces

        service = ProvisioningWorkerCycleTraceService(
            trace_repository=FakeTraceRepository()
        )

        result = service.list_recent_traces(
            object(),
            limit=10,
            worker_profile="default",
        )

        self.assertEqual(result, traces)
        self.assertEqual(
            service.trace_repository.calls,
            (unittest.mock.ANY, 10, "default"),
        )

    def test_provisioning_alert_service_builds_alerts_from_latest_snapshot_and_trace(self) -> None:
        captured_at = datetime(2026, 3, 18, 14, 0, tzinfo=timezone.utc)
        snapshots = [
            SimpleNamespace(
                capture_key="cap-1",
                tenant_id=1,
                tenant_slug="empresa-bootstrap",
                pending_jobs=5,
                retry_pending_jobs=2,
                failed_jobs=1,
                max_attempts_seen=3,
                captured_at=captured_at,
            )
        ]
        traces = [
            SimpleNamespace(
                capture_key="cap-1",
                worker_profile="default",
                failed_count=2,
                duration_ms=1400,
                aged_eligible_jobs=4,
                stopped_due_to_failure_limit=True,
                captured_at=captured_at,
            )
        ]

        service = ProvisioningAlertService(
            provisioning_metrics_service=SimpleNamespace(
                list_recent_snapshots=lambda db, limit, tenant_slug: snapshots
            ),
            provisioning_job_service=SimpleNamespace(
                list_recent_failed_jobs=lambda db, limit, tenant_slug: [
                    SimpleNamespace(error_code="postgres_database_bootstrap_failed"),
                    SimpleNamespace(error_code="postgres_database_bootstrap_failed"),
                    SimpleNamespace(error_code="tenant_schema_bootstrap_failed"),
                ]
            ),
            provisioning_worker_cycle_trace_service=SimpleNamespace(
                list_recent_traces=lambda db, limit, worker_profile: traces
            ),
        )

        with patch(
            "app.apps.platform_control.services.provisioning_alert_service.settings.PROVISIONING_ALERT_PENDING_JOBS_THRESHOLD",
            4,
        ), patch(
            "app.apps.platform_control.services.provisioning_alert_service.settings.PROVISIONING_ALERT_RETRY_PENDING_JOBS_THRESHOLD",
            2,
        ), patch(
            "app.apps.platform_control.services.provisioning_alert_service.settings.PROVISIONING_ALERT_FAILED_JOBS_THRESHOLD",
            1,
        ), patch(
            "app.apps.platform_control.services.provisioning_alert_service.settings.PROVISIONING_ALERT_FAILED_ERROR_CODE_THRESHOLD",
            2,
        ), patch(
            "app.apps.platform_control.services.provisioning_alert_service.settings.PROVISIONING_ALERT_MAX_ATTEMPTS_SEEN_THRESHOLD",
            3,
        ), patch(
            "app.apps.platform_control.services.provisioning_alert_service.settings.PROVISIONING_ALERT_CYCLE_FAILED_COUNT_THRESHOLD",
            2,
        ), patch(
            "app.apps.platform_control.services.provisioning_alert_service.settings.PROVISIONING_ALERT_CYCLE_DURATION_MS_THRESHOLD",
            1000,
        ), patch(
            "app.apps.platform_control.services.provisioning_alert_service.settings.PROVISIONING_ALERT_CYCLE_AGED_JOBS_THRESHOLD",
            3,
        ):
            alerts = service.list_active_alerts(object())

        self.assertEqual(len(alerts), 9)
        self.assertEqual(alerts[0]["severity"], "critical")
        self.assertEqual(
            alerts[0]["alert_code"],
            "worker_cycle_stopped_due_to_failure_limit",
        )
        self.assertIn(
            "tenant_failed_jobs_threshold_exceeded",
            [item["alert_code"] for item in alerts],
        )
        self.assertIn(
            "tenant_failed_error_code_threshold_exceeded",
            [item["alert_code"] for item in alerts],
        )

    def test_provisioning_alert_service_uses_latest_snapshot_per_tenant(self) -> None:
        latest = datetime(2026, 3, 18, 14, 0, tzinfo=timezone.utc)
        older = datetime(2026, 3, 18, 13, 0, tzinfo=timezone.utc)
        snapshots = [
            SimpleNamespace(
                capture_key="cap-new",
                tenant_id=1,
                tenant_slug="empresa-bootstrap",
                pending_jobs=4,
                retry_pending_jobs=0,
                failed_jobs=0,
                max_attempts_seen=1,
                captured_at=latest,
            ),
            SimpleNamespace(
                capture_key="cap-old",
                tenant_id=1,
                tenant_slug="empresa-bootstrap",
                pending_jobs=10,
                retry_pending_jobs=0,
                failed_jobs=0,
                max_attempts_seen=1,
                captured_at=older,
            ),
        ]

        service = ProvisioningAlertService(
            provisioning_metrics_service=SimpleNamespace(
                list_recent_snapshots=lambda db, limit, tenant_slug: snapshots
            ),
            provisioning_worker_cycle_trace_service=SimpleNamespace(
                list_recent_traces=lambda db, limit, worker_profile: []
            ),
        )

        with patch(
            "app.apps.platform_control.services.provisioning_alert_service.settings.PROVISIONING_ALERT_PENDING_JOBS_THRESHOLD",
            5,
        ):
            alerts = service.list_active_alerts(object())

        self.assertEqual(alerts, [])

    def test_provisioning_alert_service_emits_error_code_alert(self) -> None:
        captured_at = datetime(2026, 3, 18, 14, 0, tzinfo=timezone.utc)
        snapshots = [
            SimpleNamespace(
                capture_key="cap-err",
                tenant_id=1,
                tenant_slug="empresa-bootstrap",
                pending_jobs=0,
                retry_pending_jobs=0,
                failed_jobs=2,
                max_attempts_seen=1,
                captured_at=captured_at,
            )
        ]

        service = ProvisioningAlertService(
            provisioning_metrics_service=SimpleNamespace(
                list_recent_snapshots=lambda db, limit, tenant_slug: snapshots
            ),
            provisioning_job_service=SimpleNamespace(
                list_recent_failed_jobs=lambda db, limit, tenant_slug: [
                    SimpleNamespace(error_code="postgres_database_bootstrap_failed"),
                    SimpleNamespace(error_code="postgres_database_bootstrap_failed"),
                    SimpleNamespace(error_code=""),
                ]
            ),
            provisioning_worker_cycle_trace_service=SimpleNamespace(
                list_recent_traces=lambda db, limit, worker_profile: []
            ),
        )

        with patch(
            "app.apps.platform_control.services.provisioning_alert_service.settings.PROVISIONING_ALERT_FAILED_ERROR_CODE_THRESHOLD",
            2,
        ):
            alerts = service.list_active_alerts(object())

        self.assertEqual(len(alerts), 1)
        self.assertEqual(
            alerts[0]["alert_code"],
            "tenant_failed_error_code_threshold_exceeded",
        )
        self.assertEqual(
            alerts[0]["error_code"],
            "postgres_database_bootstrap_failed",
        )

    def test_provisioning_alert_service_delegates_history_to_repository(self) -> None:
        recorded_at = datetime(2026, 3, 18, 15, 0, tzinfo=timezone.utc)
        stored_alert = SimpleNamespace(
            id=1,
            alert_code="tenant_failed_jobs_threshold_exceeded",
            severity="error",
            source_type="tenant_snapshot",
            tenant_slug="empresa-bootstrap",
            worker_profile=None,
            capture_key="cap-1",
            message="alerta",
            observed_value_json="2",
            threshold_value_json="1",
            source_captured_at=recorded_at,
            recorded_at=recorded_at,
        )

        class FakeAlertRepository:
            def list_recent(
                self,
                db,
                limit,
                tenant_slug,
                worker_profile,
                alert_code,
                severity,
            ):
                self.calls = (
                    db,
                    limit,
                    tenant_slug,
                    worker_profile,
                    alert_code,
                    severity,
                )
                return [stored_alert]

        service = ProvisioningAlertService(
            provisioning_operational_alert_repository=FakeAlertRepository(),
        )

        result = service.list_recent_alert_history(
            object(),
            limit=25,
            tenant_slug="empresa-bootstrap",
            worker_profile="default",
            alert_code="tenant_failed_jobs_threshold_exceeded",
            severity="error",
        )

        self.assertEqual(result[0]["observed_value"], 2)
        self.assertEqual(
            service.provisioning_operational_alert_repository.calls,
            (
                unittest.mock.ANY,
                25,
                "empresa-bootstrap",
                "default",
                "tenant_failed_jobs_threshold_exceeded",
                "error",
            ),
        )

    def test_provisioning_dispatch_service_uses_database_backend_by_default(self) -> None:
        created_job = SimpleNamespace(id=1, tenant_id=7, job_type="create_tenant_database")
        expected_jobs = [SimpleNamespace(id=10)]

        class FakeProvisioningJobService:
            def create_job(self, db, tenant_id, job_type, status, max_attempts=None):
                self.create_calls = (db, tenant_id, job_type, status, max_attempts)
                return created_job

            def list_pending_jobs(self, db, limit, job_types=None, priority_order=None):
                self.list_calls = (db, limit, job_types, priority_order)
                return expected_jobs

        fake_job_service = FakeProvisioningJobService()
        service = ProvisioningDispatchService(
            provisioning_job_service=fake_job_service,
        )

        created = service.enqueue_job(
            object(),
            tenant_id=7,
            job_type="create_tenant_database",
            status="pending",
        )
        listed = service.list_pending_jobs(
            object(),
            limit=3,
            job_types=["create_tenant_database"],
            priority_order=["create_tenant_database"],
        )

        self.assertIs(created, created_job)
        self.assertEqual(listed, expected_jobs)
        self.assertEqual(service.describe_backend(), "database")

    def test_provisioning_dispatch_service_uses_broker_backend(self) -> None:
        created_job = SimpleNamespace(
            id=11,
            tenant_id=7,
            job_type="create_tenant_database",
            status="pending",
            next_retry_at=None,
        )
        fake_redis = self._FakeRedis()

        class FakeProvisioningJobService:
            def create_job(self, db, tenant_id, job_type, status, max_attempts=None):
                self.create_calls = (db, tenant_id, job_type, status, max_attempts)
                return created_job

        class FakeProvisioningJobRepository:
            def list_by_ids(self, db, job_ids):
                self.list_calls = (db, job_ids)
                return [created_job]

        broker_backend = BrokerProvisioningDispatchBackend(
            provisioning_job_service=FakeProvisioningJobService(),
            provisioning_job_repository=FakeProvisioningJobRepository(),
            redis_client_service=SimpleNamespace(
                get_client=lambda url=None: fake_redis
            ),
            broker_url="redis://fake",
            key_prefix="test:provisioning",
            processing_lease_seconds=30,
        )
        service = ProvisioningDispatchService(
            backend_name="broker",
            broker_backend=broker_backend,
        )

        created = service.enqueue_job(
            object(),
            tenant_id=7,
            job_type="create_tenant_database",
            status="pending",
        )
        listed = service.list_pending_jobs(
            object(),
            limit=1,
            job_types=["create_tenant_database"],
            priority_order=["create_tenant_database"],
        )

        self.assertIs(created, created_job)
        self.assertEqual(listed, [created_job])
        self.assertEqual(service.describe_backend(), "broker")

    def test_broker_dispatch_backend_reschedules_retry_pending_job(self) -> None:
        fake_redis = self._FakeRedis()
        backend = BrokerProvisioningDispatchBackend(
            redis_client_service=SimpleNamespace(
                get_client=lambda url=None: fake_redis
            ),
            broker_url="redis://fake",
            key_prefix="test:provisioning",
            processing_lease_seconds=30,
        )
        next_retry_at = datetime.now(timezone.utc) + timedelta(minutes=5)

        backend.finalize_job(
            job=SimpleNamespace(
                id=22,
                job_type="create_tenant_database",
                status="retry_pending",
                next_retry_at=next_retry_at,
            )
        )

        ready_key = "test:provisioning:ready:create_tenant_database"
        self.assertIn("22", fake_redis.sorted_sets[ready_key])

    def test_broker_dispatch_backend_moves_failed_job_to_dlq(self) -> None:
        fake_redis = self._FakeRedis()
        backend = BrokerProvisioningDispatchBackend(
            redis_client_service=SimpleNamespace(
                get_client=lambda url=None: fake_redis
            ),
            logging_service=MagicMock(),
            broker_url="redis://fake",
            key_prefix="test:provisioning",
            processing_lease_seconds=30,
        )

        backend.finalize_job(
            job=SimpleNamespace(
                id=23,
                tenant_id=7,
                tenant=SimpleNamespace(slug="empresa-bootstrap"),
                job_type="create_tenant_database",
                status="failed",
                error_message="postgres unavailable",
            )
        )

        dlq_key = "test:provisioning:dlq:create_tenant_database"
        self.assertIn("23", fake_redis.sorted_sets[dlq_key])

    def test_broker_dispatch_backend_prunes_expired_dlq_rows(self) -> None:
        fake_redis = self._FakeRedis()
        now_ts = int(datetime.now(timezone.utc).timestamp())
        dlq_key = "test:provisioning:dlq:create_tenant_database"
        fake_redis.sorted_sets[dlq_key] = {
            "41": float(now_ts - 500),
            "42": float(now_ts - 10),
        }

        jobs = {
            41: SimpleNamespace(
                id=41,
                tenant_id=1,
                tenant=SimpleNamespace(slug="empresa-bootstrap"),
                job_type="create_tenant_database",
                status="failed",
                attempts=3,
                max_attempts=3,
                error_message="old postgres unavailable",
            ),
            42: SimpleNamespace(
                id=42,
                tenant_id=1,
                tenant=SimpleNamespace(slug="empresa-bootstrap"),
                job_type="create_tenant_database",
                status="failed",
                attempts=3,
                max_attempts=3,
                error_message="recent timeout",
            ),
        }

        class FakeProvisioningJobRepository:
            def list_by_ids(self, db, job_ids):
                return [jobs[job_id] for job_id in job_ids if job_id in jobs]

        backend = BrokerProvisioningDispatchBackend(
            provisioning_job_repository=FakeProvisioningJobRepository(),
            redis_client_service=SimpleNamespace(
                get_client=lambda url=None: fake_redis
            ),
            logging_service=MagicMock(),
            broker_url="redis://fake",
            key_prefix="test:provisioning",
            dlq_retention_seconds=60,
        )

        result = backend.list_dead_letter_jobs(
            object(),
            limit=10,
            job_type="create_tenant_database",
        )

        self.assertEqual([item["job"].id for item in result], [42])
        self.assertNotIn("41", fake_redis.sorted_sets[dlq_key])

    def test_broker_dispatch_backend_filters_dlq_by_error_message(self) -> None:
        fake_redis = self._FakeRedis()
        now_ts = int(datetime.now(timezone.utc).timestamp())
        dlq_key = "test:provisioning:dlq:create_tenant_database"
        fake_redis.sorted_sets[dlq_key] = {
            "51": float(now_ts - 20),
            "52": float(now_ts - 10),
        }

        jobs = {
            51: SimpleNamespace(
                id=51,
                tenant_id=1,
                tenant=SimpleNamespace(slug="empresa-bootstrap"),
                job_type="create_tenant_database",
                status="failed",
                attempts=3,
                max_attempts=3,
                error_code="postgres_role_bootstrap_failed",
                error_message="postgres unavailable",
            ),
            52: SimpleNamespace(
                id=52,
                tenant_id=1,
                tenant=SimpleNamespace(slug="empresa-bootstrap"),
                job_type="create_tenant_database",
                status="failed",
                attempts=3,
                max_attempts=3,
                error_code="tenant_schema_bootstrap_failed",
                error_message="network timeout",
            ),
        }

        class FakeProvisioningJobRepository:
            def list_by_ids(self, db, job_ids):
                return [jobs[job_id] for job_id in job_ids if job_id in jobs]

        backend = BrokerProvisioningDispatchBackend(
            provisioning_job_repository=FakeProvisioningJobRepository(),
            redis_client_service=SimpleNamespace(
                get_client=lambda url=None: fake_redis
            ),
            logging_service=MagicMock(),
            broker_url="redis://fake",
            key_prefix="test:provisioning",
        )

        result = backend.list_dead_letter_jobs(
            object(),
            limit=10,
            job_type="create_tenant_database",
            error_contains="postgres",
        )

        self.assertEqual([item["job"].id for item in result], [51])

    def test_broker_dispatch_backend_filters_dlq_by_error_code(self) -> None:
        fake_redis = self._FakeRedis()
        now_ts = int(datetime.now(timezone.utc).timestamp())
        dlq_key = "test:provisioning:dlq:create_tenant_database"
        fake_redis.sorted_sets[dlq_key] = {
            "61": float(now_ts - 20),
            "62": float(now_ts - 10),
        }

        jobs = {
            61: SimpleNamespace(
                id=61,
                tenant_id=1,
                tenant=SimpleNamespace(slug="empresa-bootstrap"),
                job_type="create_tenant_database",
                status="failed",
                attempts=3,
                max_attempts=3,
                error_code="postgres_role_bootstrap_failed",
                error_message="postgres unavailable",
            ),
            62: SimpleNamespace(
                id=62,
                tenant_id=1,
                tenant=SimpleNamespace(slug="empresa-bootstrap"),
                job_type="create_tenant_database",
                status="failed",
                attempts=3,
                max_attempts=3,
                error_code="tenant_schema_bootstrap_failed",
                error_message="tenant schema failed",
            ),
        }

        class FakeProvisioningJobRepository:
            def list_by_ids(self, db, job_ids):
                return [jobs[job_id] for job_id in job_ids if job_id in jobs]

        backend = BrokerProvisioningDispatchBackend(
            provisioning_job_repository=FakeProvisioningJobRepository(),
            redis_client_service=SimpleNamespace(
                get_client=lambda url=None: fake_redis
            ),
            logging_service=MagicMock(),
            broker_url="redis://fake",
            key_prefix="test:provisioning",
        )

        result = backend.list_dead_letter_jobs(
            object(),
            limit=10,
            job_type="create_tenant_database",
            error_code="tenant_schema_bootstrap_failed",
        )

        self.assertEqual([item["job"].id for item in result], [62])

    def test_provisioning_metrics_export_service_writes_prometheus_textfile(self) -> None:
        summary = [
            {
                "tenant_id": 1,
                "tenant_slug": "empresa-bootstrap",
                "total_jobs": 4,
                "pending_jobs": 1,
                "retry_pending_jobs": 1,
                "running_jobs": 0,
                "completed_jobs": 1,
                "failed_jobs": 1,
                "max_attempts_seen": 2,
            }
        ]
        detailed_summary = [
            {
                "tenant_id": 1,
                "tenant_slug": "empresa-bootstrap",
                "job_type": "create_tenant_database",
                "total_jobs": 4,
                "pending_jobs": 1,
                "retry_pending_jobs": 1,
                "running_jobs": 0,
                "completed_jobs": 1,
                "failed_jobs": 1,
                "max_attempts_seen": 2,
            }
        ]
        error_code_summary = [
            {
                "tenant_id": 1,
                "tenant_slug": "empresa-bootstrap",
                "error_code": "postgres_database_bootstrap_failed",
                "total_jobs": 2,
                "pending_jobs": 0,
                "retry_pending_jobs": 1,
                "running_jobs": 0,
                "completed_jobs": 0,
                "failed_jobs": 1,
                "max_attempts_seen": 2,
            }
        ]

        class FakeProvisioningJobService:
            def summarize_jobs_by_tenant(self, db):
                return summary

            def summarize_jobs_by_tenant_and_job_type(self, db):
                return detailed_summary

            def summarize_jobs_by_tenant_and_error_code(self, db):
                return error_code_summary

        fake_alerts = [
            {
                "alert_code": "tenant_failed_jobs_threshold_exceeded",
                "severity": "error",
                "tenant_slug": "empresa-bootstrap",
                "worker_profile": None,
            },
            {
                "alert_code": "worker_cycle_duration_threshold_exceeded",
                "severity": "warning",
                "tenant_slug": None,
                "worker_profile": "default",
            },
        ]
        billing_summary = [
            {
                "provider": "stripe",
                "event_type": "invoice.payment_failed",
                "processing_result": "duplicate",
                "total_events": 4,
                "total_tenants": 2,
                "last_recorded_at": datetime.now(timezone.utc),
            }
        ]
        billing_alerts = [
            {
                "alert_code": "billing_duplicate_events_threshold_exceeded",
                "severity": "warning",
                "provider": "stripe",
                "event_type": "invoice.payment_failed",
                "processing_result": "duplicate",
            }
        ]

        with tempfile.TemporaryDirectory() as tmp_dir:
            output_path = os.path.join(tmp_dir, "provisioning.prom")
            service = ProvisioningMetricsExportService(
                provisioning_job_service=FakeProvisioningJobService(),
                provisioning_alert_service=SimpleNamespace(
                    list_active_alerts=lambda db: fake_alerts
                ),
                tenant_billing_sync_service=SimpleNamespace(
                    summarize_all_recent_events=lambda db: billing_summary
                ),
                billing_alert_service=SimpleNamespace(
                    list_active_alerts=lambda db: billing_alerts
                ),
                enabled=True,
                output_path=output_path,
            )

            exported = service.export_current_summary(object())

            self.assertEqual(exported, 1)
            with open(output_path, encoding="utf-8") as handle:
                content = handle.read()
            self.assertIn("platform_paas_provisioning_jobs", content)
            self.assertIn("platform_paas_provisioning_jobs_by_type", content)
            self.assertIn("platform_paas_provisioning_jobs_by_error_code", content)
            self.assertIn("platform_paas_provisioning_active_alerts", content)
            self.assertIn("platform_paas_billing_sync_events_total", content)
            self.assertIn("platform_paas_billing_active_alerts", content)
            self.assertIn(
                'platform_paas_provisioning_active_alerts_by_severity{severity="error"} 1',
                content,
            )
            self.assertIn(
                'platform_paas_billing_active_alerts_by_severity{severity="warning"} 1',
                content,
            )
            self.assertIn(
                'platform_paas_provisioning_active_alerts_by_code{alert_code="tenant_failed_jobs_threshold_exceeded"} 1',
                content,
            )
            self.assertIn(
                'platform_paas_billing_active_alerts_by_code{alert_code="billing_duplicate_events_threshold_exceeded"} 1',
                content,
            )
            self.assertIn(
                'error_code="postgres_database_bootstrap_failed"',
                content,
            )
            self.assertIn('provider="stripe"', content)
            self.assertIn('processing_result="duplicate"', content)
            self.assertIn('tenant_slug="empresa-bootstrap"', content)
            self.assertIn('status="retry_pending"', content)
            self.assertIn('job_type="create_tenant_database"', content)


class PlatformRoutesTestCase(unittest.TestCase):
    def _token_payload(
        self,
        *,
        role: str = "superadmin",
        user_id: int = 1,
        email: str = "admin@platform.local",
    ) -> dict:
        return build_platform_context(role=role, user_id=user_id, email=email)

    def test_platform_login_returns_platform_token(self) -> None:
        user = build_platform_user_stub()

        with patch(
            "app.apps.platform_control.api.auth_routes.platform_auth_service.login",
            return_value=user,
        ), patch(
            "app.apps.platform_control.api.auth_routes.auth_token_service.issue_token_pair",
            return_value={"access_token": "platform-access", "refresh_token": "platform-refresh"},
        ), patch(
            "app.apps.platform_control.api.auth_routes.auth_token_service.jwt_service.decode_token",
            return_value={"jti": "access-jti"},
        ), patch(
            "app.apps.platform_control.api.auth_routes.auth_audit_service.log_event",
        ):
            response = login(
                payload=LoginRequest(
                    email="admin@example.com",
                    password="AdminTemporal123!",
                ),
                db=object(),
            )

        self.assertTrue(response.success)
        self.assertEqual(response.role, "superadmin")
        self.assertEqual(response.access_token, "platform-access")
        self.assertEqual(response.refresh_token, "platform-refresh")

    def test_platform_login_logs_failed_attempt(self) -> None:
        with patch(
            "app.apps.platform_control.api.auth_routes.platform_auth_service.login",
            return_value=None,
        ), patch(
            "app.apps.platform_control.api.auth_routes.auth_audit_service.log_event",
        ) as audit_log:
            with self.assertRaises(HTTPException):
                login(
                    payload=LoginRequest(
                        email="admin@example.com",
                        password="bad-password",
                    ),
                    db=object(),
                )

        audit_log.assert_called_once()

    def test_platform_refresh_returns_platform_token_pair(self) -> None:
        with patch(
            "app.apps.platform_control.api.auth_routes.auth_token_service.refresh_token_pair",
            return_value=(
                {
                    "sub": "1",
                    "email": "admin@platform.local",
                    "role": "superadmin",
                },
                {
                    "access_token": "new-access",
                    "refresh_token": "new-refresh",
                },
            ),
        ), patch(
            "app.apps.platform_control.api.auth_routes.auth_token_service.jwt_service.decode_token",
            return_value={"jti": "new-access-jti"},
        ), patch(
            "app.apps.platform_control.api.auth_routes.auth_audit_service.log_event",
        ):
            response = refresh_login(
                payload=RefreshTokenRequest(refresh_token="refresh-token"),
                db=object(),
            )

        self.assertEqual(response.access_token, "new-access")
        self.assertEqual(response.refresh_token, "new-refresh")

    def test_platform_refresh_logs_failure(self) -> None:
        with patch(
            "app.apps.platform_control.api.auth_routes.auth_token_service.refresh_token_pair",
            side_effect=HTTPException(status_code=401, detail="Refresh token revocado"),
        ), patch(
            "app.apps.platform_control.api.auth_routes.auth_audit_service.log_event",
        ) as audit_log:
            with self.assertRaises(HTTPException):
                refresh_login(
                    payload=RefreshTokenRequest(refresh_token="refresh-token"),
                    db=object(),
                )

        audit_log.assert_called_once()

    def test_platform_logout_revokes_session(self) -> None:
        with patch(
            "app.apps.platform_control.api.auth_routes.auth_token_service.revoke_session",
            return_value=2,
        ), patch(
            "app.apps.platform_control.api.auth_routes.auth_audit_service.log_event",
        ):
            response = logout(
                db=object(),
                payload={
                    "sub": "1",
                    "email": "admin@platform.local",
                    "role": "superadmin",
                    "token_scope": "platform",
                    "jti": "access-jti",
                    "aud": "platform-api",
                    "iat": 1,
                    "exp": 2,
                },
            )

        self.assertTrue(response.success)
        self.assertEqual(response.revoked_refresh_tokens, 2)

    def test_admin_only_route_returns_payload(self) -> None:
        response = admin_only_route(payload=self._token_payload())

        self.assertEqual(response["token_payload"]["role"], "superadmin")

    def test_ping_control_db_uses_runtime_service(self) -> None:
        with patch(
            "app.apps.platform_control.api.routes."
            "platform_runtime_service.get_control_database_name",
            return_value="platform_control",
        ):
            response = ping_control_db(payload=self._token_payload())

        self.assertEqual(response["control_database"], "platform_control")

    def test_get_platform_capabilities_returns_catalog(self) -> None:
        response = get_platform_capabilities(
            _token=self._token_payload(),
        )

        self.assertTrue(response.success)
        self.assertIn("active", response.tenant_statuses)
        self.assertIn("past_due", response.tenant_billing_statuses)
        self.assertIn(
            "finance.entries.monthly.income",
            response.supported_module_limit_keys,
        )
        self.assertIn(
            "core.users.active",
            response.supported_module_limit_keys,
        )
        self.assertEqual(
            response.module_limit_capabilities[0].key,
            "core.users",
        )
        self.assertEqual(
            response.module_limit_capabilities[0].period,
            "current",
        )
        self.assertEqual(response.billing_providers, ["stripe"])
        self.assertIn("broker", response.provisioning_dispatch_backends)

    @patch("app.apps.platform_control.api.routes.runtime_security_service")
    @patch("app.apps.platform_control.api.routes.settings")
    def test_get_platform_security_posture_returns_runtime_findings(
        self,
        fake_settings,
        fake_runtime_security_service,
    ) -> None:
        fake_settings.APP_ENV = "development"
        fake_runtime_security_service.validate_settings.return_value = [
            "JWT_SECRET_KEY sigue con un valor inseguro por defecto",
            "TENANT_BOOTSTRAP_DB_PASSWORD_EMPRESA_BOOTSTRAP sigue con una password bootstrap insegura de demo",
        ]

        response = get_platform_security_posture(
            _token=self._token_payload(),
        )

        self.assertTrue(response.success)
        self.assertEqual(response.app_env, "development")
        self.assertFalse(response.production_ready)
        self.assertEqual(response.findings_count, 2)
        self.assertEqual(len(response.findings), 2)

    def test_list_platform_users_returns_catalog(self) -> None:
        users = [
            build_platform_user_stub(
                user_id=1,
                full_name="Platform Admin",
                email="admin@platform.local",
                role="superadmin",
                is_active=True,
            ),
            build_platform_user_stub(
                user_id=2,
                full_name="Support User",
                email="support@platform.dev",
                role="support",
                is_active=False,
            ),
        ]

        with patch(
            "app.apps.platform_control.api.platform_user_routes."
            "platform_user_service.list_users",
            return_value=users,
        ):
            response = list_platform_users(
                db=object(),
                _token=self._token_payload(),
            )

        self.assertTrue(response.success)
        self.assertEqual(response.total_users, 2)
        self.assertEqual(response.data[0].email, "admin@platform.local")

    def test_list_platform_users_accepts_admin_token(self) -> None:
        with patch(
            "app.apps.platform_control.api.platform_user_routes."
            "platform_user_service.list_users",
            return_value=[],
        ):
            response = list_platform_users(
                db=object(),
                _token=self._token_payload(role="admin"),
            )

        self.assertTrue(response.success)
        self.assertEqual(response.total_users, 0)

    def test_list_platform_auth_audit_returns_recent_events(self) -> None:
        events = [
            SimpleNamespace(
                id=1,
                event_type="platform.login",
                subject_scope="platform",
                outcome="success",
                subject_user_id=1,
                tenant_slug=None,
                email="admin@platform.local",
                token_jti="abc",
                detail="Platform login successful",
                created_at=datetime.now(timezone.utc),
            )
        ]

        with patch(
            "app.apps.platform_control.api.auth_audit_routes."
            "auth_audit_service.list_recent_events",
            return_value=events,
        ):
            response = list_platform_auth_audit(
                db=object(),
                _token=self._token_payload(role="admin"),
            )

        self.assertTrue(response.success)
        self.assertEqual(response.total_events, 1)
        self.assertEqual(response.data[0].event_type, "platform.login")

    def test_get_platform_root_recovery_status_returns_schema(self) -> None:
        with patch(
            "app.apps.platform_control.api.auth_routes."
            "platform_root_account_service.get_recovery_status",
            return_value={
                "has_active_superadmin": False,
                "recovery_configured": True,
                "recovery_available": True,
            },
        ):
            response = get_platform_root_recovery_status(db=object())

        self.assertTrue(response.success)
        self.assertTrue(response.recovery_configured)
        self.assertTrue(response.recovery_available)

    def test_recover_platform_root_account_returns_schema(self) -> None:
        user = build_platform_user_stub(
            user_id=1,
            full_name="Recovered Root",
            email="root@platform.dev",
            role="superadmin",
            is_active=True,
        )

        with patch(
            "app.apps.platform_control.api.auth_routes."
            "platform_root_account_service.recover_root_account",
            return_value=user,
        ), patch(
            "app.apps.platform_control.api.auth_routes."
            "auth_audit_service.log_event",
        ):
            response = recover_platform_root_account(
                payload=PlatformRootRecoveryRequest(
                    recovery_key="key-123",
                    full_name="Recovered Root",
                    email="root@platform.dev",
                    password="Secret123!",
                ),
                db=object(),
            )

        self.assertTrue(response.success)
        self.assertEqual(response.email, "root@platform.dev")

    def test_recover_platform_root_account_raises_http_400_on_invalid_key(self) -> None:
        with patch(
            "app.apps.platform_control.api.auth_routes."
            "platform_root_account_service.recover_root_account",
            side_effect=ValueError("Invalid recovery key"),
        ), patch(
            "app.apps.platform_control.api.auth_routes."
            "auth_audit_service.log_event",
        ):
            with self.assertRaises(HTTPException) as exc:
                recover_platform_root_account(
                    payload=PlatformRootRecoveryRequest(
                        recovery_key="bad-key",
                        full_name="Recovered Root",
                        email="root@platform.dev",
                        password="Secret123!",
                    ),
                    db=object(),
                )

        self.assertEqual(exc.exception.status_code, 400)

    def test_create_platform_user_returns_schema(self) -> None:
        user = build_platform_user_stub(
            user_id=7,
            full_name="Support User",
            email="support@platform.dev",
            role="support",
            is_active=True,
        )

        with patch(
            "app.apps.platform_control.api.platform_user_routes."
            "platform_user_service.create_user",
            return_value=user,
        ), patch(
            "app.apps.platform_control.api.platform_user_routes.auth_audit_service.log_event",
        ):
            response = create_platform_user(
                payload=PlatformUserCreateRequest(
                    full_name="Support User",
                    email="support@platform.dev",
                    role="support",
                    password="Support123!",
                    is_active=True,
                ),
                db=object(),
                _token=self._token_payload(),
            )

        self.assertTrue(response.success)
        self.assertEqual(response.user_id, 7)
        self.assertEqual(response.role, "support")

    def test_update_platform_user_returns_schema(self) -> None:
        user = build_platform_user_stub(
            user_id=7,
            full_name="Mesa Operativa",
            email="support@platform.dev",
            role="support",
            is_active=True,
        )

        with patch(
            "app.apps.platform_control.api.platform_user_routes."
            "platform_user_service.update_user",
            return_value=user,
        ), patch(
            "app.apps.platform_control.api.platform_user_routes.auth_audit_service.log_event",
        ):
            response = update_platform_user(
                user_id=7,
                payload=PlatformUserUpdateRequest(
                    full_name="Mesa Operativa",
                    role="support",
                ),
                db=object(),
                _token=self._token_payload(),
            )

        self.assertTrue(response.success)
        self.assertEqual(response.full_name, "Mesa Operativa")

    def test_update_platform_user_status_returns_schema(self) -> None:
        user = build_platform_user_stub(
            user_id=7,
            full_name="Support User",
            email="support@platform.dev",
            role="support",
            is_active=False,
        )

        with patch(
            "app.apps.platform_control.api.platform_user_routes."
            "platform_user_service.set_user_status",
            return_value=user,
        ), patch(
            "app.apps.platform_control.api.platform_user_routes.auth_audit_service.log_event",
        ):
            response = update_platform_user_status(
                user_id=7,
                payload=PlatformUserStatusUpdateRequest(is_active=False),
                db=object(),
                _token=self._token_payload(),
            )

        self.assertTrue(response.success)
        self.assertFalse(response.is_active)

    def test_reset_platform_user_password_returns_schema(self) -> None:
        user = build_platform_user_stub(
            user_id=7,
            full_name="Support User",
            email="support@platform.dev",
            role="support",
            is_active=True,
        )

        with patch(
            "app.apps.platform_control.api.platform_user_routes."
            "platform_user_service.reset_password",
            return_value=user,
        ), patch(
            "app.apps.platform_control.api.platform_user_routes.auth_audit_service.log_event",
        ):
            response = reset_platform_user_password(
                user_id=7,
                payload=PlatformUserPasswordResetRequest(new_password="NewPass123!"),
                db=object(),
                _token=self._token_payload(),
            )

        self.assertTrue(response.success)
        self.assertEqual(response.user_id, 7)

    def test_delete_platform_user_returns_schema(self) -> None:
        user = build_platform_user_stub(
            user_id=7,
            full_name="Support User",
            email="support@platform.dev",
            role="support",
            is_active=True,
        )

        with patch(
            "app.apps.platform_control.api.platform_user_routes."
            "platform_user_service.delete_user",
            return_value=user,
        ), patch(
            "app.apps.platform_control.api.platform_user_routes.auth_audit_service.log_event",
        ):
            response = delete_platform_user(
                user_id=7,
                db=object(),
                _token=self._token_payload(role="admin", user_id=2, email="admin@platform.dev"),
            )

        self.assertTrue(response.success)
        self.assertEqual(response.user_id, 7)
        self.assertEqual(response.role, "support")

    def test_create_tenant_returns_schema(self) -> None:
        tenant = build_tenant_record_stub(plan_code="pro")
        tenant.id = 1
        tenant.status = "pending"

        with patch(
            "app.apps.platform_control.api.tenant_routes.tenant_service.create_tenant",
            return_value=tenant,
        ), patch(
            "app.apps.platform_control.api.tenant_routes."
            "tenant_service.tenant_plan_policy_service.get_enabled_modules",
            return_value=["core", "users", "finance"],
        ), patch(
            "app.apps.platform_control.api.tenant_routes.auth_audit_service.log_event",
        ):
            response = create_tenant(
                payload=TenantCreateRequest(
                    name="Empresa Bootstrap",
                    slug="empresa-bootstrap",
                    tenant_type="empresa",
                    plan_code="pro",
                ),
                db=object(),
                _token=self._token_payload(),
            )

        self.assertEqual(response.slug, "empresa-bootstrap")
        self.assertEqual(response.status, "pending")
        self.assertEqual(response.plan_enabled_modules, ["core", "users", "finance"])

    def test_update_tenant_identity_returns_schema(self) -> None:
        previous_tenant = build_tenant_record_stub(
            tenant_name="Empresa Demo",
            tenant_slug="empresa-demo",
            tenant_type="empresa",
        )
        previous_tenant.id = 1
        tenant = build_tenant_record_stub(
            tenant_name="Empresa Centro",
            tenant_slug="empresa-demo",
            tenant_type="condominio",
        )
        tenant.id = 1
        tenant.status = "active"

        with patch(
            "app.apps.platform_control.api.tenant_routes."
            "tenant_service.tenant_repository.get_by_id",
            return_value=previous_tenant,
        ), patch(
            "app.apps.platform_control.api.tenant_routes."
            "tenant_service.update_basic_identity",
            return_value=tenant,
        ), patch(
            "app.apps.platform_control.api.tenant_routes."
            "tenant_policy_event_service.record_change",
        ):
            response = update_tenant_identity(
                tenant_id=1,
                payload=TenantIdentityUpdateRequest(
                    name="Empresa Centro",
                    tenant_type="condominio",
                ),
                db=object(),
                _token=self._token_payload(),
            )

        self.assertTrue(response.success)
        self.assertEqual(response.tenant_slug, "empresa-demo")
        self.assertEqual(response.tenant_name, "Empresa Centro")
        self.assertEqual(response.tenant_type, "condominio")

    def test_list_tenants_returns_catalog(self) -> None:
        tenant_one = build_tenant_record_stub(
            tenant_name="Condominio Demo",
            tenant_slug="condominio-demo",
            tenant_type="condos",
            plan_code="pro",
            status="active",
            billing_status="active",
        )
        tenant_one.id = 1
        tenant_two = build_tenant_record_stub(
            tenant_name="Empresa Gracia",
            tenant_slug="empresa-gracia",
            tenant_type="empresa",
            plan_code="basic",
            status="active",
            billing_status="past_due",
        )
        tenant_two.id = 2

        def enabled_modules(plan_code):
            return {
                "pro": ["core", "users", "finance"],
                "basic": ["core", "users"],
            }.get(plan_code)

        def module_limits(plan_code):
            return {
                "pro": {"finance.entries": 250},
                "basic": {"core.users": 5},
            }.get(plan_code)

        with patch(
            "app.apps.platform_control.api.tenant_routes."
            "tenant_service.tenant_repository.list_all",
            return_value=[tenant_one, tenant_two],
        ), patch(
            "app.apps.platform_control.api.tenant_routes."
            "tenant_service.tenant_plan_policy_service.get_enabled_modules",
            side_effect=enabled_modules,
        ), patch(
            "app.apps.platform_control.api.tenant_routes."
            "tenant_service.tenant_plan_policy_service.get_module_limits",
            side_effect=module_limits,
        ), patch(
            "app.apps.platform_control.api.tenant_routes."
            "tenant_service.get_tenant_module_limits",
            return_value=None,
        ):
            response = list_tenants(
                db=object(),
                _token=self._token_payload(),
            )

        self.assertTrue(response.success)
        self.assertEqual(response.total_tenants, 2)
        self.assertEqual(response.data[0].slug, "condominio-demo")
        self.assertEqual(response.data[1].billing_status, "past_due")

    def test_get_tenant_returns_detail(self) -> None:
        tenant = build_tenant_record_stub(
            tenant_name="Condominio Demo",
            tenant_slug="condominio-demo",
            tenant_type="condos",
            plan_code="pro",
            status="active",
            billing_status="active",
            module_limits_json='{"finance.entries": 40}',
        )
        tenant.id = 1

        with patch(
            "app.apps.platform_control.api.tenant_routes."
            "tenant_service.tenant_repository.get_by_id",
            return_value=tenant,
        ), patch(
            "app.apps.platform_control.api.tenant_routes."
            "tenant_service.tenant_plan_policy_service.get_enabled_modules",
            return_value=["core", "users", "finance"],
        ), patch(
            "app.apps.platform_control.api.tenant_routes."
            "tenant_service.tenant_plan_policy_service.get_module_limits",
            return_value={"finance.entries": 250},
        ), patch(
            "app.apps.platform_control.api.tenant_routes."
            "tenant_service.get_tenant_module_limits",
            return_value={"finance.entries": 40},
        ):
            response = get_tenant(
                tenant_id=1,
                db=object(),
                _token=self._token_payload(),
            )

        self.assertEqual(response.slug, "condominio-demo")
        self.assertEqual(response.plan_enabled_modules, ["core", "users", "finance"])
        self.assertEqual(response.module_limits, {"finance.entries": 40})

    def test_sync_tenant_schema_returns_schema(self) -> None:
        tenant = build_tenant_record_stub()
        tenant.id = 1
        tenant.status = "active"

        with patch(
            "app.apps.platform_control.api.tenant_routes.tenant_service.sync_tenant_schema",
            return_value=tenant,
        ), patch(
            "app.apps.platform_control.api.tenant_routes.tenant_service.get_tenant_schema_status",
            return_value={
                "tenant": tenant,
                "current_version": "0002_finance_entries",
                "latest_available_version": "0002_finance_entries",
                "pending_count": 0,
                "last_applied_at": datetime.now(timezone.utc),
                "applied_now": [],
            },
        ):
            response = sync_tenant_schema(
                tenant_id=1,
                db=object(),
                _token=self._token_payload(),
            )

        self.assertTrue(response.success)
        self.assertEqual(response.tenant_slug, "empresa-bootstrap")
        self.assertEqual(response.current_version, "0002_finance_entries")

    def test_get_tenant_schema_status_returns_schema(self) -> None:
        tenant = build_tenant_record_stub()
        tenant.id = 1
        tenant.status = "active"

        with patch(
            "app.apps.platform_control.api.tenant_routes.tenant_service.get_tenant_schema_status",
            return_value={
                "tenant": tenant,
                "current_version": "0002_finance_entries",
                "latest_available_version": "0002_finance_entries",
                "pending_count": 0,
                "pending_versions": [],
                "last_applied_at": datetime.now(timezone.utc),
            },
        ):
            response = get_tenant_schema_status(
                tenant_id=1,
                db=object(),
                _token=self._token_payload(),
            )

        self.assertTrue(response.success)
        self.assertEqual(response.tenant_slug, "empresa-bootstrap")
        self.assertEqual(response.current_version, "0002_finance_entries")

    def test_update_tenant_maintenance_mode_returns_schema(self) -> None:
        previous_tenant = build_tenant_record_stub()
        previous_tenant.id = 1
        tenant = build_tenant_record_stub(
            maintenance_mode=True,
            maintenance_reason="db maintenance",
            maintenance_scopes="finance,users",
            maintenance_access_mode="full_block",
        )
        tenant.id = 1
        tenant.status = "active"

        with patch(
            "app.apps.platform_control.api.tenant_routes."
            "tenant_service.tenant_repository.get_by_id",
            return_value=previous_tenant,
        ), patch(
            "app.apps.platform_control.api.tenant_routes."
            "tenant_service.set_maintenance_mode",
            return_value=tenant,
        ), patch(
            "app.apps.platform_control.api.tenant_routes."
            "tenant_policy_event_service.record_change",
        ):
            response = update_tenant_maintenance_mode(
                tenant_id=1,
                payload=TenantMaintenanceUpdateRequest(
                    maintenance_mode=True,
                    maintenance_reason="db maintenance",
                    maintenance_scopes=["finance", "users"],
                    maintenance_access_mode="full_block",
                ),
                db=object(),
                _token=self._token_payload(),
            )

        self.assertTrue(response.success)
        self.assertTrue(response.maintenance_mode)
        self.assertEqual(response.maintenance_reason, "db maintenance")
        self.assertEqual(response.maintenance_scopes, ["finance", "users"])
        self.assertEqual(response.maintenance_access_mode, "full_block")

    def test_update_tenant_rate_limits_returns_schema(self) -> None:
        previous_tenant = build_tenant_record_stub(plan_code="basic")
        previous_tenant.id = 1
        tenant = build_tenant_record_stub(
            plan_code="pro",
            api_read_requests_per_minute=25,
            api_write_requests_per_minute=10,
        )
        tenant.id = 1
        tenant.status = "active"

        with patch(
            "app.apps.platform_control.api.tenant_routes."
            "tenant_service.tenant_repository.get_by_id",
            return_value=previous_tenant,
        ), patch(
            "app.apps.platform_control.api.tenant_routes."
            "tenant_service.set_api_rate_limits",
            return_value=tenant,
        ), patch(
            "app.apps.platform_control.api.tenant_routes."
            "tenant_policy_event_service.record_change",
        ):
            response = update_tenant_rate_limits(
                tenant_id=1,
                payload=TenantRateLimitUpdateRequest(
                    api_read_requests_per_minute=25,
                    api_write_requests_per_minute=10,
                ),
                db=object(),
                _token=self._token_payload(),
            )

        self.assertTrue(response.success)
        self.assertEqual(response.tenant_plan_code, "pro")
        self.assertEqual(response.api_read_requests_per_minute, 25)
        self.assertEqual(response.api_write_requests_per_minute, 10)

    def test_update_tenant_module_limits_returns_schema(self) -> None:
        previous_tenant = build_tenant_record_stub(plan_code="basic")
        previous_tenant.id = 1
        tenant = build_tenant_record_stub(
            plan_code="pro",
            module_limits_json='{"finance.entries": 40}',
        )
        tenant.id = 1
        tenant.status = "active"

        with patch(
            "app.apps.platform_control.api.tenant_routes."
            "tenant_service.tenant_repository.get_by_id",
            return_value=previous_tenant,
        ), patch(
            "app.apps.platform_control.api.tenant_routes."
            "tenant_service.set_module_limits",
            return_value=tenant,
        ), patch(
            "app.apps.platform_control.api.tenant_routes."
            "tenant_service.tenant_plan_policy_service.get_module_limits",
            return_value={"finance.entries": 250},
        ), patch(
            "app.apps.platform_control.api.tenant_routes."
            "tenant_policy_event_service.record_change",
        ):
            response = update_tenant_module_limits(
                tenant_id=1,
                payload=TenantModuleLimitsUpdateRequest(
                    module_limits={"finance.entries": 40}
                ),
                db=object(),
                _token=self._token_payload(),
            )

        self.assertTrue(response.success)
        self.assertEqual(response.tenant_plan_module_limits, {"finance.entries": 250})
        self.assertEqual(response.module_limits, {"finance.entries": 40})

    def test_update_tenant_plan_returns_schema(self) -> None:
        previous_tenant = build_tenant_record_stub(plan_code="basic")
        previous_tenant.id = 1
        tenant = build_tenant_record_stub(plan_code="pro")
        tenant.id = 1
        tenant.status = "active"

        with patch(
            "app.apps.platform_control.api.tenant_routes."
            "tenant_service.tenant_repository.get_by_id",
            return_value=previous_tenant,
        ), patch(
            "app.apps.platform_control.api.tenant_routes."
            "tenant_service.set_plan",
            return_value=tenant,
        ), patch(
            "app.apps.platform_control.api.tenant_routes."
            "tenant_service.tenant_plan_policy_service.get_enabled_modules",
            return_value=["core", "users", "finance"],
        ), patch(
            "app.apps.platform_control.api.tenant_routes."
            "tenant_policy_event_service.record_change",
        ):
            response = update_tenant_plan(
                tenant_id=1,
                payload=TenantPlanUpdateRequest(plan_code="pro"),
                db=object(),
                _token=self._token_payload(),
            )

        self.assertTrue(response.success)
        self.assertEqual(response.tenant_plan_code, "pro")
        self.assertEqual(
            response.tenant_plan_enabled_modules,
            ["core", "users", "finance"],
        )

    def test_get_tenant_finance_usage_returns_operational_view(self) -> None:
        tenant = build_tenant_record_stub(
            plan_code="pro",
            billing_status="past_due",
            billing_grace_until=datetime.now(timezone.utc) + timedelta(days=2),
            module_limits_json='{"finance.entries": 40}',
        )
        tenant.id = 1
        tenant.status = "active"

        fake_tenant_db = SimpleNamespace(close=lambda: None)

        with patch(
            "app.apps.platform_control.api.tenant_routes."
            "tenant_service.tenant_repository.get_by_id",
            return_value=tenant,
        ), patch(
            "app.apps.platform_control.api.tenant_routes."
            "tenant_service.get_effective_module_limits",
            return_value={"finance.entries": 25},
        ), patch(
            "app.apps.platform_control.api.tenant_routes."
            "tenant_service.get_effective_module_limit_sources",
            return_value={"finance.entries": "billing_grace"},
        ), patch(
            "app.apps.platform_control.api.tenant_routes."
            "tenant_service.get_tenant_access_policy",
            return_value=SimpleNamespace(billing_in_grace=True),
        ), patch(
            "app.apps.platform_control.api.tenant_routes."
            "tenant_service.tenant_plan_policy_service.get_module_limits",
            return_value={"finance.entries": 250},
        ), patch(
            "app.apps.platform_control.api.tenant_routes."
            "tenant_service.get_tenant_module_limits",
            return_value={"finance.entries": 40},
        ), patch(
            "app.apps.platform_control.api.tenant_routes."
            "tenant_connection_service.get_tenant_session",
            return_value=lambda: fake_tenant_db,
        ), patch(
            "app.apps.platform_control.api.tenant_routes."
            "tenant_service.tenant_billing_grace_policy_service.get_policy",
            return_value=SimpleNamespace(module_limits={"finance.entries": 25}),
        ), patch(
            "app.apps.platform_control.api.tenant_routes."
            "finance_service.get_usage",
            return_value={
                "module_key": "finance.entries",
                "used_entries": 12,
                "max_entries": 25,
                "remaining_entries": 13,
                "unlimited": False,
                "at_limit": False,
            },
        ):
            response = get_tenant_finance_usage(
                tenant_id=1,
                db=object(),
                _token=self._token_payload(),
            )

        self.assertTrue(response.success)
        self.assertEqual(response.tenant_plan_module_limits, {"finance.entries": 250})
        self.assertEqual(response.tenant_module_limits, {"finance.entries": 40})
        self.assertEqual(response.billing_grace_module_limits, {"finance.entries": 25})
        self.assertEqual(response.effective_module_limit, 25)
        self.assertEqual(response.effective_module_limit_source, "billing_grace")
        self.assertEqual(response.data.used_entries, 12)

    def test_get_tenant_module_usage_returns_operational_view(self) -> None:
        tenant = build_tenant_record_stub(
            plan_code="pro",
            billing_status="past_due",
            billing_grace_until=datetime.now(timezone.utc) + timedelta(days=2),
        )
        tenant.id = 1
        tenant.status = "active"

        fake_tenant_db = SimpleNamespace(close=lambda: None)

        with patch(
            "app.apps.platform_control.api.tenant_routes."
            "tenant_service.tenant_repository.get_by_id",
            return_value=tenant,
        ), patch(
            "app.apps.platform_control.api.tenant_routes."
            "tenant_service.get_tenant_access_policy",
            return_value=SimpleNamespace(billing_in_grace=True),
        ), patch(
            "app.apps.platform_control.api.tenant_routes."
            "tenant_service.get_effective_module_limits",
            return_value={
                "finance.entries": 25,
                "finance.entries.monthly": 10,
                "finance.entries.monthly.income": 8,
                "core.users": 5,
                "core.users.active": 2,
                "core.users.monthly": 4,
                "core.users.admin": 1,
            },
        ), patch(
            "app.apps.platform_control.api.tenant_routes."
            "tenant_service.get_effective_module_limit_sources",
            return_value={
                "finance.entries": "billing_grace",
                "finance.entries.monthly": "plan",
                "finance.entries.monthly.income": "plan",
                "core.users": "plan",
                "core.users.active": "billing_grace",
                "core.users.monthly": "plan",
                "core.users.admin": "plan",
            },
        ), patch(
            "app.apps.platform_control.api.tenant_routes."
            "tenant_connection_service.get_tenant_session",
            return_value=lambda: fake_tenant_db,
        ), patch(
            "app.apps.platform_control.api.tenant_routes."
            "tenant_module_usage_service.list_usage",
            return_value=[
                {
                    "module_name": "core",
                    "module_key": "core.users",
                    "used_units": 3,
                    "max_units": 5,
                    "remaining_units": 2,
                    "unlimited": False,
                    "at_limit": False,
                    "limit_source": "plan",
                },
                {
                    "module_name": "core",
                    "module_key": "core.users.active",
                    "used_units": 2,
                    "max_units": 2,
                    "remaining_units": 0,
                    "unlimited": False,
                    "at_limit": True,
                    "limit_source": "billing_grace",
                },
                {
                    "module_name": "core",
                    "module_key": "core.users.monthly",
                    "used_units": 4,
                    "max_units": 4,
                    "remaining_units": 0,
                    "unlimited": False,
                    "at_limit": True,
                    "limit_source": "plan",
                },
                {
                    "module_name": "core",
                    "module_key": "core.users.admin",
                    "used_units": 1,
                    "max_units": 1,
                    "remaining_units": 0,
                    "unlimited": False,
                    "at_limit": True,
                    "limit_source": "plan",
                },
                {
                    "module_name": "finance",
                    "module_key": "finance.entries",
                    "used_units": 12,
                    "max_units": 25,
                    "remaining_units": 13,
                    "unlimited": False,
                    "at_limit": False,
                    "limit_source": "billing_grace",
                },
                {
                    "module_name": "finance",
                    "module_key": "finance.entries.monthly",
                    "used_units": 9,
                    "max_units": 10,
                    "remaining_units": 1,
                    "unlimited": False,
                    "at_limit": False,
                    "limit_source": "plan",
                },
                {
                    "module_name": "finance",
                    "module_key": "finance.entries.monthly.income",
                    "used_units": 7,
                    "max_units": 8,
                    "remaining_units": 1,
                    "unlimited": False,
                    "at_limit": False,
                    "limit_source": "plan",
                }
            ],
        ):
            response = get_tenant_module_usage(
                tenant_id=1,
                db=object(),
                _token=self._token_payload(),
            )

        self.assertTrue(response.success)
        self.assertEqual(response.total_modules, 7)
        self.assertEqual(response.data[0].module_key, "core.users")
        self.assertEqual(response.data[0].max_units, 5)
        self.assertEqual(response.data[1].module_key, "core.users.active")
        self.assertTrue(response.data[1].at_limit)
        self.assertEqual(response.data[2].module_key, "core.users.monthly")
        self.assertTrue(response.data[2].at_limit)
        self.assertEqual(response.data[3].module_key, "core.users.admin")
        self.assertTrue(response.data[3].at_limit)
        self.assertEqual(response.data[4].module_name, "finance")
        self.assertEqual(response.data[4].limit_source, "billing_grace")
        self.assertEqual(response.data[5].module_key, "finance.entries.monthly")
        self.assertEqual(response.data[6].module_key, "finance.entries.monthly.income")

    def test_get_tenant_module_usage_translates_invalid_db_credentials(self) -> None:
        tenant = build_tenant_record_stub(plan_code="pro")
        tenant.id = 1
        tenant.status = "active"

        class BrokenTenantDb:
            def execute(self, *_args, **_kwargs):
                raise OperationalError(
                    "SELECT 1",
                    {},
                    Exception("password authentication failed"),
                )

            def close(self):
                return None

        with patch(
            "app.apps.platform_control.api.tenant_routes."
            "tenant_service.tenant_repository.get_by_id",
            return_value=tenant,
        ), patch(
            "app.apps.platform_control.api.tenant_routes."
            "tenant_service.get_tenant_access_policy",
            return_value=SimpleNamespace(billing_in_grace=False),
        ), patch(
            "app.apps.platform_control.api.tenant_routes."
            "tenant_service.get_effective_module_limits",
            return_value={},
        ), patch(
            "app.apps.platform_control.api.tenant_routes."
            "tenant_service.get_effective_module_limit_sources",
            return_value={},
        ), patch(
            "app.apps.platform_control.api.tenant_routes."
            "tenant_connection_service.get_tenant_session",
            return_value=lambda: BrokenTenantDb(),
        ):
            with self.assertRaises(HTTPException) as exc:
                get_tenant_module_usage(
                    tenant_id=1,
                    db=object(),
                    _token=self._token_payload(),
                )

        self.assertEqual(exc.exception.status_code, 503)
        self.assertEqual(
            exc.exception.detail,
            "Tenant database access failed. Rotate or reprovision tenant DB credentials before requesting module usage.",
        )

    def test_update_tenant_billing_returns_schema(self) -> None:
        grace_until = datetime.now(timezone.utc) + timedelta(days=2)
        previous_tenant = build_tenant_record_stub(billing_status="active")
        previous_tenant.id = 1
        tenant = build_tenant_record_stub(
            billing_status="past_due",
            billing_status_reason="invoice overdue",
            billing_grace_until=grace_until,
        )
        tenant.id = 1
        tenant.status = "active"

        with patch(
            "app.apps.platform_control.api.tenant_routes."
            "tenant_service.tenant_repository.get_by_id",
            return_value=previous_tenant,
        ), patch(
            "app.apps.platform_control.api.tenant_routes."
            "tenant_service.set_billing_state",
            return_value=tenant,
        ), patch(
            "app.apps.platform_control.api.tenant_routes."
            "tenant_policy_event_service.record_change",
        ) as record_change:
            response = update_tenant_billing(
                tenant_id=1,
                payload=TenantBillingUpdateRequest(
                    billing_status="past_due",
                    billing_status_reason="invoice overdue",
                    billing_grace_until=grace_until,
                ),
                db=object(),
                _token=self._token_payload(),
            )

        self.assertTrue(response.success)
        self.assertEqual(response.billing_status, "past_due")
        self.assertEqual(response.billing_status_reason, "invoice overdue")
        self.assertEqual(response.billing_grace_until, grace_until)
        self.assertEqual(record_change.call_args.kwargs["event_type"], "billing")

    def test_update_tenant_billing_identity_returns_schema(self) -> None:
        previous_tenant = build_tenant_record_stub()
        previous_tenant.id = 1
        tenant = build_tenant_record_stub(
            billing_provider="stripe",
            billing_provider_customer_id="cus_1",
            billing_provider_subscription_id="sub_1",
        )
        tenant.id = 1
        tenant.status = "active"

        with patch(
            "app.apps.platform_control.api.tenant_routes."
            "tenant_service.tenant_repository.get_by_id",
            return_value=previous_tenant,
        ), patch(
            "app.apps.platform_control.api.tenant_routes."
            "tenant_service.set_billing_identity",
            return_value=tenant,
        ), patch(
            "app.apps.platform_control.api.tenant_routes."
            "tenant_policy_event_service.record_change",
        ) as record_change:
            response = update_tenant_billing_identity(
                tenant_id=1,
                payload=TenantBillingIdentityUpdateRequest(
                    billing_provider="stripe",
                    billing_provider_customer_id="cus_1",
                    billing_provider_subscription_id="sub_1",
                ),
                db=object(),
                _token=self._token_payload(),
            )

        self.assertTrue(response.success)
        self.assertEqual(response.billing_provider, "stripe")
        self.assertEqual(response.billing_provider_customer_id, "cus_1")
        self.assertEqual(response.billing_provider_subscription_id, "sub_1")
        self.assertEqual(record_change.call_args.kwargs["event_type"], "billing_identity")

    def test_sync_tenant_billing_event_returns_schema(self) -> None:
        grace_until = datetime.now(timezone.utc) + timedelta(days=2)
        tenant = build_tenant_record_stub(
            billing_status="past_due",
            billing_status_reason="invoice overdue",
            billing_grace_until=grace_until,
        )
        tenant.id = 1
        tenant.status = "active"
        recorded_at = datetime.now(timezone.utc)

        with patch(
            "app.apps.platform_control.api.tenant_routes."
            "tenant_billing_sync_service.apply_sync_event",
            return_value=SimpleNamespace(
                was_duplicate=False,
                tenant=tenant,
                sync_event=SimpleNamespace(
                    id=1,
                    tenant_id=1,
                    tenant_slug="empresa-bootstrap",
                    provider="stripe",
                    provider_event_id="evt_1",
                    provider_customer_id="cus_1",
                    provider_subscription_id="sub_1",
                    event_type="invoice.payment_failed",
                    billing_status="past_due",
                    billing_status_reason="invoice overdue",
                    billing_current_period_ends_at=None,
                    billing_grace_until=grace_until,
                    processing_result="applied",
                    recorded_at=recorded_at,
                ),
            ),
        ):
            response = sync_tenant_billing_event(
                tenant_id=1,
                payload=TenantBillingSyncEventRequest(
                    provider="stripe",
                    provider_event_id="evt_1",
                    event_type="invoice.payment_failed",
                    billing_status="past_due",
                    billing_status_reason="invoice overdue",
                    billing_grace_until=grace_until,
                    provider_customer_id="cus_1",
                    provider_subscription_id="sub_1",
                    raw_payload={"source": "test"},
                ),
                db=object(),
                _token=self._token_payload(),
            )

        self.assertTrue(response.success)
        self.assertFalse(response.was_duplicate)
        self.assertEqual(response.sync_event.provider, "stripe")
        self.assertEqual(response.billing_status, "past_due")

    def test_get_tenant_billing_events_returns_schema(self) -> None:
        tenant = build_tenant_record_stub()
        tenant.id = 1
        recorded_at = datetime.now(timezone.utc)

        with patch(
            "app.apps.platform_control.api.tenant_routes."
            "tenant_service.tenant_repository.get_by_id",
            return_value=tenant,
        ), patch(
            "app.apps.platform_control.api.tenant_routes."
            "tenant_billing_sync_service.list_recent_events",
            return_value=[
                {
                    "id": 1,
                    "tenant_id": 1,
                    "tenant_slug": "empresa-bootstrap",
                    "provider": "stripe",
                    "provider_event_id": "evt_1",
                    "provider_customer_id": "cus_1",
                    "provider_subscription_id": "sub_1",
                    "event_type": "invoice.payment_failed",
                    "billing_status": "past_due",
                    "billing_status_reason": "invoice overdue",
                    "billing_current_period_ends_at": None,
                    "billing_grace_until": None,
                    "processing_result": "applied",
                    "recorded_at": recorded_at,
                }
            ],
        ):
            response = get_tenant_billing_events(
                tenant_id=1,
                provider="stripe",
                limit=20,
                db=object(),
                _token=self._token_payload(),
            )

        self.assertTrue(response.success)
        self.assertEqual(response.total_events, 1)
        self.assertEqual(response.provider, "stripe")
        self.assertEqual(response.data[0].provider_event_id, "evt_1")

    def test_get_tenant_billing_events_accepts_filters(self) -> None:
        tenant = build_tenant_record_stub()
        tenant.id = 1

        with patch(
            "app.apps.platform_control.api.tenant_routes."
            "tenant_service.tenant_repository.get_by_id",
            return_value=tenant,
        ), patch(
            "app.apps.platform_control.api.tenant_routes."
            "tenant_billing_sync_service.list_recent_events",
            return_value=[],
        ) as list_recent_events:
            response = get_tenant_billing_events(
                tenant_id=1,
                provider="stripe",
                event_type="invoice.payment_failed",
                processing_result="duplicate",
                limit=10,
                db=object(),
                _token=self._token_payload(),
            )

        self.assertTrue(response.success)
        self.assertEqual(response.event_type, "invoice.payment_failed")
        self.assertEqual(response.processing_result, "duplicate")
        self.assertEqual(
            list_recent_events.call_args.kwargs["processing_result"],
            "duplicate",
        )

    def test_get_tenant_billing_events_summary_returns_schema(self) -> None:
        tenant = build_tenant_record_stub()
        tenant.id = 1
        recorded_at = datetime.now(timezone.utc)

        with patch(
            "app.apps.platform_control.api.tenant_routes."
            "tenant_service.tenant_repository.get_by_id",
            return_value=tenant,
        ), patch(
            "app.apps.platform_control.api.tenant_routes."
            "tenant_billing_sync_service.summarize_recent_events",
            return_value=[
                {
                    "provider": "stripe",
                    "event_type": "invoice.payment_failed",
                    "processing_result": "duplicate",
                    "total_events": 3,
                    "last_recorded_at": recorded_at,
                }
            ],
        ) as summarize_recent_events:
            response = get_tenant_billing_events_summary(
                tenant_id=1,
                provider="stripe",
                event_type="invoice.payment_failed",
                processing_result="duplicate",
                db=object(),
                _token=self._token_payload(),
            )

        self.assertTrue(response.success)
        self.assertEqual(response.total_rows, 1)
        self.assertEqual(response.data[0].processing_result, "duplicate")
        self.assertEqual(
            summarize_recent_events.call_args.kwargs["event_type"],
            "invoice.payment_failed",
        )

    def test_get_platform_billing_events_summary_returns_schema(self) -> None:
        recorded_at = datetime.now(timezone.utc)

        with patch(
            "app.apps.platform_control.api.tenant_routes."
            "tenant_billing_sync_service.summarize_all_recent_events",
            return_value=[
                {
                    "provider": "stripe",
                    "event_type": "invoice.payment_failed",
                    "processing_result": "duplicate",
                    "total_events": 4,
                    "total_tenants": 2,
                    "last_recorded_at": recorded_at,
                }
            ],
        ) as summarize_all_recent_events:
            response = get_platform_billing_events_summary(
                provider="stripe",
                event_type="invoice.payment_failed",
                processing_result="duplicate",
                db=object(),
                _token=self._token_payload(),
            )

        self.assertTrue(response.success)
        self.assertEqual(response.total_rows, 1)
        self.assertEqual(response.data[0].total_tenants, 2)
        self.assertEqual(
            summarize_all_recent_events.call_args.kwargs["processing_result"],
            "duplicate",
        )

    def test_get_platform_billing_event_alerts_returns_schema(self) -> None:
        recorded_at = datetime.now(timezone.utc)

        with patch(
            "app.apps.platform_control.api.tenant_routes."
            "billing_alert_service.list_active_alerts",
            return_value=[
                {
                    "alert_code": "billing_duplicate_events_threshold_exceeded",
                    "severity": "warning",
                    "provider": "stripe",
                    "event_type": "invoice.payment_failed",
                    "processing_result": "duplicate",
                    "message": "duplicates detectados",
                    "observed_value": 4,
                    "threshold_value": 3,
                    "total_tenants": 2,
                    "last_recorded_at": recorded_at,
                }
            ],
        ) as list_active_alerts:
            response = get_platform_billing_event_alerts(
                provider="stripe",
                event_type="invoice.payment_failed",
                db=object(),
                _token=self._token_payload(),
            )

        self.assertTrue(response.success)
        self.assertEqual(response.total_alerts, 1)
        self.assertEqual(response.data[0].alert_code, "billing_duplicate_events_threshold_exceeded")
        self.assertEqual(response.data[0].provider, "stripe")
        self.assertEqual(list_active_alerts.call_args.kwargs["provider"], "stripe")
        self.assertEqual(
            list_active_alerts.call_args.kwargs["event_type"],
            "invoice.payment_failed",
        )

    def test_get_platform_billing_event_alert_history_returns_schema(self) -> None:
        recorded_at = datetime.now(timezone.utc)

        with patch(
            "app.apps.platform_control.api.tenant_routes."
            "billing_alert_service.list_recent_alert_history",
            return_value=[
                {
                    "id": 1,
                    "alert_code": "billing_duplicate_events_threshold_exceeded",
                    "severity": "warning",
                    "provider": "stripe",
                    "event_type": "invoice.payment_failed",
                    "processing_result": "duplicate",
                    "message": "duplicates detectados",
                    "observed_value": 4,
                    "threshold_value": 3,
                    "total_tenants": 2,
                    "source_recorded_at": recorded_at,
                    "recorded_at": recorded_at,
                }
            ],
        ) as list_recent_alert_history:
            response = get_platform_billing_event_alert_history(
                limit=25,
                provider="stripe",
                event_type="invoice.payment_failed",
                processing_result="duplicate",
                alert_code="billing_duplicate_events_threshold_exceeded",
                severity="warning",
                db=object(),
                _token=self._token_payload(),
            )

        self.assertTrue(response.success)
        self.assertEqual(response.total_alerts, 1)
        self.assertEqual(response.data[0].provider, "stripe")
        self.assertEqual(response.data[0].processing_result, "duplicate")
        self.assertEqual(list_recent_alert_history.call_args.kwargs["limit"], 25)

    def test_reconcile_tenant_billing_from_event_returns_schema(self) -> None:
        tenant = build_tenant_record_stub(
            billing_status="past_due",
            billing_status_reason="invoice.payment_failed",
        )
        tenant.id = 1
        tenant.status = "active"
        recorded_at = datetime.now(timezone.utc)

        with patch(
            "app.apps.platform_control.api.tenant_routes."
            "tenant_billing_sync_service.reconcile_from_stored_event",
            return_value=SimpleNamespace(
                was_reconciled=True,
                tenant=tenant,
                sync_event=SimpleNamespace(
                    id=9,
                    tenant_id=1,
                    tenant_slug="empresa-bootstrap",
                    provider="stripe",
                    provider_event_id="evt_reconcile",
                    provider_customer_id="cus_1",
                    provider_subscription_id="sub_1",
                    event_type="invoice.payment_failed",
                    billing_status="past_due",
                    billing_status_reason="invoice.payment_failed",
                    billing_current_period_ends_at=None,
                    billing_grace_until=None,
                    processing_result="applied",
                    recorded_at=recorded_at,
                ),
            ),
        ):
            response = reconcile_tenant_billing_from_event(
                tenant_id=1,
                sync_event_id=9,
                db=object(),
                _token=self._token_payload(),
            )

        self.assertTrue(response.success)
        self.assertEqual(response.sync_event.provider_event_id, "evt_reconcile")
        self.assertEqual(response.billing_status, "past_due")

    def test_reconcile_tenant_billing_events_batch_returns_schema(self) -> None:
        tenant = build_tenant_record_stub()
        tenant.id = 1
        recorded_at = datetime.now(timezone.utc)

        with patch(
            "app.apps.platform_control.api.tenant_routes."
            "tenant_service.tenant_repository.get_by_id",
            return_value=tenant,
        ), patch(
            "app.apps.platform_control.api.tenant_routes."
            "tenant_billing_sync_service.reconcile_recent_events",
            return_value=[
                SimpleNamespace(
                    sync_event=SimpleNamespace(
                        id=9,
                        tenant_id=1,
                        tenant_slug="empresa-bootstrap",
                        provider="stripe",
                        provider_event_id="evt_reconcile",
                        provider_customer_id="cus_1",
                        provider_subscription_id="sub_1",
                        event_type="invoice.payment_failed",
                        billing_status="past_due",
                        billing_status_reason="invoice.payment_failed",
                        billing_current_period_ends_at=None,
                        billing_grace_until=None,
                        processing_result="reconciled",
                        recorded_at=recorded_at,
                    ),
                )
            ],
        ) as reconcile_recent_events:
            response = reconcile_tenant_billing_events_batch(
                tenant_id=1,
                provider="stripe",
                event_type="invoice.payment_failed",
                processing_result="applied",
                limit=5,
                db=object(),
                _token=self._token_payload(),
            )

        self.assertTrue(response.success)
        self.assertEqual(response.total_events, 1)
        self.assertEqual(response.data[0].processing_result, "reconciled")
        self.assertEqual(
            reconcile_recent_events.call_args.kwargs["processing_result"],
            "applied",
        )

    def test_sync_stripe_billing_webhook_returns_schema(self) -> None:
        grace_until = datetime.now(timezone.utc) + timedelta(days=2)
        tenant = build_tenant_record_stub(
            billing_status="past_due",
            billing_status_reason="invoice.payment_failed",
            billing_grace_until=grace_until,
        )
        tenant.id = 1
        tenant.status = "active"
        recorded_at = datetime.now(timezone.utc)
        payload_bytes = b'{"id":"evt_1"}'

        class FakeWebhookRequest:
            async def body(self):
                return payload_bytes

        with patch(
            "app.apps.platform_control.api.billing_webhook_routes."
            "billing_provider_adapter_service.normalize_event",
            return_value=SimpleNamespace(
                provider="stripe",
                provider_event_id="evt_1",
                event_type="invoice.payment_failed",
                tenant_slug="empresa-bootstrap",
                provider_customer_id="cus_1",
                provider_subscription_id="sub_1",
                billing_status="past_due",
                billing_status_reason="invoice.payment_failed",
                billing_current_period_ends_at=None,
                billing_grace_until=grace_until,
                raw_payload={"id": "evt_1"},
            ),
        ), patch(
            "app.apps.platform_control.api.billing_webhook_routes."
            "tenant_service.resolve_tenant_for_billing_provider_event",
            return_value=tenant,
        ), patch(
            "app.apps.platform_control.api.billing_webhook_routes."
            "tenant_billing_sync_service.apply_sync_event",
            return_value=SimpleNamespace(
                was_duplicate=False,
                tenant=tenant,
                sync_event=SimpleNamespace(
                    id=1,
                    tenant_id=1,
                    tenant_slug="empresa-bootstrap",
                    provider="stripe",
                    provider_event_id="evt_1",
                    provider_customer_id="cus_1",
                    provider_subscription_id="sub_1",
                    event_type="invoice.payment_failed",
                    billing_status="past_due",
                    billing_status_reason="invoice.payment_failed",
                    billing_current_period_ends_at=None,
                    billing_grace_until=grace_until,
                    processing_result="applied",
                    recorded_at=recorded_at,
                ),
            ),
        ), patch(
            "app.apps.platform_control.api.billing_webhook_routes.settings.BILLING_STRIPE_WEBHOOK_SECRET",
            "secret-123",
        ), patch(
            "app.apps.platform_control.api.billing_webhook_routes."
            "stripe_webhook_signature_service.validate_signature",
            return_value=True,
        ):
            response = asyncio.run(
                sync_stripe_billing_webhook(
                    request=FakeWebhookRequest(),
                    db=object(),
                    stripe_signature="t=1770000000,v1=test-signature",
                )
            )

        self.assertTrue(response.success)
        self.assertFalse(response.was_duplicate)
        self.assertEqual(response.sync_event.provider, "stripe")

    def test_sync_stripe_billing_webhook_rejects_invalid_secret(self) -> None:
        class FakeWebhookRequest:
            async def body(self):
                return b'{"id":"evt_1"}'

        with patch(
            "app.apps.platform_control.api.billing_webhook_routes.settings.BILLING_STRIPE_WEBHOOK_SECRET",
            "secret-123",
        ), patch(
            "app.apps.platform_control.api.billing_webhook_routes."
            "stripe_webhook_signature_service.validate_signature",
            return_value=False,
        ):
            with self.assertRaises(HTTPException) as exc:
                asyncio.run(
                    sync_stripe_billing_webhook(
                        request=FakeWebhookRequest(),
                        db=object(),
                        stripe_signature="t=1770000000,v1=bad-signature",
                    )
                )

        self.assertEqual(exc.exception.status_code, 401)

    def test_get_tenant_access_policy_returns_effective_policy(self) -> None:
        grace_until = datetime.now(timezone.utc) + timedelta(days=2)
        tenant = build_tenant_record_stub(
            status="active",
            plan_code="pro",
            billing_status="past_due",
            billing_status_reason="invoice overdue",
            billing_grace_until=grace_until,
        )
        tenant.id = 1

        with patch(
            "app.apps.platform_control.api.tenant_routes."
            "tenant_service.tenant_repository.get_by_id",
            return_value=tenant,
        ), patch(
            "app.apps.platform_control.api.tenant_routes."
            "tenant_service.get_tenant_access_policy",
            return_value=SimpleNamespace(
                allowed=True,
                status_code=None,
                detail=None,
                blocking_source=None,
                billing_in_grace=True,
            ),
        ):
            response = get_tenant_access_policy(
                tenant_id=1,
                db=object(),
                _token=self._token_payload(),
            )

        self.assertTrue(response.success)
        self.assertTrue(response.access_allowed)
        self.assertTrue(response.billing_in_grace)

    def test_update_tenant_status_returns_schema(self) -> None:
        previous_tenant = build_tenant_record_stub(status="active")
        previous_tenant.id = 1
        tenant = build_tenant_record_stub(
            status="suspended",
            status_reason="billing overdue",
        )
        tenant.id = 1

        with patch(
            "app.apps.platform_control.api.tenant_routes."
            "tenant_service.tenant_repository.get_by_id",
            return_value=previous_tenant,
        ), patch(
            "app.apps.platform_control.api.tenant_routes."
            "tenant_service.set_status",
            return_value=tenant,
        ), patch(
            "app.apps.platform_control.api.tenant_routes."
            "tenant_policy_event_service.record_change",
        ):
            response = update_tenant_status(
                tenant_id=1,
                payload=TenantStatusUpdateRequest(
                    status="suspended",
                    status_reason="billing overdue",
                ),
                db=object(),
                _token=self._token_payload(),
            )

        self.assertTrue(response.success)
        self.assertEqual(response.tenant_status, "suspended")
        self.assertEqual(response.tenant_status_reason, "billing overdue")

    def test_restore_tenant_returns_schema(self) -> None:
        previous_tenant = build_tenant_record_stub(status="archived")
        previous_tenant.id = 1
        tenant = build_tenant_record_stub(
            status="active",
            status_reason="Restaurado desde consola",
        )
        tenant.id = 1

        with patch(
            "app.apps.platform_control.api.tenant_routes."
            "tenant_service.tenant_repository.get_by_id",
            return_value=previous_tenant,
        ), patch(
            "app.apps.platform_control.api.tenant_routes."
            "tenant_service.restore_tenant",
            return_value=tenant,
        ), patch(
            "app.apps.platform_control.api.tenant_routes."
            "tenant_policy_event_service.record_change",
        ), patch(
            "app.apps.platform_control.api.tenant_routes.auth_audit_service.log_event",
        ):
            response = restore_tenant(
                tenant_id=1,
                payload=TenantRestoreRequest(
                    target_status="active",
                    restore_reason="Restaurado desde consola",
                ),
                db=object(),
                _token=self._token_payload(),
            )

        self.assertTrue(response.success)
        self.assertEqual(response.tenant_status, "active")
        self.assertEqual(response.tenant_status_reason, "Restaurado desde consola")

    def test_delete_tenant_returns_schema(self) -> None:
        tenant = build_tenant_record_stub(
            tenant_name="Empresa Temporal",
            tenant_slug="empresa-temporal",
            status="archived",
        )
        tenant.id = 1

        with patch(
            "app.apps.platform_control.api.tenant_routes.tenant_service.delete_tenant",
            return_value=tenant,
        ), patch(
            "app.apps.platform_control.api.tenant_routes.auth_audit_service.log_event",
        ):
            response = delete_tenant(
                tenant_id=1,
                db=object(),
                _token=self._token_payload(),
            )

        self.assertTrue(response.success)
        self.assertEqual(response.tenant_id, 1)
        self.assertEqual(response.tenant_slug, "empresa-temporal")
        self.assertEqual(response.tenant_name, "Empresa Temporal")

    def test_reprovision_tenant_returns_job_schema(self) -> None:
        job = SimpleNamespace(
            id=21,
            tenant_id=5,
            job_type="create_tenant_database",
            status="pending",
            attempts=0,
            max_attempts=3,
            error_code=None,
            error_message=None,
            next_retry_at=None,
        )

        with patch(
            "app.apps.platform_control.api.tenant_routes.tenant_service.reprovision_tenant",
            return_value=job,
        ), patch(
            "app.apps.platform_control.api.tenant_routes.tenant_service.tenant_repository.get_by_id",
            return_value=build_tenant_record_stub(
                tenant_slug="empresa-bootstrap",
            ),
        ), patch(
            "app.apps.platform_control.api.tenant_routes.auth_audit_service.log_event",
        ) as reprovision_mock:
            response = reprovision_tenant(
                tenant_id=5,
                db=object(),
                _token=self._token_payload(),
            )

        self.assertEqual(response.id, 21)
        self.assertEqual(response.tenant_id, 5)
        self.assertEqual(response.status, "pending")
        reprovision_mock.assert_called_once()

    def test_rotate_tenant_db_credentials_returns_schema(self) -> None:
        rotated_at = datetime.now(timezone.utc)
        tenant = build_tenant_record_stub(
            tenant_name="Empresa Demo",
            tenant_slug="empresa-demo",
            status="active",
        )
        tenant.id = 5
        tenant.tenant_db_credentials_rotated_at = rotated_at

        with patch(
            "app.apps.platform_control.api.tenant_routes._capture_tenant_snapshot",
            return_value={"status": "active"},
        ), patch(
            "app.apps.platform_control.api.tenant_routes.tenant_service.rotate_tenant_db_credentials",
            return_value={
                "tenant": tenant,
                "env_var_name": "TENANT_DB_PASSWORD__EMPRESA_DEMO",
                "rotated_at": rotated_at,
            },
        ), patch(
            "app.apps.platform_control.api.tenant_routes._record_tenant_policy_event",
        ) as record_mock, patch(
            "app.apps.platform_control.api.tenant_routes.auth_audit_service.log_event",
        ) as audit_mock:
            response = rotate_tenant_db_credentials(
                tenant_id=5,
                db=object(),
                _token=self._token_payload(),
            )

        self.assertTrue(response.success)
        self.assertEqual(response.tenant_id, 5)
        self.assertEqual(response.tenant_slug, "empresa-demo")
        self.assertEqual(
            response.env_var_name, "TENANT_DB_PASSWORD__EMPRESA_DEMO"
        )
        self.assertEqual(response.rotated_at, rotated_at)
        record_mock.assert_called_once()
        audit_mock.assert_called_once()

    def test_rotate_tenant_db_credentials_translates_missing_role_to_actionable_error(self) -> None:
        with patch(
            "app.apps.platform_control.api.tenant_routes._capture_tenant_snapshot",
            return_value={"status": "active"},
        ), patch(
            "app.apps.platform_control.api.tenant_routes.tenant_service.rotate_tenant_db_credentials",
            side_effect=ValueError("Tenant database role not found"),
        ):
            with self.assertRaises(HTTPException) as exc:
                rotate_tenant_db_credentials(
                    tenant_id=5,
                    db=object(),
                    _token=self._token_payload(),
                )

        self.assertEqual(exc.exception.status_code, 409)
        self.assertEqual(
            exc.exception.detail,
            "Tenant database role not found. Reprovision tenant database before rotating technical credentials.",
        )

    def test_rotate_tenant_db_credentials_translates_validation_restore_error(self) -> None:
        with patch(
            "app.apps.platform_control.api.tenant_routes._capture_tenant_snapshot",
            return_value={"status": "active"},
        ), patch(
            "app.apps.platform_control.api.tenant_routes.tenant_service.rotate_tenant_db_credentials",
            side_effect=ValueError(
                "Rotated credentials failed validation and the previous password was restored"
            ),
        ):
            with self.assertRaises(HTTPException) as exc:
                rotate_tenant_db_credentials(
                    tenant_id=5,
                    db=object(),
                    _token=self._token_payload(),
                )

        self.assertEqual(exc.exception.status_code, 409)
        self.assertEqual(
            exc.exception.detail,
            "The rotated tenant credentials could not be validated and the previous password was restored. Verify PostgreSQL admin access and tenant database reachability before retrying.",
        )

    def test_deprovision_tenant_returns_schema(self) -> None:
        job = SimpleNamespace(
            id=33,
            tenant_id=5,
            job_type="deprovision_tenant_database",
            status="pending",
            attempts=0,
            max_attempts=3,
            error_code=None,
            error_message=None,
            next_retry_at=None,
        )

        with patch(
            "app.apps.platform_control.api.tenant_routes.tenant_service.request_deprovision_tenant",
            return_value=job,
        ), patch(
            "app.apps.platform_control.api.tenant_routes.tenant_service.tenant_repository.get_by_id",
            return_value=build_tenant_record_stub(
                tenant_slug="empresa-demo",
                status="archived",
            ),
        ), patch(
            "app.apps.platform_control.api.tenant_routes.auth_audit_service.log_event",
        ) as audit_mock:
            response = deprovision_tenant(
                tenant_id=5,
                db=object(),
                _token=self._token_payload(),
            )

        self.assertEqual(response.id, 33)
        self.assertEqual(response.tenant_id, 5)
        self.assertEqual(response.job_type, "deprovision_tenant_database")
        self.assertEqual(response.status, "pending")
        audit_mock.assert_called_once()

    def test_deprovision_tenant_returns_400_when_business_rule_blocks_action(self) -> None:
        with patch(
            "app.apps.platform_control.api.tenant_routes.tenant_service.request_deprovision_tenant",
            side_effect=ValueError("Only archived tenants can be deprovisioned"),
        ):
            with self.assertRaises(HTTPException) as exc:
                deprovision_tenant(
                    tenant_id=5,
                    db=object(),
                    _token=self._token_payload(),
                )

        self.assertEqual(exc.exception.status_code, 400)
        self.assertEqual(
            exc.exception.detail,
            "Only archived tenants can be deprovisioned",
        )

    def test_reset_tenant_portal_user_password_returns_schema(self) -> None:
        tenant = build_tenant_record_stub(
            tenant_name="Empresa Demo",
            tenant_slug="empresa-demo",
            status="active",
        )
        tenant.id = 5
        user = build_tenant_user_stub(
            user_id=12,
            full_name="Admin Tenant",
            email="admin@empresa-demo.local",
            role="admin",
            is_active=True,
        )

        class _TenantDbContext:
            def __enter__(self):
                return object()

            def __exit__(self, exc_type, exc, tb):
                return False

        with patch(
            "app.apps.platform_control.api.tenant_routes.tenant_service.tenant_repository.get_by_id",
            return_value=tenant,
        ), patch(
            "app.apps.platform_control.api.tenant_routes._open_platform_tenant_db",
            return_value=_TenantDbContext(),
        ), patch(
            "app.apps.platform_control.api.tenant_routes.tenant_data_service.reset_user_password_by_email",
            return_value=user,
        ), patch(
            "app.apps.platform_control.api.tenant_routes.auth_audit_service.log_event",
        ) as audit_mock:
            response = reset_tenant_portal_user_password(
                tenant_id=5,
                payload=TenantPortalUserPasswordResetRequest(
                    email="admin@empresa-demo.local",
                    new_password="NuevaClave123!",
                ),
                db=object(),
                _token=self._token_payload(),
            )

        self.assertTrue(response.success)
        self.assertEqual(response.tenant_id, 5)
        self.assertEqual(response.user_id, 12)
        self.assertEqual(response.email, "admin@empresa-demo.local")
        audit_mock.assert_called_once()

    def test_reset_tenant_portal_user_password_returns_404_when_missing_user(self) -> None:
        tenant = build_tenant_record_stub(
            tenant_name="Empresa Demo",
            tenant_slug="empresa-demo",
            status="active",
        )
        tenant.id = 5

        class _TenantDbContext:
            def __enter__(self):
                return object()

            def __exit__(self, exc_type, exc, tb):
                return False

        with patch(
            "app.apps.platform_control.api.tenant_routes.tenant_service.tenant_repository.get_by_id",
            return_value=tenant,
        ), patch(
            "app.apps.platform_control.api.tenant_routes._open_platform_tenant_db",
            return_value=_TenantDbContext(),
        ), patch(
            "app.apps.platform_control.api.tenant_routes.tenant_data_service.reset_user_password_by_email",
            side_effect=ValueError("Tenant user not found"),
        ):
            with self.assertRaises(HTTPException) as exc:
                reset_tenant_portal_user_password(
                    tenant_id=5,
                    payload=TenantPortalUserPasswordResetRequest(
                        email="admin@empresa-demo.local",
                        new_password="NuevaClave123!",
                    ),
                    db=object(),
                    _token=self._token_payload(),
                )

        self.assertEqual(exc.exception.status_code, 404)
        self.assertEqual(exc.exception.detail, "Tenant user not found")

    def test_list_tenant_portal_users_returns_schema(self) -> None:
        tenant = build_tenant_record_stub(
            tenant_name="Condominio Demo",
            tenant_slug="condominio-demo",
            status="active",
        )
        tenant.id = 2
        users = [
            build_tenant_user_stub(
                user_id=1,
                full_name="Tenant Manager",
                email="manager@condominio-demo.local",
                role="manager",
                is_active=True,
            ),
            build_tenant_user_stub(
                user_id=2,
                full_name="Tenant Operator",
                email="operator@condominio-demo.local",
                role="operator",
                is_active=True,
            ),
        ]

        class _TenantDbContext:
            def __enter__(self):
                return object()

            def __exit__(self, exc_type, exc, tb):
                return False

        with patch(
            "app.apps.platform_control.api.tenant_routes.tenant_service.tenant_repository.get_by_id",
            return_value=tenant,
        ), patch(
            "app.apps.platform_control.api.tenant_routes._open_platform_tenant_db",
            return_value=_TenantDbContext(),
        ), patch(
            "app.apps.platform_control.api.tenant_routes.tenant_data_service.list_users",
            return_value=users,
        ):
            response = list_tenant_portal_users(
                tenant_id=2,
                db=object(),
                _token=self._token_payload(),
            )

        self.assertIsInstance(response, TenantPortalUsersResponse)
        self.assertTrue(response.success)
        self.assertEqual(response.total, 2)
        self.assertEqual(response.data[0].email, "manager@condominio-demo.local")

    def test_list_tenant_portal_users_returns_400_when_tenant_db_is_not_configured(self) -> None:
        tenant = build_tenant_record_stub(
            tenant_name="Empresa Provisioning Demo",
            tenant_slug="empresa-provisioning-demo",
            status="archived",
        )
        tenant.id = 4
        tenant.db_name = None
        tenant.db_user = None
        tenant.db_host = None
        tenant.db_port = None

        with patch(
            "app.apps.platform_control.api.tenant_routes.tenant_service.tenant_repository.get_by_id",
            return_value=tenant,
        ), patch(
            "app.apps.platform_control.api.tenant_routes._open_platform_tenant_db",
            side_effect=ValueError("Tenant database configuration is incomplete"),
        ):
            with self.assertRaises(HTTPException) as exc:
                list_tenant_portal_users(
                    tenant_id=4,
                    db=object(),
                    _token=self._token_payload(),
                )

        self.assertEqual(exc.exception.status_code, 400)
        self.assertEqual(
            exc.exception.detail,
            "Tenant database configuration is incomplete",
        )

    def test_list_tenant_retirement_archives_returns_schema(self) -> None:
        archive = SimpleNamespace(
            id=7,
            original_tenant_id=4,
            tenant_slug="empresa-provisioning-demo",
            tenant_name="Empresa Provisioning Demo",
            tenant_type="empresa",
            plan_code="mensual",
            tenant_status="archived",
            billing_provider="stripe",
            billing_status="active",
            billing_events_count=4,
            policy_events_count=6,
            provisioning_jobs_count=2,
            deleted_by_email="admin@platform.local",
            tenant_created_at=datetime(2026, 3, 20, 12, 0, tzinfo=timezone.utc),
            deleted_at=datetime(2026, 3, 26, 15, 0, tzinfo=timezone.utc),
        )

        class FakeQuery:
            def filter(self, *args, **kwargs):
                return self

            def order_by(self, *args, **kwargs):
                return self

            def limit(self, _value):
                return self

            def all(self):
                return [archive]

        class FakeDb:
            def query(self, _model):
                return FakeQuery()

        response = list_tenant_retirement_archives(
            limit=25,
            search=None,
            db=FakeDb(),
            _token=self._token_payload(),
        )

        self.assertIsInstance(response, TenantRetirementArchiveListResponse)
        self.assertTrue(response.success)
        self.assertEqual(response.total, 1)
        self.assertEqual(response.data[0].tenant_slug, "empresa-provisioning-demo")

    def test_get_tenant_retirement_archive_returns_detail_schema(self) -> None:
        archive = SimpleNamespace(
            id=7,
            original_tenant_id=4,
            tenant_slug="empresa-provisioning-demo",
            tenant_name="Empresa Provisioning Demo",
            tenant_type="empresa",
            plan_code="mensual",
            tenant_status="archived",
            billing_provider="stripe",
            billing_status="active",
            billing_events_count=4,
            policy_events_count=6,
            provisioning_jobs_count=2,
            deleted_by_email="admin@platform.local",
            tenant_created_at=datetime(2026, 3, 20, 12, 0, tzinfo=timezone.utc),
            deleted_at=datetime(2026, 3, 26, 15, 0, tzinfo=timezone.utc),
            summary_json='{"access_policy":{"allowed":false},"retirement":{"recent_billing_events":[{"event_type":"invoice.paid"}]}}',
        )

        class FakeQuery:
            def filter(self, *args, **kwargs):
                return self

            def first(self):
                return archive

        class FakeDb:
            def query(self, _model):
                return FakeQuery()

        response = get_tenant_retirement_archive(
            archive_id=7,
            db=FakeDb(),
            _token=self._token_payload(),
        )

        self.assertIsInstance(response, TenantRetirementArchiveDetailResponse)
        self.assertTrue(response.success)
        self.assertEqual(response.data.id, 7)
        self.assertFalse(response.summary["access_policy"]["allowed"])
        self.assertEqual(
            response.summary["retirement"]["recent_billing_events"][0]["event_type"],
            "invoice.paid",
        )

    def test_create_tenant_logs_audit_event(self) -> None:
        tenant = build_tenant_record_stub(
            tenant_name="Empresa Central",
            tenant_slug="empresa-central",
            tenant_type="empresa",
        )
        tenant.id = 11

        with patch(
            "app.apps.platform_control.api.tenant_routes.tenant_service.create_tenant",
            return_value=tenant,
        ), patch(
            "app.apps.platform_control.api.tenant_routes.auth_audit_service.log_event",
        ) as audit_mock:
            response = create_tenant(
                payload=TenantCreateRequest(
                    name="Empresa Central",
                    slug="empresa-central",
                    tenant_type="empresa",
                    plan_code=None,
                ),
                db=object(),
                _token=self._token_payload(),
            )

        self.assertEqual(response.id, 11)
        audit_mock.assert_called_once()

    def test_delete_tenant_logs_audit_event(self) -> None:
        tenant = build_tenant_record_stub(
            tenant_name="Empresa Temporal",
            tenant_slug="empresa-temporal",
            status="archived",
        )
        tenant.id = 1

        with patch(
            "app.apps.platform_control.api.tenant_routes.tenant_service.delete_tenant",
            return_value=tenant,
        ), patch(
            "app.apps.platform_control.api.tenant_routes.auth_audit_service.log_event",
        ) as audit_mock:
            response = delete_tenant(
                tenant_id=1,
                db=object(),
                _token=self._token_payload(),
            )

        self.assertTrue(response.success)
        audit_mock.assert_called_once()

    def test_delete_tenant_returns_400_when_business_rule_blocks_deletion(self) -> None:
        with patch(
            "app.apps.platform_control.api.tenant_routes.tenant_service.delete_tenant",
            side_effect=ValueError(
                "Only archived tenants without provisioned database configuration can be deleted"
            ),
        ):
            with self.assertRaises(HTTPException) as exc:
                delete_tenant(
                    tenant_id=4,
                    db=object(),
                    _token=self._token_payload(),
                )

        self.assertEqual(exc.exception.status_code, 400)
        self.assertEqual(
            exc.exception.detail,
            "Only archived tenants without provisioned database configuration can be deleted",
        )

    def test_delete_tenant_returns_404_when_tenant_is_missing(self) -> None:
        with patch(
            "app.apps.platform_control.api.tenant_routes.tenant_service.delete_tenant",
            side_effect=ValueError("Tenant not found"),
        ):
            with self.assertRaises(HTTPException) as exc:
                delete_tenant(
                    tenant_id=404,
                    db=object(),
                    _token=self._token_payload(),
                )

        self.assertEqual(exc.exception.status_code, 404)
        self.assertEqual(exc.exception.detail, "Tenant not found")

    def test_get_tenant_policy_history_returns_schema(self) -> None:
        tenant = build_tenant_record_stub()
        tenant.id = 1
        recorded_at = datetime.now(timezone.utc)

        with patch(
            "app.apps.platform_control.api.tenant_routes."
            "tenant_service.tenant_repository.get_by_id",
            return_value=tenant,
        ), patch(
            "app.apps.platform_control.api.tenant_routes."
            "tenant_policy_event_service.list_recent_history",
            return_value=[
                {
                    "id": 1,
                    "tenant_id": 1,
                    "tenant_slug": "empresa-bootstrap",
                    "event_type": "billing",
                    "actor_user_id": 1,
                    "actor_email": "admin@platform.local",
                    "actor_role": "superadmin",
                    "previous_state": {"billing_status": "active"},
                    "new_state": {"billing_status": "past_due"},
                    "changed_fields": ["billing_status"],
                    "recorded_at": recorded_at,
                }
            ],
        ):
            response = get_tenant_policy_history(
                tenant_id=1,
                event_type="billing",
                limit=20,
                db=object(),
                _token=self._token_payload(),
            )

        self.assertTrue(response.success)
        self.assertEqual(response.total_events, 1)
        self.assertEqual(response.event_type, "billing")
        self.assertEqual(response.data[0].changed_fields, ["billing_status"])

    def test_list_provisioning_jobs_returns_serialized_jobs(self) -> None:
        jobs = [
            SimpleNamespace(
                id=1,
                tenant_id=1,
                job_type="create_tenant_database",
                status="pending",
                error_message=None,
            )
        ]

        with patch(
            "app.apps.platform_control.api.provisioning_job_routes."
            "provisioning_job_service.list_jobs",
            return_value=jobs,
        ):
            response = list_provisioning_jobs(
                db=object(),
                _token=self._token_payload(),
            )

        self.assertEqual(len(response), 1)
        self.assertEqual(response[0].job_type, "create_tenant_database")

    def test_run_provisioning_job_returns_serialized_job(self) -> None:
        job = SimpleNamespace(
            id=1,
            tenant_id=1,
            job_type="create_tenant_database",
            status="completed",
            error_message=None,
        )

        with patch(
            "app.apps.platform_control.api.provisioning_job_routes."
            "provisioning_service.run_job",
            return_value=job,
        ):
            response = run_provisioning_job(
                job_id=1,
                db=object(),
                _token=self._token_payload(),
            )

        self.assertEqual(response.status, "completed")

    def test_requeue_provisioning_job_returns_serialized_job(self) -> None:
        job = SimpleNamespace(
            id=3,
            tenant_id=1,
            job_type="create_tenant_database",
            status="pending",
            attempts=0,
            max_attempts=3,
            error_message=None,
            next_retry_at=None,
        )

        with patch(
            "app.apps.platform_control.api.provisioning_job_routes."
            "provisioning_service.requeue_failed_job",
            return_value=job,
        ):
            response = requeue_provisioning_job(
                job_id=3,
                reset_attempts=False,
                delay_seconds=90,
                db=object(),
                _token=self._token_payload(),
            )

        self.assertEqual(response.id, 3)
        self.assertEqual(response.status, "pending")

    def test_requeue_provisioning_job_forwards_options(self) -> None:
        job = SimpleNamespace(
            id=3,
            tenant_id=1,
            job_type="create_tenant_database",
            status="pending",
            attempts=1,
            max_attempts=3,
            error_message=None,
            next_retry_at=None,
        )

        db = object()
        with patch(
            "app.apps.platform_control.api.provisioning_job_routes."
            "provisioning_service.requeue_failed_job",
            return_value=job,
        ) as mocked_requeue:
            requeue_provisioning_job(
                job_id=3,
                reset_attempts=False,
                delay_seconds=90,
                db=db,
                _token=self._token_payload(),
            )

        mocked_requeue.assert_called_once_with(
            db,
            3,
            reset_attempts=False,
            delay_seconds=90,
        )

    def test_requeue_provisioning_broker_dead_letter_jobs_returns_rows(self) -> None:
        jobs = [
            SimpleNamespace(
                id=3,
                tenant_id=1,
                job_type="create_tenant_database",
                status="pending",
                attempts=0,
                max_attempts=3,
                error_message=None,
                next_retry_at=None,
            )
        ]

        payload = ProvisioningBrokerRequeueRequest(
            limit=10,
            job_type="create_tenant_database",
            tenant_slug="empresa-bootstrap",
            error_code="postgres_role_bootstrap_failed",
            error_contains="postgres",
            reset_attempts=False,
            delay_seconds=120,
        )

        db = object()
        with patch(
            "app.apps.platform_control.api.provisioning_job_routes."
            "provisioning_service.requeue_failed_jobs",
            return_value=jobs,
        ) as mocked_requeue:
            response = requeue_provisioning_broker_dead_letter_jobs(
                payload=payload,
                db=db,
                _token=self._token_payload(),
            )

        self.assertTrue(response.success)
        self.assertEqual(response.total_jobs, 1)
        self.assertEqual(response.data[0].id, 3)
        mocked_requeue.assert_called_once_with(
            db,
            limit=10,
            job_type="create_tenant_database",
            tenant_slug="empresa-bootstrap",
            error_code="postgres_role_bootstrap_failed",
            error_contains="postgres",
            reset_attempts=False,
            delay_seconds=120,
        )

    def test_provisioning_broker_dead_letter_jobs_accepts_tenant_slug_filter(self) -> None:
        jobs = [
            {
                "job": SimpleNamespace(
                    id=9,
                    tenant_id=1,
                    job_type="create_tenant_database",
                    status="failed",
                    attempts=3,
                    max_attempts=3,
                    error_code="tenant_schema_bootstrap_failed",
                    error_message="boom",
                ),
                "recorded_at": datetime.now(timezone.utc),
                "tenant_slug": "empresa-bootstrap",
            }
        ]

        db = object()
        with patch(
            "app.apps.platform_control.api.provisioning_job_routes."
            "provisioning_dispatch_service.list_dead_letter_jobs",
            return_value=jobs,
        ) as mocked_list:
            response = provisioning_broker_dead_letter_jobs(
                limit=20,
                job_type="create_tenant_database",
                tenant_slug="empresa-bootstrap",
                error_code="tenant_schema_bootstrap_failed",
                error_contains="boom",
                db=db,
                _token=self._token_payload(),
            )

        self.assertEqual(response.total_jobs, 1)
        mocked_list.assert_called_once_with(
            db,
            limit=20,
            job_type="create_tenant_database",
            tenant_slug="empresa-bootstrap",
            error_code="tenant_schema_bootstrap_failed",
            error_contains="boom",
        )

    def test_provisioning_job_metrics_returns_summary(self) -> None:
        summary = [
            {
                "tenant_id": 1,
                "tenant_slug": "empresa-bootstrap",
                "total_jobs": 4,
                "pending_jobs": 1,
                "retry_pending_jobs": 1,
                "running_jobs": 0,
                "completed_jobs": 1,
                "failed_jobs": 1,
                "max_attempts_seen": 2,
            }
        ]

        with patch(
            "app.apps.platform_control.api.provisioning_job_routes."
            "provisioning_job_service.summarize_jobs_by_tenant",
            return_value=summary,
        ):
            response = provisioning_job_metrics(
                db=object(),
                _token=self._token_payload(),
            )

        self.assertTrue(response.success)
        self.assertEqual(response.total_tenants, 1)
        self.assertEqual(response.data[0].tenant_slug, "empresa-bootstrap")

    def test_provisioning_job_metrics_by_job_type_returns_summary(self) -> None:
        summary = [
            {
                "tenant_id": 1,
                "tenant_slug": "empresa-bootstrap",
                "job_type": "create_tenant_database",
                "total_jobs": 4,
                "pending_jobs": 1,
                "retry_pending_jobs": 1,
                "running_jobs": 0,
                "completed_jobs": 1,
                "failed_jobs": 1,
                "max_attempts_seen": 2,
            }
        ]

        with patch(
            "app.apps.platform_control.api.provisioning_job_routes."
            "provisioning_job_service.summarize_jobs_by_tenant_and_job_type",
            return_value=summary,
        ):
            response = provisioning_job_metrics_by_job_type(
                db=object(),
                _token=self._token_payload(),
            )

        self.assertTrue(response.success)
        self.assertEqual(response.total_rows, 1)
        self.assertEqual(response.data[0].job_type, "create_tenant_database")

    def test_provisioning_job_metrics_by_error_code_returns_summary(self) -> None:
        summary = [
            {
                "tenant_id": 1,
                "tenant_slug": "empresa-bootstrap",
                "error_code": "postgres_database_bootstrap_failed",
                "total_jobs": 2,
                "pending_jobs": 0,
                "retry_pending_jobs": 1,
                "running_jobs": 0,
                "completed_jobs": 0,
                "failed_jobs": 1,
                "max_attempts_seen": 3,
            }
        ]

        with patch(
            "app.apps.platform_control.api.provisioning_job_routes."
            "provisioning_job_service.summarize_jobs_by_tenant_and_error_code",
            return_value=summary,
        ):
            response = provisioning_job_metrics_by_error_code(
                db=object(),
                _token=self._token_payload(),
            )

        self.assertTrue(response.success)
        self.assertEqual(response.total_rows, 1)
        self.assertEqual(
            response.data[0].error_code,
            "postgres_database_bootstrap_failed",
        )

    def test_provisioning_job_metrics_history_returns_snapshots(self) -> None:
        snapshot = SimpleNamespace(
            id=10,
            capture_key="capture-1",
            tenant_id=1,
            tenant_slug="empresa-bootstrap",
            total_jobs=4,
            pending_jobs=1,
            retry_pending_jobs=1,
            running_jobs=0,
            completed_jobs=1,
            failed_jobs=1,
            max_attempts_seen=2,
            captured_at=datetime.now(timezone.utc),
        )

        with patch(
            "app.apps.platform_control.api.provisioning_job_routes."
            "provisioning_metrics_service.list_recent_snapshots",
            return_value=[snapshot],
        ):
            response = provisioning_job_metrics_history(
                db=object(),
                _token=self._token_payload(),
            )

        self.assertTrue(response.success)
        self.assertEqual(response.total_snapshots, 1)
        self.assertEqual(response.data[0].capture_key, "capture-1")

    def test_provisioning_job_cycle_history_returns_traces(self) -> None:
        trace = SimpleNamespace(
            id=5,
            capture_key="capture-1",
            worker_profile="default",
            selection_strategy="composite_score",
            eligible_jobs=5,
            aged_eligible_jobs=2,
            queued_jobs=4,
            processed_count=3,
            failed_count=1,
            stopped_due_to_failure_limit=False,
            duration_ms=220,
            priority_order_json='["create_tenant_database"]',
            tenant_type_priority_order_json='["condos","empresa"]',
            top_eligible_job_scores_json='[{"job_id":1,"total_score":1100100}]',
            captured_at=datetime.now(timezone.utc),
        )

        with patch(
            "app.apps.platform_control.api.provisioning_job_routes."
            "provisioning_worker_cycle_trace_service.list_recent_traces",
            return_value=[trace],
        ):
            response = provisioning_job_cycle_history(
                db=object(),
                _token=self._token_payload(),
            )

        self.assertTrue(response.success)
        self.assertEqual(response.total_traces, 1)
        self.assertEqual(response.data[0].selection_strategy, "composite_score")

    def test_provisioning_job_alerts_returns_active_alerts(self) -> None:
        alert = {
            "alert_code": "tenant_failed_jobs_threshold_exceeded",
            "severity": "error",
            "source_type": "tenant_snapshot",
            "error_code": "postgres_database_bootstrap_failed",
            "tenant_slug": "empresa-bootstrap",
            "worker_profile": None,
            "capture_key": "capture-1",
            "message": "alerta de prueba",
            "observed_value": 2,
            "threshold_value": 1,
            "captured_at": datetime.now(timezone.utc),
        }

        with patch(
            "app.apps.platform_control.api.provisioning_job_routes."
            "provisioning_alert_service.list_active_alerts",
            return_value=[alert],
        ):
            response = provisioning_job_alerts(
                db=object(),
                _token=self._token_payload(),
            )

        self.assertTrue(response.success)
        self.assertEqual(response.total_alerts, 1)
        self.assertEqual(
            response.data[0].alert_code,
            "tenant_failed_jobs_threshold_exceeded",
        )
        self.assertEqual(
            response.data[0].error_code,
            "postgres_database_bootstrap_failed",
        )

    def test_provisioning_broker_dead_letter_jobs_returns_rows(self) -> None:
        dead_letter_rows = [
            {
                "job": SimpleNamespace(
                    id=9,
                    tenant_id=1,
                    job_type="create_tenant_database",
                    status="failed",
                    attempts=3,
                    max_attempts=3,
                    error_message="postgres unavailable",
                ),
                "recorded_at": datetime(2026, 3, 18, 15, 0, tzinfo=timezone.utc),
            }
        ]

        with patch(
            "app.apps.platform_control.api.provisioning_job_routes."
            "provisioning_dispatch_service.list_dead_letter_jobs",
            return_value=dead_letter_rows,
        ):
            response = provisioning_broker_dead_letter_jobs(
                db=object(),
                _token=self._token_payload(),
            )

        self.assertTrue(response.success)
        self.assertEqual(response.total_jobs, 1)
        self.assertEqual(response.data[0].job_id, 9)

    def test_provisioning_job_alert_history_returns_persisted_alerts(self) -> None:
        alert = {
            "id": 1,
            "alert_code": "tenant_failed_jobs_threshold_exceeded",
            "severity": "error",
            "source_type": "tenant_snapshot",
            "error_code": "postgres_database_bootstrap_failed",
            "tenant_slug": "empresa-bootstrap",
            "worker_profile": None,
            "capture_key": "capture-1",
            "message": "alerta de prueba",
            "observed_value": 2,
            "threshold_value": 1,
            "source_captured_at": datetime.now(timezone.utc),
            "recorded_at": datetime.now(timezone.utc),
        }

        with patch(
            "app.apps.platform_control.api.provisioning_job_routes."
            "provisioning_alert_service.list_recent_alert_history",
            return_value=[alert],
        ):
            response = provisioning_job_alert_history(
                db=object(),
                _token=self._token_payload(),
            )

        self.assertTrue(response.success)
        self.assertEqual(response.total_alerts, 1)
        self.assertEqual(response.data[0].observed_value, 2)
        self.assertEqual(
            response.data[0].error_code,
            "postgres_database_bootstrap_failed",
        )


if __name__ == "__main__":
    unittest.main()
