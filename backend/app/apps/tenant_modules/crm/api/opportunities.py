from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.apps.tenant_modules.crm.api.serializers import (
    build_opportunity_activity_item,
    build_opportunity_attachment_item,
    build_opportunity_contact_item,
    build_opportunity_item,
    build_opportunity_note_item,
    build_opportunity_stage_event_item,
)
from app.apps.tenant_modules.crm.dependencies import (
    build_crm_requested_by,
    require_crm_manage,
    require_crm_read,
)
from app.apps.tenant_modules.crm.schemas import (
    CRMOpportunityActivityStatusRequest,
    CRMOpportunityActivityWriteRequest,
    CRMOpportunityCloseRequest,
    CRMOpportunityContactWriteRequest,
    CRMOpportunityCreateRequest,
    CRMOpportunityDetailItemResponse,
    CRMOpportunityDetailResponse,
    CRMOpportunityKanbanColumnResponse,
    CRMOpportunityKanbanResponse,
    CRMOpportunityMutationResponse,
    CRMOpportunityNoteWriteRequest,
    CRMOpportunitiesResponse,
    CRMOpportunitySubresourceMutationResponse,
    CRMOpportunityUpdateRequest,
    CRMStatusUpdateRequest,
)
from app.apps.tenant_modules.crm.services import CRMOpportunityService
from app.common.db.session_manager import get_tenant_db

router = APIRouter(prefix="/tenant/crm/opportunities", tags=["Tenant CRM"])
service = CRMOpportunityService()


def _build_detail(tenant_db, detail: dict) -> CRMOpportunityDetailItemResponse:
    opportunity = detail["opportunity"]
    client_display_map = service.get_client_display_map(
        tenant_db,
        [opportunity.client_id] if opportunity.client_id else [],
    )
    return CRMOpportunityDetailItemResponse(
        opportunity=build_opportunity_item(
            opportunity,
            client_display_name=client_display_map.get(opportunity.client_id),
        ),
        contacts=[build_opportunity_contact_item(item) for item in detail["contacts"]],
        notes=[build_opportunity_note_item(item) for item in detail["notes"]],
        activities=[build_opportunity_activity_item(item) for item in detail["activities"]],
        attachments=[build_opportunity_attachment_item(item) for item in detail["attachments"]],
        stage_events=[build_opportunity_stage_event_item(item) for item in detail["stage_events"]],
    )


