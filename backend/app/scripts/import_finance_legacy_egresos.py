import argparse
import csv
import json
import mimetypes
import shutil
import subprocess
import sys
from dataclasses import asdict, dataclass
from datetime import date, datetime, time, timezone
from pathlib import Path

from sqlalchemy.orm import Session

BACKEND_DIR = Path(__file__).resolve().parents[2]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.apps.platform_control.repositories.tenant_repository import TenantRepository
from app.apps.platform_control.services.tenant_service import TenantService
from app.apps.tenant_modules.core.models.user import User
from app.apps.tenant_modules.core.services.tenant_connection_service import (
    TenantConnectionService,
)
from app.apps.tenant_modules.finance.models import FinanceAccount, FinanceCurrency, FinanceTransaction
from app.apps.tenant_modules.finance.repositories import (
    FinanceCategoryRepository,
    FinanceTransactionAttachmentRepository,
)
from app.apps.tenant_modules.finance.schemas import (
    FinanceAccountCreateRequest,
    FinanceCategoryCreateRequest,
    FinanceTransactionCreateRequest,
)
from app.apps.tenant_modules.finance.services import (
    FinanceAccountService,
    FinanceCategoryService,
    FinanceService,
)
from app.apps.tenant_modules.finance.utils.imports import (
    FINANCE_LEGACY_EGRESOS_SOURCE_TYPE,
    build_default_finance_legacy_egresos_profile,
)
from app.common.db.control_database import ControlSessionLocal


@dataclass
class PreparedExpenseRow:
    legacy_id: int
    legacy_user_id: int | None
    amount: float
    category_legacy_id: str
    category_name: str
    category_icon: str | None
    description: str
    transaction_date: str
    transaction_type: str
    account_name: str
    currency_code: str
    notes: str
    legacy_attachment_path: str | None
    source_attachment_path: str | None
    prepared_attachment_path: str | None
    attachment_exists: bool
    importable: bool
    skip_reason: str | None


def _deep_merge(base: dict, override: dict) -> dict:
    merged = dict(base)
    for key, value in override.items():
        if isinstance(value, dict) and isinstance(merged.get(key), dict):
            merged[key] = _deep_merge(merged[key], value)
            continue
        merged[key] = value
    return merged


