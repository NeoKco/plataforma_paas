import { formatDateTimeInTimeZone } from "../../../../../../utils/dateTimeLocal";
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
    return language === "es" ? "sin ventana" : "no window";
  }
  if (!start) {
    return formatDateTimeInTimeZone(end as string, language, timeZone);
  }
  const startLabel = formatDateTimeInTimeZone(start, language, timeZone);
  return end ? `${startLabel} → ${formatDateTimeInTimeZone(end, language, timeZone)}` : startLabel;
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

  return (
    <div className="panel-card border-0 bg-light-subtle">
      <div className="panel-card__header pb-2">
        <h3 className="panel-card__title mb-0">
          {language === "es" ? "Impacto sobre visitas" : "Visit impact"}
        </h3>
      </div>
      <div className="panel-card__body pt-0 d-grid gap-2">
        {isLoading ? (
          <div className="maintenance-history-entry__meta">
            {language === "es"
              ? "Cargando ventanas de terreno asociadas..."
              : "Loading linked field windows..."}
          </div>
        ) : summary.total === 0 ? (
          <div className="maintenance-history-entry__meta">
            {language === "es"
              ? "Esta OT aún no tiene visitas registradas; la reprogramación solo moverá la orden principal."
              : "This work order does not have recorded visits yet; rescheduling will only move the main work order."}
          </div>
        ) : (
          <>
            <div className="maintenance-history-entry__meta">
              {summary.total} {language === "es" ? "visita(s) total(es)" : "total visit(s)"} · {summary.openCount}{" "}
              {language === "es" ? "abierta(s)" : "open"} · {summary.completedCount}{" "}
              {language === "es" ? "completada(s)" : "completed"}
            </div>
            <div className="maintenance-history-entry__meta">
              {language === "es" ? "Próxima ventana" : "Next window"}: {summary.nextVisit
                ? formatDateRange(
                    summary.nextVisit.scheduled_start_at,
                    summary.nextVisit.scheduled_end_at,
                    language,
                    effectiveTimeZone
                  )
                : language === "es"
                  ? "Sin visitas abiertas"
                  : "No open visits"}
            </div>
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
                  {language === "es"
                    ? "Mover también la primera visita abierta al nuevo horario y responsables de la OT."
                    : "Also move the first open visit to the new work order time slot and assignees."}
                </label>
              </div>
            ) : null}
            {summary.openCount > 1 ? (
              <div className="maintenance-history-entry__meta text-warning">
                {language === "es"
                  ? "La sincronización automática solo ajusta la primera visita abierta; las demás quedan para coordinación fina en Visitas."
                  : "Automatic sync only adjusts the first open visit; the rest remain for fine coordination in Visits."}
              </div>
            ) : null}
            {!scheduledFor ? (
              <div className="maintenance-history-entry__meta text-warning">
                {language === "es"
                  ? "Define primero la nueva fecha/hora de la OT para habilitar la sincronización automática." 
                  : "Set the new work order date/time first to enable automatic sync."}
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}