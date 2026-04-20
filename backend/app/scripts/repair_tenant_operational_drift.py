from __future__ import annotations

import argparse
import sys
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[2]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.apps.platform_control.models.tenant import Tenant  # noqa: E402
from app.apps.platform_control.repositories.tenant_repository import (  # noqa: E402
    TenantRepository,
)
from app.apps.platform_control.services.tenant_service import TenantService  # noqa: E402
from app.apps.provisioning.services.tenant_db_bootstrap_service import (  # noqa: E402
    TenantDatabaseBootstrapService,
)
from app.apps.tenant_modules.core.services.tenant_connection_service import (  # noqa: E402
    TenantConnectionService,
)
from app.common.security.tenant_secret_service import TenantSecretService  # noqa: E402
from app.common.db.control_database import ControlSessionLocal  # noqa: E402
from app.scripts.audit_active_tenant_convergence import (  # noqa: E402
    _audit_single_tenant,
    classify_tenant_operational_error,
)
from app.scripts.repair_maintenance_finance_sync import (  # noqa: E402
    _repair_single_tenant,
)
from app.scripts.seed_missing_tenant_defaults import (  # noqa: E402
    _needs_core_seed,
    _needs_finance_seed,
)


tenant_repository = TenantRepository()
tenant_service = TenantService()
tenant_connection_service = TenantConnectionService()
tenant_bootstrap_service = TenantDatabaseBootstrapService()
tenant_secret_service = TenantSecretService()


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=(
            "Diagnostica y repara drift operativo tenant-local usando la ruta "
            "canónica: audit, rotación DB opcional, schema sync, seed defaults, "
            "repair maintenance-finance y audit final."
        )
    )
    parser.add_argument("--tenant-slug", required=True, help="Slug del tenant a reparar")
    parser.add_argument(
        "--rotate-db-credentials",
        action="store_true",
        help="Rota siempre la credencial DB tenant antes de converger",
    )
    parser.add_argument(
        "--auto-rotate-if-invalid-credentials",
        action="store_true",
        help="Rota la credencial DB solo si el pre-audit falla por invalid_db_credentials",
    )
    parser.add_argument(
        "--skip-schema-sync",
        action="store_true",
        help="Omite sync de schema tenant",
    )
    parser.add_argument(
        "--skip-seed-defaults",
        action="store_true",
        help="Omite seed de defaults faltantes",
    )
    parser.add_argument(
        "--skip-maintenance-finance-repair",
        action="store_true",
        help="Omite repair maintenance-finance",
    )
    parser.add_argument(
        "--audit-only",
        action="store_true",
        help="Solo ejecuta el pre-audit y sale",
    )
    parser.add_argument(
        "--force-finance-seed",
        action="store_true",
        help="Fuerza el baseline finance aunque existan categorías y no haya uso",
    )
    parser.add_argument(
        "--sync-env-file",
        action="append",
        default=[],
        help=(
            "Replica la credencial DB tenant actual hacia un archivo .env/.tenant-secrets.env "
            "adicional sin volver a rotar la contraseña"
        ),
    )
    return parser


def should_rotate_db_credentials(
    *,
    explicit_rotate: bool,
    auto_rotate_if_invalid_credentials: bool,
    pre_audit_error_code: str | None,
) -> bool:
    if explicit_rotate:
        return True
    return (
        auto_rotate_if_invalid_credentials
        and pre_audit_error_code == "invalid_db_credentials"
    )


def format_audit_result(result: dict) -> str:
    return (
        "status={status} policy={policy} issues={issues} notes={notes} unsynced_ids={ids}".format(
            status=result["status"],
            policy=result["policy"]["maintenance_finance_sync_mode"],
            issues=result["critical_issues"] or ["none"],
            notes=result["notes"] or ["none"],
            ids=result["unsynced_work_order_ids"],
        )
    )


def seed_missing_defaults_for_tenant(
    tenant: Tenant,
    *,
    force_finance: bool,
) -> dict:
    session_factory = tenant_connection_service.get_tenant_session(tenant)
    if session_factory is None:
        raise ValueError("tenant_db_not_configured")

    tenant_db = session_factory()
    try:
        modules: list[str] = []
        if _needs_core_seed(tenant_db):
            modules.append("core")

        finance_needed, finance_reason = _needs_finance_seed(
            tenant_db,
            force=force_finance,
        )
        if finance_needed:
            modules.append("finance")

        if not modules:
            return {
                "changed": False,
                "modules": [],
                "finance_reason": finance_reason,
            }

        tenant_bootstrap_service.seed_defaults(
            tenant_db,
            tenant_name=tenant.name,
            tenant_slug=tenant.slug,
            tenant_type=tenant.tenant_type,
            enabled_modules=modules,
        )
        tenant_db.commit()
        return {
            "changed": True,
            "modules": modules,
            "finance_reason": finance_reason,
        }
    finally:
        tenant_db.close()


