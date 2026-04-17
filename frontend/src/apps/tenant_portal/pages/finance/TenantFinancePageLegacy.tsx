import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { MetricCard } from "../../../../components/common/MetricCard";
import { PageHeader } from "../../../../components/common/PageHeader";
import { PanelCard } from "../../../../components/common/PanelCard";
import { StatusBadge } from "../../../../components/common/StatusBadge";
import { DataTableCard } from "../../../../components/data-display/DataTableCard";
import { AppBadge } from "../../../../design-system/AppBadge";
import { AppForm, AppFormActions, AppFormField } from "../../../../design-system/AppForm";
import { ErrorState } from "../../../../components/feedback/ErrorState";
import { LoadingBlock } from "../../../../components/feedback/LoadingBlock";
import { getApiErrorDisplayMessage } from "../../../../services/api";
import {
  createTenantFinanceEntry,
  getTenantFinanceEntries,
  getTenantFinanceSummary,
  getTenantFinanceUsage,
} from "../../../../services/tenant-api";
import { useLanguage } from "../../../../store/language-context";
import { useTenantAuth } from "../../../../store/tenant-auth-context";
import { getTenantPortalActionSuccessMessage } from "../../../../utils/action-feedback";
import { displayPlatformCode } from "../../../../utils/platform-labels";
import type {
  ApiError,
  TenantFinanceEntriesResponse,
  TenantFinanceSummaryResponse,
  TenantFinanceUsageResponse,
} from "../../../../types";

type ActionFeedback = {
  scope: string;
  type: "success" | "error";
  message: string;
};

const MOVEMENT_TYPES = ["income", "expense"];

function getActionFeedbackLabel(scope: string, language: "es" | "en"): string {
  if (scope === "create-entry") {
    return language === "es" ? "Crear movimiento" : "Create transaction";
  }
  return scope;
}

