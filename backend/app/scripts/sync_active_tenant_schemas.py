import argparse
import sys
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[2]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.apps.platform_control.repositories.tenant_repository import TenantRepository
from app.apps.platform_control.services.tenant_service import TenantService
from app.common.db.control_database import ControlSessionLocal


tenant_repository = TenantRepository()
tenant_service = TenantService()


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Synchronize tenant schemas immediately for active tenants."
    )
    parser.add_argument(
        "--slug",
        action="append",
        dest="slugs",
        help="Restrict the sync to one or more tenant slugs.",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=100,
        help="Maximum number of active tenants to process in this run.",
    )
    args = parser.parse_args()

    requested_slugs = {slug.strip() for slug in (args.slugs or []) if slug and slug.strip()}
    normalized_limit = max(min(args.limit, 500), 1)

    db = ControlSessionLocal()
    try:
        tenants = tenant_repository.list_all(db)
        processed = 0
        synced = 0
        skipped = 0
        failed = 0
        lines: list[str] = []

        for tenant in tenants:
            if tenant.status != "active":
                continue
            if requested_slugs and tenant.slug not in requested_slugs:
                continue
            if processed >= normalized_limit:
                break

            processed += 1
            try:
                synced_tenant = tenant_service.sync_tenant_schema(db=db, tenant_id=tenant.id)
                synced += 1
                lines.append(
                    f"- {synced_tenant.slug}: synced -> {synced_tenant.tenant_schema_version or 'unknown'}"
                )
            except ValueError as exc:
                skipped += 1
                lines.append(f"- {tenant.slug}: skipped ({exc})")
            except Exception as exc:  # pragma: no cover - operational fallback
                failed += 1
                lines.append(f"- {tenant.slug}: failed ({exc})")

        print(
            "Tenant schema sync completed: processed={processed}, synced={synced}, "
            "skipped={skipped}, failed={failed}".format(
                processed=processed,
                synced=synced,
                skipped=skipped,
                failed=failed,
            )
        )
        for line in lines:
            print(line)
    finally:
        db.close()


if __name__ == "__main__":
    main()
