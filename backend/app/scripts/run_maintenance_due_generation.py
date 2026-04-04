import argparse
import sys
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[2]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.apps.tenant_modules.core.services.tenant_connection_service import (  # noqa: E402
    TenantConnectionService,
)
from app.apps.tenant_modules.maintenance.services import MaintenanceDueItemService  # noqa: E402
from app.common.db.control_database import ControlSessionLocal  # noqa: E402


tenant_connection_service = TenantConnectionService()
due_item_service = MaintenanceDueItemService()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate maintenance due items for an active tenant."
    )
    parser.add_argument("--tenant-slug", required=True, help="Active tenant slug")
    return parser.parse_args()


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
            generated = due_item_service.generate_due_items(tenant_db)
            print(
                "Maintenance due generation completed for tenant={slug}: generated_or_updated={count}".format(
                    slug=args.tenant_slug,
                    count=len(generated),
                )
            )
        finally:
            tenant_db.close()
    finally:
        control_db.close()


if __name__ == "__main__":
    main()
