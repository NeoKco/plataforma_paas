import argparse
import sys
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[2]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.apps.provisioning.services.tenant_db_bootstrap_service import (  # noqa: E402
    TenantDatabaseBootstrapService,
)
from app.apps.tenant_modules.core.services.tenant_connection_service import (  # noqa: E402
    TenantConnectionService,
)
from app.common.db.control_database import ControlSessionLocal  # noqa: E402


tenant_connection_service = TenantConnectionService()
tenant_bootstrap_service = TenantDatabaseBootstrapService()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Seed default catalogs (business core + finance) for an active tenant."
    )
    parser.add_argument("--tenant-slug", required=True, help="Active tenant slug")
    parser.add_argument(
        "--modules",
        default="core,finance",
        help="Comma-separated modules to seed (default: core,finance)",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    modules = [item.strip() for item in args.modules.split(",") if item.strip()]

    control_db = ControlSessionLocal()
    try:
        tenant = tenant_connection_service.get_tenant(control_db, args.tenant_slug)
        if tenant is None:
            raise ValueError(f"Active tenant '{args.tenant_slug}' was not found")

        session_factory = tenant_connection_service.get_tenant_session(tenant)
        tenant_db = session_factory()
        try:
            tenant_bootstrap_service.seed_defaults(
                tenant_db,
                tenant_name=tenant.name,
                tenant_slug=tenant.slug,
                tenant_type=tenant.tenant_type,
                enabled_modules=modules,
            )
            tenant_db.commit()
            print(
                "Seed defaults completed for tenant={slug} modules={modules}".format(
                    slug=tenant.slug,
                    modules=",".join(modules) if modules else "all",
                )
            )
        finally:
            tenant_db.close()
    finally:
        control_db.close()


if __name__ == "__main__":
    main()
