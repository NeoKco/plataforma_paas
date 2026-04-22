import { useEffect, useMemo, useState } from "react";
import { DataTableCard } from "../../../../../components/data-display/DataTableCard";
import { PageHeader } from "../../../../../components/common/PageHeader";
import { MetricCard } from "../../../../../components/common/MetricCard";
import { PanelCard } from "../../../../../components/common/PanelCard";
import { ErrorState } from "../../../../../components/feedback/ErrorState";
import { LoadingBlock } from "../../../../../components/feedback/LoadingBlock";
import { AppBadge } from "../../../../../design-system/AppBadge";
import { AppFilterGrid } from "../../../../../design-system/AppLayout";
import { getApiErrorDisplayMessage } from "../../../../../services/api";
import { useLanguage } from "../../../../../store/language-context";
import { useTenantAuth } from "../../../../../store/tenant-auth-context";
import { formatDateTimeInTimeZone } from "../../../../../utils/dateTimeLocal";
import { stripLegacyVisibleText } from "../../../../../utils/legacyVisibleText";
import type { ApiError } from "../../../../../types";
import {
  getTenantBusinessClients,
  type TenantBusinessClient,
} from "../../business_core/services/clientsService";
import {
  getTenantBusinessContacts,
  type TenantBusinessContact,
} from "../../business_core/services/contactsService";
import {
  getTenantBusinessOrganizations,
  type TenantBusinessOrganization,
} from "../../business_core/services/organizationsService";
import {
  getTenantBusinessSites,
  type TenantBusinessSite,
} from "../../business_core/services/sitesService";
import { getVisibleAddressLabel } from "../../business_core/utils/addressPresentation";
import { MaintenanceModuleNav } from "../components/common/MaintenanceModuleNav";
import {
  getTenantMaintenanceEquipmentTypes,
  type TenantMaintenanceEquipmentType,
} from "../services/equipmentTypesService";
import {
  getTenantMaintenanceHistory,
  type TenantMaintenanceHistoryWorkOrder,
} from "../services/historyService";
import {
  getTenantMaintenanceInstallations,
  type TenantMaintenanceInstallation,
} from "../services/installationsService";
import {
  getTenantMaintenanceWorkOrders,
  type TenantMaintenanceWorkOrder,
} from "../services/workOrdersService";

