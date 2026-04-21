from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import or_


BACKEND_DIR = Path(__file__).resolve().parents[2]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.apps.platform_control.models.tenant import Tenant  # noqa: E402
from app.apps.tenant_modules.core.services.tenant_connection_service import (  # noqa: E402
    TenantConnectionService,
)
from app.apps.tenant_modules.core.services.tenant_data_service import (  # noqa: E402
    TenantDataService,
)
from app.apps.tenant_modules.maintenance.models.cost_actual import (  # noqa: E402
    MaintenanceCostActual,
)
from app.apps.tenant_modules.maintenance.models.work_order import (  # noqa: E402
    MaintenanceWorkOrder,
)
from app.apps.tenant_modules.maintenance.services.history_service import (  # noqa: E402
    MaintenanceHistoryService,
)
from app.common.policies.tenant_plan_policy_service import (  # noqa: E402
    TenantPlanPolicyService,
)
from app.common.db.control_database import ControlSessionLocal  # noqa: E402
from app.scripts.seed_missing_tenant_defaults import (  # noqa: E402
    get_finance_defaults_status,
    _needs_core_seed,
)


EXPECTED_FINANCE_SUMMARY_KEYS = {
    "has_actual_cost",
    "is_synced_to_finance",
    "income_transaction_id",
    "expense_transaction_id",
    "finance_synced_at",
}

ACCEPTED_NOTE_PREFIXES = {
    "accepted_legacy_finance_base_currency",
}


def is_accepted_tenant_note(note: str) -> bool:
    normalized = str(note or "").strip().lower()
    if not normalized:
        return False
    prefix = normalized.split(":", 1)[0]
    return prefix in ACCEPTED_NOTE_PREFIXES


def determine_overall_status(
    *,
    warnings: int,
    failed: int,
    tenants_with_notes: int,
    accepted_tenants_with_notes: int,
) -> str:
    if failed:
        return "failed"
    if warnings:
        return "warning"
    if tenants_with_notes:
        return "ok_with_notes"
    if accepted_tenants_with_notes:
        return "ok_with_accepted_notes"
    return "ok"


def build_audit_summary(
    *,
    processed: int,
    warnings: int,
    failed: int,
    failed_by_reason: dict[str, int],
    tenants_with_notes: int,
    notes_by_reason: dict[str, int],
    accepted_tenants_with_notes: int = 0,
    accepted_notes_by_reason: dict[str, int] | None = None,
) -> str:
    summary = (
        "Tenant convergence audit summary: processed={processed}, warnings={warnings}, "
        "failed={failed}".format(
            processed=processed,
            warnings=warnings,
            failed=failed,
        )
    )
    if tenants_with_notes:
        summary += f", tenants_with_notes={tenants_with_notes}"
    if accepted_tenants_with_notes:
        summary += f", accepted_tenants_with_notes={accepted_tenants_with_notes}"
    if failed_by_reason:
        summary += f", failed_by_reason={failed_by_reason}"
    if notes_by_reason:
        summary += f", notes_by_reason={notes_by_reason}"
    if accepted_notes_by_reason:
        summary += f", accepted_notes_by_reason={accepted_notes_by_reason}"
    return summary


def build_audit_payload(
    *,
    processed: int,
    warnings: int,
    failed: int,
    failed_by_reason: dict[str, int],
    tenants_with_notes: int,
    notes_by_reason: dict[str, int],
    accepted_tenants_with_notes: int = 0,
    accepted_notes_by_reason: dict[str, int] | None = None,
    tenant_results: list[dict] | None = None,
    target: str,
    limit: int | None,
    include_archived: bool,
) -> dict:
    accepted_notes_by_reason = accepted_notes_by_reason or {}
    tenant_results = tenant_results or []
    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "target": target,
        "limit": limit,
        "include_archived": include_archived,
        "overall_status": determine_overall_status(
            warnings=warnings,
            failed=failed,
            tenants_with_notes=tenants_with_notes,
            accepted_tenants_with_notes=accepted_tenants_with_notes,
        ),
        "summary": {
            "processed": processed,
            "warnings": warnings,
            "failed": failed,
            "tenants_with_notes": tenants_with_notes,
            "accepted_tenants_with_notes": accepted_tenants_with_notes,
            "failed_by_reason": dict(sorted(failed_by_reason.items())),
            "notes_by_reason": dict(sorted(notes_by_reason.items())),
            "accepted_notes_by_reason": dict(sorted(accepted_notes_by_reason.items())),
        },
        "tenant_results": tenant_results,
    }


