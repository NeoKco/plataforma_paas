import os
import asyncio
import unittest
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import patch

from fastapi import HTTPException

from app.tests.fixtures import (  # noqa: E402
    build_tenant_context,
    build_tenant_record_stub,
    build_tenant_request,
    build_tenant_user_stub,
    set_test_environment,
)

set_test_environment()

from app.apps.tenant_modules.core.api.tenant_routes import (  # noqa: E402
    tenant_create_user,
    tenant_info,
    tenant_me,
    tenant_me_db,
    tenant_module_usage,
    tenant_update_user,
    tenant_update_user_status,
    tenant_user_detail,
    tenant_users,
)
from app.apps.tenant_modules.core.api.auth_routes import (  # noqa: E402
    tenant_login,
    tenant_logout,
    tenant_refresh_login,
)
from app.apps.tenant_modules.core.schemas import (  # noqa: E402
    TenantLoginRequest,
    TenantRefreshTokenRequest,
    TenantUserCreateRequest,
    TenantUserStatusUpdateRequest,
    TenantUserUpdateRequest,
)
from app.apps.tenant_modules.core.services.tenant_data_service import (  # noqa: E402
    TenantDataService,
    TenantUserLimitExceededError,
)
from app.common.auth.dependencies import (  # noqa: E402
    get_current_tenant_context,
    require_tenant_permission,
    require_tenant_admin,
)
from app.common.db.session_manager import get_tenant_db  # noqa: E402
from app.common.middleware.tenant_context_middleware import (  # noqa: E402
    AuthContextMiddleware,
)
from app.common.policies.tenant_plan_policy_service import (  # noqa: E402
    TenantPlanPolicyService,
)
from app.common.policies.tenant_billing_grace_policy_service import (  # noqa: E402
    TenantBillingGracePolicyService,
)
from app.common.policies.tenant_rate_limit_service import (  # noqa: E402
    TenantRateLimitService,
)
from app.apps.platform_control.services.tenant_service import (  # noqa: E402
    TenantService,
)


class FakeSession:
    def __init__(self) -> None:
        self.closed = False

    def close(self) -> None:
        self.closed = True


class TenantAuthDependenciesTestCase(unittest.TestCase):
    def _request(
        self,
        role: str = "admin",
        token_scope: str = "tenant",
        tenant_slug: str = "empresa-bootstrap",
    ):
        return build_tenant_request(
            role=role,
            token_scope=token_scope,
            tenant_slug=tenant_slug,
        )

    def test_get_current_tenant_context_returns_expected_data(self) -> None:
        context = get_current_tenant_context(self._request())

        self.assertEqual(context["tenant_slug"], "empresa-bootstrap")
        self.assertEqual(context["role"], "admin")
        self.assertFalse(context["maintenance_mode"])

    def test_require_tenant_admin_rejects_non_admin(self) -> None:
        with self.assertRaises(HTTPException) as exc:
            require_tenant_admin(self._request(role="manager"))

        self.assertEqual(exc.exception.status_code, 403)

    def test_get_current_tenant_context_preserves_maintenance_mode(self) -> None:
        context = get_current_tenant_context(
            self._request(tenant_slug="empresa-bootstrap", role="admin")
        )

        self.assertIn("maintenance_mode", context)

    def test_require_tenant_permission_accepts_role_with_permission(self) -> None:
        checker = require_tenant_permission("tenant.users.read")

        context = checker(self._request(role="manager"))

        self.assertIn("tenant.users.read", context["permissions"])

    def test_require_tenant_permission_rejects_role_without_permission(self) -> None:
        checker = require_tenant_permission("tenant.users.create")

        with self.assertRaises(HTTPException) as exc:
            checker(self._request(role="manager"))

        self.assertEqual(exc.exception.status_code, 403)


class TenantSessionManagerTestCase(unittest.TestCase):
    def test_get_tenant_db_returns_tenant_session(self) -> None:
        request = SimpleNamespace(
            state=SimpleNamespace(
                tenant_slug="empresa-bootstrap",
                token_scope="tenant",
            )
        )
        fake_control_db = FakeSession()
        fake_tenant_db = FakeSession()
        fake_tenant = SimpleNamespace(
            slug="empresa-bootstrap",
            status="active",
            status_reason=None,
        )
        fake_service = SimpleNamespace(
            get_tenant_by_slug=lambda db, tenant_slug: fake_tenant,
            get_tenant_session=lambda tenant: (lambda: fake_tenant_db),
        )

        with patch(
            "app.common.db.session_manager.ControlSessionLocal",
            return_value=fake_control_db,
        ), patch(
            "app.common.db.session_manager.TenantConnectionService",
            return_value=fake_service,
        ):
            generator = get_tenant_db(request)
            tenant_db = next(generator)

            self.assertIs(tenant_db, fake_tenant_db)

            generator.close()

        self.assertTrue(fake_control_db.closed)
        self.assertTrue(fake_tenant_db.closed)

    def test_get_tenant_db_rejects_suspended_tenant(self) -> None:
        request = SimpleNamespace(
            state=SimpleNamespace(
                tenant_slug="empresa-bootstrap",
                token_scope="tenant",
            )
        )
        fake_control_db = FakeSession()
        suspended_tenant = build_tenant_record_stub(
            status="suspended",
            status_reason="billing overdue",
        )
        fake_service = SimpleNamespace(
            get_tenant_by_slug=lambda db, tenant_slug: suspended_tenant,
        )

        with patch(
            "app.common.db.session_manager.ControlSessionLocal",
            return_value=fake_control_db,
        ), patch(
            "app.common.db.session_manager.TenantConnectionService",
            return_value=fake_service,
        ):
            with self.assertRaises(HTTPException) as exc:
                next(get_tenant_db(request))

        self.assertEqual(exc.exception.status_code, 423)
        self.assertTrue(fake_control_db.closed)

    def test_get_tenant_db_rejects_invalid_scope(self) -> None:
        request = SimpleNamespace(
            state=SimpleNamespace(
                tenant_slug="empresa-bootstrap",
                token_scope="platform",
            )
        )

        with self.assertRaises(HTTPException) as exc:
            next(get_tenant_db(request))

        self.assertEqual(exc.exception.status_code, 403)


