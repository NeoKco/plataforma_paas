import { formatDateTimeInTimeZone } from "../../../../../../utils/dateTimeLocal";
import { pickLocalizedText } from "../../../../../../store/language-context";
import type { RescheduleVisitSummary } from "../../services/rescheduleVisitSync";

type Props = {
  effectiveTimeZone?: string | null;
  isLoading: boolean;
  language: "es" | "en";
  scheduledFor: string | null;
  summary: RescheduleVisitSummary;
  syncEnabled: boolean;
  onSyncEnabledChange: (value: boolean) => void;
};

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
    return formatDateTimeInTimeZone(end as string, language, timeZone);
  }
  const startLabel = formatDateTimeInTimeZone(start, language, timeZone);
  return end ? `${startLabel} → ${formatDateTimeInTimeZone(end, language, timeZone)}` : startLabel;
}

function toTimestamp(value: string | null | undefined): number | null {
  if (!value) {
    return null;
  }
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

function buildProjectedDateRange(
  start: string | null,
  end: string | null,
  nextStart: string | null,
  language: "es" | "en",
  timeZone?: string | null
) {
  if (!nextStart) {
    return pickLocalizedText(language, {
      es: "define primero la nueva OT",
      en: "set the new work order first",
    });
  }
  if (!start || !end) {
    return formatDateRange(nextStart, null, language, timeZone);
  }
  const startTimestamp = toTimestamp(start);
  const endTimestamp = toTimestamp(end);
  const nextStartTimestamp = toTimestamp(nextStart);
  if (
    startTimestamp === null ||
    endTimestamp === null ||
    nextStartTimestamp === null ||
    endTimestamp < startTimestamp
  ) {
    return formatDateRange(nextStart, null, language, timeZone);
  }
  const shiftedEnd = new Date(nextStartTimestamp + (endTimestamp - startTimestamp)).toISOString();
  return formatDateRange(nextStart, shiftedEnd, language, timeZone);
}

export function MaintenanceRescheduleVisitSyncPanel({
  effectiveTimeZone,
  isLoading,
  language,
  scheduledFor,
  summary,
  syncEnabled,
  onSyncEnabledChange,
}: Props) {
  const syncDisabled = !scheduledFor || !summary.syncCandidate;
  const t = (es: string, en: string) => pickLocalizedText(language, { es, en });

  return (
    <div className="panel-card border-0 bg-light-subtle">
      <div className="panel-card__header pb-2">
        <h3 className="panel-card__title mb-0">
          {t("Impacto sobre visitas", "Visit impact")}
        </h3>
      </div>
      <div className="panel-card__body pt-0 d-grid gap-2">
        {isLoading ? (
          <div className="maintenance-history-entry__meta">
            {t("Cargando ventanas de terreno asociadas...", "Loading linked field windows...")}
          </div>
        ) : summary.total === 0 ? (
          <div className="maintenance-history-entry__meta">
            {t(
              "Esta OT aún no tiene visitas registradas; la reprogramación solo moverá la orden principal.",
              "This work order does not have recorded visits yet; rescheduling will only move the main work order."
            )}
          </div>
        ) : (
          <>
            <div className="maintenance-history-entry__meta">
              {summary.total} {t("visita(s) total(es)", "total visit(s)")} · {summary.openCount}{" "}
              {t("abierta(s)", "open")} · {summary.completedCount} {t("completada(s)", "completed")}
            </div>
            <div className="maintenance-history-entry__meta">
              {t("Próxima ventana", "Next window")}: {summary.nextVisit
                ? formatDateRange(
                    summary.nextVisit.scheduled_start_at,
                    summary.nextVisit.scheduled_end_at,
                    language,
                    effectiveTimeZone
                  )
                : t("Sin visitas abiertas", "No open visits")}
            </div>
            {summary.syncCandidate ? (
              <div className="maintenance-history-entry">
                <div className="maintenance-history-entry__title">
                  {t("Ventana a sincronizar", "Window to sync")}
                </div>
                <div className="maintenance-history-entry__meta">
                  {t("Actual", "Current")}: {formatDateRange(
                    summary.syncCandidate.scheduled_start_at,
                    summary.syncCandidate.scheduled_end_at,
                    language,
                    effectiveTimeZone
                  )}
                </div>
                <div className="maintenance-history-entry__meta">
                  {t("Propuesta al reprogramar", "Proposed after reschedule")}: {buildProjectedDateRange(
                    summary.syncCandidate.scheduled_start_at,
                    summary.syncCandidate.scheduled_end_at,
                    scheduledFor,
                    language,
                    effectiveTimeZone
                  )}
                </div>
              </div>
            ) : null}
            {summary.syncCandidate ? (
              <div className="form-check mt-1">
                <input
                  checked={syncEnabled}
                  className="form-check-input"
                  disabled={syncDisabled}
                  id="maintenance-sync-open-visit"
                  onChange={(event) => onSyncEnabledChange(event.target.checked)}
                  type="checkbox"
                />
                <label className="form-check-label" htmlFor="maintenance-sync-open-visit">
                  {t(
                    "Mover también la primera visita abierta al nuevo horario y responsables de la OT.",
                    "Also move the first open visit to the new work order time slot and assignees."
                  )}
                </label>
              </div>
            ) : null}
            {summary.remainingOpenVisits.length > 0 ? (
              <div className="maintenance-history-entry">
                <div className="maintenance-history-entry__title">
                  {t("Visitas abiertas por coordinar", "Open visits pending coordination")}
                </div>
                <div className="maintenance-history-entry__meta text-warning mb-2">
                  {t(
                    "La sincronización automática solo ajusta la primera visita abierta; estas ventanas quedan para coordinación fina en Visitas.",
                    "Automatic sync only adjusts the first open visit; these windows remain for fine coordination in Visits."
                  )}
                </div>
                <div className="maintenance-reschedule-visit-list">
                  {summary.remainingOpenVisits.slice(0, 3).map((visit) => (
                    <div key={visit.id} className="maintenance-reschedule-visit-list__item">
                      <strong>#{visit.id}</strong>
                      <span>
                        {formatDateRange(
                          visit.scheduled_start_at,
                          visit.scheduled_end_at,
                          language,
                          effectiveTimeZone
                        )}
                      </span>
                    </div>
                  ))}
                </div>
                {summary.remainingOpenVisits.length > 3 ? (
                  <div className="maintenance-history-entry__meta mt-2">
                    {language === "es"
                      ? `+${summary.remainingOpenVisits.length - 3} visita(s) abierta(s) adicionales por revisar en Visitas.`
                      : `+${summary.remainingOpenVisits.length - 3} additional open visit(s) to review in Visits.`}
                  </div>
                ) : null}
              </div>
            ) : null}
            {!scheduledFor ? (
              <div className="maintenance-history-entry__meta text-warning">
                {t(
                  "Define primero la nueva fecha/hora de la OT para habilitar la sincronización automática.",
                  "Set the new work order date/time first to enable automatic sync."
                )}
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}