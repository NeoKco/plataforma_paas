from sqlalchemy import func
from sqlalchemy.orm import Session

from app.apps.tenant_modules.business_core.models import BusinessWorkGroupMember


class BusinessWorkGroupMemberRepository:
    def list_by_group(
        self,
        tenant_db: Session,
        group_id: int,
    ) -> list[BusinessWorkGroupMember]:
        return (
            tenant_db.query(BusinessWorkGroupMember)
            .filter(BusinessWorkGroupMember.group_id == group_id)
            .order_by(
                BusinessWorkGroupMember.is_primary.desc(),
                BusinessWorkGroupMember.is_lead.desc(),
                BusinessWorkGroupMember.id.asc(),
            )
            .all()
        )

    def get_by_id(
        self,
        tenant_db: Session,
        member_id: int,
    ) -> BusinessWorkGroupMember | None:
        return (
            tenant_db.query(BusinessWorkGroupMember)
            .filter(BusinessWorkGroupMember.id == member_id)
            .first()
        )

    def get_by_group_and_user(
        self,
        tenant_db: Session,
        group_id: int,
        tenant_user_id: int,
    ) -> BusinessWorkGroupMember | None:
        return (
            tenant_db.query(BusinessWorkGroupMember)
            .filter(
                BusinessWorkGroupMember.group_id == group_id,
                BusinessWorkGroupMember.tenant_user_id == tenant_user_id,
            )
            .first()
        )

    def clear_primary_for_user(
        self,
        tenant_db: Session,
        tenant_user_id: int,
        *,
        exclude_member_id: int | None = None,
    ) -> None:
        query = tenant_db.query(BusinessWorkGroupMember).filter(
            BusinessWorkGroupMember.tenant_user_id == tenant_user_id,
            BusinessWorkGroupMember.is_primary.is_(True),
        )
        if exclude_member_id is not None:
            query = query.filter(BusinessWorkGroupMember.id != exclude_member_id)
        for item in query.all():
            item.is_primary = False
            tenant_db.add(item)

    def count_by_group_ids(
        self,
        tenant_db: Session,
        group_ids: list[int],
    ) -> dict[int, int]:
        if not group_ids:
            return {}
        rows = (
            tenant_db.query(
                BusinessWorkGroupMember.group_id,
                func.count(BusinessWorkGroupMember.id),
            )
            .filter(BusinessWorkGroupMember.group_id.in_(group_ids))
            .group_by(BusinessWorkGroupMember.group_id)
            .all()
        )
        return {group_id: total for group_id, total in rows}

    def save(
        self,
        tenant_db: Session,
        item: BusinessWorkGroupMember,
    ) -> BusinessWorkGroupMember:
        tenant_db.add(item)
        tenant_db.commit()
        tenant_db.refresh(item)
        return item

    def delete(
        self,
        tenant_db: Session,
        item: BusinessWorkGroupMember,
    ) -> None:
        tenant_db.delete(item)
        tenant_db.commit()
