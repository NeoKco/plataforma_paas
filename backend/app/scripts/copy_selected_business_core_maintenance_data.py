from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[2]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.apps.tenant_modules.business_core.models.contact import BusinessContact  # noqa: E402
from app.apps.tenant_modules.business_core.models.client import BusinessClient  # noqa: E402
from app.apps.tenant_modules.business_core.models.organization import (  # noqa: E402
    BusinessOrganization,
)
from app.apps.tenant_modules.business_core.models.site import BusinessSite  # noqa: E402
from app.apps.tenant_modules.business_core.models.work_group import (  # noqa: E402
    BusinessWorkGroup,
)
from app.apps.tenant_modules.core.services.tenant_connection_service import (  # noqa: E402
    TenantConnectionService,
)
from app.apps.tenant_modules.maintenance.models.equipment_type import (  # noqa: E402
    MaintenanceEquipmentType,
)
from app.apps.tenant_modules.maintenance.models.installation import (  # noqa: E402
    MaintenanceInstallation,
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
CONTACT_FIELDS = (
    "full_name",
    "email",
    "phone",
    "role_title",
    "is_primary",
    "is_active",
    "sort_order",
)
SITE_FIELDS = (
    "name",
    "site_code",
    "address_line",
    "commune",
    "city",
    "region",
    "country_code",
    "reference_notes",
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
INSTALLATION_FIELDS = (
    "name",
    "serial_number",
    "manufacturer",
    "model",
    "installed_at",
    "last_service_at",
    "warranty_until",
    "installation_status",
    "location_note",
    "technical_notes",
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


def _normalized_tuple(*values):
    return tuple(_normalize(value) for value in values)


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


def sync_clients(
    source_db,
    target_db,
    organization_id_map: dict[int, int],
) -> tuple[SyncCounters, dict[int, int]]:
    counters = SyncCounters()
    client_id_map: dict[int, int] = {}
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
        client_id_map[source_client.id] = target_client.id
    return counters, client_id_map


def _find_contact_match(
    source_contact: BusinessContact,
    target_contacts: list[BusinessContact],
    *,
    organization_id: int,
) -> BusinessContact | None:
    source_key = _normalized_tuple(source_contact.full_name, source_contact.email)
    for item in target_contacts:
        if item.organization_id != organization_id:
            continue
        item_key = _normalized_tuple(item.full_name, item.email)
        if item_key == source_key:
            return item
    fallback_key = _normalize(source_contact.full_name)
    if fallback_key:
        matches = [
            item
            for item in target_contacts
            if item.organization_id == organization_id and _normalize(item.full_name) == fallback_key
        ]
        if len(matches) == 1:
            return matches[0]
    return None


def sync_contacts(source_db, target_db, organization_id_map: dict[int, int]) -> SyncCounters:
    counters = SyncCounters()
    source_contacts = (
        source_db.query(BusinessContact)
        .order_by(BusinessContact.id.asc())
        .all()
    )
    target_contacts = target_db.query(BusinessContact).all()
    for source_contact in source_contacts:
        target_org_id = organization_id_map.get(source_contact.organization_id)
        if target_org_id is None:
            continue
        target_contact = _find_contact_match(
            source_contact,
            target_contacts,
            organization_id=target_org_id,
        )
        if target_contact is None:
            target_contact = BusinessContact(organization_id=target_org_id)
            _copy_fields(source_contact, target_contact, CONTACT_FIELDS)
            target_db.add(target_contact)
            target_db.flush()
            target_contacts.append(target_contact)
            counters.created += 1
        else:
            if _copy_fields(source_contact, target_contact, CONTACT_FIELDS):
                counters.updated += 1
            else:
                counters.unchanged += 1
    return counters


def _find_site_match(
    source_site: BusinessSite,
    target_sites: list[BusinessSite],
    *,
    client_id: int,
) -> BusinessSite | None:
    source_code = _normalize(source_site.site_code)
    if source_code:
        for item in target_sites:
            if _normalize(item.site_code) == source_code:
                return item
    source_key = _normalized_tuple(source_site.name, source_site.address_line)
    for item in target_sites:
        if item.client_id != client_id:
            continue
        item_key = _normalized_tuple(item.name, item.address_line)
        if item_key == source_key:
            return item
    return None


def sync_sites(
    source_db,
    target_db,
    client_id_map: dict[int, int],
) -> tuple[SyncCounters, dict[int, int]]:
    counters = SyncCounters()
    site_id_map: dict[int, int] = {}
    source_sites = (
        source_db.query(BusinessSite)
        .order_by(BusinessSite.id.asc())
        .all()
    )
    target_sites = target_db.query(BusinessSite).all()
    for source_site in source_sites:
        target_client_id = client_id_map.get(source_site.client_id)
        if target_client_id is None:
            continue
        target_site = _find_site_match(
            source_site,
            target_sites,
            client_id=target_client_id,
        )
        if target_site is None:
            target_site = BusinessSite(client_id=target_client_id)
            _copy_fields(source_site, target_site, SITE_FIELDS)
            target_db.add(target_site)
            target_db.flush()
            target_sites.append(target_site)
            counters.created += 1
        else:
            relation_changed = False
            if target_site.client_id != target_client_id:
                target_site.client_id = target_client_id
                relation_changed = True
            if _copy_fields(source_site, target_site, SITE_FIELDS) or relation_changed:
                counters.updated += 1
            else:
                counters.unchanged += 1
        site_id_map[source_site.id] = target_site.id
    return counters, site_id_map


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


def sync_equipment_types(source_db, target_db) -> tuple[SyncCounters, dict[int, int]]:
    counters = SyncCounters()
    equipment_type_id_map: dict[int, int] = {}
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
        equipment_type_id_map[source_item.id] = target_item.id
    return counters, equipment_type_id_map


def _find_installation_match(
    source_item: MaintenanceInstallation,
    target_items: list[MaintenanceInstallation],
    *,
    site_id: int,
) -> MaintenanceInstallation | None:
    source_serial = _normalize(source_item.serial_number)
    if source_serial:
        for item in target_items:
            if item.site_id == site_id and _normalize(item.serial_number) == source_serial:
                return item
    source_key = _normalized_tuple(source_item.name, source_item.model, source_item.manufacturer)
    for item in target_items:
        if item.site_id != site_id:
            continue
        item_key = _normalized_tuple(item.name, item.model, item.manufacturer)
        if item_key == source_key:
            return item
    return None


def sync_installations(
    source_db,
    target_db,
    *,
    site_id_map: dict[int, int],
    equipment_type_id_map: dict[int, int],
) -> SyncCounters:
    counters = SyncCounters()
    source_items = (
        source_db.query(MaintenanceInstallation)
        .order_by(MaintenanceInstallation.id.asc())
        .all()
    )
    target_items = target_db.query(MaintenanceInstallation).all()
    for source_item in source_items:
        target_site_id = site_id_map.get(source_item.site_id)
        target_equipment_type_id = equipment_type_id_map.get(source_item.equipment_type_id)
        if target_site_id is None or target_equipment_type_id is None:
            continue
        target_item = _find_installation_match(
            source_item,
            target_items,
            site_id=target_site_id,
        )
        if target_item is None:
            target_item = MaintenanceInstallation(
                site_id=target_site_id,
                equipment_type_id=target_equipment_type_id,
            )
            _copy_fields(source_item, target_item, INSTALLATION_FIELDS)
            target_db.add(target_item)
            target_db.flush()
            target_items.append(target_item)
            counters.created += 1
        else:
            relation_changed = False
            if target_item.site_id != target_site_id:
                target_item.site_id = target_site_id
                relation_changed = True
            if target_item.equipment_type_id != target_equipment_type_id:
                target_item.equipment_type_id = target_equipment_type_id
                relation_changed = True
            if _copy_fields(source_item, target_item, INSTALLATION_FIELDS) or relation_changed:
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
            clients, client_id_map = sync_clients(source_db, target_db, organization_id_map)
            contacts = sync_contacts(source_db, target_db, organization_id_map)
            sites, site_id_map = sync_sites(source_db, target_db, client_id_map)
            work_groups = sync_work_groups(source_db, target_db)
            equipment_types, equipment_type_id_map = sync_equipment_types(source_db, target_db)
            installations = sync_installations(
                source_db,
                target_db,
                site_id_map=site_id_map,
                equipment_type_id_map=equipment_type_id_map,
            )

            summary = {
                "mode": "apply" if args.apply else "dry_run",
                "source_tenant": source_tenant.slug,
                "target_tenant": target_tenant.slug,
                "tables": {
                    "business_organizations": organizations.as_dict(),
                    "business_clients": clients.as_dict(),
                    "business_contacts": contacts.as_dict(),
                    "business_sites": sites.as_dict(),
                    "business_work_groups": work_groups.as_dict(),
                    "maintenance_equipment_types": equipment_types.as_dict(),
                    "maintenance_installations": installations.as_dict(),
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
