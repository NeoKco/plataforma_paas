import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { MetricCard } from "../../../../../components/common/MetricCard";
import { PageHeader } from "../../../../../components/common/PageHeader";
import { PanelCard } from "../../../../../components/common/PanelCard";
import { StatusBadge } from "../../../../../components/common/StatusBadge";
import { ErrorState } from "../../../../../components/feedback/ErrorState";
import { LoadingBlock } from "../../../../../components/feedback/LoadingBlock";
import { getApiErrorDisplayMessage } from "../../../../../services/api";
import { useTenantAuth } from "../../../../../store/tenant-auth-context";
import { displayPlatformCode } from "../../../../../utils/platform-labels";
import type { ApiError } from "../../../../../types";
import {
  getTenantFinanceAccounts,
  type TenantFinanceAccount,
} from "../services/accountsService";
import {
  getTenantFinanceCategories,
  type TenantFinanceCategory,
} from "../services/categoriesService";
import {
  getTenantFinanceCurrencies,
  type TenantFinanceCurrency,
} from "../services/currenciesService";
import {
  createTenantFinanceTransaction,
  getTenantFinanceAccountBalances,
  getTenantFinanceSummary,
  getTenantFinanceTransactionDetail,
  getTenantFinanceTransactions,
  getTenantFinanceUsage,
  updateTenantFinanceTransaction,
  updateTenantFinanceTransactionFavorite,
  updateTenantFinanceTransactionReconciliation,
  type TenantFinanceAccountBalance,
  type TenantFinanceTransactionFilters,
  type TenantFinanceSummaryResponse,
  type TenantFinanceTransaction,
  type TenantFinanceTransactionDetailResponse,
  type TenantFinanceUsageResponse,
} from "../services/transactionsService";
import { useTransactionFilters } from "../hooks/useTransactionFilters";

type ActionFeedback = {
  type: "success" | "error";
  message: string;
};

type TransactionFormState = {
  transactionType: string;
  accountId: string;
  targetAccountId: string;
  categoryId: string;
  currencyId: string;
  amount: string;
  exchangeRate: string;
  transactionAt: string;
  description: string;
  notes: string;
  isReconciled: boolean;
  isFavorite: boolean;
};

const DEFAULT_FORM_STATE: TransactionFormState = {
  transactionType: "expense",
  accountId: "",
  targetAccountId: "",
  categoryId: "",
  currencyId: "",
  amount: "",
  exchangeRate: "",
  transactionAt: buildDateTimeLocalValue(),
  description: "",
  notes: "",
  isReconciled: false,
  isFavorite: false,
};

