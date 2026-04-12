from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.apps.tenant_modules.finance.models import (
    FinanceAccount,
    FinanceCategory,
    FinanceCurrency,
)
from app.apps.tenant_modules.core.services.tenant_data_service import TenantDataService
from app.apps.tenant_modules.finance.schemas import (
    FinanceTransactionCreateRequest,
    FinanceTransactionUpdateRequest,
)
from app.apps.tenant_modules.finance.services.transaction_service import FinanceService
from app.apps.tenant_modules.maintenance.models import (
    MaintenanceCostActual,
    MaintenanceCostEstimate,
    MaintenanceCostLine,
    MaintenanceCostTemplate,
    MaintenanceSchedule,
    MaintenanceScheduleCostLine,
    MaintenanceWorkOrder,
)


class MaintenanceCostingService:
    FINANCE_SYNC_CATEGORY_DEFAULTS = {
        "income": ("Mantenciones y servicios", "Ventas", "Ingreso General"),
        "expense": ("Costos de mantencion", "Egreso General"),
    }
    LINE_TYPE_TO_BUCKET = {
        "labor": "labor_cost",
        "travel": "travel_cost",
        "material": "materials_cost",
        "service": "external_services_cost",
        "overhead": "overhead_cost",
    }

    def __init__(self, finance_service: FinanceService | None = None) -> None:
        self.finance_service = finance_service or FinanceService()
        self.tenant_data_service = TenantDataService()

    def get_costing_detail(self, tenant_db: Session, work_order_id: int) -> dict:
        work_order = self._get_work_order_or_raise(tenant_db, work_order_id)
        estimate = self._get_estimate(tenant_db, work_order_id)
        actual = self._get_actual(tenant_db, work_order_id)
        lines = self._get_cost_lines(tenant_db, work_order_id)
        return {
            "work_order": work_order,
            "estimate": estimate,
            "actual": actual,
            "estimate_lines": [line for line in lines if line.cost_stage == "estimate"],
            "actual_lines": [line for line in lines if line.cost_stage == "actual"],
        }

    def get_finance_sync_defaults(self, tenant_db: Session) -> dict:
        policy = self.tenant_data_service.get_maintenance_finance_sync_policy(tenant_db)
        currencies = self._list_active_currencies(tenant_db)
        categories = self._list_active_categories(tenant_db)
        accounts = self._list_active_accounts(tenant_db)

        currency, currency_source = self._resolve_currency_default(
            policy["maintenance_finance_currency_id"],
            currencies,
        )
        effective_currency_id = getattr(currency, "id", None)

        income_category, income_category_source = self._resolve_category_default(
            policy["maintenance_finance_income_category_id"],
            "income",
            categories,
        )
        expense_category, expense_category_source = self._resolve_category_default(
            policy["maintenance_finance_expense_category_id"],
            "expense",
            categories,
        )
        income_account, income_account_source = self._resolve_account_default(
            policy["maintenance_finance_income_account_id"],
            effective_currency_id,
            accounts,
        )
        expense_account, expense_account_source = self._resolve_account_default(
            policy["maintenance_finance_expense_account_id"],
            effective_currency_id,
            accounts,
        )

        return {
            "maintenance_finance_sync_mode": policy["maintenance_finance_sync_mode"],
            "maintenance_finance_auto_sync_income": policy["maintenance_finance_auto_sync_income"],
            "maintenance_finance_auto_sync_expense": policy["maintenance_finance_auto_sync_expense"],
            "maintenance_finance_income_account_id": getattr(income_account, "id", None),
            "maintenance_finance_income_account_source": income_account_source,
            "maintenance_finance_expense_account_id": getattr(expense_account, "id", None),
            "maintenance_finance_expense_account_source": expense_account_source,
            "maintenance_finance_income_category_id": getattr(income_category, "id", None),
            "maintenance_finance_income_category_source": income_category_source,
            "maintenance_finance_expense_category_id": getattr(expense_category, "id", None),
            "maintenance_finance_expense_category_source": expense_category_source,
            "maintenance_finance_currency_id": effective_currency_id,
            "maintenance_finance_currency_source": currency_source,
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
        line_payloads = self._normalize_line_payloads(payload.lines)
        if line_payloads:
            normalized = self._sum_lines_by_bucket(line_payloads)
            total_estimated_cost = self._sum_line_totals(line_payloads)
        else:
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

        estimate_lines = self._sync_cost_lines(
            tenant_db,
            work_order.id,
            "estimate",
            line_payloads,
            actor_user_id=actor_user_id,
        )
        tenant_db.commit()
        tenant_db.refresh(estimate)
        actual = self._get_actual(tenant_db, work_order_id)
        return {
            "work_order": work_order,
            "estimate": estimate,
            "actual": actual,
            "estimate_lines": estimate_lines,
            "actual_lines": self._get_cost_lines(tenant_db, work_order_id, cost_stage="actual"),
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
        line_payloads = self._normalize_line_payloads(payload.lines)
        if line_payloads:
            normalized = self._sum_lines_by_bucket(line_payloads)
            total_actual_cost = self._sum_line_totals(line_payloads)
        else:
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
        actual.applied_cost_template_id = None
        actual.applied_cost_template_name_snapshot = None
        if payload.applied_template_id is not None:
            template = self._get_cost_template_or_raise(tenant_db, payload.applied_template_id)
            actual.applied_cost_template_id = template.id
            actual.applied_cost_template_name_snapshot = template.name
        actual.notes = self._normalize_text(payload.notes)
        actual.updated_by_user_id = actor_user_id

        actual_lines = self._sync_cost_lines(
            tenant_db,
            work_order.id,
            "actual",
            line_payloads,
            actor_user_id=actor_user_id,
        )
        tenant_db.commit()
        tenant_db.refresh(actual)
        estimate = self._get_estimate(tenant_db, work_order_id)
        detail = {
            "work_order": work_order,
            "estimate": estimate,
            "actual": actual,
            "estimate_lines": self._get_cost_lines(tenant_db, work_order_id, cost_stage="estimate"),
            "actual_lines": actual_lines,
        }
        self.maybe_auto_sync_by_tenant_policy(
            tenant_db,
            work_order_id,
            actor_user_id=actor_user_id,
        )
        refreshed_detail = self.get_costing_detail(tenant_db, work_order_id)
        return refreshed_detail if refreshed_detail.get("actual") is not None else detail

    def _get_cost_template_or_raise(
        self,
        tenant_db: Session,
        template_id: int,
    ) -> MaintenanceCostTemplate:
        item = (
            tenant_db.query(MaintenanceCostTemplate)
            .filter(MaintenanceCostTemplate.id == template_id)
            .first()
        )
        if item is None:
            raise ValueError("La plantilla de costeo seleccionada no existe")
        return item

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

        transaction_at = work_order.completed_at or datetime.now(timezone.utc)
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
            "estimate_lines": self._get_cost_lines(tenant_db, work_order_id, cost_stage="estimate"),
            "actual_lines": self._get_cost_lines(tenant_db, work_order_id, cost_stage="actual"),
        }

    def maybe_auto_sync_by_tenant_policy(
        self,
        tenant_db: Session,
        work_order_id: int,
        *,
        actor_user_id: int | None = None,
    ) -> dict | None:
        work_order = self._get_work_order_or_raise(tenant_db, work_order_id)
        if getattr(work_order, "maintenance_status", None) != "completed":
            return None

        actual = self._get_actual(tenant_db, work_order_id)
        if actual is None:
            return None

        try:
            policy = self.tenant_data_service.get_maintenance_finance_sync_policy(tenant_db)
        except ValueError:
            return None

        if policy["maintenance_finance_sync_mode"] != "auto_on_close":
            return None

        sync_income = (
            policy["maintenance_finance_auto_sync_income"]
            and actual.actual_price_charged > 0
            and policy["maintenance_finance_income_account_id"] is not None
        )
        sync_expense = (
            policy["maintenance_finance_auto_sync_expense"]
            and actual.total_actual_cost > 0
            and policy["maintenance_finance_expense_account_id"] is not None
        )
        if not sync_income and not sync_expense:
            return None

        currency_id = policy["maintenance_finance_currency_id"]
        if currency_id is None:
            try:
                currency_id = self._get_base_currency_or_raise(tenant_db).id
            except ValueError:
                return None

        try:
            return self.sync_to_finance(
                tenant_db,
                work_order_id,
                type(
                    "_AutoSyncPayload",
                    (),
                    {
                        "sync_income": sync_income,
                        "sync_expense": sync_expense,
                        "income_account_id": policy["maintenance_finance_income_account_id"],
                        "expense_account_id": policy["maintenance_finance_expense_account_id"],
                        "income_category_id": policy["maintenance_finance_income_category_id"],
                        "expense_category_id": policy["maintenance_finance_expense_category_id"],
                        "currency_id": currency_id,
                        "transaction_at": None,
                        "notes": "Auto sync maintenance-finance",
                    },
                )(),
                actor_user_id=actor_user_id,
            )
        except ValueError:
            return None

    def seed_estimate_from_schedule(
        self,
        tenant_db: Session,
        work_order_id: int,
        schedule_id: int,
        *,
        actor_user_id: int | None = None,
    ) -> dict | None:
        work_order = self._get_work_order_or_raise(tenant_db, work_order_id)
        estimate = self._get_estimate(tenant_db, work_order_id)
        if estimate is not None:
            return self.get_costing_detail(tenant_db, work_order_id)

        schedule = (
            tenant_db.query(MaintenanceSchedule)
            .filter(MaintenanceSchedule.id == schedule_id)
            .first()
        )
        if schedule is None:
            return None

        schedule_lines = (
            tenant_db.query(MaintenanceScheduleCostLine)
            .filter(MaintenanceScheduleCostLine.schedule_id == schedule_id)
            .order_by(MaintenanceScheduleCostLine.sort_order.asc(), MaintenanceScheduleCostLine.id.asc())
            .all()
        )
        if not schedule_lines:
            return None

        estimate = MaintenanceCostEstimate(
            work_order_id=work_order.id,
            created_by_user_id=actor_user_id,
            updated_by_user_id=actor_user_id,
        )
        tenant_db.add(estimate)
        tenant_db.flush()

        normalized = {
            "labor_cost": 0.0,
            "travel_cost": 0.0,
            "materials_cost": 0.0,
            "external_services_cost": 0.0,
            "overhead_cost": 0.0,
        }
        total_estimated_cost = 0.0

        for line in schedule_lines:
            bucket = self.LINE_TYPE_TO_BUCKET.get(line.line_type)
            total_cost = round((line.quantity or 0) * (line.unit_cost or 0), 2)
            if bucket:
                normalized[bucket] += total_cost
            total_estimated_cost += total_cost
            seeded = MaintenanceCostLine(
                work_order_id=work_order.id,
                cost_stage="estimate",
                line_type=line.line_type,
                description=line.description,
                quantity=line.quantity,
                unit_cost=line.unit_cost,
                total_cost=total_cost,
                notes=line.notes,
                created_by_user_id=actor_user_id,
                updated_by_user_id=actor_user_id,
            )
            tenant_db.add(seeded)

        estimate.labor_cost = normalized["labor_cost"]
        estimate.travel_cost = normalized["travel_cost"]
        estimate.materials_cost = normalized["materials_cost"]
        estimate.external_services_cost = normalized["external_services_cost"]
        estimate.overhead_cost = normalized["overhead_cost"]
        estimate.total_estimated_cost = round(total_estimated_cost, 2)
        estimate.target_margin_percent = max(getattr(schedule, "estimate_target_margin_percent", 0) or 0, 0)
        estimate.suggested_price = self._calculate_suggested_price(
            estimate.total_estimated_cost,
            estimate.target_margin_percent,
        )
        estimate.notes = self._normalize_text(getattr(schedule, "estimate_notes", None))

        tenant_db.commit()
        tenant_db.refresh(estimate)
        return {
            "work_order": work_order,
            "estimate": estimate,
            "actual": self._get_actual(tenant_db, work_order_id),
            "estimate_lines": self._get_cost_lines(tenant_db, work_order_id, cost_stage="estimate"),
            "actual_lines": self._get_cost_lines(tenant_db, work_order_id, cost_stage="actual"),
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

    def _get_cost_lines(
        self,
        tenant_db: Session,
        work_order_id: int,
        *,
        cost_stage: str | None = None,
    ) -> list[MaintenanceCostLine]:
        lines = (
            tenant_db.query(MaintenanceCostLine)
            .filter(MaintenanceCostLine.work_order_id == work_order_id)
            .all()
        )
        if cost_stage is None:
            return lines
        return [line for line in lines if line.cost_stage == cost_stage]

    def _normalize_cost_payload(self, payload) -> dict:
        return {
            "labor_cost": self._normalize_number(payload.labor_cost),
            "travel_cost": self._normalize_number(payload.travel_cost),
            "materials_cost": self._normalize_number(payload.materials_cost),
            "external_services_cost": self._normalize_number(payload.external_services_cost),
            "overhead_cost": self._normalize_number(payload.overhead_cost),
        }

    def _normalize_line_payloads(self, lines) -> list[dict]:
        normalized_lines: list[dict] = []
        for item in lines:
            line_type = (item.line_type or "").strip().lower()
            if line_type not in self.LINE_TYPE_TO_BUCKET:
                raise ValueError("Cada linea de costo debe usar un tipo valido")
            quantity = self._normalize_number(item.quantity)
            unit_cost = self._normalize_number(item.unit_cost)
            normalized_lines.append(
                {
                    "id": item.id,
                    "line_type": line_type,
                    "description": self._normalize_text(item.description),
                    "quantity": quantity,
                    "unit_cost": unit_cost,
                    "total_cost": round(quantity * unit_cost, 2),
                    "notes": self._normalize_text(item.notes),
                }
            )
        return normalized_lines

    def _sum_lines_by_bucket(self, lines: list[dict]) -> dict:
        buckets = {
            "labor_cost": 0.0,
            "travel_cost": 0.0,
            "materials_cost": 0.0,
            "external_services_cost": 0.0,
            "overhead_cost": 0.0,
        }
        for item in lines:
            bucket_name = self.LINE_TYPE_TO_BUCKET[item["line_type"]]
            buckets[bucket_name] += item["total_cost"]
        return {key: round(value, 2) for key, value in buckets.items()}

    def _sum_line_totals(self, lines: list[dict]) -> float:
        return round(sum(item["total_cost"] for item in lines), 2)

    def _sync_cost_lines(
        self,
        tenant_db: Session,
        work_order_id: int,
        cost_stage: str,
        payload_lines: list[dict],
        *,
        actor_user_id: int | None = None,
    ) -> list[MaintenanceCostLine]:
        existing_lines = self._get_cost_lines(tenant_db, work_order_id, cost_stage=cost_stage)
        existing_by_id = {line.id: line for line in existing_lines}
        payload_ids = {
            item["id"] for item in payload_lines if item["id"] is not None
        }
        synced_lines: list[MaintenanceCostLine] = []

        for item in payload_lines:
            line = existing_by_id.get(item["id"]) if item["id"] is not None else None
            if line is None:
                line = MaintenanceCostLine(
                    work_order_id=work_order_id,
                    cost_stage=cost_stage,
                    created_by_user_id=actor_user_id,
                )
                tenant_db.add(line)
            elif line.work_order_id != work_order_id or line.cost_stage != cost_stage:
                raise ValueError("La linea de costo no pertenece a esta mantencion")

            line.line_type = item["line_type"]
            line.description = item["description"]
            line.quantity = item["quantity"]
            line.unit_cost = item["unit_cost"]
            line.total_cost = item["total_cost"]
            line.notes = item["notes"]
            line.updated_by_user_id = actor_user_id
            synced_lines.append(line)

        for line in existing_lines:
            if line.id is not None and line.id not in payload_ids:
                tenant_db.delete(line)

        return synced_lines

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

    def _get_base_currency_or_raise(self, tenant_db: Session) -> FinanceCurrency:
        currencies = tenant_db.query(FinanceCurrency).all()
        for currency in currencies:
            if getattr(currency, "is_base", False):
                return currency
        if currencies:
            return currencies[0]
        raise ValueError("No existe una moneda base configurada para finance")

    def _list_active_currencies(self, tenant_db: Session) -> list[FinanceCurrency]:
        currencies = tenant_db.query(FinanceCurrency).all()
        return [item for item in currencies if getattr(item, "is_active", True)]

    def _list_active_categories(self, tenant_db: Session) -> list[FinanceCategory]:
        categories = tenant_db.query(FinanceCategory).all()
        return [item for item in categories if getattr(item, "is_active", True)]

    def _list_active_accounts(self, tenant_db: Session) -> list[FinanceAccount]:
        accounts = tenant_db.query(FinanceAccount).all()
        return [item for item in accounts if getattr(item, "is_active", True)]

    def _resolve_currency_default(
        self,
        preferred_currency_id: int | None,
        currencies: list[FinanceCurrency],
    ) -> tuple[FinanceCurrency | None, str | None]:
        if preferred_currency_id is not None:
            for currency in currencies:
                if currency.id == preferred_currency_id:
                    return currency, "policy"
        for currency in currencies:
            if getattr(currency, "is_base", False):
                return currency, "base"
        for currency in currencies:
            if getattr(currency, "code", "").upper() == "CLP":
                return currency, "clp"
        if currencies:
            return currencies[0], "first_active"
        return None, None

    def _resolve_category_default(
        self,
        preferred_category_id: int | None,
        category_type: str,
        categories: list[FinanceCategory],
    ) -> tuple[FinanceCategory | None, str | None]:
        typed = [item for item in categories if item.category_type == category_type]
        if preferred_category_id is not None:
            for category in typed:
                if category.id == preferred_category_id:
                    return category, "policy"
        for preferred_name in self.FINANCE_SYNC_CATEGORY_DEFAULTS.get(category_type, ()):
            for category in typed:
                if category.name == preferred_name:
                    return category, "maintenance_default"
        if typed:
            ordered = sorted(
                typed,
                key=lambda item: (getattr(item, "sort_order", 100), getattr(item, "id", 0)),
            )
            return ordered[0], "first_active"
        return None, None

    def _resolve_account_default(
        self,
        preferred_account_id: int | None,
        currency_id: int | None,
        accounts: list[FinanceAccount],
    ) -> tuple[FinanceAccount | None, str | None]:
        candidates = accounts
        if currency_id is not None:
            matching_currency = [item for item in accounts if item.currency_id == currency_id]
            if matching_currency:
                candidates = matching_currency
        if preferred_account_id is not None:
            for account in candidates:
                if account.id == preferred_account_id:
                    return account, "policy"
        favorite_candidates = [item for item in candidates if getattr(item, "is_favorite", False)]
        if len(favorite_candidates) == 1:
            return favorite_candidates[0], "favorite"
        if len(candidates) == 1:
            return candidates[0], "single_match"
        return None, None

    def _build_work_order_label(self, work_order: MaintenanceWorkOrder) -> str:
        return f"#{work_order.id} · {work_order.title}"
