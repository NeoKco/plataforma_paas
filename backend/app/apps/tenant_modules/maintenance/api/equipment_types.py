from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.apps.tenant_modules.maintenance.dependencies import (
    build_maintenance_requested_by,
    require_maintenance_manage,
    require_maintenance_read,
)
from app.apps.tenant_modules.maintenance.schemas import (
    MaintenanceEquipmentTypeCreateRequest,
    MaintenanceEquipmentTypeItemResponse,
    MaintenanceEquipmentTypeMutationResponse,
    MaintenanceEquipmentTypesResponse,
    MaintenanceEquipmentTypeUpdateRequest,
    MaintenanceStatusUpdateRequest,
)
from app.apps.tenant_modules.maintenance.services import MaintenanceEquipmentTypeService
from app.common.db.session_manager import get_tenant_db

router = APIRouter(prefix="/tenant/maintenance/equipment-types", tags=["Tenant Maintenance"])
equipment_type_service = MaintenanceEquipmentTypeService()


def _build_item(item) -> MaintenanceEquipmentTypeItemResponse:
    return MaintenanceEquipmentTypeItemResponse(
        id=item.id,
        code=item.code,
        name=item.name,
        description=item.description,
        is_active=item.is_active,
        sort_order=item.sort_order,
        created_at=item.created_at,
        updated_at=item.updated_at,
    )


@router.get("", response_model=MaintenanceEquipmentTypesResponse)
def list_maintenance_equipment_types(
    include_inactive: bool = True,
    current_user=Depends(require_maintenance_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> MaintenanceEquipmentTypesResponse:
    items = equipment_type_service.list_equipment_types(
        tenant_db,
        include_inactive=include_inactive,
    )
    return MaintenanceEquipmentTypesResponse(
        success=True,
        message="Tipos de equipo recuperados correctamente",
        requested_by=build_maintenance_requested_by(current_user),
        total=len(items),
        data=[_build_item(item) for item in items],
    )


@router.post("", response_model=MaintenanceEquipmentTypeMutationResponse)
def create_maintenance_equipment_type(
    payload: MaintenanceEquipmentTypeCreateRequest,
    current_user=Depends(require_maintenance_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> MaintenanceEquipmentTypeMutationResponse:
    try:
        item = equipment_type_service.create_equipment_type(tenant_db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return MaintenanceEquipmentTypeMutationResponse(
        success=True,
        message="Tipo de equipo creado correctamente",
        requested_by=build_maintenance_requested_by(current_user),
        data=_build_item(item),
    )


@router.get("/{equipment_type_id}", response_model=MaintenanceEquipmentTypeMutationResponse)
def get_maintenance_equipment_type(
    equipment_type_id: int,
    current_user=Depends(require_maintenance_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> MaintenanceEquipmentTypeMutationResponse:
    try:
        item = equipment_type_service.get_equipment_type(tenant_db, equipment_type_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    return MaintenanceEquipmentTypeMutationResponse(
        success=True,
        message="Tipo de equipo recuperado correctamente",
        requested_by=build_maintenance_requested_by(current_user),
        data=_build_item(item),
    )


@router.put("/{equipment_type_id}", response_model=MaintenanceEquipmentTypeMutationResponse)
def update_maintenance_equipment_type(
    equipment_type_id: int,
    payload: MaintenanceEquipmentTypeUpdateRequest,
    current_user=Depends(require_maintenance_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> MaintenanceEquipmentTypeMutationResponse:
    try:
        item = equipment_type_service.update_equipment_type(
            tenant_db,
            equipment_type_id,
            payload,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return MaintenanceEquipmentTypeMutationResponse(
        success=True,
        message="Tipo de equipo actualizado correctamente",
        requested_by=build_maintenance_requested_by(current_user),
        data=_build_item(item),
    )


@router.patch("/{equipment_type_id}/status", response_model=MaintenanceEquipmentTypeMutationResponse)
def update_maintenance_equipment_type_status(
    equipment_type_id: int,
    payload: MaintenanceStatusUpdateRequest,
    current_user=Depends(require_maintenance_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> MaintenanceEquipmentTypeMutationResponse:
    try:
        item = equipment_type_service.set_equipment_type_active(
            tenant_db,
            equipment_type_id,
            payload.maintenance_status.strip().lower() == "active",
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return MaintenanceEquipmentTypeMutationResponse(
        success=True,
        message="Estado del tipo de equipo actualizado correctamente",
        requested_by=build_maintenance_requested_by(current_user),
        data=_build_item(item),
    )


@router.delete("/{equipment_type_id}", response_model=MaintenanceEquipmentTypeMutationResponse)
def delete_maintenance_equipment_type(
    equipment_type_id: int,
    current_user=Depends(require_maintenance_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> MaintenanceEquipmentTypeMutationResponse:
    try:
        item = equipment_type_service.delete_equipment_type(tenant_db, equipment_type_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return MaintenanceEquipmentTypeMutationResponse(
        success=True,
        message="Tipo de equipo eliminado correctamente",
        requested_by=build_maintenance_requested_by(current_user),
        data=_build_item(item),
    )
