import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "../../../../../components/common/PageHeader";
import { PanelCard } from "../../../../../components/common/PanelCard";
import { DataTableCard } from "../../../../../components/data-display/DataTableCard";
import { ErrorState } from "../../../../../components/feedback/ErrorState";
import { LoadingBlock } from "../../../../../components/feedback/LoadingBlock";
import { AppBadge } from "../../../../../design-system/AppBadge";
import { AppToolbar } from "../../../../../design-system/AppLayout";
import { getApiErrorDisplayMessage } from "../../../../../services/api";
import { useLanguage } from "../../../../../store/language-context";
import { useTenantAuth } from "../../../../../store/tenant-auth-context";
import type { ApiError } from "../../../../../types";
import {
  getTenantBusinessClients,
  type TenantBusinessClient,
} from "../../business_core/services/clientsService";
import {
  getTenantBusinessSites,
  type TenantBusinessSite,
} from "../../business_core/services/sitesService";
import { MaintenanceHelpBubble } from "../components/common/MaintenanceHelpBubble";
import { MaintenanceModuleNav } from "../components/common/MaintenanceModuleNav";
import {
  getTenantMaintenanceHistory,
  type TenantMaintenanceHistoryWorkOrder,
} from "../services/historyService";
import {
  getTenantMaintenanceInstallations,
  type TenantMaintenanceInstallation,
} from "../services/installationsService";
import { stripLegacyVisibleText } from "../../../../../utils/legacyVisibleText";

function formatDateTime(value: string | null, language: "es" | "en"): string {
  if (!value) {
    return language === "es" ? "sin fecha" : "no date";
  }
  return new Date(value).toLocaleString(language === "es" ? "es-CL" : "en-US");
}

function getStatusLabel(status: string, language: "es" | "en"): string {
  switch (status) {
    case "completed":
      return language === "es" ? "Completada" : "Completed";
    case "cancelled":
      return language === "es" ? "Anulada" : "Cancelled";
    case "in_progress":
      return language === "es" ? "En curso" : "In progress";
    case "scheduled":
      return language === "es" ? "Programada" : "Scheduled";
    default:
      return status;
  }
}

