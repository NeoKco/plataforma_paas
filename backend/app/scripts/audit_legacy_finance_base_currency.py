from __future__ import annotations

import argparse
import sys
from collections import Counter
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[2]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.apps.platform_control.models.tenant import Tenant  # noqa: E402
from app.apps.tenant_modules.core.services.tenant_connection_service import (  # noqa: E402
    TenantConnectionService,
)
from app.apps.tenant_modules.finance.models.account import FinanceAccount  # noqa: E402
from app.apps.tenant_modules.finance.models.currency import FinanceCurrency  # noqa: E402
from app.apps.tenant_modules.finance.models.settings import FinanceSetting  # noqa: E402
from app.apps.tenant_modules.finance.models.transaction import FinanceTransaction  # noqa: E402
from app.common.db.control_database import ControlSessionLocal  # noqa: E402
from app.scripts.seed_missing_tenant_defaults import get_finance_defaults_status  # noqa: E402


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=(
            "Audita tenants con base financiera legacy para decidir si requieren "
            "migración guiada, reparación simple o convivencia legacy."
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
        help="Máximo de tenants cuando se usa --all-active",
    )
    return parser


def _has_finance_usage(tenant_db) -> bool:
    return (
        tenant_db.query(FinanceTransaction.id)
        .filter(FinanceTransaction.is_voided.is_(False))
        .first()
        is not None
        or tenant_db.query(FinanceAccount.id).first() is not None
    )


def _list_currency_counter(tenant_db, model, field_name: str) -> dict[str, int]:
    currency_by_id = {
        row.id: row.code.strip().upper() for row in tenant_db.query(FinanceCurrency).all()
    }
    counter: Counter[str] = Counter()
    query = tenant_db.query(model)
    if model is FinanceTransaction:
        query = query.filter(FinanceTransaction.is_voided.is_(False))

    for item in query.all():
        currency_id = getattr(item, field_name, None)
        if currency_id is None:
            continue
        counter[currency_by_id.get(currency_id, f"unknown:{currency_id}")] += 1
    return dict(sorted(counter.items()))


def _summarize_non_base_transactions(
    tenant_db,
    *,
    currency_by_id: dict[int, str],
    base_currency_id: int | None,
) -> dict:
    query = (
        tenant_db.query(FinanceTransaction)
        .filter(FinanceTransaction.is_voided.is_(False))
        .order_by(FinanceTransaction.id.asc())
    )

    total = 0
    missing_exchange_rate = 0
    missing_base_amount = 0
    exchange_rates: set[float] = set()
    currencies: Counter[str] = Counter()
    sample_ids: list[int] = []

    for item in query.all():
        if base_currency_id is not None and item.currency_id == base_currency_id:
            continue
        total += 1
        currencies[currency_by_id.get(item.currency_id, f"unknown:{item.currency_id}")] += 1
        if item.exchange_rate is None or item.exchange_rate <= 0:
            missing_exchange_rate += 1
        else:
            exchange_rates.add(round(float(item.exchange_rate), 6))
        if item.amount_in_base_currency is None:
            missing_base_amount += 1
        if len(sample_ids) < 10:
            sample_ids.append(item.id)

    return {
        "count": total,
        "missing_exchange_rate_count": missing_exchange_rate,
        "missing_base_amount_count": missing_base_amount,
        "exchange_rates": sorted(exchange_rates),
        "currencies": dict(sorted(currencies.items())),
        "sample_transaction_ids": sample_ids,
    }


