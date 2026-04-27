import argparse
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[2]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.apps.tenant_modules.core.services.tenant_connection_service import (  # noqa: E402
    TenantConnectionService,
)
from app.common.db.control_database import ControlSessionLocal  # noqa: E402
from app.common.db.migration_service import run_tenant_migrations  # noqa: E402


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run pending tenant migrations only for the requested tenant slug."
    )
    parser.add_argument("--tenant-slug", required=True)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    db = ControlSessionLocal()
    try:
        service = TenantConnectionService()
        tenant = service.get_tenant(db, args.tenant_slug)
        if tenant is None:
            raise ValueError(f"No existe un tenant activo con slug='{args.tenant_slug}'")
        creds = service.get_tenant_database_credentials(tenant)
    finally:
        db.close()

    applied = run_tenant_migrations(
        host=creds["host"],
        port=creds["port"],
        database=creds["database"],
        username=creds["username"],
        password=creds["password"],
    )
    print(applied)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
