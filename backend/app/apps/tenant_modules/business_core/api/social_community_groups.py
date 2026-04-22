from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.apps.tenant_modules.business_core.dependencies import (
    build_business_core_requested_by,
    require_business_core_manage,
    require_business_core_read,
)
from app.apps.tenant_modules.business_core.schemas import (
    BusinessCoreStatusUpdateRequest,
    SocialCommunityGroupCreateRequest,
    SocialCommunityGroupItemResponse,
    SocialCommunityGroupMutationResponse,
    SocialCommunityGroupsResponse,
    SocialCommunityGroupUpdateRequest,
)
from app.apps.tenant_modules.business_core.services import SocialCommunityGroupService
from app.common.db.session_manager import get_tenant_db

router = APIRouter(
    prefix="/tenant/business-core/social-community-groups",
    tags=["Tenant Business Core"],
)
service = SocialCommunityGroupService()


def _build_item(group) -> SocialCommunityGroupItemResponse:
    return SocialCommunityGroupItemResponse(
        id=group.id,
        name=group.name,
        commune=group.commune,
        sector=group.sector,
        zone=group.zone,
        territorial_classification=group.territorial_classification,
        notes=group.notes,
        is_active=group.is_active,
        sort_order=group.sort_order,
        created_at=group.created_at,
        updated_at=group.updated_at,
    )


@router.get("", response_model=SocialCommunityGroupsResponse)
def list_social_community_groups(
    include_inactive: bool = True,
    current_user=Depends(require_business_core_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> SocialCommunityGroupsResponse:
    groups = service.list_groups(
        tenant_db,
        include_inactive=include_inactive,
    )
    return SocialCommunityGroupsResponse(
        success=True,
        message="Grupos sociales recuperados correctamente",
        requested_by=build_business_core_requested_by(current_user),
        total=len(groups),
        data=[_build_item(group) for group in groups],
    )


@router.post("", response_model=SocialCommunityGroupMutationResponse)
def create_social_community_group(
    payload: SocialCommunityGroupCreateRequest,
    current_user=Depends(require_business_core_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> SocialCommunityGroupMutationResponse:
    try:
        group = service.create_group(tenant_db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return SocialCommunityGroupMutationResponse(
        success=True,
        message="Grupo social creado correctamente",
        requested_by=build_business_core_requested_by(current_user),
        data=_build_item(group),
    )


@router.get("/{group_id}", response_model=SocialCommunityGroupMutationResponse)
def get_social_community_group(
    group_id: int,
    current_user=Depends(require_business_core_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> SocialCommunityGroupMutationResponse:
    try:
        group = service.get_group(tenant_db, group_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    return SocialCommunityGroupMutationResponse(
        success=True,
        message="Grupo social recuperado correctamente",
        requested_by=build_business_core_requested_by(current_user),
        data=_build_item(group),
    )


@router.put("/{group_id}", response_model=SocialCommunityGroupMutationResponse)
def update_social_community_group(
    group_id: int,
    payload: SocialCommunityGroupUpdateRequest,
    current_user=Depends(require_business_core_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> SocialCommunityGroupMutationResponse:
    try:
        group = service.update_group(tenant_db, group_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return SocialCommunityGroupMutationResponse(
        success=True,
        message="Grupo social actualizado correctamente",
        requested_by=build_business_core_requested_by(current_user),
        data=_build_item(group),
    )


@router.patch("/{group_id}/status", response_model=SocialCommunityGroupMutationResponse)
def update_social_community_group_status(
    group_id: int,
    payload: BusinessCoreStatusUpdateRequest,
    current_user=Depends(require_business_core_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> SocialCommunityGroupMutationResponse:
    try:
        group = service.set_group_active(tenant_db, group_id, payload.is_active)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return SocialCommunityGroupMutationResponse(
        success=True,
        message="Estado del grupo social actualizado correctamente",
        requested_by=build_business_core_requested_by(current_user),
        data=_build_item(group),
    )


@router.delete("/{group_id}", response_model=SocialCommunityGroupMutationResponse)
def delete_social_community_group(
    group_id: int,
    current_user=Depends(require_business_core_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> SocialCommunityGroupMutationResponse:
    try:
        group = service.delete_group(tenant_db, group_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return SocialCommunityGroupMutationResponse(
        success=True,
        message="Grupo social eliminado correctamente",
        requested_by=build_business_core_requested_by(current_user),
        data=_build_item(group),
    )
