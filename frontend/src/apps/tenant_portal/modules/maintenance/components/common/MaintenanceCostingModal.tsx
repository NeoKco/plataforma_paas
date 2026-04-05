import { useEffect, useMemo, useState } from "react";
import { PanelCard } from "../../../../../../components/common/PanelCard";
import { ErrorState } from "../../../../../../components/feedback/ErrorState";
import { LoadingBlock } from "../../../../../../components/feedback/LoadingBlock";
import { getApiErrorDisplayMessage } from "../../../../../../services/api";
import {
  formatDateTimeInTimeZone,
  fromDateTimeLocalInputValue,
  toDateTimeLocalInputValue,
} from "../../../../../../utils/dateTimeLocal";
import type { ApiError } from "../../../../../../types";
import {
  getTenantFinanceAccounts,
  type TenantFinanceAccount,
} from "../../../finance/services/accountsService";
import {
  getTenantFinanceCategories,
  type TenantFinanceCategory,
} from "../../../finance/services/categoriesService";
import {
  getTenantFinanceCurrencies,
  type TenantFinanceCurrency,
} from "../../../finance/services/currenciesService";
import {
  getTenantMaintenanceWorkOrderCosting,
  syncTenantMaintenanceWorkOrderToFinance,
  updateTenantMaintenanceWorkOrderCostActual,
  updateTenantMaintenanceWorkOrderCostEstimate,
  type TenantMaintenanceCostActual,
  type TenantMaintenanceCostEstimate,
  type TenantMaintenanceCostLine,
  type TenantMaintenanceCostLineWriteItem,
  type TenantMaintenanceCostingDetail,
} from "../../services/costingService";
import {
  getTenantMaintenanceCostTemplates,
  type TenantMaintenanceCostTemplate,
} from "../../services/costTemplatesService";
import { updateTenantMaintenanceWorkOrderStatus } from "../../services/workOrdersService";

type MaintenanceCostEstimateFormState = {
  labor_cost: string;
  travel_cost: string;
  materials_cost: string;
  external_services_cost: string;
  overhead_cost: string;
  target_margin_percent: string;
  notes: string;
};

type MaintenanceCostActualFormState = {
  labor_cost: string;
  travel_cost: string;
  materials_cost: string;
  external_services_cost: string;
  overhead_cost: string;
  actual_price_charged: string;
  notes: string;
};

type MaintenanceFinanceSyncFormState = {
  sync_income: boolean;
  sync_expense: boolean;
  income_account_id: string;
  expense_account_id: string;
  income_category_id: string;
  expense_category_id: string;
  currency_id: string;
  transaction_at: string;
  notes: string;
};

type MaintenanceCostLineFormState = {
  id: number | null;
  line_type: string;
  description: string;
  quantity: string;
  unit_cost: string;
  notes: string;
};

type MaintenanceEditableCostLineKey =
  | "line_type"
  | "description"
  | "quantity"
  | "unit_cost"
  | "notes";

export type MaintenanceCostingModalWorkOrder = {
  id: number;
  title: string;
  client_id: number;
  site_id: number;
  installation_id: number | null;
  maintenance_status: string;
  requested_at: string;
  scheduled_for: string | null;
  completed_at: string | null;
  closure_notes?: string | null;
};

type MaintenanceCostingModalProps = {
  accessToken?: string | null;
  allowComplete?: boolean;
  clientLabel: string;
  siteLabel: string;
  installationLabel: string;
  effectiveTimeZone?: string | null;
  isOpen: boolean;
  language: "es" | "en";
  mode?: "edit" | "readonly";
  onClose: () => void;
  onCompleted?: (workOrderId: number) => void | Promise<void>;
  onFeedback?: (message: string) => void;
  taskTypeId?: number | null;
  taskTypeLabel?: string | null;
  workOrder: MaintenanceCostingModalWorkOrder | null;
};

function normalizeNullable(value: string | null): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : null;
}

function normalizeNumericInput(value: string): number {
  const normalized = Number(value || 0);
  return Number.isFinite(normalized) ? normalized : 0;
}

function buildDefaultCostEstimateForm(
  estimate?: TenantMaintenanceCostEstimate | null
): MaintenanceCostEstimateFormState {
  return {
    labor_cost: String(estimate?.labor_cost ?? 0),
    travel_cost: String(estimate?.travel_cost ?? 0),
    materials_cost: String(estimate?.materials_cost ?? 0),
    external_services_cost: String(estimate?.external_services_cost ?? 0),
    overhead_cost: String(estimate?.overhead_cost ?? 0),
    target_margin_percent: String(estimate?.target_margin_percent ?? 0),
    notes: estimate?.notes ?? "",
  };
}

function hasMeaningfulActualData(
  actual: TenantMaintenanceCostActual | null,
  actualLines: TenantMaintenanceCostLine[]
) {
  if ((actualLines ?? []).length > 0) {
    return true;
  }
  if (!actual) {
    return false;
  }
  return (
    actual.labor_cost > 0 ||
    actual.travel_cost > 0 ||
    actual.materials_cost > 0 ||
    actual.external_services_cost > 0 ||
    actual.overhead_cost > 0 ||
    actual.actual_price_charged > 0 ||
    Boolean(actual.notes?.trim())
  );
}

function hasMeaningfulEstimateData(
  estimate: TenantMaintenanceCostEstimate | null,
  estimateLines: TenantMaintenanceCostLine[]
) {
  if ((estimateLines ?? []).length > 0) {
    return true;
  }
  if (!estimate) {
    return false;
  }
  return (
    estimate.labor_cost > 0 ||
    estimate.travel_cost > 0 ||
    estimate.materials_cost > 0 ||
    estimate.external_services_cost > 0 ||
    estimate.overhead_cost > 0 ||
    estimate.target_margin_percent > 0 ||
    Boolean(estimate.notes?.trim())
  );
}

function buildDefaultCostActualForm(
  actual?: TenantMaintenanceCostActual | null
): MaintenanceCostActualFormState {
  return {
    labor_cost: String(actual?.labor_cost ?? 0),
    travel_cost: String(actual?.travel_cost ?? 0),
    materials_cost: String(actual?.materials_cost ?? 0),
    external_services_cost: String(actual?.external_services_cost ?? 0),
    overhead_cost: String(actual?.overhead_cost ?? 0),
    actual_price_charged: String(actual?.actual_price_charged ?? 0),
    notes: actual?.notes ?? "",
  };
}

