import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { DataTableCard } from "../../../../components/data-display/DataTableCard";
import { ErrorState } from "../../../../components/feedback/ErrorState";
import { LoadingBlock } from "../../../../components/feedback/LoadingBlock";
import { PageHeader } from "../../../../components/common/PageHeader";
import { MetricCard } from "../../../../components/common/MetricCard";
import { PanelCard } from "../../../../components/common/PanelCard";
import { StatusBadge } from "../../../../components/common/StatusBadge";
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

export function DashboardPage() {
  const { session } = useAuth();
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

  useEffect(() => {
    let isMounted = true;

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

      if (!isMounted) {
        return;
      }

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

    void loadDashboard();

    return () => {
      isMounted = false;
    };
  }, [session?.accessToken]);

  return (
    <div className="d-grid gap-4">
      <PageHeader
        eyebrow="Plataforma"
        title="Resumen operativo"
        description="Lectura ejecutiva sobre salud de tenants, presión de provisioning y anomalías de facturación usando los mismos contratos backend-driven consumidos en las pantallas de detalle."
      />

      {isLoading ? <LoadingBlock label="Cargando operación de plataforma..." /> : null}
      {error ? (
        <ErrorState
          detail={error.payload?.detail || error.message}
          requestId={error.payload?.request_id}
        />
      ) : null}

      {!isLoading ? (
        <>
          <div className="dashboard-overview-grid">
            <MetricCard label="Tenants totales" value={kpis.totalTenants} />
            <MetricCard label="Tenants suspendidos" value={kpis.suspendedTenants} />
            <MetricCard label="Tenants en mantenimiento" value={kpis.maintenanceTenants} />
            <MetricCard label="Tenants con deuda" value={kpis.tenantsPastDue} />
            <MetricCard
              label="Tenants con provisioning fallido"
              value={kpis.provisioningFailedTenants}
            />
            <MetricCard
              label="Alertas activas de provisioning"
              value={kpis.activeProvisioningAlerts}
            />
            <MetricCard
              label="Alertas activas de facturación"
              value={kpis.activeBillingAlerts}
            />
          </div>

          <div className="dashboard-section-grid">
            <PanelCard
              title="Foco operativo"
              subtitle="Puntos de atención inmediatos sobre lifecycle tenant y facturación."
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
                          <span className="tenant-chip tenant-chip--warning">
                            mantenimiento
                          </span>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-secondary">
                  No se detectaron focos críticos de lifecycle tenant en la lectura actual.
                </div>
              )}
            </PanelCard>

            <PanelCard
              title="Acciones rápidas"
              subtitle="Salta directo a las pantallas que ya tienen controles operativos."
            >
              <div className="dashboard-quick-actions">
                <Link className="btn btn-primary" to="/tenants">
                  Abrir tenants
                </Link>
                <Link className="btn btn-outline-primary" to="/provisioning">
                  Abrir provisioning
                </Link>
                <Link className="btn btn-outline-primary" to="/billing">
                  Abrir facturación
                </Link>
              </div>
              <div className="dashboard-quick-hints">
                <div>Usa `Tenants` para lifecycle, plan, billing y límites por módulo.</div>
                <div>Usa `Provisioning` para backlog, alertas y recuperación por DLQ.</div>
                <div>Usa `Billing` para resumen de eventos, alertas y flujos de reconcile.</div>
              </div>
            </PanelCard>
          </div>

          {provisioningAttentionRows.length > 0 ? (
            <DataTableCard
              title="Presión de provisioning por tenant"
              rows={provisioningAttentionRows}
              columns={[
                {
                  key: "tenant_slug",
                  header: "Tenant",
                  render: (row) => <code>{row.tenant_slug}</code>,
                },
                {
                  key: "failed_jobs",
                  header: "Fallidos",
                  render: (row) => row.failed_jobs,
                },
                {
                  key: "retry_pending_jobs",
                  header: "Reintento",
                  render: (row) => row.retry_pending_jobs,
                },
                {
                  key: "running_jobs",
                  header: "En ejecución",
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
              title="Anomalías de facturación por resultado"
              rows={billingAttentionRows}
              columns={[
                {
                  key: "provider",
                  header: "Proveedor",
                  render: (row) => row.provider,
                },
                {
                  key: "event_type",
                  header: "Tipo de evento",
                  render: (row) => <code>{row.event_type}</code>,
                },
                {
                  key: "processing_result",
                  header: "Resultado",
                  render: (row) => <StatusBadge value={row.processing_result} />,
                },
                {
                  key: "total_events",
                  header: "Eventos",
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
              title="Capacidades de límites por módulo"
              rows={capabilities.module_limit_capabilities}
              columns={[
                { key: "key", header: "Clave", render: (row) => <code>{row.key}</code> },
                { key: "module", header: "Módulo", render: (row) => row.module_name },
                { key: "resource", header: "Recurso", render: (row) => row.resource_name },
                { key: "period", header: "Período", render: (row) => row.period },
                {
                  key: "segment",
                  header: "Segmento",
                  render: (row) => row.segment || "todos",
                },
                {
                  key: "description",
                  header: "Descripción",
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
