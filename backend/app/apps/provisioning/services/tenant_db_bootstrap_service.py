from sqlalchemy import create_engine
from sqlalchemy import func
from sqlalchemy.orm import Session, sessionmaker

from app.apps.tenant_modules.business_core.default_catalog_profiles import (
    get_default_function_profile_seeds,
    get_default_task_type_seeds,
)
from app.apps.tenant_modules.business_core.models import (
    BusinessFunctionProfile,
    BusinessTaskType,
    BusinessTaskTypeFunctionProfile,
)
from app.apps.tenant_modules.core.models.role import Role
from app.apps.tenant_modules.core.models.tenant_info import TenantInfo
from app.apps.tenant_modules.core.models.user import User
from app.apps.tenant_modules.finance.default_category_profiles import (
    get_default_finance_category_seeds,
)
from app.apps.tenant_modules.finance.models.account import FinanceAccount
from app.apps.tenant_modules.finance.models.budget import FinanceBudget
from app.apps.tenant_modules.finance.models.category import FinanceCategory
from app.apps.tenant_modules.finance.models.currency import FinanceCurrency
from app.apps.tenant_modules.finance.models.settings import FinanceSetting
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
        enabled_modules: list[str] | None = None,
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
            self.seed_defaults(
                db,
                tenant_name=tenant_name,
                tenant_slug=tenant_slug,
                tenant_type=tenant_type,
                enabled_modules=enabled_modules,
            )
            self._seed_admin_user(
                db,
                admin_full_name=admin_full_name,
                admin_email=admin_email,
                admin_password_hash=admin_password_hash,
            )
            db.commit()
        finally:
            db.close()

    def seed_defaults(
        self,
        db: Session,
        *,
        tenant_name: str,
        tenant_slug: str,
        tenant_type: str,
        enabled_modules: list[str] | None = None,
    ) -> None:
        normalized_modules = self._normalize_enabled_modules(enabled_modules)
        self._seed_tenant_info(db, tenant_name, tenant_slug, tenant_type)
        self._seed_roles(db)
        if self._should_seed_finance_defaults(normalized_modules):
            self._seed_finance_defaults(db, tenant_type=tenant_type)
        if self._should_seed_business_core_defaults(normalized_modules):
            self._seed_business_core_defaults(db)

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

    def _seed_finance_defaults(
        self,
        db: Session,
        *,
        tenant_type: str,
    ) -> None:
        self._seed_finance_currencies_and_settings(db)
        self._seed_finance_categories(db, tenant_type=tenant_type)

    def _seed_finance_currencies_and_settings(self, db: Session) -> None:
        has_finance_usage = self._has_finance_usage(db)
        current_currencies = {
            item.code.strip().upper(): item for item in db.query(FinanceCurrency).all()
        }
        clp = current_currencies.get("CLP")
        if clp is None:
            clp = FinanceCurrency(
                code="CLP",
                name="Peso Chileno",
                symbol="$",
                decimal_places=0,
                is_base=False,
                is_active=True,
                sort_order=10,
            )
            db.add(clp)
        else:
            clp.name = "Peso Chileno"
            clp.symbol = "$"
            clp.decimal_places = 0
            clp.is_active = True
            clp.sort_order = 10

        usd = current_currencies.get("USD")
        if usd is not None:
            usd.is_active = True
            usd.sort_order = 20

        current_base = (
            db.query(FinanceCurrency).filter(FinanceCurrency.is_base.is_(True)).first()
        )
        should_promote_clp = not has_finance_usage or current_base is None
        if should_promote_clp:
            db.query(FinanceCurrency).update({FinanceCurrency.is_base: False})
            clp.is_base = True
        elif current_base is not None and current_base.code.strip().upper() == "CLP":
            clp.is_base = True

        setting = (
            db.query(FinanceSetting)
            .filter(FinanceSetting.setting_key == "base_currency_code")
            .first()
        )
        if setting is None:
            db.add(
                FinanceSetting(
                    setting_key="base_currency_code",
                    setting_value="CLP",
                    is_active=True,
                )
            )
        elif should_promote_clp or setting.setting_value.strip().upper() == "CLP":
            setting.setting_value = "CLP"
            setting.is_active = True

    def _seed_finance_categories(
        self,
        db: Session,
        *,
        tenant_type: str,
    ) -> None:
        has_finance_usage = self._has_finance_usage(db)
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

    def _seed_business_core_defaults(self, db: Session) -> None:
        profile_by_code: dict[str, BusinessFunctionProfile] = {}
        for seed in get_default_function_profile_seeds():
            item = (
                db.query(BusinessFunctionProfile)
                .filter(BusinessFunctionProfile.code == seed["code"])
                .first()
            )
            if item is None:
                item = (
                    db.query(BusinessFunctionProfile)
                    .filter(func.lower(BusinessFunctionProfile.name) == seed["name"].lower())
                    .first()
                )
            if item is None:
                item = BusinessFunctionProfile(**seed, is_active=True)
                db.add(item)
                db.flush()
            else:
                item.description = item.description or seed.get("description")
                item.sort_order = seed["sort_order"]
                item.is_active = True
            profile_by_code[seed["code"]] = item

        for seed in get_default_task_type_seeds():
            compatible_codes = seed.pop("compatible_function_profile_codes", [])
            item = (
                db.query(BusinessTaskType)
                .filter(BusinessTaskType.code == seed["code"])
                .first()
            )
            if item is None:
                item = (
                    db.query(BusinessTaskType)
                    .filter(func.lower(BusinessTaskType.name) == seed["name"].lower())
                    .first()
                )
            if item is None:
                item = BusinessTaskType(**seed, is_active=True)
                db.add(item)
                db.flush()
            else:
                item.description = item.description or seed.get("description")
                item.color = item.color or seed.get("color")
                item.icon = item.icon or seed.get("icon")
                item.sort_order = seed["sort_order"]
                item.is_active = True
            self._seed_task_type_function_profiles(
                db,
                task_type=item,
                compatible_profile_codes=compatible_codes,
                profile_by_code=profile_by_code,
            )

    def _seed_task_type_function_profiles(
        self,
        db: Session,
        *,
        task_type: BusinessTaskType,
        compatible_profile_codes: list[str],
        profile_by_code: dict[str, BusinessFunctionProfile],
    ) -> None:
        existing_profile_ids = {
            row.function_profile_id
            for row in db.query(BusinessTaskTypeFunctionProfile)
            .filter(BusinessTaskTypeFunctionProfile.task_type_id == task_type.id)
            .all()
        }
        for code in compatible_profile_codes:
            profile = profile_by_code.get(code)
            if profile is None or profile.id in existing_profile_ids:
                continue
            db.add(
                BusinessTaskTypeFunctionProfile(
                    task_type_id=task_type.id,
                    function_profile_id=profile.id,
                )
            )

    def _has_finance_usage(self, db: Session) -> bool:
        return (
            db.query(FinanceTransaction.id).first() is not None
            or db.query(FinanceBudget.id).first() is not None
            or db.query(FinanceAccount.id).first() is not None
        )

    def _normalize_enabled_modules(
        self,
        enabled_modules: list[str] | None,
    ) -> set[str]:
        if not enabled_modules:
            return {"all"}
        normalized = {item.strip().lower() for item in enabled_modules if item and item.strip()}
        return normalized or {"all"}

    @staticmethod
    def _should_seed_finance_defaults(enabled_modules: set[str]) -> bool:
        return bool({"all", "core", "finance"} & enabled_modules)

    @staticmethod
    def _should_seed_business_core_defaults(enabled_modules: set[str]) -> bool:
        return bool({"all", "core"} & enabled_modules)

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
