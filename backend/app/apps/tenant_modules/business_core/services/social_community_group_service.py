from sqlalchemy.orm import Session

from app.apps.tenant_modules.business_core.models import (
    BusinessClient,
    SocialCommunityGroup,
)
from app.apps.tenant_modules.business_core.repositories import (
    SocialCommunityGroupRepository,
)
from app.apps.tenant_modules.business_core.schemas import (
    SocialCommunityGroupCreateRequest,
    SocialCommunityGroupUpdateRequest,
)
from app.apps.tenant_modules.business_core.services.normalization_support import (
    normalize_human_key,
)
from app.apps.tenant_modules.business_core.services.taxonomy_support import (
    strip_legacy_visible_text,
)


class SocialCommunityGroupService:
    def __init__(
        self,
        repository: SocialCommunityGroupRepository | None = None,
    ) -> None:
        self.repository = repository or SocialCommunityGroupRepository()

    def list_groups(
        self,
        tenant_db: Session,
        *,
        include_inactive: bool = True,
    ) -> list[SocialCommunityGroup]:
        return self.repository.list_all(tenant_db, include_inactive=include_inactive)

    def create_group(
        self,
        tenant_db: Session,
        payload: SocialCommunityGroupCreateRequest,
    ) -> SocialCommunityGroup:
        normalized = self._normalize_payload(payload)
        self._validate_payload(tenant_db, normalized)
        group = SocialCommunityGroup(**normalized)
        return self.repository.save(tenant_db, group)

    def get_group(
        self,
        tenant_db: Session,
        group_id: int,
    ) -> SocialCommunityGroup:
        return self._get_group_or_raise(tenant_db, group_id)

    def update_group(
        self,
        tenant_db: Session,
        group_id: int,
        payload: SocialCommunityGroupUpdateRequest,
    ) -> SocialCommunityGroup:
        group = self._get_group_or_raise(tenant_db, group_id)
        normalized = self._normalize_payload(payload)
        self._validate_payload(tenant_db, normalized, current_group=group)
        for field, value in normalized.items():
            setattr(group, field, value)
        return self.repository.save(tenant_db, group)

    def set_group_active(
        self,
        tenant_db: Session,
        group_id: int,
        is_active: bool,
    ) -> SocialCommunityGroup:
        group = self._get_group_or_raise(tenant_db, group_id)
        return self.repository.set_active(tenant_db, group, is_active)

    def delete_group(
        self,
        tenant_db: Session,
        group_id: int,
    ) -> SocialCommunityGroup:
        group = self._get_group_or_raise(tenant_db, group_id)
        client_exists = (
            tenant_db.query(BusinessClient.id)
            .filter(BusinessClient.social_community_group_id == group.id)
            .first()
        )
        if client_exists is not None:
            raise ValueError(
                "No puedes eliminar el grupo social porque ya esta asociado a clientes"
            )
        self.repository.delete(tenant_db, group)
        return group

    def get_by_name(
        self,
        tenant_db: Session,
        name: str,
    ) -> SocialCommunityGroup | None:
        return self.repository.get_by_name(tenant_db, name)

    def _get_group_or_raise(
        self,
        tenant_db: Session,
        group_id: int,
    ) -> SocialCommunityGroup:
        group = self.repository.get_by_id(tenant_db, group_id)
        if group is None:
            raise ValueError("El grupo social solicitado no existe")
        return group

    def _normalize_payload(
        self,
        payload: SocialCommunityGroupCreateRequest | SocialCommunityGroupUpdateRequest,
    ) -> dict:
        return {
            "name": payload.name.strip(),
            "commune": payload.commune.strip() if payload.commune and payload.commune.strip() else None,
            "sector": payload.sector.strip() if payload.sector and payload.sector.strip() else None,
            "zone": payload.zone.strip() if payload.zone and payload.zone.strip() else None,
            "territorial_classification": (
                payload.territorial_classification.strip()
                if payload.territorial_classification and payload.territorial_classification.strip()
                else None
            ),
            "notes": strip_legacy_visible_text(payload.notes),
            "is_active": payload.is_active,
            "sort_order": payload.sort_order,
        }

    def _validate_payload(
        self,
        tenant_db: Session,
        payload: dict,
        *,
        current_group: SocialCommunityGroup | None = None,
    ) -> None:
        if not payload["name"]:
            raise ValueError("El nombre del grupo social es obligatorio")

        normalized_name = normalize_human_key(payload["name"])
        current_normalized_name = (
            normalize_human_key(current_group.name)
            if current_group is not None
            else None
        )
        if current_group is None or normalized_name != current_normalized_name:
            groups = self.repository.list_all(tenant_db, include_inactive=True)
            for group in groups:
                if current_group is not None and group.id == current_group.id:
                    continue
                if normalize_human_key(group.name) == normalized_name:
                    raise ValueError("Ya existe un grupo social con ese nombre")
