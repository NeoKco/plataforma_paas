from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.apps.tenant_modules.finance.dependencies import (
    build_finance_requested_by,
    require_finance_manage,
    require_finance_read,
)
from app.apps.tenant_modules.finance.schemas import (
    FinanceAccountCreateRequest,
    FinanceAccountItemResponse,
    FinanceAccountMutationResponse,
    FinanceAccountsResponse,
    FinanceAccountUpdateRequest,
    FinanceStatusUpdateRequest,
)
from app.apps.tenant_modules.finance.services import FinanceAccountService
from app.common.db.session_manager import get_tenant_db

router = APIRouter(prefix="/tenant/finance/accounts", tags=["Tenant Finance"])
account_service = FinanceAccountService()


def _build_account_item(account) -> FinanceAccountItemResponse:
    return FinanceAccountItemResponse(
        id=account.id,
        name=account.name,
        code=account.code,
        account_type=account.account_type,
        currency_id=account.currency_id,
        parent_account_id=account.parent_account_id,
        opening_balance=account.opening_balance,
        opening_balance_at=account.opening_balance_at,
        icon=account.icon,
        is_favorite=account.is_favorite,
        is_balance_hidden=account.is_balance_hidden,
        is_active=account.is_active,
        sort_order=account.sort_order,
        created_at=account.created_at,
        updated_at=account.updated_at,
    )


@router.get("", response_model=FinanceAccountsResponse)
def list_finance_accounts(
    include_inactive: bool = True,
    current_user=Depends(require_finance_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> FinanceAccountsResponse:
    accounts = account_service.list_accounts(
        tenant_db,
        include_inactive=include_inactive,
    )
    return FinanceAccountsResponse(
        success=True,
        message="Cuentas financieras recuperadas correctamente",
        requested_by=build_finance_requested_by(current_user),
        total=len(accounts),
        data=[_build_account_item(account) for account in accounts],
    )


@router.post("", response_model=FinanceAccountMutationResponse)
def create_finance_account(
    payload: FinanceAccountCreateRequest,
    current_user=Depends(require_finance_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> FinanceAccountMutationResponse:
    try:
        account = account_service.create_account(tenant_db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return FinanceAccountMutationResponse(
        success=True,
        message="Cuenta financiera creada correctamente",
        requested_by=build_finance_requested_by(current_user),
        data=_build_account_item(account),
    )


@router.put("/{account_id}", response_model=FinanceAccountMutationResponse)
def update_finance_account(
    account_id: int,
    payload: FinanceAccountUpdateRequest,
    current_user=Depends(require_finance_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> FinanceAccountMutationResponse:
    try:
        account = account_service.update_account(tenant_db, account_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return FinanceAccountMutationResponse(
        success=True,
        message="Cuenta financiera actualizada correctamente",
        requested_by=build_finance_requested_by(current_user),
        data=_build_account_item(account),
    )


@router.patch("/{account_id}/status", response_model=FinanceAccountMutationResponse)
def update_finance_account_status(
    account_id: int,
    payload: FinanceStatusUpdateRequest,
    current_user=Depends(require_finance_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> FinanceAccountMutationResponse:
    try:
        account = account_service.set_account_active(
            tenant_db,
            account_id,
            payload.is_active,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return FinanceAccountMutationResponse(
        success=True,
        message="Estado de la cuenta financiera actualizado correctamente",
        requested_by=build_finance_requested_by(current_user),
        data=_build_account_item(account),
    )
