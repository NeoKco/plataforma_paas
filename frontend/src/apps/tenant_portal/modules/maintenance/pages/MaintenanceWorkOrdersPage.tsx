import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { PageHeader } from "../../../../../components/common/PageHeader";
import { PanelCard } from "../../../../../components/common/PanelCard";
import { DataTableCard } from "../../../../../components/data-display/DataTableCard";
import { ErrorState } from "../../../../../components/feedback/ErrorState";
import { LoadingBlock } from "../../../../../components/feedback/LoadingBlock";
import { MetricCard } from "../../../../../components/common/MetricCard";
import { AppBadge } from "../../../../../design-system/AppBadge";
import { AppToolbar } from "../../../../../design-system/AppLayout";
import { getApiErrorDisplayMessage } from "../../../../../services/api";
import { getTenantUsers } from "../../../../../services/tenant-api";
import { useLanguage } from "../../../../../store/language-context";
import { useTenantAuth } from "../../../../../store/tenant-auth-context";
import {
  formatDateTimeInTimeZone,
  fromDateTimeLocalInputValue,
  toDateTimeLocalInputValue,
} from "../../../../../utils/dateTimeLocal";
import type { ApiError, TenantUsersItem } from "../../../../../types";
import { MaintenanceHelpBubble } from "../components/common/MaintenanceHelpBubble";
import { MaintenanceModuleNav } from "../components/common/MaintenanceModuleNav";
import {
  getTenantFinanceAccounts,
  type TenantFinanceAccount,
} from "../../finance/services/accountsService";
import {
  getTenantFinanceCategories,
  type TenantFinanceCategory,
} from "../../finance/services/categoriesService";
import {
  getTenantFinanceCurrencies,
  type TenantFinanceCurrency,
} from "../../finance/services/currenciesService";
import {
  createTenantMaintenanceWorkOrder,
  deleteTenantMaintenanceWorkOrder,
  getTenantMaintenanceWorkOrders,
  updateTenantMaintenanceWorkOrder,
  updateTenantMaintenanceWorkOrderStatus,
  type TenantMaintenanceWorkOrder,
  type TenantMaintenanceWorkOrderWriteRequest,
} from "../services/workOrdersService";
import {
  getTenantMaintenanceWorkOrderCosting,
  syncTenantMaintenanceWorkOrderToFinance,
  updateTenantMaintenanceWorkOrderCostActual,
  updateTenantMaintenanceWorkOrderCostEstimate,
  type TenantMaintenanceCostingDetail,
  type TenantMaintenanceCostActual,
  type TenantMaintenanceCostEstimate,
} from "../services/costingService";
import {
  getTenantMaintenanceInstallations,
  type TenantMaintenanceInstallation,
} from "../services/installationsService";
import {
  getTenantBusinessClients,
  type TenantBusinessClient,
} from "../../business_core/services/clientsService";
import {
  getTenantBusinessOrganizations,
  type TenantBusinessOrganization,
} from "../../business_core/services/organizationsService";
import {
  getTenantBusinessWorkGroups,
  type TenantBusinessWorkGroup,
} from "../../business_core/services/workGroupsService";
import {
  getTenantBusinessSites,
  type TenantBusinessSite,
} from "../../business_core/services/sitesService";
import { getVisibleAddressLabel } from "../../business_core/utils/addressPresentation";
import { stripLegacyVisibleText } from "../../../../../utils/legacyVisibleText";

const ACTIVE_WORK_ORDER_STATUSES = new Set(["scheduled", "in_progress"]);

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

function buildDefaultForm(): TenantMaintenanceWorkOrderWriteRequest {
  return {
    client_id: 0,
    site_id: 0,
    installation_id: null,
    assigned_work_group_id: null,
    external_reference: null,
    title: "",
    description: null,
    priority: "normal",
    scheduled_for: null,
    cancellation_reason: null,
    closure_notes: null,
    assigned_tenant_user_id: null,
    maintenance_status: "scheduled",
  };
}

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

function formatDateTime(
  value: string | null,
  language: "es" | "en",
  timeZone?: string | null
): string {
  if (!value) {
    return language === "es" ? "sin fecha" : "no date";
  }
  return formatDateTimeInTimeZone(value, language, timeZone);
}

function getStatusTone(status: string): "success" | "warning" | "danger" | "info" | "neutral" {
  if (status === "completed") {
    return "success";
  }
  if (status === "cancelled") {
    return "danger";
  }
  if (status === "in_progress") {
    return "info";
  }
  if (status === "scheduled") {
    return "warning";
  }
  return "neutral";
}

function getStatusLabel(status: string, language: "es" | "en"): string {
  switch (status) {
    case "scheduled":
      return language === "es" ? "Programada" : "Scheduled";
    case "in_progress":
      return language === "es" ? "En curso" : "In progress";
    case "completed":
      return language === "es" ? "Completada" : "Completed";
    case "cancelled":
      return language === "es" ? "Anulada" : "Cancelled";
    default:
      return status;
  }
}

