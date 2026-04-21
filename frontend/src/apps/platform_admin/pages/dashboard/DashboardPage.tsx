import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { DataTableCard } from "../../../../components/data-display/DataTableCard";
import { ErrorState } from "../../../../components/feedback/ErrorState";
import { LoadingBlock } from "../../../../components/feedback/LoadingBlock";
import { PageHeader } from "../../../../components/common/PageHeader";
import { MetricCard } from "../../../../components/common/MetricCard";
import { PanelCard } from "../../../../components/common/PanelCard";
import { StatusBadge } from "../../../../components/common/StatusBadge";
import { AppBadge } from "../../../../design-system/AppBadge";
import { AppToolbar } from "../../../../design-system/AppLayout";
import { useLanguage } from "../../../../store/language-context";
import { displayPlatformCode } from "../../../../utils/platform-labels";
import { useAuth } from "../../../../store/auth-context";
import {
  getPlatformBillingAlerts,
  getPlatformBillingEventsSummary,
  getPlatformCapabilities,
  getProvisioningAlerts,
  getProvisioningMetrics,
  listPlatformTenants,
} from "../../../../services/platform-api";
import type {
  ApiError,
  PlatformBillingAlertsResponse,
  PlatformBillingSyncSummaryResponse,
  PlatformCapabilities,
  PlatformTenant,
  ProvisioningJobMetricsResponse,
  ProvisioningOperationalAlertsResponse,
} from "../../../../types";

type DashboardFrontlineCard = {
  key: string;
  tone: "success" | "info" | "warning" | "danger" | "neutral";
  title: string;
  detail: string;
};

