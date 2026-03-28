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
  getTenantFinanceReportOverview,
  type TenantFinanceReportBudgetVarianceItem,
  type TenantFinanceReportCategoryAmount,
  type TenantFinanceReportDailyCashflowItem,
  type TenantFinanceReportMonthlyTrendItem,
  type TenantFinanceReportOverviewResponse,
  type TenantFinanceReportPeriodComparison,
} from "../services/reportsService";

export function FinanceReportsPage() {
  const { session } = useTenantAuth();
  const [periodMonth, setPeriodMonth] = useState(buildMonthValue());
  const [trendMonths, setTrendMonths] = useState<3 | 6 | 12>(6);
  const [movementScope, setMovementScope] = useState<
    "all" | "reconciled" | "unreconciled" | "favorites" | "loan_linked"
  >("all");
  const [overview, setOverview] =
    useState<TenantFinanceReportOverviewResponse["data"] | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void loadOverview();
  }, [session?.accessToken, periodMonth, trendMonths, movementScope]);

  async function loadOverview() {
    if (!session?.accessToken) {
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await getTenantFinanceReportOverview(
        session.accessToken,
        buildPeriodMonthIso(periodMonth),
        trendMonths,
        movementScope
      );
      setOverview(response.data);
    } catch (rawError) {
      setOverview(null);
      setError(rawError as ApiError);
    } finally {
      setIsLoading(false);
    }
  }

  const transactionSnapshot = overview?.transaction_snapshot;
  const budgetSnapshot = overview?.budget_snapshot;
  const loanSnapshot = overview?.loan_snapshot;

  return (
    <div className="d-grid gap-4">
      <PageHeader
        eyebrow="Finance"
        title="Reportes"
        description="Lectura mensual consolidada de transacciones, presupuestos y cartera de préstamos."
      />

      <FinanceModuleNav />

      <PanelCard
        title="Periodo de análisis"
        subtitle="Primer slice de reportes: overview operativo mensual para cerrar lectura base del módulo."
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
          <div>
            <label className="form-label">Tendencia</label>
            <select
              className="form-select"
              value={String(trendMonths)}
              onChange={(event) =>
                setTrendMonths(Number(event.target.value) as 3 | 6 | 12)
              }
            >
              <option value="3">3 meses</option>
              <option value="6">6 meses</option>
              <option value="12">12 meses</option>
            </select>
          </div>
          <div>
            <label className="form-label">Foco movimientos</label>
            <select
              className="form-select"
              value={movementScope}
              onChange={(event) =>
                setMovementScope(
                  event.target.value as
                    | "all"
                    | "reconciled"
                    | "unreconciled"
                    | "favorites"
                    | "loan_linked"
                )
              }
            >
              <option value="all">Todos</option>
              <option value="reconciled">Conciliados</option>
              <option value="unreconciled">Pendientes</option>
              <option value="favorites">Favoritas</option>
              <option value="loan_linked">Ligados a préstamos</option>
            </select>
          </div>
          <div className="pt-4">
            <button
              className="btn btn-outline-primary"
              type="button"
              onClick={() => exportOverviewCsv(overview, periodMonth)}
              disabled={!overview}
            >
              Exportar CSV
            </button>
          </div>
          <div className="pt-4">
            <button
              className="btn btn-outline-secondary"
              type="button"
              onClick={() => exportOverviewJson(overview, periodMonth)}
              disabled={!overview}
            >
              Exportar JSON
            </button>
          </div>
        </div>
      </PanelCard>

      {isLoading ? <LoadingBlock label="Cargando reporte financiero..." /> : null}

      {error ? (
        <div className="d-grid gap-3">
          <ErrorState
            title="Reportes no disponibles"
            detail={error.payload?.detail || getApiErrorDisplayMessage(error)}
            requestId={error.payload?.request_id}
          />
          <FinanceSchemaSyncCallout error={error} onSynced={loadOverview} />
        </div>
      ) : null}

      <div className="tenant-portal-metrics">
        <MetricCard
          label="Ingresos"
          value={formatMoney(transactionSnapshot?.total_income || 0)}
          hint="Ingreso del período"
        />
        <MetricCard
          label="Egresos"
          value={formatMoney(transactionSnapshot?.total_expense || 0)}
          hint="Egreso del período"
        />
        <MetricCard
          label="Balance neto"
          value={formatMoney(transactionSnapshot?.net_balance || 0)}
          hint="Ingreso menos egreso"
        />
        <MetricCard
          label="Transacciones"
          value={transactionSnapshot?.total_transactions || 0}
          hint="Filtradas por mes"
        />
      </div>

      <div className="finance-report-grid">
        <PanelCard
          title="Actividad del período"
          subtitle={`Salud operativa del movimiento mensual bajo foco ${buildMovementScopeLabel(
            overview?.movement_scope || movementScope
          )}.`}
        >
          <dl className="finance-report-definition-list">
            <ReportLine
              label="Conciliadas"
              value={String(transactionSnapshot?.reconciled_count || 0)}
            />
            <ReportLine
              label="Pendientes conciliación"
              value={String(transactionSnapshot?.unreconciled_count || 0)}
            />
            <ReportLine
              label="Favoritas"
              value={String(transactionSnapshot?.favorite_count || 0)}
            />
            <ReportLine
              label="Ligadas a préstamos"
              value={String(transactionSnapshot?.loan_linked_count || 0)}
            />
          </dl>
        </PanelCard>

        <PanelCard
          title="Presupuesto vs real"
          subtitle="Resumen agregado del mes sobre categorías presupuestadas."
        >
          <dl className="finance-report-definition-list">
            <ReportLine
              label="Presupuestado"
              value={formatMoney(budgetSnapshot?.total_budgeted || 0)}
            />
            <ReportLine
              label="Real"
              value={formatMoney(budgetSnapshot?.total_actual || 0)}
            />
            <ReportLine
              label="Desviación"
              value={formatMoney(budgetSnapshot?.total_variance || 0)}
            />
            <ReportLine
              label="Sobre presupuesto"
              value={String(budgetSnapshot?.over_budget_count || 0)}
            />
            <ReportLine
              label="Dentro de presupuesto"
              value={String(budgetSnapshot?.within_budget_count || 0)}
            />
            <ReportLine
              label="Sin uso"
              value={String(budgetSnapshot?.unused_count || 0)}
            />
          </dl>
        </PanelCard>

        <PanelCard
          title="Cartera de préstamos"
          subtitle="Snapshot actual de préstamos prestados o recibidos."
        >
          <dl className="finance-report-definition-list">
            <ReportLine
              label="Saldo tomado"
              value={formatMoney(loanSnapshot?.borrowed_balance || 0)}
            />
            <ReportLine
              label="Saldo prestado"
              value={formatMoney(loanSnapshot?.lent_balance || 0)}
            />
            <ReportLine
              label="Capital total"
              value={formatMoney(loanSnapshot?.total_principal || 0)}
            />
            <ReportLine
              label="Abiertos"
              value={String(loanSnapshot?.open_items || 0)}
            />
            <ReportLine
              label="Liquidados"
              value={String(loanSnapshot?.settled_items || 0)}
            />
          </dl>
        </PanelCard>
      </div>

      <div className="finance-report-grid">
        <PanelCard
          title="Comparativa contra mes anterior"
          subtitle="Diferencia del período visible frente al corte inmediatamente anterior."
        >
          <PeriodComparisonPanel comparison={overview?.period_comparison || null} />
        </PanelCard>

        <PanelCard
          title="Top categorías ingreso"
          subtitle="Mayores ingresos del período por categoría."
        >
          <CategoryAmountList items={overview?.top_income_categories || []} emptyLabel="Sin ingresos categorizados en el período." />
        </PanelCard>

        <PanelCard
          title="Top categorías egreso"
          subtitle="Mayores egresos del período por categoría."
        >
          <CategoryAmountList items={overview?.top_expense_categories || []} emptyLabel="Sin egresos categorizados en el período." />
        </PanelCard>
      </div>

      <div className="finance-report-grid">
        <PanelCard
          title="Pulso diario de caja"
          subtitle="Serie corta para ver qué días concentraron flujo y presión operativa."
        >
          <DailyCashflowList items={overview?.daily_cashflow || []} />
        </PanelCard>

        <PanelCard
          title="Desvíos presupuestarios"
          subtitle="Categorías con mayor diferencia entre plan y real para priorizar revisión."
        >
          <BudgetVarianceTable items={overview?.budget_variances || []} />
        </PanelCard>
      </div>

      <PanelCard
        title="Tendencia reciente"
        subtitle="Lectura corta de 6 meses para no perder contexto entre cambios de período."
      >
        <MonthlyTrendTable items={overview?.monthly_trend || []} />
      </PanelCard>
    </div>
  );
}

