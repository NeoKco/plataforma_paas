import { useEffect, useMemo, useState } from "react";
import { MetricCard } from "../../../../components/common/MetricCard";
import { PageHeader } from "../../../../components/common/PageHeader";
import { PanelCard } from "../../../../components/common/PanelCard";
import { StatusBadge } from "../../../../components/common/StatusBadge";
import { DataTableCard } from "../../../../components/data-display/DataTableCard";
import { AppBadge } from "../../../../design-system/AppBadge";
import { AppToolbar } from "../../../../design-system/AppLayout";
import { EmptyState } from "../../../../components/feedback/EmptyState";
import { ErrorState } from "../../../../components/feedback/ErrorState";
import { LoadingBlock } from "../../../../components/feedback/LoadingBlock";
import { getTenantInfo, getTenantModuleUsage } from "../../../../services/tenant-api";
import { useLanguage } from "../../../../store/language-context";
import { useTenantAuth } from "../../../../store/tenant-auth-context";
import { getTimeZoneLabel } from "../../../../utils/timezone-options";
import {
  displayPlatformCode,
  displayTenantAccessDetail,
} from "../../../../utils/platform-labels";
import type { ApiError, TenantInfoResponse, TenantModuleUsageResponse } from "../../../../types";

export function TenantOverviewPage() {
  const { session } = useTenantAuth();
  const { language } = useLanguage();
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

  useEffect(() => {
    void loadOverview();
  }, [session?.accessToken]);

  const tenant = tenantInfo?.tenant;

  return (
    <div className="d-grid gap-4">
      <PageHeader
        eyebrow={language === "es" ? "Espacio" : "Workspace"}
        icon="overview"
        title={
          tenant?.tenant_name ||
          session?.tenantSlug ||
          (language === "es" ? "Resumen del tenant" : "Tenant overview")
        }
        description={
          language === "es"
            ? "Vista general del estado actual de tu espacio, sus límites efectivos y los módulos disponibles."
            : "General view of your workspace, its effective limits, and the modules available."
        }
        actions={
          <AppToolbar compact>
            <button className="btn btn-outline-secondary" type="button" onClick={() => void loadOverview()}>
              {language === "es" ? "Recargar" : "Reload"}
            </button>
          </AppToolbar>
        }
      />

      {isLoading ? (
        <LoadingBlock
          label={
            language === "es"
              ? "Cargando resumen del tenant..."
              : "Loading tenant overview..."
          }
        />
      ) : null}

      {error ? (
        <ErrorState
          title={
            language === "es"
              ? "Información del tenant no disponible"
              : "Tenant information unavailable"
          }
          detail={error.payload?.detail || error.message}
          requestId={error.payload?.request_id}
        />
      ) : null}

      {tenant ? (
        <>
          <div className="tenant-portal-metrics">
            <MetricCard
              label={language === "es" ? "Módulos habilitados" : "Enabled modules"}
              icon="catalogs"
              tone="info"
              value={overview.enabledModules}
              hint={language === "es" ? "Cantidad activa hoy" : "Currently active"}
            />
            <MetricCard
              label={language === "es" ? "Claves de límites" : "Limit keys"}
              icon="settings"
              tone="default"
              value={overview.moduleLimitKeys}
              hint={language === "es" ? "Cuotas con regla efectiva" : "Quotas with an effective rule"}
            />
            <MetricCard
              label={language === "es" ? "Lecturas rpm efectivas" : "Effective read rpm"}
              icon="reports"
              tone="success"
              value={overview.apiReadLimit}
              hint={language === "es" ? "Límite vigente de lectura" : "Current read limit"}
            />
            <MetricCard
              label={language === "es" ? "Escrituras rpm efectivas" : "Effective write rpm"}
              icon="transactions"
              tone="warning"
              value={overview.apiWriteLimit}
              hint={language === "es" ? "Límite vigente de escritura" : "Current write limit"}
            />
          </div>

          <PanelCard
            icon="settings"
            title={language === "es" ? "Postura del tenant" : "Tenant posture"}
            subtitle={
              language === "es"
                ? "Estado operativo actual aplicado a tu espacio."
                : "Current operational state applied to your workspace."
            }
          >
            <div className="tenant-detail-grid">
              <DetailField label="Slug" value={<code>{tenant.tenant_slug}</code>} />
              <DetailField
                label={language === "es" ? "Tipo de tenant" : "Tenant type"}
                value={tenant.tenant_type ? displayPlatformCode(tenant.tenant_type, language) : "n/a"}
              />
              <DetailField
                label={language === "es" ? "Ciclo de vida" : "Lifecycle"}
                value={<StatusBadge value={tenant.tenant_status || "unknown"} />}
              />
              <DetailField
                label={language === "es" ? "Facturación" : "Billing"}
                value={<StatusBadge value={tenant.billing_status || "unknown"} />}
              />
              <DetailField
                label={language === "es" ? "Plan" : "Plan"}
                value={tenant.plan_code || (language === "es" ? "sin plan" : "no plan")}
              />
              <DetailField
                label={language === "es" ? "Acceso" : "Access"}
                value={tenant.access_allowed ? (language === "es" ? "permitido" : "allowed") : (language === "es" ? "bloqueado" : "blocked")}
              />
              <DetailField
                label={language === "es" ? "Mantenimiento" : "Maintenance"}
                value={tenant.maintenance_mode ? (language === "es" ? "habilitado" : "enabled") : (language === "es" ? "apagado" : "off")}
              />
              <DetailField
                label={language === "es" ? "Gracia billing" : "Billing grace"}
                value={tenant.billing_in_grace ? (language === "es" ? "sí" : "yes") : (language === "es" ? "no" : "no")}
              />
              <DetailField
                label={language === "es" ? "Zona por defecto" : "Default timezone"}
                value={getTimeZoneLabel(tenant.timezone || "America/Santiago", language)}
              />
              <DetailField
                label={language === "es" ? "Zona efectiva" : "Effective timezone"}
                value={getTimeZoneLabel(
                  tenant.effective_timezone || tenant.timezone || "America/Santiago",
                  language
                )}
              />
            </div>
            {tenant.access_detail ? (
              <div className="tenant-inline-note">
                {displayTenantAccessDetail(tenant.access_detail, language)}
              </div>
            ) : null}
          </PanelCard>

          <div className="tenant-portal-split tenant-portal-split--overview">
            <PanelCard icon="catalogs" title={language === "es" ? "Módulos habilitados" : "Enabled modules"}>
              <div className="settings-token-chips">
                {(tenant.effective_enabled_modules || []).length > 0 ? (
                  tenant.effective_enabled_modules?.map((value) => (
                    <span key={value} className="tenant-chip">
                      {displayPlatformCode(value, language)}
                    </span>
                  ))
                ) : (
                  <EmptyState
                    title={
                      language === "es"
                        ? "Todavía no hay módulos habilitados"
                        : "There are no enabled modules yet"
                    }
                    detail={
                      language === "es"
                        ? "Este tenant aún no tiene módulos efectivos para operar desde el portal."
                        : "This tenant does not yet have effective modules to operate from the portal."
                    }
                  />
                )}
              </div>
            </PanelCard>

            <PanelCard icon="users" title={language === "es" ? "Usuario actual" : "Current user"}>
              <div className="tenant-detail-grid">
                <DetailField label="Email" value={tenantInfo?.user.email || "n/a"} />
                <DetailField
                  label={language === "es" ? "Rol" : "Role"}
                  value={
                    tenantInfo?.user.role ? displayPlatformCode(tenantInfo.user.role, language) : "n/a"
                  }
                />
                <DetailField
                  label={language === "es" ? "Preferencia horaria" : "Timezone preference"}
                  value={
                    tenantInfo?.user.timezone
                      ? getTimeZoneLabel(tenantInfo.user.timezone, language)
                      : language === "es"
                        ? "hereda la zona del tenant"
                        : "inherits tenant timezone"
                  }
                />
                <DetailField label={language === "es" ? "ID usuario" : "User ID"} value={tenantInfo?.user.id || "n/a"} />
                <DetailField label={language === "es" ? "Alcance del token" : "Token scope"} value={tenantInfo?.token_scope || "n/a"} />
              </div>
            </PanelCard>
          </div>

          {moduleUsageError ? (
            <ErrorState
              title={
                language === "es"
                  ? "Uso tenant por módulo no disponible"
                  : "Tenant module usage unavailable"
              }
              detail={moduleUsageError.payload?.detail || moduleUsageError.message}
              requestId={moduleUsageError.payload?.request_id}
            />
          ) : null}

          {moduleUsage ? (
            <DataTableCard
              title={language === "es" ? "Uso por módulo" : "Usage by module"}
              rows={moduleUsage.data}
              columns={[
                {
                  key: "module_key",
                  header: language === "es" ? "Clave de módulo" : "Module key",
                  render: (row) => <code>{row.module_key}</code>,
                },
                {
                  key: "used_units",
                  header: language === "es" ? "Usado" : "Used",
                  render: (row) => row.used_units,
                },
                {
                  key: "max_units",
                  header: language === "es" ? "Límite" : "Limit",
                  render: (row) => (row.unlimited ? (language === "es" ? "ilimitado" : "unlimited") : row.max_units ?? "—"),
                },
                {
                  key: "remaining_units",
                  header: language === "es" ? "Restante" : "Remaining",
                  render: (row) =>
                    row.unlimited ? "—" : row.remaining_units ?? "—",
                },
                {
                  key: "limit_source",
                  header: language === "es" ? "Fuente" : "Source",
                  render: (row) =>
                    row.limit_source ? displayPlatformCode(row.limit_source, language) : language === "es" ? "ninguna" : "none",
                },
                {
                  key: "at_limit",
                  header: language === "es" ? "Estado" : "Status",
                  render: (row) =>
                    row.at_limit ? (
                      <AppBadge tone="warning">
                        {language === "es" ? "al límite" : "at limit"}
                      </AppBadge>
                    ) : (
                      <AppBadge tone="success">
                        {language === "es" ? "ok" : "ok"}
                      </AppBadge>
                    ),
                },
              ]}
            />
          ) : null}
        </>
      ) : !isLoading ? (
        <PanelCard title={language === "es" ? "Resumen del tenant" : "Tenant overview"}>
          <EmptyState
            title={
              language === "es"
                ? "No se pudo armar el resumen del tenant"
                : "The tenant overview could not be built"
            }
            detail={
              language === "es"
                ? "La sesión actual no devolvió información suficiente para mostrar el contexto operativo del espacio."
                : "The current session did not return enough information to display the workspace operational context."
            }
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