@router.get("", response_model=CRMOpportunitiesResponse)
def list_crm_opportunities(
    include_inactive: bool = True,
    stage: str | None = None,
    client_id: int | None = None,
    q: str | None = None,
    current_user=Depends(require_crm_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> CRMOpportunitiesResponse:
    rows = service.list_opportunities(
        tenant_db,
        include_inactive=include_inactive,
        include_closed=False,
        stage=stage,
        client_id=client_id,
        q=q,
    )
    client_display_map = service.get_client_display_map(
        tenant_db,
        [item.client_id for item in rows if item.client_id],
    )
    return CRMOpportunitiesResponse(
        success=True,
        message="Oportunidades recuperadas correctamente",
        requested_by=build_crm_requested_by(current_user),
        total=len(rows),
        pipeline_value=round(sum(float(item.expected_value or 0) for item in rows), 2),
        data=[
            build_opportunity_item(item, client_display_name=client_display_map.get(item.client_id))
            for item in rows
        ],
    )


@router.get("/kanban", response_model=CRMOpportunityKanbanResponse)
def get_crm_opportunity_kanban(
    include_inactive: bool = False,
    current_user=Depends(require_crm_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> CRMOpportunityKanbanResponse:
    columns = service.list_kanban_columns(tenant_db, include_inactive=include_inactive)
    client_ids = [
        item.client_id
        for column in columns
        for item in column["items"]
        if item.client_id
    ]
    client_display_map = service.get_client_display_map(tenant_db, client_ids)
    return CRMOpportunityKanbanResponse(
        success=True,
        message="Kanban CRM recuperado correctamente",
        requested_by=build_crm_requested_by(current_user),
        columns=[
            CRMOpportunityKanbanColumnResponse(
                stage=column["stage"],
                total=column["total"],
                stage_value=column["stage_value"],
                items=[
                    build_opportunity_item(
                        item,
                        client_display_name=client_display_map.get(item.client_id),
                    )
                    for item in column["items"]
                ],
            )
            for column in columns
        ],
    )


@router.get("/historical", response_model=CRMOpportunitiesResponse)
def list_crm_opportunities_historical(
    client_id: int | None = None,
    q: str | None = None,
    current_user=Depends(require_crm_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> CRMOpportunitiesResponse:
    rows = service.list_historical(tenant_db, client_id=client_id, q=q)
    client_display_map = service.get_client_display_map(
        tenant_db,
        [item.client_id for item in rows if item.client_id],
    )
    return CRMOpportunitiesResponse(
        success=True,
        message="Historico CRM recuperado correctamente",
        requested_by=build_crm_requested_by(current_user),
        total=len(rows),
        pipeline_value=round(sum(float(item.expected_value or 0) for item in rows), 2),
        data=[
            build_opportunity_item(item, client_display_name=client_display_map.get(item.client_id))
            for item in rows
        ],
    )


@router.post("", response_model=CRMOpportunityMutationResponse)
def create_crm_opportunity(
    payload: CRMOpportunityCreateRequest,
    current_user=Depends(require_crm_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> CRMOpportunityMutationResponse:
    try:
        item = service.create_opportunity(
            tenant_db,
            payload,
            actor_user_id=current_user.user_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    client_display_map = service.get_client_display_map(
        tenant_db,
        [item.client_id] if item.client_id else [],
    )
    return CRMOpportunityMutationResponse(
        success=True,
        message="Oportunidad creada correctamente",
        requested_by=build_crm_requested_by(current_user),
        data=build_opportunity_item(item, client_display_name=client_display_map.get(item.client_id)),
    )


@router.get("/{opportunity_id}", response_model=CRMOpportunityMutationResponse)
def get_crm_opportunity(
    opportunity_id: int,
    current_user=Depends(require_crm_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> CRMOpportunityMutationResponse:
    try:
        item = service.get_opportunity(tenant_db, opportunity_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    client_display_map = service.get_client_display_map(
        tenant_db,
        [item.client_id] if item.client_id else [],
    )
    return CRMOpportunityMutationResponse(
        success=True,
        message="Oportunidad recuperada correctamente",
        requested_by=build_crm_requested_by(current_user),
        data=build_opportunity_item(item, client_display_name=client_display_map.get(item.client_id)),
    )


@router.get("/{opportunity_id}/detail", response_model=CRMOpportunityDetailResponse)
def get_crm_opportunity_detail(
    opportunity_id: int,
    current_user=Depends(require_crm_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> CRMOpportunityDetailResponse:
    try:
        detail = service.get_opportunity_detail(tenant_db, opportunity_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return CRMOpportunityDetailResponse(
        success=True,
        message="Detalle comercial recuperado correctamente",
        requested_by=build_crm_requested_by(current_user),
        data=_build_detail(tenant_db, detail),
    )


@router.put("/{opportunity_id}", response_model=CRMOpportunityMutationResponse)
def update_crm_opportunity(
    opportunity_id: int,
    payload: CRMOpportunityUpdateRequest,
    current_user=Depends(require_crm_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> CRMOpportunityMutationResponse:
    try:
        item = service.update_opportunity(
            tenant_db,
            opportunity_id,
            payload,
            actor_user_id=current_user.user_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    client_display_map = service.get_client_display_map(
        tenant_db,
        [item.client_id] if item.client_id else [],
    )
    return CRMOpportunityMutationResponse(
        success=True,
        message="Oportunidad actualizada correctamente",
        requested_by=build_crm_requested_by(current_user),
        data=build_opportunity_item(item, client_display_name=client_display_map.get(item.client_id)),
    )


@router.post("/{opportunity_id}/close", response_model=CRMOpportunityMutationResponse)
def close_crm_opportunity(
    opportunity_id: int,
    payload: CRMOpportunityCloseRequest,
    current_user=Depends(require_crm_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> CRMOpportunityMutationResponse:
    try:
        item = service.close_opportunity(
            tenant_db,
            opportunity_id,
            payload,
            actor_user_id=current_user.user_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    client_display_map = service.get_client_display_map(
        tenant_db,
        [item.client_id] if item.client_id else [],
    )
    return CRMOpportunityMutationResponse(
        success=True,
        message="Oportunidad cerrada correctamente",
        requested_by=build_crm_requested_by(current_user),
        data=build_opportunity_item(item, client_display_name=client_display_map.get(item.client_id)),
    )


@router.patch("/{opportunity_id}/status", response_model=CRMOpportunityMutationResponse)
def update_crm_opportunity_status(
    opportunity_id: int,
    payload: CRMStatusUpdateRequest,
    current_user=Depends(require_crm_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> CRMOpportunityMutationResponse:
    try:
        item = service.set_opportunity_active(tenant_db, opportunity_id, payload.is_active)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    client_display_map = service.get_client_display_map(
        tenant_db,
        [item.client_id] if item.client_id else [],
    )
    return CRMOpportunityMutationResponse(
        success=True,
        message="Estado de la oportunidad actualizado correctamente",
        requested_by=build_crm_requested_by(current_user),
        data=build_opportunity_item(item, client_display_name=client_display_map.get(item.client_id)),
    )


@router.delete("/{opportunity_id}", response_model=CRMOpportunityMutationResponse)
def delete_crm_opportunity(
    opportunity_id: int,
    current_user=Depends(require_crm_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> CRMOpportunityMutationResponse:
    try:
        item = service.delete_opportunity(tenant_db, opportunity_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return CRMOpportunityMutationResponse(
        success=True,
        message="Oportunidad eliminada correctamente",
        requested_by=build_crm_requested_by(current_user),
        data=build_opportunity_item(item),
    )


@router.post("/{opportunity_id}/contacts", response_model=CRMOpportunitySubresourceMutationResponse)
def create_crm_opportunity_contact(
    opportunity_id: int,
    payload: CRMOpportunityContactWriteRequest,
    current_user=Depends(require_crm_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> CRMOpportunitySubresourceMutationResponse:
    try:
        item = service.save_contact(tenant_db, opportunity_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return CRMOpportunitySubresourceMutationResponse(
        success=True,
        message="Contacto comercial creado correctamente",
        requested_by=build_crm_requested_by(current_user),
        data={"contact": build_opportunity_contact_item(item).model_dump()},
    )


@router.put("/{opportunity_id}/contacts/{contact_id}", response_model=CRMOpportunitySubresourceMutationResponse)
def update_crm_opportunity_contact(
    opportunity_id: int,
    contact_id: int,
    payload: CRMOpportunityContactWriteRequest,
    current_user=Depends(require_crm_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> CRMOpportunitySubresourceMutationResponse:
    try:
        item = service.save_contact(tenant_db, opportunity_id, payload, contact_id=contact_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return CRMOpportunitySubresourceMutationResponse(
        success=True,
        message="Contacto comercial actualizado correctamente",
        requested_by=build_crm_requested_by(current_user),
        data={"contact": build_opportunity_contact_item(item).model_dump()},
    )


@router.delete("/{opportunity_id}/contacts/{contact_id}", response_model=CRMOpportunitySubresourceMutationResponse)
def delete_crm_opportunity_contact(
    opportunity_id: int,
    contact_id: int,
    current_user=Depends(require_crm_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> CRMOpportunitySubresourceMutationResponse:
    try:
        item = service.delete_contact(tenant_db, opportunity_id, contact_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return CRMOpportunitySubresourceMutationResponse(
        success=True,
        message="Contacto comercial eliminado correctamente",
        requested_by=build_crm_requested_by(current_user),
        data={"contact_id": item.id, "opportunity_id": item.opportunity_id},
    )


@router.post("/{opportunity_id}/notes", response_model=CRMOpportunitySubresourceMutationResponse)
def create_crm_opportunity_note(
    opportunity_id: int,
    payload: CRMOpportunityNoteWriteRequest,
    current_user=Depends(require_crm_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> CRMOpportunitySubresourceMutationResponse:
    try:
        item = service.save_note(
            tenant_db,
            opportunity_id,
            payload,
            actor_user_id=current_user.user_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return CRMOpportunitySubresourceMutationResponse(
        success=True,
        message="Nota comercial creada correctamente",
        requested_by=build_crm_requested_by(current_user),
        data={"note": build_opportunity_note_item(item).model_dump()},
    )


@router.put("/{opportunity_id}/notes/{note_id}", response_model=CRMOpportunitySubresourceMutationResponse)
def update_crm_opportunity_note(
    opportunity_id: int,
    note_id: int,
    payload: CRMOpportunityNoteWriteRequest,
    current_user=Depends(require_crm_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> CRMOpportunitySubresourceMutationResponse:
    try:
        item = service.save_note(
            tenant_db,
            opportunity_id,
            payload,
            actor_user_id=current_user.user_id,
            note_id=note_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return CRMOpportunitySubresourceMutationResponse(
        success=True,
        message="Nota comercial actualizada correctamente",
        requested_by=build_crm_requested_by(current_user),
        data={"note": build_opportunity_note_item(item).model_dump()},
    )


@router.delete("/{opportunity_id}/notes/{note_id}", response_model=CRMOpportunitySubresourceMutationResponse)
def delete_crm_opportunity_note(
    opportunity_id: int,
    note_id: int,
    current_user=Depends(require_crm_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> CRMOpportunitySubresourceMutationResponse:
    try:
        item = service.delete_note(tenant_db, opportunity_id, note_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return CRMOpportunitySubresourceMutationResponse(
        success=True,
        message="Nota comercial eliminada correctamente",
        requested_by=build_crm_requested_by(current_user),
        data={"note_id": item.id, "opportunity_id": item.opportunity_id},
    )


@router.post("/{opportunity_id}/activities", response_model=CRMOpportunitySubresourceMutationResponse)
def create_crm_opportunity_activity(
    opportunity_id: int,
    payload: CRMOpportunityActivityWriteRequest,
    current_user=Depends(require_crm_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> CRMOpportunitySubresourceMutationResponse:
    try:
        item = service.save_activity(
            tenant_db,
            opportunity_id,
            payload,
            actor_user_id=current_user.user_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return CRMOpportunitySubresourceMutationResponse(
        success=True,
        message="Actividad comercial creada correctamente",
        requested_by=build_crm_requested_by(current_user),
        data={"activity": build_opportunity_activity_item(item).model_dump()},
    )


@router.put("/{opportunity_id}/activities/{activity_id}", response_model=CRMOpportunitySubresourceMutationResponse)
def update_crm_opportunity_activity(
    opportunity_id: int,
    activity_id: int,
    payload: CRMOpportunityActivityWriteRequest,
    current_user=Depends(require_crm_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> CRMOpportunitySubresourceMutationResponse:
    try:
        item = service.save_activity(
            tenant_db,
            opportunity_id,
            payload,
            actor_user_id=current_user.user_id,
            activity_id=activity_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return CRMOpportunitySubresourceMutationResponse(
        success=True,
        message="Actividad comercial actualizada correctamente",
        requested_by=build_crm_requested_by(current_user),
        data={"activity": build_opportunity_activity_item(item).model_dump()},
    )


@router.patch("/{opportunity_id}/activities/{activity_id}/status", response_model=CRMOpportunitySubresourceMutationResponse)
def update_crm_opportunity_activity_status(
    opportunity_id: int,
    activity_id: int,
    payload: CRMOpportunityActivityStatusRequest,
    current_user=Depends(require_crm_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> CRMOpportunitySubresourceMutationResponse:
    try:
        item = service.set_activity_status(tenant_db, opportunity_id, activity_id, payload.status)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return CRMOpportunitySubresourceMutationResponse(
        success=True,
        message="Estado de actividad comercial actualizado correctamente",
        requested_by=build_crm_requested_by(current_user),
        data={"activity": build_opportunity_activity_item(item).model_dump()},
    )


@router.delete("/{opportunity_id}/activities/{activity_id}", response_model=CRMOpportunitySubresourceMutationResponse)
def delete_crm_opportunity_activity(
    opportunity_id: int,
    activity_id: int,
    current_user=Depends(require_crm_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> CRMOpportunitySubresourceMutationResponse:
    try:
        item = service.delete_activity(tenant_db, opportunity_id, activity_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return CRMOpportunitySubresourceMutationResponse(
        success=True,
        message="Actividad comercial eliminada correctamente",
        requested_by=build_crm_requested_by(current_user),
        data={"activity_id": item.id, "opportunity_id": item.opportunity_id},
    )


@router.post("/{opportunity_id}/attachments", response_model=CRMOpportunitySubresourceMutationResponse)
async def create_crm_opportunity_attachment(
    opportunity_id: int,
    file: UploadFile = File(...),
    notes: str | None = Form(default=None),
    current_user=Depends(require_crm_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> CRMOpportunitySubresourceMutationResponse:
    try:
        item = service.create_attachment(
            tenant_db,
            opportunity_id,
            file_name=file.filename or "crm-attachment",
            content_type=file.content_type,
            content_bytes=await file.read(),
            notes=notes,
            actor_user_id=current_user.user_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return CRMOpportunitySubresourceMutationResponse(
        success=True,
        message="Adjunto comercial cargado correctamente",
        requested_by=build_crm_requested_by(current_user),
        data={"attachment": build_opportunity_attachment_item(item).model_dump()},
    )


@router.delete("/{opportunity_id}/attachments/{attachment_id}", response_model=CRMOpportunitySubresourceMutationResponse)
def delete_crm_opportunity_attachment(
    opportunity_id: int,
    attachment_id: int,
    current_user=Depends(require_crm_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> CRMOpportunitySubresourceMutationResponse:
    try:
        item = service.delete_attachment(tenant_db, opportunity_id, attachment_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return CRMOpportunitySubresourceMutationResponse(
        success=True,
        message="Adjunto comercial eliminado correctamente",
        requested_by=build_crm_requested_by(current_user),
        data={"attachment_id": item.id, "opportunity_id": item.opportunity_id},
    )


@router.get("/{opportunity_id}/attachments/{attachment_id}/download")
def download_crm_opportunity_attachment(
    opportunity_id: int,
    attachment_id: int,
    current_user=Depends(require_crm_read),
    tenant_db: Session = Depends(get_tenant_db),
):
    try:
        item, file_path = service.get_attachment_file(tenant_db, opportunity_id, attachment_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return FileResponse(
        path=file_path,
        filename=item.file_name,
        media_type=item.content_type or "application/octet-stream",
    )
