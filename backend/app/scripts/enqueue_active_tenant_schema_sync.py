import argparse
import sys
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[2]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.apps.platform_control.services.tenant_service import TenantService
from app.common.db.control_database import ControlSessionLocal


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Queue sync_tenant_schema jobs for active tenants with DB configured."
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=100,
        help="Maximum number of sync jobs to queue in this run.",
    )
    args = parser.parse_args()

    db = ControlSessionLocal()
    try:
        result = TenantService().request_bulk_tenant_schema_sync(
            db=db,
            limit=args.limit,
        )
    finally:
        db.close()

    print(
        "Queued {queued_jobs} schema sync jobs "
        "(eligible={eligible_tenants}, total={total_tenants}, "
        "skipped_live={skipped_live_jobs}, skipped_not_configured={skipped_not_configured}, "
        "skipped_invalid_credentials={skipped_invalid_credentials}).".format(**result)
    )
    if result["data"]:
        print(
            "Tenants queued: {items}".format(
                items=", ".join(
                    f"{item['tenant_slug']}#{item['job_id']}" for item in result["data"]
                )
            )
        )


if __name__ == "__main__":
    main()
