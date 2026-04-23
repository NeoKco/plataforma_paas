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
import {
  createTenantDataExportJob,
  createTenantDataImportJob,
  downloadTenantDataExportJob,
  getTenantInfo,
  getTenantModuleUsage,
  listTenantDataExportJobs,
  listTenantDataImportJobs,
} from "../../../../services/tenant-api";
import { useLanguage } from "../../../../store/language-context";
import { useTenantAuth } from "../../../../store/tenant-auth-context";
import { getTimeZoneLabel } from "../../../../utils/timezone-options";
import {
  displayPlatformCode,
  displayTenantAccessDetail,
} from "../../../../utils/platform-labels";
import type {
  ApiError,
  TenantDataExportJob,
  TenantDataExportScope,
  TenantDataImportJob,
  TenantInfoResponse,
  TenantModuleUsageResponse,
} from "../../../../types";

function getTenantDataExportScopeLabel(
  scope: string,
  language: "es" | "en"
) {
  switch (scope) {
    case "portable_full":
    case "portable_minimum":
      return language === "es" ? "Paquete completo" : "Full package";
    case "functional_data_only":
      return language === "es"
        ? "Solo datos funcionales"
        : "Functional data only";
    default:
      return scope;
  }
}

export function TenantOverviewPage() {
  const { session } = useTenantAuth();
  const { language } = useLanguage();
  const [tenantInfo, setTenantInfo] = useState<TenantInfoResponse | null>(null);
  const [moduleUsage, setModuleUsage] = useState<TenantModuleUsageResponse | null>(
    null
  );
  const [error, setError] = useState<ApiError | null>(null);
  const [moduleUsageError, setModuleUsageError] = useState<ApiError | null>(null);
  const [dataExportJobs, setDataExportJobs] = useState<TenantDataExportJob[]>([]);
  const [dataImportJobs, setDataImportJobs] = useState<TenantDataImportJob[]>([]);
  const [dataExportJobsError, setDataExportJobsError] = useState<ApiError | null>(null);
  const [dataImportJobsError, setDataImportJobsError] = useState<ApiError | null>(null);
  const [isDataExportJobsLoading, setIsDataExportJobsLoading] = useState(false);
  const [isDataImportJobsLoading, setIsDataImportJobsLoading] = useState(false);
  const [isPortabilitySubmitting, setIsPortabilitySubmitting] = useState(false);
  const [portabilityFeedback, setPortabilityFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [tenantDataExportScope, setTenantDataExportScope] =
    useState<TenantDataExportScope>("portable_full");
  const [tenantImportFile, setTenantImportFile] = useState<File | null>(null);
  const [tenantImportDryRun, setTenantImportDryRun] = useState(true);
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

  async function loadPortabilityWorkspace() {
    if (!session?.accessToken || tenantInfo?.user.role !== "admin") {
      setDataExportJobs([]);
      setDataImportJobs([]);
      setDataExportJobsError(null);
      setDataImportJobsError(null);
      return;
    }

    setIsDataExportJobsLoading(true);
    setIsDataImportJobsLoading(true);
    setDataExportJobsError(null);
    setDataImportJobsError(null);

    const results = await Promise.allSettled([
      listTenantDataExportJobs(session.accessToken, { limit: 10 }),
      listTenantDataImportJobs(session.accessToken, { limit: 10 }),
    ]);
    const [exportResult, importResult] = results;

    if (exportResult.status === "fulfilled") {
      setDataExportJobs(exportResult.value.data);
    } else {
      setDataExportJobs([]);
      setDataExportJobsError(exportResult.reason as ApiError);
    }

    if (importResult.status === "fulfilled") {
      setDataImportJobs(importResult.value.data);
    } else {
      setDataImportJobs([]);
      setDataImportJobsError(importResult.reason as ApiError);
    }

    setIsDataExportJobsLoading(false);
    setIsDataImportJobsLoading(false);
  }

  async function handleCreateTenantDataExport() {
    if (!session?.accessToken) {
      return;
    }

    setIsPortabilitySubmitting(true);
    setPortabilityFeedback(null);
    try {
      const job = await createTenantDataExportJob(session.accessToken, {
        export_scope: tenantDataExportScope,
      });
      setPortabilityFeedback({
        type: "success",
        message:
          language === "es"
            ? "Export portable generado correctamente."
            : "Portable export generated successfully.",
      });
      await loadPortabilityWorkspace();
      if (job.status === "completed" && job.artifacts.length > 0) {
        await downloadTenantDataExportJob(session.accessToken, job.id);
      }
    } catch (rawError) {
      const typedError = rawError as ApiError;
      setPortabilityFeedback({
        type: "error",
        message: typedError.payload?.detail || typedError.message,
      });
    } finally {
      setIsPortabilitySubmitting(false);
    }
  }

  async function handleDownloadTenantDataExport(jobId: number) {
    if (!session?.accessToken) {
      return;
    }
    setIsPortabilitySubmitting(true);
    setPortabilityFeedback(null);
    try {
      await downloadTenantDataExportJob(session.accessToken, jobId);
      setPortabilityFeedback({
        type: "success",
        message:
          language === "es"
            ? "Descarga iniciada correctamente."
            : "Download started successfully.",
      });
    } catch (rawError) {
      const typedError = rawError as ApiError;
      setPortabilityFeedback({
        type: "error",
        message: typedError.payload?.detail || typedError.message,
      });
    } finally {
      setIsPortabilitySubmitting(false);
    }
  }

  async function handleCreateTenantDataImport() {
    if (!session?.accessToken || tenantImportFile === null) {
      return;
    }
    setIsPortabilitySubmitting(true);
    setPortabilityFeedback(null);
    try {
      await createTenantDataImportJob(session.accessToken, {
        file: tenantImportFile,
        dry_run: tenantImportDryRun,
        import_strategy: "skip_existing",
      });
      setTenantImportFile(null);
      setTenantImportDryRun(true);
      setPortabilityFeedback({
        type: "success",
        message:
          language === "es"
            ? tenantImportDryRun
              ? "Simulación de import ejecutada correctamente."
              : "Import portable aplicado correctamente."
            : tenantImportDryRun
              ? "Import dry run completed successfully."
              : "Portable import applied successfully.",
      });
      await loadPortabilityWorkspace();
    } catch (rawError) {
      const typedError = rawError as ApiError;
      setPortabilityFeedback({
        type: "error",
        message: typedError.payload?.detail || typedError.message,
      });
    } finally {
      setIsPortabilitySubmitting(false);
    }
  }

  useEffect(() => {
    void loadOverview();
  }, [session?.accessToken]);

  useEffect(() => {
    void loadPortabilityWorkspace();
  }, [session?.accessToken, tenantInfo?.user.role]);

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
                label={language === "es" ? "Plan base" : "Base plan"}
                value={
                  tenant.subscription_base_plan_code ||
                  (tenant.legacy_plan_fallback_active ? tenant.plan_code : null) ||
                  (language === "es" ? "sin plan base" : "no base plan")
                }
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

          {tenantInfo?.user.role === "admin" ? (
            <>
              <PanelCard
                icon="catalogs"
                title={
                  language === "es"
                    ? "Portabilidad tenant"
                    : "Tenant portability"
                }
                subtitle={
                  language === "es"
                    ? "Exporta el tenant soportado completo o solo los datos funcionales desde el propio portal."
                    : "Export the supported full tenant package or only the functional data directly from the tenant portal."
                }
              >
                <div className="tenant-context-actions tenant-context-actions--compact">
                  <div className="tenant-help-text">
                    {language === "es"
                      ? "Disponible solo para admins tenant. Ningún modo reemplaza el backup PostgreSQL canónico."
                      : "Available only to tenant admins. Neither mode replaces canonical PostgreSQL backup."}
                  </div>
                  <div className="tenant-context-actions__buttons">
                    <select
                      className="form-select form-select-sm"
                      value={tenantDataExportScope}
                      onChange={(event) =>
                        setTenantDataExportScope(
                          event.target.value as TenantDataExportScope
                        )
                      }
                      disabled={isPortabilitySubmitting}
                      aria-label={
                        language === "es"
                          ? "Modo de exportación portable"
                          : "Portable export mode"
                      }
                    >
                      <option value="portable_full">
                        {getTenantDataExportScopeLabel("portable_full", language)}
                      </option>
                      <option value="functional_data_only">
                        {getTenantDataExportScopeLabel(
                          "functional_data_only",
                          language
                        )}
                      </option>
                    </select>
                    <button
                      className="btn btn-outline-primary btn-sm"
                      type="button"
                      onClick={() => void handleCreateTenantDataExport()}
                      disabled={isPortabilitySubmitting}
                    >
                      {language === "es"
                        ? "Exportar paquete portable"
                        : "Export portable package"}
                    </button>
                  </div>
                </div>
                <div className="tenant-inline-note">
                  {language === "es"
                    ? tenantDataExportScope === "functional_data_only"
                      ? "Modo actual: solo datos funcionales. Excluye identidad tenant, roles y usuarios."
                      : "Modo actual: completo tenant soportado. Incluye identidad tenant, roles, usuarios y datos funcionales."
                    : tenantDataExportScope === "functional_data_only"
                      ? "Current mode: functional data only. It excludes tenant identity, roles, and users."
                      : "Current mode: supported full tenant. It includes tenant identity, roles, users, and functional data."}
                </div>
                {portabilityFeedback ? (
                  <div
                    className={`tenant-inline-note ${
                      portabilityFeedback.type === "error"
                        ? "text-danger"
                        : "text-success"
                    }`}
                  >
                    {portabilityFeedback.message}
                  </div>
                ) : null}
                {isDataExportJobsLoading ? (
                  <LoadingBlock
                    label={
                      language === "es"
                        ? "Cargando exports portables..."
                        : "Loading portable exports..."
                    }
                  />
                ) : null}
                {dataExportJobsError ? (
                  <ErrorState
                    title={
                      language === "es"
                        ? "Falló la lectura de exports portables"
                        : "Portable exports read failed"
                    }
                    detail={
                      dataExportJobsError.payload?.detail ||
                      dataExportJobsError.message
                    }
                    requestId={dataExportJobsError.payload?.request_id}
                  />
                ) : null}
              </PanelCard>

              <PanelCard
                icon="reports"
                title={
                  language === "es"
                    ? "Import portable controlado"
                    : "Controlled portable import"
                }
                subtitle={
                  language === "es"
                    ? "Carga paquetes completos o de solo datos funcionales. Ejecuta primero dry_run."
                    : "Upload full packages or functional-data-only packages. Run dry_run first."
                }
              >
                <div className="tenant-form-grid">
                  <label className="tenant-field">
                    <span>{language === "es" ? "Paquete portable" : "Portable package"}</span>
                    <input
                      key={`tenant-overview-${tenantImportFile?.name || "empty"}`}
                      type="file"
                      accept=".zip,application/zip"
                      onChange={(event) =>
                        setTenantImportFile(event.target.files?.[0] || null)
                      }
                    />
                  </label>
                  <label className="tenant-field tenant-field--checkbox">
                    <input
                      type="checkbox"
                      checked={tenantImportDryRun}
                      onChange={(event) => setTenantImportDryRun(event.target.checked)}
                    />
                    <span>
                      {language === "es"
                        ? "Ejecutar como dry_run"
                        : "Run as dry_run"}
                    </span>
                  </label>
                </div>
                {tenantImportFile ? (
                  <div className="tenant-inline-note">
                    {language === "es" ? "Archivo seleccionado" : "Selected file"}:{" "}
                    {tenantImportFile.name}
                  </div>
                ) : null}
                <div className="tenant-context-actions__buttons">
                  <button
                    className="btn btn-outline-primary btn-sm"
                    type="button"
                    onClick={() => void handleCreateTenantDataImport()}
                    disabled={isPortabilitySubmitting || tenantImportFile === null}
                  >
                    {tenantImportDryRun
                      ? language === "es"
                        ? "Simular import portable"
                        : "Run portable import dry_run"
                      : language === "es"
                        ? "Aplicar import portable"
                        : "Apply portable import"}
                  </button>
                </div>
                {isDataImportJobsLoading ? (
                  <LoadingBlock
                    label={
                      language === "es"
                        ? "Cargando imports portables..."
                        : "Loading portable imports..."
                    }
                  />
                ) : null}
                {dataImportJobsError ? (
                  <ErrorState
                    title={
                      language === "es"
                        ? "Falló la lectura de imports portables"
                        : "Portable imports read failed"
                    }
                    detail={
                      dataImportJobsError.payload?.detail ||
                      dataImportJobsError.message
                    }
                    requestId={dataImportJobsError.payload?.request_id}
                  />
                ) : null}
              </PanelCard>

              {dataExportJobs.length > 0 ? (
                <DataTableCard
                  title={
                    language === "es"
                      ? "Últimos exports portables"
                      : "Latest portable exports"
                  }
                  rows={dataExportJobs}
                  columns={[
                    {
                      key: "id",
                      header: "Job",
                      render: (row) => `#${row.id}`,
                    },
                    {
                      key: "status",
                      header: language === "es" ? "Estado" : "Status",
                      render: (row) => <StatusBadge value={row.status} />,
                    },
                    {
                      key: "export_scope",
                      header: "Scope",
                      render: (row) =>
                        getTenantDataExportScopeLabel(row.export_scope, language),
                    },
                    {
                      key: "created_at",
                      header: language === "es" ? "Creado" : "Created",
                      render: (row) => row.created_at || "—",
                    },
                    {
                      key: "actions",
                      header: language === "es" ? "Acciones" : "Actions",
                      render: (row) =>
                        row.status === "completed" && row.artifacts.length > 0 ? (
                          <button
                            className="btn btn-outline-secondary btn-sm"
                            type="button"
                            onClick={() => void handleDownloadTenantDataExport(row.id)}
                            disabled={isPortabilitySubmitting}
                          >
                            {language === "es" ? "Descargar zip" : "Download zip"}
                          </button>
                        ) : (
                          <span className="text-secondary">
                            {language === "es" ? "sin descarga" : "no download"}
                          </span>
                        ),
                    },
                  ]}
                />
              ) : null}

              {dataImportJobs.length > 0 ? (
                <DataTableCard
                  title={
                    language === "es"
                      ? "Últimos imports portables"
                      : "Latest portable imports"
                  }
                  rows={dataImportJobs}
                  columns={[
                    {
                      key: "id",
                      header: "Job",
                      render: (row) => `#${row.id}`,
                    },
                    {
                      key: "status",
                      header: language === "es" ? "Estado" : "Status",
                      render: (row) => <StatusBadge value={row.status} />,
                    },
                    {
                      key: "mode",
                      header: language === "es" ? "Modo" : "Mode",
                      render: (row) => {
                        const summary =
                          row.summary_json && row.summary_json.trim()
                            ? JSON.parse(row.summary_json)
                            : null;
                        return summary?.mode || "n/a";
                      },
                    },
                    {
                      key: "export_scope",
                      header: "Scope",
                      render: (row) => {
                        const summary =
                          row.summary_json && row.summary_json.trim()
                            ? JSON.parse(row.summary_json)
                            : null;
                        return getTenantDataExportScopeLabel(
                          summary?.export_scope || row.export_scope,
                          language
                        );
                      },
                    },
                    {
                      key: "created_at",
                      header: language === "es" ? "Creado" : "Created",
                      render: (row) => row.created_at || "—",
                    },
                  ]}
                />
              ) : null}
            </>
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
