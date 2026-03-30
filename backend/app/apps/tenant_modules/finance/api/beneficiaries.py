from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.apps.tenant_modules.finance.dependencies import (
    build_finance_requested_by,
    require_finance_manage,
    require_finance_read,
)
from app.apps.tenant_modules.finance.schemas import (
    FinanceBeneficiariesResponse,
    FinanceBeneficiaryCreateRequest,
    FinanceBeneficiaryItemResponse,
    FinanceBeneficiaryMutationResponse,
    FinanceReorderRequest,
    FinanceBeneficiaryUpdateRequest,
    FinanceStatusUpdateRequest,
)
from app.apps.tenant_modules.finance.services import FinanceBeneficiaryService
from app.common.db.session_manager import get_tenant_db

router = APIRouter(prefix="/tenant/finance/beneficiaries", tags=["Tenant Finance"])
beneficiary_service = FinanceBeneficiaryService()


def _build_beneficiary_item(beneficiary) -> FinanceBeneficiaryItemResponse:
    return FinanceBeneficiaryItemResponse(
        id=beneficiary.id,
        name=beneficiary.name,
        icon=beneficiary.icon,
        note=beneficiary.note,
        is_active=beneficiary.is_active,
        sort_order=beneficiary.sort_order,
        created_at=beneficiary.created_at,
        updated_at=beneficiary.updated_at,
    )


@router.get("", response_model=FinanceBeneficiariesResponse)
def list_finance_beneficiaries(
    include_inactive: bool = True,
    current_user=Depends(require_finance_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> FinanceBeneficiariesResponse:
    beneficiaries = beneficiary_service.list_beneficiaries(
        tenant_db,
        include_inactive=include_inactive,
    )
    return FinanceBeneficiariesResponse(
        success=True,
        message="Beneficiarios recuperados correctamente",
        requested_by=build_finance_requested_by(current_user),
        total=len(beneficiaries),
        data=[_build_beneficiary_item(item) for item in beneficiaries],
    )


@router.post("", response_model=FinanceBeneficiaryMutationResponse)
def create_finance_beneficiary(
    payload: FinanceBeneficiaryCreateRequest,
    current_user=Depends(require_finance_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> FinanceBeneficiaryMutationResponse:
    try:
        beneficiary = beneficiary_service.create_beneficiary(tenant_db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return FinanceBeneficiaryMutationResponse(
        success=True,
        message="Beneficiario creado correctamente",
        requested_by=build_finance_requested_by(current_user),
        data=_build_beneficiary_item(beneficiary),
    )


@router.get("/{beneficiary_id}", response_model=FinanceBeneficiaryMutationResponse)
def get_finance_beneficiary(
    beneficiary_id: int,
    current_user=Depends(require_finance_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> FinanceBeneficiaryMutationResponse:
    try:
        beneficiary = beneficiary_service.get_beneficiary(tenant_db, beneficiary_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    return FinanceBeneficiaryMutationResponse(
        success=True,
        message="Beneficiario recuperado correctamente",
        requested_by=build_finance_requested_by(current_user),
        data=_build_beneficiary_item(beneficiary),
    )


@router.put("/{beneficiary_id}", response_model=FinanceBeneficiaryMutationResponse)
def update_finance_beneficiary(
    beneficiary_id: int,
    payload: FinanceBeneficiaryUpdateRequest,
    current_user=Depends(require_finance_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> FinanceBeneficiaryMutationResponse:
    try:
        beneficiary = beneficiary_service.update_beneficiary(
            tenant_db,
            beneficiary_id,
            payload,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return FinanceBeneficiaryMutationResponse(
        success=True,
        message="Beneficiario actualizado correctamente",
        requested_by=build_finance_requested_by(current_user),
        data=_build_beneficiary_item(beneficiary),
    )


@router.patch("/{beneficiary_id}/status", response_model=FinanceBeneficiaryMutationResponse)
def update_finance_beneficiary_status(
    beneficiary_id: int,
    payload: FinanceStatusUpdateRequest,
    current_user=Depends(require_finance_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> FinanceBeneficiaryMutationResponse:
    try:
        beneficiary = beneficiary_service.set_beneficiary_active(
            tenant_db,
            beneficiary_id,
            payload.is_active,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return FinanceBeneficiaryMutationResponse(
        success=True,
        message="Estado del beneficiario actualizado correctamente",
        requested_by=build_finance_requested_by(current_user),
        data=_build_beneficiary_item(beneficiary),
    )


@router.delete("/{beneficiary_id}", response_model=FinanceBeneficiaryMutationResponse)
def delete_finance_beneficiary(
    beneficiary_id: int,
    current_user=Depends(require_finance_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> FinanceBeneficiaryMutationResponse:
    try:
        beneficiary = beneficiary_service.delete_beneficiary(tenant_db, beneficiary_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return FinanceBeneficiaryMutationResponse(
        success=True,
        message="Beneficiario eliminado correctamente",
        requested_by=build_finance_requested_by(current_user),
        data=_build_beneficiary_item(beneficiary),
    )


@router.patch("/reorder", response_model=FinanceBeneficiariesResponse)
def reorder_finance_beneficiaries(
    payload: FinanceReorderRequest,
    current_user=Depends(require_finance_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> FinanceBeneficiariesResponse:
    try:
        beneficiaries = beneficiary_service.reorder_beneficiaries(
            tenant_db,
            [(item.id, item.sort_order) for item in payload.items],
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return FinanceBeneficiariesResponse(
        success=True,
        message="Orden de beneficiarios actualizado correctamente",
        requested_by=build_finance_requested_by(current_user),
        total=len(beneficiaries),
        data=[_build_beneficiary_item(item) for item in beneficiaries],
    )
