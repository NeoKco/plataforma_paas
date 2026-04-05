from sqlalchemy.orm import Session
from sqlalchemy.exc import ProgrammingError

from app.apps.tenant_modules.business_core.models import BusinessSite, BusinessSiteResponsible
from app.apps.tenant_modules.business_core.repositories import BusinessSiteResponsibleRepository
from app.apps.tenant_modules.business_core.schemas import (
    BusinessSiteResponsibleCreateRequest,
    BusinessSiteResponsibleUpdateRequest,
)
from app.apps.tenant_modules.business_core.services.taxonomy_support import strip_legacy_visible_text
from app.apps.tenant_modules.core.models.user import User


class BusinessSiteResponsibleService:
    def __init__(self, repository: BusinessSiteResponsibleRepository | None = None) -> None:
        self.repository = repository or BusinessSiteResponsibleRepository()

    def list_responsibles(
        self,
        tenant_db: Session,
        *,
        site_id: int | None = None,
    ) -> list[BusinessSiteResponsible]:
        return self.repository.list_all(tenant_db, site_id=site_id)

    def create_responsible(
        self,
        tenant_db: Session,
        payload: BusinessSiteResponsibleCreateRequest,
    ) -> BusinessSiteResponsible:
        normalized = self._normalize_payload(payload)
        self._validate_payload(tenant_db, normalized)
        if normalized["is_primary"]:
            self.repository.clear_primary_for_user(tenant_db, normalized["tenant_user_id"])
        item = BusinessSiteResponsible(**normalized)
        return self.repository.save(tenant_db, item)

    def update_responsible(
        self,
        tenant_db: Session,
        responsible_id: int,
        payload: BusinessSiteResponsibleUpdateRequest,
    ) -> BusinessSiteResponsible:
        item = self._get_responsible_or_raise(tenant_db, responsible_id)
        normalized = self._normalize_payload(payload)
        self._validate_payload(tenant_db, normalized, current_item=item)
        if normalized["is_primary"]:
            self.repository.clear_primary_for_user(
                tenant_db,
                normalized["tenant_user_id"],
                exclude_responsible_id=item.id,
            )
        for field, value in normalized.items():
            setattr(item, field, value)
        return self.repository.save(tenant_db, item)

    def delete_responsible(self, tenant_db: Session, responsible_id: int) -> BusinessSiteResponsible:
        item = self._get_responsible_or_raise(tenant_db, responsible_id)
        self.repository.delete(tenant_db, item)
        return item

    def get_member_counts(self, tenant_db: Session, site_ids: list[int]) -> dict[int, int]:
        try:
            if not site_ids:
                return {}
            rows = (
                tenant_db.query(BusinessSiteResponsible.site_id, BusinessSiteResponsible.id)
                .filter(BusinessSiteResponsible.site_id.in_(site_ids))
                .all()
            )
            counts: dict[int, int] = {}
            for site_id, _ in rows:
                counts[site_id] = counts.get(site_id, 0) + 1
            return counts
        except ProgrammingError as exc:
            if "business_site_responsibles" in str(exc):
                tenant_db.rollback()
                return {}
            raise

    def _get_responsible_or_raise(self, tenant_db: Session, responsible_id: int) -> BusinessSiteResponsible:
        item = self.repository.get_by_id(tenant_db, responsible_id)
        if item is None:
            raise ValueError("El responsable de sitio solicitado no existe")
        return item

    def _normalize_payload(
        self,
        payload: BusinessSiteResponsibleCreateRequest | BusinessSiteResponsibleUpdateRequest,
    ) -> dict:
        return {
            "site_id": payload.site_id,
            "tenant_user_id": payload.tenant_user_id,
            "responsibility_kind": payload.responsibility_kind.strip().lower(),
            "is_primary": payload.is_primary,
            "is_active": payload.is_active,
            "starts_at": payload.starts_at,
            "ends_at": payload.ends_at,
            "notes": strip_legacy_visible_text(payload.notes),
        }

    def _validate_payload(
        self,
        tenant_db: Session,
        payload: dict,
        *,
        current_item: BusinessSiteResponsible | None = None,
    ) -> None:
        site_exists = tenant_db.query(BusinessSite.id).filter(BusinessSite.id == payload["site_id"]).first()
        if site_exists is None:
            raise ValueError("El sitio seleccionado no existe")

        user_exists = tenant_db.query(User.id).filter(User.id == payload["tenant_user_id"]).first()
        if user_exists is None:
            raise ValueError("El usuario tenant seleccionado no existe")

        if not payload["responsibility_kind"]:
            raise ValueError("El tipo de responsabilidad es obligatorio")

        existing = self.repository.get_by_site_and_user(
            tenant_db,
            payload["site_id"],
            payload["tenant_user_id"],
        )
        if existing and (current_item is None or existing.id != current_item.id):
            raise ValueError("Ese usuario ya está asignado como responsable en este sitio")

        if payload["ends_at"] and payload["starts_at"] and payload["ends_at"] < payload["starts_at"]:
            raise ValueError("La fecha final no puede ser anterior al inicio")
