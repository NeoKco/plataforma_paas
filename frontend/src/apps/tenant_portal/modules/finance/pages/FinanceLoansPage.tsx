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
import { FinanceModuleNav } from "../components/common/FinanceModuleNav";
import { FinanceSchemaSyncCallout } from "../components/common/FinanceSchemaSyncCallout";
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
  allocationMode: string;
  reversalReasonCode: string;
  note: string;
};

type InstallmentBatchFormState = {
  mode: "apply" | "reverse";
  amountMode: string;
  amount: string;
  allocationMode: string;
  reversalReasonCode: string;
  note: string;
};

const DEFAULT_FORM_STATE: LoanFormState = {
  name: "",
  loanType: "borrowed",
  counterpartyName: "",
  currencyId: "",
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
  const [loansResponse, setLoansResponse] = useState<TenantFinanceLoansResponse | null>(null);
  const [currencies, setCurrencies] = useState<TenantFinanceCurrency[]>([]);
  const [editingLoanId, setEditingLoanId] = useState<number | null>(null);
  const [selectedLoanId, setSelectedLoanId] = useState<number | null>(null);
  const [loanDetail, setLoanDetail] = useState<TenantFinanceLoanDetailResponse["data"] | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [loanDetailError, setLoanDetailError] = useState<string | null>(null);
  const [paymentFormState, setPaymentFormState] = useState<InstallmentPaymentFormState>({
    mode: "apply",
    installmentId: null,
    paidAmount: "",
    allocationMode: "interest_first",
    reversalReasonCode: "operator_error",
    note: "",
  });
  const [selectedInstallmentIds, setSelectedInstallmentIds] = useState<number[]>([]);
  const [batchFormState, setBatchFormState] = useState<InstallmentBatchFormState>({
    mode: "apply",
    amountMode: "full_remaining",
    amount: "",
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
    void loadLoanDetail();
  }, [session?.accessToken, selectedLoanId]);

  useEffect(() => {
    setPaymentFormState({
      mode: "apply",
      installmentId: null,
      paidAmount: "",
      allocationMode: "interest_first",
      reversalReasonCode: "operator_error",
      note: "",
    });
    setSelectedInstallmentIds([]);
    setBatchFormState({
      mode: "apply",
      amountMode: "full_remaining",
      amount: "",
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
    ]);

    const [loansResult, currenciesResult] = results;

    if (loansResult.status === "rejected" && currenciesResult.status === "rejected") {
      setLoansResponse(null);
      setCurrencies([]);
      setError(loansResult.reason as ApiError);
      setIsLoading(false);
      return;
    }

    setLoansResponse(loansResult.status === "fulfilled" ? loansResult.value : null);
    setCurrencies(currenciesResult.status === "fulfilled" ? currenciesResult.value.data : []);
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
        title="Préstamos"
        description="Gestiona dinero prestado o recibido, con saldo pendiente, contraparte y lectura rápida de cartera."
      />

      <FinanceModuleNav />

      {actionFeedback ? (
        <div className={`tenant-action-feedback tenant-action-feedback--${actionFeedback.type}`}>
          <strong>Préstamos:</strong> {actionFeedback.message}
        </div>
      ) : null}

      {isLoading ? <LoadingBlock label="Cargando préstamos..." /> : null}

      <div className="tenant-portal-metrics">
        <MetricCard label="Capital total" value={formatMoney(summary?.total_principal || 0, baseCurrencyCode)} hint="Monto inicial visible" />
        <MetricCard label="Saldo prestado" value={formatMoney(summary?.lent_balance || 0, baseCurrencyCode)} hint="Por cobrar a terceros" />
        <MetricCard label="Saldo recibido" value={formatMoney(summary?.borrowed_balance || 0, baseCurrencyCode)} hint="Por pagar a terceros" />
        <MetricCard label="Activos" value={summary?.active_items || 0} hint="Préstamos abiertos" />
      </div>

      {error ? (
        <div className="d-grid gap-3">
          <ErrorState
            title="Préstamos no disponibles"
            detail={error.payload?.detail || error.message}
            requestId={error.payload?.request_id}
          />
          <FinanceSchemaSyncCallout error={error} onSynced={loadLoanWorkspace} />
        </div>
      ) : null}

      <div className="tenant-portal-split tenant-portal-split--finance">
        <PanelCard
          title={editingLoanId ? "Editar préstamo" : "Registrar préstamo"}
          subtitle="Primer corte: cartera básica con saldo pendiente y contraparte, sin abrir todavía amortización avanzada."
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
                <label className="form-label">Tipo</label>
                <select
                  className="form-select"
                  value={formState.loanType}
                  onChange={(event) => setFormState((current) => ({ ...current, loanType: event.target.value }))}
                >
                  <option value="borrowed">Recibido</option>
                  <option value="lent">Prestado</option>
                </select>
              </div>
            </div>

            <div className="tenant-inline-form-grid">
              <div>
                <label className="form-label">Contraparte</label>
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
                <label className="form-label">Moneda</label>
                <select
                  className="form-select"
                  value={formState.currencyId}
                  onChange={(event) => setFormState((current) => ({ ...current, currencyId: event.target.value }))}
                >
                  <option value="">Selecciona una moneda</option>
                  {activeCurrencies.map((currency) => (
                    <option key={currency.id} value={currency.id}>
                      {currency.code} · {currency.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="tenant-inline-form-grid">
              <div>
                <label className="form-label">Capital inicial</label>
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
                <label className="form-label">Saldo pendiente</label>
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
                <label className="form-label">Tasa interés %</label>
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
                <label className="form-label">Cuotas</label>
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
                <label className="form-label">Frecuencia</label>
                <select
                  className="form-select"
                  value={formState.paymentFrequency}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, paymentFrequency: event.target.value }))
                  }
                >
                  <option value="monthly">Mensual</option>
                </select>
              </div>
              <div>
                <label className="form-label">Activo</label>
                <select
                  className="form-select"
                  value={formState.isActive ? "true" : "false"}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, isActive: event.target.value === "true" }))
                  }
                >
                  <option value="true">Sí</option>
                  <option value="false">No</option>
                </select>
              </div>
            </div>

            <div className="tenant-inline-form-grid">
              <div>
                <label className="form-label">Inicio</label>
                <input
                  className="form-control"
                  type="date"
                  value={formState.startDate}
                  onChange={(event) => setFormState((current) => ({ ...current, startDate: event.target.value }))}
                />
              </div>
              <div>
                <label className="form-label">Vencimiento</label>
                <input
                  className="form-control"
                  type="date"
                  value={formState.dueDate}
                  onChange={(event) => setFormState((current) => ({ ...current, dueDate: event.target.value }))}
                />
              </div>
            </div>

            <div>
              <label className="form-label">Nota</label>
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
                {editingLoanId ? "Guardar cambios" : "Registrar préstamo"}
              </button>
              {editingLoanId ? (
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
          title="Lectura de cartera"
          subtitle="Filtra por tipo o estado para separar deuda recibida, deuda prestada y cartera ya liquidada."
        >
          <div className="d-grid gap-3">
            <div className="tenant-inline-form-grid">
              <div>
                <label className="form-label">Tipo</label>
                <select
                  className="form-select"
                  value={filterLoanType}
                  onChange={(event) => setFilterLoanType(event.target.value)}
                >
                  <option value="">Todos</option>
                  <option value="borrowed">Recibidos</option>
                  <option value="lent">Prestados</option>
                </select>
              </div>
              <div>
                <label className="form-label">Estado</label>
                <select
                  className="form-select"
                  value={filterLoanStatus}
                  onChange={(event) => setFilterLoanStatus(event.target.value)}
                >
                  <option value="">Todos</option>
                  <option value="open">Abiertos</option>
                  <option value="settled">Liquidados</option>
                  <option value="inactive">Inactivos</option>
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
                Incluir inactivos
              </label>
            </div>
            <div className="tenant-detail-grid">
              <DetailField label="Capital visible" value={formatMoney(summary?.total_principal || 0, baseCurrencyCode)} />
              <DetailField label="Prestado" value={formatMoney(summary?.lent_balance || 0, baseCurrencyCode)} />
              <DetailField label="Recibido" value={formatMoney(summary?.borrowed_balance || 0, baseCurrencyCode)} />
              <DetailField label="Ítems" value={summary?.total_items || 0} />
            </div>
          </div>
        </PanelCard>
      </div>

      <PanelCard
        title="Cartera de préstamos"
        subtitle="Lectura básica de capital, saldo y estado para abrir después conciliación de cuotas y cronograma."
      >
        {loansResponse && loansResponse.data.length > 0 ? (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Tipo</th>
                  <th>Contraparte</th>
                  <th>Capital</th>
                  <th>Saldo</th>
                  <th>Pagado</th>
                  <th>Cuotas</th>
                  <th>Próxima</th>
                  <th>Moneda</th>
                  <th>Estado</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {loansResponse.data.map((loan) => (
                  <tr key={loan.id}>
                    <td>{loan.name}</td>
                    <td>{displayLoanType(loan.loan_type)}</td>
                    <td>{loan.counterparty_name}</td>
                    <td>{formatMoney(loan.principal_amount, loan.currency_code)}</td>
                    <td>{formatMoney(loan.current_balance, loan.currency_code)}</td>
                    <td>{formatMoney(loan.paid_amount, loan.currency_code)}</td>
                    <td>{loan.installments_total > 0 ? `${loan.installments_paid}/${loan.installments_total}` : "sin plan"}</td>
                    <td>{loan.next_due_date ? formatShortDate(loan.next_due_date) : "n/a"}</td>
                    <td>{loan.currency_code}</td>
                    <td>
                      <span className={`status-badge ${loanStatusBadgeClass(loan.loan_status)}`}>
                        {displayLoanStatus(loan.loan_status)}
                      </span>
                    </td>
                    <td>
                      <div className="finance-inline-toolbar finance-inline-toolbar--compact">
                        <button
                          className="btn btn-sm btn-outline-primary"
                          type="button"
                          onClick={() => startEditingLoan(loan)}
                        >
                          Editar
                        </button>
                        <button
                          className="btn btn-sm btn-outline-secondary"
                          type="button"
                          onClick={() =>
                            setSelectedLoanId((current) => (current === loan.id ? null : loan.id))
                          }
                        >
                          {selectedLoanId === loan.id ? "Ocultar" : "Cronograma"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-secondary">No hay préstamos para el filtro seleccionado.</div>
        )}
      </PanelCard>

      <PanelCard
        title="Cronograma del préstamo"
        subtitle="Detalle por cuota para lectura operacional rápida y aplicación manual de pagos simples sobre el cronograma."
      >
        {selectedLoanId == null ? (
          <div className="text-secondary">
            Selecciona un préstamo en la cartera para revisar su cronograma.
          </div>
        ) : isDetailLoading ? (
          <LoadingBlock label="Cargando cronograma..." />
        ) : loanDetailError ? (
          <div className="text-danger">{loanDetailError}</div>
        ) : loanDetail ? (
          <div className="d-grid gap-3">
            <div className="tenant-detail-grid">
              <DetailField label="Préstamo" value={loanDetail.loan.name} />
              <DetailField label="Contraparte" value={loanDetail.loan.counterparty_name} />
              <DetailField
                label="Plan de cuotas"
                value={
                  loanDetail.loan.installments_total > 0
                    ? `${loanDetail.loan.installments_paid}/${loanDetail.loan.installments_total}`
                    : "sin cronograma"
                }
              />
              <DetailField
                label="Próximo vencimiento"
                value={loanDetail.loan.next_due_date ? formatShortDate(loanDetail.loan.next_due_date) : "n/a"}
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
                    label="Monto lote"
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
                      <option value="apply">Aplicar pago</option>
                      <option value="reverse">Aplicar reversa</option>
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
                      {batchFormState.mode === "apply" ? "Modo amortización" : "Motivo reversa"}
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
                            {option.label}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                <div>
                  <label className="form-label">Nota operativa lote</label>
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
                    {batchFormState.mode === "apply" ? "Aplicar pago en lote" : "Aplicar reversa en lote"}
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
                        allocationMode: "interest_first",
                        reversalReasonCode: "operator_error",
                        note: "",
                      });
                    }}
                  >
                    Limpiar lote
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
                      {paymentFormState.mode === "apply" ? "Modo amortización" : "Motivo reversa"}
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
                            {option.label}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
                <div className="tenant-inline-form-grid">
                  <div>
                    <label className="form-label">Nota operativa</label>
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
                    {paymentFormState.mode === "apply" ? "Aplicar pago" : "Aplicar reversa"}
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
                      <th>Vence</th>
                      <th>Planificada</th>
                      <th>Capital</th>
                      <th>Interés</th>
                      <th>Pagado</th>
                      <th>Capital pagado</th>
                      <th>Interés pagado</th>
                      <th>Motivo reversa</th>
                      <th>Estado</th>
                      <th>Acción</th>
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
                        <td>{formatShortDate(installment.due_date)}</td>
                        <td>{formatMoney(installment.planned_amount, loanDetail.loan.currency_code)}</td>
                        <td>{formatMoney(installment.principal_amount, loanDetail.loan.currency_code)}</td>
                        <td>{formatMoney(installment.interest_amount, loanDetail.loan.currency_code)}</td>
                        <td>{formatMoney(installment.paid_amount, loanDetail.loan.currency_code)}</td>
                        <td>{formatMoney(installment.paid_principal_amount, loanDetail.loan.currency_code)}</td>
                        <td>{formatMoney(installment.paid_interest_amount, loanDetail.loan.currency_code)}</td>
                        <td>{displayReversalReason(installment.reversal_reason_code)}</td>
                        <td>
                          <span
                            className={`status-badge ${installmentStatusBadgeClass(
                              installment.installment_status
                            )}`}
                          >
                            {displayInstallmentStatus(installment.installment_status)}
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
                                  ? "Editando pago"
                                  : "Registrar pago"}
                              </button>
                            ) : (
                              <span className="text-secondary">cerrada</span>
                            )}
                            {installment.paid_amount > 0 ? (
                              <button
                                className="btn btn-sm btn-outline-secondary"
                                type="button"
                                onClick={() => startInstallmentReversal(installment)}
                              >
                                {paymentFormState.installmentId === installment.id &&
                                paymentFormState.mode === "reverse"
                                  ? "Editando reversa"
                                  : "Revertir"}
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
                Este préstamo todavía no tiene cronograma porque no se definió cantidad de cuotas.
              </div>
            )}
          </div>
        ) : null}
      </PanelCard>
    </div>
  );
}

