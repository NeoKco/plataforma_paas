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
from app.apps.tenant_modules.business_core.models.work_group import (  # noqa: E402
    BusinessWorkGroup,
)
from app.apps.tenant_modules.core.services.tenant_connection_service import (  # noqa: E402
    TenantConnectionService,
)
from app.apps.tenant_modules.maintenance.models.equipment_type import (  # noqa: E402
    MaintenanceEquipmentType,
)
from app.common.db.control_database import ControlSessionLocal  # noqa: E402


@dataclass
class SyncCounters:
    created: int = 0
    updated: int = 0
    unchanged: int = 0

    def as_dict(self) -> dict[str, int]:
        return {
            "created": self.created,
            "updated": self.updated,
            "unchanged": self.unchanged,
        }


ORGANIZATION_FIELDS = (
    "name",
    "legal_name",
    "tax_id",
    "organization_kind",
    "phone",
    "email",
    "address_line",
    "commune",
    "city",
    "region",
    "country_code",
    "notes",
    "is_active",
    "sort_order",
)
CLIENT_FIELDS = (
    "client_code",
    "service_status",
    "commercial_notes",
    "is_active",
    "sort_order",
)
WORK_GROUP_FIELDS = (
    "code",
    "name",
    "description",
    "group_kind",
    "is_active",
    "sort_order",
)
EQUIPMENT_TYPE_FIELDS = (
    "code",
    "name",
    "description",
    "is_active",
    "sort_order",
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Copy selected business-core and maintenance catalogs from one tenant "
            "to another using natural-key upsert semantics."
        )
    )
    parser.add_argument("--source-tenant", required=True, help="Source tenant slug")
    parser.add_argument("--target-tenant", required=True, help="Target tenant slug")
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Persist changes. Dry-run is the default.",
    )
    return parser.parse_args()


def _normalize(value):
    if isinstance(value, str):
        return value.strip()
    return value


def _copy_fields(source, target, fields: tuple[str, ...]) -> bool:
    changed = False
    for field in fields:
        source_value = _normalize(getattr(source, field))
        target_value = _normalize(getattr(target, field))
        if source_value != target_value:
            setattr(target, field, getattr(source, field))
            changed = True
    return changed


def _find_organization_match(
    source_org: BusinessOrganization,
    target_orgs: list[BusinessOrganization],
) -> BusinessOrganization | None:
    if source_org.name:
        for item in target_orgs:
            if _normalize(item.name) == _normalize(source_org.name):
                return item
    if source_org.tax_id:
        matches = [
            item
            for item in target_orgs
            if _normalize(item.tax_id) and _normalize(item.tax_id) == _normalize(source_org.tax_id)
        ]
        if len(matches) == 1:
            return matches[0]
    return None


def _find_by_code_or_name(source_item, target_items):
    source_code = _normalize(getattr(source_item, "code", None))
    source_name = _normalize(getattr(source_item, "name", None))
    if source_code:
        for item in target_items:
            if _normalize(getattr(item, "code", None)) == source_code:
                return item
    if source_name:
        for item in target_items:
            if _normalize(getattr(item, "name", None)) == source_name:
                return item
    return None


def sync_organizations(source_db, target_db) -> tuple[SyncCounters, dict[int, int]]:
    counters = SyncCounters()
    organization_id_map: dict[int, int] = {}
    source_orgs = (
        source_db.query(BusinessOrganization)
        .order_by(BusinessOrganization.id.asc())
        .all()
    )
    target_orgs = target_db.query(BusinessOrganization).all()
    for source_org in source_orgs:
        target_org = _find_organization_match(source_org, target_orgs)
        if target_org is None:
            target_org = BusinessOrganization()
            _copy_fields(source_org, target_org, ORGANIZATION_FIELDS)
            target_db.add(target_org)
            target_db.flush()
            target_orgs.append(target_org)
            counters.created += 1
        else:
            if _copy_fields(source_org, target_org, ORGANIZATION_FIELDS):
                counters.updated += 1
            else:
                counters.unchanged += 1
        organization_id_map[source_org.id] = target_org.id
    return counters, organization_id_map


