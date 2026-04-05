import { useEffect, useMemo, useState } from "react";
import { PanelCard } from "../../../../../../components/common/PanelCard";
import { ErrorState } from "../../../../../../components/feedback/ErrorState";
import { LoadingBlock } from "../../../../../../components/feedback/LoadingBlock";
import { AppBadge } from "../../../../../../design-system/AppBadge";
import { getApiErrorDisplayMessage } from "../../../../../../services/api";
import { formatDateTimeInTimeZone } from "../../../../../../utils/dateTimeLocal";
import { stripLegacyVisibleText } from "../../../../../../utils/legacyVisibleText";
import type { ApiError } from "../../../../../../types";
import {
  getTenantMaintenanceFieldReport,
  type TenantMaintenanceFieldReport,
} from "../../services/fieldReportsService";
import {
  getTenantMaintenanceWorkOrders,
  type TenantMaintenanceWorkOrder,
} from "../../services/workOrdersService";

type InstallationRecordInstallation = {
  id: number;
  name: string;
  serial_number: string | null;
  manufacturer: string | null;
  model: string | null;
  installed_at: string | null;
  last_service_at: string | null;
  warranty_until: string | null;
  installation_status: string;
  location_note: string | null;
  technical_notes: string | null;
};

type Props = {
  accessToken?: string | null;
  installation: InstallationRecordInstallation | null;
  clientLabel: string;
  siteLabel: string;
  equipmentTypeLabel: string;
  effectiveTimeZone?: string | null;
  isOpen: boolean;
  language: "es" | "en";
  onClose: () => void;
};

function formatDateTime(value: string | null, language: "es" | "en", timeZone?: string | null) {
  if (!value) {
    return language === "es" ? "sin fecha" : "no date";
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
      return language === "es" ? "Programada" : "Scheduled";
    case "in_progress":
      return language === "es" ? "En curso" : "In progress";
    case "completed":
      return language === "es" ? "Completada" : "Completed";
    case "cancelled":
      return language === "es" ? "Anulada" : "Cancelled";
    default:
      return status;
  }
}

