from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[3]
BACKEND_ROOT = PROJECT_ROOT / "backend"
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

os.environ.setdefault("APP_ENV", "development")

from app.apps.tenant_modules.products.services.connector_scheduler_service import (  # noqa: E402
    ProductConnectorSchedulerService,
)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Run scheduled products refresh runs for active tenants.",
    )
    parser.add_argument("--tenant-slug", help="Run scheduler only for the given tenant.")
    parser.add_argument(
        "--tenant-limit",
        type=int,
        default=100,
        help="Maximum number of active tenants to inspect.",
    )
    parser.add_argument(
        "--connector-limit",
        type=int,
        default=20,
        help="Maximum number of due connectors to launch per tenant.",
    )
    args = parser.parse_args()

    service = ProductConnectorSchedulerService()
    summary = service.run_due_connector_schedules_across_active_tenants(
        tenant_slug=args.tenant_slug,
        tenant_limit=args.tenant_limit,
        connector_limit_per_tenant=args.connector_limit,
    )
    print(
        "Products refresh scheduler summary: "
        f"processed_tenants={summary['processed_tenants']}, "
        f"launched_runs={summary['launched_runs']}, "
        f"skipped_tenants={summary['skipped_tenants']}, "
        f"failed_tenants={summary['failed_tenants']}"
    )
    for tenant_row in summary["tenants"]:
        print(tenant_row)
    return 0 if not summary["failed_tenants"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
