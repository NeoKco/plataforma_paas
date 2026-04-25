from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session

from app.apps.tenant_modules.products.api.serializers import (
    build_product_catalog_ingestion_draft_item,
    build_product_catalog_ingestion_run,
    build_product_catalog_item,
)
from app.apps.tenant_modules.products.dependencies import (
    build_products_requested_by,
    require_products_manage,
    require_products_read,
)
from app.apps.tenant_modules.products.schemas import (
    ProductCatalogApproveRequest,
    ProductCatalogDuplicateResolutionRequest,
    ProductCatalogIngestionApprovalResponse,
    ProductCatalogIngestionDraftCreateRequest,
    ProductCatalogIngestionEnrichRequest,
    ProductCatalogIngestionDraftMutationResponse,
    ProductCatalogIngestionDraftsResponse,
    ProductCatalogIngestionDraftUpdateRequest,
    ProductCatalogIngestionExtractUrlRequest,
    ProductCatalogIngestionOverviewResponse,
    ProductCatalogIngestionRunCreateRequest,
    ProductCatalogIngestionRunMutationResponse,
    ProductCatalogIngestionRunsResponse,
    ProductCatalogStatusUpdateDraftRequest,
)
from app.apps.tenant_modules.products.services import (
    ProductCatalogEnrichmentService,
    ProductCatalogIngestionRunService,
    ProductCatalogIngestionService,
    ProductCatalogService,
)
from app.common.db.session_manager import get_tenant_db

router = APIRouter(prefix="/tenant/products/ingestion", tags=["Tenant Products"])
service = ProductCatalogIngestionService()
run_service = ProductCatalogIngestionRunService()
product_service = ProductCatalogService()
enrichment_service = ProductCatalogEnrichmentService()


def _build_runs_payload(rows: list, *, include_items: bool = False):
    run_items_map = (
        run_service.get_run_items_map_for_runs(rows)
        if include_items and rows
        else {}
    )
    return [
        build_product_catalog_ingestion_run(
            row,
            items=run_items_map.get(row.id, []) if include_items else [],
        )
        for row in rows
    ]


def _build_draft_payloads(
    tenant_db: Session,
    rows: list,
):
    characteristic_map = service.get_characteristics_map(tenant_db, [item.id for item in rows])
    published_name_map = product_service.get_product_name_map(
        tenant_db,
        [item.published_product_id for item in rows if item.published_product_id],
    )
    duplicate_analysis_map = enrichment_service.build_duplicate_analysis_map(tenant_db, rows)
    return [
        build_product_catalog_ingestion_draft_item(
            item,
            characteristics=characteristic_map.get(item.id, []),
            published_product_name=published_name_map.get(item.published_product_id),
            duplicate_analysis=duplicate_analysis_map.get(item.id),
            enrichment_state=enrichment_service.build_enrichment_state(item),
        )
        for item in rows
    ]


