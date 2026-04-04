from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.apps.tenant_modules.business_core.dependencies import (
    build_business_core_requested_by,
    require_business_core_manage,
    require_business_core_read,
)
from app.apps.tenant_modules.business_core.schemas import (
    BusinessWorkGroupMemberCreateRequest,
    BusinessWorkGroupMemberItemResponse,
    BusinessWorkGroupMemberMutationResponse,
    BusinessWorkGroupMembersResponse,
    BusinessWorkGroupMemberUpdateRequest,
)
from app.apps.tenant_modules.business_core.services import BusinessWorkGroupMemberService
from app.apps.tenant_modules.core.models.user import User
from app.common.db.session_manager import get_tenant_db

router = APIRouter(
    prefix="/tenant/business-core/work-groups/{work_group_id}/members",
    tags=["Tenant Business Core"],
)
work_group_member_service = BusinessWorkGroupMemberService()


def _build_member_item(tenant_db: Session, item) -> BusinessWorkGroupMemberItemResponse:
    user = tenant_db.query(User).filter(User.id == item.tenant_user_id).first()
    function_profile_name = None
    if item.function_profile_id is not None:
        from app.apps.tenant_modules.business_core.models import BusinessFunctionProfile

        function_profile = (
            tenant_db.query(BusinessFunctionProfile)
            .filter(BusinessFunctionProfile.id == item.function_profile_id)
            .first()
        )
        function_profile_name = function_profile.name if function_profile else None
    return BusinessWorkGroupMemberItemResponse(
        id=item.id,
        group_id=item.group_id,
        tenant_user_id=item.tenant_user_id,
        function_profile_id=item.function_profile_id,
        is_primary=item.is_primary,
        is_lead=item.is_lead,
        is_active=item.is_active,
        starts_at=item.starts_at,
        ends_at=item.ends_at,
        notes=item.notes,
        user_full_name=user.full_name if user else f"#{item.tenant_user_id}",
        user_email=user.email if user else "—",
        function_profile_name=function_profile_name,
        created_at=item.created_at,
        updated_at=item.updated_at,
    )


@router.get("", response_model=BusinessWorkGroupMembersResponse)
def list_business_work_group_members(
    work_group_id: int,
    current_user=Depends(require_business_core_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> BusinessWorkGroupMembersResponse:
    try:
        items = work_group_member_service.list_members(tenant_db, work_group_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return BusinessWorkGroupMembersResponse(
        success=True,
        message="Membresías recuperadas correctamente",
        requested_by=build_business_core_requested_by(current_user),
        total=len(items),
        data=[_build_member_item(tenant_db, item) for item in items],
    )


@router.post("", response_model=BusinessWorkGroupMemberMutationResponse)
def create_business_work_group_member(
    work_group_id: int,
    payload: BusinessWorkGroupMemberCreateRequest,
    current_user=Depends(require_business_core_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> BusinessWorkGroupMemberMutationResponse:
    try:
        item = work_group_member_service.create_member(tenant_db, work_group_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return BusinessWorkGroupMemberMutationResponse(
        success=True,
        message="Membresía creada correctamente",
        requested_by=build_business_core_requested_by(current_user),
        data=_build_member_item(tenant_db, item),
    )


@router.put("/{member_id}", response_model=BusinessWorkGroupMemberMutationResponse)
def update_business_work_group_member(
    work_group_id: int,
    member_id: int,
    payload: BusinessWorkGroupMemberUpdateRequest,
    current_user=Depends(require_business_core_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> BusinessWorkGroupMemberMutationResponse:
    try:
        item = work_group_member_service.update_member(tenant_db, work_group_id, member_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return BusinessWorkGroupMemberMutationResponse(
        success=True,
        message="Membresía actualizada correctamente",
        requested_by=build_business_core_requested_by(current_user),
        data=_build_member_item(tenant_db, item),
    )


@router.delete("/{member_id}", response_model=BusinessWorkGroupMemberMutationResponse)
def delete_business_work_group_member(
    work_group_id: int,
    member_id: int,
    current_user=Depends(require_business_core_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> BusinessWorkGroupMemberMutationResponse:
    try:
        item = work_group_member_service.delete_member(tenant_db, work_group_id, member_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return BusinessWorkGroupMemberMutationResponse(
        success=True,
        message="Membresía eliminada correctamente",
        requested_by=build_business_core_requested_by(current_user),
        data=_build_member_item(tenant_db, item),
    )