class TenantMiddlewareMaintenanceTestCase(unittest.TestCase):
    def _middleware(self) -> AuthContextMiddleware:
        middleware = object.__new__(AuthContextMiddleware)
        middleware.tenant_repository = SimpleNamespace()
        middleware.tenant_plan_policy_service = SimpleNamespace(
            get_policy=lambda plan_code: None
        )
        middleware.tenant_billing_grace_policy_service = SimpleNamespace(
            get_policy=lambda: None
        )
        middleware.tenant_rate_limit_service = SimpleNamespace(
            consume=lambda tenant_slug, operation_type, limit: SimpleNamespace(
                allowed=True,
                limit=limit,
                remaining=max(limit - 1, 0) if limit > 0 else 0,
                reset_at=9999999999,
            )
        )
        middleware.tenant_service = SimpleNamespace(
            get_tenant_status_error=lambda tenant: None,
            get_tenant_access_policy=lambda tenant: SimpleNamespace(
                allowed=True,
                status_code=None,
                detail=None,
                blocking_source=None,
                billing_in_grace=False,
            ),
            is_tenant_under_maintenance=lambda tenant, now=None: bool(
                getattr(tenant, "maintenance_mode", False)
            )
            or (
                getattr(tenant, "maintenance_starts_at", None) is not None
                and getattr(tenant, "maintenance_ends_at", None) is not None
            ),
            get_tenant_maintenance_scopes=lambda tenant: (
                [scope for scope in tenant.maintenance_scopes.split(",")]
                if getattr(tenant, "maintenance_scopes", None)
                else ["all"]
            ),
            get_tenant_module_limits=lambda tenant: TenantService().get_tenant_module_limits(tenant),
            get_effective_module_limits=None,
            get_effective_module_limit_sources=None,
        )
        return middleware

    def test_dispatch_allows_platform_root_recovery_status_without_token(self) -> None:
        request = SimpleNamespace(
            method="GET",
            url=SimpleNamespace(path="/platform/auth/root-recovery/status"),
        )
        middleware = self._middleware()
        calls: list[str] = []

        async def call_next(req):
            calls.append(req.url.path)
            return "ok"

        response = asyncio.run(middleware.dispatch(request, call_next))

        self.assertEqual(response, "ok")
        self.assertEqual(calls, ["/platform/auth/root-recovery/status"])

    def test_apply_tenant_runtime_state_blocks_write_when_maintenance_enabled(self) -> None:
        request = SimpleNamespace(
            method="POST",
            url=SimpleNamespace(path="/tenant/users"),
            state=SimpleNamespace(tenant_slug="empresa-bootstrap"),
        )
        middleware = self._middleware()
        middleware._load_tenant = lambda tenant_slug: build_tenant_record_stub(  # type: ignore[attr-defined]
            maintenance_mode=True,
        )

        with self.assertRaises(HTTPException) as exc:
            middleware._apply_tenant_runtime_state(request)  # type: ignore[arg-type]

        self.assertEqual(exc.exception.status_code, 503)

    def test_apply_tenant_runtime_state_blocks_suspended_tenant(self) -> None:
        request = SimpleNamespace(
            method="GET",
            url=SimpleNamespace(path="/tenant/info"),
            state=SimpleNamespace(tenant_slug="empresa-bootstrap"),
        )
        middleware = self._middleware()
        middleware._load_tenant = lambda tenant_slug: build_tenant_record_stub(  # type: ignore[attr-defined]
            status="suspended",
            status_reason="billing overdue",
        )
        middleware.tenant_service.get_tenant_access_policy = lambda tenant: (  # type: ignore[attr-defined]
            SimpleNamespace(
                allowed=False,
                status_code=423,
                detail="Tenant suspended",
                blocking_source="status",
                billing_in_grace=False,
            )
        )

        with self.assertRaises(HTTPException) as exc:
            middleware._apply_tenant_runtime_state(request)  # type: ignore[arg-type]

        self.assertEqual(exc.exception.status_code, 423)

    def test_apply_tenant_runtime_state_blocks_billing_past_due_without_grace(self) -> None:
        request = SimpleNamespace(
            method="GET",
            url=SimpleNamespace(path="/tenant/info"),
            state=SimpleNamespace(tenant_slug="empresa-bootstrap"),
        )
        middleware = self._middleware()
        middleware._load_tenant = lambda tenant_slug: build_tenant_record_stub(  # type: ignore[attr-defined]
            status="active",
            billing_status="past_due",
            billing_status_reason="invoice overdue",
            billing_grace_until=datetime.now(timezone.utc) - timedelta(days=1),
        )
        middleware.tenant_service.get_tenant_access_policy = lambda tenant: (  # type: ignore[attr-defined]
            SimpleNamespace(
                allowed=False,
                status_code=423,
                detail="invoice overdue",
                blocking_source="billing",
                billing_in_grace=False,
            )
        )

        with self.assertRaises(HTTPException) as exc:
            middleware._apply_tenant_runtime_state(request)  # type: ignore[arg-type]

        self.assertEqual(exc.exception.status_code, 423)

    def test_apply_tenant_api_rate_limit_blocks_when_limit_is_exceeded(self) -> None:
        request = SimpleNamespace(
            method="GET",
            url=SimpleNamespace(path="/tenant/info"),
            state=SimpleNamespace(tenant_slug="empresa-bootstrap"),
        )
        middleware = self._middleware()
        middleware.tenant_rate_limit_service = SimpleNamespace(
            consume=lambda tenant_slug, operation_type, limit: SimpleNamespace(
                allowed=False,
                limit=2,
                remaining=0,
                reset_at=123456,
            )
        )

        with patch(
            "app.common.middleware.tenant_context_middleware.settings.TENANT_API_READ_REQUESTS_PER_MINUTE",
            2,
        ):
            with self.assertRaises(HTTPException) as exc:
                middleware._apply_tenant_api_rate_limit(request)  # type: ignore[arg-type]

        self.assertEqual(exc.exception.status_code, 429)

    def test_apply_tenant_api_rate_limit_uses_separate_write_limit(self) -> None:
        request = SimpleNamespace(
            method="POST",
            url=SimpleNamespace(path="/tenant/users"),
            state=SimpleNamespace(tenant_slug="empresa-bootstrap"),
        )
        calls: list[tuple[str, str, int]] = []
        middleware = self._middleware()
        middleware.tenant_rate_limit_service = SimpleNamespace(
            consume=lambda tenant_slug, operation_type, limit: (
                calls.append((tenant_slug, operation_type, limit))
                or SimpleNamespace(
                    allowed=True,
                    limit=limit,
                    remaining=max(limit - 1, 0),
                    reset_at=123456,
                )
            )
        )

        with patch(
            "app.common.middleware.tenant_context_middleware.settings.TENANT_API_WRITE_REQUESTS_PER_MINUTE",
            7,
        ):
            middleware._apply_tenant_api_rate_limit(request)  # type: ignore[arg-type]

        self.assertEqual(calls, [("empresa-bootstrap", "write", 7)])
        self.assertEqual(request.state.tenant_rate_limit_limit, 7)
        self.assertEqual(request.state.tenant_rate_limit_operation, "write")

    def test_apply_tenant_api_rate_limit_prefers_tenant_override(self) -> None:
        request = SimpleNamespace(
            method="GET",
            url=SimpleNamespace(path="/tenant/info"),
            state=SimpleNamespace(
                tenant_slug="empresa-bootstrap",
                tenant_api_read_requests_per_minute=3,
            ),
        )
        calls: list[tuple[str, str, int]] = []
        middleware = self._middleware()
        middleware.tenant_rate_limit_service = SimpleNamespace(
            consume=lambda tenant_slug, operation_type, limit: (
                calls.append((tenant_slug, operation_type, limit))
                or SimpleNamespace(
                    allowed=True,
                    limit=limit,
                    remaining=max(limit - 1, 0),
                    reset_at=123456,
                )
            )
        )

        with patch(
            "app.common.middleware.tenant_context_middleware.settings.TENANT_API_READ_REQUESTS_PER_MINUTE",
            9,
        ):
            middleware._apply_tenant_api_rate_limit(request)  # type: ignore[arg-type]

        self.assertEqual(calls, [("empresa-bootstrap", "read", 3)])
        self.assertEqual(request.state.tenant_rate_limit_limit, 3)

    def test_apply_tenant_api_rate_limit_uses_plan_limit_when_no_override(self) -> None:
        request = SimpleNamespace(
            method="GET",
            url=SimpleNamespace(path="/tenant/info"),
            state=SimpleNamespace(
                tenant_slug="empresa-bootstrap",
                tenant_api_read_requests_per_minute=None,
                tenant_plan_api_read_requests_per_minute=11,
            ),
        )
        calls: list[tuple[str, str, int]] = []
        middleware = self._middleware()
        middleware.tenant_rate_limit_service = SimpleNamespace(
            consume=lambda tenant_slug, operation_type, limit: (
                calls.append((tenant_slug, operation_type, limit))
                or SimpleNamespace(
                    allowed=True,
                    limit=limit,
                    remaining=max(limit - 1, 0),
                    reset_at=123456,
                )
            )
        )

        with patch(
            "app.common.middleware.tenant_context_middleware.settings.TENANT_API_READ_REQUESTS_PER_MINUTE",
            9,
        ):
            middleware._apply_tenant_api_rate_limit(request)  # type: ignore[arg-type]

        self.assertEqual(calls, [("empresa-bootstrap", "read", 11)])

    def test_apply_tenant_api_rate_limit_prefers_billing_grace_limit(self) -> None:
        request = SimpleNamespace(
            method="GET",
            url=SimpleNamespace(path="/tenant/info"),
            state=SimpleNamespace(
                tenant_slug="empresa-bootstrap",
                tenant_billing_grace_api_read_requests_per_minute=4,
                tenant_api_read_requests_per_minute=8,
                tenant_plan_api_read_requests_per_minute=15,
            ),
        )
        calls: list[tuple[str, str, int]] = []
        middleware = self._middleware()
        middleware.tenant_rate_limit_service = SimpleNamespace(
            consume=lambda tenant_slug, operation_type, limit: (
                calls.append((tenant_slug, operation_type, limit))
                or SimpleNamespace(
                    allowed=True,
                    limit=limit,
                    remaining=max(limit - 1, 0),
                    reset_at=123456,
                )
            )
        )

        with patch(
            "app.common.middleware.tenant_context_middleware.settings.TENANT_API_READ_REQUESTS_PER_MINUTE",
            30,
        ):
            middleware._apply_tenant_api_rate_limit(request)  # type: ignore[arg-type]

        self.assertEqual(calls, [("empresa-bootstrap", "read", 4)])
        self.assertEqual(request.state.tenant_rate_limit_limit, 4)


