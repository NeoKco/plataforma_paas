from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session

from app.apps.tenant_modules.crm.api.serializers import (
    build_product_ingestion_draft_item,
    build_product_ingestion_run,
    build_product_item,
)
from app.apps.tenant_modules.crm.dependencies import (
    build_crm_requested_by,
    require_crm_manage,
    require_crm_read,
)
from app.apps.tenant_modules.crm.schemas import (
    CRMProductIngestionApprovalResponse,
    CRMProductIngestionApproveRequest,
    CRMProductIngestionDraftCreateRequest,
    CRMProductIngestionDraftMutationResponse,
    CRMProductIngestionDraftsResponse,
    CRMProductIngestionExtractUrlRequest,
    CRMProductIngestionDraftUpdateRequest,
    CRMProductIngestionOverviewResponse,
    CRMProductIngestionRunCreateRequest,
    CRMProductIngestionRunMutationResponse,
    CRMProductIngestionRunsResponse,
    CRMProductIngestionStatusRequest,
)
from app.apps.tenant_modules.crm.services import (
    CRMProductIngestionRunService,
    CRMProductIngestionService,
    CRMProductService,
)
from app.common.db.session_manager import get_tenant_db

router = APIRouter(prefix="/tenant/crm/product-ingestion", tags=["Tenant CRM"])
service = CRMProductIngestionService()
run_service = CRMProductIngestionRunService()
product_service = CRMProductService()


def _build_product_name_map(tenant_db: Session, draft_rows: list) -> dict[int, str]:
    product_ids = [item.published_product_id for item in draft_rows if item.published_product_id]
    if not product_ids:
        return {}
    products = [product_service.get_product(tenant_db, product_id) for product_id in product_ids]
    return {item.id: item.name for item in products}


def _build_run_payloads(tenant_db: Session, runs: list):
    run_item_map = run_service.get_run_item_map(tenant_db, [item.id for item in runs])
    return [
        build_product_ingestion_run(
            item,
            items=run_item_map.get(item.id, []),
        )
        for item in runs
    ]