function CategoryAmountList({
  items,
  emptyLabel,
}: {
  items: TenantFinanceReportCategoryAmount[];
  emptyLabel: string;
}) {
  if (items.length === 0) {
    return <p className="tenant-muted-text mb-0">{emptyLabel}</p>;
  }

  return (
    <div className="finance-balance-list">
      {items.map((item) => (
        <div key={`${item.category_type}-${item.category_id}`} className="finance-balance-list__item">
          <div>
            <div className="finance-balance-list__title">{item.category_name}</div>
            <div className="tenant-muted-text">{item.category_type}</div>
          </div>
          <div className="finance-balance-list__value">{formatMoney(item.total_amount)}</div>
        </div>
      ))}
    </div>
  );
}

function DailyCashflowList({
  items,
}: {
  items: TenantFinanceReportDailyCashflowItem[];
}) {
  if (items.length === 0) {
    return (
      <p className="tenant-muted-text mb-0">
        Sin actividad diaria relevante en el período.
      </p>
    );
  }

  return (
    <div className="finance-balance-list">
      {items.map((item) => (
        <div key={item.day} className="finance-balance-list__item">
          <div>
            <div className="finance-balance-list__title">
              {formatDay(item.day)}
            </div>
            <div className="tenant-muted-text">
              {item.transaction_count} movimientos · Ing. {formatMoney(item.income_total)} · Egr.{" "}
              {formatMoney(item.expense_total)}
            </div>
          </div>
          <div className="finance-balance-list__value">
            {formatSignedMoney(item.net_total)}
          </div>
        </div>
      ))}
    </div>
  );
}

