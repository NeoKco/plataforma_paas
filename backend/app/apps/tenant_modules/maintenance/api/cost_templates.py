from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.apps.tenant_modules.maintenance.dependencies import (
    build_maintenance_requested_by,
    require_maintenance_manage,
    require_maintenance_read,
)
from app.apps.tenant_modules.maintenance.schemas import (
    MaintenanceCostTemplateCreateRequest,
    MaintenanceCostTemplateItemResponse,
    MaintenanceCostTemplateLineItemResponse,
    MaintenanceCostTemplateMutationResponse,
    MaintenanceCostTemplatesResponse,
    MaintenanceCostTemplateStatusRequest,
    MaintenanceCostTemplateUpdateRequest,
)
from app.apps.tenant_modules.maintenance.services import MaintenanceCostTemplateService
from app.common.db.session_manager import get_tenant_db

router = APIRouter(prefix="/tenant/maintenance/cost-templates", tags=["Tenant Maintenance"])
cost_template_service = MaintenanceCostTemplateService()


def _build_item(item) -> MaintenanceCostTemplateItemResponse:
    return MaintenanceCostTemplateItemResponse(
        id=item.id,
        name=item.name,
        description=item.description,
        task_type_id=item.task_type_id,
        estimate_target_margin_percent=item.estimate_target_margin_percent,
        estimate_notes=item.estimate_notes,
        is_active=item.is_active,
        lines=[
            MaintenanceCostTemplateLineItemResponse(
                id=line.id,
                template_id=line.template_id,
                line_type=line.line_type,
                description=line.description,
                quantity=line.quantity,
                unit_cost=line.unit_cost,
                total_cost=line.total_cost,
                sort_order=line.sort_order,
                notes=line.notes,
                created_by_user_id=line.created_by_user_id,
                updated_by_user_id=line.updated_by_user_id,
                created_at=line.created_at,
                updated_at=line.updated_at,
            )
            for line in getattr(item, "lines", [])
        ],
        created_by_user_id=item.created_by_user_id,
        updated_by_user_id=item.updated_by_user_id,
        created_at=item.created_at,
        updated_at=item.updated_at,
    )


@router.get("", response_model=MaintenanceCostTemplatesResponse)
def list_maintenance_cost_templates(
    task_type_id: int | None = None,
    include_inactive: bool = False,
    current_user=Depends(require_maintenance_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> MaintenanceCostTemplatesResponse:
    items = cost_template_service.list_templates(
        tenant_db,
        task_type_id=task_type_id,
        include_inactive=include_inactive,
    )
    return MaintenanceCostTemplatesResponse(
        success=True,
        message="Plantillas de costeo recuperadas correctamente",
        requested_by=build_maintenance_requested_by(current_user),
        total=len(items),
        data=[_build_item(item) for item in items],
    )


@router.post("", response_model=MaintenanceCostTemplateMutationResponse)
def create_maintenance_cost_template(
    payload: MaintenanceCostTemplateCreateRequest,
    current_user=Depends(require_maintenance_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> MaintenanceCostTemplateMutationResponse:
    try:
        item = cost_template_service.create_template(
            tenant_db,
            payload,
            created_by_user_id=current_user["user_id"],
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return MaintenanceCostTemplateMutationResponse(
        success=True,
        message="Plantilla de costeo creada correctamente",
        requested_by=build_maintenance_requested_by(current_user),
        data=_build_item(item),
    )


@router.get("/{template_id}", response_model=MaintenanceCostTemplateMutationResponse)
def get_maintenance_cost_template(
    template_id: int,
    current_user=Depends(require_maintenance_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> MaintenanceCostTemplateMutationResponse:
    try:
        item = cost_template_service.get_template(tenant_db, template_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return MaintenanceCostTemplateMutationResponse(
        success=True,
        message="Plantilla de costeo recuperada correctamente",
        requested_by=build_maintenance_requested_by(current_user),
        data=_build_item(item),
    )


@router.put("/{template_id}", response_model=MaintenanceCostTemplateMutationResponse)
def update_maintenance_cost_template(
    template_id: int,
    payload: MaintenanceCostTemplateUpdateRequest,
    current_user=Depends(require_maintenance_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> MaintenanceCostTemplateMutationResponse:
    try:
        item = cost_template_service.update_template(
            tenant_db,
            template_id,
            payload,
            actor_user_id=current_user["user_id"],
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return MaintenanceCostTemplateMutationResponse(
        success=True,
        message="Plantilla de costeo actualizada correctamente",
        requested_by=build_maintenance_requested_by(current_user),
        data=_build_item(item),
    )


@router.patch("/{template_id}/status", response_model=MaintenanceCostTemplateMutationResponse)
def update_maintenance_cost_template_status(
    template_id: int,
    payload: MaintenanceCostTemplateStatusRequest,
    current_user=Depends(require_maintenance_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> MaintenanceCostTemplateMutationResponse:
    try:
        item = cost_template_service.set_template_active(
            tenant_db,
            template_id,
            is_active=payload.is_active,
            actor_user_id=current_user["user_id"],
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return MaintenanceCostTemplateMutationResponse(
        success=True,
        message="Estado de la plantilla actualizado correctamente",
        requested_by=build_maintenance_requested_by(current_user),
        data=_build_item(item),
    )
