import json
from datetime import datetime, timezone

from fastapi import HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

from app.apps.platform_control.repositories.tenant_repository import TenantRepository
from app.apps.platform_control.services.tenant_service import TenantService
from app.common.auth.auth_token_service import AuthTokenService
from app.common.auth.jwt_service import JWTService
from app.common.config.settings import settings
from app.common.db.control_database import ControlSessionLocal
from app.common.exceptions.handlers import _build_error_response
from app.common.policies.tenant_billing_grace_policy_service import (
    TenantBillingGracePolicyService,
)
from app.common.policies.tenant_plan_policy_service import TenantPlanPolicyService
from app.common.policies.tenant_rate_limit_service import TenantRateLimitService


class AuthContextMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, jwt_service: JWTService):
        super().__init__(app)
        self.jwt_service = jwt_service
        self.auth_token_service = AuthTokenService(jwt_service=jwt_service)
        self.tenant_repository = TenantRepository()
        self.tenant_service = TenantService()
        self.tenant_plan_policy_service = TenantPlanPolicyService()
        self.tenant_billing_grace_policy_service = TenantBillingGracePolicyService()
        self.tenant_rate_limit_service = TenantRateLimitService()

    async def dispatch(self, request: Request, call_next):
        path = request.url.path.rstrip("/") or "/"
        route_scope = self._resolve_route_scope(path)

        if request.method.upper() == "OPTIONS":
            return await call_next(request)

        if route_scope is None:
            return await call_next(request)

        public_paths = {
            "/tenant/auth/login",
            "/tenant/auth/refresh",
            "/tenant/health",
            "/platform/auth/login",
            "/platform/auth/refresh",
        }

        if path in public_paths:
            return await call_next(request)

        try:
            try:
                token = self._extract_bearer_token(request)
                payload = self.jwt_service.decode_token(
                    token,
                    audience=self._resolve_expected_audience(route_scope),
                )
            except Exception as exc:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail=getattr(exc, "detail", "Token inválido"),
                ) from exc

            request.state.jwt_payload = payload

            if payload.get("token_type") != "access":
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="El token no corresponde a un access token",
                )

            if self._is_revoked_access_token(payload):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Token revocado",
                )

            if route_scope == "tenant":
                self._set_tenant_context(request, payload)
                self._apply_tenant_runtime_state(request)
                self._apply_tenant_module_entitlements(request)
                self._apply_tenant_api_rate_limit(request)
            else:
                self._set_platform_context(request, payload)

            response = await call_next(request)

            if route_scope == "tenant":
                self._apply_tenant_rate_limit_headers(request, response)

            return response
        except HTTPException as exc:
            return _build_error_response(
                request=request,
                status_code=exc.status_code,
                detail=exc.detail,
            )

    def _is_revoked_access_token(self, payload: dict) -> bool:
        control_db = ControlSessionLocal()
        try:
            return self.auth_token_service.is_token_revoked(
                control_db,
                jti=payload["jti"],
            )
        finally:
            control_db.close()

    def _resolve_route_scope(self, path: str) -> str | None:
        if path.startswith("/tenant"):
            return "tenant"
        if path.startswith("/platform"):
            return "platform"
        return None

    def _resolve_expected_audience(self, route_scope: str) -> str:
        if route_scope == "tenant":
            return settings.JWT_TENANT_AUDIENCE
        return settings.JWT_PLATFORM_AUDIENCE

    def _extract_bearer_token(self, request: Request) -> str:
        auth_header = request.headers.get("Authorization")

        if not auth_header or not auth_header.startswith("Bearer "):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authorization Bearer token requerido",
            )

        token = auth_header.split(" ", 1)[1].strip()
        if not token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token Bearer vacío",
            )

        return token

    def _set_tenant_context(
        self,
        request: Request,
        payload: dict,
    ) -> None:
        token_scope = payload.get("token_scope")
        tenant_slug = payload.get("tenant_slug")
        user_id = payload.get("sub")
        email = payload.get("email")
        role = payload.get("role")

        if token_scope != "tenant":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="El token no corresponde a un usuario tenant",
            )

        if not tenant_slug:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="El token no contiene tenant_slug",
            )

        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="El token no contiene sub",
            )

        if not email:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="El token no contiene email",
            )

        if not role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="El token no contiene role",
            )

        try:
            request.state.tenant_user_id = int(user_id)
        except (TypeError, ValueError):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="El claim sub del token es inválido",
            )

        request.state.tenant_slug = tenant_slug
        request.state.tenant_email = email
        request.state.tenant_role = role
        request.state.token_scope = token_scope

    def _apply_tenant_runtime_state(self, request: Request) -> None:
        tenant = self._load_tenant(request.state.tenant_slug)

        if not tenant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tenant no encontrado",
            )

        request.state.tenant_status = tenant.status
        request.state.tenant_status_reason = tenant.status_reason
        request.state.tenant_plan_code = tenant.plan_code
        request.state.tenant_billing_status = tenant.billing_status
        request.state.tenant_billing_status_reason = tenant.billing_status_reason
        request.state.tenant_billing_current_period_ends_at = (
            tenant.billing_current_period_ends_at
        )
        request.state.tenant_billing_grace_until = tenant.billing_grace_until
        request.state.tenant_maintenance_mode = self.tenant_service.is_tenant_under_maintenance(
            tenant,
            now=datetime.now(timezone.utc),
        )
        request.state.tenant_maintenance_reason = tenant.maintenance_reason
        request.state.tenant_maintenance_starts_at = tenant.maintenance_starts_at
        request.state.tenant_maintenance_ends_at = tenant.maintenance_ends_at
        request.state.tenant_maintenance_scopes = (
            self.tenant_service.get_tenant_maintenance_scopes(tenant)
        )
        request.state.tenant_maintenance_access_mode = tenant.maintenance_access_mode
        request.state.tenant_api_read_requests_per_minute = (
            tenant.api_read_requests_per_minute
        )
        request.state.tenant_api_write_requests_per_minute = (
            tenant.api_write_requests_per_minute
        )
        tenant_module_limits_resolver = getattr(
            self.tenant_service,
            "get_tenant_module_limits",
            None,
        )
        request.state.tenant_module_limits = (
            tenant_module_limits_resolver(tenant)
            if callable(tenant_module_limits_resolver)
            else self._parse_tenant_module_limits(tenant)
        )
        plan_policy = self.tenant_plan_policy_service.get_policy(tenant.plan_code)
        request.state.tenant_plan_api_read_requests_per_minute = (
            None if plan_policy is None else plan_policy.read_requests_per_minute
        )
        request.state.tenant_plan_api_write_requests_per_minute = (
            None if plan_policy is None else plan_policy.write_requests_per_minute
        )
        request.state.tenant_plan_enabled_modules = (
            None if plan_policy is None else plan_policy.enabled_modules
        )
        request.state.tenant_plan_module_limits = (
            None if plan_policy is None else plan_policy.module_limits
        )
        access_policy = self.tenant_service.get_tenant_access_policy(tenant)
        request.state.tenant_access_allowed = access_policy.allowed
        request.state.tenant_access_status_code = access_policy.status_code
        request.state.tenant_access_detail = access_policy.detail
        request.state.tenant_access_blocking_source = access_policy.blocking_source
        request.state.tenant_billing_in_grace = access_policy.billing_in_grace
        grace_policy = (
            self.tenant_billing_grace_policy_service.get_policy()
            if access_policy.billing_in_grace
            else None
        )
        request.state.tenant_billing_grace_api_read_requests_per_minute = (
            None if grace_policy is None else grace_policy.read_requests_per_minute
        )
        request.state.tenant_billing_grace_api_write_requests_per_minute = (
            None if grace_policy is None else grace_policy.write_requests_per_minute
        )
        request.state.tenant_billing_grace_enabled_modules = (
            None if grace_policy is None else grace_policy.enabled_modules
        )
        request.state.tenant_billing_grace_module_limits = (
            None if grace_policy is None else grace_policy.module_limits
        )
        request.state.tenant_effective_enabled_modules = self._resolve_effective_enabled_modules(
            request
        )
        effective_module_limits_resolver = getattr(
            self.tenant_service,
            "get_effective_module_limits",
            None,
        )
        effective_module_limit_sources_resolver = getattr(
            self.tenant_service,
            "get_effective_module_limit_sources",
            None,
        )
        request.state.tenant_effective_module_limits = (
            effective_module_limits_resolver(tenant)
            if callable(effective_module_limits_resolver)
            else self._resolve_effective_module_limits(request)
        )
        request.state.tenant_effective_module_limit_sources = (
            effective_module_limit_sources_resolver(tenant)
            if callable(effective_module_limit_sources_resolver)
            else self._resolve_effective_module_limit_sources(request)
        )

        if (
            not access_policy.allowed
            and not self._is_tenant_status_exempt(request)
        ):
            raise HTTPException(
                status_code=access_policy.status_code or status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=access_policy.detail or "Tenant unavailable",
            )

        if (
            request.state.tenant_maintenance_mode
            and self._is_request_affected_by_maintenance(request)
            and not self._is_tenant_maintenance_exempt(request)
        ):
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Tenant en mantenimiento; operaciones de escritura temporalmente deshabilitadas",
            )

    def _apply_tenant_module_entitlements(self, request: Request) -> None:
        module_name, _ = self._classify_tenant_request(request)
        enabled_modules = getattr(request.state, "tenant_effective_enabled_modules", None)

        if enabled_modules is None:
            return

        enabled_modules_set = set(enabled_modules)
        if "all" in enabled_modules_set or module_name in enabled_modules_set:
            return

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Modulo tenant no habilitado por el plan actual: "
                f"{module_name}"
            ),
        )

    def _resolve_effective_enabled_modules(self, request: Request):
        plan_enabled_modules = getattr(request.state, "tenant_plan_enabled_modules", None)
        grace_enabled_modules = getattr(
            request.state,
            "tenant_billing_grace_enabled_modules",
            None,
        )

        if grace_enabled_modules is None:
            return plan_enabled_modules
        if plan_enabled_modules is None:
            return grace_enabled_modules

        plan_modules = set(plan_enabled_modules)
        grace_modules = set(grace_enabled_modules)

        if "all" in grace_modules:
            return plan_enabled_modules
        if "all" in plan_modules:
            return grace_enabled_modules

        return tuple(sorted(plan_modules & grace_modules))

    def _resolve_effective_module_limits(self, request: Request):
        tenant_limits = getattr(request.state, "tenant_module_limits", None)
        plan_limits = getattr(request.state, "tenant_plan_module_limits", None)
        grace_limits = getattr(request.state, "tenant_billing_grace_module_limits", None)

        base_limits = tenant_limits if tenant_limits is not None else plan_limits

        if base_limits is None and grace_limits is None:
            return None
        if base_limits is None:
            return dict(grace_limits)
        if grace_limits is None:
            return dict(base_limits)

        resolved: dict[str, int] = {}
        for key in set(base_limits) | set(grace_limits):
            base_limit = base_limits.get(key)
            grace_limit = grace_limits.get(key)
            resolved_limit = self._resolve_stricter_limit(base_limit, grace_limit)
            if resolved_limit is not None:
                resolved[key] = resolved_limit
        return resolved

    def _resolve_effective_module_limit_sources(self, request: Request):
        tenant_limits = getattr(request.state, "tenant_module_limits", None)
        plan_limits = getattr(request.state, "tenant_plan_module_limits", None)
        grace_limits = getattr(request.state, "tenant_billing_grace_module_limits", None)
        base_limits = tenant_limits if tenant_limits is not None else plan_limits
        base_source = "tenant_override" if tenant_limits is not None else "plan"

        if base_limits is None and grace_limits is None:
            return None

        sources: dict[str, str] = {}
        for key in set(base_limits or {}) | set(grace_limits or {}):
            _, source = self._resolve_effective_limit_with_source(
                primary_limit=None if base_limits is None else base_limits.get(key),
                primary_source=base_source,
                secondary_limit=None if grace_limits is None else grace_limits.get(key),
                secondary_source="billing_grace",
            )
            if source is not None:
                sources[key] = source
        return sources or None

    def _resolve_stricter_limit(
        self,
        primary_limit: int | None,
        secondary_limit: int | None,
    ) -> int | None:
        limit, _ = self._resolve_effective_limit_with_source(
            primary_limit=primary_limit,
            primary_source=None,
            secondary_limit=secondary_limit,
            secondary_source=None,
        )
        return limit

    def _resolve_effective_limit_with_source(
        self,
        *,
        primary_limit: int | None,
        primary_source: str | None,
        secondary_limit: int | None,
        secondary_source: str | None,
    ) -> tuple[int | None, str | None]:
        if primary_limit is None:
            return secondary_limit, secondary_source if secondary_limit is not None else None
        if secondary_limit is None:
            return primary_limit, primary_source
        if primary_limit == 0:
            return secondary_limit, secondary_source
        if secondary_limit == 0:
            return primary_limit, primary_source
        if secondary_limit < primary_limit:
            return secondary_limit, secondary_source
        return primary_limit, primary_source

    def _parse_tenant_module_limits(self, tenant) -> dict[str, int] | None:
        raw_value = getattr(tenant, "module_limits_json", None)
        if not raw_value:
            return None
        try:
            parsed = json.loads(raw_value)
        except (TypeError, ValueError, json.JSONDecodeError):
            return None
        if not isinstance(parsed, dict):
            return None

        normalized: dict[str, int] = {}
        for key, value in parsed.items():
            normalized_key = str(key).strip().lower()
            try:
                normalized_value = int(value)
            except (TypeError, ValueError):
                continue
            if normalized_value < 0:
                continue
            normalized[normalized_key] = normalized_value
        return normalized or None

    def _load_tenant(self, tenant_slug: str):
        control_db = ControlSessionLocal()
        try:
            return self.tenant_repository.get_by_slug(control_db, tenant_slug)
        finally:
            control_db.close()

    def _is_tenant_status_exempt(self, request: Request) -> bool:
        path = request.url.path.rstrip("/") or "/"
        return path == "/tenant/health" or path.startswith("/tenant/auth/")

    def _is_tenant_maintenance_exempt(self, request: Request) -> bool:
        path = request.url.path.rstrip("/") or "/"
        return path == "/tenant/health" or path.startswith("/tenant/auth/")

    def _is_request_affected_by_maintenance(self, request: Request) -> bool:
        module_name, operation_type = self._classify_tenant_request(request)
        scopes = set(getattr(request.state, "tenant_maintenance_scopes", ["all"]))
        access_mode = getattr(
            request.state,
            "tenant_maintenance_access_mode",
            "write_block",
        )

        if "all" not in scopes and module_name not in scopes:
            return False

        if access_mode == "full_block":
            return True

        return operation_type == "write"

    def _classify_tenant_request(self, request: Request) -> tuple[str, str]:
        path = request.url.path.rstrip("/") or "/"
        method = request.method.upper()
        operation_type = "read" if method in {"GET", "HEAD", "OPTIONS"} else "write"

        if path.startswith("/tenant/finance"):
            return ("finance", operation_type)
        if path.startswith("/tenant/users"):
            return ("users", operation_type)
        return ("core", operation_type)

    def _apply_tenant_api_rate_limit(self, request: Request) -> None:
        _, operation_type = self._classify_tenant_request(request)
        if operation_type == "read":
            limit = getattr(
                request.state,
                "tenant_billing_grace_api_read_requests_per_minute",
                None,
            )
            if limit is None:
                limit = getattr(
                    request.state,
                    "tenant_api_read_requests_per_minute",
                    None,
                )
            if limit is None:
                limit = getattr(
                    request.state,
                    "tenant_plan_api_read_requests_per_minute",
                    None,
                )
            if limit is None:
                limit = settings.TENANT_API_READ_REQUESTS_PER_MINUTE
        else:
            limit = getattr(
                request.state,
                "tenant_billing_grace_api_write_requests_per_minute",
                None,
            )
            if limit is None:
                limit = getattr(
                    request.state,
                    "tenant_api_write_requests_per_minute",
                    None,
                )
            if limit is None:
                limit = getattr(
                    request.state,
                    "tenant_plan_api_write_requests_per_minute",
                    None,
                )
            if limit is None:
                limit = settings.TENANT_API_WRITE_REQUESTS_PER_MINUTE

        try:
            result = self.tenant_rate_limit_service.consume(
                tenant_slug=request.state.tenant_slug,
                operation_type=operation_type,
                limit=limit,
            )
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Tenant rate limit backend no disponible",
            ) from exc

        request.state.tenant_rate_limit_operation = operation_type
        request.state.tenant_rate_limit_limit = result.limit
        request.state.tenant_rate_limit_remaining = result.remaining
        request.state.tenant_rate_limit_reset_at = result.reset_at

        if result.limit <= 0:
            return

        if not result.allowed:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=(
                    "Rate limit excedido para operaciones tenant de "
                    f"{'lectura' if operation_type == 'read' else 'escritura'}"
                ),
            )

    def _apply_tenant_rate_limit_headers(self, request: Request, response) -> None:
        limit = getattr(request.state, "tenant_rate_limit_limit", 0)
        if limit <= 0:
            return

        response.headers["X-Tenant-RateLimit-Limit"] = str(limit)
        response.headers["X-Tenant-RateLimit-Remaining"] = str(
            getattr(request.state, "tenant_rate_limit_remaining", 0)
        )
        response.headers["X-Tenant-RateLimit-Reset"] = str(
            getattr(request.state, "tenant_rate_limit_reset_at", 0)
        )
        response.headers["X-Tenant-RateLimit-Operation"] = str(
            getattr(request.state, "tenant_rate_limit_operation", "")
        )

    def _set_platform_context(
        self,
        request: Request,
        payload: dict,
    ) -> None:
        token_scope = payload.get("token_scope")
        user_id = payload.get("sub")
        email = payload.get("email")
        role = payload.get("role")

        if token_scope != "platform":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="El token no corresponde a un usuario de plataforma",
            )

        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="El token no contiene sub",
            )

        if not email:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="El token no contiene email",
            )

        if not role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="El token no contiene role",
            )

        try:
            request.state.platform_user_id = int(user_id)
        except (TypeError, ValueError):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="El claim sub del token es inválido",
            )

        request.state.platform_email = email
        request.state.platform_role = role
        request.state.token_scope = "platform"
