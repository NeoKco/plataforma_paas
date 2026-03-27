from sqlalchemy.orm import Session

from app.apps.tenant_modules.finance.models import FinanceLoanInstallment


class FinanceLoanInstallmentRepository:
    def save(
        self,
        tenant_db: Session,
        installment: FinanceLoanInstallment,
    ) -> FinanceLoanInstallment:
        tenant_db.add(installment)
        tenant_db.commit()
        tenant_db.refresh(installment)
        return installment

    def get_by_id(
        self,
        tenant_db: Session,
        installment_id: int,
    ) -> FinanceLoanInstallment | None:
        return (
            tenant_db.query(FinanceLoanInstallment)
            .filter(FinanceLoanInstallment.id == installment_id)
            .first()
        )

    def replace_for_loan(
        self,
        tenant_db: Session,
        *,
        loan_id: int,
        installments: list[FinanceLoanInstallment],
    ) -> list[FinanceLoanInstallment]:
        tenant_db.query(FinanceLoanInstallment).filter(
            FinanceLoanInstallment.loan_id == loan_id
        ).delete()
        for installment in installments:
            tenant_db.add(installment)
        tenant_db.commit()
        for installment in installments:
            tenant_db.refresh(installment)
        return installments

    def list_by_ids(
        self,
        tenant_db: Session,
        installment_ids: list[int],
    ) -> list[FinanceLoanInstallment]:
        if not installment_ids:
            return []
        return (
            tenant_db.query(FinanceLoanInstallment)
            .filter(FinanceLoanInstallment.id.in_(installment_ids))
            .order_by(
                FinanceLoanInstallment.installment_number.asc(),
                FinanceLoanInstallment.id.asc(),
            )
            .all()
        )

    def list_by_loan(self, tenant_db: Session, loan_id: int) -> list[FinanceLoanInstallment]:
        return (
            tenant_db.query(FinanceLoanInstallment)
            .filter(FinanceLoanInstallment.loan_id == loan_id)
            .order_by(
                FinanceLoanInstallment.installment_number.asc(),
                FinanceLoanInstallment.id.asc(),
            )
            .all()
        )
