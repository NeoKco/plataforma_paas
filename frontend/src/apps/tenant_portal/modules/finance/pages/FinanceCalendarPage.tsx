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
import { FinanceHorizontalBarChart } from "../components/charts/FinanceHorizontalBarChart";
import { FinanceMultiSeriesChart } from "../components/charts/FinanceMultiSeriesChart";
import { FinanceModuleNav } from "../components/common/FinanceModuleNav";
import { FinanceSchemaSyncCallout } from "../components/common/FinanceSchemaSyncCallout";
import { FinanceSpotlight } from "../components/common/FinanceSpotlight";
import {
  getTenantFinanceCurrencies,
  type TenantFinanceCurrency,
} from "../services/currenciesService";
import {
  getTenantFinancePlanningOverview,
  type TenantFinancePlanningBudgetFocusItem,
  type TenantFinancePlanningDayItem,
  type TenantFinancePlanningLoanDueItem,
  type TenantFinancePlanningOverviewResponse,
} from "../services/planningService";
import { getFinanceCategoryTypeLabel } from "../utils/presentation";

export function FinanceCalendarPage() {
  const { session } = useTenantAuth();
  const { language } = useLanguage();
  const [periodMonth, setPeriodMonth] = useState(buildMonthValue());
  const [overview, setOverview] =
    useState<TenantFinancePlanningOverviewResponse["data"] | null>(null);
  const [currencies, setCurrencies] = useState<TenantFinanceCurrency[]>([]);
  const [error, setError] = useState<ApiError | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const baseCurrencyCode =
    currencies.find((currency) => currency.is_base)?.code ||
    currencies[0]?.code ||
    "USD";

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
      const [overviewResponse, currenciesResponse] = await Promise.all([
        getTenantFinancePlanningOverview(
          session.accessToken,
          buildPeriodMonthIso(periodMonth)
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

  const summary = overview?.summary;

  return (
    <div className="d-grid gap-4">
      <PageHeader
        eyebrow="Finance"
        title={language === "es" ? "Planificación" : "Planning"}
        description={
          language === "es"
            ? "Lectura mensual de flujo esperado: actividad diaria, vencimientos de préstamos y foco presupuestario."
            : "Monthly view of expected flow: daily activity, loan due dates, and budget focus."
        }
      />

      <FinanceModuleNav />

      <FinanceSpotlight
        icon="planning"
        eyebrow={language === "es" ? "Lectura operativa" : "Operational reading"}
        title={
          language === "es"
            ? "Radar mensual de flujo y vencimientos"
            : "Monthly radar of flow and due dates"
        }
        description={
          language === "es"
            ? "Concentra señales diarias, cuotas por vencer y presión presupuestaria en una sola vista para priorizar trabajo del mes."
            : "Concentrates daily signals, due installments, and budget pressure in a single view to prioritize the month."
        }
        stats={[
          {
            label: language === "es" ? "Mes" : "Month",
            value: formatMonth(periodMonth, language),
          },
          {
            label: language === "es" ? "Señales" : "Signals",
            value: String(overview?.calendar_days.length || 0),
          },
          {
            label: language === "es" ? "Cuotas" : "Installments",
            value: String(summary?.due_installments_count || 0),
          },
          {
            label: language === "es" ? "Foco" : "Focus",
            value: String(overview?.budget_focus.length || 0),
          },
        ]}
      />

      <PanelCard
        title={language === "es" ? "Periodo de planificación" : "Planning period"}
        subtitle={
          language === "es"
            ? "Primer slice real de planificación: mirada operativa del mes actual o seleccionado."
            : "First real planning slice: operational view of the current or selected month."
        }
      >
        <div className="finance-filter-grid">
          <div>
            <label className="form-label">{language === "es" ? "Mes" : "Month"}</label>
            <input
              className="form-control"
              type="month"
              value={periodMonth}
              onChange={(event) => setPeriodMonth(event.target.value)}
            />
          </div>
        </div>
      </PanelCard>

      {isLoading ? (
        <LoadingBlock label={language === "es" ? "Cargando planificación financiera..." : "Loading financial planning..."} />
      ) : null}

      {error ? (
        <div className="d-grid gap-3">
          <ErrorState
            title={language === "es" ? "Planificación no disponible" : "Planning unavailable"}
            detail={error.payload?.detail || getApiErrorDisplayMessage(error)}
            requestId={error.payload?.request_id}
          />
          <FinanceSchemaSyncCallout error={error} onSynced={loadOverview} />
        </div>
      ) : null}

      <div className="tenant-portal-metrics">
        <MetricCard
          label={language === "es" ? "Ingreso proyectado" : "Projected income"}
          value={formatMoney(summary?.total_income || 0, language, baseCurrencyCode)}
          hint={language === "es" ? "Movimiento real detectado en el mes" : "Actual activity detected in the month"}
        />
        <MetricCard
          label={language === "es" ? "Egreso proyectado" : "Projected expense"}
          value={formatMoney(summary?.total_expense || 0, language, baseCurrencyCode)}
          hint={language === "es" ? "Gasto real detectado en el mes" : "Actual spending detected in the month"}
        />
        <MetricCard
          label={language === "es" ? "Cuotas por vencer" : "Installments due"}
          value={summary?.due_installments_count || 0}
          hint={language === "es" ? "Vencimientos del mes" : "Due dates in the month"}
        />
        <MetricCard
          label={language === "es" ? "Flujo esperado préstamos" : "Expected loan flow"}
          value={formatMoney(summary?.expected_loan_cashflow || 0, language, baseCurrencyCode)}
          hint={language === "es" ? "Saldo pendiente de cuotas del mes" : "Outstanding installment balance for the month"}
        />
      </div>

      <div className="finance-report-grid">
        <PanelCard
          title={language === "es" ? "Resumen del mes" : "Month summary"}
          subtitle={
            language === "es"
              ? "Balance general y presión esperada sobre el período."
              : "Overall balance and expected pressure on the period."
          }
        >
          <dl className="finance-report-definition-list">
            <ReportLine
              label={language === "es" ? "Balance neto" : "Net balance"}
              value={formatMoney(summary?.net_total || 0, language, baseCurrencyCode)}
            />
            <ReportLine
              label={language === "es" ? "Transacciones" : "Transactions"}
              value={String(summary?.total_transactions || 0)}
            />
            <ReportLine
              label={language === "es" ? "Cuotas pendientes" : "Pending installments"}
              value={String(summary?.pending_installments_count || 0)}
            />
            <ReportLine
              label={language === "es" ? "Presupuestado" : "Budgeted"}
              value={formatMoney(summary?.total_budgeted || 0, language, baseCurrencyCode)}
            />
            <ReportLine
              label={language === "es" ? "Real" : "Actual"}
              value={formatMoney(summary?.total_actual || 0, language, baseCurrencyCode)}
            />
            <ReportLine
              label={language === "es" ? "Variación" : "Variance"}
              value={formatMoney(summary?.total_variance || 0, language, baseCurrencyCode)}
            />
          </dl>
        </PanelCard>

        <PanelCard
          title={language === "es" ? "Días con señal operativa" : "Days with operational signal"}
          subtitle={
            language === "es"
              ? "Solo se listan días con movimientos o cuotas por vencer."
              : "Only days with transactions or due installments are listed."
          }
        >
          <FinanceMultiSeriesChart
            emptyLabel={
              language === "es"
                ? "No hay días con señal operativa para el mes seleccionado."
                : "There are no days with operational signal for the selected month."
            }
            points={buildPlanningChartPoints(overview?.calendar_days || [], language)}
            series={[
              {
                key: "income",
                label: language === "es" ? "Ingresos" : "Income",
                color: "#24704f",
              },
              {
                key: "expense",
                label: language === "es" ? "Egresos" : "Expenses",
                color: "#a12837",
              },
              {
                key: "net",
                label: language === "es" ? "Balance" : "Balance",
                color: "#1256cc",
              },
            ]}
          />
          <PlanningDayList items={overview?.calendar_days || []} language={language} currencyCode={baseCurrencyCode} />
        </PanelCard>
      </div>

      <div className="finance-report-grid">
        <PanelCard
          title={language === "es" ? "Cuotas del mes" : "Installments in the month"}
          subtitle={
            language === "es"
              ? "Vencimientos de préstamos detectados dentro del período seleccionado."
              : "Loan due dates detected inside the selected period."
          }
        >
          <PlanningLoanDueList items={overview?.loan_due_items || []} language={language} currencyCode={baseCurrencyCode} />
        </PanelCard>

        <PanelCard
          title={language === "es" ? "Foco presupuestario" : "Budget focus"}
          subtitle={
            language === "es"
              ? "Categorías con mayor desvío absoluto para enfocar revisión."
              : "Categories with the largest absolute variance to focus the review."
          }
        >
          <FinanceHorizontalBarChart
            emptyLabel={
              language === "es"
                ? "No hay presupuestos activos para construir foco operativo."
                : "There are no active budgets to build an operational focus."
            }
            formatValue={(value) => formatMoney(value, language, baseCurrencyCode)}
            items={buildBudgetFocusChartItems(overview?.budget_focus || [], language)}
          />
          <PlanningBudgetFocusList items={overview?.budget_focus || []} language={language} currencyCode={baseCurrencyCode} />
        </PanelCard>
      </div>
    </div>
  );
}

function PlanningDayList({ items, language, currencyCode }: { items: TenantFinancePlanningDayItem[]; language: "es" | "en"; currencyCode: string }) {
  if (items.length === 0) {
    return (
      <p className="tenant-muted-text mb-0">
        {language === "es"
          ? "No hay días con señal operativa para el mes seleccionado."
          : "There are no days with operational signal for the selected month."}
      </p>
    );
  }

  return (
    <div className="finance-balance-list">
      {items.map((item) => (
        <div key={item.day} className="finance-balance-list__item">
          <div>
            <div className="finance-balance-list__title">
              {formatDate(item.day, language)}
            </div>
            <div className="tenant-muted-text">
              {language === "es"
                ? `${item.transaction_count} transacciones / ${item.due_installments_count} cuotas`
                : `${item.transaction_count} transactions / ${item.due_installments_count} installments`}
            </div>
          </div>
          <div>
            <div className="finance-balance-list__value">
              {formatMoney(item.net_total, language, currencyCode)}
            </div>
            <div className="tenant-muted-text">
              {language === "es" ? "Ingreso" : "Income"} {formatMoney(item.income_total, language, currencyCode)} / {language === "es" ? "Egreso" : "Expense"} {formatMoney(item.expense_total, language, currencyCode)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function PlanningLoanDueList({
  items,
  language,
  currencyCode,
}: {
  items: TenantFinancePlanningLoanDueItem[];
  language: "es" | "en";
  currencyCode: string;
}) {
  if (items.length === 0) {
    return (
      <p className="tenant-muted-text mb-0">
        {language === "es"
          ? "No hay cuotas con vencimiento dentro del mes seleccionado."
          : "There are no installments due within the selected month."}
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
              {item.loan_name} · {language === "es" ? "cuota" : "installment"} #{item.installment_number}
            </div>
            <div className="tenant-muted-text">
              {formatDate(item.due_date, language)} · {displayLoanType(item.loan_type, language)} · {displayInstallmentStatus(item.installment_status, language)}
            </div>
          </div>
          <div>
            <div className="finance-balance-list__value">
              {formatMoney(item.remaining_amount, language, currencyCode)}
            </div>
            <div className="tenant-muted-text">
              {language === "es" ? "Plan" : "Planned"} {formatMoney(item.planned_amount, language, currencyCode)} / {language === "es" ? "Pagado" : "Paid"} {formatMoney(item.paid_amount, language, currencyCode)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function PlanningBudgetFocusList({
  items,
  language,
  currencyCode,
}: {
  items: TenantFinancePlanningBudgetFocusItem[];
  language: "es" | "en";
  currencyCode: string;
}) {
  if (items.length === 0) {
    return (
      <p className="tenant-muted-text mb-0">
        {language === "es"
          ? "No hay presupuestos activos para construir foco operativo."
          : "There are no active budgets to build an operational focus."}
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
              {getFinanceCategoryTypeLabel(item.category_type, language)} · {displayBudgetStatus(item.budget_status, language)}
            </div>
          </div>
          <div>
            <div className="finance-balance-list__value">
              {formatMoney(item.variance_amount, language, currencyCode)}
            </div>
            <div className="tenant-muted-text">
              {language === "es" ? "Plan" : "Planned"} {formatMoney(item.planned_amount, language, currencyCode)} / {language === "es" ? "Real" : "Actual"} {formatMoney(item.actual_amount, language, currencyCode)}
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

function buildPlanningChartPoints(
  items: TenantFinancePlanningDayItem[],
  language: "es" | "en"
) {
  return items.map((item) => ({
    label: formatDayShort(item.day, language),
    values: {
      income: item.income_total,
      expense: item.expense_total,
      net: item.net_total,
    },
  }));
}

function buildBudgetFocusChartItems(
  items: TenantFinancePlanningBudgetFocusItem[],
  language: "es" | "en"
) {
  return items.slice(0, 6).map((item) => ({
    label: item.category_name,
    value: item.variance_amount,
    caption: `${getFinanceCategoryTypeLabel(item.category_type, language)} · ${displayBudgetStatus(
      item.budget_status,
      language
    )}`,
  }));
}

function formatMoney(value: number, language: "es" | "en", currencyCode: string) {
  return new Intl.NumberFormat(language === "es" ? "es-CL" : "en-US", {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: string, language: "es" | "en") {
  return new Intl.DateTimeFormat(language === "es" ? "es-CL" : "en-US", {
    dateStyle: "medium",
  }).format(new Date(`${value}T00:00:00`));
}

function formatDayShort(value: string, language: "es" | "en") {
  return new Intl.DateTimeFormat(language === "es" ? "es-CL" : "en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function formatMonth(value: string, language: "es" | "en") {
  return new Intl.DateTimeFormat(language === "es" ? "es-CL" : "en-US", {
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}-01T00:00:00`));
}

function displayLoanType(value: string, language: "es" | "en") {
  if (value === "receivable") {
    return language === "es" ? "por cobrar" : "receivable";
  }
  if (value === "payable") {
    return language === "es" ? "por pagar" : "payable";
  }
  return value;
}

function displayInstallmentStatus(value: string, language: "es" | "en") {
  if (value === "pending") {
    return language === "es" ? "pendiente" : "pending";
  }
  if (value === "partial") {
    return language === "es" ? "parcial" : "partial";
  }
  if (value === "paid") {
    return language === "es" ? "pagada" : "paid";
  }
  if (value === "reversed") {
    return language === "es" ? "revertida" : "reversed";
  }
  return value;
}

function displayBudgetStatus(value: string, language: "es" | "en") {
  if (value === "over_budget") {
    return language === "es" ? "sobre presupuesto" : "over budget";
  }
  if (value === "within_budget") {
    return language === "es" ? "dentro del presupuesto" : "within budget";
  }
  if (value === "unused") {
    return language === "es" ? "sin ejecución" : "unused";
  }
  if (value === "inactive") {
    return language === "es" ? "inactivo" : "inactive";
  }
  return value;
}
