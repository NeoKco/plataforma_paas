from app.common.config.settings import settings
from app.common.security.tenant_secret_service import TenantSecretService
from sqlalchemy.orm import Session

from app.apps.platform_control.models.tenant import Tenant
from app.common.db.tenant_database import get_tenant_session_factory


class TenantConnectionService:
    def __init__(
        self,
        tenant_secret_service: TenantSecretService | None = None,
    ):
        self.tenant_secret_service = tenant_secret_service or TenantSecretService()

    def get_tenant(self, db: Session, tenant_slug: str) -> Tenant | None:
        return (
            db.query(Tenant)
            .filter(Tenant.slug == tenant_slug)
            .filter(Tenant.status == "active")
            .first()
        )

    def get_tenant_by_slug(self, db: Session, tenant_slug: str) -> Tenant | None:
        return db.query(Tenant).filter(Tenant.slug == tenant_slug).first()

    def get_tenant_session(self, tenant: Tenant):
        credentials = self.get_tenant_database_credentials(tenant)
        return get_tenant_session_factory(**credentials)

    def get_tenant_database_credentials(self, tenant: Tenant) -> dict:
        if not tenant.db_name or not tenant.db_user or not tenant.db_host or not tenant.db_port:
            raise ValueError("Tenant database configuration is incomplete")

        # En esta etapa simple no guardamos password tenant en platform_control,
        # así que por ahora resolveremos login tenant solo para el tenant bootstrap
        # usando una contraseña fija temporal desde settings.
        return {
            "host": tenant.db_host,
            "port": tenant.db_port,
            "database": tenant.db_name,
            "username": tenant.db_user,
            "password": self._resolve_tenant_db_password(tenant.slug),
        }

    def _resolve_tenant_db_password(self, tenant_slug: str) -> str:
        return self.tenant_secret_service.resolve_tenant_db_password(
            tenant_slug,
            settings,
        )
