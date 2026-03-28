import { useEffect, useState } from "react";
import { MetricCard } from "../../../../../components/common/MetricCard";
import { PageHeader } from "../../../../../components/common/PageHeader";
import { PanelCard } from "../../../../../components/common/PanelCard";
import { ErrorState } from "../../../../../components/feedback/ErrorState";
import { LoadingBlock } from "../../../../../components/feedback/LoadingBlock";
import { getApiErrorDisplayMessage } from "../../../../../services/api";
import { useTenantAuth } from "../../../../../store/tenant-auth-context";
import type { ApiError } from "../../../../../types";
import { FinanceModuleNav } from "../components/common/FinanceModuleNav";
import { FinanceSchemaSyncCallout } from "../components/common/FinanceSchemaSyncCallout";
import {
  getTenantFinancePlanningOverview,
  type TenantFinancePlanningBudgetFocusItem,
  type TenantFinancePlanningDayItem,
  type TenantFinancePlanningLoanDueItem,
  type TenantFinancePlanningOverviewResponse,
} from "../services/planningService";

export function FinanceCalendarPage() {
  const { session } = useTenantAuth();
  const [periodMonth, setPeriodMonth] = useState(buildMonthValue());
  const [overview, setOverview] =
    useState<TenantFinancePlanningOverviewResponse["data"] | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void loadOverview();
  }, [session?.accessToken, periodMonth]);

  async function loadOverview() {
    if (!session?.accessToken) {
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await getTenantFinancePlanningOverview(
        session.accessToken,
        buildPeriodMonthIso(periodMonth)
      );
      setOverview(response.data);
    } catch (rawError) {
      setOverview(null);
      setError(rawError as ApiError);
    } finally {
      setIsLoading(false);
    }
  }

  const summary = overview?.summary;

  return (
    <div className="d-grid gap-4">
      <PageHeader
        eyebrow="Finance"
        title="Planificación"
        description="Lectura mensual de flujo esperado: actividad diaria, vencimientos de préstamos y foco presupuestario."
      />

      <FinanceModuleNav />

      <PanelCard
        title="Periodo de planificación"
        subtitle="Primer slice real de planificación: mirada operativa del mes actual o seleccionado."
      >
        <div className="finance-inline-toolbar">
          <div>
            <label className="form-label">Mes</label>
            <input
              className="form-control"
              type="month"
              value={periodMonth}
              onChange={(event) => setPeriodMonth(event.target.value)}
            />
          </div>
        </div>
      </PanelCard>

      {isLoading ? <LoadingBlock label="Cargando planificación financiera..." /> : null}

      {error ? (
        <div className="d-grid gap-3">
          <ErrorState
            title="Planificación no disponible"
            detail={error.payload?.detail || getApiErrorDisplayMessage(error)}
            requestId={error.payload?.request_id}
          />
          <FinanceSchemaSyncCallout error={error} onSynced={loadOverview} />
        </div>
      ) : null}

      <div className="tenant-portal-metrics">
        <MetricCard
          label="Ingreso proyectado"
          value={formatMoney(summary?.total_income || 0)}
          hint="Movimiento real detectado en el mes"
        />
        <MetricCard
          label="Egreso proyectado"
          value={formatMoney(summary?.total_expense || 0)}
          hint="Gasto real detectado en el mes"
        />
        <MetricCard
          label="Cuotas por vencer"
          value={summary?.due_installments_count || 0}
          hint="Vencimientos del mes"
        />
        <MetricCard
          label="Flujo esperado préstamos"
          value={formatMoney(summary?.expected_loan_cashflow || 0)}
          hint="Saldo pendiente de cuotas del mes"
        />
      </div>

      <div className="finance-report-grid">
        <PanelCard
          title="Resumen del mes"
          subtitle="Balance general y presión esperada sobre el período."
        >
          <dl className="finance-report-definition-list">
            <ReportLine
              label="Balance neto"
              value={formatMoney(summary?.net_total || 0)}
            />
            <ReportLine
              label="Transacciones"
              value={String(summary?.total_transactions || 0)}
            />
            <ReportLine
              label="Cuotas pendientes"
              value={String(summary?.pending_installments_count || 0)}
            />
            <ReportLine
              label="Presupuestado"
              value={formatMoney(summary?.total_budgeted || 0)}
            />
            <ReportLine
              label="Real"
              value={formatMoney(summary?.total_actual || 0)}
            />
            <ReportLine
              label="Variación"
              value={formatMoney(summary?.total_variance || 0)}
            />
          </dl>
        </PanelCard>

        <PanelCard
          title="Días con señal operativa"
          subtitle="Solo se listan días con movimientos o cuotas por vencer."
        >
          <PlanningDayList items={overview?.calendar_days || []} />
        </PanelCard>
      </div>

      <div className="finance-report-grid">
        <PanelCard
          title="Cuotas del mes"
          subtitle="Vencimientos de préstamos detectados dentro del período seleccionado."
        >
          <PlanningLoanDueList items={overview?.loan_due_items || []} />
        </PanelCard>

        <PanelCard
          title="Foco presupuestario"
          subtitle="Categorías con mayor desvío absoluto para enfocar revisión."
        >
          <PlanningBudgetFocusList items={overview?.budget_focus || []} />
        </PanelCard>
      </div>
    </div>
  );
}