def assess_legacy_finance_base_currency(tenant_db) -> dict:
    currencies = tenant_db.query(FinanceCurrency).all()
    base_currency = next((item for item in currencies if item.is_base), None)
    currency_by_id = {item.id: item.code.strip().upper() for item in currencies}
    base_setting = (
        tenant_db.query(FinanceSetting)
        .filter(FinanceSetting.setting_key == "base_currency_code")
        .first()
    )
    has_usage = _has_finance_usage(tenant_db)
    finance_defaults_status = get_finance_defaults_status(tenant_db, force=False)
    audit_note = (
        str(finance_defaults_status["audit_note"])
        if finance_defaults_status["audit_note"] is not None
        else None
    )
    base_currency_code = base_currency.code.strip().upper() if base_currency else None
    base_setting_code = (
        base_setting.setting_value.strip().upper()
        if base_setting is not None and base_setting.setting_value
        else None
    )
    account_counts = _list_currency_counter(tenant_db, FinanceAccount, "currency_id")
    transaction_counts = _list_currency_counter(tenant_db, FinanceTransaction, "currency_id")
    non_base_transaction_summary = _summarize_non_base_transactions(
        tenant_db,
        currency_by_id=currency_by_id,
        base_currency_id=base_currency.id if base_currency is not None else None,
    )

    if base_currency_code == "CLP" and base_setting_code == "CLP" and audit_note is None:
        recommendation = "no_action"
        status = "ok"
    elif not has_usage and base_currency_code in {None, "USD"} and base_setting_code in {None, "USD"}:
        recommendation = "promote_clp_without_usage"
        status = "warning"
    elif base_currency_code != base_setting_code:
        if (
            non_base_transaction_summary["missing_exchange_rate_count"] == 0
            and non_base_transaction_summary["missing_base_amount_count"] == 0
        ):
            recommendation = "repair_base_currency_setting_only"
        else:
            recommendation = "manual_migration_review"
        status = "warning"
    elif audit_note is not None and has_usage and base_currency_code == "USD":
        recommendation = "manual_migration_review"
        status = "warning"
    else:
        recommendation = "manual_review"
        status = "warning"

    return {
        "status": status,
        "has_usage": has_usage,
        "audit_note": audit_note,
        "base_currency_code": base_currency_code,
        "base_setting_code": base_setting_code,
        "account_counts_by_currency": account_counts,
        "transaction_counts_by_currency": transaction_counts,
        "non_base_transaction_summary": non_base_transaction_summary,
        "recommendation": recommendation,
    }


def _open_tenant_session(tenant):
    session_factory = TenantConnectionService().get_tenant_session(tenant)
    return session_factory()


def main() -> int:
    args = build_parser().parse_args()
    control_db = ControlSessionLocal()
    try:
        query = control_db.query(Tenant).filter(Tenant.status == "active")
        if args.tenant_slug:
            query = query.filter(Tenant.slug == args.tenant_slug)

        tenants = [
            tenant
            for tenant in query.order_by(Tenant.slug.asc()).all()
            if tenant.db_name and tenant.db_user and tenant.db_host and tenant.db_port
        ]
        if args.all_active:
            tenants = tenants[: max(min(args.limit, 500), 1)]

        processed = 0
        warnings = 0
        recommendations: Counter[str] = Counter()
        notes_by_reason: Counter[str] = Counter()
        for tenant in tenants:
            processed += 1
            tenant_db = _open_tenant_session(tenant)
            try:
                result = assess_legacy_finance_base_currency(tenant_db)
            finally:
                tenant_db.close()

            if result["status"] != "ok":
                warnings += 1
            recommendations[result["recommendation"]] += 1
            if result["audit_note"]:
                notes_by_reason[result["audit_note"]] += 1
            print(
                "{slug}: status={status} base_currency={base_currency} setting={setting} "
                "has_usage={has_usage} note={note} recommendation={recommendation} "
                "accounts={accounts} transactions={transactions} non_base={non_base}".format(
                    slug=tenant.slug,
                    status=result["status"],
                    base_currency=result["base_currency_code"],
                    setting=result["base_setting_code"],
                    has_usage=result["has_usage"],
                    note=result["audit_note"] or "-",
                    recommendation=result["recommendation"],
                    accounts=result["account_counts_by_currency"],
                    transactions=result["transaction_counts_by_currency"],
                    non_base=result["non_base_transaction_summary"],
                )
            )

        print(
            "Legacy finance base currency audit summary: processed={processed}, warnings={warnings}, "
            "recommendations={recommendations}, notes_by_reason={notes_by_reason}".format(
                processed=processed,
                warnings=warnings,
                recommendations=dict(sorted(recommendations.items())),
                notes_by_reason=dict(sorted(notes_by_reason.items())),
            )
        )
        return 0
    finally:
        control_db.close()


if __name__ == "__main__":
    raise SystemExit(main())
