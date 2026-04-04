import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "../../../../../components/common/PageHeader";
import { MetricCard } from "../../../../../components/common/MetricCard";
import { PanelCard } from "../../../../../components/common/PanelCard";
import { ErrorState } from "../../../../../components/feedback/ErrorState";
import { LoadingBlock } from "../../../../../components/feedback/LoadingBlock";
import { AppBadge } from "../../../../../design-system/AppBadge";
import { AppToolbar } from "../../../../../design-system/AppLayout";
import { getApiErrorDisplayMessage } from "../../../../../services/api";
import { useLanguage } from "../../../../../store/language-context";
import { useTenantAuth } from "../../../../../store/tenant-auth-context";
import { formatDateTimeInTimeZone } from "../../../../../utils/dateTimeLocal";
import type { ApiError } from "../../../../../types";
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

export function MaintenanceOverviewPage() {
  const { session, effectiveTimeZone } = useTenantAuth();
  const { language } = useLanguage();
  const [workOrders, setWorkOrders] = useState<TenantMaintenanceWorkOrder[]>([]);
  const [historyRows, setHistoryRows] = useState<TenantMaintenanceHistoryWorkOrder[]>([]);
  const [clients, setClients] = useState<TenantBusinessClient[]>([]);
  const [organizations, setOrganizations] = useState<TenantBusinessOrganization[]>([]);
  const [sites, setSites] = useState<TenantBusinessSite[]>([]);
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
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [session?.accessToken]);

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

  return (
    <div className="d-grid gap-4">
      <PageHeader
        eyebrow={language === "es" ? "Mantenciones" : "Maintenance"}
        icon="maintenance"
        title={language === "es" ? "Resumen técnico" : "Technical overview"}
        description={
          language === "es"
            ? "Panel corto del módulo: abiertas para ejecutar y últimas mantenciones ya realizadas."
            : "Short operational dashboard: open work to execute and the latest completed maintenance."
        }
        actions={
          <AppToolbar compact>
            <MaintenanceHelpBubble
              label={language === "es" ? "Ayuda" : "Help"}
              helpText={
                language === "es"
                  ? "Este resumen debe leerse así: abiertas para trabajo diario y últimas realizadas como control rápido de cierre."
                  : "Read this summary as: open work for day-to-day operations and latest completed work as a quick closing check."
              }
            />
            <button className="btn btn-outline-secondary" type="button" onClick={() => void loadData()}>
              {language === "es" ? "Recargar" : "Reload"}
            </button>
          </AppToolbar>
        }
      />
      <MaintenanceModuleNav />

      {error ? (
        <ErrorState
          title={language === "es" ? "No se pudo cargar el resumen" : "The overview could not be loaded"}
          detail={getApiErrorDisplayMessage(error)}
          requestId={error.payload?.request_id}
        />
      ) : null}

      {isLoading ? (
        <LoadingBlock label={language === "es" ? "Cargando resumen técnico..." : "Loading technical overview..."} />
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
    </div>
  );
}