function buildDefaultCostLines(
  lines?: TenantMaintenanceCostLine[] | null
): MaintenanceCostLineFormState[] {
  return (lines ?? []).map((line) => ({
    id: line.id,
    line_type: line.line_type,
    description: line.description ?? "",
    quantity: String(line.quantity ?? 1),
    unit_cost: String(line.unit_cost ?? 0),
    notes: line.notes ?? "",
  }));
}

function buildBlankCostLine(): MaintenanceCostLineFormState {
  return {
    id: null,
    line_type: "labor",
    description: "",
    quantity: "1",
    unit_cost: "0",
    notes: "",
  };
}

function sortCostTemplates(items: TenantMaintenanceCostTemplate[]): TenantMaintenanceCostTemplate[] {
  return [...items].sort((left, right) => {
    if (left.is_active !== right.is_active) {
      return left.is_active ? -1 : 1;
    }
    const nameCompare = left.name.localeCompare(right.name);
    if (nameCompare !== 0) {
      return nameCompare;
    }
    return left.id - right.id;
  });
}

function sumCostForm(values: {
  labor_cost: string;
  travel_cost: string;
  materials_cost: string;
  external_services_cost: string;
  overhead_cost: string;
}): number {
  return (
    normalizeNumericInput(values.labor_cost) +
    normalizeNumericInput(values.travel_cost) +
    normalizeNumericInput(values.materials_cost) +
    normalizeNumericInput(values.external_services_cost) +
    normalizeNumericInput(values.overhead_cost)
  );
}

function sumCostLines(lines: MaintenanceCostLineFormState[]) {
  return lines.reduce(
    (current, line) => {
      const totalCost = normalizeNumericInput(line.quantity) * normalizeNumericInput(line.unit_cost);
      switch (line.line_type) {
        case "labor":
          current.labor_cost += totalCost;
          break;
        case "travel":
          current.travel_cost += totalCost;
          break;
        case "material":
          current.materials_cost += totalCost;
          break;
        case "service":
          current.external_services_cost += totalCost;
          break;
        case "overhead":
          current.overhead_cost += totalCost;
          break;
        default:
          break;
      }
      current.total += totalCost;
      return current;
    },
    {
      labor_cost: 0,
      travel_cost: 0,
      materials_cost: 0,
      external_services_cost: 0,
      overhead_cost: 0,
      total: 0,
    }
  );
}

function normalizeLineWritePayload(
  lines: MaintenanceCostLineFormState[]
): TenantMaintenanceCostLineWriteItem[] {
  return lines.map((line) => ({
    id: line.id,
    line_type: line.line_type,
    description: normalizeNullable(line.description),
    quantity: normalizeNumericInput(line.quantity),
    unit_cost: normalizeNumericInput(line.unit_cost),
    notes: normalizeNullable(line.notes),
  }));
}

function buildCostLineFormsFromTemplate(template: TenantMaintenanceCostTemplate) {
  return template.lines.map((line) => ({
    id: null,
    line_type: line.line_type,
    description: line.description ?? "",
    quantity: String(line.quantity ?? 1),
    unit_cost: String(line.unit_cost ?? 0),
    notes: line.notes ?? "",
  }));
}


