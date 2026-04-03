import argparse
import json
import sys
from pathlib import Path

from sqlalchemy import or_

BACKEND_DIR = Path(__file__).resolve().parents[2]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.apps.tenant_modules.business_core.models import BusinessSite  # noqa: E402
from app.apps.tenant_modules.core.services.tenant_connection_service import (  # noqa: E402
    TenantConnectionService,
)
from app.common.db.control_database import ControlSessionLocal  # noqa: E402


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Limpia notas de referencia legacy visibles para el usuario en "
            "business_sites. Dry-run por defecto."
        )
    )
    parser.add_argument("--tenant-slug", default="empresa-bootstrap")
    parser.add_argument(
        "--report-out",
        type=Path,
        default=Path(
            "/home/felipe/platform_paas/tmp/business_core_legacy_site_notes_cleanup.json"
        ),
    )
    parser.add_argument("--apply", action="store_true")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    args.report_out.parent.mkdir(parents=True, exist_ok=True)

    control_db = None
    tenant_db = None
    try:
        control_db = ControlSessionLocal()
        tenant_connection_service = TenantConnectionService()
        tenant = tenant_connection_service.get_tenant(control_db, args.tenant_slug)
        if tenant is None:
            raise ValueError(f"No existe un tenant activo con slug='{args.tenant_slug}'")

        tenant_session_factory = tenant_connection_service.get_tenant_session(tenant)
        tenant_db = tenant_session_factory()

        sites = (
            tenant_db.query(BusinessSite)
            .filter(
                or_(
                    BusinessSite.reference_notes.ilike("%legacy_client_id=%"),
                    BusinessSite.reference_notes.ilike("%legacy_codigo_postal=%"),
                )
            )
            .order_by(BusinessSite.id.asc())
            .all()
        )

        site_ids = [site.id for site in sites]
        for site in sites:
            site.reference_notes = None

        if args.apply:
            tenant_db.commit()
        else:
            tenant_db.rollback()

        report = {
            "mode": "apply" if args.apply else "dry-run",
            "tenant_slug": args.tenant_slug,
            "matched_sites": len(site_ids),
            "site_ids": site_ids,
        }
        args.report_out.write_text(
            json.dumps(report, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )
        print(json.dumps(report, indent=2, ensure_ascii=False))
        return 0
    except Exception as exc:
        if tenant_db is not None:
            tenant_db.rollback()
        report = {
            "mode": "apply" if args.apply else "dry-run",
            "tenant_slug": args.tenant_slug,
            "status": "error",
            "error": str(exc),
        }
        args.report_out.write_text(
            json.dumps(report, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )
        print(json.dumps(report, indent=2, ensure_ascii=False))
        return 1
    finally:
        if tenant_db is not None:
            tenant_db.close()
        if control_db is not None:
            control_db.close()


if __name__ == "__main__":
    raise SystemExit(main())
