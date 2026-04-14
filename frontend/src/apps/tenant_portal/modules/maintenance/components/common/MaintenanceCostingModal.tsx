import { useEffect, useMemo, useState } from "react";
import { PanelCard } from "../../../../../../components/common/PanelCard";
import { ErrorState } from "../../../../../../components/feedback/ErrorState";
import { LoadingBlock } from "../../../../../../components/feedback/LoadingBlock";
import { getApiErrorDisplayMessage } from "../../../../../../services/api";
import type { ApiError } from "../../../../../../types";
import {
  formatDateTimeInTimeZone,
  fromDateTimeLocalInputValue,
  toDateTimeLocalInputValue,
} from "../../../../../../utils/dateTimeLocal";
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
  getTenantMaintenanceFinanceSyncDefaults,
  getTenantMaintenanceWorkOrderCosting,
  syncTenantMaintenanceWorkOrderToFinance,
  updateTenantMaintenanceWorkOrderCostActual,
  updateTenantMaintenanceWorkOrderCostEstimate,
  type TenantMaintenanceCostActual,
  type TenantMaintenanceCostEstimate,
  type TenantMaintenanceCostLine,
  type TenantMaintenanceCostLineWriteItem,
  type TenantMaintenanceCostingDetail,
  type TenantMaintenanceFinanceSyncDefaults,
} from "../../services/costingService";
import {
  getTenantMaintenanceCostTemplates,
  type TenantMaintenanceCostTemplate,
} from "../../services/costTemplatesService";
import { updateTenantMaintenanceWorkOrderStatus } from "../../services/workOrdersService";
import { useTenantAuth } from "../../../../../../store/tenant-auth-context";

type MaintenanceCostEstimateFormState = {
  labor_cost: string;
  travel_cost: string;
  materials_cost: string;
  external_services_cost: string;
  overhead_cost: string;
  target_margin_percent: string;
  suggested_price: string;
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
  income_description: string;
  expense_description: string;
  notes: string;
};

type MaintenanceCostLineFormState = {
  id: number | null;
  line_type: string;
  description: string;
  quantity: string;
  unit_cost: string;
  notes: string;
  include_in_expense: boolean;
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

function buildFinanceReferenceLabel(
  workOrder: MaintenanceCostingModalWorkOrder | null,
  clientLabel?: string | null,
  siteLabel?: string | null,
  installationLabel?: string | null
): string {
  if (!workOrder) {
    return "";
  }
  const pieces = [`#${workOrder.id}`, workOrder.title];
  if (clientLabel) {
    pieces.push(clientLabel);
  }
  void siteLabel;
  void installationLabel;
  return pieces.filter(Boolean).join(" · ");
}

function buildFinanceDescription(
  kind: "income" | "expense",
  workOrder: MaintenanceCostingModalWorkOrder | null,
  clientLabel?: string | null,
  siteLabel?: string | null,
  installationLabel?: string | null,
  language: "es" | "en" = "es"
): string {
  const reference = buildFinanceReferenceLabel(
    workOrder,
    clientLabel,
    siteLabel,
    installationLabel
  );
  const prefix =
    kind === "income"
      ? language === "es"
        ? "Ingreso mantención"
        : "Maintenance income"
      : language === "es"
        ? "Egreso mantención"
        : "Maintenance expense";
  if (!reference) {
    return prefix;
  }
  return `${prefix} ${reference}`;
}

function getReadonlyFinanceSyncState(actual?: TenantMaintenanceCostActual | null) {
  if (!actual) {
    return "no_actual";
  }
  if (actual.finance_synced_at || actual.income_transaction_id || actual.expense_transaction_id) {
    return "synced";
  }
  return "not_synced";
}

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

function normalizeNullable(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : null;
}

function normalizeNumericInput(value: string): number {
  const normalized = Number(value || 0);
  return Number.isFinite(normalized) ? normalized : 0;
}

function buildDefaultCostEstimateForm(
  estimate?: TenantMaintenanceCostEstimate | null,
  suggestedPriceFallback?: string
): MaintenanceCostEstimateFormState {
  return {
    labor_cost: String(estimate?.labor_cost ?? 0),
    travel_cost: String(estimate?.travel_cost ?? 0),
    materials_cost: String(estimate?.materials_cost ?? 0),
    external_services_cost: String(estimate?.external_services_cost ?? 0),
    overhead_cost: String(estimate?.overhead_cost ?? 0),
    target_margin_percent: String(estimate?.target_margin_percent ?? 0),
    suggested_price:
      estimate?.suggested_price != null
        ? String(estimate.suggested_price)
        : suggestedPriceFallback ?? "",
    notes: estimate?.notes ?? "",
  };
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
    include_in_expense: line.include_in_expense ?? true,
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
    include_in_expense: true,
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
      if (!line.include_in_expense) {
        return current;
      }
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

function getSuggestedPriceForEstimateData(
  estimate: TenantMaintenanceCostEstimate | null | undefined,
  estimateLines: TenantMaintenanceCostLine[] | null | undefined
): number {
  if (!estimate) {
    return 0;
  }
  const hasLines = (estimateLines ?? []).length > 0;
  const total = hasLines
    ? sumCostLines(
        (estimateLines ?? []).map((line) => ({
          id: line.id,
          line_type: line.line_type,
          description: line.description ?? "",
          quantity: String(line.quantity ?? 1),
          unit_cost: String(line.unit_cost ?? 0),
          notes: line.notes ?? "",
          include_in_expense: line.include_in_expense ?? true,
        }))
      ).total
    : sumCostForm({
        labor_cost: String(estimate.labor_cost ?? 0),
        travel_cost: String(estimate.travel_cost ?? 0),
        materials_cost: String(estimate.materials_cost ?? 0),
        external_services_cost: String(estimate.external_services_cost ?? 0),
        overhead_cost: String(estimate.overhead_cost ?? 0),
      });
  const margin = Number(estimate.target_margin_percent ?? 0);
  if (total <= 0) {
    return 0;
  }
  if (margin <= 0 || margin >= 100) {
    return Number(total.toFixed(2));
  }
  return Number((total / (1 - margin / 100)).toFixed(2));
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
    include_in_expense: line.include_in_expense,
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
    include_in_expense: true,
  }));
}

function buildEstimateFormFromTemplate(
  template: TenantMaintenanceCostTemplate
): MaintenanceCostEstimateFormState {
  return {
    labor_cost: "0",
    travel_cost: "0",
    materials_cost: "0",
    external_services_cost: "0",
    overhead_cost: "0",
    target_margin_percent: String(template.estimate_target_margin_percent ?? 0),
    suggested_price: String(getSuggestedPriceFromTemplate(template)),
    notes: template.estimate_notes ?? "",
  };
}

function getSuggestedPriceFromTemplate(template: TenantMaintenanceCostTemplate): number {
  const templateCost = template.lines.reduce((current, line) => current + (line.total_cost ?? 0), 0);
  const margin = Number(template.estimate_target_margin_percent ?? 0);
  if (templateCost <= 0) {
    return 0;
  }
  if (margin > 0 && margin < 100) {
    return Number((templateCost / (1 - margin / 100)).toFixed(2));
  }
  return Number(templateCost.toFixed(2));
}

function getMarginFromSuggestedPrice(total: number, suggested: number): number | null {
  if (total <= 0 || suggested <= 0) {
    return null;
  }
  const margin = (1 - total / suggested) * 100;
  if (!Number.isFinite(margin)) {
    return null;
  }
  return Number(margin.toFixed(2));
}

function buildActualFormFromTemplate(
  template: TenantMaintenanceCostTemplate
): MaintenanceCostActualFormState {
  const totals = sumCostLines(buildCostLineFormsFromTemplate(template));
  return {
    labor_cost: String(totals.labor_cost),
    travel_cost: String(totals.travel_cost),
    materials_cost: String(totals.materials_cost),
    external_services_cost: String(totals.external_services_cost),
    overhead_cost: String(totals.overhead_cost),
    actual_price_charged: String(getSuggestedPriceFromTemplate(template)),
    notes: template.estimate_notes ?? "",
  };
}

function getTemplateBaseCost(template: TenantMaintenanceCostTemplate): number {
  return template.lines.reduce((current, line) => current + (line.total_cost ?? 0), 0);
}

function findActiveAccountId(accounts: TenantFinanceAccount[], candidateId: number | null | undefined): string {
  if (candidateId == null) {
    return "";
  }
  return accounts.some((account) => account.is_active && account.id === candidateId)
    ? String(candidateId)
    : "";
}

function findActiveCategoryId(
  categories: TenantFinanceCategory[],
  categoryType: "income" | "expense",
  candidateId: number | null | undefined
): string {
  if (
    candidateId != null &&
    categories.some(
      (category) =>
        category.is_active && category.category_type === categoryType && category.id === candidateId
    )
  ) {
    return String(candidateId);
  }
  const fallback = categories.find(
    (category) => category.is_active && category.category_type === categoryType
  );
  return String(fallback?.id ?? "");
}

function findActiveCurrencyId(
  currencies: TenantFinanceCurrency[],
  candidateId: number | null | undefined
): string {
  if (
    candidateId != null &&
    currencies.some((currency) => currency.is_active && currency.id === candidateId)
  ) {
    return String(candidateId);
  }
  const fallback =
    currencies.find((currency) => currency.is_active && currency.is_base) ??
    currencies.find((currency) => currency.is_active) ??
    currencies.find((currency) => currency.is_base) ??
    currencies[0];
  return String(fallback?.id ?? "");
}

