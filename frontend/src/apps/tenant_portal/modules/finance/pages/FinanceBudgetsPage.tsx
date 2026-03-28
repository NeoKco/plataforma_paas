import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
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
  getTenantFinanceCategories,
  type TenantFinanceCategory,
} from "../services/categoriesService";
import {
  getTenantFinanceCurrencies,
  type TenantFinanceCurrency,
} from "../services/currenciesService";
import {
  applyTenantFinanceBudgetGuidedAdjustment,
  applyTenantFinanceBudgetTemplate,
  cloneTenantFinanceBudgets,
  createTenantFinanceBudget,
  getTenantFinanceBudgets,
  updateTenantFinanceBudget,
  type TenantFinanceBudget,
  type TenantFinanceBudgetFocusItem,
  type TenantFinanceBudgetsResponse,
} from "../services/budgetsService";
import { getFinanceCategoryTypeLabel } from "../utils/presentation";

type BudgetFormState = {
  periodMonth: string;
  categoryId: string;
  amount: string;
  note: string;
  isActive: boolean;
};

type ActionFeedback = {
  type: "success" | "error";
  message: string;
};

const DEFAULT_FORM_STATE: BudgetFormState = {
  periodMonth: buildMonthValue(),
  categoryId: "",
  amount: "",
  note: "",
  isActive: true,
};

