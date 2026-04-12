import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "../../../../../components/common/PageHeader";
import { MetricCard } from "../../../../../components/common/MetricCard";
import { PanelCard } from "../../../../../components/common/PanelCard";
import { ErrorState } from "../../../../../components/feedback/ErrorState";
import { LoadingBlock } from "../../../../../components/feedback/LoadingBlock";
import { AppBadge } from "../../../../../design-system/AppBadge";
import { AppToolbar } from "../../../../../design-system/AppLayout";
import { AppSpotlight } from "../../../../../design-system/AppSpotlight";
import { getApiErrorDisplayMessage } from "../../../../../services/api";
import {
  pickLocalizedText,
  useLanguage,
} from "../../../../../store/language-context";
import { useTenantAuth } from "../../../../../store/tenant-auth-context";
import { formatDateTimeInTimeZone } from "../../../../../utils/dateTimeLocal";
import type { ApiError, TenantInfoData } from "../../../../../types";
import { updateTenantMaintenanceFinanceSync } from "../../../../../services/tenant-api";
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
  getTenantBusinessClients,
  type TenantBusinessClient,
} from "../../business_core/services/clientsService";
import {
  getTenantBusinessOrganizations,
  type TenantBusinessOrganization,
} from "../../business_core/services/organizationsService";
import {
  getTenantBusinessSites,
  type TenantBusinessSite,
} from "../../business_core/services/sitesService";
import { getVisibleAddressLabel } from "../../business_core/utils/addressPresentation";
import { stripLegacyVisibleText } from "../../../../../utils/legacyVisibleText";
import { MaintenanceHelpBubble } from "../components/common/MaintenanceHelpBubble";
import { MaintenanceModuleNav } from "../components/common/MaintenanceModuleNav";
import {
  getTenantMaintenanceFinanceSyncDefaults,
  type TenantMaintenanceFinanceSyncDefaults,
} from "../services/costingService";
import {
  getTenantMaintenanceWorkOrders,
  type TenantMaintenanceWorkOrder,
} from "../services/workOrdersService";
import {
  getTenantMaintenanceHistory,
  type TenantMaintenanceHistoryWorkOrder,
} from "../services/historyService";

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

function stringifyId(value: number | null | undefined): string {
  return value != null ? String(value) : "";
}

function buildMaintenanceFinanceConfigForm(
  tenantInfo: TenantInfoData | null,
  defaults: TenantMaintenanceFinanceSyncDefaults | null
) {
  return {
    maintenance_finance_sync_mode:
      defaults?.maintenance_finance_sync_mode ||
      tenantInfo?.maintenance_finance_sync_mode ||
      "manual",
    maintenance_finance_auto_sync_income:
      defaults?.maintenance_finance_auto_sync_income ??
      tenantInfo?.maintenance_finance_auto_sync_income ??
      true,
    maintenance_finance_auto_sync_expense:
      defaults?.maintenance_finance_auto_sync_expense ??
      tenantInfo?.maintenance_finance_auto_sync_expense ??
      true,
    maintenance_finance_income_account_id: stringifyId(
      defaults?.maintenance_finance_income_account_id ??
        tenantInfo?.maintenance_finance_income_account_id
    ),
    maintenance_finance_expense_account_id: stringifyId(
      defaults?.maintenance_finance_expense_account_id ??
        tenantInfo?.maintenance_finance_expense_account_id
    ),
    maintenance_finance_income_category_id: stringifyId(
      defaults?.maintenance_finance_income_category_id ??
        tenantInfo?.maintenance_finance_income_category_id
    ),
    maintenance_finance_expense_category_id: stringifyId(
      defaults?.maintenance_finance_expense_category_id ??
        tenantInfo?.maintenance_finance_expense_category_id
    ),
    maintenance_finance_currency_id: stringifyId(
      defaults?.maintenance_finance_currency_id ??
        tenantInfo?.maintenance_finance_currency_id
    ),
  };
}