def sync_tenant_db_password_to_env_files(
    *,
    tenant_slug: str,
    password: str,
    env_files: list[str],
) -> list[str]:
    synced_env_files: list[str] = []
    for env_file in env_files:
        env_path = Path(env_file).expanduser().resolve()
        tenant_secret_service.store_tenant_db_password(
            tenant_slug=tenant_slug,
            password=password,
            env_path=env_path,
        )
        tenant_secret_service.clear_tenant_bootstrap_db_password(
            tenant_slug=tenant_slug,
            env_path=env_path,
        )
        synced_env_files.append(str(env_path))
    return synced_env_files


def main() -> int:
    args = build_parser().parse_args()
    control_db = ControlSessionLocal()
    try:
        tenant = tenant_repository.get_by_slug(control_db, args.tenant_slug)
        if tenant is None:
            print(f"Tenant no encontrado: {args.tenant_slug}")
            return 1

        print(
            "tenant={slug} status={status} db_configured={db_configured}".format(
                slug=tenant.slug,
                status=tenant.status,
                db_configured=bool(
                    tenant.db_name and tenant.db_user and tenant.db_host and tenant.db_port
                ),
            )
        )

        pre_audit_result: dict | None = None
        pre_audit_error_code: str | None = None
        try:
            pre_audit_result = _audit_single_tenant(tenant)
            print(f"pre_audit {tenant.slug}: {format_audit_result(pre_audit_result)}")
        except Exception as exc:  # pragma: no cover - operational fallback
            pre_audit_error_code = classify_tenant_operational_error(exc)
            print(
                f"pre_audit {tenant.slug}: failed reason={pre_audit_error_code} detail=({exc})"
            )

        if args.audit_only:
            return 0 if pre_audit_result and pre_audit_result["status"] == "ok" else 1

        if should_rotate_db_credentials(
            explicit_rotate=args.rotate_db_credentials,
            auto_rotate_if_invalid_credentials=args.auto_rotate_if_invalid_credentials,
            pre_audit_error_code=pre_audit_error_code,
        ):
            rotation_result = tenant_service.rotate_tenant_db_credentials(
                db=control_db,
                tenant_id=tenant.id,
            )
            tenant = rotation_result["tenant"]
            print(
                "rotation {slug}: env_var={env_var} rotated_at={rotated_at}".format(
                    slug=tenant.slug,
                    env_var=rotation_result["env_var_name"],
                    rotated_at=rotation_result["rotated_at"],
                )
            )
        elif pre_audit_error_code == "invalid_db_credentials":
            print(
                "rotation {slug}: skipped (invalid_db_credentials detected; use "
                "--rotate-db-credentials or --auto-rotate-if-invalid-credentials)".format(
                    slug=tenant.slug
                )
            )

        if not args.skip_schema_sync:
            synced_tenant = tenant_service.sync_tenant_schema(
                db=control_db,
                tenant_id=tenant.id,
            )
            tenant = synced_tenant
            print(
                "schema_sync {slug}: synced -> {version}".format(
                    slug=tenant.slug,
                    version=tenant.tenant_schema_version or "unknown",
                )
            )
        else:
            print(f"schema_sync {tenant.slug}: skipped")

        if args.sync_env_file:
            current_password = tenant_connection_service.get_tenant_database_credentials(
                tenant
            )["password"]
            synced_env_files = sync_tenant_db_password_to_env_files(
                tenant_slug=tenant.slug,
                password=current_password,
                env_files=args.sync_env_file,
            )
            print(f"sync_env_files {tenant.slug}: synced={synced_env_files}")

        if not args.skip_seed_defaults:
            seed_result = seed_missing_defaults_for_tenant(
                tenant,
                force_finance=args.force_finance_seed,
            )
            if seed_result["changed"]:
                print(
                    "seed_defaults {slug}: seeded={modules} finance_reason={reason}".format(
                        slug=tenant.slug,
                        modules=",".join(seed_result["modules"]),
                        reason=seed_result["finance_reason"],
                    )
                )
            else:
                print(f"seed_defaults {tenant.slug}: no missing defaults")
        else:
            print(f"seed_defaults {tenant.slug}: skipped")

        if not args.skip_maintenance_finance_repair:
            repair_result = _repair_single_tenant(tenant, dry_run=False)
            if repair_result["error"]:
                print(
                    "maintenance_finance_repair {slug}: failed ({error})".format(
                        slug=tenant.slug,
                        error=repair_result["error"],
                    )
                )
                return 1
            print(
                "maintenance_finance_repair {slug}: normalized_policy={normalized} "
                "candidates={candidates} synced={synced}".format(
                    slug=tenant.slug,
                    normalized=repair_result["normalized_policy"],
                    candidates=repair_result["candidate_ids"],
                    synced=repair_result["synced_ids"],
                )
            )
        else:
            print(f"maintenance_finance_repair {tenant.slug}: skipped")

        try:
            final_audit_result = _audit_single_tenant(tenant)
        except Exception as exc:  # pragma: no cover - operational fallback
            final_error_code = classify_tenant_operational_error(exc)
            print(
                f"final_audit {tenant.slug}: failed reason={final_error_code} detail=({exc})"
            )
            return 1

        print(f"final_audit {tenant.slug}: {format_audit_result(final_audit_result)}")
        return 0 if final_audit_result["status"] == "ok" else 1
    finally:
        control_db.close()


if __name__ == "__main__":
    raise SystemExit(main())
