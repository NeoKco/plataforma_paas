from sqlalchemy import func

from app.apps.tenant_modules.crm.models import CRMProduct, CRMProductCharacteristic


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
            query.order_by(
                CRMProduct.is_active.desc(),
                CRMProduct.sort_order.asc(),
                CRMProduct.name.asc(),
            ).all()
        )

    def get_product(self, tenant_db, product_id: int) -> CRMProduct:
        item = tenant_db.get(CRMProduct, product_id)
        if item is None:
            raise ValueError("Producto no encontrado")
        return item

    def create_product(self, tenant_db, payload) -> CRMProduct:
        normalized_type = self._validate_type(payload.product_type)
        normalized_name = self._normalize_required_name(payload.name)
        if self._has_duplicate_name(tenant_db, normalized_name):
            raise ValueError("Ya existe un producto/servicio con ese nombre")
        normalized_sku = self._normalize_optional(payload.sku)
        if normalized_sku and self._has_duplicate_sku(tenant_db, normalized_sku):
            raise ValueError("Ya existe un producto/servicio con ese SKU")

        item = CRMProduct(
            sku=normalized_sku,
            name=normalized_name,
            product_type=normalized_type,
            unit_label=self._normalize_optional(payload.unit_label),
            unit_price=max(float(payload.unit_price or 0), 0),
            description=self._normalize_optional(payload.description),
            is_active=bool(payload.is_active),
            sort_order=int(payload.sort_order),
        )
        tenant_db.add(item)
        tenant_db.flush()
        self._replace_characteristics(tenant_db, item.id, payload.characteristics)
        tenant_db.commit()
        tenant_db.refresh(item)
        return item

    def update_product(self, tenant_db, product_id: int, payload) -> CRMProduct:
        item = self.get_product(tenant_db, product_id)
        normalized_type = self._validate_type(payload.product_type)
        normalized_name = self._normalize_required_name(payload.name)
        if self._has_duplicate_name(tenant_db, normalized_name, exclude_id=item.id):
            raise ValueError("Ya existe un producto/servicio con ese nombre")
        normalized_sku = self._normalize_optional(payload.sku)
        if normalized_sku and self._has_duplicate_sku(tenant_db, normalized_sku, exclude_id=item.id):
            raise ValueError("Ya existe un producto/servicio con ese SKU")

        item.sku = normalized_sku
        item.name = normalized_name
        item.product_type = normalized_type
        item.unit_label = self._normalize_optional(payload.unit_label)
        item.unit_price = max(float(payload.unit_price or 0), 0)
        item.description = self._normalize_optional(payload.description)
        item.is_active = bool(payload.is_active)
        item.sort_order = int(payload.sort_order)
        tenant_db.add(item)
        tenant_db.flush()
        self._replace_characteristics(tenant_db, item.id, payload.characteristics)
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
        tenant_db.query(CRMProductCharacteristic).filter(
            CRMProductCharacteristic.product_id == item.id
        ).delete()
        tenant_db.delete(item)
        tenant_db.commit()
        return item

    def get_characteristics_map(
        self,
        tenant_db,
        product_ids: list[int],
    ) -> dict[int, list[CRMProductCharacteristic]]:
        normalized_ids = [item for item in product_ids if item]
        if not normalized_ids:
            return {}
        rows = (
            tenant_db.query(CRMProductCharacteristic)
            .filter(CRMProductCharacteristic.product_id.in_(normalized_ids))
            .order_by(
                CRMProductCharacteristic.product_id.asc(),
                CRMProductCharacteristic.sort_order.asc(),
                CRMProductCharacteristic.id.asc(),
            )
            .all()
        )
        grouped: dict[int, list[CRMProductCharacteristic]] = {}
        for row in rows:
            grouped.setdefault(row.product_id, []).append(row)
        return grouped

    def _replace_characteristics(self, tenant_db, product_id: int, characteristics_payload: list) -> None:
        tenant_db.query(CRMProductCharacteristic).filter(
            CRMProductCharacteristic.product_id == product_id
        ).delete()
        for index, item in enumerate(characteristics_payload or []):
            label = self._normalize_optional(getattr(item, "label", None))
            value = self._normalize_optional(getattr(item, "value", None))
            if not label or not value:
                continue
            tenant_db.add(
                CRMProductCharacteristic(
                    product_id=product_id,
                    label=label,
                    value=value,
                    sort_order=int(
                        getattr(item, "sort_order", None)
                        if getattr(item, "sort_order", None) is not None
                        else (index + 1) * 10
                    ),
                )
            )
        tenant_db.flush()

    def _validate_type(self, product_type: str | None) -> str:
        normalized_type = (product_type or "service").strip().lower()
        if normalized_type not in self.VALID_PRODUCT_TYPES:
            raise ValueError("Tipo de producto invalido")
        return normalized_type

    def _has_duplicate_name(self, tenant_db, name: str, *, exclude_id: int | None = None) -> bool:
        normalized = " ".join((name or "").strip().lower().split())
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
    def _normalize_required_name(value: str | None) -> str:
        text = " ".join((value or "").strip().split())
        if not text:
            raise ValueError("El nombre es obligatorio")
        return text

    @staticmethod
    def _normalize_optional(value: str | None) -> str | None:
        text = (value or "").strip()
        return text or None
