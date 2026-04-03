import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "../../../../../components/common/PageHeader";
import { PanelCard } from "../../../../../components/common/PanelCard";
import { DataTableCard } from "../../../../../components/data-display/DataTableCard";
import { AppBadge } from "../../../../../design-system/AppBadge";
import { AppToolbar } from "../../../../../design-system/AppLayout";
import { ErrorState } from "../../../../../components/feedback/ErrorState";
import { LoadingBlock } from "../../../../../components/feedback/LoadingBlock";
import { getApiErrorDisplayMessage } from "../../../../../services/api";
import { useLanguage } from "../../../../../store/language-context";
import { useTenantAuth } from "../../../../../store/tenant-auth-context";
import type { ApiError } from "../../../../../types";
import { FinanceHelpBubble } from "../components/common/FinanceHelpBubble";
import { FinanceIcon } from "../components/common/FinanceIcon";
import { FinanceModuleNav } from "../components/common/FinanceModuleNav";
import { AccountForm } from "../forms/AccountForm";
import {
  createTenantFinanceAccount,
  deleteTenantFinanceAccount,
  getTenantFinanceAccounts,
  updateTenantFinanceAccount,
  updateTenantFinanceAccountStatus,
  type TenantFinanceAccount,
  type TenantFinanceAccountWriteRequest,
} from "../services/accountsService";
import {
  getTenantFinanceCurrencies,
  type TenantFinanceCurrency,
} from "../services/currenciesService";
import {
  getFinanceAccountIconLabel,
  getFinanceAccountIconName,
} from "../utils/accountIcons";
import {
  getActiveStateLabel,
  getFinanceAccountTypeLabel,
} from "../utils/presentation";

function buildDefaultForm(currencyId: number | null): TenantFinanceAccountWriteRequest {
  return {
    name: "",
    code: null,
    account_type: "cash",
    currency_id: currencyId ?? 0,
    parent_account_id: null,
    opening_balance: 0,
    opening_balance_at: null,
    icon: null,
    is_favorite: false,
    is_balance_hidden: false,
    is_active: true,
    sort_order: 100,
  };
}

