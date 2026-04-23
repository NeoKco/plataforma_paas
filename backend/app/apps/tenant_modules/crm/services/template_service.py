from app.apps.tenant_modules.crm.models import (
    CRMProduct,
    CRMQuoteTemplate,
    CRMQuoteTemplateItem,
    CRMQuoteTemplateSection,
)


class CRMQuoteTemplateService:
    def list_templates(self, tenant_db, *, include_inactive: bool = True) -> list[CRMQuoteTemplate]:
        query = tenant_db.query(CRMQuoteTemplate)
        if not include_inactive:
            query = query.filter(CRMQuoteTemplate.is_active.is_(True))
        return (
            query.order_by(
                CRMQuoteTemplate.is_active.desc(),
                CRMQuoteTemplate.sort_order.asc(),
                CRMQuoteTemplate.name.asc(),
            ).all()
        )

    def get_template(self, tenant_db, template_id: int) -> CRMQuoteTemplate:
        item = tenant_db.get(CRMQuoteTemplate, template_id)
        if item is None:
            raise ValueError("Plantilla comercial no encontrada")
        return item

    def create_template(self, tenant_db, payload) -> CRMQuoteTemplate:
        name = self._normalize_required(payload.name)
        if self._has_duplicate_name(tenant_db, name):
            raise ValueError("Ya existe una plantilla comercial con ese nombre")
        item = CRMQuoteTemplate(
            name=name,
            summary=self._normalize_optional(payload.summary),
            notes=self._normalize_optional(payload.notes),
            is_active=bool(payload.is_active),
            sort_order=int(payload.sort_order),
        )
        tenant_db.add(item)
        tenant_db.flush()
        self._replace_sections(tenant_db, item.id, payload.sections)
        tenant_db.commit()
        tenant_db.refresh(item)
        return item

    def update_template(self, tenant_db, template_id: int, payload) -> CRMQuoteTemplate:
        item = self.get_template(tenant_db, template_id)
        name = self._normalize_required(payload.name)
        if self._has_duplicate_name(tenant_db, name, exclude_id=item.id):
            raise ValueError("Ya existe una plantilla comercial con ese nombre")
        item.name = name
        item.summary = self._normalize_optional(payload.summary)
        item.notes = self._normalize_optional(payload.notes)
        item.is_active = bool(payload.is_active)
        item.sort_order = int(payload.sort_order)
        tenant_db.add(item)
        tenant_db.flush()
        self._replace_sections(tenant_db, item.id, payload.sections)
        tenant_db.commit()
        tenant_db.refresh(item)
        return item

    def set_template_active(self, tenant_db, template_id: int, is_active: bool) -> CRMQuoteTemplate:
        item = self.get_template(tenant_db, template_id)
        item.is_active = bool(is_active)
        tenant_db.add(item)
        tenant_db.commit()
        tenant_db.refresh(item)
        return item

    def delete_template(self, tenant_db, template_id: int) -> CRMQuoteTemplate:
        item = self.get_template(tenant_db, template_id)
        section_ids = [
            row.id
            for row in tenant_db.query(CRMQuoteTemplateSection.id).filter(
                CRMQuoteTemplateSection.template_id == item.id
            ).all()
        ]
        if section_ids:
            tenant_db.query(CRMQuoteTemplateItem).filter(
                CRMQuoteTemplateItem.section_id.in_(section_ids)
            ).delete(synchronize_session=False)
        tenant_db.query(CRMQuoteTemplateSection).filter(
            CRMQuoteTemplateSection.template_id == item.id
        ).delete(synchronize_session=False)
        tenant_db.delete(item)
        tenant_db.commit()
        return item

    def get_sections_map(
        self,
        tenant_db,
        template_ids: list[int],
    ) -> dict[int, list[CRMQuoteTemplateSection]]:
        normalized_ids = [item for item in template_ids if item]
        if not normalized_ids:
            return {}
        rows = (
            tenant_db.query(CRMQuoteTemplateSection)
            .filter(CRMQuoteTemplateSection.template_id.in_(normalized_ids))
            .order_by(
                CRMQuoteTemplateSection.template_id.asc(),
                CRMQuoteTemplateSection.sort_order.asc(),
                CRMQuoteTemplateSection.id.asc(),
            )
            .all()
        )
        grouped: dict[int, list[CRMQuoteTemplateSection]] = {}
        for row in rows:
            grouped.setdefault(row.template_id, []).append(row)
        return grouped

    def get_items_map(
        self,
        tenant_db,
        section_ids: list[int],
    ) -> dict[int, list[CRMQuoteTemplateItem]]:
        normalized_ids = [item for item in section_ids if item]
        if not normalized_ids:
            return {}
        rows = (
            tenant_db.query(CRMQuoteTemplateItem)
            .filter(CRMQuoteTemplateItem.section_id.in_(normalized_ids))
            .order_by(
                CRMQuoteTemplateItem.section_id.asc(),
                CRMQuoteTemplateItem.sort_order.asc(),
                CRMQuoteTemplateItem.id.asc(),
            )
            .all()
        )
        grouped: dict[int, list[CRMQuoteTemplateItem]] = {}
        for row in rows:
            grouped.setdefault(row.section_id, []).append(row)
        return grouped

    def get_product_name_map(self, tenant_db, product_ids: list[int]) -> dict[int, str]:
        normalized_ids = [item for item in product_ids if item]
        if not normalized_ids:
            return {}
        rows = tenant_db.query(CRMProduct.id, CRMProduct.name).filter(
            CRMProduct.id.in_(normalized_ids)
        ).all()
        return {item_id: name for item_id, name in rows}

    def _replace_sections(self, tenant_db, template_id: int, sections_payload: list) -> None:
        existing_sections = (
            tenant_db.query(CRMQuoteTemplateSection)
            .filter(CRMQuoteTemplateSection.template_id == template_id)
            .all()
        )
        existing_section_ids = [item.id for item in existing_sections]
        if existing_section_ids:
            tenant_db.query(CRMQuoteTemplateItem).filter(
                CRMQuoteTemplateItem.section_id.in_(existing_section_ids)
            ).delete(synchronize_session=False)
        tenant_db.query(CRMQuoteTemplateSection).filter(
            CRMQuoteTemplateSection.template_id == template_id
        ).delete(synchronize_session=False)
        tenant_db.flush()

        for section_index, section in enumerate(sections_payload or []):
            title = self._normalize_required(getattr(section, "title", None))
            row = CRMQuoteTemplateSection(
                template_id=template_id,
                title=title,
                description=self._normalize_optional(getattr(section, "description", None)),
                sort_order=int(
                    getattr(section, "sort_order", None)
                    if getattr(section, "sort_order", None) is not None
                    else (section_index + 1) * 10
                ),
            )
            tenant_db.add(row)
            tenant_db.flush()
            for item_index, item in enumerate(getattr(section, "items", []) or []):
                name = self._normalize_required(getattr(item, "name", None))
                product_id = self._validate_product(tenant_db, getattr(item, "product_id", None))
                tenant_db.add(
                    CRMQuoteTemplateItem(
                        section_id=row.id,
                        product_id=product_id,
                        line_type=(getattr(item, "line_type", None) or "catalog_item").strip().lower(),
                        name=name,
                        description=self._normalize_optional(getattr(item, "description", None)),
                        quantity=max(float(getattr(item, "quantity", None) or 0), 0),
                        unit_price=max(float(getattr(item, "unit_price", None) or 0), 0),
                        sort_order=int(
                            getattr(item, "sort_order", None)
                            if getattr(item, "sort_order", None) is not None
                            else (item_index + 1) * 10
                        ),
                    )
                )
        tenant_db.flush()

    def _validate_product(self, tenant_db, product_id: int | None) -> int | None:
        if product_id is None:
            return None
        item = tenant_db.get(CRMProduct, product_id)
        if item is None:
            raise ValueError("Producto no encontrado")
        return item.id

    def _has_duplicate_name(self, tenant_db, name: str, *, exclude_id: int | None = None) -> bool:
        items = tenant_db.query(CRMQuoteTemplate).all()
        normalized = " ".join(name.lower().split())
        for item in items:
            if exclude_id is not None and item.id == exclude_id:
                continue
            if " ".join((item.name or "").lower().split()) == normalized:
                return True
        return False

    @staticmethod
    def _normalize_required(value: str | None) -> str:
        text = " ".join((value or "").strip().split())
        if not text:
            raise ValueError("El nombre es obligatorio")
        return text

    @staticmethod
    def _normalize_optional(value: str | None) -> str | None:
        text = (value or "").strip()
        return text or None
