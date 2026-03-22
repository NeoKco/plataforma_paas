import argparse
import gzip
import os
import subprocess
from collections import defaultdict
from datetime import datetime
from pathlib import Path


def _build_restore_db_name(tenant_slug: str, prefix: str) -> str:
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    normalized_slug = tenant_slug.replace("-", "_")
    return f"{prefix}_{normalized_slug}_{timestamp}"


def _check_required_admin_settings() -> dict:
    settings = {
        "host": os.getenv("ADMIN_DB_HOST", "127.0.0.1"),
        "port": os.getenv("ADMIN_DB_PORT", "5432"),
        "database": os.getenv("ADMIN_DB_NAME", "postgres"),
        "username": os.getenv("ADMIN_DB_USER", "postgres"),
        "password": os.getenv("ADMIN_DB_PASSWORD", ""),
    }

    if not settings["password"]:
        raise RuntimeError("ADMIN_DB_PASSWORD is required for tenant restore drills.")

    return settings


def _collect_latest_backups(
    backup_dir: Path,
    tenant_slug: str | None = None,
) -> dict[str, Path]:
    backups_by_slug: dict[str, list[Path]] = defaultdict(list)

    for backup_file in backup_dir.glob("*.sql.gz"):
        slug = backup_file.name.split("__", 1)[0]
        backups_by_slug[slug].append(backup_file)

    if tenant_slug:
        backups_by_slug = {
            slug: files
            for slug, files in backups_by_slug.items()
            if slug == tenant_slug
        }

    latest: dict[str, Path] = {}
    for slug, files in backups_by_slug.items():
        latest[slug] = max(files, key=lambda item: item.stat().st_mtime)

    return latest


def _run_createdb(admin: dict, restore_db_name: str) -> None:
    env = os.environ.copy()
    env["PGPASSWORD"] = admin["password"]

    subprocess.run(
        [
            "createdb",
            "--host",
            admin["host"],
            "--port",
            admin["port"],
            "--username",
            admin["username"],
            restore_db_name,
        ],
        env=env,
        check=True,
        capture_output=True,
    )


def _run_dropdb(admin: dict, restore_db_name: str) -> None:
    env = os.environ.copy()
    env["PGPASSWORD"] = admin["password"]

    subprocess.run(
        [
            "dropdb",
            "--if-exists",
            "--host",
            admin["host"],
            "--port",
            admin["port"],
            "--username",
            admin["username"],
            restore_db_name,
        ],
        env=env,
        check=False,
        capture_output=True,
    )


def _restore_backup(admin: dict, restore_db_name: str, backup_file: Path) -> None:
    env = os.environ.copy()
    env["PGPASSWORD"] = admin["password"]

    with gzip.open(backup_file, "rb") as backup_stream:
        completed = subprocess.run(
            [
                "psql",
                "--host",
                admin["host"],
                "--port",
                admin["port"],
                "--username",
                admin["username"],
                "--dbname",
                restore_db_name,
            ],
            stdin=backup_stream,
            env=env,
            capture_output=True,
            check=False,
        )

    if completed.returncode != 0:
        stderr = completed.stderr.decode("utf-8", errors="ignore")
        raise RuntimeError(f"Restore failed: {stderr}")


def _check_table(admin: dict, restore_db_name: str, table_name: str) -> None:
    env = os.environ.copy()
    env["PGPASSWORD"] = admin["password"]

    completed = subprocess.run(
        [
            "psql",
            "--host",
            admin["host"],
            "--port",
            admin["port"],
            "--username",
            admin["username"],
            "--dbname",
            restore_db_name,
            "--tuples-only",
            "--no-align",
            "--command",
            f"SELECT to_regclass('public.{table_name}') IS NOT NULL;",
        ],
        env=env,
        capture_output=True,
        check=False,
        text=True,
    )

    if completed.returncode != 0 or completed.stdout.strip() != "t":
        raise RuntimeError(f"Expected table missing in restore drill: {table_name}")


def _run_single_restore_drill(
    tenant_slug: str,
    backup_file: Path,
    admin: dict,
    prefix: str,
    keep_restore_db: bool,
) -> None:
    restore_db_name = _build_restore_db_name(tenant_slug, prefix)

    try:
        _run_createdb(admin, restore_db_name)
        _restore_backup(admin, restore_db_name, backup_file)

        for table_name in ("tenant_info", "users", "roles"):
            _check_table(admin, restore_db_name, table_name)

        print(f"Tenant restore drill completed: {tenant_slug} -> {backup_file}")
    finally:
        if not keep_restore_db:
            _run_dropdb(admin, restore_db_name)
        else:
            print(f"Keeping restore drill database: {restore_db_name}")


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Run restore drills for tenant backups in temporary PostgreSQL databases.",
    )
    parser.add_argument(
        "--backup-dir",
        default="/var/backups/platform_paas/tenants",
        help="Directory where tenant backups are stored.",
    )
    parser.add_argument(
        "--tenant-slug",
        help="Run the restore drill only for the given tenant slug.",
    )
    parser.add_argument(
        "--restore-db-prefix",
        default="tenant_restore_drill",
        help="Prefix used for temporary restore drill databases.",
    )
    parser.add_argument(
        "--keep-restore-db",
        action="store_true",
        help="Keep temporary restore drill databases after validation.",
    )
    args = parser.parse_args()

    backup_dir = Path(args.backup_dir)
    if not backup_dir.exists():
        print(f"Backup directory not found: {backup_dir}")
        return 1

    latest_backups = _collect_latest_backups(
        backup_dir=backup_dir,
        tenant_slug=args.tenant_slug,
    )
    if not latest_backups:
        target = args.tenant_slug or "all tenant backups"
        print(f"No tenant backups found for restore drill target: {target}")
        return 1

    admin = _check_required_admin_settings()
    failures: list[str] = []

    for tenant_slug, backup_file in latest_backups.items():
        try:
            _run_single_restore_drill(
                tenant_slug=tenant_slug,
                backup_file=backup_file,
                admin=admin,
                prefix=args.restore_db_prefix,
                keep_restore_db=args.keep_restore_db,
            )
        except Exception as exc:  # noqa: BLE001
            failures.append(f"{tenant_slug}: {exc}")

    if failures:
        print("Tenant restore drill finished with failures:")
        for failure in failures:
            print(f"- {failure}")
        return 1

    print(f"Tenant restore drill completed successfully for {len(latest_backups)} tenants.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
