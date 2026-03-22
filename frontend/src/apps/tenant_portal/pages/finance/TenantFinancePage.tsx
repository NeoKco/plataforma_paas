import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { MetricCard } from "../../../../components/common/MetricCard";
import { PageHeader } from "../../../../components/common/PageHeader";
import { PanelCard } from "../../../../components/common/PanelCard";
import { StatusBadge } from "../../../../components/common/StatusBadge";
import { DataTableCard } from "../../../../components/data-display/DataTableCard";
import { ErrorState } from "../../../../components/feedback/ErrorState";
import { LoadingBlock } from "../../../../components/feedback/LoadingBlock";
import {
  createTenantFinanceEntry,
  getTenantFinanceEntries,
  getTenantFinanceSummary,
  getTenantFinanceUsage,
} from "../../../../services/tenant-api";
import { useTenantAuth } from "../../../../store/tenant-auth-context";
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

export function TenantFinancePage() {
  const { session } = useTenantAuth();
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
      balance: summary?.balance || 0,
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
        message: result.message,
      });
    } catch (rawError) {
      const typedError = rawError as ApiError;
      setActionFeedback({
        scope,
        type: "error",
        message: typedError.payload?.detail || typedError.message,
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
        eyebrow="Espacio"
        title="Finanzas"
        description="Consulta el resumen financiero de tu espacio y registra nuevos movimientos."
      />

      {actionFeedback ? (
        <div
          className={`tenant-action-feedback tenant-action-feedback--${actionFeedback.type}`}
        >
          <strong>{actionFeedback.scope}:</strong> {actionFeedback.message}
        </div>
      ) : null}

      {isLoading ? <LoadingBlock label="Cargando finanzas del tenant..." /> : null}

      <div className="tenant-portal-metrics">
        <MetricCard label="Movimientos" value={overview.totalEntries} hint="Entradas registradas" />
        <MetricCard label="Ingresos" value={formatMoney(overview.totalIncome)} hint="Acumulado visible" />
        <MetricCard label="Egresos" value={formatMoney(overview.totalExpense)} hint="Acumulado visible" />
        <MetricCard label="Balance" value={formatMoney(overview.balance)} hint="Resultado actual" />
      </div>

      {error ? (
        <ErrorState
          title="Finanzas tenant no disponibles"
          detail={error.payload?.detail || error.message}
          requestId={error.payload?.request_id}
        />
      ) : null}

      <div className="tenant-portal-split tenant-portal-split--finance">
        <PanelCard
          title="Crear movimiento"
          subtitle="Registra un ingreso o egreso para este tenant."
        >
          <form className="d-grid gap-3" onSubmit={handleCreateEntry}>
            <div className="tenant-inline-form-grid">
              <div>
                <label className="form-label">Tipo de movimiento</label>
                <select
                  className="form-select"
                  value={movementType}
                  onChange={(event) => setMovementType(event.target.value)}
                >
                  {MOVEMENT_TYPES.map((value) => (
                    <option key={value} value={value}>
                      {value === "income" ? "ingreso" : "egreso"}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Monto</label>
                <input
                  className="form-control"
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div>
              <label className="form-label">Concepto</label>
              <input
                className="form-control"
                value={concept}
                onChange={(event) => setConcept(event.target.value)}
                placeholder="Ej: Pago de servicio"
              />
            </div>
            <div>
              <label className="form-label">Categoría</label>
              <input
                className="form-control"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                placeholder="Ej: Operación, ventas, caja"
              />
            </div>
            <button
              className="btn btn-primary"
              type="submit"
              disabled={isActionSubmitting}
            >
              Crear movimiento
            </button>
          </form>
        </PanelCard>

        <PanelCard
          title="Uso efectivo"
          subtitle="Refleja la cuota vigente para registrar movimientos."
        >
          {usageError ? (
            <ErrorState
              title="Uso de finanzas no disponible"
              detail={usageError.payload?.detail || usageError.message}
              requestId={usageError.payload?.request_id}
            />
          ) : usage ? (
            <div className="tenant-detail-grid">
              <DetailField label="Clave de módulo" value={<code>{usage.module_key}</code>} />
              <DetailField label="Movimientos usados" value={usage.used_entries} />
              <DetailField
                label="Límite"
                value={usage.unlimited ? "ilimitado" : usage.max_entries ?? "—"}
              />
              <DetailField
                label="Restante"
                value={usage.unlimited ? "—" : usage.remaining_entries ?? "—"}
              />
              <DetailField
                label="Fuente"
                value={usage.limit_source || "ninguna"}
              />
              <DetailField
                label="Estado"
                value={
                  usage.at_limit ? (
                    <span className="status-badge status-badge--warning">al_límite</span>
                  ) : (
                    <span className="status-badge status-badge--success">ok</span>
                  )
                }
              />
            </div>
          ) : (
            <div className="text-secondary">Los datos de uso no están disponibles.</div>
          )}
        </PanelCard>
      </div>

      {entries.length > 0 ? (
        <DataTableCard
          title="Movimientos financieros"
          rows={entries}
          columns={[
            {
              key: "movement_type",
              header: "Tipo",
              render: (row) => <StatusBadge value={row.movement_type} />,
            },
            {
              key: "concept",
              header: "Concepto",
              render: (row) => row.concept,
            },
            {
              key: "amount",
              header: "Monto",
              render: (row) => formatMoney(row.amount),
            },
            {
              key: "category",
              header: "Categoría",
              render: (row) => row.category || "—",
            },
            {
              key: "created_by_user_id",
              header: "Creado por",
              render: (row) => row.created_by_user_id || "—",
            },
          ]}
        />
      ) : !isLoading && !error ? (
        <PanelCard title="Movimientos financieros">
          <div className="text-secondary">
            Aún no se registran movimientos financieros para este tenant.
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