function buildTodayDateValue() {
  return new Date().toISOString().slice(0, 10);
}

function formatMoney(value: number, currencyCode: string): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 2,
  }).format(value);
}

function displayLoanType(value: string): string {
  if (value === "borrowed") {
    return "recibido";
  }
  if (value === "lent") {
    return "prestado";
  }
  return value;
}

function displayLoanStatus(value: string): string {
  if (value === "open") {
    return "abierto";
  }
  if (value === "settled") {
    return "liquidado";
  }
  if (value === "inactive") {
    return "inactivo";
  }
  return value;
}

function displayInstallmentStatus(value: string): string {
  if (value === "paid") {
    return "pagada";
  }
  if (value === "partial") {
    return "parcial";
  }
  if (value === "overdue") {
    return "vencida";
  }
  if (value === "pending") {
    return "pendiente";
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

function formatShortDate(value: string): string {
  return new Date(`${value}T00:00:00`).toLocaleDateString();
}

const REVERSAL_REASON_OPTIONS = [
  { value: "operator_error", label: "Error operativo" },
  { value: "duplicate_payment", label: "Pago duplicado" },
  { value: "payment_bounce", label: "Pago rechazado" },
  { value: "customer_request", label: "Solicitud cliente" },
  { value: "migration_adjustment", label: "Ajuste migración" },
  { value: "other", label: "Otro" },
];

function displayReversalReason(value: string | null): string {
  if (!value) {
    return "n/a";
  }
  return REVERSAL_REASON_OPTIONS.find((option) => option.value === value)?.label || value;
}

function DetailField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <div className="tenant-detail__label">{label}</div>
      <div className="tenant-detail__value">{value}</div>
    </div>
  );
}
