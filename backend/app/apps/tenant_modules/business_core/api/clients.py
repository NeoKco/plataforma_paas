from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.apps.tenant_modules.business_core.dependencies import (
    build_business_core_requested_by,
    require_business_core_manage,
    require_business_core_read,
)
from app.apps.tenant_modules.business_core.schemas import (
    BusinessClientCreateRequest,
    BusinessClientItemResponse,
    BusinessClientMutationResponse,
    BusinessClientsResponse,
    BusinessClientUpdateRequest,
    BusinessCoreStatusUpdateRequest,
)
from app.apps.tenant_modules.business_core.services import BusinessClientService
from app.common.db.session_manager import get_tenant_db

router = APIRouter(prefix="/tenant/business-core/clients", tags=["Tenant Business Core"])
client_service = BusinessClientService()


def _build_client_item(client) -> BusinessClientItemResponse:
    return BusinessClientItemResponse(
        id=client.id,
        organization_id=client.organization_id,
        social_community_group_id=client.social_community_group_id,
        client_code=client.client_code,
        service_status=client.service_status,
        commercial_notes=client.commercial_notes,
        is_active=client.is_active,
        sort_order=client.sort_order,
        created_at=client.created_at,
        updated_at=client.updated_at,
    )


@router.get("", response_model=BusinessClientsResponse)
def list_business_clients(
    organization_id: int | None = None,
    include_inactive: bool = True,
    current_user=Depends(require_business_core_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> BusinessClientsResponse:
    clients = client_service.list_clients(
        tenant_db,
        organization_id=organization_id,
        include_inactive=include_inactive,
    )
    return BusinessClientsResponse(
        success=True,
        message="Clientes recuperados correctamente",
        requested_by=build_business_core_requested_by(current_user),
        total=len(clients),
        data=[_build_client_item(client) for client in clients],
    )


@router.post("", response_model=BusinessClientMutationResponse)
def create_business_client(
    payload: BusinessClientCreateRequest,
    current_user=Depends(require_business_core_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> BusinessClientMutationResponse:
    try:
        client = client_service.create_client(tenant_db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return BusinessClientMutationResponse(
        success=True,
        message="Cliente creado correctamente",
        requested_by=build_business_core_requested_by(current_user),
        data=_build_client_item(client),
    )


@router.get("/{client_id}", response_model=BusinessClientMutationResponse)
def get_business_client(
    client_id: int,
    current_user=Depends(require_business_core_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> BusinessClientMutationResponse:
    try:
        client = client_service.get_client(tenant_db, client_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    return BusinessClientMutationResponse(
        success=True,
        message="Cliente recuperado correctamente",
        requested_by=build_business_core_requested_by(current_user),
        data=_build_client_item(client),
    )


@router.put("/{client_id}", response_model=BusinessClientMutationResponse)
def update_business_client(
    client_id: int,
    payload: BusinessClientUpdateRequest,
    current_user=Depends(require_business_core_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> BusinessClientMutationResponse:
    try:
        client = client_service.update_client(tenant_db, client_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return BusinessClientMutationResponse(
        success=True,
        message="Cliente actualizado correctamente",
        requested_by=build_business_core_requested_by(current_user),
        data=_build_client_item(client),
    )


@router.patch("/{client_id}/status", response_model=BusinessClientMutationResponse)
def update_business_client_status(
    client_id: int,
    payload: BusinessCoreStatusUpdateRequest,
    current_user=Depends(require_business_core_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> BusinessClientMutationResponse:
    try:
        client = client_service.set_client_active(
            tenant_db,
            client_id,
            payload.is_active,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return BusinessClientMutationResponse(
        success=True,
        message="Estado del cliente actualizado correctamente",
        requested_by=build_business_core_requested_by(current_user),
        data=_build_client_item(client),
    )


@router.delete("/{client_id}", response_model=BusinessClientMutationResponse)
def delete_business_client(
    client_id: int,
    current_user=Depends(require_business_core_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> BusinessClientMutationResponse:
    try:
        client = client_service.delete_client(tenant_db, client_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return BusinessClientMutationResponse(
        success=True,
        message="Cliente eliminado correctamente",
        requested_by=build_business_core_requested_by(current_user),
        data=_build_client_item(client),
    )