def classify_tenant_operational_error(exc: Exception) -> str:
    detail = str(exc).lower()

    if (
        "password authentication failed" in detail
        or "autentificación password falló" in detail
        or "authentication failed" in detail
    ):
        return "invalid_db_credentials"

    if (
        "connection refused" in detail
        or "could not connect to server" in detail
        or "timeout expired" in detail
        or "server closed the connection unexpectedly" in detail
    ):
        return "db_unreachable"

    if (
        "undefinedtable" in detail
        or "no such table" in detail
        or "relation" in detail
        and "does not exist" in detail
    ):
        return "schema_incomplete"

    return "unknown_error"


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=(
            "Audita convergencia operativa por tenant activo despues de deploy. "
            "No escribe cambios; detecta drift de defaults, history payload y "
            "mantenciones cerradas no sincronizadas a finanzas."
        )
    )
    target_group = parser.add_mutually_exclusive_group(required=True)
    target_group.add_argument("--tenant-slug", help="Slug del tenant a auditar")
    target_group.add_argument(
        "--all-active",
        action="store_true",
        help="Audita todos los tenants activos con DB configurada",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=100,
        help="Maximo de tenants cuando se usa --all-active",
    )
    parser.add_argument(
        "--include-archived",
        action="store_true",
        help="Incluye tenants archivados si se usa --all-active",
    )
    parser.add_argument(
        "--format",
        choices=("text", "json"),
        default="text",
        help="Formato principal de salida",
    )
    parser.add_argument(
        "--json-output-file",
        help="Ruta opcional para guardar un snapshot JSON sin cambiar la salida principal",
    )
    return parser


def _open_tenant_session(tenant):
    session_factory = TenantConnectionService().get_tenant_session(tenant)
    return session_factory()


def _find_unsynced_work_order_ids(tenant_db) -> list[int]:
    candidates = (
        tenant_db.query(MaintenanceWorkOrder.id)
        .join(MaintenanceCostActual, MaintenanceCostActual.work_order_id == MaintenanceWorkOrder.id)
        .filter(MaintenanceWorkOrder.maintenance_status == "completed")
        .filter(
            or_(
                (
                    (MaintenanceCostActual.actual_price_charged > 0)
                    & (MaintenanceCostActual.income_transaction_id.is_(None))
                ),
                (
                    (MaintenanceCostActual.total_actual_cost > 0)
                    & (MaintenanceCostActual.expense_transaction_id.is_(None))
                ),
            )
        )
        .order_by(MaintenanceWorkOrder.completed_at.asc(), MaintenanceWorkOrder.id.asc())
        .all()
    )
    return [item[0] for item in candidates]


def _audit_history_payload(tenant_db) -> tuple[bool, str | None]:
    history_entries = MaintenanceHistoryService().list_history(tenant_db)
    for entry in history_entries:
        finance_summary = entry.get("finance_summary")
        if not isinstance(finance_summary, dict):
            return False, "finance_summary_missing"
        if not EXPECTED_FINANCE_SUMMARY_KEYS.issubset(finance_summary.keys()):
            return False, "finance_summary_incomplete"
    return True, None


def _audit_single_tenant(tenant) -> dict:
    tenant_db = _open_tenant_session(tenant)
    try:
        tenant_data_service = TenantDataService()
        tenant_plan_policy_service = TenantPlanPolicyService()
        policy = tenant_data_service.get_maintenance_finance_sync_policy(tenant_db)
        enabled_modules = {
            item.strip().lower()
            for item in (tenant_plan_policy_service.get_enabled_modules(tenant.plan_code) or [])
            if item and item.strip()
        }
        should_check_core_defaults = bool({"all", "core"} & enabled_modules)
        should_check_finance_defaults = bool({"all", "core", "finance"} & enabled_modules)

        needs_core_seed = should_check_core_defaults and _needs_core_seed(tenant_db)
        needs_finance_seed = False
        finance_seed_reason: str | None = None
        finance_audit_note: str | None = None
        if should_check_finance_defaults:
            finance_status = get_finance_defaults_status(
                tenant_db,
                force=False,
                tenant_slug=tenant.slug,
            )
            needs_finance_seed = bool(finance_status["needs_seed"])
            finance_seed_reason = str(finance_status["seed_reason"])
            finance_audit_note = (
                str(finance_status["audit_note"])
                if finance_status["audit_note"] is not None
                else None
            )
        unsynced_work_order_ids = _find_unsynced_work_order_ids(tenant_db)
        history_payload_ok, history_error = _audit_history_payload(tenant_db)

        notes: list[str] = []
        critical_issues: list[str] = []
        if needs_core_seed:
            notes.append("missing_core_defaults")
        if needs_finance_seed:
            notes.append(f"missing_finance_defaults:{finance_seed_reason}")
        elif finance_audit_note:
            notes.append(finance_audit_note)
        if unsynced_work_order_ids:
            critical_issues.append(
                f"unsynced_completed_work_orders:{len(unsynced_work_order_ids)}"
            )
        if not history_payload_ok:
            critical_issues.append(history_error or "history_payload_invalid")

        status = "ok" if not critical_issues else "warning"
        return {
            "tenant_slug": tenant.slug,
            "status": status,
            "critical_issues": critical_issues,
            "notes": notes,
            "policy": policy,
            "unsynced_work_order_ids": unsynced_work_order_ids,
        }
    finally:
        tenant_db.close()