@router.get("/overview", response_model=ProductCatalogIngestionOverviewResponse)
def get_product_catalog_ingestion_overview(
    current_user=Depends(require_products_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> ProductCatalogIngestionOverviewResponse:
    recent_rows = service.list_drafts(tenant_db, capture_status=None, q=None)[:5]
    return ProductCatalogIngestionOverviewResponse(
        success=True,
        message="Resumen de ingesta recuperado correctamente",
        requested_by=build_products_requested_by(current_user),
        metrics=service.build_overview_metrics(tenant_db),
        recent_drafts=_build_draft_payloads(tenant_db, recent_rows),
    )


@router.get("/drafts", response_model=ProductCatalogIngestionDraftsResponse)
def list_product_catalog_ingestion_drafts(
    capture_status: str | None = None,
    q: str | None = None,
    current_user=Depends(require_products_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> ProductCatalogIngestionDraftsResponse:
    rows = service.list_drafts(tenant_db, capture_status=capture_status, q=q)
    return ProductCatalogIngestionDraftsResponse(
        success=True,
        message="Borradores de ingesta recuperados correctamente",
        requested_by=build_products_requested_by(current_user),
        total=len(rows),
        data=_build_draft_payloads(tenant_db, rows),
    )


@router.post("/drafts", response_model=ProductCatalogIngestionDraftMutationResponse)
def create_product_catalog_ingestion_draft(
    payload: ProductCatalogIngestionDraftCreateRequest,
    current_user=Depends(require_products_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> ProductCatalogIngestionDraftMutationResponse:
    item = service.create_draft(tenant_db, payload, actor_user_id=current_user["user_id"])
    return ProductCatalogIngestionDraftMutationResponse(
        success=True,
        message="Borrador creado correctamente",
        requested_by=build_products_requested_by(current_user),
        data=_build_draft_payloads(tenant_db, [item])[0],
    )


@router.post("/extract-url", response_model=ProductCatalogIngestionDraftMutationResponse)
def extract_product_catalog_url_to_draft(
    payload: ProductCatalogIngestionExtractUrlRequest,
    current_user=Depends(require_products_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> ProductCatalogIngestionDraftMutationResponse:
    try:
        item = run_service.extract_url_to_draft(
            tenant_db,
            payload,
            actor_user_id=current_user["user_id"],
        )
    except (RuntimeError, ValueError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return ProductCatalogIngestionDraftMutationResponse(
        success=True,
        message="Extracción completada y guardada como borrador",
        requested_by=build_products_requested_by(current_user),
        data=_build_draft_payloads(tenant_db, [item])[0],
    )


@router.get("/runs", response_model=ProductCatalogIngestionRunsResponse)
def list_product_catalog_ingestion_runs(
    current_user=Depends(require_products_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> ProductCatalogIngestionRunsResponse:
    rows = run_service.list_runs(tenant_db)
    return ProductCatalogIngestionRunsResponse(
        success=True,
        message="Corridas de ingesta recuperadas correctamente",
        requested_by=build_products_requested_by(current_user),
        total=len(rows),
        data=_build_runs_payload(rows, include_items=True),
    )


@router.post("/runs", response_model=ProductCatalogIngestionRunMutationResponse)
def create_product_catalog_ingestion_run(
    payload: ProductCatalogIngestionRunCreateRequest,
    background_tasks: BackgroundTasks,
    current_user=Depends(require_products_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> ProductCatalogIngestionRunMutationResponse:
    try:
        run = run_service.create_run(
            tenant_db,
            payload,
            actor_user_id=current_user["user_id"],
        )
        run_service.process_run_background(
            background_tasks,
            tenant_slug=current_user["tenant_slug"],
            run_id=run.id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return ProductCatalogIngestionRunMutationResponse(
        success=True,
        message="Corrida de ingesta creada correctamente",
        requested_by=build_products_requested_by(current_user),
        data=build_product_catalog_ingestion_run(run, items=[]),
    )


@router.get("/runs/{run_id}", response_model=ProductCatalogIngestionRunMutationResponse)
def get_product_catalog_ingestion_run(
    run_id: int,
    current_user=Depends(require_products_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> ProductCatalogIngestionRunMutationResponse:
    try:
        run = run_service.get_run(tenant_db, run_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return ProductCatalogIngestionRunMutationResponse(
        success=True,
        message="Corrida de ingesta recuperada correctamente",
        requested_by=build_products_requested_by(current_user),
        data=build_product_catalog_ingestion_run(run, items=run_service.get_run_items(tenant_db, run_id)),
    )


@router.post("/runs/{run_id}/cancel", response_model=ProductCatalogIngestionRunMutationResponse)
def cancel_product_catalog_ingestion_run(
    run_id: int,
    current_user=Depends(require_products_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> ProductCatalogIngestionRunMutationResponse:
    try:
        run = run_service.cancel_run(tenant_db, run_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return ProductCatalogIngestionRunMutationResponse(
        success=True,
        message="Corrida cancelada correctamente",
        requested_by=build_products_requested_by(current_user),
        data=build_product_catalog_ingestion_run(run, items=run_service.get_run_items(tenant_db, run_id)),
    )


@router.get("/drafts/{draft_id}", response_model=ProductCatalogIngestionDraftMutationResponse)
def get_product_catalog_ingestion_draft(
    draft_id: int,
    current_user=Depends(require_products_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> ProductCatalogIngestionDraftMutationResponse:
    try:
        item = service.get_draft(tenant_db, draft_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return ProductCatalogIngestionDraftMutationResponse(
        success=True,
        message="Borrador recuperado correctamente",
        requested_by=build_products_requested_by(current_user),
        data=_build_draft_payloads(tenant_db, [item])[0],
    )


@router.put("/drafts/{draft_id}", response_model=ProductCatalogIngestionDraftMutationResponse)
def update_product_catalog_ingestion_draft(
    draft_id: int,
    payload: ProductCatalogIngestionDraftUpdateRequest,
    current_user=Depends(require_products_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> ProductCatalogIngestionDraftMutationResponse:
    try:
        item = service.update_draft(tenant_db, draft_id, payload, actor_user_id=current_user["user_id"])
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return ProductCatalogIngestionDraftMutationResponse(
        success=True,
        message="Borrador actualizado correctamente",
        requested_by=build_products_requested_by(current_user),
        data=_build_draft_payloads(tenant_db, [item])[0],
    )


@router.patch("/drafts/{draft_id}/status", response_model=ProductCatalogIngestionDraftMutationResponse)
def update_product_catalog_ingestion_draft_status(
    draft_id: int,
    payload: ProductCatalogStatusUpdateDraftRequest,
    current_user=Depends(require_products_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> ProductCatalogIngestionDraftMutationResponse:
    try:
        item = service.set_draft_status(
            tenant_db,
            draft_id,
            capture_status=payload.capture_status,
            actor_user_id=current_user["user_id"],
            review_notes=payload.review_notes,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return ProductCatalogIngestionDraftMutationResponse(
        success=True,
        message="Estado del borrador actualizado correctamente",
        requested_by=build_products_requested_by(current_user),
        data=_build_draft_payloads(tenant_db, [item])[0],
    )


@router.post("/drafts/{draft_id}/enrich", response_model=ProductCatalogIngestionDraftMutationResponse)
def enrich_product_catalog_ingestion_draft(
    draft_id: int,
    payload: ProductCatalogIngestionEnrichRequest,
    current_user=Depends(require_products_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> ProductCatalogIngestionDraftMutationResponse:
    try:
        item = enrichment_service.enrich_draft(
            tenant_db,
            draft_id,
            actor_user_id=current_user["user_id"],
            prefer_ai=payload.prefer_ai,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return ProductCatalogIngestionDraftMutationResponse(
        success=True,
        message="Borrador enriquecido correctamente",
        requested_by=build_products_requested_by(current_user),
        data=_build_draft_payloads(tenant_db, [item])[0],
    )


@router.post("/drafts/{draft_id}/resolve-duplicate", response_model=ProductCatalogIngestionApprovalResponse)
def resolve_product_catalog_duplicate(
    draft_id: int,
    payload: ProductCatalogDuplicateResolutionRequest,
    current_user=Depends(require_products_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> ProductCatalogIngestionApprovalResponse:
    try:
        item, product = service.resolve_duplicate_to_existing_product(
            tenant_db,
            draft_id,
            target_product_id=payload.target_product_id,
            resolution_mode=payload.resolution_mode,
            actor_user_id=current_user["user_id"],
            review_notes=payload.review_notes,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return ProductCatalogIngestionApprovalResponse(
        success=True,
        message="Duplicado resuelto correctamente",
        requested_by=build_products_requested_by(current_user),
        data=_build_draft_payloads(tenant_db, [item])[0],
        published_product=build_product_catalog_item(
            product,
            characteristics=product_service.get_characteristics_map(tenant_db, [product.id]).get(product.id, []),
        ),
    )


@router.post("/drafts/{draft_id}/approve", response_model=ProductCatalogIngestionApprovalResponse)
def approve_product_catalog_ingestion_draft(
    draft_id: int,
    payload: ProductCatalogApproveRequest,
    current_user=Depends(require_products_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> ProductCatalogIngestionApprovalResponse:
    try:
        draft, product = service.approve_draft(
            tenant_db,
            draft_id,
            actor_user_id=current_user["user_id"],
            review_notes=payload.review_notes,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    characteristic_map = service.get_characteristics_map(tenant_db, [draft.id])
    product_characteristics = product_service.get_characteristics_map(tenant_db, [product.id])
    return ProductCatalogIngestionApprovalResponse(
        success=True,
        message="Borrador aprobado y publicado correctamente",
        requested_by=build_products_requested_by(current_user),
        data=_build_draft_payloads(tenant_db, [draft])[0],
        published_product=build_product_catalog_item(
            product,
            characteristics=product_characteristics.get(product.id, []),
        ),
    )