@router.get("/overview", response_model=CRMProductIngestionOverviewResponse)
def get_crm_product_ingestion_overview(
    current_user=Depends(require_crm_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> CRMProductIngestionOverviewResponse:
    rows = service.list_drafts(tenant_db)[:5]
    characteristic_map = service.get_characteristics_map(tenant_db, [item.id for item in rows])
    product_name_map = _build_product_name_map(tenant_db, rows)
    return CRMProductIngestionOverviewResponse(
        success=True,
        message="Resumen de ingesta recuperado correctamente",
        requested_by=build_crm_requested_by(current_user),
        metrics=service.build_overview(tenant_db),
        recent_drafts=[
            build_product_ingestion_draft_item(
                item,
                characteristics=characteristic_map.get(item.id, []),
                published_product_name=product_name_map.get(item.published_product_id),
            )
            for item in rows
        ],
    )


@router.get("/drafts", response_model=CRMProductIngestionDraftsResponse)
def list_crm_product_ingestion_drafts(
    capture_status: str | None = None,
    q: str | None = None,
    current_user=Depends(require_crm_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> CRMProductIngestionDraftsResponse:
    rows = service.list_drafts(tenant_db, capture_status=capture_status, q=q)
    characteristic_map = service.get_characteristics_map(tenant_db, [item.id for item in rows])
    product_name_map = _build_product_name_map(tenant_db, rows)
    return CRMProductIngestionDraftsResponse(
        success=True,
        message="Borradores de ingesta recuperados correctamente",
        requested_by=build_crm_requested_by(current_user),
        total=len(rows),
        data=[
            build_product_ingestion_draft_item(
                item,
                characteristics=characteristic_map.get(item.id, []),
                published_product_name=product_name_map.get(item.published_product_id),
            )
            for item in rows
        ],
    )


@router.post("/drafts", response_model=CRMProductIngestionDraftMutationResponse)
def create_crm_product_ingestion_draft(
    payload: CRMProductIngestionDraftCreateRequest,
    current_user=Depends(require_crm_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> CRMProductIngestionDraftMutationResponse:
    try:
        item = service.create_draft(
            tenant_db,
            payload,
            actor_user_id=getattr(current_user, "id", None),
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    characteristic_map = service.get_characteristics_map(tenant_db, [item.id])
    return CRMProductIngestionDraftMutationResponse(
        success=True,
        message="Borrador de ingesta creado correctamente",
        requested_by=build_crm_requested_by(current_user),
        data=build_product_ingestion_draft_item(
            item,
            characteristics=characteristic_map.get(item.id, []),
            published_product_name=None,
        ),
    )


@router.post("/extract-url", response_model=CRMProductIngestionDraftMutationResponse)
def extract_crm_product_ingestion_url_to_draft(
    payload: CRMProductIngestionExtractUrlRequest,
    current_user=Depends(require_crm_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> CRMProductIngestionDraftMutationResponse:
    try:
        item = run_service.extract_url_to_draft(
            tenant_db,
            payload,
            actor_user_id=current_user.get("user_id"),
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    characteristic_map = service.get_characteristics_map(tenant_db, [item.id])
    return CRMProductIngestionDraftMutationResponse(
        success=True,
        message="URL extraída y borrador creado correctamente",
        requested_by=build_crm_requested_by(current_user),
        data=build_product_ingestion_draft_item(
            item,
            characteristics=characteristic_map.get(item.id, []),
            published_product_name=None,
        ),
    )


@router.get("/runs", response_model=CRMProductIngestionRunsResponse)
def list_crm_product_ingestion_runs(
    current_user=Depends(require_crm_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> CRMProductIngestionRunsResponse:
    rows = run_service.list_runs(tenant_db)
    return CRMProductIngestionRunsResponse(
        success=True,
        message="Corridas de ingesta recuperadas correctamente",
        requested_by=build_crm_requested_by(current_user),
        total=len(rows),
        data=_build_run_payloads(tenant_db, rows),
    )


@router.post("/runs", response_model=CRMProductIngestionRunMutationResponse)
def create_crm_product_ingestion_run(
    payload: CRMProductIngestionRunCreateRequest,
    background_tasks: BackgroundTasks,
    current_user=Depends(require_crm_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> CRMProductIngestionRunMutationResponse:
    try:
        item = run_service.create_run(
            tenant_db,
            payload,
            actor_user_id=current_user.get("user_id"),
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    background_tasks.add_task(
        run_service.process_run_background,
        current_user["tenant_slug"],
        item.id,
    )
    rows = _build_run_payloads(tenant_db, [item])
    return CRMProductIngestionRunMutationResponse(
        success=True,
        message="Corrida de ingesta iniciada correctamente",
        requested_by=build_crm_requested_by(current_user),
        data=rows[0],
    )


@router.get("/runs/{run_id}", response_model=CRMProductIngestionRunMutationResponse)
def get_crm_product_ingestion_run(
    run_id: int,
    current_user=Depends(require_crm_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> CRMProductIngestionRunMutationResponse:
    try:
        item = run_service.get_run(tenant_db, run_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    rows = _build_run_payloads(tenant_db, [item])
    return CRMProductIngestionRunMutationResponse(
        success=True,
        message="Corrida de ingesta recuperada correctamente",
        requested_by=build_crm_requested_by(current_user),
        data=rows[0],
    )


@router.post("/runs/{run_id}/cancel", response_model=CRMProductIngestionRunMutationResponse)
def cancel_crm_product_ingestion_run(
    run_id: int,
    current_user=Depends(require_crm_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> CRMProductIngestionRunMutationResponse:
    try:
        item = run_service.cancel_run(tenant_db, run_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    rows = _build_run_payloads(tenant_db, [item])
    return CRMProductIngestionRunMutationResponse(
        success=True,
        message="Corrida de ingesta cancelada correctamente",
        requested_by=build_crm_requested_by(current_user),
        data=rows[0],
    )


@router.get("/drafts/{draft_id}", response_model=CRMProductIngestionDraftMutationResponse)
def get_crm_product_ingestion_draft(
    draft_id: int,
    current_user=Depends(require_crm_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> CRMProductIngestionDraftMutationResponse:
    try:
        item = service.get_draft(tenant_db, draft_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    characteristic_map = service.get_characteristics_map(tenant_db, [item.id])
    product_name_map = _build_product_name_map(tenant_db, [item])
    return CRMProductIngestionDraftMutationResponse(
        success=True,
        message="Borrador de ingesta recuperado correctamente",
        requested_by=build_crm_requested_by(current_user),
        data=build_product_ingestion_draft_item(
            item,
            characteristics=characteristic_map.get(item.id, []),
            published_product_name=product_name_map.get(item.published_product_id),
        ),
    )


@router.put("/drafts/{draft_id}", response_model=CRMProductIngestionDraftMutationResponse)
def update_crm_product_ingestion_draft(
    draft_id: int,
    payload: CRMProductIngestionDraftUpdateRequest,
    current_user=Depends(require_crm_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> CRMProductIngestionDraftMutationResponse:
    try:
        item = service.update_draft(
            tenant_db,
            draft_id,
            payload,
            actor_user_id=getattr(current_user, "id", None),
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    characteristic_map = service.get_characteristics_map(tenant_db, [item.id])
    product_name_map = _build_product_name_map(tenant_db, [item])
    return CRMProductIngestionDraftMutationResponse(
        success=True,
        message="Borrador de ingesta actualizado correctamente",
        requested_by=build_crm_requested_by(current_user),
        data=build_product_ingestion_draft_item(
            item,
            characteristics=characteristic_map.get(item.id, []),
            published_product_name=product_name_map.get(item.published_product_id),
        ),
    )


@router.patch("/drafts/{draft_id}/status", response_model=CRMProductIngestionDraftMutationResponse)
def update_crm_product_ingestion_draft_status(
    draft_id: int,
    payload: CRMProductIngestionStatusRequest,
    current_user=Depends(require_crm_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> CRMProductIngestionDraftMutationResponse:
    try:
        item = service.set_draft_status(
            tenant_db,
            draft_id,
            capture_status=payload.capture_status,
            review_notes=payload.review_notes,
            actor_user_id=getattr(current_user, "id", None),
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    characteristic_map = service.get_characteristics_map(tenant_db, [item.id])
    product_name_map = _build_product_name_map(tenant_db, [item])
    return CRMProductIngestionDraftMutationResponse(
        success=True,
        message="Estado del borrador actualizado correctamente",
        requested_by=build_crm_requested_by(current_user),
        data=build_product_ingestion_draft_item(
            item,
            characteristics=characteristic_map.get(item.id, []),
            published_product_name=product_name_map.get(item.published_product_id),
        ),
    )


@router.post("/drafts/{draft_id}/approve", response_model=CRMProductIngestionApprovalResponse)
def approve_crm_product_ingestion_draft(
    draft_id: int,
    payload: CRMProductIngestionApproveRequest,
    current_user=Depends(require_crm_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> CRMProductIngestionApprovalResponse:
    try:
        item, product = service.approve_draft(
            tenant_db,
            draft_id,
            actor_user_id=getattr(current_user, "id", None),
            review_notes=payload.review_notes,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    characteristic_map = service.get_characteristics_map(tenant_db, [item.id])
    product_characteristics = product_service.get_characteristics_map(tenant_db, [product.id]).get(product.id, [])
    return CRMProductIngestionApprovalResponse(
        success=True,
        message="Borrador aprobado y producto creado correctamente",
        requested_by=build_crm_requested_by(current_user),
        data=build_product_ingestion_draft_item(
            item,
            characteristics=characteristic_map.get(item.id, []),
            published_product_name=product.name,
        ),
        published_product=build_product_item(product, characteristics=product_characteristics),
    )
