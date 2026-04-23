from app.apps.tenant_modules.business_core.models import BusinessClient, BusinessOrganization
from app.apps.tenant_modules.crm.models import (
    CRMOpportunity,
    CRMProduct,
    CRMQuote,
    CRMQuoteLine,
    CRMQuoteSection,
    CRMQuoteTemplate,
)


class CRMQuoteService:
    VALID_STATUSES = {"draft", "sent", "approved", "rejected", "expired"}

    def list_quotes(
        self,
        tenant_db,
        *,
        include_inactive: bool = True,
        quote_status: str | None = None,
        client_id: int | None = None,
        q: str | None = None,
    ) -> list[CRMQuote]:
        query = tenant_db.query(CRMQuote)
        if not include_inactive:
            query = query.filter(CRMQuote.is_active.is_(True))
        if quote_status:
            query = query.filter(CRMQuote.quote_status == quote_status.strip().lower())
        if client_id:
            query = query.filter(CRMQuote.client_id == client_id)
        if q and q.strip():
            token = f"%{q.strip().lower()}%"
            query = query.filter(
                (CRMQuote.title.ilike(token))
                | (CRMQuote.quote_number.ilike(token))
            )
        return (
            query.order_by(
                CRMQuote.is_active.desc(),
                CRMQuote.sort_order.asc(),
                CRMQuote.created_at.desc(),
            ).all()
        )

    def get_quote(self, tenant_db, quote_id: int) -> CRMQuote:
        item = tenant_db.get(CRMQuote, quote_id)
        if item is None:
            raise ValueError("Cotizacion no encontrada")
        return item

    def create_quote(self, tenant_db, payload) -> CRMQuote:
        item = CRMQuote(
            client_id=self._validate_client(tenant_db, payload.client_id),
            opportunity_id=self._validate_opportunity(tenant_db, payload.opportunity_id),
            template_id=self._validate_template(tenant_db, payload.template_id),
            quote_number=self._normalize_quote_number(tenant_db, payload.quote_number),
            title=self._normalize_required(payload.title, field_name="titulo"),
            quote_status=self._validate_status(payload.quote_status),
            valid_until=payload.valid_until,
            discount_amount=max(float(payload.discount_amount or 0), 0),
            tax_amount=max(float(payload.tax_amount or 0), 0),
            summary=self._normalize_optional(payload.summary),
            notes=self._normalize_optional(payload.notes),
            is_active=bool(payload.is_active),
            sort_order=int(payload.sort_order),
        )
        tenant_db.add(item)
        tenant_db.flush()
        self._replace_lines_and_sections(tenant_db, item, payload.lines, payload.sections)
        self._recalculate_totals(item, payload.lines, payload.sections)
        tenant_db.add(item)
        tenant_db.commit()
        tenant_db.refresh(item)
        return item

    def update_quote(self, tenant_db, quote_id: int, payload) -> CRMQuote:
        item = self.get_quote(tenant_db, quote_id)
        item.client_id = self._validate_client(tenant_db, payload.client_id)
        item.opportunity_id = self._validate_opportunity(tenant_db, payload.opportunity_id)
        item.template_id = self._validate_template(tenant_db, payload.template_id)
        item.quote_number = self._normalize_quote_number(
            tenant_db,
            payload.quote_number,
            exclude_id=item.id,
        )
        item.title = self._normalize_required(payload.title, field_name="titulo")
        item.quote_status = self._validate_status(payload.quote_status)
        item.valid_until = payload.valid_until
        item.discount_amount = max(float(payload.discount_amount or 0), 0)
        item.tax_amount = max(float(payload.tax_amount or 0), 0)
        item.summary = self._normalize_optional(payload.summary)
        item.notes = self._normalize_optional(payload.notes)
        item.is_active = bool(payload.is_active)
        item.sort_order = int(payload.sort_order)
        self._replace_lines_and_sections(tenant_db, item, payload.lines, payload.sections)
        self._recalculate_totals(item, payload.lines, payload.sections)
        tenant_db.add(item)
        tenant_db.commit()
        tenant_db.refresh(item)
        return item

    def set_quote_active(self, tenant_db, quote_id: int, is_active: bool) -> CRMQuote:
        item = self.get_quote(tenant_db, quote_id)
        item.is_active = bool(is_active)
        tenant_db.add(item)
        tenant_db.commit()
        tenant_db.refresh(item)
        return item

    def delete_quote(self, tenant_db, quote_id: int) -> CRMQuote:
        item = self.get_quote(tenant_db, quote_id)
        section_ids = [
            row.id
            for row in tenant_db.query(CRMQuoteSection.id).filter(
                CRMQuoteSection.quote_id == item.id
            ).all()
        ]
        if section_ids:
            tenant_db.query(CRMQuoteLine).filter(
                CRMQuoteLine.section_id.in_(section_ids)
            ).delete(synchronize_session=False)
        tenant_db.query(CRMQuoteLine).filter(CRMQuoteLine.quote_id == item.id).delete(
            synchronize_session=False
        )
        tenant_db.query(CRMQuoteSection).filter(
            CRMQuoteSection.quote_id == item.id
        ).delete(synchronize_session=False)
        tenant_db.delete(item)
        tenant_db.commit()
        return item

    def get_client_display_map(self, tenant_db, client_ids: list[int]) -> dict[int, str]:
        normalized_ids = [item for item in client_ids if item]
        if not normalized_ids:
            return {}
        rows = (
            tenant_db.query(BusinessClient.id, BusinessOrganization.name)
            .join(BusinessOrganization, BusinessOrganization.id == BusinessClient.organization_id)
            .filter(BusinessClient.id.in_(normalized_ids))
            .all()
        )
        return {client_id: name for client_id, name in rows}

    def get_opportunity_title_map(self, tenant_db, opportunity_ids: list[int]) -> dict[int, str]:
        normalized_ids = [item for item in opportunity_ids if item]
        if not normalized_ids:
            return {}
        rows = (
            tenant_db.query(CRMOpportunity.id, CRMOpportunity.title)
            .filter(CRMOpportunity.id.in_(normalized_ids))
            .all()
        )
        return {item_id: title for item_id, title in rows}

    def get_template_name_map(self, tenant_db, template_ids: list[int]) -> dict[int, str]:
        normalized_ids = [item for item in template_ids if item]
        if not normalized_ids:
            return {}
        rows = (
            tenant_db.query(CRMQuoteTemplate.id, CRMQuoteTemplate.name)
            .filter(CRMQuoteTemplate.id.in_(normalized_ids))
            .all()
        )
        return {item_id: name for item_id, name in rows}

    def get_quote_lines(self, tenant_db, quote_ids: list[int]) -> dict[int, list[CRMQuoteLine]]:
        normalized_ids = [item for item in quote_ids if item]
        if not normalized_ids:
            return {}
        rows = (
            tenant_db.query(CRMQuoteLine)
            .filter(CRMQuoteLine.quote_id.in_(normalized_ids), CRMQuoteLine.section_id.is_(None))
            .order_by(CRMQuoteLine.quote_id.asc(), CRMQuoteLine.sort_order.asc(), CRMQuoteLine.id.asc())
            .all()
        )
        grouped: dict[int, list[CRMQuoteLine]] = {}
        for row in rows:
            grouped.setdefault(row.quote_id, []).append(row)
        return grouped

    def get_quote_sections(self, tenant_db, quote_ids: list[int]) -> dict[int, list[CRMQuoteSection]]:
        normalized_ids = [item for item in quote_ids if item]
        if not normalized_ids:
            return {}
        rows = (
            tenant_db.query(CRMQuoteSection)
            .filter(CRMQuoteSection.quote_id.in_(normalized_ids))
            .order_by(CRMQuoteSection.quote_id.asc(), CRMQuoteSection.sort_order.asc(), CRMQuoteSection.id.asc())
            .all()
        )
        grouped: dict[int, list[CRMQuoteSection]] = {}
        for row in rows:
            grouped.setdefault(row.quote_id, []).append(row)
        return grouped

    def get_section_lines(self, tenant_db, section_ids: list[int]) -> dict[int, list[CRMQuoteLine]]:
        normalized_ids = [item for item in section_ids if item]
        if not normalized_ids:
            return {}
        rows = (
            tenant_db.query(CRMQuoteLine)
            .filter(CRMQuoteLine.section_id.in_(normalized_ids))
            .order_by(CRMQuoteLine.section_id.asc(), CRMQuoteLine.sort_order.asc(), CRMQuoteLine.id.asc())
            .all()
        )
        grouped: dict[int, list[CRMQuoteLine]] = {}
        for row in rows:
            grouped.setdefault(row.section_id, []).append(row)
        return grouped

    def get_product_name_map(self, tenant_db, product_ids: list[int]) -> dict[int, str]:
        normalized_ids = [item for item in product_ids if item]
        if not normalized_ids:
            return {}
        rows = (
            tenant_db.query(CRMProduct.id, CRMProduct.name)
            .filter(CRMProduct.id.in_(normalized_ids))
            .all()
        )
        return {item_id: name for item_id, name in rows}

    def _replace_lines_and_sections(self, tenant_db, quote: CRMQuote, lines_payload: list, sections_payload: list) -> None:
        existing_sections = (
            tenant_db.query(CRMQuoteSection)
            .filter(CRMQuoteSection.quote_id == quote.id)
            .all()
        )
        existing_section_ids = [item.id for item in existing_sections]
        if existing_section_ids:
            tenant_db.query(CRMQuoteLine).filter(
                CRMQuoteLine.section_id.in_(existing_section_ids)
            ).delete(synchronize_session=False)
        tenant_db.query(CRMQuoteLine).filter(CRMQuoteLine.quote_id == quote.id).delete(
            synchronize_session=False
        )
        tenant_db.query(CRMQuoteSection).filter(CRMQuoteSection.quote_id == quote.id).delete(
            synchronize_session=False
        )
        tenant_db.flush()

        for index, line in enumerate(lines_payload or []):
            self._add_quote_line(
                tenant_db,
                quote_id=quote.id,
                section_id=None,
                line=line,
                fallback_sort_order=(index + 1) * 10,
            )
        for section_index, section in enumerate(sections_payload or []):
            row = CRMQuoteSection(
                quote_id=quote.id,
                title=self._normalize_required(getattr(section, "title", None), field_name="seccion"),
                description=self._normalize_optional(getattr(section, "description", None)),
                sort_order=int(
                    getattr(section, "sort_order", None)
                    if getattr(section, "sort_order", None) is not None
                    else (section_index + 1) * 10
                ),
            )
            tenant_db.add(row)
            tenant_db.flush()
            for line_index, line in enumerate(getattr(section, "lines", []) or []):
                self._add_quote_line(
                    tenant_db,
                    quote_id=quote.id,
                    section_id=row.id,
                    line=line,
                    fallback_sort_order=(line_index + 1) * 10,
                )
        tenant_db.flush()

    def _add_quote_line(self, tenant_db, *, quote_id: int, section_id: int | None, line, fallback_sort_order: int) -> None:
        product_id = self._validate_product(tenant_db, getattr(line, "product_id", None))
        quantity = max(float(getattr(line, "quantity", None) or 0), 0)
        unit_price = max(float(getattr(line, "unit_price", None) or 0), 0)
        tenant_db.add(
            CRMQuoteLine(
                quote_id=quote_id,
                section_id=section_id,
                product_id=product_id,
                line_type=(getattr(line, "line_type", None) or "catalog_item").strip().lower() or "catalog_item",
                name=self._normalize_required(getattr(line, "name", None), field_name="item"),
                description=self._normalize_optional(getattr(line, "description", None)),
                quantity=quantity,
                unit_price=unit_price,
                line_total=round(quantity * unit_price, 2),
                sort_order=int(
                    getattr(line, "sort_order", None)
                    if getattr(line, "sort_order", None) is not None
                    else fallback_sort_order
                ),
            )
        )

    def _recalculate_totals(self, quote: CRMQuote, lines_payload: list, sections_payload: list) -> None:
        subtotal = 0.0
        for line in lines_payload or []:
            subtotal += max(float(getattr(line, "quantity", None) or 0), 0) * max(
                float(getattr(line, "unit_price", None) or 0),
                0,
            )
        for section in sections_payload or []:
            for line in getattr(section, "lines", []) or []:
                subtotal += max(float(getattr(line, "quantity", None) or 0), 0) * max(
                    float(getattr(line, "unit_price", None) or 0),
                    0,
                )
        quote.subtotal_amount = round(subtotal, 2)
        quote.total_amount = round(
            quote.subtotal_amount - float(quote.discount_amount or 0) + float(quote.tax_amount or 0),
            2,
        )

    def _validate_client(self, tenant_db, client_id: int | None) -> int | None:
        if client_id is None:
            return None
        client = tenant_db.get(BusinessClient, client_id)
        if client is None:
            raise ValueError("Cliente no encontrado")
        return client.id

    def _validate_opportunity(self, tenant_db, opportunity_id: int | None) -> int | None:
        if opportunity_id is None:
            return None
        item = tenant_db.get(CRMOpportunity, opportunity_id)
        if item is None:
            raise ValueError("Oportunidad no encontrada")
        return item.id

    def _validate_template(self, tenant_db, template_id: int | None) -> int | None:
        if template_id is None:
            return None
        item = tenant_db.get(CRMQuoteTemplate, template_id)
        if item is None:
            raise ValueError("Plantilla comercial no encontrada")
        return item.id

    def _validate_product(self, tenant_db, product_id: int | None) -> int | None:
        if product_id is None:
            return None
        item = tenant_db.get(CRMProduct, product_id)
        if item is None:
            raise ValueError("Producto no encontrado")
        return item.id

    def _validate_status(self, quote_status: str | None) -> str:
        normalized = (quote_status or "draft").strip().lower()
        if normalized not in self.VALID_STATUSES:
            raise ValueError("Estado de cotizacion invalido")
        return normalized

    def _normalize_quote_number(self, tenant_db, quote_number: str | None, *, exclude_id: int | None = None) -> str | None:
        normalized = self._normalize_optional(quote_number)
        if normalized is None:
            return None
        items = tenant_db.query(CRMQuote).all()
        for item in items:
            if exclude_id is not None and item.id == exclude_id:
                continue
            if ((item.quote_number or "").strip().lower()) == normalized.lower():
                raise ValueError("Ya existe una cotizacion con ese numero")
        return normalized

    @staticmethod
    def _normalize_required(value: str | None, *, field_name: str) -> str:
        text = " ".join((value or "").strip().split())
        if not text:
            raise ValueError(f"El campo {field_name} es obligatorio")
        return text

    @staticmethod
    def _normalize_optional(value: str | None) -> str | None:
        text = (value or "").strip()
        return text or None
