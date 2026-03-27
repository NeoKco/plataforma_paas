from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.apps.tenant_modules.finance.dependencies import (
    build_finance_requested_by,
    require_finance_manage,
    require_finance_read,
)
from app.apps.tenant_modules.finance.schemas import (
    FinanceProjectCreateRequest,
    FinanceProjectItemResponse,
    FinanceProjectMutationResponse,
    FinanceProjectsResponse,
    FinanceReorderRequest,
    FinanceProjectUpdateRequest,
    FinanceStatusUpdateRequest,
)
from app.apps.tenant_modules.finance.services import FinanceProjectService
from app.common.db.session_manager import get_tenant_db

router = APIRouter(prefix="/tenant/finance/projects", tags=["Tenant Finance"])
project_service = FinanceProjectService()


def _build_project_item(project) -> FinanceProjectItemResponse:
    return FinanceProjectItemResponse(
        id=project.id,
        name=project.name,
        code=project.code,
        note=project.note,
        is_active=project.is_active,
        sort_order=project.sort_order,
        created_at=project.created_at,
        updated_at=project.updated_at,
    )


@router.get("", response_model=FinanceProjectsResponse)
def list_finance_projects(
    include_inactive: bool = True,
    current_user=Depends(require_finance_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> FinanceProjectsResponse:
    projects = project_service.list_projects(tenant_db, include_inactive=include_inactive)
    return FinanceProjectsResponse(
        success=True,
        message="Proyectos recuperados correctamente",
        requested_by=build_finance_requested_by(current_user),
        total=len(projects),
        data=[_build_project_item(item) for item in projects],
    )


@router.post("", response_model=FinanceProjectMutationResponse)
def create_finance_project(
    payload: FinanceProjectCreateRequest,
    current_user=Depends(require_finance_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> FinanceProjectMutationResponse:
    try:
        project = project_service.create_project(tenant_db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return FinanceProjectMutationResponse(
        success=True,
        message="Proyecto creado correctamente",
        requested_by=build_finance_requested_by(current_user),
        data=_build_project_item(project),
    )


@router.get("/{project_id}", response_model=FinanceProjectMutationResponse)
def get_finance_project(
    project_id: int,
    current_user=Depends(require_finance_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> FinanceProjectMutationResponse:
    try:
        project = project_service.get_project(tenant_db, project_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    return FinanceProjectMutationResponse(
        success=True,
        message="Proyecto recuperado correctamente",
        requested_by=build_finance_requested_by(current_user),
        data=_build_project_item(project),
    )


@router.put("/{project_id}", response_model=FinanceProjectMutationResponse)
def update_finance_project(
    project_id: int,
    payload: FinanceProjectUpdateRequest,
    current_user=Depends(require_finance_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> FinanceProjectMutationResponse:
    try:
        project = project_service.update_project(tenant_db, project_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return FinanceProjectMutationResponse(
        success=True,
        message="Proyecto actualizado correctamente",
        requested_by=build_finance_requested_by(current_user),
        data=_build_project_item(project),
    )


@router.patch("/{project_id}/status", response_model=FinanceProjectMutationResponse)
def update_finance_project_status(
    project_id: int,
    payload: FinanceStatusUpdateRequest,
    current_user=Depends(require_finance_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> FinanceProjectMutationResponse:
    try:
        project = project_service.set_project_active(
            tenant_db,
            project_id,
            payload.is_active,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return FinanceProjectMutationResponse(
        success=True,
        message="Estado del proyecto actualizado correctamente",
        requested_by=build_finance_requested_by(current_user),
        data=_build_project_item(project),
    )


@router.patch("/reorder", response_model=FinanceProjectsResponse)
def reorder_finance_projects(
    payload: FinanceReorderRequest,
    current_user=Depends(require_finance_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> FinanceProjectsResponse:
    try:
        projects = project_service.reorder_projects(
            tenant_db,
            [(item.id, item.sort_order) for item in payload.items],
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return FinanceProjectsResponse(
        success=True,
        message="Orden de proyectos actualizado correctamente",
        requested_by=build_finance_requested_by(current_user),
        total=len(projects),
        data=[_build_project_item(item) for item in projects],
    )
