import base64
import mimetypes
from pathlib import Path
from uuid import uuid4

from app.apps.tenant_modules.crm.models import CRMProduct
from app.apps.tenant_modules.products.models import ProductCatalogImage
from app.common.config.settings import settings


class ProductCatalogImageService:
    ALLOWED_CONTENT_TYPES = {
        "image/jpeg",
        "image/png",
        "image/webp",
    }
    MAX_SIZE_BYTES = 5 * 1024 * 1024

    def list_images(
        self,
        tenant_db,
        product_id: int,
    ) -> list[ProductCatalogImage]:
        self._get_product(tenant_db, product_id)
        return (
            tenant_db.query(ProductCatalogImage)
            .filter(ProductCatalogImage.product_id == product_id)
            .order_by(
                ProductCatalogImage.is_primary.desc(),
                ProductCatalogImage.created_at.asc(),
                ProductCatalogImage.id.asc(),
            )
            .all()
        )

    def get_images_map(
        self,
        tenant_db,
        product_ids: list[int],
    ) -> dict[int, list[ProductCatalogImage]]:
        normalized_ids = [item for item in product_ids if item]
        if not normalized_ids:
            return {}
        rows = (
            tenant_db.query(ProductCatalogImage)
            .filter(ProductCatalogImage.product_id.in_(normalized_ids))
            .order_by(
                ProductCatalogImage.product_id.asc(),
                ProductCatalogImage.is_primary.desc(),
                ProductCatalogImage.created_at.asc(),
                ProductCatalogImage.id.asc(),
            )
            .all()
        )
        grouped: dict[int, list[ProductCatalogImage]] = {}
        for row in rows:
            grouped.setdefault(row.product_id, []).append(row)
        return grouped

    def create_image(
        self,
        tenant_db,
        product_id: int,
        *,
        file_name: str,
        content_type: str | None,
        content_bytes: bytes,
        caption: str | None = None,
        is_primary: bool = False,
        actor_user_id: int | None = None,
    ) -> ProductCatalogImage:
        self._get_product(tenant_db, product_id)
        normalized_file_name = self._normalize_file_name(file_name)
        normalized_content_type = (content_type or "").strip().lower() or None
        if normalized_content_type not in self.ALLOWED_CONTENT_TYPES:
            raise ValueError("Tipo de archivo no soportado para fotos del catálogo")
        if not content_bytes:
            raise ValueError("La foto no puede estar vacía")
        if len(content_bytes) > self.MAX_SIZE_BYTES:
            raise ValueError("La foto supera el tamaño máximo permitido de 5 MB")

        existing_images = self.list_images(tenant_db, product_id)
        should_be_primary = bool(is_primary) or len(existing_images) == 0
        if should_be_primary:
            for image in existing_images:
                image.is_primary = False
                tenant_db.add(image)

        suffix = Path(normalized_file_name).suffix.lower() or self._content_type_to_suffix(
            normalized_content_type
        )
        storage_key = str(Path(f"product_{product_id}") / f"{uuid4().hex}{suffix}")
        absolute_path = self._media_root() / storage_key
        absolute_path.parent.mkdir(parents=True, exist_ok=True)
        absolute_path.write_bytes(content_bytes)

        item = ProductCatalogImage(
            product_id=product_id,
            file_name=normalized_file_name,
            storage_key=storage_key,
            content_type=normalized_content_type,
            file_size=len(content_bytes),
            caption=caption.strip() if caption and caption.strip() else None,
            is_primary=should_be_primary,
            uploaded_by_user_id=actor_user_id,
        )
        try:
            tenant_db.add(item)
            tenant_db.commit()
            tenant_db.refresh(item)
        except Exception:
            if absolute_path.exists():
                absolute_path.unlink()
            raise
        return item

    def delete_image(
        self,
        tenant_db,
        product_id: int,
        image_id: int,
    ) -> ProductCatalogImage:
        self._get_product(tenant_db, product_id)
        image = tenant_db.get(ProductCatalogImage, image_id)
        if image is None or image.product_id != product_id:
            raise ValueError("La foto del catálogo no existe")
        absolute_path = self._resolve_media_path(image.storage_key)
        was_primary = bool(image.is_primary)
        tenant_db.delete(image)
        tenant_db.flush()
        if was_primary:
            replacement = (
                tenant_db.query(ProductCatalogImage)
                .filter(ProductCatalogImage.product_id == product_id)
                .order_by(ProductCatalogImage.created_at.asc(), ProductCatalogImage.id.asc())
                .first()
            )
            if replacement is not None:
                replacement.is_primary = True
                tenant_db.add(replacement)
        tenant_db.commit()
        if absolute_path.exists():
            absolute_path.unlink()
        return image

    def set_primary_image(
        self,
        tenant_db,
        product_id: int,
        image_id: int,
    ) -> ProductCatalogImage:
        self._get_product(tenant_db, product_id)
        image = tenant_db.get(ProductCatalogImage, image_id)
        if image is None or image.product_id != product_id:
            raise ValueError("La foto del catálogo no existe")
        rows = self.list_images(tenant_db, product_id)
        for row in rows:
            row.is_primary = row.id == image.id
            tenant_db.add(row)
        tenant_db.commit()
        tenant_db.refresh(image)
        return image

    def get_image_file(
        self,
        tenant_db,
        product_id: int,
        image_id: int,
    ) -> tuple[ProductCatalogImage, Path]:
        self._get_product(tenant_db, product_id)
        image = tenant_db.get(ProductCatalogImage, image_id)
        if image is None or image.product_id != product_id:
            raise ValueError("La foto del catálogo no existe")
        absolute_path = self._resolve_media_path(image.storage_key)
        if not absolute_path.exists():
            raise ValueError("La foto del catálogo no está disponible en almacenamiento")
        return image, absolute_path

    def build_image_data_url(
        self,
        tenant_db,
        product_id: int,
        image_id: int,
    ) -> dict[str, str | int | None]:
        image, absolute_path = self.get_image_file(tenant_db, product_id, image_id)
        content_bytes = absolute_path.read_bytes()
        content_type = self._resolve_content_type(image, content_bytes, absolute_path)
        encoded = base64.b64encode(content_bytes).decode("ascii")
        return {
            "content_type": content_type,
            "file_name": image.file_name,
            "file_size": len(content_bytes),
            "data_url": f"data:{content_type};base64,{encoded}",
        }

    def resolve_download_content_type(
        self,
        image: ProductCatalogImage,
        absolute_path: Path,
    ) -> str:
        try:
            content_bytes = absolute_path.read_bytes()
        except OSError:
            content_bytes = b""
        return self._resolve_content_type(image, content_bytes, absolute_path)

    def _get_product(self, tenant_db, product_id: int) -> CRMProduct:
        item = tenant_db.get(CRMProduct, product_id)
        if item is None:
            raise ValueError("Producto no encontrado")
        return item

    def _media_root(self) -> Path:
        root = Path(settings.PRODUCTS_MEDIA_DIR)
        root.mkdir(parents=True, exist_ok=True)
        return root

    def _resolve_media_path(self, storage_key: str) -> Path:
        return self._media_root() / storage_key

    def _normalize_file_name(self, file_name: str) -> str:
        normalized = Path(file_name or "product-image").name.strip()
        return normalized or "product-image"

    def _content_type_to_suffix(self, content_type: str | None) -> str:
        if content_type == "image/jpeg":
            return ".jpg"
        if content_type == "image/png":
            return ".png"
        if content_type == "image/webp":
            return ".webp"
        return ""

    def _resolve_content_type(
        self,
        image: ProductCatalogImage,
        content_bytes: bytes,
        absolute_path: Path | None = None,
    ) -> str:
        normalized = (image.content_type or "").strip().lower()
        if normalized and normalized != "application/octet-stream":
            return normalized
        inferred = self._infer_image_content_type(content_bytes)
        if inferred:
            return inferred
        guessed = mimetypes.guess_type(image.file_name or "")[0] or mimetypes.guess_type(
            str(absolute_path or image.storage_key)
        )[0]
        if guessed:
            return guessed
        return normalized or "application/octet-stream"

    def _infer_image_content_type(self, content_bytes: bytes) -> str | None:
        if content_bytes.startswith(b"\xff\xd8\xff"):
            return "image/jpeg"
        if content_bytes.startswith(b"\x89PNG\r\n\x1a\n"):
            return "image/png"
        if content_bytes.startswith((b"GIF87a", b"GIF89a")):
            return "image/gif"
        if content_bytes[:4] == b"RIFF" and content_bytes[8:12] == b"WEBP":
            return "image/webp"
        if content_bytes.startswith(b"BM"):
            return "image/bmp"
        return None
