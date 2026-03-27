import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "../../../../../components/common/PageHeader";
import { PanelCard } from "../../../../../components/common/PanelCard";
import { DataTableCard } from "../../../../../components/data-display/DataTableCard";
import { ErrorState } from "../../../../../components/feedback/ErrorState";
import { LoadingBlock } from "../../../../../components/feedback/LoadingBlock";
import { getApiErrorDisplayMessage } from "../../../../../services/api";
import { useTenantAuth } from "../../../../../store/tenant-auth-context";
import type { ApiError } from "../../../../../types";
import { FinanceModuleNav } from "../components/common/FinanceModuleNav";
import { AccountForm } from "../forms/AccountForm";
import {
  createTenantFinanceAccount,
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
  const [accounts, setAccounts] = useState<TenantFinanceAccount[]>([]);
  const [currencies, setCurrencies] = useState<TenantFinanceCurrency[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  function startCreate() {
    setEditingAccountId(null);
    setError(null);
    setFeedback(null);
    setForm(buildDefaultForm(currencies[0]?.id ?? null));
  }

  function startEdit(account: TenantFinanceAccount) {
    setEditingAccountId(account.id);
    setError(null);
    setFeedback(null);
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
      startCreate();
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

  const currencyById = new Map(currencies.map((currency) => [currency.id, currency]));

  return (
    <div className="d-grid gap-4">
      <PageHeader
        eyebrow="Finance"
        title="Cuentas"
        description="Administra las cuentas financieras visibles del tenant."
        actions={
          <>
            <button className="btn btn-outline-secondary" type="button" onClick={() => void loadAccounts()}>
              Recargar
            </button>
            <button className="btn btn-primary" type="button" onClick={startCreate}>
              Nueva cuenta
            </button>
          </>
        }
      />
      <FinanceModuleNav />

      {feedback ? <div className="alert alert-success mb-0">{feedback}</div> : null}
      {error ? (
        <ErrorState
          title="No se pudieron cargar las cuentas"
          detail={getApiErrorDisplayMessage(error)}
          requestId={error.payload?.request_id}
        />
      ) : null}
      {isLoading ? <LoadingBlock label="Cargando cuentas financieras..." /> : null}

      <div className="finance-catalog-layout">
        <PanelCard
          title={editingAccountId ? "Editar cuenta" : "Nueva cuenta"}
          subtitle="Define nombre, tipo, moneda y jerarquía de la cuenta."
        >
          <AccountForm
            value={form}
            currencies={currencies}
            parentAccounts={parentAccounts}
            submitLabel={editingAccountId ? "Guardar cambios" : "Crear cuenta"}
            isSubmitting={isSubmitting}
            onChange={setForm}
            onSubmit={handleSubmit}
            onCancel={editingAccountId ? startCreate : undefined}
          />
        </PanelCard>

        <DataTableCard
          title="Catálogo de cuentas"
          subtitle="Cuentas activas e inactivas visibles para el módulo."
          rows={accounts}
          columns={[
            {
              key: "name",
              header: "Cuenta",
              render: (account) => (
                <div>
                  <div className="fw-semibold">{account.name}</div>
                  <div className="text-secondary small">{account.code || "sin código"}</div>
                </div>
              ),
            },
            {
              key: "type",
              header: "Tipo",
              render: (account) => account.account_type,
            },
            {
              key: "currency",
              header: "Moneda",
              render: (account) => currencyById.get(account.currency_id)?.code || account.currency_id,
            },
            {
              key: "status",
              header: "Estado",
              render: (account) => (
                <span
                  className={`finance-status-pill${account.is_active ? " is-active" : " is-inactive"}`}
                >
                  {account.is_active ? "activa" : "inactiva"}
                </span>
              ),
            },
            {
              key: "actions",
              header: "Acciones",
              render: (account) => (
                <div className="d-flex gap-2">
                  <button
                    className="btn btn-sm btn-outline-primary"
                    type="button"
                    onClick={() => startEdit(account)}
                  >
                    Editar
                  </button>
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    type="button"
                    onClick={() => void handleToggle(account)}
                  >
                    {account.is_active ? "Desactivar" : "Activar"}
                  </button>
                </div>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}