function buildPreviousMonthValue(value: string) {
  const [yearRaw, monthRaw] = value.split("-");
  const year = Number.parseInt(yearRaw, 10);
  const month = Number.parseInt(monthRaw, 10);
  const date = new Date(Date.UTC(year, month - 1, 1));
  date.setUTCMonth(date.getUTCMonth() - 1);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function FinanceBudgetsPage() {
  const { session } = useTenantAuth();
  const { language } = useLanguage();
  const [budgetsResponse, setBudgetsResponse] =
    useState<TenantFinanceBudgetsResponse | null>(null);
  const [categories, setCategories] = useState<TenantFinanceCategory[]>([]);
  const [currencies, setCurrencies] = useState<TenantFinanceCurrency[]>([]);
  const [editingBudgetId, setEditingBudgetId] = useState<number | null>(null);
  const [filterMonth, setFilterMonth] = useState(buildMonthValue());
  const [filterCategoryType, setFilterCategoryType] = useState("");
  const [filterBudgetStatus, setFilterBudgetStatus] = useState("");
  const [includeInactive, setIncludeInactive] = useState(true);
  const [cloneSourceMonth, setCloneSourceMonth] = useState(buildPreviousMonthValue(buildMonthValue()));
  const [cloneOverwriteExisting, setCloneOverwriteExisting] = useState(false);
  const [templateMode, setTemplateMode] = useState("previous_month");
  const [templateOverwriteExisting, setTemplateOverwriteExisting] = useState(false);
  const [formState, setFormState] = useState<BudgetFormState>(DEFAULT_FORM_STATE);
  const [error, setError] = useState<ApiError | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<ActionFeedback | null>(null);

  const categoriesForBudgets = useMemo(
    () =>
      categories.filter(
        (category) =>
          category.is_active &&
          (category.category_type === "income" || category.category_type === "expense")
      ),
    [categories]
  );
  const baseCurrencyCode =
    currencies.find((currency) => currency.is_base)?.code ||
    currencies[0]?.code ||
    "USD";

  useEffect(() => {
    void loadBudgetWorkspace();
  }, [session?.accessToken, filterMonth, filterCategoryType, filterBudgetStatus, includeInactive]);

  useEffect(() => {
    if (!formState.categoryId && categoriesForBudgets.length > 0) {
      setFormState((current) => ({
        ...current,
        categoryId: String(categoriesForBudgets[0].id),
      }));
    }
  }, [categoriesForBudgets, formState.categoryId]);

  useEffect(() => {
    setCloneSourceMonth((current) => {
      if (!current || current === filterMonth) {
        return buildPreviousMonthValue(filterMonth);
      }
      return current;
    });
  }, [filterMonth]);

  async function loadBudgetWorkspace() {
    if (!session?.accessToken) {
      return;
    }

    setIsLoading(true);
    setError(null);

    const results = await Promise.allSettled([
      getTenantFinanceBudgets(session.accessToken, buildPeriodMonthIso(filterMonth), {
        includeInactive,
        categoryType: filterCategoryType || undefined,
        budgetStatus: filterBudgetStatus || undefined,
      }),
      getTenantFinanceCategories(session.accessToken, { includeInactive: false }),
      getTenantFinanceCurrencies(session.accessToken, false),
    ]);

    const [budgetsResult, categoriesResult, currenciesResult] = results;

    if (
      budgetsResult.status === "rejected" &&
      categoriesResult.status === "rejected" &&
      currenciesResult.status === "rejected"
    ) {
      setBudgetsResponse(null);
      setCategories([]);
      setCurrencies([]);
      setError(budgetsResult.reason as ApiError);
      setIsLoading(false);
      return;
    }

    setBudgetsResponse(budgetsResult.status === "fulfilled" ? budgetsResult.value : null);
    setCategories(categoriesResult.status === "fulfilled" ? categoriesResult.value.data : []);
    setCurrencies(currenciesResult.status === "fulfilled" ? currenciesResult.value.data : []);
    setIsLoading(false);
  }

  function resetForm() {
    setEditingBudgetId(null);
    setFormState({
      ...DEFAULT_FORM_STATE,
      periodMonth: filterMonth,
      categoryId: categoriesForBudgets[0] ? String(categoriesForBudgets[0].id) : "",
    });
  }

  function startEditingBudget(budget: TenantFinanceBudget) {
    setEditingBudgetId(budget.id);
    setFormState({
      periodMonth: buildMonthValueFromIso(budget.period_month),
      categoryId: String(budget.category_id),
      amount: String(budget.amount),
      note: budget.note || "",
      isActive: budget.is_active,
    });
    setActionFeedback(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.accessToken) {
      return;
    }

    setIsSubmitting(true);
    setActionFeedback(null);

    try {
      const payload = {
        period_month: buildPeriodMonthIso(formState.periodMonth),
        category_id: Number(formState.categoryId),
        amount: Number.parseFloat(formState.amount),
        note: formState.note.trim() || null,
        is_active: formState.isActive,
      };
      const response = editingBudgetId
        ? await updateTenantFinanceBudget(session.accessToken, editingBudgetId, payload)
        : await createTenantFinanceBudget(session.accessToken, payload);

      setFilterMonth(formState.periodMonth);
      await loadBudgetWorkspace();
      resetForm();
      setActionFeedback({ type: "success", message: response.message });
    } catch (rawError) {
      setActionFeedback({
        type: "error",
        message: getApiErrorDisplayMessage(rawError as ApiError),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleFocusToggleActive(item: TenantFinanceBudgetFocusItem) {
    if (!session?.accessToken || !budgetsResponse) {
      return;
    }
    const matchedBudget = budgetsResponse.data.find((budget) => budget.id === item.id);
    if (!matchedBudget) {
      return;
    }

    setIsSubmitting(true);
    setActionFeedback(null);

    try {
      const response = await updateTenantFinanceBudget(session.accessToken, matchedBudget.id, {
        period_month: matchedBudget.period_month,
        category_id: matchedBudget.category_id,
        amount: matchedBudget.amount,
        note: matchedBudget.note,
        is_active: !matchedBudget.is_active,
      });
      await loadBudgetWorkspace();
      setActionFeedback({ type: "success", message: response.message });
    } catch (rawError) {
      setActionFeedback({
        type: "error",
        message: getApiErrorDisplayMessage(rawError as ApiError),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleFocusEdit(item: TenantFinanceBudgetFocusItem) {
    const matchedBudget = budgetsResponse?.data.find((budget) => budget.id === item.id);
    if (!matchedBudget) {
      return;
    }
    startEditingBudget(matchedBudget);
  }

  async function handleCloneBudgets() {
    if (!session?.accessToken) {
      return;
    }

    setIsSubmitting(true);
    setActionFeedback(null);

    try {
      const response = await cloneTenantFinanceBudgets(session.accessToken, {
        source_period_month: buildPeriodMonthIso(cloneSourceMonth),
        target_period_month: buildPeriodMonthIso(filterMonth),
        overwrite_existing: cloneOverwriteExisting,
      });
      await loadBudgetWorkspace();
      setActionFeedback({
        type: "success",
        message: `${response.message} (${language === "es" ? "creados" : "created"}: ${response.data.cloned_count}, ${language === "es" ? "actualizados" : "updated"}: ${response.data.updated_count}, ${language === "es" ? "omitidos" : "skipped"}: ${response.data.skipped_count})`,
      });
    } catch (rawError) {
      setActionFeedback({
        type: "error",
        message: getApiErrorDisplayMessage(rawError as ApiError),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleFocusGuidedAdjustment(item: TenantFinanceBudgetFocusItem) {
    if (!session?.accessToken) {
      return;
    }

    const adjustmentMode = buildGuidedAdjustmentMode(item);
    if (!adjustmentMode) {
      return;
    }

    setIsSubmitting(true);
    setActionFeedback(null);

    try {
      const response = await applyTenantFinanceBudgetGuidedAdjustment(
        session.accessToken,
        item.id,
        {
          adjustment_mode: adjustmentMode,
          margin_percent: adjustmentMode === "align_to_actual_with_margin" ? 10 : undefined,
        }
      );
      await loadBudgetWorkspace();
      setActionFeedback({ type: "success", message: response.message });
    } catch (rawError) {
      setActionFeedback({
        type: "error",
        message: getApiErrorDisplayMessage(rawError as ApiError),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleApplyTemplate() {
    if (!session?.accessToken) {
      return;
    }

    setIsSubmitting(true);
    setActionFeedback(null);

    try {
      const response = await applyTenantFinanceBudgetTemplate(session.accessToken, {
        target_period_month: buildPeriodMonthIso(filterMonth),
        template_mode: templateMode,
        overwrite_existing: templateOverwriteExisting,
      });
      await loadBudgetWorkspace();
      setActionFeedback({
        type: "success",
        message: `${response.message} (${language === "es" ? "creados" : "created"}: ${response.data.cloned_count}, ${language === "es" ? "actualizados" : "updated"}: ${response.data.updated_count}, ${language === "es" ? "omitidos" : "skipped"}: ${response.data.skipped_count})`,
      });
    } catch (rawError) {
      setActionFeedback({
        type: "error",
        message: getApiErrorDisplayMessage(rawError as ApiError),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const summary = budgetsResponse?.summary;

  return (
    <div className="d-grid gap-4">
      <PageHeader
        eyebrow="Finance"
        icon="budgets"
        title={language === "es" ? "Presupuestos" : "Budgets"}
        description={
          language === "es"
            ? "Define metas mensuales por categoría y compara rápidamente lo presupuestado contra lo ejecutado."
            : "Set monthly targets by category and quickly compare budgeted versus actual execution."
        }
      />

      <FinanceModuleNav />

      {actionFeedback ? (
        <div className={`tenant-action-feedback tenant-action-feedback--${actionFeedback.type}`}>
          <strong>{language === "es" ? "Presupuestos:" : "Budgets:"}</strong> {actionFeedback.message}
        </div>
      ) : null}

      {isLoading ? (
        <LoadingBlock label={language === "es" ? "Cargando presupuestos..." : "Loading budgets..."} />
      ) : null}

      <div className="tenant-portal-metrics">
        <MetricCard
          icon="budgets"
          label={language === "es" ? "Presupuestado" : "Budgeted"}
          tone="info"
          value={formatMoney(summary?.total_budgeted || 0, language, baseCurrencyCode)}
          hint={language === "es" ? "Total del filtro visible" : "Total for the visible filter"}
        />
        <MetricCard
          icon="expense"
          label={language === "es" ? "Ejecutado" : "Actual"}
          tone="warning"
          value={formatMoney(summary?.total_actual || 0, language, baseCurrencyCode)}
          hint={language === "es" ? "Real acumulado por categoría" : "Actual accumulated by category"}
        />
        <MetricCard
          icon="balance"
          label={language === "es" ? "Desviación" : "Variance"}
          value={formatMoney(summary?.total_variance || 0, language, baseCurrencyCode)}
          hint={language === "es" ? "Presupuesto menos real" : "Budget minus actual"}
        />
        <MetricCard
          icon="focus"
          label={language === "es" ? "Ítems" : "Items"}
          value={summary?.total_items || 0}
          hint={language === "es" ? "Presupuestos del filtro" : "Budgets in the filter"}
        />
      </div>

      <div className="tenant-portal-metrics">
        <MetricCard
          icon="expense"
          label={language === "es" ? "Sobre presupuesto" : "Over budget"}
          tone="danger"
          value={summary?.over_budget_items || 0}
          hint={
            language === "es"
              ? "Categorías que ya superaron el monto visible"
              : "Categories already above the visible amount"
          }
        />
        <MetricCard
          icon="balance"
          label={language === "es" ? "Dentro" : "Within"}
          tone="success"
          value={summary?.within_budget_items || 0}
          hint={
            language === "es"
              ? "Categorías activas aún dentro del rango"
              : "Active categories still within range"
          }
        />
        <MetricCard
          icon="focus"
          label={language === "es" ? "Sin uso" : "Unused"}
          value={summary?.unused_items || 0}
          hint={
            language === "es"
              ? "Categorías sin ejecución en el período"
              : "Categories without execution in the period"
          }
        />
        <MetricCard
          icon="settings"
          label={language === "es" ? "Inactivas" : "Inactive"}
          value={summary?.inactive_items || 0}
          hint={
            language === "es"
              ? "Presupuestos visibles pero desactivados"
              : "Visible budgets that are disabled"
          }
        />
      </div>

      {error ? (
        <div className="d-grid gap-3">
          <ErrorState
            title={language === "es" ? "Presupuestos no disponibles" : "Budgets unavailable"}
            detail={error.payload?.detail || error.message}
            requestId={error.payload?.request_id}
          />
          <FinanceSchemaSyncCallout error={error} onSynced={loadBudgetWorkspace} />
        </div>
      ) : null}

      <div className="tenant-portal-split tenant-portal-split--finance">
        <PanelCard
          title={editingBudgetId ? (language === "es" ? "Editar presupuesto" : "Edit budget") : (language === "es" ? "Registrar presupuesto" : "Create budget")}
          subtitle={
            language === "es"
              ? "Primer corte: presupuesto mensual por categoría con comparación contra gasto o ingreso real."
              : "First slice: monthly budget by category with comparison against actual expense or income."
          }
        >
          <form className="d-grid gap-3" onSubmit={handleSubmit}>
            <div className="tenant-inline-form-grid">
              <div>
                <label className="form-label">{language === "es" ? "Mes" : "Month"}</label>
                <input
                  className="form-control"
                  type="month"
                  value={formState.periodMonth}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, periodMonth: event.target.value }))
                  }
                />
              </div>
              <div>
                <label className="form-label">{language === "es" ? "Categoría" : "Category"}</label>
                <select
                  className="form-select"
                  value={formState.categoryId}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, categoryId: event.target.value }))
                  }
                >
                  <option value="">{language === "es" ? "Selecciona una categoría" : "Select a category"}</option>
                  {categoriesForBudgets.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name} · {displayCategoryType(category.category_type, language)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="tenant-inline-form-grid">
              <div>
                <label className="form-label">{language === "es" ? "Monto presupuestado" : "Budget amount"}</label>
                <input
                  className="form-control"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formState.amount}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, amount: event.target.value }))
                  }
                />
              </div>
              <div>
                <label className="form-label">{language === "es" ? "Activo" : "Active"}</label>
                <select
                  className="form-select"
                  value={formState.isActive ? "true" : "false"}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      isActive: event.target.value === "true",
                    }))
                  }
                >
                  <option value="true">{language === "es" ? "Sí" : "Yes"}</option>
                  <option value="false">{language === "es" ? "No" : "No"}</option>
                </select>
              </div>
            </div>

            <div>
              <label className="form-label">{language === "es" ? "Nota" : "Note"}</label>
              <textarea
                className="form-control"
                rows={3}
                value={formState.note}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, note: event.target.value }))
                }
                placeholder={
                  language === "es"
                    ? "Ej: tope aprobado para marketing de marzo"
                    : "Example: approved marketing cap for March"
                }
              />
            </div>

            <div className="finance-inline-toolbar finance-inline-toolbar--compact">
              <button className="btn btn-primary" type="submit" disabled={isSubmitting}>
                {editingBudgetId
                  ? language === "es"
                    ? "Guardar cambios"
                    : "Save changes"
                  : language === "es"
                    ? "Registrar presupuesto"
                    : "Create budget"}
              </button>
              {editingBudgetId ? (
                <button
                  className="btn btn-outline-secondary"
                  type="button"
                  disabled={isSubmitting}
                  onClick={resetForm}
                >
                  {language === "es" ? "Cancelar edición" : "Cancel editing"}
                </button>
              ) : null}
            </div>
          </form>
        </PanelCard>

        <PanelCard
          title={language === "es" ? "Lectura del período" : "Period view"}
          subtitle={
            language === "es"
              ? "Filtra por tipo o estado para concentrarte en categorías con desviación, inactivas o sin uso."
              : "Filter by type or status to focus on categories with variance, inactive entries, or no usage."
          }
        >
          <div className="d-grid gap-3">
            <div className="tenant-inline-form-grid">
              <div>
                <label className="form-label">{language === "es" ? "Mes visible" : "Visible month"}</label>
                <input
                  className="form-control"
                  type="month"
                  value={filterMonth}
                  onChange={(event) => setFilterMonth(event.target.value)}
                />
              </div>
              <div>
                <label className="form-label">{language === "es" ? "Tipo" : "Type"}</label>
                <select
                  className="form-select"
                  value={filterCategoryType}
                  onChange={(event) => setFilterCategoryType(event.target.value)}
                >
                  <option value="">{language === "es" ? "Todos" : "All"}</option>
                  <option value="income">{language === "es" ? "Ingresos" : "Income"}</option>
                  <option value="expense">{language === "es" ? "Egresos" : "Expense"}</option>
                </select>
              </div>
            </div>
            <div className="tenant-inline-form-grid">
              <div>
                <label className="form-label">{language === "es" ? "Estado derivado" : "Derived status"}</label>
                <select
                  className="form-select"
                  value={filterBudgetStatus}
                  onChange={(event) => setFilterBudgetStatus(event.target.value)}
                >
                  <option value="">{language === "es" ? "Todos" : "All"}</option>
                  <option value="within_budget">{language === "es" ? "Dentro del presupuesto" : "Within budget"}</option>
                  <option value="over_budget">{language === "es" ? "Sobre el presupuesto" : "Over budget"}</option>
                  <option value="unused">{language === "es" ? "Sin ejecución" : "Unused"}</option>
                  <option value="inactive">{language === "es" ? "Inactivo" : "Inactive"}</option>
                </select>
              </div>
              <div className="d-flex align-items-end">
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="finance-budgets-include-inactive"
                    checked={includeInactive}
                    onChange={(event) => setIncludeInactive(event.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="finance-budgets-include-inactive">
                    {language === "es" ? "Incluir inactivos" : "Include inactive"}
                  </label>
                </div>
              </div>
            </div>
            <div className="tenant-detail-grid">
              <DetailField label={language === "es" ? "Presupuestado" : "Budgeted"} value={formatMoney(summary?.total_budgeted || 0, language, baseCurrencyCode)} />
              <DetailField label={language === "es" ? "Ejecutado" : "Actual"} value={formatMoney(summary?.total_actual || 0, language, baseCurrencyCode)} />
              <DetailField label={language === "es" ? "Desviación" : "Variance"} value={formatMoney(summary?.total_variance || 0, language, baseCurrencyCode)} />
              <DetailField label={language === "es" ? "Filas" : "Rows"} value={summary?.total_items || 0} />
            </div>
            <div className="tenant-detail-grid">
              <DetailField label={language === "es" ? "Ingreso presup." : "Budgeted income"} value={formatMoney(summary?.income_budgeted || 0, language, baseCurrencyCode)} />
              <DetailField label={language === "es" ? "Ingreso real" : "Actual income"} value={formatMoney(summary?.income_actual || 0, language, baseCurrencyCode)} />
              <DetailField label={language === "es" ? "Egreso presup." : "Budgeted expense"} value={formatMoney(summary?.expense_budgeted || 0, language, baseCurrencyCode)} />
              <DetailField label={language === "es" ? "Egreso real" : "Actual expense"} value={formatMoney(summary?.expense_actual || 0, language, baseCurrencyCode)} />
            </div>
            <div className="tenant-inline-form-grid">
              <div>
                <label className="form-label">{language === "es" ? "Clonar desde" : "Clone from"}</label>
                <input
                  className="form-control"
                  type="month"
                  value={cloneSourceMonth}
                  onChange={(event) => setCloneSourceMonth(event.target.value)}
                />
              </div>
              <div className="d-flex align-items-end">
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="finance-budgets-overwrite-existing"
                    checked={cloneOverwriteExisting}
                    onChange={(event) => setCloneOverwriteExisting(event.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="finance-budgets-overwrite-existing">
                    {language === "es" ? "Sobrescribir categorías existentes" : "Overwrite existing categories"}
                  </label>
                </div>
              </div>
            </div>
            <div className="finance-inline-toolbar finance-inline-toolbar--compact">
              <button
                className="btn btn-outline-primary"
                type="button"
                disabled={isSubmitting || !cloneSourceMonth || cloneSourceMonth === filterMonth}
                onClick={() => void handleCloneBudgets()}
              >
                {language === "es" ? "Clonar al mes visible" : "Clone into visible month"}
              </button>
            </div>
            <div className="tenant-inline-form-grid">
              <div>
                <label className="form-label">{language === "es" ? "Plantilla sugerida" : "Suggested template"}</label>
                <select
                  className="form-select"
                  value={templateMode}
                  onChange={(event) => setTemplateMode(event.target.value)}
                >
                  <option value="previous_month">
                    {language === "es" ? "Mes anterior" : "Previous month"}
                  </option>
                  <option value="same_month_last_year">
                    {language === "es" ? "Mismo mes año anterior" : "Same month last year"}
                  </option>
                  <option value="rolling_actual_average_3m">
                    {language === "es" ? "Promedio real últimos 3 meses" : "Actual average last 3 months"}
                  </option>
                </select>
              </div>
              <div className="d-flex align-items-end">
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="finance-budgets-template-overwrite-existing"
                    checked={templateOverwriteExisting}
                    onChange={(event) => setTemplateOverwriteExisting(event.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="finance-budgets-template-overwrite-existing">
                    {language === "es" ? "Sobrescribir con plantilla" : "Overwrite with template"}
                  </label>
                </div>
              </div>
            </div>
            <div className="finance-inline-toolbar finance-inline-toolbar--compact">
              <button
                className="btn btn-outline-secondary"
                type="button"
                disabled={isSubmitting}
                onClick={() => void handleApplyTemplate()}
              >
                {language === "es" ? "Aplicar plantilla al mes visible" : "Apply template to visible month"}
              </button>
            </div>
          </div>
        </PanelCard>
      </div>

      <PanelCard
        title={language === "es" ? "Foco presupuestario" : "Budget focus"}
        subtitle={
          language === "es"
            ? "Lectura corta de categorías que requieren revisión primero en el período visible."
            : "Short view of the categories that need review first in the visible period."
        }
      >
        {budgetsResponse && budgetsResponse.focus_items.length > 0 ? (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th>{language === "es" ? "Categoría" : "Category"}</th>
                  <th>{language === "es" ? "Tipo" : "Type"}</th>
                  <th>{language === "es" ? "Sugerencia" : "Suggestion"}</th>
                  <th>{language === "es" ? "Presupuesto" : "Budget"}</th>
                  <th>{language === "es" ? "Real" : "Actual"}</th>
                  <th>{language === "es" ? "Desviación" : "Variance"}</th>
                  <th>{language === "es" ? "Uso" : "Usage"}</th>
                  <th>{language === "es" ? "Estado" : "Status"}</th>
                  <th>{language === "es" ? "Acción" : "Action"}</th>
                </tr>
              </thead>
              <tbody>
                {budgetsResponse.focus_items.map((budget) => (
                  <tr key={`focus-${budget.id}`}>
                    <td>{budget.category_name}</td>
                    <td>{displayCategoryType(budget.category_type, language)}</td>
                    <td>{displayRecommendedAction(budget.recommended_action, language)}</td>
                    <td>{formatMoney(budget.amount, language, baseCurrencyCode)}</td>
                    <td>{formatMoney(budget.actual_amount, language, baseCurrencyCode)}</td>
                    <td>{formatMoney(budget.variance_amount, language, baseCurrencyCode)}</td>
                    <td>{formatPercent(budget.utilization_ratio)}</td>
                    <td>
                      <span className={`status-badge ${budgetStatusBadgeClass(budget.budget_status)}`}>
                        {displayBudgetStatus(budget.budget_status, language)}
                      </span>
                    </td>
                    <td>
                      <div className="finance-inline-toolbar finance-inline-toolbar--compact">
                        <button
                          className="btn btn-sm btn-outline-primary"
                          type="button"
                          onClick={() => handleFocusEdit(budget)}
                        >
                          {language === "es" ? "Editar" : "Edit"}
                        </button>
                        {buildGuidedAdjustmentMode(budget) ? (
                          <button
                            className="btn btn-sm btn-outline-primary"
                            type="button"
                            disabled={isSubmitting}
                            onClick={() => void handleFocusGuidedAdjustment(budget)}
                          >
                            {displayGuidedAdjustmentLabel(budget, language)}
                          </button>
                        ) : null}
                        <button
                          className="btn btn-sm btn-outline-secondary"
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => handleFocusToggleActive(budget)}
                        >
                          {budget.is_active
                            ? language === "es"
                              ? "Desactivar"
                              : "Deactivate"
                            : language === "es"
                              ? "Activar"
                              : "Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-secondary">
            {language === "es"
              ? "No hay categorías presupuestarias que priorizar con el filtro actual."
              : "There are no budget categories to prioritize with the current filter."}
          </div>
        )}
      </PanelCard>

      <PanelCard
        title={language === "es" ? "Presupuesto vs ejecución" : "Budget vs actual"}
        subtitle={
          language === "es"
            ? "Comparación mensual por categoría, con estado derivado para leer rápido qué necesita atención."
            : "Monthly comparison by category, with derived status to quickly spot what needs attention."
        }
      >
        {budgetsResponse && budgetsResponse.data.length > 0 ? (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th>{language === "es" ? "Mes" : "Month"}</th>
                  <th>{language === "es" ? "Categoría" : "Category"}</th>
                  <th>{language === "es" ? "Tipo" : "Type"}</th>
                  <th>{language === "es" ? "Presupuesto" : "Budget"}</th>
                  <th>{language === "es" ? "Real" : "Actual"}</th>
                  <th>{language === "es" ? "Desviación" : "Variance"}</th>
                  <th>{language === "es" ? "Uso" : "Usage"}</th>
                  <th>{language === "es" ? "Estado" : "Status"}</th>
                  <th>{language === "es" ? "Acción" : "Action"}</th>
                </tr>
              </thead>
              <tbody>
                {budgetsResponse.data.map((budget) => (
                  <tr key={budget.id}>
                    <td>{formatMonthLabel(budget.period_month, language)}</td>
                    <td>{budget.category_name}</td>
                    <td>{displayCategoryType(budget.category_type, language)}</td>
                    <td>{formatMoney(budget.amount, language, baseCurrencyCode)}</td>
                    <td>{formatMoney(budget.actual_amount, language, baseCurrencyCode)}</td>
                    <td>{formatMoney(budget.variance_amount, language, baseCurrencyCode)}</td>
                    <td>{formatPercent(budget.utilization_ratio)}</td>
                    <td>
                      <span className={`status-badge ${budgetStatusBadgeClass(budget.budget_status)}`}>
                        {displayBudgetStatus(budget.budget_status, language)}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-sm btn-outline-primary"
                        type="button"
                        onClick={() => startEditingBudget(budget)}
                      >
                        {language === "es" ? "Editar" : "Edit"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-secondary">
            {language === "es"
              ? "No hay presupuestos para el filtro seleccionado."
              : "There are no budgets for the selected filter."}
          </div>
        )}
      </PanelCard>
    </div>
  );
}

function buildMonthValue() {
  return new Date().toISOString().slice(0, 7);
}

function buildMonthValueFromIso(value: string) {
  return value.slice(0, 7);
}

function buildPeriodMonthIso(value: string) {
  return `${value}-01`;
}

function formatMoney(value: number, language: "es" | "en", currencyCode: string): string {
  return new Intl.NumberFormat(language === "es" ? "es-CL" : "en-US", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value: number | null): string {
  if (value == null) {
    return "—";
  }
  return `${(value * 100).toFixed(0)}%`;
}

function formatMonthLabel(value: string, language: "es" | "en"): string {
  return new Intl.DateTimeFormat(language === "es" ? "es-CL" : "en-US", {
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function displayCategoryType(value: string, language: "es" | "en"): string {
  return getFinanceCategoryTypeLabel(value, language);
}

function displayBudgetStatus(value: string, language: "es" | "en"): string {
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

function displayRecommendedAction(value: string, language: "es" | "en"): string {
  if (value === "adjust_amount") {
    return language === "es" ? "ajustar monto" : "adjust amount";
  }
  if (value === "review_usage") {
    return language === "es" ? "revisar uso" : "review usage";
  }
  if (value === "activate_budget") {
    return language === "es" ? "activar presupuesto" : "activate budget";
  }
  if (value === "keep_tracking") {
    return language === "es" ? "seguir monitoreo" : "keep tracking";
  }
  return value;
}

function buildGuidedAdjustmentMode(item: TenantFinanceBudgetFocusItem): string | null {
  if (item.recommended_action === "adjust_amount") {
    return "align_to_actual_with_margin";
  }
  if (item.recommended_action === "review_usage") {
    return "deactivate_unused";
  }
  return null;
}

function displayGuidedAdjustmentLabel(
  item: TenantFinanceBudgetFocusItem,
  language: "es" | "en"
): string {
  const mode = buildGuidedAdjustmentMode(item);
  if (mode === "align_to_actual_with_margin") {
    return language === "es" ? "Ajustar al real +10%" : "Adjust to actual +10%";
  }
  if (mode === "deactivate_unused") {
    return language === "es" ? "Desactivar sin uso" : "Deactivate unused";
  }
  return language === "es" ? "Aplicar ajuste" : "Apply adjustment";
}

function budgetStatusBadgeClass(value: string): string {
  if (value === "over_budget") {
    return "status-badge--danger";
  }
  if (value === "within_budget") {
    return "status-badge--success";
  }
  if (value === "unused") {
    return "status-badge--warning";
  }
  return "status-badge--neutral";
}

function DetailField({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div>
      <div className="tenant-detail__label">{label}</div>
      <div className="tenant-detail__value">{value}</div>
    </div>
  );
}
