import json

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.apps.tenant_modules.core.schemas import TenantUserContextResponse
from app.apps.tenant_modules.finance.dependencies import (
    require_finance_create,
    require_finance_read,
)
from app.apps.tenant_modules.finance.schemas import (
    FinanceAccountBalanceItem,
    FinanceAccountBalancesResponse,
    FinanceEntriesResponse,
    FinanceEntryCreateRequest,
    FinanceEntryItemResponse,
    FinanceEntryMutationResponse,
    FinanceSummaryData,
    FinanceSummaryResponse,
    FinanceTransactionAuditItemResponse,
    FinanceTransactionBatchMutationData,
    FinanceTransactionBatchMutationResponse,
    FinanceTransactionCreateRequest,
    FinanceTransactionDetailData,
    FinanceTransactionDetailResponse,
    FinanceTransactionFavoriteBatchUpdateRequest,
    FinanceTransactionFavoriteUpdateRequest,
    FinanceTransactionItemResponse,
    FinanceTransactionMutationResponse,
    FinanceTransactionReconciliationBatchUpdateRequest,
    FinanceTransactionReconciliationUpdateRequest,
    FinanceTransactionUpdateRequest,
    FinanceTransactionsResponse,
    FinanceUsageData,
    FinanceUsageResponse,
)
from app.apps.tenant_modules.finance.services.transaction_service import (
    FinanceService,
    FinanceUsageLimitExceededError,
)
from app.common.db.session_manager import get_tenant_db

router = APIRouter(prefix="/tenant/finance", tags=["Tenant Finance"])
finance_service = FinanceService()


def _build_tenant_user_context(context: dict) -> TenantUserContextResponse:
    return TenantUserContextResponse(
        user_id=context["user_id"],
        email=context["email"],
        role=context["role"],
        tenant_slug=context["tenant_slug"],
        token_scope=context["token_scope"],
    )


def _build_finance_entry_item(entry) -> FinanceEntryItemResponse:
    return FinanceEntryItemResponse(
        id=entry.id,
        movement_type=getattr(entry, "movement_type", getattr(entry, "transaction_type", "")),
        concept=getattr(entry, "concept", getattr(entry, "description", "")),
        amount=entry.amount,
        category=getattr(entry, "category", getattr(entry, "notes", None)),
        created_by_user_id=entry.created_by_user_id,
    )


def _build_finance_transaction_item(entry) -> FinanceTransactionItemResponse:
    return FinanceTransactionItemResponse(
        id=entry.id,
        transaction_type=entry.transaction_type,
        account_id=entry.account_id,
        target_account_id=entry.target_account_id,
        category_id=entry.category_id,
        beneficiary_id=entry.beneficiary_id,
        person_id=entry.person_id,
        project_id=entry.project_id,
        currency_id=entry.currency_id,
        loan_id=entry.loan_id,
        amount=entry.amount,
        amount_in_base_currency=entry.amount_in_base_currency,
        exchange_rate=entry.exchange_rate,
        discount_amount=entry.discount_amount,
        amortization_months=entry.amortization_months,
        transaction_at=entry.transaction_at,
        alternative_date=entry.alternative_date,
        description=entry.description,
        notes=entry.notes,
        is_favorite=entry.is_favorite,
        favorite_flag=entry.favorite_flag,
        is_reconciled=entry.is_reconciled,
        reconciled_at=entry.reconciled_at,
        is_template_origin=entry.is_template_origin,
        source_type=entry.source_type,
        source_id=entry.source_id,
        created_by_user_id=entry.created_by_user_id,
        updated_by_user_id=entry.updated_by_user_id,
        created_at=entry.created_at,
        updated_at=entry.updated_at,
    )


def _build_finance_transaction_audit_item(event) -> FinanceTransactionAuditItemResponse:
    payload = None
    if event.payload_json:
        try:
            payload = json.loads(event.payload_json)
        except json.JSONDecodeError:
            payload = {"raw_payload": event.payload_json}

    return FinanceTransactionAuditItemResponse(
        id=event.id,
        event_type=event.event_type,
        actor_user_id=event.actor_user_id,
        summary=event.summary,
        payload=payload,
        created_at=event.created_at,
    )