function toTimestamp(value: string | null | undefined): number {
  if (!value) {
    return 0;
  }
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

export function MaintenanceInstallationTechnicalRecordModal({
  accessToken,
  installation,
  clientLabel,
  siteLabel,
  equipmentTypeLabel,
  effectiveTimeZone,
  isOpen,
  language,
  onClose,
}: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [workOrders, setWorkOrders] = useState<TenantMaintenanceWorkOrder[]>([]);
  const [latestFieldReport, setLatestFieldReport] =
    useState<TenantMaintenanceFieldReport | null>(null);

  useEffect(() => {
    async function loadRecord() {
      if (!isOpen || !installation || !accessToken) {
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const workOrdersResponse = await getTenantMaintenanceWorkOrders(accessToken, {
          installationId: installation.id,
        });
        const orders = workOrdersResponse.data;
        setWorkOrders(orders);

        const latestClosedOrder = [...orders]
          .filter(
            (item) =>
              item.maintenance_status === "completed" || item.maintenance_status === "cancelled"
          )
          .sort(
            (left, right) =>
              toTimestamp(right.completed_at || right.cancelled_at || right.updated_at) -
              toTimestamp(left.completed_at || left.cancelled_at || left.updated_at)
          )[0];

        if (latestClosedOrder) {
          const fieldReportResponse = await getTenantMaintenanceFieldReport(
            accessToken,
            latestClosedOrder.id
          );
          setLatestFieldReport(fieldReportResponse.data);
        } else {
          setLatestFieldReport(null);
        }
      } catch (rawError) {
        setError(rawError as ApiError);
      } finally {
        setIsLoading(false);
      }
    }

    void loadRecord();
  }, [accessToken, installation, isOpen]);

  const activeOrders = useMemo(
    () =>
      workOrders.filter(
        (item) => item.maintenance_status === "scheduled" || item.maintenance_status === "in_progress"
      ),
    [workOrders]
  );

  const completedOrders = useMemo(
    () => workOrders.filter((item) => item.maintenance_status === "completed"),
    [workOrders]
  );

  const cancelledOrders = useMemo(
    () => workOrders.filter((item) => item.maintenance_status === "cancelled"),
    [workOrders]
  );

  const nextScheduledOrder = useMemo(
    () =>
      [...activeOrders]
        .filter((item) => item.scheduled_for)
        .sort((left, right) => toTimestamp(left.scheduled_for) - toTimestamp(right.scheduled_for))[0] ||
      null,
    [activeOrders]
  );

  const latestClosedOrder = useMemo(
    () =>
      [...workOrders]
        .filter(
          (item) => item.maintenance_status === "completed" || item.maintenance_status === "cancelled"
        )
        .sort(
          (left, right) =>
            toTimestamp(right.completed_at || right.cancelled_at || right.updated_at) -
            toTimestamp(left.completed_at || left.cancelled_at || left.updated_at)
        )[0] || null,
    [workOrders]
  );

  const checklistCompletedCount = useMemo(
    () => latestFieldReport?.checklist_items.filter((item) => item.is_completed).length ?? 0,
    [latestFieldReport]
  );

  const recentOrders = useMemo(() => workOrders.slice(0, 5), [workOrders]);

  if (!isOpen || !installation) {
    return null;
  }

  return (
    <div className="maintenance-form-backdrop" role="presentation" onClick={onClose}>
      <div
        className="maintenance-form-modal maintenance-form-modal--wide"
        role="dialog"
        aria-modal="true"
        aria-label={
          language === "es" ? "Expediente técnico de instalación" : "Installation technical record"
        }
        onClick={(event) => event.stopPropagation()}
      >
        <div className="maintenance-form-modal__eyebrow">
          {language === "es" ? "Instalaciones" : "Installations"}
        </div>
        <PanelCard
          title={language === "es" ? "Puente con expediente técnico" : "Technical record bridge"}
          subtitle={
            language === "es"
              ? "Vista consolidada de instalación, últimas mantenciones y cierre técnico reciente sin abrir todavía un módulo documental separado."
              : "Consolidated view of the installation, recent maintenance and latest technical closure without opening a separate documentation module yet."
          }
        >
          <div className="maintenance-history-entry__meta mb-3">
            <strong>{installation.name}</strong>
            {` · ${clientLabel} · ${siteLabel} · ${equipmentTypeLabel}`}
          </div>

          {error ? (
            <ErrorState
              title={
                language === "es"
                  ? "No se pudo cargar el expediente"
                  : "The technical record could not be loaded"
              }
              detail={getApiErrorDisplayMessage(error)}
              requestId={error.payload?.request_id}
            />
          ) : isLoading ? (
            <LoadingBlock label={language === "es" ? "Cargando expediente..." : "Loading record..."} />
          ) : (
            <div className="d-grid gap-3">
              <div className="row g-3">
                <div className="col-6 col-lg-3">
                  <div className="maintenance-history-entry">
                    <div className="maintenance-history-entry__title">
                      {language === "es" ? "Mantenciones" : "Work orders"}
                    </div>
                    <div className="maintenance-history-entry__meta">{workOrders.length}</div>
                  </div>
                </div>
                <div className="col-6 col-lg-3">
                  <div className="maintenance-history-entry">
                    <div className="maintenance-history-entry__title">
                      {language === "es" ? "Abiertas" : "Open"}
                    </div>
                    <div className="maintenance-history-entry__meta">{activeOrders.length}</div>
                  </div>
                </div>
                <div className="col-6 col-lg-3">
                  <div className="maintenance-history-entry">
                    <div className="maintenance-history-entry__title">
                      {language === "es" ? "Completadas" : "Completed"}
                    </div>
                    <div className="maintenance-history-entry__meta">{completedOrders.length}</div>
                  </div>
                </div>
                <div className="col-6 col-lg-3">
                  <div className="maintenance-history-entry">
                    <div className="maintenance-history-entry__title">
                      {language === "es" ? "Anuladas" : "Cancelled"}
                    </div>
                    <div className="maintenance-history-entry__meta">{cancelledOrders.length}</div>
                  </div>
                </div>
              </div>

              <div className="row g-3">
                <div className="col-12 col-lg-6">
                  <div className="panel-card border-0 bg-light-subtle h-100">
                    <div className="panel-card__header pb-2">
                      <div>
                        <h3 className="panel-card__title mb-1">
                          {language === "es" ? "Snapshot de instalación" : "Installation snapshot"}
                        </h3>
                        <p className="panel-card__subtitle mb-0">
                          {language === "es"
                            ? "Base técnica mínima antes de abrir un expediente documental completo."
                            : "Minimum technical base before opening a full document dossier."}
                        </p>
                      </div>
                    </div>
                    <div className="panel-card__body pt-0 d-grid gap-2">
                      <div className="maintenance-history-entry__meta">
                        {language === "es" ? "Serie" : "Serial"}: {installation.serial_number || "—"}
                      </div>
                      <div className="maintenance-history-entry__meta">
                        {language === "es" ? "Fabricante / modelo" : "Manufacturer / model"}: {installation.manufacturer || "—"} / {installation.model || "—"}
                      </div>
                      <div className="maintenance-history-entry__meta">
                        {language === "es" ? "Instalada" : "Installed"}: {formatDateTime(installation.installed_at, language, effectiveTimeZone)}
                      </div>
                      <div className="maintenance-history-entry__meta">
                        {language === "es" ? "Último servicio" : "Last service"}: {formatDateTime(installation.last_service_at, language, effectiveTimeZone)}
                      </div>
                      <div className="maintenance-history-entry__meta">
                        {language === "es" ? "Garantía" : "Warranty"}: {formatDateTime(installation.warranty_until, language, effectiveTimeZone)}
                      </div>
                      <div className="maintenance-history-entry__meta">
                        {language === "es" ? "Estado técnico" : "Technical status"}: {installation.installation_status}
                      </div>
                      <div className="maintenance-history-entry__meta">
                        {language === "es" ? "Ubicación" : "Location"}: {stripLegacyVisibleText(installation.location_note) || "—"}
                      </div>
                      <div className="maintenance-history-entry__meta">
                        {language === "es" ? "Notas técnicas" : "Technical notes"}: {stripLegacyVisibleText(installation.technical_notes) || "—"}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-12 col-lg-6">
                  <div className="panel-card border-0 bg-light-subtle h-100">
                    <div className="panel-card__header pb-2">
                      <div>
                        <h3 className="panel-card__title mb-1">
                          {language === "es" ? "Cierre técnico reciente" : "Latest technical closure"}
                        </h3>
                        <p className="panel-card__subtitle mb-0">
                          {language === "es"
                            ? "Reutiliza checklist y evidencias de la última OT cerrada como puente con expediente."
                            : "Reuses the latest closed work order checklist and evidence as a bridge with the technical record."}
                        </p>
                      </div>
                    </div>
                    <div className="panel-card__body pt-0 d-grid gap-2">
                      <div className="maintenance-history-entry__meta">
                        {language === "es" ? "Último cierre" : "Latest closure"}: {formatDateTime(latestClosedOrder?.completed_at || latestClosedOrder?.cancelled_at || null, language, effectiveTimeZone)}
                      </div>
                      <div className="maintenance-history-entry__meta">
                        {language === "es" ? "OT base" : "Base work order"}: {latestClosedOrder?.title || "—"}
                      </div>
                      <div className="maintenance-history-entry__meta">
                        {language === "es" ? "Checklist" : "Checklist"}: {latestFieldReport ? `${checklistCompletedCount}/${latestFieldReport.checklist_items.length}` : "—"}
                      </div>
                      <div className="maintenance-history-entry__meta">
                        {language === "es" ? "Evidencias" : "Evidence"}: {latestFieldReport?.evidences.length ?? 0}
                      </div>
                      <div className="maintenance-history-entry__meta">
                        {language === "es" ? "Observación de cierre" : "Closure note"}: {stripLegacyVisibleText(latestFieldReport?.closure_notes) || stripLegacyVisibleText(latestClosedOrder?.closure_notes) || "—"}
                      </div>
                      {!latestClosedOrder ? (
                        <div className="maintenance-history-entry__meta">
                          {language === "es"
                            ? "Aún no existe una mantención cerrada para usar como expediente base."
                            : "There is no closed maintenance order yet to use as a base record."}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              <div className="row g-3">
                <div className="col-12 col-lg-5">
                  <div className="panel-card border-0 bg-light-subtle h-100">
                    <div className="panel-card__header pb-2">
                      <div>
                        <h3 className="panel-card__title mb-1">
                          {language === "es" ? "Próxima atención" : "Next attention"}
                        </h3>
                      </div>
                    </div>
                    <div className="panel-card__body pt-0 d-grid gap-2">
                      {nextScheduledOrder ? (
                        <>
                          <div className="maintenance-history-entry__title">{nextScheduledOrder.title}</div>
                          <div className="maintenance-history-entry__meta">
                            {formatDateTime(nextScheduledOrder.scheduled_for, language, effectiveTimeZone)}
                          </div>
                          <div>
                            <AppBadge tone={getStatusTone(nextScheduledOrder.maintenance_status)}>
                              {getStatusLabel(nextScheduledOrder.maintenance_status, language)}
                            </AppBadge>
                          </div>
                        </>
                      ) : (
                        <div className="maintenance-history-entry__meta">
                          {language === "es" ? "Sin visita u OT abierta programada." : "No open scheduled visit or work order."}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="col-12 col-lg-7">
                  <div className="panel-card border-0 bg-light-subtle h-100">
                    <div className="panel-card__header pb-2">
                      <div>
                        <h3 className="panel-card__title mb-1">
                          {language === "es" ? "Últimas mantenciones" : "Recent work orders"}
                        </h3>
                      </div>
                    </div>
                    <div className="panel-card__body pt-0 d-grid gap-2">
                      {recentOrders.length ? (
                        recentOrders.map((item) => (
                          <div key={item.id} className="maintenance-history-entry">
                            <div className="d-flex flex-wrap justify-content-between gap-2 align-items-start">
                              <div>
                                <div className="maintenance-history-entry__title">{item.title}</div>
                                <div className="maintenance-history-entry__meta">
                                  {formatDateTime(
                                    item.scheduled_for || item.completed_at || item.cancelled_at || item.requested_at,
                                    language,
                                    effectiveTimeZone
                                  )}
                                </div>
                                <div className="maintenance-history-entry__meta">
                                  {stripLegacyVisibleText(item.description) || "—"}
                                </div>
                              </div>
                              <AppBadge tone={getStatusTone(item.maintenance_status)}>
                                {getStatusLabel(item.maintenance_status, language)}
                              </AppBadge>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="maintenance-history-entry__meta">
                          {language === "es" ? "Aún no hay mantenciones registradas para esta instalación." : "There are no work orders recorded for this installation yet."}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="maintenance-form__actions mt-4">
            <button className="btn btn-outline-secondary" type="button" onClick={onClose}>
              {language === "es" ? "Cerrar" : "Close"}
            </button>
          </div>
        </PanelCard>
      </div>
    </div>
  );
}