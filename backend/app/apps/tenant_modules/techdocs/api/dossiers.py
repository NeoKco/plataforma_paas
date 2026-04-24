from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.apps.tenant_modules.techdocs.api.serializers import (
    build_audit_event_item,
    build_dossier_item,
    build_evidence_item,
    build_section_item,
)
from app.apps.tenant_modules.techdocs.models import (
    TechDocsMeasurement,
    TechDocsSection,
)
from app.apps.tenant_modules.techdocs.dependencies import (
    build_techdocs_requested_by,
    require_techdocs_manage,
    require_techdocs_read,
)
from app.apps.tenant_modules.techdocs.schemas import (
    TechDocsDossierCreateRequest,
    TechDocsDossierDetailItemResponse,
    TechDocsDossierDetailResponse,
    TechDocsDossierMutationResponse,
    TechDocsDossierStatusUpdateRequest,
    TechDocsDossiersResponse,
    TechDocsEvidenceMutationResponse,
    TechDocsMeasurementMutationResponse,
    TechDocsMeasurementWriteRequest,
    TechDocsSectionMutationResponse,
    TechDocsSectionWriteRequest,
)
from app.apps.tenant_modules.techdocs.services import TechDocsDossierService
from app.common.db.session_manager import get_tenant_db

router = APIRouter(prefix="/tenant/techdocs/dossiers", tags=["Tenant TechDocs"])
service = TechDocsDossierService()


def _build_detail(tenant_db, detail: dict) -> TechDocsDossierDetailItemResponse:
    dossier = detail["dossier"]
    maps = service.get_reference_maps(tenant_db, [dossier])
    user_display_map = maps["users"]
    return TechDocsDossierDetailItemResponse(
        dossier=build_dossier_item(dossier, maps=maps),
        sections=[
            build_section_item(
                section,
                detail["measurements_by_section"].get(section.id, []),
            )
            for section in detail["sections"]
        ],
        evidences=[
            build_evidence_item(item, user_display_map=user_display_map)
            for item in detail["evidences"]
        ],
        audit_events=[
            build_audit_event_item(item, user_display_map=user_display_map)
            for item in detail["audit_events"]
        ],
    )