def sync_clients(source_db, target_db, organization_id_map: dict[int, int]) -> SyncCounters:
    counters = SyncCounters()
    source_clients = (
        source_db.query(BusinessClient)
        .order_by(BusinessClient.id.asc())
        .all()
    )
    target_clients = target_db.query(BusinessClient).all()
    target_by_org_id = {item.organization_id: item for item in target_clients}
    for source_client in source_clients:
        target_org_id = organization_id_map.get(source_client.organization_id)
        if target_org_id is None:
            continue
        target_client = target_by_org_id.get(target_org_id)
        if target_client is None:
            target_client = BusinessClient(organization_id=target_org_id)
            _copy_fields(source_client, target_client, CLIENT_FIELDS)
            target_db.add(target_client)
            target_db.flush()
            target_by_org_id[target_org_id] = target_client
            counters.created += 1
        else:
            if _copy_fields(source_client, target_client, CLIENT_FIELDS):
                counters.updated += 1
            else:
                counters.unchanged += 1
    return counters


def sync_work_groups(source_db, target_db) -> SyncCounters:
    counters = SyncCounters()
    source_items = (
        source_db.query(BusinessWorkGroup)
        .order_by(BusinessWorkGroup.id.asc())
        .all()
    )
    target_items = target_db.query(BusinessWorkGroup).all()
    for source_item in source_items:
        target_item = _find_by_code_or_name(source_item, target_items)
        if target_item is None:
            target_item = BusinessWorkGroup()
            _copy_fields(source_item, target_item, WORK_GROUP_FIELDS)
            target_db.add(target_item)
            target_db.flush()
            target_items.append(target_item)
            counters.created += 1
        else:
            if _copy_fields(source_item, target_item, WORK_GROUP_FIELDS):
                counters.updated += 1
            else:
                counters.unchanged += 1
    return counters


def sync_equipment_types(source_db, target_db) -> SyncCounters:
    counters = SyncCounters()
    source_items = (
        source_db.query(MaintenanceEquipmentType)
        .order_by(MaintenanceEquipmentType.id.asc())
        .all()
    )
    target_items = target_db.query(MaintenanceEquipmentType).all()
    for source_item in source_items:
        target_item = _find_by_code_or_name(source_item, target_items)
        if target_item is None:
            target_item = MaintenanceEquipmentType()
            _copy_fields(source_item, target_item, EQUIPMENT_TYPE_FIELDS)
            target_db.add(target_item)
            target_db.flush()
            target_items.append(target_item)
            counters.created += 1
        else:
            if _copy_fields(source_item, target_item, EQUIPMENT_TYPE_FIELDS):
                counters.updated += 1
            else:
                counters.unchanged += 1
    return counters


def main() -> int:
    args = parse_args()
    if args.source_tenant == args.target_tenant:
        print("source and target tenant must be different")
        return 1

    control_db = ControlSessionLocal()
    try:
        connection_service = TenantConnectionService()
        source_tenant = connection_service.get_tenant_by_slug(control_db, args.source_tenant)
        target_tenant = connection_service.get_tenant_by_slug(control_db, args.target_tenant)
        if source_tenant is None:
            print(f"source tenant not found: {args.source_tenant}")
            return 1
        if target_tenant is None:
            print(f"target tenant not found: {args.target_tenant}")
            return 1

        source_session_factory = connection_service.get_tenant_session(source_tenant)
        target_session_factory = connection_service.get_tenant_session(target_tenant)
        if source_session_factory is None:
            print(f"source tenant has no tenant DB session: {args.source_tenant}")
            return 1
        if target_session_factory is None:
            print(f"target tenant has no tenant DB session: {args.target_tenant}")
            return 1

        source_db = source_session_factory()
        target_db = target_session_factory()
        try:
            organizations, organization_id_map = sync_organizations(source_db, target_db)
            clients = sync_clients(source_db, target_db, organization_id_map)
            work_groups = sync_work_groups(source_db, target_db)
            equipment_types = sync_equipment_types(source_db, target_db)

            summary = {
                "mode": "apply" if args.apply else "dry_run",
                "source_tenant": source_tenant.slug,
                "target_tenant": target_tenant.slug,
                "tables": {
                    "business_organizations": organizations.as_dict(),
                    "business_clients": clients.as_dict(),
                    "business_work_groups": work_groups.as_dict(),
                    "maintenance_equipment_types": equipment_types.as_dict(),
                },
            }
            if args.apply:
                target_db.commit()
            else:
                target_db.rollback()

            print(json.dumps(summary, ensure_ascii=False, indent=2))
            return 0
        except Exception:
            target_db.rollback()
            raise
        finally:
            source_db.close()
            target_db.close()
    finally:
        control_db.close()


if __name__ == "__main__":
    raise SystemExit(main())
