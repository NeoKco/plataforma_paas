import { useEffect, useState } from "react";
import { MetricCard } from "../../../../../components/common/MetricCard";
import { PageHeader } from "../../../../../components/common/PageHeader";
import { PanelCard } from "../../../../../components/common/PanelCard";
import { ErrorState } from "../../../../../components/feedback/ErrorState";
import { LoadingBlock } from "../../../../../components/feedback/LoadingBlock";
import { getApiErrorDisplayMessage } from "../../../../../services/api";
import { useLanguage } from "../../../../../store/language-context";
import { useTenantAuth } from "../../../../../store/tenant-auth-context";
import type { ApiError } from "../../../../../types";
import { FinanceModuleNav } from "../components/common/FinanceModuleNav";
import { FinanceSchemaSyncCallout } from "../components/common/FinanceSchemaSyncCallout";
import {
  getTenantFinanceCurrencies,
  type TenantFinanceCurrency,
} from "../services/currenciesService";
import {
  getTenantFinanceReportOverview,
  type TenantFinanceReportBudgetVarianceItem,
  type TenantFinanceReportCategoryAmount,
  type TenantFinanceReportDimensionAmount,
  type TenantFinanceReportCustomRangeComparison,
  type TenantFinanceReportDailyCashflowItem,
  type TenantFinanceReportMonthlyTrendItem,
  type TenantFinanceReportOverviewResponse,
  type TenantFinanceReportPeriodComparison,
  type TenantFinanceReportHorizonComparison,
  type TenantFinanceReportTrendSummary,
  type TenantFinanceReportYearToDateComparison,
} from "../services/reportsService";

