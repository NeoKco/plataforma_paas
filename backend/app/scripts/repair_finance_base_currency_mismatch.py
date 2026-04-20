from __future__ import annotations

import argparse
import sys
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[2]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.apps.platform_control.models.tenant import Tenant  # noqa: E402
from app.apps.tenant_modules.core.services.tenant_connection_service import (  # noqa: E402
    TenantConnectionService,
)
from app.apps.tenant_modules.finance.models.currency import FinanceCurrency  # noqa: E402
from app.apps.tenant_modules.finance.models.settings import FinanceSetting  # noqa: E402
from app.common.db.control_database import ControlSessionLocal  # noqa: E402
from app.scripts.audit_legacy_finance_base_currency import (  # noqa: E402
    assess_legacy_finance_base_currency,
)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=(
            "Repara solo el setting base_currency_code cuando el auditor confirma "
            "que la base efectiva ya es correcta y el drift es metadata-only."
        )
    )
    parser.add_argument("--tenant-slug", required=True, help="Slug del tenant a reparar")
    parser.add_argument("--apply", action="store_true", help="Aplica cambios")
    return parser


def repair_base_currency_setting_to_effective_base(tenant_db) -> tuple[str, str]:
    assessment = assess_legacy_finance_base_currency(tenant_db)
    recommendation = str(assessment["recommendation"])
    if recommendation != "repair_base_currency_setting_only":
        raise ValueError(
            "La reparacion metadata-only no es segura para este tenant "
            f"(recommendation={recommendation})"
        )

    target_code = str(assessment["base_currency_code"] or "").strip().upper()
    if not target_code:
        raise ValueError("No existe moneda base efectiva para alinear el setting")

    base_currency = (
        tenant_db.query(FinanceCurrency)
        .filter(FinanceCurrency.is_base.is_(True))
        .first()
    )
    if base_currency is None:
        raise ValueError("No existe una moneda base efectiva configurada")

    setting = (
        tenant_db.query(FinanceSetting)
        .filter(FinanceSetting.setting_key == "base_currency_code")
        .first()
    )
    previous_value = (
        setting.setting_value.strip().upper()
        if setting is not None and setting.setting_value
        else ""
    )

    if setting is None:
        tenant_db.add(
            FinanceSetting(
                setting_key="base_currency_code",
                setting_value=target_code,
                is_active=True,
            )
        )
    else:
        setting.setting_value = target_code
        setting.is_active = True

    return previous_value, target_code


def main() -> int:
    args = build_parser().parse_args()
    control_db = ControlSessionLocal()
    try:
        tenant = control_db.query(Tenant).filter(Tenant.slug == args.tenant_slug).first()
        if tenant is None:
            print(f"{args.tenant_slug}: tenant_not_found")
            return 1

        session_factory = TenantConnectionService().get_tenant_session(tenant)
        if session_factory is None:
            print(f"{args.tenant_slug}: no_tenant_db")
            return 1

        tenant_db = session_factory()
        try:
            before = assess_legacy_finance_base_currency(tenant_db)
            if before["recommendation"] != "repair_base_currency_setting_only":
                print(
                    f"{args.tenant_slug}: skip "
                    f"(recommendation={before['recommendation']} note={before['audit_note']})"
                )
                return 1

            previous_value, target_code = repair_base_currency_setting_to_effective_base(tenant_db)
            if not args.apply:
                tenant_db.rollback()
                print(
                    f"{args.tenant_slug}: would_set base_currency_code "
                    f"from {previous_value or '-'} to {target_code}"
                )
                return 0

            tenant_db.commit()
            after = assess_legacy_finance_base_currency(tenant_db)
            print(
                f"{args.tenant_slug}: repaired base_currency_code "
                f"from {previous_value or '-'} to {target_code} "
                f"(after_note={after['audit_note'] or '-'} "
                f"after_recommendation={after['recommendation']})"
            )
            return 0
        finally:
            tenant_db.close()
    finally:
        control_db.close()


if __name__ == "__main__":
    raise SystemExit(main())