function buildFinanceSuggestionHint(
  defaults: TenantMaintenanceFinanceSyncDefaults | null,
  language: "es" | "en",
  accounts: TenantFinanceAccount[],
  categories: TenantFinanceCategory[],
  currencies: TenantFinanceCurrency[]
): string | null {
  if (!defaults) {
    return null;
  }
  const pieces = [
    currencies.find((item) => item.id === defaults.maintenance_finance_currency_id)?.code,
    accounts.find((item) => item.id === defaults.maintenance_finance_income_account_id)?.name,
    categories.find((item) => item.id === defaults.maintenance_finance_income_category_id)?.name,
    accounts.find((item) => item.id === defaults.maintenance_finance_expense_account_id)?.name,
    categories.find((item) => item.id === defaults.maintenance_finance_expense_category_id)?.name,
  ].filter((value): value is string => Boolean(value));
  if (!pieces.length) {
    return language === "es"
      ? "El backend no encontró sugerencias financieras adicionales para esta OT."
      : "The backend did not find extra finance suggestions for this work order.";
  }
  return language === "es"
    ? `Sugerencia efectiva desde backend: ${pieces.join(" · ")}.`
    : `Effective backend suggestion: ${pieces.join(" · ")}.`;
}

function buildFinanceSyncFormFromDetail(params: {
  detail: TenantMaintenanceCostingDetail;
  syncDefaults: TenantMaintenanceFinanceSyncDefaults;
  accounts: TenantFinanceAccount[];
  categories: TenantFinanceCategory[];
  currencies: TenantFinanceCurrency[];
  defaultCurrencyId: number | null;
  workOrder: MaintenanceCostingModalWorkOrder;
  clientLabel: string;
  siteLabel: string;
  installationLabel: string;
  language: "es" | "en";
  effectiveTimeZone?: string | null;
}): MaintenanceFinanceSyncFormState {
  const {
    detail,
    syncDefaults,
    accounts,
    categories,
    currencies,
    defaultCurrencyId,
    workOrder,
    clientLabel,
    siteLabel,
    installationLabel,
    language,
    effectiveTimeZone,
  } = params;
  const incomeSnapshot = detail.actual?.income_transaction_snapshot ?? null;
  const expenseSnapshot = detail.actual?.expense_transaction_snapshot ?? null;
  const transactionAtSource =
    incomeSnapshot?.transaction_at ??
    expenseSnapshot?.transaction_at ??
    detail.actual?.finance_synced_at ??
    workOrder.completed_at ??
    workOrder.scheduled_for ??
    workOrder.requested_at;

  return {
    sync_income: syncDefaults.maintenance_finance_auto_sync_income,
    sync_expense: syncDefaults.maintenance_finance_auto_sync_expense,
    income_account_id: findActiveAccountId(
      accounts,
      incomeSnapshot?.account_id ?? syncDefaults.maintenance_finance_income_account_id
    ),
    expense_account_id: findActiveAccountId(
      accounts,
      expenseSnapshot?.account_id ?? syncDefaults.maintenance_finance_expense_account_id
    ),
    income_category_id: findActiveCategoryId(
      categories,
      "income",
      incomeSnapshot?.category_id ?? syncDefaults.maintenance_finance_income_category_id
    ),
    expense_category_id: findActiveCategoryId(
      categories,
      "expense",
      expenseSnapshot?.category_id ?? syncDefaults.maintenance_finance_expense_category_id
    ),
    currency_id: findActiveCurrencyId(
      currencies,
      incomeSnapshot?.currency_id ??
        expenseSnapshot?.currency_id ??
        syncDefaults.maintenance_finance_currency_id ??
        defaultCurrencyId
    ),
    transaction_at: toDateTimeLocalInputValue(transactionAtSource, effectiveTimeZone),
    income_description:
      incomeSnapshot?.description ??
      buildFinanceDescription(
        "income",
        workOrder,
        clientLabel,
        siteLabel,
        installationLabel,
        language
      ),
    expense_description:
      expenseSnapshot?.description ??
      buildFinanceDescription(
        "expense",
        workOrder,
        clientLabel,
        siteLabel,
        installationLabel,
        language
      ),
    notes:
      detail.actual?.notes ??
      incomeSnapshot?.notes ??
      expenseSnapshot?.notes ??
      detail.estimate?.notes ??
      "",
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
  const { tenantInfo } = useTenantAuth();
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
  const [financeSyncDefaults, setFinanceSyncDefaults] =
    useState<TenantMaintenanceFinanceSyncDefaults | null>(null);
  const [costTemplates, setCostTemplates] = useState<TenantMaintenanceCostTemplate[]>([]);
  const [costBaseMessage, setCostBaseMessage] = useState<string | null>(null);
  const [actualTemplateId, setActualTemplateId] = useState("");
  const [appliedActualTemplateId, setAppliedActualTemplateId] = useState<string | null>(null);
  const [estimateForm, setEstimateForm] = useState<MaintenanceCostEstimateFormState>(
    buildDefaultCostEstimateForm()
  );
  const [estimateSuggestedTouched, setEstimateSuggestedTouched] = useState(false);
  const [estimateLines, setEstimateLines] = useState<MaintenanceCostLineFormState[]>([]);
  const [actualForm, setActualForm] = useState<MaintenanceCostActualFormState>(
    buildDefaultCostActualForm()
  );
  const [actualLines, setActualLines] = useState<MaintenanceCostLineFormState[]>([]);
  const [completionNote, setCompletionNote] = useState("");
  const [useCustomTransactionAt, setUseCustomTransactionAt] = useState(false);
  const [showEstimateSection, setShowEstimateSection] = useState(false);
  const [financeSyncForm, setFinanceSyncForm] = useState<MaintenanceFinanceSyncFormState>({
    sync_income: true,
    sync_expense: true,
    income_account_id: "",
    expense_account_id: "",
    income_category_id: "",
    expense_category_id: "",
    currency_id: "",
    transaction_at: "",
    income_description: "",
    expense_description: "",
    notes: "",
  });

  const activeFinanceAccounts = useMemo(
    () => financeAccounts.filter((account) => account.is_active),
    [financeAccounts]
  );
  const activeCurrencies = useMemo(
    () => financeCurrencies.filter((currency) => currency.is_active),
    [financeCurrencies]
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
  const financeSuggestionHint = useMemo(
    () =>
      buildFinanceSuggestionHint(
        financeSyncDefaults,
        language,
        activeFinanceAccounts,
        financeCategories,
        activeCurrencies
      ),
    [activeCurrencies, activeFinanceAccounts, financeCategories, financeSyncDefaults, language]
  );
  const activeCostTemplates = useMemo(
    () => costTemplates.filter((template) => template.is_active),
    [costTemplates]
  );
  const preferredCostTemplates = useMemo(() => {
    const sameTaskType = taskTypeId
      ? activeCostTemplates.filter((template) => template.task_type_id === taskTypeId)
      : [];
    const general = activeCostTemplates.filter((template) => template.task_type_id == null);
    const otherTaskTypes = activeCostTemplates.filter(
      (template) =>
        template.task_type_id != null && (!taskTypeId || template.task_type_id !== taskTypeId)
    );
    return [...sameTaskType, ...general, ...otherTaskTypes];
  }, [activeCostTemplates, taskTypeId]);
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
    if (margin <= 0 || margin >= 100) {
      return estimatedTotalPreview;
    }
    return Number((estimatedTotalPreview / (1 - margin / 100)).toFixed(2));
  }, [estimateForm.target_margin_percent, estimatedTotalPreview]);
  const suggestedPriceFromInput = useMemo(
    () => normalizeNumericInput(estimateForm.suggested_price),
    [estimateForm.suggested_price]
  );
  const estimatedMarginFromSuggested = useMemo(
    () => getMarginFromSuggestedPrice(estimatedTotalPreview, suggestedPriceFromInput),
    [estimatedTotalPreview, suggestedPriceFromInput]
  );
  useEffect(() => {
    if (estimateSuggestedTouched) {
      return;
    }
    const nextSuggested = estimatedSuggestedPricePreview.toFixed(2);
    setEstimateForm((current) =>
      current.suggested_price === nextSuggested
        ? current
        : { ...current, suggested_price: nextSuggested }
    );
  }, [estimateSuggestedTouched, estimatedSuggestedPricePreview]);
  useEffect(() => {
    if (!estimateSuggestedTouched) {
      return;
    }
    const nextMargin =
      estimatedMarginFromSuggested == null ? "" : String(estimatedMarginFromSuggested);
    setEstimateForm((current) =>
      current.target_margin_percent === nextMargin
        ? current
        : { ...current, target_margin_percent: nextMargin }
    );
  }, [estimateSuggestedTouched, estimatedMarginFromSuggested]);
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
  const financeSyncBlocked = !costingDetail?.actual || !financeSyncForm.currency_id;
  const selectedActualTemplate = useMemo(
    () => activeCostTemplates.find((template) => String(template.id) === actualTemplateId) ?? null,
    [activeCostTemplates, actualTemplateId]
  );
  const appliedActualTemplate = useMemo(
    () => costTemplates.find((template) => String(template.id) === appliedActualTemplateId) ?? null,
    [appliedActualTemplateId, costTemplates]
  );
  const appliedActualTemplateLabel = appliedActualTemplate?.name ?? selectedActualTemplate?.name ?? "";
  const financeSyncMode =
    financeSyncDefaults?.maintenance_finance_sync_mode ??
    tenantInfo?.maintenance_finance_sync_mode ??
    "manual";
  const autoSyncOnClose = financeSyncMode === "auto_on_close";
  const autoSyncIncomeEnabled =
    financeSyncDefaults?.maintenance_finance_auto_sync_income ??
    tenantInfo?.maintenance_finance_auto_sync_income ??
    true;
  const autoSyncExpenseEnabled =
    financeSyncDefaults?.maintenance_finance_auto_sync_expense ??
    tenantInfo?.maintenance_finance_auto_sync_expense ??
    true;
  const activeFinanceAccountIds = useMemo(
    () => new Set(activeFinanceAccounts.map((account) => account.id)),
    [activeFinanceAccounts]
  );
  const activeCurrencyIds = useMemo(
    () => new Set(activeCurrencies.map((currency) => currency.id)),
    [activeCurrencies]
  );
  const closeAutoSyncIssues = useMemo(() => {
    if (!autoSyncOnClose) {
      return [] as string[];
    }

    const issues: string[] = [];
    const policyCurrencyId =
      financeSyncDefaults?.maintenance_finance_currency_id ??
      tenantInfo?.maintenance_finance_currency_id ??
      null;
    const policyIncomeAccountId =
      financeSyncDefaults?.maintenance_finance_income_account_id ??
      tenantInfo?.maintenance_finance_income_account_id ??
      null;
    const policyExpenseAccountId =
      financeSyncDefaults?.maintenance_finance_expense_account_id ??
      tenantInfo?.maintenance_finance_expense_account_id ??
      null;
    const requiresIncomeSync = autoSyncIncomeEnabled && normalizeNumericInput(actualForm.actual_price_charged) > 0;
    const requiresExpenseSync = autoSyncExpenseEnabled && actualTotalPreview > 0;

    if ((requiresIncomeSync || requiresExpenseSync) && !policyCurrencyId) {
      issues.push(
        language === "es"
          ? "falta la moneda por defecto en Resumen"
          : "the default currency in Overview is missing"
      );
    }
    if (policyCurrencyId && !activeCurrencyIds.has(policyCurrencyId)) {
      issues.push(
        language === "es"
          ? "la moneda por defecto de Resumen no está activa en Finanzas"
          : "the default currency from Overview is not active in Finance"
      );
    }
    if (policyIncomeAccountId && !activeFinanceAccountIds.has(policyIncomeAccountId)) {
      issues.push(
        language === "es"
          ? "la cuenta de ingreso por defecto no está activa en Finanzas"
          : "the default income account is not active in Finance"
      );
    }
    if (policyExpenseAccountId && !activeFinanceAccountIds.has(policyExpenseAccountId)) {
      issues.push(
        language === "es"
          ? "la cuenta de egreso por defecto no está activa en Finanzas"
          : "the default expense account is not active in Finance"
      );
    }

    return issues;
  }, [
    activeCurrencyIds,
    activeFinanceAccountIds,
    actualForm.actual_price_charged,
    actualTotalPreview,
    autoSyncExpenseEnabled,
    autoSyncIncomeEnabled,
    autoSyncOnClose,
    financeSyncDefaults?.maintenance_finance_currency_id,
    financeSyncDefaults?.maintenance_finance_expense_account_id,
    financeSyncDefaults?.maintenance_finance_income_account_id,
    language,
    tenantInfo?.maintenance_finance_currency_id,
    tenantInfo?.maintenance_finance_expense_account_id,
    tenantInfo?.maintenance_finance_income_account_id,
  ]);
  const canCompleteFromModal =
    !isReadOnly &&
    allowComplete &&
    workOrder?.maintenance_status !== "completed" &&
    workOrder?.maintenance_status !== "cancelled";
  const isWorkOrderClosed =
    workOrder?.maintenance_status === "completed" || workOrder?.maintenance_status === "cancelled";
  const closeBlockedByFinancePolicy = canCompleteFromModal && autoSyncOnClose && closeAutoSyncIssues.length > 0;
  const financeTransactionDatePreview = useMemo(
    () =>
      toDateTimeLocalInputValue(
        workOrder?.completed_at ?? new Date().toISOString(),
        effectiveTimeZone
      ),
    [effectiveTimeZone, workOrder?.completed_at]
  );

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
          templatesResponse,
          defaultsResponse,
        ] =
          await Promise.all([
            getTenantMaintenanceWorkOrderCosting(currentAccessToken, currentWorkOrder.id),
            getTenantFinanceAccounts(currentAccessToken, false),
            getTenantFinanceCategories(currentAccessToken, { includeInactive: false }),
            getTenantFinanceCurrencies(currentAccessToken, false),
            getTenantMaintenanceCostTemplates(currentAccessToken, { includeInactive: false }),
            getTenantMaintenanceFinanceSyncDefaults(currentAccessToken),
          ]);

        if (cancelled) {
          return;
        }

        const detail = costingResponse.data;
        const accounts = accountsResponse.data;
        const categories = categoriesResponse.data;
        const currencies = currenciesResponse.data;
        const syncDefaults = defaultsResponse.data;
        const templates = sortCostTemplates(templatesResponse.data);
        const generalTemplates = templates.filter(
          (template) => template.is_active && template.task_type_id == null
        );
        const specificTemplates = taskTypeId
          ? templates.filter((template) => template.is_active && template.task_type_id === taskTypeId)
          : [];
        const matchingTemplates = specificTemplates.length > 0 ? specificTemplates : generalTemplates;
        const otherTemplates = templates.filter(
          (template) =>
            template.is_active &&
            template.task_type_id != null &&
            (!taskTypeId || template.task_type_id !== taskTypeId)
        );
        const selectableTemplates = [
          ...matchingTemplates,
          ...generalTemplates.filter(
            (template) => !matchingTemplates.some((candidate) => candidate.id === template.id)
          ),
          ...otherTemplates,
        ];
        const autoTemplate = matchingTemplates.length === 1 ? matchingTemplates[0] : null;
        const defaultCurrency = currencies.find((currency) => currency.is_base) || currencies[0];
        const hasEstimateData = hasMeaningfulEstimateData(detail.estimate, detail.estimate_lines);
        const hasActualData = hasMeaningfulActualData(detail.actual, detail.actual_lines);

        setFinanceAccounts(accounts);
        setFinanceCategories(categories);
        setFinanceCurrencies(currencies);
        setFinanceSyncDefaults(syncDefaults);
        setCostingDetail(detail);
        setCostTemplates(templates);

        setEstimateForm(buildDefaultCostEstimateForm(detail.estimate));
        setEstimateLines(buildDefaultCostLines(detail.estimate_lines));
        if (detail.estimate?.suggested_price != null) {
          const computed = getSuggestedPriceForEstimateData(
            detail.estimate,
            detail.estimate_lines
          );
          setEstimateSuggestedTouched(
            Number(detail.estimate.suggested_price) !== Number(computed)
          );
        } else {
          setEstimateSuggestedTouched(false);
        }

        if (autoTemplate && !hasActualData) {
          setActualLines([]);
          setActualForm({
            ...buildActualFormFromTemplate(autoTemplate),
            notes: autoTemplate.estimate_notes ?? detail.actual?.notes ?? "",
          });
          setAppliedActualTemplateId(String(autoTemplate.id));
        } else {
          setActualForm(buildDefaultCostActualForm(detail.actual));
          setActualLines(buildDefaultCostLines(detail.actual_lines));
          setAppliedActualTemplateId(
            detail.actual?.applied_cost_template_id != null
              ? String(detail.actual.applied_cost_template_id)
              : null
          );
        }

        const preferredTemplateId = String(
          autoTemplate?.id ?? selectableTemplates[0]?.id ?? templates[0]?.id ?? ""
        );
        setActualTemplateId(preferredTemplateId);

        setCostBaseMessage(
          matchingTemplates.length > 1
            ? language === "es"
              ? `Hay varias plantillas activas para ${taskTypeLabel || "esta mantención"}. Selecciona la que quieras aplicar al costo real.`
              : `There are multiple active templates for ${taskTypeLabel || "this maintenance"}. Choose the one you want to apply to actual cost.`
            : autoTemplate && !hasActualData
              ? language === "es"
                ? `Se cargó automáticamente la plantilla ${autoTemplate.name} en el costo real.`
                : `Template ${autoTemplate.name} was loaded automatically into actual cost.`
              : templates.length > 0
                ? language === "es"
                  ? "Puedes reutilizar cualquier plantilla activa creada previamente desde Plantillas de mantención."
                  : "You can reuse any previously created active template from Maintenance templates."
                : null
        );

        setCompletionNote(currentWorkOrder.closure_notes ?? "");
        setUseCustomTransactionAt(false);
        setFinanceSyncForm(
          buildFinanceSyncFormFromDetail({
            detail,
            syncDefaults,
            accounts,
            categories,
            currencies,
            defaultCurrencyId: defaultCurrency?.id ?? null,
            workOrder: currentWorkOrder,
            clientLabel,
            siteLabel,
            installationLabel,
            language,
            effectiveTimeZone,
          })
        );
      } catch (rawError) {
        if (!cancelled) {
          setFinanceSyncDefaults(null);
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
  }, [
    accessToken,
    effectiveTimeZone,
    isOpen,
    language,
    taskTypeId,
    taskTypeLabel,
    tenantInfo?.maintenance_finance_auto_sync_expense,
    tenantInfo?.maintenance_finance_auto_sync_income,
    tenantInfo?.maintenance_finance_currency_id,
    tenantInfo?.maintenance_finance_expense_account_id,
    tenantInfo?.maintenance_finance_expense_category_id,
    tenantInfo?.maintenance_finance_income_account_id,
    tenantInfo?.maintenance_finance_income_category_id,
    workOrder,
  ]);

  if (!isOpen || !workOrder) {
    return null;
  }

  const currentWorkOrder = workOrder;
  const readonlyFinanceSyncState = getReadonlyFinanceSyncState(costingDetail?.actual);

  function applyEstimateTemplate(template: TenantMaintenanceCostTemplate) {
    if (isReadOnly) {
      return;
    }
    setEstimateLines(buildCostLineFormsFromTemplate(template));
    setEstimateForm(buildEstimateFormFromTemplate(template));
    setEstimateSuggestedTouched(false);
    setCostBaseMessage(
      language === "es"
        ? `Plantilla ${template.name} aplicada al costeo estimado. Puedes ajustar líneas, margen y notas antes de guardar.`
        : `Template ${template.name} applied to the estimated costing. You can edit lines, margin, and notes before saving.`
    );
  }

  function applyActualTemplate(template: TenantMaintenanceCostTemplate) {
    if (isReadOnly) {
      return;
    }
    setActualTemplateId(String(template.id));
    setActualLines([]);
    setActualForm(buildActualFormFromTemplate(template));
    setAppliedActualTemplateId(String(template.id));
    setCostBaseMessage(
      language === "es"
        ? `Plantilla ${template.name} copiada al costo real y cobro. Los valores quedaron libres para que ajustes traslado, materiales, cobro o agregues líneas manuales si lo necesitas.`
        : `Template ${template.name} was copied into actual cost and billing. Values remain editable so you can adjust travel, materials, charged amount, or add manual lines if needed.`
    );
  }

  function clearActualTemplateTrace() {
    if (isReadOnly) {
      return;
    }
    setAppliedActualTemplateId(null);
    setCostBaseMessage(
      language === "es"
        ? "Se quitó la trazabilidad de plantilla del cierre real. Los valores actuales se conservan como cierre manual."
        : "Template traceability was removed from the real close. Current values are kept as a manual close."
    );
  }

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

  function toggleEstimateLineExpense(index: number, value: boolean) {
    if (isReadOnly) {
      return;
    }
    setEstimateLines((current) =>
      current.map((line, currentIndex) =>
        currentIndex === index ? { ...line, include_in_expense: value } : line
      )
    );
  }

  function toggleActualLineExpense(index: number, value: boolean) {
    if (isReadOnly) {
      return;
    }
    setActualLines((current) =>
      current.map((line, currentIndex) =>
        currentIndex === index ? { ...line, include_in_expense: value } : line
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

  async function handleEstimateSubmit() {
    if (!accessToken) {
      return;
    }
    setIsEstimateSubmitting(true);
    setError(null);
    try {
      const response = await updateTenantMaintenanceWorkOrderCostEstimate(accessToken, currentWorkOrder.id, {
        labor_cost: normalizeNumericInput(estimateForm.labor_cost),
        travel_cost: normalizeNumericInput(estimateForm.travel_cost),
        materials_cost: normalizeNumericInput(estimateForm.materials_cost),
        external_services_cost: normalizeNumericInput(estimateForm.external_services_cost),
        overhead_cost: normalizeNumericInput(estimateForm.overhead_cost),
        target_margin_percent: normalizeNumericInput(estimateForm.target_margin_percent),
        suggested_price: normalizeNullable(estimateForm.suggested_price)
          ? normalizeNumericInput(estimateForm.suggested_price)
          : null,
        notes: normalizeNullable(estimateForm.notes),
        lines: normalizeLineWritePayload(estimateLines),
      });
      setCostingDetail(response.data);
      setEstimateForm(buildDefaultCostEstimateForm(response.data.estimate));
      setEstimateLines(buildDefaultCostLines(response.data.estimate_lines));
      setEstimateSuggestedTouched(false);
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
      const response = await updateTenantMaintenanceWorkOrderCostActual(accessToken, currentWorkOrder.id, {
        labor_cost: normalizeNumericInput(actualForm.labor_cost),
        travel_cost: normalizeNumericInput(actualForm.travel_cost),
        materials_cost: normalizeNumericInput(actualForm.materials_cost),
        external_services_cost: normalizeNumericInput(actualForm.external_services_cost),
        overhead_cost: normalizeNumericInput(actualForm.overhead_cost),
        actual_price_charged: normalizeNumericInput(actualForm.actual_price_charged),
        applied_template_id: appliedActualTemplateId ? Number(appliedActualTemplateId) : null,
        notes: normalizeNullable(actualForm.notes),
        lines: normalizeLineWritePayload(actualLines),
      });
      setCostingDetail(response.data);
      setActualForm(buildDefaultCostActualForm(response.data.actual));
      setActualLines(buildDefaultCostLines(response.data.actual_lines));
      setAppliedActualTemplateId(
        response.data.actual?.applied_cost_template_id != null
          ? String(response.data.actual.applied_cost_template_id)
          : null
      );
      if (financeSyncDefaults) {
        setFinanceSyncForm(
          buildFinanceSyncFormFromDetail({
            detail: response.data,
            syncDefaults: financeSyncDefaults,
            accounts: financeAccounts,
            categories: financeCategories,
            currencies: financeCurrencies,
            defaultCurrencyId:
              financeSyncDefaults.maintenance_finance_currency_id ??
              financeCurrencies.find((currency) => currency.is_base)?.id ??
              financeCurrencies[0]?.id ??
              null,
            workOrder: currentWorkOrder,
            clientLabel,
            siteLabel,
            installationLabel,
            language,
            effectiveTimeZone,
          })
        );
      }
      onFeedback?.(response.message);
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsActualSubmitting(false);
    }
  }

  async function handleCompleteWithActualCost() {
    if (!accessToken || !canCompleteFromModal || closeBlockedByFinancePolicy) {
      return;
    }
    const confirmed = window.confirm(
      language === "es"
        ? `Vas a cerrar definitivamente la mantención "${currentWorkOrder.title}". Se guardará el costo real y la OT saldrá de la bandeja activa hacia Historial. Si fue un error, la reapertura debe hacerse con reversa manual de estado. ¿Deseas continuar?`
        : `You are about to definitively close maintenance "${currentWorkOrder.title}". The actual cost will be saved and the work order will move from the active tray to History. If this was a mistake, reopening requires a manual status rollback. Do you want to continue?`
    );
    if (!confirmed) {
      return;
    }
    setIsCompleting(true);
    setError(null);
    try {
      const selectedFinanceSyncPayload = financeSyncForm.currency_id
        ? {
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
            transaction_at:
              useCustomTransactionAt && financeSyncForm.transaction_at
                ? fromDateTimeLocalInputValue(financeSyncForm.transaction_at, effectiveTimeZone)
                : null,
            income_description: financeSyncForm.income_description
              ? financeSyncForm.income_description.trim()
              : null,
            expense_description: financeSyncForm.expense_description
              ? financeSyncForm.expense_description.trim()
              : null,
            notes: normalizeNullable(financeSyncForm.notes),
          }
        : null;

      const costingResponse = await updateTenantMaintenanceWorkOrderCostActual(accessToken, currentWorkOrder.id, {
        labor_cost: normalizeNumericInput(actualForm.labor_cost),
        travel_cost: normalizeNumericInput(actualForm.travel_cost),
        materials_cost: normalizeNumericInput(actualForm.materials_cost),
        external_services_cost: normalizeNumericInput(actualForm.external_services_cost),
        overhead_cost: normalizeNumericInput(actualForm.overhead_cost),
        actual_price_charged: normalizeNumericInput(actualForm.actual_price_charged),
        applied_template_id: appliedActualTemplateId ? Number(appliedActualTemplateId) : null,
        notes: normalizeNullable(actualForm.notes),
        lines: normalizeLineWritePayload(actualLines),
      });
      setCostingDetail(costingResponse.data);
      setActualForm(buildDefaultCostActualForm(costingResponse.data.actual));
      setActualLines(buildDefaultCostLines(costingResponse.data.actual_lines));
      setAppliedActualTemplateId(
        costingResponse.data.actual?.applied_cost_template_id != null
          ? String(costingResponse.data.actual.applied_cost_template_id)
          : null
      );
      if (financeSyncDefaults) {
        setFinanceSyncForm(
          buildFinanceSyncFormFromDetail({
            detail: costingResponse.data,
            syncDefaults: financeSyncDefaults,
            accounts: financeAccounts,
            categories: financeCategories,
            currencies: financeCurrencies,
            defaultCurrencyId:
              financeSyncDefaults.maintenance_finance_currency_id ??
              financeCurrencies.find((currency) => currency.is_base)?.id ??
              financeCurrencies[0]?.id ??
              null,
            workOrder: currentWorkOrder,
            clientLabel,
            siteLabel,
            installationLabel,
            language,
            effectiveTimeZone,
          })
        );
      }

      const statusResponse = await updateTenantMaintenanceWorkOrderStatus(
        accessToken,
        currentWorkOrder.id,
        "completed",
        normalizeNullable(completionNote)
      );

      if (
        selectedFinanceSyncPayload &&
        (selectedFinanceSyncPayload.sync_income || selectedFinanceSyncPayload.sync_expense)
      ) {
        const financeResponse = await syncTenantMaintenanceWorkOrderToFinance(
          accessToken,
          currentWorkOrder.id,
          selectedFinanceSyncPayload
        );
        setCostingDetail(financeResponse.data);
        if (financeSyncDefaults) {
          setFinanceSyncForm(
            buildFinanceSyncFormFromDetail({
              detail: financeResponse.data,
              syncDefaults: financeSyncDefaults,
              accounts: financeAccounts,
              categories: financeCategories,
              currencies: financeCurrencies,
              defaultCurrencyId:
                financeSyncDefaults.maintenance_finance_currency_id ??
                financeCurrencies.find((currency) => currency.is_base)?.id ??
                financeCurrencies[0]?.id ??
                null,
              workOrder: currentWorkOrder,
              clientLabel,
              siteLabel,
              installationLabel,
              language,
              effectiveTimeZone,
            })
          );
        }
      }

      onFeedback?.(
        language === "es"
          ? "Costo real guardado, mantención cerrada y sincronización financiera aplicada correctamente"
          : "Actual cost saved, maintenance closed, and finance sync applied successfully"
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
      if (!isReadOnly) {
        const savedActualResponse = await updateTenantMaintenanceWorkOrderCostActual(accessToken, currentWorkOrder.id, {
          labor_cost: normalizeNumericInput(actualForm.labor_cost),
          travel_cost: normalizeNumericInput(actualForm.travel_cost),
          materials_cost: normalizeNumericInput(actualForm.materials_cost),
          external_services_cost: normalizeNumericInput(actualForm.external_services_cost),
          overhead_cost: normalizeNumericInput(actualForm.overhead_cost),
          actual_price_charged: normalizeNumericInput(actualForm.actual_price_charged),
          applied_template_id: appliedActualTemplateId ? Number(appliedActualTemplateId) : null,
          notes: normalizeNullable(actualForm.notes),
          lines: normalizeLineWritePayload(actualLines),
        });
        setCostingDetail(savedActualResponse.data);
        setActualForm(buildDefaultCostActualForm(savedActualResponse.data.actual));
        setActualLines(buildDefaultCostLines(savedActualResponse.data.actual_lines));
        setAppliedActualTemplateId(
          savedActualResponse.data.actual?.applied_cost_template_id != null
            ? String(savedActualResponse.data.actual.applied_cost_template_id)
            : null
        );
      }

      const response = await syncTenantMaintenanceWorkOrderToFinance(accessToken, currentWorkOrder.id, {
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
        transaction_at: useCustomTransactionAt && financeSyncForm.transaction_at
          ? fromDateTimeLocalInputValue(financeSyncForm.transaction_at, effectiveTimeZone)
          : null,
        income_description: financeSyncForm.income_description
          ? financeSyncForm.income_description.trim()
          : null,
        expense_description: financeSyncForm.expense_description
          ? financeSyncForm.expense_description.trim()
          : null,
        notes: normalizeNullable(financeSyncForm.notes),
      });
      setCostingDetail(response.data);
      if (financeSyncDefaults) {
        setFinanceSyncForm(
          buildFinanceSyncFormFromDetail({
            detail: response.data,
            syncDefaults: financeSyncDefaults,
            accounts: financeAccounts,
            categories: financeCategories,
            currencies: financeCurrencies,
            defaultCurrencyId:
              financeSyncDefaults.maintenance_finance_currency_id ??
              financeCurrencies.find((currency) => currency.is_base)?.id ??
              financeCurrencies[0]?.id ??
              null,
            workOrder: currentWorkOrder,
            clientLabel,
            siteLabel,
            installationLabel,
            language,
            effectiveTimeZone,
          })
        );
      } else {
        setFinanceSyncForm((current) => ({
          ...current,
          notes: response.data.actual?.notes ?? current.notes,
        }));
      }
      onFeedback?.(response.message);
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsFinanceSyncSubmitting(false);
    }
  }

  const costLineTypeOptions = [
    { value: "labor", label: language === "es" ? "Mano de obra" : "Labor" },
    { value: "travel", label: language === "es" ? "Traslado" : "Travel" },
    { value: "material", label: language === "es" ? "Material" : "Material" },
    { value: "service", label: language === "es" ? "Servicio externo" : "External service" },
    { value: "overhead", label: language === "es" ? "Indirecto" : "Overhead" },
  ];

  function buildTemplateLabel(template: TenantMaintenanceCostTemplate) {
    if (template.task_type_id === taskTypeId && taskTypeLabel) {
      return `${template.name} · ${taskTypeLabel}`;
    }
    if (template.task_type_id == null) {
      return language === "es" ? `${template.name} · General` : `${template.name} · General`;
    }
    return language === "es" ? `${template.name} · Otra tarea` : `${template.name} · Other task`;
  }

  function renderTemplatePreview(
    template: TenantMaintenanceCostTemplate,
    options?: {
      traced?: boolean;
      allowClearTrace?: boolean;
    }
  ) {
    const baseCost = getTemplateBaseCost(template);
    const lineCount = template.lines.length;
    return (
      <div className={`alert ${options?.traced ? "alert-secondary" : "alert-light"} mb-0`}>
        <div className="d-flex flex-column flex-md-row justify-content-between gap-2">
          <div>
            <div className="maintenance-history-entry__title">{template.name}</div>
            <div className="maintenance-history-entry__meta">
              {template.description?.trim()
                ? template.description
                : language === "es"
                  ? "Sin descripción adicional en la plantilla."
                  : "No extra template description."}
            </div>
          </div>
          {options?.allowClearTrace ? (
            <div className="d-flex align-items-start">
              <button className="btn btn-sm btn-outline-secondary" type="button" onClick={clearActualTemplateTrace}>
                {language === "es" ? "Quitar traza" : "Clear trace"}
              </button>
            </div>
          ) : null}
        </div>
        <div className="row g-2 mt-1">
          <div className="col-12 col-md-3">
            <div className="maintenance-history-entry__meta">
              {language === "es" ? "Costo base" : "Base cost"}: {baseCost.toFixed(2)}
            </div>
          </div>
          <div className="col-12 col-md-3">
            <div className="maintenance-history-entry__meta">
              {language === "es" ? "Líneas" : "Lines"}: {lineCount}
            </div>
          </div>
          <div className="col-12 col-md-3">
            <div className="maintenance-history-entry__meta">
              {language === "es" ? "Margen base" : "Base margin"}: {template.estimate_target_margin_percent.toFixed(2)}%
            </div>
          </div>
          <div className="col-12 col-md-3">
            <div className="maintenance-history-entry__meta">
              {language === "es" ? "Usos" : "Usages"}: {template.usage_count}
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderLineEditor(
    lines: MaintenanceCostLineFormState[],
    onAdd: () => void,
    onUpdate: (index: number, key: MaintenanceEditableCostLineKey, value: string) => void,
    onToggleExpense: (index: number, value: boolean) => void,
    onRemove: (index: number) => void,
    readOnly = false,
    showExpenseToggle = true
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
            <div className="maintenance-history-entry__meta">
              {language === "es"
                ? "Solo las líneas marcadas como egreso se suman al costo y a Finanzas."
                : "Only lines marked as expense are included in totals and Finance sync."}
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
                    {showExpenseToggle ? (
                      <div className="col-4 col-md-2">
                        <label className="form-label">
                          {language === "es" ? "Egreso" : "Expense"}
                        </label>
                        <div className="form-check">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            checked={line.include_in_expense}
                            disabled={readOnly}
                            onChange={(event) => onToggleExpense(index, event.target.checked)}
                          />
                          <label className="form-check-label">
                            {language === "es" ? "Considerar" : "Include"}
                          </label>
                        </div>
                      </div>
                    ) : null}
                    {!readOnly ? (
                      <div className="col-12 col-md-2 maintenance-cost-lines__remove">
                        <button className="btn btn-outline-danger" type="button" onClick={() => onRemove(index)}>
                          {language === "es" ? "Quitar" : "Remove"}
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
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
                ? "Histórico de costos y cobro · solo lectura"
                : "Costing history"
              : language === "es"
                ? "Costos y cobro"
                : "Costing and billing"
          }
          subtitle={
            isReadOnly
              ? language === "es"
                ? "Consulta el cierre económico ya registrado para esta mantención. Esta vista no sincroniza Finanzas ni modifica el histórico."
                : "Review the registered financial close for this maintenance without changing history."
              : language === "es"
                ? "Aplica una plantilla al costo real, ajusta el cobro y sincroniza los movimientos a Finanzas. El estimado queda como referencia opcional."
                : "Apply a template to actual cost, adjust billing, and sync transactions into Finance. The estimate remains optional reference."
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
                  {language === "es" ? "Ventana operativa" : "Operational window"}:{" "}
                  {formatDateTimeInTimeZone(
                    currentWorkOrder.completed_at || currentWorkOrder.scheduled_for || currentWorkOrder.requested_at,
                    language,
                    effectiveTimeZone
                  )}
                </div>
              </div>

              {isReadOnly ? (
                readonlyFinanceSyncState === "synced" ? (
                  <div className="alert alert-success mb-0">
                    <div>
                      {language === "es"
                        ? "Esta mantención ya quedó reflejada en Finanzas."
                        : "This maintenance is already reflected in Finance."}
                    </div>
                    <div className="maintenance-history-entry__meta mt-2">
                      {language === "es" ? "Ingreso vinculado" : "Linked income"}:{" "}
                      {costingDetail?.actual?.income_transaction_id ?? "—"} ·{" "}
                      {language === "es" ? "Egreso vinculado" : "Linked expense"}:{" "}
                      {costingDetail?.actual?.expense_transaction_id ?? "—"} ·{" "}
                      {language === "es" ? "Última sync" : "Last sync"}:{" "}
                      {costingDetail?.actual?.finance_synced_at
                        ? formatDateTimeInTimeZone(
                            costingDetail.actual.finance_synced_at,
                            language,
                            effectiveTimeZone
                          )
                        : "—"}
                    </div>
                  </div>
                ) : readonlyFinanceSyncState === "not_synced" ? (
                  <div className="alert alert-warning mb-0">
                    <div>
                      {language === "es"
                        ? "Esta mantención tiene costo real guardado, pero no muestra vínculo con Finanzas."
                        : "This maintenance has saved actual cost, but it does not show a Finance link."}
                    </div>
                    <div className="maintenance-history-entry__meta mt-2">
                      {language === "es"
                        ? "Esta vista es solo histórica. Si necesitas corregir o forzar la sincronización, usa Editar cierre o el flujo operativo de la OT."
                        : "This view is read-only. If you need to correct or force synchronization, use Edit closure or the operational work-order flow."}
                    </div>
                  </div>
                ) : (
                  <div className="alert alert-secondary mb-0">
                    {language === "es"
                      ? "Esta mantención no tiene todavía un cierre económico registrado."
                      : "This maintenance does not have a registered financial close yet."}
                  </div>
                )
              ) : null}

              {!isReadOnly && costBaseMessage ? (
                <div className="alert alert-info mb-0">{costBaseMessage}</div>
              ) : null}

              {!isReadOnly ? (
                <div>
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    type="button"
                    onClick={() => setShowEstimateSection((current) => !current)}
                  >
                    {showEstimateSection
                      ? language === "es"
                        ? "Ocultar costeo estimado"
                        : "Hide estimated costing"
                      : language === "es"
                        ? "Mostrar costeo estimado (opcional)"
                        : "Show estimated costing (optional)"}
                  </button>
                </div>
              ) : null}

              {showEstimateSection ? (
                <form
                  className="maintenance-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (!isReadOnly) {
                      void handleEstimateSubmit();
                    }
                  }}
                >
                  <div className="maintenance-history-entry">
                    <div className="maintenance-history-entry__title">
                      {language === "es" ? "Costeo estimado" : "Estimated costing"}
                    </div>
                    <div className="maintenance-history-entry__meta">
                      {language === "es"
                        ? "Referencia interna para planificación. No necesitas completarlo si el flujo operativo se maneja en costo real."
                        : "Internal planning reference. You can skip it if your operational flow is handled in actual cost."}
                    </div>
                    <div className="row g-3 mt-1">
                      <div className="col-12 col-md-4"><label className="form-label">{language === "es" ? "Mano de obra" : "Labor"}</label><input className="form-control" type="number" min="0" step="0.01" value={estimateUsesLines ? estimateLineTotals.labor_cost.toFixed(2) : estimateForm.labor_cost} onChange={(event) => setEstimateForm((current) => ({ ...current, labor_cost: event.target.value }))} disabled={estimateUsesLines || isReadOnly} /></div>
                      <div className="col-12 col-md-4"><label className="form-label">{language === "es" ? "Traslado" : "Travel"}</label><input className="form-control" type="number" min="0" step="0.01" value={estimateUsesLines ? estimateLineTotals.travel_cost.toFixed(2) : estimateForm.travel_cost} onChange={(event) => setEstimateForm((current) => ({ ...current, travel_cost: event.target.value }))} disabled={estimateUsesLines || isReadOnly} /></div>
                      <div className="col-12 col-md-4"><label className="form-label">{language === "es" ? "Materiales" : "Materials"}</label><input className="form-control" type="number" min="0" step="0.01" value={estimateUsesLines ? estimateLineTotals.materials_cost.toFixed(2) : estimateForm.materials_cost} onChange={(event) => setEstimateForm((current) => ({ ...current, materials_cost: event.target.value }))} disabled={estimateUsesLines || isReadOnly} /></div>
                      <div className="col-12 col-md-4"><label className="form-label">{language === "es" ? "Servicios externos" : "External services"}</label><input className="form-control" type="number" min="0" step="0.01" value={estimateUsesLines ? estimateLineTotals.external_services_cost.toFixed(2) : estimateForm.external_services_cost} onChange={(event) => setEstimateForm((current) => ({ ...current, external_services_cost: event.target.value }))} disabled={estimateUsesLines || isReadOnly} /></div>
                      <div className="col-12 col-md-4"><label className="form-label">{language === "es" ? "Indirectos" : "Overhead"}</label><input className="form-control" type="number" min="0" step="0.01" value={estimateUsesLines ? estimateLineTotals.overhead_cost.toFixed(2) : estimateForm.overhead_cost} onChange={(event) => setEstimateForm((current) => ({ ...current, overhead_cost: event.target.value }))} disabled={estimateUsesLines || isReadOnly} /></div>
                      <div className="col-12 col-md-4">
                        <label className="form-label">{language === "es" ? "Margen objetivo (%)" : "Target margin (%)"}</label>
                        <input
                          className="form-control"
                          type="number"
                          min="0"
                          max="99.99"
                          step="0.01"
                          value={estimateForm.target_margin_percent}
                          onChange={(event) => {
                            setEstimateSuggestedTouched(false);
                            setEstimateForm((current) => ({
                              ...current,
                              target_margin_percent: event.target.value,
                            }));
                          }}
                          disabled={isReadOnly}
                        />
                        {estimateSuggestedTouched && estimatedMarginFromSuggested != null ? (
                          <div className="form-text">
                            {language === "es"
                              ? `Margen calculado segun precio sugerido: ${estimatedMarginFromSuggested.toFixed(2)}%`
                              : `Calculated margin from suggested price: ${estimatedMarginFromSuggested.toFixed(2)}%`}
                          </div>
                        ) : null}
                      </div>
                      <div className="col-12 col-md-6"><label className="form-label">{language === "es" ? "Costo estimado total" : "Estimated total cost"}</label><input className="form-control" value={estimatedTotalPreview.toFixed(2)} readOnly /></div>
                      <div className="col-12 col-md-6">
                        <label className="form-label">{language === "es" ? "Precio sugerido" : "Suggested price"}</label>
                        <input
                          className="form-control"
                          type="number"
                          min="0"
                          step="0.01"
                          value={estimateForm.suggested_price}
                          onChange={(event) => {
                            setEstimateSuggestedTouched(true);
                            setEstimateForm((current) => ({
                              ...current,
                              suggested_price: event.target.value,
                            }));
                          }}
                          disabled={isReadOnly}
                        />
                        {estimateSuggestedTouched ? (
                          <div className="form-text">
                            {language === "es"
                              ? `Calculado: ${estimatedSuggestedPricePreview.toFixed(2)}`
                              : `Calculated: ${estimatedSuggestedPricePreview.toFixed(2)}`}
                          </div>
                        ) : null}
                      </div>
                      <div className="col-12"><label className="form-label">{language === "es" ? "Notas de estimación" : "Estimate notes"}</label><textarea className="form-control" rows={3} value={estimateForm.notes} onChange={(event) => setEstimateForm((current) => ({ ...current, notes: event.target.value }))} readOnly={isReadOnly} /></div>
                      <div className="col-12">
                        {renderLineEditor(
                          estimateLines,
                          addEstimateLine,
                          updateEstimateLine,
                          toggleEstimateLineExpense,
                          removeEstimateLine,
                          isReadOnly,
                          false
                        )}
                      </div>
                    </div>
                    {!isReadOnly ? (
                      <div className="maintenance-form__actions">
                        <button className="btn btn-outline-primary" type="submit" disabled={isEstimateSubmitting}>
                          {isEstimateSubmitting ? (language === "es" ? "Guardando..." : "Saving...") : language === "es" ? "Guardar estimado" : "Save estimate"}
                        </button>
                      </div>
                    ) : null}
                  </div>
                </form>
              ) : null}

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
                      ? "Aquí la plantilla solo copia valores base al resumen real. Después puedes ajustar traslado, materiales, cobro o agregar líneas manuales para detallar el cierre real."
                      : "Here the template only copies base values into the real summary. You can then adjust travel, materials, charged amount, or add manual lines to detail the real close."}
                  </div>
                  {costingDetail?.actual?.applied_cost_template_name_snapshot ? (
                    <div className="maintenance-history-entry__meta mt-2">
                      {language === "es"
                        ? `Plantilla trazada al cierre real: ${costingDetail.actual.applied_cost_template_name_snapshot}`
                        : `Template traced on the real close: ${costingDetail.actual.applied_cost_template_name_snapshot}`}
                    </div>
                  ) : !isReadOnly && appliedActualTemplateId && appliedActualTemplateLabel ? (
                    <div className="maintenance-history-entry__meta mt-2">
                      {language === "es"
                        ? `Se guardará trazabilidad del cierre real usando la plantilla ${appliedActualTemplateLabel}.`
                        : `The real close will keep traceability using template ${appliedActualTemplateLabel}.`}
                    </div>
                  ) : null}
                  <div className="row g-3 mt-1">
                    {!isReadOnly ? (
                      <>
                        <div className="col-12 col-md-8">
                          <label className="form-label">{language === "es" ? "Plantilla base" : "Base template"}</label>
                          <select
                            className="form-select"
                            value={actualTemplateId}
                            onChange={(event) => setActualTemplateId(event.target.value)}
                          >
                            <option value="">{language === "es" ? "Selecciona una plantilla" : "Select a template"}</option>
                            {preferredCostTemplates.map((template) => (
                              <option key={template.id} value={String(template.id)}>
                                {buildTemplateLabel(template)}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="col-12 col-md-4 d-flex align-items-end">
                          <button
                            className="btn btn-outline-secondary w-100"
                            type="button"
                            onClick={() => selectedActualTemplate && applyActualTemplate(selectedActualTemplate)}
                            disabled={!selectedActualTemplate}
                          >
                            {language === "es" ? "Aplicar plantilla al real" : "Apply template to actual"}
                          </button>
                        </div>
                        {selectedActualTemplate && selectedActualTemplate.id !== appliedActualTemplate?.id ? (
                          <div className="col-12">
                            {renderTemplatePreview(selectedActualTemplate)}
                          </div>
                        ) : null}
                        {appliedActualTemplate ? (
                          <div className="col-12">
                            <div className="maintenance-history-entry__meta mb-2">
                              {language === "es"
                                ? "Plantilla actualmente trazada en el cierre real"
                                : "Template currently traced on the real close"}
                            </div>
                            {renderTemplatePreview(appliedActualTemplate, {
                              traced: true,
                              allowClearTrace: true,
                            })}
                          </div>
                        ) : null}
                      </>
                    ) : null}
                    <div className="col-12 col-md-4"><label className="form-label">{language === "es" ? "Mano de obra real" : "Actual labor"}</label><input className="form-control" type="number" min="0" step="0.01" value={actualUsesLines ? actualLineTotals.labor_cost.toFixed(2) : actualForm.labor_cost} onChange={(event) => setActualForm((current) => ({ ...current, labor_cost: event.target.value }))} disabled={actualUsesLines || isReadOnly} /></div>
                    <div className="col-12 col-md-4"><label className="form-label">{language === "es" ? "Traslado real" : "Actual travel"}</label><input className="form-control" type="number" min="0" step="0.01" value={actualUsesLines ? actualLineTotals.travel_cost.toFixed(2) : actualForm.travel_cost} onChange={(event) => setActualForm((current) => ({ ...current, travel_cost: event.target.value }))} disabled={actualUsesLines || isReadOnly} /></div>
                    <div className="col-12 col-md-4"><label className="form-label">{language === "es" ? "Materiales reales" : "Actual materials"}</label><input className="form-control" type="number" min="0" step="0.01" value={actualUsesLines ? actualLineTotals.materials_cost.toFixed(2) : actualForm.materials_cost} onChange={(event) => setActualForm((current) => ({ ...current, materials_cost: event.target.value }))} disabled={actualUsesLines || isReadOnly} /></div>
                    <div className="col-12 col-md-4"><label className="form-label">{language === "es" ? "Servicios externos reales" : "Actual external services"}</label><input className="form-control" type="number" min="0" step="0.01" value={actualUsesLines ? actualLineTotals.external_services_cost.toFixed(2) : actualForm.external_services_cost} onChange={(event) => setActualForm((current) => ({ ...current, external_services_cost: event.target.value }))} disabled={actualUsesLines || isReadOnly} /></div>
                    <div className="col-12 col-md-4"><label className="form-label">{language === "es" ? "Indirectos reales" : "Actual overhead"}</label><input className="form-control" type="number" min="0" step="0.01" value={actualUsesLines ? actualLineTotals.overhead_cost.toFixed(2) : actualForm.overhead_cost} onChange={(event) => setActualForm((current) => ({ ...current, overhead_cost: event.target.value }))} disabled={actualUsesLines || isReadOnly} /></div>
                    <div className="col-12 col-md-4"><label className="form-label">{language === "es" ? "Monto cobrado" : "Amount charged"}</label><input className="form-control" type="number" min="0" step="0.01" value={actualForm.actual_price_charged} onChange={(event) => setActualForm((current) => ({ ...current, actual_price_charged: event.target.value }))} disabled={isReadOnly} /></div>
                    <div className="col-12 col-md-4"><label className="form-label">{language === "es" ? "Costo real total" : "Actual total cost"}</label><input className="form-control" value={actualTotalPreview.toFixed(2)} readOnly /></div>
                    <div className="col-12 col-md-4"><label className="form-label">{language === "es" ? "Utilidad" : "Profit"}</label><input className="form-control" value={actualProfitPreview.toFixed(2)} readOnly /></div>
                    <div className="col-12 col-md-4"><label className="form-label">{language === "es" ? "Margen real (%)" : "Actual margin (%)"}</label><input className="form-control" value={actualMarginPreview === null ? "—" : actualMarginPreview.toFixed(2)} readOnly /></div>
                    <div className="col-12"><label className="form-label">{language === "es" ? "Notas de cierre económico" : "Financial close notes"}</label><textarea className="form-control" rows={3} value={actualForm.notes} onChange={(event) => setActualForm((current) => ({ ...current, notes: event.target.value }))} readOnly={isReadOnly} /></div>
                    {canCompleteFromModal ? (
                      <div className="col-12">
                        <label className="form-label">{language === "es" ? "Nota operativa de cierre" : "Operational closure note"}</label>
                        <textarea className="form-control" rows={2} value={completionNote} onChange={(event) => setCompletionNote(event.target.value)} placeholder={language === "es" ? "Ej.: trabajo ejecutado, repuestos usados, hallazgos y condición de entrega" : "E.g. work performed, used spare parts, findings, and delivery condition"} />
                        <div className="maintenance-history-entry__meta mt-2">
                          {language === "es" ? "Al cerrar desde aquí se guarda primero el costo real y luego se cambia el estado a completada." : "Closing from here saves actual cost first and then changes the status to completed."}
                        </div>
                        <div className={`alert ${autoSyncOnClose ? (closeAutoSyncIssues.length ? "alert-warning" : "alert-info") : "alert-secondary"} mt-3 mb-0`}>
                          {autoSyncOnClose
                            ? closeAutoSyncIssues.length > 0
                              ? language === "es"
                                ? "El tenant está en sincronización automática al cerrar, pero faltan defaults activos en Resumen para garantizar el puente con Finanzas:"
                                : "The tenant is set to auto-sync on close, but active defaults are missing in Overview to guarantee the Finance bridge:"
                              : language === "es"
                                ? "Resumen tiene sincronización automática al cerrar activa. Al guardar y cerrar, el backend sincronizará de inmediato con Finanzas usando esos defaults."
                                : "Overview has auto-sync on close enabled. When you save and close, the backend will sync immediately with Finance using those defaults."
                            : language === "es"
                              ? "Resumen está en modo manual. Este formulario ya parte con los defaults del tenant, pero la sincronización a Finanzas sigue siendo manual hasta que cierres por flujo manual o cambies la política en Resumen."
                              : "Overview is in manual mode. This form already starts with the tenant defaults, but Finance sync remains manual unless you sync here or change the Overview policy."}
                          {closeAutoSyncIssues.length > 0 ? (
                            <ul className="mb-0 mt-2 ps-3">
                              {closeAutoSyncIssues.map((issue) => (
                                <li key={issue}>{issue}</li>
                              ))}
                            </ul>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                    <div className="col-12">
                      {renderLineEditor(
                        actualLines,
                        addActualLine,
                        updateActualLine,
                        toggleActualLineExpense,
                        removeActualLine,
                        isReadOnly
                      )}
                    </div>
                  </div>
                  {!isReadOnly ? (
                    <div className="maintenance-form__actions">
                      <button className="btn btn-outline-primary" type="submit" disabled={isActualSubmitting}>
                        {isActualSubmitting ? (language === "es" ? "Guardando..." : "Saving...") : language === "es" ? "Guardar costo real" : "Save actual cost"}
                      </button>
                      {canCompleteFromModal ? (
                        <button className="btn btn-success" type="button" onClick={() => void handleCompleteWithActualCost()} disabled={isActualSubmitting || isCompleting || closeBlockedByFinancePolicy}>
                          {isCompleting ? (language === "es" ? "Cerrando..." : "Closing...") : language === "es" ? "Guardar y cerrar mantención" : "Save and close maintenance"}
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
                      {isReadOnly ? (language === "es" ? "Vínculo con finanzas · solo lectura" : "Finance link · read only") : autoSyncOnClose ? (isWorkOrderClosed ? (language === "es" ? "Reintento o ajuste de sincronización" : "Finance sync retry or adjustment") : (language === "es" ? "Sincronización manual opcional" : "Optional manual finance sync")) : language === "es" ? "Sincronizar a finanzas" : "Sync to finance"}
                  </div>
                  <div className="maintenance-history-entry__meta">
                      {isReadOnly ? (language === "es" ? "Consulta los vínculos financieros ya registrados para esta mantención cerrada. Esta sección no dispara sincronización." : "Review the financial links already registered for this closed maintenance. This section does not trigger synchronization.") : autoSyncOnClose ? (isWorkOrderClosed ? (language === "es" ? "La OT ya está cerrada. Usa este bloque para reintentar o corregir la sincronización con Finanzas si el intento automático no bastó." : "The work order is already closed. Use this block to retry or correct the Finance sync if the automatic attempt was not enough.") : (language === "es" ? "No hace falta usar este botón para el flujo normal: al guardar y cerrar la mantención, el backend intentará sincronizar automáticamente con Finanzas usando los defaults de Resumen. Este bloque solo sirve si quieres adelantar la sincronización antes del cierre." : "You do not need this button for the normal flow: when you save and close the maintenance, the backend will try to sync automatically with Finance using the Overview defaults. This block only exists if you want to force the sync before closing.")) : language === "es" ? "Crea o actualiza el ingreso y egreso ligados a esta mantención usando source_type/source_id. Los defaults iniciales se cargan desde Resumen." : "Create or update the linked income and expense using source_type/source_id. Initial defaults are loaded from Overview."}
                  </div>
                  {!isReadOnly && (!activeFinanceAccounts.length || !activeCurrencies.length) ? (
                    <div className="alert alert-warning mt-3 mb-0">{language === "es" ? "Primero debes tener cuentas y monedas activas en Finanzas para sincronizar." : "You need active accounts and currencies in Finance before syncing."}</div>
                  ) : null}
                  {!isReadOnly ? (
                    <div className={`alert ${autoSyncOnClose ? "alert-info" : "alert-secondary"} mt-3 mb-0`}>
                      {autoSyncOnClose
                        ? language === "es"
                          ? "Los selectores ya vienen precargados con la sugerencia efectiva resuelta por backend. Si cierras la OT desde este modal, el auto-sync intentará usar esa misma configuración inmediatamente."
                          : "Selectors already start with the effective suggestion resolved by the backend. If you close the work order from this modal, auto-sync will try to use that same configuration immediately."
                        : language === "es"
                          ? "Aunque la política siga manual, este formulario ya propone la misma cuenta, categoría, moneda y toggles resueltos por backend para no volver a configurarlos en cada OT."
                          : "Even if the policy remains manual, this form already suggests the same account, category, currency, and toggles resolved by the backend so they do not need to be reconfigured on every work order."}
                      {financeSuggestionHint ? <div className="mt-2">{financeSuggestionHint}</div> : null}
                    </div>
                  ) : null}
                  <div className="row g-3 mt-1">
                    {isReadOnly ? (
                      <>
                        <div className="col-12 col-md-4"><label className="form-label">{language === "es" ? "Ingreso vinculado" : "Linked income"}</label><input className="form-control" value={String(costingDetail?.actual?.income_transaction_id ?? "—")} readOnly /></div>
                        <div className="col-12 col-md-4"><label className="form-label">{language === "es" ? "Egreso vinculado" : "Linked expense"}</label><input className="form-control" value={String(costingDetail?.actual?.expense_transaction_id ?? "—")} readOnly /></div>
                        <div className="col-12 col-md-4"><label className="form-label">{language === "es" ? "Última sync" : "Last sync"}</label><input className="form-control" value={costingDetail?.actual?.finance_synced_at ? formatDateTimeInTimeZone(costingDetail.actual.finance_synced_at, language, effectiveTimeZone) : "—"} readOnly /></div>
                        <div className="col-12"><label className="form-label">{language === "es" ? "Notas de finanzas" : "Finance notes"}</label><textarea className="form-control" rows={2} value={financeSyncForm.notes} readOnly /></div>
                      </>
                    ) : (
                      <>
                        <div className="col-12"><label className="form-label">{language === "es" ? "Referencia OT" : "Work order reference"}</label><input className="form-control" value={buildFinanceReferenceLabel(currentWorkOrder, clientLabel, siteLabel, installationLabel)} readOnly /></div>
                        <div className="col-12 col-md-6"><label className="form-label">{language === "es" ? "Moneda" : "Currency"}</label><select className="form-select" value={financeSyncForm.currency_id} onChange={(event) => setFinanceSyncForm((current) => ({ ...current, currency_id: event.target.value }))} disabled={isReadOnly}><option value="">{language === "es" ? "Selecciona una moneda" : "Select a currency"}</option>{activeCurrencies.map((currency) => <option key={currency.id} value={currency.id}>{currency.code} · {currency.name}</option>)}</select></div>
                        <div className="col-12 col-md-6">
                          <label className="form-label">{language === "es" ? "Fecha contable" : "Transaction date"}</label>
                          <input
                            className="form-control"
                            type="datetime-local"
                            value={financeSyncForm.transaction_at || financeTransactionDatePreview}
                            onChange={(event) =>
                              setFinanceSyncForm((current) => ({
                                ...current,
                                transaction_at: event.target.value,
                              }))
                            }
                            readOnly={isReadOnly || !useCustomTransactionAt}
                            disabled={isReadOnly || !useCustomTransactionAt}
                          />
                          {!isReadOnly ? (
                            <div className="form-check mt-2">
                              <input
                                id="maintenance-sync-custom-date"
                                className="form-check-input"
                                type="checkbox"
                                checked={useCustomTransactionAt}
                                onChange={(event) => setUseCustomTransactionAt(event.target.checked)}
                              />
                              <label className="form-check-label" htmlFor="maintenance-sync-custom-date">
                                {language === "es"
                                  ? "Ajustar fecha contable manualmente"
                                  : "Adjust transaction date manually"}
                              </label>
                            </div>
                          ) : null}
                        </div>
                        <div className="col-12 col-md-6"><div className="form-check mt-4"><input id="maintenance-sync-income-modal" className="form-check-input" type="checkbox" checked={financeSyncForm.sync_income} onChange={(event) => setFinanceSyncForm((current) => ({ ...current, sync_income: event.target.checked }))} /><label className="form-check-label" htmlFor="maintenance-sync-income-modal">{language === "es" ? "Sincronizar ingreso" : "Sync income"}</label></div></div>
                        <div className="col-12 col-md-6"><div className="form-check mt-4"><input id="maintenance-sync-expense-modal" className="form-check-input" type="checkbox" checked={financeSyncForm.sync_expense} onChange={(event) => setFinanceSyncForm((current) => ({ ...current, sync_expense: event.target.checked }))} /><label className="form-check-label" htmlFor="maintenance-sync-expense-modal">{language === "es" ? "Sincronizar egreso" : "Sync expense"}</label></div></div>
                        <div className="col-12 col-md-6"><label className="form-label">{language === "es" ? "Cuenta ingreso" : "Income account"}</label><select className="form-select" value={financeSyncForm.income_account_id} onChange={(event) => setFinanceSyncForm((current) => ({ ...current, income_account_id: event.target.value }))} disabled={!financeSyncForm.sync_income || isReadOnly}><option value="">{language === "es" ? "Selecciona una cuenta" : "Select an account"}</option>{activeFinanceAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></div>
                        <div className="col-12 col-md-6"><label className="form-label">{language === "es" ? "Categoría ingreso" : "Income category"}</label><select className="form-select" value={financeSyncForm.income_category_id} onChange={(event) => setFinanceSyncForm((current) => ({ ...current, income_category_id: event.target.value }))} disabled={!financeSyncForm.sync_income || isReadOnly}><option value="">{language === "es" ? "Sin categoría específica" : "No specific category"}</option>{incomeCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></div>
                        <div className="col-12 col-md-6"><label className="form-label">{language === "es" ? "Glosa ingreso" : "Income description"}</label><input className="form-control" value={financeSyncForm.income_description} onChange={(event) => setFinanceSyncForm((current) => ({ ...current, income_description: event.target.value }))} disabled={!financeSyncForm.sync_income || isReadOnly} /></div>
                        <div className="col-12 col-md-6"><label className="form-label">{language === "es" ? "Cuenta egreso" : "Expense account"}</label><select className="form-select" value={financeSyncForm.expense_account_id} onChange={(event) => setFinanceSyncForm((current) => ({ ...current, expense_account_id: event.target.value }))} disabled={!financeSyncForm.sync_expense || isReadOnly}><option value="">{language === "es" ? "Selecciona una cuenta" : "Select an account"}</option>{activeFinanceAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></div>
                        <div className="col-12 col-md-6"><label className="form-label">{language === "es" ? "Categoría egreso" : "Expense category"}</label><select className="form-select" value={financeSyncForm.expense_category_id} onChange={(event) => setFinanceSyncForm((current) => ({ ...current, expense_category_id: event.target.value }))} disabled={!financeSyncForm.sync_expense || isReadOnly}><option value="">{language === "es" ? "Sin categoría específica" : "No specific category"}</option>{expenseCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></div>
                        <div className="col-12 col-md-6"><label className="form-label">{language === "es" ? "Glosa egreso" : "Expense description"}</label><input className="form-control" value={financeSyncForm.expense_description} onChange={(event) => setFinanceSyncForm((current) => ({ ...current, expense_description: event.target.value }))} disabled={!financeSyncForm.sync_expense || isReadOnly} /></div>
                        <div className="col-12"><label className="form-label">{language === "es" ? "Notas para finanzas" : "Finance notes"}</label><textarea className="form-control" rows={2} value={financeSyncForm.notes} onChange={(event) => setFinanceSyncForm((current) => ({ ...current, notes: event.target.value }))} /></div>
                        <div className="col-12"><div className="maintenance-history-entry__meta">{language === "es" ? (currentWorkOrder.completed_at ? "La fecha contable se toma siempre desde la hora real de cierre de la OT." : "La fecha contable se fijará automáticamente al momento real de cerrar o sincronizar la OT.") : (currentWorkOrder.completed_at ? "The transaction date always uses the real work-order close timestamp." : "The transaction date will be fixed automatically at the real moment the work order is closed or synced.")}</div></div>
                        <div className="col-12"><div className="maintenance-history-entry__meta">{language === "es" ? "Ingreso vinculado" : "Linked income"}: {costingDetail?.actual?.income_transaction_id ?? "—"} · {language === "es" ? "Egreso vinculado" : "Linked expense"}: {costingDetail?.actual?.expense_transaction_id ?? "—"}</div></div>
                      </>
                    )}
                  </div>
                  <div className="maintenance-form__actions">
                    <button className="btn btn-outline-secondary" type="button" onClick={onClose}>{language === "es" ? "Cerrar" : "Close"}</button>
                    {!isReadOnly ? (
                      <button className="btn btn-primary" type="submit" disabled={isFinanceSyncSubmitting || financeSyncBlocked}>
                        {isFinanceSyncSubmitting ? (language === "es" ? "Sincronizando..." : "Syncing...") : autoSyncOnClose ? (isWorkOrderClosed ? (language === "es" ? "Reintentar / ajustar sincronización" : "Retry / adjust sync") : (language === "es" ? "Sincronizar ahora (opcional)" : "Sync now (optional)")) : language === "es" ? "Sincronizar con finanzas" : "Sync with Finance"}
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