class TenantRateLimitServiceTestCase(unittest.TestCase):
    def _middleware(self) -> AuthContextMiddleware:
        middleware = object.__new__(AuthContextMiddleware)
        middleware.tenant_repository = SimpleNamespace()
        middleware.tenant_plan_policy_service = SimpleNamespace(
            get_policy=lambda plan_code: None
        )
        middleware.tenant_billing_grace_policy_service = SimpleNamespace(
            get_policy=lambda: None
        )
        middleware.tenant_rate_limit_service = SimpleNamespace(
            consume=lambda tenant_slug, operation_type, limit: SimpleNamespace(
                allowed=True,
                limit=limit,
                remaining=max(limit - 1, 0) if limit > 0 else 0,
                reset_at=9999999999,
            )
        )
        middleware.tenant_service = SimpleNamespace(
            get_tenant_status_error=lambda tenant: None,
            get_tenant_access_policy=lambda tenant: SimpleNamespace(
                allowed=True,
                status_code=None,
                detail=None,
                blocking_source=None,
                billing_in_grace=False,
            ),
            is_tenant_under_maintenance=lambda tenant, now=None: bool(
                getattr(tenant, "maintenance_mode", False)
            )
            or (
                getattr(tenant, "maintenance_starts_at", None) is not None
                and getattr(tenant, "maintenance_ends_at", None) is not None
            ),
            get_tenant_maintenance_scopes=lambda tenant: (
                [scope for scope in tenant.maintenance_scopes.split(",")]
                if getattr(tenant, "maintenance_scopes", None)
                else ["all"]
            ),
            get_tenant_module_limits=lambda tenant: TenantService().get_tenant_module_limits(tenant),
            get_effective_module_limits=None,
            get_effective_module_limit_sources=None,
        )
        return middleware

    def test_consume_blocks_after_limit_in_same_window(self) -> None:
        service = TenantRateLimitService(
            window_seconds=60,
            time_func=lambda: 120,
        )

        first = service.consume(
            tenant_slug="empresa-bootstrap",
            operation_type="read",
            limit=2,
        )
        second = service.consume(
            tenant_slug="empresa-bootstrap",
            operation_type="read",
            limit=2,
        )
        third = service.consume(
            tenant_slug="empresa-bootstrap",
            operation_type="read",
            limit=2,
        )

        self.assertTrue(first.allowed)
        self.assertTrue(second.allowed)
        self.assertFalse(third.allowed)

    def test_consume_uses_independent_buckets_by_operation_type(self) -> None:
        service = TenantRateLimitService(
            window_seconds=60,
            time_func=lambda: 120,
        )

        read_result = service.consume(
            tenant_slug="empresa-bootstrap",
            operation_type="read",
            limit=1,
        )
        write_result = service.consume(
            tenant_slug="empresa-bootstrap",
            operation_type="write",
            limit=1,
        )

        self.assertTrue(read_result.allowed)
        self.assertTrue(write_result.allowed)

    def test_consume_blocks_after_limit_with_redis_backend(self) -> None:
        class FakeRedis:
            def __init__(self):
                self.values: dict[str, int] = {}
                self.expires: dict[str, int] = {}

            def incr(self, key: str) -> int:
                self.values[key] = self.values.get(key, 0) + 1
                return self.values[key]

            def expireat(self, key: str, timestamp: int) -> None:
                self.expires[key] = timestamp

        fake_redis = FakeRedis()
        service = TenantRateLimitService(
            window_seconds=60,
            time_func=lambda: 120,
            backend_name="redis",
            redis_url="redis://fake",
            redis_client_service=SimpleNamespace(
                get_client=lambda url=None: fake_redis
            ),
        )

        first = service.consume(
            tenant_slug="empresa-bootstrap",
            operation_type="read",
            limit=2,
        )
        second = service.consume(
            tenant_slug="empresa-bootstrap",
            operation_type="read",
            limit=2,
        )
        third = service.consume(
            tenant_slug="empresa-bootstrap",
            operation_type="read",
            limit=2,
        )

        self.assertTrue(first.allowed)
        self.assertTrue(second.allowed)
        self.assertFalse(third.allowed)

    def test_apply_tenant_api_rate_limit_returns_503_when_backend_fails(self) -> None:
        request = SimpleNamespace(
            method="GET",
            url=SimpleNamespace(path="/tenant/info"),
            state=SimpleNamespace(tenant_slug="empresa-bootstrap"),
        )
        middleware = self._middleware()
        middleware.tenant_rate_limit_service = SimpleNamespace(
            consume=lambda tenant_slug, operation_type, limit: (_ for _ in ()).throw(
                RuntimeError("redis unavailable")
            )
        )

        with patch(
            "app.common.middleware.tenant_context_middleware.settings.TENANT_API_READ_REQUESTS_PER_MINUTE",
            2,
        ):
            with self.assertRaises(HTTPException) as exc:
                middleware._apply_tenant_api_rate_limit(request)  # type: ignore[arg-type]

        self.assertEqual(exc.exception.status_code, 503)

    def test_apply_tenant_runtime_state_allows_get_when_maintenance_enabled(self) -> None:
        request = SimpleNamespace(
            method="GET",
            url=SimpleNamespace(path="/tenant/info"),
            state=SimpleNamespace(tenant_slug="empresa-bootstrap"),
        )
        middleware = self._middleware()
        middleware._load_tenant = lambda tenant_slug: build_tenant_record_stub(  # type: ignore[attr-defined]
            maintenance_mode=True,
        )

        middleware._apply_tenant_runtime_state(request)  # type: ignore[arg-type]

        self.assertTrue(request.state.tenant_maintenance_mode)

    def test_apply_tenant_runtime_state_allows_unaffected_module(self) -> None:
        request = SimpleNamespace(
            method="POST",
            url=SimpleNamespace(path="/tenant/users"),
            state=SimpleNamespace(tenant_slug="empresa-bootstrap"),
        )
        middleware = self._middleware()
        middleware._load_tenant = lambda tenant_slug: build_tenant_record_stub(  # type: ignore[attr-defined]
            maintenance_mode=True,
            maintenance_scopes="finance",
            maintenance_access_mode="full_block",
        )

        middleware._apply_tenant_runtime_state(request)  # type: ignore[arg-type]

        self.assertEqual(request.state.tenant_maintenance_scopes, ["finance"])

    def test_apply_tenant_runtime_state_exposes_rate_limit_overrides(self) -> None:
        request = SimpleNamespace(
            method="GET",
            url=SimpleNamespace(path="/tenant/info"),
            state=SimpleNamespace(tenant_slug="empresa-bootstrap"),
        )
        middleware = self._middleware()
        middleware._load_tenant = lambda tenant_slug: build_tenant_record_stub(  # type: ignore[attr-defined]
            api_read_requests_per_minute=20,
            api_write_requests_per_minute=8,
        )

        middleware._apply_tenant_runtime_state(request)  # type: ignore[arg-type]

        self.assertEqual(request.state.tenant_api_read_requests_per_minute, 20)
        self.assertEqual(request.state.tenant_api_write_requests_per_minute, 8)

    def test_apply_tenant_runtime_state_exposes_plan_limits(self) -> None:
        request = SimpleNamespace(
            method="GET",
            url=SimpleNamespace(path="/tenant/info"),
            state=SimpleNamespace(tenant_slug="empresa-bootstrap"),
        )
        middleware = self._middleware()
        middleware.tenant_plan_policy_service = TenantPlanPolicyService(
            plan_rate_limits="basic=60:20;pro=180:60"
        )
        middleware._load_tenant = lambda tenant_slug: build_tenant_record_stub(  # type: ignore[attr-defined]
            plan_code="pro",
        )

        middleware._apply_tenant_runtime_state(request)  # type: ignore[arg-type]

        self.assertEqual(request.state.tenant_plan_code, "pro")
        self.assertEqual(request.state.tenant_plan_api_read_requests_per_minute, 180)
        self.assertEqual(request.state.tenant_plan_api_write_requests_per_minute, 60)
        self.assertIsNone(request.state.tenant_plan_enabled_modules)

    def test_apply_tenant_runtime_state_exposes_plan_enabled_modules(self) -> None:
        request = SimpleNamespace(
            method="GET",
            url=SimpleNamespace(path="/tenant/info"),
            state=SimpleNamespace(tenant_slug="empresa-bootstrap"),
        )
        middleware = self._middleware()
        middleware.tenant_plan_policy_service = TenantPlanPolicyService(
            plan_enabled_modules="basic=core,users;pro=core,users,finance"
        )
        middleware._load_tenant = lambda tenant_slug: build_tenant_record_stub(  # type: ignore[attr-defined]
            plan_code="pro",
        )

        middleware._apply_tenant_runtime_state(request)  # type: ignore[arg-type]

        self.assertEqual(request.state.tenant_plan_enabled_modules, ("core", "finance", "users"))

    def test_apply_tenant_runtime_state_exposes_plan_module_limits(self) -> None:
        request = SimpleNamespace(
            method="GET",
            url=SimpleNamespace(path="/tenant/info"),
            state=SimpleNamespace(tenant_slug="empresa-bootstrap"),
        )
        middleware = self._middleware()
        middleware.tenant_plan_policy_service = TenantPlanPolicyService(
            plan_module_limits="pro=finance.entries:250",
        )
        middleware._load_tenant = lambda tenant_slug: build_tenant_record_stub(  # type: ignore[attr-defined]
            plan_code="pro",
        )

        middleware._apply_tenant_runtime_state(request)  # type: ignore[arg-type]

        self.assertEqual(
            request.state.tenant_plan_module_limits,
            {"finance.entries": 250},
        )
        self.assertEqual(
            request.state.tenant_effective_module_limits,
            {"finance.entries": 250},
        )
        self.assertEqual(
            request.state.tenant_effective_module_limit_sources,
            {"finance.entries": "plan"},
        )

    def test_apply_tenant_runtime_state_prefers_tenant_module_limits_over_plan(self) -> None:
        request = SimpleNamespace(
            method="GET",
            url=SimpleNamespace(path="/tenant/info"),
            state=SimpleNamespace(tenant_slug="empresa-bootstrap"),
        )
        middleware = self._middleware()
        middleware.tenant_plan_policy_service = TenantPlanPolicyService(
            plan_module_limits="pro=finance.entries:250",
        )
        middleware._load_tenant = lambda tenant_slug: build_tenant_record_stub(  # type: ignore[attr-defined]
            plan_code="pro",
            module_limits_json='{"finance.entries": 40}',
        )

        middleware._apply_tenant_runtime_state(request)  # type: ignore[arg-type]

        self.assertEqual(request.state.tenant_module_limits, {"finance.entries": 40})
        self.assertEqual(
            request.state.tenant_effective_module_limits,
            {"finance.entries": 40},
        )
        self.assertEqual(
            request.state.tenant_effective_module_limit_sources,
            {"finance.entries": "tenant_override"},
        )

    def test_apply_tenant_runtime_state_exposes_billing_grace_policy(self) -> None:
        request = SimpleNamespace(
            method="GET",
            url=SimpleNamespace(path="/tenant/info"),
            state=SimpleNamespace(tenant_slug="empresa-bootstrap"),
        )
        middleware = self._middleware()
        middleware.tenant_plan_policy_service = TenantPlanPolicyService(
            plan_rate_limits="pro=180:60",
            plan_enabled_modules="pro=core,users,finance",
            plan_module_limits="pro=finance.entries:250",
        )
        middleware.tenant_billing_grace_policy_service = (
            TenantBillingGracePolicyService(
                grace_rate_limits="20:5",
                grace_enabled_modules="core,users",
                grace_module_limits="finance.entries:25",
            )
        )
        middleware.tenant_service.get_tenant_access_policy = lambda tenant: (  # type: ignore[attr-defined]
            SimpleNamespace(
                allowed=True,
                status_code=None,
                detail=None,
                blocking_source=None,
                billing_in_grace=True,
            )
        )
        middleware._load_tenant = lambda tenant_slug: build_tenant_record_stub(  # type: ignore[attr-defined]
            plan_code="pro",
            billing_status="past_due",
            billing_grace_until=datetime.now(timezone.utc) + timedelta(days=2),
        )

        middleware._apply_tenant_runtime_state(request)  # type: ignore[arg-type]

        self.assertTrue(request.state.tenant_billing_in_grace)
        self.assertEqual(
            request.state.tenant_billing_grace_api_read_requests_per_minute,
            20,
        )
        self.assertEqual(
            request.state.tenant_billing_grace_api_write_requests_per_minute,
            5,
        )
        self.assertEqual(
            request.state.tenant_billing_grace_enabled_modules,
            ("core", "users"),
        )
        self.assertEqual(
            request.state.tenant_billing_grace_module_limits,
            {"finance.entries": 25},
        )
        self.assertEqual(
            request.state.tenant_effective_enabled_modules,
            ("core", "users"),
        )
        self.assertEqual(
            request.state.tenant_effective_module_limits,
            {"finance.entries": 25},
        )
        self.assertEqual(
            request.state.tenant_effective_module_limit_sources,
            {"finance.entries": "billing_grace"},
        )

    def test_apply_tenant_module_entitlements_blocks_finance_when_plan_disables_it(self) -> None:
        request = SimpleNamespace(
            method="GET",
            url=SimpleNamespace(path="/tenant/finance/entries"),
            state=SimpleNamespace(
                tenant_slug="empresa-bootstrap",
                tenant_plan_enabled_modules=("core", "users"),
                tenant_effective_enabled_modules=("core", "users"),
            ),
        )
        middleware = self._middleware()

        with self.assertRaises(HTTPException) as exc:
            middleware._apply_tenant_module_entitlements(request)  # type: ignore[arg-type]

        self.assertEqual(exc.exception.status_code, 403)

    def test_apply_tenant_module_entitlements_blocks_finance_when_grace_disables_it(self) -> None:
        request = SimpleNamespace(
            method="GET",
            url=SimpleNamespace(path="/tenant/finance/entries"),
            state=SimpleNamespace(
                tenant_slug="empresa-bootstrap",
                tenant_plan_enabled_modules=("core", "users", "finance"),
                tenant_billing_grace_enabled_modules=("core", "users"),
                tenant_effective_enabled_modules=("core", "users"),
            ),
        )
        middleware = self._middleware()

        with self.assertRaises(HTTPException) as exc:
            middleware._apply_tenant_module_entitlements(request)  # type: ignore[arg-type]

        self.assertEqual(exc.exception.status_code, 403)

    def test_apply_tenant_module_entitlements_allows_finance_when_plan_enables_it(self) -> None:
        request = SimpleNamespace(
            method="GET",
            url=SimpleNamespace(path="/tenant/finance/entries"),
            state=SimpleNamespace(
                tenant_slug="empresa-bootstrap",
                tenant_plan_enabled_modules=("core", "users", "finance"),
                tenant_effective_enabled_modules=("core", "users", "finance"),
            ),
        )
        middleware = self._middleware()

        middleware._apply_tenant_module_entitlements(request)  # type: ignore[arg-type]

    def test_apply_tenant_runtime_state_blocks_full_block_read_on_scope(self) -> None:
        request = SimpleNamespace(
            method="GET",
            url=SimpleNamespace(path="/tenant/finance/entries"),
            state=SimpleNamespace(tenant_slug="empresa-bootstrap"),
        )
        middleware = self._middleware()
        middleware._load_tenant = lambda tenant_slug: build_tenant_record_stub(  # type: ignore[attr-defined]
            maintenance_mode=True,
            maintenance_scopes="finance",
            maintenance_access_mode="full_block",
        )

        with self.assertRaises(HTTPException) as exc:
            middleware._apply_tenant_runtime_state(request)  # type: ignore[arg-type]

        self.assertEqual(exc.exception.status_code, 503)

    def test_apply_tenant_runtime_state_blocks_write_for_active_window(self) -> None:
        now = datetime.now(timezone.utc)
        request = SimpleNamespace(
            method="PATCH",
            url=SimpleNamespace(path="/tenant/users/2/status"),
            state=SimpleNamespace(tenant_slug="empresa-bootstrap"),
        )
        middleware = self._middleware()
        middleware.tenant_service = SimpleNamespace(
            get_tenant_status_error=lambda tenant: None,
            get_tenant_access_policy=lambda tenant: SimpleNamespace(
                allowed=True,
                status_code=None,
                detail=None,
                blocking_source=None,
                billing_in_grace=False,
            ),
            is_tenant_under_maintenance=lambda tenant, now=None: True,
            get_tenant_maintenance_scopes=lambda tenant: ["all"],
            get_tenant_module_limits=lambda tenant: TenantService().get_tenant_module_limits(tenant),
            get_effective_module_limits=None,
            get_effective_module_limit_sources=None,
        )
        middleware._load_tenant = lambda tenant_slug: build_tenant_record_stub(  # type: ignore[attr-defined]
            maintenance_mode=False,
            maintenance_starts_at=now - timedelta(minutes=1),
            maintenance_ends_at=now + timedelta(minutes=1),
            maintenance_reason="scheduled maintenance",
        )

        with self.assertRaises(HTTPException) as exc:
            middleware._apply_tenant_runtime_state(request)  # type: ignore[arg-type]

        self.assertEqual(exc.exception.status_code, 503)


