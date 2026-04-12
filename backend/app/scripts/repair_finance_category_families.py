import argparse
import sys
from pathlib import Path

from sqlalchemy import func


BACKEND_DIR = Path(__file__).resolve().parents[2]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.apps.tenant_modules.core.services.tenant_connection_service import (  # noqa: E402
    TenantConnectionService,
)
from app.apps.tenant_modules.finance.default_category_profiles import (  # noqa: E402
    FAMILY_CATEGORY_SEEDS,
    get_finance_family_name_by_type,
)
from app.apps.tenant_modules.finance.models.category import FinanceCategory  # noqa: E402
from app.common.db.control_database import ControlSessionLocal  # noqa: E402


tenant_connection_service = TenantConnectionService()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Ensure finance categories have parent families per type."
    )
    parser.add_argument("--tenant-slug", required=True, help="Active tenant slug")
    parser.add_argument("--apply", action="store_true", help="Apply changes")
    return parser.parse_args()


def _ensure_families(db) -> dict[str, FinanceCategory]:
    family_by_type: dict[str, FinanceCategory] = {}
    for seed in FAMILY_CATEGORY_SEEDS:
        existing = (
            db.query(FinanceCategory)
            .filter(func.lower(FinanceCategory.name) == seed["name"].lower())
            .filter(FinanceCategory.category_type == seed["category_type"])
            .first()
        )
        if existing is None:
            existing = FinanceCategory(
                name=seed["name"],
                category_type=seed["category_type"],
                icon=seed.get("icon"),
                note=seed.get("note"),
                sort_order=seed.get("sort_order", 1),
                is_active=True,
            )
            db.add(existing)
            db.flush()
        else:
            existing.is_active = True
        family_by_type[seed["category_type"].strip().lower()] = existing
    return family_by_type


def repair(db) -> int:
    family_by_type = _ensure_families(db)
    updated = 0
    categories = db.query(FinanceCategory).all()
    for category in categories:
        if category.parent_category_id is not None:
            continue
        family_name = get_finance_family_name_by_type(category.category_type)
        if category.name.strip().lower() == family_name.lower():
            continue
        parent = family_by_type.get(category.category_type.strip().lower())
        if parent is None:
            continue
        category.parent_category_id = parent.id
        updated += 1
    return updated


def main() -> None:
    args = parse_args()
    control_db = ControlSessionLocal()
    try:
        tenant = tenant_connection_service.get_tenant(control_db, args.tenant_slug)
        if tenant is None:
            raise ValueError(f"Active tenant '{args.tenant_slug}' was not found")
        session_factory = tenant_connection_service.get_tenant_session(tenant)
        tenant_db = session_factory()
        try:
            updated = repair(tenant_db)
            if args.apply:
                tenant_db.commit()
                print(f"{tenant.slug}: updated_categories={updated}")
            else:
                tenant_db.rollback()
                print(f"{tenant.slug}: would_update_categories={updated}")
        finally:
            tenant_db.close()
    finally:
        control_db.close()


if __name__ == "__main__":
    main()
