from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.apps.tenant_modules.core.models.role import Role
from app.apps.tenant_modules.core.models.tenant_info import TenantInfo
from app.apps.tenant_modules.core.models.user import User
from app.apps.tenant_modules.finance.default_category_profiles import (
    get_default_finance_category_seeds,
)
from app.apps.tenant_modules.finance.models.budget import FinanceBudget
from app.apps.tenant_modules.finance.models.category import FinanceCategory
from app.apps.tenant_modules.finance.models.transaction import FinanceTransaction
from app.apps.provisioning.services.tenant_schema_service import TenantSchemaService
from app.common.db.url_factory import build_postgres_url


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
        admin_full_name: str,
        admin_email: str,
        admin_password_hash: str,
    ) -> None:
        database_url = build_postgres_url(
            host=host,
            port=port,
            database=database,
            username=username,
            password=password,
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
            self._seed_finance_categories(db, tenant_type=tenant_type)
            self._seed_admin_user(
                db,
                admin_full_name=admin_full_name,
                admin_email=admin_email,
                admin_password_hash=admin_password_hash,
            )
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

    def _seed_finance_categories(
        self,
        db: Session,
        *,
        tenant_type: str,
    ) -> None:
        has_finance_usage = (
            db.query(FinanceTransaction.id).first() is not None
            or db.query(FinanceBudget.id).first() is not None
        )
        target_seeds = get_default_finance_category_seeds(tenant_type)
        existing_categories = db.query(FinanceCategory).all()

        # Fresh tenant bootstrap already ran schema migrations, which may leave a
        # neutral catalog. If there is no finance usage yet, replace it with the
        # vertical profile so the tenant starts with the right baseline.
        if existing_categories and not has_finance_usage:
            db.query(FinanceCategory).delete()
            existing_categories = []

        existing_by_key = {
            (category.name.strip().lower(), category.category_type.strip().lower()): category
            for category in existing_categories
        }

        for seed in target_seeds:
            key = (seed["name"].strip().lower(), seed["category_type"].strip().lower())
            existing = existing_by_key.get(key)
            if existing is None:
                db.add(FinanceCategory(**seed, is_active=True))
                continue

            existing.icon = existing.icon or seed.get("icon")
            existing.note = existing.note or seed.get("note")
            existing.sort_order = seed.get("sort_order", existing.sort_order)
            existing.is_active = True

    def _seed_admin_user(
        self,
        db: Session,
        *,
        admin_full_name: str,
        admin_email: str,
        admin_password_hash: str,
    ) -> None:
        existing = db.query(User).filter(User.email == admin_email).first()
        if existing:
            return

        db.add(
            User(
                full_name=admin_full_name,
                email=admin_email,
                password_hash=admin_password_hash,
                role="admin",
                is_active=True,
            )
        )
