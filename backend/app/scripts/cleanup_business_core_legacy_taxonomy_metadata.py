import argparse
import sys
from pathlib import Path

from sqlalchemy import select

BACKEND_DIR = Path(__file__).resolve().parents[2]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.apps.tenant_modules.business_core.models import (  # noqa: E402
    BusinessFunctionProfile,
    BusinessTaskType,
    BusinessWorkGroup,
)
from app.apps.tenant_modules.business_core.services.taxonomy_support import (  # noqa: E402
    strip_legacy_visible_text,
)
from app.apps.tenant_modules.core.services.tenant_connection_service import (  # noqa: E402
    TenantConnectionService,
)
from app.common.db.control_database import ControlSessionLocal  # noqa: E402


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Limpia metadatos legacy visibles en taxonomias de business-core "
            "sin tocar los codigos internos."
        )
    )
    parser.add_argument("--tenant-slug", default="empresa-bootstrap")
    parser.add_argument("--apply", action="store_true")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    control_db = ControlSessionLocal()
    tenant_connection_service = TenantConnectionService()
    try:
        tenant = tenant_connection_service.get_tenant_by_slug(control_db, args.tenant_slug)
        if tenant is None:
            raise ValueError(f"No existe tenant con slug={args.tenant_slug}")
        tenant_session_factory = tenant_connection_service.get_tenant_session(tenant)
        tenant_db = tenant_session_factory()
    finally:
        control_db.close()

    updated = {
        "function_profiles": 0,
        "work_groups": 0,
        "task_types": 0,
    }

    try:
        for model, key in (
            (BusinessFunctionProfile, "function_profiles"),
            (BusinessWorkGroup, "work_groups"),
            (BusinessTaskType, "task_types"),
        ):
            items = tenant_db.execute(select(model)).scalars().all()
            for item in items:
                cleaned_description = strip_legacy_visible_text(item.description)
                if cleaned_description != item.description:
                    item.description = cleaned_description
                    updated[key] += 1

        if args.apply:
            tenant_db.commit()
            print({"tenant_slug": args.tenant_slug, "updated": updated, "mode": "apply"})
        else:
            tenant_db.rollback()
            print({"tenant_slug": args.tenant_slug, "updated": updated, "mode": "dry-run"})
        return 0
    finally:
        tenant_db.close()


if __name__ == "__main__":
    raise SystemExit(main())