class TenantServicesTestCase(unittest.TestCase):
    def test_tenant_data_service_uses_tenant_info_repository(self) -> None:
        tenant_record = SimpleNamespace(tenant_name="Empresa Bootstrap")

        class FakeTenantInfoRepository:
            def get_first(self, tenant_db):
                return tenant_record

        service = TenantDataService(
            tenant_info_repository=FakeTenantInfoRepository(),
            user_repository=SimpleNamespace(),
        )

        result = service.get_tenant_info(object())

        self.assertIs(result, tenant_record)

    def test_tenant_data_service_uses_user_repository(self) -> None:
        user = SimpleNamespace(id=1, full_name="Tenant Admin")
        users = [user]

        class FakeUserRepository:
            def get_by_id(self, tenant_db, user_id):
                return user

            def list_all(self, tenant_db):
                return users

        service = TenantDataService(
            tenant_info_repository=SimpleNamespace(),
            user_repository=FakeUserRepository(),
        )

        self.assertIs(service.get_user_by_id(object(), 1), user)
        self.assertEqual(service.list_users(object()), users)

    def test_tenant_data_service_create_user_rejects_duplicate_email(self) -> None:
        existing_user = SimpleNamespace(id=1, email="admin@empresa-bootstrap.local")

        class FakeUserRepository:
            def get_by_email(self, tenant_db, email):
                return existing_user

        service = TenantDataService(
            tenant_info_repository=SimpleNamespace(),
            user_repository=FakeUserRepository(),
        )

        with self.assertRaises(ValueError) as exc:
            service.create_user(
                tenant_db=object(),
                full_name="Nuevo Usuario",
                email="admin@empresa-bootstrap.local",
                password="Secret123!",
                role="operator",
            )

        self.assertIn("Ya existe", str(exc.exception))

    def test_tenant_data_service_create_user_rejects_when_module_limit_reached(self) -> None:
        class FakeUserRepository:
            def get_by_email(self, tenant_db, email):
                return None

            def count_all(self, tenant_db):
                return 2

        service = TenantDataService(
            tenant_info_repository=SimpleNamespace(),
            user_repository=FakeUserRepository(),
        )

        with self.assertRaises(TenantUserLimitExceededError) as exc:
            service.create_user(
                tenant_db=object(),
                full_name="Nuevo Usuario",
                email="nuevo@empresa-bootstrap.local",
                password="Secret123!",
                role="operator",
                max_users=2,
            )

        self.assertIn("core.users", str(exc.exception))

    def test_tenant_data_service_create_user_rejects_when_active_limit_reached(self) -> None:
        class FakeUserRepository:
            def get_by_email(self, tenant_db, email):
                return None

            def count_all(self, tenant_db):
                return 1

            def count_active(self, tenant_db):
                return 2

            def count_by_role(self, tenant_db, role):
                return 0

        service = TenantDataService(
            tenant_info_repository=SimpleNamespace(),
            user_repository=FakeUserRepository(),
        )

        with self.assertRaises(TenantUserLimitExceededError) as exc:
            service.create_user(
                tenant_db=object(),
                full_name="Nuevo Usuario",
                email="nuevo@empresa-bootstrap.local",
                password="Secret123!",
                role="operator",
                max_active_users=2,
                is_active=True,
            )

        self.assertIn("core.users.active", str(exc.exception))

    def test_tenant_data_service_create_user_rejects_when_role_limit_reached(self) -> None:
        class FakeUserRepository:
            def get_by_email(self, tenant_db, email):
                return None

            def count_all(self, tenant_db):
                return 1

            def count_active(self, tenant_db):
                return 1

            def count_created_since(self, tenant_db, created_since):
                return 0

            def count_by_role(self, tenant_db, role):
                return 2

        service = TenantDataService(
            tenant_info_repository=SimpleNamespace(),
            user_repository=FakeUserRepository(),
        )

        with self.assertRaises(TenantUserLimitExceededError) as exc:
            service.create_user(
                tenant_db=object(),
                full_name="Nuevo Admin",
                email="admin2@empresa-bootstrap.local",
                password="Secret123!",
                role="admin",
                role_module_limits={"core.users.admin": 2},
            )

        self.assertIn("core.users.admin", str(exc.exception))

    def test_tenant_data_service_create_user_rejects_when_monthly_limit_reached(self) -> None:
        class FakeUserRepository:
            def get_by_email(self, tenant_db, email):
                return None

            def count_all(self, tenant_db):
                return 1

            def count_active(self, tenant_db):
                return 1

            def count_created_since(self, tenant_db, created_since):
                return 4

            def count_by_role(self, tenant_db, role):
                return 0

        service = TenantDataService(
            tenant_info_repository=SimpleNamespace(),
            user_repository=FakeUserRepository(),
        )

        with self.assertRaises(TenantUserLimitExceededError) as exc:
            service.create_user(
                tenant_db=object(),
                full_name="Nuevo Usuario",
                email="nuevo@empresa-bootstrap.local",
                password="Secret123!",
                role="operator",
                max_monthly_users=4,
            )

        self.assertIn("core.users.monthly", str(exc.exception))

    def test_tenant_data_service_update_user_status_rejects_self_deactivation(self) -> None:
        user = SimpleNamespace(id=1, is_active=True)

        class FakeUserRepository:
            def get_by_id(self, tenant_db, user_id):
                return user

        service = TenantDataService(
            tenant_info_repository=SimpleNamespace(),
            user_repository=FakeUserRepository(),
        )

        with self.assertRaises(ValueError) as exc:
            service.update_user_status(
                tenant_db=object(),
                user_id=1,
                is_active=False,
                actor_user_id=1,
            )

        self.assertIn("No puedes desactivar", str(exc.exception))

    def test_tenant_data_service_update_user_status_rejects_activation_when_limit_reached(self) -> None:
        user = SimpleNamespace(id=2, is_active=False)

        class FakeUserRepository:
            def get_by_id(self, tenant_db, user_id):
                return user

            def count_active(self, tenant_db):
                return 2

        service = TenantDataService(
            tenant_info_repository=SimpleNamespace(),
            user_repository=FakeUserRepository(),
        )

        with self.assertRaises(TenantUserLimitExceededError) as exc:
            service.update_user_status(
                tenant_db=object(),
                user_id=2,
                is_active=True,
                max_active_users=2,
            )

        self.assertIn("core.users.active", str(exc.exception))

    def test_tenant_data_service_update_user_status_rejects_activation_when_admin_role_limit_reached(self) -> None:
        user = SimpleNamespace(id=2, is_active=False, role="admin")

        class FakeUserRepository:
            def get_by_id(self, tenant_db, user_id):
                return user

            def count_active(self, tenant_db):
                return 1

            def count_active_by_role(self, tenant_db, role, exclude_user_id=None):
                return 1

        service = TenantDataService(
            tenant_info_repository=SimpleNamespace(),
            user_repository=FakeUserRepository(),
        )

        with self.assertRaises(TenantUserLimitExceededError) as exc:
            service.update_user_status(
                tenant_db=object(),
                user_id=2,
                is_active=True,
                max_active_users=5,
                role_module_limits={"core.users.admin": 1},
            )

        self.assertIn("core.users.admin", str(exc.exception))

    def test_tenant_data_service_update_user_status_allows_activation_of_only_inactive_admin(self) -> None:
        user = SimpleNamespace(id=2, is_active=False, role="admin")

        class FakeUserRepository:
            def get_by_id(self, tenant_db, user_id):
                return user

            def count_active(self, tenant_db):
                return 0

            def count_active_by_role(self, tenant_db, role, exclude_user_id=None):
                return 0

            def save(self, tenant_db, saved_user):
                return saved_user

        service = TenantDataService(
            tenant_info_repository=SimpleNamespace(),
            user_repository=FakeUserRepository(),
        )

        updated_user = service.update_user_status(
            tenant_db=object(),
            user_id=2,
            is_active=True,
            max_active_users=5,
            role_module_limits={"core.users.admin": 1},
        )

        self.assertTrue(updated_user.is_active)

    def test_tenant_data_service_update_user_rejects_when_role_limit_reached(self) -> None:
        user = SimpleNamespace(
            id=2,
            full_name="Operador Uno",
            email="operador@empresa-bootstrap.local",
            role="operator",
        )

        class FakeUserRepository:
            def get_by_id(self, tenant_db, user_id):
                return user

            def get_by_email(self, tenant_db, email):
                return None

            def count_by_role(self, tenant_db, role):
                return 1

        service = TenantDataService(
            tenant_info_repository=SimpleNamespace(),
            user_repository=FakeUserRepository(),
        )

        with self.assertRaises(TenantUserLimitExceededError) as exc:
            service.update_user(
                tenant_db=object(),
                user_id=2,
                full_name="Operador Uno",
                email="operador@empresa-bootstrap.local",
                role="admin",
                role_module_limits={"core.users.admin": 1},
            )

        self.assertIn("core.users.admin", str(exc.exception))