function BudgetVarianceTable({
  items,
}: {
  items: TenantFinanceReportBudgetVarianceItem[];
}) {
  if (items.length === 0) {
    return (
      <p className="tenant-muted-text mb-0">
        Sin desvíos presupuestarios para el período seleccionado.
      </p>
    );
  }

  return (
    <div className="table-responsive">
      <table className="table table-hover align-middle mb-0">
        <thead>
          <tr>
            <th>Categoría</th>
            <th>Estado</th>
            <th className="text-end">Plan</th>
            <th className="text-end">Real</th>
            <th className="text-end">Desvío</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.category_id}>
              <td>
                <div className="fw-semibold">{item.category_name}</div>
                <div className="tenant-muted-text">
                  {item.category_type} · {item.is_active ? "activa" : "inactiva"}
                </div>
              </td>
              <td>
                <span className={buildBudgetStatusClassName(item.budget_status)}>
                  {buildBudgetStatusLabel(item.budget_status)}
                </span>
              </td>
              <td className="text-end">{formatMoney(item.planned_amount)}</td>
              <td className="text-end">{formatMoney(item.actual_amount)}</td>
              <td className="text-end">{formatSignedMoney(item.variance_amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PeriodComparisonPanel({
  comparison,
}: {
  comparison: TenantFinanceReportPeriodComparison | null;
}) {
  if (!comparison) {
    return (
      <p className="tenant-muted-text mb-0">
        Sin comparativa disponible para el período seleccionado.
      </p>
    );
  }

  return (
    <dl className="finance-report-definition-list">
      <ReportLine
        label={`Ingresos vs ${formatMonthLabel(comparison.previous_period_month)}`}
        value={formatSignedMoney(comparison.income_delta)}
      />
      <ReportLine
        label={`Egresos vs ${formatMonthLabel(comparison.previous_period_month)}`}
        value={formatSignedMoney(comparison.expense_delta)}
      />
      <ReportLine
        label="Balance neto"
        value={formatSignedMoney(comparison.net_balance_delta)}
      />
      <ReportLine
        label="Transacciones"
        value={formatSignedInteger(comparison.transaction_delta)}
      />
      <ReportLine
        label="Presupuestado"
        value={formatSignedMoney(comparison.budgeted_delta)}
      />
      <ReportLine
        label="Desviación presup."
        value={formatSignedMoney(comparison.variance_delta)}
      />
    </dl>
  );
}

function MonthlyTrendTable({
  items,
}: {
  items: TenantFinanceReportMonthlyTrendItem[];
}) {
  if (items.length === 0) {
    return (
      <p className="tenant-muted-text mb-0">
        Sin tendencia disponible para este tenant.
      </p>
    );
  }

  return (
    <div className="table-responsive">
      <table className="table table-hover align-middle mb-0">
        <thead>
          <tr>
            <th>Mes</th>
            <th className="text-end">Ingresos</th>
            <th className="text-end">Egresos</th>
            <th className="text-end">Balance</th>
            <th className="text-end">Trans.</th>
            <th className="text-end">Presup.</th>
            <th className="text-end">Real</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.period_month}>
              <td className="fw-semibold">{formatMonthLabel(item.period_month)}</td>
              <td className="text-end">{formatMoney(item.total_income)}</td>
              <td className="text-end">{formatMoney(item.total_expense)}</td>
              <td className="text-end">{formatSignedMoney(item.net_balance)}</td>
              <td className="text-end">{item.total_transactions}</td>
              <td className="text-end">{formatMoney(item.total_budgeted)}</td>
              <td className="text-end">{formatMoney(item.total_actual)}</td>
            </tr>
          ))}
        </tbody>
      </table>
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

function formatSignedMoney(value: number) {
  const formatted = formatMoney(Math.abs(value));
  return value > 0 ? `+${formatted}` : value < 0 ? `-${formatted}` : formatted;
}

function formatSignedInteger(value: number) {
  return value > 0 ? `+${value}` : String(value);
}

function formatDay(day: string) {
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "short",
  }).format(new Date(`${day}T00:00:00`));
}

