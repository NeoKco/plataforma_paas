import argparse
import gzip
import os
import shutil
import subprocess
from collections.abc import Iterable
from datetime import datetime
from pathlib import Path

from app.apps.platform_control.models.tenant import Tenant
from app.apps.tenant_modules.core.services.tenant_connection_service import (
    TenantConnectionService,
)
from app.common.db.control_database import ControlSessionLocal


def _iter_active_tenants(tenant_slug: str | None = None) -> Iterable[Tenant]:
    db = ControlSessionLocal()
    try:
        query = db.query(Tenant).filter(Tenant.status == "active").order_by(Tenant.id.asc())

        if tenant_slug:
            query = query.filter(Tenant.slug == tenant_slug)

        for tenant in query.all():
            yield tenant
    finally:
        db.close()


def _build_backup_file_path(backup_dir: Path, tenant: Tenant) -> Path:
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    database_name = tenant.db_name or tenant.slug
    filename = f"{tenant.slug}__{database_name}_{timestamp}.sql.gz"
    return backup_dir / filename


def _remove_old_backups(backup_dir: Path, retention_days: int) -> None:
    cutoff = datetime.now().timestamp() - (retention_days * 86400)

    for backup_file in backup_dir.glob("*.sql.gz"):
        if backup_file.stat().st_mtime < cutoff:
            backup_file.unlink()


def _backup_single_tenant(
    tenant: Tenant,
    backup_dir: Path,
    connection_service: TenantConnectionService,
) -> Path:
    credentials = connection_service.get_tenant_database_credentials(tenant)
    backup_file = _build_backup_file_path(backup_dir, tenant)

    command = [
        "pg_dump",
        "--host",
        str(credentials["host"]),
        "--port",
        str(credentials["port"]),
        "--username",
        str(credentials["username"]),
        "--dbname",
        str(credentials["database"]),
        "--clean",
        "--if-exists",
        "--no-owner",
        "--no-privileges",
    ]

    env = os.environ.copy()
    env["PGPASSWORD"] = str(credentials["password"])

    with gzip.open(backup_file, "wb") as compressed_file:
        process = subprocess.Popen(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            env=env,
        )
        assert process.stdout is not None
        shutil.copyfileobj(process.stdout, compressed_file)
        process.stdout.close()
        _, stderr = process.communicate()

    if process.returncode != 0:
        if backup_file.exists():
            backup_file.unlink()
        raise RuntimeError(
            f"Backup failed for tenant {tenant.slug}: {stderr.decode('utf-8', errors='ignore')}"
        )

    return backup_file


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Run PostgreSQL backups for active tenant databases.",
    )
    parser.add_argument(
        "--tenant-slug",
        help="Backup only the given tenant slug.",
    )
    parser.add_argument(
        "--backup-dir",
        default="/var/backups/platform_paas/tenants",
        help="Directory where compressed backups will be stored.",
    )
    parser.add_argument(
        "--retention-days",
        type=int,
        default=7,
        help="Delete backups older than this number of days.",
    )
    args = parser.parse_args()

    backup_dir = Path(args.backup_dir)
    backup_dir.mkdir(parents=True, exist_ok=True)

    connection_service = TenantConnectionService()
    failures: list[str] = []
    success_count = 0

    tenants = list(_iter_active_tenants(args.tenant_slug))
    if not tenants:
        target = args.tenant_slug or "all active tenants"
        print(f"No tenants found for backup target: {target}")
        return 1

    for tenant in tenants:
        try:
            backup_file = _backup_single_tenant(
                tenant=tenant,
                backup_dir=backup_dir,
                connection_service=connection_service,
            )
            success_count += 1
            print(f"Tenant backup generated: {tenant.slug} -> {backup_file}")
        except Exception as exc:  # noqa: BLE001
            failures.append(f"{tenant.slug}: {exc}")

    _remove_old_backups(backup_dir, args.retention_days)

    if failures:
        print("Tenant backup finished with failures:")
        for failure in failures:
            print(f"- {failure}")
        return 1

    print(f"Tenant backup completed successfully. Backups generated: {success_count}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
