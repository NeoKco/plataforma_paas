from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.apps.tenant_modules.products.api.serializers import build_product_catalog_item
from app.apps.tenant_modules.products.dependencies import (
    build_products_requested_by,
    require_products_manage,
    require_products_read,
)
from app.apps.tenant_modules.products.schemas import (
    ProductCatalogImageDeleteResponse,
    ProductCatalogImagePreviewResponse,
    ProductCatalogImageMutationResponse,
    ProductCatalogMutationResponse,
    ProductCatalogProductsResponse,
    ProductCatalogProductCreateRequest,
    ProductCatalogProductUpdateRequest,
    ProductCatalogStatusUpdateRequest,
)
from app.apps.tenant_modules.products.services import (
    ProductCatalogImageService,
    ProductCatalogService,
)
from app.apps.tenant_modules.products.services import ProductSourceService
from app.common.db.session_manager import get_tenant_db

router = APIRouter(prefix="/tenant/products/catalog", tags=["Tenant Products"])
service = ProductCatalogService()
source_service = ProductSourceService()
image_service = ProductCatalogImageService()


@router.get("", response_model=ProductCatalogProductsResponse)
def list_product_catalog_items(
    include_inactive: bool = True,
    product_type: str | None = None,
    q: str | None = None,
    current_user=Depends(require_products_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> ProductCatalogProductsResponse:
    rows = service.list_products(
        tenant_db,
        include_inactive=include_inactive,
        product_type=product_type,
        q=q,
    )
    characteristic_map = service.get_characteristics_map(tenant_db, [item.id for item in rows])
    health_map = source_service.build_product_health_map(tenant_db, [item.id for item in rows])
    image_map = image_service.get_images_map(tenant_db, [item.id for item in rows])
    return ProductCatalogProductsResponse(
        success=True,
        message="Catálogo recuperado correctamente",
        requested_by=build_products_requested_by(current_user),
        total=len(rows),
        data=[
            build_product_catalog_item(
                item,
                characteristics=characteristic_map.get(item.id, []),
                health=health_map.get(item.id),
                images=image_map.get(item.id, []),
            )
            for item in rows
        ],
    )


@router.post("", response_model=ProductCatalogMutationResponse)
def create_product_catalog_item(
    payload: ProductCatalogProductCreateRequest,
    current_user=Depends(require_products_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> ProductCatalogMutationResponse:
    try:
        item = service.create_product(tenant_db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    characteristic_map = service.get_characteristics_map(tenant_db, [item.id])
    health_map = source_service.build_product_health_map(tenant_db, [item.id])
    image_map = image_service.get_images_map(tenant_db, [item.id])
    return ProductCatalogMutationResponse(
        success=True,
        message="Producto creado correctamente",
        requested_by=build_products_requested_by(current_user),
        data=build_product_catalog_item(
            item,
            characteristics=characteristic_map.get(item.id, []),
            health=health_map.get(item.id),
            images=image_map.get(item.id, []),
        ),
    )


@router.get("/{product_id}", response_model=ProductCatalogMutationResponse)
def get_product_catalog_item(
    product_id: int,
    current_user=Depends(require_products_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> ProductCatalogMutationResponse:
    try:
        item = service.get_product(tenant_db, product_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    characteristic_map = service.get_characteristics_map(tenant_db, [item.id])
    health_map = source_service.build_product_health_map(tenant_db, [item.id])
    image_map = image_service.get_images_map(tenant_db, [item.id])
    return ProductCatalogMutationResponse(
        success=True,
        message="Producto recuperado correctamente",
        requested_by=build_products_requested_by(current_user),
        data=build_product_catalog_item(
            item,
            characteristics=characteristic_map.get(item.id, []),
            health=health_map.get(item.id),
            images=image_map.get(item.id, []),
        ),
    )


@router.put("/{product_id}", response_model=ProductCatalogMutationResponse)
def update_product_catalog_item(
    product_id: int,
    payload: ProductCatalogProductUpdateRequest,
    current_user=Depends(require_products_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> ProductCatalogMutationResponse:
    try:
        item = service.update_product(tenant_db, product_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    characteristic_map = service.get_characteristics_map(tenant_db, [item.id])
    health_map = source_service.build_product_health_map(tenant_db, [item.id])
    image_map = image_service.get_images_map(tenant_db, [item.id])
    return ProductCatalogMutationResponse(
        success=True,
        message="Producto actualizado correctamente",
        requested_by=build_products_requested_by(current_user),
        data=build_product_catalog_item(
            item,
            characteristics=characteristic_map.get(item.id, []),
            health=health_map.get(item.id),
            images=image_map.get(item.id, []),
        ),
    )


@router.patch("/{product_id}/status", response_model=ProductCatalogMutationResponse)
def update_product_catalog_item_status(
    product_id: int,
    payload: ProductCatalogStatusUpdateRequest,
    current_user=Depends(require_products_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> ProductCatalogMutationResponse:
    try:
        item = service.set_product_active(tenant_db, product_id, payload.is_active)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    characteristic_map = service.get_characteristics_map(tenant_db, [item.id])
    health_map = source_service.build_product_health_map(tenant_db, [item.id])
    image_map = image_service.get_images_map(tenant_db, [item.id])
    return ProductCatalogMutationResponse(
        success=True,
        message="Estado del producto actualizado correctamente",
        requested_by=build_products_requested_by(current_user),
        data=build_product_catalog_item(
            item,
            characteristics=characteristic_map.get(item.id, []),
            health=health_map.get(item.id),
            images=image_map.get(item.id, []),
        ),
    )


@router.delete("/{product_id}", response_model=ProductCatalogMutationResponse)
def delete_product_catalog_item(
    product_id: int,
    current_user=Depends(require_products_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> ProductCatalogMutationResponse:
    try:
        item = service.delete_product(tenant_db, product_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return ProductCatalogMutationResponse(
        success=True,
        message="Producto eliminado correctamente",
        requested_by=build_products_requested_by(current_user),
        data=build_product_catalog_item(item, characteristics=[], health=None, images=[]),
    )


@router.post(
    "/{product_id}/images",
    response_model=ProductCatalogImageMutationResponse,
)
async def create_product_catalog_image(
    product_id: int,
    file: UploadFile = File(...),
    caption: str | None = Form(default=None),
    is_primary: bool = Form(default=False),
    current_user=Depends(require_products_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> ProductCatalogImageMutationResponse:
    try:
        image = image_service.create_image(
            tenant_db,
            product_id,
            file_name=file.filename or "product-image",
            content_type=file.content_type,
            content_bytes=await file.read(),
            caption=caption,
            is_primary=is_primary,
            actor_user_id=current_user["user_id"],
        )
    except ValueError as exc:
        if "no encontrado" in str(exc):
            raise HTTPException(status_code=404, detail=str(exc)) from exc
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return ProductCatalogImageMutationResponse(
        success=True,
        message="Foto del catálogo cargada correctamente",
        requested_by=build_products_requested_by(current_user),
        data={
            "id": image.id,
            "product_id": image.product_id,
            "file_name": image.file_name,
            "content_type": image.content_type,
            "file_size": image.file_size,
            "caption": image.caption,
            "is_primary": bool(image.is_primary),
            "uploaded_by_user_id": image.uploaded_by_user_id,
            "created_at": image.created_at,
            "download_url": f"/tenant/products/catalog/{image.product_id}/images/{image.id}/download",
        },
    )


@router.patch(
    "/{product_id}/images/{image_id}/primary",
    response_model=ProductCatalogImageMutationResponse,
)
def set_product_catalog_primary_image(
    product_id: int,
    image_id: int,
    current_user=Depends(require_products_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> ProductCatalogImageMutationResponse:
    try:
        image = image_service.set_primary_image(tenant_db, product_id, image_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return ProductCatalogImageMutationResponse(
        success=True,
        message="Foto principal actualizada correctamente",
        requested_by=build_products_requested_by(current_user),
        data={
            "id": image.id,
            "product_id": image.product_id,
            "file_name": image.file_name,
            "content_type": image.content_type,
            "file_size": image.file_size,
            "caption": image.caption,
            "is_primary": bool(image.is_primary),
            "uploaded_by_user_id": image.uploaded_by_user_id,
            "created_at": image.created_at,
            "download_url": f"/tenant/products/catalog/{image.product_id}/images/{image.id}/download",
        },
    )


@router.delete(
    "/{product_id}/images/{image_id}",
    response_model=ProductCatalogImageDeleteResponse,
)
def delete_product_catalog_image(
    product_id: int,
    image_id: int,
    current_user=Depends(require_products_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> ProductCatalogImageDeleteResponse:
    try:
        image = image_service.delete_image(tenant_db, product_id, image_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return ProductCatalogImageDeleteResponse(
        success=True,
        message="Foto del catálogo eliminada correctamente",
        requested_by=build_products_requested_by(current_user),
        product_id=image.product_id,
        deleted_id=image.id,
    )


@router.get("/{product_id}/images/{image_id}/download")
def download_product_catalog_image(
    product_id: int,
    image_id: int,
    current_user=Depends(require_products_read),
    tenant_db: Session = Depends(get_tenant_db),
):
    try:
        image, absolute_path = image_service.get_image_file(tenant_db, product_id, image_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return FileResponse(
        path=str(absolute_path),
        media_type=image.content_type or "application/octet-stream",
        filename=image.file_name,
    )


@router.get(
    "/{product_id}/images/{image_id}/preview",
    response_model=ProductCatalogImagePreviewResponse,
)
def preview_product_catalog_image(
    product_id: int,
    image_id: int,
    current_user=Depends(require_products_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> ProductCatalogImagePreviewResponse:
    try:
        payload = image_service.build_image_data_url(tenant_db, product_id, image_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return ProductCatalogImagePreviewResponse(
        success=True,
        message="Preview de foto del catálogo recuperado correctamente",
        requested_by=build_products_requested_by(current_user),
        product_id=product_id,
        image_id=image_id,
        file_name=payload.get("file_name"),
        content_type=payload.get("content_type"),
        file_size=payload.get("file_size"),
        data_url=payload["data_url"],
    )