function formatMonthLabel(monthIso: string) {
  return new Intl.DateTimeFormat("es-CL", {
    month: "short",
    year: "numeric",
  }).format(new Date(`${monthIso}T00:00:00`));
}

function buildBudgetStatusLabel(status: string) {
  switch (status) {
    case "over_budget":
      return "sobre presupuesto";
    case "within_budget":
      return "dentro";
    case "unused":
      return "sin uso";
    case "inactive":
      return "inactiva";
    default:
      return status;
  }
}

function buildBudgetStatusClassName(status: string) {
  return `finance-status-pill ${
    status === "over_budget" ? "is-inactive" : "is-active"
  }`;
}

function exportOverviewCsv(
  overview: TenantFinanceReportOverviewResponse["data"] | null,
  periodMonth: string
) {
  if (!overview) {
    return;
  }

  const rows: string[][] = [
    ["Seccion", "Clave", "Valor"],
    ["periodo", "mes", overview.period_month],
    ["periodo", "foco_movimientos", overview.movement_scope],
    ["transacciones", "ingresos", String(overview.transaction_snapshot.total_income)],
    ["transacciones", "egresos", String(overview.transaction_snapshot.total_expense)],
    ["transacciones", "balance_neto", String(overview.transaction_snapshot.net_balance)],
    ["transacciones", "total", String(overview.transaction_snapshot.total_transactions)],
    ["presupuestos", "presupuestado", String(overview.budget_snapshot.total_budgeted)],
    ["presupuestos", "real", String(overview.budget_snapshot.total_actual)],
    ["presupuestos", "desviacion", String(overview.budget_snapshot.total_variance)],
    ["prestamos", "saldo_tomado", String(overview.loan_snapshot.borrowed_balance)],
    ["prestamos", "saldo_prestado", String(overview.loan_snapshot.lent_balance)],
  ];

  overview.daily_cashflow.forEach((item) => {
    rows.push([
      "pulso_diario",
      item.day,
      `${item.income_total}|${item.expense_total}|${item.net_total}|${item.transaction_count}`,
    ]);
  });

  overview.budget_variances.forEach((item) => {
    rows.push([
      "desvio_presupuesto",
      item.category_name,
      `${item.category_type}|${item.budget_status}|${item.planned_amount}|${item.actual_amount}|${item.variance_amount}`,
    ]);
  });

  overview.monthly_trend.forEach((item) => {
    rows.push([
      "tendencia_mensual",
      item.period_month,
      `${item.total_income}|${item.total_expense}|${item.net_balance}|${item.total_transactions}|${item.total_budgeted}|${item.total_actual}|${item.total_variance}`,
    ]);
  });

  const csv = rows
    .map((row) => row.map(escapeCsvValue).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `finance-report-${periodMonth}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function exportOverviewJson(
  overview: TenantFinanceReportOverviewResponse["data"] | null,
  periodMonth: string
) {
  if (!overview) {
    return;
  }

  const blob = new Blob([JSON.stringify(overview, null, 2)], {
    type: "application/json;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `finance-report-${periodMonth}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function escapeCsvValue(value: string) {
  if (value.includes(",") || value.includes("\"") || value.includes("\n")) {
    return `"${value.split("\"").join("\"\"")}"`;
  }
  return value;
}

function buildMovementScopeLabel(scope: string) {
  switch (scope) {
    case "reconciled":
      return "conciliado";
    case "unreconciled":
      return "pendiente";
    case "favorites":
      return "favoritas";
    case "loan_linked":
      return "ligado a préstamos";
    default:
      return "general";
  }
}
