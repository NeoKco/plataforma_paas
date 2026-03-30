from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.apps.tenant_modules.finance.dependencies import (
    build_finance_requested_by,
    require_finance_manage,
    require_finance_read,
)
from app.apps.tenant_modules.finance.schemas import (
    FinancePeopleResponse,
    FinancePersonCreateRequest,
    FinancePersonItemResponse,
    FinancePersonMutationResponse,
    FinanceReorderRequest,
    FinancePersonUpdateRequest,
    FinanceStatusUpdateRequest,
)
from app.apps.tenant_modules.finance.services import FinancePersonService
from app.common.db.session_manager import get_tenant_db

router = APIRouter(prefix="/tenant/finance/people", tags=["Tenant Finance"])
person_service = FinancePersonService()


def _build_person_item(person) -> FinancePersonItemResponse:
    return FinancePersonItemResponse(
        id=person.id,
        name=person.name,
        icon=person.icon,
        note=person.note,
        is_active=person.is_active,
        sort_order=person.sort_order,
        created_at=person.created_at,
        updated_at=person.updated_at,
    )


@router.get("", response_model=FinancePeopleResponse)
def list_finance_people(
    include_inactive: bool = True,
    current_user=Depends(require_finance_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> FinancePeopleResponse:
    people = person_service.list_people(tenant_db, include_inactive=include_inactive)
    return FinancePeopleResponse(
        success=True,
        message="Personas recuperadas correctamente",
        requested_by=build_finance_requested_by(current_user),
        total=len(people),
        data=[_build_person_item(item) for item in people],
    )


@router.post("", response_model=FinancePersonMutationResponse)
def create_finance_person(
    payload: FinancePersonCreateRequest,
    current_user=Depends(require_finance_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> FinancePersonMutationResponse:
    try:
        person = person_service.create_person(tenant_db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return FinancePersonMutationResponse(
        success=True,
        message="Persona creada correctamente",
        requested_by=build_finance_requested_by(current_user),
        data=_build_person_item(person),
    )


@router.get("/{person_id}", response_model=FinancePersonMutationResponse)
def get_finance_person(
    person_id: int,
    current_user=Depends(require_finance_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> FinancePersonMutationResponse:
    try:
        person = person_service.get_person(tenant_db, person_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    return FinancePersonMutationResponse(
        success=True,
        message="Persona recuperada correctamente",
        requested_by=build_finance_requested_by(current_user),
        data=_build_person_item(person),
    )


@router.put("/{person_id}", response_model=FinancePersonMutationResponse)
def update_finance_person(
    person_id: int,
    payload: FinancePersonUpdateRequest,
    current_user=Depends(require_finance_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> FinancePersonMutationResponse:
    try:
        person = person_service.update_person(tenant_db, person_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return FinancePersonMutationResponse(
        success=True,
        message="Persona actualizada correctamente",
        requested_by=build_finance_requested_by(current_user),
        data=_build_person_item(person),
    )


@router.patch("/{person_id}/status", response_model=FinancePersonMutationResponse)
def update_finance_person_status(
    person_id: int,
    payload: FinanceStatusUpdateRequest,
    current_user=Depends(require_finance_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> FinancePersonMutationResponse:
    try:
        person = person_service.set_person_active(
            tenant_db,
            person_id,
            payload.is_active,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return FinancePersonMutationResponse(
        success=True,
        message="Estado de la persona actualizado correctamente",
        requested_by=build_finance_requested_by(current_user),
        data=_build_person_item(person),
    )


@router.delete("/{person_id}", response_model=FinancePersonMutationResponse)
def delete_finance_person(
    person_id: int,
    current_user=Depends(require_finance_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> FinancePersonMutationResponse:
    try:
        person = person_service.delete_person(tenant_db, person_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return FinancePersonMutationResponse(
        success=True,
        message="Persona eliminada correctamente",
        requested_by=build_finance_requested_by(current_user),
        data=_build_person_item(person),
    )


@router.patch("/reorder", response_model=FinancePeopleResponse)
def reorder_finance_people(
    payload: FinanceReorderRequest,
    current_user=Depends(require_finance_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> FinancePeopleResponse:
    try:
        people = person_service.reorder_people(
            tenant_db,
            [(item.id, item.sort_order) for item in payload.items],
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return FinancePeopleResponse(
        success=True,
        message="Orden de personas actualizado correctamente",
        requested_by=build_finance_requested_by(current_user),
        total=len(people),
        data=[_build_person_item(item) for item in people],
    )
