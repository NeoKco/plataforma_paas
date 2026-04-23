from sqlalchemy import func

from app.apps.tenant_modules.crm.models import CRMProduct


class CRMProductService:
    VALID_PRODUCT_TYPES = {"product", "service"}

    def list_products(
        self,
        tenant_db,
        *,
        include_inactive: bool = True,
        product_type: str | None = None,
        q: str | None = None,
    ) -> list[CRMProduct]:
        query = tenant_db.query(CRMProduct)
        if not include_inactive:
            query = query.filter(CRMProduct.is_active.is_(True))
        if product_type:
            query = query.filter(CRMProduct.product_type == product_type.strip().lower())
        if q and q.strip():
            token = f"%{q.strip().lower()}%"
            query = query.filter(
                func.lower(CRMProduct.name).like(token)
                | func.lower(func.coalesce(CRMProduct.sku, "")).like(token)
            )
        return (
            query.order_by(CRMProduct.is_active.desc(), CRMProduct.sort_order.asc(), CRMProduct.name.asc())
            .all()
        )

    def get_product(self, tenant_db, product_id: int) -> CRMProduct:
        item = tenant_db.get(CRMProduct, product_id)
        if item is None:
            raise ValueError("Producto no encontrado")
        return item

    def create_product(self, tenant_db, payload) -> CRMProduct:
        normalized_type = (payload.product_type or "service").strip().lower()
        if normalized_type not in self.VALID_PRODUCT_TYPES:
            raise ValueError("Tipo de producto invalido")
        if self._has_duplicate_name(tenant_db, payload.name):
            raise ValueError("Ya existe un producto/servicio con ese nombre")
        if payload.sku and self._has_duplicate_sku(tenant_db, payload.sku):
            raise ValueError("Ya existe un producto/servicio con ese SKU")
        item = CRMProduct(
            sku=self._normalize_optional(payload.sku),
            name=payload.name.strip(),
            product_type=normalized_type,
            unit_label=self._normalize_optional(payload.unit_label),
            unit_price=max(float(payload.unit_price or 0), 0),
            description=self._normalize_optional(payload.description),
            is_active=bool(payload.is_active),
            sort_order=int(payload.sort_order),
        )
        tenant_db.add(item)
        tenant_db.commit()
        tenant_db.refresh(item)
        return item

    def update_product(self, tenant_db, product_id: int, payload) -> CRMProduct:
        item = self.get_product(tenant_db, product_id)
        normalized_type = (payload.product_type or "service").strip().lower()
        if normalized_type not in self.VALID_PRODUCT_TYPES:
            raise ValueError("Tipo de producto invalido")
        if self._has_duplicate_name(tenant_db, payload.name, exclude_id=item.id):
            raise ValueError("Ya existe un producto/servicio con ese nombre")
        if payload.sku and self._has_duplicate_sku(tenant_db, payload.sku, exclude_id=item.id):
            raise ValueError("Ya existe un producto/servicio con ese SKU")
        item.sku = self._normalize_optional(payload.sku)
        item.name = payload.name.strip()
        item.product_type = normalized_type
        item.unit_label = self._normalize_optional(payload.unit_label)
        item.unit_price = max(float(payload.unit_price or 0), 0)
        item.description = self._normalize_optional(payload.description)
        item.is_active = bool(payload.is_active)
        item.sort_order = int(payload.sort_order)
        tenant_db.add(item)
        tenant_db.commit()
        tenant_db.refresh(item)
        return item

    def set_product_active(self, tenant_db, product_id: int, is_active: bool) -> CRMProduct:
        item = self.get_product(tenant_db, product_id)
        item.is_active = bool(is_active)
        tenant_db.add(item)
        tenant_db.commit()
        tenant_db.refresh(item)
        return item

    def delete_product(self, tenant_db, product_id: int) -> CRMProduct:
        item = self.get_product(tenant_db, product_id)
        tenant_db.delete(item)
        tenant_db.commit()
        return item

    def _has_duplicate_name(self, tenant_db, name: str, *, exclude_id: int | None = None) -> bool:
        normalized = " ".join((name or "").strip().lower().split())
        if not normalized:
            raise ValueError("El nombre es obligatorio")
        items = tenant_db.query(CRMProduct).all()
        for item in items:
            if exclude_id is not None and item.id == exclude_id:
                continue
            current = " ".join((item.name or "").strip().lower().split())
            if current == normalized:
                return True
        return False

    def _has_duplicate_sku(self, tenant_db, sku: str, *, exclude_id: int | None = None) -> bool:
        normalized = (sku or "").strip().lower()
        items = tenant_db.query(CRMProduct).all()
        for item in items:
            if exclude_id is not None and item.id == exclude_id:
                continue
            if ((item.sku or "").strip().lower()) == normalized:
                return True
        return False

    @staticmethod
    def _normalize_optional(value: str | None) -> str | None:
        text = (value or "").strip()
        return text or None
