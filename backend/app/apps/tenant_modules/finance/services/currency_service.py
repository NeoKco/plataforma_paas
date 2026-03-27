from sqlalchemy.orm import Session

from app.apps.tenant_modules.finance.models import FinanceCurrency, FinanceExchangeRate
from app.apps.tenant_modules.finance.repositories import (
    FinanceCurrencyRepository,
    FinanceExchangeRateRepository,
)
from app.apps.tenant_modules.finance.schemas import (
    FinanceCurrencyCreateRequest,
    FinanceCurrencyUpdateRequest,
    FinanceExchangeRateCreateRequest,
    FinanceExchangeRateUpdateRequest,
)


class FinanceCurrencyService:
    def __init__(
        self,
        currency_repository: FinanceCurrencyRepository | None = None,
        exchange_rate_repository: FinanceExchangeRateRepository | None = None,
    ) -> None:
        self.currency_repository = currency_repository or FinanceCurrencyRepository()
        self.exchange_rate_repository = exchange_rate_repository or FinanceExchangeRateRepository()

    def list_currencies(
        self,
        tenant_db: Session,
        *,
        include_inactive: bool = True,
    ) -> list[FinanceCurrency]:
        return self.currency_repository.list_all(
            tenant_db,
            include_inactive=include_inactive,
        )

    def create_currency(
        self,
        tenant_db: Session,
        payload: FinanceCurrencyCreateRequest,
    ) -> FinanceCurrency:
        normalized = self._normalize_currency_payload(payload)
        self._validate_currency_payload(tenant_db, normalized)
        previous_base = self.currency_repository.get_base_currency(tenant_db)
        currency = FinanceCurrency(**normalized)
        currency = self.currency_repository.save(tenant_db, currency)
        self._normalize_base_currency(tenant_db, currency, previous_base)
        return currency

    def get_currency(self, tenant_db: Session, currency_id: int) -> FinanceCurrency:
        return self._get_currency_or_raise(tenant_db, currency_id)

    def update_currency(
        self,
        tenant_db: Session,
        currency_id: int,
        payload: FinanceCurrencyUpdateRequest,
    ) -> FinanceCurrency:
        currency = self._get_currency_or_raise(tenant_db, currency_id)
        normalized = self._normalize_currency_payload(payload)
        self._validate_currency_payload(tenant_db, normalized, current_currency=currency)
        previous_base = self.currency_repository.get_base_currency(tenant_db)
        for field, value in normalized.items():
            setattr(currency, field, value)
        currency = self.currency_repository.save(tenant_db, currency)
        self._normalize_base_currency(tenant_db, currency, previous_base)
        return currency

    def set_currency_active(
        self,
        tenant_db: Session,
        currency_id: int,
        is_active: bool,
    ) -> FinanceCurrency:
        currency = self._get_currency_or_raise(tenant_db, currency_id)
        if currency.is_base and not is_active:
            raise ValueError("No puedes desactivar la moneda base")
        return self.currency_repository.set_active(tenant_db, currency, is_active)

    def reorder_currencies(
        self,
        tenant_db: Session,
        items: list[tuple[int, int]],
    ) -> list[FinanceCurrency]:
        return self.currency_repository.reorder(tenant_db, items)

    def list_exchange_rates(self, tenant_db: Session) -> list[FinanceExchangeRate]:
        return self.exchange_rate_repository.list_all(tenant_db)

    def get_exchange_rate(
        self,
        tenant_db: Session,
        exchange_rate_id: int,
    ) -> FinanceExchangeRate:
        return self._get_exchange_rate_or_raise(tenant_db, exchange_rate_id)

    def create_exchange_rate(
        self,
        tenant_db: Session,
        payload: FinanceExchangeRateCreateRequest,
    ) -> FinanceExchangeRate:
        normalized = self._normalize_exchange_rate_payload(payload)
        self._validate_exchange_rate_payload(tenant_db, normalized)
        exchange_rate = FinanceExchangeRate(**normalized)
        return self.exchange_rate_repository.save(tenant_db, exchange_rate)

    def update_exchange_rate(
        self,
        tenant_db: Session,
        exchange_rate_id: int,
        payload: FinanceExchangeRateUpdateRequest,
    ) -> FinanceExchangeRate:
        exchange_rate = self._get_exchange_rate_or_raise(tenant_db, exchange_rate_id)
        normalized = self._normalize_exchange_rate_payload(payload)
        self._validate_exchange_rate_payload(
            tenant_db,
            normalized,
            current_exchange_rate=exchange_rate,
        )
        for field, value in normalized.items():
            setattr(exchange_rate, field, value)
        return self.exchange_rate_repository.save(tenant_db, exchange_rate)

    def _get_currency_or_raise(self, tenant_db: Session, currency_id: int) -> FinanceCurrency:
        currency = self.currency_repository.get_by_id(tenant_db, currency_id)
        if currency is None:
            raise ValueError("La moneda solicitada no existe")
        return currency

    def _get_exchange_rate_or_raise(
        self,
        tenant_db: Session,
        exchange_rate_id: int,
    ) -> FinanceExchangeRate:
        exchange_rate = self.exchange_rate_repository.get_by_id(tenant_db, exchange_rate_id)
        if exchange_rate is None:
            raise ValueError("El tipo de cambio solicitado no existe")
        return exchange_rate

    def _normalize_currency_payload(
        self,
        payload: FinanceCurrencyCreateRequest | FinanceCurrencyUpdateRequest,
    ) -> dict:
        return {
            "code": payload.code.strip().upper(),
            "name": payload.name.strip(),
            "symbol": payload.symbol.strip(),
            "decimal_places": payload.decimal_places,
            "is_base": payload.is_base,
            "is_active": payload.is_active,
            "sort_order": payload.sort_order,
        }

    def _validate_currency_payload(
        self,
        tenant_db: Session,
        payload: dict,
        *,
        current_currency: FinanceCurrency | None = None,
    ) -> None:
        if not payload["code"]:
            raise ValueError("El codigo de moneda es obligatorio")
        if not payload["name"]:
            raise ValueError("El nombre de la moneda es obligatorio")
        if not payload["symbol"]:
            raise ValueError("El simbolo de la moneda es obligatorio")

        existing = self.currency_repository.get_by_name(tenant_db, payload["code"])
        if existing and (current_currency is None or existing.id != current_currency.id):
            raise ValueError("Ya existe una moneda con ese codigo")

    def _normalize_base_currency(
        self,
        tenant_db: Session,
        current_currency: FinanceCurrency,
        previous_base: FinanceCurrency | None,
    ) -> None:
        if not current_currency.is_base:
            return

        if previous_base and previous_base.id != current_currency.id:
            previous_base.is_base = False
            self.currency_repository.save(tenant_db, previous_base)

    def _normalize_exchange_rate_payload(
        self,
        payload: FinanceExchangeRateCreateRequest | FinanceExchangeRateUpdateRequest,
    ) -> dict:
        return {
            "source_currency_id": payload.source_currency_id,
            "target_currency_id": payload.target_currency_id,
            "rate": payload.rate,
            "effective_at": payload.effective_at,
            "source": payload.source.strip() if payload.source and payload.source.strip() else None,
            "note": payload.note.strip() if payload.note and payload.note.strip() else None,
        }

    def _validate_exchange_rate_payload(
        self,
        tenant_db: Session,
        payload: dict,
        *,
        current_exchange_rate: FinanceExchangeRate | None = None,
    ) -> None:
        if payload["rate"] <= 0:
            raise ValueError("El tipo de cambio debe ser mayor a cero")
        if payload["source_currency_id"] == payload["target_currency_id"]:
            raise ValueError("La moneda origen y destino deben ser distintas")

        source_currency = self.currency_repository.get_by_id(
            tenant_db,
            payload["source_currency_id"],
        )
        target_currency = self.currency_repository.get_by_id(
            tenant_db,
            payload["target_currency_id"],
        )
        if source_currency is None or target_currency is None:
            raise ValueError("La moneda origen o destino no existe")

        existing = self.exchange_rate_repository.get_by_pair_effective_at(
            tenant_db,
            payload["source_currency_id"],
            payload["target_currency_id"],
            payload["effective_at"],
        )
        if existing and (
            current_exchange_rate is None or existing.id != current_exchange_rate.id
        ):
            raise ValueError("Ya existe un tipo de cambio para ese par y fecha efectiva")
