import argparse
import sys
from pathlib import Path

from sqlalchemy import or_
from sqlalchemy.orm import Session


BACKEND_DIR = Path(__file__).resolve().parents[2]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.apps.tenant_modules.business_core.models import (  # noqa: E402
    BusinessClient,
    BusinessOrganization,
)
from app.apps.tenant_modules.core.services.tenant_connection_service import (  # noqa: E402
    TenantConnectionService,
)
from app.apps.tenant_modules.finance.models.transaction import FinanceTransaction  # noqa: E402
from app.apps.tenant_modules.maintenance.models.work_order import (  # noqa: E402
    MaintenanceWorkOrder,
)
from app.common.db.control_database import ControlSessionLocal  # noqa: E402


tenant_connection_service = TenantConnectionService()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Normalize finance transaction descriptions for maintenance syncs "
            "(Ingreso/Egreso mantención #id · trabajo · cliente)."
        )
    )
    parser.add_argument("--tenant-slug", required=True, help="Active tenant slug")
    parser.add_argument("--apply", action="store_true", help="Apply changes")
    parser.add_argument("--limit", type=int, default=0, help="Limit number of rows to scan")
    return parser.parse_args()


def _build_label(db: Session, work_order: MaintenanceWorkOrder) -> str | None:
    client_label = None
    if work_order.client_id:
        client = (
            db.query(BusinessClient)
            .filter(BusinessClient.id == work_order.client_id)
            .first()
        )
        if client is not None and client.organization_id:
            organization = (
                db.query(BusinessOrganization)
                .filter(BusinessOrganization.id == client.organization_id)
                .first()
            )
            if organization is not None and organization.name:
                client_label = organization.name
    if not client_label:
        return None
    return " · ".join([f"#{work_order.id}", work_order.title, client_label])


def normalize_glosas(db: Session, apply: bool, limit: int) -> None:
    query = db.query(FinanceTransaction).filter(
        FinanceTransaction.source_type.in_(
            [
                "maintenance_work_order_income",
                "maintenance_work_order_expense",
            ]
        ),
        FinanceTransaction.source_id.isnot(None),
    )
    if limit > 0:
        query = query.limit(limit)
    rows = query.all()

    updated = 0
    skipped_missing_work_order = 0
    skipped_missing_client = 0
    unchanged = 0

    for tx in rows:
        work_order = (
            db.query(MaintenanceWorkOrder)
            .filter(MaintenanceWorkOrder.id == tx.source_id)
            .first()
        )
        if work_order is None:
            skipped_missing_work_order += 1
            continue
        label = _build_label(db, work_order)
        if not label:
            skipped_missing_client += 1
            continue
        prefix = "Ingreso mantención" if tx.transaction_type == "income" else "Egreso mantención"
        expected = f"{prefix} {label}"
        if tx.description == expected:
            unchanged += 1
            continue
        tx.description = expected
        updated += 1

    print(f"transactions scanned: {len(rows)}")
    print(f"updated: {updated}")
    print(f"unchanged: {unchanged}")
    print(f"skipped_missing_work_order: {skipped_missing_work_order}")
    print(f"skipped_missing_client: {skipped_missing_client}")

    if apply:
        db.commit()
        print("Changes applied.")
    else:
        db.rollback()
        print("Dry-run completed. Use --apply to persist.")


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
            normalize_glosas(tenant_db, args.apply, args.limit)
        finally:
            tenant_db.close()
    finally:
        control_db.close()


if __name__ == "__main__":
    main()
