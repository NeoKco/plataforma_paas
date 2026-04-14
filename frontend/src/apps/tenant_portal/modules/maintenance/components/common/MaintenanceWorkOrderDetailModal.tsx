import { useEffect, useMemo, useState } from "react";
import { PanelCard } from "../../../../../../components/common/PanelCard";
import { ErrorState } from "../../../../../../components/feedback/ErrorState";
import { LoadingBlock } from "../../../../../../components/feedback/LoadingBlock";
import { AppBadge } from "../../../../../../design-system/AppBadge";
import { getApiErrorDisplayMessage } from "../../../../../../services/api";
import { pickLocalizedText } from "../../../../../../store/language-context";
import { formatDateTimeInTimeZone } from "../../../../../../utils/dateTimeLocal";
import { stripLegacyVisibleText } from "../../../../../../utils/legacyVisibleText";
import type { ApiError } from "../../../../../../types";
import {
  getTenantMaintenanceStatusLogs,
  getTenantMaintenanceVisits,
  type TenantMaintenanceStatusLog,
  type TenantMaintenanceVisit,
} from "../../services/historyService";

export type MaintenanceWorkOrderDetailItem = {
  id: number;
  title: string;
  description: string | null;
  priority: string;
  maintenance_status: string;
  requested_at: string;
  scheduled_for: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  closure_notes: string | null;
  assigned_work_group_id: number | null;
  assigned_tenant_user_id: number | null;
  status_logs?: TenantMaintenanceStatusLog[];
  visits?: TenantMaintenanceVisit[];
};

type Props = {
  accessToken?: string | null;
  clientLabel: string;
  siteLabel: string;
  installationLabel: string;
  taskTypeLabel?: string;
  technicianProfileLabel?: string;
  workGroupLabel: string;
  technicianLabel: string;
  effectiveTimeZone?: string | null;
  isOpen: boolean;
  language: "es" | "en";
  mode?: "open" | "history";
  onClose: () => void;
  onOpenCosting?: () => void;
  onOpenChecklist?: () => void;
  onManageVisits?: () => void;
  onEditClosure?: () => void;
  onReopen?: () => void;
  workOrder: MaintenanceWorkOrderDetailItem | null;
};

function formatDateTime(value: string | null, language: "es" | "en", timeZone?: string | null) {
  if (!value) {
    return pickLocalizedText(language, { es: "sin fecha", en: "no date" });
  }
  return formatDateTimeInTimeZone(value, language, timeZone);
}

function getStatusTone(status: string): "success" | "warning" | "danger" | "info" | "neutral" {
  if (status === "completed") {
    return "success";
  }
  if (status === "cancelled") {
    return "danger";
  }
  if (status === "in_progress") {
    return "info";
  }
  if (status === "scheduled") {
    return "warning";
  }
  return "neutral";
}

function getStatusLabel(status: string, language: "es" | "en") {
  switch (status) {
    case "scheduled":
      return pickLocalizedText(language, { es: "Programada", en: "Scheduled" });
    case "in_progress":
      return pickLocalizedText(language, { es: "En curso", en: "In progress" });
    case "completed":
      return pickLocalizedText(language, { es: "Completada", en: "Completed" });
    case "cancelled":
      return pickLocalizedText(language, { es: "Anulada", en: "Cancelled" });
    default:
      return status;
  }
}

function getVisitTypeLabel(type: string, language: "es" | "en") {
  switch (type) {
    case "diagnostic":
      return pickLocalizedText(language, { es: "Diagnóstico", en: "Diagnostic" });
    case "execution":
      return pickLocalizedText(language, { es: "Ejecución", en: "Execution" });
    case "follow_up":
      return pickLocalizedText(language, { es: "Seguimiento", en: "Follow-up" });
    case "closure":
      return pickLocalizedText(language, { es: "Cierre", en: "Closure" });
    default:
      return type;
  }
}

function getVisitResultLabel(result: string, language: "es" | "en") {
  switch (result) {
    case "executed":
      return pickLocalizedText(language, { es: "Ejecutada", en: "Executed" });
    case "client_absent":
      return pickLocalizedText(language, { es: "Cliente ausente", en: "Client absent" });
    case "no_access":
      return pickLocalizedText(language, { es: "Sin acceso", en: "No access" });
    case "pending_spare_parts":
      return pickLocalizedText(language, {
        es: "Pendiente repuestos",
        en: "Pending spare parts",
      });
    case "rescheduled_on_site":
      return pickLocalizedText(language, {
        es: "Reprogramada en terreno",
        en: "Rescheduled on site",
      });
    case "cancelled_on_site":
      return pickLocalizedText(language, {
        es: "Cancelada en terreno",
        en: "Cancelled on site",
      });
    default:
      return result;
  }
}

