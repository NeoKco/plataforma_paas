import argparse
import gzip
import os
import subprocess
from pathlib import Path

from app.apps.tenant_modules.core.services.tenant_connection_service import (
    TenantConnectionService,
)
from app.common.db.control_database import ControlSessionLocal


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Restore a tenant PostgreSQL database from a compressed backup.",
    )
    parser.add_argument(
        "--tenant-slug",
        required=True,
        help="Tenant slug to restore.",
    )
    parser.add_argument(
        "--backup-file",
        required=True,
        help="Path to the .sql.gz backup file.",
    )
    args = parser.parse_args()

    backup_file = Path(args.backup_file)
    if not backup_file.exists():
        print(f"Backup file not found: {backup_file}")
        return 1

    control_db = ControlSessionLocal()
    try:
        connection_service = TenantConnectionService()
        tenant = connection_service.get_tenant(control_db, args.tenant_slug)
        if not tenant:
            print(f"Tenant not found or inactive: {args.tenant_slug}")
            return 1

        credentials = connection_service.get_tenant_database_credentials(tenant)
    finally:
        control_db.close()

    command = [
        "psql",
        "--host",
        str(credentials["host"]),
        "--port",
        str(credentials["port"]),
        "--username",
        str(credentials["username"]),
        "--dbname",
        str(credentials["database"]),
    ]

    env = os.environ.copy()
    env["PGPASSWORD"] = str(credentials["password"])

    with gzip.open(backup_file, "rb") as backup_stream:
        completed = subprocess.run(
            command,
            stdin=backup_stream,
            env=env,
            capture_output=True,
            check=False,
        )

    if completed.returncode != 0:
        stderr = completed.stderr.decode("utf-8", errors="ignore")
        print(f"Tenant restore failed for {args.tenant_slug}: {stderr}")
        return 1

    print(f"Tenant restore completed: {args.tenant_slug} <- {backup_file}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
