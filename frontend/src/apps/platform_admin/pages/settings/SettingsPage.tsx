import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { MetricCard } from "../../../../components/common/MetricCard";
import { PageHeader } from "../../../../components/common/PageHeader";
import { PanelCard } from "../../../../components/common/PanelCard";
import { DataTableCard } from "../../../../components/data-display/DataTableCard";
import { AppToolbar } from "../../../../design-system/AppLayout";
import { ErrorState } from "../../../../components/feedback/ErrorState";
import { LoadingBlock } from "../../../../components/feedback/LoadingBlock";
import {
  getPlatformCapabilities,
  getPlatformRootRecoveryStatus,
  getPlatformSecurityPosture,
  listPlatformUsers,
} from "../../../../services/platform-api";
import { API_BASE_URL, getDefaultApiBaseUrl } from "../../../../services/api";
import { useAuth } from "../../../../store/auth-context";
import { useLanguage } from "../../../../store/language-context";
import { displayPlatformCode } from "../../../../utils/platform-labels";
import type {
  ApiError,
  PlatformCapabilities,
  PlatformRootRecoveryStatusResponse,
  PlatformRuntimeSecurityPostureResponse,
  PlatformUser,
} from "../../../../types";

export function SettingsPage() {
  const { session } = useAuth();
  const { language } = useLanguage();
  const [capabilities, setCapabilities] = useState<PlatformCapabilities | null>(null);
  const [platformUsers, setPlatformUsers] = useState<PlatformUser[]>([]);
  const [rootRecoveryStatus, setRootRecoveryStatus] =
    useState<PlatformRootRecoveryStatusResponse | null>(null);
  const [securityPosture, setSecurityPosture] =
    useState<PlatformRuntimeSecurityPostureResponse | null>(null);
  const [rootRecoveryStatusError, setRootRecoveryStatusError] = useState<ApiError | null>(
    null
  );
  const [securityPostureError, setSecurityPostureError] = useState<ApiError | null>(
    null
  );
  const [error, setError] = useState<ApiError | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const overview = useMemo(() => {
    return {
      basePlans: capabilities?.base_plan_catalog.length || 0,
      rentableModules: capabilities?.module_subscription_catalog.length || 0,
      billingCycles: capabilities?.subscription_billing_cycles.length || 0,
      tenantStatuses: capabilities?.tenant_statuses.length || 0,
      billingStatuses: capabilities?.tenant_billing_statuses.length || 0,
      maintenanceScopes: capabilities?.maintenance_scopes.length || 0,
      moduleLimitKeys: capabilities?.supported_module_limit_keys.length || 0,
      billingProviders: capabilities?.billing_providers.length || 0,
      dispatchBackends: capabilities?.provisioning_dispatch_backends.length || 0,
    };
  }, [capabilities]);

  const governance = useMemo(() => {
    const activeUsers = platformUsers.filter((user) => user.is_active);

    return {
      totalUsers: platformUsers.length,
      inactiveUsers: platformUsers.filter((user) => !user.is_active).length,
      activeSuperadmins: activeUsers.filter((user) => user.role === "superadmin").length,
      activeAdmins: activeUsers.filter((user) => user.role === "admin").length,
      activeSupport: activeUsers.filter((user) => user.role === "support").length,
    };
  }, [platformUsers]);

  const runtimeApiUrl = useMemo(() => {
    return getDefaultApiBaseUrl();
  }, []);

  async function loadSettings() {
    if (!session?.accessToken) {
      return;
    }

    setIsLoading(true);
    setError(null);
    setRootRecoveryStatusError(null);
    setSecurityPostureError(null);

    try {
      const [
        capabilitiesResult,
        rootRecoveryResult,
        platformUsersResult,
        securityPostureResult,
      ] =
        await Promise.allSettled([
          getPlatformCapabilities(session.accessToken),
          getPlatformRootRecoveryStatus(session.accessToken),
          listPlatformUsers(session.accessToken),
          getPlatformSecurityPosture(session.accessToken),
        ]);

      if (capabilitiesResult.status === "fulfilled") {
        setCapabilities(capabilitiesResult.value);
      } else {
        setCapabilities(null);
      }

      if (platformUsersResult.status === "fulfilled") {
        setPlatformUsers(platformUsersResult.value.data);
      } else {
        setPlatformUsers([]);
      }

      if (rootRecoveryResult.status === "fulfilled") {
        setRootRecoveryStatus(rootRecoveryResult.value);
      } else {
        setRootRecoveryStatus(null);
        setRootRecoveryStatusError(rootRecoveryResult.reason as ApiError);
      }

      if (securityPostureResult.status === "fulfilled") {
        setSecurityPosture(securityPostureResult.value);
      } else {
        setSecurityPosture(null);
        setSecurityPostureError(securityPostureResult.reason as ApiError);
      }

      if (
        capabilitiesResult.status === "rejected" &&
        platformUsersResult.status === "rejected" &&
        securityPostureResult.status === "rejected"
      ) {
        throw capabilitiesResult.reason;
      }
    } catch (rawError) {
      setError(rawError as ApiError);
      setCapabilities(null);
      setRootRecoveryStatus(null);
      setSecurityPosture(null);
      setPlatformUsers([]);
      setRootRecoveryStatusError(null);
      setSecurityPostureError(null);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadSettings();
  }, [session?.accessToken]);

  return (
    <div className="d-grid gap-4">
      <PageHeader
        eyebrow={language === "es" ? "Plataforma" : "Platform"}
        icon="settings"
        title={language === "es" ? "Configuración" : "Settings"}
        description={
          language === "es"
            ? "Referencia rápida del entorno visible, la sesión actual y los catálogos que la consola consume desde backend."
            : "Quick reference for the visible environment, current session and catalogs consumed by the console from the backend."
        }
        actions={
          <AppToolbar compact>
            <button className="btn btn-outline-secondary" type="button" onClick={() => void loadSettings()}>
              {language === "es" ? "Recargar" : "Reload"}
            </button>
          </AppToolbar>
        }
      />

      {isLoading ? (
        <LoadingBlock
          label={
            language === "es"
              ? "Cargando configuración de plataforma..."
              : "Loading platform settings..."
          }
        />
      ) : null}
      {error ? (
        <ErrorState
          detail={error.payload?.detail || error.message}
          requestId={error.payload?.request_id}
        />
      ) : null}

      <div className="settings-overview-grid">
        <MetricCard
          label={language === "es" ? "Planes base" : "Base plans"}
          icon="catalogs"
          tone="success"
          value={overview.basePlans}
          hint={
            language === "es"
              ? "Base comercial obligatoria hoy declarada por backend."
              : "Commercial mandatory base currently declared by the backend."
          }
        />
        <MetricCard
          label={language === "es" ? "Módulos arrendables" : "Rentable modules"}
          icon="overview"
          tone="info"
          value={overview.rentableModules}
          hint={
            language === "es"
              ? "Add-ons que el modelo aprobado deja contratar por suscripción."
              : "Add-ons the approved model allows to contract by subscription."
          }
        />
        <MetricCard
          label={language === "es" ? "Ciclos comerciales" : "Billing cycles"}
          icon="billing"
          tone="default"
          value={overview.billingCycles}
          hint={
            language === "es"
              ? "Ciclos normalizados para base y módulos arrendables."
              : "Normalized cycles for the base plan and rentable modules."
          }
        />
        <MetricCard
          label={language === "es" ? "Estados tenant" : "Tenant statuses"}
          icon="tenants"
          tone="default"
          value={overview.tenantStatuses}
          hint={
            language === "es"
              ? "Opciones visibles de lifecycle disponibles en la API."
              : "Visible lifecycle options currently available in the API."
          }
        />
        <MetricCard
          label={language === "es" ? "Estados de facturación" : "Billing statuses"}
          icon="billing"
          tone="info"
          value={overview.billingStatuses}
          hint={
            language === "es"
              ? "Estados de billing que hoy entiende la consola."
              : "Billing states currently understood by the console."
          }
        />
        <MetricCard
          label={language === "es" ? "Scopes de mantenimiento" : "Maintenance scopes"}
          icon="activity"
          tone="warning"
          value={overview.maintenanceScopes}
          hint={
            language === "es"
              ? "Ámbitos que se pueden restringir por mantenimiento."
              : "Scopes that can be restricted through maintenance mode."
          }
        />
        <MetricCard
          label={language === "es" ? "Claves de límites" : "Limit keys"}
          icon="catalogs"
          tone="success"
          value={overview.moduleLimitKeys}
          hint={
            language === "es"
              ? "Claves de cuota y uso visibles para operación."
              : "Quota and usage keys visible to operations."
          }
        />
        <MetricCard
          label={language === "es" ? "Proveedores de billing" : "Billing providers"}
          icon="billing"
          tone="default"
          value={overview.billingProviders}
          hint={
            language === "es"
              ? "Orígenes de eventos de facturación soportados."
              : "Supported sources of billing events."
          }
        />
        <MetricCard
          label={language === "es" ? "Backends de despacho" : "Dispatch backends"}
          icon="provisioning"
          tone="info"
          value={overview.dispatchBackends}
          hint={
            language === "es"
              ? "Mecanismos de ejecución visibles para provisioning."
              : "Visible execution mechanisms for provisioning."
          }
        />
      </div>

      <div className="settings-grid">
        <PanelCard
          icon="overview"
          title={language === "es" ? "Entorno y sesión actual" : "Environment and current session"}
          subtitle={
            language === "es"
              ? "Lectura rápida para validar con qué sesión y con qué dirección de API crees estar operando."
              : "Quick read to validate with which session and API URL you think you are operating."
          }
        >
          <div className="tenant-detail-grid">
            <DetailField
              label={language === "es" ? "API configurada" : "Configured API"}
              value={<code>{API_BASE_URL}</code>}
            />
            <DetailField
              label={language === "es" ? "API esperada en esta red" : "Expected API on this network"}
              value={<code>{runtimeApiUrl}</code>}
            />
            <DetailField label="Email" value={session?.email || "n/a"} />
            <DetailField
              label={language === "es" ? "Nombre completo" : "Full name"}
              value={session?.fullName || "n/a"}
            />
            <DetailField
              label={language === "es" ? "Rol" : "Role"}
              value={displayPlatformCode(session?.role || "n/a", language)}
            />
          </div>
          <div className="dashboard-quick-hints mt-0">
            <div>
              {language === "es"
                ? "Si ambas URLs no coinciden, el backend puede estar bien pero esta pantalla seguirá mostrando una configuración vieja."
                : "If both URLs do not match, the backend may be fine but this screen will still show an outdated configuration."}
            </div>
            <div>
              {language === "es"
                ? "La URL configurada viene de `VITE_API_BASE_URL`; la esperada se calcula con el host visible del navegador."
                : "The configured URL comes from `VITE_API_BASE_URL`; the expected one is computed from the browser visible host."}
            </div>
          </div>
        </PanelCard>

        <PanelCard
          icon="catalogs"
          title={language === "es" ? "Reglas de trabajo de la consola" : "Console working rules"}
          subtitle={
            language === "es"
              ? "Guías cortas para no romper el patrón backend-driven al seguir construyendo pantallas."
              : "Short guidelines to avoid breaking the backend-driven pattern while building more screens."
          }
        >
          <div className="dashboard-quick-hints mt-0">
            <div>
              {language === "es"
                ? "No hardcodees estados tenant, estados de facturación ni claves de límites si ya vienen por API."
                : "Do not hardcode tenant statuses, billing statuses or limit keys if they already come from the API."}
            </div>
            <div>
              {language === "es"
                ? "Usa `GET /platform/capabilities` como fuente de verdad para catálogos y opciones visibles."
                : "Use `GET /platform/capabilities` as the source of truth for visible catalogs and options."}
            </div>
            <div>
              {language === "es"
                ? "Deja la lógica de negocio en servicios y políticas backend; en React solo resuelve presentación y flujo."
                : "Keep business logic in backend services and policies; React should only handle presentation and flow."}
            </div>
            <div>
              {language === "es"
                ? "Antes de abrir otra pantalla, revisa si `Tenants`, `Provisioning`, `Billing` o `tenant_portal` ya cubren el caso."
                : "Before opening another screen, check whether `Tenants`, `Provisioning`, `Billing` or `tenant_portal` already cover the case."}
            </div>
          </div>
        </PanelCard>

        <PanelCard
          icon="users"
          title={language === "es" ? "Instalación y cuenta raíz" : "Installation and root account"}
          subtitle={
            language === "es"
              ? "Resumen operativo del ciclo de vida de la cuenta superadministradora y de la recuperación raíz."
              : "Operational summary of the superadmin account lifecycle and root recovery."
          }
        >
          <div className="tenant-detail-grid">
            <DetailField
              label={language === "es" ? "Plataforma instalada" : "Platform installed"}
              value={language === "es" ? "sí" : "yes"}
            />
            <DetailField
              label={language === "es" ? "Superadministrador activo" : "Active superadmin"}
              value={
                rootRecoveryStatus
                  ? rootRecoveryStatus.has_active_superadmin
                    ? language === "es"
                      ? "sí"
                      : "yes"
                    : language === "es"
                      ? "no"
                      : "no"
                  : "n/d"
              }
            />
            <DetailField
              label={language === "es" ? "Clave de recuperación" : "Recovery key"}
              value={
                rootRecoveryStatus
                  ? rootRecoveryStatus.recovery_configured
                    ? language === "es"
                      ? "configurada"
                      : "configured"
                    : language === "es"
                      ? "not configured"
                      : "not configured"
                  : "n/d"
              }
            />
            <DetailField
              label={language === "es" ? "Recuperación disponible ahora" : "Recovery available now"}
              value={
                rootRecoveryStatus
                  ? rootRecoveryStatus.recovery_available
                    ? language === "es"
                      ? "sí"
                      : "yes"
                    : language === "es"
                      ? "no"
                      : "no"
                  : "n/d"
              }
            />
          </div>
          {rootRecoveryStatusError ? (
            <div className="alert alert-warning mt-3 mb-0">
              {language === "es"
                ? "No fue posible leer ahora el estado de recuperación raíz. El resto de la consola sí quedó cargado correctamente."
                : "The root recovery status could not be read right now. The rest of the console still loaded correctly."}
            </div>
          ) : null}
          <div className="dashboard-quick-hints mt-0">
            <div>
              {language === "es"
                ? "La política vigente exige una sola cuenta `superadmin` activa para operar la plataforma."
                : "Current policy requires a single active `superadmin` account to operate the platform."}
            </div>
            <div>
              {language === "es" ? "Si la recuperación aparece disponible, normalmente significa que ya no queda ningún `superadmin` activo y debes usar " : "If recovery appears available, it usually means there is no active `superadmin` left and you must use "}
              <Link to="/login/root-recovery">
                {language === "es" ? "Recuperar cuenta raíz" : "Recover root account"}
              </Link>
              .
            </div>
            <div>
              {language === "es" ? "La gobernanza normal de operadores se hace desde " : "Normal operator governance is handled from "}
              <Link to="/users">
                {language === "es" ? "Usuarios de plataforma" : "Platform users"}
              </Link>
              {language === "es" ? ", no desde el flujo de recuperación." : ", not from the recovery flow."}
            </div>
          </div>
        </PanelCard>

        <PanelCard
          icon="activity"
          title={language === "es" ? "Postura de secretos y runtime" : "Secrets and runtime posture"}
          subtitle={
            language === "es"
              ? "Lectura segura de hallazgos de configuración sin exponer valores sensibles."
              : "Safe read of configuration findings without exposing sensitive values."
          }
        >
          <div className="tenant-detail-grid">
            <DetailField
              label={language === "es" ? "Entorno actual" : "Current environment"}
              value={securityPosture?.app_env || "n/d"}
            />
            <DetailField
              label={language === "es" ? "Listo para producción" : "Production ready"}
              value={
                securityPosture
                  ? securityPosture.production_ready
                    ? language === "es"
                      ? "sí"
                      : "yes"
                    : language === "es"
                      ? "no"
                      : "no"
                  : "n/d"
              }
            />
            <DetailField
              label={language === "es" ? "Hallazgos" : "Findings"}
              value={securityPosture?.findings_count ?? "n/d"}
            />
          </div>
          {securityPostureError ? (
            <div className="alert alert-warning mt-3 mb-0">
              {language === "es"
                ? "No fue posible leer ahora la postura de seguridad. El resto de la consola sí quedó cargado correctamente."
                : "The security posture could not be read right now. The rest of the console still loaded correctly."}
            </div>
          ) : null}
          {securityPosture && securityPosture.findings.length ? (
            <div className="dashboard-quick-hints mt-3">
              {securityPosture.findings.map((finding) => (
                <div key={finding}>{finding}</div>
              ))}
            </div>
          ) : null}
          <div className="dashboard-quick-hints mt-3">
            <div>
              {language === "es"
                ? "Las passwords bootstrap tenant de demo o demasiado cortas ya quedan prohibidas cuando `APP_ENV=production`."
                : "Demo or overly short tenant bootstrap passwords are already forbidden when `APP_ENV=production`."}
            </div>
            <div>
              {language === "es"
                ? "Esta lectura no muestra secretos; solo resume si el runtime tiene hallazgos pendientes."
                : "This read does not expose secrets; it only summarizes whether the runtime still has pending findings."}
            </div>
          </div>
        </PanelCard>

        <PanelCard
          icon="users"
          title={language === "es" ? "Gobernanza de acceso" : "Access governance"}
          subtitle={
            language === "es"
              ? "Resumen corto de operadores de plataforma visibles hoy desde la consola."
              : "Short summary of platform operators visible today from the console."
          }
        >
          <div className="tenant-detail-grid">
            <DetailField
              label={language === "es" ? "Usuarios totales" : "Total users"}
              value={governance.totalUsers}
            />
            <DetailField
              label={language === "es" ? "Usuarios inactivos" : "Inactive users"}
              value={governance.inactiveUsers}
            />
            <DetailField
              label={language === "es" ? "Superadministradores activos" : "Active superadmins"}
              value={governance.activeSuperadmins}
            />
            <DetailField
              label={language === "es" ? "Admins activos" : "Active admins"}
              value={governance.activeAdmins}
            />
            <DetailField
              label={language === "es" ? "Support activos" : "Active support"}
              value={governance.activeSupport}
            />
          </div>
          {governance.activeSuperadmins !== 1 ? (
            <div className="alert alert-warning mt-3 mb-0">
              {language === "es"
                ? "La política vigente espera exactamente un `superadmin` activo. Revisa"
                : "Current policy expects exactly one active `superadmin`. Review"}
              <Link className="ms-1" to="/users">
                {language === "es" ? "Usuarios de plataforma" : "Platform users"}
              </Link>
              {language === "es" ? " para normalizar el acceso." : " to normalize access."}
            </div>
          ) : null}
          <div className="dashboard-quick-hints mt-3">
            <div>
              {language === "es"
                ? "`superadmin` debe ser único y queda reservado para administración raíz."
                : "`superadmin` must remain unique and reserved for root administration."}
            </div>
            <div>
              {language === "es"
                ? "`admin` gobierna usuarios `support` y puede revisar `Actividad`."
                : "`admin` manages `support` users and can review `Activity`."}
            </div>
            <div>
              {language === "es"
                ? "`support` debe mantenerse como operador acotado, no como cuenta raíz."
                : "`support` should remain a scoped operator, not a root account."}
            </div>
          </div>
        </PanelCard>
      </div>

      {capabilities ? (
        <>
          <DataTableCard
            title={language === "es" ? "Plan Base" : "Base plan"}
            subtitle={
              language === "es"
                ? "Catálogo comercial obligatorio del tenant: base mínima, finanzas incluidas, ciclos permitidos y baseline técnico ya desligado del `plan_code` por tenant."
                : "Tenant mandatory commercial catalog: minimum base, included finance, allowed cycles and technical baseline already detached from per-tenant `plan_code`."
            }
            rows={capabilities.base_plan_catalog}
            columns={[
              {
                key: "plan_code",
                header: language === "es" ? "Código" : "Code",
                render: (row) => <code>{row.plan_code}</code>,
              },
              {
                key: "display_name",
                header: language === "es" ? "Nombre visible" : "Display name",
                render: (row) => row.display_name,
              },
              {
                key: "included_modules",
                header: language === "es" ? "Incluye" : "Includes",
                render: (row) =>
                  row.included_modules?.length ? (
                    <div className="settings-token-chips">
                      {row.included_modules.map((value) => (
                        <span key={`${row.plan_code}-included-${value}`} className="tenant-chip">
                          {getPlanModuleLabel(value, language)}
                        </span>
                      ))}
                    </div>
                  ) : (
                    "—"
                  ),
              },
              {
                key: "compatibility_policy_code",
                header: language === "es" ? "Compatibilidad" : "Compatibility",
                render: (row) =>
                  row.compatibility_policy_code ? (
                    <code>{row.compatibility_policy_code}</code>
                  ) : (
                    "—"
                  ),
              },
              {
                key: "read_requests_per_minute",
                header: language === "es" ? "Lecturas/min" : "Read/min",
                render: (row) => row.read_requests_per_minute ?? "—",
              },
              {
                key: "write_requests_per_minute",
                header: language === "es" ? "Escrituras/min" : "Write/min",
                render: (row) => row.write_requests_per_minute ?? "—",
              },
              {
                key: "module_limits",
                header: language === "es" ? "Límites base" : "Base limits",
                render: (row) =>
                  row.module_limits && Object.keys(row.module_limits).length ? (
                    <div className="settings-token-chips">
                      {Object.entries(row.module_limits).map(([key, value]) => (
                        <span key={`${row.plan_code}-limit-${key}`} className="tenant-chip">
                          {displayPlatformCode(key, language)}: {value}
                        </span>
                      ))}
                    </div>
                  ) : (
                    "—"
                  ),
              },
              {
                key: "default_billing_cycle",
                header: language === "es" ? "Ciclo base" : "Default cycle",
                render: (row) => getBillingCycleLabel(row.default_billing_cycle, language),
              },
              {
                key: "allowed_billing_cycles",
                header: language === "es" ? "Ciclos permitidos" : "Allowed cycles",
                render: (row) => (
                  <div className="settings-token-chips">
                    {row.allowed_billing_cycles.map((value) => (
                      <span key={`${row.plan_code}-cycle-${value}`} className="tenant-chip">
                        {getBillingCycleLabel(value, language)}
                      </span>
                    ))}
                  </div>
                ),
              },
              {
                key: "description",
                header: language === "es" ? "Lectura" : "Read",
                render: (row) => row.description || "—",
              },
            ]}
          />

          <DataTableCard
            title={language === "es" ? "Módulos arrendables" : "Rentable modules"}
            subtitle={
              language === "es"
                ? "Add-ons del modelo aprobado. Aquí se ve qué módulo se vende aparte y con qué ciclos comerciales."
                : "Add-ons from the approved model. This shows which module is sold separately and with which billing cycles."
            }
            rows={capabilities.module_subscription_catalog}
            columns={[
              {
                key: "module_key",
                header: language === "es" ? "Módulo" : "Module",
                render: (row) => (
                  <span className="tenant-chip">
                    {getPlanModuleLabel(row.module_key, language)}
                  </span>
                ),
              },
              {
                key: "display_name",
                header: language === "es" ? "Nombre visible" : "Display name",
                render: (row) => row.display_name,
              },
              {
                key: "activation_kind",
                header: language === "es" ? "Tipo" : "Kind",
                render: (row) => getActivationKindLabel(row.activation_kind, language),
              },
              {
                key: "billing_cycles",
                header: language === "es" ? "Ciclos" : "Cycles",
                render: (row) => (
                  <div className="settings-token-chips">
                    {row.billing_cycles.map((value) => (
                      <span key={`${row.module_key}-cycle-${value}`} className="tenant-chip">
                        {getBillingCycleLabel(value, language)}
                      </span>
                    ))}
                  </div>
                ),
              },
              {
                key: "description",
                header: language === "es" ? "Lectura" : "Read",
                render: (row) => row.description || "—",
              },
            ]}
          />

          {capabilities.legacy_plan_fallback_available ? (
            <DataTableCard
              title={
                language === "es"
                  ? "Catálogo legacy de compatibilidad por plan"
                  : "Legacy compatibility catalog by plan"
              }
              subtitle={
                language === "es"
                  ? "Solo aparece si todavía existe al menos un tenant heredado que dependa de `plan_code`."
                  : "Only shown while at least one inherited tenant still depends on `plan_code`."
              }
              rows={capabilities.legacy_plan_catalog}
              columns={[
                {
                  key: "plan_code",
                  header: language === "es" ? "Plan" : "Plan",
                  render: (row) => <code>{row.plan_code}</code>,
                },
                {
                  key: "enabled_modules",
                  header: language === "es" ? "Módulos efectivos" : "Effective modules",
                  render: (row) =>
                    row.enabled_modules?.length ? (
                      <div className="settings-token-chips">
                        {row.enabled_modules.map((value) => (
                          <span key={`${row.plan_code}-${value}`} className="tenant-chip">
                            {getPlanModuleLabel(value, language)}
                          </span>
                        ))}
                      </div>
                    ) : (
                      "—"
                    ),
                },
                {
                  key: "module_limits",
                  header: language === "es" ? "Límites por módulo" : "Per-module limits",
                  render: (row) =>
                    formatModuleLimitsSummary(row.module_limits, language),
                },
                {
                  key: "read_requests_per_minute",
                  header: language === "es" ? "Read req/min" : "Read req/min",
                  render: (row) => row.read_requests_per_minute ?? "—",
                },
                {
                  key: "write_requests_per_minute",
                  header: language === "es" ? "Write req/min" : "Write req/min",
                  render: (row) => row.write_requests_per_minute ?? "—",
                },
              ]}
            />
          ) : null}

          <DataTableCard
            title={language === "es" ? "Catálogo de capacidades" : "Capabilities catalog"}
            subtitle={
              language === "es"
                ? "Claves y metadatos que el backend publica hoy para límites por módulo."
                : "Keys and metadata currently published by the backend for module limits."
            }
            rows={capabilities.module_limit_capabilities}
            columns={[
              {
                key: "key",
                header: language === "es" ? "Clave" : "Key",
                render: (row) => <code>{row.key}</code>,
              },
              {
                key: "module_name",
                header: language === "es" ? "Módulo" : "Module",
                render: (row) => row.module_name,
              },
              {
                key: "resource_name",
                header: language === "es" ? "Recurso" : "Resource",
                render: (row) => row.resource_name,
              },
              {
                key: "period",
                header: language === "es" ? "Período" : "Period",
                render: (row) => displayPlatformCode(row.period || "none", language),
              },
              {
                key: "description",
                header: language === "es" ? "Descripción" : "Description",
                render: (row) => row.description || "—",
              },
            ]}
          />

          <DataTableCard
            title={
              language === "es"
                ? "Dependencias entre módulos"
                : "Module dependencies"
            }
            subtitle={
              language === "es"
                ? "Dependencias explícitas declaradas por backend para no abrir activaciones inválidas por tenant."
                : "Explicit dependencies declared by the backend to avoid invalid tenant activations."
            }
            rows={capabilities.module_dependency_catalog}
            columns={[
              {
                key: "module_key",
                header: language === "es" ? "Módulo" : "Module",
                render: (row) => (
                  <span className="tenant-chip">
                    {getPlanModuleLabel(row.module_key, language)}
                  </span>
                ),
              },
              {
                key: "requires_modules",
                header: language === "es" ? "Requiere" : "Requires",
                render: (row) =>
                  row.requires_modules?.length ? (
                    <div className="settings-token-chips">
                      {row.requires_modules.map((moduleKey) => (
                        <span key={`${row.module_key}-${moduleKey}`} className="tenant-chip">
                          {getPlanModuleLabel(moduleKey, language)}
                        </span>
                      ))}
                    </div>
                  ) : (
                    "—"
                  ),
              },
              {
                key: "reason",
                header: language === "es" ? "Motivo" : "Reason",
                render: (row) => row.reason || "—",
              },
            ]}
          />

          <div className="settings-grid">
            <PanelCard
              icon="catalogs"
              title={language === "es" ? "Enumeraciones" : "Enumerations"}
            >
              <div className="settings-token-list">
                <SettingsTokenGroup
                  title={language === "es" ? "Estados tenant" : "Tenant statuses"}
                  language={language}
                  values={capabilities.tenant_statuses}
                />
                <SettingsTokenGroup
                  title={language === "es" ? "Estados de facturación" : "Billing statuses"}
                  language={language}
                  values={capabilities.tenant_billing_statuses}
                />
                <SettingsTokenGroup
                  title={language === "es" ? "Scopes de mantenimiento" : "Maintenance scopes"}
                  language={language}
                  values={capabilities.maintenance_scopes}
                />
                <SettingsTokenGroup
                  title={
                    language === "es"
                      ? "Resultados de sync billing"
                      : "Billing sync results"
                  }
                  language={language}
                  values={capabilities.billing_sync_processing_results}
                />
              </div>
            </PanelCard>

            <PanelCard
              icon="overview"
              title={language === "es" ? "Alcance actual del frontend" : "Current frontend scope"}
              subtitle={
                language === "es"
                  ? "Lo que hoy ya puede operar un superadmin sin salir de la UI."
                  : "What a superadmin can already operate today without leaving the UI."
              }
            >
              <div className="dashboard-quick-hints mt-0">
                <div>
                  {language === "es"
                    ? "`Resumen`: KPIs y focos de atención operativa."
                    : "`Overview`: KPIs and operational focus areas."}
                </div>
                <div>
                  {language === "es"
                    ? "`Tenants`: lifecycle, mantenimiento, facturación, plan, identidad de billing y límites."
                    : "`Tenants`: lifecycle, maintenance, billing, plan, billing identity and limits."}
                </div>
                <div>
                  {language === "es"
                    ? "`Provisioning`: jobs, métricas, alertas y recuperación técnica."
                    : "`Provisioning`: jobs, metrics, alerts and technical recovery."}
                </div>
                <div>
                  {language === "es"
                    ? "`Facturación`: resumen global, workspace tenant y reconcile de eventos persistidos."
                    : "`Billing`: global summary, tenant workspace and reconciliation of persisted events."}
                </div>
              </div>
            </PanelCard>

            <PanelCard
              icon="catalogs"
              title={
                language === "es"
                  ? "Registro y activación de módulos"
                  : "Module registry and activation"
              }
              subtitle={
                language === "es"
                  ? "Lectura operativa corta del slice inicial de la Etapa 15."
                  : "Short operational read for the initial slice of Stage 15."
              }
            >
              <div className="dashboard-quick-hints mt-0">
                <div>
                  {language === "es"
                    ? "El modelo aprobado ya separa `Plan Base`, módulos arrendables, ciclos y dependencias desde `GET /platform/capabilities`."
                    : "The approved model already separates `Base plan`, rentable modules, billing cycles and dependencies from `GET /platform/capabilities`."}
                </div>
                <div>
                  {language === "es"
                    ? "La activación tenant-side visible ya consume `tenant_subscriptions` con fallback legacy por `plan_code` cuando todavía hace falta compatibilidad."
                    : "Visible tenant-side activation already consumes `tenant_subscriptions` with legacy `plan_code` fallback when compatibility is still needed."}
                </div>
                <div>
                  {language === "es"
                    ? "Los overrides de límites por tenant siguen existiendo, pero no reemplazan ni el `Plan Base` ni los add-ons comerciales."
                    : "Tenant-specific limit overrides still exist, but they do not replace either the `Base plan` or the commercial add-ons."}
                </div>
                <div>
                  {language === "es"
                    ? "Las dependencias explícitas ya se leen desde backend y sirven para no vender ni habilitar combinaciones inválidas."
                    : "Explicit dependencies are now read from the backend and help avoid selling or enabling invalid combinations."}
                </div>
                <div>
                  {language === "es"
                    ? "La activación efectiva ya consume suscripciones tenant y la consola ya puede contratar add-ons. Lo siguiente es retirar gradualmente el fallback legacy por `plan_code`."
                    : "Effective activation already consumes tenant subscriptions and the console can already contract add-ons. The next step is gradually retiring the legacy `plan_code` fallback."}
                </div>
              </div>
              <div className="settings-token-chips mt-3">
                {capabilities.module_subscription_catalog.map((entry) => (
                  <span key={entry.module_key} className="tenant-chip">
                    {getPlanModuleLabel(entry.module_key, language)}
                  </span>
                ))}
              </div>
            </PanelCard>
          </div>
        </>
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

function SettingsTokenGroup({
  title,
  language,
  values,
}: {
  title: string;
  language: "es" | "en";
  values: string[];
}) {
  return (
    <div>
      <div className="tenant-detail__label">{title}</div>
      <div className="settings-token-chips">
        {values.map((value) => (
          <span key={value} className="tenant-chip">
            {displayPlatformCode(value, language)}
          </span>
        ))}
      </div>
    </div>
  );
}

function getPlanModuleLabel(
  moduleKey: string,
  language: "es" | "en"
): string {
  const labels: Record<string, string> = {
    all: language === "es" ? "Todos los módulos" : "All modules",
    core: language === "es" ? "Core negocio" : "Business core",
    users: language === "es" ? "Usuarios" : "Users",
    finance: language === "es" ? "Finanzas" : "Finance",
    maintenance: language === "es" ? "Mantenciones" : "Maintenance",
  };
  return labels[moduleKey] || moduleKey;
}

function getBillingCycleLabel(
  billingCycle: string,
  language: "es" | "en"
): string {
  const labels: Record<string, string> = {
    monthly: language === "es" ? "Mensual" : "Monthly",
    quarterly: language === "es" ? "Trimestral" : "Quarterly",
    semiannual: language === "es" ? "Semestral" : "Semiannual",
    annual: language === "es" ? "Anual" : "Annual",
  };

  return labels[billingCycle] || billingCycle;
}

function getActivationKindLabel(
  activationKind: string,
  language: "es" | "en"
): string {
  const labels: Record<string, string> = {
    included: language === "es" ? "Incluido" : "Included",
    addon: language === "es" ? "Arrendable" : "Add-on",
    dependency: language === "es" ? "Dependencia técnica" : "Technical dependency",
  };

  return labels[activationKind] || activationKind;
}

function formatModuleLimitsSummary(
  value: Record<string, number> | null,
  language: "es" | "en"
): string {
  if (!value || Object.keys(value).length === 0) {
    return "—";
  }

  return Object.entries(value)
    .map(([key, amount]) => `${displayPlatformCode(key, language)}: ${amount}`)
    .join(" · ");
}