function getStatusLogTitle(
  log: { from_status: string | null; to_status: string; note: string | null },
  language: "es" | "en"
) {
  const note = (log.note || "").trim().toLowerCase();
  if (log.from_status && log.from_status === log.to_status && note.startsWith("reprogramación")) {
    return pickLocalizedText(language, { es: "Reprogramación", en: "Reschedule" });
  }
  return `${log.from_status || pickLocalizedText(language, { es: "inicio", en: "start" })} -> ${log.to_status}`;
}

function isRescheduleLog(log: {
  from_status: string | null;
  to_status: string;
  note: string | null;
}) {
  const note = (log.note || "").trim().toLowerCase();
  return Boolean(log.from_status && log.from_status === log.to_status && note.startsWith("reprogramación"));
}

function toTimestamp(value: string | null | undefined): number | null {
  if (!value) {
    return null;
  }
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

function formatDateRange(
  start: string | null,
  end: string | null,
  language: "es" | "en",
  timeZone?: string | null
) {
  if (!start && !end) {
    return pickLocalizedText(language, { es: "sin ventana", en: "no window" });
  }
  if (!start) {
    return formatDateTime(end, language, timeZone);
  }
  const startLabel = formatDateTime(start, language, timeZone);
  return end ? `${startLabel} → ${formatDateTime(end, language, timeZone)}` : startLabel;
}

export function MaintenanceWorkOrderDetailModal({
  accessToken,
  clientLabel,
  siteLabel,
  installationLabel,
  taskTypeLabel,
  technicianProfileLabel,
  workGroupLabel,
  technicianLabel,
  effectiveTimeZone,
  isOpen,
  language,
  mode = "open",
  onClose,
  onOpenCosting,
  onOpenChecklist,
  onManageVisits,
  onEditClosure,
  onReopen,
  workOrder,
}: Props) {
  const t = (es: string, en: string) => pickLocalizedText(language, { es, en });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [statusLogs, setStatusLogs] = useState<TenantMaintenanceStatusLog[]>([]);
  const [visits, setVisits] = useState<TenantMaintenanceVisit[]>([]);

  useEffect(() => {
    if (!isOpen || !workOrder) {
      return;
    }
    if (workOrder.status_logs && workOrder.visits) {
      setStatusLogs(workOrder.status_logs);
      setVisits(workOrder.visits);
      setError(null);
      setIsLoading(false);
      return;
    }
    if (!accessToken) {
      return;
    }
    let cancelled = false;
    async function loadDetail() {
      if (!workOrder) {
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const [logsResponse, visitsResponse] = await Promise.all([
          getTenantMaintenanceStatusLogs(accessToken as string, workOrder.id),
          getTenantMaintenanceVisits(accessToken as string, workOrder.id),
        ]);
        if (cancelled) {
          return;
        }
        setStatusLogs(logsResponse.data);
        setVisits(visitsResponse.data);
      } catch (rawError) {
        if (!cancelled) {
          setError(rawError as ApiError);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }
    void loadDetail();
    return () => {
      cancelled = true;
    };
  }, [accessToken, isOpen, workOrder]);

  const visitSummary = useMemo(() => visits.length, [visits]);
  const logSummary = useMemo(() => statusLogs.length, [statusLogs]);
  const openVisits = useMemo(
    () => visits.filter((visit) => visit.visit_status === "scheduled" || visit.visit_status === "in_progress"),
    [visits]
  );
  const completedVisits = useMemo(
    () => visits.filter((visit) => visit.visit_status === "completed"),
    [visits]
  );
  const nextVisit = useMemo(() => {
    const ordered = [...openVisits]
      .filter((visit) => visit.scheduled_start_at)
      .sort((left, right) => {
        const leftTime = toTimestamp(left.scheduled_start_at) ?? Number.POSITIVE_INFINITY;
        const rightTime = toTimestamp(right.scheduled_start_at) ?? Number.POSITIVE_INFINITY;
        return leftTime - rightTime;
      });
    return ordered[0] ?? null;
  }, [openVisits]);
  const latestFieldExecution = useMemo(() => {
    const ordered = [...visits]
      .filter((visit) => visit.actual_end_at || visit.actual_start_at)
      .sort((left, right) => {
        const leftTime =
          toTimestamp(left.actual_end_at) ??
          toTimestamp(left.actual_start_at) ??
          Number.NEGATIVE_INFINITY;
        const rightTime =
          toTimestamp(right.actual_end_at) ??
          toTimestamp(right.actual_start_at) ??
          Number.NEGATIVE_INFINITY;
        return rightTime - leftTime;
      });
    return ordered[0] ?? null;
  }, [visits]);
  const rescheduleCount = useMemo(
    () => statusLogs.filter((log) => isRescheduleLog(log)).length,
    [statusLogs]
  );
  const visitGroupLabels = useMemo(() => {
    const items = visits
      .map((visit) => {
        const label = stripLegacyVisibleText(visit.assigned_group_label);
        if (label) {
          return label;
        }
        return visit.assigned_work_group_id ? `#${visit.assigned_work_group_id}` : null;
      })
      .filter((value): value is string => Boolean(value));
    return Array.from(new Set(items));
  }, [visits]);
  const visitGroupSummary = useMemo(() => {
    if (visitGroupLabels.length === 0) {
      return t("Sin grupos de visita", "No visit groups");
    }
    if (visitGroupLabels.length <= 2) {
      return visitGroupLabels.join(", ");
    }
    return `${visitGroupLabels.slice(0, 2).join(", ")} +${visitGroupLabels.length - 2}`;
  }, [language, visitGroupLabels]);

  return isOpen && workOrder ? (
    <div className="maintenance-form-backdrop" role="presentation" onClick={onClose}>
      <div
        className="maintenance-form-modal maintenance-form-modal--wide"
        role="dialog"
        aria-modal="true"
        aria-label={t("Ficha de mantención", "Maintenance detail")}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="maintenance-form-modal__eyebrow">
          {mode === "history"
            ? t("Ficha histórica", "Historical detail")
            : t("Ficha operativa", "Operational detail")}
        </div>
        <PanelCard
          title={t("Ficha de mantención", "Maintenance detail")}
          subtitle={t(
            "Lectura consolidada de la orden, su trazabilidad, responsables y visitas asociadas.",
            "Consolidated reading of the work order, traceability, assignees, and linked visits."
          )}
        >
          <div className="d-flex flex-wrap justify-content-between gap-3 align-items-start mb-3">
            <div>
              <div className="maintenance-history-entry__title">{stripLegacyVisibleText(workOrder.title) || "—"}</div>
              <div className="maintenance-history-entry__meta">{clientLabel}</div>
              <div className="maintenance-history-entry__meta">{siteLabel}</div>
            </div>
            <AppBadge tone={getStatusTone(workOrder.maintenance_status)}>
              {getStatusLabel(workOrder.maintenance_status, language)}
            </AppBadge>
          </div>

          {error ? (
            <ErrorState
              title={t("No se pudo cargar la ficha", "The detail could not be loaded")}
              detail={getApiErrorDisplayMessage(error)}
              requestId={error.payload?.request_id}
            />
          ) : null}

          {isLoading ? (
            <LoadingBlock label={t("Cargando ficha...", "Loading detail...")} />
          ) : (
            <div className="d-grid gap-3">
              <div className="row g-3">
                <div className="col-12 col-lg-4">
                  <div className="maintenance-history-entry h-100">
                    <div className="maintenance-history-entry__title">
                      {t("Cliente e instalación", "Client and installation")}
                    </div>
                    <div className="maintenance-history-entry__meta">
                      {t("Cliente", "Client")}: {clientLabel}
                    </div>
                    <div className="maintenance-history-entry__meta">
                      {t("Dirección", "Address")}: {siteLabel}
                    </div>
                    <div className="maintenance-history-entry__meta">
                      {t("Instalación", "Installation")}: {installationLabel}
                    </div>
                  </div>
                </div>
                <div className="col-12 col-lg-4">
                  <div className="maintenance-history-entry h-100">
                    <div className="maintenance-history-entry__title">
                      {t("Asignación actual", "Current assignment")}
                    </div>
                    <div className="maintenance-history-entry__meta">
                      {t("Grupo", "Group")}: {workGroupLabel}
                    </div>
                    <div className="maintenance-history-entry__meta">
                      {t("Técnico", "Technician")}: {technicianLabel}
                    </div>
                    <div className="maintenance-history-entry__meta">
                      {t("Tipo de tarea", "Task type")}: {taskTypeLabel || t("Sin tipo", "No task type")}
                    </div>
                    <div className="maintenance-history-entry__meta mt-2">
                      {t("Perfil funcional", "Function profile")}: {technicianProfileLabel || t("Sin perfil", "No profile")}
                    </div>
                    <div className="maintenance-history-entry__meta mt-2">
                      {t("Prioridad", "Priority")}: {workOrder.priority}
                    </div>
                  </div>
                </div>
                <div className="col-12 col-lg-4">
                  <div className="maintenance-history-entry h-100">
                    <div className="maintenance-history-entry__title">
                      {t("Fechas clave", "Key dates")}
                    </div>
                    <div className="maintenance-history-entry__meta">
                      {t("Solicitada", "Requested")}: {formatDateTime(workOrder.requested_at, language, effectiveTimeZone)}
                    </div>
                    <div className="maintenance-history-entry__meta">
                      {t("Programada", "Scheduled")}: {formatDateTime(workOrder.scheduled_for, language, effectiveTimeZone)}
                    </div>
                    <div className="maintenance-history-entry__meta">
                      {t("Cierre", "Closed")}: {formatDateTime(workOrder.completed_at || workOrder.cancelled_at, language, effectiveTimeZone)}
                    </div>
                  </div>
                </div>
                <div className="col-12 col-lg-6">
                  <div className="maintenance-history-entry h-100">
                    <div className="maintenance-history-entry__title">
                      {t("Terreno y visitas", "Field windows and visits")}
                    </div>
                    <div className="maintenance-history-entry__meta">
                      {t("Próxima ventana", "Next window")}: {nextVisit
                        ? formatDateRange(
                            nextVisit.scheduled_start_at,
                            nextVisit.scheduled_end_at,
                            language,
                            effectiveTimeZone
                          )
                        : t("Sin visitas abiertas", "No open visits")}
                    </div>
                    <div className="maintenance-history-entry__meta">
                      {t("Última ejecución", "Latest execution")}: {latestFieldExecution
                        ? formatDateRange(
                            latestFieldExecution.actual_start_at || latestFieldExecution.scheduled_start_at,
                            latestFieldExecution.actual_end_at,
                            language,
                            effectiveTimeZone
                          )
                        : t("Sin ejecución registrada", "No execution recorded")}
                    </div>
                    <div className="maintenance-history-entry__meta mt-2">
                      {openVisits.length} {t("visita(s) abierta(s)", "open visit(s)")}
                    </div>
                    <div className="maintenance-history-entry__meta">
                      {completedVisits.length} {t("visita(s) completada(s)", "completed visit(s)")}
                    </div>
                  </div>
                </div>
                <div className="col-12 col-lg-6">
                  <div className="maintenance-history-entry h-100">
                    <div className="maintenance-history-entry__title">
                      {t("Responsables y trazabilidad", "Assignees and traceability")}
                    </div>
                    <div className="maintenance-history-entry__meta">
                      {logSummary} {t("evento(s)", "event(s)")}
                    </div>
                    <div className="maintenance-history-entry__meta">
                      {visitSummary} {t("visita(s)", "visit(s)")}
                    </div>
                    <div className="maintenance-history-entry__meta mt-2">
                      {rescheduleCount} {t("reprogramación(es) auditada(s)", "audited reschedule(s)")}
                    </div>
                    <div className="maintenance-history-entry__meta">
                      {t("Grupos en terreno", "Field groups")}: {visitGroupSummary}
                    </div>
                    {stripLegacyVisibleText(workOrder.cancellation_reason) ? (
                      <div className="maintenance-history-entry__meta mt-2">
                        {t("Motivo anulación", "Cancellation reason")}: {stripLegacyVisibleText(workOrder.cancellation_reason)}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              {stripLegacyVisibleText(workOrder.description) ? (
                <div className="panel-card border-0 bg-light-subtle">
                  <div className="panel-card__header pb-2">
                    <h3 className="panel-card__title mb-0">{t("Detalle técnico", "Technical detail")}</h3>
                  </div>
                  <div className="panel-card__body pt-0">
                    {stripLegacyVisibleText(workOrder.description)}
                  </div>
                </div>
              ) : null}

              {stripLegacyVisibleText(workOrder.closure_notes) ? (
                <div className="panel-card border-0 bg-light-subtle">
                  <div className="panel-card__header pb-2">
                    <h3 className="panel-card__title mb-0">{t("Cierre técnico", "Closure notes")}</h3>
                  </div>
                  <div className="panel-card__body pt-0">
                    {stripLegacyVisibleText(workOrder.closure_notes)}
                  </div>
                </div>
              ) : null}

              <div className="row g-3">
                <div className="col-12 col-lg-6">
                  <div className="panel-card border-0 bg-light-subtle h-100">
                    <div className="panel-card__header pb-2">
                      <h3 className="panel-card__title mb-0">{t("Cambios y eventos", "Changes and events")}</h3>
                    </div>
                    <div className="panel-card__body pt-0 d-grid gap-2">
                      {statusLogs.length === 0 ? (
                        <div className="maintenance-history-entry__meta">
                          {t("Aún no hay eventos registrados.", "There are no recorded events yet.")}
                        </div>
                      ) : (
                        statusLogs.map((log) => (
                          <div key={log.id} className="maintenance-history-entry">
                            <div className="maintenance-history-entry__title">{getStatusLogTitle(log, language)}</div>
                            <div className="maintenance-history-entry__meta">{formatDateTime(log.changed_at, language, effectiveTimeZone)}</div>
                            {stripLegacyVisibleText(log.note) ? (
                              <div className="maintenance-history-entry__meta">{stripLegacyVisibleText(log.note)}</div>
                            ) : null}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
                <div className="col-12 col-lg-6">
                  <div className="panel-card border-0 bg-light-subtle h-100">
                    <div className="panel-card__header pb-2">
                      <h3 className="panel-card__title mb-0">{t("Visitas asociadas", "Linked visits")}</h3>
                    </div>
                    <div className="panel-card__body pt-0 d-grid gap-2">
                      {visits.length === 0 ? (
                        <div className="maintenance-history-entry__meta">
                          {t("Sin visitas registradas.", "No visits recorded.")}
                        </div>
                      ) : (
                        visits.map((visit) => (
                          <div key={visit.id} className="maintenance-history-entry">
                            <div className="maintenance-history-entry__title">{getVisitTypeLabel(visit.visit_type, language)} · {getStatusLabel(visit.visit_status, language)}</div>
                            {visit.visit_result ? (
                              <div className="maintenance-history-entry__meta">{getVisitResultLabel(visit.visit_result, language)}</div>
                            ) : null}
                            <div className="maintenance-history-entry__meta">{formatDateTime(visit.scheduled_start_at, language, effectiveTimeZone)}</div>
                            {stripLegacyVisibleText(visit.assigned_group_label) ? (
                              <div className="maintenance-history-entry__meta">{stripLegacyVisibleText(visit.assigned_group_label)}</div>
                            ) : null}
                            {stripLegacyVisibleText(visit.notes) ? (
                              <div className="maintenance-history-entry__meta">{stripLegacyVisibleText(visit.notes)}</div>
                            ) : null}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="maintenance-form__actions mt-4">
            <button className="btn btn-outline-secondary" type="button" onClick={onClose}>
              {t("Cerrar", "Close")}
            </button>
            {onOpenCosting ? (
              <button className="btn btn-outline-primary" type="button" onClick={onOpenCosting}>
                {t("Ver costos (hist.)", "View costing (history)")}
              </button>
            ) : null}
            {onOpenChecklist ? (
              <button className="btn btn-outline-primary" type="button" onClick={onOpenChecklist}>
                {t("Ver checklist", "View checklist")}
              </button>
            ) : null}
            {onManageVisits ? (
              <button className="btn btn-outline-primary" type="button" onClick={onManageVisits}>
                {t("Visitas", "Visits")}
              </button>
            ) : null}
            {onEditClosure ? (
              <button className="btn btn-primary" type="button" onClick={onEditClosure}>
                {t("Editar cierre", "Edit closure")}
              </button>
            ) : null}
            {onReopen ? (
              <button className="btn btn-outline-warning" type="button" onClick={onReopen}>
                {t("Reabrir", "Reopen")}
              </button>
            ) : null}
          </div>
        </PanelCard>
      </div>
    </div>
  ) : null;
}
