import { useEffect, useMemo, useState } from "react";
import { MetricCard } from "../../../../components/common/MetricCard";
import { PageHeader } from "../../../../components/common/PageHeader";
import { PanelCard } from "../../../../components/common/PanelCard";
import { StatusBadge } from "../../../../components/common/StatusBadge";
import { AppFilterGrid, AppTableWrap, AppToolbar } from "../../../../design-system/AppLayout";
import { ErrorState } from "../../../../components/feedback/ErrorState";
import { EmptyState } from "../../../../components/feedback/EmptyState";
import { LoadingBlock } from "../../../../components/feedback/LoadingBlock";
import {
  getPlatformAuthAudit,
  getPlatformCapabilities,
  getPlatformTenantPolicyActivity,
} from "../../../../services/platform-api";
import { useAuth } from "../../../../store/auth-context";
import { useLanguage } from "../../../../store/language-context";
import { getCurrentLocale } from "../../../../utils/i18n";
import { displayPlatformCode, getUiCatalogLabel } from "../../../../utils/platform-labels";
import type {
  ApiError,
  PlatformAuthAuditEvent,
  PlatformCapabilities,
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

function formatDateTime(value: string | null, language: "es" | "en"): string {
  if (!value) {
    return "n/a";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString(getCurrentLocale(language), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function PlatformActivityPage() {
  const { session } = useAuth();
  const { language } = useLanguage();
  const [capabilities, setCapabilities] = useState<PlatformCapabilities | null>(null);
  const [events, setEvents] = useState<PlatformAuthAuditEvent[]>([]);
  const [tenantChanges, setTenantChanges] = useState<PlatformTenantPolicyChangeEvent[]>([]);
  const [search, setSearch] = useState("");
  const [scopeFilter, setScopeFilter] = useState("");
  const [outcomeFilter, setOutcomeFilter] = useState("");
  const [eventTypeFilter, setEventTypeFilter] = useState("");
  const [tenantSlugFilter, setTenantSlugFilter] = useState("");
  const [requestIdFilter, setRequestIdFilter] = useState("");
  const [tenantChangeTypeFilter, setTenantChangeTypeFilter] = useState("");
  const [actorEmailFilter, setActorEmailFilter] = useState("");
  const [limit, setLimit] = useState(25);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const uiLabelCatalog = capabilities?.ui_label_catalog || null;

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

  const operationalSignals = useMemo(() => {
    const signals: Array<{
      key: string;
      title: string;
      detail: string;
    }> = [];

    if (overview.failedCount > 0) {
      signals.push({
        key: "failed-logins",
        title:
          language === "es"
            ? `${overview.failedCount} ingresos fallidos visibles`
            : `${overview.failedCount} visible failed sign-ins`,
        detail:
          language === "es"
            ? "Revisa si se concentran en un mismo correo, tenant o flujo de acceso. Puede ser un problema de credenciales, sesión vencida o fricción en UX."
            : "Check whether they concentrate on the same email, tenant or access flow. It may be a credentials issue, an expired session or UX friction.",
      });
    }

    if (overview.deniedCount > 0) {
      signals.push({
        key: "denied-access",
        title:
          language === "es"
            ? `${overview.deniedCount} accesos denegados`
            : `${overview.deniedCount} denied accesses`,
        detail:
          language === "es"
            ? "Esto suele apuntar a permisos, guards de ruta o intentos de navegar fuera del rol permitido. Conviene revisar el detalle del evento."
            : "This usually points to permissions, route guards or attempts to navigate outside the allowed role. Review the event detail.",
      });
    }

    const latestTenantChange = tenantChanges[0];
    if (latestTenantChange) {
      signals.push({
        key: "tenant-change",
        title:
          language === "es"
            ? `Último cambio tenant: ${getUiCatalogLabel(uiLabelCatalog, "policy_event_types", latestTenantChange.event_type, language)}`
            : `Latest tenant change: ${getUiCatalogLabel(uiLabelCatalog, "policy_event_types", latestTenantChange.event_type, language)}`,
        detail:
          language === "es"
            ? `Se registró sobre ${latestTenantChange.tenant_slug} por ${latestTenantChange.actor_email || "actor no identificado"}. Úsalo para correlacionar soporte con mutaciones recientes.`
            : `Recorded on ${latestTenantChange.tenant_slug} by ${latestTenantChange.actor_email || "unknown actor"}. Use it to correlate support work with recent mutations.`,
      });
    }

    const rootRecoveryEvents = events.filter(
      (item) => item.event_type === "platform.root_recovery"
    );
    if (rootRecoveryEvents.length > 0) {
      signals.push({
        key: "root-recovery",
        title:
          language === "es"
            ? `${rootRecoveryEvents.length} eventos de recuperación raíz visibles`
            : `${rootRecoveryEvents.length} visible root recovery events`,
        detail:
          language === "es"
            ? "Esto no es tráfico normal de operación. Si aparece, revisa resultado y contexto de la cuenta raíz antes de seguir con otras hipótesis."
            : "This is not normal operational traffic. If it appears, review the result and context of the root account before pursuing other hypotheses.",
      });
    }

    return signals;
  }, [events, language, overview.deniedCount, overview.failedCount, tenantChanges, uiLabelCatalog]);

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
      const [capabilitiesResponse, auditResponse, tenantPolicyResponse] = await Promise.all([
        getPlatformCapabilities(session.accessToken),
        getPlatformAuthAudit(session.accessToken, {
          limit,
          subject_scope: scopeFilter || undefined,
          outcome: outcomeFilter || undefined,
          event_type: eventTypeFilter.trim() || undefined,
          tenant_slug: tenantSlugFilter.trim() || undefined,
          request_id: requestIdFilter.trim() || undefined,
          search: search.trim() || undefined,
        }),
        getPlatformTenantPolicyActivity(session.accessToken, {
          eventType: tenantChangeTypeFilter || undefined,
          tenantSlug: tenantSlugFilter.trim() || undefined,
          actorEmail: actorEmailFilter.trim() || undefined,
          search: search.trim() || undefined,
          limit,
        }),
      ]);
      setCapabilities(capabilitiesResponse);
      setEvents(auditResponse.data);
      setTenantChanges(tenantPolicyResponse.data);
    } catch (rawError) {
      setError(rawError as ApiError);
      setCapabilities(null);
      setEvents([]);
      setTenantChanges([]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="d-grid gap-4">
      <PageHeader
        eyebrow={language === "es" ? "Plataforma" : "Platform"}
        title={language === "es" ? "Actividad" : "Activity"}
        description={
          language === "es"
            ? "Auditoría breve de accesos y rechazos recientes para no depender solo de logs o memoria operativa."
            : "Compact audit of recent accesses, denials and administrative requests so operations does not depend only on logs or memory."
        }
        icon="activity"
        actions={
          <AppToolbar compact>
            <button className="btn btn-outline-primary" type="button" onClick={() => void loadActivity()}>
              {language === "es" ? "Recargar datos" : "Reload data"}
            </button>
          </AppToolbar>
        }
      />

      {isLoading ? (
        <LoadingBlock
          label={language === "es" ? "Cargando actividad reciente..." : "Loading recent activity..."}
        />
      ) : null}
      {error ? (
        <ErrorState
          title={
            language === "es"
              ? "Falló la actividad de plataforma"
              : "Platform activity failed"
          }
          detail={error.payload?.detail || error.message}
          requestId={error.payload?.request_id}
        />
      ) : null}

      {!isLoading ? (
        <>
          <div className="dashboard-overview-grid">
            <MetricCard
              label={language === "es" ? "Eventos visibles" : "Visible events"}
              icon="activity"
              tone="default"
              value={overview.total}
            />
            <MetricCard
              label={language === "es" ? "Ingresos correctos" : "Successful sign-ins"}
              icon="overview"
              tone="success"
              value={overview.successCount}
            />
            <MetricCard
              label={language === "es" ? "Ingresos fallidos" : "Failed sign-ins"}
              icon="focus"
              tone="danger"
              value={overview.failedCount}
            />
            <MetricCard
              label={language === "es" ? "Accesos denegados" : "Denied accesses"}
              icon="settings"
              tone="warning"
              value={overview.deniedCount}
            />
            <MetricCard
              label={language === "es" ? "Eventos tenant" : "Tenant events"}
              icon="tenants"
              tone="info"
              value={overview.tenantScopeCount}
              hint={
                language === "es"
                  ? "Incluye logins y refresh del portal tenant."
                  : "Includes tenant portal logins and refresh events."
              }
            />
            <MetricCard
              label={language === "es" ? "Cambios tenant" : "Tenant changes"}
              icon="tenant-history"
              tone="info"
              value={overview.tenantChangeCount}
              hint={
                language === "es"
                  ? "Mutaciones recientes de estado, billing, límites o mantenimiento."
                  : "Recent changes in status, billing, limits or maintenance."
              }
            />
          </div>

          <PanelCard
            icon="focus"
            title={language === "es" ? "Qué revisar ahora" : "What to review now"}
            subtitle={
              language === "es"
                ? "Lectura operativa breve para separar ruido normal de una señal que ya requiere intervención."
                : "Brief operational read to separate normal noise from a signal that already requires intervention."
            }
          >
            {operationalSignals.length === 0 ? (
              <EmptyState
                title={
                  language === "es"
                    ? "No hay señales operativas abiertas"
                    : "There are no open operational signals"
                }
                detail={
                  language === "es"
                    ? "No se ven fallos, denegaciones ni cambios tenant recientes que requieran seguimiento inmediato."
                    : "No failures, denials or recent tenant changes appear to require immediate follow-up."
                }
              />
            ) : (
              <div className="dashboard-quick-hints mt-0">
                {operationalSignals.map((signal) => (
                  <div key={signal.key}>
                    <strong>{signal.title}.</strong> {signal.detail}
                  </div>
                ))}
              </div>
            )}
          </PanelCard>

          <PanelCard
            icon="catalogs"
            title={language === "es" ? "Filtros de actividad" : "Activity filters"}
            subtitle={
              language === "es"
                ? "Cruza accesos, rechazos, request IDs y cambios tenant sin salir de la misma vista."
                : "Cross-check accesses, denials, request IDs and tenant changes without leaving the same view."
            }
          >
            <AppFilterGrid className="tenant-catalog-filters">
              <input
                className="form-control"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={
                  language === "es"
                    ? "Buscar por email, detalle, tenant o tipo de evento"
                    : "Search by email, detail, tenant or event type"
                }
              />
              <input
                className="form-control"
                value={eventTypeFilter}
                onChange={(event) => setEventTypeFilter(event.target.value)}
                placeholder={
                  language === "es"
                    ? "Tipo de evento auth/audit"
                    : "Auth/audit event type"
                }
              />
              <select
                className="form-select"
                value={scopeFilter}
                onChange={(event) => setScopeFilter(event.target.value)}
              >
                <option value="">{language === "es" ? "Todos los scopes" : "All scopes"}</option>
                <option value="platform">
                  {getUiCatalogLabel(uiLabelCatalog, "subject_scopes", "platform", language)}
                </option>
                <option value="tenant">
                  {getUiCatalogLabel(uiLabelCatalog, "subject_scopes", "tenant", language)}
                </option>
              </select>
              <select
                className="form-select"
                value={outcomeFilter}
                onChange={(event) => setOutcomeFilter(event.target.value)}
              >
                <option value="">{language === "es" ? "Todos los resultados" : "All outcomes"}</option>
                <option value="success">{language === "es" ? "correctos" : "successful"}</option>
                <option value="failed">{language === "es" ? "fallidos" : "failed"}</option>
                <option value="denied">{language === "es" ? "denegados" : "denied"}</option>
              </select>
              <input
                className="form-control"
                value={tenantSlugFilter}
                onChange={(event) => setTenantSlugFilter(event.target.value)}
                placeholder={language === "es" ? "Tenant slug" : "Tenant slug"}
              />
              <input
                className="form-control"
                value={requestIdFilter}
                onChange={(event) => setRequestIdFilter(event.target.value)}
                placeholder={language === "es" ? "Request ID" : "Request ID"}
              />
              <input
                className="form-control"
                value={tenantChangeTypeFilter}
                onChange={(event) => setTenantChangeTypeFilter(event.target.value)}
                placeholder={
                  language === "es"
                    ? "Tipo de cambio tenant (status, billing, restore...)"
                    : "Tenant change type (status, billing, restore...)"
                }
              />
              <input
                className="form-control"
                value={actorEmailFilter}
                onChange={(event) => setActorEmailFilter(event.target.value)}
                placeholder={language === "es" ? "Actor de cambio tenant" : "Tenant change actor"}
              />
              <input
                className="form-control"
                type="number"
                min={1}
                max={100}
                value={limit}
                onChange={(event) => setLimit(Number(event.target.value) || 25)}
              />
            </AppFilterGrid>
          </PanelCard>

          <PanelCard
            icon="activity"
            title={language === "es" ? "Actividad reciente" : "Recent activity"}
            subtitle={
              language === "es"
                ? "Eventos recientes de autenticación, rechazos y requests administrativas para platform y tenant."
                : "Recent authentication, denial and administrative request events for platform and tenant."
            }
          >
            {events.length === 0 ? (
              <div className="text-secondary">
                {language === "es"
                  ? "No hay actividad que coincida con los filtros actuales."
                  : "No activity matches the current filters."}
              </div>
            ) : (
              <AppTableWrap>
                <table className="table align-middle">
                  <thead>
                    <tr>
                      <th>{language === "es" ? "Registrado" : "Recorded"}</th>
                      <th>Scope</th>
                      <th>{language === "es" ? "Evento" : "Event"}</th>
                      <th>{language === "es" ? "Resultado" : "Outcome"}</th>
                      <th>Email</th>
                      <th>Tenant</th>
                      <th>{language === "es" ? "Request" : "Request"}</th>
                      <th>{language === "es" ? "Detalle" : "Detail"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((item) => (
                      <tr key={item.id}>
                        <td>{formatDateTime(item.created_at, language)}</td>
                        <td>{getUiCatalogLabel(uiLabelCatalog, "subject_scopes", item.subject_scope, language)}</td>
                        <td>
                          {getUiCatalogLabel(uiLabelCatalog, "auth_event_types", item.event_type, language)}
                        </td>
                        <td>
                          <StatusBadge value={formatAuditOutcome(item.outcome)} />
                        </td>
                        <td>{item.email || "n/a"}</td>
                        <td>{item.tenant_slug || "n/a"}</td>
                        <td>
                          <div className="small">
                            <div>{item.request_id || "n/a"}</div>
                            <div className="text-secondary">
                              {item.request_method || "?"} {item.request_path || "n/a"}
                            </div>
                          </div>
                        </td>
                        <td>{item.detail || "n/a"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </AppTableWrap>
            )}
          </PanelCard>

          <PanelCard
            icon="tenant-history"
            title={
              language === "es"
                ? "Cambios administrativos recientes"
                : "Recent administrative changes"
            }
            subtitle={
              language === "es"
                ? "Historial corto de mutaciones sobre tenants para no depender de entrar a cada detalle por separado."
                : "Short history of tenant mutations so you do not need to open each detail separately."
            }
          >
            {tenantChanges.length === 0 ? (
              <EmptyState
                title={
                  language === "es"
                    ? "No hay cambios administrativos recientes"
                    : "There are no recent administrative changes"
                }
                detail={
                  language === "es"
                    ? "Con el filtro actual no aparecen mutaciones recientes sobre tenants."
                    : "With the current filter, no recent tenant mutations appear."
                }
              />
            ) : (
              <AppTableWrap>
                <table className="table align-middle">
                  <thead>
                    <tr>
                      <th>{language === "es" ? "Registrado" : "Recorded"}</th>
                      <th>Tenant</th>
                      <th>{language === "es" ? "Evento" : "Event"}</th>
                      <th>{language === "es" ? "Actor" : "Actor"}</th>
                      <th>{language === "es" ? "Rol" : "Role"}</th>
                      <th>{language === "es" ? "Campos" : "Fields"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tenantChanges.map((item) => (
                      <tr key={item.id}>
                        <td>{formatDateTime(item.recorded_at, language)}</td>
                        <td>{item.tenant_slug}</td>
                        <td>{getUiCatalogLabel(uiLabelCatalog, "policy_event_types", item.event_type, language)}</td>
                        <td>{item.actor_email || "n/a"}</td>
                        <td>{item.actor_role ? displayPlatformCode(item.actor_role, language) : "n/a"}</td>
                        <td>
                          {item.changed_fields.length > 0
                            ? item.changed_fields
                                .map((value) =>
                                  getUiCatalogLabel(
                                    uiLabelCatalog,
                                    "policy_changed_fields",
                                    value,
                                    language
                                  )
                                )
                                .join(", ")
                            : "n/a"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </AppTableWrap>
            )}
          </PanelCard>
        </>
      ) : null}
    </div>
  );
}
