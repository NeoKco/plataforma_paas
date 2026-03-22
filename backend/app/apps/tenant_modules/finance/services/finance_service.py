from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.apps.tenant_modules.finance.models.entry import FinanceEntry
from app.apps.tenant_modules.finance.repositories.entry_repository import (
    FinanceEntryRepository,
)
from app.common.policies.module_limit_catalog import (
    FINANCE_ENTRIES_LIMIT_KEY,
    FINANCE_ENTRIES_MONTHLY_LIMIT_KEY,
    FINANCE_ENTRIES_MONTHLY_TYPE_LIMIT_KEYS,
)


class FinanceUsageLimitExceededError(ValueError):
    pass


class FinanceService:
    MODULE_LIMIT_KEY = FINANCE_ENTRIES_LIMIT_KEY
    MONTHLY_MODULE_LIMIT_KEY = FINANCE_ENTRIES_MONTHLY_LIMIT_KEY
    MONTHLY_TYPE_MODULE_LIMIT_KEYS = FINANCE_ENTRIES_MONTHLY_TYPE_LIMIT_KEYS

    def __init__(
        self,
        entry_repository: FinanceEntryRepository | None = None,
    ):
        self.entry_repository = entry_repository or FinanceEntryRepository()

    def create_entry(
        self,
        tenant_db: Session,
        movement_type: str,
        concept: str,
        amount: float,
        created_by_user_id: int | None,
        category: str | None = None,
        max_entries: int | None = None,
        max_monthly_entries: int | None = None,
        max_monthly_entries_by_type: dict[str, int] | None = None,
    ) -> FinanceEntry:
        normalized_type = movement_type.strip().lower()
        if normalized_type not in {"income", "expense"}:
            raise ValueError("movement_type debe ser income o expense")

        if amount <= 0:
            raise ValueError("amount debe ser mayor que cero")

        if max_entries is not None and max_entries > 0:
            current_entries = self.entry_repository.count_all(tenant_db)
            if current_entries >= max_entries:
                raise FinanceUsageLimitExceededError(
                    "El plan actual alcanzo el limite de finance.entries"
                )

        if max_monthly_entries is not None and max_monthly_entries > 0:
            current_monthly_entries = self.entry_repository.count_created_since(
                tenant_db,
                self._get_current_month_start(),
            )
            if current_monthly_entries >= max_monthly_entries:
                raise FinanceUsageLimitExceededError(
                    "El plan actual alcanzo el limite de finance.entries.monthly"
                )

        type_monthly_limit = None
        if max_monthly_entries_by_type is not None:
            type_monthly_limit = max_monthly_entries_by_type.get(normalized_type)
        if type_monthly_limit is not None and type_monthly_limit > 0:
            current_type_monthly_entries = (
                self.entry_repository.count_created_since_by_type(
                    tenant_db,
                    self._get_current_month_start(),
                    normalized_type,
                )
            )
            if current_type_monthly_entries >= type_monthly_limit:
                raise FinanceUsageLimitExceededError(
                    "El plan actual alcanzo el limite de "
                    f"{self.MONTHLY_TYPE_MODULE_LIMIT_KEYS[normalized_type]}"
                )

        entry = FinanceEntry(
            movement_type=normalized_type,
            concept=concept,
            amount=amount,
            category=category,
            created_by_user_id=created_by_user_id,
        )
        return self.entry_repository.save(tenant_db, entry)

    def list_entries(self, tenant_db: Session) -> list[FinanceEntry]:
        return self.entry_repository.list_all(tenant_db)

    def get_summary(self, tenant_db: Session) -> dict[str, float]:
        entries = self.entry_repository.list_all(tenant_db)
        total_income = sum(
            entry.amount for entry in entries if entry.movement_type == "income"
        )
        total_expense = sum(
            entry.amount for entry in entries if entry.movement_type == "expense"
        )

        return {
            "total_income": total_income,
            "total_expense": total_expense,
            "balance": total_income - total_expense,
            "total_entries": len(entries),
        }

    def get_usage(
        self,
        tenant_db: Session,
        *,
        max_entries: int | None = None,
    ) -> dict:
        used_entries = self.entry_repository.count_all(tenant_db)
        unlimited = max_entries is None or max_entries <= 0
        effective_max_entries = None if unlimited else max_entries
        remaining_entries = (
            None
            if effective_max_entries is None
            else max(effective_max_entries - used_entries, 0)
        )

        return {
            "module_key": self.MODULE_LIMIT_KEY,
            "used_entries": used_entries,
            "max_entries": effective_max_entries,
            "remaining_entries": remaining_entries,
            "unlimited": unlimited,
            "at_limit": False
            if effective_max_entries is None
            else used_entries >= effective_max_entries,
        }

    def get_monthly_usage(
        self,
        tenant_db: Session,
        *,
        max_entries: int | None = None,
    ) -> dict:
        used_entries = self.entry_repository.count_created_since(
            tenant_db,
            self._get_current_month_start(),
        )
        unlimited = max_entries is None or max_entries <= 0
        effective_max_entries = None if unlimited else max_entries
        remaining_entries = (
            None
            if effective_max_entries is None
            else max(effective_max_entries - used_entries, 0)
        )

        return {
            "module_key": self.MONTHLY_MODULE_LIMIT_KEY,
            "used_entries": used_entries,
            "max_entries": effective_max_entries,
            "remaining_entries": remaining_entries,
            "unlimited": unlimited,
            "at_limit": False
            if effective_max_entries is None
            else used_entries >= effective_max_entries,
        }

    def get_monthly_usage_by_type(
        self,
        tenant_db: Session,
        *,
        movement_type: str,
        max_entries: int | None = None,
    ) -> dict:
        normalized_type = movement_type.strip().lower()
        module_key = self.MONTHLY_TYPE_MODULE_LIMIT_KEYS[normalized_type]
        used_entries = self.entry_repository.count_created_since_by_type(
            tenant_db,
            self._get_current_month_start(),
            normalized_type,
        )
        unlimited = max_entries is None or max_entries <= 0
        effective_max_entries = None if unlimited else max_entries
        remaining_entries = (
            None
            if effective_max_entries is None
            else max(effective_max_entries - used_entries, 0)
        )

        return {
            "module_key": module_key,
            "used_entries": used_entries,
            "max_entries": effective_max_entries,
            "remaining_entries": remaining_entries,
            "unlimited": unlimited,
            "at_limit": False
            if effective_max_entries is None
            else used_entries >= effective_max_entries,
        }

    def _get_current_month_start(self) -> datetime:
        now = datetime.now(timezone.utc)
        return now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