export function MaintenanceCostingModal({
  accessToken,
  allowComplete = false,
  clientLabel,
  siteLabel,
  installationLabel,
  effectiveTimeZone,
  isOpen,
  language,
  mode = "edit",
  onClose,
  onCompleted,
  onFeedback,
  taskTypeId = null,
  taskTypeLabel = null,
  workOrder,
}: MaintenanceCostingModalProps) {
  const isReadOnly = mode === "readonly";
  const [isLoading, setIsLoading] = useState(false);
  const [isEstimateSubmitting, setIsEstimateSubmitting] = useState(false);
  const [isActualSubmitting, setIsActualSubmitting] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isFinanceSyncSubmitting, setIsFinanceSyncSubmitting] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [costingDetail, setCostingDetail] = useState<TenantMaintenanceCostingDetail | null>(null);
  const [financeAccounts, setFinanceAccounts] = useState<TenantFinanceAccount[]>([]);
  const [financeCategories, setFinanceCategories] = useState<TenantFinanceCategory[]>([]);
  const [financeCurrencies, setFinanceCurrencies] = useState<TenantFinanceCurrency[]>([]);
  const [costTemplateFeedback, setCostTemplateFeedback] = useState<string | null>(null);
  const [estimateForm, setEstimateForm] = useState<MaintenanceCostEstimateFormState>(
    buildDefaultCostEstimateForm()
  );
  const [estimateLines, setEstimateLines] = useState<MaintenanceCostLineFormState[]>([]);
  const [actualForm, setActualForm] = useState<MaintenanceCostActualFormState>(
    buildDefaultCostActualForm()
  );
  const [actualLines, setActualLines] = useState<MaintenanceCostLineFormState[]>([]);
  const [completionNote, setCompletionNote] = useState("");
  const [financeSyncForm, setFinanceSyncForm] = useState<MaintenanceFinanceSyncFormState>({
    sync_income: true,
    sync_expense: true,
    income_account_id: "",
    expense_account_id: "",
    income_category_id: "",
    expense_category_id: "",
    currency_id: "",
    transaction_at: "",
    notes: "",
  });

  const activeFinanceAccounts = useMemo(
    () => financeAccounts.filter((account) => account.is_active),
    [financeAccounts]
  );
  const incomeCategories = useMemo(
    () =>
      financeCategories.filter(
        (category) => category.is_active && category.category_type === "income"
      ),
    [financeCategories]
  );
  const expenseCategories = useMemo(
    () =>
      financeCategories.filter(
        (category) => category.is_active && category.category_type === "expense"
      ),
    [financeCategories]
  );
  const activeCurrencies = useMemo(
    () => financeCurrencies.filter((currency) => currency.is_active),
    [financeCurrencies]
  );
  const estimateLineTotals = useMemo(() => sumCostLines(estimateLines), [estimateLines]);
  const actualLineTotals = useMemo(() => sumCostLines(actualLines), [actualLines]);
  const estimateUsesLines = estimateLines.length > 0;
  const actualUsesLines = actualLines.length > 0;
  const estimatedTotalPreview = useMemo(
    () => (estimateUsesLines ? estimateLineTotals.total : sumCostForm(estimateForm)),
    [estimateForm, estimateLineTotals.total, estimateUsesLines]
  );
  const estimatedSuggestedPricePreview = useMemo(() => {
    const margin = normalizeNumericInput(estimateForm.target_margin_percent);
    if (estimatedTotalPreview <= 0) {
      return 0;
    }
    if (margin <= 0) {
      return estimatedTotalPreview;
    }
    if (margin >= 100) {
      return estimatedTotalPreview;
    }
    return Number((estimatedTotalPreview / (1 - margin / 100)).toFixed(2));
  }, [estimateForm.target_margin_percent, estimatedTotalPreview]);
  const actualTotalPreview = useMemo(
    () => (actualUsesLines ? actualLineTotals.total : sumCostForm(actualForm)),
    [actualForm, actualLineTotals.total, actualUsesLines]
  );
  const actualProfitPreview = useMemo(
    () => normalizeNumericInput(actualForm.actual_price_charged) - actualTotalPreview,
    [actualForm.actual_price_charged, actualTotalPreview]
  );
  const actualMarginPreview = useMemo(() => {
    const income = normalizeNumericInput(actualForm.actual_price_charged);
    if (income <= 0) {
      return null;
    }
    return Number(((actualProfitPreview / income) * 100).toFixed(2));
  }, [actualForm.actual_price_charged, actualProfitPreview]);
  const financeSyncBlocked =
    !costingDetail?.actual ||
    !financeSyncForm.currency_id ||
    (financeSyncForm.sync_income && !financeSyncForm.income_account_id) ||
    (financeSyncForm.sync_expense && !financeSyncForm.expense_account_id);
  const canCompleteFromModal =
    !isReadOnly &&
    allowComplete &&
    workOrder?.maintenance_status !== "completed" &&
    workOrder?.maintenance_status !== "cancelled";

  useEffect(() => {
    if (!isOpen || !accessToken || !workOrder) {
      return;
    }

    const currentAccessToken = accessToken;
    const currentWorkOrder = workOrder;
    let cancelled = false;

    async function loadCosting() {
      setIsLoading(true);
      setError(null);
      try {
        const [
          costingResponse,
          accountsResponse,
          categoriesResponse,
          currenciesResponse,
          costTemplatesResponse,
        ] =
          await Promise.all([
            getTenantMaintenanceWorkOrderCosting(currentAccessToken, currentWorkOrder.id),
            getTenantFinanceAccounts(currentAccessToken, false),
            getTenantFinanceCategories(currentAccessToken, { includeInactive: false }),
            getTenantFinanceCurrencies(currentAccessToken, false),
            getTenantMaintenanceCostTemplates(currentAccessToken, { includeInactive: false }),
          ]);

        if (cancelled) {
          return;
        }

        const detail = costingResponse.data;
        const accounts = accountsResponse.data;
        const categories = categoriesResponse.data;
        const currencies = currenciesResponse.data;
        const templates = sortCostTemplates(costTemplatesResponse.data);
        const generalTemplates = templates.filter(
          (template) => template.is_active && template.task_type_id == null
        );
        const specificTemplates = taskTypeId
          ? templates.filter((template) => template.is_active && template.task_type_id === taskTypeId)
          : [];
        const matchingTemplates = specificTemplates.length > 0 ? specificTemplates : generalTemplates;
        const autoTemplate = matchingTemplates.length === 1 ? matchingTemplates[0] : null;
        const incomeCategory = categories.find((category) => category.category_type === "income");
        const expenseCategory = categories.find((category) => category.category_type === "expense");
        const defaultCurrency = currencies.find((currency) => currency.is_base) || currencies[0];
        const transactionAtSource =
          detail.actual?.finance_synced_at ??
          currentWorkOrder.completed_at ??
          currentWorkOrder.scheduled_for ??
          currentWorkOrder.requested_at;

        setFinanceAccounts(accounts);
        setFinanceCategories(categories);
        setFinanceCurrencies(currencies);
        setCostingDetail(detail);
        const hasEstimateData = hasMeaningfulEstimateData(detail.estimate, detail.estimate_lines);
        const hasActualData = hasMeaningfulActualData(detail.actual, detail.actual_lines);

        if (autoTemplate && !hasEstimateData) {
          setEstimateLines(buildCostLineFormsFromTemplate(autoTemplate));
          setEstimateForm(() => ({
            ...buildDefaultCostEstimateForm(detail.estimate),
            target_margin_percent: String(autoTemplate.estimate_target_margin_percent ?? 0),
            notes: autoTemplate.estimate_notes ?? detail.estimate?.notes ?? "",
          }));
        } else {
          setEstimateForm(buildDefaultCostEstimateForm(detail.estimate));
          setEstimateLines(buildDefaultCostLines(detail.estimate_lines));
        }

        if (autoTemplate && !hasActualData) {
          const templateCost = autoTemplate.lines.reduce(
            (current, line) => current + (line.total_cost ?? 0),
            0
          );
          const margin = Number(autoTemplate.estimate_target_margin_percent ?? 0);
          const suggestedCharged =
            templateCost > 0
              ? margin > 0 && margin < 100
                ? Number((templateCost / (1 - margin / 100)).toFixed(2))
                : Number(templateCost.toFixed(2))
              : 0;
          setActualLines(buildCostLineFormsFromTemplate(autoTemplate));
          setActualForm({
            ...buildDefaultCostActualForm(detail.actual),
            actual_price_charged: String(suggestedCharged),
            notes: autoTemplate.estimate_notes ?? detail.actual?.notes ?? "",
          });
        } else {
          setActualForm(buildDefaultCostActualForm(detail.actual));
          setActualLines(buildDefaultCostLines(detail.actual_lines));
        }

        setCostTemplateFeedback(
          matchingTemplates.length > 1
            ? language === "es"
              ? `Hay más de un costo base activo para ${taskTypeLabel || "este tipo de tarea"}. Define uno solo en Costos de mantenciones para precargar el costeo.`
              : `There is more than one active base cost for ${taskTypeLabel || "this task type"}. Keep only one in Maintenance costs to preload costing.`
            : autoTemplate && (!hasEstimateData || !hasActualData)
              ? language === "es"
                ? `Se cargó automáticamente el costo base ${autoTemplate.name} desde Costos de mantenciones.`
                : `Base cost ${autoTemplate.name} was loaded automatically from Maintenance costs.`
              : !autoTemplate
                ? language === "es"
                  ? "No hay un costo base único para esta mantención. Si lo necesitas, defínelo en el slice Costos de mantenciones."
                  : "There is no unique base cost for this maintenance. If needed, define it in the Maintenance costs slice."
                : null
        );
        setCompletionNote(currentWorkOrder.closure_notes ?? "");
        setFinanceSyncForm({
          sync_income: true,
          sync_expense: true,
          income_account_id: "",
          expense_account_id: "",
          income_category_id: String(incomeCategory?.id ?? ""),
          expense_category_id: String(expenseCategory?.id ?? ""),
          currency_id: String(defaultCurrency?.id ?? ""),
          transaction_at: toDateTimeLocalInputValue(transactionAtSource, effectiveTimeZone),
          notes: detail.actual?.notes ?? detail.estimate?.notes ?? "",
        });
      } catch (rawError) {
        if (!cancelled) {
          setError(rawError as ApiError);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadCosting();

    return () => {
      cancelled = true;
    };
  }, [accessToken, effectiveTimeZone, isOpen, workOrder]);

  if (!isOpen || !workOrder) {
    return null;
  }
  const currentWorkOrder = workOrder;

  function addEstimateLine() {
    if (isReadOnly) {
      return;
    }
    setEstimateLines((current) => [...current, buildBlankCostLine()]);
  }

  function addActualLine() {
    if (isReadOnly) {
      return;
    }
    setActualLines((current) => [...current, buildBlankCostLine()]);
  }

  function updateEstimateLine(index: number, key: MaintenanceEditableCostLineKey, value: string) {
    if (isReadOnly) {
      return;
    }
    setEstimateLines((current) =>
      current.map((line, currentIndex) =>
        currentIndex === index ? { ...line, [key]: value } : line
      )
    );
  }

  function updateActualLine(index: number, key: MaintenanceEditableCostLineKey, value: string) {
    if (isReadOnly) {
      return;
    }
    setActualLines((current) =>
      current.map((line, currentIndex) =>
        currentIndex === index ? { ...line, [key]: value } : line
      )
    );
  }

  function removeEstimateLine(index: number) {
    if (isReadOnly) {
      return;
    }
    setEstimateLines((current) => current.filter((_, currentIndex) => currentIndex !== index));
  }

  function removeActualLine(index: number) {
    if (isReadOnly) {
      return;
    }
    setActualLines((current) => current.filter((_, currentIndex) => currentIndex !== index));
  }

  const costLineTypeOptions = [
    { value: "labor", label: language === "es" ? "Mano de obra" : "Labor" },
    { value: "travel", label: language === "es" ? "Traslado" : "Travel" },
    { value: "material", label: language === "es" ? "Material" : "Material" },
    { value: "service", label: language === "es" ? "Servicio externo" : "External service" },
    { value: "overhead", label: language === "es" ? "Indirecto" : "Overhead" },
  ];

  function renderLineEditor(
    lines: MaintenanceCostLineFormState[],
    onAdd: () => void,
    onUpdate: (index: number, key: MaintenanceEditableCostLineKey, value: string) => void,
    onRemove: (index: number) => void,
    readOnly = false
  ) {
    return (
      <div className="maintenance-cost-lines">
        <div className="maintenance-cost-lines__header">
          <div>
            <div className="maintenance-history-entry__title">
              {language === "es" ? "Detalle por líneas" : "Detailed lines"}
            </div>
            <div className="maintenance-history-entry__meta">
              {language === "es"
                ? "Si agregas líneas, el resumen de costos se deriva automáticamente desde aquí."
                : "If you add lines, the cost summary is automatically derived from them."}
            </div>
          </div>
          {!readOnly ? (
            <button className="btn btn-sm btn-outline-primary" type="button" onClick={onAdd}>
              {language === "es" ? "Agregar línea" : "Add line"}
            </button>
          ) : null}
        </div>
        {lines.length === 0 ? (
          <div className="maintenance-history-entry__meta">
            {language === "es"
              ? "Sin líneas todavía. Puedes seguir usando el resumen manual o agregar detalle."
              : "No lines yet. You can keep using the manual summary or add detail."}
          </div>
        ) : (
          <div className="maintenance-cost-lines__items">
            {lines.map((line, index) => {
              const lineTotal =
                normalizeNumericInput(line.quantity) * normalizeNumericInput(line.unit_cost);
              return (
                {!isReadOnly && costTemplateFeedback ? (
                  <div className="maintenance-cost-lines__item" key={line.id ?? `new-${index}`}>
                    <div className="row g-3">
                      <div className="col-12 col-md-3">
                        <label className="form-label">{language === "es" ? "Tipo" : "Type"}</label>
                        <select
                          className="form-select"
                          value={line.line_type}
                          disabled={readOnly}
                          onChange={(event) => onUpdate(index, "line_type", event.target.value)}
                        >
                          {costLineTypeOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-12 col-md-5">
                        <label className="form-label">{language === "es" ? "Descripción" : "Description"}</label>
                        <input
                          className="form-control"
                          value={line.description}
                          readOnly={readOnly}
                          onChange={(event) => onUpdate(index, "description", event.target.value)}
                        />
                      </div>
                      <div className="col-6 col-md-2">
                        <label className="form-label">{language === "es" ? "Cantidad" : "Quantity"}</label>
                        <input
                          className="form-control"
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.quantity}
                          readOnly={readOnly}
                          onChange={(event) => onUpdate(index, "quantity", event.target.value)}
                        />
                      </div>
                      <div className="col-6 col-md-2">
                        <label className="form-label">{language === "es" ? "Costo unitario" : "Unit cost"}</label>
                        <input
                          className="form-control"
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.unit_cost}
                          readOnly={readOnly}
                          onChange={(event) => onUpdate(index, "unit_cost", event.target.value)}
                        />
                      </div>
                      <div className="col-12 col-md-8">
                        <label className="form-label">{language === "es" ? "Notas" : "Notes"}</label>
                        <input
                          className="form-control"
                          value={line.notes}
                          readOnly={readOnly}
                          onChange={(event) => onUpdate(index, "notes", event.target.value)}
                        />
                      </div>
                      <div className="col-8 col-md-2">
                        <label className="form-label">{language === "es" ? "Total" : "Total"}</label>
                        <input className="form-control" value={lineTotal.toFixed(2)} readOnly />
                      </div>
                      {!readOnly ? (
                        <div className="col-4 col-md-2 maintenance-cost-lines__remove">
                          <button className="btn btn-outline-danger" type="button" onClick={() => onRemove(index)}>
                            {language === "es" ? "Quitar" : "Remove"}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
              <form
                className="maintenance-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!isReadOnly) {
                    void handleEstimateSubmit();
                  }

    async function handleEstimateSubmit() {
      if (!accessToken) {
        return;
      }
      setIsEstimateSubmitting(true);
      setError(null);
      try {
        const response = await updateTenantMaintenanceWorkOrderCostEstimate(
          accessToken,
          currentWorkOrder.id,
          {
            labor_cost: normalizeNumericInput(estimateForm.labor_cost),
            travel_cost: normalizeNumericInput(estimateForm.travel_cost),
            materials_cost: normalizeNumericInput(estimateForm.materials_cost),
            external_services_cost: normalizeNumericInput(estimateForm.external_services_cost),
            overhead_cost: normalizeNumericInput(estimateForm.overhead_cost),
            target_margin_percent: normalizeNumericInput(estimateForm.target_margin_percent),
            notes: normalizeNullable(estimateForm.notes),
            lines: normalizeLineWritePayload(estimateLines),
          }
        );
        setCostingDetail(response.data);
        setEstimateForm(buildDefaultCostEstimateForm(response.data.estimate));
        setEstimateLines(buildDefaultCostLines(response.data.estimate_lines));
        onFeedback?.(response.message);
      } catch (rawError) {
        setError(rawError as ApiError);
      } finally {
        setIsEstimateSubmitting(false);
      }
    }

    async function handleActualSubmit() {
      if (!accessToken) {
        return;
      }
      setIsActualSubmitting(true);
      setError(null);
      try {
        const response = await updateTenantMaintenanceWorkOrderCostActual(
          accessToken,
          currentWorkOrder.id,
          {
            labor_cost: normalizeNumericInput(actualForm.labor_cost),
            travel_cost: normalizeNumericInput(actualForm.travel_cost),
            materials_cost: normalizeNumericInput(actualForm.materials_cost),
            external_services_cost: normalizeNumericInput(actualForm.external_services_cost),
            overhead_cost: normalizeNumericInput(actualForm.overhead_cost),
            actual_price_charged: normalizeNumericInput(actualForm.actual_price_charged),
            notes: normalizeNullable(actualForm.notes),
            lines: normalizeLineWritePayload(actualLines),
          }
        );
        setCostingDetail(response.data);
        setActualForm(buildDefaultCostActualForm(response.data.actual));
        setActualLines(buildDefaultCostLines(response.data.actual_lines));
        onFeedback?.(response.message);
      } catch (rawError) {
        setError(rawError as ApiError);
      } finally {
        setIsActualSubmitting(false);
      }
    }

    async function handleCompleteWithActualCost() {
      if (!accessToken || !canCompleteFromModal) {
        return;
      }
      setIsCompleting(true);
      setError(null);
      try {
        const costingResponse = await updateTenantMaintenanceWorkOrderCostActual(
          accessToken,
          currentWorkOrder.id,
          {
            labor_cost: normalizeNumericInput(actualForm.labor_cost),
            travel_cost: normalizeNumericInput(actualForm.travel_cost),
            materials_cost: normalizeNumericInput(actualForm.materials_cost),
            external_services_cost: normalizeNumericInput(actualForm.external_services_cost),
            overhead_cost: normalizeNumericInput(actualForm.overhead_cost),
            actual_price_charged: normalizeNumericInput(actualForm.actual_price_charged),
            notes: normalizeNullable(actualForm.notes),
            lines: normalizeLineWritePayload(actualLines),
          }
        );
        setCostingDetail(costingResponse.data);
        setActualForm(buildDefaultCostActualForm(costingResponse.data.actual));
        setActualLines(buildDefaultCostLines(costingResponse.data.actual_lines));

        const statusResponse = await updateTenantMaintenanceWorkOrderStatus(
          accessToken,
          currentWorkOrder.id,
          "completed",
          normalizeNullable(completionNote)
        );

        onFeedback?.(
          language === "es"
            ? "Costo real guardado y mantención cerrada correctamente"
            : "Actual cost saved and maintenance closed successfully"
        );
        await onCompleted?.(statusResponse.data.id);
        onClose();
      } catch (rawError) {
        setError(rawError as ApiError);
      } finally {
        setIsCompleting(false);
      }
    }

    async function handleFinanceSyncSubmit() {
      if (!accessToken || !financeSyncForm.currency_id) {
        return;
      }
      setIsFinanceSyncSubmitting(true);
      setError(null);
      try {
        const response = await syncTenantMaintenanceWorkOrderToFinance(
          accessToken,
          currentWorkOrder.id,
          {
            sync_income: financeSyncForm.sync_income,
            sync_expense: financeSyncForm.sync_expense,
            income_account_id: financeSyncForm.income_account_id
              ? Number(financeSyncForm.income_account_id)
              : null,
            expense_account_id: financeSyncForm.expense_account_id
              ? Number(financeSyncForm.expense_account_id)
              : null,
            income_category_id: financeSyncForm.income_category_id
              ? Number(financeSyncForm.income_category_id)
              : null,
            expense_category_id: financeSyncForm.expense_category_id
              ? Number(financeSyncForm.expense_category_id)
              : null,
            currency_id: Number(financeSyncForm.currency_id),
            transaction_at: financeSyncForm.transaction_at
              ? fromDateTimeLocalInputValue(financeSyncForm.transaction_at, effectiveTimeZone)
              : null,
            notes: normalizeNullable(financeSyncForm.notes),
          }
        );
        setCostingDetail(response.data);
        setFinanceSyncForm((current) => ({
          ...current,
          notes: response.data.actual?.notes ?? current.notes,
        }));
        onFeedback?.(response.message);
      } catch (rawError) {
        setError(rawError as ApiError);
      } finally {
        setIsFinanceSyncSubmitting(false);
      }
    }

    return (
      <div className="maintenance-form-backdrop" role="presentation" onClick={onClose}>
        <div
          className="maintenance-form-modal maintenance-form-modal--wide"
          role="dialog"
          aria-modal="true"
          aria-label={language === "es" ? "Costos y cobro de mantención" : "Maintenance costing and billing"}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="maintenance-form-modal__eyebrow">
            {language === "es" ? "Costeo y finanzas" : "Costing and finance"}
          </div>
          <PanelCard
            title={
              isReadOnly
                ? language === "es"
                  ? "Histórico de costos y cobro"
                  : "Costing history"
                : language === "es"
                  ? "Costos y cobro"
                  : "Costing and billing"
            }
            subtitle={
              isReadOnly
                ? language === "es"
                  ? "Consulta el cierre económico ya registrado para esta mantención sin modificar el histórico."
                  : "Review the registered financial close for this maintenance without changing history."
                : language === "es"
                  ? "Calcula costo estimado, registra costo real y sincroniza manualmente los movimientos a Finanzas."
                  : "Calculate estimated cost, register actual cost, and manually sync transactions into Finance."
            }
          >
            {error ? (
              <ErrorState
                title={language === "es" ? "No se pudo operar el costeo" : "Costing action failed"}
                detail={getApiErrorDisplayMessage(error)}
                requestId={error.payload?.request_id}
              />
            ) : null}
            {isLoading ? (
              <LoadingBlock label={language === "es" ? "Cargando costeo..." : "Loading costing..."} />
            ) : (
              <div className="d-grid gap-3">
                <div className="maintenance-history-entry">
                  <div className="maintenance-history-entry__title">{currentWorkOrder.title}</div>
                  <div className="maintenance-history-entry__meta">{clientLabel} · {siteLabel}</div>
                  <div className="maintenance-history-entry__meta">
                    {language === "es" ? "Instalación" : "Installation"}: {installationLabel}
                  </div>
                  <div className="maintenance-history-entry__meta">
                    {language === "es" ? "Ventana operativa" : "Operational window"}: {" "}
                    {formatDateTimeInTimeZone(
                      currentWorkOrder.completed_at ||
                        currentWorkOrder.scheduled_for ||
                        currentWorkOrder.requested_at,
                      language,
                      effectiveTimeZone
                    )}
                  </div>
                </div>

                {!isReadOnly && costTemplateFeedback ? (
                  <div className="alert alert-info mb-0">{costTemplateFeedback}</div>
                ) : null}
                }}
              >
                <div className="maintenance-history-entry">
                  <div className="maintenance-history-entry__title">
                    {language === "es" ? "Costeo estimado" : "Estimated costing"}
                  </div>
                  <div className="maintenance-history-entry__meta">
                    {language === "es"
                      ? "Úsalo para proyectar costo interno y precio sugerido antes de ejecutar."
                      : "Use it to project internal cost and suggested price before execution."}
                  </div>
                  <div className="row g-3 mt-1">
                    <div className="col-12 col-md-4">
                      <label className="form-label">{language === "es" ? "Mano de obra" : "Labor"}</label>
                      <input className="form-control" type="number" min="0" step="0.01" value={estimateUsesLines ? estimateLineTotals.labor_cost.toFixed(2) : estimateForm.labor_cost} onChange={(event) => setEstimateForm((current) => ({ ...current, labor_cost: event.target.value }))} disabled={estimateUsesLines || isReadOnly} />
                    </div>
                    <div className="col-12 col-md-4">
                      <label className="form-label">{language === "es" ? "Traslado" : "Travel"}</label>
                      <input className="form-control" type="number" min="0" step="0.01" value={estimateUsesLines ? estimateLineTotals.travel_cost.toFixed(2) : estimateForm.travel_cost} onChange={(event) => setEstimateForm((current) => ({ ...current, travel_cost: event.target.value }))} disabled={estimateUsesLines || isReadOnly} />
                    </div>
                    <div className="col-12 col-md-4">
                      <label className="form-label">{language === "es" ? "Materiales" : "Materials"}</label>
                      <input className="form-control" type="number" min="0" step="0.01" value={estimateUsesLines ? estimateLineTotals.materials_cost.toFixed(2) : estimateForm.materials_cost} onChange={(event) => setEstimateForm((current) => ({ ...current, materials_cost: event.target.value }))} disabled={estimateUsesLines || isReadOnly} />
                    </div>
                    <div className="col-12 col-md-4">
                      <label className="form-label">{language === "es" ? "Servicios externos" : "External services"}</label>
                      <input className="form-control" type="number" min="0" step="0.01" value={estimateUsesLines ? estimateLineTotals.external_services_cost.toFixed(2) : estimateForm.external_services_cost} onChange={(event) => setEstimateForm((current) => ({ ...current, external_services_cost: event.target.value }))} disabled={estimateUsesLines || isReadOnly} />
                    </div>
                    <div className="col-12 col-md-4">
                      <label className="form-label">{language === "es" ? "Indirectos" : "Overhead"}</label>
                      <input className="form-control" type="number" min="0" step="0.01" value={estimateUsesLines ? estimateLineTotals.overhead_cost.toFixed(2) : estimateForm.overhead_cost} onChange={(event) => setEstimateForm((current) => ({ ...current, overhead_cost: event.target.value }))} disabled={estimateUsesLines || isReadOnly} />
                    </div>
                    <div className="col-12 col-md-4">
                      <label className="form-label">{language === "es" ? "Margen objetivo (%)" : "Target margin (%)"}</label>
                      <input className="form-control" type="number" min="0" max="99.99" step="0.01" value={estimateForm.target_margin_percent} onChange={(event) => setEstimateForm((current) => ({ ...current, target_margin_percent: event.target.value }))} disabled={isReadOnly} />
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label">{language === "es" ? "Costo estimado total" : "Estimated total cost"}</label>
                      <input className="form-control" value={estimatedTotalPreview.toFixed(2)} readOnly />
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label">{language === "es" ? "Precio sugerido" : "Suggested price"}</label>
                      <input className="form-control" value={estimatedSuggestedPricePreview.toFixed(2)} readOnly />
                    </div>
                    <div className="col-12">
                      <label className="form-label">{language === "es" ? "Notas de estimación" : "Estimate notes"}</label>
                      <textarea className="form-control" rows={3} value={estimateForm.notes} onChange={(event) => setEstimateForm((current) => ({ ...current, notes: event.target.value }))} readOnly={isReadOnly} />
                    </div>
                    <div className="col-12">
                      {renderLineEditor(
                        estimateLines,
                        addEstimateLine,
                        updateEstimateLine,
                        removeEstimateLine,
                        isReadOnly
                      )}
                    </div>
                  </div>
                  {!isReadOnly ? (
                    <div className="maintenance-form__actions">
                      <button className="btn btn-outline-primary" type="submit" disabled={isEstimateSubmitting}>
                        {isEstimateSubmitting
                          ? language === "es"
                            ? "Guardando..."
                            : "Saving..."
                          : language === "es"
                            ? "Guardar estimado"
                            : "Save estimate"}
                      </button>
                    </div>
                  ) : null}
                </div>
              </form>

              <form
                className="maintenance-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!isReadOnly) {
                    void handleActualSubmit();
                  }
                }}
              >
                <div className="maintenance-history-entry">
                  <div className="maintenance-history-entry__title">
                    {language === "es" ? "Costo real y cobro" : "Actual cost and billing"}
                  </div>
                  <div className="maintenance-history-entry__meta">
                    {language === "es"
                      ? "Registra lo que realmente costó y lo que se cobró para medir utilidad."
                      : "Register the real cost and amount charged to measure profit."}
                  </div>
                  <div className="row g-3 mt-1">
                    <div className="col-12 col-md-4">
                      <label className="form-label">{language === "es" ? "Mano de obra real" : "Actual labor"}</label>
                      <input className="form-control" type="number" min="0" step="0.01" value={actualUsesLines ? actualLineTotals.labor_cost.toFixed(2) : actualForm.labor_cost} onChange={(event) => setActualForm((current) => ({ ...current, labor_cost: event.target.value }))} disabled={actualUsesLines || isReadOnly} />
                    </div>
                    <div className="col-12 col-md-4">
                      <label className="form-label">{language === "es" ? "Traslado real" : "Actual travel"}</label>
                      <input className="form-control" type="number" min="0" step="0.01" value={actualUsesLines ? actualLineTotals.travel_cost.toFixed(2) : actualForm.travel_cost} onChange={(event) => setActualForm((current) => ({ ...current, travel_cost: event.target.value }))} disabled={actualUsesLines || isReadOnly} />
                    </div>
                    <div className="col-12 col-md-4">
                      <label className="form-label">{language === "es" ? "Materiales reales" : "Actual materials"}</label>
                      <input className="form-control" type="number" min="0" step="0.01" value={actualUsesLines ? actualLineTotals.materials_cost.toFixed(2) : actualForm.materials_cost} onChange={(event) => setActualForm((current) => ({ ...current, materials_cost: event.target.value }))} disabled={actualUsesLines || isReadOnly} />
                    </div>
                    <div className="col-12 col-md-4">
                      <label className="form-label">{language === "es" ? "Servicios externos reales" : "Actual external services"}</label>
                      <input className="form-control" type="number" min="0" step="0.01" value={actualUsesLines ? actualLineTotals.external_services_cost.toFixed(2) : actualForm.external_services_cost} onChange={(event) => setActualForm((current) => ({ ...current, external_services_cost: event.target.value }))} disabled={actualUsesLines || isReadOnly} />
                    </div>
                    <div className="col-12 col-md-4">
                      <label className="form-label">{language === "es" ? "Indirectos reales" : "Actual overhead"}</label>
                      <input className="form-control" type="number" min="0" step="0.01" value={actualUsesLines ? actualLineTotals.overhead_cost.toFixed(2) : actualForm.overhead_cost} onChange={(event) => setActualForm((current) => ({ ...current, overhead_cost: event.target.value }))} disabled={actualUsesLines || isReadOnly} />
                    </div>
                    <div className="col-12 col-md-4">
                      <label className="form-label">{language === "es" ? "Monto cobrado" : "Amount charged"}</label>
                      <input className="form-control" type="number" min="0" step="0.01" value={actualForm.actual_price_charged} onChange={(event) => setActualForm((current) => ({ ...current, actual_price_charged: event.target.value }))} disabled={isReadOnly} />
                    </div>
                    <div className="col-12 col-md-4">
                      <label className="form-label">{language === "es" ? "Costo real total" : "Actual total cost"}</label>
                      <input className="form-control" value={actualTotalPreview.toFixed(2)} readOnly />
                    </div>
                    <div className="col-12 col-md-4">
                      <label className="form-label">{language === "es" ? "Utilidad" : "Profit"}</label>
                      <input className="form-control" value={actualProfitPreview.toFixed(2)} readOnly />
                    </div>
                    <div className="col-12 col-md-4">
                      <label className="form-label">{language === "es" ? "Margen real (%)" : "Actual margin (%)"}</label>
                      <input className="form-control" value={actualMarginPreview === null ? "—" : actualMarginPreview.toFixed(2)} readOnly />
                    </div>
                    <div className="col-12">
                      <label className="form-label">{language === "es" ? "Notas de cierre económico" : "Financial close notes"}</label>
                      <textarea className="form-control" rows={3} value={actualForm.notes} onChange={(event) => setActualForm((current) => ({ ...current, notes: event.target.value }))} readOnly={isReadOnly} />
                    </div>
                    {canCompleteFromModal ? (
                      <div className="col-12">
                        <label className="form-label">
                          {language === "es" ? "Nota operativa de cierre" : "Operational closure note"}
                        </label>
                        <textarea
                          className="form-control"
                          rows={2}
                          value={completionNote}
                          onChange={(event) => setCompletionNote(event.target.value)}
                          placeholder={
                            language === "es"
                              ? "Ej.: trabajo ejecutado, repuestos usados, hallazgos y condición de entrega"
                              : "E.g. work performed, used spare parts, findings, and delivery condition"
                          }
                        />
                        <div className="maintenance-history-entry__meta mt-2">
                          {language === "es"
                            ? "Al cerrar desde aquí se guarda primero el costo real y luego se cambia el estado a completada."
                            : "Closing from here saves actual cost first and then changes the status to completed."}
                        </div>
                      </div>
                    ) : null}
                    <div className="col-12">
                      {renderLineEditor(
                        actualLines,
                        addActualLine,
                        updateActualLine,
                        removeActualLine,
                        isReadOnly
                      )}
                    </div>
                  </div>
                  {!isReadOnly ? (
                    <div className="maintenance-form__actions">
                      <button className="btn btn-outline-primary" type="submit" disabled={isActualSubmitting}>
                        {isActualSubmitting
                          ? language === "es"
                            ? "Guardando..."
                            : "Saving..."
                          : language === "es"
                            ? "Guardar costo real"
                            : "Save actual cost"}
                      </button>
                      {canCompleteFromModal ? (
                        <button
                          className="btn btn-success"
                          type="button"
                          onClick={() => void handleCompleteWithActualCost()}
                          disabled={isActualSubmitting || isCompleting}
                        >
                          {isCompleting
                            ? language === "es"
                              ? "Cerrando..."
                              : "Closing..."
                            : language === "es"
                              ? "Guardar y cerrar mantención"
                              : "Save and close maintenance"}
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </form>

              <form
                className="maintenance-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!isReadOnly) {
                    void handleFinanceSyncSubmit();
                  }
                }}
              >
                <div className="maintenance-history-entry">
                  <div className="maintenance-history-entry__title">
                    {isReadOnly
                      ? language === "es"
                        ? "Histórico de sincronización con finanzas"
                        : "Finance sync history"
                      : language === "es"
                        ? "Sincronizar a finanzas"
                        : "Sync to finance"}
                  </div>
                  <div className="maintenance-history-entry__meta">
                    {isReadOnly
                      ? language === "es"
                        ? "Consulta los vínculos financieros ya registrados para esta mantención cerrada."
                        : "Review the financial links already registered for this closed maintenance."
                      : language === "es"
                        ? "Crea o actualiza el ingreso y egreso ligados a esta mantención usando source_type/source_id."
                        : "Create or update the linked income and expense using source_type/source_id."}
                  </div>
                  {!isReadOnly && (!activeFinanceAccounts.length || !activeCurrencies.length) ? (
                    <div className="alert alert-warning mt-3 mb-0">
                      {language === "es"
                        ? "Primero debes tener cuentas y monedas activas en Finanzas para sincronizar."
                        : "You need active accounts and currencies in Finance before syncing."}
                    </div>
                  ) : null}
                  <div className="row g-3 mt-1">
                    {isReadOnly ? (
                      <>
                        <div className="col-12 col-md-4">
                          <label className="form-label">{language === "es" ? "Ingreso vinculado" : "Linked income"}</label>
                          <input className="form-control" value={String(costingDetail?.actual?.income_transaction_id ?? "—")} readOnly />
                        </div>
                        <div className="col-12 col-md-4">
                          <label className="form-label">{language === "es" ? "Egreso vinculado" : "Linked expense"}</label>
                          <input className="form-control" value={String(costingDetail?.actual?.expense_transaction_id ?? "—")} readOnly />
                        </div>
                        <div className="col-12 col-md-4">
                          <label className="form-label">{language === "es" ? "Última sync" : "Last sync"}</label>
                          <input
                            className="form-control"
                            value={
                              costingDetail?.actual?.finance_synced_at
                                ? formatDateTimeInTimeZone(costingDetail.actual.finance_synced_at, language, effectiveTimeZone)
                                : "—"
                            }
                            readOnly
                          />
                        </div>
                        <div className="col-12">
                          <label className="form-label">{language === "es" ? "Notas de finanzas" : "Finance notes"}</label>
                          <textarea className="form-control" rows={2} value={financeSyncForm.notes} readOnly />
                        </div>
                      </>
                    ) : (
                      <>
                    <div className="col-12 col-md-6">
                      <label className="form-label">{language === "es" ? "Moneda" : "Currency"}</label>
                      <select className="form-select" value={financeSyncForm.currency_id} onChange={(event) => setFinanceSyncForm((current) => ({ ...current, currency_id: event.target.value }))}>
                        <option value="">{language === "es" ? "Selecciona una moneda" : "Select a currency"}</option>
                        {activeCurrencies.map((currency) => (
                          <option key={currency.id} value={currency.id}>
                            {currency.code} · {currency.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label">{language === "es" ? "Fecha contable" : "Transaction date"}</label>
                      <input className="form-control" type="datetime-local" value={financeSyncForm.transaction_at} onChange={(event) => setFinanceSyncForm((current) => ({ ...current, transaction_at: event.target.value }))} />
                    </div>
                    <div className="col-12 col-md-6">
                      <div className="form-check mt-4">
                        <input id="maintenance-sync-income-modal" className="form-check-input" type="checkbox" checked={financeSyncForm.sync_income} onChange={(event) => setFinanceSyncForm((current) => ({ ...current, sync_income: event.target.checked }))} />
                        <label className="form-check-label" htmlFor="maintenance-sync-income-modal">
                          {language === "es" ? "Sincronizar ingreso" : "Sync income"}
                        </label>
                      </div>
                    </div>
                    <div className="col-12 col-md-6">
                      <div className="form-check mt-4">
                        <input id="maintenance-sync-expense-modal" className="form-check-input" type="checkbox" checked={financeSyncForm.sync_expense} onChange={(event) => setFinanceSyncForm((current) => ({ ...current, sync_expense: event.target.checked }))} />
                        <label className="form-check-label" htmlFor="maintenance-sync-expense-modal">
                          {language === "es" ? "Sincronizar egreso" : "Sync expense"}
                        </label>
                      </div>
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label">{language === "es" ? "Cuenta ingreso" : "Income account"}</label>
                      <select className="form-select" value={financeSyncForm.income_account_id} onChange={(event) => setFinanceSyncForm((current) => ({ ...current, income_account_id: event.target.value }))} disabled={!financeSyncForm.sync_income}>
                        <option value="">{language === "es" ? "Selecciona una cuenta" : "Select an account"}</option>
                        {activeFinanceAccounts.map((account) => (
                          <option key={account.id} value={account.id}>
                            {account.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label">{language === "es" ? "Categoría ingreso" : "Income category"}</label>
                      <select className="form-select" value={financeSyncForm.income_category_id} onChange={(event) => setFinanceSyncForm((current) => ({ ...current, income_category_id: event.target.value }))} disabled={!financeSyncForm.sync_income}>
                        <option value="">{language === "es" ? "Sin categoría específica" : "No specific category"}</option>
                        {incomeCategories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label">{language === "es" ? "Cuenta egreso" : "Expense account"}</label>
                      <select className="form-select" value={financeSyncForm.expense_account_id} onChange={(event) => setFinanceSyncForm((current) => ({ ...current, expense_account_id: event.target.value }))} disabled={!financeSyncForm.sync_expense}>
                        <option value="">{language === "es" ? "Selecciona una cuenta" : "Select an account"}</option>
                        {activeFinanceAccounts.map((account) => (
                          <option key={account.id} value={account.id}>
                            {account.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label">{language === "es" ? "Categoría egreso" : "Expense category"}</label>
                      <select className="form-select" value={financeSyncForm.expense_category_id} onChange={(event) => setFinanceSyncForm((current) => ({ ...current, expense_category_id: event.target.value }))} disabled={!financeSyncForm.sync_expense}>
                        <option value="">{language === "es" ? "Sin categoría específica" : "No specific category"}</option>
                        {expenseCategories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-12">
                      <label className="form-label">{language === "es" ? "Notas para finanzas" : "Finance notes"}</label>
                      <textarea className="form-control" rows={2} value={financeSyncForm.notes} onChange={(event) => setFinanceSyncForm((current) => ({ ...current, notes: event.target.value }))} />
                    </div>
                    <div className="col-12">
                      <div className="maintenance-history-entry__meta">
                        {language === "es" ? "Ingreso vinculado" : "Linked income"}:{" "}
                        {costingDetail?.actual?.income_transaction_id ?? "—"} ·{" "}
                        {language === "es" ? "Egreso vinculado" : "Linked expense"}:{" "}
                        {costingDetail?.actual?.expense_transaction_id ?? "—"}
                      </div>
                    </div>
                      </>
                    )}
                  </div>
                  <div className="maintenance-form__actions">
                    <button className="btn btn-outline-secondary" type="button" onClick={onClose}>
                      {language === "es" ? "Cerrar" : "Close"}
                    </button>
                    {!isReadOnly ? (
                      <button className="btn btn-primary" type="submit" disabled={isFinanceSyncSubmitting || financeSyncBlocked}>
                        {isFinanceSyncSubmitting
                          ? language === "es"
                            ? "Sincronizando..."
                            : "Syncing..."
                          : language === "es"
                            ? "Sincronizar con finanzas"
                            : "Sync with Finance"}
                      </button>
                    ) : null}
                  </div>
                </div>
              </form>
            </div>
          )}
        </PanelCard>
      </div>
    </div>
  );
}
