from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.apps.tenant_modules.finance.models import FinanceAccount, FinanceCurrency, FinanceTransaction
from app.apps.tenant_modules.finance.repositories import (
    FinanceAccountRepository,
    FinanceCurrencyRepository,
    FinanceTransactionAuditRepository,
    FinanceTransactionRepository,
)
from app.apps.tenant_modules.finance.schemas import (
    FinanceTransactionCreateRequest,
    FinanceTransactionUpdateRequest,
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
        transaction_repository: FinanceTransactionRepository | None = None,
        entry_repository=None,
        currency_repository: FinanceCurrencyRepository | None = None,
        account_repository: FinanceAccountRepository | None = None,
        transaction_audit_repository: FinanceTransactionAuditRepository | None = None,
    ):
        # `entry_repository` se mantiene como alias legacy para no romper tests
        # ni puntos de integración que aún no migran a `transaction_repository`.
        self.transaction_repository = (
            transaction_repository or entry_repository or FinanceTransactionRepository()
        )
        self.currency_repository = currency_repository or FinanceCurrencyRepository()
        self.account_repository = account_repository or FinanceAccountRepository()
        self.transaction_audit_repository = (
            transaction_audit_repository or FinanceTransactionAuditRepository()
        )

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
    ) -> FinanceTransaction:
        normalized_type = movement_type.strip().lower()
        if normalized_type not in {"income", "expense"}:
            raise ValueError("movement_type debe ser income o expense")

        if amount <= 0:
            raise ValueError("amount debe ser mayor que cero")

        if max_entries is not None and max_entries > 0:
            current_entries = self.transaction_repository.count_all(tenant_db)
            if current_entries >= max_entries:
                raise FinanceUsageLimitExceededError(
                    "El plan actual alcanzo el limite de finance.entries"
                )

        if max_monthly_entries is not None and max_monthly_entries > 0:
            current_monthly_entries = self.transaction_repository.count_created_since(
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
                self.transaction_repository.count_created_since_by_type(
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

        base_currency = self._get_base_currency_or_raise(tenant_db)
        transaction = FinanceTransaction(
            transaction_type=normalized_type,
            account_id=None,
            target_account_id=None,
            category_id=None,
            beneficiary_id=None,
            person_id=None,
            project_id=None,
            currency_id=base_currency.id,
            loan_id=None,
            amount=amount,
            amount_in_base_currency=amount,
            exchange_rate=1,
            discount_amount=0,
            amortization_months=None,
            transaction_at=datetime.now(timezone.utc),
            alternative_date=None,
            description=concept,
            notes=category,
            is_favorite=False,
            favorite_flag=False,
            is_reconciled=False,
            reconciled_at=None,
            is_template_origin=False,
            planner_id=None,
            template_id=None,
            source_type="legacy_entries_api",
            source_id=None,
            created_by_user_id=created_by_user_id,
            updated_by_user_id=created_by_user_id,
        )
        saved = self.transaction_repository.save(tenant_db, transaction)
        self.transaction_audit_repository.save_event(
            tenant_db,
            transaction_id=saved.id,
            event_type="transaction.created.legacy_entry",
            actor_user_id=created_by_user_id,
            summary="Movimiento creado desde API legacy de entries",
            payload={"transaction_type": normalized_type, "concept": concept},
        )
        return saved

    def create_transaction(
        self,
        tenant_db: Session,
        payload: FinanceTransactionCreateRequest,
        *,
        created_by_user_id: int | None = None,
    ) -> FinanceTransaction:
        transaction_values = self._build_transaction_values(
            tenant_db,
            payload,
            current_transaction=None,
        )
        transaction = FinanceTransaction(
            **transaction_values,
            is_template_origin=False,
            planner_id=None,
            template_id=None,
            source_type=None,
            source_id=None,
            created_by_user_id=created_by_user_id,
            updated_by_user_id=created_by_user_id,
        )
        saved = self.transaction_repository.save(tenant_db, transaction)
        self.transaction_audit_repository.save_event(
            tenant_db,
            transaction_id=saved.id,
            event_type="transaction.created",
            actor_user_id=created_by_user_id,
            summary="Transaccion financiera creada",
            payload={
                "transaction_type": transaction_values["transaction_type"],
                "account_id": transaction_values["account_id"],
                "target_account_id": transaction_values["target_account_id"],
                "currency_id": transaction_values["currency_id"],
                "amount": transaction_values["amount"],
            },
        )
        return saved

    def update_transaction(
        self,
        tenant_db: Session,
        transaction_id: int,
        payload: FinanceTransactionUpdateRequest,
        *,
        actor_user_id: int | None = None,
    ) -> FinanceTransaction:
        transaction = self.transaction_repository.get_by_id(tenant_db, transaction_id)
        if transaction is None:
            raise ValueError("La transaccion financiera no existe")

        transaction_values = self._build_transaction_values(
            tenant_db,
            payload,
            current_transaction=transaction,
        )
        for field, value in transaction_values.items():
            setattr(transaction, field, value)
        transaction.updated_by_user_id = actor_user_id
        saved = self.transaction_repository.persist(tenant_db, transaction)
        self.transaction_audit_repository.save_event(
            tenant_db,
            transaction_id=saved.id,
            event_type="transaction.updated",
            actor_user_id=actor_user_id,
            summary="Transaccion financiera actualizada",
            payload={
                "transaction_type": transaction_values["transaction_type"],
                "account_id": transaction_values["account_id"],
                "target_account_id": transaction_values["target_account_id"],
                "currency_id": transaction_values["currency_id"],
                "amount": transaction_values["amount"],
            },
        )
        return saved

    def list_entries(self, tenant_db: Session) -> list[FinanceTransaction]:
        return self.transaction_repository.list_all(tenant_db)

    def list_transactions(self, tenant_db: Session) -> list[FinanceTransaction]:
        return self.transaction_repository.list_all(tenant_db)

    def list_transactions_filtered(
        self,
        tenant_db: Session,
        *,
        transaction_type: str | None = None,
        account_id: int | None = None,
        category_id: int | None = None,
        is_favorite: bool | None = None,
        is_reconciled: bool | None = None,
        search: str | None = None,
    ) -> list[FinanceTransaction]:
        return self.transaction_repository.list_filtered(
            tenant_db,
            transaction_type=transaction_type,
            account_id=account_id,
            category_id=category_id,
            is_favorite=is_favorite,
            is_reconciled=is_reconciled,
            search=search,
        )

    def get_transaction_detail(
        self,
        tenant_db: Session,
        transaction_id: int,
    ) -> tuple[FinanceTransaction, list]:
        transaction = self.transaction_repository.get_by_id(tenant_db, transaction_id)
        if transaction is None:
            raise ValueError("La transaccion financiera no existe")

        audit_events = self.transaction_audit_repository.list_by_transaction(
            tenant_db,
            transaction_id=transaction_id,
        )
        return transaction, audit_events

    def update_transaction_favorite(
        self,
        tenant_db: Session,
        transaction_id: int,
        *,
        is_favorite: bool,
        actor_user_id: int | None = None,
    ) -> FinanceTransaction:
        transaction = self.transaction_repository.get_by_id(tenant_db, transaction_id)
        if transaction is None:
            raise ValueError("La transaccion financiera no existe")

        transaction.is_favorite = is_favorite
        transaction.favorite_flag = is_favorite
        transaction.updated_by_user_id = actor_user_id
        saved = self.transaction_repository.persist(tenant_db, transaction)
        self.transaction_audit_repository.save_event(
            tenant_db,
            transaction_id=saved.id,
            event_type="transaction.favorite.updated",
            actor_user_id=actor_user_id,
            summary="Favorito de transaccion actualizado",
            payload={"is_favorite": is_favorite},
        )
        return saved

    def update_transaction_reconciliation(
        self,
        tenant_db: Session,
        transaction_id: int,
        *,
        is_reconciled: bool,
        actor_user_id: int | None = None,
    ) -> FinanceTransaction:
        transaction = self.transaction_repository.get_by_id(tenant_db, transaction_id)
        if transaction is None:
            raise ValueError("La transaccion financiera no existe")

        transaction.is_reconciled = is_reconciled
        transaction.reconciled_at = datetime.now(timezone.utc) if is_reconciled else None
        transaction.updated_by_user_id = actor_user_id
        saved = self.transaction_repository.persist(tenant_db, transaction)
        self.transaction_audit_repository.save_event(
            tenant_db,
            transaction_id=saved.id,
            event_type="transaction.reconciliation.updated",
            actor_user_id=actor_user_id,
            summary="Estado de conciliacion actualizado",
            payload={"is_reconciled": is_reconciled},
        )
        return saved

    def update_transactions_favorite_batch(
        self,
        tenant_db: Session,
        transaction_ids: list[int],
        *,
        is_favorite: bool,
        actor_user_id: int | None = None,
    ) -> list[FinanceTransaction]:
        transactions = self._get_transactions_for_batch(tenant_db, transaction_ids)
        for transaction in transactions:
            transaction.is_favorite = is_favorite
            transaction.favorite_flag = is_favorite
            transaction.updated_by_user_id = actor_user_id
            self.transaction_audit_repository.save_event(
                tenant_db,
                transaction_id=transaction.id,
                event_type="transaction.favorite.updated.batch",
                actor_user_id=actor_user_id,
                summary="Favorito de transaccion actualizado en lote",
                payload={"is_favorite": is_favorite},
            )
        tenant_db.commit()
        for transaction in transactions:
            tenant_db.refresh(transaction)
        return transactions

    def update_transactions_reconciliation_batch(
        self,
        tenant_db: Session,
        transaction_ids: list[int],
        *,
        is_reconciled: bool,
        actor_user_id: int | None = None,
    ) -> list[FinanceTransaction]:
        transactions = self._get_transactions_for_batch(tenant_db, transaction_ids)
        effective_reconciled_at = datetime.now(timezone.utc) if is_reconciled else None
        for transaction in transactions:
            transaction.is_reconciled = is_reconciled
            transaction.reconciled_at = effective_reconciled_at
            transaction.updated_by_user_id = actor_user_id
            self.transaction_audit_repository.save_event(
                tenant_db,
                transaction_id=transaction.id,
                event_type="transaction.reconciliation.updated.batch",
                actor_user_id=actor_user_id,
                summary="Estado de conciliacion actualizado en lote",
                payload={"is_reconciled": is_reconciled},
            )
        tenant_db.commit()
        for transaction in transactions:
            tenant_db.refresh(transaction)
        return transactions

    def _build_transaction_values(
        self,
        tenant_db: Session,
        payload: FinanceTransactionCreateRequest | FinanceTransactionUpdateRequest,
        *,
        current_transaction: FinanceTransaction | None,
    ) -> dict:
        normalized_type = payload.transaction_type.strip().lower()
        if normalized_type not in {"income", "expense", "transfer"}:
            raise ValueError("transaction_type debe ser income, expense o transfer")
        if payload.amount <= 0:
            raise ValueError("amount debe ser mayor que cero")
        if not payload.description.strip():
            raise ValueError("La descripcion de la transaccion es obligatoria")

        currency = self._get_currency_or_raise(tenant_db, payload.currency_id)
        source_account = self._get_account_if_present(tenant_db, payload.account_id)
        target_account = self._get_account_if_present(tenant_db, payload.target_account_id)

        if payload.account_id is None:
            raise ValueError("La transaccion requiere una cuenta origen")

        if normalized_type == "transfer":
            if payload.target_account_id is None:
                raise ValueError("La transferencia requiere cuenta destino")
            if payload.account_id == payload.target_account_id:
                raise ValueError("La transferencia requiere cuentas distintas")
        elif payload.target_account_id is not None:
            raise ValueError("Solo las transferencias pueden usar cuenta destino")

        if source_account and source_account.currency_id != currency.id:
            raise ValueError("La moneda de la transaccion debe coincidir con la cuenta origen")
        if target_account and target_account.currency_id != currency.id:
            raise ValueError("La moneda de la transaccion debe coincidir con la cuenta destino")

        amount_in_base_currency, exchange_rate = self._resolve_base_amounts(
            tenant_db,
            currency=currency,
            amount=payload.amount,
            exchange_rate=payload.exchange_rate,
        )
        reconciled_at = None
        if payload.is_reconciled:
            reconciled_at = (
                current_transaction.reconciled_at
                if current_transaction and current_transaction.reconciled_at
                else payload.transaction_at
            )

        return {
            "transaction_type": normalized_type,
            "account_id": payload.account_id,
            "target_account_id": payload.target_account_id,
            "category_id": payload.category_id,
            "beneficiary_id": payload.beneficiary_id,
            "person_id": payload.person_id,
            "project_id": payload.project_id,
            "currency_id": payload.currency_id,
            "loan_id": payload.loan_id,
            "amount": payload.amount,
            "amount_in_base_currency": amount_in_base_currency,
            "exchange_rate": exchange_rate,
            "discount_amount": payload.discount_amount,
            "amortization_months": payload.amortization_months,
            "transaction_at": payload.transaction_at,
            "alternative_date": payload.alternative_date,
            "description": payload.description.strip(),
            "notes": payload.notes.strip() if payload.notes and payload.notes.strip() else None,
            "is_favorite": payload.is_favorite,
            "favorite_flag": payload.is_favorite,
            "is_reconciled": payload.is_reconciled,
            "reconciled_at": reconciled_at,
        }

    def _get_transactions_for_batch(
        self,
        tenant_db: Session,
        transaction_ids: list[int],
    ) -> list[FinanceTransaction]:
        normalized_ids = list(dict.fromkeys(transaction_ids))
        if not normalized_ids:
            raise ValueError("Debes indicar al menos una transaccion")
        transactions = self.transaction_repository.list_by_ids(tenant_db, normalized_ids)
        loaded_ids = {transaction.id for transaction in transactions}
        missing_ids = [transaction_id for transaction_id in normalized_ids if transaction_id not in loaded_ids]
        if missing_ids:
            raise ValueError("Una o mas transacciones financieras no existen")
        return transactions

    def get_summary(self, tenant_db: Session) -> dict[str, float]:
        entries = self.transaction_repository.list_all(tenant_db)
        total_income = sum(
            entry.amount
            for entry in entries
            if getattr(entry, "transaction_type", getattr(entry, "movement_type", None))
            == "income"
        )
        total_expense = sum(
            entry.amount
            for entry in entries
            if getattr(entry, "transaction_type", getattr(entry, "movement_type", None))
            == "expense"
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
        used_entries = self.transaction_repository.count_all(tenant_db)
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
        used_entries = self.transaction_repository.count_created_since(
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
        used_entries = self.transaction_repository.count_created_since_by_type(
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

    def get_account_balances(self, tenant_db: Session) -> dict[int, float]:
        accounts = self.account_repository.list_all(tenant_db, include_inactive=True)
        balances = {account.id: float(account.opening_balance or 0) for account in accounts}

        for transaction in self.transaction_repository.list_all(tenant_db):
            amount = float(transaction.amount)
            if transaction.transaction_type == "income" and transaction.account_id:
                balances[transaction.account_id] = balances.get(transaction.account_id, 0.0) + amount
            elif transaction.transaction_type == "expense" and transaction.account_id:
                balances[transaction.account_id] = balances.get(transaction.account_id, 0.0) - amount
            elif transaction.transaction_type == "transfer":
                if transaction.account_id:
                    balances[transaction.account_id] = balances.get(transaction.account_id, 0.0) - amount
                if transaction.target_account_id:
                    balances[transaction.target_account_id] = balances.get(transaction.target_account_id, 0.0) + amount

        return balances

    def _get_current_month_start(self) -> datetime:
        now = datetime.now(timezone.utc)
        return now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    def _get_currency_or_raise(self, tenant_db: Session, currency_id: int) -> FinanceCurrency:
        currency = self.currency_repository.get_by_id(tenant_db, currency_id)
        if currency is None:
            raise ValueError("La moneda seleccionada no existe")
        return currency

    def _get_base_currency_or_raise(self, tenant_db: Session) -> FinanceCurrency:
        currencies = self.currency_repository.list_all(tenant_db, include_inactive=True)
        for currency in currencies:
            if currency.is_base:
                return currency
        if currencies:
            return currencies[0]
        raise ValueError("No existe una moneda base configurada para finance")

    def _get_account_if_present(
        self,
        tenant_db: Session,
        account_id: int | None,
    ) -> FinanceAccount | None:
        if account_id is None:
            return None
        account = self.account_repository.get_by_id(tenant_db, account_id)
        if account is None:
            raise ValueError("La cuenta financiera seleccionada no existe")
        return account

    def _resolve_base_amounts(
        self,
        tenant_db: Session,
        *,
        currency: FinanceCurrency,
        amount: float,
        exchange_rate: float | None,
    ) -> tuple[float, float | None]:
        base_currency = self._get_base_currency_or_raise(tenant_db)
        if currency.id == base_currency.id:
            return amount, exchange_rate or 1

        if exchange_rate is None or exchange_rate <= 0:
            raise ValueError(
                "Las transacciones en moneda no base requieren exchange_rate mayor que cero"
            )

        return amount * exchange_rate, exchange_rate
