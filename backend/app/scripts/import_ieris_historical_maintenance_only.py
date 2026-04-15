from __future__ import annotations

import json
import sys
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[2]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.common.db.control_database import ControlSessionLocal  # noqa: E402
from app.apps.tenant_modules.core.services.tenant_connection_service import (  # noqa: E402
    TenantConnectionService,
)
from app.scripts.import_ieris_business_core_maintenance import (  # noqa: E402
    assert_required_target_tables,
    fetch_legacy_source,
    import_business_core_and_maintenance,
    load_legacy_db_config,
    parse_args,
)


def main() -> int:
    args = parse_args()
    report_out = args.report_out
    report_out.parent.mkdir(parents=True, exist_ok=True)
    legacy_config = load_legacy_db_config(args)
    tenant_db = None
    try:
        legacy_data = fetch_legacy_source(legacy_config, skip_historical=False)
        legacy_data["mantenciones"] = []

        control_db = ControlSessionLocal()
        try:
            tenant_connection_service = TenantConnectionService()
            tenant = tenant_connection_service.get_tenant(control_db, args.tenant_slug)
            if tenant is None:
                raise ValueError(
                    f"No existe un tenant activo con slug='{args.tenant_slug}' para importar"
                )
            tenant_session_factory = tenant_connection_service.get_tenant_session(tenant)
        finally:
            control_db.close()

        tenant_db = tenant_session_factory()
        assert_required_target_tables(tenant_db)
        result = import_business_core_and_maintenance(
            tenant_db,
            legacy_data=legacy_data,
            actor_user_id=args.actor_user_id,
        )
        result["verification"] = {
            "mode": "best_effort",
            "note": (
                "Este wrapper se usa sobre tenants ya poblados. "
                "No aplica la verificacion estricta source==processed del importador completo "
                "porque el destino puede contener datos previos por otras corridas o copias selectivas."
            ),
        }
        if args.apply:
            tenant_db.commit()
        else:
            tenant_db.rollback()

        report = {
            "status": "ok",
            "mode": "apply" if args.apply else "dry-run",
            "scope": "historical_maintenance_only",
            "tenant_slug": args.tenant_slug,
            "legacy": {
                "app_dir": str(args.legacy_app_dir),
                "db_name": legacy_config["dbname"],
                "db_host": legacy_config["host"],
                "db_port": str(legacy_config["port"]),
            },
            "result": result,
        }
        report_out.write_text(
            json.dumps(report, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )
        print(json.dumps(report, indent=2, ensure_ascii=False))
        return 0
    except Exception as exc:  # pragma: no cover - operational script
        if tenant_db is not None:
            tenant_db.rollback()
        error_report = {
            "status": "error",
            "scope": "historical_maintenance_only",
            "tenant_slug": args.tenant_slug,
            "error": str(exc),
        }
        report_out.write_text(
            json.dumps(error_report, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )
        print(json.dumps(error_report, indent=2, ensure_ascii=False))
        return 1
    finally:
        if tenant_db is not None:
            tenant_db.close()


if __name__ == "__main__":
    raise SystemExit(main())
