from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.apps.installer.api.routes import router as installer_router
from app.apps.platform_control.api.auth_routes import router as platform_auth_router
from app.apps.platform_control.api.auth_audit_routes import (
    router as platform_auth_audit_router,
)
from app.apps.platform_control.api.billing_webhook_routes import (
    router as billing_webhook_router,
)
from app.apps.platform_control.api.platform_user_routes import (
    router as platform_user_router,
)
from app.apps.platform_control.api.provisioning_job_routes import (
    router as provisioning_job_router,
)
from app.apps.platform_control.api.routes import router as platform_router
from app.apps.platform_control.api.tenant_routes import router as tenant_router
from app.apps.tenant_modules.business_core.api.routes import (
    router as tenant_business_core_router,
)
from app.apps.tenant_modules.core.api.auth_routes import router as tenant_auth_router
from app.apps.tenant_modules.core.api.tenant_routes import (
    router as tenant_protected_router,
)
from app.apps.tenant_modules.finance.api.routes import router as tenant_finance_router
from app.apps.tenant_modules.maintenance.api.routes import (
    router as tenant_maintenance_router,
)
from app.bootstrap.install_checker import is_platform_installed
from app.common.auth.jwt_service import JWTService
from app.common.config.settings import settings
from app.common.db.migration_service import run_control_migrations
from app.common.exceptions.handlers import register_exception_handlers
from app.common.middleware.request_observability_middleware import (
    RequestObservabilityMiddleware,
)
from app.common.middleware.tenant_context_middleware import AuthContextMiddleware
from app.common.observability.logging_service import LoggingService
from app.common.security.runtime_security_service import RuntimeSecurityService


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        debug=settings.DEBUG,
    )

    platform_installed = is_platform_installed()

    register_exception_handlers(app)
    register_common_components(app, platform_installed=platform_installed)

    if platform_installed:
        register_installed_routes(app)
    else:
        register_install_routes(app)

    register_health_routes(app)

    return app


def register_common_components(app: FastAPI, *, platform_installed: bool) -> None:
    if settings.backend_cors_allowed_origins:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=settings.backend_cors_allowed_origins,
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    jwt_service = JWTService(
        secret_key=settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
        expire_minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES,
        issuer=settings.JWT_ISSUER,
    )
    logging_service = LoggingService()

    app.add_middleware(
        AuthContextMiddleware,
        jwt_service=jwt_service,
    )
    app.add_middleware(
        RequestObservabilityMiddleware,
        logging_service=logging_service,
    )

    runtime_security_service = RuntimeSecurityService()

    @app.on_event("startup")
    def validate_runtime_security() -> None:
        runtime_security_service.validate_settings(settings)
        if platform_installed:
            run_control_migrations()


def register_install_routes(app: FastAPI) -> None:
    app.include_router(installer_router)


def register_installed_routes(app: FastAPI) -> None:
    # Platform routes
    app.include_router(platform_router)
    app.include_router(platform_auth_router)
    app.include_router(platform_auth_audit_router)
    app.include_router(billing_webhook_router)
    app.include_router(tenant_router)
    app.include_router(platform_user_router)
    app.include_router(provisioning_job_router)

    # Tenant auth routes
    app.include_router(tenant_auth_router)

    # Tenant protected routes
    app.include_router(tenant_protected_router)
    app.include_router(tenant_business_core_router)
    app.include_router(tenant_finance_router)
    app.include_router(tenant_maintenance_router)

    @app.get("/")
    def root() -> dict:
        return {
            "status": "ok",
            "message": "Platform backend running",
        }


def register_health_routes(app: FastAPI) -> None:
    @app.get("/health")
    def health() -> dict:
        return {
            "status": "healthy",
            "app": settings.APP_NAME,
            "version": settings.APP_VERSION,
            "installed": is_platform_installed(),
        }
