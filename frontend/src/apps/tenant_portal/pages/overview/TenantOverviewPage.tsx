import { useEffect, useMemo, useState } from "react";
import { MetricCard } from "../../../../components/common/MetricCard";
import { PageHeader } from "../../../../components/common/PageHeader";
import { PanelCard } from "../../../../components/common/PanelCard";
import { StatusBadge } from "../../../../components/common/StatusBadge";
import { DataTableCard } from "../../../../components/data-display/DataTableCard";
import { EmptyState } from "../../../../components/feedback/EmptyState";
import { ErrorState } from "../../../../components/feedback/ErrorState";
import { LoadingBlock } from "../../../../components/feedback/LoadingBlock";
import { getTenantInfo, getTenantModuleUsage } from "../../../../services/tenant-api";
import { useTenantAuth } from "../../../../store/tenant-auth-context";
import { displayPlatformCode } from "../../../../utils/platform-labels";
import type { ApiError, TenantInfoResponse, TenantModuleUsageResponse } from "../../../../types";

export function TenantOverviewPage() {
  const { session } = useTenantAuth();
  const [tenantInfo, setTenantInfo] = useState<TenantInfoResponse | null>(null);
  const [moduleUsage, setModuleUsage] = useState<TenantModuleUsageResponse | null>(
    null
  );
  const [error, setError] = useState<ApiError | null>(null);
  const [moduleUsageError, setModuleUsageError] = useState<ApiError | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const overview = useMemo(() => {
    const tenant = tenantInfo?.tenant;
    return {
      enabledModules: tenant?.effective_enabled_modules?.length || 0,
      moduleLimitKeys: Object.keys(tenant?.effective_module_limits || {}).length,
      apiReadLimit: tenant?.effective_api_read_requests_per_minute ?? "—",
      apiWriteLimit: tenant?.effective_api_write_requests_per_minute ?? "—",
    };
  }, [tenantInfo?.tenant]);

  useEffect(() => {
    let isMounted = true;

    async function loadOverview() {
      if (!session?.accessToken) {
        return;
      }

      setIsLoading(true);
      setError(null);
      setModuleUsageError(null);

      const results = await Promise.allSettled([
        getTenantInfo(session.accessToken),
        getTenantModuleUsage(session.accessToken),
      ]);

      if (!isMounted) {
        return;
      }

      const [infoResult, usageResult] = results;

      if (infoResult.status === "fulfilled") {
        setTenantInfo(infoResult.value);
      } else {
        setTenantInfo(null);
        setError(infoResult.reason as ApiError);
      }

      if (usageResult.status === "fulfilled") {
        setModuleUsage(usageResult.value);
      } else {
        setModuleUsage(null);
        setModuleUsageError(usageResult.reason as ApiError);
      }

      setIsLoading(false);
    }

    void loadOverview();

    return () => {
      isMounted = false;
    };
  }, [session?.accessToken]);

  const tenant = tenantInfo?.tenant;

  return (
    <div className="d-grid gap-4">
      <PageHeader
        eyebrow="Espacio"
        title={tenant?.tenant_name || session?.tenantSlug || "Resumen del tenant"}
        description="Vista general del estado actual de tu espacio, sus límites efectivos y los módulos disponibles."
      />

      {isLoading ? <LoadingBlock label="Cargando resumen del tenant..." /> : null}

      {error ? (
        <ErrorState
          title="Información del tenant no disponible"
          detail={error.payload?.detail || error.message}
          requestId={error.payload?.request_id}
        />
      ) : null}

      {tenant ? (
        <>
          <div className="tenant-portal-metrics">
            <MetricCard
              label="Módulos habilitados"
              value={overview.enabledModules}
              hint="Cantidad activa hoy"
            />
            <MetricCard
              label="Claves de límites"
              value={overview.moduleLimitKeys}
              hint="Cuotas con regla efectiva"
            />
            <MetricCard
              label="Lecturas rpm efectivas"
              value={overview.apiReadLimit}
              hint="Límite vigente de lectura"
            />
            <MetricCard
              label="Escrituras rpm efectivas"
              value={overview.apiWriteLimit}
              hint="Límite vigente de escritura"
            />
          </div>

          <PanelCard
            title="Postura del tenant"
            subtitle="Estado operativo actual aplicado a tu espacio."
          >
            <div className="tenant-detail-grid">
              <DetailField label="Slug" value={<code>{tenant.tenant_slug}</code>} />
              <DetailField
                label="Tipo de tenant"
                value={tenant.tenant_type ? displayPlatformCode(tenant.tenant_type) : "n/a"}
              />
              <DetailField
                label="Ciclo de vida"
                value={<StatusBadge value={tenant.tenant_status || "unknown"} />}
              />
              <DetailField
                label="Facturación"
                value={<StatusBadge value={tenant.billing_status || "unknown"} />}
              />
              <DetailField label="Plan" value={tenant.plan_code || "sin plan"} />
              <DetailField
                label="Acceso"
                value={tenant.access_allowed ? "permitido" : "bloqueado"}
              />
              <DetailField
                label="Mantenimiento"
                value={tenant.maintenance_mode ? "habilitado" : "apagado"}
              />
              <DetailField
                label="Gracia billing"
                value={tenant.billing_in_grace ? "sí" : "no"}
              />
            </div>
            {tenant.access_detail ? (
              <div className="tenant-inline-note">{tenant.access_detail}</div>
            ) : null}
          </PanelCard>

          <div className="tenant-portal-split tenant-portal-split--overview">
            <PanelCard title="Módulos habilitados">
              <div className="settings-token-chips">
                {(tenant.effective_enabled_modules || []).length > 0 ? (
                  tenant.effective_enabled_modules?.map((value) => (
                    <span key={value} className="tenant-chip">
                      {displayPlatformCode(value)}
                    </span>
                  ))
                ) : (
                  <EmptyState
                    title="Todavía no hay módulos habilitados"
                    detail="Este tenant aún no tiene módulos efectivos para operar desde el portal."
                  />
                )}
              </div>
            </PanelCard>

            <PanelCard title="Usuario actual">
              <div className="tenant-detail-grid">
                <DetailField label="Email" value={tenantInfo?.user.email || "n/a"} />
                <DetailField
                  label="Rol"
                  value={
                    tenantInfo?.user.role ? displayPlatformCode(tenantInfo.user.role) : "n/a"
                  }
                />
                <DetailField label="ID usuario" value={tenantInfo?.user.id || "n/a"} />
                <DetailField label="Alcance del token" value={tenantInfo?.token_scope || "n/a"} />
              </div>
            </PanelCard>
          </div>

          {moduleUsageError ? (
            <ErrorState
              title="Uso tenant por módulo no disponible"
              detail={moduleUsageError.payload?.detail || moduleUsageError.message}
              requestId={moduleUsageError.payload?.request_id}
            />
          ) : null}

          {moduleUsage ? (
            <DataTableCard
              title="Uso por módulo"
              rows={moduleUsage.data}
              columns={[
                {
                  key: "module_key",
                  header: "Clave de módulo",
                  render: (row) => <code>{row.module_key}</code>,
                },
                {
                  key: "used_units",
                  header: "Usado",
                  render: (row) => row.used_units,
                },
                {
                  key: "max_units",
                  header: "Límite",
                  render: (row) => (row.unlimited ? "ilimitado" : row.max_units ?? "—"),
                },
                {
                  key: "remaining_units",
                  header: "Restante",
                  render: (row) =>
                    row.unlimited ? "—" : row.remaining_units ?? "—",
                },
                {
                  key: "limit_source",
                  header: "Fuente",
                  render: (row) =>
                    row.limit_source ? displayPlatformCode(row.limit_source) : "ninguna",
                },
                {
                  key: "at_limit",
                  header: "Estado",
                  render: (row) =>
                    row.at_limit ? (
                      <span className="status-badge status-badge--warning">al límite</span>
                    ) : (
                      <span className="status-badge status-badge--success">ok</span>
                    ),
                },
              ]}
            />
          ) : null}
        </>
      ) : !isLoading ? (
        <PanelCard title="Resumen del tenant">
          <EmptyState
            title="No se pudo armar el resumen del tenant"
            detail="La sesión actual no devolvió información suficiente para mostrar el contexto operativo del espacio."
          />
        </PanelCard>
      ) : null}
    </div>
  );
}

function DetailField({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <div className="tenant-detail__label">{label}</div>
      <div className="tenant-detail__value">{value}</div>
    </div>
  );
}
