from calendar import monthrange
from datetime import date, datetime, time, timezone

from sqlalchemy.orm import Session

from app.apps.tenant_modules.finance.models import FinanceLoan, FinanceLoanInstallment
from app.apps.tenant_modules.finance.repositories import (
    FinanceAccountRepository,
    FinanceCurrencyRepository,
    FinanceLoanInstallmentRepository,
    FinanceLoanRepository,
    FinanceTransactionRepository,
)
from app.apps.tenant_modules.finance.schemas import (
    FinanceLoanCreateRequest,
    FinanceTransactionCreateRequest,
    FinanceLoanUpdateRequest,
)
from app.apps.tenant_modules.finance.services.transaction_service import FinanceService


class FinanceLoanService:
    VALID_REVERSAL_REASON_CODES = {
        "operator_error",
        "duplicate_payment",
        "payment_bounce",
        "customer_request",
        "migration_adjustment",
        "other",
    }

    def __init__(
        self,
        loan_repository: FinanceLoanRepository | None = None,
        currency_repository: FinanceCurrencyRepository | None = None,
        account_repository: FinanceAccountRepository | None = None,
        installment_repository: FinanceLoanInstallmentRepository | None = None,
        transaction_repository: FinanceTransactionRepository | None = None,
        finance_service: FinanceService | None = None,
    ) -> None:
        self.loan_repository = loan_repository or FinanceLoanRepository()
        self.currency_repository = currency_repository or FinanceCurrencyRepository()
        self.account_repository = account_repository or FinanceAccountRepository()
        self.installment_repository = (
            installment_repository or FinanceLoanInstallmentRepository()
        )
        self.transaction_repository = (
            transaction_repository or FinanceTransactionRepository()
        )
        self.finance_service = finance_service or FinanceService()

    def list_loans(
        self,
        tenant_db: Session,
        *,
        include_inactive: bool = True,
        loan_type: str | None = None,
        loan_status: str | None = None,
    ) -> tuple[list[dict], dict]:
        loans = self.loan_repository.list_all(
            tenant_db,
            include_inactive=include_inactive,
            loan_type=loan_type,
        )
        rows = [
            self._build_loan_row(
                tenant_db,
                loan,
                installments=self.installment_repository.list_by_loan(tenant_db, loan.id),
            )
            for loan in loans
        ]

        if loan_status:
            rows = [row for row in rows if row["loan_status"] == loan_status]

        summary = {
            "total_items": len(rows),
            "active_items": len(
                [
                    row for row in rows
                    if row["loan"].is_active and row["loan_status"] != "settled"
                ]
            ),
            "borrowed_balance": sum(
                row["loan"].current_balance
                for row in rows
                if row["loan"].loan_type == "borrowed"
            ),
            "lent_balance": sum(
                row["loan"].current_balance
                for row in rows
                if row["loan"].loan_type == "lent"
            ),
            "total_principal": sum(row["loan"].principal_amount for row in rows),
        }
        return rows, summary

    def get_loan_detail(
        self,
        tenant_db: Session,
        loan_id: int,
    ) -> tuple[dict, list[dict], list[dict], dict]:
        loan = self._get_loan_or_raise(tenant_db, loan_id)
        installments = self.installment_repository.list_by_loan(tenant_db, loan.id)
        loan_row = self._build_loan_row(tenant_db, loan, installments=installments)
        installment_rows = [
            self._build_installment_row(installment)
            for installment in installments
        ]
        transaction_rows = self._build_transaction_rows_for_loan(tenant_db, loan.id)
        transaction_summary = self._build_transaction_summary(transaction_rows)
        return loan_row, installment_rows, transaction_rows, transaction_summary

    def create_loan(
        self,
        tenant_db: Session,
        payload: FinanceLoanCreateRequest,
    ) -> FinanceLoan:
        normalized = self._normalize_payload(payload)
        self._validate_payload(tenant_db, normalized)
        loan = self.loan_repository.save(tenant_db, FinanceLoan(**normalized))
        self._sync_installments(tenant_db, loan)
        tenant_db.refresh(loan)
        return loan

    def update_loan(
        self,
        tenant_db: Session,
        loan_id: int,
        payload: FinanceLoanUpdateRequest,
    ) -> FinanceLoan:
        loan = self._get_loan_or_raise(tenant_db, loan_id)
        normalized = self._normalize_payload(payload)
        self._validate_payload(tenant_db, normalized)
        for field, value in normalized.items():
            setattr(loan, field, value)
        loan = self.loan_repository.save(tenant_db, loan)
        self._sync_installments(tenant_db, loan)
        tenant_db.refresh(loan)
        return loan

    def apply_installment_payment(
        self,
        tenant_db: Session,
        *,
        loan_id: int,
        installment_id: int,
        paid_amount: float,
        account_id: int | None = None,
        paid_at: date | None = None,
        allocation_mode: str = "interest_first",
        note: str | None = None,
        actor_user_id: int | None = None,
    ) -> tuple[dict, dict]:
        if paid_amount <= 0:
            raise ValueError("El pago aplicado a la cuota debe ser mayor que cero")
        if allocation_mode not in {"interest_first", "principal_first", "proportional"}:
            raise ValueError("El modo de amortizacion del pago no es valido")

        loan = self._get_loan_or_raise(tenant_db, loan_id)
        installment = self.installment_repository.get_by_id(tenant_db, installment_id)
        if installment is None or installment.loan_id != loan.id:
            raise ValueError("La cuota del préstamo solicitada no existe")
        resolved_account = self._resolve_account_for_operation(
            tenant_db,
            loan=loan,
            account_id=account_id,
        )
        self._apply_payment_to_installment(
            loan=loan,
            installment=installment,
            paid_amount=paid_amount,
            paid_at=paid_at,
            allocation_mode=allocation_mode,
            note=note,
        )
        self._stage_installment_accounting_transaction(
            tenant_db,
            loan=loan,
            installment=installment,
            amount=paid_amount,
            account_id=resolved_account.id,
            action_type="payment",
            note=note,
            action_date=paid_at,
            actor_user_id=actor_user_id,
        )

        tenant_db.add(installment)
        tenant_db.add(loan)
        tenant_db.commit()
        tenant_db.refresh(installment)
        tenant_db.refresh(loan)

        installments = self.installment_repository.list_by_loan(tenant_db, loan.id)
        loan_row = self._build_loan_row(tenant_db, loan, installments=installments)
        installment_row = self._build_installment_row(installment)
        return loan_row, installment_row

    def reverse_installment_payment(
        self,
        tenant_db: Session,
        *,
        loan_id: int,
        installment_id: int,
        reversed_amount: float,
        account_id: int | None = None,
        reversal_reason_code: str,
        note: str | None = None,
        actor_user_id: int | None = None,
    ) -> tuple[dict, dict]:
        if reversed_amount <= 0:
            raise ValueError("La reversa aplicada a la cuota debe ser mayor que cero")
        self._validate_reversal_reason_code(reversal_reason_code)

        loan = self._get_loan_or_raise(tenant_db, loan_id)
        installment = self.installment_repository.get_by_id(tenant_db, installment_id)
        if installment is None or installment.loan_id != loan.id:
            raise ValueError("La cuota del préstamo solicitada no existe")
        resolved_account = self._resolve_account_for_operation(
            tenant_db,
            loan=loan,
            account_id=account_id,
        )
        self._reverse_payment_on_installment(
            loan=loan,
            installment=installment,
            reversed_amount=reversed_amount,
            reversal_reason_code=reversal_reason_code,
            note=note,
        )
        self._stage_installment_accounting_transaction(
            tenant_db,
            loan=loan,
            installment=installment,
            amount=reversed_amount,
            account_id=resolved_account.id,
            action_type="reversal",
            note=note,
            action_date=installment.paid_at or date.today(),
            actor_user_id=actor_user_id,
            reversal_reason_code=reversal_reason_code,
        )

        tenant_db.add(installment)
        tenant_db.add(loan)
        tenant_db.commit()
        tenant_db.refresh(installment)
        tenant_db.refresh(loan)

        installments = self.installment_repository.list_by_loan(tenant_db, loan.id)
        loan_row = self._build_loan_row(tenant_db, loan, installments=installments)
        installment_row = self._build_installment_row(installment)
        return loan_row, installment_row

    def apply_installment_payment_batch(
        self,
        tenant_db: Session,
        *,
        loan_id: int,
        installment_ids: list[int],
        amount_mode: str = "full_remaining",
        paid_amount: float | None = None,
        account_id: int | None = None,
        paid_at: date | None = None,
        allocation_mode: str = "interest_first",
        note: str | None = None,
        actor_user_id: int | None = None,
    ) -> tuple[dict, list[int]]:
        if allocation_mode not in {"interest_first", "principal_first", "proportional"}:
            raise ValueError("El modo de amortizacion del pago no es valido")
        if amount_mode not in {"full_remaining", "fixed_per_installment"}:
            raise ValueError("El modo de monto para pago en lote no es valido")
        if amount_mode == "fixed_per_installment" and (paid_amount is None or paid_amount <= 0):
            raise ValueError("El monto fijo por cuota debe ser mayor que cero")

        loan, installments = self._get_loan_and_installments_for_batch(
            tenant_db,
            loan_id=loan_id,
            installment_ids=installment_ids,
        )
        resolved_account = self._resolve_account_for_operation(
            tenant_db,
            loan=loan,
            account_id=account_id,
        )
        for installment in installments:
            amount_to_apply = (
                round(installment.planned_amount - installment.paid_amount, 2)
                if amount_mode == "full_remaining"
                else float(paid_amount)
            )
            self._apply_payment_to_installment(
                loan=loan,
                installment=installment,
                paid_amount=amount_to_apply,
                paid_at=paid_at,
                allocation_mode=allocation_mode,
                note=note,
            )
            self._stage_installment_accounting_transaction(
                tenant_db,
                loan=loan,
                installment=installment,
                amount=amount_to_apply,
                account_id=resolved_account.id,
                action_type="payment",
                note=note,
                action_date=paid_at,
                actor_user_id=actor_user_id,
            )
            tenant_db.add(installment)

        tenant_db.add(loan)
        tenant_db.commit()
        tenant_db.refresh(loan)

        installments_for_loan = self.installment_repository.list_by_loan(tenant_db, loan.id)
        loan_row = self._build_loan_row(tenant_db, loan, installments=installments_for_loan)
        return loan_row, [installment.id for installment in installments]

    def reverse_installment_payment_batch(
        self,
        tenant_db: Session,
        *,
        loan_id: int,
        installment_ids: list[int],
        amount_mode: str = "full_paid",
        reversed_amount: float | None = None,
        account_id: int | None = None,
        reversal_reason_code: str = "other",
        note: str | None = None,
        actor_user_id: int | None = None,
    ) -> tuple[dict, list[int]]:
        if amount_mode not in {"full_paid", "fixed_per_installment"}:
            raise ValueError("El modo de monto para reversa en lote no es valido")
        if amount_mode == "fixed_per_installment" and (
            reversed_amount is None or reversed_amount <= 0
        ):
            raise ValueError("El monto fijo por cuota para reversa debe ser mayor que cero")
        self._validate_reversal_reason_code(reversal_reason_code)

        loan, installments = self._get_loan_and_installments_for_batch(
            tenant_db,
            loan_id=loan_id,
            installment_ids=installment_ids,
        )
        resolved_account = self._resolve_account_for_operation(
            tenant_db,
            loan=loan,
            account_id=account_id,
        )
        for installment in installments:
            amount_to_reverse = (
                round(installment.paid_amount, 2)
                if amount_mode == "full_paid"
                else float(reversed_amount)
            )
            self._reverse_payment_on_installment(
                loan=loan,
                installment=installment,
                reversed_amount=amount_to_reverse,
                reversal_reason_code=reversal_reason_code,
                note=note,
            )
            self._stage_installment_accounting_transaction(
                tenant_db,
                loan=loan,
                installment=installment,
                amount=amount_to_reverse,
                account_id=resolved_account.id,
                action_type="reversal",
                note=note,
                action_date=installment.paid_at or date.today(),
                actor_user_id=actor_user_id,
                reversal_reason_code=reversal_reason_code,
            )
            tenant_db.add(installment)

        tenant_db.add(loan)
        tenant_db.commit()
        tenant_db.refresh(loan)

        installments_for_loan = self.installment_repository.list_by_loan(tenant_db, loan.id)
        loan_row = self._build_loan_row(tenant_db, loan, installments=installments_for_loan)
        return loan_row, [installment.id for installment in installments]

    def _build_loan_row(
        self,
        tenant_db: Session,
        loan: FinanceLoan,
        *,
        installments: list[FinanceLoanInstallment],
    ) -> dict:
        currency = self._get_currency_or_raise(tenant_db, loan.currency_id)
        account = (
            self._get_account_or_raise(tenant_db, loan.account_id)
            if loan.account_id is not None
            else None
        )
        paid_amount = max(loan.principal_amount - loan.current_balance, 0.0)
        installment_rows = [self._build_installment_row(item) for item in installments]
        next_due = next(
            (
                item["installment"].due_date
                for item in installment_rows
                if item["installment_status"] != "paid"
            ),
            None,
        )
        paid_count = len(
            [item for item in installment_rows if item["installment_status"] == "paid"]
        )
        return {
            "loan": loan,
            "currency_code": currency.code,
            "account_name": account.name if account else None,
            "account_code": account.code if account else None,
            "loan_status": self._build_loan_status(
                current_balance=loan.current_balance,
                is_active=loan.is_active,
            ),
            "paid_amount": paid_amount,
            "next_due_date": next_due,
            "installments_total": len(installment_rows),
            "installments_paid": paid_count,
        }

    def _build_installment_row(self, installment: FinanceLoanInstallment) -> dict:
        return {
            "installment": installment,
            "installment_status": self._build_installment_status(
                due_date=installment.due_date,
                planned_amount=installment.planned_amount,
                paid_amount=installment.paid_amount,
            ),
        }

    def _build_transaction_rows_for_loan(
        self,
        tenant_db: Session,
        loan_id: int,
    ) -> list[dict]:
        transactions = self.transaction_repository.list_by_loan(
            tenant_db,
            loan_id,
            limit=20,
        )
        account_cache: dict[int, object] = {}
        currency_cache: dict[int, object] = {}
        rows: list[dict] = []
        for transaction in transactions:
            account = None
            if transaction.account_id is not None:
                account = account_cache.get(transaction.account_id)
                if account is None:
                    account = self._get_account_or_raise(tenant_db, transaction.account_id)
                    account_cache[transaction.account_id] = account
            currency = currency_cache.get(transaction.currency_id)
            if currency is None:
                currency = self._get_currency_or_raise(tenant_db, transaction.currency_id)
                currency_cache[transaction.currency_id] = currency
            rows.append(
                {
                    "transaction": transaction,
                    "action_type": self._build_transaction_action_type(transaction.source_type),
                    "account_name": account.name if account else None,
                    "account_code": account.code if account else None,
                    "currency_code": currency.code,
                }
            )
        return rows

    def _build_transaction_summary(self, transaction_rows: list[dict]) -> dict:
        payment_items = 0
        reversal_items = 0
        reconciled_items = 0
        total_inflow = 0.0
        total_outflow = 0.0
        total_inflow_in_base_currency = 0.0
        total_outflow_in_base_currency = 0.0
        last_transaction_at = None

        for row in transaction_rows:
            transaction = row["transaction"]
            action_type = row["action_type"]
            signed_amount = self._build_signed_transaction_amount(
                transaction.transaction_type,
                transaction.amount,
            )
            base_amount = (
                transaction.amount_in_base_currency
                if transaction.amount_in_base_currency is not None
                else transaction.amount
            )
            signed_base_amount = self._build_signed_transaction_amount(
                transaction.transaction_type,
                base_amount,
            )

            if action_type == "payment":
                payment_items += 1
            elif action_type == "reversal":
                reversal_items += 1

            if transaction.is_reconciled:
                reconciled_items += 1

            if signed_amount >= 0:
                total_inflow = round(total_inflow + signed_amount, 2)
            else:
                total_outflow = round(total_outflow + abs(signed_amount), 2)

            if signed_base_amount >= 0:
                total_inflow_in_base_currency = round(
                    total_inflow_in_base_currency + signed_base_amount, 2
                )
            else:
                total_outflow_in_base_currency = round(
                    total_outflow_in_base_currency + abs(signed_base_amount), 2
                )

            if (
                last_transaction_at is None
                or transaction.transaction_at > last_transaction_at
            ):
                last_transaction_at = transaction.transaction_at

        total_items = len(transaction_rows)
        return {
            "total_items": total_items,
            "payment_items": payment_items,
            "reversal_items": reversal_items,
            "reconciled_items": reconciled_items,
            "unreconciled_items": total_items - reconciled_items,
            "total_inflow": total_inflow,
            "total_outflow": total_outflow,
            "net_cash_effect": round(total_inflow - total_outflow, 2),
            "total_inflow_in_base_currency": total_inflow_in_base_currency,
            "total_outflow_in_base_currency": total_outflow_in_base_currency,
            "net_cash_effect_in_base_currency": round(
                total_inflow_in_base_currency - total_outflow_in_base_currency,
                2,
            ),
            "last_transaction_at": last_transaction_at,
        }

    def _sync_installments(self, tenant_db: Session, loan: FinanceLoan) -> None:
        installments = self._build_installments_for_loan(loan)
        self.installment_repository.replace_for_loan(
            tenant_db,
            loan_id=loan.id,
            installments=installments,
        )

    def _build_installments_for_loan(
        self,
        loan: FinanceLoan,
    ) -> list[FinanceLoanInstallment]:
        if not loan.installments_count or loan.installments_count <= 0:
            return []

        principal_chunks = self._split_amount(loan.principal_amount, loan.installments_count)
        interest_total = loan.principal_amount * ((loan.interest_rate or 0.0) / 100.0)
        interest_chunks = self._split_amount(interest_total, loan.installments_count)
        installments: list[FinanceLoanInstallment] = []
        for index in range(loan.installments_count):
            due_date = self._add_months(loan.start_date, index)
            principal_amount = principal_chunks[index]
            interest_amount = interest_chunks[index]
            installments.append(
                FinanceLoanInstallment(
                    loan_id=loan.id,
                    installment_number=index + 1,
                    due_date=due_date,
                    planned_amount=round(principal_amount + interest_amount, 2),
                    principal_amount=principal_amount,
                    interest_amount=interest_amount,
                    paid_amount=0.0,
                    paid_principal_amount=0.0,
                    paid_interest_amount=0.0,
                    paid_at=None,
                    note=None,
                )
            )
        return installments

    def _allocate_payment(
        self,
        *,
        installment: FinanceLoanInstallment,
        paid_amount: float,
        allocation_mode: str,
    ) -> tuple[float, float]:
        principal_remaining = round(
            installment.principal_amount - installment.paid_principal_amount, 2
        )
        interest_remaining = round(
            installment.interest_amount - installment.paid_interest_amount, 2
        )

        if allocation_mode == "interest_first":
            interest_delta = min(paid_amount, interest_remaining)
            principal_delta = min(
                round(paid_amount - interest_delta, 2), principal_remaining
            )
            return round(principal_delta, 2), round(interest_delta, 2)

        if allocation_mode == "principal_first":
            principal_delta = min(paid_amount, principal_remaining)
            interest_delta = min(
                round(paid_amount - principal_delta, 2), interest_remaining
            )
            return round(principal_delta, 2), round(interest_delta, 2)

        principal_share = 0.0
        interest_share = 0.0
        if installment.planned_amount > 0:
            principal_share = installment.principal_amount / installment.planned_amount
            interest_share = installment.interest_amount / installment.planned_amount
        principal_delta = round(min(paid_amount * principal_share, principal_remaining), 2)
        interest_delta = round(min(paid_amount * interest_share, interest_remaining), 2)
        residual = round(paid_amount - principal_delta - interest_delta, 2)
        if residual > 0:
            principal_extra = min(residual, round(principal_remaining - principal_delta, 2))
            principal_delta = round(principal_delta + principal_extra, 2)
            residual = round(residual - principal_extra, 2)
        if residual > 0:
            interest_delta = round(
                interest_delta + min(residual, round(interest_remaining - interest_delta, 2)),
                2,
            )
        return principal_delta, interest_delta

    def _reverse_payment(
        self,
        *,
        installment: FinanceLoanInstallment,
        reversed_amount: float,
    ) -> tuple[float, float]:
        principal_paid = installment.paid_principal_amount
        interest_paid = installment.paid_interest_amount

        principal_delta = min(reversed_amount, principal_paid)
        interest_delta = min(round(reversed_amount - principal_delta, 2), interest_paid)
        return round(principal_delta, 2), round(interest_delta, 2)

    def _apply_payment_to_installment(
        self,
        *,
        loan: FinanceLoan,
        installment: FinanceLoanInstallment,
        paid_amount: float,
        paid_at: date | None,
        allocation_mode: str,
        note: str | None,
    ) -> None:
        if paid_amount <= 0:
            raise ValueError("El pago aplicado a la cuota debe ser mayor que cero")
        next_paid_amount = round(installment.paid_amount + paid_amount, 2)
        if next_paid_amount > installment.planned_amount:
            raise ValueError("El pago supera el monto planificado de la cuota")

        principal_delta, interest_delta = self._allocate_payment(
            installment=installment,
            paid_amount=paid_amount,
            allocation_mode=allocation_mode,
        )
        installment.paid_amount = next_paid_amount
        installment.paid_principal_amount = round(
            installment.paid_principal_amount + principal_delta, 2
        )
        installment.paid_interest_amount = round(
            installment.paid_interest_amount + interest_delta, 2
        )
        installment.paid_at = paid_at or date.today()
        installment.reversal_reason_code = None
        if note is not None:
            installment.note = note.strip() or None
        loan.current_balance = round(max(loan.current_balance - principal_delta, 0.0), 2)

    def _reverse_payment_on_installment(
        self,
        *,
        loan: FinanceLoan,
        installment: FinanceLoanInstallment,
        reversed_amount: float,
        reversal_reason_code: str,
        note: str | None,
    ) -> None:
        if reversed_amount <= 0:
            raise ValueError("La reversa aplicada a la cuota debe ser mayor que cero")
        if reversed_amount > installment.paid_amount:
            raise ValueError("La reversa supera el monto ya pagado de la cuota")

        next_paid_amount = round(installment.paid_amount - reversed_amount, 2)
        principal_delta, interest_delta = self._reverse_payment(
            installment=installment,
            reversed_amount=reversed_amount,
        )
        installment.paid_amount = next_paid_amount
        installment.paid_principal_amount = round(
            installment.paid_principal_amount - principal_delta, 2
        )
        installment.paid_interest_amount = round(
            installment.paid_interest_amount - interest_delta, 2
        )
        installment.paid_at = installment.paid_at if next_paid_amount > 0 else None
        installment.reversal_reason_code = reversal_reason_code
        if note is not None:
            installment.note = note.strip() or None
        loan.current_balance = round(loan.current_balance + principal_delta, 2)
        if loan.current_balance > loan.principal_amount:
            loan.current_balance = round(loan.principal_amount, 2)

    def _get_loan_and_installments_for_batch(
        self,
        tenant_db: Session,
        *,
        loan_id: int,
        installment_ids: list[int],
    ) -> tuple[FinanceLoan, list[FinanceLoanInstallment]]:
        unique_ids = list(dict.fromkeys(installment_ids))
        if not unique_ids:
            raise ValueError("Debes seleccionar al menos una cuota para operar en lote")

        loan = self._get_loan_or_raise(tenant_db, loan_id)
        installments = self.installment_repository.list_by_ids(tenant_db, unique_ids)
        if len(installments) != len(unique_ids):
            raise ValueError("Una o mas cuotas seleccionadas no existen")
        if any(installment.loan_id != loan.id for installment in installments):
            raise ValueError("Todas las cuotas del lote deben pertenecer al mismo préstamo")
        return loan, installments

    def _validate_reversal_reason_code(self, reversal_reason_code: str) -> None:
        if reversal_reason_code not in self.VALID_REVERSAL_REASON_CODES:
            raise ValueError("El codigo de motivo de reversa no es valido")

    def _stage_installment_accounting_transaction(
        self,
        tenant_db: Session,
        *,
        loan: FinanceLoan,
        installment: FinanceLoanInstallment,
        amount: float,
        account_id: int,
        action_type: str,
        note: str | None,
        action_date: date | None,
        actor_user_id: int | None,
        reversal_reason_code: str | None = None,
    ) -> None:
        effective_date = action_date or date.today()
        transaction_type = self._build_installment_transaction_type(
            loan_type=loan.loan_type,
            action_type=action_type,
        )
        description = self._build_installment_transaction_description(
            loan=loan,
            installment=installment,
            action_type=action_type,
        )
        notes = note.strip() if note and note.strip() else None
        if reversal_reason_code:
            notes = (
                f"{notes} | motivo={reversal_reason_code}"
                if notes
                else f"motivo={reversal_reason_code}"
            )
        self.finance_service.stage_system_transaction(
            tenant_db,
            FinanceTransactionCreateRequest(
                transaction_type=transaction_type,
                account_id=account_id,
                target_account_id=None,
                category_id=None,
                beneficiary_id=None,
                person_id=None,
                project_id=None,
                currency_id=loan.currency_id,
                loan_id=loan.id,
                amount=amount,
                discount_amount=0,
                exchange_rate=1,
                amortization_months=None,
                transaction_at=datetime.combine(
                    effective_date,
                    time.min,
                    tzinfo=timezone.utc,
                ),
                alternative_date=effective_date,
                description=description,
                notes=notes,
                is_favorite=False,
                is_reconciled=False,
                tag_ids=None,
            ),
            actor_user_id=actor_user_id,
            source_type=f"loan_installment_{action_type}",
            source_id=installment.id,
            event_type=f"transaction.created.loan_installment_{action_type}",
            summary=(
                "Transaccion financiera generada por pago de cuota"
                if action_type == "payment"
                else "Transaccion financiera generada por reversa de cuota"
            ),
            audit_payload={
                "loan_id": loan.id,
                "installment_id": installment.id,
                "reversal_reason_code": reversal_reason_code,
            },
        )

    def _build_installment_transaction_type(
        self,
        *,
        loan_type: str,
        action_type: str,
    ) -> str:
        if loan_type == "borrowed":
            return "expense" if action_type == "payment" else "income"
        return "income" if action_type == "payment" else "expense"

    def _build_installment_transaction_description(
        self,
        *,
        loan: FinanceLoan,
        installment: FinanceLoanInstallment,
        action_type: str,
    ) -> str:
        action_label = "Pago cuota" if action_type == "payment" else "Reversa cuota"
        return f"{action_label} {installment.installment_number} - {loan.name}"

    def _build_transaction_action_type(self, source_type: str | None) -> str:
        if source_type == "loan_installment_payment":
            return "payment"
        if source_type == "loan_installment_reversal":
            return "reversal"
        return "derived"

    def _build_signed_transaction_amount(
        self,
        transaction_type: str,
        amount: float,
    ) -> float:
        if transaction_type == "expense":
            return round(-abs(amount), 2)
        if transaction_type == "income":
            return round(abs(amount), 2)
        return 0.0

    def _split_amount(self, amount: float, chunks: int) -> list[float]:
        base = round(amount / chunks, 2)
        values = [base for _ in range(chunks)]
        difference = round(amount - sum(values), 2)
        index = 0
        while difference > 0 and index < chunks:
            values[index] = round(values[index] + 0.01, 2)
            difference = round(difference - 0.01, 2)
            index += 1
        return values

    def _add_months(self, source_date: date, months: int) -> date:
        month = source_date.month - 1 + months
        year = source_date.year + month // 12
        month = month % 12 + 1
        day = min(source_date.day, monthrange(year, month)[1])
        return date(year, month, day)

    def _get_loan_or_raise(self, tenant_db: Session, loan_id: int) -> FinanceLoan:
        loan = self.loan_repository.get_by_id(tenant_db, loan_id)
        if loan is None:
            raise ValueError("El préstamo financiero solicitado no existe")
        return loan

    def _get_account_or_raise(self, tenant_db: Session, account_id: int):
        account = self.account_repository.get_by_id(tenant_db, account_id)
        if account is None:
            raise ValueError("La cuenta financiera solicitada no existe")
        return account

    def _get_currency_or_raise(self, tenant_db: Session, currency_id: int):
        currency = self.currency_repository.get_by_id(tenant_db, currency_id)
        if currency is None:
            raise ValueError("La moneda financiera solicitada no existe")
        return currency

    def _resolve_account_for_operation(
        self,
        tenant_db: Session,
        *,
        loan: FinanceLoan,
        account_id: int | None,
    ):
        resolved_account_id = account_id if account_id is not None else loan.account_id
        if resolved_account_id is None:
            raise ValueError(
                "Debes definir una cuenta origen en el préstamo o en la operación"
            )
        account = self._get_account_or_raise(tenant_db, resolved_account_id)
        if account.currency_id != loan.currency_id:
            raise ValueError(
                "La cuenta origen usada en la operación debe usar la misma moneda del préstamo"
            )
        return account

    def _normalize_payload(
        self,
        payload: FinanceLoanCreateRequest | FinanceLoanUpdateRequest,
    ) -> dict:
        return {
            "name": payload.name.strip(),
            "loan_type": payload.loan_type,
            "counterparty_name": payload.counterparty_name.strip(),
            "currency_id": payload.currency_id,
            "account_id": payload.account_id,
            "principal_amount": payload.principal_amount,
            "current_balance": payload.current_balance,
            "interest_rate": payload.interest_rate,
            "installments_count": payload.installments_count,
            "payment_frequency": payload.payment_frequency,
            "start_date": payload.start_date,
            "due_date": payload.due_date,
            "note": payload.note.strip() if payload.note and payload.note.strip() else None,
            "is_active": payload.is_active,
        }

    def _validate_payload(self, tenant_db: Session, payload: dict) -> None:
        if payload["loan_type"] not in {"borrowed", "lent"}:
            raise ValueError("El tipo de préstamo debe ser 'borrowed' o 'lent'")
        if not payload["name"]:
            raise ValueError("El nombre del préstamo es obligatorio")
        if not payload["counterparty_name"]:
            raise ValueError("La contraparte del préstamo es obligatoria")
        if payload["principal_amount"] <= 0:
            raise ValueError("El capital inicial del préstamo debe ser mayor que cero")
        if payload["current_balance"] < 0:
            raise ValueError("El saldo pendiente del préstamo no puede ser negativo")
        if payload["interest_rate"] is not None and payload["interest_rate"] < 0:
            raise ValueError("La tasa de interés no puede ser negativa")
        if payload["installments_count"] is not None and payload["installments_count"] <= 0:
            raise ValueError("La cantidad de cuotas debe ser mayor que cero")
        if payload["payment_frequency"] not in {"monthly"}:
            raise ValueError("La frecuencia de pago soportada por ahora es 'monthly'")
        if payload["due_date"] and payload["due_date"] < payload["start_date"]:
            raise ValueError("El vencimiento no puede ser anterior al inicio del préstamo")
        self._get_currency_or_raise(tenant_db, payload["currency_id"])
        if payload["account_id"] is not None:
            account = self._get_account_or_raise(tenant_db, payload["account_id"])
            if account.currency_id != payload["currency_id"]:
                raise ValueError(
                    "La cuenta origen del préstamo debe usar la misma moneda del préstamo"
                )

    def _build_loan_status(
        self,
        *,
        current_balance: float,
        is_active: bool,
    ) -> str:
        if not is_active:
            return "inactive"
        if current_balance <= 0:
            return "settled"
        return "open"

    def _build_installment_status(
        self,
        *,
        due_date: date,
        planned_amount: float,
        paid_amount: float,
    ) -> str:
        if paid_amount >= planned_amount:
            return "paid"
        if paid_amount > 0:
            return "partial"
        if due_date < date.today():
            return "overdue"
        return "pending"