export function FinanceReportsPage() {
  const { session } = useTenantAuth();
  const { language } = useLanguage();
  const [periodMonth, setPeriodMonth] = useState(buildMonthValue());
  const [comparePeriodMonth, setComparePeriodMonth] = useState(
    buildPreviousMonthValue()
  );
  const [customCompareStartMonth, setCustomCompareStartMonth] = useState("");
  const [customCompareEndMonth, setCustomCompareEndMonth] = useState("");
  const [trendMonths, setTrendMonths] = useState<3 | 6 | 12>(6);
  const [movementScope, setMovementScope] = useState<
    "all" | "reconciled" | "unreconciled" | "favorites" | "loan_linked"
  >("all");
  const [analysisScope, setAnalysisScope] = useState<
    "period" | "horizon" | "year_to_date"
  >("period");
  const [analysisDimension, setAnalysisDimension] = useState<
    "category" | "account" | "project" | "beneficiary" | "person" | "tag"
  >("category");
  const [budgetCategoryScope, setBudgetCategoryScope] = useState<
    "all" | "income" | "expense"
  >("all");
  const [budgetStatusFilter, setBudgetStatusFilter] = useState<
    "all" | "over_budget" | "within_budget" | "unused" | "inactive"
  >("all");
  const [overview, setOverview] =
    useState<TenantFinanceReportOverviewResponse["data"] | null>(null);
  const [currencies, setCurrencies] = useState<TenantFinanceCurrency[]>([]);
  const [error, setError] = useState<ApiError | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const baseCurrencyCode =
    currencies.find((currency) => currency.is_base)?.code ||
    currencies[0]?.code ||
    "USD";

  useEffect(() => {
    void loadOverview();
  }, [
    session?.accessToken,
    periodMonth,
    comparePeriodMonth,
    customCompareStartMonth,
    customCompareEndMonth,
    trendMonths,
    movementScope,
    analysisScope,
    analysisDimension,
    budgetCategoryScope,
    budgetStatusFilter,
  ]);

  async function loadOverview() {
    if (!session?.accessToken) {
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const [overviewResponse, currenciesResponse] = await Promise.all([
        getTenantFinanceReportOverview(
          session.accessToken,
          buildPeriodMonthIso(periodMonth),
          buildPeriodMonthIso(comparePeriodMonth),
          customCompareStartMonth ? buildPeriodMonthIso(customCompareStartMonth) : null,
          customCompareEndMonth ? buildPeriodMonthIso(customCompareEndMonth) : null,
          trendMonths,
          movementScope,
          analysisScope,
          analysisDimension,
          budgetCategoryScope,
          budgetStatusFilter
        ),
        getTenantFinanceCurrencies(session.accessToken, false),
      ]);
      setOverview(overviewResponse.data);
      setCurrencies(currenciesResponse.data);
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
            <label className="form-label">Comparar contra</label>
            <input
              className="form-control"
              type="month"
              value={comparePeriodMonth}
              onChange={(event) => setComparePeriodMonth(event.target.value)}
            />
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
          <div>
            <label className="form-label">Lectura categorías</label>
            <select
              className="form-select"
              value={analysisScope}
              onChange={(event) =>
                setAnalysisScope(
                  event.target.value as "period" | "horizon" | "year_to_date"
                )
              }
            >
              <option value="period">Período</option>
              <option value="horizon">Horizonte</option>
              <option value="year_to_date">Acumulado anual</option>
            </select>
          </div>
          <div>
            <label className="form-label">Dimensión ranking</label>
            <select
              className="form-select"
              value={analysisDimension}
              onChange={(event) =>
                setAnalysisDimension(
                  event.target.value as
                    | "category"
                    | "account"
                    | "project"
                    | "beneficiary"
                    | "person"
                    | "tag"
                )
              }
            >
              <option value="category">Categoría</option>
              <option value="account">Cuenta</option>
              <option value="project">Proyecto</option>
              <option value="beneficiary">Beneficiario</option>
              <option value="person">Persona</option>
              <option value="tag">Etiqueta</option>
            </select>
          </div>
          <div>
            <label className="form-label">Rango arbitrario desde</label>
            <input
              className="form-control"
              type="month"
              value={customCompareStartMonth}
              onChange={(event) => setCustomCompareStartMonth(event.target.value)}
            />
          </div>
          <div>
            <label className="form-label">Rango arbitrario hasta</label>
            <input
              className="form-control"
              type="month"
              value={customCompareEndMonth}
              onChange={(event) => setCustomCompareEndMonth(event.target.value)}
            />
          </div>
          <div>
            <label className="form-label">Categoría presupuesto</label>
            <select
              className="form-select"
              value={budgetCategoryScope}
              onChange={(event) =>
                setBudgetCategoryScope(
                  event.target.value as "all" | "income" | "expense"
                )
              }
            >
              <option value="all">Todas</option>
              <option value="income">Ingreso</option>
              <option value="expense">Egreso</option>
            </select>
          </div>
          <div>
            <label className="form-label">Estado presupuesto</label>
            <select
              className="form-select"
              value={budgetStatusFilter}
              onChange={(event) =>
                setBudgetStatusFilter(
                  event.target.value as
                    | "all"
                    | "over_budget"
                    | "within_budget"
                    | "unused"
                    | "inactive"
                )
              }
            >
              <option value="all">Todos</option>
              <option value="over_budget">Sobre presupuesto</option>
              <option value="within_budget">Dentro</option>
              <option value="unused">Sin uso</option>
              <option value="inactive">Inactiva</option>
            </select>
          </div>
          <div className="pt-4">
            <button
              className="btn btn-outline-primary"
              type="button"
              onClick={() =>
                exportOverviewCsv(overview, periodMonth, comparePeriodMonth)
              }
              disabled={!overview}
            >
              Exportar CSV enriquecido
            </button>
          </div>
          <div className="pt-4">
            <button
              className="btn btn-outline-secondary"
              type="button"
              onClick={() =>
                exportOverviewJson(overview, periodMonth, comparePeriodMonth)
              }
              disabled={!overview}
            >
              Exportar JSON enriquecido
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
          value={formatMoney(transactionSnapshot?.total_income || 0, baseCurrencyCode, language)}
          hint="Ingreso del período"
        />
        <MetricCard
          label="Egresos"
          value={formatMoney(transactionSnapshot?.total_expense || 0, baseCurrencyCode, language)}
          hint="Egreso del período"
        />
        <MetricCard
          label="Balance neto"
          value={formatMoney(transactionSnapshot?.net_balance || 0, baseCurrencyCode, language)}
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
          subtitle={`Resumen agregado del mes sobre presupuesto ${buildBudgetScopeLabel(
            overview?.budget_category_scope || budgetCategoryScope
          )} y estado ${buildBudgetStatusFilterLabel(
            overview?.budget_status_filter || budgetStatusFilter
          )}.`}
        >
          <dl className="finance-report-definition-list">
            <ReportLine
              label="Presupuestado"
              value={formatMoney(budgetSnapshot?.total_budgeted || 0, baseCurrencyCode, language)}
            />
            <ReportLine
              label="Real"
              value={formatMoney(budgetSnapshot?.total_actual || 0, baseCurrencyCode, language)}
            />
            <ReportLine
              label="Desviación"
              value={formatMoney(budgetSnapshot?.total_variance || 0, baseCurrencyCode, language)}
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
              value={formatMoney(loanSnapshot?.borrowed_balance || 0, baseCurrencyCode, language)}
            />
            <ReportLine
              label="Saldo prestado"
              value={formatMoney(loanSnapshot?.lent_balance || 0, baseCurrencyCode, language)}
            />
            <ReportLine
              label="Capital total"
              value={formatMoney(loanSnapshot?.total_principal || 0, baseCurrencyCode, language)}
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
          title="Comparativa contra otro período"
          subtitle="Diferencia del período visible frente al mes de comparación seleccionado."
        >
          <PeriodComparisonPanel
            comparison={overview?.period_comparison || null}
            currencyCode={baseCurrencyCode}
            language={language}
          />
        </PanelCard>

        <PanelCard
          title="Top categorías ingreso"
          subtitle={`Mayores ingresos por ${buildAnalysisDimensionLabel(
            overview?.analysis_dimension || analysisDimension
          )} según lectura ${buildAnalysisScopeLabel(
            overview?.analysis_scope || analysisScope
          )}.`}
        >
          <DimensionAmountList
            items={overview?.top_income_breakdown || []}
            emptyLabel="Sin ingresos analíticos para la lectura seleccionada."
            currencyCode={baseCurrencyCode}
            language={language}
          />
        </PanelCard>

        <PanelCard
          title="Top categorías egreso"
          subtitle={`Mayores egresos por ${buildAnalysisDimensionLabel(
            overview?.analysis_dimension || analysisDimension
          )} según lectura ${buildAnalysisScopeLabel(
            overview?.analysis_scope || analysisScope
          )}.`}
        >
          <DimensionAmountList
            items={overview?.top_expense_breakdown || []}
            emptyLabel="Sin egresos analíticos para la lectura seleccionada."
            currencyCode={baseCurrencyCode}
            language={language}
          />
        </PanelCard>
      </div>

      <div className="finance-report-grid">
        <PanelCard
          title="Pulso diario de caja"
          subtitle="Serie corta para ver qué días concentraron flujo y presión operativa."
        >
          <DailyCashflowList
            items={overview?.daily_cashflow || []}
            currencyCode={baseCurrencyCode}
            language={language}
          />
        </PanelCard>

        <PanelCard
          title="Desvíos presupuestarios"
          subtitle="Categorías con mayor diferencia entre plan y real para priorizar revisión."
        >
          <BudgetVarianceTable
            items={overview?.budget_variances || []}
            currencyCode={baseCurrencyCode}
            language={language}
          />
        </PanelCard>
      </div>

      <PanelCard
        title="Tendencia reciente"
        subtitle="Lectura corta de 6 meses para no perder contexto entre cambios de período."
      >
        <MonthlyTrendTable
          items={overview?.monthly_trend || []}
          currencyCode={baseCurrencyCode}
          language={language}
        />
      </PanelCard>

      <PanelCard
        title="Resumen del horizonte"
        subtitle="Comparativa ejecutiva del rango seleccionado para no depender solo de la tabla mensual."
      >
        <TrendSummaryPanel
          summary={overview?.trend_summary || null}
          currencyCode={baseCurrencyCode}
          language={language}
        />
      </PanelCard>

      <PanelCard
        title="Comparativa del horizonte"
        subtitle="Contrasta el rango visible completo contra otro rango equivalente cerrado en el mes comparado."
      >
        <HorizonComparisonPanel
          comparison={overview?.horizon_comparison || null}
          currencyCode={baseCurrencyCode}
          language={language}
        />
      </PanelCard>

      <PanelCard
        title="Acumulado anual"
        subtitle="Compara enero -> mes visible contra enero -> mes comparado para lectura ejecutiva anual."
      >
        <YearToDateComparisonPanel
          comparison={overview?.year_to_date_comparison || null}
          currencyCode={baseCurrencyCode}
          language={language}
        />
      </PanelCard>

      <PanelCard
        title="Comparativa rango arbitrario"
        subtitle="Contrasta la lectura activa actual contra un rango manual de meses si fue definido."
      >
        <CustomRangeComparisonPanel
          comparison={overview?.custom_range_comparison || null}
          currencyCode={baseCurrencyCode}
          language={language}
        />
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

function DimensionAmountList({
  items,
  emptyLabel,
  currencyCode,
  language,
}: {
  items: TenantFinanceReportDimensionAmount[];
  emptyLabel: string;
  currencyCode: string;
  language: "es" | "en";
}) {
  if (items.length === 0) {
    return <p className="tenant-muted-text mb-0">{emptyLabel}</p>;
  }

  return (
    <div className="finance-balance-list">
      {items.map((item) => (
        <div
          key={`${item.transaction_type}-${item.entity_type}-${item.entity_id ?? "none"}-${item.entity_name}`}
          className="finance-balance-list__item"
        >
          <div>
            <div className="finance-balance-list__title">{item.entity_name}</div>
            <div className="tenant-muted-text">{buildAnalysisDimensionLabel(item.entity_type)}</div>
          </div>
          <div className="finance-balance-list__value">
            {formatMoney(item.total_amount, currencyCode, language)}
          </div>
        </div>
      ))}
    </div>
  );
}

function DailyCashflowList({
  items,
  currencyCode,
  language,
}: {
  items: TenantFinanceReportDailyCashflowItem[];
  currencyCode: string;
  language: "es" | "en";
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
              {item.transaction_count} movimientos · Ing. {formatMoney(item.income_total, currencyCode, language)} · Egr.{" "}
              {formatMoney(item.expense_total, currencyCode, language)}
            </div>
          </div>
          <div className="finance-balance-list__value">
            {formatSignedMoney(item.net_total, currencyCode, language)}
          </div>
        </div>
      ))}
    </div>
  );
}

