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
  getTenantFinanceAccounts,
  type TenantFinanceAccount,
} from "../services/accountsService";
import {
  getTenantFinanceCurrencies,
  type TenantFinanceCurrency,
} from "../services/currenciesService";
import {
  applyTenantFinanceLoanInstallmentPayment,
  applyTenantFinanceLoanInstallmentPaymentBatch,
  createTenantFinanceLoan,
  getTenantFinanceLoanDetail,
  getTenantFinanceLoans,
  reverseTenantFinanceLoanInstallmentPayment,
  reverseTenantFinanceLoanInstallmentPaymentBatch,
  updateTenantFinanceLoan,
  type TenantFinanceLoan,
  type TenantFinanceLoanDetailResponse,
  type TenantFinanceLoanInstallment,
  type TenantFinanceLoansResponse,
} from "../services/loansService";

type LoanFormState = {
  name: string;
  loanType: string;
  counterpartyName: string;
  currencyId: string;
  accountId: string;
  principalAmount: string;
  currentBalance: string;
  interestRate: string;
  installmentsCount: string;
  paymentFrequency: string;
  startDate: string;
  dueDate: string;
  note: string;
  isActive: boolean;
};

type ActionFeedback = {
  type: "success" | "error";
  message: string;
};

type InstallmentPaymentFormState = {
  mode: "apply" | "reverse";
  installmentId: number | null;
  paidAmount: string;
  accountId: string;
  allocationMode: string;
  reversalReasonCode: string;
  note: string;
};

type InstallmentBatchFormState = {
  mode: "apply" | "reverse";
  amountMode: string;
  amount: string;
  accountId: string;
  allocationMode: string;
  reversalReasonCode: string;
  note: string;
};

const DEFAULT_FORM_STATE: LoanFormState = {
  name: "",
  loanType: "borrowed",
  counterpartyName: "",
  currencyId: "",
  accountId: "",
  principalAmount: "",
  currentBalance: "",
  interestRate: "",
  installmentsCount: "",
  paymentFrequency: "monthly",
  startDate: buildTodayDateValue(),
  dueDate: "",
  note: "",
  isActive: true,
};