export function DashboardPage() {
  const { session } = useAuth();
  const { language } = useLanguage();
  const [capabilities, setCapabilities] = useState<PlatformCapabilities | null>(null);
  const [tenants, setTenants] = useState<PlatformTenant[]>([]);
  const [provisioningMetrics, setProvisioningMetrics] =
    useState<ProvisioningJobMetricsResponse | null>(null);
  const [provisioningAlerts, setProvisioningAlerts] =
    useState<ProvisioningOperationalAlertsResponse | null>(null);
  const [billingSummary, setBillingSummary] =
    useState<PlatformBillingSyncSummaryResponse | null>(null);
  const [billingAlerts, setBillingAlerts] =
    useState<PlatformBillingAlertsResponse | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function loadDashboard() {
    if (!session?.accessToken) {
      return;
    }

    setIsLoading(true);
    setError(null);

    const results = await Promise.allSettled([
      getPlatformCapabilities(session.accessToken),
      listPlatformTenants(session.accessToken),
      getProvisioningMetrics(session.accessToken),
      getProvisioningAlerts(session.accessToken),
      getPlatformBillingEventsSummary(session.accessToken),
      getPlatformBillingAlerts(session.accessToken),
    ]);

    const [
      capabilitiesResult,
      tenantsResult,
      provisioningMetricsResult,
      provisioningAlertsResult,
      billingSummaryResult,
      billingAlertsResult,
    ] = results;

    const firstRejected = results.find(
      (result): result is PromiseRejectedResult => result.status === "rejected"
    );

    if (firstRejected) {
      setError(firstRejected.reason as ApiError);
    } else {
      setError(null);
    }

    setCapabilities(
      capabilitiesResult.status === "fulfilled" ? capabilitiesResult.value : null
    );
    setTenants(tenantsResult.status === "fulfilled" ? tenantsResult.value.data : []);
    setProvisioningMetrics(
      provisioningMetricsResult.status === "fulfilled"
        ? provisioningMetricsResult.value
        : null
    );
    setProvisioningAlerts(
      provisioningAlertsResult.status === "fulfilled"
        ? provisioningAlertsResult.value
        : null
    );
    setBillingSummary(
      billingSummaryResult.status === "fulfilled" ? billingSummaryResult.value : null
    );
    setBillingAlerts(
      billingAlertsResult.status === "fulfilled" ? billingAlertsResult.value : null
    );
    setIsLoading(false);
  }

  const kpis = useMemo(() => {
    const totalTenants = tenants.length;
    const suspendedTenants = tenants.filter((tenant) => tenant.status === "suspended")
      .length;
    const maintenanceTenants = tenants.filter((tenant) => tenant.maintenance_mode).length;
    const tenantsPastDue = tenants.filter((tenant) => tenant.billing_status === "past_due")
      .length;
    const provisioningFailedTenants =
      provisioningMetrics?.data.filter((row) => row.failed_jobs > 0).length || 0;
    const activeProvisioningAlerts = provisioningAlerts?.total_alerts || 0;
    const activeBillingAlerts = billingAlerts?.total_alerts || 0;

    return {
      totalTenants,
      suspendedTenants,
      maintenanceTenants,
      tenantsPastDue,
      provisioningFailedTenants,
      activeProvisioningAlerts,
      activeBillingAlerts,
    };
  }, [billingAlerts?.total_alerts, provisioningAlerts?.total_alerts, provisioningMetrics?.data, tenants]);

  const tenantAttentionRows = useMemo(() => {
    return tenants
      .filter(
        (tenant) =>
          tenant.status !== "active" ||
          tenant.maintenance_mode ||
          tenant.billing_status === "past_due"
      )
      .sort((left, right) => left.name.localeCompare(right.name))
      .slice(0, 8);
  }, [tenants]);

  const provisioningAttentionRows = useMemo(() => {
    return (
      provisioningMetrics?.data
        .filter(
          (row) =>
            row.failed_jobs > 0 || row.retry_pending_jobs > 0 || row.running_jobs > 0
        )
        .sort((left, right) => right.failed_jobs - left.failed_jobs)
        .slice(0, 8) || []
    );
  }, [provisioningMetrics?.data]);

  const billingAttentionRows = useMemo(() => {
    return (
      billingSummary?.data
        .filter(
          (row) =>
            row.processing_result === "ignored" ||
            row.processing_result === "duplicate"
        )
        .sort((left, right) => right.total_events - left.total_events)
        .slice(0, 8) || []
    );
  }, [billingSummary?.data]);

  const frontlineCards = useMemo<DashboardFrontlineCard[]>(() => {
    return [
      {
        key: "tenants",
        tone: tenantAttentionRows.length > 0 ? "warning" : "success",
        title:
          tenantAttentionRows.length > 0
            ? language === "es"
              ? `${tenantAttentionRows.length} tenants requieren revisión`
              : `${tenantAttentionRows.length} tenants require review`
            : language === "es"
              ? "Tenants sin atención inmediata"
              : "Tenants without immediate attention",
        detail:
          language === "es"
            ? "Estado, mantenimiento o facturación ya justifican mirar Tenants."
            : "Status, maintenance or billing already justify opening Tenants.",
      },
      {
        key: "provisioning",
        tone:
          kpis.provisioningFailedTenants > 0
            ? "danger"
            : kpis.activeProvisioningAlerts > 0
              ? "warning"
              : "success",
        title:
          kpis.provisioningFailedTenants > 0
            ? language === "es"
              ? `${kpis.provisioningFailedTenants} tenants con fallo visible`
              : `${kpis.provisioningFailedTenants} tenants with visible failures`
            : kpis.activeProvisioningAlerts > 0
              ? language === "es"
                ? `${kpis.activeProvisioningAlerts} alertas provisioning`
                : `${kpis.activeProvisioningAlerts} provisioning alerts`
              : language === "es"
                ? "Provisioning sin señal abierta"
                : "Provisioning without open signal",
        detail:
          language === "es"
            ? "Jobs, alertas y recuperación técnica viven en Provisioning."
            : "Jobs, alerts and technical recovery live in Provisioning.",
      },
      {
        key: "billing",
        tone: kpis.activeBillingAlerts > 0 || kpis.tenantsPastDue > 0 ? "warning" : "success",
        title:
          kpis.activeBillingAlerts > 0
            ? language === "es"
              ? `${kpis.activeBillingAlerts} alertas billing`
              : `${kpis.activeBillingAlerts} billing alerts`
            : kpis.tenantsPastDue > 0
              ? language === "es"
                ? `${kpis.tenantsPastDue} tenants con deuda`
                : `${kpis.tenantsPastDue} tenants past due`
              : language === "es"
                ? "Billing sin señal abierta"
                : "Billing without open signal",
        detail:
          language === "es"
            ? "Eventos, alertas y reconcile viven en Billing."
            : "Events, alerts and reconciliation live in Billing.",
      },
    ];
  }, [
    kpis.activeBillingAlerts,
    kpis.activeProvisioningAlerts,
    kpis.provisioningFailedTenants,
    kpis.tenantsPastDue,
    language,
    tenantAttentionRows.length,
  ]);

  useEffect(() => {
    let isMounted = true;

    void loadDashboard().finally(() => {
      if (!isMounted) {
        return;
      }
    });

    return () => {
      isMounted = false;
    };
  }, [session?.accessToken]);

  return (
    <div className="d-grid gap-4">
      <PageHeader
        eyebrow={language === "es" ? "Plataforma" : "Platform"}
        title={language === "es" ? "Resumen operativo" : "Operational overview"}
        description={
          language === "es"
            ? "Vista rápida de salud operativa: tenants que requieren atención, presión de provisioning y señales de facturación que ya justifican una revisión."
            : "Quick view of operational health: tenants requiring attention, provisioning pressure and billing signals that already justify a review."
        }
        icon="dashboard"
        actions={
          <AppToolbar compact>
            <button
              className="btn btn-outline-primary"
              type="button"
              onClick={() => void loadDashboard()}
              disabled={isLoading}
            >
              {language === "es" ? "Recargar datos" : "Reload data"}
            </button>
          </AppToolbar>
        }
      />

      {isLoading ? (
        <LoadingBlock
          label={
            language === "es"
              ? "Cargando operación de plataforma..."
              : "Loading platform operations..."
          }
        />
      ) : null}
      {error ? (
        <ErrorState
          detail={error.payload?.detail || error.message}
          requestId={error.payload?.request_id}
        />
      ) : null}

      {!isLoading ? (
        <>
          <div className="dashboard-overview-grid">
            <MetricCard
              label={language === "es" ? "Tenants totales" : "Total tenants"}
              icon="tenants"
              tone="default"
              value={kpis.totalTenants}
              hint={
                language === "es"
                  ? "Catálogo actual de tenants visibles desde plataforma."
                  : "Current catalog of tenants visible from the platform."
              }
            />
            <MetricCard
              label={language === "es" ? "Tenants suspendidos" : "Suspended tenants"}
              icon="settings"
              tone="warning"
              value={kpis.suspendedTenants}
              hint={
                language === "es"
                  ? "Tenants detenidos por estado operativo."
                  : "Tenants stopped by operational status."
              }
            />
            <MetricCard
              label={language === "es" ? "Tenants en mantenimiento" : "Tenants in maintenance"}
              icon="activity"
              tone="warning"
              value={kpis.maintenanceTenants}
              hint={
                language === "es"
                  ? "Tenants con ventana manual de mantenimiento activa."
                  : "Tenants with an active manual maintenance window."
              }
            />
            <MetricCard
              label={language === "es" ? "Tenants con deuda" : "Tenants past due"}
              icon="billing"
              tone="danger"
              value={kpis.tenantsPastDue}
              hint={
                language === "es"
                  ? "Tenants en estado de facturación con deuda."
                  : "Tenants whose billing status is past due."
              }
            />
            <MetricCard
              label={
                language === "es"
                  ? "Tenants con fallo de provisioning"
                  : "Tenants with provisioning failure"
              }
              icon="provisioning"
              tone="danger"
              value={kpis.provisioningFailedTenants}
              hint={
                language === "es"
                  ? "Tenants con jobs fallidos en la última lectura."
                  : "Tenants with failed jobs in the latest read."
              }
            />
            <MetricCard
              label={
                language === "es"
                  ? "Alertas provisioning"
                  : "Provisioning alerts"
              }
              icon="pulse"
              tone="info"
              value={kpis.activeProvisioningAlerts}
              hint={
                language === "es"
                  ? "Señales operativas abiertas en la cola técnica."
                  : "Open operational signals in the technical queue."
              }
            />
            <MetricCard
              label={language === "es" ? "Alertas billing" : "Billing alerts"}
              icon="billing"
              tone="info"
              value={kpis.activeBillingAlerts}
              hint={
                language === "es"
                  ? "Alertas abiertas en sincronización y reconcile de billing."
                  : "Open alerts in billing sync and reconciliation."
              }
            />
          </div>

          <div className="ops-summary-strip">
            {frontlineCards.map((card) => (
              <div
                key={card.key}
                className={`ops-summary-card ops-summary-card--${card.tone}`}
              >
                <div className="ops-summary-card__eyebrow">
                  {language === "es" ? "Ruta rápida" : "Quick route"}
                </div>
                <div className="ops-summary-card__title">{card.title}</div>
                <div className="ops-summary-card__detail">{card.detail}</div>
              </div>
            ))}
          </div>

          <div className="dashboard-section-grid">
            <PanelCard
              icon="focus"
              title={language === "es" ? "Prioridades visibles" : "Visible priorities"}
              subtitle={
                language === "es"
                  ? "Tenants donde hoy ya hay señal suficiente para revisar."
                  : "Tenants where there is already enough signal to review today."
              }
            >
              {tenantAttentionRows.length > 0 ? (
                <div className="dashboard-spotlight-list">
                  {tenantAttentionRows.map((tenant) => (
                    <div key={tenant.id} className="dashboard-spotlight-item">
                      <div className="dashboard-spotlight-item__title">
                        {tenant.name}
                      </div>
                      <div className="dashboard-spotlight-item__meta">
                        <code>{tenant.slug}</code>
                        <StatusBadge value={tenant.status} />
                        <StatusBadge value={tenant.billing_status || "unknown"} />
                        {tenant.maintenance_mode ? (
                          <AppBadge tone="warning">
                            {language === "es" ? "mantenimiento" : "maintenance"}
                          </AppBadge>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-secondary">
                  {language === "es"
                    ? "No hay tenants con atención inmediata en esta lectura."
                    : "There are no tenants requiring immediate attention in this read."}
                </div>
              )}
            </PanelCard>

            <PanelCard
              icon="overview"
              title={language === "es" ? "Acciones rápidas" : "Quick actions"}
              subtitle={
                language === "es"
                  ? "Entra directo al workspace correcto."
                  : "Jump straight to the right workspace."
              }
            >
              <AppToolbar className="dashboard-quick-actions">
                <Link className="btn btn-primary" to="/tenants">
                  {language === "es" ? "Abrir tenants" : "Open tenants"}
                </Link>
                <Link className="btn btn-outline-primary" to="/provisioning">
                  {language === "es" ? "Abrir provisioning" : "Open provisioning"}
                </Link>
                <Link className="btn btn-outline-primary" to="/billing">
                  {language === "es" ? "Abrir facturación" : "Open billing"}
                </Link>
              </AppToolbar>
              <div className="dashboard-quick-hints">
                <div>
                  {language === "es"
                    ? "`Tenants`: estado, acceso y operación del tenant."
                    : "`Tenants`: tenant status, access and operations."}
                </div>
                <div>
                  {language === "es"
                    ? "`Provisioning`: jobs, alertas y recuperación técnica."
                    : "`Provisioning`: jobs, alerts and technical recovery."}
                </div>
                <div>
                  {language === "es"
                    ? "`Billing`: eventos, alertas y reconcile por tenant."
                    : "`Billing`: persisted events, alerts and reconciliation by tenant."}
                </div>
              </div>
            </PanelCard>
          </div>

          {provisioningAttentionRows.length > 0 ? (
            <DataTableCard
              title={
                language === "es"
                  ? "Señal de provisioning por tenant"
                  : "Provisioning signal by tenant"
              }
              subtitle={
                language === "es"
                  ? "Solo tenants con fallo, reintento o ejecución activa en esta lectura."
                  : "Only tenants with failures, retries or active execution in this read."
              }
              rows={provisioningAttentionRows}
              columns={[
                {
                  key: "tenant_slug",
                  header: "Tenant",
                  render: (row) => <code>{row.tenant_slug}</code>,
                },
                {
                  key: "failed_jobs",
                  header: language === "es" ? "Fallidos" : "Failed",
                  render: (row) => row.failed_jobs,
                },
                {
                  key: "retry_pending_jobs",
                  header: language === "es" ? "Reintento" : "Retry",
                  render: (row) => row.retry_pending_jobs,
                },
                {
                  key: "running_jobs",
                  header: language === "es" ? "En ejecución" : "Running",
                  render: (row) => row.running_jobs,
                },
                {
                  key: "total_jobs",
                  header: "Total",
                  render: (row) => row.total_jobs,
                },
              ]}
            />
          ) : null}

          {billingAttentionRows.length > 0 ? (
            <DataTableCard
              title={
                language === "es"
                  ? "Anomalías de facturación por resultado"
                  : "Billing anomalies by result"
              }
              subtitle={
                language === "es"
                  ? "Eventos que no terminaron como flujo limpio y merecen seguimiento."
                  : "Events that did not finish as a clean flow and deserve follow-up."
              }
              rows={billingAttentionRows}
              columns={[
                {
                  key: "provider",
                  header: language === "es" ? "Proveedor" : "Provider",
                  render: (row) => row.provider,
                },
                {
                  key: "event_type",
                  header: language === "es" ? "Tipo de evento" : "Event type",
                  render: (row) => <code>{row.event_type}</code>,
                },
                {
                  key: "processing_result",
                  header: language === "es" ? "Resultado" : "Result",
                  render: (row) => <StatusBadge value={row.processing_result} />,
                },
                {
                  key: "total_events",
                  header: language === "es" ? "Eventos" : "Events",
                  render: (row) => row.total_events,
                },
                {
                  key: "total_tenants",
                  header: "Tenants",
                  render: (row) => row.total_tenants,
                },
              ]}
            />
          ) : null}

          {capabilities ? (
            <DataTableCard
              title={
                language === "es"
                  ? "Capacidades de límites por módulo"
                  : "Module limit capabilities"
              }
              subtitle={
                language === "es"
                  ? "Catálogo vivo de claves de límite que el backend expone hoy a la consola."
                  : "Live catalog of limit keys currently exposed by the backend."
              }
              rows={capabilities.module_limit_capabilities}
              columns={[
                {
                  key: "key",
                  header: language === "es" ? "Clave" : "Key",
                  render: (row) => <code>{row.key}</code>,
                },
                {
                  key: "module",
                  header: language === "es" ? "Módulo" : "Module",
                  render: (row) => row.module_name,
                },
                {
                  key: "resource",
                  header: language === "es" ? "Recurso" : "Resource",
                  render: (row) => row.resource_name,
                },
                {
                  key: "period",
                  header: language === "es" ? "Período" : "Period",
                  render: (row) => displayPlatformCode(row.period || "none", language),
                },
                {
                  key: "segment",
                  header: language === "es" ? "Segmento" : "Segment",
                  render: (row) =>
                    row.segment || (language === "es" ? "todos" : "all"),
                },
                {
                  key: "description",
                  header: language === "es" ? "Descripción" : "Description",
                  render: (row) => row.description || "—",
                },
              ]}
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}