def load_or_create_profile(profile_path: Path) -> dict:
    profile = build_default_finance_legacy_egresos_profile()
    if profile_path.exists():
        loaded = json.loads(profile_path.read_text(encoding="utf-8"))
        return _deep_merge(profile, loaded)

    profile_path.parent.mkdir(parents=True, exist_ok=True)
    profile_path.write_text(
        json.dumps(profile, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    return profile


def parse_args() -> argparse.Namespace:
    default_csv = Path("/home/felipe/platform_paas/modulo finanzas/ejemplo/egresos.csv")
    default_images_dir = Path(
        "/home/felipe/platform_paas/modulo finanzas/ejemplo/imagenes de documentos"
    )
    default_profile = Path(
        "/home/felipe/platform_paas/modulo finanzas/ejemplo/egresos_finance_profile.json"
    )
    default_prepared_csv = Path(
        "/home/felipe/platform_paas/modulo finanzas/ejemplo/egresos_finance_import.csv"
    )
    default_prepared_images = Path(
        "/home/felipe/platform_paas/modulo finanzas/ejemplo/imagenes_finance_preparadas"
    )
    default_report = Path(
        "/home/felipe/platform_paas/modulo finanzas/ejemplo/egresos_finance_import_report.json"
    )

    parser = argparse.ArgumentParser(
        description="Prepare and optionally import legacy egresos.csv into finance."
    )
    parser.add_argument("--csv", type=Path, default=default_csv)
    parser.add_argument("--images-dir", type=Path, default=default_images_dir)
    parser.add_argument("--profile", type=Path, default=default_profile)
    parser.add_argument("--prepared-csv-out", type=Path, default=default_prepared_csv)
    parser.add_argument("--prepared-images-dir", type=Path, default=default_prepared_images)
    parser.add_argument("--report-out", type=Path, default=default_report)
    parser.add_argument("--tenant-slug", default="empresa-demo")
    parser.add_argument("--actor-user-id", type=int, default=1)
    parser.add_argument("--prepare-only", action="store_true")
    parser.add_argument("--apply", action="store_true")
    return parser.parse_args()


def prepare_rows(
    csv_path: Path,
    images_dir: Path,
    prepared_images_dir: Path,
    profile: dict,
) -> tuple[list[PreparedExpenseRow], dict]:
    rows: list[PreparedExpenseRow] = []
    convert_bin = shutil.which("convert")
    compression_profile = profile.get("compression", {})
    compression_stats = {
        "convert_available": bool(convert_bin),
        "source_images": 0,
        "prepared_images": 0,
        "source_bytes": 0,
        "prepared_bytes": 0,
    }

    prepared_images_dir.mkdir(parents=True, exist_ok=True)

    with csv_path.open(encoding="utf-8-sig", newline="") as csv_file:
        reader = csv.DictReader(csv_file, delimiter=";")
        for raw in reader:
            legacy_id = int((raw.get("id") or "0").strip() or "0")
            legacy_user_id = int(raw["user_id"]) if (raw.get("user_id") or "").strip() else None
            amount = float((raw.get("monto") or "0").strip() or "0")
            category_legacy_id = (raw.get("categoria_id") or "").strip()
            category_profile = profile["categories"].get(category_legacy_id, {})
            category_name = category_profile.get(
                "name",
                f"Legacy categoria {category_legacy_id or 'sin_id'}",
            )
            category_icon = category_profile.get("icon")
            description = (raw.get("descripcion") or "").strip() or f"Egreso importado #{legacy_id}"
            transaction_date = (raw.get("fecha") or "").strip()
            legacy_attachment_path = (raw.get("foto_path") or "").strip() or None

            source_attachment_path = None
            prepared_attachment_path = None
            attachment_exists = False
            if legacy_attachment_path:
                image_name = Path(legacy_attachment_path).name
                source_image_path = images_dir / image_name
                source_attachment_path = str(source_image_path)
                if source_image_path.exists():
                    attachment_exists = True
                    prepared_image_path = prepared_images_dir / image_name
                    _prepare_image(
                        source_image_path=source_image_path,
                        prepared_image_path=prepared_image_path,
                        convert_bin=convert_bin,
                        compression_profile=compression_profile,
                        compression_stats=compression_stats,
                    )
                    prepared_attachment_path = str(prepared_image_path)

            importable = True
            skip_reason = None
            if amount <= 0:
                importable = False
                skip_reason = "amount_non_positive"
            elif not transaction_date:
                importable = False
                skip_reason = "missing_transaction_date"

            notes = (
                "Importado desde egresos.csv | "
                f"legacy_id={legacy_id} | "
                f"legacy_user_id={legacy_user_id or ''} | "
                f"legacy_category_id={category_legacy_id or ''}"
            )
            if legacy_attachment_path:
                notes += f" | legacy_attachment={legacy_attachment_path}"

            rows.append(
                PreparedExpenseRow(
                    legacy_id=legacy_id,
                    legacy_user_id=legacy_user_id,
                    amount=amount,
                    category_legacy_id=category_legacy_id,
                    category_name=category_name,
                    category_icon=category_icon,
                    description=description,
                    transaction_date=transaction_date,
                    transaction_type=profile["transaction_type"],
                    account_name=profile["account_name"],
                    currency_code=profile["currency_code"],
                    notes=notes,
                    legacy_attachment_path=legacy_attachment_path,
                    source_attachment_path=source_attachment_path,
                    prepared_attachment_path=prepared_attachment_path,
                    attachment_exists=attachment_exists,
                    importable=importable,
                    skip_reason=skip_reason,
                )
            )

    return rows, compression_stats


def _prepare_image(
    *,
    source_image_path: Path,
    prepared_image_path: Path,
    convert_bin: str | None,
    compression_profile: dict,
    compression_stats: dict,
) -> None:
    compression_stats["source_images"] += 1
    compression_stats["source_bytes"] += source_image_path.stat().st_size

    if prepared_image_path.exists():
        compression_stats["prepared_images"] += 1
        compression_stats["prepared_bytes"] += prepared_image_path.stat().st_size
        return

    prepared_image_path.parent.mkdir(parents=True, exist_ok=True)

    if convert_bin:
        max_width = compression_profile.get("max_width", 1800)
        max_height = compression_profile.get("max_height", 1800)
        quality = compression_profile.get("quality", 72)
        command = [
            convert_bin,
            str(source_image_path),
            "-auto-orient",
            "-strip",
            "-resize",
            f"{max_width}x{max_height}>",
            "-quality",
            str(quality),
            str(prepared_image_path),
        ]
        try:
            subprocess.run(command, check=True, capture_output=True, text=True)
        except subprocess.CalledProcessError:
            shutil.copy2(source_image_path, prepared_image_path)
    else:
        shutil.copy2(source_image_path, prepared_image_path)

    compression_stats["prepared_images"] += 1
    compression_stats["prepared_bytes"] += prepared_image_path.stat().st_size


def write_prepared_csv(prepared_csv_out: Path, rows: list[PreparedExpenseRow]) -> None:
    prepared_csv_out.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = list(asdict(rows[0]).keys()) if rows else []
    with prepared_csv_out.open("w", encoding="utf-8", newline="") as csv_file:
        writer = csv.DictWriter(csv_file, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow(asdict(row))


def import_rows(
    *,
    tenant_slug: str,
    actor_user_id: int,
    rows: list[PreparedExpenseRow],
    profile: dict,
) -> dict:
    control_db = ControlSessionLocal()
    tenant_db: Session | None = None

    tenant_repository = TenantRepository()
    tenant_connection_service = TenantConnectionService()
    tenant_service = TenantService()
    finance_service = FinanceService()
    account_service = FinanceAccountService()
    category_service = FinanceCategoryService()
    category_repository = FinanceCategoryRepository()
    attachment_repository = FinanceTransactionAttachmentRepository()

    report = {
        "tenant_slug": tenant_slug,
        "source_type": profile["source_type"],
        "prepared_rows": len(rows),
        "created_transactions": 0,
        "existing_transactions": 0,
        "created_attachments": 0,
        "existing_attachments": 0,
        "skipped_rows": 0,
        "failed_rows": [],
        "created_categories": [],
    }

    try:
        tenant = tenant_repository.get_by_slug(control_db, tenant_slug)
        if tenant is None:
            raise RuntimeError(f"Tenant slug not found: {tenant_slug}")

        tenant_status_error = tenant_service.get_tenant_status_error(tenant)
        if tenant_status_error is not None:
            raise RuntimeError(
                f"Tenant not available for import: {tenant_status_error[1]}"
            )

        tenant_session_factory = tenant_connection_service.get_tenant_session(tenant)
        tenant_db = tenant_session_factory()

        actor_user = tenant_db.query(User).filter(User.id == actor_user_id).first()
        if actor_user is None:
            raise RuntimeError(f"Actor user id not found in tenant DB: {actor_user_id}")

        currency = (
            tenant_db.query(FinanceCurrency)
            .filter(FinanceCurrency.code == profile["currency_code"])
            .first()
        )
        if currency is None:
            raise RuntimeError(
                f"Currency code not found in tenant DB: {profile['currency_code']}"
            )

        account = (
            tenant_db.query(FinanceAccount)
            .filter(FinanceAccount.name == profile["account_name"])
            .first()
        )
        if account is None:
            account = account_service.create_account(
                tenant_db,
                FinanceAccountCreateRequest(
                    name=profile["account_name"],
                    code="LEGACY-EGRESOS",
                    account_type=profile["account_type"],
                    currency_id=currency.id,
                    icon="cash",
                ),
            )
        elif not account.is_active:
            account.is_active = True
            tenant_db.add(account)
            tenant_db.commit()
            tenant_db.refresh(account)

        category_cache: dict[str, int] = {}
        for row in rows:
            if not row.importable:
                continue
            cache_key = row.category_name
            if cache_key in category_cache:
                continue

            category = category_repository.get_by_name_and_type(
                tenant_db,
                row.category_name,
                row.transaction_type,
            )
            if category is None:
                category = category_service.create_category(
                    tenant_db,
                    FinanceCategoryCreateRequest(
                        name=row.category_name,
                        category_type=row.transaction_type,
                        icon=row.category_icon,
                    ),
                )
                report["created_categories"].append(row.category_name)
            else:
                category_changed = False
                if not category.is_active:
                    category.is_active = True
                    category_changed = True
                if not category.icon and row.category_icon:
                    category.icon = row.category_icon
                    category_changed = True
                if category_changed:
                    tenant_db.add(category)
                    tenant_db.commit()
                    tenant_db.refresh(category)
            category_cache[cache_key] = category.id

        for row in rows:
            if not row.importable:
                report["skipped_rows"] += 1
                continue

            try:
                transaction = (
                    tenant_db.query(FinanceTransaction)
                    .filter(FinanceTransaction.source_type == profile["source_type"])
                    .filter(FinanceTransaction.source_id == row.legacy_id)
                    .first()
                )

                if transaction is None:
                    transaction_date = date.fromisoformat(row.transaction_date)
                    payload = FinanceTransactionCreateRequest(
                        transaction_type=row.transaction_type,
                        account_id=account.id,
                        category_id=category_cache[row.category_name],
                        currency_id=currency.id,
                        amount=row.amount,
                        transaction_at=datetime.combine(
                            transaction_date,
                            time(hour=12, minute=0, tzinfo=timezone.utc),
                        ),
                        alternative_date=transaction_date,
                        description=row.description,
                        notes=row.notes,
                    )
                    transaction = finance_service.create_transaction(
                        tenant_db,
                        payload,
                        created_by_user_id=actor_user_id,
                        source_type=profile["source_type"],
                        source_id=row.legacy_id,
                        summary="Transaccion importada desde egresos.csv",
                        audit_payload={
                            "legacy_row_id": row.legacy_id,
                            "legacy_category_id": row.category_legacy_id,
                        },
                    )
                    report["created_transactions"] += 1
                else:
                    report["existing_transactions"] += 1

                if row.prepared_attachment_path:
                    existing_attachments = attachment_repository.list_by_transaction(
                        tenant_db,
                        transaction.id,
                    )
                    prepared_path = Path(row.prepared_attachment_path)
                    if any(
                        attachment.file_name == prepared_path.name
                        for attachment in existing_attachments
                    ):
                        report["existing_attachments"] += 1
                    else:
                        finance_service.create_transaction_attachment(
                            tenant_db,
                            transaction.id,
                            file_name=prepared_path.name,
                            content_type=mimetypes.guess_type(prepared_path.name)[0]
                            or "image/jpeg",
                            content_bytes=prepared_path.read_bytes(),
                            notes=profile["attachment_note"],
                            actor_user_id=actor_user_id,
                        )
                        report["created_attachments"] += 1
            except Exception as exc:  # pragma: no cover - integration safeguard
                report["failed_rows"].append(
                    {
                        "legacy_id": row.legacy_id,
                        "description": row.description,
                        "error": str(exc),
                    }
                )

        return report
    finally:
        if tenant_db is not None:
            tenant_db.close()
        control_db.close()


def build_report(
    *,
    profile: dict,
    rows: list[PreparedExpenseRow],
    compression_stats: dict,
    import_report: dict | None,
) -> dict:
    return {
        "profile_name": profile["profile_name"],
        "source_type": profile["source_type"],
        "rows_total": len(rows),
        "rows_importable": sum(1 for row in rows if row.importable),
        "rows_skipped_during_prepare": sum(1 for row in rows if not row.importable),
        "attachments_referenced": sum(1 for row in rows if row.legacy_attachment_path),
        "attachments_found": sum(1 for row in rows if row.attachment_exists),
        "compression": {
            **compression_stats,
            "bytes_saved": max(
                compression_stats["source_bytes"] - compression_stats["prepared_bytes"],
                0,
            ),
        },
        "import": import_report,
    }


def main() -> None:
    args = parse_args()
    profile = load_or_create_profile(args.profile)

    rows, compression_stats = prepare_rows(
        csv_path=args.csv,
        images_dir=args.images_dir,
        prepared_images_dir=args.prepared_images_dir,
        profile=profile,
    )
    write_prepared_csv(args.prepared_csv_out, rows)

    import_report = None
    if args.apply:
        import_report = import_rows(
            tenant_slug=args.tenant_slug,
            actor_user_id=args.actor_user_id,
            rows=rows,
            profile=profile,
        )

    report = build_report(
        profile=profile,
        rows=rows,
        compression_stats=compression_stats,
        import_report=import_report,
    )
    args.report_out.parent.mkdir(parents=True, exist_ok=True)
    args.report_out.write_text(
        json.dumps(report, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )

    print(f"Prepared CSV: {args.prepared_csv_out}")
    print(f"Prepared images dir: {args.prepared_images_dir}")
    if import_report is not None:
        print(
            "Import summary: "
            f"created_transactions={import_report['created_transactions']}, "
            f"existing_transactions={import_report['existing_transactions']}, "
            f"created_attachments={import_report['created_attachments']}, "
            f"existing_attachments={import_report['existing_attachments']}, "
            f"failed_rows={len(import_report['failed_rows'])}"
        )
    print(f"Report: {args.report_out}")


if __name__ == "__main__":
    main()