function getStatusTone(status: string): "success" | "danger" | "warning" | "info" | "neutral" {
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

export function MaintenanceHistoryPage() {
  const { session } = useTenantAuth();
  const { language } = useLanguage();
  const [rows, setRows] = useState<TenantMaintenanceHistoryWorkOrder[]>([]);
  const [clients, setClients] = useState<TenantBusinessClient[]>([]);
  const [sites, setSites] = useState<TenantBusinessSite[]>([]);
  const [installations, setInstallations] = useState<TenantMaintenanceInstallation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  const clientById = useMemo(
    () => new Map(clients.map((client) => [client.id, client])),
    [clients]
  );
  const siteById = useMemo(() => new Map(sites.map((site) => [site.id, site])), [sites]);
  const installationById = useMemo(
    () => new Map(installations.map((item) => [item.id, item])),
    [installations]
  );

  async function loadData() {
    if (!session?.accessToken) {
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const [historyResponse, clientsResponse, sitesResponse, installationsResponse] =
        await Promise.all([
          getTenantMaintenanceHistory(session.accessToken),
          getTenantBusinessClients(session.accessToken, { includeInactive: true }),
          getTenantBusinessSites(session.accessToken, { includeInactive: true }),
          getTenantMaintenanceInstallations(session.accessToken, { includeInactive: true }),
        ]);
      setRows(historyResponse.data);
      setClients(clientsResponse.data);
      setSites(sitesResponse.data);
      setInstallations(installationsResponse.data);
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [session?.accessToken]);

  return (
    <div className="d-grid gap-4">
      <PageHeader
        eyebrow={language === "es" ? "Mantenciones" : "Maintenance"}
        icon="tenant-history"
        title={language === "es" ? "Historial técnico" : "Technical history"}
        description={
          language === "es"
            ? "Órdenes cerradas con trazabilidad, visitas registradas y lectura operativa por cliente y sitio."
            : "Closed work orders with traceability, registered visits, and operational reading by client and site."
        }
        actions={
          <AppToolbar compact>
            <MaintenanceHelpBubble
              label={language === "es" ? "Ayuda" : "Help"}
              helpText={
                language === "es"
                  ? "Aquí no se consulta una tabla paralela de histórico de la app vieja. La lectura se deriva del lifecycle de las órdenes cerradas en el PaaS."
                  : "This does not read a parallel legacy history table. The view is derived from the lifecycle of closed work orders in the PaaS."
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
          title={
            language === "es"
              ? "No se pudo cargar el historial"
              : "The history could not be loaded"
          }
          detail={getApiErrorDisplayMessage(error)}
          requestId={error.payload?.request_id}
        />
      ) : null}

      {isLoading ? (
        <LoadingBlock label={language === "es" ? "Cargando historial..." : "Loading history..."} />
      ) : null}

      <DataTableCard
        title={language === "es" ? "Órdenes cerradas" : "Closed work orders"}
        subtitle={
          language === "es"
            ? "Cada fila mantiene visitas y cambios de estado sin mover registros a otra tabla operativa."
            : "Each row keeps visits and status changes without moving records into another operating table."
        }
        rows={rows}
        columns={[
          {
            key: "order",
            header: language === "es" ? "Orden" : "Order",
            render: (item) => {
              const site = siteById.get(item.site_id);
              const client = clientById.get(item.client_id);
              return (
                <div>
                  <div className="maintenance-cell__title">{item.title}</div>
                  <div className="maintenance-cell__meta">
                    {(client?.client_code || `#${item.client_id}`) +
                      " · " +
                      (site?.name || `#${item.site_id}`)}
                  </div>
                </div>
              );
            },
          },
          {
            key: "status",
            header: language === "es" ? "Estado final" : "Final status",
            render: (item) => (
              <AppBadge tone={getStatusTone(item.maintenance_status)}>
                {getStatusLabel(item.maintenance_status, language)}
              </AppBadge>
            ),
          },
          {
            key: "dates",
            header: language === "es" ? "Fechas" : "Dates",
            render: (item) => (
              <div>
                <div>
                  {item.maintenance_status === "completed"
                    ? formatDateTime(item.completed_at, language)
                    : formatDateTime(item.cancelled_at, language)}
                </div>
                <div className="maintenance-cell__meta">
                  {language === "es" ? "Solicitada" : "Requested"}{" "}
                  {formatDateTime(item.requested_at, language)}
                </div>
              </div>
            ),
          },
          {
            key: "traceability",
            header: language === "es" ? "Trazabilidad" : "Traceability",
            render: (item) => (
              <div>
                <div>
                  {item.status_logs.length}{" "}
                  {language === "es"
                    ? item.status_logs.length === 1
                      ? "log"
                      : "logs"
                    : item.status_logs.length === 1
                      ? "log"
                      : "logs"}
                </div>
                <div className="maintenance-cell__meta">
                  {item.visits.length}{" "}
                  {language === "es"
                    ? item.visits.length === 1
                      ? "visita"
                      : "visitas"
                    : item.visits.length === 1
                      ? "visit"
                      : "visits"}
                </div>
              </div>
            ),
          },
        ]}
      />

      <div className="row g-3">
        {rows.map((item) => (
          <div className="col-12" key={item.id}>
            <PanelCard
              title={item.title}
              subtitle={
                language === "es"
                  ? `${clientById.get(item.client_id)?.client_code || `#${item.client_id}`} · ${
                      siteById.get(item.site_id)?.name || `#${item.site_id}`
                    }`
                  : `${clientById.get(item.client_id)?.client_code || `#${item.client_id}`} · ${
                      siteById.get(item.site_id)?.name || `#${item.site_id}`
                    }`
              }
              actions={
                <AppBadge tone={getStatusTone(item.maintenance_status)}>
                  {getStatusLabel(item.maintenance_status, language)}
                </AppBadge>
              }
            >
              <div className="row g-3">
                <div className="col-12 col-lg-6">
                  <h3 className="panel-card__title h6 mb-3">
                    {language === "es" ? "Resumen" : "Summary"}
                  </h3>
                  <div className="maintenance-cell__meta">
                    {language === "es" ? "Referencia" : "Reference"}:{" "}
                    {item.external_reference || (language === "es" ? "sin referencia" : "no reference")}
                  </div>
                  <div className="maintenance-cell__meta">
                    {language === "es" ? "Instalación" : "Installation"}:{" "}
                    {item.installation_id
                      ? installationById.get(item.installation_id)?.name || `#${item.installation_id}`
                      : language === "es"
                        ? "sin instalación"
                        : "no installation"}
                  </div>
                  <div className="maintenance-cell__meta">
                    {language === "es" ? "Programada" : "Scheduled"}:{" "}
                    {formatDateTime(item.scheduled_for, language)}
                  </div>
                  {stripLegacyVisibleText(item.description) ? (
                    <p className="mb-0 mt-3">{stripLegacyVisibleText(item.description)}</p>
                  ) : null}
                </div>
                <div className="col-12 col-lg-3">
                  <h3 className="panel-card__title h6 mb-3">
                    {language === "es" ? "Cambios de estado" : "Status changes"}
                  </h3>
                  <div className="d-grid gap-2">
                    {item.status_logs.map((log) => (
                      <div key={log.id} className="maintenance-history-entry">
                        <div className="maintenance-history-entry__title">
                          {(log.from_status || (language === "es" ? "inicio" : "start")) +
                            " -> " +
                            log.to_status}
                        </div>
                        <div className="maintenance-history-entry__meta">
                          {formatDateTime(log.changed_at, language)}
                        </div>
                        {stripLegacyVisibleText(log.note) ? (
                          <div className="maintenance-history-entry__meta">{stripLegacyVisibleText(log.note)}</div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="col-12 col-lg-3">
                  <h3 className="panel-card__title h6 mb-3">
                    {language === "es" ? "Visitas" : "Visits"}
                  </h3>
                  <div className="d-grid gap-2">
                    {item.visits.length === 0 ? (
                      <div className="maintenance-history-entry__meta">
                        {language === "es" ? "Sin visitas registradas" : "No visits recorded"}
                      </div>
                    ) : (
                      item.visits.map((visit) => (
                        <div key={visit.id} className="maintenance-history-entry">
                          <div className="maintenance-history-entry__title">
                            {getStatusLabel(visit.visit_status, language)}
                          </div>
                          <div className="maintenance-history-entry__meta">
                            {formatDateTime(visit.scheduled_start_at, language)}
                          </div>
                          {visit.assigned_group_label ? (
                            <div className="maintenance-history-entry__meta">
                              {visit.assigned_group_label}
                            </div>
                          ) : null}
                          {stripLegacyVisibleText(visit.notes) ? (
                            <div className="maintenance-history-entry__meta">{stripLegacyVisibleText(visit.notes)}</div>
                          ) : null}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </PanelCard>
          </div>
        ))}
      </div>
    </div>
  );
}