export function MaintenanceOverviewPage() {
  const { session, tenantInfo, effectiveTimeZone, refreshTenantInfo } = useTenantAuth();
  const { language } = useLanguage();
  const [workOrders, setWorkOrders] = useState<TenantMaintenanceWorkOrder[]>([]);
  const [historyRows, setHistoryRows] = useState<TenantMaintenanceHistoryWorkOrder[]>([]);
  const [clients, setClients] = useState<TenantBusinessClient[]>([]);
  const [organizations, setOrganizations] = useState<TenantBusinessOrganization[]>([]);
  const [sites, setSites] = useState<TenantBusinessSite[]>([]);
  const [financeAccounts, setFinanceAccounts] = useState<TenantFinanceAccount[]>([]);
  const [financeCategories, setFinanceCategories] = useState<TenantFinanceCategory[]>([]);
  const [financeCurrencies, setFinanceCurrencies] = useState<TenantFinanceCurrency[]>([]);
  const [financeDefaults, setFinanceDefaults] =
    useState<TenantMaintenanceFinanceSyncDefaults | null>(null);
  const [financeConfigNotice, setFinanceConfigNotice] = useState<string | null>(null);
  const [isSavingFinanceConfig, setIsSavingFinanceConfig] = useState(false);
  const [financeConfigForm, setFinanceConfigForm] = useState({
    maintenance_finance_sync_mode: "auto_on_close",
    maintenance_finance_auto_sync_income: true,
    maintenance_finance_auto_sync_expense: true,
    maintenance_finance_income_account_id: "",
    maintenance_finance_expense_account_id: "",
    maintenance_finance_income_category_id: "",
    maintenance_finance_expense_category_id: "",
    maintenance_finance_currency_id: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  const clientById = useMemo(
    () => new Map(clients.map((client) => [client.id, client])),
    [clients]
  );
  const organizationById = useMemo(
    () => new Map(organizations.map((organization) => [organization.id, organization])),
    [organizations]
  );
  const siteById = useMemo(() => new Map(sites.map((site) => [site.id, site])), [sites]);

  const activeSummary = useMemo(
    () =>
      workOrders.reduce(
        (accumulator, row) => {
          if (row.maintenance_status === "scheduled") {
            accumulator.scheduled += 1;
            accumulator.total += 1;
          } else if (row.maintenance_status === "in_progress") {
            accumulator.inProgress += 1;
            accumulator.total += 1;
          }
          return accumulator;
        },
        { total: 0, scheduled: 0, inProgress: 0 }
      ),
    [workOrders]
  );

  const latestCompleted = useMemo(() => historyRows.slice(0, 5), [historyRows]);
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
  const activeAccounts = useMemo(
    () => financeAccounts.filter((account) => account.is_active),
    [financeAccounts]
  );
  const activeCurrencies = useMemo(
    () => financeCurrencies.filter((currency) => currency.is_active),
    [financeCurrencies]
  );
  const financeDefaultsHint = useMemo(() => {
    if (!financeDefaults) {
      return null;
    }
    const pieces = [
      activeCurrencies.find((item) => item.id === financeDefaults.maintenance_finance_currency_id)
        ?.code,
      activeAccounts.find((item) => item.id === financeDefaults.maintenance_finance_income_account_id)
        ?.name,
      incomeCategories.find(
        (item) => item.id === financeDefaults.maintenance_finance_income_category_id
      )?.name,
      activeAccounts.find((item) => item.id === financeDefaults.maintenance_finance_expense_account_id)
        ?.name,
      expenseCategories.find(
        (item) => item.id === financeDefaults.maintenance_finance_expense_category_id
      )?.name,
    ].filter((value): value is string => Boolean(value));
    if (!pieces.length) {
      return language === "es"
        ? "El backend no encontró defaults efectivos adicionales en Finanzas."
        : "The backend did not find additional effective defaults in Finance.";
    }
    return language === "es"
      ? `Sugerencia efectiva desde backend: ${pieces.join(" · ")}.`
      : `Effective backend suggestion: ${pieces.join(" · ")}.`;
  }, [
    activeAccounts,
    activeCurrencies,
    expenseCategories,
    financeDefaults,
    incomeCategories,
    language,
  ]);
  const spotlightStats = useMemo(
    () => [
      {
        label: pickLocalizedText(language, { es: "Abiertas", en: "Open" }),
        value: activeSummary.total,
      },
      {
        label: pickLocalizedText(language, {
          es: "Programadas",
          en: "Scheduled",
        }),
        value: activeSummary.scheduled,
      },
      {
        label: pickLocalizedText(language, {
          es: "Realizadas",
          en: "Completed",
        }),
        value: historyRows.length,
      },
    ],
    [activeSummary.scheduled, activeSummary.total, historyRows.length, language]
  );

  async function loadData() {
    if (!session?.accessToken) {
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const [workOrdersResponse, historyResponse, clientsResponse, organizationsResponse, sitesResponse] =
        await Promise.all([
          getTenantMaintenanceWorkOrders(session.accessToken),
          getTenantMaintenanceHistory(session.accessToken),
          getTenantBusinessClients(session.accessToken, { includeInactive: true }),
          getTenantBusinessOrganizations(session.accessToken, { includeInactive: true }),
          getTenantBusinessSites(session.accessToken, { includeInactive: true }),
        ]);
      setWorkOrders(workOrdersResponse.data);
      setHistoryRows(historyResponse.data);
      setClients(clientsResponse.data);
      setOrganizations(organizationsResponse.data);
      setSites(sitesResponse.data);
      const financeCatalogResults = await Promise.allSettled([
        getTenantFinanceAccounts(session.accessToken, false),
        getTenantFinanceCategories(session.accessToken, { includeInactive: false }),
        getTenantFinanceCurrencies(session.accessToken, false),
        getTenantMaintenanceFinanceSyncDefaults(session.accessToken),
      ]);
      if (financeCatalogResults[0].status === "fulfilled") {
        setFinanceAccounts(financeCatalogResults[0].value.data);
      }
      if (financeCatalogResults[1].status === "fulfilled") {
        setFinanceCategories(financeCatalogResults[1].value.data);
      }
      if (financeCatalogResults[2].status === "fulfilled") {
        setFinanceCurrencies(financeCatalogResults[2].value.data);
      }
      if (financeCatalogResults[3].status === "fulfilled") {
        setFinanceDefaults(financeCatalogResults[3].value.data);
      } else {
        setFinanceDefaults(null);
      }
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
    setFinanceConfigForm(buildMaintenanceFinanceConfigForm(tenantInfo, financeDefaults));
  }, [
    financeDefaults,
    tenantInfo?.maintenance_finance_auto_sync_expense,
    tenantInfo?.maintenance_finance_auto_sync_income,
    tenantInfo?.maintenance_finance_currency_id,
    tenantInfo?.maintenance_finance_expense_account_id,
    tenantInfo?.maintenance_finance_expense_category_id,
    tenantInfo?.maintenance_finance_income_account_id,
    tenantInfo?.maintenance_finance_income_category_id,
    tenantInfo?.maintenance_finance_sync_mode,
  ]);

  function getClientLabel(clientId: number): string {
    const client = clientById.get(clientId);
    const organization = organizationById.get(client?.organization_id ?? -1);
    return (
      stripLegacyVisibleText(organization?.name) ||
      stripLegacyVisibleText(organization?.legal_name) ||
      (language === "es" ? "Cliente sin nombre" : "Unnamed client")
    );
  }

  function getAddressLabel(siteId: number): string {
    const site = siteById.get(siteId);
    if (!site) {
      return language === "es" ? "Dirección sin registrar" : "Missing address";
    }
    const base =
      stripLegacyVisibleText(getVisibleAddressLabel(site)) ||
      stripLegacyVisibleText(site.name) ||
      (language === "es" ? "Dirección sin nombre" : "Unnamed address");
    const locality = [site.commune, site.city, site.region]
      .map((value) => stripLegacyVisibleText(value))
      .filter((value): value is string => Boolean(value))
      .join(", ");
    return locality ? `${base} · ${locality}` : base;
  }

  async function saveMaintenanceFinanceConfig() {
    if (!session?.accessToken || session.role !== "admin") {
      return;
    }
    setIsSavingFinanceConfig(true);
    setFinanceConfigNotice(null);
    try {
      const response = await updateTenantMaintenanceFinanceSync(session.accessToken, {
        maintenance_finance_sync_mode: financeConfigForm.maintenance_finance_sync_mode,
        maintenance_finance_auto_sync_income:
          financeConfigForm.maintenance_finance_auto_sync_income,
        maintenance_finance_auto_sync_expense:
          financeConfigForm.maintenance_finance_auto_sync_expense,
        maintenance_finance_income_account_id: financeConfigForm.maintenance_finance_income_account_id
          ? Number(financeConfigForm.maintenance_finance_income_account_id)
          : null,
        maintenance_finance_expense_account_id: financeConfigForm.maintenance_finance_expense_account_id
          ? Number(financeConfigForm.maintenance_finance_expense_account_id)
          : null,
        maintenance_finance_income_category_id:
          financeConfigForm.maintenance_finance_income_category_id
            ? Number(financeConfigForm.maintenance_finance_income_category_id)
            : null,
        maintenance_finance_expense_category_id:
          financeConfigForm.maintenance_finance_expense_category_id
            ? Number(financeConfigForm.maintenance_finance_expense_category_id)
            : null,
        maintenance_finance_currency_id: financeConfigForm.maintenance_finance_currency_id
          ? Number(financeConfigForm.maintenance_finance_currency_id)
          : null,
      });
      setFinanceConfigNotice(response.message);
      await refreshTenantInfo();
      await loadData();
    } catch (rawError) {
      setFinanceConfigNotice(getApiErrorDisplayMessage(rawError as ApiError));
    } finally {
      setIsSavingFinanceConfig(false);
    }
  }

  return (
    <div className="d-grid gap-4">
      <PageHeader
        eyebrow={pickLocalizedText(language, {
          es: "Mantenciones",
          en: "Maintenance",
        })}
        icon="maintenance"
        title={pickLocalizedText(language, {
          es: "Resumen técnico",
          en: "Technical overview",
        })}
        description={pickLocalizedText(language, {
          es: "Panel corto del módulo: abiertas para ejecutar y últimas mantenciones ya realizadas.",
          en: "Short operational dashboard: open work to execute and the latest completed maintenance.",
        })}
        actions={
          <AppToolbar compact>
            <MaintenanceHelpBubble
              label={pickLocalizedText(language, { es: "Ayuda", en: "Help" })}
              helpText={pickLocalizedText(language, {
                es: "Este resumen debe leerse así: abiertas para trabajo diario y últimas realizadas como control rápido de cierre.",
                en: "Read this summary as: open work for day-to-day operations and latest completed work as a quick closing check.",
              })}
            />
            <button className="btn btn-outline-secondary" type="button" onClick={() => void loadData()}>
              {pickLocalizedText(language, { es: "Recargar", en: "Reload" })}
            </button>
          </AppToolbar>
        }
      />
      <MaintenanceModuleNav />

      <AppSpotlight
        icon="maintenance"
        eyebrow={pickLocalizedText(language, {
          es: "Operación técnica",
          en: "Technical operation",
        })}
        title={pickLocalizedText(language, {
          es: "Vista corta para priorizar trabajo",
          en: "Short view to prioritize work",
        })}
        description={pickLocalizedText(language, {
          es: "El módulo concentra abiertas, programadas y cierres recientes para que la agenda diaria y el control post-servicio queden en el mismo punto de entrada.",
          en: "The module concentrates open work, scheduled items, and recent closures so the daily agenda and post-service control stay in the same entry point.",
        })}
        stats={spotlightStats}
      />

      {error ? (
        <ErrorState
          title={pickLocalizedText(language, {
            es: "No se pudo cargar el resumen",
            en: "The overview could not be loaded",
          })}
          detail={getApiErrorDisplayMessage(error)}
          requestId={error.payload?.request_id}
        />
      ) : null}

      {isLoading ? (
        <LoadingBlock
          label={pickLocalizedText(language, {
            es: "Cargando resumen técnico...",
            en: "Loading technical overview...",
          })}
        />
      ) : null}

      <div className="row g-3">
        <div className="col-12 col-md-6 col-xl-3">
          <MetricCard
            label={language === "es" ? "Abiertas" : "Open"}
            value={activeSummary.total}
            hint={language === "es" ? "Programadas y en curso" : "Scheduled and in progress"}
            icon="maintenance"
            tone="info"
          />
        </div>
        <div className="col-12 col-md-6 col-xl-3">
          <MetricCard
            label={language === "es" ? "Programadas" : "Scheduled"}
            value={activeSummary.scheduled}
            hint={language === "es" ? "Pendientes de ejecutar" : "Waiting to be executed"}
            icon="planning"
            tone="warning"
          />
        </div>
        <div className="col-12 col-md-6 col-xl-3">
          <MetricCard
            label={language === "es" ? "En curso" : "In progress"}
            value={activeSummary.inProgress}
            hint={language === "es" ? "Trabajo activo" : "Active work"}
            icon="focus"
            tone="info"
          />
        </div>
        <div className="col-12 col-md-6 col-xl-3">
          <MetricCard
            label={language === "es" ? "Realizadas" : "Completed"}
            value={historyRows.length}
            hint={language === "es" ? "Ya visibles en historial" : "Already visible in history"}
            icon="tenant-history"
            tone="success"
          />
        </div>
      </div>

      <PanelCard
        title={language === "es" ? "Últimas 5 mantenciones realizadas" : "Last 5 completed maintenance jobs"}
        subtitle={
          language === "es"
            ? "Control rápido de cierres recientes con cliente, dirección y fecha de trabajo."
            : "Quick view of recent closures with client, address, and work date."
        }
      >
        {latestCompleted.length === 0 ? (
          <div className="maintenance-cell__meta">
            {language === "es" ? "Todavía no hay mantenciones realizadas." : "There are no completed maintenance jobs yet."}
          </div>
        ) : (
          <div className="d-grid gap-3">
            {latestCompleted.map((item) => (
              <div key={item.id} className="maintenance-history-entry">
                <div className="d-flex flex-wrap justify-content-between gap-2 align-items-start">
                  <div className="d-grid gap-1">
                    <div className="maintenance-history-entry__title">
                      {stripLegacyVisibleText(item.title) || "—"}
                    </div>
                    <div className="maintenance-history-entry__meta">
                      {getClientLabel(item.client_id)}
                    </div>
                    <div className="maintenance-history-entry__meta">
                      {getAddressLabel(item.site_id)}
                    </div>
                  </div>
                  <AppBadge tone={getStatusTone(item.maintenance_status)}>
                    {item.maintenance_status === "completed"
                      ? language === "es"
                        ? "Realizada"
                        : "Completed"
                      : language === "es"
                        ? "Anulada"
                        : "Cancelled"}
                  </AppBadge>
                </div>
                <div className="maintenance-history-entry__meta mt-2">
                  {language === "es" ? "Cierre" : "Closed"}:{" "}
                  {formatDateTime(item.completed_at || item.cancelled_at, language, effectiveTimeZone)}
                </div>
                <div className="maintenance-history-entry__meta">
                  {language === "es" ? "Programada" : "Scheduled"}:{" "}
                  {formatDateTime(item.scheduled_for, language, effectiveTimeZone)}
                </div>
                {stripLegacyVisibleText(item.description) ? (
                  <div className="maintenance-history-entry__meta mt-2">
                    {stripLegacyVisibleText(item.description)}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </PanelCard>

      <PanelCard
        title={
          language === "es"
            ? "Sincronización automática a finanzas"
            : "Automatic finance sync"
        }
        subtitle={
          language === "es"
            ? "Controla si al cerrar una mantención se generan automáticamente el ingreso y egreso vinculados por source_type/source_id."
            : "Control whether closing a maintenance job automatically generates the linked income and expense through source_type/source_id."
        }
      >
        <div className="d-flex flex-wrap justify-content-between gap-2 align-items-start mb-3">
          <div className="maintenance-cell__meta">
            {language === "es"
              ? "Sugerencia: usa auto-sync cuando moneda/categorías estén listas; deja manual si prefieres revisar cada cierre."
              : "Suggestion: use auto-sync once currency/categories are ready; keep manual if you prefer reviewing each close."}
          </div>
          <AppBadge
            tone={
              financeConfigForm.maintenance_finance_sync_mode === "auto_on_close"
                ? "warning"
                : "neutral"
            }
          >
            {financeConfigForm.maintenance_finance_sync_mode === "auto_on_close"
              ? language === "es"
                ? "auto al cerrar"
                : "auto on close"
              : language === "es"
                ? "manual"
                : "manual"}
          </AppBadge>
        </div>

        <div className="alert alert-secondary mb-3">
          {financeDefaultsHint ??
            (language === "es"
              ? "El backend propone los defaults efectivos que luego se usan para prellenar las OT y la sincronización con Finanzas."
              : "The backend proposes the effective defaults later used to prefill work orders and the sync with Finance.")}
        </div>

        <div className="row g-3">
          <div className="col-12 col-lg-4">
            <label className="form-label">
              {language === "es" ? "Modo de sincronización" : "Sync mode"}
            </label>
            <select
              className="form-select"
              value={financeConfigForm.maintenance_finance_sync_mode}
              onChange={(event) =>
                setFinanceConfigForm((current) => ({
                  ...current,
                  maintenance_finance_sync_mode: event.target.value,
                }))
              }
            >
              <option value="manual">{language === "es" ? "Manual" : "Manual"}</option>
              <option value="auto_on_close">
                {language === "es" ? "Automática al cerrar" : "Automatic on close"}
              </option>
            </select>
          </div>
          <div className="col-12 col-lg-4">
            <label className="form-label">
              {language === "es" ? "Cuenta ingreso por defecto" : "Default income account"}
            </label>
            <select
              className="form-select"
              value={financeConfigForm.maintenance_finance_income_account_id}
              onChange={(event) =>
                setFinanceConfigForm((current) => ({
                  ...current,
                  maintenance_finance_income_account_id: event.target.value,
                }))
              }
            >
              <option value="">{language === "es" ? "Sin cuenta fija" : "No fixed account"}</option>
              {activeAccounts.map((account) => (
                <option key={`income-account-${account.id}`} value={String(account.id)}>
                  {account.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-12 col-lg-4">
            <label className="form-label">
              {language === "es" ? "Cuenta egreso por defecto" : "Default expense account"}
            </label>
            <select
              className="form-select"
              value={financeConfigForm.maintenance_finance_expense_account_id}
              onChange={(event) =>
                setFinanceConfigForm((current) => ({
                  ...current,
                  maintenance_finance_expense_account_id: event.target.value,
                }))
              }
            >
              <option value="">{language === "es" ? "Sin cuenta fija" : "No fixed account"}</option>
              {activeAccounts.map((account) => (
                <option key={`expense-account-${account.id}`} value={String(account.id)}>
                  {account.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-12 col-lg-4">
            <div className="form-check mt-4 pt-2">
              <input
                id="maintenance-finance-auto-income"
                className="form-check-input"
                type="checkbox"
                checked={financeConfigForm.maintenance_finance_auto_sync_income}
                onChange={(event) =>
                  setFinanceConfigForm((current) => ({
                    ...current,
                    maintenance_finance_auto_sync_income: event.target.checked,
                  }))
                }
              />
              <label className="form-check-label" htmlFor="maintenance-finance-auto-income">
                {language === "es" ? "Auto-sync ingreso" : "Auto-sync income"}
              </label>
            </div>
          </div>
          <div className="col-12 col-lg-4">
            <div className="form-check mt-4 pt-2">
              <input
                id="maintenance-finance-auto-expense"
                className="form-check-input"
                type="checkbox"
                checked={financeConfigForm.maintenance_finance_auto_sync_expense}
                onChange={(event) =>
                  setFinanceConfigForm((current) => ({
                    ...current,
                    maintenance_finance_auto_sync_expense: event.target.checked,
                  }))
                }
              />
              <label className="form-check-label" htmlFor="maintenance-finance-auto-expense">
                {language === "es" ? "Auto-sync egreso" : "Auto-sync expense"}
              </label>
            </div>
          </div>
          <div className="col-12 col-lg-4">
            <label className="form-label">
              {language === "es" ? "Moneda por defecto" : "Default currency"}
            </label>
            <select
              className="form-select"
              value={financeConfigForm.maintenance_finance_currency_id}
              onChange={(event) =>
                setFinanceConfigForm((current) => ({
                  ...current,
                  maintenance_finance_currency_id: event.target.value,
                }))
              }
            >
              <option value="">{language === "es" ? "Usar base de finance" : "Use finance base currency"}</option>
              {activeCurrencies.map((currency) => (
                <option key={`currency-${currency.id}`} value={String(currency.id)}>
                  {currency.code} · {currency.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-12 col-lg-6">
            <label className="form-label">
              {language === "es" ? "Categoría ingreso por defecto" : "Default income category"}
            </label>
            <select
              className="form-select"
              value={financeConfigForm.maintenance_finance_income_category_id}
              onChange={(event) =>
                setFinanceConfigForm((current) => ({
                  ...current,
                  maintenance_finance_income_category_id: event.target.value,
                }))
              }
            >
              <option value="">{language === "es" ? "Sin categoría fija" : "No fixed category"}</option>
              {incomeCategories.map((category) => (
                <option key={`income-category-${category.id}`} value={String(category.id)}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-12 col-lg-6">
            <label className="form-label">
              {language === "es" ? "Categoría egreso por defecto" : "Default expense category"}
            </label>
            <select
              className="form-select"
              value={financeConfigForm.maintenance_finance_expense_category_id}
              onChange={(event) =>
                setFinanceConfigForm((current) => ({
                  ...current,
                  maintenance_finance_expense_category_id: event.target.value,
                }))
              }
            >
              <option value="">{language === "es" ? "Sin categoría fija" : "No fixed category"}</option>
              {expenseCategories.map((category) => (
                <option key={`expense-category-${category.id}`} value={String(category.id)}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {financeConfigNotice ? (
          <div className="maintenance-history-entry__meta mt-3">{financeConfigNotice}</div>
        ) : null}

        <div className="d-flex justify-content-end gap-2 mt-3">
          <button
            className="btn btn-outline-secondary"
            type="button"
            onClick={() =>
              setFinanceConfigForm(buildMaintenanceFinanceConfigForm(tenantInfo, financeDefaults))
            }
          >
            {language === "es" ? "Restaurar" : "Reset"}
          </button>
          <button
            className="btn btn-primary"
            type="button"
            disabled={isSavingFinanceConfig || session?.role !== "admin"}
            onClick={() => void saveMaintenanceFinanceConfig()}
          >
            {isSavingFinanceConfig
              ? language === "es"
                ? "Guardando..."
                : "Saving..."
              : language === "es"
                ? "Guardar política"
                : "Save policy"}
          </button>
        </div>
      </PanelCard>
    </div>
  );
}
