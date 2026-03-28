import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { MetricCard } from "../../../../../components/common/MetricCard";
import { PageHeader } from "../../../../../components/common/PageHeader";
import { PanelCard } from "../../../../../components/common/PanelCard";
import { StatusBadge } from "../../../../../components/common/StatusBadge";
import { ErrorState } from "../../../../../components/feedback/ErrorState";
import { LoadingBlock } from "../../../../../components/feedback/LoadingBlock";
import { getApiErrorDisplayMessage } from "../../../../../services/api";
import { useLanguage } from "../../../../../store/language-context";
import { useTenantAuth } from "../../../../../store/tenant-auth-context";
import { displayPlatformCode } from "../../../../../utils/platform-labels";
import type { ApiError } from "../../../../../types";
import { FinanceModuleNav } from "../components/common/FinanceModuleNav";
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
  getTenantFinanceTags,
  type TenantFinanceTag,
} from "../services/tagsService";
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
  updateTenantFinanceTransactionsFavoriteBatch,
  updateTenantFinanceTransactionsReconciliationBatch,
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
  tagIds: string[];
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
  tagIds: [],
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
  const { language } = useLanguage();
  const [transactions, setTransactions] = useState<TenantFinanceTransaction[]>([]);
  const [summaryResponse, setSummaryResponse] =
    useState<TenantFinanceSummaryResponse | null>(null);
  const [usageResponse, setUsageResponse] =
    useState<TenantFinanceUsageResponse | null>(null);
  const [accountBalances, setAccountBalances] = useState<TenantFinanceAccountBalance[]>([]);
  const [accounts, setAccounts] = useState<TenantFinanceAccount[]>([]);
  const [categories, setCategories] = useState<TenantFinanceCategory[]>([]);
  const [tags, setTags] = useState<TenantFinanceTag[]>([]);
  const [currencies, setCurrencies] = useState<TenantFinanceCurrency[]>([]);
  const [selectedTransactionIds, setSelectedTransactionIds] = useState<number[]>([]);
  const [selectedTransactionId, setSelectedTransactionId] = useState<number | null>(null);
  const [selectedTransactionDetail, setSelectedTransactionDetail] =
    useState<TenantFinanceTransactionDetailResponse["data"] | null>(null);
  const [editingTransactionId, setEditingTransactionId] = useState<number | null>(null);
  const [formState, setFormState] = useState<TransactionFormState>(DEFAULT_FORM_STATE);
  const [reconciliationNote, setReconciliationNote] = useState("");
  const [reconciliationConfirmation, setReconciliationConfirmation] = useState(false);
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
    favorite: string;
    reconciliation: string;
    search: string;
  }>({
    transactionType: "",
    accountId: "",
    categoryId: "",
    favorite: "",
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
    filters.favorite,
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
      getTenantFinanceTags(session.accessToken),
      getTenantFinanceCurrencies(session.accessToken, false),
    ]);

    const [
      transactionsResult,
      summaryResult,
      usageResult,
      balancesResult,
      accountsResult,
      categoriesResult,
      tagsResult,
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
      setTags([]);
      setCurrencies([]);
      setError(transactionsResult.reason as ApiError);
      setIsLoading(false);
      return;
    }

    setTransactions(
      transactionsResult.status === "fulfilled" ? transactionsResult.value.data : []
    );
    setSelectedTransactionIds((current) =>
      current.filter((transactionId) =>
        (transactionsResult.status === "fulfilled" ? transactionsResult.value.data : []).some(
          (transaction) => transaction.id === transactionId
        )
      )
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
    setTags(tagsResult.status === "fulfilled" ? tagsResult.value.data : []);
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
    const nextState = !transaction.is_reconciled;
    const confirmed = window.confirm(
      nextState
        ? language === "es"
          ? "¿Confirmas conciliar esta transacción?"
          : "Do you confirm reconciling this transaction?"
        : language === "es"
          ? "¿Confirmas quitar la conciliación de esta transacción?"
          : "Do you confirm removing reconciliation from this transaction?"
    );
    if (!confirmed) {
      return;
    }
    await runRowAction(async () => {
      const response = await updateTenantFinanceTransactionReconciliation(
        session.accessToken,
        transaction.id,
        nextState,
        reconciliationNote
      );
      setActionFeedback({ type: "success", message: response.message });
    });
  }

  async function handleBatchFavorite(isFavorite: boolean) {
    if (!session?.accessToken || selectedTransactionIds.length === 0) {
      return;
    }
    await runRowAction(async () => {
      const response = await updateTenantFinanceTransactionsFavoriteBatch(
        session.accessToken,
        selectedTransactionIds,
        isFavorite
      );
      setActionFeedback({ type: "success", message: response.message });
      setSelectedTransactionIds([]);
    });
  }

  async function handleBatchReconciliation(isReconciled: boolean) {
    if (!session?.accessToken || selectedTransactionIds.length === 0) {
      return;
    }
    const confirmed = window.confirm(
      isReconciled
        ? language === "es"
          ? `¿Confirmas conciliar ${selectedTransactionIds.length} transacciones seleccionadas?`
          : `Do you confirm reconciling ${selectedTransactionIds.length} selected transactions?`
        : language === "es"
          ? `¿Confirmas quitar la conciliación de ${selectedTransactionIds.length} transacciones seleccionadas?`
          : `Do you confirm removing reconciliation from ${selectedTransactionIds.length} selected transactions?`
    );
    if (!confirmed) {
      return;
    }
    await runRowAction(async () => {
      const response = await updateTenantFinanceTransactionsReconciliationBatch(
        session.accessToken,
        selectedTransactionIds,
        isReconciled,
        reconciliationNote
      );
      setActionFeedback({ type: "success", message: response.message });
      setSelectedTransactionIds([]);
      setReconciliationNote("");
      setReconciliationConfirmation(false);
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

  const selectedTransactions = transactions.filter((transaction) =>
    selectedTransactionIds.includes(transaction.id)
  );
  const selectedFavoritesCount = selectedTransactions.filter(
    (transaction) => transaction.is_favorite
  ).length;
  const selectedPendingReconciliationCount = selectedTransactions.filter(
    (transaction) => !transaction.is_reconciled
  ).length;
  const favoriteTransactionsCount = transactions.filter(
    (transaction) => transaction.is_favorite
  ).length;
  const pendingReconciliationCount = transactions.filter(
    (transaction) => !transaction.is_reconciled
  ).length;
  const selectedReconciledCount = selectedTransactions.filter(
    (transaction) => transaction.is_reconciled
  ).length;

  function toggleTransactionSelection(transactionId: number) {
    setSelectedTransactionIds((current) =>
      current.includes(transactionId)
        ? current.filter((id) => id !== transactionId)
        : [...current, transactionId]
    );
  }

  function toggleVisibleSelection() {
    const visibleIds = transactions.map((transaction) => transaction.id);
    const allVisibleSelected =
      visibleIds.length > 0 &&
      visibleIds.every((transactionId) => selectedTransactionIds.includes(transactionId));
    setSelectedTransactionIds((current) =>
      allVisibleSelected
        ? current.filter((transactionId) => !visibleIds.includes(transactionId))
        : Array.from(new Set([...current, ...visibleIds]))
    );
  }

  return (
    <div className="d-grid gap-4">
      <PageHeader
        eyebrow={language === "es" ? "Espacio" : "Workspace"}
        title={language === "es" ? "Transacciones financieras" : "Financial transactions"}
        description={
          language === "es"
            ? "Opera el núcleo real de finance con balances por cuenta y trazabilidad reciente."
            : "Operate the real finance core with account balances and recent traceability."
        }
      />

      <FinanceModuleNav />

      {actionFeedback ? (
        <div className={`tenant-action-feedback tenant-action-feedback--${actionFeedback.type}`}>
          <strong>{language === "es" ? "Transacciones:" : "Transactions:"}</strong> {actionFeedback.message}
        </div>
      ) : null}

      {isLoading ? (
        <LoadingBlock label={language === "es" ? "Cargando transacciones financieras..." : "Loading financial transactions..."} />
      ) : null}

      <div className="tenant-portal-metrics">
        <MetricCard
          label={language === "es" ? "Transacciones" : "Transactions"}
          value={summary?.total_entries || 0}
          hint={language === "es" ? "Movimientos persistidos en finance_transactions" : "Entries persisted in finance_transactions"}
        />
        <MetricCard
          label={language === "es" ? "Ingresos" : "Income"}
          value={formatMoney(summary?.total_income || 0, baseCurrency?.code, language)}
          hint={language === "es" ? "Acumulado visible" : "Visible total"}
        />
        <MetricCard
          label={language === "es" ? "Egresos" : "Expenses"}
          value={formatMoney(summary?.total_expense || 0, baseCurrency?.code, language)}
          hint={language === "es" ? "Acumulado visible" : "Visible total"}
        />
        <MetricCard
          label={language === "es" ? "Balance" : "Balance"}
          value={formatMoney(summary?.balance || 0, baseCurrency?.code, language)}
          hint={language === "es" ? "Resultado actual" : "Current result"}
        />
      </div>

      {error ? (
        <ErrorState
          title={language === "es" ? "Transacciones de finance no disponibles" : "Finance transactions unavailable"}
          detail={error.payload?.detail || error.message}
          requestId={error.payload?.request_id}
        />
      ) : null}

      <div className="tenant-portal-split tenant-portal-split--finance">
        <PanelCard
          title={editingTransactionId ? (language === "es" ? "Editar transacción" : "Edit transaction") : language === "es" ? "Registrar transacción" : "Create transaction"}
          subtitle={
            editingTransactionId
              ? language === "es"
                ? "Ajusta el movimiento seleccionado sin salir de la vista operativa."
                : "Adjust the selected movement without leaving the operational view."
              : language === "es"
                ? "Usa el contrato moderno de finance_transactions para ingresos, egresos y transferencias."
                : "Use the modern finance_transactions contract for income, expenses, and transfers."
          }
        >
          {editingTransactionId ? (
            <div className="tenant-action-feedback tenant-action-feedback--success">
              <strong>{language === "es" ? "Edición activa:" : "Active edit:"}</strong>{" "}
              {language === "es"
                ? `estás modificando la transacción #${editingTransactionId}.`
                : `you are editing transaction #${editingTransactionId}.`}
            </div>
          ) : null}
          <form className="d-grid gap-3" onSubmit={handleCreateTransaction}>
            <div className="tenant-inline-form-grid">
              <div>
                <label className="form-label">{language === "es" ? "Tipo" : "Type"}</label>
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
                      tagIds: event.target.value === "transfer" ? [] : current.tagIds,
                    }))
                  }
                >
                  <option value="income">{language === "es" ? "Ingreso" : "Income"}</option>
                  <option value="expense">{language === "es" ? "Egreso" : "Expense"}</option>
                  <option value="transfer">{language === "es" ? "Transferencia" : "Transfer"}</option>
                </select>
              </div>
              <div>
                <label className="form-label">{language === "es" ? "Cuenta origen" : "Source account"}</label>
                <select
                  className="form-select"
                  value={formState.accountId}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, accountId: event.target.value }))
                  }
                >
                  <option value="">{language === "es" ? "Selecciona una cuenta" : "Select an account"}</option>
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
                  <label className="form-label">{language === "es" ? "Cuenta destino" : "Target account"}</label>
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
                    <option value="">{language === "es" ? "Selecciona una cuenta destino" : "Select a target account"}</option>
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
                  <label className="form-label">{language === "es" ? "Categoría" : "Category"}</label>
                  <select
                    className="form-select"
                    value={formState.categoryId}
                    onChange={(event) =>
                      setFormState((current) => ({ ...current, categoryId: event.target.value }))
                    }
                  >
                    <option value="">{language === "es" ? "Sin categoría" : "No category"}</option>
                    {filteredCategories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="form-label">{language === "es" ? "Moneda" : "Currency"}</label>
                <select
                  className="form-select"
                  value={formState.currencyId}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, currencyId: event.target.value }))
                  }
                >
                  <option value="">{language === "es" ? "Selecciona una moneda" : "Select a currency"}</option>
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
                <label className="form-label">{language === "es" ? "Monto" : "Amount"}</label>
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
                <label className="form-label">{language === "es" ? "Fecha y hora" : "Date and time"}</label>
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
                <label className="form-label">{language === "es" ? "Tipo de cambio" : "Exchange rate"}</label>
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
                  placeholder={language === "es" ? "Ej: 950.25" : "Ex: 950.25"}
                />
              </div>
            ) : null}

            <div>
              <label className="form-label">{language === "es" ? "Descripción" : "Description"}</label>
              <input
                className="form-control"
                value={formState.description}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                placeholder={language === "es" ? "Ej: Pago proveedor de mantención" : "Ex: Maintenance supplier payment"}
              />
            </div>

            <div>
              <label className="form-label">{language === "es" ? "Notas" : "Notes"}</label>
              <textarea
                className="form-control"
                rows={3}
                value={formState.notes}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, notes: event.target.value }))
                }
                placeholder={language === "es" ? "Contexto adicional del movimiento" : "Additional movement context"}
              />
            </div>

            {formState.transactionType !== "transfer" ? (
              <div>
                <label className="form-label">{language === "es" ? "Etiquetas" : "Tags"}</label>
                <select
                  className="form-select"
                  multiple
                  value={formState.tagIds}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      tagIds: Array.from(event.target.selectedOptions, (option) => option.value),
                    }))
                  }
                >
                  {tags.map((tag) => (
                    <option key={tag.id} value={String(tag.id)}>
                      {tag.name}{tag.is_active ? "" : language === "es" ? " · inactiva" : " · inactive"}
                    </option>
                  ))}
                </select>
                <div className="form-text">
                  {language === "es"
                    ? "Usa Ctrl o Cmd para seleccionar varias etiquetas sobre el mismo movimiento."
                    : "Use Ctrl or Cmd to select multiple tags for the same movement."}
                </div>
              </div>
            ) : null}

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
                <span className="form-check-label">{language === "es" ? "Marcar conciliada" : "Mark reconciled"}</span>
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
                <span className="form-check-label">{language === "es" ? "Favorita" : "Favorite"}</span>
              </label>
            </div>

            <div className="finance-inline-toolbar finance-inline-toolbar--compact">
              <button className="btn btn-primary" type="submit" disabled={isActionSubmitting}>
                {editingTransactionId
                  ? language === "es"
                    ? "Guardar cambios"
                    : "Save changes"
                  : language === "es"
                    ? "Registrar transacción"
                    : "Create transaction"}
              </button>
              {editingTransactionId ? (
                <button
                  className="btn btn-outline-secondary"
                  type="button"
                  disabled={isActionSubmitting}
                  onClick={resetFormForCreate}
                >
                  {language === "es" ? "Cancelar edición" : "Cancel editing"}
                </button>
              ) : null}
            </div>
          </form>
        </PanelCard>

        <PanelCard
          title={language === "es" ? "Balances por cuenta" : "Account balances"}
          subtitle={
            language === "es"
              ? "Lectura rápida del saldo operativo calculado sobre saldo inicial y transacciones."
              : "Quick operational balance view calculated from opening balance and transactions."
          }
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
                          ? language === "es"
                            ? "oculto"
                            : "hidden"
                          : formatMoney(item.balance, currency?.code, language)}
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
            <div className="text-secondary">{language === "es" ? "Aún no hay cuentas activas para calcular balances." : "There are no active accounts yet to calculate balances."}</div>
          )}

          <hr />

          {usageError ? (
            <ErrorState
              title={language === "es" ? "Uso de finance no disponible" : "Finance usage unavailable"}
              detail={usageError.payload?.detail || usageError.message}
              requestId={usageError.payload?.request_id}
            />
          ) : usage ? (
            <div className="tenant-detail-grid">
              <DetailField label={language === "es" ? "Clave de módulo" : "Module key"} value={<code>{usage.module_key}</code>} />
              <DetailField label={language === "es" ? "Usado" : "Used"} value={usage.used_entries} />
              <DetailField
                label={language === "es" ? "Límite" : "Limit"}
                value={usage.unlimited ? (language === "es" ? "ilimitado" : "unlimited") : usage.max_entries ?? "—"}
              />
              <DetailField
                label={language === "es" ? "Restante" : "Remaining"}
                value={usage.unlimited ? "—" : usage.remaining_entries ?? "—"}
              />
              <DetailField
                label={language === "es" ? "Fuente" : "Source"}
                value={usage.limit_source ? displayPlatformCode(usage.limit_source) : language === "es" ? "ninguna" : "none"}
              />
              <DetailField
                label={language === "es" ? "Estado" : "Status"}
                value={
                  usage.at_limit ? (
                    <span className="status-badge status-badge--warning">{language === "es" ? "al límite" : "at limit"}</span>
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
          title={language === "es" ? "Transacciones recientes" : "Recent transactions"}
          subtitle={
            language === "es"
              ? "La tabla ya lee finance_transactions y no la capa legacy de entries."
              : "The table now reads finance_transactions and no longer the legacy entries layer."
          }
        >
          <div className="tenant-detail-grid mb-3">
            <DetailField label={language === "es" ? "Favoritas visibles" : "Visible favorites"} value={favoriteTransactionsCount} />
            <DetailField label={language === "es" ? "Pendientes conciliación" : "Pending reconciliation"} value={pendingReconciliationCount} />
            <DetailField label={language === "es" ? "Seleccionadas" : "Selected"} value={selectedTransactionIds.length} />
            <DetailField
              label={language === "es" ? "Favoritas seleccionadas" : "Selected favorites"}
              value={selectedFavoritesCount}
            />
          </div>

          <div className="finance-filter-grid">
            <div>
              <label className="form-label">{language === "es" ? "Buscar" : "Search"}</label>
              <input
                className="form-control"
                value={filters.search}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, search: event.target.value }))
                }
                placeholder={language === "es" ? "Descripción o notas" : "Description or notes"}
              />
            </div>
            <div>
              <label className="form-label">{language === "es" ? "Tipo" : "Type"}</label>
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
                <option value="">{language === "es" ? "Todos" : "All"}</option>
                <option value="income">{language === "es" ? "Ingresos" : "Income"}</option>
                <option value="expense">{language === "es" ? "Egresos" : "Expenses"}</option>
                <option value="transfer">{language === "es" ? "Transferencias" : "Transfers"}</option>
              </select>
            </div>
            <div>
              <label className="form-label">{language === "es" ? "Cuenta" : "Account"}</label>
              <select
                className="form-select"
                value={filters.accountId}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, accountId: event.target.value }))
                }
              >
                <option value="">{language === "es" ? "Todas" : "All"}</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">{language === "es" ? "Categoría" : "Category"}</label>
              <select
                className="form-select"
                value={filters.categoryId}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, categoryId: event.target.value }))
                }
              >
                <option value="">{language === "es" ? "Todas" : "All"}</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">{language === "es" ? "Favorita" : "Favorite"}</label>
              <select
                className="form-select"
                value={filters.favorite}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    favorite: event.target.value,
                  }))
                }
              >
                <option value="">{language === "es" ? "Todas" : "All"}</option>
                <option value="yes">{language === "es" ? "Favoritas" : "Favorites"}</option>
                <option value="no">{language === "es" ? "No favoritas" : "Not favorites"}</option>
              </select>
            </div>
            <div>
              <label className="form-label">{language === "es" ? "Conciliación" : "Reconciliation"}</label>
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
                <option value="">{language === "es" ? "Todas" : "All"}</option>
                <option value="pending">{language === "es" ? "Pendientes" : "Pending"}</option>
                <option value="done">{language === "es" ? "Conciliadas" : "Reconciled"}</option>
              </select>
            </div>
          </div>

          <div className="finance-inline-toolbar finance-inline-toolbar--compact mb-3">
            <button
              className="btn btn-outline-secondary btn-sm"
              type="button"
              onClick={() =>
                setFilters((current) => ({
                  ...current,
                  favorite: "yes",
                }))
              }
            >
              {language === "es" ? "Solo favoritas" : "Favorites only"}
            </button>
            <button
              className="btn btn-outline-secondary btn-sm"
              type="button"
              onClick={() =>
                setFilters((current) => ({
                  ...current,
                  reconciliation: "pending",
                }))
              }
            >
              {language === "es" ? "Pendientes conciliación" : "Pending reconciliation"}
            </button>
            <button
              className="btn btn-outline-secondary btn-sm"
              type="button"
              onClick={() =>
                setFilters({
                  transactionType: "",
                  accountId: "",
                  categoryId: "",
                  favorite: "",
                  reconciliation: "",
                  search: "",
                })
              }
            >
              {language === "es" ? "Limpiar filtros" : "Clear filters"}
            </button>
          </div>

          {selectedTransactionIds.length > 0 ? (
            <div className="tenant-action-feedback tenant-action-feedback--success">
              <strong>{language === "es" ? "Mesa de trabajo:" : "Workbench:"}</strong> {selectedTransactionIds.length} {language === "es" ? "transacciones seleccionadas." : "selected transactions."}
              {" "}
              {selectedPendingReconciliationCount} {language === "es" ? "pendientes de conciliación." : "pending reconciliation."}
              <div className="finance-reconciliation-workspace mt-3">
                <div className="tenant-detail-grid">
                  <DetailField label={language === "es" ? "Pendientes seleccionadas" : "Selected pending"} value={selectedPendingReconciliationCount} />
                  <DetailField label={language === "es" ? "Ya conciliadas" : "Already reconciled"} value={selectedReconciledCount} />
                  <DetailField label={language === "es" ? "Favoritas seleccionadas" : "Selected favorites"} value={selectedFavoritesCount} />
                </div>
                <div className="mt-3">
                  <label className="form-label">{language === "es" ? "Nota de conciliación" : "Reconciliation note"}</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    value={reconciliationNote}
                    onChange={(event) => setReconciliationNote(event.target.value)}
                    placeholder={language === "es" ? "Ej: revisión operativa validada contra cartola del día" : "Ex: operational review validated against today's statement"}
                  />
                  <div className="form-text">
                    {language === "es"
                      ? "La nota queda visible en la auditoría reciente de cada transacción conciliada."
                      : "The note remains visible in the recent audit trail of each reconciled transaction."}
                  </div>
                </div>
                <label className="form-check d-flex align-items-center gap-2 mt-3 mb-0">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={reconciliationConfirmation}
                    onChange={(event) =>
                      setReconciliationConfirmation(event.target.checked)
                    }
                  />
                  <span className="form-check-label">
                    {language === "es"
                      ? "Confirmo que revisé la selección antes de operar conciliación en lote."
                      : "I confirm that I reviewed the selection before running batch reconciliation."}
                  </span>
                </label>
              </div>
              <div className="finance-inline-toolbar finance-inline-toolbar--compact mt-2">
                <button
                  className="btn btn-outline-warning btn-sm"
                  type="button"
                  disabled={isActionSubmitting}
                  onClick={() => void handleBatchFavorite(true)}
                >
                  {language === "es" ? "Marcar favoritas" : "Mark favorites"}
                </button>
                <button
                  className="btn btn-outline-secondary btn-sm"
                  type="button"
                  disabled={isActionSubmitting}
                  onClick={() => void handleBatchFavorite(false)}
                >
                  {language === "es" ? "Quitar favoritas" : "Remove favorites"}
                </button>
                <button
                  className="btn btn-outline-success btn-sm"
                  type="button"
                  disabled={
                    isActionSubmitting ||
                    selectedPendingReconciliationCount === 0 ||
                    !reconciliationConfirmation
                  }
                  onClick={() => void handleBatchReconciliation(true)}
                >
                  {language === "es" ? "Conciliar lote" : "Reconcile batch"}
                </button>
                <button
                  className="btn btn-outline-secondary btn-sm"
                  type="button"
                  disabled={
                    isActionSubmitting ||
                    selectedReconciledCount === 0 ||
                    !reconciliationConfirmation
                  }
                  onClick={() => void handleBatchReconciliation(false)}
                >
                  {language === "es" ? "Desconciliar lote" : "Unreconcile batch"}
                </button>
                <button
                  className="btn btn-outline-secondary btn-sm"
                  type="button"
                  disabled={isActionSubmitting}
                  onClick={() => {
                    setSelectedTransactionIds([]);
                    setReconciliationConfirmation(false);
                  }}
                >
                  {language === "es" ? "Limpiar selección" : "Clear selection"}
                </button>
              </div>
            </div>
          ) : null}

          {transactions.length > 0 ? (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead>
                  <tr>
                    <th>
                      <input
                        type="checkbox"
                        checked={
                          transactions.length > 0 &&
                          transactions.every((transaction) =>
                            selectedTransactionIds.includes(transaction.id)
                          )
                        }
                        onChange={toggleVisibleSelection}
                      />
                    </th>
                    <th>{language === "es" ? "Detalle" : "Detail"}</th>
                    <th>{language === "es" ? "Fecha" : "Date"}</th>
                    <th>{language === "es" ? "Tipo" : "Type"}</th>
                    <th>{language === "es" ? "Descripción" : "Description"}</th>
                    <th>{language === "es" ? "Cuenta" : "Account"}</th>
                    <th>{language === "es" ? "Categoría" : "Category"}</th>
                    <th>{language === "es" ? "Monto" : "Amount"}</th>
                    <th>{language === "es" ? "Estado" : "Status"}</th>
                    <th>{language === "es" ? "Acciones" : "Actions"}</th>
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
                          <input
                            type="checkbox"
                            checked={selectedTransactionIds.includes(transaction.id)}
                            onChange={() => toggleTransactionSelection(transaction.id)}
                          />
                        </td>
                        <td>
                          <button
                            className={`btn btn-sm ${
                              isSelected ? "btn-outline-secondary" : "btn-outline-primary"
                            }`}
                            type="button"
                            onClick={() => void loadTransactionDetail(transaction.id)}
                          >
                            {isSelected ? (language === "es" ? "Ocultar" : "Hide") : language === "es" ? "Ver" : "View"}
                          </button>
                        </td>
                        <td>{formatDateTime(transaction.transaction_at, language)}</td>
                        <td>
                          <StatusBadge value={displayTransactionType(transaction.transaction_type, language)} />
                        </td>
                        <td>{transaction.description}</td>
                        <td>{account?.name || "—"}</td>
                        <td>{category?.name || "—"}</td>
                        <td>{formatMoney(transaction.amount, currency?.code, language)}</td>
                        <td>
                          {transaction.is_reconciled ? (
                            <span className="status-badge status-badge--success">{language === "es" ? "conciliada" : "reconciled"}</span>
                          ) : (
                            <span className="status-badge status-badge--neutral">{language === "es" ? "pendiente" : "pending"}</span>
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
                              {language === "es" ? "Editar" : "Edit"}
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
                              {transaction.is_favorite
                                ? language === "es"
                                  ? "Quitar favorita"
                                  : "Remove favorite"
                                : language === "es"
                                  ? "Favorita"
                                  : "Favorite"}
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
                              {transaction.is_reconciled
                                ? language === "es"
                                  ? "Desconciliar"
                                  : "Unreconcile"
                                : language === "es"
                                  ? "Conciliar"
                                  : "Reconcile"}
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
              {language === "es"
                ? "Aún no se registran transacciones en el núcleo moderno de finance."
                : "No transactions have been recorded yet in the modern finance core."}
            </div>
          )}
        </PanelCard>

        <PanelCard
          title={language === "es" ? "Detalle operacional" : "Operational detail"}
          subtitle={
            language === "es"
              ? "Al seleccionar una transacción puedes revisar su trazabilidad reciente."
              : "Select a transaction to review its recent traceability."
          }
        >
          {isDetailLoading ? <LoadingBlock label={language === "es" ? "Cargando detalle de la transacción..." : "Loading transaction detail..."} /> : null}
          {detailError ? (
            <ErrorState
              title={language === "es" ? "Detalle no disponible" : "Detail unavailable"}
              detail={detailError.payload?.detail || detailError.message}
              requestId={detailError.payload?.request_id}
            />
          ) : null}

          {!isDetailLoading && !detailError && selectedTransactionDetail ? (
            <div className="d-grid gap-3">
              <div className="tenant-detail-grid">
                <DetailField
                  label={language === "es" ? "Tipo" : "Type"}
                  value={displayTransactionType(
                    selectedTransactionDetail.transaction.transaction_type,
                    language
                  )}
                />
                <DetailField
                  label={language === "es" ? "Cuenta origen" : "Source account"}
                  value={
                    selectedTransactionDetail.transaction.account_id
                      ? accountMap.get(selectedTransactionDetail.transaction.account_id)?.name || "—"
                      : "—"
                  }
                />
                <DetailField
                  label={language === "es" ? "Cuenta destino" : "Target account"}
                  value={
                    selectedTransactionDetail.transaction.target_account_id
                      ? accountMap.get(selectedTransactionDetail.transaction.target_account_id)?.name ||
                        "—"
                      : "—"
                  }
                />
                <DetailField
                  label={language === "es" ? "Categoría" : "Category"}
                  value={
                    selectedTransactionDetail.transaction.category_id
                      ? categoryMap.get(selectedTransactionDetail.transaction.category_id)?.name || "—"
                      : "—"
                  }
                />
                <DetailField
                  label={language === "es" ? "Monto" : "Amount"}
                  value={formatMoney(
                    selectedTransactionDetail.transaction.amount,
                    currencyMap.get(selectedTransactionDetail.transaction.currency_id)?.code,
                    language
                  )}
                />
                <DetailField
                  label={language === "es" ? "Registrada en" : "Recorded at"}
                  value={formatDateTime(selectedTransactionDetail.transaction.transaction_at, language)}
                />
              </div>

              <div>
                <div className="tenant-detail__label">{language === "es" ? "Descripción" : "Description"}</div>
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
                  {language === "es" ? "Editar esta transacción" : "Edit this transaction"}
                </button>
              </div>

              <div>
                <div className="tenant-detail__label">{language === "es" ? "Notas" : "Notes"}</div>
                <div className="tenant-detail__value">
                  {selectedTransactionDetail.transaction.notes || (language === "es" ? "sin notas" : "no notes")}
                </div>
              </div>

              <div>
                <div className="tenant-detail__label mb-2">{language === "es" ? "Auditoría reciente" : "Recent audit trail"}</div>
                {selectedTransactionDetail.audit_events.length > 0 ? (
                  <div className="finance-audit-list">
                    {selectedTransactionDetail.audit_events.map((event) => (
                      <div key={event.id} className="finance-audit-list__item">
                        <div className="d-flex justify-content-between gap-3">
                          <strong>{displayPlatformCode(event.event_type)}</strong>
                          <span className="small text-secondary">
                            {formatDateTime(event.created_at, language)}
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
                    {language === "es"
                      ? "Esta transacción aún no tiene eventos de auditoría adicionales."
                      : "This transaction does not have additional audit events yet."}
                  </div>
                )}
              </div>
            </div>
          ) : !isDetailLoading && !detailError ? (
            <div className="text-secondary">
              {language === "es"
                ? "Selecciona una transacción para revisar cuentas, montos y auditoría."
                : "Select a transaction to review accounts, amounts, and audit trail."}
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

function formatMoney(value: number, currencyCode = "USD", language: "es" | "en" = "es"): string {
  return new Intl.NumberFormat(language === "es" ? "es-CL" : "en-US", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDateTime(value: string | null, language: "es" | "en" = "es"): string {
  if (!value) {
    return "—";
  }
  return new Intl.DateTimeFormat(language === "es" ? "es-CL" : "en-US", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function displayTransactionType(value: string, language: "es" | "en" = "es"): string {
  if (value === "income") {
    return language === "es" ? "ingreso" : "income";
  }
  if (value === "expense") {
    return language === "es" ? "egreso" : "expense";
  }
  if (value === "transfer") {
    return language === "es" ? "transferencia" : "transfer";
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
  favorite: string;
  reconciliation: string;
  search: string;
}): TenantFinanceTransactionFilters {
  return {
    transactionType: filters.transactionType || undefined,
    accountId: filters.accountId ? Number(filters.accountId) : null,
    categoryId: filters.categoryId ? Number(filters.categoryId) : null,
    isFavorite:
      filters.favorite === "yes"
        ? true
        : filters.favorite === "no"
          ? false
          : null,
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
    tag_ids:
      formState.transactionType === "transfer"
        ? null
        : formState.tagIds.length > 0
          ? formState.tagIds.map((tagId) => Number(tagId))
          : null,
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
    tagIds: transaction.tag_ids.map((tagId) => String(tagId)),
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
