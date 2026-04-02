import argparse
import json
import os
import sys
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

import psycopg2
from dotenv import dotenv_values
from psycopg2.extras import RealDictCursor
from sqlalchemy import func, text

BACKEND_DIR = Path(__file__).resolve().parents[2]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.apps.tenant_modules.business_core.models import (  # noqa: E402
    BusinessClient,
    BusinessContact,
    BusinessFunctionProfile,
    BusinessOrganization,
    BusinessSite,
    BusinessTaskType,
    BusinessWorkGroup,
)
from app.apps.tenant_modules.core.models.user import User  # noqa: E402
from app.apps.tenant_modules.core.services.tenant_connection_service import (  # noqa: E402
    TenantConnectionService,
)
from app.apps.tenant_modules.maintenance.models import (  # noqa: E402
    MaintenanceEquipmentType,
    MaintenanceInstallation,
    MaintenanceStatusLog,
    MaintenanceVisit,
    MaintenanceWorkOrder,
)
from app.common.db.control_database import ControlSessionLocal  # noqa: E402


LOCAL_TZ = ZoneInfo("America/Santiago")


@dataclass
class ImportCounters:
    created: int = 0
    existing: int = 0
    updated: int = 0
    skipped: int = 0

    def as_dict(self) -> dict:
        return {
            "created": self.created,
            "existing": self.existing,
            "updated": self.updated,
            "skipped": self.skipped,
        }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Importa business-core y maintenance desde la BD legacy de ieris_app "
            "hacia un tenant del PaaS. Dry-run por defecto."
        )
    )
    parser.add_argument("--tenant-slug", default="empresa-bootstrap")
    parser.add_argument("--actor-user-id", type=int, default=1)
    parser.add_argument("--legacy-app-dir", type=Path, default=Path("/home/felipe/ieris_app"))
    parser.add_argument("--legacy-env", type=Path, default=None)
    parser.add_argument("--legacy-db-name", default=None)
    parser.add_argument("--legacy-db-user", default=None)
    parser.add_argument("--legacy-db-password", default=None)
    parser.add_argument("--legacy-db-host", default=None)
    parser.add_argument("--legacy-db-port", default=None)
    parser.add_argument(
        "--report-out",
        type=Path,
        default=Path(
            "/home/felipe/platform_paas/tmp/ieris_business_core_maintenance_import_report.json"
        ),
    )
    parser.add_argument("--skip-historical", action="store_true")
    parser.add_argument("--apply", action="store_true")
    return parser.parse_args()


def load_legacy_db_config(args: argparse.Namespace) -> dict:
    env_path = args.legacy_env or (args.legacy_app_dir / ".env")
    env_values = dotenv_values(env_path) if env_path.exists() else {}

    config = {
        "dbname": args.legacy_db_name or env_values.get("DB_NAME") or os.getenv("DB_NAME"),
        "user": args.legacy_db_user or env_values.get("DB_USER") or os.getenv("DB_USER"),
        "password": args.legacy_db_password
        or env_values.get("DB_PASSWORD")
        or os.getenv("DB_PASSWORD"),
        "host": args.legacy_db_host or env_values.get("DB_HOST") or os.getenv("DB_HOST"),
        "port": args.legacy_db_port or env_values.get("DB_PORT") or os.getenv("DB_PORT"),
    }
    missing = [key for key, value in config.items() if not value]
    if missing:
        raise ValueError(
            "No se pudo resolver la configuracion DB legacy de ieris_app. "
            f"Faltan: {', '.join(missing)}"
        )
    return config


def fetch_rows(conn, table_name: str, query: str) -> list[dict]:
    with conn.cursor(cursor_factory=RealDictCursor) as cursor:
        cursor.execute(
            """
            SELECT EXISTS (
                SELECT 1
                FROM information_schema.tables
                WHERE table_schema = 'public' AND table_name = %s
            ) AS table_exists
            """,
            (table_name,),
        )
        exists_row = cursor.fetchone() or {}
        if not exists_row.get("table_exists"):
            return []
        cursor.execute(query)
        return list(cursor.fetchall() or [])