def main() -> int:
    args = build_parser().parse_args()
    control_db = ControlSessionLocal()
    try:
        query = control_db.query(Tenant)
        if args.tenant_slug:
            query = query.filter(Tenant.slug == args.tenant_slug)
        elif args.include_archived:
            pass
        else:
            query = query.filter(Tenant.status == "active")

        tenants = [
            tenant
            for tenant in query.order_by(Tenant.slug.asc()).all()
            if tenant.db_name and tenant.db_user and tenant.db_host and tenant.db_port
        ]
        if args.all_active:
            tenants = tenants[: max(min(args.limit, 500), 1)]

        processed = 0
        warnings = 0
        failed = 0
        tenants_with_notes = 0
        accepted_tenants_with_notes = 0
        failed_by_reason: dict[str, int] = {}
        notes_by_reason: dict[str, int] = {}
        accepted_notes_by_reason: dict[str, int] = {}
        tenant_results: list[dict] = []

        for tenant in tenants:
            processed += 1
            try:
                result = _audit_single_tenant(tenant)
            except Exception as exc:  # pragma: no cover - operational fallback
                failed += 1
                failure_reason = classify_tenant_operational_error(exc)
                failed_by_reason[failure_reason] = (
                    failed_by_reason.get(failure_reason, 0) + 1
                )
                failure_result = {
                    "tenant_slug": tenant.slug,
                    "status": "failed",
                    "failure_reason": failure_reason,
                    "failure_detail": str(exc),
                }
                tenant_results.append(failure_result)
                if args.format == "text":
                    print(f"{tenant.slug}: failed reason={failure_reason} detail=({exc})")
                continue

            if result["status"] != "ok":
                warnings += 1
            tenant_results.append(result)

            if args.format == "text":
                print(
                    "{slug}: status={status} policy={policy} issues={issues} unsynced_ids={ids}".format(
                        slug=result["tenant_slug"],
                        status=result["status"],
                        policy=result["policy"]["maintenance_finance_sync_mode"],
                        issues=result["critical_issues"] or ["none"],
                        ids=result["unsynced_work_order_ids"],
                    )
                )
            if result["notes"]:
                pending_notes = [
                    note for note in result["notes"] if not is_accepted_tenant_note(note)
                ]
                accepted_notes = [
                    note for note in result["notes"] if is_accepted_tenant_note(note)
                ]
                if pending_notes:
                    tenants_with_notes += 1
                if accepted_notes:
                    accepted_tenants_with_notes += 1
                for note in result["notes"]:
                    target = (
                        accepted_notes_by_reason
                        if is_accepted_tenant_note(note)
                        else notes_by_reason
                    )
                    target[note] = target.get(note, 0) + 1
                if args.format == "text":
                    print(f"{result['tenant_slug']}: notes={result['notes']}")

        summary = build_audit_summary(
            processed=processed,
            warnings=warnings,
            failed=failed,
            failed_by_reason=failed_by_reason,
            tenants_with_notes=tenants_with_notes,
            notes_by_reason=notes_by_reason,
            accepted_tenants_with_notes=accepted_tenants_with_notes,
            accepted_notes_by_reason=accepted_notes_by_reason,
        )
        payload = build_audit_payload(
            processed=processed,
            warnings=warnings,
            failed=failed,
            failed_by_reason=failed_by_reason,
            tenants_with_notes=tenants_with_notes,
            notes_by_reason=notes_by_reason,
            accepted_tenants_with_notes=accepted_tenants_with_notes,
            accepted_notes_by_reason=accepted_notes_by_reason,
            tenant_results=tenant_results,
            target=args.tenant_slug or "all-active",
            limit=args.limit if args.all_active else None,
            include_archived=bool(args.include_archived),
        )

        if args.json_output_file:
            output_path = Path(args.json_output_file)
            output_path.parent.mkdir(parents=True, exist_ok=True)
            output_path.write_text(
                json.dumps(payload, indent=2, ensure_ascii=True) + "\n",
                encoding="utf-8",
            )

        if args.format == "json":
            print(json.dumps(payload, indent=2, ensure_ascii=True))
        else:
            print(summary)
        return 0 if warnings == 0 and failed == 0 else 1
    finally:
        control_db.close()


if __name__ == "__main__":
    raise SystemExit(main())
