from sqlalchemy.orm import Session

from app.apps.tenant_modules.business_core.models import BusinessTaskType
from app.apps.tenant_modules.maintenance.models import (
    MaintenanceCostTemplate,
    MaintenanceCostTemplateLine,
)
from app.apps.tenant_modules.maintenance.schemas import (
    MaintenanceCostTemplateCreateRequest,
    MaintenanceCostTemplateUpdateRequest,
)

VALID_TEMPLATE_LINE_TYPES = {"labor", "travel", "material", "service", "overhead"}


class MaintenanceCostTemplateService:
    def list_templates(
        self,
        tenant_db: Session,
        *,
        task_type_id: int | None = None,
        include_inactive: bool = True,
    ) -> list[MaintenanceCostTemplate]:
        query = tenant_db.query(MaintenanceCostTemplate)
        if task_type_id is not None:
            query = query.filter(
                (MaintenanceCostTemplate.task_type_id == task_type_id)
                | (MaintenanceCostTemplate.task_type_id.is_(None))
            )
        if not include_inactive:
            query = query.filter(MaintenanceCostTemplate.is_active.is_(True))
        items = (
            query.order_by(
                MaintenanceCostTemplate.name.asc(),
                MaintenanceCostTemplate.id.asc(),
            )
            .all()
        )
        return [self._attach_lines(tenant_db, item) for item in items]

    def get_template(self, tenant_db: Session, template_id: int) -> MaintenanceCostTemplate:
        item = (
            tenant_db.query(MaintenanceCostTemplate)
            .filter(MaintenanceCostTemplate.id == template_id)
            .first()
        )
        if item is None:
            raise ValueError("La plantilla de costeo solicitada no existe")
        return self._attach_lines(tenant_db, item)

    def create_template(
        self,
        tenant_db: Session,
        payload: MaintenanceCostTemplateCreateRequest,
        *,
        created_by_user_id: int | None = None,
    ) -> MaintenanceCostTemplate:
        normalized = self._normalize_payload(payload)
        self._validate_payload(tenant_db, normalized, payload.lines)
        item = MaintenanceCostTemplate(**normalized, created_by_user_id=created_by_user_id)
        tenant_db.add(item)
        tenant_db.flush()
        lines = self._sync_lines(
            tenant_db,
            item.id,
            payload.lines,
            actor_user_id=created_by_user_id,
        )
        tenant_db.commit()
        tenant_db.refresh(item)
        item.lines = lines
        return item

    def update_template(
        self,
        tenant_db: Session,
        template_id: int,
        payload: MaintenanceCostTemplateUpdateRequest,
        *,
        actor_user_id: int | None = None,
    ) -> MaintenanceCostTemplate:
        item = self.get_template(tenant_db, template_id)
        normalized = self._normalize_payload(payload)
        self._validate_payload(tenant_db, normalized, payload.lines)
        for field, value in normalized.items():
            setattr(item, field, value)
        item.updated_by_user_id = actor_user_id
        tenant_db.add(item)
        lines = self._sync_lines(
            tenant_db,
            item.id,
            payload.lines,
            actor_user_id=actor_user_id,
        )
        tenant_db.commit()
        tenant_db.refresh(item)
        item.lines = lines
        return item

    def set_template_active(
        self,
        tenant_db: Session,
        template_id: int,
        *,
        is_active: bool,
        actor_user_id: int | None = None,
    ) -> MaintenanceCostTemplate:
        item = self.get_template(tenant_db, template_id)
        item.is_active = is_active
        item.updated_by_user_id = actor_user_id
        tenant_db.commit()
        tenant_db.refresh(item)
        return self._attach_lines(tenant_db, item)

    def _normalize_payload(
        self,
        payload: MaintenanceCostTemplateCreateRequest | MaintenanceCostTemplateUpdateRequest,
    ) -> dict:
        return {
            "name": payload.name.strip(),
            "description": payload.description.strip() if payload.description and payload.description.strip() else None,
            "task_type_id": payload.task_type_id,
            "estimate_target_margin_percent": max(payload.estimate_target_margin_percent, 0),
            "estimate_notes": payload.estimate_notes.strip() if payload.estimate_notes and payload.estimate_notes.strip() else None,
            "is_active": payload.is_active,
        }

    def _validate_payload(self, tenant_db: Session, payload: dict, payload_lines) -> None:
        if not payload["name"]:
            raise ValueError("El nombre de la plantilla es obligatorio")
        if payload["estimate_target_margin_percent"] < 0:
            raise ValueError("El margen objetivo no puede ser negativo")
        if not payload_lines:
            raise ValueError("La plantilla debe incluir al menos una línea de costeo")
        if payload["task_type_id"] is not None:
            task_type_exists = (
                tenant_db.query(BusinessTaskType.id)
                .filter(BusinessTaskType.id == payload["task_type_id"])
                .first()
            )
            if task_type_exists is None:
                raise ValueError("El tipo de mantención seleccionado no existe")

    def _sync_lines(
        self,
        tenant_db: Session,
        template_id: int,
        payload_lines,
        *,
        actor_user_id: int | None = None,
    ) -> list[MaintenanceCostTemplateLine]:
        existing = (
            tenant_db.query(MaintenanceCostTemplateLine)
            .filter(MaintenanceCostTemplateLine.template_id == template_id)
            .all()
        )
        existing_by_id = {item.id: item for item in existing}
        keep_ids: set[int] = set()

        for index, raw_line in enumerate(payload_lines or []):
            line_type = raw_line.line_type.strip().lower()
            if line_type not in VALID_TEMPLATE_LINE_TYPES:
                raise ValueError("El tipo de línea de la plantilla no es válido")
            quantity = max(raw_line.quantity, 0)
            unit_cost = max(raw_line.unit_cost, 0)
            description = raw_line.description.strip() if raw_line.description and raw_line.description.strip() else None
            notes = raw_line.notes.strip() if raw_line.notes and raw_line.notes.strip() else None
            total_cost = round(quantity * unit_cost, 2)

            current = existing_by_id.get(raw_line.id) if raw_line.id is not None else None
            if current is None:
                current = MaintenanceCostTemplateLine(
                    template_id=template_id,
                    created_by_user_id=actor_user_id,
                )
                tenant_db.add(current)

            current.line_type = line_type
            current.description = description
            current.quantity = quantity
            current.unit_cost = unit_cost
            current.total_cost = total_cost
            current.sort_order = index
            current.notes = notes
            current.updated_by_user_id = actor_user_id
            if getattr(current, "id", None) is not None:
                keep_ids.add(current.id)

        for current in existing:
            current_id = getattr(current, "id", None)
            if current_id is not None and current_id not in keep_ids:
                tenant_db.delete(current)

        tenant_db.flush()
        return (
            tenant_db.query(MaintenanceCostTemplateLine)
            .filter(MaintenanceCostTemplateLine.template_id == template_id)
            .order_by(MaintenanceCostTemplateLine.sort_order.asc(), MaintenanceCostTemplateLine.id.asc())
            .all()
        )

    def _attach_lines(
        self,
        tenant_db: Session,
        item: MaintenanceCostTemplate,
    ) -> MaintenanceCostTemplate:
        item.lines = (
            tenant_db.query(MaintenanceCostTemplateLine)
            .filter(MaintenanceCostTemplateLine.template_id == item.id)
            .order_by(MaintenanceCostTemplateLine.sort_order.asc(), MaintenanceCostTemplateLine.id.asc())
            .all()
        )
        return item