export function MaintenanceWorkOrdersPage() {
  const { session, effectiveTimeZone } = useTenantAuth();
  const { language } = useLanguage();
  const [searchParams] = useSearchParams();
  const [rows, setRows] = useState<TenantMaintenanceWorkOrder[]>([]);
  const [clients, setClients] = useState<TenantBusinessClient[]>([]);
  const [organizations, setOrganizations] = useState<TenantBusinessOrganization[]>([]);
  const [sites, setSites] = useState<TenantBusinessSite[]>([]);
  const [installations, setInstallations] = useState<TenantMaintenanceInstallation[]>([]);
  const [workGroups, setWorkGroups] = useState<TenantBusinessWorkGroup[]>([]);
  const [tenantUsers, setTenantUsers] = useState<TenantUsersItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isCostingModalOpen, setIsCostingModalOpen] = useState(false);
  const [isCostingLoading, setIsCostingLoading] = useState(false);
  const [isEstimateSubmitting, setIsEstimateSubmitting] = useState(false);
  const [isActualSubmitting, setIsActualSubmitting] = useState(false);
  const [isFinanceSyncSubmitting, setIsFinanceSyncSubmitting] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [requestedCreateHandled, setRequestedCreateHandled] = useState(false);
  const [form, setForm] = useState<TenantMaintenanceWorkOrderWriteRequest>(buildDefaultForm());
  const [costingWorkOrder, setCostingWorkOrder] = useState<TenantMaintenanceWorkOrder | null>(null);
  const [costingDetail, setCostingDetail] = useState<TenantMaintenanceCostingDetail | null>(null);
  const [financeAccounts, setFinanceAccounts] = useState<TenantFinanceAccount[]>([]);
  const [financeCategories, setFinanceCategories] = useState<TenantFinanceCategory[]>([]);
  const [financeCurrencies, setFinanceCurrencies] = useState<TenantFinanceCurrency[]>([]);
  const [estimateForm, setEstimateForm] = useState<MaintenanceCostEstimateFormState>(
    buildDefaultCostEstimateForm()
  );
  const [actualForm, setActualForm] = useState<MaintenanceCostActualFormState>(
    buildDefaultCostActualForm()
  );
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

  const requestedClientId = Number(searchParams.get("clientId") || 0);
  const requestedSiteId = Number(searchParams.get("siteId") || 0);
  const requestedInstallationId = Number(searchParams.get("installationId") || 0);
  const requestedMode = searchParams.get("mode");

  const siteById = useMemo(() => new Map(sites.map((site) => [site.id, site])), [sites]);
  const organizationById = useMemo(
    () => new Map(organizations.map((organization) => [organization.id, organization])),
    [organizations]
  );
  const clientById = useMemo(
    () => new Map(clients.map((client) => [client.id, client])),
    [clients]
  );
  const installationById = useMemo(
    () => new Map(installations.map((item) => [item.id, item])),
    [installations]
  );
  const workGroupById = useMemo(
    () => new Map(workGroups.map((group) => [group.id, group])),
    [workGroups]
  );
  const tenantUserById = useMemo(
    () => new Map(tenantUsers.map((user) => [user.id, user])),
    [tenantUsers]
  );

  const filteredSites = useMemo(
    () =>
      form.client_id > 0
        ? sites.filter((site) => site.client_id === Number(form.client_id))
        : sites,
    [form.client_id, sites]
  );

  const filteredInstallations = useMemo(
    () =>
      form.site_id > 0
        ? installations.filter((item) => item.site_id === Number(form.site_id))
        : installations,
    [form.site_id, installations]
  );

  const activeWorkGroups = useMemo(
    () => workGroups.filter((group) => group.is_active),
    [workGroups]
  );

  const activeTenantUsers = useMemo(
    () => tenantUsers.filter((user) => user.is_active),
    [tenantUsers]
  );
  const activeFinanceAccounts = useMemo(
    () => financeAccounts.filter((account) => account.is_active),
    [financeAccounts]
  );
  const incomeCategories = useMemo(
    () => financeCategories.filter((category) => category.is_active && category.category_type === "income"),
    [financeCategories]
  );
  const expenseCategories = useMemo(
    () => financeCategories.filter((category) => category.is_active && category.category_type === "expense"),
    [financeCategories]
  );
  const activeCurrencies = useMemo(
    () => financeCurrencies.filter((currency) => currency.is_active),
    [financeCurrencies]
  );

  const sortedRows = useMemo(
    () =>
      [...rows].sort((left, right) => {
        const leftDate = new Date(left.scheduled_for || left.requested_at).getTime();
        const rightDate = new Date(right.scheduled_for || right.requested_at).getTime();
        return rightDate - leftDate;
      }),
    [rows]
  );

  const activeRows = useMemo(
    () => sortedRows.filter((item) => ACTIVE_WORK_ORDER_STATUSES.has(item.maintenance_status)),
    [sortedRows]
  );

  const noClientsAvailable = clients.length === 0;
  const selectedClientSites = form.client_id > 0 ? filteredSites : [];
  const selectedSiteInstallations = form.site_id > 0 ? filteredInstallations : [];
  const missingSiteForSelectedClient = form.client_id > 0 && selectedClientSites.length === 0;
  const missingInstallationForSelectedSite =
    form.site_id > 0 && selectedSiteInstallations.length === 0;
  const submitBlocked =
    noClientsAvailable ||
    Number(form.client_id) <= 0 ||
    Number(form.site_id) <= 0 ||
    !form.installation_id ||
    missingSiteForSelectedClient ||
    missingInstallationForSelectedSite;

  const summary = useMemo(() => {
    return rows.reduce(
      (accumulator, row) => {
        if (ACTIVE_WORK_ORDER_STATUSES.has(row.maintenance_status)) {
          accumulator.total += 1;
        }
        if (row.maintenance_status === "scheduled") {
          accumulator.scheduled += 1;
        } else if (row.maintenance_status === "in_progress") {
          accumulator.inProgress += 1;
        } else if (row.maintenance_status === "completed") {
          accumulator.completed += 1;
        } else if (row.maintenance_status === "cancelled") {
          accumulator.cancelled += 1;
        }
        return accumulator;
      },
      { total: 0, scheduled: 0, inProgress: 0, completed: 0, cancelled: 0 }
    );
  }, [rows]);
  const estimatedTotalPreview = useMemo(() => sumCostForm(estimateForm), [estimateForm]);
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
  const actualTotalPreview = useMemo(() => sumCostForm(actualForm), [actualForm]);
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

  async function loadData() {
    if (!session?.accessToken) {
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const [
        workOrdersResponse,
        clientsResponse,
        organizationsResponse,
        sitesResponse,
        installationsResponse,
        workGroupsResponse,
        tenantUsersResponse,
      ] = await Promise.all([
        getTenantMaintenanceWorkOrders(session.accessToken, {
          ...(requestedClientId > 0 ? { clientId: requestedClientId } : {}),
          ...(requestedSiteId > 0 ? { siteId: requestedSiteId } : {}),
        }),
        getTenantBusinessClients(session.accessToken, { includeInactive: false }),
        getTenantBusinessOrganizations(session.accessToken, { includeInactive: false }),
        getTenantBusinessSites(session.accessToken, { includeInactive: false }),
        getTenantMaintenanceInstallations(session.accessToken, { includeInactive: false }),
        getTenantBusinessWorkGroups(session.accessToken, { includeInactive: false }),
        getTenantUsers(session.accessToken),
      ]);
      setRows(workOrdersResponse.data);
      setClients(clientsResponse.data);
      setOrganizations(organizationsResponse.data);
      setSites(sitesResponse.data);
      setInstallations(installationsResponse.data);
      setWorkGroups(workGroupsResponse.data);
      setTenantUsers(tenantUsersResponse.data);

      setForm((current) => {
        const nextClientId = current.client_id || requestedClientId || clientsResponse.data[0]?.id || 0;
        const candidateSites = sitesResponse.data.filter((site) => site.client_id === nextClientId);
        const nextSiteId =
          current.site_id || (requestedSiteId > 0 ? requestedSiteId : 0) || candidateSites[0]?.id || 0;
        const candidateInstallations = installationsResponse.data.filter(
          (installation) => installation.site_id === nextSiteId
        );
        return {
          ...current,
          client_id: nextClientId,
          site_id: nextSiteId,
          installation_id:
            current.installation_id ||
            (requestedInstallationId > 0 ? requestedInstallationId : null) ||
            candidateInstallations[0]?.id ||
            null,
          assigned_work_group_id: current.assigned_work_group_id || null,
        };
      });
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [session?.accessToken]);

  useEffect(() => {
    if (!isLoading && requestedMode === "create" && !requestedCreateHandled) {
      setRequestedCreateHandled(true);
      startCreate(true);
    }
  }, [isLoading, requestedMode, requestedCreateHandled]);

  useEffect(() => {
    if (!filteredSites.some((site) => site.id === Number(form.site_id))) {
      setForm((current) => ({
        ...current,
        site_id: filteredSites[0]?.id || 0,
        installation_id: null,
      }));
    }
  }, [filteredSites, form.site_id]);

  useEffect(() => {
    if (!filteredInstallations.some((item) => item.id === Number(form.installation_id))) {
      setForm((current) => ({
        ...current,
        installation_id: filteredInstallations[0]?.id || null,
      }));
    }
  }, [filteredInstallations, form.installation_id]);

  function startCreate(openForm = false, scheduledFor: string | null = null) {
    const clientId = requestedClientId || clients[0]?.id || 0;
    const candidateSites = sites.filter((site) => site.client_id === clientId);
    const siteId = requestedSiteId || candidateSites[0]?.id || 0;
    const candidateInstallations = installations.filter((installation) => installation.site_id === siteId);
    setEditingId(null);
    setFeedback(null);
    setError(null);
    setIsFormOpen(openForm);
    setForm({
      ...buildDefaultForm(),
      client_id: clientId,
      site_id: siteId,
      installation_id: requestedInstallationId || candidateInstallations[0]?.id || null,
      assigned_work_group_id: null,
      scheduled_for: scheduledFor,
    });
  }

  function getClientDisplayName(clientId: number): string {
    const client = clientById.get(clientId);
    const organization = organizationById.get(client?.organization_id ?? -1);
    return (
      stripLegacyVisibleText(organization?.name) ||
      stripLegacyVisibleText(organization?.legal_name) ||
      (language === "es" ? "Cliente sin nombre" : "Unnamed client")
    );
  }

  function getSiteDisplayName(siteId: number): string {
    const site = siteById.get(siteId);
    if (!site) {
      return language === "es" ? "Dirección sin registrar" : "Missing address";
    }
    const visibleAddress =
      stripLegacyVisibleText(getVisibleAddressLabel(site)) ||
      stripLegacyVisibleText(site.name) ||
      (language === "es" ? "Dirección sin nombre" : "Unnamed address");
    const locality = [site.commune, site.city, site.region]
      .map((value) => stripLegacyVisibleText(value))
      .filter((value): value is string => Boolean(value))
      .join(", ");
    return locality ? `${visibleAddress} · ${locality}` : visibleAddress;
  }

  function getClientOptionLabel(client: TenantBusinessClient): string {
    const primarySite = sites.find((site) => site.client_id === client.id);
    const clientName = getClientDisplayName(client.id);
    return primarySite ? `${clientName} · ${getSiteDisplayName(primarySite.id)}` : clientName;
  }

  function startEdit(item: TenantMaintenanceWorkOrder) {
    setEditingId(item.id);
    setFeedback(null);
    setError(null);
    setIsFormOpen(true);
    setForm({
      client_id: item.client_id,
      site_id: item.site_id,
      installation_id: item.installation_id,
      assigned_work_group_id: item.assigned_work_group_id,
      external_reference: item.external_reference,
      title: item.title,
      description: stripLegacyVisibleText(item.description),
      priority: item.priority,
      scheduled_for: item.scheduled_for,
      cancellation_reason: null,
      closure_notes: stripLegacyVisibleText(item.closure_notes),
      assigned_tenant_user_id: item.assigned_tenant_user_id,
      maintenance_status: item.maintenance_status,
    });
  }

  function closeCostingModal() {
    setIsCostingModalOpen(false);
    setIsCostingLoading(false);
    setIsEstimateSubmitting(false);
    setIsActualSubmitting(false);
    setIsFinanceSyncSubmitting(false);
    setCostingWorkOrder(null);
    setCostingDetail(null);
    setEstimateForm(buildDefaultCostEstimateForm());
    setActualForm(buildDefaultCostActualForm());
    setFinanceSyncForm({
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
  }

  async function openCostingModal(item: TenantMaintenanceWorkOrder) {
    if (!session?.accessToken) {
      return;
    }
    setError(null);
    setFeedback(null);
    setIsCostingModalOpen(true);
    setIsCostingLoading(true);
    setCostingWorkOrder(item);
    try {
      const [costingResponse, accountsResponse, categoriesResponse, currenciesResponse] =
        await Promise.all([
          getTenantMaintenanceWorkOrderCosting(session.accessToken, item.id),
          getTenantFinanceAccounts(session.accessToken, false),
          getTenantFinanceCategories(session.accessToken, {
            includeInactive: false,
          }),
          getTenantFinanceCurrencies(session.accessToken, false),
        ]);
      const detail = costingResponse.data;
      const accounts = accountsResponse.data;
      const categories = categoriesResponse.data;
      const currencies = currenciesResponse.data;
      const incomeCategory = categories.find((category) => category.category_type === "income");
      const expenseCategory = categories.find((category) => category.category_type === "expense");
      const defaultCurrency = currencies.find((currency) => currency.is_base) || currencies[0];
      const transactionAtSource =
        detail.actual?.finance_synced_at ||
        item.completed_at ||
        item.scheduled_for ||
        item.requested_at;

      setFinanceAccounts(accounts);
      setFinanceCategories(categories);
      setFinanceCurrencies(currencies);
      setCostingDetail(detail);
      setEstimateForm(buildDefaultCostEstimateForm(detail.estimate));
      setActualForm(buildDefaultCostActualForm(detail.actual));
      setFinanceSyncForm({
        sync_income: true,
        sync_expense: true,
        income_account_id: "",
        expense_account_id: "",
        income_category_id: detail.actual?.income_transaction_id ? String(incomeCategory?.id ?? "") : String(incomeCategory?.id ?? ""),
        expense_category_id: detail.actual?.expense_transaction_id ? String(expenseCategory?.id ?? "") : String(expenseCategory?.id ?? ""),
        currency_id: String(defaultCurrency?.id ?? ""),
        transaction_at: toDateTimeLocalInputValue(transactionAtSource, effectiveTimeZone),
        notes: detail.actual?.notes ?? detail.estimate?.notes ?? "",
      });
    } catch (rawError) {
      setIsCostingModalOpen(false);
      setCostingWorkOrder(null);
      setError(rawError as ApiError);
    } finally {
      setIsCostingLoading(false);
    }
  }

  async function handleEstimateSubmit() {
    if (!session?.accessToken || !costingWorkOrder) {
      return;
    }
    setIsEstimateSubmitting(true);
    setError(null);
    try {
      const response = await updateTenantMaintenanceWorkOrderCostEstimate(
        session.accessToken,
        costingWorkOrder.id,
        {
          labor_cost: normalizeNumericInput(estimateForm.labor_cost),
          travel_cost: normalizeNumericInput(estimateForm.travel_cost),
          materials_cost: normalizeNumericInput(estimateForm.materials_cost),
          external_services_cost: normalizeNumericInput(estimateForm.external_services_cost),
          overhead_cost: normalizeNumericInput(estimateForm.overhead_cost),
          target_margin_percent: normalizeNumericInput(estimateForm.target_margin_percent),
          notes: normalizeNullable(estimateForm.notes),
        }
      );
      setCostingDetail(response.data);
      setEstimateForm(buildDefaultCostEstimateForm(response.data.estimate));
      setFeedback(response.message);
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsEstimateSubmitting(false);
    }
  }

  async function handleActualSubmit() {
    if (!session?.accessToken || !costingWorkOrder) {
      return;
    }
    setIsActualSubmitting(true);
    setError(null);
    try {
      const response = await updateTenantMaintenanceWorkOrderCostActual(
        session.accessToken,
        costingWorkOrder.id,
        {
          labor_cost: normalizeNumericInput(actualForm.labor_cost),
          travel_cost: normalizeNumericInput(actualForm.travel_cost),
          materials_cost: normalizeNumericInput(actualForm.materials_cost),
          external_services_cost: normalizeNumericInput(actualForm.external_services_cost),
          overhead_cost: normalizeNumericInput(actualForm.overhead_cost),
          actual_price_charged: normalizeNumericInput(actualForm.actual_price_charged),
          notes: normalizeNullable(actualForm.notes),
        }
      );
      setCostingDetail(response.data);
      setActualForm(buildDefaultCostActualForm(response.data.actual));
      setFeedback(response.message);
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsActualSubmitting(false);
    }
  }

  async function handleFinanceSyncSubmit() {
    if (!session?.accessToken || !costingWorkOrder || !financeSyncForm.currency_id) {
      return;
    }
    setIsFinanceSyncSubmitting(true);
    setError(null);
    try {
      const response = await syncTenantMaintenanceWorkOrderToFinance(
        session.accessToken,
        costingWorkOrder.id,
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
      setFeedback(response.message);
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsFinanceSyncSubmitting(false);
    }
  }

  async function handleSubmit() {
    if (!session?.accessToken) {
      return;
    }
    setIsSubmitting(true);
    setError(null);
    const payload: TenantMaintenanceWorkOrderWriteRequest = {
      client_id: Number(form.client_id),
      site_id: Number(form.site_id),
      installation_id: form.installation_id ? Number(form.installation_id) : null,
      assigned_work_group_id: form.assigned_work_group_id ? Number(form.assigned_work_group_id) : null,
      external_reference: editingId ? normalizeNullable(form.external_reference) : null,
      title: form.title.trim(),
      description: stripLegacyVisibleText(normalizeNullable(form.description)),
      priority: form.priority.trim().toLowerCase() || "normal",
      scheduled_for: normalizeNullable(form.scheduled_for),
      cancellation_reason: null,
      closure_notes: editingId ? stripLegacyVisibleText(normalizeNullable(form.closure_notes)) : null,
      assigned_tenant_user_id: form.assigned_tenant_user_id ? Number(form.assigned_tenant_user_id) : null,
      ...(editingId ? {} : { maintenance_status: form.maintenance_status || "scheduled" }),
    };
    try {
      const response = editingId
        ? await updateTenantMaintenanceWorkOrder(session.accessToken, editingId, payload)
        : await createTenantMaintenanceWorkOrder(session.accessToken, payload);
      setFeedback(response.message);
      startCreate(false);
      await loadData();
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleStatusChange(workOrder: TenantMaintenanceWorkOrder, nextStatus: string) {
    if (!session?.accessToken) {
      return;
    }
    const note = window.prompt(
      language === "es"
        ? `Motivo o nota para cambiar a ${getStatusLabel(nextStatus, language)}`
        : `Reason or note to change to ${getStatusLabel(nextStatus, language)}`
    );
    try {
      const response = await updateTenantMaintenanceWorkOrderStatus(
        session.accessToken,
        workOrder.id,
        nextStatus,
        note
      );
      setFeedback(response.message);
      await loadData();
    } catch (rawError) {
      setError(rawError as ApiError);
    }
  }

  async function handleDelete(workOrder: TenantMaintenanceWorkOrder) {
    if (!session?.accessToken) {
      return;
    }
    const confirmed = window.confirm(
      language === "es"
        ? `Eliminar la orden "${workOrder.title}" solo funciona si no tiene trazabilidad relevante. ¿Continuar?`
        : `Delete work order "${workOrder.title}" only if it has no relevant traceability. Continue?`
    );
    if (!confirmed) {
      return;
    }
    try {
      const response = await deleteTenantMaintenanceWorkOrder(session.accessToken, workOrder.id);
      if (editingId === workOrder.id) {
        startCreate(false);
      }
      setFeedback(response.message);
      await loadData();
    } catch (rawError) {
      setError(rawError as ApiError);
    }
  }

  return (
    <div className="d-grid gap-4">
      <PageHeader
        eyebrow={language === "es" ? "Mantenciones" : "Maintenance"}
        icon="maintenance"
        title={language === "es" ? "Mantenciones abiertas" : "Open maintenance work"}
        description={
          language === "es"
            ? "Aquí solo se trabajan las mantenciones programadas o en curso. Las realizadas o anuladas pasan de inmediato al historial."
            : "Only scheduled or in-progress maintenance is worked here. Completed or cancelled work moves immediately to history."
        }
        actions={
          <AppToolbar compact>
            <MaintenanceHelpBubble
              label={language === "es" ? "Ayuda" : "Help"}
              helpText={
                language === "es"
                  ? "Toda mantención debe colgar de un cliente, una dirección y una instalación real. Si falta uno de esos tres, primero debes crearlo."
                  : "Every maintenance work item must belong to a real client, address, and installation. If any is missing, create it first."
              }
            />
            <button className="btn btn-outline-secondary" type="button" onClick={() => void loadData()}>
              {language === "es" ? "Recargar" : "Reload"}
            </button>
            <button
              className="btn btn-primary"
              type="button"
              onClick={() => startCreate(true)}
              disabled={noClientsAvailable}
              title={
                noClientsAvailable
                  ? language === "es"
                    ? "Primero crea un cliente en Core de negocio"
                    : "Create a client in Business core first"
                  : undefined
              }
            >
              {language === "es" ? "Nueva orden" : "New work order"}
            </button>
          </AppToolbar>
        }
      />
      <MaintenanceModuleNav />

      {requestedClientId > 0 ? (
        <div className="maintenance-context-banner">
          {language === "es"
            ? "Vista abierta desde la ficha del cliente. Las mantenciones quedan filtradas por ese cliente y la nueva orden se precarga con sus datos."
            : "View opened from the client detail. Work orders are filtered by that client and the new work order is preloaded with its data."}
        </div>
      ) : null}

      {noClientsAvailable ? (
        <div className="alert alert-warning mb-0">
          {language === "es"
            ? "Antes de agendar una mantención debe existir un cliente en Core de negocio."
            : "A client must exist in Business core before scheduling maintenance."}{" "}
          <Link to="/tenant-portal/business-core/clients">
            {language === "es" ? "Ir a clientes" : "Go to clients"}
          </Link>
        </div>
      ) : null}

      {feedback ? <div className="alert alert-success mb-0">{feedback}</div> : null}

      {error ? (
        <ErrorState
          title={language === "es" ? "No se pudo cargar la vista" : "The view could not be loaded"}
          detail={getApiErrorDisplayMessage(error)}
          requestId={error.payload?.request_id}
        />
      ) : null}

      {isLoading ? (
        <LoadingBlock label={language === "es" ? "Cargando mantenciones..." : "Loading maintenance..."} />
      ) : null}

      <div className="row g-3">
        <div className="col-12 col-md-6 col-xl-3">
          <MetricCard
            label={language === "es" ? "Abiertas" : "Open"}
            value={summary.total}
            hint={language === "es" ? "Mantenciones visibles aquí" : "Maintenance work visible here"}
            icon="maintenance"
            tone="info"
          />
        </div>
        <div className="col-12 col-md-6 col-xl-3">
          <MetricCard
            label={language === "es" ? "Programadas" : "Scheduled"}
            value={summary.scheduled}
            hint={language === "es" ? "Pendientes de ejecutar" : "Waiting to be executed"}
            icon="planning"
            tone="warning"
          />
        </div>
        <div className="col-12 col-md-6 col-xl-3">
          <MetricCard
            label={language === "es" ? "En curso" : "In progress"}
            value={summary.inProgress}
            hint={language === "es" ? "Trabajo activo de terreno" : "Active field work"}
            icon="focus"
            tone="info"
          />
        </div>
        <div className="col-12 col-md-6 col-xl-3">
          <MetricCard
            label={language === "es" ? "Historial" : "History"}
            value={summary.completed + summary.cancelled}
            hint={language === "es" ? "Realizadas o anuladas" : "Completed or cancelled"}
            icon="reports"
            tone="success"
          />
        </div>
      </div>

      {activeRows.length === 0 && !isLoading ? (
        <PanelCard
          title={language === "es" ? "No hay mantenciones abiertas" : "There are no open work orders"}
          subtitle={
            language === "es"
              ? "Las mantenciones realizadas o anuladas ya no aparecen aquí; revísalas en Historial. Usa Nueva orden para programar trabajo nuevo."
              : "Completed or cancelled maintenance no longer appears here; review it in History. Use New work order to schedule new work."
          }
        >
          <div className="maintenance-cell__meta">
            {language === "es"
              ? "La bandeja diaria queda reservada solo para trabajo pendiente."
              : "The day-to-day tray is reserved only for pending work."}
          </div>
        </PanelCard>
      ) : null}

      {isFormOpen ? (
        <div className="maintenance-form-backdrop" role="presentation" onClick={() => startCreate(false)}>
          <div
            className="maintenance-form-modal maintenance-form-modal--wide"
            role="dialog"
            aria-modal="true"
            aria-label={
              editingId
                ? language === "es"
                  ? "Editar mantención"
                  : "Edit maintenance work"
                : language === "es"
                  ? "Nueva mantención"
                  : "New maintenance work"
            }
            onClick={(event) => event.stopPropagation()}
          >
            <div className="maintenance-form-modal__eyebrow">
              {editingId
                ? language === "es"
                  ? "Edición puntual"
                  : "Targeted edit"
                : language === "es"
                  ? "Alta bajo demanda"
                  : "On-demand creation"}
            </div>
            <PanelCard
              title={
                editingId
                  ? language === "es"
                    ? "Editar mantención"
                    : "Edit maintenance work"
                  : language === "es"
                    ? "Nueva mantención"
                    : "New maintenance work"
              }
              subtitle={
                language === "es"
                  ? "Programa solo trabajo abierto. Al completarlo, saldrá de esta bandeja y quedará en historial."
                  : "Schedule only open work. Once completed, it will leave this tray and remain in history."
              }
            >
              <form
                className="maintenance-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleSubmit();
                }}
              >
                <div className="row g-3">
                  <div className="col-12 col-md-6">
                    <label className="form-label">{language === "es" ? "Cliente" : "Client"}</label>
                    <select
                      className="form-select"
                      value={form.client_id}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          client_id: Number(event.target.value),
                        }))
                      }
                    >
                      <option value={0}>
                        {language === "es" ? "Selecciona un cliente" : "Select a client"}
                      </option>
                      {clients.map((client) => (
                        <option key={client.id} value={client.id}>
                          {getClientOptionLabel(client)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">{language === "es" ? "Dirección" : "Address"}</label>
                    <select
                      className="form-select"
                      value={form.site_id}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          site_id: Number(event.target.value),
                        }))
                      }
                    >
                      <option value={0}>
                        {language === "es" ? "Selecciona una dirección" : "Select an address"}
                      </option>
                      {filteredSites.map((site) => (
                        <option key={site.id} value={site.id}>
                          {getSiteDisplayName(site.id)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">
                      {language === "es" ? "Instalación" : "Installation"}
                    </label>
                    <select
                      className="form-select"
                      value={form.installation_id ?? ""}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          installation_id: event.target.value ? Number(event.target.value) : null,
                        }))
                      }
                    >
                      <option value="">
                        {language === "es"
                          ? "Selecciona una instalación"
                          : "Select an installation"}
                      </option>
                      {filteredInstallations.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">
                      {language === "es" ? "Grupo responsable" : "Responsible group"}
                    </label>
                    <select
                      className="form-select"
                      value={form.assigned_work_group_id ?? ""}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          assigned_work_group_id: event.target.value ? Number(event.target.value) : null,
                        }))
                      }
                    >
                      <option value="">
                        {language === "es" ? "Sin grupo asignado" : "No group assigned"}
                      </option>
                      {activeWorkGroups.map((group) => (
                        <option key={group.id} value={group.id}>
                          {group.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">
                      {language === "es" ? "Técnico responsable" : "Assigned technician"}
                    </label>
                    <select
                      className="form-select"
                      value={form.assigned_tenant_user_id ?? ""}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          assigned_tenant_user_id: event.target.value ? Number(event.target.value) : null,
                        }))
                      }
                    >
                      <option value="">
                        {language === "es" ? "Sin técnico asignado" : "No technician assigned"}
                      </option>
                      {activeTenantUsers.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.full_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {!editingId ? (
                    <div className="col-12 col-md-6">
                      <label className="form-label">
                        {language === "es" ? "Estado inicial" : "Initial status"}
                      </label>
                      <select
                        className="form-select"
                        value={form.maintenance_status}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            maintenance_status: event.target.value,
                          }))
                        }
                      >
                        <option value="scheduled">{language === "es" ? "Programada" : "Scheduled"}</option>
                        <option value="in_progress">{language === "es" ? "En curso" : "In progress"}</option>
                      </select>
                    </div>
                  ) : null}
                  <div className="col-12 col-md-6">
                    <label className="form-label">{language === "es" ? "Prioridad" : "Priority"}</label>
                    <select
                      className="form-select"
                      value={form.priority}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          priority: event.target.value,
                        }))
                      }
                    >
                      <option value="low">{language === "es" ? "Baja" : "Low"}</option>
                      <option value="normal">{language === "es" ? "Normal" : "Normal"}</option>
                      <option value="high">{language === "es" ? "Alta" : "High"}</option>
                      <option value="critical">{language === "es" ? "Crítica" : "Critical"}</option>
                    </select>
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">
                      {language === "es" ? "Fecha y hora programada" : "Scheduled date and time"}
                    </label>
                    <input
                      className="form-control"
                      type="datetime-local"
                      value={form.scheduled_for ?? ""}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          scheduled_for: event.target.value,
                        }))
                      }
                    />
                  </div>
                  {missingSiteForSelectedClient ? (
                    <div className="col-12">
                      <div className="alert alert-warning mb-0">
                        {language === "es"
                          ? "Este cliente aún no tiene dirección operativa. Crea la dirección antes de agendar la mantención."
                          : "This client does not have an operational address yet. Create it before scheduling maintenance."}{" "}
                        <Link to="/tenant-portal/business-core/clients">
                          {language === "es" ? "Ir a clientes" : "Go to clients"}
                        </Link>
                      </div>
                    </div>
                  ) : null}
                  {missingInstallationForSelectedSite ? (
                    <div className="col-12">
                      <div className="alert alert-warning mb-0">
                        {language === "es"
                          ? "La dirección seleccionada aún no tiene instalación. Crea la instalación antes de agendar la mantención."
                          : "The selected address does not have an installation yet. Create the installation before scheduling maintenance."}{" "}
                        <Link
                          to={`/tenant-portal/maintenance/installations?clientId=${Number(form.client_id) || 0}&siteId=${Number(form.site_id) || 0}&mode=create`}
                        >
                          {language === "es" ? "Ir a instalaciones" : "Go to installations"}
                        </Link>
                      </div>
                    </div>
                  ) : null}
                  <div className="col-12">
                    <label className="form-label">{language === "es" ? "Trabajo a realizar" : "Work to be done"}</label>
                    <input
                      className="form-control"
                      value={form.title}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          title: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label">
                      {language === "es" ? "Detalle técnico" : "Technical detail"}
                    </label>
                    <textarea
                      className="form-control"
                      rows={4}
                      value={form.description ?? ""}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          description: event.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
                <div className="maintenance-form__actions">
                  <button className="btn btn-outline-secondary" type="button" onClick={() => startCreate(false)}>
                    {language === "es" ? "Cancelar" : "Cancel"}
                  </button>
                  <button className="btn btn-primary" type="submit" disabled={isSubmitting || submitBlocked}>
                    {isSubmitting
                      ? language === "es"
                        ? "Guardando..."
                        : "Saving..."
                      : editingId
                        ? language === "es"
                          ? "Guardar cambios"
                          : "Save changes"
                        : language === "es"
                          ? "Crear orden"
                          : "Create work order"}
                  </button>
                </div>
              </form>
            </PanelCard>
          </div>
        </div>
      ) : null}

      {isCostingModalOpen ? (
        <div className="maintenance-form-backdrop" role="presentation" onClick={closeCostingModal}>
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
              title={language === "es" ? "Costos y cobro" : "Costing and billing"}
              subtitle={
                language === "es"
                  ? "Calcula costo estimado, registra costo real y sincroniza manualmente los movimientos a Finanzas."
                  : "Calculate estimated cost, register actual cost, and manually sync transactions into Finance."
              }
            >
              {isCostingLoading ? (
                <LoadingBlock label={language === "es" ? "Cargando costeo..." : "Loading costing..."} />
              ) : costingWorkOrder ? (
                <div className="d-grid gap-3">
                  <div className="maintenance-history-entry">
                    <div className="maintenance-history-entry__title">
                      {stripLegacyVisibleText(costingWorkOrder.title)}
                    </div>
                    <div className="maintenance-history-entry__meta">
                      {getClientDisplayName(costingWorkOrder.client_id)} · {getSiteDisplayName(costingWorkOrder.site_id)}
                    </div>
                    <div className="maintenance-history-entry__meta">
                      {language === "es" ? "Instalación" : "Installation"}:{" "}
                      {costingWorkOrder.installation_id
                        ? installationById.get(costingWorkOrder.installation_id)?.name || `#${costingWorkOrder.installation_id}`
                        : language === "es"
                          ? "pendiente"
                          : "pending"}
                    </div>
                  </div>

                  <form
                    className="maintenance-form"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void handleEstimateSubmit();
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
                          <input className="form-control" type="number" min="0" step="0.01" value={estimateForm.labor_cost} onChange={(event) => setEstimateForm((current) => ({ ...current, labor_cost: event.target.value }))} />
                        </div>
                        <div className="col-12 col-md-4">
                          <label className="form-label">{language === "es" ? "Traslado" : "Travel"}</label>
                          <input className="form-control" type="number" min="0" step="0.01" value={estimateForm.travel_cost} onChange={(event) => setEstimateForm((current) => ({ ...current, travel_cost: event.target.value }))} />
                        </div>
                        <div className="col-12 col-md-4">
                          <label className="form-label">{language === "es" ? "Materiales" : "Materials"}</label>
                          <input className="form-control" type="number" min="0" step="0.01" value={estimateForm.materials_cost} onChange={(event) => setEstimateForm((current) => ({ ...current, materials_cost: event.target.value }))} />
                        </div>
                        <div className="col-12 col-md-4">
                          <label className="form-label">{language === "es" ? "Servicios externos" : "External services"}</label>
                          <input className="form-control" type="number" min="0" step="0.01" value={estimateForm.external_services_cost} onChange={(event) => setEstimateForm((current) => ({ ...current, external_services_cost: event.target.value }))} />
                        </div>
                        <div className="col-12 col-md-4">
                          <label className="form-label">{language === "es" ? "Indirectos" : "Overhead"}</label>
                          <input className="form-control" type="number" min="0" step="0.01" value={estimateForm.overhead_cost} onChange={(event) => setEstimateForm((current) => ({ ...current, overhead_cost: event.target.value }))} />
                        </div>
                        <div className="col-12 col-md-4">
                          <label className="form-label">{language === "es" ? "Margen objetivo (%)" : "Target margin (%)"}</label>
                          <input className="form-control" type="number" min="0" max="99.99" step="0.01" value={estimateForm.target_margin_percent} onChange={(event) => setEstimateForm((current) => ({ ...current, target_margin_percent: event.target.value }))} />
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
                          <textarea className="form-control" rows={3} value={estimateForm.notes} onChange={(event) => setEstimateForm((current) => ({ ...current, notes: event.target.value }))} />
                        </div>
                      </div>
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
                    </div>
                  </form>

                  <form
                    className="maintenance-form"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void handleActualSubmit();
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
                          <input className="form-control" type="number" min="0" step="0.01" value={actualForm.labor_cost} onChange={(event) => setActualForm((current) => ({ ...current, labor_cost: event.target.value }))} />
                        </div>
                        <div className="col-12 col-md-4">
                          <label className="form-label">{language === "es" ? "Traslado real" : "Actual travel"}</label>
                          <input className="form-control" type="number" min="0" step="0.01" value={actualForm.travel_cost} onChange={(event) => setActualForm((current) => ({ ...current, travel_cost: event.target.value }))} />
                        </div>
                        <div className="col-12 col-md-4">
                          <label className="form-label">{language === "es" ? "Materiales reales" : "Actual materials"}</label>
                          <input className="form-control" type="number" min="0" step="0.01" value={actualForm.materials_cost} onChange={(event) => setActualForm((current) => ({ ...current, materials_cost: event.target.value }))} />
                        </div>
                        <div className="col-12 col-md-4">
                          <label className="form-label">{language === "es" ? "Servicios externos reales" : "Actual external services"}</label>
                          <input className="form-control" type="number" min="0" step="0.01" value={actualForm.external_services_cost} onChange={(event) => setActualForm((current) => ({ ...current, external_services_cost: event.target.value }))} />
                        </div>
                        <div className="col-12 col-md-4">
                          <label className="form-label">{language === "es" ? "Indirectos reales" : "Actual overhead"}</label>
                          <input className="form-control" type="number" min="0" step="0.01" value={actualForm.overhead_cost} onChange={(event) => setActualForm((current) => ({ ...current, overhead_cost: event.target.value }))} />
                        </div>
                        <div className="col-12 col-md-4">
                          <label className="form-label">{language === "es" ? "Monto cobrado" : "Amount charged"}</label>
                          <input className="form-control" type="number" min="0" step="0.01" value={actualForm.actual_price_charged} onChange={(event) => setActualForm((current) => ({ ...current, actual_price_charged: event.target.value }))} />
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
                          <textarea className="form-control" rows={3} value={actualForm.notes} onChange={(event) => setActualForm((current) => ({ ...current, notes: event.target.value }))} />
                        </div>
                      </div>
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
                      </div>
                    </div>
                  </form>

                  <form
                    className="maintenance-form"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void handleFinanceSyncSubmit();
                    }}
                  >
                    <div className="maintenance-history-entry">
                      <div className="maintenance-history-entry__title">
                        {language === "es" ? "Sincronizar a finanzas" : "Sync to finance"}
                      </div>
                      <div className="maintenance-history-entry__meta">
                        {language === "es"
                          ? "Crea o actualiza el ingreso y egreso ligados a esta mantención usando source_type/source_id."
                          : "Create or update the linked income and expense using source_type/source_id."}
                      </div>
                      {!activeFinanceAccounts.length || !activeCurrencies.length ? (
                        <div className="alert alert-warning mt-3 mb-0">
                          {language === "es"
                            ? "Primero debes tener cuentas y monedas activas en Finanzas para sincronizar."
                            : "You need active accounts and currencies in Finance before syncing."}
                        </div>
                      ) : null}
                      <div className="row g-3 mt-1">
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
                            <input id="maintenance-sync-income" className="form-check-input" type="checkbox" checked={financeSyncForm.sync_income} onChange={(event) => setFinanceSyncForm((current) => ({ ...current, sync_income: event.target.checked }))} />
                            <label className="form-check-label" htmlFor="maintenance-sync-income">
                              {language === "es" ? "Sincronizar ingreso" : "Sync income"}
                            </label>
                          </div>
                        </div>
                        <div className="col-12 col-md-6">
                          <div className="form-check mt-4">
                            <input id="maintenance-sync-expense" className="form-check-input" type="checkbox" checked={financeSyncForm.sync_expense} onChange={(event) => setFinanceSyncForm((current) => ({ ...current, sync_expense: event.target.checked }))} />
                            <label className="form-check-label" htmlFor="maintenance-sync-expense">
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
                      </div>
                      <div className="maintenance-form__actions">
                        <button className="btn btn-outline-secondary" type="button" onClick={closeCostingModal}>
                          {language === "es" ? "Cerrar" : "Close"}
                        </button>
                        <button className="btn btn-primary" type="submit" disabled={isFinanceSyncSubmitting || financeSyncBlocked}>
                          {isFinanceSyncSubmitting
                            ? language === "es"
                              ? "Sincronizando..."
                              : "Syncing..."
                            : language === "es"
                              ? "Sincronizar con finanzas"
                              : "Sync with Finance"}
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              ) : null}
            </PanelCard>
          </div>
        </div>
      ) : null}

      <DataTableCard
        title={language === "es" ? "Mantenciones abiertas" : "Open maintenance work"}
        subtitle={
          language === "es"
            ? "Solo se muestran programadas o en curso. Al completar o anular, pasan de inmediato al historial."
            : "Only scheduled or in-progress work is shown here. Once completed or cancelled, it immediately moves to history."
        }
        rows={activeRows}
        columns={[
          {
            key: "order",
            header: language === "es" ? "Trabajo" : "Work",
            render: (item) => (
              <div>
                <div className="maintenance-cell__title">
                  {stripLegacyVisibleText(item.title) || "—"}
                </div>
                <div className="maintenance-cell__meta">
                  {stripLegacyVisibleText(item.description) ||
                    (language === "es" ? "Sin detalle adicional" : "No additional detail")}
                </div>
              </div>
            ),
          },
          {
            key: "client",
            header: language === "es" ? "Cliente" : "Client",
            render: (item) => (
              <div>
                <div className="maintenance-cell__title">{getClientDisplayName(item.client_id)}</div>
                <div className="maintenance-cell__meta">{getSiteDisplayName(item.site_id)}</div>
              </div>
            ),
          },
          {
            key: "responsible",
            header: language === "es" ? "Responsable" : "Responsible",
            render: (item) => (
              <div>
                <div className="maintenance-cell__title">
                  {item.assigned_work_group_id
                    ? workGroupById.get(item.assigned_work_group_id)?.name || `#${item.assigned_work_group_id}`
                    : language === "es"
                      ? "Sin grupo"
                      : "No group"}
                </div>
                <div className="maintenance-cell__meta">
                  {item.assigned_tenant_user_id
                    ? tenantUserById.get(item.assigned_tenant_user_id)?.full_name || `#${item.assigned_tenant_user_id}`
                    : language === "es"
                      ? "Sin técnico"
                      : "No technician"}
                </div>
              </div>
            ),
          },
          {
            key: "schedule",
            header: language === "es" ? "Fecha y hora" : "Date and time",
            render: (item) => (
              <div>
                <div>{formatDateTime(item.scheduled_for, language, effectiveTimeZone)}</div>
                <div className="maintenance-cell__meta">
                  {language === "es" ? "Solicitada" : "Requested"}{" "}
                  {formatDateTime(item.requested_at, language, effectiveTimeZone)}
                </div>
              </div>
            ),
          },
          {
            key: "status",
            header: language === "es" ? "Estado" : "Status",
            render: (item) => (
              <AppBadge tone={getStatusTone(item.maintenance_status)}>
                {getStatusLabel(item.maintenance_status, language)}
              </AppBadge>
            ),
          },
          {
            key: "installation",
            header: language === "es" ? "Instalación" : "Installation",
            render: (item) =>
              item.installation_id
                ? installationById.get(item.installation_id)?.name || `#${item.installation_id}`
                : language === "es"
                  ? "Instalación pendiente"
                  : "Installation pending",
          },
          {
            key: "actions",
            header: language === "es" ? "Acciones" : "Actions",
            render: (item) => (
              <AppToolbar compact>
                <button
                  className="btn btn-sm btn-outline-primary"
                  type="button"
                  onClick={() => startEdit(item)}
                >
                  {language === "es" ? "Editar" : "Edit"}
                </button>
                <button
                  className="btn btn-sm btn-outline-secondary"
                  type="button"
                  onClick={() => void openCostingModal(item)}
                >
                  {language === "es" ? "Costos" : "Costing"}
                </button>
                {item.maintenance_status === "scheduled" ? (
                  <button
                    className="btn btn-sm btn-outline-info"
                    type="button"
                    onClick={() => void handleStatusChange(item, "in_progress")}
                  >
                    {language === "es" ? "Iniciar" : "Start"}
                  </button>
                ) : null}
                <button
                  className="btn btn-sm btn-outline-success"
                  type="button"
                  onClick={() => void handleStatusChange(item, "completed")}
                >
                  {language === "es" ? "Completar" : "Complete"}
                </button>
                <button
                  className="btn btn-sm btn-outline-danger"
                  type="button"
                  onClick={() => void handleStatusChange(item, "cancelled")}
                >
                  {language === "es" ? "Anular" : "Cancel"}
                </button>
                <button
                  className="btn btn-sm btn-outline-danger"
                  type="button"
                  onClick={() => void handleDelete(item)}
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