export function TenantFinancePage() {
  const { session } = useTenantAuth();
  const { language } = useLanguage();
  const [entriesResponse, setEntriesResponse] =
    useState<TenantFinanceEntriesResponse | null>(null);
  const [summaryResponse, setSummaryResponse] =
    useState<TenantFinanceSummaryResponse | null>(null);
  const [usageResponse, setUsageResponse] =
    useState<TenantFinanceUsageResponse | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [usageError, setUsageError] = useState<ApiError | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionSubmitting, setIsActionSubmitting] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<ActionFeedback | null>(null);

  const [movementType, setMovementType] = useState("expense");
  const [concept, setConcept] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");

  const entries = entriesResponse?.data || [];
  const summary = summaryResponse?.data;
  const usage = usageResponse?.data;

  const overview = useMemo(() => {
    return {
      totalEntries: summary?.total_entries || 0,
      totalIncome: summary?.total_income || 0,
      totalExpense: summary?.total_expense || 0,
      netResult: (summary?.net_result ?? summary?.balance ?? 0),
    };
  }, [summary]);

  async function loadFinance() {
    if (!session?.accessToken) {
      return;
    }

    setIsLoading(true);
    setError(null);
    setUsageError(null);

    const results = await Promise.allSettled([
      getTenantFinanceEntries(session.accessToken),
      getTenantFinanceSummary(session.accessToken),
      getTenantFinanceUsage(session.accessToken),
    ]);

    const [entriesResult, summaryResult, usageResult] = results;

    if (
      entriesResult.status === "rejected" &&
      summaryResult.status === "rejected" &&
      usageResult.status === "rejected"
    ) {
      setEntriesResponse(null);
      setSummaryResponse(null);
      setUsageResponse(null);
      setError(entriesResult.reason as ApiError);
      setIsLoading(false);
      return;
    }

    if (entriesResult.status === "fulfilled") {
      setEntriesResponse(entriesResult.value);
    } else {
      setEntriesResponse(null);
    }

    if (summaryResult.status === "fulfilled") {
      setSummaryResponse(summaryResult.value);
    } else {
      setSummaryResponse(null);
    }

    if (usageResult.status === "fulfilled") {
      setUsageResponse(usageResult.value);
    } else {
      setUsageResponse(null);
      setUsageError(usageResult.reason as ApiError);
    }

    setIsLoading(false);
  }

  useEffect(() => {
    void loadFinance();
  }, [session?.accessToken]);

  async function runAction(
    scope: string,
    action: () => Promise<{ message: string }>
  ) {
    setIsActionSubmitting(true);
    setActionFeedback(null);

    try {
      const result = await action();
      await loadFinance();
      setActionFeedback({
        scope,
        type: "success",
        message: getTenantPortalActionSuccessMessage(scope, result.message, language),
      });
    } catch (rawError) {
      const typedError = rawError as ApiError;
      setActionFeedback({
        scope,
        type: "error",
        message: getApiErrorDisplayMessage(typedError),
      });
    } finally {
      setIsActionSubmitting(false);
    }
  }

  function resetEntryForm() {
    setMovementType("expense");
    setConcept("");
    setAmount("");
    setCategory("");
  }

  function handleCreateEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.accessToken) {
      return;
    }

    void runAction("create-entry", async () => {
      const response = await createTenantFinanceEntry(session.accessToken, {
        movement_type: movementType,
        concept: concept.trim(),
        amount: Number.parseFloat(amount),
        category: normalizeNullableString(category),
      });
      resetEntryForm();
      return response;
    });
  }

  return (
    <div className="d-grid gap-4">
      <PageHeader
        eyebrow={language === "es" ? "Espacio" : "Workspace"}
        title={language === "es" ? "Finanzas" : "Finance"}
        description={
          language === "es"
            ? "Consulta el resumen financiero de tu espacio y registra nuevos movimientos."
            : "Review your workspace financial summary and register new transactions."
        }
        icon="finance"
      />

      {actionFeedback ? (
        <div
          className={`tenant-action-feedback tenant-action-feedback--${actionFeedback.type}`}
        >
          <strong>{getActionFeedbackLabel(actionFeedback.scope, language)}:</strong>{" "}
          {actionFeedback.message}
        </div>
      ) : null}

      {isLoading ? (
        <LoadingBlock
          label={
            language === "es"
              ? "Cargando finanzas del tenant..."
              : "Loading tenant finance..."
          }
        />
      ) : null}

      <div className="tenant-portal-metrics">
        <MetricCard
          label={language === "es" ? "Movimientos" : "Transactions"}
          icon="transactions"
          tone="default"
          value={overview.totalEntries}
          hint={language === "es" ? "Entradas registradas" : "Registered entries"}
        />
        <MetricCard
          label={language === "es" ? "Ingresos" : "Income"}
          icon="income"
          tone="success"
          value={formatMoney(overview.totalIncome)}
          hint={language === "es" ? "Acumulado visible" : "Visible accumulated"}
        />
        <MetricCard
          label={language === "es" ? "Egresos" : "Expenses"}
          icon="expense"
          tone="warning"
          value={formatMoney(overview.totalExpense)}
          hint={language === "es" ? "Acumulado visible" : "Visible accumulated"}
        />
        <MetricCard
          label={language === "es" ? "Resultado neto" : "Net result"}
          icon="balance"
          tone="info"
          value={formatMoney(overview.netResult)}
          hint={language === "es" ? "Ingresos menos egresos visibles" : "Visible income minus expenses"}
        />
      </div>

      {error ? (
        <ErrorState
          title={
            language === "es"
              ? "Finanzas tenant no disponibles"
              : "Tenant finance unavailable"
          }
          detail={error.payload?.detail || error.message}
          requestId={error.payload?.request_id}
        />
      ) : null}

      <div className="tenant-portal-split tenant-portal-split--finance">
        <PanelCard
          icon="transactions"
          title={language === "es" ? "Crear movimiento" : "Create transaction"}
          subtitle={
            language === "es"
              ? "Registra un ingreso o egreso para este tenant."
              : "Register an income or expense for this tenant."
          }
        >
          <AppForm onSubmit={handleCreateEntry}>
            <AppFormField label={language === "es" ? "Tipo de movimiento" : "Transaction type"}>
                <select
                  className="form-select"
                  value={movementType}
                  onChange={(event) => setMovementType(event.target.value)}
                >
                  {MOVEMENT_TYPES.map((value) => (
                    <option key={value} value={value}>
                      {value === "income"
                        ? language === "es"
                          ? "ingreso"
                          : "income"
                        : language === "es"
                          ? "egreso"
                          : "expense"}
                    </option>
                  ))}
                </select>
            </AppFormField>
            <AppFormField label={language === "es" ? "Monto" : "Amount"}>
                <input
                  className="form-control"
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="0.00"
                />
            </AppFormField>
            <AppFormField label={language === "es" ? "Concepto" : "Concept"} fullWidth>
              <input
                className="form-control"
                value={concept}
                onChange={(event) => setConcept(event.target.value)}
                placeholder={
                  language === "es" ? "Ej: Pago de servicio" : "Ex: Service payment"
                }
              />
            </AppFormField>
            <AppFormField label={language === "es" ? "Categoría" : "Category"} fullWidth>
              <input
                className="form-control"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                placeholder={
                  language === "es"
                    ? "Ej: Operación, ventas, caja"
                    : "Ex: Operations, sales, cash"
                }
              />
            </AppFormField>
            <AppFormActions>
              <button
                className="btn btn-primary"
                type="submit"
                disabled={isActionSubmitting}
              >
                {language === "es" ? "Crear movimiento" : "Create transaction"}
              </button>
            </AppFormActions>
          </AppForm>
        </PanelCard>

        <PanelCard
          icon="focus"
          title={language === "es" ? "Uso efectivo" : "Effective usage"}
          subtitle={
            language === "es"
              ? "Refleja la cuota vigente para registrar movimientos."
              : "Reflects the current quota to register transactions."
          }
        >
          {usageError ? (
            <ErrorState
              title={
                language === "es"
                  ? "Uso de finanzas no disponible"
                  : "Finance usage unavailable"
              }
              detail={usageError.payload?.detail || usageError.message}
              requestId={usageError.payload?.request_id}
            />
          ) : usage ? (
            <div className="tenant-detail-grid">
              <DetailField
                label={language === "es" ? "Clave de módulo" : "Module key"}
                value={<code>{usage.module_key}</code>}
              />
              <DetailField
                label={language === "es" ? "Movimientos usados" : "Used transactions"}
                value={usage.used_entries}
              />
              <DetailField
                label={language === "es" ? "Límite" : "Limit"}
                value={
                  usage.unlimited
                    ? language === "es"
                      ? "ilimitado"
                      : "unlimited"
                    : usage.max_entries ?? "—"
                }
              />
              <DetailField
                label={language === "es" ? "Restante" : "Remaining"}
                value={usage.unlimited ? "—" : usage.remaining_entries ?? "—"}
              />
              <DetailField
                label={language === "es" ? "Fuente" : "Source"}
                value={
                  usage.limit_source
                    ? displayPlatformCode(usage.limit_source, language)
                    : language === "es"
                      ? "ninguna"
                      : "none"
                }
              />
              <DetailField
                label={language === "es" ? "Estado" : "Status"}
                value={
                  usage.at_limit ? (
                    <AppBadge tone="warning">
                      {language === "es" ? "al límite" : "at limit"}
                    </AppBadge>
                  ) : (
                    <AppBadge tone="success">
                      {language === "es" ? "ok" : "ok"}
                    </AppBadge>
                  )
                }
              />
            </div>
          ) : (
            <div className="text-secondary">
              {language === "es"
                ? "Los datos de uso no están disponibles."
                : "Usage data is not available."}
            </div>
          )}
        </PanelCard>
      </div>

      {entries.length > 0 ? (
        <DataTableCard
          title={language === "es" ? "Movimientos financieros" : "Financial transactions"}
          rows={entries}
          columns={[
            {
              key: "movement_type",
              header: language === "es" ? "Tipo" : "Type",
              render: (row) => <StatusBadge value={row.movement_type} />,
            },
            {
              key: "concept",
              header: language === "es" ? "Concepto" : "Concept",
              render: (row) => row.concept,
            },
            {
              key: "amount",
              header: language === "es" ? "Monto" : "Amount",
              render: (row) => formatMoney(row.amount),
            },
            {
              key: "category",
              header: language === "es" ? "Categoría" : "Category",
              render: (row) => row.category || "—",
            },
            {
              key: "created_by_user_id",
              header: language === "es" ? "Creado por" : "Created by",
              render: (row) => row.created_by_user_id || "—",
            },
          ]}
        />
      ) : !isLoading && !error ? (
        <PanelCard
          icon="transactions"
          title={language === "es" ? "Movimientos financieros" : "Financial transactions"}
        >
          <div className="text-secondary">
            {language === "es"
              ? "Aún no se registran movimientos financieros para este tenant."
              : "There are no financial transactions registered for this tenant yet."}
          </div>
        </PanelCard>
      ) : null}
    </div>
  );
}

function normalizeNullableString(value: string): string | null {
  const normalized = value.trim();
  return normalized ? normalized : null;
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function DetailField({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <div className="tenant-detail__label">{label}</div>
      <div className="tenant-detail__value">{value}</div>
    </div>
  );
}
