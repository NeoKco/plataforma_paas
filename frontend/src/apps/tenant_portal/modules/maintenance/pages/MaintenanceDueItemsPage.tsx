import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "../../../../../components/common/PageHeader";
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
import { formatDateTimeInTimeZone } from "../../../../../utils/dateTimeLocal";
import type { ApiError, TenantUsersItem } from "../../../../../types";
import { MaintenanceHelpBubble } from "../components/common/MaintenanceHelpBubble";
import { MaintenanceModuleNav } from "../components/common/MaintenanceModuleNav";
import {
  createTenantMaintenanceSchedule,
  type TenantMaintenanceScheduleWriteRequest,
} from "../services/schedulesService";
import {
  getTenantMaintenanceDueItems,
  scheduleTenantMaintenanceDueItem,
  type TenantMaintenanceDueItem,
} from "../services/dueItemsService";
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
  getTenantBusinessSites,
  type TenantBusinessSite,
} from "../../business_core/services/sitesService";
import {
  getTenantBusinessTaskTypes,
  type TenantBusinessTaskType,
} from "../../business_core/services/taskTypesService";
import {
  getTenantBusinessWorkGroups,
  type TenantBusinessWorkGroup,
} from "../../business_core/services/workGroupsService";
import { stripLegacyVisibleText } from "../../../../../utils/legacyVisibleText";
import { getVisibleAddressLabel } from "../../business_core/utils/addressPresentation";

function buildDefaultScheduleForm(): TenantMaintenanceScheduleWriteRequest {
  return {
    client_id: 0,
    site_id: null,
    installation_id: null,
    task_type_id: null,
    name: "",
    description: null,
    frequency_value: 6,
    frequency_unit: "months",
    lead_days: 30,
    start_mode: "from_manual_due_date",
    base_date: null,
    last_executed_at: null,
    next_due_at: "",
    default_priority: "normal",
    estimated_duration_minutes: 60,
    billing_mode: "per_work_order",
    is_active: true,
    auto_create_due_items: true,
    notes: null,
  };
}

type DueScheduleForm = {
  scheduled_for: string;
  site_id: number | null;
  installation_id: number | null;
  title: string;
  description: string;
  priority: string;
  assigned_work_group_id: number | null;
  assigned_tenant_user_id: number | null;
};

function buildDefaultDueScheduleForm(): DueScheduleForm {
  return {
    scheduled_for: "",
    site_id: null,
    installation_id: null,
    title: "",
    description: "",
    priority: "normal",
    assigned_work_group_id: null,
    assigned_tenant_user_id: null,
  };
}

function formatDateTime(value: string | null, language: "es" | "en", timeZone?: string | null): string {
  if (!value) {
    return language === "es" ? "sin fecha" : "no date";
  }
  return formatDateTimeInTimeZone(value, language, timeZone);
}

function getDueTone(status: string): "success" | "warning" | "danger" | "info" | "neutral" {
  switch (status) {
    case "due":
      return "danger";
    case "upcoming":
      return "warning";
    case "contacted":
      return "info";
    case "postponed":
      return "neutral";
    default:
      return "neutral";
  }
}

function getDueLabel(status: string, language: "es" | "en"): string {
  switch (status) {
    case "due":
      return language === "es" ? "Vencida" : "Due";
    case "upcoming":
      return language === "es" ? "Por vencer" : "Upcoming";
    case "contacted":
      return language === "es" ? "Contactada" : "Contacted";
    case "postponed":
      return language === "es" ? "Pospuesta" : "Postponed";
    default:
      return status;
  }
}

