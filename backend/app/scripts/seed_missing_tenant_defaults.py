import argparse
import sys
from pathlib import Path

from sqlalchemy import func


BACKEND_DIR = Path(__file__).resolve().parents[2]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.apps.platform_control.models.tenant import Tenant  # noqa: E402
from app.apps.provisioning.services.tenant_db_bootstrap_service import (  # noqa: E402
    TenantDatabaseBootstrapService,
)
from app.apps.tenant_modules.business_core.default_catalog_profiles import (  # noqa: E402
    DEFAULT_FUNCTION_PROFILE_SEEDS,
    DEFAULT_TASK_TYPE_SEEDS,
)
from app.apps.tenant_modules.business_core.models.function_profile import (  # noqa: E402
    BusinessFunctionProfile,
)
from app.apps.tenant_modules.business_core.models.task_type import (  # noqa: E402
    BusinessTaskType,
)
from app.apps.tenant_modules.finance.models.category import FinanceCategory  # noqa: E402
from app.apps.tenant_modules.finance.models.currency import FinanceCurrency  # noqa: E402
from app.apps.tenant_modules.finance.models.settings import FinanceSetting  # noqa: E402
from app.apps.tenant_modules.finance.models.transaction import FinanceTransaction  # noqa: E402
from app.apps.tenant_modules.finance.models.budget import FinanceBudget  # noqa: E402
from app.apps.tenant_modules.finance.models.account import FinanceAccount  # noqa: E402
from app.apps.tenant_modules.core.services.tenant_connection_service import (  # noqa: E402
    TenantConnectionService,
)
from app.common.db.control_database import ControlSessionLocal  # noqa: E402


tenant_connection_service = TenantConnectionService()
tenant_bootstrap_service = TenantDatabaseBootstrapService()


DEFAULT_PROFILE_CODES = {item["code"] for item in DEFAULT_FUNCTION_PROFILE_SEEDS}
DEFAULT_TASK_CODES = {item["code"] for item in DEFAULT_TASK_TYPE_SEEDS}
DEFAULT_FINANCE_SENTINELS = {
    "Ingreso General",
    "Mantenciones y servicios",
    "Casa - Alimentacion",
    "Empresa - Alimentacion",
}

LEGACY_FINANCE_BASE_CURRENCY_NOTE_PREFIX = "legacy_finance_base_currency"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Seed missing default catalogs for tenants that lack core/finance baselines."
    )
    parser.add_argument("--apply", action="store_true", help="Apply changes")
    parser.add_argument(
        "--include-archived",
        action="store_true",
        help="Include archived tenants",
    )
    parser.add_argument("--tenant-slug", help="Run for a single tenant")
    parser.add_argument(
        "--force-finance",
        action="store_true",
        help="Force finance seed even if categories exist and no usage",
    )
    return parser.parse_args()


def _has_finance_usage(db) -> bool:
    return (
        db.query(FinanceTransaction.id).first() is not None
        or db.query(FinanceBudget.id).first() is not None
        or db.query(FinanceAccount.id).first() is not None
    )


def _needs_core_seed(db) -> bool:
    profile_codes = {
        row[0]
        for row in db.query(BusinessFunctionProfile.code)
        .filter(BusinessFunctionProfile.code.isnot(None))
        .all()
    }
    task_codes = {
        row[0]
        for row in db.query(BusinessTaskType.code)
        .filter(BusinessTaskType.code.isnot(None))
        .all()
    }
    missing_profiles = DEFAULT_PROFILE_CODES - {code.strip().lower() for code in profile_codes}
    missing_tasks = DEFAULT_TASK_CODES - {code.strip().lower() for code in task_codes}
    return bool(missing_profiles or missing_tasks)