export function FinanceTransactionsPage() {
  const { session } = useTenantAuth();
  const [transactions, setTransactions] = useState<TenantFinanceTransaction[]>([]);
  const [summaryResponse, setSummaryResponse] =
    useState<TenantFinanceSummaryResponse | null>(null);
  const [usageResponse, setUsageResponse] =
    useState<TenantFinanceUsageResponse | null>(null);
  const [accountBalances, setAccountBalances] = useState<TenantFinanceAccountBalance[]>([]);
  const [accounts, setAccounts] = useState<TenantFinanceAccount[]>([]);
  const [categories, setCategories] = useState<TenantFinanceCategory[]>([]);
  const [currencies, setCurrencies] = useState<TenantFinanceCurrency[]>([]);
  const [selectedTransactionId, setSelectedTransactionId] = useState<number | null>(null);
  const [selectedTransactionDetail, setSelectedTransactionDetail] =
    useState<TenantFinanceTransactionDetailResponse["data"] | null>(null);
  const [editingTransactionId, setEditingTransactionId] = useState<number | null>(null);
  const [formState, setFormState] = useState<TransactionFormState>(DEFAULT_FORM_STATE);
  const [error, setError] = useState<ApiError | null>(null);
  const [detailError, setDetailError] = useState<ApiError | null>(null);
  const [usageError, setUsageError] = useState<ApiError | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionSubmitting, setIsActionSubmitting] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<ActionFeedback | null>(null);
  const { filters, setFilters } = useTransactionFilters<{
    transactionType: string;
    accountId: string;
    categoryId: string;
    reconciliation: string;
    search: string;
  }>({
    transactionType: "",
    accountId: "",
    categoryId: "",
    reconciliation: "",
    search: "",
  });

  const summary = summaryResponse?.data;
  const usage = usageResponse?.data;
  const baseCurrency =
    currencies.find((currency) => currency.is_base) || currencies[0] || null;
  const accountMap = useMemo(
    () => new Map(accounts.map((account) => [account.id, account])),
    [accounts]
  );
  const categoryMap = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories]
  );
  const currencyMap = useMemo(
    () => new Map(currencies.map((currency) => [currency.id, currency])),
    [currencies]
  );

  const filteredCategories = useMemo(() => {
    if (formState.transactionType === "transfer") {
      return [];
    }
    return categories.filter((category) => {
      if (!category.is_active) {
        return false;
      }
      return category.category_type === formState.transactionType;
    });
  }, [categories, formState.transactionType]);

  useEffect(() => {
    void loadFinanceWorkspace();
  }, [
    session?.accessToken,
    filters.transactionType,
    filters.accountId,
    filters.categoryId,
    filters.reconciliation,
    filters.search,
  ]);

  useEffect(() => {
    if (!formState.currencyId && baseCurrency) {
      setFormState((current) => ({
        ...current,
        currencyId: String(baseCurrency.id),
      }));
    }
    if (!formState.accountId && accounts.length > 0) {
      setFormState((current) => ({
        ...current,
        accountId: current.accountId || String(accounts[0].id),
      }));
    }
  }, [accounts, baseCurrency, formState.accountId, formState.currencyId]);

  async function loadFinanceWorkspace() {
    if (!session?.accessToken) {
      return;
    }

    setIsLoading(true);
    setError(null);
    setUsageError(null);

    const results = await Promise.allSettled([
      getTenantFinanceTransactions(session.accessToken, buildApiFilters(filters)),
      getTenantFinanceSummary(session.accessToken),
      getTenantFinanceUsage(session.accessToken),
      getTenantFinanceAccountBalances(session.accessToken),
      getTenantFinanceAccounts(session.accessToken, false),
      getTenantFinanceCategories(session.accessToken, { includeInactive: false }),
      getTenantFinanceCurrencies(session.accessToken, false),
    ]);

    const [
      transactionsResult,
      summaryResult,
      usageResult,
      balancesResult,
      accountsResult,
      categoriesResult,
      currenciesResult,
    ] = results;

    if (
      transactionsResult.status === "rejected" &&
      summaryResult.status === "rejected" &&
      balancesResult.status === "rejected"
    ) {
      setTransactions([]);
      setSummaryResponse(null);
      setUsageResponse(null);
      setAccountBalances([]);
      setAccounts([]);
      setCategories([]);
      setCurrencies([]);
      setError(transactionsResult.reason as ApiError);
      setIsLoading(false);
      return;
    }

    setTransactions(
      transactionsResult.status === "fulfilled" ? transactionsResult.value.data : []
    );
    setSummaryResponse(summaryResult.status === "fulfilled" ? summaryResult.value : null);

    if (usageResult.status === "fulfilled") {
      setUsageResponse(usageResult.value);
    } else {
      setUsageResponse(null);
      setUsageError(usageResult.reason as ApiError);
    }

    setAccountBalances(balancesResult.status === "fulfilled" ? balancesResult.value.data : []);
    setAccounts(accountsResult.status === "fulfilled" ? accountsResult.value.data : []);
    setCategories(categoriesResult.status === "fulfilled" ? categoriesResult.value.data : []);
    setCurrencies(currenciesResult.status === "fulfilled" ? currenciesResult.value.data : []);
    setIsLoading(false);
  }

  async function runRowAction(action: () => Promise<void>) {
    setIsActionSubmitting(true);
    setActionFeedback(null);
    try {
      await action();
      await loadFinanceWorkspace();
      if (selectedTransactionId) {
        await fetchTransactionDetail(selectedTransactionId);
      }
    } catch (rawError) {
      setActionFeedback({
        type: "error",
        message: getApiErrorDisplayMessage(rawError as ApiError),
      });
    } finally {
      setIsActionSubmitting(false);
    }
  }

  async function loadTransactionDetail(transactionId: number) {
    if (!session?.accessToken) {
      return;
    }

    if (selectedTransactionId === transactionId) {
      setSelectedTransactionId(null);
      setSelectedTransactionDetail(null);
      setDetailError(null);
      return;
    }

    setSelectedTransactionId(transactionId);
    await fetchTransactionDetail(transactionId);
  }

  async function fetchTransactionDetail(transactionId: number) {
    if (!session?.accessToken) {
      return;
    }

    setSelectedTransactionDetail(null);
    setDetailError(null);
    setIsDetailLoading(true);
    try {
      const response = await getTenantFinanceTransactionDetail(
        session.accessToken,
        transactionId
      );
      setSelectedTransactionDetail(response.data);
    } catch (rawError) {
      setDetailError(rawError as ApiError);
    } finally {
      setIsDetailLoading(false);
    }
  }

  async function handleCreateTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.accessToken) {
      return;
    }

    setIsActionSubmitting(true);
    setActionFeedback(null);

    try {
      const payload = buildTransactionWritePayload(formState);
      const response = editingTransactionId
        ? await updateTenantFinanceTransaction(
            session.accessToken,
            editingTransactionId,
            payload
          )
        : await createTenantFinanceTransaction(session.accessToken, payload);

      await loadFinanceWorkspace();
      resetFormForCreate();
      setActionFeedback({ type: "success", message: response.message });
      setSelectedTransactionId(response.data.id);
      setEditingTransactionId(null);
      await fetchTransactionDetail(response.data.id);
    } catch (rawError) {
      setActionFeedback({
        type: "error",
        message: getApiErrorDisplayMessage(rawError as ApiError),
      });
    } finally {
      setIsActionSubmitting(false);
    }
  }

  async function handleToggleFavorite(transaction: TenantFinanceTransaction) {
    if (!session?.accessToken) {
      return;
    }
    await runRowAction(async () => {
      const response = await updateTenantFinanceTransactionFavorite(
        session.accessToken,
        transaction.id,
        !transaction.is_favorite
      );
      setActionFeedback({ type: "success", message: response.message });
    });
  }

  async function handleToggleReconciliation(transaction: TenantFinanceTransaction) {
    if (!session?.accessToken) {
      return;
    }
    await runRowAction(async () => {
      const response = await updateTenantFinanceTransactionReconciliation(
        session.accessToken,
        transaction.id,
        !transaction.is_reconciled
      );
      setActionFeedback({ type: "success", message: response.message });
    });
  }

  function startEditingTransaction(transaction: TenantFinanceTransaction) {
    setEditingTransactionId(transaction.id);
    setFormState(buildTransactionFormState(transaction));
    setActionFeedback(null);
  }

  function resetFormForCreate() {
    setEditingTransactionId(null);
    setFormState({
      ...DEFAULT_FORM_STATE,
      accountId: accounts[0] ? String(accounts[0].id) : "",
      currencyId: baseCurrency ? String(baseCurrency.id) : "",
      transactionAt: buildDateTimeLocalValue(),
    });
  }

  return (
    <div className="d-grid gap-4">
      <PageHeader
        eyebrow="Espacio"
        title="Transacciones financieras"
        description="Opera el núcleo real de finance con balances por cuenta y trazabilidad reciente."
      />

      {actionFeedback ? (
        <div className={`tenant-action-feedback tenant-action-feedback--${actionFeedback.type}`}>
          <strong>Transacciones:</strong> {actionFeedback.message}
        </div>
      ) : null}

      {isLoading ? <LoadingBlock label="Cargando transacciones financieras..." /> : null}

      <div className="tenant-portal-metrics">
        <MetricCard
          label="Transacciones"
          value={summary?.total_entries || 0}
          hint="Movimientos persistidos en finance_transactions"
        />
        <MetricCard
          label="Ingresos"
          value={formatMoney(summary?.total_income || 0, baseCurrency?.code)}
          hint="Acumulado visible"
        />
        <MetricCard
          label="Egresos"
          value={formatMoney(summary?.total_expense || 0, baseCurrency?.code)}
          hint="Acumulado visible"
        />
        <MetricCard
          label="Balance"
          value={formatMoney(summary?.balance || 0, baseCurrency?.code)}
          hint="Resultado actual"
        />
      </div>

      {error ? (
        <ErrorState
          title="Transacciones de finance no disponibles"
          detail={error.payload?.detail || error.message}
          requestId={error.payload?.request_id}
        />
      ) : null}

      <div className="tenant-portal-split tenant-portal-split--finance">
        <PanelCard
          title={editingTransactionId ? "Editar transacción" : "Registrar transacción"}
          subtitle={
            editingTransactionId
              ? "Ajusta el movimiento seleccionado sin salir de la vista operativa."
              : "Usa el contrato moderno de finance_transactions para ingresos, egresos y transferencias."
          }
        >
          {editingTransactionId ? (
            <div className="tenant-action-feedback tenant-action-feedback--success">
              <strong>Edición activa:</strong> estás modificando la transacción #{editingTransactionId}.
            </div>
          ) : null}
          <form className="d-grid gap-3" onSubmit={handleCreateTransaction}>
            <div className="tenant-inline-form-grid">
              <div>
                <label className="form-label">Tipo</label>
                <select
                  className="form-select"
                  value={formState.transactionType}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      transactionType: event.target.value,
                      targetAccountId:
                        event.target.value === "transfer" ? current.targetAccountId : "",
                      categoryId: event.target.value === "transfer" ? "" : current.categoryId,
                    }))
                  }
                >
                  <option value="income">Ingreso</option>
                  <option value="expense">Egreso</option>
                  <option value="transfer">Transferencia</option>
                </select>
              </div>
              <div>
                <label className="form-label">Cuenta origen</label>
                <select
                  className="form-select"
                  value={formState.accountId}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, accountId: event.target.value }))
                  }
                >
                  <option value="">Selecciona una cuenta</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="tenant-inline-form-grid">
              {formState.transactionType === "transfer" ? (
                <div>
                  <label className="form-label">Cuenta destino</label>
                  <select
                    className="form-select"
                    value={formState.targetAccountId}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        targetAccountId: event.target.value,
                      }))
                    }
                  >
                    <option value="">Selecciona una cuenta destino</option>
                    {accounts
                      .filter((account) => String(account.id) !== formState.accountId)
                      .map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.name}
                        </option>
                      ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="form-label">Categoría</label>
                  <select
                    className="form-select"
                    value={formState.categoryId}
                    onChange={(event) =>
                      setFormState((current) => ({ ...current, categoryId: event.target.value }))
                    }
                  >
                    <option value="">Sin categoría</option>
                    {filteredCategories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="form-label">Moneda</label>
                <select
                  className="form-select"
                  value={formState.currencyId}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, currencyId: event.target.value }))
                  }
                >
                  <option value="">Selecciona una moneda</option>
                  {currencies.map((currency) => (
                    <option key={currency.id} value={currency.id}>
                      {currency.code} · {currency.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="tenant-inline-form-grid">
              <div>
                <label className="form-label">Monto</label>
                <input
                  className="form-control"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formState.amount}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, amount: event.target.value }))
                  }
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="form-label">Fecha y hora</label>
                <input
                  className="form-control"
                  type="datetime-local"
                  value={formState.transactionAt}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      transactionAt: event.target.value,
                    }))
                  }
                />
              </div>
            </div>

            {selectedCurrencyRequiresExchangeRate(baseCurrency, formState.currencyId) ? (
              <div>
                <label className="form-label">Tipo de cambio</label>
                <input
                  className="form-control"
                  type="number"
                  step="0.0001"
                  min="0"
                  value={formState.exchangeRate}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      exchangeRate: event.target.value,
                    }))
                  }
                  placeholder="Ej: 950.25"
                />
              </div>
            ) : null}

            <div>
              <label className="form-label">Descripción</label>
              <input
                className="form-control"
                value={formState.description}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                placeholder="Ej: Pago proveedor de mantención"
              />
            </div>

            <div>
              <label className="form-label">Notas</label>
              <textarea
                className="form-control"
                rows={3}
                value={formState.notes}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, notes: event.target.value }))
                }
                placeholder="Contexto adicional del movimiento"
              />
            </div>

            <div className="finance-inline-toolbar">
              <label className="form-check d-flex align-items-center gap-2 mb-0">
                <input
                  className="form-check-input"
                  type="checkbox"
                  checked={formState.isReconciled}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      isReconciled: event.target.checked,
                    }))
                  }
                />
                <span className="form-check-label">Marcar conciliada</span>
              </label>
              <label className="form-check d-flex align-items-center gap-2 mb-0">
                <input
                  className="form-check-input"
                  type="checkbox"
                  checked={formState.isFavorite}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      isFavorite: event.target.checked,
                    }))
                  }
                />
                <span className="form-check-label">Favorita</span>
              </label>
            </div>

            <div className="finance-inline-toolbar finance-inline-toolbar--compact">
              <button className="btn btn-primary" type="submit" disabled={isActionSubmitting}>
                {editingTransactionId ? "Guardar cambios" : "Registrar transacción"}
              </button>
              {editingTransactionId ? (
                <button
                  className="btn btn-outline-secondary"
                  type="button"
                  disabled={isActionSubmitting}
                  onClick={resetFormForCreate}
                >
                  Cancelar edición
                </button>
              ) : null}
            </div>
          </form>
        </PanelCard>

        <PanelCard
          title="Balances por cuenta"
          subtitle="Lectura rápida del saldo operativo calculado sobre saldo inicial y transacciones."
        >
          {accountBalances.length > 0 ? (
            <div className="finance-balance-list">
              {accountBalances.map((item) => {
                const currency = currencyMap.get(item.currency_id);
                return (
                  <div key={item.account_id} className="finance-balance-list__item">
                    <div>
                      <div className="finance-balance-list__title">{item.account_name}</div>
                      <div className="small text-secondary">
                        {displayPlatformCode(item.account_type)}
                      </div>
                    </div>
                    <div className="text-end">
                      <div className="finance-balance-list__value">
                        {item.is_balance_hidden
                          ? "oculto"
                          : formatMoney(item.balance, currency?.code)}
                      </div>
                      <div className="small text-secondary">
                        {currency?.code || `#${item.currency_id}`}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-secondary">Aún no hay cuentas activas para calcular balances.</div>
          )}

          <hr />

          {usageError ? (
            <ErrorState
              title="Uso de finance no disponible"
              detail={usageError.payload?.detail || usageError.message}
              requestId={usageError.payload?.request_id}
            />
          ) : usage ? (
            <div className="tenant-detail-grid">
              <DetailField label="Clave de módulo" value={<code>{usage.module_key}</code>} />
              <DetailField label="Usado" value={usage.used_entries} />
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
                value={usage.limit_source ? displayPlatformCode(usage.limit_source) : "ninguna"}
              />
              <DetailField
                label="Estado"
                value={
                  usage.at_limit ? (
                    <span className="status-badge status-badge--warning">al límite</span>
                  ) : (
                    <span className="status-badge status-badge--success">ok</span>
                  )
                }
              />
            </div>
          ) : null}
        </PanelCard>
      </div>

      <div className="finance-transaction-layout">
        <PanelCard
          title="Transacciones recientes"
          subtitle="La tabla ya lee finance_transactions y no la capa legacy de entries."
        >
          <div className="finance-filter-grid">
            <div>
              <label className="form-label">Buscar</label>
              <input
                className="form-control"
                value={filters.search}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, search: event.target.value }))
                }
                placeholder="Descripción o notas"
              />
            </div>
            <div>
              <label className="form-label">Tipo</label>
              <select
                className="form-select"
                value={filters.transactionType}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    transactionType: event.target.value,
                  }))
                }
              >
                <option value="">Todos</option>
                <option value="income">Ingresos</option>
                <option value="expense">Egresos</option>
                <option value="transfer">Transferencias</option>
              </select>
            </div>
            <div>
              <label className="form-label">Cuenta</label>
              <select
                className="form-select"
                value={filters.accountId}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, accountId: event.target.value }))
                }
              >
                <option value="">Todas</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Categoría</label>
              <select
                className="form-select"
                value={filters.categoryId}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, categoryId: event.target.value }))
                }
              >
                <option value="">Todas</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Conciliación</label>
              <select
                className="form-select"
                value={filters.reconciliation}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    reconciliation: event.target.value,
                  }))
                }
              >
                <option value="">Todas</option>
                <option value="pending">Pendientes</option>
                <option value="done">Conciliadas</option>
              </select>
            </div>
          </div>

          {transactions.length > 0 ? (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead>
                  <tr>
                    <th>Detalle</th>
                    <th>Fecha</th>
                    <th>Tipo</th>
                    <th>Descripción</th>
                    <th>Cuenta</th>
                    <th>Categoría</th>
                    <th>Monto</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((transaction) => {
                    const account = transaction.account_id
                      ? accountMap.get(transaction.account_id)
                      : null;
                    const category = transaction.category_id
                      ? categoryMap.get(transaction.category_id)
                      : null;
                    const currency = currencyMap.get(transaction.currency_id);
                    const isSelected = selectedTransactionId === transaction.id;
                    return (
                      <tr
                        key={transaction.id}
                        className={isSelected ? "table-primary" : undefined}
                      >
                        <td>
                          <button
                            className={`btn btn-sm ${
                              isSelected ? "btn-outline-secondary" : "btn-outline-primary"
                            }`}
                            type="button"
                            onClick={() => void loadTransactionDetail(transaction.id)}
                          >
                            {isSelected ? "Ocultar" : "Ver"}
                          </button>
                        </td>
                        <td>{formatDateTime(transaction.transaction_at)}</td>
                        <td>
                          <StatusBadge value={displayTransactionType(transaction.transaction_type)} />
                        </td>
                        <td>{transaction.description}</td>
                        <td>{account?.name || "—"}</td>
                        <td>{category?.name || "—"}</td>
                        <td>{formatMoney(transaction.amount, currency?.code)}</td>
                        <td>
                          {transaction.is_reconciled ? (
                            <span className="status-badge status-badge--success">conciliada</span>
                          ) : (
                            <span className="status-badge status-badge--neutral">pendiente</span>
                          )}
                        </td>
                        <td>
                          <div className="finance-inline-toolbar finance-inline-toolbar--compact">
                            <button
                              className="btn btn-sm btn-outline-primary"
                              type="button"
                              disabled={isActionSubmitting}
                              onClick={() => startEditingTransaction(transaction)}
                            >
                              Editar
                            </button>
                            <button
                              className={`btn btn-sm ${
                                transaction.is_favorite
                                  ? "btn-outline-warning"
                                  : "btn-outline-secondary"
                              }`}
                              type="button"
                              disabled={isActionSubmitting}
                              onClick={() => void handleToggleFavorite(transaction)}
                            >
                              {transaction.is_favorite ? "Quitar favorita" : "Favorita"}
                            </button>
                            <button
                              className={`btn btn-sm ${
                                transaction.is_reconciled
                                  ? "btn-outline-secondary"
                                  : "btn-outline-success"
                              }`}
                              type="button"
                              disabled={isActionSubmitting}
                              onClick={() => void handleToggleReconciliation(transaction)}
                            >
                              {transaction.is_reconciled ? "Desconciliar" : "Conciliar"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-secondary">
              Aún no se registran transacciones en el núcleo moderno de finance.
            </div>
          )}
        </PanelCard>

        <PanelCard
          title="Detalle operacional"
          subtitle="Al seleccionar una transacción puedes revisar su trazabilidad reciente."
        >
          {isDetailLoading ? <LoadingBlock label="Cargando detalle de la transacción..." /> : null}
          {detailError ? (
            <ErrorState
              title="Detalle no disponible"
              detail={detailError.payload?.detail || detailError.message}
              requestId={detailError.payload?.request_id}
            />
          ) : null}

          {!isDetailLoading && !detailError && selectedTransactionDetail ? (
            <div className="d-grid gap-3">
              <div className="tenant-detail-grid">
                <DetailField
                  label="Tipo"
                  value={displayTransactionType(
                    selectedTransactionDetail.transaction.transaction_type
                  )}
                />
                <DetailField
                  label="Cuenta origen"
                  value={
                    selectedTransactionDetail.transaction.account_id
                      ? accountMap.get(selectedTransactionDetail.transaction.account_id)?.name || "—"
                      : "—"
                  }
                />
                <DetailField
                  label="Cuenta destino"
                  value={
                    selectedTransactionDetail.transaction.target_account_id
                      ? accountMap.get(selectedTransactionDetail.transaction.target_account_id)?.name ||
                        "—"
                      : "—"
                  }
                />
                <DetailField
                  label="Categoría"
                  value={
                    selectedTransactionDetail.transaction.category_id
                      ? categoryMap.get(selectedTransactionDetail.transaction.category_id)?.name || "—"
                      : "—"
                  }
                />
                <DetailField
                  label="Monto"
                  value={formatMoney(
                    selectedTransactionDetail.transaction.amount,
                    currencyMap.get(selectedTransactionDetail.transaction.currency_id)?.code
                  )}
                />
                <DetailField
                  label="Registrada en"
                  value={formatDateTime(selectedTransactionDetail.transaction.transaction_at)}
                />
              </div>

              <div>
                <div className="tenant-detail__label">Descripción</div>
                <div className="tenant-detail__value">
                  {selectedTransactionDetail.transaction.description}
                </div>
              </div>

              <div>
                <button
                  className="btn btn-outline-primary btn-sm"
                  type="button"
                  disabled={isActionSubmitting}
                  onClick={() => startEditingTransaction(selectedTransactionDetail.transaction)}
                >
                  Editar esta transacción
                </button>
              </div>

              <div>
                <div className="tenant-detail__label">Notas</div>
                <div className="tenant-detail__value">
                  {selectedTransactionDetail.transaction.notes || "sin notas"}
                </div>
              </div>

              <div>
                <div className="tenant-detail__label mb-2">Auditoría reciente</div>
                {selectedTransactionDetail.audit_events.length > 0 ? (
                  <div className="finance-audit-list">
                    {selectedTransactionDetail.audit_events.map((event) => (
                      <div key={event.id} className="finance-audit-list__item">
                        <div className="d-flex justify-content-between gap-3">
                          <strong>{displayPlatformCode(event.event_type)}</strong>
                          <span className="small text-secondary">
                            {formatDateTime(event.created_at)}
                          </span>
                        </div>
                        <div>{event.summary}</div>
                        {event.payload ? (
                          <pre className="finance-audit-list__payload">
                            {JSON.stringify(event.payload, null, 2)}
                          </pre>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-secondary">
                    Esta transacción aún no tiene eventos de auditoría adicionales.
                  </div>
                )}
              </div>
            </div>
          ) : !isDetailLoading && !detailError ? (
            <div className="text-secondary">
              Selecciona una transacción para revisar cuentas, montos y auditoría.
            </div>
          ) : null}
        </PanelCard>
      </div>
    </div>
  );
}

function normalizeNullableString(value: string): string | null {
  const normalized = value.trim();
  return normalized ? normalized : null;
}

function normalizeNullableNumber(value: string): number | null {
  if (!value) {
    return null;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function normalizeNullableFloat(value: string): number | null {
  if (!value) {
    return null;
  }
  const parsed = Number.parseFloat(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function buildDateTimeLocalValue() {
  return new Date().toISOString().slice(0, 16);
}

function buildDateTimeLocalValueFromIso(value: string) {
  return new Date(value).toISOString().slice(0, 16);
}

function buildIsoFromDateTimeLocal(value: string) {
  return new Date(value).toISOString();
}

function formatMoney(value: number, currencyCode = "USD"): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return "—";
  }
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function displayTransactionType(value: string): string {
  if (value === "income") {
    return "ingreso";
  }
  if (value === "expense") {
    return "egreso";
  }
  if (value === "transfer") {
    return "transferencia";
  }
  return value;
}

function selectedCurrencyRequiresExchangeRate(
  baseCurrency: TenantFinanceCurrency | null,
  selectedCurrencyId: string
): boolean {
  if (!baseCurrency || !selectedCurrencyId) {
    return false;
  }
  return String(baseCurrency.id) !== selectedCurrencyId;
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

function buildApiFilters(filters: {
  transactionType: string;
  accountId: string;
  categoryId: string;
  reconciliation: string;
  search: string;
}): TenantFinanceTransactionFilters {
  return {
    transactionType: filters.transactionType || undefined,
    accountId: filters.accountId ? Number(filters.accountId) : null,
    categoryId: filters.categoryId ? Number(filters.categoryId) : null,
    isReconciled:
      filters.reconciliation === "done"
        ? true
        : filters.reconciliation === "pending"
          ? false
          : null,
    search: filters.search || undefined,
  };
}

function buildTransactionWritePayload(
  formState: TransactionFormState
) {
  return {
    transaction_type: formState.transactionType,
    account_id: normalizeNullableNumber(formState.accountId),
    target_account_id:
      formState.transactionType === "transfer"
        ? normalizeNullableNumber(formState.targetAccountId)
        : null,
    category_id:
      formState.transactionType === "transfer"
        ? null
        : normalizeNullableNumber(formState.categoryId),
    beneficiary_id: null,
    person_id: null,
    project_id: null,
    currency_id: Number(formState.currencyId),
    loan_id: null,
    amount: Number.parseFloat(formState.amount),
    discount_amount: 0,
    exchange_rate: normalizeNullableFloat(formState.exchangeRate),
    amortization_months: null,
    transaction_at: buildIsoFromDateTimeLocal(formState.transactionAt),
    alternative_date: null,
    description: formState.description.trim(),
    notes: normalizeNullableString(formState.notes),
    is_favorite: formState.isFavorite,
    is_reconciled: formState.isReconciled,
    tag_ids: null,
  };
}

function buildTransactionFormState(
  transaction: TenantFinanceTransaction
): TransactionFormState {
  return {
    transactionType: transaction.transaction_type,
    accountId: transaction.account_id ? String(transaction.account_id) : "",
    targetAccountId: transaction.target_account_id
      ? String(transaction.target_account_id)
      : "",
    categoryId: transaction.category_id ? String(transaction.category_id) : "",
    currencyId: String(transaction.currency_id),
    amount: String(transaction.amount),
    exchangeRate: transaction.exchange_rate ? String(transaction.exchange_rate) : "",
    transactionAt: buildDateTimeLocalValueFromIso(transaction.transaction_at),
    description: transaction.description,
    notes: transaction.notes || "",
    isReconciled: transaction.is_reconciled,
    isFavorite: transaction.is_favorite,
  };
}
