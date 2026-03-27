from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.apps.tenant_modules.finance.dependencies import (
    build_finance_requested_by,
    require_finance_manage,
    require_finance_read,
)
from app.apps.tenant_modules.finance.schemas import (
    FinanceLoanCreateRequest,
    FinanceLoanDetailData,
    FinanceLoanDetailResponse,
    FinanceLoanInstallmentItemResponse,
    FinanceLoanInstallmentPaymentData,
    FinanceLoanInstallmentPaymentRequest,
    FinanceLoanInstallmentPaymentResponse,
    FinanceLoanInstallmentReversalData,
    FinanceLoanInstallmentReversalRequest,
    FinanceLoanInstallmentReversalResponse,
    FinanceLoanItemResponse,
    FinanceLoanMutationResponse,
    FinanceLoansResponse,
    FinanceLoansSummaryData,
    FinanceLoanUpdateRequest,
)
from app.apps.tenant_modules.finance.services import FinanceLoanService
from app.common.db.session_manager import get_tenant_db

router = APIRouter(prefix="/tenant/finance/loans", tags=["Tenant Finance"])
loan_service = FinanceLoanService()


def _build_loan_item(row: dict) -> FinanceLoanItemResponse:
    loan = row["loan"]
    return FinanceLoanItemResponse(
        id=loan.id,
        name=loan.name,
        loan_type=loan.loan_type,
        loan_status=row["loan_status"],
        counterparty_name=loan.counterparty_name,
        currency_id=loan.currency_id,
        currency_code=row["currency_code"],
        principal_amount=loan.principal_amount,
        current_balance=loan.current_balance,
        paid_amount=row["paid_amount"],
        interest_rate=loan.interest_rate,
        installments_count=loan.installments_count,
        payment_frequency=loan.payment_frequency,
        next_due_date=row["next_due_date"],
        installments_total=row["installments_total"],
        installments_paid=row["installments_paid"],
        start_date=loan.start_date,
        due_date=loan.due_date,
        note=loan.note,
        is_active=loan.is_active,
        created_at=loan.created_at,
        updated_at=loan.updated_at,
    )


def _build_installment_item(row: dict) -> FinanceLoanInstallmentItemResponse:
    installment = row["installment"]
    return FinanceLoanInstallmentItemResponse(
        id=installment.id,
        loan_id=installment.loan_id,
        installment_number=installment.installment_number,
        due_date=installment.due_date,
        planned_amount=installment.planned_amount,
        principal_amount=installment.principal_amount,
        interest_amount=installment.interest_amount,
        paid_amount=installment.paid_amount,
        paid_at=installment.paid_at,
        installment_status=row["installment_status"],
        note=installment.note,
        created_at=installment.created_at,
        updated_at=installment.updated_at,
    )


@router.get("", response_model=FinanceLoansResponse)
def list_finance_loans(
    include_inactive: bool = True,
    loan_type: str | None = None,
    loan_status: str | None = None,
    current_user=Depends(require_finance_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> FinanceLoansResponse:
    rows, summary = loan_service.list_loans(
        tenant_db,
        include_inactive=include_inactive,
        loan_type=loan_type,
        loan_status=loan_status,
    )
    return FinanceLoansResponse(
        success=True,
        message="Préstamos financieros recuperados correctamente",
        requested_by=build_finance_requested_by(current_user),
        total=len(rows),
        summary=FinanceLoansSummaryData(**summary),
        data=[_build_loan_item(row) for row in rows],
    )


@router.get("/{loan_id}", response_model=FinanceLoanDetailResponse)
def get_finance_loan_detail(
    loan_id: int,
    current_user=Depends(require_finance_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> FinanceLoanDetailResponse:
    try:
        loan_row, installments = loan_service.get_loan_detail(tenant_db, loan_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    return FinanceLoanDetailResponse(
        success=True,
        message="Detalle del préstamo financiero recuperado correctamente",
        requested_by=build_finance_requested_by(current_user),
        data=FinanceLoanDetailData(
            loan=_build_loan_item(loan_row),
            installments=[_build_installment_item(item) for item in installments],
        ),
    )


@router.patch(
    "/{loan_id}/installments/{installment_id}/payment",
    response_model=FinanceLoanInstallmentPaymentResponse,
)
def apply_finance_loan_installment_payment(
    loan_id: int,
    installment_id: int,
    payload: FinanceLoanInstallmentPaymentRequest,
    current_user=Depends(require_finance_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> FinanceLoanInstallmentPaymentResponse:
    try:
        loan_row, installment_row = loan_service.apply_installment_payment(
            tenant_db,
            loan_id=loan_id,
            installment_id=installment_id,
            paid_amount=payload.paid_amount,
            paid_at=payload.paid_at,
            note=payload.note,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return FinanceLoanInstallmentPaymentResponse(
        success=True,
        message="Pago aplicado a la cuota correctamente",
        requested_by=build_finance_requested_by(current_user),
        data=FinanceLoanInstallmentPaymentData(
            loan=_build_loan_item(loan_row),
            installment=_build_installment_item(installment_row),
        ),
    )


@router.patch(
    "/{loan_id}/installments/{installment_id}/payment/reversal",
    response_model=FinanceLoanInstallmentReversalResponse,
)
def reverse_finance_loan_installment_payment(
    loan_id: int,
    installment_id: int,
    payload: FinanceLoanInstallmentReversalRequest,
    current_user=Depends(require_finance_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> FinanceLoanInstallmentReversalResponse:
    try:
        loan_row, installment_row = loan_service.reverse_installment_payment(
            tenant_db,
            loan_id=loan_id,
            installment_id=installment_id,
            reversed_amount=payload.reversed_amount,
            note=payload.note,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return FinanceLoanInstallmentReversalResponse(
        success=True,
        message="Reversa aplicada a la cuota correctamente",
        requested_by=build_finance_requested_by(current_user),
        data=FinanceLoanInstallmentReversalData(
            loan=_build_loan_item(loan_row),
            installment=_build_installment_item(installment_row),
        ),
    )


@router.post("", response_model=FinanceLoanMutationResponse)
def create_finance_loan(
    payload: FinanceLoanCreateRequest,
    current_user=Depends(require_finance_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> FinanceLoanMutationResponse:
    try:
        loan = loan_service.create_loan(tenant_db, payload)
        rows, _summary = loan_service.list_loans(tenant_db, include_inactive=True)
        row = next(item for item in rows if item["loan"].id == loan.id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return FinanceLoanMutationResponse(
        success=True,
        message="Préstamo financiero creado correctamente",
        requested_by=build_finance_requested_by(current_user),
        data=_build_loan_item(row),
    )


@router.put("/{loan_id}", response_model=FinanceLoanMutationResponse)
def update_finance_loan(
    loan_id: int,
    payload: FinanceLoanUpdateRequest,
    current_user=Depends(require_finance_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> FinanceLoanMutationResponse:
    try:
        loan = loan_service.update_loan(tenant_db, loan_id, payload)
        rows, _summary = loan_service.list_loans(tenant_db, include_inactive=True)
        row = next(item for item in rows if item["loan"].id == loan.id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return FinanceLoanMutationResponse(
        success=True,
        message="Préstamo financiero actualizado correctamente",
        requested_by=build_finance_requested_by(current_user),
        data=_build_loan_item(row),
    )