function PlanningDayList({ items }: { items: TenantFinancePlanningDayItem[] }) {
  if (items.length === 0) {
    return (
      <p className="tenant-muted-text mb-0">
        No hay días con señal operativa para el mes seleccionado.
      </p>
    );
  }

  return (
    <div className="finance-balance-list">
      {items.map((item) => (
        <div key={item.day} className="finance-balance-list__item">
          <div>
            <div className="finance-balance-list__title">
              {formatDate(item.day)}
            </div>
            <div className="tenant-muted-text">
              {item.transaction_count} transacciones / {item.due_installments_count} cuotas
            </div>
          </div>
          <div>
            <div className="finance-balance-list__value">
              {formatMoney(item.net_total)}
            </div>
            <div className="tenant-muted-text">
              Ingreso {formatMoney(item.income_total)} / Egreso {formatMoney(item.expense_total)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function PlanningLoanDueList({
  items,
}: {
  items: TenantFinancePlanningLoanDueItem[];
}) {
  if (items.length === 0) {
    return (
      <p className="tenant-muted-text mb-0">
        No hay cuotas con vencimiento dentro del mes seleccionado.
      </p>
    );
  }

  return (
    <div className="finance-balance-list">
      {items.map((item) => (
        <div
          key={`${item.loan_id}-${item.installment_id}`}
          className="finance-balance-list__item"
        >
          <div>
            <div className="finance-balance-list__title">
              {item.loan_name} · cuota #{item.installment_number}
            </div>
            <div className="tenant-muted-text">
              {formatDate(item.due_date)} · {item.loan_type} · {item.installment_status}
            </div>
          </div>
          <div>
            <div className="finance-balance-list__value">
              {formatMoney(item.remaining_amount)}
            </div>
            <div className="tenant-muted-text">
              Plan {formatMoney(item.planned_amount)} / Pagado {formatMoney(item.paid_amount)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function PlanningBudgetFocusList({
  items,
}: {
  items: TenantFinancePlanningBudgetFocusItem[];
}) {
  if (items.length === 0) {
    return (
      <p className="tenant-muted-text mb-0">
        No hay presupuestos activos para construir foco operativo.
      </p>
    );
  }

  return (
    <div className="finance-balance-list">
      {items.map((item) => (
        <div key={item.category_id} className="finance-balance-list__item">
          <div>
            <div className="finance-balance-list__title">{item.category_name}</div>
            <div className="tenant-muted-text">
              {item.category_type} · {item.budget_status}
            </div>
          </div>
          <div>
            <div className="finance-balance-list__value">
              {formatMoney(item.variance_amount)}
            </div>
            <div className="tenant-muted-text">
              Plan {formatMoney(item.planned_amount)} / Real {formatMoney(item.actual_amount)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ReportLine({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </>
  );
}

function buildMonthValue(dateValue = new Date()) {
  const year = dateValue.getFullYear();
  const month = String(dateValue.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function buildPeriodMonthIso(monthValue: string) {
  return `${monthValue}-01`;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "medium",
  }).format(new Date(`${value}T00:00:00`));
}
