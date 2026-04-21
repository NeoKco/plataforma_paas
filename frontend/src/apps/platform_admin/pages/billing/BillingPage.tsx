import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { ConfirmDialog } from "../../../../components/common/ConfirmDialog";
import { MetricCard } from "../../../../components/common/MetricCard";
import {
  OperationalSummaryStrip,
  type OperationalSummaryCard,
} from "../../../../components/common/OperationalSummaryStrip";
import { PageHeader } from "../../../../components/common/PageHeader";
import { PanelCard } from "../../../../components/common/PanelCard";
import { StatusBadge } from "../../../../components/common/StatusBadge";
import { DataTableCard } from "../../../../components/data-display/DataTableCard";
import {
  AppForm,
  AppFormActions,
  AppFormField,
} from "../../../../design-system/AppForm";
import { AppBadge } from "../../../../design-system/AppBadge";
import { AppToolbar } from "../../../../design-system/AppLayout";
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
import { useLanguage } from "../../../../store/language-context";
import { getCurrentLanguage, getCurrentLocale } from "../../../../utils/i18n";
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

type PendingConfirmation = {
  scope: string;
  title: string;
  description: string;
  details: string[];
  confirmLabel: string;
  action: () => Promise<{ message?: string }>;
};

export function BillingPage() {
  const { session } = useAuth();
  const { language } = useLanguage();
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
  const [pendingConfirmation, setPendingConfirmation] =
    useState<PendingConfirmation | null>(null);

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

  const operationalSignals = useMemo(() => {
    const signals: Array<{
      key: string;
      title: string;
      detail: string;
    }> = [];

    if ((platformAlerts?.total_alerts || 0) > 0) {
      signals.push({
        key: "active-alerts",
        title: `${platformAlerts?.total_alerts || 0} alertas activas de billing`,
        detail:
          "Revisa primero severidad, proveedor y resultado de procesamiento para separar un ruido puntual de una desalineación más amplia.",
      });
    }

    if ((tenantEvents?.total_events || 0) > 0 && selectedTenant) {
      const lastEvent = tenantEvents?.data[0] || null;
      if (lastEvent?.processing_result === "applied") {
        signals.push({
          key: "tenant-applied",
          title: `El tenant ${selectedTenant.slug} tiene eventos aplicados`,
          detail:
            "Esto indica que el stream persistido ya mutó el tenant. Si alguien cambia el billing manualmente después, usa reconcile para reimponer el estado del último evento.",
        });
      }
      if (lastEvent?.processing_result === "reconciled") {
        signals.push({
          key: "tenant-reconciled",
          title: `El tenant ${selectedTenant.slug} ya tuvo reconcile reciente`,
          detail:
            "Esto suele indicar que el estado del tenant fue corregido usando el historial persistido, no por un evento nuevo del proveedor.",
        });
      }
    }

    const alertHistoryRows = platformAlertHistory?.total_alerts || 0;
    if (alertHistoryRows > 0 && (platformAlerts?.total_alerts || 0) === 0) {
      signals.push({
        key: "history-without-active-alerts",
        title: `${alertHistoryRows} alertas en historial, pero ninguna activa`,
        detail:
          "La sincronización se ve estable ahora, pero hubo presión operativa reciente. Úsalo para explicar incidentes sin asumir que siguen abiertos.",
      });
    }

    return signals;
  }, [
    platformAlertHistory?.total_alerts,
    platformAlerts?.total_alerts,
    selectedTenant,
    tenantEvents?.data,
    tenantEvents?.total_events,
  ]);

  const frontlineCards = useMemo<OperationalSummaryCard[]>(() => {
    const activeAlerts = platformAlerts?.total_alerts || 0;
    const alertHistoryRows = platformAlertHistory?.total_alerts || 0;
    const tenantEventsCount = tenantEvents?.total_events || 0;

    return [
      {
        key: "alerts",
        eyebrow: language === "es" ? "Ruta rápida" : "Quick route",
        tone: activeAlerts > 0 ? "warning" : "success",
        title:
          activeAlerts > 0
            ? language === "es"
              ? `${activeAlerts} alertas billing`
              : `${activeAlerts} billing alerts`
            : language === "es"
              ? "Billing sin alerta abierta"
              : "Billing without open alerts",
        detail:
          language === "es"
            ? "Severidad, proveedor y resultado siguen siendo la primera lectura."
            : "Severity, provider and result remain the first read.",
      },
      {
        key: "tenant",
        eyebrow: language === "es" ? "Ruta rápida" : "Quick route",
        tone:
          selectedTenant && tenantEventsCount > 0
            ? "info"
            : selectedTenant
              ? "neutral"
              : "neutral",
        title:
          selectedTenant && tenantEventsCount > 0
            ? language === "es"
              ? `${selectedTenant.slug} con ${tenantEventsCount} eventos`
              : `${selectedTenant.slug} with ${tenantEventsCount} events`
            : selectedTenant
              ? language === "es"
                ? `${selectedTenant.slug} sin eventos visibles`
                : `${selectedTenant.slug} without visible events`
              : language === "es"
                ? "Sin tenant foco"
                : "No tenant focus",
        detail:
          language === "es"
            ? "El detalle y el reconcile quedan en el workspace tenant."
            : "Detail and reconciliation live in the tenant workspace.",
      },
      {
        key: "history",
        eyebrow: language === "es" ? "Ruta rápida" : "Quick route",
        tone: alertHistoryRows > 0 ? "info" : "success",
        title:
          alertHistoryRows > 0
            ? language === "es"
              ? `${alertHistoryRows} alertas en historial`
              : `${alertHistoryRows} alerts in history`
            : language === "es"
              ? "Sin presión reciente"
              : "No recent pressure",
        detail:
          language === "es"
            ? "Sirve para separar incidente ya cerrado de ruido todavía activo."
            : "Useful to separate a closed incident from still-active noise.",
      },
    ];
  }, [
    language,
    platformAlertHistory?.total_alerts,
    platformAlerts?.total_alerts,
    selectedTenant,
    tenantEvents?.total_events,
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
          result.message ||
            (language === "es"
              ? "La acción de facturación se completó correctamente."
              : "The billing action completed successfully.")
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

    setPendingConfirmation({
      scope: `reconcile-${syncEventId}`,
      title: language === "es" ? `Reconciliar evento #${syncEventId}` : `Reconcile event #${syncEventId}`,
      description:
        language === "es"
          ? "Esta acción vuelve a aplicar sobre el tenant el estado persistido en ese evento de billing."
          : "This action reapplies to the tenant the state persisted in that billing event.",
      details: [
        `Tenant: ${selectedTenant?.slug || `tenant-${selectedTenantId}`}`,
        `${language === "es" ? "Evento" : "Event"}: #${syncEventId}`,
        `${language === "es" ? "Proveedor" : "Provider"}: ${
          normalizeNullableString(providerFilter) ||
          (language === "es" ? "según fila seleccionada" : "according to selected row")
        }`,
      ],
      confirmLabel: language === "es" ? "Reconciliar evento" : "Reconcile event",
      action: () =>
        reconcileTenantBillingEvent(session.accessToken, selectedTenantId, syncEventId),
    });
  }

  function handleBatchReconcile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.accessToken || selectedTenantId === null) {
      return;
    }

    setPendingConfirmation({
      scope: "reconcile-batch",
      title:
        language === "es"
          ? "Reconciliar eventos filtrados"
          : "Reconcile filtered events",
      description:
        language === "es"
          ? "Esta acción vuelve a aplicar sobre el tenant los eventos de billing que hoy coinciden con el filtro visible."
          : "This action reapplies to the tenant the billing events that currently match the visible filter.",
      details: [
        `Tenant: ${selectedTenant?.slug || `tenant-${selectedTenantId}`}`,
        `${language === "es" ? "Proveedor" : "Provider"}: ${
          normalizeNullableString(providerFilter) || (language === "es" ? "todos" : "all")
        }`,
        `${language === "es" ? "Tipo de evento" : "Event type"}: ${
          normalizeNullableString(eventTypeFilter) || (language === "es" ? "todos" : "all")
        }`,
        `${language === "es" ? "Resultado actual" : "Current result"}: ${
          normalizeNullableString(processingResultFilter) ||
          (language === "es" ? "todos" : "all")
        }`,
        `${language === "es" ? "Límite" : "Limit"}: ${parsePositiveInteger(batchLimit, 10)}`,
      ],
      confirmLabel: language === "es" ? "Reconciliar lote" : "Reconcile batch",
      action: () =>
        reconcileTenantBillingEventsBatch(session.accessToken, selectedTenantId, {
          provider: normalizeNullableString(providerFilter),
          eventType: normalizeNullableString(eventTypeFilter),
          processingResult: normalizeNullableString(processingResultFilter),
          limit: parsePositiveInteger(batchLimit, 10),
        }),
    });
  }

  return (
    <div className="d-grid gap-4">
      <PageHeader
        eyebrow={language === "es" ? "Plataforma" : "Platform"}
        icon="billing"
        title={language === "es" ? "Facturación" : "Billing"}
        description={
          language === "es"
            ? "Vista rápida de alertas, historial y reconcile sobre billing persistido."
            : "Quick view of alerts, history and tenant reconciliation over the persisted billing stream."
        }
        actions={
          <AppToolbar compact>
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() =>
                downloadTextFile(
                  buildTenantBillingEventsCsv(tenantEvents?.data || [], language),
                  `billing-tenant-events-${selectedTenant?.slug || "none"}.csv`,
                  "text/csv;charset=utf-8;"
                )
              }
              disabled={!tenantEvents || tenantEvents.data.length === 0}
            >
              {language === "es" ? "Exportar CSV tenant" : "Export tenant CSV"}
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() =>
                downloadTextFile(
                  JSON.stringify(
                    buildBillingWorkspaceExportPayload({
                      selectedTenantSlug: selectedTenant?.slug || null,
                      providerFilter,
                      eventTypeFilter,
                      processingResultFilter,
                      eventLimit,
                      batchLimit,
                      platformSummary,
                      platformAlerts,
                      platformAlertHistory,
                      tenantSummary,
                      tenantEvents,
                    }),
                    null,
                    2
                  ),
                  "billing-workspace.json",
                  "application/json;charset=utf-8;"
                )
              }
              disabled={
                !platformSummary &&
                !platformAlerts &&
                !platformAlertHistory &&
                !tenantSummary &&
                !tenantEvents
              }
            >
              {language === "es" ? "Exportar JSON" : "Export JSON"}
            </button>
            <button
              type="button"
              className="btn btn-outline-primary"
              onClick={() => void refreshAll()}
              disabled={isLoading || isActionSubmitting}
            >
              {language === "es" ? "Recargar datos" : "Reload data"}
            </button>
          </AppToolbar>
        }
      />

      <ConfirmDialog
        isOpen={Boolean(pendingConfirmation)}
        title={pendingConfirmation?.title || ""}
        description={pendingConfirmation?.description || ""}
        details={pendingConfirmation?.details || []}
        confirmLabel={pendingConfirmation?.confirmLabel || (language === "es" ? "Confirmar" : "Confirm")}
        onConfirm={() => {
          if (!pendingConfirmation) {
            return;
          }
          const currentAction = pendingConfirmation;
          setPendingConfirmation(null);
          void runAction(currentAction.scope, currentAction.action);
        }}
        onCancel={() => setPendingConfirmation(null)}
        isSubmitting={isActionSubmitting}
      />

      {actionFeedback ? (
        <div
          className={`tenant-action-feedback tenant-action-feedback--${actionFeedback.type}`}
        >
          <strong>{getPlatformActionFeedbackLabel(actionFeedback.scope, language)}:</strong>{" "}
          {actionFeedback.message}
        </div>
      ) : null}

      {isLoading ? (
        <LoadingBlock
          label={
            language === "es"
              ? "Cargando operación de facturación..."
              : "Loading billing operations..."
          }
        />
      ) : null}

      <div className="billing-overview-grid">
        <MetricCard
          label={language === "es" ? "Filas resumen global" : "Global summary rows"}
          icon="overview"
          tone="default"
          value={overview.totalPlatformSummaryRows}
        />
        <MetricCard
          label={language === "es" ? "Alertas activas" : "Active alerts"}
          icon="activity"
          tone="warning"
          value={overview.totalActiveAlerts}
        />
        <MetricCard
          label={language === "es" ? "Filas historial alertas" : "Alert history rows"}
          icon="reports"
          tone="info"
          value={overview.totalAlertHistoryRows}
        />
        <MetricCard
          label={language === "es" ? "Eventos tenant" : "Tenant events"}
          icon="billing"
          tone="success"
          value={overview.totalTenantEvents}
        />
        <MetricCard
          label={language === "es" ? "Filas resumen tenant" : "Tenant summary rows"}
          icon="tenants"
          tone="default"
          value={overview.totalTenantSummaryRows}
        />
      </div>

      <OperationalSummaryStrip cards={frontlineCards} />

      <PanelCard
        title={language === "es" ? "Señales abiertas" : "Open signals"}
        subtitle={
          language === "es"
            ? "Lee esto primero y baja al detalle solo si hace falta."
            : "Go deeper only if this short read is not enough."
        }
      >
        {operationalSignals.length === 0 ? (
          <EmptyState
            title={
              language === "es"
                ? "No hay señales operativas abiertas en billing"
                : "There are no open operational billing signals"
            }
            detail={
              language === "es"
                ? "No hay alertas activas ni reconcile pendiente visible."
                : "There are no active alerts or immediate signs of pending reconciliation. The billing stream looks stable."
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
        title={language === "es" ? "Filtros de facturación" : "Billing filters"}
        subtitle={
          language === "es"
            ? "El mismo set alimenta resumen, alertas e historial."
            : "The same set drives summary, alerts and tenant history."
        }
      >
        <AppForm className="billing-filter-grid" onSubmit={handleFilterSubmit}>
          <AppFormField label="Tenant">
            <select
              className="form-select"
              value={selectedTenantId ?? ""}
              onChange={(event) =>
                setSelectedTenantId(
                  event.target.value ? Number.parseInt(event.target.value, 10) : null
                )
              }
            >
              <option value="">
                {language === "es" ? "Ningún tenant seleccionado" : "No tenant selected"}
              </option>
              {tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.name} ({tenant.slug})
                </option>
              ))}
            </select>
          </AppFormField>
          <AppFormField label={language === "es" ? "Proveedor" : "Provider"}>
            <select
              className="form-select"
              value={providerFilter}
              onChange={(event) => setProviderFilter(event.target.value)}
            >
              <option value="">{language === "es" ? "todos" : "all"}</option>
              {(capabilities?.billing_providers || []).map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </AppFormField>
          <AppFormField label={language === "es" ? "Resultado de procesamiento" : "Processing result"}>
            <select
              className="form-select"
              value={processingResultFilter}
              onChange={(event) => setProcessingResultFilter(event.target.value)}
            >
              <option value="">{language === "es" ? "todos" : "all"}</option>
              {(capabilities?.billing_sync_processing_results || []).map((value) => (
                <option key={value} value={value}>
                  {displayPlatformCode(value, language)}
                </option>
              ))}
            </select>
          </AppFormField>
          <AppFormField label={language === "es" ? "Tipo de evento" : "Event type"}>
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
          </AppFormField>
          <AppFormField label={language === "es" ? "Límite historial" : "History limit"}>
            <input
              className="form-control"
              type="number"
              min="1"
              value={eventLimit}
              onChange={(event) => setEventLimit(event.target.value)}
            />
          </AppFormField>
          <AppFormActions className="billing-filter-actions">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading || isActionSubmitting}
            >
              {language === "es" ? "Aplicar filtros" : "Apply filters"}
            </button>
          </AppFormActions>
        </AppForm>
      </PanelCard>

      {platformError ? (
        <ErrorState
          title={
            language === "es"
              ? "Datos de facturación de plataforma no disponibles"
              : "Platform billing data unavailable"
          }
          detail={platformError.payload?.detail || platformError.message}
          requestId={platformError.payload?.request_id}
        />
      ) : null}

      {!platformError && platformSummary ? (
        <div className="billing-data-grid">
          <DataTableCard
            title={language === "es" ? "Resumen global billing" : "Global billing summary"}
            rows={platformSummary.data}
            columns={[
              {
                key: "provider",
                header: language === "es" ? "Proveedor" : "Provider",
                render: (row) => row.provider,
              },
              {
                key: "event_type",
                header: language === "es" ? "Tipo de evento" : "Event type",
                render: (row) => <code>{row.event_type}</code>,
              },
              {
                key: "processing_result",
                header: language === "es" ? "Resultado" : "Result",
                render: (row) => <StatusBadge value={row.processing_result} />,
              },
              {
                key: "total_events",
                header: language === "es" ? "Eventos" : "Events",
                render: (row) => row.total_events,
              },
              {
                key: "total_tenants",
                header: "Tenants",
                render: (row) => row.total_tenants,
              },
              {
                key: "last_recorded_at",
                header: language === "es" ? "Última vez visto" : "Last seen",
                render: (row) => formatDateTime(row.last_recorded_at),
              },
            ]}
          />

          {platformAlerts ? (
            platformAlerts.data.length > 0 ? (
              <DataTableCard
                title={language === "es" ? "Alertas billing" : "Billing alerts"}
                rows={platformAlerts.data}
                columns={[
                  {
                    key: "severity",
                    header: language === "es" ? "Severidad" : "Severity",
                    render: (row) => <SeverityBadge value={row.severity} />,
                  },
                  {
                    key: "alert_code",
                    header: language === "es" ? "Alerta" : "Alert",
                    render: (row) => <code>{row.alert_code}</code>,
                  },
                  {
                    key: "provider",
                    header: language === "es" ? "Proveedor" : "Provider",
                    render: (row) => row.provider,
                  },
                  {
                    key: "processing_result",
                    header: language === "es" ? "Resultado" : "Result",
                    render: (row) =>
                      row.processing_result
                        ? displayPlatformCode(row.processing_result, language)
                        : "—",
                  },
                  {
                    key: "total_tenants",
                    header: "Tenants",
                    render: (row) => row.total_tenants,
                  },
                  {
                    key: "message",
                    header: language === "es" ? "Mensaje" : "Message",
                    render: (row) => row.message,
                  },
                ]}
              />
            ) : (
              <PanelCard
                title={language === "es" ? "Alertas billing" : "Billing alerts"}
                subtitle={
                  language === "es"
                    ? "No hay alertas activas con este filtro."
                    : "There are no active alerts for this filter."
                }
              >
                <EmptyState
                  title={
                    language === "es"
                      ? "No hay alertas activas para este filtro"
                      : "There are no active alerts for this filter"
                  }
                  detail={
                    language === "es"
                      ? "La sincronización de billing está tranquila y no hay señales operativas abiertas en este momento."
                      : "Billing sync is quiet and there are no open operational signals right now."
                  }
                />
              </PanelCard>
            )
          ) : null}
        </div>
      ) : null}

      {!platformError && platformAlertHistory ? (
        platformAlertHistory.data.length > 0 ? (
          <DataTableCard
            title={language === "es" ? "Historial alertas billing" : "Billing alert history"}
            rows={platformAlertHistory.data}
            columns={[
              {
                key: "recorded_at",
                header: language === "es" ? "Registrado en" : "Recorded at",
                render: (row) => formatDateTime(row.recorded_at),
              },
              {
                key: "severity",
                header: language === "es" ? "Severidad" : "Severity",
                render: (row) => <SeverityBadge value={row.severity} />,
              },
              {
                key: "alert_code",
                header: language === "es" ? "Alerta" : "Alert",
                render: (row) => <code>{row.alert_code}</code>,
              },
              {
                key: "provider",
                header: language === "es" ? "Proveedor" : "Provider",
                render: (row) => row.provider,
              },
              {
                    key: "processing_result",
                    header: language === "es" ? "Resultado" : "Result",
                    render: (row) =>
                      row.processing_result
                        ? displayPlatformCode(row.processing_result, language)
                        : "—",
              },
              {
                key: "message",
                header: language === "es" ? "Mensaje" : "Message",
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
              title={
                language === "es"
                  ? "Espacio tenant de billing no disponible"
                  : "Tenant billing workspace unavailable"
              }
              detail={tenantError.payload?.detail || tenantError.message}
              requestId={tenantError.payload?.request_id}
            />
          ) : null}

          <PanelCard
            icon="billing"
            title={
              language === "es"
                ? `Workspace billing tenant: ${selectedTenant.name}`
                : `Tenant billing workspace: ${selectedTenant.name}`
            }
            subtitle={
              language === "es"
                ? "Historial y reconcile sobre billing persistido."
                : "History and reconciliation over the persisted stream."
            }
          >
            <div className="tenant-detail-grid">
              <DetailField label="Tenant" value={selectedTenant.name} />
              <DetailField label="Slug" value={<code>{selectedTenant.slug}</code>} />
              <DetailField
                label={language === "es" ? "Ciclo de vida" : "Lifecycle"}
                value={<StatusBadge value={selectedTenant.status} />}
              />
              <DetailField
                label={language === "es" ? "Facturación" : "Billing"}
                value={
                  <StatusBadge value={selectedTenant.billing_status || "unknown"} />
                }
              />
            </div>
          </PanelCard>

          {isTenantLoading ? (
            <LoadingBlock
              label={
                language === "es"
                  ? "Cargando datos de billing tenant..."
                  : "Loading tenant billing data..."
              }
            />
          ) : null}

          {!tenantError && tenantSummary ? (
            <div className="billing-data-grid">
              <DataTableCard
                title={language === "es" ? "Resumen tenant billing" : "Tenant billing summary"}
                rows={tenantSummary.data}
                columns={[
                  {
                    key: "provider",
                    header: language === "es" ? "Proveedor" : "Provider",
                    render: (row) => row.provider,
                  },
                  {
                    key: "event_type",
                    header: language === "es" ? "Tipo de evento" : "Event type",
                    render: (row) => <code>{row.event_type}</code>,
                  },
                  {
                    key: "processing_result",
                    header: language === "es" ? "Resultado" : "Result",
                    render: (row) => <StatusBadge value={row.processing_result} />,
                  },
                  {
                    key: "total_events",
                    header: language === "es" ? "Eventos" : "Events",
                    render: (row) => row.total_events,
                  },
                  {
                    key: "last_recorded_at",
                    header: language === "es" ? "Última vez visto" : "Last seen",
                    render: (row) => formatDateTime(row.last_recorded_at),
                  },
                ]}
              />

              <AppForm className="tenant-action-form" onSubmit={handleBatchReconcile}>
                <h3 className="tenant-action-form__title">
                  {language === "es" ? "Reconcile en lote" : "Batch reconcile"}
                </h3>
                <AppFormField label={language === "es" ? "Límite" : "Limit"}>
                <input
                  className="form-control"
                  type="number"
                  min="1"
                  value={batchLimit}
                  onChange={(event) => setBatchLimit(event.target.value)}
                />
                </AppFormField>
                <AppFormField fullWidth>
                  <p className="tenant-help-text mt-3">
                    {language === "es"
                      ? "Reaplica eventos recientes con el filtro tenant actual."
                      : "Reapply recent events using the current tenant filter."}
                  </p>
                </AppFormField>
                <AppFormActions>
                <button
                  type="submit"
                  className="btn btn-primary mt-3"
                  disabled={isActionSubmitting}
                >
                  {language === "es" ? "Reconciliar eventos filtrados" : "Reconcile filtered events"}
                </button>
                </AppFormActions>
              </AppForm>
            </div>
          ) : null}

          {!tenantError && tenantEvents ? (
            tenantEvents.data.length > 0 ? (
              <DataTableCard
                title={language === "es" ? "Eventos tenant billing" : "Tenant billing events"}
                rows={tenantEvents.data}
                columns={[
                  {
                    key: "recorded_at",
                    header: language === "es" ? "Registrado en" : "Recorded at",
                    render: (row) => formatDateTime(row.recorded_at),
                  },
                  {
                    key: "provider",
                    header: language === "es" ? "Proveedor" : "Provider",
                    render: (row) => row.provider,
                  },
                  {
                    key: "event_type",
                    header: language === "es" ? "Tipo de evento" : "Event type",
                    render: (row) => <code>{row.event_type}</code>,
                  },
                  {
                    key: "processing_result",
                    header: language === "es" ? "Resultado" : "Result",
                    render: (row) => <StatusBadge value={row.processing_result} />,
                  },
                  {
                    key: "billing_status",
                    header: language === "es" ? "Estado billing" : "Billing status",
                    render: (row) =>
                      row.billing_status ? displayPlatformCode(row.billing_status, language) : "—",
                  },
                  {
                    key: "actions",
                    header: language === "es" ? "Acciones" : "Actions",
                    render: (row) => (
                      <AppToolbar compact>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => handleSingleReconcile(row.id)}
                          disabled={isActionSubmitting}
                        >
                          {language === "es" ? "Reconciliar" : "Reconcile"}
                        </button>
                      </AppToolbar>
                    ),
                  },
                ]}
              />
            ) : (
              <PanelCard
                title={language === "es" ? "Eventos tenant billing" : "Tenant billing events"}
                subtitle={
                  language === "es"
                    ? "Ningún evento coincide con el filtro tenant actual."
                    : "No event matches the current tenant filter."
                }
              >
                <EmptyState
                  title={
                    language === "es"
                      ? "No hay eventos para este tenant con el filtro actual"
                      : "There are no events for this tenant with the current filter"
                  }
                  detail={
                    language === "es"
                      ? "Puedes ampliar el período o limpiar filtros para recuperar más historial de billing sync."
                      : "You can widen the period or clear filters to recover more billing sync history."
                  }
                />
              </PanelCard>
            )
          ) : null}
        </>
      ) : (
        <PanelCard
          title={language === "es" ? "Espacio tenant de billing" : "Tenant billing workspace"}
          subtitle={
            language === "es"
              ? "Selecciona un tenant para ver historial y reconcile."
              : "Select a tenant to inspect history and reconcile."
          }
        >
          <EmptyState
            title={
              language === "es"
                ? "Todavía no elegiste un tenant"
                : "You have not selected a tenant yet"
            }
            detail={
              language === "es"
                ? "Las tarjetas globales siguen visibles, pero el detalle de eventos y reconcile necesita un tenant seleccionado."
                : "Global cards remain visible, but event detail and reconcile require a selected tenant."
            }
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
  const tone =
    normalized === "critical" || normalized === "error"
      ? "danger"
      : normalized === "warning"
        ? "warning"
        : "info";
  return <AppBadge tone={tone}>{normalized}</AppBadge>;
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
  const language = getCurrentLanguage();
  if (!value) {
    return "—";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString(getCurrentLocale(language));
}

function buildBillingWorkspaceExportPayload({
  selectedTenantSlug,
  providerFilter,
  eventTypeFilter,
  processingResultFilter,
  eventLimit,
  batchLimit,
  platformSummary,
  platformAlerts,
  platformAlertHistory,
  tenantSummary,
  tenantEvents,
}: {
  selectedTenantSlug: string | null;
  providerFilter: string;
  eventTypeFilter: string;
  processingResultFilter: string;
  eventLimit: string;
  batchLimit: string;
  platformSummary: PlatformBillingSyncSummaryResponse | null;
  platformAlerts: PlatformBillingAlertsResponse | null;
  platformAlertHistory: PlatformBillingAlertHistoryResponse | null;
  tenantSummary: TenantBillingSyncSummaryResponse | null;
  tenantEvents: TenantBillingSyncHistoryResponse | null;
}) {
  return {
    exported_at: new Date().toISOString(),
    filters: {
      selected_tenant_slug: selectedTenantSlug,
      provider: normalizeNullableString(providerFilter),
      event_type: normalizeNullableString(eventTypeFilter),
      processing_result: normalizeNullableString(processingResultFilter),
      event_limit: parsePositiveInteger(eventLimit, 20),
      batch_limit: parsePositiveInteger(batchLimit, 10),
    },
    platform_summary: platformSummary?.data || [],
    platform_alerts: platformAlerts?.data || [],
    platform_alert_history: platformAlertHistory?.data || [],
    tenant_summary: tenantSummary?.data || [],
    tenant_events: tenantEvents?.data || [],
  };
}

function buildTenantBillingEventsCsv(
  rows: TenantBillingSyncHistoryResponse["data"],
  language: "es" | "en"
): string {
  const csvRows = [
    [
      "recorded_at",
      "provider",
      "event_type",
      "processing_result",
      "billing_status",
      "provider_event_id",
      "provider_customer_id",
      "provider_subscription_id",
    ],
    ...rows.map((row) => [
      formatDateTime(row.recorded_at),
      row.provider,
      row.event_type,
      displayPlatformCode(row.processing_result, language),
      row.billing_status ? displayPlatformCode(row.billing_status, language) : "",
      row.provider_event_id,
      row.provider_customer_id || "",
      row.provider_subscription_id || "",
    ]),
  ];

  return csvRows
    .map((row) => row.map((value) => escapeCsvValue(value)).join(","))
    .join("\n");
}

function escapeCsvValue(value: string): string {
  const normalized = value.split('"').join('""');
  return /[",\n]/.test(normalized) ? `"${normalized}"` : normalized;
}

function downloadTextFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
