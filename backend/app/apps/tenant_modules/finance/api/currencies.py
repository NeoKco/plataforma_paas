from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.apps.tenant_modules.finance.dependencies import (
    build_finance_requested_by,
    require_finance_manage,
    require_finance_read,
)
from app.apps.tenant_modules.finance.schemas import (
    FinanceCurrenciesResponse,
    FinanceCurrencyCreateRequest,
    FinanceCurrencyItemResponse,
    FinanceCurrencyMutationResponse,
    FinanceCurrencyUpdateRequest,
    FinanceExchangeRateCreateRequest,
    FinanceExchangeRateItemResponse,
    FinanceExchangeRateMutationResponse,
    FinanceExchangeRatesResponse,
    FinanceExchangeRateUpdateRequest,
    FinanceStatusUpdateRequest,
)
from app.apps.tenant_modules.finance.services import FinanceCurrencyService
from app.common.db.session_manager import get_tenant_db

router = APIRouter(prefix="/tenant/finance/currencies", tags=["Tenant Finance"])
currency_service = FinanceCurrencyService()


def _build_currency_item(currency) -> FinanceCurrencyItemResponse:
    return FinanceCurrencyItemResponse(
        id=currency.id,
        code=currency.code,
        name=currency.name,
        symbol=currency.symbol,
        decimal_places=currency.decimal_places,
        is_base=currency.is_base,
        is_active=currency.is_active,
        sort_order=currency.sort_order,
        created_at=currency.created_at,
        updated_at=currency.updated_at,
    )


def _build_exchange_rate_item(exchange_rate) -> FinanceExchangeRateItemResponse:
    return FinanceExchangeRateItemResponse(
        id=exchange_rate.id,
        source_currency_id=exchange_rate.source_currency_id,
        target_currency_id=exchange_rate.target_currency_id,
        rate=exchange_rate.rate,
        effective_at=exchange_rate.effective_at,
        source=exchange_rate.source,
        note=exchange_rate.note,
        created_at=exchange_rate.created_at,
    )


@router.get("", response_model=FinanceCurrenciesResponse)
def list_finance_currencies(
    include_inactive: bool = True,
    current_user=Depends(require_finance_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> FinanceCurrenciesResponse:
    currencies = currency_service.list_currencies(
        tenant_db,
        include_inactive=include_inactive,
    )
    return FinanceCurrenciesResponse(
        success=True,
        message="Monedas recuperadas correctamente",
        requested_by=build_finance_requested_by(current_user),
        total=len(currencies),
        data=[_build_currency_item(item) for item in currencies],
    )


@router.post("", response_model=FinanceCurrencyMutationResponse)
def create_finance_currency(
    payload: FinanceCurrencyCreateRequest,
    current_user=Depends(require_finance_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> FinanceCurrencyMutationResponse:
    try:
        currency = currency_service.create_currency(tenant_db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return FinanceCurrencyMutationResponse(
        success=True,
        message="Moneda creada correctamente",
        requested_by=build_finance_requested_by(current_user),
        data=_build_currency_item(currency),
    )


@router.put("/{currency_id}", response_model=FinanceCurrencyMutationResponse)
def update_finance_currency(
    currency_id: int,
    payload: FinanceCurrencyUpdateRequest,
    current_user=Depends(require_finance_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> FinanceCurrencyMutationResponse:
    try:
        currency = currency_service.update_currency(tenant_db, currency_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return FinanceCurrencyMutationResponse(
        success=True,
        message="Moneda actualizada correctamente",
        requested_by=build_finance_requested_by(current_user),
        data=_build_currency_item(currency),
    )


@router.patch("/{currency_id}/status", response_model=FinanceCurrencyMutationResponse)
def update_finance_currency_status(
    currency_id: int,
    payload: FinanceStatusUpdateRequest,
    current_user=Depends(require_finance_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> FinanceCurrencyMutationResponse:
    try:
        currency = currency_service.set_currency_active(
            tenant_db,
            currency_id,
            payload.is_active,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return FinanceCurrencyMutationResponse(
        success=True,
        message="Estado de la moneda actualizado correctamente",
        requested_by=build_finance_requested_by(current_user),
        data=_build_currency_item(currency),
    )


@router.get("/exchange-rates", response_model=FinanceExchangeRatesResponse)
def list_finance_exchange_rates(
    current_user=Depends(require_finance_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> FinanceExchangeRatesResponse:
    exchange_rates = currency_service.list_exchange_rates(tenant_db)
    return FinanceExchangeRatesResponse(
        success=True,
        message="Tipos de cambio recuperados correctamente",
        requested_by=build_finance_requested_by(current_user),
        total=len(exchange_rates),
        data=[_build_exchange_rate_item(item) for item in exchange_rates],
    )


@router.post("/exchange-rates", response_model=FinanceExchangeRateMutationResponse)
def create_finance_exchange_rate(
    payload: FinanceExchangeRateCreateRequest,
    current_user=Depends(require_finance_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> FinanceExchangeRateMutationResponse:
    try:
        exchange_rate = currency_service.create_exchange_rate(tenant_db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return FinanceExchangeRateMutationResponse(
        success=True,
        message="Tipo de cambio creado correctamente",
        requested_by=build_finance_requested_by(current_user),
        data=_build_exchange_rate_item(exchange_rate),
    )


@router.put("/exchange-rates/{exchange_rate_id}", response_model=FinanceExchangeRateMutationResponse)
def update_finance_exchange_rate(
    exchange_rate_id: int,
    payload: FinanceExchangeRateUpdateRequest,
    current_user=Depends(require_finance_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> FinanceExchangeRateMutationResponse:
    try:
        exchange_rate = currency_service.update_exchange_rate(
            tenant_db,
            exchange_rate_id,
            payload,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return FinanceExchangeRateMutationResponse(
        success=True,
        message="Tipo de cambio actualizado correctamente",
        requested_by=build_finance_requested_by(current_user),
        data=_build_exchange_rate_item(exchange_rate),
    )
