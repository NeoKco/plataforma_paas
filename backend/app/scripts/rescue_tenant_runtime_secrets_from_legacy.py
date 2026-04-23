from __future__ import annotations

import argparse
import sys
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[2]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.apps.platform_control.models.tenant import Tenant  # noqa: E402
from app.apps.platform_control.services.tenant_service import TenantService  # noqa: E402
from app.common.config.settings import settings  # noqa: E402
from app.common.db.control_database import ControlSessionLocal  # noqa: E402


tenant_service = TenantService()


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=(
            "Rescata de forma controlada secretos DB tenant desde el `.env` legacy "
            "hacia `TENANT_SECRETS_FILE` cuando el carril runtime aún está incompleto."
        )
    )
    target_group = parser.add_mutually_exclusive_group(required=True)
    target_group.add_argument("--tenant-slug", help="Slug de tenant único")
    target_group.add_argument(
        "--all-active",
        action="store_true",
        help="Incluye todos los tenants activos configurados",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=100,
        help="Máximo de tenants cuando se usa --all-active",
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Aplica el rescate. Por defecto solo audita",
    )
    return parser


def _build_query(control_db, args: argparse.Namespace):
    query = control_db.query(Tenant)
    if args.tenant_slug:
        query = query.filter(Tenant.slug == args.tenant_slug)
    else:
        query = query.filter(Tenant.status == "active")
    query = query.filter(
        Tenant.db_name.isnot(None),
        Tenant.db_user.isnot(None),
        Tenant.db_host.isnot(None),
        Tenant.db_port.isnot(None),
    )
    return query.order_by(Tenant.slug.asc())


def main() -> int:
    args = build_parser().parse_args()
    control_db = ControlSessionLocal()
    try:
        query = _build_query(control_db, args)
        if args.all_active:
            query = query.limit(args.limit)
        tenants = query.all()

        processed = 0
        rescued = 0
        skipped = 0
        failed = 0

        for tenant in tenants:
            processed += 1
            distribution = tenant_service.tenant_secret_service.describe_tenant_db_secret_distribution(
                tenant.slug,
                settings,
            )
            if not distribution["legacy_rescue_available"]:
                skipped += 1
                print(
                    f"[SKIP] {tenant.slug}: "
                    f"runtime_secret_present={distribution['runtime_secret_present']} "
                    f"legacy_secret_present={distribution['legacy_secret_present']}"
                )
                continue

            if not args.apply:
                print(
                    f"[AUDIT] {tenant.slug}: "
                    f"legacy_secret_present={distribution['legacy_secret_present']} "
                    f"runtime_secret_present={distribution['runtime_secret_present']}"
                )
                continue

            try:
                result = tenant_service.sync_tenant_runtime_secret(
                    db=control_db,
                    tenant_id=tenant.id,
                    allow_legacy_rescue=True,
                )
                control_db.commit()
            except Exception as exc:  # pragma: no cover - salida CLI
                control_db.rollback()
                failed += 1
                print(f"[FAIL] {tenant.slug}: {exc}")
                continue

            rescued += 1
            print(
                f"[OK] {tenant.slug}: "
                f"env_var={result['env_var_name']} "
                f"source={result['source']} "
                f"managed_secret_path={result['managed_secret_path']}"
            )

        print(
            "Legacy runtime secret rescue summary: "
            f"processed={processed}, rescued={rescued}, skipped={skipped}, failed={failed}, "
            f"mode={'apply' if args.apply else 'audit'}"
        )
        return 1 if failed else 0
    finally:
        control_db.close()


if __name__ == "__main__":
    raise SystemExit(main())
