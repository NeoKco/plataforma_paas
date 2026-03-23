import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { MetricCard } from "../../../../components/common/MetricCard";
import { PageHeader } from "../../../../components/common/PageHeader";
import { PanelCard } from "../../../../components/common/PanelCard";
import { StatusBadge } from "../../../../components/common/StatusBadge";
import { DataTableCard } from "../../../../components/data-display/DataTableCard";
import { EmptyState } from "../../../../components/feedback/EmptyState";
import { ErrorState } from "../../../../components/feedback/ErrorState";
import { LoadingBlock } from "../../../../components/feedback/LoadingBlock";
import {
  getPlatformBillingAlertHistory,
  getPlatformBillingAlerts,
  getPlatformBillingEventsSummary,
  getPlatformCapabilities,
  getTenantBillingEvents,
  getTenantBillingEventsSummary,
  listPlatformTenants,
  reconcileTenantBillingEvent,
  reconcileTenantBillingEventsBatch,
} from "../../../../services/platform-api";
import { useAuth } from "../../../../store/auth-context";
import {
  getPlatformActionFeedbackLabel,
  getPlatformActionSuccessMessage,
} from "../../../../utils/action-feedback";
import type {
  ApiError,
  PlatformBillingAlertHistoryResponse,
  PlatformBillingAlertsResponse,
  PlatformBillingSyncSummaryResponse,
  PlatformCapabilities,
  PlatformTenant,
  TenantBillingSyncHistoryResponse,
  TenantBillingSyncSummaryResponse,
} from "../../../../types";
import { displayPlatformCode } from "../../../../utils/platform-labels";

type ActionFeedback = {
  scope: string;
  type: "success" | "error";
  message: string;
};