@router.get("/entries", response_model=FinanceEntriesResponse)
def list_finance_entries(
    current_user=Depends(require_finance_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> FinanceEntriesResponse:
    entries = finance_service.list_entries(tenant_db)

    return FinanceEntriesResponse(
        success=True,
        message="Movimientos financieros recuperados correctamente",
        requested_by=_build_tenant_user_context(current_user),
        total=len(entries),
        data=[_build_finance_entry_item(entry) for entry in entries],
    )


@router.get("/transactions", response_model=FinanceTransactionsResponse)
def list_finance_transactions(
    transaction_type: str | None = None,
    account_id: int | None = None,
    category_id: int | None = None,
    is_favorite: bool | None = None,
    is_reconciled: bool | None = None,
    search: str | None = None,
    current_user=Depends(require_finance_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> FinanceTransactionsResponse:
    entries = finance_service.list_transactions_filtered(
        tenant_db,
        transaction_type=transaction_type,
        account_id=account_id,
        category_id=category_id,
        is_favorite=is_favorite,
        is_reconciled=is_reconciled,
        search=search,
    )

    return FinanceTransactionsResponse(
        success=True,
        message="Transacciones financieras recuperadas correctamente",
        requested_by=_build_tenant_user_context(current_user),
        total=len(entries),
        data=[_build_finance_transaction_item(entry) for entry in entries],
    )


@router.post("/transactions", response_model=FinanceTransactionMutationResponse)
def create_finance_transaction(
    payload: FinanceTransactionCreateRequest,
    current_user=Depends(require_finance_create),
    tenant_db: Session = Depends(get_tenant_db),
) -> FinanceTransactionMutationResponse:
    try:
        transaction = finance_service.create_transaction(
            tenant_db,
            payload,
            created_by_user_id=current_user["user_id"],
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return FinanceTransactionMutationResponse(
        success=True,
        message="Transaccion financiera creada correctamente",
        requested_by=_build_tenant_user_context(current_user),
        data=_build_finance_transaction_item(transaction),
    )


@router.put("/transactions/{transaction_id}", response_model=FinanceTransactionMutationResponse)
def update_finance_transaction(
    transaction_id: int,
    payload: FinanceTransactionUpdateRequest,
    current_user=Depends(require_finance_create),
    tenant_db: Session = Depends(get_tenant_db),
) -> FinanceTransactionMutationResponse:
    try:
        transaction = finance_service.update_transaction(
            tenant_db,
            transaction_id,
            payload,
            actor_user_id=current_user["user_id"],
        )
    except ValueError as exc:
        if str(exc) == "La transaccion financiera no existe":
            raise HTTPException(status_code=404, detail=str(exc)) from exc
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return FinanceTransactionMutationResponse(
        success=True,
        message="Transaccion financiera actualizada correctamente",
        requested_by=_build_tenant_user_context(current_user),
        data=_build_finance_transaction_item(transaction),
    )


@router.get("/transactions/{transaction_id}", response_model=FinanceTransactionDetailResponse)
def get_finance_transaction_detail(
    transaction_id: int,
    current_user=Depends(require_finance_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> FinanceTransactionDetailResponse:
    try:
        transaction, audit_events = finance_service.get_transaction_detail(
            tenant_db,
            transaction_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    return FinanceTransactionDetailResponse(
        success=True,
        message="Detalle de transaccion recuperado correctamente",
        requested_by=_build_tenant_user_context(current_user),
        data=FinanceTransactionDetailData(
            transaction=_build_finance_transaction_item(transaction),
            audit_events=[
                _build_finance_transaction_audit_item(event) for event in audit_events
            ],
        ),
    )


@router.patch(
    "/transactions/{transaction_id}/favorite",
    response_model=FinanceTransactionMutationResponse,
)
def update_finance_transaction_favorite(
    transaction_id: int,
    payload: FinanceTransactionFavoriteUpdateRequest,
    current_user=Depends(require_finance_create),
    tenant_db: Session = Depends(get_tenant_db),
) -> FinanceTransactionMutationResponse:
    try:
        transaction = finance_service.update_transaction_favorite(
            tenant_db,
            transaction_id,
            is_favorite=payload.is_favorite,
            actor_user_id=current_user["user_id"],
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    return FinanceTransactionMutationResponse(
        success=True,
        message="Favorito de transaccion actualizado correctamente",
        requested_by=_build_tenant_user_context(current_user),
        data=_build_finance_transaction_item(transaction),
    )


@router.patch(
    "/transactions/favorite/batch",
    response_model=FinanceTransactionBatchMutationResponse,
)
def update_finance_transactions_favorite_batch(
    payload: FinanceTransactionFavoriteBatchUpdateRequest,
    current_user=Depends(require_finance_create),
    tenant_db: Session = Depends(get_tenant_db),
) -> FinanceTransactionBatchMutationResponse:
    try:
        transactions = finance_service.update_transactions_favorite_batch(
            tenant_db,
            payload.transaction_ids,
            is_favorite=payload.is_favorite,
            actor_user_id=current_user["user_id"],
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return FinanceTransactionBatchMutationResponse(
        success=True,
        message="Favoritos actualizados en lote correctamente",
        requested_by=_build_tenant_user_context(current_user),
        data=FinanceTransactionBatchMutationData(
            affected_count=len(transactions),
            transaction_ids=[transaction.id for transaction in transactions],
        ),
    )


@router.patch(
    "/transactions/{transaction_id}/reconciliation",
    response_model=FinanceTransactionMutationResponse,
)
def update_finance_transaction_reconciliation(
    transaction_id: int,
    payload: FinanceTransactionReconciliationUpdateRequest,
    current_user=Depends(require_finance_create),
    tenant_db: Session = Depends(get_tenant_db),
) -> FinanceTransactionMutationResponse:
    try:
        transaction = finance_service.update_transaction_reconciliation(
            tenant_db,
            transaction_id,
            is_reconciled=payload.is_reconciled,
            actor_user_id=current_user["user_id"],
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    return FinanceTransactionMutationResponse(
        success=True,
        message="Estado de conciliacion actualizado correctamente",
        requested_by=_build_tenant_user_context(current_user),
        data=_build_finance_transaction_item(transaction),
    )


@router.patch(
    "/transactions/reconciliation/batch",
    response_model=FinanceTransactionBatchMutationResponse,
)
def update_finance_transactions_reconciliation_batch(
    payload: FinanceTransactionReconciliationBatchUpdateRequest,
    current_user=Depends(require_finance_create),
    tenant_db: Session = Depends(get_tenant_db),
) -> FinanceTransactionBatchMutationResponse:
    try:
        transactions = finance_service.update_transactions_reconciliation_batch(
            tenant_db,
            payload.transaction_ids,
            is_reconciled=payload.is_reconciled,
            actor_user_id=current_user["user_id"],
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return FinanceTransactionBatchMutationResponse(
        success=True,
        message="Conciliacion actualizada en lote correctamente",
        requested_by=_build_tenant_user_context(current_user),
        data=FinanceTransactionBatchMutationData(
            affected_count=len(transactions),
            transaction_ids=[transaction.id for transaction in transactions],
        ),
    )


@router.post("/entries", response_model=FinanceEntryMutationResponse)
def create_finance_entry(
    request: Request,
    payload: FinanceEntryCreateRequest,
    current_user=Depends(require_finance_create),
    tenant_db: Session = Depends(get_tenant_db),
) -> FinanceEntryMutationResponse:
    effective_module_limits = getattr(
        request.state,
        "tenant_effective_module_limits",
        None,
    ) or {}
    try:
        entry = finance_service.create_entry(
            tenant_db=tenant_db,
            movement_type=payload.movement_type,
            concept=payload.concept,
            amount=payload.amount,
            category=payload.category,
            created_by_user_id=current_user["user_id"],
            max_entries=effective_module_limits.get("finance.entries"),
            max_monthly_entries=effective_module_limits.get(
                FinanceService.MONTHLY_MODULE_LIMIT_KEY
            ),
            max_monthly_entries_by_type={
                "income": effective_module_limits.get(
                    FinanceService.MONTHLY_TYPE_MODULE_LIMIT_KEYS["income"]
                ),
                "expense": effective_module_limits.get(
                    FinanceService.MONTHLY_TYPE_MODULE_LIMIT_KEYS["expense"]
                ),
            },
        )
    except FinanceUsageLimitExceededError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return FinanceEntryMutationResponse(
        success=True,
        message="Movimiento financiero creado correctamente",
        requested_by=_build_tenant_user_context(current_user),
        data=_build_finance_entry_item(entry),
    )


@router.get("/account-balances", response_model=FinanceAccountBalancesResponse)
def finance_account_balances(
    current_user=Depends(require_finance_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> FinanceAccountBalancesResponse:
    accounts = finance_service.account_repository.list_all(tenant_db, include_inactive=True)
    balances = finance_service.get_account_balances(tenant_db)

    return FinanceAccountBalancesResponse(
        success=True,
        message="Balances por cuenta recuperados correctamente",
        requested_by=_build_tenant_user_context(current_user),
        total=len(accounts),
        data=[
            FinanceAccountBalanceItem(
                account_id=account.id,
                account_name=account.name,
                account_type=account.account_type,
                currency_id=account.currency_id,
                balance=balances.get(account.id, 0.0),
                is_balance_hidden=account.is_balance_hidden,
            )
            for account in accounts
        ],
    )


@router.get("/summary", response_model=FinanceSummaryResponse)
def finance_summary(
    current_user=Depends(require_finance_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> FinanceSummaryResponse:
    summary = finance_service.get_summary(tenant_db)

    return FinanceSummaryResponse(
        success=True,
        message="Resumen financiero recuperado correctamente",
        requested_by=_build_tenant_user_context(current_user),
        data=FinanceSummaryData(**summary),
    )


@router.get("/usage", response_model=FinanceUsageResponse)
def finance_usage(
    request: Request,
    current_user=Depends(require_finance_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> FinanceUsageResponse:
    effective_module_limits = getattr(
        request.state,
        "tenant_effective_module_limits",
        None,
    ) or {}
    effective_module_limit_sources = getattr(
        request.state,
        "tenant_effective_module_limit_sources",
        None,
    ) or {}
    usage = finance_service.get_usage(
        tenant_db,
        max_entries=effective_module_limits.get(FinanceService.MODULE_LIMIT_KEY),
    )

    return FinanceUsageResponse(
        success=True,
        message="Uso financiero recuperado correctamente",
        requested_by=_build_tenant_user_context(current_user),
        data=FinanceUsageData(
            **usage,
            limit_source=effective_module_limit_sources.get(
                FinanceService.MODULE_LIMIT_KEY
            ),
        ),
    )
