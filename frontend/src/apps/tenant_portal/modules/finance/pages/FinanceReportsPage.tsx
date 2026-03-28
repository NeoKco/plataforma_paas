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
        title={language === "es" ? "Reportes" : "Reports"}
        description={
          language === "es"
            ? "Lectura mensual consolidada de transacciones, presupuestos y cartera de préstamos."
            : "Consolidated monthly view of transactions, budgets, and loan portfolio."
        }
      />

      <FinanceModuleNav />

      <PanelCard
        title={language === "es" ? "Periodo de análisis" : "Analysis period"}
        subtitle={
          language === "es"
            ? "Primer slice de reportes: overview operativo mensual para cerrar lectura base del módulo."
            : "First reporting slice: monthly operational overview to close the module's base reading."
        }
      >
        <div className="finance-inline-toolbar">
          <div>
            <label className="form-label">{language === "es" ? "Mes" : "Month"}</label>
            <input
              className="form-control"
              type="month"
              value={periodMonth}
              onChange={(event) => setPeriodMonth(event.target.value)}
            />
          </div>
          <div>
            <label className="form-label">{language === "es" ? "Tendencia" : "Trend"}</label>
            <select
              className="form-select"
              value={String(trendMonths)}
              onChange={(event) =>
                setTrendMonths(Number(event.target.value) as 3 | 6 | 12)
              }
            >
              <option value="3">{language === "es" ? "3 meses" : "3 months"}</option>
              <option value="6">{language === "es" ? "6 meses" : "6 months"}</option>
              <option value="12">{language === "es" ? "12 meses" : "12 months"}</option>
            </select>
          </div>
          <div>
            <label className="form-label">{language === "es" ? "Comparar contra" : "Compare against"}</label>
            <input
              className="form-control"
              type="month"
              value={comparePeriodMonth}
              onChange={(event) => setComparePeriodMonth(event.target.value)}
            />
          </div>
          <div>
            <label className="form-label">{language === "es" ? "Foco movimientos" : "Movement focus"}</label>
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
              <option value="all">{language === "es" ? "Todos" : "All"}</option>
              <option value="reconciled">{language === "es" ? "Conciliados" : "Reconciled"}</option>
              <option value="unreconciled">{language === "es" ? "Pendientes" : "Pending"}</option>
              <option value="favorites">{language === "es" ? "Favoritas" : "Favorites"}</option>
              <option value="loan_linked">{language === "es" ? "Ligados a préstamos" : "Loan-linked"}</option>
            </select>
          </div>
          <div>
            <label className="form-label">{language === "es" ? "Lectura categorías" : "Category reading"}</label>
            <select
              className="form-select"
              value={analysisScope}
              onChange={(event) =>
                setAnalysisScope(
                  event.target.value as "period" | "horizon" | "year_to_date"
                )
              }
            >
              <option value="period">{language === "es" ? "Período" : "Period"}</option>
              <option value="horizon">{language === "es" ? "Horizonte" : "Horizon"}</option>
              <option value="year_to_date">{language === "es" ? "Acumulado anual" : "Year to date"}</option>
            </select>
          </div>
          <div>
            <label className="form-label">{language === "es" ? "Dimensión ranking" : "Ranking dimension"}</label>
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
              <option value="category">{language === "es" ? "Categoría" : "Category"}</option>
              <option value="account">{language === "es" ? "Cuenta" : "Account"}</option>
              <option value="project">{language === "es" ? "Proyecto" : "Project"}</option>
              <option value="beneficiary">{language === "es" ? "Beneficiario" : "Beneficiary"}</option>
              <option value="person">{language === "es" ? "Persona" : "Person"}</option>
              <option value="tag">{language === "es" ? "Etiqueta" : "Tag"}</option>
            </select>
          </div>
          <div>
            <label className="form-label">{language === "es" ? "Rango arbitrario desde" : "Custom range from"}</label>
            <input
              className="form-control"
              type="month"
              value={customCompareStartMonth}
              onChange={(event) => setCustomCompareStartMonth(event.target.value)}
            />
          </div>
          <div>
            <label className="form-label">{language === "es" ? "Rango arbitrario hasta" : "Custom range to"}</label>
            <input
              className="form-control"
              type="month"
              value={customCompareEndMonth}
              onChange={(event) => setCustomCompareEndMonth(event.target.value)}
            />
          </div>
          <div>
            <label className="form-label">{language === "es" ? "Categoría presupuesto" : "Budget category"}</label>
            <select
              className="form-select"
              value={budgetCategoryScope}
              onChange={(event) =>
                setBudgetCategoryScope(
                  event.target.value as "all" | "income" | "expense"
                )
              }
            >
              <option value="all">{language === "es" ? "Todas" : "All"}</option>
              <option value="income">{language === "es" ? "Ingreso" : "Income"}</option>
              <option value="expense">{language === "es" ? "Egreso" : "Expense"}</option>
            </select>
          </div>
          <div>
            <label className="form-label">{language === "es" ? "Estado presupuesto" : "Budget status"}</label>
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
              <option value="all">{language === "es" ? "Todos" : "All"}</option>
              <option value="over_budget">{language === "es" ? "Sobre presupuesto" : "Over budget"}</option>
              <option value="within_budget">{language === "es" ? "Dentro" : "Within budget"}</option>
              <option value="unused">{language === "es" ? "Sin uso" : "Unused"}</option>
              <option value="inactive">{language === "es" ? "Inactiva" : "Inactive"}</option>
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
              {language === "es" ? "Exportar CSV enriquecido" : "Export enriched CSV"}
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
              {language === "es" ? "Exportar JSON enriquecido" : "Export enriched JSON"}
            </button>
          </div>
        </div>
      </PanelCard>

      {isLoading ? (
        <LoadingBlock label={language === "es" ? "Cargando reporte financiero..." : "Loading financial report..."} />
      ) : null}

      {error ? (
        <div className="d-grid gap-3">
          <ErrorState
            title={language === "es" ? "Reportes no disponibles" : "Reports unavailable"}
            detail={error.payload?.detail || getApiErrorDisplayMessage(error)}
            requestId={error.payload?.request_id}
          />
          <FinanceSchemaSyncCallout error={error} onSynced={loadOverview} />
        </div>
      ) : null}

      <div className="tenant-portal-metrics">
        <MetricCard
          label={language === "es" ? "Ingresos" : "Income"}
          value={formatMoney(transactionSnapshot?.total_income || 0, baseCurrencyCode, language)}
          hint={language === "es" ? "Ingreso del período" : "Income for the period"}
        />
        <MetricCard
          label={language === "es" ? "Egresos" : "Expenses"}
          value={formatMoney(transactionSnapshot?.total_expense || 0, baseCurrencyCode, language)}
          hint={language === "es" ? "Egreso del período" : "Expense for the period"}
        />
        <MetricCard
          label={language === "es" ? "Balance neto" : "Net balance"}
          value={formatMoney(transactionSnapshot?.net_balance || 0, baseCurrencyCode, language)}
          hint={language === "es" ? "Ingreso menos egreso" : "Income minus expense"}
        />
        <MetricCard
          label={language === "es" ? "Transacciones" : "Transactions"}
          value={transactionSnapshot?.total_transactions || 0}
          hint={language === "es" ? "Filtradas por mes" : "Filtered by month"}
        />
      </div>

      <div className="finance-report-grid">
        <PanelCard
          title={language === "es" ? "Actividad del período" : "Period activity"}
          subtitle={
            language === "es"
              ? `Salud operativa del movimiento mensual bajo foco ${buildMovementScopeLabel(
                  overview?.movement_scope || movementScope,
                  language
                )}.`
              : `Operational health of monthly movements under ${buildMovementScopeLabel(
                  overview?.movement_scope || movementScope,
                  language
                )} focus.`
          }
        >
          <dl className="finance-report-definition-list">
            <ReportLine
              label={language === "es" ? "Conciliadas" : "Reconciled"}
              value={String(transactionSnapshot?.reconciled_count || 0)}
            />
            <ReportLine
              label={language === "es" ? "Pendientes conciliación" : "Pending reconciliation"}
              value={String(transactionSnapshot?.unreconciled_count || 0)}
            />
            <ReportLine
              label={language === "es" ? "Favoritas" : "Favorites"}
              value={String(transactionSnapshot?.favorite_count || 0)}
            />
            <ReportLine
              label={language === "es" ? "Ligadas a préstamos" : "Linked to loans"}
              value={String(transactionSnapshot?.loan_linked_count || 0)}
            />
          </dl>
        </PanelCard>

        <PanelCard
          title={language === "es" ? "Presupuesto vs real" : "Budget vs actual"}
          subtitle={
            language === "es"
              ? `Resumen agregado del mes sobre presupuesto ${buildBudgetScopeLabel(
                  overview?.budget_category_scope || budgetCategoryScope,
                  language
                )} y estado ${buildBudgetStatusFilterLabel(
                  overview?.budget_status_filter || budgetStatusFilter,
                  language
                )}.`
              : `Monthly aggregate summary for ${buildBudgetScopeLabel(
                  overview?.budget_category_scope || budgetCategoryScope,
                  language
                )} budget and ${buildBudgetStatusFilterLabel(
                  overview?.budget_status_filter || budgetStatusFilter,
                  language
                )} status.`
          }
        >
          <dl className="finance-report-definition-list">
            <ReportLine
              label={language === "es" ? "Presupuestado" : "Budgeted"}
              value={formatMoney(budgetSnapshot?.total_budgeted || 0, baseCurrencyCode, language)}
            />
            <ReportLine
              label={language === "es" ? "Real" : "Actual"}
              value={formatMoney(budgetSnapshot?.total_actual || 0, baseCurrencyCode, language)}
            />
            <ReportLine
              label={language === "es" ? "Desviación" : "Variance"}
              value={formatMoney(budgetSnapshot?.total_variance || 0, baseCurrencyCode, language)}
            />
            <ReportLine
              label={language === "es" ? "Sobre presupuesto" : "Over budget"}
              value={String(budgetSnapshot?.over_budget_count || 0)}
            />
            <ReportLine
              label={language === "es" ? "Dentro de presupuesto" : "Within budget"}
              value={String(budgetSnapshot?.within_budget_count || 0)}
            />
            <ReportLine
              label={language === "es" ? "Sin uso" : "Unused"}
              value={String(budgetSnapshot?.unused_count || 0)}
            />
          </dl>
        </PanelCard>

        <PanelCard
          title={language === "es" ? "Cartera de préstamos" : "Loan portfolio"}
          subtitle={language === "es" ? "Snapshot actual de préstamos prestados o recibidos." : "Current snapshot of borrowed or lent loans."}
        >
          <dl className="finance-report-definition-list">
            <ReportLine
              label={language === "es" ? "Saldo tomado" : "Borrowed balance"}
              value={formatMoney(loanSnapshot?.borrowed_balance || 0, baseCurrencyCode, language)}
            />
            <ReportLine
              label={language === "es" ? "Saldo prestado" : "Lent balance"}
              value={formatMoney(loanSnapshot?.lent_balance || 0, baseCurrencyCode, language)}
            />
            <ReportLine
              label={language === "es" ? "Capital total" : "Total principal"}
              value={formatMoney(loanSnapshot?.total_principal || 0, baseCurrencyCode, language)}
            />
            <ReportLine
              label={language === "es" ? "Abiertos" : "Open"}
              value={String(loanSnapshot?.open_items || 0)}
            />
            <ReportLine
              label={language === "es" ? "Liquidados" : "Settled"}
              value={String(loanSnapshot?.settled_items || 0)}
            />
          </dl>
        </PanelCard>
      </div>

      <div className="finance-report-grid">
        <PanelCard
          title={language === "es" ? "Comparativa contra otro período" : "Comparison against another period"}
          subtitle={language === "es" ? "Diferencia del período visible frente al mes de comparación seleccionado." : "Difference between the visible period and the selected comparison month."}
        >
          <PeriodComparisonPanel
            comparison={overview?.period_comparison || null}
            currencyCode={baseCurrencyCode}
            language={language}
          />
        </PanelCard>

        <PanelCard
          title={language === "es" ? "Top categorías ingreso" : "Top income breakdown"}
          subtitle={
            language === "es"
              ? `Mayores ingresos por ${buildAnalysisDimensionLabel(
                  overview?.analysis_dimension || analysisDimension,
                  language
                )} según lectura ${buildAnalysisScopeLabel(
                  overview?.analysis_scope || analysisScope,
                  language
                )}.`
              : `Top income by ${buildAnalysisDimensionLabel(
                  overview?.analysis_dimension || analysisDimension,
                  language
                )} for ${buildAnalysisScopeLabel(
                  overview?.analysis_scope || analysisScope,
                  language
                )} view.`
          }
        >
          <DimensionAmountList
            items={overview?.top_income_breakdown || []}
            emptyLabel={language === "es" ? "Sin ingresos analíticos para la lectura seleccionada." : "No analytical income for the selected view."}
            currencyCode={baseCurrencyCode}
            language={language}
          />
        </PanelCard>

        <PanelCard
          title={language === "es" ? "Top categorías egreso" : "Top expense breakdown"}
          subtitle={
            language === "es"
              ? `Mayores egresos por ${buildAnalysisDimensionLabel(
                  overview?.analysis_dimension || analysisDimension,
                  language
                )} según lectura ${buildAnalysisScopeLabel(
                  overview?.analysis_scope || analysisScope,
                  language
                )}.`
              : `Top expenses by ${buildAnalysisDimensionLabel(
                  overview?.analysis_dimension || analysisDimension,
                  language
                )} for ${buildAnalysisScopeLabel(
                  overview?.analysis_scope || analysisScope,
                  language
                )} view.`
          }
        >
          <DimensionAmountList
            items={overview?.top_expense_breakdown || []}
            emptyLabel={language === "es" ? "Sin egresos analíticos para la lectura seleccionada." : "No analytical expenses for the selected view."}
            currencyCode={baseCurrencyCode}
            language={language}
          />
        </PanelCard>
      </div>

      <div className="finance-report-grid">
        <PanelCard
          title={language === "es" ? "Pulso diario de caja" : "Daily cash pulse"}
          subtitle={language === "es" ? "Serie corta para ver qué días concentraron flujo y presión operativa." : "Short series to see which days concentrated flow and operational pressure."}
        >
          <DailyCashflowList
            items={overview?.daily_cashflow || []}
            currencyCode={baseCurrencyCode}
            language={language}
          />
        </PanelCard>

        <PanelCard
          title={language === "es" ? "Desvíos presupuestarios" : "Budget variances"}
          subtitle={language === "es" ? "Categorías con mayor diferencia entre plan y real para priorizar revisión." : "Categories with the largest difference between plan and actual to prioritize review."}
        >
          <BudgetVarianceTable
            items={overview?.budget_variances || []}
            currencyCode={baseCurrencyCode}
            language={language}
          />
        </PanelCard>
      </div>

      <PanelCard
        title={language === "es" ? "Tendencia reciente" : "Recent trend"}
        subtitle={language === "es" ? "Lectura corta de 6 meses para no perder contexto entre cambios de período." : "Short reading across 6 months to keep context between period changes."}
      >
        <MonthlyTrendTable
          items={overview?.monthly_trend || []}
          currencyCode={baseCurrencyCode}
          language={language}
        />
      </PanelCard>

      <PanelCard
        title={language === "es" ? "Resumen del horizonte" : "Horizon summary"}
        subtitle={language === "es" ? "Comparativa ejecutiva del rango seleccionado para no depender solo de la tabla mensual." : "Executive comparison for the selected range so you do not depend only on the monthly table."}
      >
        <TrendSummaryPanel
          summary={overview?.trend_summary || null}
          currencyCode={baseCurrencyCode}
          language={language}
        />
      </PanelCard>

      <PanelCard
        title={language === "es" ? "Comparativa del horizonte" : "Horizon comparison"}
        subtitle={language === "es" ? "Contrasta el rango visible completo contra otro rango equivalente cerrado en el mes comparado." : "Compare the full visible range against another equivalent range ending in the compared month."}
      >
        <HorizonComparisonPanel
          comparison={overview?.horizon_comparison || null}
          currencyCode={baseCurrencyCode}
          language={language}
        />
      </PanelCard>

      <PanelCard
        title={language === "es" ? "Acumulado anual" : "Year-to-date"}
        subtitle={language === "es" ? "Compara enero -> mes visible contra enero -> mes comparado para lectura ejecutiva anual." : "Compare January to visible month against January to compared month for annual executive reading."}
      >
        <YearToDateComparisonPanel
          comparison={overview?.year_to_date_comparison || null}
          currencyCode={baseCurrencyCode}
          language={language}
        />
      </PanelCard>

      <PanelCard
        title={language === "es" ? "Comparativa rango arbitrario" : "Custom range comparison"}
        subtitle={language === "es" ? "Contrasta la lectura activa actual contra un rango manual de meses si fue definido." : "Compare the current active reading against a manual month range if defined."}
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
            <div className="tenant-muted-text">{buildAnalysisDimensionLabel(item.entity_type, language)}</div>
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
        {language === "es" ? "Sin actividad diaria relevante en el período." : "No relevant daily activity for the selected period."}
      </p>
    );
  }

  return (
    <div className="finance-balance-list">
      {items.map((item) => (
        <div key={item.day} className="finance-balance-list__item">
          <div>
            <div className="finance-balance-list__title">
              {formatDay(item.day, language)}
            </div>
            <div className="tenant-muted-text">
              {item.transaction_count} {language === "es" ? "movimientos" : "transactions"} · {language === "es" ? "Inc." : "Inc."} {formatMoney(item.income_total, currencyCode, language)} · {language === "es" ? "Exp." : "Exp."}{" "}
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
        {language === "es" ? "Sin desvíos presupuestarios para el período seleccionado." : "No budget variances for the selected period."}
      </p>
    );
  }

  return (
    <div className="table-responsive">
      <table className="table table-hover align-middle mb-0">
        <thead>
          <tr>
            <th>{language === "es" ? "Categoría" : "Category"}</th>
            <th>{language === "es" ? "Estado" : "Status"}</th>
            <th className="text-end">{language === "es" ? "Plan" : "Plan"}</th>
            <th className="text-end">{language === "es" ? "Real" : "Actual"}</th>
            <th className="text-end">{language === "es" ? "Desvío" : "Variance"}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.category_id}>
              <td>
                <div className="fw-semibold">{item.category_name}</div>
                <div className="tenant-muted-text">
                  {item.category_type} · {item.is_active ? (language === "es" ? "activa" : "active") : language === "es" ? "inactiva" : "inactive"}
                </div>
              </td>
              <td>
                <span className={buildBudgetStatusClassName(item.budget_status)}>
                  {buildBudgetStatusLabel(item.budget_status, language)}
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
        {language === "es" ? "Sin comparativa disponible para el período seleccionado." : "No comparison available for the selected period."}
      </p>
    );
  }

  return (
    <dl className="finance-report-definition-list">
      <ReportLine
        label={`${language === "es" ? "Ingresos vs" : "Income vs"} ${formatMonthLabel(comparison.compare_period_month, language)}`}
        value={formatSignedMoney(comparison.income_delta, currencyCode, language)}
      />
      <ReportLine
        label={`${language === "es" ? "Egresos vs" : "Expenses vs"} ${formatMonthLabel(comparison.compare_period_month, language)}`}
        value={formatSignedMoney(comparison.expense_delta, currencyCode, language)}
      />
      <ReportLine
        label={language === "es" ? "Balance neto" : "Net balance"}
        value={formatSignedMoney(comparison.net_balance_delta, currencyCode, language)}
      />
      <ReportLine
        label={language === "es" ? "Transacciones" : "Transactions"}
        value={formatSignedInteger(comparison.transaction_delta)}
      />
      <ReportLine
        label={language === "es" ? "Presupuestado" : "Budgeted"}
        value={formatSignedMoney(comparison.budgeted_delta, currencyCode, language)}
      />
      <ReportLine
        label={language === "es" ? "Desviación presup." : "Budget variance"}
        value={formatSignedMoney(comparison.variance_delta, currencyCode, language)}
      />
      <ReportLine
        label={language === "es" ? "Período comparado" : "Compared period"}
        value={formatMonthLabel(comparison.compare_period_month, language)}
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
        {language === "es" ? "Sin tendencia disponible para este tenant." : "No trend available for this tenant."}
      </p>
    );
  }

  return (
    <div className="table-responsive">
      <table className="table table-hover align-middle mb-0">
        <thead>
          <tr>
            <th>{language === "es" ? "Mes" : "Month"}</th>
            <th className="text-end">{language === "es" ? "Ingresos" : "Income"}</th>
            <th className="text-end">{language === "es" ? "Egresos" : "Expenses"}</th>
            <th className="text-end">{language === "es" ? "Balance" : "Balance"}</th>
            <th className="text-end">{language === "es" ? "Trans." : "Txns."}</th>
            <th className="text-end">{language === "es" ? "Presup." : "Budget"}</th>
            <th className="text-end">{language === "es" ? "Real" : "Actual"}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.period_month}>
              <td className="fw-semibold">{formatMonthLabel(item.period_month, language)}</td>
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
        {language === "es" ? "Sin resumen comparativo para el horizonte seleccionado." : "No summary available for the selected horizon."}
      </p>
    );
  }

  return (
    <dl className="finance-report-definition-list">
      <ReportLine
        label={language === "es" ? "Meses cubiertos" : "Months covered"}
        value={String(summary.months_covered)}
      />
      <ReportLine
        label={language === "es" ? "Ingreso promedio" : "Average income"}
        value={formatMoney(summary.average_income, currencyCode, language)}
      />
      <ReportLine
        label={language === "es" ? "Egreso promedio" : "Average expense"}
        value={formatMoney(summary.average_expense, currencyCode, language)}
      />
      <ReportLine
        label={language === "es" ? "Balance promedio" : "Average balance"}
        value={formatSignedMoney(summary.average_net_balance, currencyCode, language)}
      />
      <ReportLine
        label={language === "es" ? "Mejor mes" : "Best month"}
        value={buildTrendMonthValue(summary.best_period_month, summary.best_net_balance, currencyCode, language)}
      />
      <ReportLine
        label={language === "es" ? "Peor mes" : "Worst month"}
        value={buildTrendMonthValue(summary.worst_period_month, summary.worst_net_balance, currencyCode, language)}
      />
      <ReportLine
        label={language === "es" ? "Delta vs primer mes" : "Delta vs first month"}
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
        {language === "es" ? "Sin comparativa de horizonte para el rango seleccionado." : "No horizon comparison for the selected range."}
      </p>
    );
  }

  return (
    <dl className="finance-report-definition-list">
      <ReportLine
        label={language === "es" ? "Horizonte actual" : "Current horizon"}
        value={buildPeriodRangeLabel(
          comparison.current_first_period_month,
          comparison.current_last_period_month,
          language
        )}
      />
      <ReportLine
        label={language === "es" ? "Horizonte comparado" : "Compared horizon"}
        value={buildPeriodRangeLabel(
          comparison.compare_first_period_month,
          comparison.compare_last_period_month,
          language
        )}
      />
      <ReportLine
        label={language === "es" ? "Ingreso total vs rango" : "Total income vs range"}
        value={formatSignedMoney(comparison.total_income_delta_vs_compare, currencyCode, language)}
      />
      <ReportLine
        label={language === "es" ? "Egreso total vs rango" : "Total expense vs range"}
        value={formatSignedMoney(comparison.total_expense_delta_vs_compare, currencyCode, language)}
      />
      <ReportLine
        label={language === "es" ? "Balance total vs rango" : "Total balance vs range"}
        value={formatSignedMoney(comparison.total_net_balance_delta_vs_compare, currencyCode, language)}
      />
      <ReportLine
        label={language === "es" ? "Promedio balance vs rango" : "Average balance vs range"}
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
        {language === "es" ? "Sin acumulado anual disponible para el período seleccionado." : "No year-to-date data for the selected period."}
      </p>
    );
  }

  return (
    <dl className="finance-report-definition-list">
      <ReportLine
        label={language === "es" ? "Acumulado actual" : "Current YTD"}
        value={buildPeriodRangeLabel(
          comparison.current_first_period_month,
          comparison.current_last_period_month,
          language
        )}
      />
      <ReportLine
        label={language === "es" ? "Acumulado comparado" : "Compared YTD"}
        value={buildPeriodRangeLabel(
          comparison.compare_first_period_month,
          comparison.compare_last_period_month,
          language
        )}
      />
      <ReportLine
        label={language === "es" ? "Ingresos YTD vs comparado" : "YTD income vs compared"}
        value={formatSignedMoney(comparison.total_income_delta_vs_compare, currencyCode, language)}
      />
      <ReportLine
        label={language === "es" ? "Egresos YTD vs comparado" : "YTD expenses vs compared"}
        value={formatSignedMoney(comparison.total_expense_delta_vs_compare, currencyCode, language)}
      />
      <ReportLine
        label={language === "es" ? "Balance YTD vs comparado" : "YTD balance vs compared"}
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
        {language === "es" ? "Define `desde` y `hasta` para comparar contra un rango arbitrario." : "Set `from` and `to` to compare against a custom range."}
      </p>
    );
  }

  return (
    <dl className="finance-report-definition-list">
      <ReportLine
        label={language === "es" ? "Lectura actual" : "Current reading"}
        value={`${buildAnalysisScopeLabel(comparison.current_label, language)} · ${buildPeriodRangeLabel(
          comparison.current_first_period_month,
          comparison.current_last_period_month,
          language
        )}`}
      />
      <ReportLine
        label={language === "es" ? "Rango arbitrario" : "Custom range"}
        value={buildPeriodRangeLabel(
          comparison.custom_first_period_month,
          comparison.custom_last_period_month,
          language
        )}
      />
      <ReportLine
        label={language === "es" ? "Ingresos vs rango" : "Income vs range"}
        value={formatSignedMoney(comparison.total_income_delta_vs_custom, currencyCode, language)}
      />
      <ReportLine
        label={language === "es" ? "Egresos vs rango" : "Expenses vs range"}
        value={formatSignedMoney(comparison.total_expense_delta_vs_custom, currencyCode, language)}
      />
      <ReportLine
        label={language === "es" ? "Balance vs rango" : "Balance vs range"}
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

function formatDay(day: string, language: "es" | "en") {
  return new Intl.DateTimeFormat(language === "es" ? "es-CL" : "en-US", {
    day: "2-digit",
    month: "short",
  }).format(new Date(`${day}T00:00:00`));
}

function formatMonthLabel(monthIso: string, language: "es" | "en" = "es") {
  return new Intl.DateTimeFormat(language === "es" ? "es-CL" : "en-US", {
    month: "short",
    year: "numeric",
  }).format(new Date(`${monthIso}T00:00:00`));
}

function buildBudgetStatusLabel(status: string, language: "es" | "en") {
  switch (status) {
    case "over_budget":
      return language === "es" ? "sobre presupuesto" : "over budget";
    case "within_budget":
      return language === "es" ? "dentro" : "within";
    case "unused":
      return language === "es" ? "sin uso" : "unused";
    case "inactive":
      return language === "es" ? "inactiva" : "inactive";
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

function buildMovementScopeLabel(scope: string, language: "es" | "en") {
  switch (scope) {
    case "reconciled":
      return language === "es" ? "conciliado" : "reconciled";
    case "unreconciled":
      return language === "es" ? "pendiente" : "pending";
    case "favorites":
      return language === "es" ? "favoritas" : "favorites";
    case "loan_linked":
      return language === "es" ? "ligado a préstamos" : "loan-linked";
    default:
      return language === "es" ? "general" : "general";
  }
}

function buildAnalysisScopeLabel(scope: string, language: "es" | "en") {
  switch (scope) {
    case "horizon":
      return language === "es" ? "horizonte" : "horizon";
    case "year_to_date":
      return language === "es" ? "acumulado anual" : "year to date";
    case "periodo":
    case "period":
      return language === "es" ? "período" : "period";
    default:
      return language === "es" ? "período" : "period";
  }
}

function buildAnalysisDimensionLabel(dimension: string, language: "es" | "en") {
  switch (dimension) {
    case "category":
      return language === "es" ? "categoría" : "category";
    case "account":
      return language === "es" ? "cuenta" : "account";
    case "project":
      return language === "es" ? "proyecto" : "project";
    case "beneficiary":
      return language === "es" ? "beneficiario" : "beneficiary";
    case "person":
      return language === "es" ? "persona" : "person";
    case "tag":
      return language === "es" ? "etiqueta" : "tag";
    default:
      return language === "es" ? "categoría" : "category";
  }
}

function buildTrendMonthValue(
  monthIso: string | null,
  amount: number | null,
  currencyCode: string,
  language: "es" | "en"
) {
  if (!monthIso || amount === null) {
    return language === "es" ? "n/d" : "n/a";
  }
  return `${formatMonthLabel(monthIso, language)} · ${formatSignedMoney(amount, currencyCode, language)}`;
}

function buildPeriodRangeLabel(
  firstMonthIso: string | null,
  lastMonthIso: string | null,
  language: "es" | "en"
) {
  if (!firstMonthIso || !lastMonthIso) {
    return language === "es" ? "n/d" : "n/a";
  }
  return `${formatMonthLabel(firstMonthIso, language)} -> ${formatMonthLabel(lastMonthIso, language)}`;
}

function buildBudgetScopeLabel(scope: string, language: "es" | "en") {
  switch (scope) {
    case "income":
      return language === "es" ? "de ingresos" : "income";
    case "expense":
      return language === "es" ? "de egresos" : "expense";
    default:
      return language === "es" ? "general" : "general";
  }
}

function buildBudgetStatusFilterLabel(status: string, language: "es" | "en") {
  switch (status) {
    case "over_budget":
      return language === "es" ? "sobre presupuesto" : "over budget";
    case "within_budget":
      return language === "es" ? "dentro" : "within";
    case "unused":
      return language === "es" ? "sin uso" : "unused";
    case "inactive":
      return language === "es" ? "inactiva" : "inactive";
    default:
      return language === "es" ? "todos" : "all";
  }
}
