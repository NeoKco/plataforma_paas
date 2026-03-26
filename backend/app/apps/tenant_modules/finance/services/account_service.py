from sqlalchemy.orm import Session

from app.apps.tenant_modules.finance.models import FinanceAccount, FinanceCurrency
from app.apps.tenant_modules.finance.repositories import (
    FinanceAccountRepository,
    FinanceCurrencyRepository,
)
from app.apps.tenant_modules.finance.schemas import (
    FinanceAccountCreateRequest,
    FinanceAccountUpdateRequest,
)


class FinanceAccountService:
    def __init__(
        self,
        account_repository: FinanceAccountRepository | None = None,
        currency_repository: FinanceCurrencyRepository | None = None,
    ) -> None:
        self.account_repository = account_repository or FinanceAccountRepository()
        self.currency_repository = currency_repository or FinanceCurrencyRepository()

    def list_accounts(
        self,
        tenant_db: Session,
        *,
        include_inactive: bool = True,
    ) -> list[FinanceAccount]:
        return self.account_repository.list_all(
            tenant_db,
            include_inactive=include_inactive,
        )

    def create_account(
        self,
        tenant_db: Session,
        payload: FinanceAccountCreateRequest,
    ) -> FinanceAccount:
        normalized = self._normalize_payload(payload)
        self._validate_payload(tenant_db, normalized)
        account = FinanceAccount(**normalized)
        return self.account_repository.save(tenant_db, account)

    def update_account(
        self,
        tenant_db: Session,
        account_id: int,
        payload: FinanceAccountUpdateRequest,
    ) -> FinanceAccount:
        account = self._get_account_or_raise(tenant_db, account_id)
        normalized = self._normalize_payload(payload)
        self._validate_payload(tenant_db, normalized, current_account=account)

        for field, value in normalized.items():
            setattr(account, field, value)

        return self.account_repository.save(tenant_db, account)

    def set_account_active(
        self,
        tenant_db: Session,
        account_id: int,
        is_active: bool,
    ) -> FinanceAccount:
        account = self._get_account_or_raise(tenant_db, account_id)
        return self.account_repository.set_active(tenant_db, account, is_active)

    def _get_account_or_raise(self, tenant_db: Session, account_id: int) -> FinanceAccount:
        account = self.account_repository.get_by_id(tenant_db, account_id)
        if account is None:
            raise ValueError("La cuenta financiera solicitada no existe")
        return account

    def _normalize_payload(self, payload: FinanceAccountCreateRequest | FinanceAccountUpdateRequest) -> dict:
        name = payload.name.strip()
        account_type = payload.account_type.strip().lower()
        code = payload.code.strip().upper() if payload.code and payload.code.strip() else None
        icon = payload.icon.strip() if payload.icon and payload.icon.strip() else None

        return {
            "name": name,
            "code": code,
            "account_type": account_type,
            "currency_id": payload.currency_id,
            "parent_account_id": payload.parent_account_id,
            "opening_balance": payload.opening_balance,
            "opening_balance_at": payload.opening_balance_at,
            "icon": icon,
            "is_favorite": payload.is_favorite,
            "is_balance_hidden": payload.is_balance_hidden,
            "is_active": payload.is_active,
            "sort_order": payload.sort_order,
        }

    def _validate_payload(
        self,
        tenant_db: Session,
        payload: dict,
        *,
        current_account: FinanceAccount | None = None,
    ) -> None:
        if not payload["name"]:
            raise ValueError("El nombre de la cuenta es obligatorio")
        if not payload["account_type"]:
            raise ValueError("El tipo de cuenta es obligatorio")

        currency = self.currency_repository.get_by_id(tenant_db, payload["currency_id"])
        if currency is None:
            raise ValueError("La moneda seleccionada no existe")

        parent_account_id = payload["parent_account_id"]
        if parent_account_id is not None:
            parent_account = self.account_repository.get_by_id(tenant_db, parent_account_id)
            if parent_account is None:
                raise ValueError("La cuenta padre seleccionada no existe")
            if current_account and parent_account.id == current_account.id:
                raise ValueError("La cuenta no puede ser su propia cuenta padre")

        code = payload["code"]
        if code:
            existing = self.account_repository.get_by_code(tenant_db, code)
            if existing and (current_account is None or existing.id != current_account.id):
                raise ValueError("Ya existe una cuenta financiera con ese codigo")