export function FinanceAccountsPage() {
  const { session } = useTenantAuth();
  const { language } = useLanguage();
  const [accounts, setAccounts] = useState<TenantFinanceAccount[]>([]);
  const [currencies, setCurrencies] = useState<TenantFinanceCurrency[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState<number | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [form, setForm] = useState<TenantFinanceAccountWriteRequest>(buildDefaultForm(null));

  async function loadAccounts() {
    if (!session?.accessToken) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [accountsResponse, currenciesResponse] = await Promise.all([
        getTenantFinanceAccounts(session.accessToken),
        getTenantFinanceCurrencies(session.accessToken),
      ]);
      setAccounts(accountsResponse.data);
      setCurrencies(currenciesResponse.data);
      if (!editingAccountId) {
        setForm((current) => ({
          ...current,
          currency_id: current.currency_id || currenciesResponse.data[0]?.id || 0,
        }));
      }
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadAccounts();
  }, [session?.accessToken]);

  const parentAccounts = useMemo(
    () =>
      accounts
        .filter((account) => account.id !== editingAccountId)
        .map((account) => ({ id: account.id, name: account.name })),
    [accounts, editingAccountId]
  );

  function startCreate(openForm = false) {
    setEditingAccountId(null);
    setError(null);
    setFeedback(null);
    setIsFormOpen(openForm);
    setForm(buildDefaultForm(currencies[0]?.id ?? null));
  }

  function startEdit(account: TenantFinanceAccount) {
    setEditingAccountId(account.id);
    setError(null);
    setFeedback(null);
    setIsFormOpen(true);
    setForm({
      name: account.name,
      code: account.code,
      account_type: account.account_type,
      currency_id: account.currency_id,
      parent_account_id: account.parent_account_id,
      opening_balance: account.opening_balance,
      opening_balance_at: account.opening_balance_at,
      icon: account.icon,
      is_favorite: account.is_favorite,
      is_balance_hidden: account.is_balance_hidden,
      is_active: account.is_active,
      sort_order: account.sort_order,
    });
  }

  async function handleSubmit() {
    if (!session?.accessToken) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setFeedback(null);

    try {
      if (editingAccountId) {
        const response = await updateTenantFinanceAccount(
          session.accessToken,
          editingAccountId,
          form
        );
        setFeedback(response.message);
      } else {
        const response = await createTenantFinanceAccount(session.accessToken, form);
        setFeedback(response.message);
      }
      startCreate(false);
      await loadAccounts();
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleToggle(account: TenantFinanceAccount) {
    if (!session?.accessToken) {
      return;
    }

    try {
      setError(null);
      const response = await updateTenantFinanceAccountStatus(
        session.accessToken,
        account.id,
        !account.is_active
      );
      setFeedback(response.message);
      await loadAccounts();
    } catch (rawError) {
      setError(rawError as ApiError);
    }
  }

  async function handleDelete(account: TenantFinanceAccount) {
    if (!session?.accessToken) {
      return;
    }

    const confirmed = window.confirm(
      language === "es"
        ? `Eliminar la cuenta "${account.name}" solo funcionará si no tiene movimientos, préstamos ni cuentas hijas asociadas. ¿Quieres continuar?`
        : `Deleting account "${account.name}" only works when it has no linked transactions, loans, or child accounts. Continue?`
    );
    if (!confirmed) {
      return;
    }

    try {
      setError(null);
      const response = await deleteTenantFinanceAccount(session.accessToken, account.id);
      if (editingAccountId === account.id) {
        startCreate(false);
      }
      setFeedback(response.message);
      await loadAccounts();
    } catch (rawError) {
      setError(rawError as ApiError);
    }
  }

  const currencyById = new Map(currencies.map((currency) => [currency.id, currency]));

  return (
    <div className="d-grid gap-4">
      <PageHeader
        eyebrow={language === "es" ? "Finance" : "Finance"}
        icon="accounts"
        title={language === "es" ? "Cuentas" : "Accounts"}
        description={
          language === "es"
            ? "Administra las cuentas financieras visibles del tenant."
            : "Manage the financial accounts visible for this tenant."
        }
        actions={
          <AppToolbar compact>
            <FinanceHelpBubble
              label={language === "es" ? "Ayuda sobre cuentas" : "Accounts help"}
              helpText={
                language === "es"
                  ? "Usa Desactivar para ocultar una cuenta sin perder historial. Eliminar solo funciona cuando la cuenta no tiene movimientos, préstamos ni cuentas hijas."
                  : "Use Deactivate to hide an account without losing history. Delete only works when the account has no linked transactions, loans, or child accounts."
              }
            />
            <button className="btn btn-outline-secondary" type="button" onClick={() => void loadAccounts()}>
              {language === "es" ? "Recargar" : "Reload"}
            </button>
            <button className="btn btn-primary" type="button" onClick={() => startCreate(true)}>
              {language === "es" ? "Nueva cuenta" : "New account"}
            </button>
          </AppToolbar>
        }
      />
      <FinanceModuleNav />

      {feedback ? <div className="alert alert-success mb-0">{feedback}</div> : null}
      {error ? (
        <ErrorState
          title={
            language === "es"
              ? "No se pudieron cargar las cuentas"
              : "Accounts could not be loaded"
          }
          detail={getApiErrorDisplayMessage(error)}
          requestId={error.payload?.request_id}
        />
      ) : null}
      {isLoading ? (
        <LoadingBlock
          label={
            language === "es"
              ? "Cargando cuentas financieras..."
              : "Loading financial accounts..."
          }
        />
      ) : null}

      {isFormOpen ? (
        <div
          className="finance-form-backdrop"
          role="presentation"
          onClick={() => startCreate(false)}
        >
          <div
            className="finance-form-modal finance-form-modal--wide"
            role="dialog"
            aria-modal="true"
            aria-label={
              editingAccountId
                ? language === "es"
                  ? "Editar cuenta"
                  : "Edit account"
                : language === "es"
                  ? "Nueva cuenta"
                  : "New account"
            }
            onClick={(event) => event.stopPropagation()}
          >
            <div className="finance-form-modal__eyebrow">
              {editingAccountId
                ? language === "es"
                  ? "Edición puntual"
                  : "Targeted edit"
                : language === "es"
                  ? "Alta bajo demanda"
                  : "On-demand creation"}
            </div>
            <PanelCard
              title={
                editingAccountId
                  ? language === "es"
                    ? "Editar cuenta"
                    : "Edit account"
                  : language === "es"
                    ? "Nueva cuenta"
                    : "New account"
              }
              subtitle={
                language === "es"
                  ? "Define nombre, tipo, moneda y jerarquía de la cuenta."
                  : "Define name, type, currency, and account hierarchy."
              }
            >
              <AccountForm
                value={form}
                currencies={currencies}
                parentAccounts={parentAccounts}
                submitLabel={
                  editingAccountId
                    ? language === "es"
                      ? "Guardar cambios"
                      : "Save changes"
                    : language === "es"
                      ? "Crear cuenta"
                      : "Create account"
                }
                isSubmitting={isSubmitting}
                onChange={setForm}
                onSubmit={handleSubmit}
                onCancel={() => startCreate(false)}
              />
            </PanelCard>
          </div>
        </div>
      ) : null}

      <DataTableCard
          title={language === "es" ? "Catálogo de cuentas" : "Accounts catalog"}
          subtitle={
            language === "es"
              ? "Cuentas activas e inactivas visibles para el módulo."
              : "Active and inactive accounts visible to the module."
          }
          rows={accounts}
          columns={[
            {
              key: "name",
              header: language === "es" ? "Cuenta" : "Account",
              render: (account) => (
                <div className="finance-category-row">
                  <span
                    className="finance-category-row__icon"
                    title={getFinanceAccountIconLabel(
                      account.icon,
                      language,
                      account.account_type
                    )}
                  >
                    <FinanceIcon
                      name={getFinanceAccountIconName(
                        account.icon,
                        account.account_type
                      )}
                      size={18}
                    />
                  </span>
                  <div>
                    <div className="fw-semibold">{account.name}</div>
                    <div className="text-secondary small">
                      {account.code || (language === "es" ? "sin código" : "no code")}
                    </div>
                  </div>
                </div>
              ),
            },
            {
              key: "type",
              header: language === "es" ? "Tipo" : "Type",
              render: (account) =>
                getFinanceAccountTypeLabel(account.account_type, language),
            },
            {
              key: "currency",
              header: language === "es" ? "Moneda" : "Currency",
              render: (account) => currencyById.get(account.currency_id)?.code || account.currency_id,
            },
            {
              key: "status",
              header: language === "es" ? "Estado" : "Status",
              render: (account) => (
                <AppBadge tone={account.is_active ? "success" : "warning"}>
                  {getActiveStateLabel(account.is_active, language)}
                </AppBadge>
              ),
            },
            {
              key: "actions",
              header: language === "es" ? "Acciones" : "Actions",
              render: (account) => (
                <AppToolbar compact>
                  <button
                    className="btn btn-sm btn-outline-primary"
                    type="button"
                    onClick={() => startEdit(account)}
                  >
                    {language === "es" ? "Editar" : "Edit"}
                  </button>
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    type="button"
                    onClick={() => void handleToggle(account)}
                  >
                    {account.is_active
                      ? language === "es"
                        ? "Desactivar"
                        : "Deactivate"
                      : language === "es"
                        ? "Activar"
                        : "Activate"}
                  </button>
                  <button
                    className="btn btn-sm btn-outline-danger"
                    type="button"
                    onClick={() => void handleDelete(account)}
                  >
                    {language === "es" ? "Eliminar" : "Delete"}
                  </button>
                </AppToolbar>
              ),
            },
          ]}
        />
    </div>
  );
}