export function BillingPage() {
  const { session } = useAuth();
  const [capabilities, setCapabilities] = useState<PlatformCapabilities | null>(null);
  const [tenants, setTenants] = useState<PlatformTenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<number | null>(null);

  const [platformSummary, setPlatformSummary] =
    useState<PlatformBillingSyncSummaryResponse | null>(null);
  const [platformAlerts, setPlatformAlerts] =
    useState<PlatformBillingAlertsResponse | null>(null);
  const [platformAlertHistory, setPlatformAlertHistory] =
    useState<PlatformBillingAlertHistoryResponse | null>(null);
  const [tenantEvents, setTenantEvents] =
    useState<TenantBillingSyncHistoryResponse | null>(null);
  const [tenantSummary, setTenantSummary] =
    useState<TenantBillingSyncSummaryResponse | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isTenantLoading, setIsTenantLoading] = useState(false);
  const [isActionSubmitting, setIsActionSubmitting] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<ActionFeedback | null>(null);

  const [platformError, setPlatformError] = useState<ApiError | null>(null);
  const [tenantError, setTenantError] = useState<ApiError | null>(null);

  const [providerFilter, setProviderFilter] = useState("");
  const [eventTypeFilter, setEventTypeFilter] = useState("");
  const [processingResultFilter, setProcessingResultFilter] = useState("");
  const [eventLimit, setEventLimit] = useState("20");
  const [batchLimit, setBatchLimit] = useState("10");

  const selectedTenant =
    tenants.find((tenant) => tenant.id === selectedTenantId) || null;

  const eventTypeOptions = useMemo(() => {
    const keys = new Set<string>();
    platformSummary?.data.forEach((row) => keys.add(row.event_type));
    tenantSummary?.data.forEach((row) => keys.add(row.event_type));
    tenantEvents?.data.forEach((row) => keys.add(row.event_type));
    platformAlerts?.data.forEach((row) => {
      if (row.event_type) {
        keys.add(row.event_type);
      }
    });
    return Array.from(keys).sort();
  }, [platformAlerts?.data, platformSummary?.data, tenantEvents?.data, tenantSummary?.data]);

  const overview = useMemo(() => {
    return {
      totalPlatformSummaryRows: platformSummary?.total_rows || 0,
      totalActiveAlerts: platformAlerts?.total_alerts || 0,
      totalAlertHistoryRows: platformAlertHistory?.total_alerts || 0,
      totalTenantEvents: tenantEvents?.total_events || 0,
      totalTenantSummaryRows: tenantSummary?.total_rows || 0,
    };
  }, [
    platformAlertHistory?.total_alerts,
    platformAlerts?.total_alerts,
    platformSummary?.total_rows,
    tenantEvents?.total_events,
    tenantSummary?.total_rows,
  ]);

  async function loadStaticContext() {
    if (!session?.accessToken) {
      return;
    }

    const [capabilitiesResponse, tenantsResponse] = await Promise.all([
      getPlatformCapabilities(session.accessToken),
      listPlatformTenants(session.accessToken),
    ]);

    setCapabilities(capabilitiesResponse);
    setTenants(tenantsResponse.data);
    setSelectedTenantId((current) => {
      if (tenantsResponse.data.length === 0) {
        return null;
      }
      if (current && tenantsResponse.data.some((tenant) => tenant.id === current)) {
        return current;
      }
      return tenantsResponse.data[0].id;
    });
  }

  async function loadPlatformWorkspace() {
    if (!session?.accessToken) {
      return;
    }

    const results = await Promise.allSettled([
      getPlatformBillingEventsSummary(session.accessToken, {
        provider: normalizeNullableString(providerFilter),
        eventType: normalizeNullableString(eventTypeFilter),
        processingResult: normalizeNullableString(processingResultFilter),
      }),
      getPlatformBillingAlerts(session.accessToken, {
        provider: normalizeNullableString(providerFilter),
        eventType: normalizeNullableString(eventTypeFilter),
      }),
      getPlatformBillingAlertHistory(session.accessToken, {
        limit: parsePositiveInteger(eventLimit, 20),
        provider: normalizeNullableString(providerFilter),
        eventType: normalizeNullableString(eventTypeFilter),
        processingResult: normalizeNullableString(processingResultFilter),
      }),
    ]);

    const [summaryResult, alertsResult, historyResult] = results;

    if (
      summaryResult.status === "rejected" &&
      alertsResult.status === "rejected" &&
      historyResult.status === "rejected"
    ) {
      setPlatformError(summaryResult.reason as ApiError);
      setPlatformSummary(null);
      setPlatformAlerts(null);
      setPlatformAlertHistory(null);
      return;
    }

    setPlatformError(null);

    if (summaryResult.status === "fulfilled") {
      setPlatformSummary(summaryResult.value);
    } else {
      setPlatformSummary(null);
    }

    if (alertsResult.status === "fulfilled") {
      setPlatformAlerts(alertsResult.value);
    } else {
      setPlatformAlerts(null);
    }

    if (historyResult.status === "fulfilled") {
      setPlatformAlertHistory(historyResult.value);
    } else {
      setPlatformAlertHistory(null);
    }
  }

  async function loadTenantWorkspace(tenantId: number) {
    if (!session?.accessToken) {
      return;
    }

    setIsTenantLoading(true);

    const results = await Promise.allSettled([
      getTenantBillingEvents(session.accessToken, tenantId, {
        provider: normalizeNullableString(providerFilter),
        eventType: normalizeNullableString(eventTypeFilter),
        processingResult: normalizeNullableString(processingResultFilter),
        limit: parsePositiveInteger(eventLimit, 20),
      }),
      getTenantBillingEventsSummary(session.accessToken, tenantId, {
        provider: normalizeNullableString(providerFilter),
        eventType: normalizeNullableString(eventTypeFilter),
        processingResult: normalizeNullableString(processingResultFilter),
      }),
    ]);

    const [eventsResult, summaryResult] = results;

    if (eventsResult.status === "rejected" && summaryResult.status === "rejected") {
      setTenantError(eventsResult.reason as ApiError);
      setTenantEvents(null);
      setTenantSummary(null);
      setIsTenantLoading(false);
      return;
    }

    setTenantError(null);

    if (eventsResult.status === "fulfilled") {
      setTenantEvents(eventsResult.value);
    } else {
      setTenantEvents(null);
    }

    if (summaryResult.status === "fulfilled") {
      setTenantSummary(summaryResult.value);
    } else {
      setTenantSummary(null);
    }

    setIsTenantLoading(false);
  }

  async function loadBillingWorkspace() {
    if (!session?.accessToken) {
      return;
    }

    setIsLoading(true);
    setPlatformError(null);
    setTenantError(null);

    try {
      await loadStaticContext();
      await loadPlatformWorkspace();
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (!session?.accessToken) {
      return;
    }
    void loadBillingWorkspace();
  }, [session?.accessToken]);

  useEffect(() => {
    if (!session?.accessToken || selectedTenantId === null) {
      setTenantEvents(null);
      setTenantSummary(null);
      return;
    }
    void loadTenantWorkspace(selectedTenantId);
  }, [selectedTenantId, session?.accessToken]);

  async function refreshAll() {
    await loadPlatformWorkspace();
    if (selectedTenantId !== null) {
      await loadTenantWorkspace(selectedTenantId);
    }
  }

  async function runAction(
    scope: string,
    action: () => Promise<{ message?: string }>
  ) {
    setIsActionSubmitting(true);
    setActionFeedback(null);

    try {
      const result = await action();
      await refreshAll();
      setActionFeedback({
        scope,
        type: "success",
        message: getPlatformActionSuccessMessage(
          scope,
          result.message || "La acción de facturación se completó correctamente."
        ),
      });
    } catch (rawError) {
      const typedError = rawError as ApiError;
      setActionFeedback({
        scope,
        type: "error",
        message: typedError.payload?.detail || typedError.message,
      });
    } finally {
      setIsActionSubmitting(false);
    }
  }

  function handleFilterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void refreshAll();
  }

  function handleSingleReconcile(syncEventId: number) {
    if (!session?.accessToken || selectedTenantId === null) {
      return;
    }

    void runAction(`reconcile-${syncEventId}`, () =>
      reconcileTenantBillingEvent(session.accessToken, selectedTenantId, syncEventId)
    );
  }

  function handleBatchReconcile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.accessToken || selectedTenantId === null) {
      return;
    }

    void runAction("reconcile-batch", () =>
      reconcileTenantBillingEventsBatch(session.accessToken, selectedTenantId, {
        provider: normalizeNullableString(providerFilter),
        eventType: normalizeNullableString(eventTypeFilter),
        processingResult: normalizeNullableString(processingResultFilter),
        limit: parsePositiveInteger(batchLimit, 10),
      })
    );
  }

  return (
    <div className="d-grid gap-4">
      <PageHeader
        eyebrow="Plataforma"
        title="Facturación"
        description="Monitoreo global y flujos de reconcile por tenant para eventos de sync billing ya persistidos por backend."
        actions={
          <button
            type="button"
            className="btn btn-outline-primary"
            onClick={() => void refreshAll()}
            disabled={isLoading || isActionSubmitting}
          >
            Recargar datos
          </button>
        }
      />

      {actionFeedback ? (
        <div
          className={`tenant-action-feedback tenant-action-feedback--${actionFeedback.type}`}
        >
          <strong>{getPlatformActionFeedbackLabel(actionFeedback.scope)}:</strong>{" "}
          {actionFeedback.message}
        </div>
      ) : null}

      {isLoading ? <LoadingBlock label="Cargando operación de facturación..." /> : null}

      <div className="billing-overview-grid">
        <MetricCard label="Filas resumen global" value={overview.totalPlatformSummaryRows} />
        <MetricCard label="Alertas activas" value={overview.totalActiveAlerts} />
        <MetricCard label="Filas historial alertas" value={overview.totalAlertHistoryRows} />
        <MetricCard label="Eventos tenant" value={overview.totalTenantEvents} />
        <MetricCard label="Filas resumen tenant" value={overview.totalTenantSummaryRows} />
      </div>

      <PanelCard
        title="Filtros de facturación"
        subtitle="El mismo set de filtros alimenta el resumen global, las alertas activas y el workspace del tenant seleccionado."
      >
        <form className="billing-filter-grid" onSubmit={handleFilterSubmit}>
          <div>
            <label className="form-label">Tenant</label>
            <select
              className="form-select"
              value={selectedTenantId ?? ""}
              onChange={(event) =>
                setSelectedTenantId(
                  event.target.value ? Number.parseInt(event.target.value, 10) : null
                )
              }
            >
              <option value="">Ningún tenant seleccionado</option>
              {tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.name} ({tenant.slug})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">Proveedor</label>
            <select
              className="form-select"
              value={providerFilter}
              onChange={(event) => setProviderFilter(event.target.value)}
            >
              <option value="">todos</option>
              {(capabilities?.billing_providers || []).map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">Resultado de procesamiento</label>
            <select
              className="form-select"
              value={processingResultFilter}
              onChange={(event) => setProcessingResultFilter(event.target.value)}
            >
              <option value="">todos</option>
              {(capabilities?.billing_sync_processing_results || []).map((value) => (
                <option key={value} value={value}>
                  {displayPlatformCode(value)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">Tipo de evento</label>
            <input
              className="form-control"
              list="billing-event-type-options"
              value={eventTypeFilter}
              onChange={(event) => setEventTypeFilter(event.target.value)}
            />
            <datalist id="billing-event-type-options">
              {eventTypeOptions.map((value) => (
                <option key={value} value={value} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="form-label">Límite historial</label>
            <input
              className="form-control"
              type="number"
              min="1"
              value={eventLimit}
              onChange={(event) => setEventLimit(event.target.value)}
            />
          </div>
          <div className="billing-filter-actions">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading || isActionSubmitting}
            >
              Aplicar filtros
            </button>
          </div>
        </form>
      </PanelCard>

      {platformError ? (
        <ErrorState
          title="Datos de facturación de plataforma no disponibles"
          detail={platformError.payload?.detail || platformError.message}
          requestId={platformError.payload?.request_id}
        />
      ) : null}

      {!platformError && platformSummary ? (
        <div className="billing-data-grid">
          <DataTableCard
            title="Resumen global de facturación"
            rows={platformSummary.data}
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
              {
                key: "last_recorded_at",
                header: "Última vez visto",
                render: (row) => formatDateTime(row.last_recorded_at),
              },
            ]}
          />

          {platformAlerts ? (
            platformAlerts.data.length > 0 ? (
              <DataTableCard
                title="Alertas activas de facturación"
                rows={platformAlerts.data}
                columns={[
                  {
                    key: "severity",
                    header: "Severidad",
                    render: (row) => <SeverityBadge value={row.severity} />,
                  },
                  {
                    key: "alert_code",
                    header: "Alerta",
                    render: (row) => <code>{row.alert_code}</code>,
                  },
                  {
                    key: "provider",
                    header: "Proveedor",
                    render: (row) => row.provider,
                  },
                  {
                    key: "processing_result",
                    header: "Resultado",
                    render: (row) =>
                      row.processing_result
                        ? displayPlatformCode(row.processing_result)
                        : "—",
                  },
                  {
                    key: "total_tenants",
                    header: "Tenants",
                    render: (row) => row.total_tenants,
                  },
                  {
                    key: "message",
                    header: "Mensaje",
                    render: (row) => row.message,
                  },
                ]}
              />
            ) : (
              <PanelCard
                title="Alertas activas de facturación"
                subtitle="No hay alertas activas de facturación que coincidan con el set actual de filtros."
              >
                <EmptyState
                  title="No hay alertas activas para este filtro"
                  detail="La sincronización de billing está tranquila y no hay señales operativas abiertas en este momento."
                />
              </PanelCard>
            )
          ) : null}
        </div>
      ) : null}

      {!platformError && platformAlertHistory ? (
        platformAlertHistory.data.length > 0 ? (
          <DataTableCard
            title="Historial de alertas de facturación"
            rows={platformAlertHistory.data}
            columns={[
              {
                key: "recorded_at",
                header: "Registrado en",
                render: (row) => formatDateTime(row.recorded_at),
              },
              {
                key: "severity",
                header: "Severidad",
                render: (row) => <SeverityBadge value={row.severity} />,
              },
              {
                key: "alert_code",
                header: "Alerta",
                render: (row) => <code>{row.alert_code}</code>,
              },
              {
                key: "provider",
                header: "Proveedor",
                render: (row) => row.provider,
              },
              {
                    key: "processing_result",
                    header: "Resultado",
                    render: (row) =>
                      row.processing_result
                        ? displayPlatformCode(row.processing_result)
                        : "—",
              },
              {
                key: "message",
                header: "Mensaje",
                render: (row) => row.message,
              },
            ]}
          />
        ) : null
      ) : null}

      {selectedTenant ? (
        <>
          {tenantError ? (
            <ErrorState
              title="Espacio tenant de billing no disponible"
              detail={tenantError.payload?.detail || tenantError.message}
              requestId={tenantError.payload?.request_id}
            />
          ) : null}

          <PanelCard
            title={`Espacio tenant de billing: ${selectedTenant.name}`}
            subtitle="Historial de eventos y reconciliación sobre el stream persistido de billing sync."
          >
            <div className="tenant-detail-grid">
              <DetailField label="Tenant" value={selectedTenant.name} />
              <DetailField label="Slug" value={<code>{selectedTenant.slug}</code>} />
              <DetailField
                label="Ciclo de vida"
                value={<StatusBadge value={selectedTenant.status} />}
              />
              <DetailField
                label="Facturación"
                value={
                  <StatusBadge value={selectedTenant.billing_status || "unknown"} />
                }
              />
            </div>
          </PanelCard>

          {isTenantLoading ? <LoadingBlock label="Cargando datos de billing tenant..." /> : null}

          {!tenantError && tenantSummary ? (
            <div className="billing-data-grid">
              <DataTableCard
                title="Resumen billing tenant"
                rows={tenantSummary.data}
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
                    key: "last_recorded_at",
                    header: "Última vez visto",
                    render: (row) => formatDateTime(row.last_recorded_at),
                  },
                ]}
              />

              <form className="tenant-action-form" onSubmit={handleBatchReconcile}>
                <h3 className="tenant-action-form__title">Reconcile en lote</h3>
                <label className="form-label">Límite</label>
                <input
                  className="form-control"
                  type="number"
                  min="1"
                  value={batchLimit}
                  onChange={(event) => setBatchLimit(event.target.value)}
                />
                <p className="tenant-help-text mt-3">
                  Reconciliar eventos recientes persistidos usando el set actual de filtros del tenant.
                </p>
                <button
                  type="submit"
                  className="btn btn-primary mt-3"
                  disabled={isActionSubmitting}
                >
                  Reconciliar eventos filtrados
                </button>
              </form>
            </div>
          ) : null}

          {!tenantError && tenantEvents ? (
            tenantEvents.data.length > 0 ? (
              <DataTableCard
                title="Eventos billing tenant"
                rows={tenantEvents.data}
                columns={[
                  {
                    key: "recorded_at",
                    header: "Registrado en",
                    render: (row) => formatDateTime(row.recorded_at),
                  },
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
                    key: "billing_status",
                    header: "Estado billing",
                    render: (row) =>
                      row.billing_status ? displayPlatformCode(row.billing_status) : "—",
                  },
                  {
                    key: "actions",
                    header: "Acciones",
                    render: (row) => (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => handleSingleReconcile(row.id)}
                        disabled={isActionSubmitting}
                      >
                        Reconciliar
                      </button>
                    ),
                  },
                ]}
              />
            ) : (
              <PanelCard
                title="Eventos billing tenant"
                subtitle="Ningún evento persistido coincide con el set actual de filtros del tenant."
              >
                <EmptyState
                  title="No hay eventos para este tenant con el filtro actual"
                  detail="Puedes ampliar el período o limpiar filtros para recuperar más historial de billing sync."
                />
              </PanelCard>
            )
          ) : null}
        </>
      ) : (
        <PanelCard
          title="Espacio tenant de billing"
          subtitle="Selecciona un tenant desde la barra de filtros para inspeccionar historial de sync y ejecutar acciones de reconcile."
        >
          <EmptyState
            title="Todavía no elegiste un tenant"
            detail="Las tarjetas globales siguen visibles, pero el detalle de eventos y reconcile necesita un tenant seleccionado."
          />
        </PanelCard>
      )}
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

function SeverityBadge({ value }: { value: string }) {
  const normalized = value.trim().toLowerCase();
  const className =
    normalized === "critical" || normalized === "error"
      ? "status-badge status-badge--danger"
      : normalized === "warning"
        ? "status-badge status-badge--warning"
        : "status-badge status-badge--info";
  return <span className={className}>{normalized}</span>;
}

function normalizeNullableString(value: string): string | null {
  const normalized = value.trim();
  return normalized ? normalized : null;
}

function parsePositiveInteger(value: string, fallback: number): number {
  const parsed = Number.parseInt(value.trim(), 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return "—";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString();
}
