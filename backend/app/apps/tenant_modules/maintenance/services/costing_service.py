from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.apps.tenant_modules.finance.models import FinanceCurrency
from app.apps.tenant_modules.finance.schemas import (
    FinanceTransactionCreateRequest,
    FinanceTransactionUpdateRequest,
)
from app.apps.tenant_modules.finance.services.transaction_service import FinanceService
from app.apps.tenant_modules.maintenance.models import (
    MaintenanceCostActual,
    MaintenanceCostEstimate,
    MaintenanceWorkOrder,
)


class MaintenanceCostingService:
    def __init__(self, finance_service: FinanceService | None = None) -> None:
        self.finance_service = finance_service or FinanceService()

    def get_costing_detail(self, tenant_db: Session, work_order_id: int) -> dict:
        work_order = self._get_work_order_or_raise(tenant_db, work_order_id)
        estimate = self._get_estimate(tenant_db, work_order_id)
        actual = self._get_actual(tenant_db, work_order_id)
        return {
            "work_order": work_order,
            "estimate": estimate,
            "actual": actual,
        }

    def upsert_cost_estimate(
        self,
        tenant_db: Session,
        work_order_id: int,
        payload,
        *,
        actor_user_id: int | None = None,
    ) -> dict:
        work_order = self._get_work_order_or_raise(tenant_db, work_order_id)
        normalized = self._normalize_cost_payload(payload)
        total_estimated_cost = self._sum_costs(normalized)
        target_margin_percent = max(payload.target_margin_percent, 0)
        suggested_price = self._calculate_suggested_price(
            total_estimated_cost,
            target_margin_percent,
        )

        estimate = self._get_estimate(tenant_db, work_order_id)
        if estimate is None:
            estimate = MaintenanceCostEstimate(
                work_order_id=work_order.id,
                created_by_user_id=actor_user_id,
            )
            tenant_db.add(estimate)

        estimate.labor_cost = normalized["labor_cost"]
        estimate.travel_cost = normalized["travel_cost"]
        estimate.materials_cost = normalized["materials_cost"]
        estimate.external_services_cost = normalized["external_services_cost"]
        estimate.overhead_cost = normalized["overhead_cost"]
        estimate.total_estimated_cost = total_estimated_cost
        estimate.target_margin_percent = target_margin_percent
        estimate.suggested_price = suggested_price
        estimate.notes = self._normalize_text(payload.notes)
        estimate.updated_by_user_id = actor_user_id

        tenant_db.commit()
        tenant_db.refresh(estimate)
        actual = self._get_actual(tenant_db, work_order_id)
        return {
          "work_order": work_order,
          "estimate": estimate,
          "actual": actual,
        }

    def upsert_cost_actual(
        self,
        tenant_db: Session,
        work_order_id: int,
        payload,
        *,
        actor_user_id: int | None = None,
    ) -> dict:
        work_order = self._get_work_order_or_raise(tenant_db, work_order_id)
        normalized = self._normalize_cost_payload(payload)
        total_actual_cost = self._sum_costs(normalized)
        actual_income = max(payload.actual_price_charged, 0)
        actual_profit = actual_income - total_actual_cost
        actual_margin_percent = (
            round((actual_profit / actual_income) * 100, 2) if actual_income > 0 else None
        )

        actual = self._get_actual(tenant_db, work_order_id)
        if actual is None:
            actual = MaintenanceCostActual(
                work_order_id=work_order.id,
                created_by_user_id=actor_user_id,
            )
            tenant_db.add(actual)

        actual.labor_cost = normalized["labor_cost"]
        actual.travel_cost = normalized["travel_cost"]
        actual.materials_cost = normalized["materials_cost"]
        actual.external_services_cost = normalized["external_services_cost"]
        actual.overhead_cost = normalized["overhead_cost"]
        actual.total_actual_cost = total_actual_cost
        actual.actual_price_charged = actual_income
        actual.actual_income = actual_income
        actual.actual_profit = actual_profit
        actual.actual_margin_percent = actual_margin_percent
        actual.notes = self._normalize_text(payload.notes)
        actual.updated_by_user_id = actor_user_id

        tenant_db.commit()
        tenant_db.refresh(actual)
        estimate = self._get_estimate(tenant_db, work_order_id)
        return {
            "work_order": work_order,
            "estimate": estimate,
            "actual": actual,
        }

    def sync_to_finance(
        self,
        tenant_db: Session,
        work_order_id: int,
        payload,
        *,
        actor_user_id: int | None = None,
    ) -> dict:
        work_order = self._get_work_order_or_raise(tenant_db, work_order_id)
        actual = self._get_actual(tenant_db, work_order_id)
        estimate = self._get_estimate(tenant_db, work_order_id)
        if actual is None:
            raise ValueError("Primero debes registrar el costo real antes de sincronizar con finance")

        transaction_at = payload.transaction_at or work_order.completed_at or work_order.scheduled_for or work_order.requested_at or datetime.now(timezone.utc)
        currency_id = self._get_currency_or_raise(tenant_db, payload.currency_id).id
        summary_label = self._build_work_order_label(work_order)
        note = self._normalize_text(payload.notes)

        if payload.sync_income:
            if actual.actual_price_charged <= 0:
                raise ValueError("El ingreso requiere un monto cobrado mayor que cero")
            if payload.income_account_id is None:
                raise ValueError("Debes seleccionar una cuenta de ingreso para sincronizar con finance")
            income_payload = FinanceTransactionCreateRequest(
                transaction_type="income",
                account_id=payload.income_account_id,
                target_account_id=None,
                category_id=payload.income_category_id,
                beneficiary_id=None,
                person_id=None,
                project_id=None,
                currency_id=currency_id,
                loan_id=None,
                amount=actual.actual_price_charged,
                discount_amount=0,
                exchange_rate=None,
                amortization_months=None,
                transaction_at=transaction_at,
                alternative_date=None,
                description=f"Ingreso mantención {summary_label}",
                notes=note or actual.notes,
                is_favorite=False,
                is_reconciled=False,
                tag_ids=[],
            )
            if actual.income_transaction_id:
                self.finance_service.update_transaction(
                    tenant_db,
                    actual.income_transaction_id,
                    FinanceTransactionUpdateRequest(**income_payload.model_dump()),
                    actor_user_id=actor_user_id,
                )
            else:
                transaction = self.finance_service.create_transaction(
                    tenant_db,
                    income_payload,
                    created_by_user_id=actor_user_id,
                    source_type="maintenance_work_order_income",
                    source_id=work_order.id,
                    summary="Ingreso sincronizado desde maintenance",
                    audit_payload={"work_order_id": work_order.id},
                )
                actual.income_transaction_id = transaction.id

        if payload.sync_expense:
            if actual.total_actual_cost <= 0:
                raise ValueError("El egreso requiere un costo real mayor que cero")
            if payload.expense_account_id is None:
                raise ValueError("Debes seleccionar una cuenta de egreso para sincronizar con finance")
            expense_payload = FinanceTransactionCreateRequest(
                transaction_type="expense",
                account_id=payload.expense_account_id,
                target_account_id=None,
                category_id=payload.expense_category_id,
                beneficiary_id=None,
                person_id=None,
                project_id=None,
                currency_id=currency_id,
                loan_id=None,
                amount=actual.total_actual_cost,
                discount_amount=0,
                exchange_rate=None,
                amortization_months=None,
                transaction_at=transaction_at,
                alternative_date=None,
                description=f"Egreso mantención {summary_label}",
                notes=note or actual.notes,
                is_favorite=False,
                is_reconciled=False,
                tag_ids=[],
            )
            if actual.expense_transaction_id:
                self.finance_service.update_transaction(
                    tenant_db,
                    actual.expense_transaction_id,
                    FinanceTransactionUpdateRequest(**expense_payload.model_dump()),
                    actor_user_id=actor_user_id,
                )
            else:
                transaction = self.finance_service.create_transaction(
                    tenant_db,
                    expense_payload,
                    created_by_user_id=actor_user_id,
                    source_type="maintenance_work_order_expense",
                    source_id=work_order.id,
                    summary="Egreso sincronizado desde maintenance",
                    audit_payload={"work_order_id": work_order.id},
                )
                actual.expense_transaction_id = transaction.id

        actual.finance_synced_at = datetime.now(timezone.utc)
        actual.updated_by_user_id = actor_user_id
        tenant_db.add(actual)
        tenant_db.commit()
        tenant_db.refresh(actual)
        return {
            "work_order": work_order,
            "estimate": estimate,
            "actual": actual,
        }

    def _get_work_order_or_raise(self, tenant_db: Session, work_order_id: int) -> MaintenanceWorkOrder:
        work_order = (
            tenant_db.query(MaintenanceWorkOrder)
            .filter(MaintenanceWorkOrder.id == work_order_id)
            .first()
        )
        if work_order is None:
            raise ValueError("La mantencion solicitada no existe")
        return work_order

    def _get_estimate(self, tenant_db: Session, work_order_id: int) -> MaintenanceCostEstimate | None:
        return (
            tenant_db.query(MaintenanceCostEstimate)
            .filter(MaintenanceCostEstimate.work_order_id == work_order_id)
            .first()
        )

    def _get_actual(self, tenant_db: Session, work_order_id: int) -> MaintenanceCostActual | None:
        return (
            tenant_db.query(MaintenanceCostActual)
            .filter(MaintenanceCostActual.work_order_id == work_order_id)
            .first()
        )

    def _normalize_cost_payload(self, payload) -> dict:
        return {
            "labor_cost": self._normalize_number(payload.labor_cost),
            "travel_cost": self._normalize_number(payload.travel_cost),
            "materials_cost": self._normalize_number(payload.materials_cost),
            "external_services_cost": self._normalize_number(payload.external_services_cost),
            "overhead_cost": self._normalize_number(payload.overhead_cost),
        }

    def _normalize_number(self, value: float | int | None) -> float:
        normalized = float(value or 0)
        if normalized < 0:
            raise ValueError("Los montos de costeo no pueden ser negativos")
        return round(normalized, 2)

    def _sum_costs(self, values: dict) -> float:
        return round(
            values["labor_cost"]
            + values["travel_cost"]
            + values["materials_cost"]
            + values["external_services_cost"]
            + values["overhead_cost"],
            2,
        )

    def _calculate_suggested_price(self, total_cost: float, target_margin_percent: float) -> float:
        margin = max(target_margin_percent, 0)
        if margin >= 100:
            raise ValueError("El margen objetivo debe ser menor que 100")
        if total_cost <= 0:
            return 0
        if margin == 0:
            return total_cost
        return round(total_cost / (1 - (margin / 100)), 2)

    def _normalize_text(self, value: str | None) -> str | None:
        trimmed = value.strip() if value else ""
        return trimmed or None

    def _get_currency_or_raise(self, tenant_db: Session, currency_id: int) -> FinanceCurrency:
        currency = (
            tenant_db.query(FinanceCurrency)
            .filter(FinanceCurrency.id == currency_id)
            .first()
        )
        if currency is None:
            raise ValueError("La moneda seleccionada no existe en finance")
        return currency

    def _build_work_order_label(self, work_order: MaintenanceWorkOrder) -> str:
        return f"#{work_order.id} · {work_order.title}"
