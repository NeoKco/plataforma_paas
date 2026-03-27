from sqlalchemy.orm import Session

from app.apps.tenant_modules.finance.models import FinanceLoan


class FinanceLoanRepository:
    def save(self, tenant_db: Session, loan: FinanceLoan) -> FinanceLoan:
        tenant_db.add(loan)
        tenant_db.commit()
        tenant_db.refresh(loan)
        return loan

    def list_all(
        self,
        tenant_db: Session,
        *,
        include_inactive: bool = True,
        loan_type: str | None = None,
    ) -> list[FinanceLoan]:
        query = tenant_db.query(FinanceLoan)
        if not include_inactive:
            query = query.filter(FinanceLoan.is_active.is_(True))
        if loan_type:
            query = query.filter(FinanceLoan.loan_type == loan_type)
        return query.order_by(FinanceLoan.start_date.desc(), FinanceLoan.id.desc()).all()

    def get_by_id(self, tenant_db: Session, loan_id: int) -> FinanceLoan | None:
        return tenant_db.query(FinanceLoan).filter(FinanceLoan.id == loan_id).first()
