from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.apps.tenant_modules.maintenance.dependencies import (
    build_maintenance_requested_by,
    require_maintenance_manage,
    require_maintenance_read,
)
from app.apps.tenant_modules.maintenance.schemas import (
    MaintenanceFieldReportChecklistItemResponse,
    MaintenanceFieldReportData,
    MaintenanceFieldReportResponse,
    MaintenanceFieldReportUpdateRequest,
    MaintenanceWorkOrderEvidenceDeleteResponse,
    MaintenanceWorkOrderEvidenceItemResponse,
    MaintenanceWorkOrderEvidenceMutationResponse,
)
from app.apps.tenant_modules.maintenance.services import MaintenanceFieldReportService
from app.common.db.session_manager import get_tenant_db

router = APIRouter(prefix="/tenant/maintenance/work-orders", tags=["Tenant Maintenance"])
field_report_service = MaintenanceFieldReportService()


def _build_checklist_item(item) -> MaintenanceFieldReportChecklistItemResponse:
    return MaintenanceFieldReportChecklistItemResponse(
        id=getattr(item, "id", None),
        work_order_id=getattr(item, "work_order_id", None),
        item_key=item.item_key,
        label=item.label,
        is_completed=item.is_completed,
        notes=getattr(item, "notes", None),
        sort_order=getattr(item, "sort_order", 0),
        updated_by_user_id=getattr(item, "updated_by_user_id", None),
        created_at=getattr(item, "created_at", None),
        updated_at=getattr(item, "updated_at", None),
    )


def _build_evidence_item(item) -> MaintenanceWorkOrderEvidenceItemResponse:
    return MaintenanceWorkOrderEvidenceItemResponse(
        id=item.id,
        work_order_id=item.work_order_id,
        file_name=item.file_name,
        content_type=item.content_type,
        file_size=item.file_size,
        notes=item.notes,
        uploaded_by_user_id=item.uploaded_by_user_id,
        created_at=item.created_at,
    )


@router.get("/{work_order_id}/field-report", response_model=MaintenanceFieldReportResponse)
def get_maintenance_field_report(
    work_order_id: int,
    current_user=Depends(require_maintenance_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> MaintenanceFieldReportResponse:
    try:
        data = field_report_service.get_field_report(tenant_db, work_order_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return MaintenanceFieldReportResponse(
        success=True,
        message="Checklist y evidencias recuperados correctamente",
        requested_by=build_maintenance_requested_by(current_user),
        data=MaintenanceFieldReportData(
            work_order_id=data["work_order"].id,
            closure_notes=data["closure_notes"],
            checklist_items=[_build_checklist_item(item) for item in data["checklist_items"]],
            evidences=[_build_evidence_item(item) for item in data["evidences"]],
        ),
    )


@router.put("/{work_order_id}/field-report", response_model=MaintenanceFieldReportResponse)
def update_maintenance_field_report(
    work_order_id: int,
    payload: MaintenanceFieldReportUpdateRequest,
    current_user=Depends(require_maintenance_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> MaintenanceFieldReportResponse:
    try:
        data = field_report_service.update_field_report(
            tenant_db,
            work_order_id,
            payload,
            actor_user_id=current_user["user_id"],
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return MaintenanceFieldReportResponse(
        success=True,
        message="Checklist y cierre técnico actualizados correctamente",
        requested_by=build_maintenance_requested_by(current_user),
        data=MaintenanceFieldReportData(
            work_order_id=data["work_order"].id,
            closure_notes=data["closure_notes"],
            checklist_items=[_build_checklist_item(item) for item in data["checklist_items"]],
            evidences=[_build_evidence_item(item) for item in data["evidences"]],
        ),
    )


@router.post("/{work_order_id}/evidences", response_model=MaintenanceWorkOrderEvidenceMutationResponse)
async def create_maintenance_work_order_evidence(
    work_order_id: int,
    file: UploadFile = File(...),
    notes: str | None = Form(default=None),
    current_user=Depends(require_maintenance_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> MaintenanceWorkOrderEvidenceMutationResponse:
    try:
        evidence = field_report_service.create_evidence(
            tenant_db,
            work_order_id,
            file_name=file.filename or "evidence",
            content_type=file.content_type,
            content_bytes=await file.read(),
            notes=notes,
            actor_user_id=current_user["user_id"],
        )
    except ValueError as exc:
        if "no existe" in str(exc):
            raise HTTPException(status_code=404, detail=str(exc)) from exc
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return MaintenanceWorkOrderEvidenceMutationResponse(
        success=True,
        message="Evidencia cargada correctamente",
        requested_by=build_maintenance_requested_by(current_user),
        data=_build_evidence_item(evidence),
    )


@router.delete(
    "/{work_order_id}/evidences/{evidence_id}",
    response_model=MaintenanceWorkOrderEvidenceDeleteResponse,
)
def delete_maintenance_work_order_evidence(
    work_order_id: int,
    evidence_id: int,
    current_user=Depends(require_maintenance_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> MaintenanceWorkOrderEvidenceDeleteResponse:
    try:
        evidence = field_report_service.delete_evidence(tenant_db, work_order_id, evidence_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return MaintenanceWorkOrderEvidenceDeleteResponse(
        success=True,
        message="Evidencia eliminada correctamente",
        requested_by=build_maintenance_requested_by(current_user),
        data={"evidence_id": evidence.id, "work_order_id": evidence.work_order_id},
    )


@router.get("/{work_order_id}/evidences/{evidence_id}/download")
def download_maintenance_work_order_evidence(
    work_order_id: int,
    evidence_id: int,
    current_user=Depends(require_maintenance_read),
    tenant_db: Session = Depends(get_tenant_db),
):
    try:
        evidence, absolute_path = field_report_service.get_evidence_file(
            tenant_db,
            work_order_id,
            evidence_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    return FileResponse(
        path=str(absolute_path),
        media_type=evidence.content_type or "application/octet-stream",
        filename=evidence.file_name,
    )