export function MaintenanceDueItemsPage() {
  const { session, effectiveTimeZone } = useTenantAuth();
  const { language } = useLanguage();
  const [rows, setRows] = useState<TenantMaintenanceDueItem[]>([]);
  const [clients, setClients] = useState<TenantBusinessClient[]>([]);
  const [organizations, setOrganizations] = useState<TenantBusinessOrganization[]>([]);
  const [sites, setSites] = useState<TenantBusinessSite[]>([]);
  const [installations, setInstallations] = useState<TenantMaintenanceInstallation[]>([]);
  const [taskTypes, setTaskTypes] = useState<TenantBusinessTaskType[]>([]);
  const [workGroups, setWorkGroups] = useState<TenantBusinessWorkGroup[]>([]);
  const [tenantUsers, setTenantUsers] = useState<TenantUsersItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [selectedDueItem, setSelectedDueItem] = useState<TenantMaintenanceDueItem | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [scheduleForm, setScheduleForm] = useState<TenantMaintenanceScheduleWriteRequest>(buildDefaultScheduleForm());
  const [dueScheduleForm, setDueScheduleForm] = useState<DueScheduleForm>(buildDefaultDueScheduleForm());

  const clientById = useMemo(() => new Map(clients.map((item) => [item.id, item])), [clients]);
  const organizationById = useMemo(
    () => new Map(organizations.map((item) => [item.id, item])),
    [organizations]
  );
  const siteById = useMemo(() => new Map(sites.map((item) => [item.id, item])), [sites]);
  const installationById = useMemo(
    () => new Map(installations.map((item) => [item.id, item])),
    [installations]
  );

  const filteredSitesForSchedule = useMemo(
    () =>
      scheduleForm.client_id > 0
        ? sites.filter((site) => site.client_id === Number(scheduleForm.client_id))
        : sites,
    [scheduleForm.client_id, sites]
  );
  const filteredInstallationsForSchedule = useMemo(
    () =>
      scheduleForm.site_id
        ? installations.filter((item) => item.site_id === Number(scheduleForm.site_id))
        : [],
    [scheduleForm.site_id, installations]
  );
  const filteredInstallationsForDue = useMemo(
    () =>
      dueScheduleForm.site_id
        ? installations.filter((item) => item.site_id === Number(dueScheduleForm.site_id))
        : [],
    [dueScheduleForm.site_id, installations]
  );

  const metrics = useMemo(() => {
    return rows.reduce(
      (accumulator, row) => {
        accumulator.total += 1;
        if (row.due_status === "due") {
          accumulator.due += 1;
        } else if (row.due_status === "upcoming") {
          accumulator.upcoming += 1;
        } else if (row.due_status === "contacted") {
          accumulator.contacted += 1;
        }
        return accumulator;
      },
      { total: 0, due: 0, upcoming: 0, contacted: 0 }
    );
  }, [rows]);

  async function loadData() {
    if (!session?.accessToken) {
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const [
        dueItemsResponse,
        clientsResponse,
        organizationsResponse,
        sitesResponse,
        installationsResponse,
        taskTypesResponse,
        workGroupsResponse,
        tenantUsersResponse,
      ] = await Promise.all([
        getTenantMaintenanceDueItems(session.accessToken),
        getTenantBusinessClients(session.accessToken, { includeInactive: false }),
        getTenantBusinessOrganizations(session.accessToken, { includeInactive: false }),
        getTenantBusinessSites(session.accessToken, { includeInactive: false }),
        getTenantMaintenanceInstallations(session.accessToken, { includeInactive: false }),
        getTenantBusinessTaskTypes(session.accessToken, { includeInactive: false }),
        getTenantBusinessWorkGroups(session.accessToken, { includeInactive: false }),
        getTenantUsers(session.accessToken),
      ]);
      setRows(dueItemsResponse.data);
      setClients(clientsResponse.data);
      setOrganizations(organizationsResponse.data);
      setSites(sitesResponse.data);
      setInstallations(installationsResponse.data);
      setTaskTypes(taskTypesResponse.data);
      setWorkGroups(workGroupsResponse.data);
      setTenantUsers(tenantUsersResponse.data);
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [session?.accessToken]);

  function getOrganizationName(clientId: number): string {
    const client = clientById.get(clientId);
    const organization = organizationById.get(client?.organization_id ?? -1);
    return (
      stripLegacyVisibleText(organization?.name) ||
      stripLegacyVisibleText(organization?.legal_name) ||
      (language === "es" ? "Organización sin nombre" : "Unnamed organization")
    );
  }

  function getClientName(clientId: number): string {
    return getOrganizationName(clientId);
  }

  function getSiteLabel(siteId: number | null): string {
    if (!siteId) {
      return language === "es" ? "Dirección pendiente" : "Missing address";
    }
    const site = siteById.get(siteId);
    if (!site) {
      return language === "es" ? "Dirección pendiente" : "Missing address";
    }
    return stripLegacyVisibleText(getVisibleAddressLabel(site)) || stripLegacyVisibleText(site.name) || "—";
  }

  function getInstallationName(installationId: number | null): string {
    if (!installationId) {
      return language === "es" ? "Instalación pendiente" : "Installation pending";
    }
    return installationById.get(installationId)?.name || `#${installationId}`;
  }

  function startCreatePlan() {
    setFeedback(null);
    setScheduleForm(buildDefaultScheduleForm());
    setIsPlanModalOpen(true);
  }

  function openScheduleDueItem(item: TenantMaintenanceDueItem) {
    setSelectedDueItem(item);
    setDueScheduleForm({
      scheduled_for: item.due_at.slice(0, 16),
      site_id: item.site_id,
      installation_id: item.installation_id,
      title: item.schedule_name,
      description: item.schedule_description ?? "",
      priority: item.default_priority,
      assigned_work_group_id: item.assigned_work_group_id,
      assigned_tenant_user_id: item.assigned_tenant_user_id,
    });
    setFeedback(null);
    setIsScheduleModalOpen(true);
  }

  async function handleCreatePlan(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.accessToken) {
      return;
    }
    setIsSubmitting(true);
    setFeedback(null);
    try {
      await createTenantMaintenanceSchedule(session.accessToken, {
        ...scheduleForm,
        description: scheduleForm.description?.trim() || null,
        notes: scheduleForm.notes?.trim() || null,
      });
      setFeedback(language === "es" ? "Programación creada." : "Schedule created.");
      setIsPlanModalOpen(false);
      await loadData();
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleScheduleDueItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.accessToken || !selectedDueItem) {
      return;
    }
    setIsSubmitting(true);
    setFeedback(null);
    try {
      await scheduleTenantMaintenanceDueItem(session.accessToken, selectedDueItem.id, {
        scheduled_for: dueScheduleForm.scheduled_for || null,
        site_id: dueScheduleForm.site_id,
        installation_id: dueScheduleForm.installation_id,
        title: dueScheduleForm.title.trim() || null,
        description: dueScheduleForm.description.trim() || null,
        priority: dueScheduleForm.priority || null,
        assigned_work_group_id: dueScheduleForm.assigned_work_group_id,
        assigned_tenant_user_id: dueScheduleForm.assigned_tenant_user_id,
      });
      setFeedback(language === "es" ? "Mantención agendada." : "Maintenance scheduled.");
      setIsScheduleModalOpen(false);
      setSelectedDueItem(null);
      await loadData();
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="d-grid gap-4">
      <PageHeader
        eyebrow={language === "es" ? "Mantenciones" : "Maintenance"}
        icon="planning"
        title={language === "es" ? "Pendientes" : "Due maintenance"}
        description={
          language === "es"
            ? "Bandeja automática de mantenciones por vencer o vencidas, agrupables por organización pero operadas por cliente y dirección."
            : "Automatic queue of upcoming or overdue maintenance, readable by organization but operated by client and address."
        }
        actions={
          <AppToolbar compact>
            <MaintenanceHelpBubble
              label={language === "es" ? "Ayuda" : "Help"}
              helpText={
                language === "es"
                  ? "Aquí solo deberían aparecer mantenciones que entraron en ventana. Al agendar, salen de la bandeja y pasan a la operación normal."
                  : "Only maintenance that entered its due window should appear here. Once scheduled, it leaves this tray and moves into normal operations."
              }
            />
            <button className="btn btn-outline-secondary" type="button" onClick={() => void loadData()}>
              {language === "es" ? "Recargar" : "Reload"}
            </button>
            <button className="btn btn-primary" type="button" onClick={startCreatePlan}>
              {language === "es" ? "Nueva programación" : "New schedule"}
            </button>
          </AppToolbar>
        }
      />
      <MaintenanceModuleNav />

      {error ? (
        <ErrorState
          title={language === "es" ? "No se pudo cargar Pendientes" : "Due maintenance could not be loaded"}
          detail={getApiErrorDisplayMessage(error)}
          requestId={error.payload?.request_id}
        />
      ) : null}

      {feedback ? <div className="alert alert-success mb-0">{feedback}</div> : null}

      {isLoading ? (
        <LoadingBlock label={language === "es" ? "Cargando pendientes..." : "Loading due maintenance..."} />
      ) : null}

      <div className="row g-3">
        <div className="col-12 col-md-6 col-xl-3">
          <MetricCard
            label={language === "es" ? "Pendientes visibles" : "Visible due"}
            value={metrics.total}
            hint={language === "es" ? "En bandeja operativa" : "In the operational tray"}
            icon="planning"
            tone="info"
          />
        </div>
        <div className="col-12 col-md-6 col-xl-3">
          <MetricCard
            label={language === "es" ? "Vencidas" : "Overdue"}
            value={metrics.due}
            hint={language === "es" ? "Ya pasaron su fecha" : "Past their due date"}
            icon="focus"
            tone="danger"
          />
        </div>
        <div className="col-12 col-md-6 col-xl-3">
          <MetricCard
            label={language === "es" ? "Por vencer" : "Upcoming"}
            value={metrics.upcoming}
            hint={language === "es" ? "Entraron en ventana" : "Already in their visible window"}
            icon="maintenance"
            tone="warning"
          />
        </div>
        <div className="col-12 col-md-6 col-xl-3">
          <MetricCard
            label={language === "es" ? "Contactadas" : "Contacted"}
            value={metrics.contacted}
            hint={language === "es" ? "Gestión ya iniciada" : "Coordination already started"}
            icon="catalogs"
            tone="success"
          />
        </div>
      </div>

      <DataTableCard
        title={language === "es" ? "Bandeja de mantenciones por gestionar" : "Maintenance due queue"}
        subtitle={
          language === "es"
            ? "Agrupa visualmente la carga, pero la acción operativa sigue siendo por cliente, dirección e instalación."
            : "The queue can be read in groups, but the operational action remains tied to client, address, and installation."
        }
        rows={rows}
        columns={[
          {
            key: "client",
            header: language === "es" ? "Cliente / organización" : "Client / organization",
            render: (item) => (
              <div>
                <div className="maintenance-cell__title">{getClientName(item.client_id)}</div>
                <div className="maintenance-cell__meta">{getOrganizationName(item.client_id)}</div>
              </div>
            ),
          },
          {
            key: "site",
            header: language === "es" ? "Dirección / instalación" : "Address / installation",
            render: (item) => (
              <div>
                <div className="maintenance-cell__title">{getSiteLabel(item.site_id)}</div>
                <div className="maintenance-cell__meta">{getInstallationName(item.installation_id)}</div>
              </div>
            ),
          },
          {
            key: "plan",
            header: language === "es" ? "Plan" : "Plan",
            render: (item) => (
              <div>
                <div className="maintenance-cell__title">{stripLegacyVisibleText(item.schedule_name) || "—"}</div>
                <div className="maintenance-cell__meta">
                  {taskTypes.find((taskType) => taskType.id === item.task_type_id)?.name ||
                    (language === "es" ? "Sin tipo específico" : "No task type")}
                </div>
              </div>
            ),
          },
          {
            key: "due",
            header: language === "es" ? "Ventana" : "Window",
            render: (item) => (
              <div>
                <div>{formatDateTime(item.due_at, language, effectiveTimeZone)}</div>
                <div className="maintenance-cell__meta">
                  {language === "es" ? "Visible desde" : "Visible from"}{" "}
                  {formatDateTime(item.visible_from, language, effectiveTimeZone)}
                </div>
              </div>
            ),
          },
          {
            key: "status",
            header: language === "es" ? "Estado" : "Status",
            render: (item) => <AppBadge tone={getDueTone(item.due_status)}>{getDueLabel(item.due_status, language)}</AppBadge>,
          },
          {
            key: "actions",
            header: language === "es" ? "Acciones" : "Actions",
            render: (item) => (
              <AppToolbar compact>
                <button className="btn btn-sm btn-primary" type="button" onClick={() => openScheduleDueItem(item)}>
                  {language === "es" ? "Agendar" : "Schedule"}
                </button>
              </AppToolbar>
            ),
          },
        ]}
      />

      {isPlanModalOpen ? (
        <div className="maintenance-modal">
          <div className="maintenance-modal__backdrop" onClick={() => setIsPlanModalOpen(false)} />
          <div className="maintenance-modal__dialog maintenance-modal__dialog--wide">
            <div className="panel-card maintenance-form-card">
              <div className="panel-card__header">
                <div>
                  <div className="maintenance-form-card__eyebrow">
                    {language === "es" ? "Alta bajo demanda" : "On-demand create"}
                  </div>
                  <h2 className="panel-card__title mb-1">
                    {language === "es" ? "Nueva programación" : "New schedule"}
                  </h2>
                  <p className="panel-card__subtitle mb-0">
                    {language === "es"
                      ? "Define la regla permanente para que el cliente aparezca solo cuando entre en ventana."
                      : "Define the permanent rule so the client appears automatically once it enters its visible window."}
                  </p>
                </div>
              </div>
              <form className="maintenance-form-card__body" onSubmit={handleCreatePlan}>
                <div className="row g-3">
                  <div className="col-12 col-lg-6">
                    <label className="form-label">{language === "es" ? "Cliente" : "Client"}</label>
                    <select
                      className="form-select"
                      value={scheduleForm.client_id}
                      onChange={(event) =>
                        setScheduleForm((current) => ({
                          ...current,
                          client_id: Number(event.target.value),
                          site_id: null,
                          installation_id: null,
                        }))
                      }
                    >
                      <option value={0}>{language === "es" ? "Selecciona un cliente" : "Select a client"}</option>
                      {clients.map((client) => (
                        <option key={client.id} value={client.id}>
                          {getClientName(client.id)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-12 col-lg-6">
                    <label className="form-label">{language === "es" ? "Dirección" : "Address"}</label>
                    <select
                      className="form-select"
                      value={scheduleForm.site_id ?? ""}
                      onChange={(event) =>
                        setScheduleForm((current) => ({
                          ...current,
                          site_id: event.target.value ? Number(event.target.value) : null,
                          installation_id: null,
                        }))
                      }
                    >
                      <option value="">{language === "es" ? "Selecciona una dirección" : "Select an address"}</option>
                      {filteredSitesForSchedule.map((site) => (
                        <option key={site.id} value={site.id}>
                          {getSiteLabel(site.id)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-12 col-lg-6">
                    <label className="form-label">{language === "es" ? "Instalación" : "Installation"}</label>
                    <select
                      className="form-select"
                      value={scheduleForm.installation_id ?? ""}
                      onChange={(event) =>
                        setScheduleForm((current) => ({
                          ...current,
                          installation_id: event.target.value ? Number(event.target.value) : null,
                        }))
                      }
                    >
                      <option value="">{language === "es" ? "Selecciona una instalación" : "Select an installation"}</option>
                      {filteredInstallationsForSchedule.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-12 col-lg-6">
                    <label className="form-label">{language === "es" ? "Tipo de mantención" : "Task type"}</label>
                    <select
                      className="form-select"
                      value={scheduleForm.task_type_id ?? ""}
                      onChange={(event) =>
                        setScheduleForm((current) => ({
                          ...current,
                          task_type_id: event.target.value ? Number(event.target.value) : null,
                        }))
                      }
                    >
                      <option value="">{language === "es" ? "Sin tipo específico" : "No task type"}</option>
                      {taskTypes.map((taskType) => (
                        <option key={taskType.id} value={taskType.id}>
                          {taskType.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-12">
                    <label className="form-label">{language === "es" ? "Nombre del plan" : "Plan name"}</label>
                    <input
                      className="form-control"
                      value={scheduleForm.name}
                      onChange={(event) =>
                        setScheduleForm((current) => ({ ...current, name: event.target.value }))
                      }
                    />
                  </div>
                  <div className="col-12 col-lg-4">
                    <label className="form-label">{language === "es" ? "Frecuencia" : "Frequency"}</label>
                    <input
                      className="form-control"
                      type="number"
                      min={1}
                      value={scheduleForm.frequency_value}
                      onChange={(event) =>
                        setScheduleForm((current) => ({
                          ...current,
                          frequency_value: Number(event.target.value),
                        }))
                      }
                    />
                  </div>
                  <div className="col-12 col-lg-4">
                    <label className="form-label">{language === "es" ? "Unidad" : "Unit"}</label>
                    <select
                      className="form-select"
                      value={scheduleForm.frequency_unit}
                      onChange={(event) =>
                        setScheduleForm((current) => ({
                          ...current,
                          frequency_unit: event.target.value,
                        }))
                      }
                    >
                      <option value="days">{language === "es" ? "Días" : "Days"}</option>
                      <option value="weeks">{language === "es" ? "Semanas" : "Weeks"}</option>
                      <option value="months">{language === "es" ? "Meses" : "Months"}</option>
                      <option value="years">{language === "es" ? "Años" : "Years"}</option>
                    </select>
                  </div>
                  <div className="col-12 col-lg-4">
                    <label className="form-label">{language === "es" ? "Aviso previo (días)" : "Lead days"}</label>
                    <input
                      className="form-control"
                      type="number"
                      min={0}
                      value={scheduleForm.lead_days}
                      onChange={(event) =>
                        setScheduleForm((current) => ({
                          ...current,
                          lead_days: Number(event.target.value),
                        }))
                      }
                    />
                  </div>
                  <div className="col-12 col-lg-6">
                    <label className="form-label">{language === "es" ? "Próxima mantención" : "Next due"}</label>
                    <input
                      className="form-control"
                      type="datetime-local"
                      value={scheduleForm.next_due_at}
                      onChange={(event) =>
                        setScheduleForm((current) => ({
                          ...current,
                          next_due_at: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="col-12 col-lg-6">
                    <label className="form-label">{language === "es" ? "Prioridad" : "Priority"}</label>
                    <select
                      className="form-select"
                      value={scheduleForm.default_priority}
                      onChange={(event) =>
                        setScheduleForm((current) => ({
                          ...current,
                          default_priority: event.target.value,
                        }))
                      }
                    >
                      <option value="low">{language === "es" ? "Baja" : "Low"}</option>
                      <option value="normal">{language === "es" ? "Normal" : "Normal"}</option>
                      <option value="high">{language === "es" ? "Alta" : "High"}</option>
                      <option value="critical">{language === "es" ? "Crítica" : "Critical"}</option>
                    </select>
                  </div>
                  <div className="col-12">
                    <label className="form-label">{language === "es" ? "Notas" : "Notes"}</label>
                    <textarea
                      className="form-control"
                      rows={3}
                      value={scheduleForm.notes ?? ""}
                      onChange={(event) =>
                        setScheduleForm((current) => ({ ...current, notes: event.target.value }))
                      }
                    />
                  </div>
                </div>
                <div className="maintenance-form__actions">
                  <button className="btn btn-outline-secondary" type="button" onClick={() => setIsPlanModalOpen(false)}>
                    {language === "es" ? "Cancelar" : "Cancel"}
                  </button>
                  <button className="btn btn-primary" type="submit" disabled={isSubmitting || !scheduleForm.client_id || !scheduleForm.name.trim() || !scheduleForm.next_due_at}>
                    {isSubmitting
                      ? language === "es"
                        ? "Guardando..."
                        : "Saving..."
                      : language === "es"
                        ? "Crear programación"
                        : "Create schedule"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}

      {isScheduleModalOpen && selectedDueItem ? (
        <div className="maintenance-modal">
          <div className="maintenance-modal__backdrop" onClick={() => setIsScheduleModalOpen(false)} />
          <div className="maintenance-modal__dialog maintenance-modal__dialog--wide">
            <div className="panel-card maintenance-form-card">
              <div className="panel-card__header">
                <div>
                  <div className="maintenance-form-card__eyebrow">
                    {language === "es" ? "Agendamiento" : "Scheduling"}
                  </div>
                  <h2 className="panel-card__title mb-1">
                    {language === "es" ? "Agendar mantención" : "Schedule maintenance"}
                  </h2>
                  <p className="panel-card__subtitle mb-0">
                    {language === "es"
                      ? "Convierte este pendiente en una orden de trabajo y sácalo de la bandeja activa."
                      : "Turn this due item into a work order and remove it from the active tray."}
                  </p>
                </div>
              </div>
              <form className="maintenance-form-card__body" onSubmit={handleScheduleDueItem}>
                <div className="row g-3">
                  <div className="col-12 col-lg-6">
                    <label className="form-label">{language === "es" ? "Cliente" : "Client"}</label>
                    <input className="form-control" value={getClientName(selectedDueItem.client_id)} disabled />
                  </div>
                  <div className="col-12 col-lg-6">
                    <label className="form-label">{language === "es" ? "Dirección" : "Address"}</label>
                    <select
                      className="form-select"
                      value={dueScheduleForm.site_id ?? ""}
                      onChange={(event) =>
                        setDueScheduleForm((current) => ({
                          ...current,
                          site_id: event.target.value ? Number(event.target.value) : null,
                          installation_id: null,
                        }))
                      }
                    >
                      <option value="">{language === "es" ? "Selecciona una dirección" : "Select an address"}</option>
                      {sites
                        .filter((site) => site.client_id === selectedDueItem.client_id)
                        .map((site) => (
                          <option key={site.id} value={site.id}>
                            {getSiteLabel(site.id)}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="col-12 col-lg-6">
                    <label className="form-label">{language === "es" ? "Instalación" : "Installation"}</label>
                    <select
                      className="form-select"
                      value={dueScheduleForm.installation_id ?? ""}
                      onChange={(event) =>
                        setDueScheduleForm((current) => ({
                          ...current,
                          installation_id: event.target.value ? Number(event.target.value) : null,
                        }))
                      }
                    >
                      <option value="">{language === "es" ? "Selecciona una instalación" : "Select an installation"}</option>
                      {filteredInstallationsForDue.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-12 col-lg-6">
                    <label className="form-label">{language === "es" ? "Fecha y hora programada" : "Scheduled date and time"}</label>
                    <input
                      className="form-control"
                      type="datetime-local"
                      value={dueScheduleForm.scheduled_for}
                      onChange={(event) =>
                        setDueScheduleForm((current) => ({
                          ...current,
                          scheduled_for: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="col-12 col-lg-6">
                    <label className="form-label">{language === "es" ? "Grupo responsable" : "Responsible group"}</label>
                    <select
                      className="form-select"
                      value={dueScheduleForm.assigned_work_group_id ?? ""}
                      onChange={(event) =>
                        setDueScheduleForm((current) => ({
                          ...current,
                          assigned_work_group_id: event.target.value ? Number(event.target.value) : null,
                        }))
                      }
                    >
                      <option value="">{language === "es" ? "Sin grupo asignado" : "No group assigned"}</option>
                      {workGroups.filter((group) => group.is_active).map((group) => (
                        <option key={group.id} value={group.id}>
                          {group.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-12 col-lg-6">
                    <label className="form-label">{language === "es" ? "Técnico responsable" : "Responsible technician"}</label>
                    <select
                      className="form-select"
                      value={dueScheduleForm.assigned_tenant_user_id ?? ""}
                      onChange={(event) =>
                        setDueScheduleForm((current) => ({
                          ...current,
                          assigned_tenant_user_id: event.target.value ? Number(event.target.value) : null,
                        }))
                      }
                    >
                      <option value="">{language === "es" ? "Sin técnico asignado" : "No technician assigned"}</option>
                      {tenantUsers.filter((user) => user.is_active).map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.full_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-12 col-lg-6">
                    <label className="form-label">{language === "es" ? "Prioridad" : "Priority"}</label>
                    <select
                      className="form-select"
                      value={dueScheduleForm.priority}
                      onChange={(event) =>
                        setDueScheduleForm((current) => ({ ...current, priority: event.target.value }))
                      }
                    >
                      <option value="low">{language === "es" ? "Baja" : "Low"}</option>
                      <option value="normal">{language === "es" ? "Normal" : "Normal"}</option>
                      <option value="high">{language === "es" ? "Alta" : "High"}</option>
                      <option value="critical">{language === "es" ? "Crítica" : "Critical"}</option>
                    </select>
                  </div>
                  <div className="col-12">
                    <label className="form-label">{language === "es" ? "Trabajo a realizar" : "Work title"}</label>
                    <input
                      className="form-control"
                      value={dueScheduleForm.title}
                      onChange={(event) =>
                        setDueScheduleForm((current) => ({ ...current, title: event.target.value }))
                      }
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label">{language === "es" ? "Detalle técnico" : "Technical detail"}</label>
                    <textarea
                      className="form-control"
                      rows={4}
                      value={dueScheduleForm.description}
                      onChange={(event) =>
                        setDueScheduleForm((current) => ({ ...current, description: event.target.value }))
                      }
                    />
                  </div>
                </div>
                <div className="maintenance-form__actions">
                  <button className="btn btn-outline-secondary" type="button" onClick={() => setIsScheduleModalOpen(false)}>
                    {language === "es" ? "Cancelar" : "Cancel"}
                  </button>
                  <button
                    className="btn btn-primary"
                    type="submit"
                    disabled={isSubmitting || !dueScheduleForm.site_id || !dueScheduleForm.installation_id || !dueScheduleForm.title.trim()}
                  >
                    {isSubmitting
                      ? language === "es"
                        ? "Agendando..."
                        : "Scheduling..."
                      : language === "es"
                        ? "Crear orden"
                        : "Create work order"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