class TenantRoutesTestCase(unittest.TestCase):
    def _request(self):
        return build_tenant_request()

    def _current_user(self) -> dict:
        return build_tenant_context()

    def test_tenant_me_returns_schema(self) -> None:
        response = tenant_me(current_user=self._current_user())

        self.assertTrue(response.success)
        self.assertEqual(response.data.tenant_slug, "empresa-bootstrap")

    def test_tenant_info_reads_tenant_info_from_service(self) -> None:
        tenant_record = build_tenant_record_stub()
        request = self._request()
        request.state.tenant_plan_code = "pro"
        request.state.tenant_plan_enabled_modules = ("core", "finance", "users")
        request.state.tenant_plan_module_limits = {"finance.entries": 250}
        request.state.tenant_billing_status = "past_due"
        request.state.tenant_billing_status_reason = "invoice overdue"
        request.state.tenant_billing_current_period_ends_at = None
        request.state.tenant_billing_grace_until = datetime.now(timezone.utc) + timedelta(days=2)
        request.state.tenant_billing_in_grace = True
        request.state.tenant_billing_grace_enabled_modules = ("core", "users")
        request.state.tenant_billing_grace_module_limits = {"finance.entries": 25}
        request.state.tenant_billing_grace_api_read_requests_per_minute = 7
        request.state.tenant_billing_grace_api_write_requests_per_minute = 2
        request.state.tenant_access_allowed = True
        request.state.tenant_access_blocking_source = None
        request.state.tenant_access_detail = None
        request.state.tenant_plan_api_read_requests_per_minute = 180
        request.state.tenant_plan_api_write_requests_per_minute = 60
        request.state.tenant_module_limits = {"finance.entries": 40}
        request.state.tenant_status = "active"
        request.state.tenant_status_reason = None
        request.state.tenant_maintenance_reason = "scheduled maintenance"
        request.state.tenant_maintenance_starts_at = None
        request.state.tenant_maintenance_ends_at = None
        request.state.tenant_maintenance_scopes = ["finance"]
        request.state.tenant_maintenance_access_mode = "full_block"
        request.state.tenant_api_read_requests_per_minute = 20
        request.state.tenant_api_write_requests_per_minute = 8
        request.state.tenant_effective_enabled_modules = ("core", "users")
        request.state.tenant_effective_module_limits = {"finance.entries": 25}
        request.state.tenant_effective_module_limit_sources = {
            "finance.entries": "billing_grace"
        }

        with patch(
            "app.apps.tenant_modules.core.api.tenant_routes."
            "tenant_data_service.get_tenant_info",
            return_value=tenant_record,
        ), patch(
            "app.apps.tenant_modules.core.api.tenant_routes.settings.TENANT_API_READ_REQUESTS_PER_MINUTE",
            60,
        ), patch(
            "app.apps.tenant_modules.core.api.tenant_routes.settings.TENANT_API_WRITE_REQUESTS_PER_MINUTE",
            30,
        ):
            response = tenant_info(
                request=request,
                current_user=self._current_user(),
                tenant_db=object(),
            )

        self.assertEqual(response.tenant.tenant_name, "Empresa Bootstrap")
        self.assertEqual(response.user.email, "admin@empresa-bootstrap.local")
        self.assertEqual(response.tenant.plan_code, "pro")
        self.assertEqual(response.tenant.plan_enabled_modules, ["core", "finance", "users"])
        self.assertEqual(response.tenant.plan_module_limits, {"finance.entries": 250})
        self.assertEqual(response.tenant.billing_status, "past_due")
        self.assertEqual(response.tenant.billing_status_reason, "invoice overdue")
        self.assertTrue(response.tenant.billing_in_grace)
        self.assertEqual(response.tenant.billing_grace_enabled_modules, ["core", "users"])
        self.assertEqual(
            response.tenant.billing_grace_module_limits,
            {"finance.entries": 25},
        )
        self.assertEqual(response.tenant.billing_grace_api_read_requests_per_minute, 7)
        self.assertEqual(response.tenant.billing_grace_api_write_requests_per_minute, 2)
        self.assertTrue(response.tenant.access_allowed)
        self.assertIsNone(response.tenant.access_blocking_source)
        self.assertEqual(response.tenant.tenant_status, "active")
        self.assertIsNone(response.tenant.tenant_status_reason)
        self.assertFalse(response.tenant.maintenance_mode)
        self.assertEqual(response.tenant.maintenance_reason, "scheduled maintenance")
        self.assertEqual(response.tenant.maintenance_scopes, ["finance"])
        self.assertEqual(response.tenant.maintenance_access_mode, "full_block")
        self.assertEqual(response.tenant.plan_api_read_requests_per_minute, 180)
        self.assertEqual(response.tenant.plan_api_write_requests_per_minute, 60)
        self.assertEqual(response.tenant.module_limits, {"finance.entries": 40})
        self.assertEqual(response.tenant.api_read_requests_per_minute, 20)
        self.assertEqual(response.tenant.api_write_requests_per_minute, 8)
        self.assertEqual(response.tenant.effective_enabled_modules, ["core", "users"])
        self.assertEqual(
            response.tenant.effective_module_limits,
            {"finance.entries": 25},
        )
        self.assertEqual(
            response.tenant.effective_module_limit_sources,
            {"finance.entries": "billing_grace"},
        )
        self.assertEqual(response.tenant.effective_api_read_requests_per_minute, 7)
        self.assertEqual(response.tenant.effective_api_write_requests_per_minute, 2)

    def test_tenant_module_usage_returns_usage_rows(self) -> None:
        with patch(
            "app.apps.tenant_modules.core.api.tenant_routes."
            "tenant_module_usage_service.list_usage",
            return_value=[
                {
                    "module_name": "core",
                    "module_key": "core.users",
                    "used_units": 2,
                    "max_units": 3,
                    "remaining_units": 1,
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
                    "max_units": 5,
                    "remaining_units": 1,
                    "unlimited": False,
                    "at_limit": False,
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
                    "used_units": 6,
                    "max_units": 8,
                    "remaining_units": 2,
                    "unlimited": False,
                    "at_limit": False,
                    "limit_source": "plan",
                }
            ],
        ):
            response = tenant_module_usage(
                request=self._request(),
                current_user=self._current_user(),
                tenant_db=object(),
            )

        self.assertTrue(response.success)
        self.assertEqual(response.total_modules, 7)
        self.assertEqual(response.data[0].module_key, "core.users")
        self.assertEqual(response.data[0].max_units, 3)
        self.assertEqual(response.data[1].module_key, "core.users.active")
        self.assertTrue(response.data[1].at_limit)
        self.assertEqual(response.data[2].module_key, "core.users.monthly")
        self.assertEqual(response.data[2].remaining_units, 1)
        self.assertEqual(response.data[3].module_key, "core.users.admin")
        self.assertTrue(response.data[3].at_limit)
        self.assertEqual(response.data[4].module_name, "finance")
        self.assertEqual(response.data[4].limit_source, "billing_grace")
        self.assertEqual(response.data[5].module_key, "finance.entries.monthly")
        self.assertEqual(response.data[6].module_key, "finance.entries.monthly.income")

    def test_tenant_login_returns_token_pair(self) -> None:
        user = build_tenant_user_stub()
        tenant = SimpleNamespace(
            slug="empresa-bootstrap",
            status="active",
            status_reason=None,
        )
        tenant_db = FakeSession()

        with patch(
            "app.apps.tenant_modules.core.api.auth_routes.TenantConnectionService.get_tenant_by_slug",
            return_value=tenant,
        ), patch(
            "app.apps.tenant_modules.core.api.auth_routes.TenantConnectionService.get_tenant_session",
            return_value=lambda: tenant_db,
        ), patch(
            "app.apps.tenant_modules.core.api.auth_routes.TenantAuthService.login",
            return_value=user,
        ), patch(
            "app.apps.tenant_modules.core.api.auth_routes.auth_token_service.issue_token_pair",
            return_value={"access_token": "tenant-access", "refresh_token": "tenant-refresh"},
        ), patch(
            "app.apps.tenant_modules.core.api.auth_routes.auth_token_service.jwt_service.decode_token",
            return_value={"jti": "tenant-access-jti"},
        ), patch(
            "app.apps.tenant_modules.core.api.auth_routes.auth_audit_service.log_event",
        ):
            response = tenant_login(
                payload=TenantLoginRequest(
                    tenant_slug="empresa-bootstrap",
                    email="admin@empresa-bootstrap.local",
                    password="TenantAdmin123!",
                ),
                control_db=object(),
            )

        self.assertEqual(response.access_token, "tenant-access")
        self.assertEqual(response.refresh_token, "tenant-refresh")

    def test_tenant_login_logs_failed_attempt(self) -> None:
        tenant = SimpleNamespace(
            slug="empresa-bootstrap",
            status="active",
            status_reason=None,
        )
        tenant_db = FakeSession()

        with patch(
            "app.apps.tenant_modules.core.api.auth_routes.TenantConnectionService.get_tenant_by_slug",
            return_value=tenant,
        ), patch(
            "app.apps.tenant_modules.core.api.auth_routes.TenantConnectionService.get_tenant_session",
            return_value=lambda: tenant_db,
        ), patch(
            "app.apps.tenant_modules.core.api.auth_routes.TenantAuthService.login",
            return_value=None,
        ), patch(
            "app.apps.tenant_modules.core.api.auth_routes.auth_audit_service.log_event",
        ) as audit_log:
            with self.assertRaises(HTTPException):
                tenant_login(
                    payload=TenantLoginRequest(
                        tenant_slug="empresa-bootstrap",
                        email="admin@empresa-bootstrap.local",
                        password="bad-password",
                    ),
                    control_db=object(),
                )

        audit_log.assert_called_once()

    def test_tenant_login_rejects_suspended_tenant(self) -> None:
        tenant = SimpleNamespace(
            slug="empresa-bootstrap",
            status="suspended",
            status_reason="billing overdue",
        )

        with patch(
            "app.apps.tenant_modules.core.api.auth_routes.TenantConnectionService.get_tenant_by_slug",
            return_value=tenant,
        ), patch(
            "app.apps.tenant_modules.core.api.auth_routes.auth_audit_service.log_event",
        ) as audit_log:
            with self.assertRaises(HTTPException) as exc:
                tenant_login(
                    payload=TenantLoginRequest(
                        tenant_slug="empresa-bootstrap",
                        email="admin@empresa-bootstrap.local",
                        password="TenantAdmin123!",
                    ),
                    control_db=object(),
                )

        self.assertEqual(exc.exception.status_code, 423)

    def test_tenant_login_rejects_past_due_tenant_without_grace(self) -> None:
        control_db = object()
        tenant_db = FakeSession()
        tenant = build_tenant_record_stub(
            status="active",
            billing_status="past_due",
            billing_status_reason="invoice overdue",
            billing_grace_until=datetime.now(timezone.utc) - timedelta(days=1),
        )
        fake_connection_service = SimpleNamespace(
            get_tenant_by_slug=lambda db, slug: tenant,
        )

        with patch(
            "app.apps.tenant_modules.core.api.auth_routes.TenantConnectionService",
            return_value=fake_connection_service,
        ), patch(
            "app.apps.tenant_modules.core.api.auth_routes.tenant_service.get_tenant_status_error",
            return_value=(423, "invoice overdue"),
        ), patch(
            "app.apps.tenant_modules.core.api.auth_routes.auth_audit_service.log_event",
            return_value=None,
        ) as audit_log:
            with self.assertRaises(HTTPException) as exc:
                tenant_login(
                    payload=TenantLoginRequest(
                        tenant_slug="empresa-bootstrap",
                        email="admin@empresa-bootstrap.local",
                        password="TenantAdmin123!",
                    ),
                    control_db=control_db,
                )

        self.assertEqual(exc.exception.status_code, 423)
        audit_log.assert_called_once()

    def test_tenant_refresh_returns_token_pair(self) -> None:
        with patch(
            "app.apps.tenant_modules.core.api.auth_routes.auth_token_service.refresh_token_pair",
            return_value=(
                {
                    "sub": "1",
                    "email": "admin@empresa-bootstrap.local",
                    "role": "admin",
                    "tenant_slug": "empresa-bootstrap",
                },
                {
                    "access_token": "new-tenant-access",
                    "refresh_token": "new-tenant-refresh",
                },
            ),
        ), patch(
            "app.apps.tenant_modules.core.api.auth_routes.auth_token_service.jwt_service.decode_token",
            return_value={"jti": "new-tenant-access-jti"},
        ), patch(
            "app.apps.tenant_modules.core.api.auth_routes.auth_audit_service.log_event",
        ):
            response = tenant_refresh_login(
                payload=TenantRefreshTokenRequest(refresh_token="refresh-token"),
                control_db=object(),
            )

        self.assertEqual(response.access_token, "new-tenant-access")
        self.assertEqual(response.refresh_token, "new-tenant-refresh")

    def test_tenant_refresh_logs_failure(self) -> None:
        with patch(
            "app.apps.tenant_modules.core.api.auth_routes.auth_token_service.jwt_service.decode_token",
            return_value={"tenant_slug": "empresa-bootstrap"},
        ), patch(
            "app.apps.tenant_modules.core.api.auth_routes.TenantConnectionService.get_tenant_by_slug",
            return_value=SimpleNamespace(
                slug="empresa-bootstrap",
                status="active",
                status_reason=None,
            ),
        ), patch(
            "app.apps.tenant_modules.core.api.auth_routes.auth_token_service.refresh_token_pair",
            side_effect=HTTPException(status_code=401, detail="Refresh token revocado"),
        ), patch(
            "app.apps.tenant_modules.core.api.auth_routes.auth_audit_service.log_event",
        ) as audit_log:
            with self.assertRaises(HTTPException):
                tenant_refresh_login(
                    payload=TenantRefreshTokenRequest(refresh_token="refresh-token"),
                    control_db=object(),
                )

        audit_log.assert_called_once()

    def test_tenant_refresh_rejects_suspended_tenant(self) -> None:
        with patch(
            "app.apps.tenant_modules.core.api.auth_routes.auth_token_service.jwt_service.decode_token",
            return_value={"tenant_slug": "empresa-bootstrap"},
        ), patch(
            "app.apps.tenant_modules.core.api.auth_routes.TenantConnectionService.get_tenant_by_slug",
            return_value=SimpleNamespace(
                slug="empresa-bootstrap",
                status="suspended",
                status_reason="billing overdue",
            ),
        ), patch(
            "app.apps.tenant_modules.core.api.auth_routes.auth_audit_service.log_event",
        ) as audit_log:
            with self.assertRaises(HTTPException) as exc:
                tenant_refresh_login(
                    payload=TenantRefreshTokenRequest(refresh_token="refresh-token"),
                    control_db=object(),
                )

        self.assertEqual(exc.exception.status_code, 423)
        audit_log.assert_called_once()

    def test_tenant_logout_revokes_session(self) -> None:
        with patch(
            "app.apps.tenant_modules.core.api.auth_routes.auth_token_service.revoke_session",
            return_value=1,
        ), patch(
            "app.apps.tenant_modules.core.api.auth_routes.auth_audit_service.log_event",
        ):
            response = tenant_logout(
                control_db=object(),
                payload={
                    "sub": "1",
                    "email": "admin@empresa-bootstrap.local",
                    "role": "admin",
                    "tenant_slug": "empresa-bootstrap",
                    "token_scope": "tenant",
                    "jti": "access-jti",
                    "aud": "tenant-api",
                    "iat": 1,
                    "exp": 2,
                },
            )

        self.assertTrue(response.success)
        self.assertEqual(response.revoked_refresh_tokens, 1)

    def test_tenant_me_db_reads_user_from_service(self) -> None:
        user = build_tenant_user_stub()

        with patch(
            "app.apps.tenant_modules.core.api.tenant_routes."
            "tenant_data_service.get_user_by_id",
            return_value=user,
        ):
            response = tenant_me_db(
                current_user=self._current_user(),
                tenant_db=object(),
            )

        self.assertTrue(response.success)
        self.assertEqual(response.db_user.full_name, "Tenant Admin")

    def test_tenant_users_returns_list(self) -> None:
        users = [
            build_tenant_user_stub(),
            build_tenant_user_stub(
                user_id=2,
                full_name="Operador Uno",
                email="operador@empresa-bootstrap.local",
                role="operator",
            ),
        ]

        with patch(
            "app.apps.tenant_modules.core.api.tenant_routes."
            "tenant_data_service.list_users",
            return_value=users,
        ):
            response = tenant_users(
                current_user=self._current_user(),
                tenant_db=object(),
            )

        self.assertEqual(response.total, 2)
        self.assertEqual(response.data[1].role, "operator")

    def test_tenant_user_detail_returns_user(self) -> None:
        user = build_tenant_user_stub(
            user_id=2,
            full_name="Operador Uno",
            email="operador@empresa-bootstrap.local",
            role="operator",
        )

        with patch(
            "app.apps.tenant_modules.core.api.tenant_routes."
            "tenant_data_service.get_user_by_id",
            return_value=user,
        ):
            response = tenant_user_detail(
                user_id=2,
                current_user=self._current_user(),
                tenant_db=object(),
            )

        self.assertEqual(response.data.email, "operador@empresa-bootstrap.local")

    def test_tenant_create_user_returns_created_user(self) -> None:
        user = build_tenant_user_stub(
            user_id=2,
            full_name="Operador Uno",
            email="operador@empresa-bootstrap.local",
            role="operator",
        )

        with patch(
            "app.apps.tenant_modules.core.api.tenant_routes."
            "tenant_data_service.create_user",
            return_value=user,
        ) as create_user_mock:
            request = self._request()
            request.state.tenant_effective_module_limits = {
                "core.users.active": 10,
                "core.users.monthly": 20,
                "core.users.operator": 25,
            }
            response = tenant_create_user(
                request=request,
                payload=TenantUserCreateRequest(
                    full_name="Operador Uno",
                    email="operador@empresa-bootstrap.local",
                    password="Operador123!",
                    role="operator",
                    is_active=True,
                ),
                current_user=self._current_user(),
                tenant_db=object(),
            )

        self.assertTrue(response.success)
        self.assertEqual(response.data.id, 2)
        self.assertEqual(create_user_mock.call_args.kwargs["max_users"], None)
        self.assertEqual(create_user_mock.call_args.kwargs["max_active_users"], 10)
        self.assertEqual(create_user_mock.call_args.kwargs["max_monthly_users"], 20)
        self.assertEqual(
            create_user_mock.call_args.kwargs["role_module_limits"],
            {
                "core.users.active": 10,
                "core.users.monthly": 20,
                "core.users.operator": 25,
            },
        )

    def test_tenant_create_user_returns_403_when_core_users_limit_reached(self) -> None:
        request = self._request()
        request.state.tenant_effective_module_limits = {"core.users": 2}

        with patch(
            "app.apps.tenant_modules.core.api.tenant_routes."
            "tenant_data_service.create_user",
            side_effect=TenantUserLimitExceededError(
                "El plan actual alcanzo el limite de core.users"
            ),
        ):
            with self.assertRaises(HTTPException) as exc:
                tenant_create_user(
                    request=request,
                    payload=TenantUserCreateRequest(
                        full_name="Operador Uno",
                        email="operador@empresa-bootstrap.local",
                        password="Operador123!",
                        role="operator",
                        is_active=True,
                    ),
                    current_user=self._current_user(),
                    tenant_db=object(),
                )

        self.assertEqual(exc.exception.status_code, 403)

    def test_tenant_update_user_status_returns_403_when_core_active_users_limit_reached(self) -> None:
        request = self._request()
        request.state.tenant_effective_module_limits = {"core.users.active": 2}

        with patch(
            "app.apps.tenant_modules.core.api.tenant_routes."
            "tenant_data_service.update_user_status",
            side_effect=TenantUserLimitExceededError(
                "El plan actual alcanzo el limite de core.users.active"
            ),
        ):
            with self.assertRaises(HTTPException) as exc:
                tenant_update_user_status(
                    request=request,
                    user_id=2,
                    payload=TenantUserStatusUpdateRequest(is_active=True),
                    current_user=self._current_user(),
                    tenant_db=object(),
                )

        self.assertEqual(exc.exception.status_code, 403)

    def test_tenant_update_user_status_passes_role_module_limits(self) -> None:
        user = build_tenant_user_stub(
            user_id=2,
            full_name="Admin Dos",
            email="admin2@empresa-bootstrap.local",
            role="admin",
            is_active=False,
        )

        with patch(
            "app.apps.tenant_modules.core.api.tenant_routes."
            "tenant_data_service.update_user_status",
            return_value=user,
        ) as update_user_status_mock:
            request = self._request()
            request.state.tenant_effective_module_limits = {
                "core.users.active": 5,
                "core.users.admin": 1,
            }
            tenant_update_user_status(
                request=request,
                user_id=2,
                payload=TenantUserStatusUpdateRequest(is_active=True),
                current_user=self._current_user(),
                tenant_db=object(),
            )

        self.assertEqual(
            update_user_status_mock.call_args.kwargs["role_module_limits"],
            {"core.users.active": 5, "core.users.admin": 1},
        )

    def test_tenant_update_user_returns_updated_user(self) -> None:
        user = build_tenant_user_stub(
            user_id=2,
            full_name="Operador Uno Editado",
            email="operador@empresa-bootstrap.local",
            role="manager",
        )

        with patch(
            "app.apps.tenant_modules.core.api.tenant_routes."
            "tenant_data_service.update_user",
            return_value=user,
        ) as update_user_mock:
            request = self._request()
            request.state.tenant_effective_module_limits = {"core.users.manager": 3}
            response = tenant_update_user(
                request=request,
                user_id=2,
                payload=TenantUserUpdateRequest(
                    full_name="Operador Uno Editado",
                    email="operador@empresa-bootstrap.local",
                    role="manager",
                    password=None,
                ),
                current_user=self._current_user(),
                tenant_db=object(),
            )

        self.assertEqual(response.data.role, "manager")
        self.assertEqual(
            update_user_mock.call_args.kwargs["role_module_limits"],
            {"core.users.manager": 3},
        )

    def test_tenant_update_user_returns_403_when_role_limit_reached(self) -> None:
        request = self._request()
        request.state.tenant_effective_module_limits = {"core.users.admin": 1}

        with patch(
            "app.apps.tenant_modules.core.api.tenant_routes."
            "tenant_data_service.update_user",
            side_effect=TenantUserLimitExceededError(
                "El plan actual alcanzo el limite de core.users.admin"
            ),
        ):
            with self.assertRaises(HTTPException) as exc:
                tenant_update_user(
                    request=request,
                    user_id=2,
                    payload=TenantUserUpdateRequest(
                        full_name="Operador Uno Editado",
                        email="operador@empresa-bootstrap.local",
                        role="admin",
                        password=None,
                    ),
                    current_user=self._current_user(),
                    tenant_db=object(),
                )

        self.assertEqual(exc.exception.status_code, 403)

    def test_tenant_update_user_status_returns_updated_user(self) -> None:
        user = build_tenant_user_stub(
            user_id=2,
            full_name="Operador Uno",
            email="operador@empresa-bootstrap.local",
            role="operator",
            is_active=False,
        )

        with patch(
            "app.apps.tenant_modules.core.api.tenant_routes."
            "tenant_data_service.update_user_status",
            return_value=user,
        ):
            response = tenant_update_user_status(
                request=self._request(),
                user_id=2,
                payload=TenantUserStatusUpdateRequest(is_active=False),
                current_user=self._current_user(),
                tenant_db=object(),
            )

        self.assertFalse(response.data.is_active)


if __name__ == "__main__":
    unittest.main()
