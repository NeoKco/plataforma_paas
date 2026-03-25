import { useEffect, useMemo, useState } from "react";
import { MetricCard } from "../../../../components/common/MetricCard";
import { PageHeader } from "../../../../components/common/PageHeader";
import { PanelCard } from "../../../../components/common/PanelCard";
import { StatusBadge } from "../../../../components/common/StatusBadge";
import { ErrorState } from "../../../../components/feedback/ErrorState";
import { EmptyState } from "../../../../components/feedback/EmptyState";
import { LoadingBlock } from "../../../../components/feedback/LoadingBlock";
import {
  getPlatformAuthAudit,
  getPlatformTenantPolicyActivity,
} from "../../../../services/platform-api";
import { useAuth } from "../../../../store/auth-context";
import { displayPlatformCode } from "../../../../utils/platform-labels";
import type {
  ApiError,
  PlatformAuthAuditEvent,
  PlatformTenantPolicyChangeEvent,
} from "../../../../types";

function formatAuditOutcome(value: string): string {
  if (value === "success") {
    return "completed";
  }
  if (value === "denied") {
    return "blocked";
  }
  if (value === "failed") {
    return "failed";
  }
  return value;
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return "n/a";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function PlatformActivityPage() {
  const { session } = useAuth();
  const [events, setEvents] = useState<PlatformAuthAuditEvent[]>([]);
  const [tenantChanges, setTenantChanges] = useState<PlatformTenantPolicyChangeEvent[]>([]);
  const [search, setSearch] = useState("");
  const [scopeFilter, setScopeFilter] = useState("");
  const [outcomeFilter, setOutcomeFilter] = useState("");
  const [limit, setLimit] = useState(25);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  const overview = useMemo(() => {
    const successCount = events.filter((item) => item.outcome === "success").length;
    const failedCount = events.filter((item) => item.outcome === "failed").length;
    const deniedCount = events.filter((item) => item.outcome === "denied").length;
    const tenantScopeCount = events.filter((item) => item.subject_scope === "tenant").length;
    const tenantChangeCount = tenantChanges.length;
    return {
      total: events.length,
      successCount,
      failedCount,
      deniedCount,
      tenantScopeCount,
      tenantChangeCount,
    };
  }, [events, tenantChanges]);

  useEffect(() => {
    if (!session?.accessToken) {
      return;
    }

    void loadActivity();
  }, [session?.accessToken]);

  async function loadActivity() {
    if (!session?.accessToken) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [auditResponse, tenantPolicyResponse] = await Promise.all([
        getPlatformAuthAudit(session.accessToken, {
          limit,
          subject_scope: scopeFilter || undefined,
          outcome: outcomeFilter || undefined,
          search: search.trim() || undefined,
        }),
        getPlatformTenantPolicyActivity(session.accessToken, {
          search: search.trim() || undefined,
          limit,
        }),
      ]);
      setEvents(auditResponse.data);
      setTenantChanges(tenantPolicyResponse.data);
    } catch (rawError) {
      setError(rawError as ApiError);
      setEvents([]);
      setTenantChanges([]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="d-grid gap-4">
      <PageHeader
        eyebrow="Plataforma"
        title="Actividad"
        description="Auditoría breve de accesos y rechazos recientes para no depender solo de logs o memoria operativa."
      />

      {isLoading ? <LoadingBlock label="Cargando actividad reciente..." /> : null}
      {error ? (
        <ErrorState
          title="Falló la actividad de plataforma"
          detail={error.payload?.detail || error.message}
          requestId={error.payload?.request_id}
        />
      ) : null}

      {!isLoading ? (
        <>
          <div className="dashboard-overview-grid">
            <MetricCard label="Eventos visibles" value={overview.total} />
            <MetricCard label="Ingresos correctos" value={overview.successCount} />
            <MetricCard label="Ingresos fallidos" value={overview.failedCount} />
            <MetricCard label="Accesos denegados" value={overview.deniedCount} />
            <MetricCard
              label="Eventos tenant"
              value={overview.tenantScopeCount}
              hint="Incluye logins y refresh del portal tenant."
            />
            <MetricCard
              label="Cambios tenant"
              value={overview.tenantChangeCount}
              hint="Mutaciones recientes de estado, billing, límites o mantenimiento."
            />
          </div>

          <PanelCard
            title="Filtros de actividad"
            subtitle="Mira accesos recientes, rechazos y eventos tenant o platform con el mismo set de filtros."
          >
            <div className="tenant-catalog-filters">
              <input
                className="form-control"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por email, detalle, tenant o tipo de evento"
              />
              <div className="tenant-inline-form-grid">
                <select
                  className="form-select"
                  value={scopeFilter}
                  onChange={(event) => setScopeFilter(event.target.value)}
                >
                  <option value="">Todos los scopes</option>
                  <option value="platform">platform</option>
                  <option value="tenant">tenant</option>
                </select>
                <select
                  className="form-select"
                  value={outcomeFilter}
                  onChange={(event) => setOutcomeFilter(event.target.value)}
                >
                  <option value="">Todos los resultados</option>
                  <option value="success">correctos</option>
                  <option value="failed">fallidos</option>
                  <option value="denied">denegados</option>
                </select>
              </div>
              <div className="tenant-inline-form-grid">
                <input
                  className="form-control"
                  type="number"
                  min={1}
                  max={100}
                  value={limit}
                  onChange={(event) => setLimit(Number(event.target.value) || 25)}
                />
                <button className="btn btn-primary" type="button" onClick={() => void loadActivity()}>
                  Recargar datos
                </button>
              </div>
            </div>
          </PanelCard>

          <PanelCard
            title="Actividad reciente"
            subtitle="Eventos más recientes de autenticación para platform y tenant."
          >
            {events.length === 0 ? (
              <div className="text-secondary">
                No hay actividad que coincida con los filtros actuales.
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table align-middle">
                  <thead>
                    <tr>
                      <th>Registrado</th>
                      <th>Scope</th>
                      <th>Evento</th>
                      <th>Resultado</th>
                      <th>Email</th>
                      <th>Tenant</th>
                      <th>Detalle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((item) => (
                      <tr key={item.id}>
                        <td>{formatDateTime(item.created_at)}</td>
                        <td>{displayPlatformCode(item.subject_scope)}</td>
                        <td>
                          <code>{item.event_type}</code>
                        </td>
                        <td>
                          <StatusBadge value={formatAuditOutcome(item.outcome)} />
                        </td>
                        <td>{item.email || "n/a"}</td>
                        <td>{item.tenant_slug || "n/a"}</td>
                        <td>{item.detail || "n/a"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </PanelCard>

          <PanelCard
            title="Cambios administrativos recientes"
            subtitle="Historial corto de mutaciones sobre tenants para no depender de entrar a cada detalle por separado."
          >
            {tenantChanges.length === 0 ? (
              <EmptyState
                title="No hay cambios administrativos recientes"
                detail="Con el filtro actual no aparecen mutaciones recientes sobre tenants."
              />
            ) : (
              <div className="table-responsive">
                <table className="table align-middle">
                  <thead>
                    <tr>
                      <th>Registrado</th>
                      <th>Tenant</th>
                      <th>Evento</th>
                      <th>Actor</th>
                      <th>Rol</th>
                      <th>Campos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tenantChanges.map((item) => (
                      <tr key={item.id}>
                        <td>{formatDateTime(item.recorded_at)}</td>
                        <td>{item.tenant_slug}</td>
                        <td>{displayPlatformCode(item.event_type)}</td>
                        <td>{item.actor_email || "n/a"}</td>
                        <td>{item.actor_role ? displayPlatformCode(item.actor_role) : "n/a"}</td>
                        <td>{item.changed_fields.length > 0 ? item.changed_fields.join(", ") : "n/a"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </PanelCard>
        </>
      ) : null}
    </div>
  );
}
