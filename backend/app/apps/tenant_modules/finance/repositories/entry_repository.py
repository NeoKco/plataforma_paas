from datetime import datetime

from sqlalchemy.orm import Session

from app.apps.tenant_modules.finance.models.entry import FinanceEntry


class FinanceEntryRepository:
    def save(self, tenant_db: Session, entry: FinanceEntry) -> FinanceEntry:
        tenant_db.add(entry)
        tenant_db.commit()
        tenant_db.refresh(entry)
        return entry

    def list_all(self, tenant_db: Session) -> list[FinanceEntry]:
        return tenant_db.query(FinanceEntry).order_by(FinanceEntry.id.desc()).all()

    def count_all(self, tenant_db: Session) -> int:
        return tenant_db.query(FinanceEntry).count()

    def count_created_since(
        self,
        tenant_db: Session,
        created_since: datetime,
    ) -> int:
        return (
            tenant_db.query(FinanceEntry)
            .filter(FinanceEntry.created_at >= created_since)
            .count()
        )

    def count_created_since_by_type(
        self,
        tenant_db: Session,
        created_since: datetime,
        movement_type: str,
    ) -> int:
        return (
            tenant_db.query(FinanceEntry)
            .filter(FinanceEntry.created_at >= created_since)
            .filter(FinanceEntry.movement_type == movement_type.strip().lower())
            .count()
        )