def get_finance_defaults_status(db, *, force: bool) -> dict[str, str | bool | None]:
    has_usage = _has_finance_usage(db)
    categories = db.query(FinanceCategory).all()
    category_names = {item.name.strip() for item in categories}
    missing_sentinel = not DEFAULT_FINANCE_SENTINELS.intersection(category_names)
    clp = (
        db.query(FinanceCurrency)
        .filter(func.upper(FinanceCurrency.code) == "CLP")
        .first()
    )
    base_setting = (
        db.query(FinanceSetting)
        .filter(FinanceSetting.setting_key == "base_currency_code")
        .first()
    )
    clp_ok = clp is not None and clp.is_active
    base_currency_code = (
        base_setting.setting_value.strip().upper()
        if base_setting is not None and base_setting.setting_value
        else None
    )
    base_ok = base_currency_code == "CLP"

    if has_usage:
        if missing_sentinel or not clp_ok:
            return {
                "needs_seed": True,
                "seed_reason": "usage",
                "audit_note": None,
            }
        if not base_ok:
            return {
                "needs_seed": False,
                "seed_reason": "legacy_base_currency_with_usage",
                "audit_note": (
                    f"{LEGACY_FINANCE_BASE_CURRENCY_NOTE_PREFIX}:{base_currency_code or 'unknown'}"
                ),
            }
        return {
            "needs_seed": False,
            "seed_reason": "usage_complete",
            "audit_note": None,
        }

    if categories and not force:
        return {
            "needs_seed": False,
            "seed_reason": "skip_categories_no_usage",
            "audit_note": None,
        }

    return {
        "needs_seed": (missing_sentinel or not clp_ok or not base_ok or not categories),
        "seed_reason": "no_usage",
        "audit_note": None,
    }


def _needs_finance_seed(db, *, force: bool) -> tuple[bool, str]:
    status = get_finance_defaults_status(db, force=force)
    return bool(status["needs_seed"]), str(status["seed_reason"])


def main() -> int:
    args = parse_args()
    control_db = ControlSessionLocal()
    try:
        query = control_db.query(Tenant)
        if args.tenant_slug:
            query = query.filter(Tenant.slug == args.tenant_slug)
        elif args.include_archived:
            pass
        else:
            query = query.filter(Tenant.status == "active")
        tenants = query.order_by(Tenant.slug.asc()).all()

        processed = 0
        changed = 0
        failed = 0

        for tenant in tenants:
            processed += 1
            try:
                session_factory = tenant_connection_service.get_tenant_session(tenant)
                if session_factory is None:
                    print(f"{tenant.slug}: skip (no tenant db)")
                    continue

                tenant_db = session_factory()
                try:
                    modules: list[str] = []
                    if _needs_core_seed(tenant_db):
                        modules.append("core")

                    finance_needed, finance_reason = _needs_finance_seed(
                        tenant_db, force=args.force_finance
                    )
                    if finance_needed:
                        modules.append("finance")

                    if not modules:
                        print(f"{tenant.slug}: ok (no missing defaults)")
                        continue

                    if not args.apply:
                        print(f"{tenant.slug}: would seed -> {','.join(modules)}")
                        changed += 1
                        continue

                    tenant_bootstrap_service.seed_defaults(
                        tenant_db,
                        tenant_name=tenant.name,
                        tenant_slug=tenant.slug,
                        tenant_type=tenant.tenant_type,
                        enabled_modules=modules,
                    )
                    tenant_db.commit()
                    changed += 1
                    print(
                        f"{tenant.slug}: seeded {','.join(modules)} (finance_reason={finance_reason})"
                    )
                finally:
                    tenant_db.close()
            except Exception as exc:  # pragma: no cover - operational fallback
                failed += 1
                print(f"{tenant.slug}: failed ({exc})")

        print(
            "Tenant defaults seed summary: processed={processed}, changed={changed}, "
            "failed={failed}, apply={apply}".format(
                processed=processed,
                changed=changed,
                failed=failed,
                apply=args.apply,
            )
        )
        return 0 if failed == 0 else 1
    finally:
        control_db.close()


if __name__ == "__main__":
    raise SystemExit(main())
