from app.apps.tenant_modules.crm.services.product_service import CRMProductService
from app.apps.tenant_modules.products.services.product_image_service import (
    ProductCatalogImageService,
)


class ProductCatalogService(CRMProductService):
    def __init__(self) -> None:
        self.image_service = ProductCatalogImageService()

    def delete_product(self, tenant_db, product_id: int):
        images = self.image_service.list_images(tenant_db, product_id)
        item = super().delete_product(tenant_db, product_id)
        for image in images:
            absolute_path = self.image_service._resolve_media_path(image.storage_key)
            if absolute_path.exists():
                absolute_path.unlink()
        return item
