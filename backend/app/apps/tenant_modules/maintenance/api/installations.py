from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.apps.tenant_modules.maintenance.dependencies import (
    build_maintenance_requested_by,
    require_maintenance_manage,
    require_maintenance_read,
)
from app.apps.tenant_modules.maintenance.schemas import (
    MaintenanceInstallationCreateRequest,
    MaintenanceInstallationItemResponse,
    MaintenanceInstallationMutationResponse,
    MaintenanceInstallationsResponse,
    MaintenanceInstallationUpdateRequest,
    MaintenanceStatusUpdateRequest,
)
from app.apps.tenant_modules.maintenance.services import MaintenanceInstallationService
from app.common.db.session_manager import get_tenant_db

router = APIRouter(prefix="/tenant/maintenance/installations", tags=["Tenant Maintenance"])
installation_service = MaintenanceInstallationService()


def _build_item(item) -> MaintenanceInstallationItemResponse:
    return MaintenanceInstallationItemResponse(
        id=item.id,
        site_id=item.site_id,
        equipment_type_id=item.equipment_type_id,
        name=item.name,
        serial_number=item.serial_number,
        manufacturer=item.manufacturer,
        model=item.model,
        installed_at=item.installed_at,
        last_service_at=item.last_service_at,
        warranty_until=item.warranty_until,
        installation_status=item.installation_status,
        location_note=item.location_note,
        technical_notes=item.technical_notes,
        is_active=item.is_active,
        sort_order=item.sort_order,
        created_at=item.created_at,
        updated_at=item.updated_at,
    )


@router.get("", response_model=MaintenanceInstallationsResponse)
def list_maintenance_installations(
    site_id: int | None = None,
    equipment_type_id: int | None = None,
    include_inactive: bool = True,
    current_user=Depends(require_maintenance_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> MaintenanceInstallationsResponse:
    items = installation_service.list_installations(
        tenant_db,
        site_id=site_id,
        equipment_type_id=equipment_type_id,
        include_inactive=include_inactive,
    )
    return MaintenanceInstallationsResponse(
        success=True,
        message="Instalaciones recuperadas correctamente",
        requested_by=build_maintenance_requested_by(current_user),
        total=len(items),
        data=[_build_item(item) for item in items],
    )


@router.post("", response_model=MaintenanceInstallationMutationResponse)
def create_maintenance_installation(
    payload: MaintenanceInstallationCreateRequest,
    current_user=Depends(require_maintenance_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> MaintenanceInstallationMutationResponse:
    try:
        item = installation_service.create_installation(tenant_db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return MaintenanceInstallationMutationResponse(
        success=True,
        message="Instalacion creada correctamente",
        requested_by=build_maintenance_requested_by(current_user),
        data=_build_item(item),
    )


@router.get("/{installation_id}", response_model=MaintenanceInstallationMutationResponse)
def get_maintenance_installation(
    installation_id: int,
    current_user=Depends(require_maintenance_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> MaintenanceInstallationMutationResponse:
    try:
        item = installation_service.get_installation(tenant_db, installation_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return MaintenanceInstallationMutationResponse(
        success=True,
        message="Instalacion recuperada correctamente",
        requested_by=build_maintenance_requested_by(current_user),
        data=_build_item(item),
    )


@router.put("/{installation_id}", response_model=MaintenanceInstallationMutationResponse)
def update_maintenance_installation(
    installation_id: int,
    payload: MaintenanceInstallationUpdateRequest,
    current_user=Depends(require_maintenance_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> MaintenanceInstallationMutationResponse:
    try:
        item = installation_service.update_installation(
            tenant_db,
            installation_id,
            payload,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return MaintenanceInstallationMutationResponse(
        success=True,
        message="Instalacion actualizada correctamente",
        requested_by=build_maintenance_requested_by(current_user),
        data=_build_item(item),
    )


@router.patch("/{installation_id}/status", response_model=MaintenanceInstallationMutationResponse)
def update_maintenance_installation_status(
    installation_id: int,
    payload: MaintenanceStatusUpdateRequest,
    current_user=Depends(require_maintenance_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> MaintenanceInstallationMutationResponse:
    try:
        item = installation_service.set_installation_active(
            tenant_db,
            installation_id,
            payload.maintenance_status.strip().lower() == "active",
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return MaintenanceInstallationMutationResponse(
        success=True,
        message="Estado de la instalacion actualizado correctamente",
        requested_by=build_maintenance_requested_by(current_user),
        data=_build_item(item),
    )


@router.delete("/{installation_id}", response_model=MaintenanceInstallationMutationResponse)
def delete_maintenance_installation(
    installation_id: int,
    current_user=Depends(require_maintenance_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> MaintenanceInstallationMutationResponse:
    try:
        item = installation_service.delete_installation(tenant_db, installation_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return MaintenanceInstallationMutationResponse(
        success=True,
        message="Instalacion eliminada correctamente",
        requested_by=build_maintenance_requested_by(current_user),
        data=_build_item(item),
    )
