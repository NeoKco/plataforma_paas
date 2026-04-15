from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[2]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.apps.tenant_modules.business_core.models.client import BusinessClient  # noqa: E402
from app.apps.tenant_modules.business_core.models.organization import (  # noqa: E402
    BusinessOrganization,
)
from app.apps.tenant_modules.business_core.models.site import BusinessSite  # noqa: E402
from app.apps.tenant_modules.core.services.tenant_connection_service import (  # noqa: E402
    TenantConnectionService,
)
from app.apps.tenant_modules.maintenance.models.work_order import (  # noqa: E402
    MaintenanceWorkOrder,
)
from app.common.db.control_database import ControlSessionLocal  # noqa: E402


LEGACY_PREFIX = "LEGACY-HIST-MAINT-"
FINAL_STATUSES = {"completed", "cancelled"}


@dataclass
class DuplicatePair:
    legacy_id: int
    legacy_reference: str | None
    legacy_title: str
    kept_work_order_id: int
    kept_title: str
    client: str
    address: str
    closed_date: str | None

    def as_dict(self) -> dict[str, str | int | None]:
        return {
            "legacy_id": self.legacy_id,
            "legacy_reference": self.legacy_reference,
            "legacy_title": self.legacy_title,
            "kept_work_order_id": self.kept_work_order_id,
            "kept_title": self.kept_title,
            "client": self.client,
            "address": self.address,
            "closed_date": self.closed_date,
        }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Remove duplicate legacy historical maintenance work orders when a non-legacy "
            "work order already exists for the same client, address and close date."
        )
    )
    parser.add_argument("--tenant-slug", required=True)
    parser.add_argument("--apply", action="store_true")
    return parser.parse_args()


def _normalize(value: str | None) -> str:
    return " ".join((value or "").strip().casefold().split())


def _client_name(
    item: MaintenanceWorkOrder,
    *,
    clients: dict[int, BusinessClient],
    organizations: dict[int, BusinessOrganization],
) -> str:
    client = clients.get(item.client_id)
    if client is None:
        return ""
    organization = organizations.get(client.organization_id)
    return organization.name if organization is not None else ""


def _address_label(item: MaintenanceWorkOrder, *, sites: dict[int, BusinessSite]) -> str:
    site = sites.get(item.site_id)
    if site is None:
        return ""
    parts = [site.name, site.address_line, site.commune, site.city]
    return " | ".join(str(part).strip() for part in parts if part and str(part).strip())


def _closed_date(item: MaintenanceWorkOrder) -> str | None:
    closed_at = item.completed_at or item.cancelled_at
    return closed_at.date().isoformat() if closed_at is not None else None


def _build_key(
    item: MaintenanceWorkOrder,
    *,
    clients: dict[int, BusinessClient],
    organizations: dict[int, BusinessOrganization],
    sites: dict[int, BusinessSite],
) -> tuple[str, str, str | None]:
    return (
        _normalize(_client_name(item, clients=clients, organizations=organizations)),
        _normalize(_address_label(item, sites=sites)),
        _closed_date(item),
    )


def main() -> int:
    args = parse_args()
    control_db = ControlSessionLocal()
    try:
        connection_service = TenantConnectionService()
        tenant = connection_service.get_tenant_by_slug(control_db, args.tenant_slug)
        if tenant is None:
            print(json.dumps({"status": "error", "error": f"tenant not found: {args.tenant_slug}"}))
            return 1
        session_factory = connection_service.get_tenant_session(tenant)
        if session_factory is None:
            print(
                json.dumps(
                    {"status": "error", "error": f"tenant has no DB session: {args.tenant_slug}"}
                )
            )
            return 1

        tenant_db = session_factory()
        try:
            organizations = {
                item.id: item
                for item in tenant_db.query(BusinessOrganization).all()
            }
            clients = {
                item.id: item
                for item in tenant_db.query(BusinessClient).all()
            }
            sites = {
                item.id: item
                for item in tenant_db.query(BusinessSite).all()
            }
            work_orders = [
                item
                for item in tenant_db.query(MaintenanceWorkOrder).all()
                if item.maintenance_status in FINAL_STATUSES
            ]
            legacy_items = [
                item for item in work_orders if (item.external_reference or "").startswith(LEGACY_PREFIX)
            ]
            non_legacy_items = [
                item for item in work_orders if not (item.external_reference or "").startswith(LEGACY_PREFIX)
            ]

            non_legacy_by_key: dict[tuple[str, str, str | None], list[MaintenanceWorkOrder]] = {}
            for item in non_legacy_items:
                key = _build_key(item, clients=clients, organizations=organizations, sites=sites)
                non_legacy_by_key.setdefault(key, []).append(item)

            duplicates: list[DuplicatePair] = []
            for item in legacy_items:
                key = _build_key(item, clients=clients, organizations=organizations, sites=sites)
                matches = non_legacy_by_key.get(key, [])
                if not matches:
                    continue
                kept = sorted(matches, key=lambda row: row.id)[0]
                duplicates.append(
                    DuplicatePair(
                        legacy_id=item.id,
                        legacy_reference=item.external_reference,
                        legacy_title=item.title,
                        kept_work_order_id=kept.id,
                        kept_title=kept.title,
                        client=_client_name(item, clients=clients, organizations=organizations),
                        address=_address_label(item, sites=sites),
                        closed_date=_closed_date(item),
                    )
                )

            if args.apply and duplicates:
                duplicate_ids = {item.legacy_id for item in duplicates}
                rows_to_delete = (
                    tenant_db.query(MaintenanceWorkOrder)
                    .filter(MaintenanceWorkOrder.id.in_(duplicate_ids))
                    .all()
                )
                for row in rows_to_delete:
                    tenant_db.delete(row)
                tenant_db.commit()
            else:
                tenant_db.rollback()

            summary = {
                "status": "ok",
                "mode": "apply" if args.apply else "dry_run",
                "tenant_slug": args.tenant_slug,
                "duplicates_detected": len(duplicates),
                "duplicates_deleted": len(duplicates) if args.apply else 0,
                "duplicates": [item.as_dict() for item in duplicates],
            }
            print(json.dumps(summary, ensure_ascii=False, indent=2))
            return 0
        except Exception:
            tenant_db.rollback()
            raise
        finally:
            tenant_db.close()
    finally:
        control_db.close()


if __name__ == "__main__":
    raise SystemExit(main())