def normalize_text(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = str(value).strip()
    return normalized or None


def append_note(*parts: str | None) -> str | None:
    clean = [part.strip() for part in parts if part and part.strip()]
    return "\n".join(clean) if clean else None


def to_bool_from_legacy_status(value: str | None) -> bool:
    normalized = (value or "").strip().lower()
    return normalized not in {"inactivo", "inactive", "false", "0"}


def combine_legacy_datetime(
    date_value,
    time_value=None,
    *,
    fallback_hour: int = 9,
) -> datetime | None:
    if date_value is None:
        return None

    parsed_date: date | None = None
    if isinstance(date_value, datetime):
        parsed_date = date_value.date()
    elif isinstance(date_value, date):
        parsed_date = date_value
    else:
        raw = str(date_value).strip()
        if not raw:
            return None
        try:
            parsed_date = datetime.fromisoformat(raw).date()
        except ValueError:
            parsed_date = datetime.strptime(raw, "%Y-%m-%d").date()

    parsed_time: time
    if time_value is None:
        parsed_time = time(hour=fallback_hour, minute=0)
    elif isinstance(time_value, datetime):
        parsed_time = time_value.time()
    elif isinstance(time_value, time):
        parsed_time = time_value
    else:
        raw_time = str(time_value).strip()
        if not raw_time:
            parsed_time = time(hour=fallback_hour, minute=0)
        else:
            try:
                parsed_time = time.fromisoformat(raw_time)
            except ValueError:
                parsed_time = datetime.strptime(raw_time, "%H:%M").time()

    return datetime.combine(parsed_date, parsed_time, tzinfo=LOCAL_TZ)


def map_legacy_organization_kind(value: str | None) -> str:
    normalized = (value or "").strip().lower()
    if normalized in {"propia", "internal"}:
        return "internal"
    if normalized in {"proveedora", "proveedor", "vendor", "supplier"}:
        return "vendor"
    if normalized in {"cliente", "client"}:
        return "client"
    return "partner"


def map_legacy_work_order_status(value: str | None) -> str:
    normalized = (value or "").strip().lower().replace("_", "-")
    mapping = {
        "pendiente": "scheduled",
        "programada": "scheduled",
        "scheduled": "scheduled",
        "en-progreso": "in_progress",
        "en progreso": "in_progress",
        "in-progress": "in_progress",
        "realizada": "completed",
        "realizado": "completed",
        "completada": "completed",
        "completado": "completed",
        "terminada": "completed",
        "terminado": "completed",
        "cancelada": "cancelled",
        "cancelado": "cancelled",
        "anulada": "cancelled",
        "anulado": "cancelled",
    }
    return mapping.get(normalized, "scheduled")


def map_visit_status_from_work_order(status: str) -> str:
    if status == "completed":
        return "completed"
    if status == "cancelled":
        return "cancelled"
    if status == "in_progress":
        return "in_progress"
    return "scheduled"


def build_assignment_label(
    legacy_row: dict,
    *,
    legacy_group_by_id: dict[int, dict],
) -> tuple[str | None, str | None]:
    assignment_type = normalize_text(legacy_row.get("asignado_a_tipo"))
    assignment_id = legacy_row.get("asignado_a_id")
    if assignment_type == "grupo" and assignment_id is not None:
        group = legacy_group_by_id.get(int(assignment_id))
        if group:
            return group.get("name"), f"legacy_group_id={assignment_id}"
        return f"Grupo legacy {assignment_id}", f"legacy_group_id={assignment_id}"
    if assignment_type == "usuario" and assignment_id is not None:
        return None, f"legacy_user_id={assignment_id}"
    return None, None


def resolve_actor_user_id(tenant_db, actor_user_id: int | None) -> int | None:
    if actor_user_id is None:
        return None
    exists = tenant_db.query(User.id).filter(User.id == actor_user_id).first()
    return actor_user_id if exists is not None else None


def get_or_create_organization(
    tenant_db,
    *,
    name: str,
    legal_name: str | None,
    tax_id: str | None,
    organization_kind: str,
    phone: str | None,
    email: str | None,
    notes: str | None,
    counters: ImportCounters,
) -> BusinessOrganization:
    existing = None
    if tax_id:
        existing = (
            tenant_db.query(BusinessOrganization)
            .filter(func.lower(BusinessOrganization.tax_id) == tax_id.lower())
            .first()
        )
    if existing is None:
        existing = (
            tenant_db.query(BusinessOrganization)
            .filter(func.lower(BusinessOrganization.name) == name.lower())
            .first()
        )
    if existing is not None:
        counters.existing += 1
        return existing

    item = BusinessOrganization(
        name=name,
        legal_name=legal_name,
        tax_id=tax_id,
        organization_kind=organization_kind,
        phone=phone,
        email=email,
        notes=notes,
        is_active=True,
    )
    tenant_db.add(item)
    tenant_db.flush()
    counters.created += 1
    return item


def get_or_create_client(
    tenant_db,
    *,
    organization_id: int,
    client_code: str,
    service_status: str,
    commercial_notes: str | None,
    is_active: bool,
    counters: ImportCounters,
) -> BusinessClient:
    existing = (
        tenant_db.query(BusinessClient)
        .filter(BusinessClient.client_code == client_code)
        .first()
    )
    if existing is None:
        existing = (
            tenant_db.query(BusinessClient)
            .filter(BusinessClient.organization_id == organization_id)
            .first()
        )
    if existing is not None:
        counters.existing += 1
        return existing

    item = BusinessClient(
        organization_id=organization_id,
        client_code=client_code,
        service_status=service_status,
        commercial_notes=commercial_notes,
        is_active=is_active,
    )
    tenant_db.add(item)
    tenant_db.flush()
    counters.created += 1
    return item


def get_or_create_contact(
    tenant_db,
    *,
    organization_id: int,
    full_name: str,
    email: str | None,
    phone: str | None,
    role_title: str | None,
    is_primary: bool,
    counters: ImportCounters,
) -> BusinessContact:
    query = tenant_db.query(BusinessContact).filter(
        BusinessContact.organization_id == organization_id,
        func.lower(BusinessContact.full_name) == full_name.lower(),
    )
    if email:
        query = query.filter(func.coalesce(func.lower(BusinessContact.email), "") == email.lower())
    existing = query.first()
    if existing is not None:
        counters.existing += 1
        return existing

    if is_primary:
        primary = (
            tenant_db.query(BusinessContact)
            .filter(
                BusinessContact.organization_id == organization_id,
                BusinessContact.is_primary.is_(True),
            )
            .first()
        )
        if primary is not None:
            is_primary = False

    item = BusinessContact(
        organization_id=organization_id,
        full_name=full_name,
        email=email,
        phone=phone,
        role_title=role_title,
        is_primary=is_primary,
        is_active=True,
    )
    tenant_db.add(item)
    tenant_db.flush()
    counters.created += 1
    return item


def get_or_create_site(
    tenant_db,
    *,
    client_id: int,
    site_code: str,
    name: str,
    address_line: str | None,
    city: str | None,
    region: str | None,
    reference_notes: str | None,
    is_active: bool,
    counters: ImportCounters,
) -> BusinessSite:
    existing = (
        tenant_db.query(BusinessSite)
        .filter(BusinessSite.site_code == site_code)
        .first()
    )
    if existing is not None:
        counters.existing += 1
        return existing

    item = BusinessSite(
        client_id=client_id,
        site_code=site_code,
        name=name,
        address_line=address_line,
        city=city,
        region=region,
        country_code="CL",
        reference_notes=reference_notes,
        is_active=is_active,
    )
    tenant_db.add(item)
    tenant_db.flush()
    counters.created += 1
    return item


def get_or_create_function_profile(
    tenant_db,
    *,
    code: str,
    name: str,
    description: str | None,
    counters: ImportCounters,
) -> BusinessFunctionProfile:
    existing = (
        tenant_db.query(BusinessFunctionProfile)
        .filter(BusinessFunctionProfile.code == code)
        .first()
    )
    if existing is None:
        existing = (
            tenant_db.query(BusinessFunctionProfile)
            .filter(func.lower(BusinessFunctionProfile.name) == name.lower())
            .first()
        )
    if existing is not None:
        counters.existing += 1
        return existing

    item = BusinessFunctionProfile(
        code=code,
        name=name,
        description=description,
        is_active=True,
    )
    tenant_db.add(item)
    tenant_db.flush()
    counters.created += 1
    return item


def get_or_create_work_group(
    tenant_db,
    *,
    code: str,
    name: str,
    description: str | None,
    counters: ImportCounters,
) -> BusinessWorkGroup:
    existing = tenant_db.query(BusinessWorkGroup).filter(BusinessWorkGroup.code == code).first()
    if existing is None:
        existing = (
            tenant_db.query(BusinessWorkGroup)
            .filter(func.lower(BusinessWorkGroup.name) == name.lower())
            .first()
        )
    if existing is not None:
        counters.existing += 1
        return existing

    item = BusinessWorkGroup(
        code=code,
        name=name,
        description=description,
        group_kind="operations",
        is_active=True,
    )
    tenant_db.add(item)
    tenant_db.flush()
    counters.created += 1
    return item


def get_or_create_task_type(
    tenant_db,
    *,
    code: str,
    name: str,
    description: str | None,
    counters: ImportCounters,
) -> BusinessTaskType:
    existing = tenant_db.query(BusinessTaskType).filter(BusinessTaskType.code == code).first()
    if existing is None:
        existing = (
            tenant_db.query(BusinessTaskType)
            .filter(func.lower(BusinessTaskType.name) == name.lower())
            .first()
        )
    if existing is not None:
        counters.existing += 1
        return existing

    item = BusinessTaskType(
        code=code,
        name=name,
        description=description,
        is_active=True,
    )
    tenant_db.add(item)
    tenant_db.flush()
    counters.created += 1
    return item


def get_or_create_equipment_type(
    tenant_db,
    *,
    code: str,
    name: str,
    description: str | None,
    counters: ImportCounters,
) -> MaintenanceEquipmentType:
    existing = (
        tenant_db.query(MaintenanceEquipmentType)
        .filter(MaintenanceEquipmentType.code == code)
        .first()
    )
    if existing is None:
        existing = (
            tenant_db.query(MaintenanceEquipmentType)
            .filter(func.lower(MaintenanceEquipmentType.name) == name.lower())
            .first()
        )
    if existing is not None:
        counters.existing += 1
        return existing

    item = MaintenanceEquipmentType(
        code=code,
        name=name,
        description=description,
        is_active=True,
    )
    tenant_db.add(item)
    tenant_db.flush()
    counters.created += 1
    return item


def get_or_create_installation(
    tenant_db,
    *,
    site_id: int,
    equipment_type_id: int,
    legacy_installation_id: int,
    name: str,
    installed_at: datetime | None,
    location_note: str | None,
    technical_notes: str | None,
    counters: ImportCounters,
) -> MaintenanceInstallation:
    marker = f"legacy_installation_id={legacy_installation_id}"
    existing = (
        tenant_db.query(MaintenanceInstallation)
        .filter(MaintenanceInstallation.technical_notes.contains(marker))
        .first()
    )
    if existing is not None:
        counters.existing += 1
        return existing

    item = MaintenanceInstallation(
        site_id=site_id,
        equipment_type_id=equipment_type_id,
        name=name,
        installed_at=installed_at,
        installation_status="active",
        location_note=location_note,
        technical_notes=technical_notes,
        is_active=True,
    )
    tenant_db.add(item)
    tenant_db.flush()
    counters.created += 1
    return item


def get_or_create_work_order(
    tenant_db,
    *,
    client_id: int,
    site_id: int,
    installation_id: int | None,
    external_reference: str,
    title: str,
    description: str | None,
    maintenance_status: str,
    scheduled_for: datetime | None,
    completed_at: datetime | None,
    cancelled_at: datetime | None,
    closure_notes: str | None,
    requested_at: datetime | None,
    created_by_user_id: int | None,
    counters: ImportCounters,
) -> tuple[MaintenanceWorkOrder, bool]:
    existing = (
        tenant_db.query(MaintenanceWorkOrder)
        .filter(MaintenanceWorkOrder.external_reference == external_reference)
        .first()
    )
    if existing is not None:
        counters.existing += 1
        return existing, False

    item = MaintenanceWorkOrder(
        client_id=client_id,
        site_id=site_id,
        installation_id=installation_id,
        external_reference=external_reference,
        title=title,
        description=description,
        maintenance_status=maintenance_status,
        priority="normal",
        scheduled_for=scheduled_for,
        requested_at=requested_at or datetime.now(tz=LOCAL_TZ),
        completed_at=completed_at,
        cancelled_at=cancelled_at,
        closure_notes=closure_notes,
        created_by_user_id=created_by_user_id,
    )
    tenant_db.add(item)
    tenant_db.flush()
    counters.created += 1
    return item, True


def ensure_status_log(
    tenant_db,
    *,
    work_order_id: int,
    marker: str,
    to_status: str,
    note: str,
    changed_at: datetime | None,
    counters: ImportCounters,
) -> None:
    existing = (
        tenant_db.query(MaintenanceStatusLog)
        .filter(
            MaintenanceStatusLog.work_order_id == work_order_id,
            MaintenanceStatusLog.note.contains(marker),
        )
        .first()
    )
    if existing is not None:
        counters.existing += 1
        return

    item = MaintenanceStatusLog(
        work_order_id=work_order_id,
        from_status=None,
        to_status=to_status,
        note=note,
        changed_at=changed_at or datetime.now(tz=LOCAL_TZ),
    )
    tenant_db.add(item)
    tenant_db.flush()
    counters.created += 1


def ensure_visit(
    tenant_db,
    *,
    work_order_id: int,
    marker: str,
    visit_status: str,
    scheduled_start_at: datetime | None,
    scheduled_end_at: datetime | None,
    actual_start_at: datetime | None,
    actual_end_at: datetime | None,
    assigned_group_label: str | None,
    notes: str | None,
    counters: ImportCounters,
) -> None:
    existing = (
        tenant_db.query(MaintenanceVisit)
        .filter(
            MaintenanceVisit.work_order_id == work_order_id,
            MaintenanceVisit.notes.contains(marker),
        )
        .first()
    )
    if existing is not None:
        counters.existing += 1
        return

    item = MaintenanceVisit(
        work_order_id=work_order_id,
        visit_status=visit_status,
        scheduled_start_at=scheduled_start_at,
        scheduled_end_at=scheduled_end_at,
        actual_start_at=actual_start_at,
        actual_end_at=actual_end_at,
        assigned_group_label=assigned_group_label,
        notes=notes,
    )
    tenant_db.add(item)
    tenant_db.flush()
    counters.created += 1


def fetch_legacy_source(legacy_config: dict, skip_historical: bool) -> dict:
    with psycopg2.connect(**legacy_config, cursor_factory=RealDictCursor) as conn:
        data = {
            "empresa": fetch_rows(conn, "empresa", "SELECT * FROM empresa ORDER BY id"),
            "clientes": fetch_rows(conn, "clientes", "SELECT * FROM clientes ORDER BY id"),
            "perfil_funcional": fetch_rows(
                conn, "perfil_funcional", "SELECT * FROM perfil_funcional ORDER BY id"
            ),
            "work_groups": fetch_rows(conn, "work_groups", "SELECT * FROM work_groups ORDER BY id"),
            "task_types": fetch_rows(conn, "task_types", "SELECT * FROM task_types ORDER BY id"),
            "tipo_equipo": fetch_rows(conn, "tipo_equipo", "SELECT * FROM tipo_equipo ORDER BY id"),
            "instalacion_sst": fetch_rows(
                conn, "instalacion_sst", "SELECT * FROM instalacion_sst ORDER BY id"
            ),
            "mantenciones": fetch_rows(
                conn, "mantenciones", "SELECT * FROM mantenciones ORDER BY id"
            ),
        }
        if skip_historical:
            data["historico_mantenciones"] = []
        else:
            data["historico_mantenciones"] = fetch_rows(
                conn,
                "historico_mantenciones",
                "SELECT * FROM historico_mantenciones ORDER BY id",
            )
        return data


def assert_required_target_tables(tenant_db) -> None:
    required_tables = {
        "business_organizations",
        "business_clients",
        "business_contacts",
        "business_sites",
        "business_function_profiles",
        "business_work_groups",
        "business_task_types",
        "maintenance_equipment_types",
        "maintenance_installations",
        "maintenance_work_orders",
        "maintenance_visits",
        "maintenance_status_logs",
    }
    rows = tenant_db.execute(
        text(
            """
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            """
        )
    ).all()
    existing_tables = {row[0] for row in rows}
    missing_tables = sorted(required_tables - existing_tables)
    if missing_tables:
        raise ValueError(
            "El tenant destino no tiene el schema minimo requerido para importar "
            "business-core y maintenance. "
            f"Faltan tablas: {', '.join(missing_tables)}. "
            "Aplica las migraciones tenant de business-core y maintenance antes de volver a correr el importador."
        )


def import_business_core_and_maintenance(
    tenant_db,
    *,
    legacy_data: dict,
    actor_user_id: int | None,
) -> dict:
    report = {
        "business_core": {
            "organizations": ImportCounters(),
            "clients": ImportCounters(),
            "contacts": ImportCounters(),
            "sites": ImportCounters(),
            "function_profiles": ImportCounters(),
            "work_groups": ImportCounters(),
            "task_types": ImportCounters(),
        },
        "maintenance": {
            "equipment_types": ImportCounters(),
            "installations": ImportCounters(),
            "work_orders": ImportCounters(),
            "status_logs": ImportCounters(),
            "visits": ImportCounters(),
        },
        "source_counts": {key: len(value) for key, value in legacy_data.items()},
        "skipped_notes": [],
    }

    actor_user_id = resolve_actor_user_id(tenant_db, actor_user_id)
    if actor_user_id is None:
        report["skipped_notes"].append(
            "actor_user_id no existe en el tenant destino; work orders se importan sin created_by_user_id"
        )

    organization_by_legacy_company_id: dict[int, BusinessOrganization] = {}
    client_by_legacy_client_id: dict[int, BusinessClient] = {}
    site_by_legacy_client_id: dict[int, BusinessSite] = {}
    equipment_type_by_legacy_id: dict[int, MaintenanceEquipmentType] = {}
    installation_by_legacy_id: dict[int, MaintenanceInstallation] = {}
    legacy_group_by_id = {int(row["id"]): row for row in legacy_data["work_groups"]}

    for row in legacy_data["empresa"]:
        company_id = int(row["id"])
        company_name = normalize_text(row.get("nombre"))
        if not company_name:
            report["business_core"]["organizations"].skipped += 1
            report["skipped_notes"].append(
                f"empresa.id={company_id} omitida por nombre vacio"
            )
            continue
        org = get_or_create_organization(
            tenant_db,
            name=company_name,
            legal_name=company_name,
            tax_id=normalize_text(row.get("rut")),
            organization_kind=map_legacy_organization_kind(row.get("tipo")),
            phone=normalize_text(row.get("fono_contacto_1")),
            email=normalize_text(row.get("mail")) or normalize_text(row.get("mail_contacto_1")),
            notes=append_note(
                normalize_text(row.get("descripcion")),
                f"legacy_source=empresa legacy_id={company_id}",
                "legacy_es_predeterminada=true" if row.get("es_predeterminada") else None,
            ),
            counters=report["business_core"]["organizations"],
        )
        organization_by_legacy_company_id[company_id] = org

        primary_contact_name = normalize_text(row.get("nombre_contacto"))
        if primary_contact_name:
            get_or_create_contact(
                tenant_db,
                organization_id=org.id,
                full_name=primary_contact_name,
                email=normalize_text(row.get("mail_contacto_1")),
                phone=normalize_text(row.get("fono_contacto_1")),
                role_title="Contacto principal",
                is_primary=True,
                counters=report["business_core"]["contacts"],
            )

        secondary_contact_name = normalize_text(row.get("contacto_2"))
        if secondary_contact_name:
            get_or_create_contact(
                tenant_db,
                organization_id=org.id,
                full_name=secondary_contact_name,
                email=normalize_text(row.get("mail_contacto_2")),
                phone=normalize_text(row.get("fono_contacto_2")),
                role_title="Contacto secundario",
                is_primary=False,
                counters=report["business_core"]["contacts"],
            )

    for row in legacy_data["clientes"]:
        legacy_client_id = int(row["id"])
        client_name = normalize_text(row.get("nombre"))
        if not client_name:
            report["business_core"]["clients"].skipped += 1
            report["skipped_notes"].append(
                f"clientes.id={legacy_client_id} omitido por nombre vacio"
            )
            continue

        organization = get_or_create_organization(
            tenant_db,
            name=client_name,
            legal_name=client_name,
            tax_id=normalize_text(row.get("rut")),
            organization_kind="client",
            phone=normalize_text(row.get("fono_contacto_1")),
            email=normalize_text(row.get("mail_contacto_1")),
            notes=append_note(
                normalize_text(row.get("observaciones")),
                normalize_text(row.get("giro")),
                normalize_text(row.get("motivo_baja")),
                normalize_text(row.get("organizacion"))
                and f"legacy_organizacion_text={normalize_text(row.get('organizacion'))}",
                f"legacy_source=clientes legacy_id={legacy_client_id}",
            ),
            counters=report["business_core"]["organizations"],
        )

        client = get_or_create_client(
            tenant_db,
            organization_id=organization.id,
            client_code=f"LEGACY-CLIENT-{legacy_client_id}",
            service_status="active" if to_bool_from_legacy_status(row.get("estado")) else "inactive",
            commercial_notes=append_note(
                normalize_text(row.get("tipo_cliente"))
                and f"legacy_tipo_cliente={normalize_text(row.get('tipo_cliente'))}",
                normalize_text(row.get("giro")) and f"legacy_giro={normalize_text(row.get('giro'))}",
                normalize_text(row.get("observaciones")),
            ),
            is_active=to_bool_from_legacy_status(row.get("estado")),
            counters=report["business_core"]["clients"],
        )
        client_by_legacy_client_id[legacy_client_id] = client

        primary_contact_name = normalize_text(row.get("contacto_1"))
        if primary_contact_name:
            get_or_create_contact(
                tenant_db,
                organization_id=organization.id,
                full_name=primary_contact_name,
                email=normalize_text(row.get("mail_contacto_1")),
                phone=normalize_text(row.get("fono_contacto_1")),
                role_title="Contacto principal",
                is_primary=True,
                counters=report["business_core"]["contacts"],
            )

        secondary_contact_name = normalize_text(row.get("contacto_2"))
        if secondary_contact_name:
            get_or_create_contact(
                tenant_db,
                organization_id=organization.id,
                full_name=secondary_contact_name,
                email=normalize_text(row.get("mail_contacto_2")),
                phone=normalize_text(row.get("fono_contacto_2")),
                role_title="Contacto secundario",
                is_primary=False,
                counters=report["business_core"]["contacts"],
            )

        address_line = " ".join(
            part for part in [normalize_text(row.get("calle")), normalize_text(row.get("numero_casa"))] if part
        ) or None
        site_name = (
            address_line
            or f"Sitio principal {client_name}"
        )
        site = get_or_create_site(
            tenant_db,
            client_id=client.id,
            site_code=f"LEGACY-SITE-{legacy_client_id}",
            name=site_name,
            address_line=address_line,
            city=normalize_text(row.get("comuna")) or normalize_text(row.get("ciudad")),
            region=normalize_text(row.get("region")),
            reference_notes=append_note(
                normalize_text(row.get("codigo_postal"))
                and f"legacy_codigo_postal={normalize_text(row.get('codigo_postal'))}",
                f"legacy_client_id={legacy_client_id}",
            ),
            is_active=to_bool_from_legacy_status(row.get("estado")),
            counters=report["business_core"]["sites"],
        )
        site_by_legacy_client_id[legacy_client_id] = site

    for row in legacy_data["perfil_funcional"]:
        legacy_id = int(row["id"])
        profile_name = normalize_text(row.get("name"))
        if not profile_name:
            report["business_core"]["function_profiles"].skipped += 1
            continue
        get_or_create_function_profile(
            tenant_db,
            code=f"LEGACY-FPROFILE-{legacy_id}",
            name=profile_name,
            description=append_note(
                normalize_text(row.get("description")),
                f"legacy_id={legacy_id}",
            ),
            counters=report["business_core"]["function_profiles"],
        )

    for row in legacy_data["work_groups"]:
        legacy_id = int(row["id"])
        group_name = normalize_text(row.get("name"))
        if not group_name:
            report["business_core"]["work_groups"].skipped += 1
            continue
        description = append_note(
            normalize_text(row.get("description")),
            row.get("por_defecto") and "legacy_default=true",
            row.get("lider") is not None and f"legacy_leader_user_id={row.get('lider')}",
            f"legacy_id={legacy_id}",
        )
        get_or_create_work_group(
            tenant_db,
            code=f"LEGACY-WGROUP-{legacy_id}",
            name=group_name,
            description=description,
            counters=report["business_core"]["work_groups"],
        )

    report["skipped_notes"].append(
        "user_groups no se importa aun porque business_work_group_members sigue pendiente en business-core"
    )

    for row in legacy_data["task_types"]:
        legacy_id = int(row["id"])
        task_name = normalize_text(row.get("name"))
        if not task_name:
            report["business_core"]["task_types"].skipped += 1
            continue
        description = append_note(
            row.get("por_defecto") and "legacy_default=true",
            f"legacy_id={legacy_id}",
        )
        get_or_create_task_type(
            tenant_db,
            code=f"LEGACY-TTASK-{legacy_id}",
            name=task_name,
            description=description,
            counters=report["business_core"]["task_types"],
        )

    for row in legacy_data["tipo_equipo"]:
        legacy_id = int(row["id"])
        type_name = normalize_text(row.get("nombre"))
        if not type_name:
            report["maintenance"]["equipment_types"].skipped += 1
            continue
        equipment_type = get_or_create_equipment_type(
            tenant_db,
            code=f"LEGACY-EQTYPE-{legacy_id}",
            name=type_name,
            description=append_note(
                normalize_text(row.get("descripcion")),
                row.get("es_por_defecto") and "legacy_default=true",
                f"legacy_id={legacy_id}",
            ),
            counters=report["maintenance"]["equipment_types"],
        )
        equipment_type_by_legacy_id[legacy_id] = equipment_type

    for row in legacy_data["instalacion_sst"]:
        legacy_id = int(row["id"])
        legacy_client_id = int(row["cliente_id"])
        legacy_equipment_type_id = int(row["tipo_equipo_id"])
        site = site_by_legacy_client_id.get(legacy_client_id)
        equipment_type = equipment_type_by_legacy_id.get(legacy_equipment_type_id)
        if site is None or equipment_type is None:
            report["maintenance"]["installations"].skipped += 1
            report["skipped_notes"].append(
                f"instalacion_sst.id={legacy_id} omitida por cliente o tipo_equipo no migrado"
            )
            continue

        installer_org = None
        if row.get("empresa_id") is not None:
            installer_org = organization_by_legacy_company_id.get(int(row["empresa_id"]))

        installation_name = f"{equipment_type.name} #{legacy_id}"
        liters = row.get("litros_equipo")
        if liters:
            installation_name = f"{equipment_type.name} {liters}L"

        technical_notes = append_note(
            normalize_text(row.get("observaciones")),
            liters is not None and f"legacy_litros_equipo={liters}",
            installer_org is not None and f"legacy_installer_org={installer_org.name}",
            row.get("empresa_id") is not None and f"legacy_installer_empresa_id={row.get('empresa_id')}",
            f"legacy_installation_id={legacy_id}",
        )

        installation = get_or_create_installation(
            tenant_db,
            site_id=site.id,
            equipment_type_id=equipment_type.id,
            legacy_installation_id=legacy_id,
            name=installation_name,
            installed_at=combine_legacy_datetime(row.get("fecha_instalacion"), fallback_hour=12),
            location_note=normalize_text(row.get("postura_instalacion")),
            technical_notes=technical_notes,
            counters=report["maintenance"]["installations"],
        )
        installation_by_legacy_id[legacy_id] = installation

    installations_by_site_id: dict[int, list[MaintenanceInstallation]] = {}
    for installation in installation_by_legacy_id.values():
        installations_by_site_id.setdefault(installation.site_id, []).append(installation)

    def resolve_installation_for_site(site_id: int) -> int | None:
        matches = installations_by_site_id.get(site_id, [])
        if len(matches) == 1:
            return matches[0].id
        return None

    for row in legacy_data["mantenciones"]:
        legacy_id = int(row["id"])
        legacy_client_id = int(row["cliente_id"])
        client = client_by_legacy_client_id.get(legacy_client_id)
        site = site_by_legacy_client_id.get(legacy_client_id)
        if client is None or site is None:
            report["maintenance"]["work_orders"].skipped += 1
            report["skipped_notes"].append(
                f"mantenciones.id={legacy_id} omitida por cliente/sitio no migrado"
            )
            continue

        scheduled_for = combine_legacy_datetime(
            row.get("fecha_programada"),
            row.get("hora_programada"),
            fallback_hour=9,
        )
        status = map_legacy_work_order_status(row.get("estado_tarea_mantencion"))
        assigned_group_label, assignment_note = build_assignment_label(
            row,
            legacy_group_by_id=legacy_group_by_id,
        )
        description = append_note(
            normalize_text(row.get("descripcion")),
            normalize_text(row.get("observaciones")),
            normalize_text(row.get("estado_del_equipo"))
            and f"legacy_estado_equipo={normalize_text(row.get('estado_del_equipo'))}",
            assignment_note,
            f"legacy_source=mantenciones legacy_id={legacy_id}",
        )
        work_order, _created = get_or_create_work_order(
            tenant_db,
            client_id=client.id,
            site_id=site.id,
            installation_id=resolve_installation_for_site(site.id),
            external_reference=f"LEGACY-MAINT-{legacy_id}",
            title=(normalize_text(row.get("descripcion")) or f"Mantencion legacy #{legacy_id}")[:180],
            description=description,
            maintenance_status=status,
            scheduled_for=scheduled_for,
            completed_at=scheduled_for if status == "completed" else None,
            cancelled_at=scheduled_for if status == "cancelled" else None,
            closure_notes=normalize_text(row.get("observaciones")) if status in {"completed", "cancelled"} else None,
            requested_at=combine_legacy_datetime(row.get("fecha_creacion"), fallback_hour=9),
            created_by_user_id=actor_user_id,
            counters=report["maintenance"]["work_orders"],
        )
        duration_minutes = int(row.get("duracion_minutos") or 60)
        visit_end = scheduled_for + timedelta(minutes=duration_minutes) if scheduled_for else None
        marker = f"legacy_work_order_source=mantenciones legacy_id={legacy_id}"
        ensure_status_log(
            tenant_db,
            work_order_id=work_order.id,
            marker=marker,
            to_status=status,
            note=append_note(
                "Importado desde ieris_app.mantenciones",
                marker,
            )
            or marker,
            changed_at=scheduled_for,
            counters=report["maintenance"]["status_logs"],
        )
        ensure_visit(
            tenant_db,
            work_order_id=work_order.id,
            marker=f"legacy_visit_source=mantenciones legacy_id={legacy_id}",
            visit_status=map_visit_status_from_work_order(status),
            scheduled_start_at=scheduled_for,
            scheduled_end_at=visit_end,
            actual_start_at=scheduled_for if status == "completed" else None,
            actual_end_at=visit_end if status == "completed" else None,
            assigned_group_label=assigned_group_label,
            notes=append_note(
                "Visita base importada desde ieris_app.mantenciones",
                assignment_note,
                f"legacy_visit_source=mantenciones legacy_id={legacy_id}",
            ),
            counters=report["maintenance"]["visits"],
        )

    for row in legacy_data["historico_mantenciones"]:
        legacy_id = int(row["id"])
        legacy_client_id = int(row["cliente_id"])
        client = client_by_legacy_client_id.get(legacy_client_id)
        site = site_by_legacy_client_id.get(legacy_client_id)
        if client is None or site is None:
            report["maintenance"]["work_orders"].skipped += 1
            report["skipped_notes"].append(
                f"historico_mantenciones.id={legacy_id} omitida por cliente/sitio no migrado"
            )
            continue

        completed_at = combine_legacy_datetime(row.get("fecha_mantencion"), fallback_hour=12)
        assigned_group_label = None
        if normalize_text(row.get("asignado_a_tipo")) == "grupo":
            assigned_group_label = normalize_text(row.get("asignado_a_detalle"))
        marker = f"legacy_work_order_source=historico_mantenciones legacy_id={legacy_id}"
        work_order, _created = get_or_create_work_order(
            tenant_db,
            client_id=client.id,
            site_id=site.id,
            installation_id=resolve_installation_for_site(site.id),
            external_reference=f"LEGACY-HIST-MAINT-{legacy_id}",
            title=(normalize_text(row.get("descripcion")) or f"Historico mantencion #{legacy_id}")[:180],
            description=append_note(
                normalize_text(row.get("descripcion")),
                normalize_text(row.get("observaciones")),
                normalize_text(row.get("cliente_direccion"))
                and f"legacy_cliente_direccion={normalize_text(row.get('cliente_direccion'))}",
                normalize_text(row.get("cliente_contacto"))
                and f"legacy_cliente_contacto={normalize_text(row.get('cliente_contacto'))}",
                normalize_text(row.get("cliente_telefono"))
                and f"legacy_cliente_telefono={normalize_text(row.get('cliente_telefono'))}",
                normalize_text(row.get("estado_del_equipo"))
                and f"legacy_estado_equipo={normalize_text(row.get('estado_del_equipo'))}",
                f"legacy_source=historico_mantenciones legacy_id={legacy_id}",
            ),
            maintenance_status="completed",
            scheduled_for=completed_at,
            completed_at=completed_at,
            cancelled_at=None,
            closure_notes=normalize_text(row.get("observaciones")),
            requested_at=combine_legacy_datetime(row.get("fecha_creacion"), fallback_hour=12)
            or completed_at,
            created_by_user_id=actor_user_id,
            counters=report["maintenance"]["work_orders"],
        )
        ensure_status_log(
            tenant_db,
            work_order_id=work_order.id,
            marker=marker,
            to_status="completed",
            note=append_note(
                "Importado desde ieris_app.historico_mantenciones",
                marker,
            )
            or marker,
            changed_at=completed_at,
            counters=report["maintenance"]["status_logs"],
        )
        ensure_visit(
            tenant_db,
            work_order_id=work_order.id,
            marker=f"legacy_visit_source=historico_mantenciones legacy_id={legacy_id}",
            visit_status="completed",
            scheduled_start_at=completed_at,
            scheduled_end_at=completed_at + timedelta(minutes=60) if completed_at else None,
            actual_start_at=completed_at,
            actual_end_at=completed_at + timedelta(minutes=60) if completed_at else None,
            assigned_group_label=assigned_group_label,
            notes=append_note(
                "Visita historica importada desde ieris_app.historico_mantenciones",
                normalize_text(row.get("asignado_a_detalle")),
                f"legacy_visit_source=historico_mantenciones legacy_id={legacy_id}",
            ),
            counters=report["maintenance"]["visits"],
        )

    return {
        "source_counts": report["source_counts"],
        "business_core": {
            key: value.as_dict() for key, value in report["business_core"].items()
        },
        "maintenance": {
            key: value.as_dict() for key, value in report["maintenance"].items()
        },
        "skipped_notes": report["skipped_notes"],
    }


def main() -> int:
    args = parse_args()
    legacy_config = load_legacy_db_config(args)
    report_out = args.report_out
    report_out.parent.mkdir(parents=True, exist_ok=True)

    legacy_data = fetch_legacy_source(legacy_config, args.skip_historical)

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
    try:
        assert_required_target_tables(tenant_db)
        result = import_business_core_and_maintenance(
            tenant_db,
            legacy_data=legacy_data,
            actor_user_id=args.actor_user_id,
        )
        if args.apply:
            tenant_db.commit()
        else:
            tenant_db.rollback()

        report = {
            "mode": "apply" if args.apply else "dry-run",
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
    except Exception:
        tenant_db.rollback()
        raise
    finally:
        tenant_db.close()


if __name__ == "__main__":
    raise SystemExit(main())
