import argparse
import json
import sys
from dataclasses import dataclass, field
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[2]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.apps.platform_control.models.tenant import Tenant  # noqa: E402
from app.apps.platform_control.models.provisioning_job import ProvisioningJob  # noqa: E402
from app.apps.platform_control.services.provisioning_job_service import (  # noqa: E402
    ProvisioningJobService,
)
from app.apps.platform_control.services.tenant_service import TenantService  # noqa: E402
from app.apps.provisioning.services.provisioning_service import ProvisioningService  # noqa: E402
from app.common.db.control_database import ControlSessionLocal  # noqa: E402


@dataclass
class TenantCleanupResult:
    tenant_id: int
    tenant_slug: str
    starting_status: str | None
    starting_db_configured: bool
    actions: list[str] = field(default_factory=list)
    outcome: str = "pending"
    error: str | None = None

    def as_dict(self) -> dict:
        return {
            "tenant_id": self.tenant_id,
            "tenant_slug": self.tenant_slug,
            "starting_status": self.starting_status,
            "starting_db_configured": self.starting_db_configured,
            "actions": self.actions,
            "outcome": self.outcome,
            "error": self.error,
        }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Limpia tenants efimeros E2E desde platform_control usando el lifecycle "
            "seguro archive -> deprovision -> delete. Dry-run por defecto."
        )
    )
    parser.add_argument("--prefix", default="e2e-")
    parser.add_argument("--actor-email", default="admin@platform.local")
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument(
        "--report-out",
        type=Path,
        default=Path("/home/felipe/platform_paas/tmp/e2e_tenant_cleanup_report.json"),
    )
    parser.add_argument("--apply", action="store_true")
    return parser.parse_args()


def has_db_config(tenant: Tenant) -> bool:
    return all(
        getattr(tenant, field_name, None) not in (None, "")
        for field_name in ("db_name", "db_user", "db_host", "db_port")
    )


def collect_candidates(prefix: str, limit: int | None) -> list[TenantCleanupResult]:
    db = ControlSessionLocal()
    try:
        query = (
            db.query(Tenant)
            .filter(Tenant.slug.like(f"{prefix}%"))
            .order_by(Tenant.id.asc())
        )
        if limit is not None:
            query = query.limit(limit)
        tenants = query.all()
        return [
            TenantCleanupResult(
                tenant_id=tenant.id,
                tenant_slug=tenant.slug,
                starting_status=getattr(tenant, "status", None),
                starting_db_configured=has_db_config(tenant),
            )
            for tenant in tenants
        ]
    finally:
        db.close()


def apply_cleanup(
    *,
    tenant_id: int,
    actor_email: str,
    tenant_service: TenantService,
    provisioning_service: ProvisioningService,
) -> list[str]:
    db = ControlSessionLocal()
    actions: list[str] = []
    try:
        tenant = tenant_service.tenant_repository.get_by_id(db, tenant_id)
        if tenant is None:
            raise ValueError("Tenant not found")

        if tenant.status != "archived":
            tenant = tenant_service.set_status(
                db,
                tenant.id,
                status="archived",
                status_reason="Limpieza automatizada de tenants efimeros E2E",
            )
            actions.append("archived")

        if has_db_config(tenant):
            live_jobs = (
                db.query(ProvisioningJob)
                .filter(ProvisioningJob.tenant_id == tenant.id)
                .filter(ProvisioningJob.status.in_(["pending", "retry_pending", "running"]))
                .all()
            )
            if live_jobs:
                for job in live_jobs:
                    job.status = "failed"
                    job.error_code = "e2e_cleanup_aborted"
                    job.error_message = "Neutralizado por cleanup automatizado de tenants E2E"
                    job.next_retry_at = None
                db.commit()
                actions.append(f"stale_jobs_failed:{len(live_jobs)}")

            job = tenant_service.request_deprovision_tenant(db, tenant.id)
            actions.append(f"deprovision_job_requested:{job.id}")
            provisioning_service.run_job(db, job.id)
            actions.append(f"deprovision_job_completed:{job.id}")
            tenant = tenant_service.tenant_repository.get_by_id(db, tenant.id)

        tenant_service.delete_tenant(
            db,
            tenant_id=tenant.id,
            deleted_by_email=actor_email,
        )
        actions.append("deleted")
        return actions
    finally:
        db.close()


def main() -> int:
    args = parse_args()
    candidates = collect_candidates(args.prefix, args.limit)
    tenant_service = TenantService()
    provisioning_service = ProvisioningService()

    results: list[TenantCleanupResult] = []

    for candidate in candidates:
        if not args.apply:
            candidate.actions.append("would_archive_delete_via_lifecycle")
            candidate.outcome = "dry_run"
            results.append(candidate)
            continue

        try:
            candidate.actions.extend(
                apply_cleanup(
                    tenant_id=candidate.tenant_id,
                    actor_email=args.actor_email,
                    tenant_service=tenant_service,
                    provisioning_service=provisioning_service,
                )
            )
            candidate.outcome = "deleted"
        except Exception as exc:  # noqa: BLE001
            candidate.outcome = "error"
            candidate.error = str(exc)
        results.append(candidate)

    summary = {
        "prefix": args.prefix,
        "apply": args.apply,
        "count": len(results),
        "deleted": sum(1 for item in results if item.outcome == "deleted"),
        "dry_run": sum(1 for item in results if item.outcome == "dry_run"),
        "errors": sum(1 for item in results if item.outcome == "error"),
        "results": [item.as_dict() for item in results],
    }

    args.report_out.parent.mkdir(parents=True, exist_ok=True)
    args.report_out.write_text(
        json.dumps(summary, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0 if summary["errors"] == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
