from sqlalchemy.orm import Session
from sqlalchemy.exc import ProgrammingError

from app.apps.tenant_modules.business_core.models import (
    BusinessFunctionProfile,
    BusinessWorkGroup,
    BusinessWorkGroupMember,
)
from app.apps.tenant_modules.business_core.repositories import (
    BusinessWorkGroupMemberRepository,
    BusinessWorkGroupRepository,
)
from app.apps.tenant_modules.business_core.schemas import (
    BusinessWorkGroupMemberCreateRequest,
    BusinessWorkGroupMemberUpdateRequest,
)
from app.apps.tenant_modules.business_core.services.taxonomy_support import strip_legacy_visible_text
from app.apps.tenant_modules.core.models.user import User


class BusinessWorkGroupMemberService:
    def __init__(
        self,
        work_group_repository: BusinessWorkGroupRepository | None = None,
        work_group_member_repository: BusinessWorkGroupMemberRepository | None = None,
    ) -> None:
        self.work_group_repository = work_group_repository or BusinessWorkGroupRepository()
        self.work_group_member_repository = (
            work_group_member_repository or BusinessWorkGroupMemberRepository()
        )

    def list_members(
        self,
        tenant_db: Session,
        group_id: int,
    ) -> list[BusinessWorkGroupMember]:
        self._get_group_or_raise(tenant_db, group_id)
        return self.work_group_member_repository.list_by_group(tenant_db, group_id)

    def create_member(
        self,
        tenant_db: Session,
        group_id: int,
        payload: BusinessWorkGroupMemberCreateRequest,
    ) -> BusinessWorkGroupMember:
        self._get_group_or_raise(tenant_db, group_id)
        normalized = self._normalize_payload(payload)
        self._validate_payload(tenant_db, group_id, normalized)
        if normalized["is_primary"]:
            self.work_group_member_repository.clear_primary_for_user(
                tenant_db,
                normalized["tenant_user_id"],
            )
        item = BusinessWorkGroupMember(group_id=group_id, **normalized)
        return self.work_group_member_repository.save(tenant_db, item)

    def update_member(
        self,
        tenant_db: Session,
        group_id: int,
        member_id: int,
        payload: BusinessWorkGroupMemberUpdateRequest,
    ) -> BusinessWorkGroupMember:
        self._get_group_or_raise(tenant_db, group_id)
        item = self._get_member_or_raise(tenant_db, group_id, member_id)
        normalized = self._normalize_payload(payload)
        self._validate_payload(tenant_db, group_id, normalized, current_item=item)
        if normalized["is_primary"]:
            self.work_group_member_repository.clear_primary_for_user(
                tenant_db,
                normalized["tenant_user_id"],
                exclude_member_id=item.id,
            )
        for field, value in normalized.items():
            setattr(item, field, value)
        return self.work_group_member_repository.save(tenant_db, item)

    def delete_member(
        self,
        tenant_db: Session,
        group_id: int,
        member_id: int,
    ) -> BusinessWorkGroupMember:
        item = self._get_member_or_raise(tenant_db, group_id, member_id)
        self.work_group_member_repository.delete(tenant_db, item)
        return item

    def get_member_counts(
        self,
        tenant_db: Session,
        group_ids: list[int],
    ) -> dict[int, int]:
        try:
            return self.work_group_member_repository.count_by_group_ids(tenant_db, group_ids)
        except ProgrammingError as exc:
            if "business_work_group_members" in str(exc):
                tenant_db.rollback()
                return {}
            raise

    def _get_group_or_raise(
        self,
        tenant_db: Session,
        group_id: int,
    ) -> BusinessWorkGroup:
        item = self.work_group_repository.get_by_id(tenant_db, group_id)
        if item is None:
            raise ValueError("El grupo de trabajo solicitado no existe")
        return item

    def _get_member_or_raise(
        self,
        tenant_db: Session,
        group_id: int,
        member_id: int,
    ) -> BusinessWorkGroupMember:
        item = self.work_group_member_repository.get_by_id(tenant_db, member_id)
        if item is None or item.group_id != group_id:
            raise ValueError("La membresía solicitada no existe")
        return item

    def _normalize_payload(
        self,
        payload: BusinessWorkGroupMemberCreateRequest | BusinessWorkGroupMemberUpdateRequest,
    ) -> dict:
        return {
            "tenant_user_id": payload.tenant_user_id,
            "function_profile_id": payload.function_profile_id,
            "is_primary": payload.is_primary,
            "is_lead": payload.is_lead,
            "is_active": payload.is_active,
            "starts_at": payload.starts_at,
            "ends_at": payload.ends_at,
            "notes": strip_legacy_visible_text(payload.notes),
        }

    def _validate_payload(
        self,
        tenant_db: Session,
        group_id: int,
        payload: dict,
        *,
        current_item: BusinessWorkGroupMember | None = None,
    ) -> None:
        user_exists = (
            tenant_db.query(User.id)
            .filter(User.id == payload["tenant_user_id"])
            .first()
        )
        if user_exists is None:
            raise ValueError("El usuario tenant seleccionado no existe")

        if payload["function_profile_id"] is not None:
            profile_exists = (
                tenant_db.query(BusinessFunctionProfile.id)
                .filter(BusinessFunctionProfile.id == payload["function_profile_id"])
                .first()
            )
            if profile_exists is None:
                raise ValueError("El perfil funcional seleccionado no existe")

        existing = self.work_group_member_repository.get_by_group_and_user(
            tenant_db,
            group_id,
            payload["tenant_user_id"],
        )
        if existing and (current_item is None or existing.id != current_item.id):
            raise ValueError("Ese usuario ya pertenece al grupo seleccionado")

        if payload["ends_at"] and payload["starts_at"] and payload["ends_at"] < payload["starts_at"]:
            raise ValueError("La fecha final no puede ser anterior al inicio")