function BudgetVarianceTable({
  items,
  currencyCode,
  language,
}: {
  items: TenantFinanceReportBudgetVarianceItem[];
  currencyCode: string;
  language: "es" | "en";
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
              <td className="text-end">{formatMoney(item.planned_amount, currencyCode, language)}</td>
              <td className="text-end">{formatMoney(item.actual_amount, currencyCode, language)}</td>
              <td className="text-end">{formatSignedMoney(item.variance_amount, currencyCode, language)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PeriodComparisonPanel({
  comparison,
  currencyCode,
  language,
}: {
  comparison: TenantFinanceReportPeriodComparison | null;
  currencyCode: string;
  language: "es" | "en";
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
        label={`Ingresos vs ${formatMonthLabel(comparison.compare_period_month)}`}
        value={formatSignedMoney(comparison.income_delta, currencyCode, language)}
      />
      <ReportLine
        label={`Egresos vs ${formatMonthLabel(comparison.compare_period_month)}`}
        value={formatSignedMoney(comparison.expense_delta, currencyCode, language)}
      />
      <ReportLine
        label="Balance neto"
        value={formatSignedMoney(comparison.net_balance_delta, currencyCode, language)}
      />
      <ReportLine
        label="Transacciones"
        value={formatSignedInteger(comparison.transaction_delta)}
      />
      <ReportLine
        label="Presupuestado"
        value={formatSignedMoney(comparison.budgeted_delta, currencyCode, language)}
      />
      <ReportLine
        label="Desviación presup."
        value={formatSignedMoney(comparison.variance_delta, currencyCode, language)}
      />
      <ReportLine
        label="Período comparado"
        value={formatMonthLabel(comparison.compare_period_month)}
      />
    </dl>
  );
}

function MonthlyTrendTable({
  items,
  currencyCode,
  language,
}: {
  items: TenantFinanceReportMonthlyTrendItem[];
  currencyCode: string;
  language: "es" | "en";
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
              <td className="text-end">{formatMoney(item.total_income, currencyCode, language)}</td>
              <td className="text-end">{formatMoney(item.total_expense, currencyCode, language)}</td>
              <td className="text-end">{formatSignedMoney(item.net_balance, currencyCode, language)}</td>
              <td className="text-end">{item.total_transactions}</td>
              <td className="text-end">{formatMoney(item.total_budgeted, currencyCode, language)}</td>
              <td className="text-end">{formatMoney(item.total_actual, currencyCode, language)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TrendSummaryPanel({
  summary,
  currencyCode,
  language,
}: {
  summary: TenantFinanceReportTrendSummary | null;
  currencyCode: string;
  language: "es" | "en";
}) {
  if (!summary || summary.months_covered === 0) {
    return (
      <p className="tenant-muted-text mb-0">
        Sin resumen comparativo para el horizonte seleccionado.
      </p>
    );
  }

  return (
    <dl className="finance-report-definition-list">
      <ReportLine
        label="Meses cubiertos"
        value={String(summary.months_covered)}
      />
      <ReportLine
        label="Ingreso promedio"
        value={formatMoney(summary.average_income, currencyCode, language)}
      />
      <ReportLine
        label="Egreso promedio"
        value={formatMoney(summary.average_expense, currencyCode, language)}
      />
      <ReportLine
        label="Balance promedio"
        value={formatSignedMoney(summary.average_net_balance, currencyCode, language)}
      />
      <ReportLine
        label="Mejor mes"
        value={buildTrendMonthValue(summary.best_period_month, summary.best_net_balance, currencyCode, language)}
      />
      <ReportLine
        label="Peor mes"
        value={buildTrendMonthValue(summary.worst_period_month, summary.worst_net_balance, currencyCode, language)}
      />
      <ReportLine
        label="Delta vs primer mes"
        value={formatSignedMoney(summary.net_balance_delta_vs_first, currencyCode, language)}
      />
    </dl>
  );
}

function HorizonComparisonPanel({
  comparison,
  currencyCode,
  language,
}: {
  comparison: TenantFinanceReportHorizonComparison | null;
  currencyCode: string;
  language: "es" | "en";
}) {
  if (!comparison || comparison.compare_months_covered === 0) {
    return (
      <p className="tenant-muted-text mb-0">
        Sin comparativa de horizonte para el rango seleccionado.
      </p>
    );
  }

  return (
    <dl className="finance-report-definition-list">
      <ReportLine
        label="Horizonte actual"
        value={buildPeriodRangeLabel(
          comparison.current_first_period_month,
          comparison.current_last_period_month
        )}
      />
      <ReportLine
        label="Horizonte comparado"
        value={buildPeriodRangeLabel(
          comparison.compare_first_period_month,
          comparison.compare_last_period_month
        )}
      />
      <ReportLine
        label="Ingreso total vs rango"
        value={formatSignedMoney(comparison.total_income_delta_vs_compare, currencyCode, language)}
      />
      <ReportLine
        label="Egreso total vs rango"
        value={formatSignedMoney(comparison.total_expense_delta_vs_compare, currencyCode, language)}
      />
      <ReportLine
        label="Balance total vs rango"
        value={formatSignedMoney(comparison.total_net_balance_delta_vs_compare, currencyCode, language)}
      />
      <ReportLine
        label="Promedio balance vs rango"
        value={formatSignedMoney(comparison.average_net_balance_delta_vs_compare, currencyCode, language)}
      />
    </dl>
  );
}

function YearToDateComparisonPanel({
  comparison,
  currencyCode,
  language,
}: {
  comparison: TenantFinanceReportYearToDateComparison | null;
  currencyCode: string;
  language: "es" | "en";
}) {
  if (!comparison || comparison.current_months_covered === 0) {
    return (
      <p className="tenant-muted-text mb-0">
        Sin acumulado anual disponible para el período seleccionado.
      </p>
    );
  }

  return (
    <dl className="finance-report-definition-list">
      <ReportLine
        label="Acumulado actual"
        value={buildPeriodRangeLabel(
          comparison.current_first_period_month,
          comparison.current_last_period_month
        )}
      />
      <ReportLine
        label="Acumulado comparado"
        value={buildPeriodRangeLabel(
          comparison.compare_first_period_month,
          comparison.compare_last_period_month
        )}
      />
      <ReportLine
        label="Ingresos YTD vs comparado"
        value={formatSignedMoney(comparison.total_income_delta_vs_compare, currencyCode, language)}
      />
      <ReportLine
        label="Egresos YTD vs comparado"
        value={formatSignedMoney(comparison.total_expense_delta_vs_compare, currencyCode, language)}
      />
      <ReportLine
        label="Balance YTD vs comparado"
        value={formatSignedMoney(comparison.total_net_balance_delta_vs_compare, currencyCode, language)}
      />
    </dl>
  );
}

function CustomRangeComparisonPanel({
  comparison,
  currencyCode,
  language,
}: {
  comparison: TenantFinanceReportCustomRangeComparison | null;
  currencyCode: string;
  language: "es" | "en";
}) {
  if (!comparison) {
    return (
      <p className="tenant-muted-text mb-0">
        Define `desde` y `hasta` para comparar contra un rango arbitrario.
      </p>
    );
  }

  return (
    <dl className="finance-report-definition-list">
      <ReportLine
        label="Lectura actual"
        value={`${buildAnalysisScopeLabel(comparison.current_label)} · ${buildPeriodRangeLabel(
          comparison.current_first_period_month,
          comparison.current_last_period_month
        )}`}
      />
      <ReportLine
        label="Rango arbitrario"
        value={buildPeriodRangeLabel(
          comparison.custom_first_period_month,
          comparison.custom_last_period_month
        )}
      />
      <ReportLine
        label="Ingresos vs rango"
        value={formatSignedMoney(comparison.total_income_delta_vs_custom, currencyCode, language)}
      />
      <ReportLine
        label="Egresos vs rango"
        value={formatSignedMoney(comparison.total_expense_delta_vs_custom, currencyCode, language)}
      />
      <ReportLine
        label="Balance vs rango"
        value={formatSignedMoney(comparison.total_net_balance_delta_vs_custom, currencyCode, language)}
      />
    </dl>
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

function buildPreviousMonthValue(dateValue = new Date()) {
  const previousMonth = new Date(dateValue.getFullYear(), dateValue.getMonth() - 1, 1);
  const year = previousMonth.getFullYear();
  const month = String(previousMonth.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function buildPeriodMonthIso(monthValue: string) {
  return `${monthValue}-01`;
}

function formatMoney(
  value: number,
  currencyCode = "USD",
  language: "es" | "en" = "es"
) {
  return new Intl.NumberFormat(language === "es" ? "es-CL" : "en-US", {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: 2,
  }).format(value);
}

function formatSignedMoney(
  value: number,
  currencyCode = "USD",
  language: "es" | "en" = "es"
) {
  const formatted = formatMoney(Math.abs(value), currencyCode, language);
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
  periodMonth: string,
  comparePeriodMonth: string
) {
  if (!overview) {
    return;
  }

  const rows: string[][] = [
    ["Seccion", "Clave", "Valor"],
    ["periodo", "mes", overview.period_month],
    ["periodo", "comparar_contra", comparePeriodMonth],
    ["periodo", "rango_arbitrario_desde", overview.custom_range_comparison?.custom_first_period_month || ""],
    ["periodo", "rango_arbitrario_hasta", overview.custom_range_comparison?.custom_last_period_month || ""],
    ["periodo", "foco_movimientos", overview.movement_scope],
    ["periodo", "lectura_categorias", overview.analysis_scope],
    ["periodo", "dimension_ranking", overview.analysis_dimension],
    ["periodo", "foco_presupuesto_tipo", overview.budget_category_scope],
    ["periodo", "foco_presupuesto_estado", overview.budget_status_filter],
    ["transacciones", "ingresos", String(overview.transaction_snapshot.total_income)],
    ["transacciones", "egresos", String(overview.transaction_snapshot.total_expense)],
    ["transacciones", "balance_neto", String(overview.transaction_snapshot.net_balance)],
    ["transacciones", "total", String(overview.transaction_snapshot.total_transactions)],
    ["presupuestos", "presupuestado", String(overview.budget_snapshot.total_budgeted)],
    ["presupuestos", "real", String(overview.budget_snapshot.total_actual)],
    ["presupuestos", "desviacion", String(overview.budget_snapshot.total_variance)],
    ["prestamos", "saldo_tomado", String(overview.loan_snapshot.borrowed_balance)],
    ["prestamos", "saldo_prestado", String(overview.loan_snapshot.lent_balance)],
    [
      "comparativa_periodo",
      "mes_comparado",
      overview.period_comparison.compare_period_month,
    ],
    [
      "comparativa_periodo",
      "delta_ingresos",
      String(overview.period_comparison.income_delta),
    ],
    [
      "comparativa_periodo",
      "delta_egresos",
      String(overview.period_comparison.expense_delta),
    ],
    [
      "comparativa_periodo",
      "delta_balance",
      String(overview.period_comparison.net_balance_delta),
    ],
    [
      "comparativa_horizonte",
      "rango_actual",
      `${overview.horizon_comparison.current_first_period_month}|${overview.horizon_comparison.current_last_period_month}`,
    ],
    [
      "comparativa_horizonte",
      "rango_comparado",
      `${overview.horizon_comparison.compare_first_period_month}|${overview.horizon_comparison.compare_last_period_month}`,
    ],
    [
      "comparativa_horizonte",
      "delta_ingresos",
      String(overview.horizon_comparison.total_income_delta_vs_compare),
    ],
    [
      "comparativa_horizonte",
      "delta_egresos",
      String(overview.horizon_comparison.total_expense_delta_vs_compare),
    ],
    [
      "comparativa_horizonte",
      "delta_balance",
      String(overview.horizon_comparison.total_net_balance_delta_vs_compare),
    ],
    [
      "acumulado_anual",
      "rango_actual",
      `${overview.year_to_date_comparison.current_first_period_month}|${overview.year_to_date_comparison.current_last_period_month}`,
    ],
    [
      "acumulado_anual",
      "rango_comparado",
      `${overview.year_to_date_comparison.compare_first_period_month}|${overview.year_to_date_comparison.compare_last_period_month}`,
    ],
    [
      "acumulado_anual",
      "delta_ingresos",
      String(overview.year_to_date_comparison.total_income_delta_vs_compare),
    ],
    [
      "acumulado_anual",
      "delta_egresos",
      String(overview.year_to_date_comparison.total_expense_delta_vs_compare),
    ],
    [
      "acumulado_anual",
      "delta_balance",
      String(overview.year_to_date_comparison.total_net_balance_delta_vs_compare),
    ],
  ];

  if (overview.custom_range_comparison) {
    rows.push([
      "comparativa_rango",
      "rango_actual",
      `${overview.custom_range_comparison.current_first_period_month}|${overview.custom_range_comparison.current_last_period_month}`,
    ]);
    rows.push([
      "comparativa_rango",
      "rango_custom",
      `${overview.custom_range_comparison.custom_first_period_month}|${overview.custom_range_comparison.custom_last_period_month}`,
    ]);
    rows.push([
      "comparativa_rango",
      "delta_ingresos",
      String(overview.custom_range_comparison.total_income_delta_vs_custom),
    ]);
    rows.push([
      "comparativa_rango",
      "delta_egresos",
      String(overview.custom_range_comparison.total_expense_delta_vs_custom),
    ]);
    rows.push([
      "comparativa_rango",
      "delta_balance",
      String(overview.custom_range_comparison.total_net_balance_delta_vs_custom),
    ]);
  }

  overview.top_income_breakdown.forEach((item) => {
    rows.push([
      "top_ingresos",
      item.entity_name,
      `${item.entity_type}|${item.total_amount}`,
    ]);
  });

  overview.top_expense_breakdown.forEach((item) => {
    rows.push([
      "top_egresos",
      item.entity_name,
      `${item.entity_type}|${item.total_amount}`,
    ]);
  });

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

  rows.push([
    "resumen_horizonte",
    "promedios",
    `${overview.trend_summary.average_income}|${overview.trend_summary.average_expense}|${overview.trend_summary.average_net_balance}`,
  ]);
  rows.push([
    "resumen_horizonte",
    "mejor_peor",
    `${overview.trend_summary.best_period_month}|${overview.trend_summary.best_net_balance}|${overview.trend_summary.worst_period_month}|${overview.trend_summary.worst_net_balance}|${overview.trend_summary.net_balance_delta_vs_first}`,
  ]);

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
  periodMonth: string,
  comparePeriodMonth: string
) {
  if (!overview) {
    return;
  }

  const blob = new Blob(
    [
      JSON.stringify(
        {
          exported_at: new Date().toISOString(),
          period_month: periodMonth,
          compare_period_month: comparePeriodMonth,
          custom_compare_start_month:
            overview.custom_range_comparison?.custom_first_period_month || null,
          custom_compare_end_month:
            overview.custom_range_comparison?.custom_last_period_month || null,
          analysis_scope: overview.analysis_scope,
          analysis_dimension: overview.analysis_dimension,
          export_sections: [
            "transaction_snapshot",
            "budget_snapshot",
            "loan_snapshot",
            "top_income_breakdown",
            "top_expense_breakdown",
            "daily_cashflow",
            "budget_variances",
            "period_comparison",
            "monthly_trend",
            "trend_summary",
            "horizon_comparison",
            "year_to_date_comparison",
            "custom_range_comparison",
          ],
          data: overview,
        },
        null,
        2
      ),
    ],
    {
      type: "application/json;charset=utf-8;",
    }
  );
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

function buildAnalysisScopeLabel(scope: string) {
  switch (scope) {
    case "horizon":
      return "horizonte";
    case "year_to_date":
      return "acumulado anual";
    case "periodo":
      return "período";
    default:
      return "período";
  }
}

function buildAnalysisDimensionLabel(dimension: string) {
  switch (dimension) {
    case "account":
      return "cuenta";
    case "project":
      return "proyecto";
    case "beneficiary":
      return "beneficiario";
    case "person":
      return "persona";
    default:
      return "categoría";
  }
}

function buildTrendMonthValue(
  monthIso: string | null,
  amount: number | null,
  currencyCode: string,
  language: "es" | "en"
) {
  if (!monthIso || amount === null) {
    return "n/d";
  }
  return `${formatMonthLabel(monthIso)} · ${formatSignedMoney(amount, currencyCode, language)}`;
}

function buildPeriodRangeLabel(
  firstMonthIso: string | null,
  lastMonthIso: string | null
) {
  if (!firstMonthIso || !lastMonthIso) {
    return "n/d";
  }
  return `${formatMonthLabel(firstMonthIso)} -> ${formatMonthLabel(lastMonthIso)}`;
}

function buildBudgetScopeLabel(scope: string) {
  switch (scope) {
    case "income":
      return "de ingresos";
    case "expense":
      return "de egresos";
    default:
      return "general";
  }
}

function buildBudgetStatusFilterLabel(status: string) {
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
      return "todos";
  }
}
