from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.apps.tenant_modules.core.schemas import TenantUserContextResponse
from app.apps.tenant_modules.finance.schemas import (
    FinanceEntriesResponse,
    FinanceEntryCreateRequest,
    FinanceEntryItemResponse,
    FinanceEntryMutationResponse,
    FinanceSummaryData,
    FinanceSummaryResponse,
    FinanceUsageData,
    FinanceUsageResponse,
)
from app.apps.tenant_modules.finance.services.finance_service import FinanceService
from app.apps.tenant_modules.finance.services.finance_service import (
    FinanceUsageLimitExceededError,
)
from app.common.auth.dependencies import (
    require_tenant_permission,
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
        movement_type=entry.movement_type,
        concept=entry.concept,
        amount=entry.amount,
        category=entry.category,
        created_by_user_id=entry.created_by_user_id,
    )


@router.get("/entries", response_model=FinanceEntriesResponse)
def list_finance_entries(
    current_user=Depends(require_tenant_permission("tenant.finance.read")),
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


@router.post("/entries", response_model=FinanceEntryMutationResponse)
def create_finance_entry(
    request: Request,
    payload: FinanceEntryCreateRequest,
    current_user=Depends(require_tenant_permission("tenant.finance.create")),
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


@router.get("/summary", response_model=FinanceSummaryResponse)
def finance_summary(
    current_user=Depends(require_tenant_permission("tenant.finance.read")),
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
    current_user=Depends(require_tenant_permission("tenant.finance.read")),
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
