from sqlalchemy.orm import Session

from app.apps.tenant_modules.finance.models import FinanceLoanInstallment


class FinanceLoanInstallmentRepository:
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