export function FinanceLoansPage() {
  const { session } = useTenantAuth();
  const { language } = useLanguage();
  const [loansResponse, setLoansResponse] = useState<TenantFinanceLoansResponse | null>(null);
  const [currencies, setCurrencies] = useState<TenantFinanceCurrency[]>([]);
  const [accounts, setAccounts] = useState<TenantFinanceAccount[]>([]);
  const [editingLoanId, setEditingLoanId] = useState<number | null>(null);
  const [selectedLoanId, setSelectedLoanId] = useState<number | null>(null);
  const [loanDetail, setLoanDetail] = useState<TenantFinanceLoanDetailResponse["data"] | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [loanDetailError, setLoanDetailError] = useState<string | null>(null);
  const [paymentFormState, setPaymentFormState] = useState<InstallmentPaymentFormState>({
    mode: "apply",
    installmentId: null,
    paidAmount: "",
    accountId: "",
    allocationMode: "interest_first",
    reversalReasonCode: "operator_error",
    note: "",
  });
  const [selectedInstallmentIds, setSelectedInstallmentIds] = useState<number[]>([]);
  const [batchFormState, setBatchFormState] = useState<InstallmentBatchFormState>({
    mode: "apply",
    amountMode: "full_remaining",
    amount: "",
    accountId: "",
    allocationMode: "interest_first",
    reversalReasonCode: "operator_error",
    note: "",
  });
  const [filterLoanType, setFilterLoanType] = useState("");
  const [filterLoanStatus, setFilterLoanStatus] = useState("");
  const [includeInactive, setIncludeInactive] = useState(true);
  const [formState, setFormState] = useState<LoanFormState>(DEFAULT_FORM_STATE);
  const [error, setError] = useState<ApiError | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<ActionFeedback | null>(null);

  const activeCurrencies = useMemo(
    () => currencies.filter((currency) => currency.is_active),
    [currencies]
  );
  const baseCurrencyCode =
    activeCurrencies.find((currency) => currency.is_base)?.code ||
    activeCurrencies[0]?.code ||
    "USD";
  const availableAccounts = useMemo(() => {
    const selectedAccountId = formState.accountId ? Number(formState.accountId) : null;
    const selectedCurrencyId = formState.currencyId ? Number(formState.currencyId) : null;
    return accounts.filter((account) => {
      const isSelected = selectedAccountId != null && account.id === selectedAccountId;
      const currencyMatches =
        selectedCurrencyId == null || account.currency_id === selectedCurrencyId;
      return currencyMatches && (account.is_active || isSelected);
    });
  }, [accounts, formState.accountId, formState.currencyId]);

  useEffect(() => {
    void loadLoanWorkspace();
  }, [session?.accessToken, filterLoanType, filterLoanStatus, includeInactive]);

  useEffect(() => {
    if (!formState.currencyId && activeCurrencies.length > 0) {
      const baseCurrency = activeCurrencies.find((currency) => currency.is_base);
      setFormState((current) => ({
        ...current,
        currencyId: String((baseCurrency || activeCurrencies[0]).id),
      }));
    }
  }, [activeCurrencies, formState.currencyId]);

  useEffect(() => {
    if (!formState.accountId) {
      return;
    }
    const selectedAccountId = Number(formState.accountId);
    if (!availableAccounts.some((account) => account.id === selectedAccountId)) {
      setFormState((current) => ({ ...current, accountId: "" }));
    }
  }, [availableAccounts, formState.accountId]);

  useEffect(() => {
    void loadLoanDetail();
  }, [session?.accessToken, selectedLoanId]);

  useEffect(() => {
    setPaymentFormState({
      mode: "apply",
      installmentId: null,
      paidAmount: "",
      accountId: "",
      allocationMode: "interest_first",
      reversalReasonCode: "operator_error",
      note: "",
    });
    setSelectedInstallmentIds([]);
    setBatchFormState({
      mode: "apply",
      amountMode: "full_remaining",
      amount: "",
      accountId: "",
      allocationMode: "interest_first",
      reversalReasonCode: "operator_error",
      note: "",
    });
  }, [selectedLoanId]);

  async function loadLoanWorkspace() {
    if (!session?.accessToken) {
      return;
    }

    setIsLoading(true);
    setError(null);

    const results = await Promise.allSettled([
      getTenantFinanceLoans(session.accessToken, {
        includeInactive,
        loanType: filterLoanType || undefined,
        loanStatus: filterLoanStatus || undefined,
      }),
      getTenantFinanceCurrencies(session.accessToken, false),
      getTenantFinanceAccounts(session.accessToken, true),
    ]);

    const [loansResult, currenciesResult, accountsResult] = results;

    if (
      loansResult.status === "rejected" &&
      currenciesResult.status === "rejected" &&
      accountsResult.status === "rejected"
    ) {
      setLoansResponse(null);
      setCurrencies([]);
      setAccounts([]);
      setError(loansResult.reason as ApiError);
      setIsLoading(false);
      return;
    }

    setLoansResponse(loansResult.status === "fulfilled" ? loansResult.value : null);
    setCurrencies(currenciesResult.status === "fulfilled" ? currenciesResult.value.data : []);
    setAccounts(accountsResult.status === "fulfilled" ? accountsResult.value.data : []);
    setIsLoading(false);
  }

  async function loadLoanDetail() {
    if (!session?.accessToken || selectedLoanId == null) {
      setLoanDetail(null);
      setLoanDetailError(null);
      setIsDetailLoading(false);
      return;
    }

    setIsDetailLoading(true);
    setLoanDetailError(null);
    try {
      const response = await getTenantFinanceLoanDetail(session.accessToken, selectedLoanId);
      setLoanDetail(response.data);
    } catch (rawError) {
      setLoanDetail(null);
      setLoanDetailError(getApiErrorDisplayMessage(rawError as ApiError));
    } finally {
      setIsDetailLoading(false);
    }
  }

  function resetForm() {
    setEditingLoanId(null);
    const baseCurrency = activeCurrencies.find((currency) => currency.is_base);
    setFormState({
      ...DEFAULT_FORM_STATE,
      currencyId: baseCurrency ? String(baseCurrency.id) : activeCurrencies[0] ? String(activeCurrencies[0].id) : "",
      accountId: "",
      startDate: buildTodayDateValue(),
    });
  }

  function startEditingLoan(loan: TenantFinanceLoan) {
    setEditingLoanId(loan.id);
    setFormState({
      name: loan.name,
      loanType: loan.loan_type,
      counterpartyName: loan.counterparty_name,
      currencyId: String(loan.currency_id),
      accountId: loan.account_id == null ? "" : String(loan.account_id),
      principalAmount: String(loan.principal_amount),
      currentBalance: String(loan.current_balance),
      interestRate: loan.interest_rate == null ? "" : String(loan.interest_rate),
      installmentsCount: loan.installments_count == null ? "" : String(loan.installments_count),
      paymentFrequency: loan.payment_frequency,
      startDate: loan.start_date,
      dueDate: loan.due_date || "",
      note: loan.note || "",
      isActive: loan.is_active,
    });
    setSelectedLoanId(loan.id);
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
        name: formState.name.trim(),
        loan_type: formState.loanType,
        counterparty_name: formState.counterpartyName.trim(),
        currency_id: Number(formState.currencyId),
        account_id: formState.accountId ? Number(formState.accountId) : null,
        principal_amount: Number.parseFloat(formState.principalAmount),
        current_balance: Number.parseFloat(formState.currentBalance),
        interest_rate: formState.interestRate.trim()
          ? Number.parseFloat(formState.interestRate)
          : null,
        installments_count: formState.installmentsCount.trim()
          ? Number.parseInt(formState.installmentsCount, 10)
          : null,
        payment_frequency: formState.paymentFrequency,
        start_date: formState.startDate,
        due_date: formState.dueDate || null,
        note: formState.note.trim() || null,
        is_active: formState.isActive,
      };
      const response = editingLoanId
        ? await updateTenantFinanceLoan(session.accessToken, editingLoanId, payload)
        : await createTenantFinanceLoan(session.accessToken, payload);

      await loadLoanWorkspace();
      setSelectedLoanId(response.data.id);
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

  function startInstallmentPayment(installment: TenantFinanceLoanInstallment) {
    const remainingAmount = Math.max(
      Number((installment.planned_amount - installment.paid_amount).toFixed(2)),
      0
    );
    setPaymentFormState({
      mode: "apply",
      installmentId: installment.id,
      paidAmount: remainingAmount > 0 ? String(remainingAmount) : "",
      accountId: loanDetail?.loan.account_id == null ? "" : String(loanDetail.loan.account_id),
      allocationMode: "interest_first",
      reversalReasonCode: installment.reversal_reason_code || "operator_error",
      note: installment.note || "",
    });
  }

  function startInstallmentReversal(installment: TenantFinanceLoanInstallment) {
    setPaymentFormState({
      mode: "reverse",
      installmentId: installment.id,
      paidAmount: installment.paid_amount > 0 ? String(installment.paid_amount) : "",
      accountId: loanDetail?.loan.account_id == null ? "" : String(loanDetail.loan.account_id),
      allocationMode: "interest_first",
      reversalReasonCode: installment.reversal_reason_code || "operator_error",
      note: installment.note || "",
    });
  }

  async function handleInstallmentPaymentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.accessToken || selectedLoanId == null || paymentFormState.installmentId == null) {
      return;
    }

    setIsSubmitting(true);
    setActionFeedback(null);

    try {
      const response =
        paymentFormState.mode === "apply"
          ? await applyTenantFinanceLoanInstallmentPayment(
              session.accessToken,
              selectedLoanId,
              paymentFormState.installmentId,
              {
                paid_amount: Number.parseFloat(paymentFormState.paidAmount),
                account_id: paymentFormState.accountId
                  ? Number(paymentFormState.accountId)
                  : null,
                paid_at: null,
                allocation_mode: paymentFormState.allocationMode,
                note: paymentFormState.note.trim() || null,
              }
            )
          : await reverseTenantFinanceLoanInstallmentPayment(
              session.accessToken,
              selectedLoanId,
              paymentFormState.installmentId,
              {
                reversed_amount: Number.parseFloat(paymentFormState.paidAmount),
                account_id: paymentFormState.accountId
                  ? Number(paymentFormState.accountId)
                  : null,
                reversal_reason_code: paymentFormState.reversalReasonCode,
                note: paymentFormState.note.trim() || null,
              }
            );
      await loadLoanWorkspace();
      await loadLoanDetail();
      setPaymentFormState({
        mode: "apply",
        installmentId: null,
        paidAmount: "",
        accountId: response.data.loan.account_id == null ? "" : String(response.data.loan.account_id),
        allocationMode: "interest_first",
        reversalReasonCode: "operator_error",
        note: "",
      });
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

  async function handleInstallmentBatchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.accessToken || selectedLoanId == null || selectedInstallmentIds.length === 0) {
      return;
    }

    setIsSubmitting(true);
    setActionFeedback(null);

    try {
      const response =
        batchFormState.mode === "apply"
          ? await applyTenantFinanceLoanInstallmentPaymentBatch(
              session.accessToken,
              selectedLoanId,
              {
                installment_ids: selectedInstallmentIds,
                amount_mode: batchFormState.amountMode,
                paid_amount:
                  batchFormState.amountMode === "fixed_per_installment"
                    ? Number.parseFloat(batchFormState.amount)
                    : null,
                account_id: batchFormState.accountId ? Number(batchFormState.accountId) : null,
                paid_at: null,
                allocation_mode: batchFormState.allocationMode,
                note: batchFormState.note.trim() || null,
              }
            )
          : await reverseTenantFinanceLoanInstallmentPaymentBatch(
              session.accessToken,
              selectedLoanId,
              {
                installment_ids: selectedInstallmentIds,
                amount_mode: batchFormState.amountMode,
                reversed_amount:
                  batchFormState.amountMode === "fixed_per_installment"
                    ? Number.parseFloat(batchFormState.amount)
                    : null,
                account_id: batchFormState.accountId ? Number(batchFormState.accountId) : null,
                reversal_reason_code: batchFormState.reversalReasonCode,
                note: batchFormState.note.trim() || null,
              }
            );
      await loadLoanWorkspace();
      await loadLoanDetail();
      setSelectedInstallmentIds([]);
      setBatchFormState({
        mode: "apply",
        amountMode: "full_remaining",
        amount: "",
        accountId: response.data.loan.account_id == null ? "" : String(response.data.loan.account_id),
        allocationMode: "interest_first",
        reversalReasonCode: "operator_error",
        note: "",
      });
      setActionFeedback({
        type: "success",
        message: `${response.message} (${response.data.affected_count} cuotas)`,
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

  function toggleInstallmentSelection(installmentId: number) {
    setSelectedInstallmentIds((current) =>
      current.includes(installmentId)
        ? current.filter((item) => item !== installmentId)
        : [...current, installmentId]
    );
  }

  function toggleAllInstallmentsSelection() {
    if (!loanDetail?.installments.length) {
      return;
    }
    const allIds = loanDetail.installments.map((installment) => installment.id);
    setSelectedInstallmentIds((current) =>
      current.length === allIds.length ? [] : allIds
    );
  }

  const summary = loansResponse?.summary;

  return (
    <div className="d-grid gap-4">
      <PageHeader
        eyebrow="Finance"
        title={language === "es" ? "Préstamos" : "Loans"}
        description={
          language === "es"
            ? "Gestiona dinero prestado o recibido, con saldo pendiente, contraparte y lectura rápida de cartera."
            : "Manage borrowed or lent money, with outstanding balance, counterparty, and a quick portfolio view."
        }
      />

      <FinanceModuleNav />

      {actionFeedback ? (
        <div className={`tenant-action-feedback tenant-action-feedback--${actionFeedback.type}`}>
          <strong>{language === "es" ? "Préstamos:" : "Loans:"}</strong> {actionFeedback.message}
        </div>
      ) : null}

      {isLoading ? (
        <LoadingBlock label={language === "es" ? "Cargando préstamos..." : "Loading loans..."} />
      ) : null}

      <div className="tenant-portal-metrics">
        <MetricCard
          label={language === "es" ? "Capital total" : "Total principal"}
          value={formatMoney(summary?.total_principal || 0, baseCurrencyCode, language)}
          hint={language === "es" ? "Monto inicial visible" : "Visible opening amount"}
        />
        <MetricCard
          label={language === "es" ? "Saldo prestado" : "Lent balance"}
          value={formatMoney(summary?.lent_balance || 0, baseCurrencyCode, language)}
          hint={language === "es" ? "Por cobrar a terceros" : "Outstanding from third parties"}
        />
        <MetricCard
          label={language === "es" ? "Saldo recibido" : "Borrowed balance"}
          value={formatMoney(summary?.borrowed_balance || 0, baseCurrencyCode, language)}
          hint={language === "es" ? "Por pagar a terceros" : "Outstanding to third parties"}
        />
        <MetricCard
          label={language === "es" ? "Activos" : "Active"}
          value={summary?.active_items || 0}
          hint={language === "es" ? "Préstamos abiertos" : "Open loans"}
        />
      </div>

      {error ? (
        <div className="d-grid gap-3">
          <ErrorState
            title={language === "es" ? "Préstamos no disponibles" : "Loans unavailable"}
            detail={error.payload?.detail || error.message}
            requestId={error.payload?.request_id}
          />
          <FinanceSchemaSyncCallout error={error} onSynced={loadLoanWorkspace} />
        </div>
      ) : null}

      <div className="tenant-portal-split tenant-portal-split--finance">
        <PanelCard
          title={
            editingLoanId
              ? language === "es"
                ? "Editar préstamo"
                : "Edit loan"
              : language === "es"
                ? "Registrar préstamo"
                : "Create loan"
          }
          subtitle={
            language === "es"
              ? "Primer corte: cartera básica con saldo pendiente y contraparte, sin abrir todavía amortización avanzada."
              : "First slice: basic portfolio with outstanding balance and counterparty, before opening advanced amortization."
          }
        >
          <form className="d-grid gap-3" onSubmit={handleSubmit}>
            <div className="tenant-inline-form-grid">
              <div>
                <label className="form-label">Nombre</label>
                <input
                  className="form-control"
                  value={formState.name}
                  onChange={(event) => setFormState((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Ej: Crédito vehículo"
                />
              </div>
              <div>
                <label className="form-label">{language === "es" ? "Tipo" : "Type"}</label>
                <select
                  className="form-select"
                  value={formState.loanType}
                  onChange={(event) => setFormState((current) => ({ ...current, loanType: event.target.value }))}
                >
                  <option value="borrowed">{language === "es" ? "Recibido" : "Borrowed"}</option>
                  <option value="lent">{language === "es" ? "Prestado" : "Lent"}</option>
                </select>
              </div>
            </div>

            <div className="tenant-inline-form-grid">
              <div>
                <label className="form-label">{language === "es" ? "Contraparte" : "Counterparty"}</label>
                <input
                  className="form-control"
                  value={formState.counterpartyName}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, counterpartyName: event.target.value }))
                  }
                  placeholder="Ej: Banco Sur"
                />
              </div>
              <div>
                <label className="form-label">{language === "es" ? "Moneda" : "Currency"}</label>
                <select
                  className="form-select"
                  value={formState.currencyId}
                  onChange={(event) => setFormState((current) => ({ ...current, currencyId: event.target.value }))}
                >
                  <option value="">{language === "es" ? "Selecciona una moneda" : "Select a currency"}</option>
                  {activeCurrencies.map((currency) => (
                    <option key={currency.id} value={currency.id}>
                      {currency.code} · {currency.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="form-label">
                {language === "es" ? "Cuenta origen" : "Source account"}
              </label>
              <select
                className="form-select"
                value={formState.accountId}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, accountId: event.target.value }))
                }
              >
                <option value="">
                  {language === "es"
                    ? "Sin cuenta fija; se pedirá al operar cuotas"
                    : "No fixed account; it will be requested when operating installments"}
                </option>
                {availableAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {buildAccountOptionLabel(account)}
                  </option>
                ))}
              </select>
            </div>

            <div className="tenant-inline-form-grid">
              <div>
                <label className="form-label">{language === "es" ? "Capital inicial" : "Opening principal"}</label>
                <input
                  className="form-control"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formState.principalAmount}
                  onChange={(event) => setFormState((current) => ({ ...current, principalAmount: event.target.value }))}
                />
              </div>
              <div>
                <label className="form-label">{language === "es" ? "Saldo pendiente" : "Outstanding balance"}</label>
                <input
                  className="form-control"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formState.currentBalance}
                  onChange={(event) => setFormState((current) => ({ ...current, currentBalance: event.target.value }))}
                />
              </div>
            </div>

            <div className="tenant-inline-form-grid">
              <div>
                <label className="form-label">{language === "es" ? "Tasa interés %" : "Interest rate %"}</label>
                <input
                  className="form-control"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formState.interestRate}
                  onChange={(event) => setFormState((current) => ({ ...current, interestRate: event.target.value }))}
                />
              </div>
              <div>
                <label className="form-label">{language === "es" ? "Cuotas" : "Installments"}</label>
                <input
                  className="form-control"
                  type="number"
                  min="1"
                  step="1"
                  value={formState.installmentsCount}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, installmentsCount: event.target.value }))
                  }
                  placeholder="Ej: 12"
                />
              </div>
            </div>

            <div className="tenant-inline-form-grid">
              <div>
                <label className="form-label">{language === "es" ? "Frecuencia" : "Frequency"}</label>
                <select
                  className="form-select"
                  value={formState.paymentFrequency}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, paymentFrequency: event.target.value }))
                  }
                >
                  <option value="monthly">{language === "es" ? "Mensual" : "Monthly"}</option>
                </select>
              </div>
              <div>
                <label className="form-label">{language === "es" ? "Activo" : "Active"}</label>
                <select
                  className="form-select"
                  value={formState.isActive ? "true" : "false"}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, isActive: event.target.value === "true" }))
                  }
                >
                  <option value="true">{language === "es" ? "Sí" : "Yes"}</option>
                  <option value="false">No</option>
                </select>
              </div>
            </div>

            <div className="tenant-inline-form-grid">
              <div>
                <label className="form-label">{language === "es" ? "Inicio" : "Start date"}</label>
                <input
                  className="form-control"
                  type="date"
                  value={formState.startDate}
                  onChange={(event) => setFormState((current) => ({ ...current, startDate: event.target.value }))}
                />
              </div>
              <div>
                <label className="form-label">{language === "es" ? "Vencimiento" : "Due date"}</label>
                <input
                  className="form-control"
                  type="date"
                  value={formState.dueDate}
                  onChange={(event) => setFormState((current) => ({ ...current, dueDate: event.target.value }))}
                />
              </div>
            </div>

            <div>
              <label className="form-label">{language === "es" ? "Nota" : "Note"}</label>
              <textarea
                className="form-control"
                rows={3}
                value={formState.note}
                onChange={(event) => setFormState((current) => ({ ...current, note: event.target.value }))}
                placeholder="Ej: renegociado en marzo o con cuota variable"
              />
            </div>

            <div className="finance-inline-toolbar finance-inline-toolbar--compact">
              <button className="btn btn-primary" type="submit" disabled={isSubmitting}>
                {editingLoanId
                  ? language === "es"
                    ? "Guardar cambios"
                    : "Save changes"
                  : language === "es"
                    ? "Registrar préstamo"
                    : "Create loan"}
              </button>
              {editingLoanId ? (
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
          title={language === "es" ? "Lectura de cartera" : "Portfolio reading"}
          subtitle={
            language === "es"
              ? "Filtra por tipo o estado para separar deuda recibida, deuda prestada y cartera ya liquidada."
              : "Filter by type or status to separate borrowed debt, lent debt, and settled portfolio."
          }
        >
          <div className="d-grid gap-3">
            <div className="tenant-inline-form-grid">
              <div>
                <label className="form-label">{language === "es" ? "Tipo" : "Type"}</label>
                <select
                  className="form-select"
                  value={filterLoanType}
                  onChange={(event) => setFilterLoanType(event.target.value)}
                >
                  <option value="">{language === "es" ? "Todos" : "All"}</option>
                  <option value="borrowed">{language === "es" ? "Recibidos" : "Borrowed"}</option>
                  <option value="lent">{language === "es" ? "Prestados" : "Lent"}</option>
                </select>
              </div>
              <div>
                <label className="form-label">{language === "es" ? "Estado" : "Status"}</label>
                <select
                  className="form-select"
                  value={filterLoanStatus}
                  onChange={(event) => setFilterLoanStatus(event.target.value)}
                >
                  <option value="">{language === "es" ? "Todos" : "All"}</option>
                  <option value="open">{language === "es" ? "Abiertos" : "Open"}</option>
                  <option value="settled">{language === "es" ? "Liquidados" : "Settled"}</option>
                  <option value="inactive">{language === "es" ? "Inactivos" : "Inactive"}</option>
                </select>
              </div>
            </div>
            <div className="form-check">
              <input
                className="form-check-input"
                type="checkbox"
                id="finance-loans-include-inactive"
                checked={includeInactive}
                onChange={(event) => setIncludeInactive(event.target.checked)}
              />
              <label className="form-check-label" htmlFor="finance-loans-include-inactive">
                {language === "es" ? "Incluir inactivos" : "Include inactive"}
              </label>
            </div>
            <div className="tenant-detail-grid">
              <DetailField label={language === "es" ? "Capital visible" : "Visible principal"} value={formatMoney(summary?.total_principal || 0, baseCurrencyCode, language)} />
              <DetailField label={language === "es" ? "Prestado" : "Lent"} value={formatMoney(summary?.lent_balance || 0, baseCurrencyCode, language)} />
              <DetailField label={language === "es" ? "Recibido" : "Borrowed"} value={formatMoney(summary?.borrowed_balance || 0, baseCurrencyCode, language)} />
              <DetailField label={language === "es" ? "Ítems" : "Items"} value={summary?.total_items || 0} />
            </div>
          </div>
        </PanelCard>
      </div>

      <PanelCard
        title={language === "es" ? "Cartera de préstamos" : "Loan portfolio"}
        subtitle={
          language === "es"
            ? "Lectura básica de capital, saldo y estado para abrir después conciliación de cuotas y cronograma."
            : "Basic view of principal, balance, and status before deeper installment reconciliation and schedule work."
        }
      >
        {loansResponse && loansResponse.data.length > 0 ? (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th>{language === "es" ? "Nombre" : "Name"}</th>
                  <th>{language === "es" ? "Tipo" : "Type"}</th>
                  <th>{language === "es" ? "Contraparte" : "Counterparty"}</th>
                  <th>{language === "es" ? "Cuenta origen" : "Source account"}</th>
                  <th>{language === "es" ? "Capital" : "Principal"}</th>
                  <th>{language === "es" ? "Saldo" : "Balance"}</th>
                  <th>{language === "es" ? "Pagado" : "Paid"}</th>
                  <th>{language === "es" ? "Cuotas" : "Installments"}</th>
                  <th>{language === "es" ? "Próxima" : "Next due"}</th>
                  <th>{language === "es" ? "Moneda" : "Currency"}</th>
                  <th>{language === "es" ? "Estado" : "Status"}</th>
                  <th>{language === "es" ? "Acción" : "Action"}</th>
                </tr>
              </thead>
              <tbody>
                {loansResponse.data.map((loan) => (
                  <tr key={loan.id}>
                    <td>{loan.name}</td>
                    <td>{displayLoanType(loan.loan_type, language)}</td>
                    <td>{loan.counterparty_name}</td>
                    <td>{displayLoanAccount(loan, language)}</td>
                    <td>{formatMoney(loan.principal_amount, loan.currency_code, language)}</td>
                    <td>{formatMoney(loan.current_balance, loan.currency_code, language)}</td>
                    <td>{formatMoney(loan.paid_amount, loan.currency_code, language)}</td>
                    <td>{loan.installments_total > 0 ? `${loan.installments_paid}/${loan.installments_total}` : language === "es" ? "sin plan" : "no plan"}</td>
                    <td>{loan.next_due_date ? formatShortDate(loan.next_due_date, language) : "n/a"}</td>
                    <td>{loan.currency_code}</td>
                    <td>
                      <span className={`status-badge ${loanStatusBadgeClass(loan.loan_status)}`}>
                        {displayLoanStatus(loan.loan_status, language)}
                      </span>
                    </td>
                    <td>
                      <div className="finance-inline-toolbar finance-inline-toolbar--compact">
                        <button
                          className="btn btn-sm btn-outline-primary"
                          type="button"
                          onClick={() => startEditingLoan(loan)}
                        >
                          {language === "es" ? "Editar" : "Edit"}
                        </button>
                        <button
                          className="btn btn-sm btn-outline-secondary"
                          type="button"
                          onClick={() =>
                            setSelectedLoanId((current) => (current === loan.id ? null : loan.id))
                          }
                        >
                          {selectedLoanId === loan.id
                            ? language === "es"
                              ? "Ocultar"
                              : "Hide"
                            : language === "es"
                              ? "Cronograma"
                              : "Schedule"}
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
            {language === "es" ? "No hay préstamos para el filtro seleccionado." : "No loans match the selected filter."}
          </div>
        )}
      </PanelCard>

      <PanelCard
        title={language === "es" ? "Cronograma del préstamo" : "Loan schedule"}
        subtitle={
          language === "es"
            ? "Detalle por cuota para lectura operacional rápida y aplicación manual de pagos simples sobre el cronograma."
            : "Installment detail for quick operational reading and simple manual payments on the schedule."
        }
      >
        {selectedLoanId == null ? (
          <div className="text-secondary">
            {language === "es"
              ? "Selecciona un préstamo en la cartera para revisar su cronograma."
              : "Select a loan from the portfolio to review its schedule."}
          </div>
        ) : isDetailLoading ? (
          <LoadingBlock label={language === "es" ? "Cargando cronograma..." : "Loading schedule..."} />
        ) : loanDetailError ? (
          <div className="text-danger">{loanDetailError}</div>
        ) : loanDetail ? (
          <div className="d-grid gap-3">
            <div className="tenant-detail-grid">
              <DetailField label={language === "es" ? "Préstamo" : "Loan"} value={loanDetail.loan.name} />
              <DetailField label={language === "es" ? "Contraparte" : "Counterparty"} value={loanDetail.loan.counterparty_name} />
              <DetailField
                label={language === "es" ? "Cuenta origen" : "Source account"}
                value={displayLoanAccount(loanDetail.loan, language)}
              />
              <DetailField
                label={language === "es" ? "Plan de cuotas" : "Installment plan"}
                value={
                  loanDetail.loan.installments_total > 0
                    ? `${loanDetail.loan.installments_paid}/${loanDetail.loan.installments_total}`
                    : language === "es"
                      ? "sin cronograma"
                      : "no schedule"
                }
              />
              <DetailField
                label={language === "es" ? "Próximo vencimiento" : "Next due date"}
                value={loanDetail.loan.next_due_date ? formatShortDate(loanDetail.loan.next_due_date, language) : "n/a"}
              />
            </div>

            {loanDetail.installments.length > 0 ? (
              <form className="d-grid gap-3" onSubmit={handleInstallmentBatchSubmit}>
                <div className="tenant-detail-grid">
                  <DetailField label="Cuotas seleccionadas" value={selectedInstallmentIds.length} />
                  <DetailField
                    label="Modo lote"
                    value={batchFormState.mode === "apply" ? "pago" : "reversa"}
                  />
                  <DetailField
                    label={language === "es" ? "Monto lote" : "Batch amount"}
                    value={
                      batchFormState.mode === "apply"
                        ? batchFormState.amountMode === "full_remaining"
                          ? "saldo pendiente por cuota"
                          : "monto fijo por cuota"
                        : batchFormState.amountMode === "full_paid"
                          ? "total pagado por cuota"
                          : "monto fijo por cuota"
                    }
                  />
                  <DetailField
                    label="Acción sugerida"
                    value={
                      selectedInstallmentIds.length > 0
                        ? "lista para ejecutar"
                        : "selecciona cuotas del cronograma"
                    }
                  />
                </div>

                <div className="tenant-inline-form-grid">
                  <div>
                    <label className="form-label">Operación en lote</label>
                    <select
                      className="form-select"
                      value={batchFormState.mode}
                      onChange={(event) =>
                        setBatchFormState((current) => ({
                          ...current,
                          mode: event.target.value as "apply" | "reverse",
                          amountMode:
                            event.target.value === "apply"
                              ? "full_remaining"
                              : "full_paid",
                          reversalReasonCode: "operator_error",
                        }))
                      }
                    >
                      <option value="apply">{language === "es" ? "Aplicar pago" : "Apply payment"}</option>
                      <option value="reverse">{language === "es" ? "Aplicar reversa" : "Apply reversal"}</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Monto por cuota</label>
                    <select
                      className="form-select"
                      value={batchFormState.amountMode}
                      onChange={(event) =>
                        setBatchFormState((current) => ({
                          ...current,
                          amountMode: event.target.value,
                        }))
                      }
                    >
                      {batchFormState.mode === "apply" ? (
                        <>
                          <option value="full_remaining">Saldo pendiente</option>
                          <option value="fixed_per_installment">Monto fijo</option>
                        </>
                      ) : (
                        <>
                          <option value="full_paid">Total pagado</option>
                          <option value="fixed_per_installment">Monto fijo</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>

                <div className="tenant-inline-form-grid">
                  <div>
                    <label className="form-label">Monto fijo</label>
                    <input
                      className="form-control"
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={batchFormState.amount}
                      disabled={batchFormState.amountMode !== "fixed_per_installment"}
                      onChange={(event) =>
                        setBatchFormState((current) => ({
                          ...current,
                          amount: event.target.value,
                        }))
                      }
                      placeholder="Solo si eliges monto fijo"
                    />
                  </div>
                  <div>
                    <label className="form-label">
                      {language === "es" ? "Cuenta operación" : "Operation account"}
                    </label>
                    <select
                      className="form-select"
                      value={batchFormState.accountId}
                      onChange={(event) =>
                        setBatchFormState((current) => ({
                          ...current,
                          accountId: event.target.value,
                        }))
                      }
                    >
                      <option value="">
                        {loanDetail.loan.account_id == null
                          ? language === "es"
                            ? "Selecciona una cuenta"
                            : "Select an account"
                          : language === "es"
                            ? "Usar cuenta del préstamo"
                            : "Use loan account"}
                      </option>
                      {accounts
                        .filter(
                          (account) =>
                            account.currency_id === loanDetail.loan.currency_id &&
                            (account.is_active || account.id === loanDetail.loan.account_id)
                        )
                        .map((account) => (
                          <option key={account.id} value={account.id}>
                            {buildAccountOptionLabel(account)}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div className="tenant-inline-form-grid">
                  <div>
                    <label className="form-label">
                      {batchFormState.mode === "apply"
                        ? language === "es"
                          ? "Modo amortización"
                          : "Amortization mode"
                        : language === "es"
                          ? "Motivo reversa"
                          : "Reversal reason"}
                    </label>
                    {batchFormState.mode === "apply" ? (
                      <select
                        className="form-select"
                        value={batchFormState.allocationMode}
                        onChange={(event) =>
                          setBatchFormState((current) => ({
                            ...current,
                            allocationMode: event.target.value,
                          }))
                        }
                      >
                        <option value="interest_first">Interés primero</option>
                        <option value="principal_first">Capital primero</option>
                        <option value="proportional">Proporcional</option>
                      </select>
                    ) : (
                      <select
                        className="form-select"
                        value={batchFormState.reversalReasonCode}
                        onChange={(event) =>
                          setBatchFormState((current) => ({
                            ...current,
                            reversalReasonCode: event.target.value,
                          }))
                        }
                      >
                        {REVERSAL_REASON_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {displayReversalReason(option.value, language)}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                <div>
                  <label className="form-label">{language === "es" ? "Nota operativa lote" : "Batch operation note"}</label>
                  <input
                    className="form-control"
                    value={batchFormState.note}
                    onChange={(event) =>
                      setBatchFormState((current) => ({
                        ...current,
                        note: event.target.value,
                      }))
                    }
                    placeholder="Ej: abono grupal confirmado por tesorería"
                  />
                </div>

                <div className="finance-inline-toolbar finance-inline-toolbar--compact">
                  <button
                    className="btn btn-primary"
                    type="submit"
                    disabled={isSubmitting || selectedInstallmentIds.length === 0}
                  >
                    {batchFormState.mode === "apply"
                      ? language === "es"
                        ? "Aplicar pago en lote"
                        : "Apply batch payment"
                      : language === "es"
                        ? "Aplicar reversa en lote"
                        : "Apply batch reversal"}
                  </button>
                  <button
                    className="btn btn-outline-secondary"
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => {
                      setSelectedInstallmentIds([]);
                      setBatchFormState({
                        mode: "apply",
                        amountMode: "full_remaining",
                        amount: "",
                        accountId:
                          loanDetail.loan.account_id == null
                            ? ""
                            : String(loanDetail.loan.account_id),
                        allocationMode: "interest_first",
                        reversalReasonCode: "operator_error",
                        note: "",
                      });
                    }}
                  >
                    {language === "es" ? "Limpiar lote" : "Clear batch"}
                  </button>
                </div>
              </form>
            ) : null}

            {paymentFormState.installmentId != null ? (
              <form className="d-grid gap-3" onSubmit={handleInstallmentPaymentSubmit}>
                <div className="tenant-inline-form-grid">
                  <div>
                    <label className="form-label">
                      {paymentFormState.mode === "apply" ? "Abono a cuota" : "Reversa de abono"}
                    </label>
                    <input
                      className="form-control"
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={paymentFormState.paidAmount}
                      onChange={(event) =>
                        setPaymentFormState((current) => ({
                          ...current,
                          paidAmount: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="form-label">
                      {language === "es" ? "Cuenta operación" : "Operation account"}
                    </label>
                    <select
                      className="form-select"
                      value={paymentFormState.accountId}
                      onChange={(event) =>
                        setPaymentFormState((current) => ({
                          ...current,
                          accountId: event.target.value,
                        }))
                      }
                    >
                      <option value="">
                        {loanDetail.loan.account_id == null
                          ? language === "es"
                            ? "Selecciona una cuenta"
                            : "Select an account"
                          : language === "es"
                            ? "Usar cuenta del préstamo"
                            : "Use loan account"}
                      </option>
                      {accounts
                        .filter(
                          (account) =>
                            account.currency_id === loanDetail.loan.currency_id &&
                            (account.is_active || account.id === loanDetail.loan.account_id)
                        )
                        .map((account) => (
                          <option key={account.id} value={account.id}>
                            {buildAccountOptionLabel(account)}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
                <div className="tenant-inline-form-grid">
                  <div>
                    <label className="form-label">
                      {paymentFormState.mode === "apply"
                        ? language === "es"
                          ? "Modo amortización"
                          : "Amortization mode"
                        : language === "es"
                          ? "Motivo reversa"
                          : "Reversal reason"}
                    </label>
                    {paymentFormState.mode === "apply" ? (
                      <select
                        className="form-select"
                        value={paymentFormState.allocationMode}
                        onChange={(event) =>
                          setPaymentFormState((current) => ({
                            ...current,
                            allocationMode: event.target.value,
                          }))
                        }
                      >
                        <option value="interest_first">Interés primero</option>
                        <option value="principal_first">Capital primero</option>
                        <option value="proportional">Proporcional</option>
                      </select>
                    ) : (
                      <select
                        className="form-select"
                        value={paymentFormState.reversalReasonCode}
                        onChange={(event) =>
                          setPaymentFormState((current) => ({
                            ...current,
                            reversalReasonCode: event.target.value,
                          }))
                        }
                      >
                        {REVERSAL_REASON_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {displayReversalReason(option.value, language)}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
                <div className="tenant-inline-form-grid">
                  <div>
                    <label className="form-label">{language === "es" ? "Nota operativa" : "Operation note"}</label>
                    <input
                      className="form-control"
                      value={paymentFormState.note}
                      onChange={(event) =>
                        setPaymentFormState((current) => ({
                          ...current,
                          note: event.target.value,
                        }))
                      }
                      placeholder="Ej: abono recibido por transferencia"
                    />
                  </div>
                </div>
                <div className="finance-inline-toolbar finance-inline-toolbar--compact">
                  <button className="btn btn-primary" type="submit" disabled={isSubmitting}>
                    {paymentFormState.mode === "apply"
                      ? language === "es"
                        ? "Aplicar pago"
                        : "Apply payment"
                      : language === "es"
                        ? "Aplicar reversa"
                        : "Apply reversal"}
                  </button>
                  <button
                    className="btn btn-outline-secondary"
                    type="button"
                    disabled={isSubmitting}
                    onClick={() =>
                      setPaymentFormState({
                        mode: "apply",
                        installmentId: null,
                        paidAmount: "",
                        accountId:
                          loanDetail.loan.account_id == null
                            ? ""
                            : String(loanDetail.loan.account_id),
                        allocationMode: "interest_first",
                        reversalReasonCode: "operator_error",
                        note: "",
                      })
                    }
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            ) : null}

            {loanDetail.installments.length > 0 ? (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead>
                    <tr>
                      <th>
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={
                            loanDetail.installments.length > 0 &&
                            selectedInstallmentIds.length === loanDetail.installments.length
                          }
                          onChange={toggleAllInstallmentsSelection}
                        />
                      </th>
                      <th>#</th>
                      <th>{language === "es" ? "Vence" : "Due"}</th>
                      <th>{language === "es" ? "Planificada" : "Planned"}</th>
                      <th>{language === "es" ? "Capital" : "Principal"}</th>
                      <th>{language === "es" ? "Interés" : "Interest"}</th>
                      <th>{language === "es" ? "Pagado" : "Paid"}</th>
                      <th>{language === "es" ? "Capital pagado" : "Principal paid"}</th>
                      <th>{language === "es" ? "Interés pagado" : "Interest paid"}</th>
                      <th>{language === "es" ? "Motivo reversa" : "Reversal reason"}</th>
                      <th>{language === "es" ? "Estado" : "Status"}</th>
                      <th>{language === "es" ? "Acción" : "Action"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loanDetail.installments.map((installment) => (
                      <tr key={installment.id}>
                        <td>
                          <input
                            className="form-check-input"
                            type="checkbox"
                            checked={selectedInstallmentIds.includes(installment.id)}
                            onChange={() => toggleInstallmentSelection(installment.id)}
                          />
                        </td>
                        <td>{installment.installment_number}</td>
                        <td>{formatShortDate(installment.due_date, language)}</td>
                        <td>{formatMoney(installment.planned_amount, loanDetail.loan.currency_code, language)}</td>
                        <td>{formatMoney(installment.principal_amount, loanDetail.loan.currency_code, language)}</td>
                        <td>{formatMoney(installment.interest_amount, loanDetail.loan.currency_code, language)}</td>
                        <td>{formatMoney(installment.paid_amount, loanDetail.loan.currency_code, language)}</td>
                        <td>{formatMoney(installment.paid_principal_amount, loanDetail.loan.currency_code, language)}</td>
                        <td>{formatMoney(installment.paid_interest_amount, loanDetail.loan.currency_code, language)}</td>
                        <td>{displayReversalReason(installment.reversal_reason_code, language)}</td>
                        <td>
                          <span
                            className={`status-badge ${installmentStatusBadgeClass(
                              installment.installment_status
                            )}`}
                          >
                            {displayInstallmentStatus(installment.installment_status, language)}
                          </span>
                        </td>
                        <td>
                          <div className="finance-inline-toolbar finance-inline-toolbar--compact">
                            {installment.installment_status !== "paid" ? (
                              <button
                                className="btn btn-sm btn-outline-primary"
                                type="button"
                                onClick={() => startInstallmentPayment(installment)}
                              >
                                {paymentFormState.installmentId === installment.id &&
                                paymentFormState.mode === "apply"
                                  ? language === "es"
                                    ? "Editando pago"
                                    : "Editing payment"
                                  : language === "es"
                                    ? "Registrar pago"
                                    : "Record payment"}
                              </button>
                            ) : (
                              <span className="text-secondary">{language === "es" ? "cerrada" : "closed"}</span>
                            )}
                            {installment.paid_amount > 0 ? (
                              <button
                                className="btn btn-sm btn-outline-secondary"
                                type="button"
                                onClick={() => startInstallmentReversal(installment)}
                              >
                                {paymentFormState.installmentId === installment.id &&
                                paymentFormState.mode === "reverse"
                                  ? language === "es"
                                    ? "Editando reversa"
                                    : "Editing reversal"
                                  : language === "es"
                                    ? "Revertir"
                                    : "Reverse"}
                              </button>
                            ) : null}
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
                  ? "Este préstamo todavía no tiene cronograma porque no se definió cantidad de cuotas."
                  : "This loan does not have a schedule yet because the installment count was not defined."}
              </div>
            )}

            <div className="d-grid gap-2">
              <div className="tenant-detail__label">
                {language === "es"
                  ? "Lectura contable derivada"
                  : "Derived accounting reading"}
              </div>
              {loanDetail.accounting_transactions.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead>
                      <tr>
                        <th>{language === "es" ? "Fecha" : "Date"}</th>
                        <th>{language === "es" ? "Tipo" : "Type"}</th>
                        <th>{language === "es" ? "Cuenta" : "Account"}</th>
                        <th>{language === "es" ? "Monto" : "Amount"}</th>
                        <th>{language === "es" ? "Descripción" : "Description"}</th>
                        <th>{language === "es" ? "Conciliada" : "Reconciled"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loanDetail.accounting_transactions.map((transaction) => (
                        <tr key={transaction.id}>
                          <td>{formatDateTime(transaction.transaction_at, language)}</td>
                          <td>{displayTransactionType(transaction.transaction_type, language)}</td>
                          <td>{displayDerivedAccount(transaction, language)}</td>
                          <td>{formatMoney(transaction.amount, transaction.currency_code, language)}</td>
                          <td>{transaction.description}</td>
                          <td>{language === "es" ? (transaction.is_reconciled ? "sí" : "no") : transaction.is_reconciled ? "yes" : "no"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-secondary">
                  {language === "es"
                    ? "Todavía no hay transacciones derivadas registradas para este préstamo."
                    : "There are no derived transactions recorded for this loan yet."}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </PanelCard>
    </div>
  );
}

function buildTodayDateValue() {
  return new Date().toISOString().slice(0, 10);
}

function buildAccountOptionLabel(account: TenantFinanceAccount): string {
  return account.code ? `${account.name} (${account.code})` : account.name;
}

function formatMoney(value: number, currencyCode: string, language: "es" | "en"): string {
  return new Intl.NumberFormat(language === "es" ? "es-CL" : "en-US", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 2,
  }).format(value);
}

function displayLoanType(value: string, language: "es" | "en"): string {
  if (value === "borrowed") {
    return language === "es" ? "recibido" : "borrowed";
  }
  if (value === "lent") {
    return language === "es" ? "prestado" : "lent";
  }
  return value;
}

function displayLoanStatus(value: string, language: "es" | "en"): string {
  if (value === "open") {
    return language === "es" ? "abierto" : "open";
  }
  if (value === "settled") {
    return language === "es" ? "liquidado" : "settled";
  }
  if (value === "inactive") {
    return language === "es" ? "inactivo" : "inactive";
  }
  return value;
}

function displayInstallmentStatus(value: string, language: "es" | "en"): string {
  if (value === "paid") {
    return language === "es" ? "pagada" : "paid";
  }
  if (value === "partial") {
    return language === "es" ? "parcial" : "partial";
  }
  if (value === "overdue") {
    return language === "es" ? "vencida" : "overdue";
  }
  if (value === "pending") {
    return language === "es" ? "pendiente" : "pending";
  }
  return value;
}

function loanStatusBadgeClass(value: string): string {
  if (value === "open") {
    return "status-badge--warning";
  }
  if (value === "settled") {
    return "status-badge--success";
  }
  return "status-badge--neutral";
}

function installmentStatusBadgeClass(value: string): string {
  if (value === "paid") {
    return "status-badge--success";
  }
  if (value === "partial") {
    return "status-badge--warning";
  }
  if (value === "overdue") {
    return "status-badge--danger";
  }
  return "status-badge--neutral";
}

function formatShortDate(value: string, language: "es" | "en"): string {
  return new Date(`${value}T00:00:00`).toLocaleDateString(language === "es" ? "es-CL" : "en-US");
}

function formatDateTime(value: string, language: "es" | "en"): string {
  return new Date(value).toLocaleString(language === "es" ? "es-CL" : "en-US");
}

function displayLoanAccount(
  loan: Pick<TenantFinanceLoan, "account_name" | "account_code">,
  language: "es" | "en"
): string {
  if (!loan.account_name) {
    return language === "es" ? "sin definir" : "not defined";
  }
  return loan.account_code ? `${loan.account_name} (${loan.account_code})` : loan.account_name;
}

function displayDerivedAccount(
  transaction: TenantFinanceLoanDetailResponse["data"]["accounting_transactions"][number],
  language: "es" | "en"
): string {
  if (!transaction.account_name) {
    return language === "es" ? "sin cuenta" : "no account";
  }
  return transaction.account_code
    ? `${transaction.account_name} (${transaction.account_code})`
    : transaction.account_name;
}

function displayTransactionType(value: string, language: "es" | "en"): string {
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

const REVERSAL_REASON_OPTIONS = [
  { value: "operator_error", label: "Error operativo" },
  { value: "duplicate_payment", label: "Pago duplicado" },
  { value: "payment_bounce", label: "Pago rechazado" },
  { value: "customer_request", label: "Solicitud cliente" },
  { value: "migration_adjustment", label: "Ajuste migración" },
  { value: "other", label: "Otro" },
];

function displayReversalReason(value: string | null, language: "es" | "en"): string {
  if (!value) {
    return "n/a";
  }
  switch (value) {
    case "operator_error":
      return language === "es" ? "Error operativo" : "Operator error";
    case "duplicate_payment":
      return language === "es" ? "Pago duplicado" : "Duplicate payment";
    case "payment_bounce":
      return language === "es" ? "Pago rechazado" : "Returned payment";
    case "customer_request":
      return language === "es" ? "Solicitud cliente" : "Customer request";
    case "migration_adjustment":
      return language === "es" ? "Ajuste migración" : "Migration adjustment";
    case "other":
      return language === "es" ? "Otro" : "Other";
    default:
      return value;
  }
}

function DetailField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <div className="tenant-detail__label">{label}</div>
      <div className="tenant-detail__value">{value}</div>
    </div>
  );
}
