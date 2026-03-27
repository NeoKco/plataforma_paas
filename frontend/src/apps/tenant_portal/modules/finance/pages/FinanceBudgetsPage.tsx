import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { MetricCard } from "../../../../../components/common/MetricCard";
import { PageHeader } from "../../../../../components/common/PageHeader";
import { PanelCard } from "../../../../../components/common/PanelCard";
import { ErrorState } from "../../../../../components/feedback/ErrorState";
import { LoadingBlock } from "../../../../../components/feedback/LoadingBlock";
import { getApiErrorDisplayMessage } from "../../../../../services/api";
import { useTenantAuth } from "../../../../../store/tenant-auth-context";
import type { ApiError } from "../../../../../types";
import {
  getTenantFinanceCategories,
  type TenantFinanceCategory,
} from "../services/categoriesService";
import {
  createTenantFinanceBudget,
  getTenantFinanceBudgets,
  updateTenantFinanceBudget,
  type TenantFinanceBudget,
  type TenantFinanceBudgetsResponse,
} from "../services/budgetsService";

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

export function FinanceBudgetsPage() {
  const { session } = useTenantAuth();
  const [budgetsResponse, setBudgetsResponse] =
    useState<TenantFinanceBudgetsResponse | null>(null);
  const [categories, setCategories] = useState<TenantFinanceCategory[]>([]);
  const [editingBudgetId, setEditingBudgetId] = useState<number | null>(null);
  const [filterMonth, setFilterMonth] = useState(buildMonthValue());
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

  useEffect(() => {
    void loadBudgetWorkspace();
  }, [session?.accessToken, filterMonth]);

  useEffect(() => {
    if (!formState.categoryId && categoriesForBudgets.length > 0) {
      setFormState((current) => ({
        ...current,
        categoryId: String(categoriesForBudgets[0].id),
      }));
    }
  }, [categoriesForBudgets, formState.categoryId]);

  async function loadBudgetWorkspace() {
    if (!session?.accessToken) {
      return;
    }

    setIsLoading(true);
    setError(null);

    const results = await Promise.allSettled([
      getTenantFinanceBudgets(session.accessToken, buildPeriodMonthIso(filterMonth), true),
      getTenantFinanceCategories(session.accessToken, { includeInactive: false }),
    ]);

    const [budgetsResult, categoriesResult] = results;

    if (budgetsResult.status === "rejected" && categoriesResult.status === "rejected") {
      setBudgetsResponse(null);
      setCategories([]);
      setError(budgetsResult.reason as ApiError);
      setIsLoading(false);
      return;
    }

    setBudgetsResponse(budgetsResult.status === "fulfilled" ? budgetsResult.value : null);
    setCategories(categoriesResult.status === "fulfilled" ? categoriesResult.value.data : []);
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

  const summary = budgetsResponse?.summary;

  return (
    <div className="d-grid gap-4">
      <PageHeader
        eyebrow="Finance"
        title="Presupuestos"
        description="Define metas mensuales por categoría y compara rápidamente lo presupuestado contra lo ejecutado."
      />

      {actionFeedback ? (
        <div className={`tenant-action-feedback tenant-action-feedback--${actionFeedback.type}`}>
          <strong>Presupuestos:</strong> {actionFeedback.message}
        </div>
      ) : null}

      {isLoading ? <LoadingBlock label="Cargando presupuestos..." /> : null}

      <div className="tenant-portal-metrics">
        <MetricCard label="Presupuestado" value={formatMoney(summary?.total_budgeted || 0)} hint="Total del mes visible" />
        <MetricCard label="Ejecutado" value={formatMoney(summary?.total_actual || 0)} hint="Real acumulado por categoría" />
        <MetricCard label="Desviación" value={formatMoney(summary?.total_variance || 0)} hint="Presupuesto menos real" />
        <MetricCard label="Ítems" value={summary?.total_items || 0} hint="Presupuestos del período" />
      </div>

      {error ? (
        <ErrorState
          title="Presupuestos no disponibles"
          detail={error.payload?.detail || error.message}
          requestId={error.payload?.request_id}
        />
      ) : null}

      <div className="tenant-portal-split tenant-portal-split--finance">
        <PanelCard
          title={editingBudgetId ? "Editar presupuesto" : "Registrar presupuesto"}
          subtitle="Primer corte: presupuesto mensual por categoría con comparación contra gasto o ingreso real."
        >
          <form className="d-grid gap-3" onSubmit={handleSubmit}>
            <div className="tenant-inline-form-grid">
              <div>
                <label className="form-label">Mes</label>
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
                <label className="form-label">Categoría</label>
                <select
                  className="form-select"
                  value={formState.categoryId}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, categoryId: event.target.value }))
                  }
                >
                  <option value="">Selecciona una categoría</option>
                  {categoriesForBudgets.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name} · {displayCategoryType(category.category_type)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="tenant-inline-form-grid">
              <div>
                <label className="form-label">Monto presupuestado</label>
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
                <label className="form-label">Activo</label>
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
                  <option value="true">Sí</option>
                  <option value="false">No</option>
                </select>
              </div>
            </div>

            <div>
              <label className="form-label">Nota</label>
              <textarea
                className="form-control"
                rows={3}
                value={formState.note}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, note: event.target.value }))
                }
                placeholder="Ej: tope aprobado para marketing de marzo"
              />
            </div>

            <div className="finance-inline-toolbar finance-inline-toolbar--compact">
              <button className="btn btn-primary" type="submit" disabled={isSubmitting}>
                {editingBudgetId ? "Guardar cambios" : "Registrar presupuesto"}
              </button>
              {editingBudgetId ? (
                <button
                  className="btn btn-outline-secondary"
                  type="button"
                  disabled={isSubmitting}
                  onClick={resetForm}
                >
                  Cancelar edición
                </button>
              ) : null}
            </div>
          </form>
        </PanelCard>

        <PanelCard
          title="Lectura del período"
          subtitle="Selecciona el mes que quieres revisar y observa el desvío global del presupuesto."
        >
          <div className="d-grid gap-3">
            <div>
              <label className="form-label">Mes visible</label>
              <input
                className="form-control"
                type="month"
                value={filterMonth}
                onChange={(event) => setFilterMonth(event.target.value)}
              />
            </div>
            <div className="tenant-detail-grid">
              <DetailField label="Presupuestado" value={formatMoney(summary?.total_budgeted || 0)} />
              <DetailField label="Ejecutado" value={formatMoney(summary?.total_actual || 0)} />
              <DetailField label="Desviación" value={formatMoney(summary?.total_variance || 0)} />
              <DetailField label="Filas" value={summary?.total_items || 0} />
            </div>
          </div>
        </PanelCard>
      </div>

      <PanelCard
        title="Presupuesto vs ejecución"
        subtitle="Comparación mensual por categoría para ingreso o egreso."
      >
        {budgetsResponse && budgetsResponse.data.length > 0 ? (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th>Mes</th>
                  <th>Categoría</th>
                  <th>Tipo</th>
                  <th>Presupuesto</th>
                  <th>Real</th>
                  <th>Desviación</th>
                  <th>Uso</th>
                  <th>Estado</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {budgetsResponse.data.map((budget) => (
                  <tr key={budget.id}>
                    <td>{formatMonthLabel(budget.period_month)}</td>
                    <td>{budget.category_name}</td>
                    <td>{displayCategoryType(budget.category_type)}</td>
                    <td>{formatMoney(budget.amount)}</td>
                    <td>{formatMoney(budget.actual_amount)}</td>
                    <td>{formatMoney(budget.variance_amount)}</td>
                    <td>{formatPercent(budget.utilization_ratio)}</td>
                    <td>
                      {budget.is_active ? (
                        <span className="status-badge status-badge--success">activo</span>
                      ) : (
                        <span className="status-badge status-badge--neutral">inactivo</span>
                      )}
                    </td>
                    <td>
                      <button
                        className="btn btn-sm btn-outline-primary"
                        type="button"
                        onClick={() => startEditingBudget(budget)}
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-secondary">
            Aún no existen presupuestos para el período seleccionado.
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

function formatMoney(value: number): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value: number | null): string {
  if (value == null) {
    return "—";
  }
  return `${(value * 100).toFixed(0)}%`;
}

function formatMonthLabel(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function displayCategoryType(value: string): string {
  return value === "income" ? "ingreso" : value === "expense" ? "egreso" : value;
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