@router.get("", response_model=TechDocsDossiersResponse)
def list_techdocs_dossiers(
    include_inactive: bool = True,
    include_archived: bool = True,
    status: str | None = None,
    dossier_type: str | None = None,
    client_id: int | None = None,
    installation_id: int | None = None,
    q: str | None = None,
    current_user=Depends(require_techdocs_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> TechDocsDossiersResponse:
    try:
        rows = service.list_dossiers(
            tenant_db,
            include_inactive=include_inactive,
            include_archived=include_archived,
            status=status,
            dossier_type=dossier_type,
            client_id=client_id,
            installation_id=installation_id,
            q=q,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    maps = service.get_reference_maps(tenant_db, rows)
    return TechDocsDossiersResponse(
        success=True,
        message="Expedientes recuperados correctamente",
        requested_by=build_techdocs_requested_by(current_user),
        total=len(rows),
        data=[build_dossier_item(item, maps=maps) for item in rows],
    )


@router.post("", response_model=TechDocsDossierMutationResponse)
def create_techdocs_dossier(
    payload: TechDocsDossierCreateRequest,
    current_user=Depends(require_techdocs_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> TechDocsDossierMutationResponse:
    try:
        item = service.create_dossier(tenant_db, payload, actor_user_id=current_user.user_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    maps = service.get_reference_maps(tenant_db, [item])
    return TechDocsDossierMutationResponse(
        success=True,
        message="Expediente creado correctamente",
        requested_by=build_techdocs_requested_by(current_user),
        data=build_dossier_item(item, maps=maps),
    )


@router.get("/{dossier_id}/detail", response_model=TechDocsDossierDetailResponse)
def get_techdocs_dossier_detail(
    dossier_id: int,
    current_user=Depends(require_techdocs_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> TechDocsDossierDetailResponse:
    try:
        detail = service.get_dossier_detail(tenant_db, dossier_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return TechDocsDossierDetailResponse(
        success=True,
        message="Detalle del expediente recuperado correctamente",
        requested_by=build_techdocs_requested_by(current_user),
        data=_build_detail(tenant_db, detail),
    )


@router.put("/{dossier_id}", response_model=TechDocsDossierMutationResponse)
def update_techdocs_dossier(
    dossier_id: int,
    payload: TechDocsDossierCreateRequest,
    current_user=Depends(require_techdocs_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> TechDocsDossierMutationResponse:
    try:
        item = service.update_dossier(tenant_db, dossier_id, payload, actor_user_id=current_user.user_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    maps = service.get_reference_maps(tenant_db, [item])
    return TechDocsDossierMutationResponse(
        success=True,
        message="Expediente actualizado correctamente",
        requested_by=build_techdocs_requested_by(current_user),
        data=build_dossier_item(item, maps=maps),
    )


@router.patch("/{dossier_id}/status", response_model=TechDocsDossierMutationResponse)
def update_techdocs_dossier_status(
    dossier_id: int,
    payload: TechDocsDossierStatusUpdateRequest,
    current_user=Depends(require_techdocs_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> TechDocsDossierMutationResponse:
    try:
        item = service.set_dossier_status(
            tenant_db,
            dossier_id,
            payload.status,
            notes=payload.notes,
            actor_user_id=current_user.user_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    maps = service.get_reference_maps(tenant_db, [item])
    return TechDocsDossierMutationResponse(
        success=True,
        message="Estado del expediente actualizado correctamente",
        requested_by=build_techdocs_requested_by(current_user),
        data=build_dossier_item(item, maps=maps),
    )


@router.delete("/{dossier_id}", response_model=TechDocsDossierMutationResponse)
def delete_techdocs_dossier(
    dossier_id: int,
    current_user=Depends(require_techdocs_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> TechDocsDossierMutationResponse:
    try:
        item = service.delete_dossier(tenant_db, dossier_id, actor_user_id=current_user.user_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    maps = service.get_reference_maps(tenant_db, [item])
    return TechDocsDossierMutationResponse(
        success=True,
        message="Expediente archivado correctamente",
        requested_by=build_techdocs_requested_by(current_user),
        data=build_dossier_item(item, maps=maps),
    )


@router.post("/{dossier_id}/sections", response_model=TechDocsSectionMutationResponse)
def create_techdocs_section(
    dossier_id: int,
    payload: TechDocsSectionWriteRequest,
    current_user=Depends(require_techdocs_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> TechDocsSectionMutationResponse:
    try:
        service.create_section(tenant_db, dossier_id, payload, actor_user_id=current_user.user_id)
        detail = service.get_dossier_detail(tenant_db, dossier_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return TechDocsSectionMutationResponse(
        success=True,
        message="Sección agregada correctamente",
        requested_by=build_techdocs_requested_by(current_user),
        detail=_build_detail(tenant_db, detail),
    )


@router.put("/sections/{section_id}", response_model=TechDocsSectionMutationResponse)
def update_techdocs_section(
    section_id: int,
    payload: TechDocsSectionWriteRequest,
    current_user=Depends(require_techdocs_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> TechDocsSectionMutationResponse:
    try:
        item = service.update_section(tenant_db, section_id, payload, actor_user_id=current_user.user_id)
        detail = service.get_dossier_detail(tenant_db, item.dossier_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return TechDocsSectionMutationResponse(
        success=True,
        message="Sección actualizada correctamente",
        requested_by=build_techdocs_requested_by(current_user),
        detail=_build_detail(tenant_db, detail),
    )


@router.delete("/sections/{section_id}", response_model=TechDocsSectionMutationResponse)
def delete_techdocs_section(
    section_id: int,
    current_user=Depends(require_techdocs_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> TechDocsSectionMutationResponse:
    try:
        existing = tenant_db.get(TechDocsSection, section_id)
        if existing is None:
            raise ValueError("Sección técnica no encontrada")
        dossier_id = existing.dossier_id
        service.delete_section(tenant_db, section_id, actor_user_id=current_user.user_id)
        detail = service.get_dossier_detail(tenant_db, dossier_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return TechDocsSectionMutationResponse(
        success=True,
        message="Sección eliminada correctamente",
        requested_by=build_techdocs_requested_by(current_user),
        detail=_build_detail(tenant_db, detail),
    )


@router.post("/sections/{section_id}/measurements", response_model=TechDocsMeasurementMutationResponse)
def create_techdocs_measurement(
    section_id: int,
    payload: TechDocsMeasurementWriteRequest,
    current_user=Depends(require_techdocs_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> TechDocsMeasurementMutationResponse:
    try:
        item = service.create_measurement(tenant_db, section_id, payload, actor_user_id=current_user.user_id)
        detail = service.get_dossier_detail(tenant_db, item.dossier_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return TechDocsMeasurementMutationResponse(
        success=True,
        message="Medición agregada correctamente",
        requested_by=build_techdocs_requested_by(current_user),
        detail=_build_detail(tenant_db, detail),
    )


@router.put("/measurements/{measurement_id}", response_model=TechDocsMeasurementMutationResponse)
def update_techdocs_measurement(
    measurement_id: int,
    payload: TechDocsMeasurementWriteRequest,
    current_user=Depends(require_techdocs_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> TechDocsMeasurementMutationResponse:
    try:
        item = service.update_measurement(
            tenant_db,
            measurement_id,
            payload,
            actor_user_id=current_user.user_id,
        )
        detail = service.get_dossier_detail(tenant_db, item.dossier_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return TechDocsMeasurementMutationResponse(
        success=True,
        message="Medición actualizada correctamente",
        requested_by=build_techdocs_requested_by(current_user),
        detail=_build_detail(tenant_db, detail),
    )


@router.delete("/measurements/{measurement_id}", response_model=TechDocsMeasurementMutationResponse)
def delete_techdocs_measurement(
    measurement_id: int,
    current_user=Depends(require_techdocs_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> TechDocsMeasurementMutationResponse:
    try:
        existing = tenant_db.get(TechDocsMeasurement, measurement_id)
        if existing is None:
            raise ValueError("Medición técnica no encontrada")
        dossier_id = existing.dossier_id
        service.delete_measurement(tenant_db, measurement_id, actor_user_id=current_user.user_id)
        detail = service.get_dossier_detail(tenant_db, dossier_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return TechDocsMeasurementMutationResponse(
        success=True,
        message="Medición eliminada correctamente",
        requested_by=build_techdocs_requested_by(current_user),
        detail=_build_detail(tenant_db, detail),
    )


@router.post("/{dossier_id}/evidences", response_model=TechDocsEvidenceMutationResponse)
async def upload_techdocs_evidence(
    dossier_id: int,
    evidence_kind: str = Form("photo"),
    description: str | None = Form(default=None),
    file: UploadFile = File(...),
    current_user=Depends(require_techdocs_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> TechDocsEvidenceMutationResponse:
    try:
        content = await file.read()
        service.add_evidence(
            tenant_db,
            dossier_id,
            file_name=file.filename or "evidence",
            content_type=file.content_type,
            content_bytes=content,
            evidence_kind=evidence_kind,
            description=description,
            actor_user_id=current_user.user_id,
        )
        detail = service.get_dossier_detail(tenant_db, dossier_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return TechDocsEvidenceMutationResponse(
        success=True,
        message="Evidencia agregada correctamente",
        requested_by=build_techdocs_requested_by(current_user),
        detail=_build_detail(tenant_db, detail),
    )


@router.delete("/{dossier_id}/evidences/{evidence_id}", response_model=TechDocsEvidenceMutationResponse)
def delete_techdocs_evidence(
    dossier_id: int,
    evidence_id: int,
    current_user=Depends(require_techdocs_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> TechDocsEvidenceMutationResponse:
    try:
        service.delete_evidence(tenant_db, dossier_id, evidence_id, actor_user_id=current_user.user_id)
        detail = service.get_dossier_detail(tenant_db, dossier_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return TechDocsEvidenceMutationResponse(
        success=True,
        message="Evidencia eliminada correctamente",
        requested_by=build_techdocs_requested_by(current_user),
        detail=_build_detail(tenant_db, detail),
    )


@router.get("/{dossier_id}/evidences/{evidence_id}/download")
def download_techdocs_evidence(
    dossier_id: int,
    evidence_id: int,
    current_user=Depends(require_techdocs_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> FileResponse:
    del current_user
    try:
        item, absolute_path = service.get_evidence_file(tenant_db, dossier_id, evidence_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return FileResponse(
        absolute_path,
        filename=item.file_name,
        media_type=item.content_type or "application/octet-stream",
    )
