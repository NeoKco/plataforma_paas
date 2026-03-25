import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { MetricCard } from "../../../../components/common/MetricCard";
import { PageHeader } from "../../../../components/common/PageHeader";
import { PanelCard } from "../../../../components/common/PanelCard";
import { DataTableCard } from "../../../../components/data-display/DataTableCard";
import { ErrorState } from "../../../../components/feedback/ErrorState";
import { LoadingBlock } from "../../../../components/feedback/LoadingBlock";
import {
  getPlatformCapabilities,
  getPlatformRootRecoveryStatus,
  listPlatformUsers,
} from "../../../../services/platform-api";
import { API_BASE_URL, getDefaultApiBaseUrl } from "../../../../services/api";
import { useAuth } from "../../../../store/auth-context";
import { displayPlatformCode } from "../../../../utils/platform-labels";
import type {
  ApiError,
  PlatformCapabilities,
  PlatformRootRecoveryStatusResponse,
  PlatformUser,
} from "../../../../types";

export function SettingsPage() {
  const { session } = useAuth();
  const [capabilities, setCapabilities] = useState<PlatformCapabilities | null>(null);
  const [platformUsers, setPlatformUsers] = useState<PlatformUser[]>([]);
  const [rootRecoveryStatus, setRootRecoveryStatus] =
    useState<PlatformRootRecoveryStatusResponse | null>(null);
  const [rootRecoveryStatusError, setRootRecoveryStatusError] = useState<ApiError | null>(
    null
  );
  const [error, setError] = useState<ApiError | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const overview = useMemo(() => {
    return {
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

  useEffect(() => {
    let isMounted = true;

    async function loadSettings() {
      if (!session?.accessToken) {
        return;
      }

      setIsLoading(true);
      setError(null);
      setRootRecoveryStatusError(null);

      try {
        const [capabilitiesResult, rootRecoveryResult, platformUsersResult] =
          await Promise.allSettled([
          getPlatformCapabilities(session.accessToken),
          getPlatformRootRecoveryStatus(session.accessToken),
          listPlatformUsers(session.accessToken),
        ]);
        if (isMounted) {
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

          if (
            capabilitiesResult.status === "rejected" &&
            platformUsersResult.status === "rejected"
          ) {
            throw capabilitiesResult.reason;
          }
        }
      } catch (rawError) {
        if (isMounted) {
          setError(rawError as ApiError);
          setCapabilities(null);
          setRootRecoveryStatus(null);
          setPlatformUsers([]);
          setRootRecoveryStatusError(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadSettings();

    return () => {
      isMounted = false;
    };
  }, [session?.accessToken]);

  return (
    <div className="d-grid gap-4">
      <PageHeader
        eyebrow="Plataforma"
        title="Configuración"
        description="Referencia rápida del entorno visible, la sesión actual y los catálogos que la consola consume desde backend."
      />

      {isLoading ? <LoadingBlock label="Cargando configuración de plataforma..." /> : null}
      {error ? (
        <ErrorState
          detail={error.payload?.detail || error.message}
          requestId={error.payload?.request_id}
        />
      ) : null}

      <div className="settings-overview-grid">
        <MetricCard
          label="Estados tenant"
          value={overview.tenantStatuses}
          hint="Opciones visibles de lifecycle disponibles en la API."
        />
        <MetricCard
          label="Estados de facturación"
          value={overview.billingStatuses}
          hint="Estados de billing que hoy entiende la consola."
        />
        <MetricCard
          label="Scopes de mantenimiento"
          value={overview.maintenanceScopes}
          hint="Ámbitos que se pueden restringir por mantenimiento."
        />
        <MetricCard
          label="Claves de límites"
          value={overview.moduleLimitKeys}
          hint="Claves de cuota y uso visibles para operación."
        />
        <MetricCard
          label="Proveedores de billing"
          value={overview.billingProviders}
          hint="Orígenes de eventos de facturación soportados."
        />
        <MetricCard
          label="Backends de despacho"
          value={overview.dispatchBackends}
          hint="Mecanismos de ejecución visibles para provisioning."
        />
      </div>

      <div className="settings-grid">
        <PanelCard
          title="Entorno y sesión actual"
          subtitle="Lectura rápida para validar con qué sesión y con qué dirección de API crees estar operando."
        >
          <div className="tenant-detail-grid">
            <DetailField
              label="API configurada"
              value={<code>{API_BASE_URL}</code>}
            />
            <DetailField
              label="API esperada en esta red"
              value={<code>{runtimeApiUrl}</code>}
            />
            <DetailField label="Email" value={session?.email || "n/a"} />
            <DetailField label="Nombre completo" value={session?.fullName || "n/a"} />
            <DetailField
              label="Rol"
              value={displayPlatformCode(session?.role || "n/a")}
            />
          </div>
          <div className="dashboard-quick-hints mt-0">
            <div>Si ambas URLs no coinciden, el backend puede estar bien pero esta pantalla seguirá mostrando una configuración vieja.</div>
            <div>La URL configurada viene de `VITE_API_BASE_URL`; la esperada se calcula con el host visible del navegador.</div>
          </div>
        </PanelCard>

        <PanelCard
          title="Reglas de trabajo de la consola"
          subtitle="Guías cortas para no romper el patrón backend-driven al seguir construyendo pantallas."
        >
          <div className="dashboard-quick-hints mt-0">
            <div>No hardcodees estados tenant, estados de facturación ni claves de límites si ya vienen por API.</div>
            <div>Usa `GET /platform/capabilities` como fuente de verdad para catálogos y opciones visibles.</div>
            <div>Deja la lógica de negocio en servicios y políticas backend; en React solo resuelve presentación y flujo.</div>
            <div>Antes de abrir otra pantalla, revisa si `Tenants`, `Provisioning`, `Billing` o `tenant_portal` ya cubren el caso.</div>
          </div>
        </PanelCard>

        <PanelCard
          title="Instalación y cuenta raíz"
          subtitle="Resumen operativo del ciclo de vida de la cuenta superadministradora y de la recuperación raíz."
        >
          <div className="tenant-detail-grid">
            <DetailField
              label="Plataforma instalada"
              value="sí"
            />
            <DetailField
              label="Superadministrador activo"
              value={
                rootRecoveryStatus
                  ? rootRecoveryStatus.has_active_superadmin
                    ? "sí"
                    : "no"
                  : "n/d"
              }
            />
            <DetailField
              label="Clave de recuperación"
              value={
                rootRecoveryStatus
                  ? rootRecoveryStatus.recovery_configured
                    ? "configurada"
                    : "no configurada"
                  : "n/d"
              }
            />
            <DetailField
              label="Recuperación disponible ahora"
              value={
                rootRecoveryStatus
                  ? rootRecoveryStatus.recovery_available
                    ? "sí"
                    : "no"
                  : "n/d"
              }
            />
          </div>
          {rootRecoveryStatusError ? (
            <div className="alert alert-warning mt-3 mb-0">
              No fue posible leer ahora el estado de recuperación raíz. El resto de la consola sí
              quedó cargado correctamente.
            </div>
          ) : null}
          <div className="dashboard-quick-hints mt-0">
            <div>La política vigente exige una sola cuenta `superadmin` activa para operar la plataforma.</div>
            <div>Si la recuperación aparece disponible, normalmente significa que ya no queda ningún `superadmin` activo y debes usar <Link to="/login/root-recovery">Recuperar cuenta raíz</Link>.</div>
            <div>La gobernanza normal de operadores se hace desde <Link to="/users">Usuarios de plataforma</Link>, no desde el flujo de recuperación.</div>
          </div>
        </PanelCard>

        <PanelCard
          title="Gobernanza de acceso"
          subtitle="Resumen corto de operadores de plataforma visibles hoy desde la consola."
        >
          <div className="tenant-detail-grid">
            <DetailField label="Usuarios totales" value={governance.totalUsers} />
            <DetailField label="Usuarios inactivos" value={governance.inactiveUsers} />
            <DetailField
              label="Superadministradores activos"
              value={governance.activeSuperadmins}
            />
            <DetailField label="Admins activos" value={governance.activeAdmins} />
            <DetailField label="Support activos" value={governance.activeSupport} />
          </div>
          {governance.activeSuperadmins !== 1 ? (
            <div className="alert alert-warning mt-3 mb-0">
              La política vigente espera exactamente un `superadmin` activo. Revisa
              <Link className="ms-1" to="/users">
                Usuarios de plataforma
              </Link>
              para normalizar el acceso.
            </div>
          ) : null}
          <div className="dashboard-quick-hints mt-3">
            <div>`superadmin` debe ser único y queda reservado para administración raíz.</div>
            <div>`admin` gobierna usuarios `support` y puede revisar `Actividad`.</div>
            <div>`support` debe mantenerse como operador acotado, no como cuenta raíz.</div>
          </div>
        </PanelCard>
      </div>

      {capabilities ? (
        <>
          <DataTableCard
            title="Catálogo de capacidades"
            subtitle="Claves y metadatos que el backend publica hoy para límites por módulo."
            rows={capabilities.module_limit_capabilities}
            columns={[
              {
                key: "key",
                header: "Clave",
                render: (row) => <code>{row.key}</code>,
              },
              {
                key: "module_name",
                header: "Módulo",
                render: (row) => row.module_name,
              },
              {
                key: "resource_name",
                header: "Recurso",
                render: (row) => row.resource_name,
              },
              {
                key: "period",
                header: "Período",
                render: (row) => displayPlatformCode(row.period || "none"),
              },
              {
                key: "description",
                header: "Descripción",
                render: (row) => row.description || "—",
              },
            ]}
          />

          <div className="settings-grid">
            <PanelCard title="Enumeraciones">
              <div className="settings-token-list">
                <SettingsTokenGroup
                  title="Estados tenant"
                  values={capabilities.tenant_statuses}
                />
                <SettingsTokenGroup
                  title="Estados de facturación"
                  values={capabilities.tenant_billing_statuses}
                />
                <SettingsTokenGroup
                  title="Scopes de mantenimiento"
                  values={capabilities.maintenance_scopes}
                />
                <SettingsTokenGroup
                  title="Resultados de sync billing"
                  values={capabilities.billing_sync_processing_results}
                />
              </div>
            </PanelCard>

            <PanelCard
              title="Alcance actual del frontend"
              subtitle="Lo que hoy ya puede operar un superadmin sin salir de la UI."
            >
              <div className="dashboard-quick-hints mt-0">
                <div>`Resumen`: KPIs y focos de atención operativa.</div>
                <div>`Tenants`: lifecycle, mantenimiento, facturación, plan, identidad de billing y límites.</div>
                <div>`Provisioning`: jobs, métricas, alertas y recuperación técnica.</div>
                <div>`Facturación`: resumen global, workspace tenant y reconcile de eventos persistidos.</div>
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
  values,
}: {
  title: string;
  values: string[];
}) {
  return (
    <div>
      <div className="tenant-detail__label">{title}</div>
      <div className="settings-token-chips">
        {values.map((value) => (
          <span key={value} className="tenant-chip">
            {displayPlatformCode(value)}
          </span>
        ))}
      </div>
    </div>
  );
}
