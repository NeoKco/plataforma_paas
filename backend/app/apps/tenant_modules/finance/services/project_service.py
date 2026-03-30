from sqlalchemy.orm import Session

from app.apps.tenant_modules.finance.models import FinanceProject, FinanceTransaction
from app.apps.tenant_modules.finance.repositories import FinanceProjectRepository
from app.apps.tenant_modules.finance.schemas import (
    FinanceProjectCreateRequest,
    FinanceProjectUpdateRequest,
)


class FinanceProjectService:
    def __init__(
        self,
        project_repository: FinanceProjectRepository | None = None,
    ) -> None:
        self.project_repository = project_repository or FinanceProjectRepository()

    def list_projects(
        self,
        tenant_db: Session,
        *,
        include_inactive: bool = True,
    ) -> list[FinanceProject]:
        return self.project_repository.list_all(
            tenant_db,
            include_inactive=include_inactive,
        )

    def create_project(
        self,
        tenant_db: Session,
        payload: FinanceProjectCreateRequest,
    ) -> FinanceProject:
        normalized = self._normalize_payload(payload)
        self._validate_payload(tenant_db, normalized)
        project = FinanceProject(**normalized)
        return self.project_repository.save(tenant_db, project)

    def get_project(self, tenant_db: Session, project_id: int) -> FinanceProject:
        return self._get_or_raise(tenant_db, project_id)

    def update_project(
        self,
        tenant_db: Session,
        project_id: int,
        payload: FinanceProjectUpdateRequest,
    ) -> FinanceProject:
        project = self._get_or_raise(tenant_db, project_id)
        normalized = self._normalize_payload(payload)
        self._validate_payload(tenant_db, normalized, current_item=project)
        for field, value in normalized.items():
            setattr(project, field, value)
        return self.project_repository.save(tenant_db, project)

    def set_project_active(
        self,
        tenant_db: Session,
        project_id: int,
        is_active: bool,
    ) -> FinanceProject:
        project = self._get_or_raise(tenant_db, project_id)
        return self.project_repository.set_active(tenant_db, project, is_active)

    def reorder_projects(
        self,
        tenant_db: Session,
        items: list[tuple[int, int]],
    ) -> list[FinanceProject]:
        return self.project_repository.reorder(tenant_db, items)

    def delete_project(self, tenant_db: Session, project_id: int) -> FinanceProject:
        project = self._get_or_raise(tenant_db, project_id)
        usage_exists = (
            tenant_db.query(FinanceTransaction.id)
            .filter(FinanceTransaction.project_id == project.id)
            .first()
        )
        if usage_exists is not None:
            raise ValueError(
                "No puedes eliminar el proyecto porque ya esta asociado a transacciones"
            )
        self.project_repository.delete(tenant_db, project)
        return project

    def _get_or_raise(self, tenant_db: Session, project_id: int) -> FinanceProject:
        project = self.project_repository.get_by_id(tenant_db, project_id)
        if project is None:
            raise ValueError("El proyecto solicitado no existe")
        return project

    def _normalize_payload(
        self,
        payload: FinanceProjectCreateRequest | FinanceProjectUpdateRequest,
    ) -> dict:
        code = payload.code.strip().upper() if payload.code and payload.code.strip() else None
        return {
            "name": payload.name.strip(),
            "code": code,
            "note": payload.note.strip() if payload.note and payload.note.strip() else None,
            "is_active": payload.is_active,
            "sort_order": payload.sort_order,
        }

    def _validate_payload(
        self,
        tenant_db: Session,
        payload: dict,
        *,
        current_item: FinanceProject | None = None,
    ) -> None:
        if not payload["name"]:
            raise ValueError("El nombre del proyecto es obligatorio")
        existing = self.project_repository.get_by_name(tenant_db, payload["name"])
        if existing and (current_item is None or existing.id != current_item.id):
            raise ValueError("Ya existe un proyecto con ese nombre")

        code = payload["code"]
        if code:
            existing_code = self.project_repository.get_by_code(tenant_db, code)
            if existing_code and (current_item is None or existing_code.id != current_item.id):
                raise ValueError("Ya existe un proyecto con ese codigo")
