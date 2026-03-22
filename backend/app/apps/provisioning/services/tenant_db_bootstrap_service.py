from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.apps.tenant_modules.core.models.role import Role
from app.apps.tenant_modules.core.models.tenant_info import TenantInfo
from app.apps.tenant_modules.core.models.user import User
from app.apps.provisioning.services.tenant_schema_service import TenantSchemaService
from app.common.security.password_service import hash_password


class TenantDatabaseBootstrapService:
    def __init__(
        self,
        tenant_schema_service: TenantSchemaService | None = None,
    ):
        self.tenant_schema_service = tenant_schema_service or TenantSchemaService()

    def bootstrap(
        self,
        host: str,
        port: int,
        database: str,
        username: str,
        password: str,
        tenant_name: str,
        tenant_slug: str,
        tenant_type: str,
    ) -> None:
        database_url = (
            f"postgresql+psycopg2://"
            f"{username}:{password}"
            f"@{host}:{port}/{database}"
        )

        engine = create_engine(database_url, pool_pre_ping=True)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

        self.tenant_schema_service.sync_schema(
            host=host,
            port=port,
            database=database,
            username=username,
            password=password,
        )

        db: Session = SessionLocal()
        try:
            self._seed_tenant_info(db, tenant_name, tenant_slug, tenant_type)
            self._seed_roles(db)
            self._seed_admin_user(db, tenant_slug)
            db.commit()
        finally:
            db.close()

    def _seed_tenant_info(
        self,
        db: Session,
        tenant_name: str,
        tenant_slug: str,
        tenant_type: str,
    ) -> None:
        existing = db.query(TenantInfo).first()
        if existing:
            return

        db.add(
            TenantInfo(
                tenant_name=tenant_name,
                tenant_slug=tenant_slug,
                tenant_type=tenant_type,
            )
        )

    def _seed_roles(self, db: Session) -> None:
        roles = [
            ("admin", "Administrator"),
            ("manager", "Manager"),
            ("operator", "Operator"),
        ]

        for code, name in roles:
            existing = db.query(Role).filter(Role.code == code).first()
            if not existing:
                db.add(Role(code=code, name=name))

    def _seed_admin_user(self, db: Session, tenant_slug: str) -> None:
        admin_email = f"admin@{tenant_slug}.local"
        existing = db.query(User).filter(User.email == admin_email).first()
        if existing:
            return

        db.add(
            User(
                full_name="Tenant Admin",
                email=admin_email,
                password_hash=hash_password("TenantAdmin123!"),
                role="admin",
                is_active=True,
            )
        )
