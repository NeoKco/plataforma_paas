import { useEffect, useMemo, useState } from "react";
import { MetricCard } from "../../../../components/common/MetricCard";
import { PageHeader } from "../../../../components/common/PageHeader";
import { PanelCard } from "../../../../components/common/PanelCard";
import { DataTableCard } from "../../../../components/data-display/DataTableCard";
import { ErrorState } from "../../../../components/feedback/ErrorState";
import { LoadingBlock } from "../../../../components/feedback/LoadingBlock";
import { getPlatformCapabilities } from "../../../../services/platform-api";
import { useAuth } from "../../../../store/auth-context";
import type { ApiError, PlatformCapabilities } from "../../../../types";

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() ||
  "http://127.0.0.1:8000";

export function SettingsPage() {
  const { session } = useAuth();
  const [capabilities, setCapabilities] = useState<PlatformCapabilities | null>(null);
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

  useEffect(() => {
    let isMounted = true;

    async function loadSettings() {
      if (!session?.accessToken) {
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await getPlatformCapabilities(session.accessToken);
        if (isMounted) {
          setCapabilities(response);
        }
      } catch (rawError) {
        if (isMounted) {
          setError(rawError as ApiError);
          setCapabilities(null);
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
        description="Referencia para operadores y developers sobre la sesión actual del frontend, el catálogo backend y la superficie de plataforma ya expuesta por la API."
      />

      {isLoading ? <LoadingBlock label="Cargando configuración de plataforma..." /> : null}
      {error ? (
        <ErrorState
          detail={error.payload?.detail || error.message}
          requestId={error.payload?.request_id}
        />
      ) : null}

      <div className="settings-overview-grid">
        <MetricCard label="Estados tenant" value={overview.tenantStatuses} />
        <MetricCard label="Estados de facturación" value={overview.billingStatuses} />
        <MetricCard label="Scopes de mantenimiento" value={overview.maintenanceScopes} />
        <MetricCard label="Claves de límites" value={overview.moduleLimitKeys} />
        <MetricCard label="Proveedores de billing" value={overview.billingProviders} />
        <MetricCard label="Backends de despacho" value={overview.dispatchBackends} />
      </div>

      <div className="settings-grid">
        <PanelCard
          title="Sesión actual"
          subtitle="El frontend sigue siendo backend-driven, pero este panel ayuda a verificar el contexto vivo del cliente."
        >
          <div className="tenant-detail-grid">
            <DetailField label="API base URL" value={<code>{API_BASE_URL}</code>} />
            <DetailField label="Email" value={session?.email || "n/a"} />
            <DetailField label="Nombre completo" value={session?.fullName || "n/a"} />
            <DetailField label="Rol" value={session?.role || "n/a"} />
          </div>
        </PanelCard>

        <PanelCard
          title="Reglas operativas del frontend"
          subtitle="Estas guías coinciden con las convenciones backend-driven ya documentadas para el equipo."
        >
          <div className="dashboard-quick-hints mt-0">
            <div>No hardcodees estados tenant, estados de facturación ni claves de límites.</div>
            <div>Prefiere `GET /platform/capabilities` como fuente de verdad para catálogos.</div>
            <div>Mantén las reglas de negocio en servicios y políticas backend, no en pantallas React.</div>
            <div>Usa las pantallas operativas para mutaciones y soporte antes de abrir nuevas slices.</div>
          </div>
        </PanelCard>
      </div>

      {capabilities ? (
        <>
          <DataTableCard
            title="Catálogo de capacidades"
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
                render: (row) => row.period,
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
              subtitle="Lo que ya es operable hoy mismo en la UI de administración."
            >
              <div className="dashboard-quick-hints mt-0">
                <div>`Resumen`: KPIs y focos ejecutivos</div>
                <div>`Tenants`: lifecycle, billing, plan, rate limits y límites por módulo</div>
                <div>`Provisioning`: jobs, métricas, alertas y recuperación por DLQ</div>
                <div>`Facturación`: resumen global, alertas y flujos de reconcile por tenant</div>
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
            {value}
          </span>
        ))}
      </div>
    </div>
  );
}