function buildMonthValue(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthMatches(value: string | null | undefined, month: string) {
  if (!value) {
    return false;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return false;
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}` === month;
}

function formatDateTime(value: string | null, language: "es" | "en", timeZone?: string | null) {
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

function getStatusLabel(status: string, language: "es" | "en") {
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

function getDaysFromNow(value: string | null | undefined) {
  if (!value) {
    return null;
  }
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) {
    return null;
  }
  return Math.floor((Date.now() - timestamp) / (1000 * 60 * 60 * 24));
}

type HistoricalMaintenanceReportRow = {
  id: number;
  organizationLabel: string;
  clientLabel: string;
  primaryContactLabel: string;
  primaryContactDetail: string | null;
  addressLabel: string;
  installationLabel: string;
  completedAt: string | null;
};

export function MaintenanceReportsPage() {
  const { session, effectiveTimeZone } = useTenantAuth();
  const { language } = useLanguage();
  const [periodMonth, setPeriodMonth] = useState(buildMonthValue());
  const [equipmentTypeFilter, setEquipmentTypeFilter] = useState("all");
  const [organizationFilter, setOrganizationFilter] = useState("all");
  const [workOrders, setWorkOrders] = useState<TenantMaintenanceWorkOrder[]>([]);
  const [historyRows, setHistoryRows] = useState<TenantMaintenanceHistoryWorkOrder[]>([]);
  const [installations, setInstallations] = useState<TenantMaintenanceInstallation[]>([]);
  const [equipmentTypes, setEquipmentTypes] = useState<TenantMaintenanceEquipmentType[]>([]);
  const [clients, setClients] = useState<TenantBusinessClient[]>([]);
  const [contacts, setContacts] = useState<TenantBusinessContact[]>([]);
  const [organizations, setOrganizations] = useState<TenantBusinessOrganization[]>([]);
  const [sites, setSites] = useState<TenantBusinessSite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  const installationById = useMemo(
    () => new Map(installations.map((item) => [item.id, item])),
    [installations]
  );
  const equipmentTypeById = useMemo(
    () => new Map(equipmentTypes.map((item) => [item.id, item])),
    [equipmentTypes]
  );
  const clientById = useMemo(() => new Map(clients.map((item) => [item.id, item])), [clients]);
  const contactsByOrganizationId = useMemo(() => {
    const grouped = new Map<number, TenantBusinessContact[]>();
    contacts.forEach((contact) => {
      const existing = grouped.get(contact.organization_id) ?? [];
      existing.push(contact);
      grouped.set(contact.organization_id, existing);
    });
    return grouped;
  }, [contacts]);
  const organizationById = useMemo(
    () => new Map(organizations.map((item) => [item.id, item])),
    [organizations]
  );
  const siteById = useMemo(() => new Map(sites.map((item) => [item.id, item])), [sites]);

  useEffect(() => {
    async function loadData() {
      if (!session?.accessToken) {
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const [
          workOrdersResponse,
          historyResponse,
          installationsResponse,
          equipmentTypesResponse,
          clientsResponse,
          contactsResponse,
          organizationsResponse,
          sitesResponse,
        ] = await Promise.all([
          getTenantMaintenanceWorkOrders(session.accessToken),
          getTenantMaintenanceHistory(session.accessToken),
          getTenantMaintenanceInstallations(session.accessToken),
          getTenantMaintenanceEquipmentTypes(session.accessToken),
          getTenantBusinessClients(session.accessToken, { includeInactive: true }),
          getTenantBusinessContacts(session.accessToken, { includeInactive: true }),
          getTenantBusinessOrganizations(session.accessToken, { includeInactive: true }),
          getTenantBusinessSites(session.accessToken, { includeInactive: true }),
        ]);
        setWorkOrders(workOrdersResponse.data);
        setHistoryRows(historyResponse.data);
        setInstallations(installationsResponse.data);
        setEquipmentTypes(equipmentTypesResponse.data);
        setClients(clientsResponse.data);
        setContacts(contactsResponse.data);
        setOrganizations(organizationsResponse.data);
        setSites(sitesResponse.data);
      } catch (rawError) {
        setError(rawError as ApiError);
      } finally {
        setIsLoading(false);
      }
    }

    void loadData();
  }, [session?.accessToken]);

  function matchesEquipmentType(installationId: number | null) {
    if (equipmentTypeFilter === "all") {
      return true;
    }
    if (!installationId) {
      return false;
    }
    return String(installationById.get(installationId)?.equipment_type_id || "") === equipmentTypeFilter;
  }

  function getOrganization(clientId: number) {
    const client = clientById.get(clientId);
    return organizationById.get(client?.organization_id ?? -1) ?? null;
  }

  function getOrganizationOptionLabel(organization: TenantBusinessOrganization | null | undefined) {
    const commercialName = stripLegacyVisibleText(organization?.name);
    const legalName = stripLegacyVisibleText(organization?.legal_name);
    return legalName || commercialName || (language === "es" ? "Organización sin nombre" : "Unnamed organization");
  }

  function getOrganizationLegalLabel(clientId: number) {
    const organization = getOrganization(clientId);
    return (
      stripLegacyVisibleText(organization?.legal_name) ||
      stripLegacyVisibleText(organization?.name) ||
      (language === "es" ? "Organización sin nombre" : "Unnamed organization")
    );
  }

  function getClientLabel(clientId: number) {
    return (
      stripLegacyVisibleText(getOrganization(clientId)?.legal_name) ||
      stripLegacyVisibleText(getOrganization(clientId)?.name) ||
      (language === "es" ? "Cliente sin nombre" : "Unnamed client")
    );
  }

  function getSiteLabel(siteId: number) {
    const site = siteById.get(siteId);
    if (!site) {
      return language === "es" ? "Dirección sin registrar" : "Missing address";
    }
    return (
      stripLegacyVisibleText(getVisibleAddressLabel(site)) ||
      stripLegacyVisibleText(site.name) ||
      (language === "es" ? "Dirección sin nombre" : "Unnamed address")
    );
  }

  function getPrimaryContact(clientId: number): TenantBusinessContact | null {
    const client = clientById.get(clientId);
    if (!client) {
      return null;
    }
    const organizationContacts = contactsByOrganizationId.get(client.organization_id) ?? [];
    return (
      organizationContacts.find((contact) => contact.is_primary && contact.is_active) ??
      organizationContacts.find((contact) => contact.is_active) ??
      organizationContacts.find((contact) => contact.is_primary) ??
      organizationContacts[0] ??
      null
    );
  }

  function getPrimaryContactLabel(clientId: number): string {
    return (
      stripLegacyVisibleText(getPrimaryContact(clientId)?.full_name) ||
      (language === "es" ? "Sin contacto principal" : "No primary contact")
    );
  }

  function getPrimaryContactDetail(clientId: number): string | null {
    const contact = getPrimaryContact(clientId);
    if (!contact) {
      return null;
    }
    const parts = [
      stripLegacyVisibleText(contact.role_title),
      stripLegacyVisibleText(contact.phone),
      stripLegacyVisibleText(contact.email),
    ].filter((value): value is string => Boolean(value));
    return parts.length ? parts.join(" · ") : null;
  }

  const filteredHistoryRows = useMemo(
    () =>
      historyRows.filter(
        (item) =>
          monthMatches(item.completed_at || item.cancelled_at, periodMonth) &&
          matchesEquipmentType(item.installation_id)
      ),
    [historyRows, periodMonth, equipmentTypeFilter, installationById]
  );

  const filteredOpenRows = useMemo(
    () => workOrders.filter((item) => matchesEquipmentType(item.installation_id)),
    [workOrders, equipmentTypeFilter, installationById]
  );

  const completedRows = useMemo(
    () => filteredHistoryRows.filter((item) => item.maintenance_status === "completed"),
    [filteredHistoryRows]
  );

  const cancelledRows = useMemo(
    () => filteredHistoryRows.filter((item) => item.maintenance_status === "cancelled"),
    [filteredHistoryRows]
  );

  const attendedInstallationCount = useMemo(
    () =>
      new Set(
        filteredHistoryRows
          .map((item) => item.installation_id)
          .filter((value): value is number => value !== null)
      ).size,
    [filteredHistoryRows]
  );

  const closureNotesCoverage = useMemo(() => {
    if (filteredHistoryRows.length === 0) {
      return 0;
    }
    const covered = filteredHistoryRows.filter((item) => stripLegacyVisibleText(item.closure_notes)).length;
    return Math.round((covered / filteredHistoryRows.length) * 100);
  }, [filteredHistoryRows]);

  const visitsExecutionCoverage = useMemo(() => {
    if (filteredHistoryRows.length === 0) {
      return 0;
    }
    const covered = filteredHistoryRows.filter((item) =>
      item.visits.some((visit) => visit.actual_start_at || visit.actual_end_at)
    ).length;
    return Math.round((covered / filteredHistoryRows.length) * 100);
  }, [filteredHistoryRows]);

  const preventiveCoverage = useMemo(() => {
    if (filteredHistoryRows.length === 0) {
      return 0;
    }
    const covered = filteredHistoryRows.filter((item) => item.schedule_id !== null).length;
    return Math.round((covered / filteredHistoryRows.length) * 100);
  }, [filteredHistoryRows]);

  const equipmentTypeSummary = useMemo(() => {
    const summary = new Map<number, { open: number; closed: number; cancelled: number }>();

    filteredOpenRows.forEach((item) => {
      const installation = item.installation_id ? installationById.get(item.installation_id) : null;
      const equipmentTypeId = installation?.equipment_type_id;
      if (!equipmentTypeId) {
        return;
      }
      const current = summary.get(equipmentTypeId) || { open: 0, closed: 0, cancelled: 0 };
      if (item.maintenance_status === "scheduled" || item.maintenance_status === "in_progress") {
        current.open += 1;
      }
      summary.set(equipmentTypeId, current);
    });

    filteredHistoryRows.forEach((item) => {
      const installation = item.installation_id ? installationById.get(item.installation_id) : null;
      const equipmentTypeId = installation?.equipment_type_id;
      if (!equipmentTypeId) {
        return;
      }
      const current = summary.get(equipmentTypeId) || { open: 0, closed: 0, cancelled: 0 };
      if (item.maintenance_status === "completed") {
        current.closed += 1;
      } else if (item.maintenance_status === "cancelled") {
        current.cancelled += 1;
      }
      summary.set(equipmentTypeId, current);
    });

    return [...summary.entries()]
      .map(([equipmentTypeId, values]) => ({
        equipmentTypeId,
        equipmentTypeLabel:
          equipmentTypeById.get(equipmentTypeId)?.name ||
          `#${equipmentTypeId}`,
        ...values,
      }))
      .sort((left, right) => right.closed + right.open - (left.closed + left.open));
  }, [equipmentTypeById, filteredHistoryRows, filteredOpenRows, installationById]);

  const staleInstallations = useMemo(() => {
    return installations
      .filter((item) => item.is_active)
      .filter((item) => matchesEquipmentType(item.id))
      .map((item) => ({
        installation: item,
        daysSinceLastService: getDaysFromNow(item.last_service_at),
        hasOpenOrder: filteredOpenRows.some(
          (workOrder) => workOrder.installation_id === item.id && (workOrder.maintenance_status === "scheduled" || workOrder.maintenance_status === "in_progress")
        ),
      }))
      .filter((item) => !item.hasOpenOrder && (item.daysSinceLastService === null || item.daysSinceLastService >= 180))
      .sort((left, right) => (right.daysSinceLastService || 99999) - (left.daysSinceLastService || 99999))
      .slice(0, 8);
  }, [installations, filteredOpenRows, equipmentTypeFilter]);

  const recentClosures = useMemo(
    () => filteredHistoryRows.slice(0, 8),
    [filteredHistoryRows]
  );

  const organizationFilterOptions = useMemo(() => {
    const seen = new Set<number>();
    return completedRows
      .map((item) => getOrganization(item.client_id))
      .filter((organization): organization is TenantBusinessOrganization => Boolean(organization))
      .filter((organization) => {
        if (seen.has(organization.id)) {
          return false;
        }
        seen.add(organization.id);
        return true;
      })
      .sort((left, right) => getOrganizationOptionLabel(left).localeCompare(getOrganizationOptionLabel(right), language));
  }, [completedRows, language]);

  const historicalReportRows = useMemo<HistoricalMaintenanceReportRow[]>(
    () =>
      completedRows
        .filter((item) => {
          if (organizationFilter === "all") {
            return true;
          }
          const client = clientById.get(item.client_id);
          return String(client?.organization_id ?? "") === organizationFilter;
        })
        .map((item) => ({
          id: item.id,
          organizationLabel: getOrganizationLegalLabel(item.client_id),
          clientLabel: getClientLabel(item.client_id),
          primaryContactLabel: getPrimaryContactLabel(item.client_id),
          primaryContactDetail: getPrimaryContactDetail(item.client_id),
          addressLabel: getSiteLabel(item.site_id),
          installationLabel:
            (item.installation_id && stripLegacyVisibleText(installationById.get(item.installation_id)?.name)) ||
            (language === "es" ? "Instalación pendiente" : "Installation pending"),
          completedAt: item.completed_at,
        }))
        .sort((left, right) => {
          const leftTime = left.completedAt ? new Date(left.completedAt).getTime() : 0;
          const rightTime = right.completedAt ? new Date(right.completedAt).getTime() : 0;
          return rightTime - leftTime;
        }),
    [
      clientById,
      completedRows,
      installationById,
      language,
      organizationFilter,
      organizations,
      contacts,
      sites,
    ]
  );

  return (
    <div className="d-grid gap-4">
      <PageHeader
        eyebrow={language === "es" ? "Mantenimiento" : "Maintenance"}
        icon="reports"
        title={language === "es" ? "Reportes técnicos" : "Technical reports"}
        description={
          language === "es"
            ? "Primer corte analítico del módulo para revisar cierres, cobertura técnica y activos con atención pendiente."
            : "First analytical slice of the module to review closures, technical coverage, and assets pending attention."
        }
      />

      <MaintenanceModuleNav />

      <PanelCard
        title={language === "es" ? "Periodo y foco técnico" : "Period and technical focus"}
        subtitle={
          language === "es"
            ? "Lectura mensual operativa basada en órdenes cerradas, agenda abierta e instalaciones activas."
            : "Monthly operational reading based on closed orders, open schedule, and active installations."
        }
      >
        <AppFilterGrid>
          <div>
            <label className="form-label">{language === "es" ? "Mes" : "Month"}</label>
            <input
              className="form-control"
              type="month"
              value={periodMonth}
              onChange={(event) => setPeriodMonth(event.target.value)}
            />
          </div>
          <div>
            <label className="form-label">
              {language === "es" ? "Tipo de equipo" : "Equipment type"}
            </label>
            <select
              className="form-select"
              value={equipmentTypeFilter}
              onChange={(event) => setEquipmentTypeFilter(event.target.value)}
            >
              <option value="all">{language === "es" ? "Todos" : "All"}</option>
              {equipmentTypes.map((item) => (
                <option key={item.id} value={String(item.id)}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">
              {language === "es" ? "Organización / razón social" : "Organization / legal name"}
            </label>
            <select
              className="form-select"
              value={organizationFilter}
              onChange={(event) => setOrganizationFilter(event.target.value)}
            >
              <option value="all">{language === "es" ? "Todas" : "All"}</option>
              {organizationFilterOptions.map((organization) => (
                <option key={organization.id} value={String(organization.id)}>
                  {getOrganizationOptionLabel(organization)}
                </option>
              ))}
            </select>
          </div>
        </AppFilterGrid>
      </PanelCard>

      {error ? (
        <ErrorState
          title={language === "es" ? "No se pudieron cargar los reportes" : "Reports could not be loaded"}
          detail={getApiErrorDisplayMessage(error)}
          requestId={error.payload?.request_id}
        />
      ) : isLoading ? (
        <LoadingBlock label={language === "es" ? "Cargando reportes técnicos..." : "Loading technical reports..."} />
      ) : (
        <>
          <div className="row g-3">
            <div className="col-12 col-md-6 col-xl-3">
              <MetricCard
                label={language === "es" ? "Cierres del período" : "Period closures"}
                value={String(filteredHistoryRows.length)}
                hint={language === "es" ? "Completadas y anuladas" : "Completed and cancelled"}
                icon="reports"
                tone="info"
              />
            </div>
            <div className="col-12 col-md-6 col-xl-3">
              <MetricCard
                label={language === "es" ? "Completadas" : "Completed"}
                value={String(completedRows.length)}
                hint={`${language === "es" ? "Anuladas" : "Cancelled"}: ${cancelledRows.length}`}
                icon="tenant-history"
                tone="success"
              />
            </div>
            <div className="col-12 col-md-6 col-xl-3">
              <MetricCard
                label={language === "es" ? "Instalaciones atendidas" : "Assets attended"}
                value={String(attendedInstallationCount)}
                hint={language === "es" ? "Con cierre en el período" : "With closure in period"}
                icon="catalogs"
              />
            </div>
            <div className="col-12 col-md-6 col-xl-3">
              <MetricCard
                label={language === "es" ? "Abiertas hoy" : "Open today"}
                value={String(filteredOpenRows.filter((item) => item.maintenance_status === "scheduled" || item.maintenance_status === "in_progress").length)}
                hint={language === "es" ? "Agenda operativa vigente" : "Current operational schedule"}
                icon="planning"
                tone="warning"
              />
            </div>
          </div>

          <div className="row g-3">
            <div className="col-12 col-lg-4">
              <MetricCard
                label={language === "es" ? "Cobertura de cierre" : "Closure coverage"}
                value={`${closureNotesCoverage}%`}
                hint={language === "es" ? "OT cerradas con observación útil" : "Closed work orders with useful closure notes"}
                icon="focus"
                tone="success"
              />
            </div>
            <div className="col-12 col-lg-4">
              <MetricCard
                label={language === "es" ? "Trazabilidad de visitas" : "Visit traceability"}
                value={`${visitsExecutionCoverage}%`}
                hint={language === "es" ? "Cierres con ejecución registrada" : "Closures with recorded execution"}
                icon="overview"
                tone="info"
              />
            </div>
            <div className="col-12 col-lg-4">
              <MetricCard
                label={language === "es" ? "Cobertura preventiva" : "Preventive coverage"}
                value={`${preventiveCoverage}%`}
                hint={language === "es" ? "Cierres originados en programación" : "Closures originating from schedules"}
                icon="planning"
                tone="warning"
              />
            </div>
          </div>

          <div className="row g-3">
            <div className="col-12">
              <DataTableCard
                title={language === "es" ? "Histórico realizado por organización" : "Completed history by organization"}
                subtitle={
                  language === "es"
                    ? "Listado operativo de mantenciones efectivamente realizadas. Se filtra por razón social y evita mezclar anuladas con trabajo ejecutado."
                    : "Operational list of maintenance effectively completed. It filters by legal name and keeps cancelled rows out of executed work."
                }
                rows={historicalReportRows}
                columns={[
                  {
                    key: "organization",
                    header: language === "es" ? "Organización / razón social" : "Organization / legal name",
                    render: (item) => <div className="maintenance-cell__title">{item.organizationLabel}</div>,
                  },
                  {
                    key: "client",
                    header: language === "es" ? "Cliente" : "Client",
                    render: (item) => <div className="maintenance-cell__title">{item.clientLabel}</div>,
                  },
                  {
                    key: "contact",
                    header: language === "es" ? "Contacto principal" : "Primary contact",
                    render: (item) => (
                      <div>
                        <div className="maintenance-cell__title">{item.primaryContactLabel}</div>
                        {item.primaryContactDetail ? (
                          <div className="maintenance-cell__meta">{item.primaryContactDetail}</div>
                        ) : null}
                      </div>
                    ),
                  },
                  {
                    key: "address",
                    header: language === "es" ? "Dirección" : "Address",
                    render: (item) => <div>{item.addressLabel}</div>,
                  },
                  {
                    key: "installation",
                    header: language === "es" ? "Instalación" : "Installation",
                    render: (item) => <div>{item.installationLabel}</div>,
                  },
                  {
                    key: "completedAt",
                    header: language === "es" ? "Fecha realizada" : "Completed date",
                    render: (item) => (
                      <div>{formatDateTime(item.completedAt, language, effectiveTimeZone)}</div>
                    ),
                  },
                ]}
              />
            </div>
            <div className="col-12 col-xl-7">
              <PanelCard
                title={language === "es" ? "Cierres recientes del período" : "Recent period closures"}
                subtitle={
                  language === "es"
                    ? "Lista operativa para revisar motivo, instalación y consistencia del cierre técnico."
                    : "Operational list to review reason, installation and closure consistency."
                }
              >
                <div className="d-grid gap-2">
                  {recentClosures.length ? (
                    recentClosures.map((item) => (
                      <div key={item.id} className="maintenance-history-entry">
                        <div className="d-flex flex-wrap justify-content-between gap-2 align-items-start">
                          <div>
                            <div className="maintenance-history-entry__title">{item.title}</div>
                            <div className="maintenance-history-entry__meta">
                              {getClientLabel(item.client_id)} · {getSiteLabel(item.site_id)}
                            </div>
                            <div className="maintenance-history-entry__meta">
                              {(item.installation_id && installationById.get(item.installation_id)?.name) || "—"}
                              {" · "}
                              {formatDateTime(
                                item.completed_at || item.cancelled_at,
                                language,
                                effectiveTimeZone
                              )}
                            </div>
                            <div className="maintenance-history-entry__meta">
                              {stripLegacyVisibleText(item.closure_notes) ||
                                stripLegacyVisibleText(item.cancellation_reason) ||
                                (language === "es" ? "Sin observación relevante" : "No relevant note")}
                            </div>
                          </div>
                          <div className="d-grid gap-1 justify-items-end">
                            <AppBadge tone={getStatusTone(item.maintenance_status)}>
                              {getStatusLabel(item.maintenance_status, language)}
                            </AppBadge>
                            <small className="text-muted">
                              {language === "es" ? "Visitas" : "Visits"}: {item.visits.length}
                            </small>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-muted">
                      {language === "es"
                        ? "No hay cierres para este período y filtro técnico."
                        : "There are no closures for this period and technical filter."}
                    </div>
                  )}
                </div>
              </PanelCard>
            </div>

            <div className="col-12 col-xl-5">
              <PanelCard
                title={language === "es" ? "Cobertura por tipo de equipo" : "Coverage by equipment type"}
                subtitle={
                  language === "es"
                    ? "Cruza carga abierta y cierres del período sobre cada familia técnica."
                    : "Crosses open load and period closures for each technical family."
                }
              >
                <div className="d-grid gap-2">
                  {equipmentTypeSummary.length ? (
                    equipmentTypeSummary.map((item) => (
                      <div key={item.equipmentTypeId} className="maintenance-history-entry">
                        <div className="d-flex flex-wrap justify-content-between gap-2 align-items-start">
                          <div>
                            <div className="maintenance-history-entry__title">{item.equipmentTypeLabel}</div>
                            <div className="maintenance-history-entry__meta">
                              {language === "es" ? "Abiertas" : "Open"}: {item.open} · {language === "es" ? "Completadas" : "Completed"}: {item.closed} · {language === "es" ? "Anuladas" : "Cancelled"}: {item.cancelled}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-muted">
                      {language === "es"
                        ? "No hay cobertura visible para el período actual."
                        : "There is no visible coverage for the current period."}
                    </div>
                  )}
                </div>
              </PanelCard>
            </div>
          </div>

          <div className="row g-3">
            <div className="col-12 col-xl-6">
              <PanelCard
                title={language === "es" ? "Instalaciones sin servicio reciente" : "Installations without recent service"}
                subtitle={
                  language === "es"
                    ? "Activos sin OT abierta y con última atención vieja o no registrada."
                    : "Assets with no open work order and with stale or missing last service."
                }
              >
                <div className="d-grid gap-2">
                  {staleInstallations.length ? (
                    staleInstallations.map(({ installation, daysSinceLastService }) => {
                      const site = siteById.get(installation.site_id);
                      return (
                        <div key={installation.id} className="maintenance-history-entry">
                          <div className="maintenance-history-entry__title">{installation.name}</div>
                          <div className="maintenance-history-entry__meta">
                            {site ? getClientLabel(site.client_id) : "—"} · {site ? getSiteLabel(site.id) : "—"}
                          </div>
                          <div className="maintenance-history-entry__meta">
                            {language === "es" ? "Último servicio" : "Last service"}: {formatDateTime(
                              installation.last_service_at,
                              language,
                              effectiveTimeZone
                            )}
                            {daysSinceLastService !== null
                              ? ` · ${daysSinceLastService} ${language === "es" ? "días" : "days"}`
                              : ""}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-muted">
                      {language === "es"
                        ? "No hay activos críticos bajo este filtro."
                        : "There are no critical assets under this filter."}
                    </div>
                  )}
                </div>
              </PanelCard>
            </div>

            <div className="col-12 col-xl-6">
              <PanelCard
                title={language === "es" ? "Lectura operativa del período" : "Operational reading of the period"}
                subtitle={
                  language === "es"
                    ? "Resumen ejecutivo para soporte, coordinación y jefatura técnica."
                    : "Executive summary for support, coordination and technical leadership."
                }
              >
                <ul className="mb-0 text-secondary d-grid gap-2">
                  <li>
                    {language === "es"
                      ? `Se registran ${filteredHistoryRows.length} cierres en ${periodMonth}, con ${closureNotesCoverage}% de cobertura de observación útil.`
                      : `${filteredHistoryRows.length} closures are recorded in ${periodMonth}, with ${closureNotesCoverage}% useful note coverage.`}
                  </li>
                  <li>
                    {language === "es"
                      ? `${visitsExecutionCoverage}% de los cierres trae ejecución de visita registrada, lo que ayuda a auditar terreno.`
                      : `${visitsExecutionCoverage}% of closures include recorded visit execution, which helps field auditing.`}
                  </li>
                  <li>
                    {language === "es"
                      ? `${preventiveCoverage}% proviene de programación preventiva, mostrando cuánto del cierre ya está entrando por flujo planificado.`
                      : `${preventiveCoverage}% comes from preventive scheduling, showing how much closure already enters through planned flow.`}
                  </li>
                  <li>
                    {language === "es"
                      ? `Hoy quedan ${filteredOpenRows.filter((item) => item.maintenance_status === "scheduled" || item.maintenance_status === "in_progress").length} OT abiertas bajo este foco técnico.`
                      : `Today there are ${filteredOpenRows.filter((item) => item.maintenance_status === "scheduled" || item.maintenance_status === "in_progress").length} open work orders under this technical focus.`}
                  </li>
                </ul>
              </PanelCard>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
