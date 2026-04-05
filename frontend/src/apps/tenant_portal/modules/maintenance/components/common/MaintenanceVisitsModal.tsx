import { useEffect, useMemo, useState } from "react";
import { PanelCard } from "../../../../../../components/common/PanelCard";
import { ErrorState } from "../../../../../../components/feedback/ErrorState";
import { LoadingBlock } from "../../../../../../components/feedback/LoadingBlock";
import { getApiErrorDisplayMessage } from "../../../../../../services/api";
import type { ApiError } from "../../../../../../types";
import { formatDateTimeInTimeZone } from "../../../../../../utils/dateTimeLocal";
import { stripLegacyVisibleText } from "../../../../../../utils/legacyVisibleText";
import {
  createTenantMaintenanceVisit,
  deleteTenantMaintenanceVisit,
  getTenantMaintenanceVisits,
  updateTenantMaintenanceVisit,
  type TenantMaintenanceVisit,
  type TenantMaintenanceVisitWriteRequest,
} from "../../services/visitsService";

type MaintenanceVisitsModalWorkOrder = {
  id: number;
  title: string;
  scheduled_for: string | null;
  assigned_work_group_id: number | null;
  assigned_tenant_user_id: number | null;
};

type WorkGroupOption = {
  id: number;
  name: string;
};

type TechnicianOption = {
  id: number;
  full_name: string;
};

type WorkGroupMembership = {
  group_id: number;
  tenant_user_id: number;
  function_profile_id?: number | null;
  function_profile_name?: string | null;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
};

type Props = {
  accessToken?: string | null;
  clientLabel: string;
  siteLabel: string;
  installationLabel: string;
  effectiveTimeZone?: string | null;
  isOpen: boolean;
  language: "es" | "en";
  onClose: () => void;
  onFeedback?: (message: string) => void;
  allowedFunctionProfileNames?: string[];
  requiresFunctionalProfile?: boolean;
  taskTypeLabel?: string | null;
  workGroups: WorkGroupOption[];
  workGroupMembers: WorkGroupMembership[];
  workOrder: MaintenanceVisitsModalWorkOrder | null;
  technicians: TechnicianOption[];
};

type VisitFormState = {
  visit_status: string;
  scheduled_start_at: string;
  scheduled_end_at: string;
  actual_start_at: string;
  actual_end_at: string;
  assigned_work_group_id: string;
  assigned_tenant_user_id: string;
  notes: string;
};

type VisitCoordinationSummary = {
  total: number;
  openCount: number;
  inProgressCount: number;
  completedCount: number;
  unassignedOpenCount: number;
  pendingWindowCount: number;
  nextOpenVisit: TenantMaintenanceVisit | null;
};

type VisitSequenceItem = {
  visit: TenantMaintenanceVisit;
  durationMinutes: number | null;
  gapFromPreviousMinutes: number | null;
  overlapsPrevious: boolean;
};

type VisitChainUpdate = {
  visit: TenantMaintenanceVisit;
  scheduled_start_at: string;
  scheduled_end_at: string;
};

type VisitChainPlan = {
  updates: VisitChainUpdate[];
  reason: "missing_window" | "missing_duration" | null;
};

function normalizeNullable(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function toTimestamp(value: string | null | undefined): number | null {
  if (!value) {
    return null;
  }
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

function toLocalInput(value: string | null | undefined): string {
  if (!value) {
    return "";
  }
  return value.replace(" ", "T").slice(0, 16);
}

function getCurrentLocalMinuteValue() {
  const value = new Date();
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  const hours = String(value.getHours()).padStart(2, "0");
  const minutes = String(value.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function toLocalMinuteValue(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  const hours = String(value.getHours()).padStart(2, "0");
  const minutes = String(value.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function shiftEndKeepingDuration(
  currentStart: string,
  currentEnd: string,
  nextStart: string
) {
  const currentStartTimestamp = toTimestamp(currentStart);
  const currentEndTimestamp = toTimestamp(currentEnd);
  const nextStartTimestamp = toTimestamp(nextStart);
  if (
    currentStartTimestamp === null ||
    currentEndTimestamp === null ||
    nextStartTimestamp === null ||
    currentEndTimestamp < currentStartTimestamp
  ) {
    return "";
  }
  return toLocalMinuteValue(new Date(nextStartTimestamp + (currentEndTimestamp - currentStartTimestamp)));
}

function formatDateTime(value: string | null, language: "es" | "en", timeZone?: string | null) {
  if (!value) {
    return language === "es" ? "sin fecha" : "no date";
  }
  return formatDateTimeInTimeZone(value, language, timeZone);
}

function getVisitStatusLabel(status: string, language: "es" | "en") {
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

function formatDurationMinutes(value: number | null, language: "es" | "en") {
  if (value === null || value < 0) {
    return language === "es" ? "duración no definida" : "duration not defined";
  }
  if (value < 60) {
    return language === "es" ? `${value} min` : `${value} min`;
  }
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  if (minutes === 0) {
    return language === "es" ? `${hours} h` : `${hours} h`;
  }
  return language === "es" ? `${hours} h ${minutes} min` : `${hours} h ${minutes} min`;
}

function buildVisitSequence(visits: TenantMaintenanceVisit[]): VisitSequenceItem[] {
  const orderedVisits = [...visits].sort((left, right) => {
    const leftTimestamp =
      toTimestamp(left.scheduled_start_at) ?? toTimestamp(left.created_at) ?? Number.POSITIVE_INFINITY;
    const rightTimestamp =
      toTimestamp(right.scheduled_start_at) ?? toTimestamp(right.created_at) ?? Number.POSITIVE_INFINITY;
    return leftTimestamp - rightTimestamp;
  });

  return orderedVisits.map((visit, index) => {
    const startTimestamp = toTimestamp(visit.scheduled_start_at);
    const endTimestamp = toTimestamp(visit.scheduled_end_at);
    const previousVisit = orderedVisits[index - 1];
    const previousEndTimestamp = toTimestamp(previousVisit?.scheduled_end_at);
    const durationMinutes =
      startTimestamp !== null && endTimestamp !== null && endTimestamp >= startTimestamp
        ? Math.round((endTimestamp - startTimestamp) / 60000)
        : null;

    return {
      visit,
      durationMinutes,
      gapFromPreviousMinutes:
        index > 0 && startTimestamp !== null && previousEndTimestamp !== null
          ? Math.round((startTimestamp - previousEndTimestamp) / 60000)
          : null,
      overlapsPrevious:
        index > 0 && startTimestamp !== null && previousEndTimestamp !== null
          ? startTimestamp < previousEndTimestamp
          : false,
    };
  });
}

function buildVisitChainPlan(
  visits: TenantMaintenanceVisit[],
  pivotVisitId: number | null,
  nextPivotStart: string | null,
  nextPivotEnd: string | null
): VisitChainPlan {
  if (!pivotVisitId || !nextPivotStart || !nextPivotEnd) {
    return { updates: [], reason: "missing_window" };
  }

  const scheduledVisits = [...visits]
    .filter((visit) => visit.visit_status === "scheduled")
    .sort((left, right) => {
      const leftTimestamp =
        toTimestamp(left.scheduled_start_at) ?? toTimestamp(left.created_at) ?? Number.POSITIVE_INFINITY;
      const rightTimestamp =
        toTimestamp(right.scheduled_start_at) ?? toTimestamp(right.created_at) ?? Number.POSITIVE_INFINITY;
      return leftTimestamp - rightTimestamp;
    });

  const pivotIndex = scheduledVisits.findIndex((visit) => visit.id === pivotVisitId);
  if (pivotIndex < 0) {
    return { updates: [], reason: null };
  }

  let previousOriginalEndTimestamp: number | null = toTimestamp(
    scheduledVisits[pivotIndex].scheduled_end_at
  );
  let previousShiftedEndTimestamp: number | null = toTimestamp(nextPivotEnd);
  if (previousOriginalEndTimestamp === null || previousShiftedEndTimestamp === null) {
    return { updates: [], reason: "missing_duration" };
  }

  const updates: VisitChainUpdate[] = [];
  for (const visit of scheduledVisits.slice(pivotIndex + 1)) {
    const startTimestamp = toTimestamp(visit.scheduled_start_at);
    const endTimestamp = toTimestamp(visit.scheduled_end_at);
    if (
      startTimestamp === null ||
      endTimestamp === null ||
      endTimestamp < startTimestamp ||
      previousOriginalEndTimestamp === null ||
      previousShiftedEndTimestamp === null
    ) {
      return { updates: [], reason: "missing_duration" };
    }

    const gap = Math.max(0, startTimestamp - previousOriginalEndTimestamp);
    const duration = endTimestamp - startTimestamp;
    const shiftedStart: number = previousShiftedEndTimestamp + gap;
    const shiftedEnd: number = shiftedStart + duration;
    updates.push({
      visit,
      scheduled_start_at: toLocalMinuteValue(new Date(shiftedStart)),
      scheduled_end_at: toLocalMinuteValue(new Date(shiftedEnd)),
    });
    previousOriginalEndTimestamp = endTimestamp;
    previousShiftedEndTimestamp = shiftedEnd;
  }

  return { updates, reason: null };
}

function isMembershipActive(member: WorkGroupMembership) {
  if (!member.is_active) {
    return false;
  }
  const now = new Date();
  if (member.starts_at && new Date(member.starts_at) > now) {
    return false;
  }
  if (member.ends_at && new Date(member.ends_at) < now) {
    return false;
  }
  return true;
}

function buildFormState(
  workOrder: MaintenanceVisitsModalWorkOrder,
  visit?: TenantMaintenanceVisit | null
): VisitFormState {
  return {
    visit_status: visit?.visit_status ?? "scheduled",
    scheduled_start_at: toLocalInput(visit?.scheduled_start_at ?? workOrder.scheduled_for),
    scheduled_end_at: toLocalInput(visit?.scheduled_end_at),
    actual_start_at: toLocalInput(visit?.actual_start_at),
    actual_end_at: toLocalInput(visit?.actual_end_at),
    assigned_work_group_id: String(
      visit?.assigned_work_group_id ?? workOrder.assigned_work_group_id ?? ""
    ),
    assigned_tenant_user_id: String(
      visit?.assigned_tenant_user_id ?? workOrder.assigned_tenant_user_id ?? ""
    ),
    notes: visit?.notes ?? "",
  };
}

function buildFollowUpFormState(
  workOrder: MaintenanceVisitsModalWorkOrder,
  visit: TenantMaintenanceVisit
): VisitFormState {
  const nextStart = toLocalInput(
    visit.scheduled_end_at ?? visit.scheduled_start_at ?? workOrder.scheduled_for
  );
  const nextEnd =
    visit.scheduled_start_at && visit.scheduled_end_at && nextStart
      ? shiftEndKeepingDuration(
          toLocalInput(visit.scheduled_start_at),
          toLocalInput(visit.scheduled_end_at),
          nextStart
        )
      : "";
  return {
    visit_status: "scheduled",
    scheduled_start_at: nextStart,
    scheduled_end_at: nextEnd,
    actual_start_at: "",
    actual_end_at: "",
    assigned_work_group_id: String(visit.assigned_work_group_id ?? workOrder.assigned_work_group_id ?? ""),
    assigned_tenant_user_id: String(visit.assigned_tenant_user_id ?? workOrder.assigned_tenant_user_id ?? ""),
    notes: "",
  };
}

export function MaintenanceVisitsModal({
  accessToken,
  clientLabel,
  siteLabel,
  installationLabel,
  effectiveTimeZone,
  isOpen,
  language,
  onClose,
  onFeedback,
  allowedFunctionProfileNames = [],
  requiresFunctionalProfile = false,
  taskTypeLabel = null,
  workGroups,
  workGroupMembers,
  workOrder,
  technicians,
}: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [visits, setVisits] = useState<TenantMaintenanceVisit[]>([]);
  const [editingVisitId, setEditingVisitId] = useState<number | null>(null);
  const [form, setForm] = useState<VisitFormState | null>(null);
  const [alignFollowingScheduledVisits, setAlignFollowingScheduledVisits] = useState(false);

  const workGroupById = useMemo(
    () => new Map(workGroups.map((group) => [group.id, group.name])),
    [workGroups]
  );
  const technicianById = useMemo(
    () => new Map(technicians.map((item) => [item.id, item.full_name])),
    [technicians]
  );
  const selectableTechnicians = useMemo(() => {
    if (!form?.assigned_work_group_id) {
      return technicians;
    }
    const selectedGroupId = Number(form.assigned_work_group_id);
    const allowedIds = new Set(
      workGroupMembers
        .filter((member) => member.group_id === selectedGroupId && isMembershipActive(member))
        .filter(
          (member) =>
            !requiresFunctionalProfile ||
            (member.function_profile_name
              ? allowedFunctionProfileNames.length === 0 ||
                allowedFunctionProfileNames.some(
                  (item) => item.trim().toLowerCase() === member.function_profile_name?.trim().toLowerCase()
                )
              : false)
        )
        .map((member) => member.tenant_user_id)
    );
    return technicians.filter((item) => allowedIds.has(item.id));
  }, [
    allowedFunctionProfileNames,
    form?.assigned_work_group_id,
    requiresFunctionalProfile,
    technicians,
    workGroupMembers,
  ]);
  const coordinationSummary = useMemo<VisitCoordinationSummary>(() => {
    const openVisits = visits.filter(
      (visit) => visit.visit_status === "scheduled" || visit.visit_status === "in_progress"
    );
    const orderedOpenVisits = [...openVisits].sort((left, right) => {
      const leftTimestamp =
        toTimestamp(left.scheduled_start_at) ?? toTimestamp(left.created_at) ?? Number.POSITIVE_INFINITY;
      const rightTimestamp =
        toTimestamp(right.scheduled_start_at) ?? toTimestamp(right.created_at) ?? Number.POSITIVE_INFINITY;
      return leftTimestamp - rightTimestamp;
    });
    return {
      total: visits.length,
      openCount: openVisits.length,
      inProgressCount: visits.filter((visit) => visit.visit_status === "in_progress").length,
      completedCount: visits.filter((visit) => visit.visit_status === "completed").length,
      unassignedOpenCount: openVisits.filter(
        (visit) => !visit.assigned_work_group_id || !visit.assigned_tenant_user_id
      ).length,
      pendingWindowCount: openVisits.filter((visit) => !visit.scheduled_start_at).length,
      nextOpenVisit: orderedOpenVisits[0] ?? null,
    };
  }, [visits]);
  const visitSequence = useMemo(() => buildVisitSequence(visits), [visits]);
  const overlappingVisitCount = useMemo(
    () => visitSequence.filter((item) => item.overlapsPrevious).length,
    [visitSequence]
  );
  const visitChainPlan = useMemo(
    () =>
      buildVisitChainPlan(
        visits,
        editingVisitId,
        form?.scheduled_start_at || null,
        form?.scheduled_end_at || null
      ),
    [editingVisitId, form?.scheduled_end_at, form?.scheduled_start_at, visits]
  );

  function getTechnicianOptionLabel(userId: number): string {
    const baseLabel = technicianById.get(userId) || `#${userId}`;
    if (!form?.assigned_work_group_id) {
      return baseLabel;
    }
    const profileLabel = workGroupMembers.find(
      (member) =>
        member.group_id === Number(form.assigned_work_group_id) && member.tenant_user_id === userId
    )?.function_profile_name;
    return profileLabel ? `${baseLabel} · ${profileLabel}` : baseLabel;
  }

  async function loadVisits() {
    if (!accessToken || !workOrder) {
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await getTenantMaintenanceVisits(accessToken, { workOrderId: workOrder.id });
      setVisits(response.data);
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (!isOpen || !accessToken || !workOrder) {
      return;
    }
    setEditingVisitId(null);
    setForm(null);
    void loadVisits();
  }, [accessToken, isOpen, workOrder]);

  function startCreate() {
    if (!workOrder) {
      return;
    }
    setEditingVisitId(null);
    setAlignFollowingScheduledVisits(false);
    setForm(buildFormState(workOrder));
    setError(null);
  }

  function startEdit(visit: TenantMaintenanceVisit) {
    if (!workOrder) {
      return;
    }
    setEditingVisitId(visit.id);
    setAlignFollowingScheduledVisits(false);
    setForm(buildFormState(workOrder, visit));
    setError(null);
  }

  function startFollowUpFromVisit(visit: TenantMaintenanceVisit) {
    if (!workOrder) {
      return;
    }
    setEditingVisitId(null);
    setForm(buildFollowUpFormState(workOrder, visit));
    setError(null);
  }

  function resetForm() {
    setEditingVisitId(null);
    setAlignFollowingScheduledVisits(false);
    setForm(null);
  }

  function applyWorkOrderWindowPreset() {
    if (!workOrder?.scheduled_for) {
      return;
    }
    setForm((current) => {
      if (!current) {
        return current;
      }
      return {
        ...current,
        scheduled_start_at: toLocalInput(workOrder.scheduled_for),
        scheduled_end_at:
          current.scheduled_start_at && current.scheduled_end_at
            ? shiftEndKeepingDuration(
                current.scheduled_start_at,
                current.scheduled_end_at,
                toLocalInput(workOrder.scheduled_for)
              )
            : current.scheduled_end_at,
      };
    });
  }

  function applyWorkOrderAssigneePreset() {
    setForm((current) =>
      current
        ? {
            ...current,
            assigned_work_group_id: String(workOrder?.assigned_work_group_id ?? ""),
            assigned_tenant_user_id: String(workOrder?.assigned_tenant_user_id ?? ""),
          }
        : current
    );
  }

  function markVisitInProgressNow() {
    const now = getCurrentLocalMinuteValue();
    setForm((current) =>
      current
        ? {
            ...current,
            visit_status: "in_progress",
            actual_start_at: current.actual_start_at || now,
          }
        : current
    );
  }

  function markVisitCompletedNow() {
    const now = getCurrentLocalMinuteValue();
    setForm((current) =>
      current
        ? {
            ...current,
            visit_status: "completed",
            actual_start_at: current.actual_start_at || now,
            actual_end_at: now,
          }
        : current
    );
  }

  async function handleSubmit() {
    if (!accessToken || !workOrder || !form) {
      return;
    }
    setIsSubmitting(true);
    setError(null);
    const payload: TenantMaintenanceVisitWriteRequest = {
      work_order_id: workOrder.id,
      visit_status: form.visit_status,
      scheduled_start_at: normalizeNullable(form.scheduled_start_at),
      scheduled_end_at: normalizeNullable(form.scheduled_end_at),
      actual_start_at: normalizeNullable(form.actual_start_at),
      actual_end_at: normalizeNullable(form.actual_end_at),
      assigned_work_group_id: form.assigned_work_group_id
        ? Number(form.assigned_work_group_id)
        : null,
      assigned_tenant_user_id: form.assigned_tenant_user_id
        ? Number(form.assigned_tenant_user_id)
        : null,
      assigned_group_label: null,
      notes: normalizeNullable(form.notes),
    };
    try {
      let chainedUpdatesApplied = 0;
      if (editingVisitId) {
        await updateTenantMaintenanceVisit(accessToken, editingVisitId, payload);
        if (alignFollowingScheduledVisits && visitChainPlan.updates.length > 0) {
          for (const update of visitChainPlan.updates) {
            await updateTenantMaintenanceVisit(accessToken, update.visit.id, {
              work_order_id: update.visit.work_order_id,
              visit_status: update.visit.visit_status,
              scheduled_start_at: update.scheduled_start_at,
              scheduled_end_at: update.scheduled_end_at,
              actual_start_at: update.visit.actual_start_at,
              actual_end_at: update.visit.actual_end_at,
              assigned_work_group_id: update.visit.assigned_work_group_id,
              assigned_tenant_user_id: update.visit.assigned_tenant_user_id,
              assigned_group_label: update.visit.assigned_group_label,
              notes: update.visit.notes,
            });
          }
          chainedUpdatesApplied = visitChainPlan.updates.length;
        }
        onFeedback?.(
          chainedUpdatesApplied > 0
            ? language === "es"
              ? `Visita actualizada correctamente. También se reencadenaron ${chainedUpdatesApplied} visita(s) programada(s).`
              : `Visit updated successfully. ${chainedUpdatesApplied} scheduled visit(s) were also realigned.`
            : language === "es"
              ? "Visita actualizada correctamente."
              : "Visit updated successfully."
        );
      } else {
        await createTenantMaintenanceVisit(accessToken, payload);
        onFeedback?.(
          language === "es" ? "Visita creada correctamente." : "Visit created successfully."
        );
      }
      resetForm();
      await loadVisits();
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(visit: TenantMaintenanceVisit) {
    if (!accessToken) {
      return;
    }
    const confirmed = window.confirm(
      language === "es"
        ? "¿Eliminar esta visita programada?"
        : "Delete this scheduled visit?"
    );
    if (!confirmed) {
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await deleteTenantMaintenanceVisit(accessToken, visit.id);
      onFeedback?.(
        language === "es" ? "Visita eliminada correctamente." : "Visit deleted successfully."
      );
      if (editingVisitId === visit.id) {
        resetForm();
      }
      await loadVisits();
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsSubmitting(false);
    }
  }

  return isOpen && workOrder ? (
    <div className="maintenance-form-backdrop" role="presentation" onClick={onClose}>
      <div
        className="maintenance-form-modal maintenance-form-modal--wide"
        role="dialog"
        aria-modal="true"
        aria-label={language === "es" ? "Visitas de mantención" : "Maintenance visits"}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="maintenance-form-modal__eyebrow">
          {language === "es" ? "Ventanas y visitas" : "Visit windows"}
        </div>
        <PanelCard
          title={language === "es" ? "Visitas de mantención" : "Maintenance visits"}
          subtitle={
            language === "es"
              ? "Programa ventanas de terreno, responsables y notas operativas sin perder la OT principal."
              : "Schedule field windows, assignees, and operational notes without changing the main work order."
          }
        >
          <div className="d-flex flex-wrap justify-content-between gap-3 align-items-start mb-3">
            <div>
              <div className="maintenance-history-entry__title">
                {stripLegacyVisibleText(workOrder.title) || "—"}
              </div>
              <div className="maintenance-history-entry__meta">{clientLabel}</div>
              <div className="maintenance-history-entry__meta">{siteLabel}</div>
              <div className="maintenance-history-entry__meta">{installationLabel}</div>
            </div>
            <button className="btn btn-primary" type="button" onClick={startCreate}>
              {language === "es" ? "Nueva visita" : "New visit"}
            </button>
          </div>

          {error ? (
            <ErrorState
              title={language === "es" ? "No se pudieron gestionar las visitas" : "Visits could not be managed"}
              detail={getApiErrorDisplayMessage(error)}
              requestId={error.payload?.request_id}
            />
          ) : null}

          <div className="maintenance-visit-summary mb-3">
            <div className="maintenance-visit-summary__header">
              <div>
                <div className="maintenance-history-entry__title">
                  {language === "es" ? "Coordinación operativa" : "Operational coordination"}
                </div>
                <div className="maintenance-history-entry__meta">
                  {language === "es"
                    ? "Lectura rápida de visitas abiertas, responsables pendientes y próxima ventana de terreno."
                    : "Quick view of open visits, pending assignees, and the next field window."}
                </div>
              </div>
            </div>
            <div className="maintenance-visit-summary__grid">
              <div className="maintenance-visit-summary__metric">
                <strong>{coordinationSummary.openCount}</strong>
                <span>{language === "es" ? "abiertas" : "open"}</span>
              </div>
              <div className="maintenance-visit-summary__metric">
                <strong>{coordinationSummary.inProgressCount}</strong>
                <span>{language === "es" ? "en curso" : "in progress"}</span>
              </div>
              <div className="maintenance-visit-summary__metric">
                <strong>{coordinationSummary.completedCount}</strong>
                <span>{language === "es" ? "completadas" : "completed"}</span>
              </div>
              <div className="maintenance-visit-summary__metric">
                <strong>{coordinationSummary.unassignedOpenCount}</strong>
                <span>{language === "es" ? "sin responsable" : "unassigned"}</span>
              </div>
            </div>
            <div className="maintenance-visit-summary__details">
              <div className="maintenance-history-entry__meta">
                {language === "es" ? "Próxima visita abierta" : "Next open visit"}: {coordinationSummary.nextOpenVisit
                  ? formatDateTime(
                      coordinationSummary.nextOpenVisit.scheduled_start_at,
                      language,
                      effectiveTimeZone
                    )
                  : language === "es"
                    ? "sin visitas abiertas"
                    : "no open visits"}
              </div>
              {coordinationSummary.unassignedOpenCount > 0 ? (
                <div className="maintenance-history-entry__meta text-warning">
                  {language === "es"
                    ? `${coordinationSummary.unassignedOpenCount} visita(s) abierta(s) siguen sin grupo o técnico asignado.`
                    : `${coordinationSummary.unassignedOpenCount} open visit(s) still have no group or technician assigned.`}
                </div>
              ) : null}
              {coordinationSummary.pendingWindowCount > 0 ? (
                <div className="maintenance-history-entry__meta text-warning">
                  {language === "es"
                    ? `${coordinationSummary.pendingWindowCount} visita(s) abierta(s) siguen sin ventana programada.`
                    : `${coordinationSummary.pendingWindowCount} open visit(s) still have no scheduled window.`}
                </div>
              ) : null}
            </div>
          </div>

          <div className="maintenance-visit-sequence mb-3">
            <div className="maintenance-visit-sequence__header">
              <div>
                <div className="maintenance-history-entry__title">
                  {language === "es" ? "Secuencia de terreno" : "Field sequence"}
                </div>
                <div className="maintenance-history-entry__meta">
                  {language === "es"
                    ? "Ordena las ventanas ya registradas y ayuda a preparar visitas de seguimiento sin reconstruir responsables ni duración desde cero."
                    : "Orders registered windows and helps prepare follow-up visits without rebuilding assignees or duration from scratch."}
                </div>
              </div>
            </div>
            {overlappingVisitCount > 0 ? (
              <div className="maintenance-history-entry__meta text-warning">
                {language === "es"
                  ? `${overlappingVisitCount} visita(s) se solapan con la ventana anterior y conviene revisarlas antes de salir a terreno.`
                  : `${overlappingVisitCount} visit(s) overlap the previous window and should be reviewed before going to the field.`}
              </div>
            ) : null}
            {visitSequence.length === 0 ? (
              <div className="maintenance-history-entry__meta">
                {language === "es"
                  ? "Aún no hay secuencia de visitas registrada para esta OT."
                  : "There is no recorded visit sequence for this work order yet."}
              </div>
            ) : (
              <div className="maintenance-visit-sequence__list">
                {visitSequence.map((item, index) => (
                  <div key={item.visit.id} className="maintenance-visit-sequence__item">
                    <div className="maintenance-visit-sequence__step">
                      <span className="maintenance-visit-sequence__index">{index + 1}</span>
                    </div>
                    <div className="maintenance-visit-sequence__content">
                      <div className="d-flex flex-wrap gap-2 align-items-center mb-1">
                        <div className="maintenance-history-entry__title">
                          {getVisitStatusLabel(item.visit.visit_status, language)}
                        </div>
                        {index === 0 ? (
                          <span className="maintenance-visit-sequence__badge">
                            {language === "es" ? "Primer tramo" : "First leg"}
                          </span>
                        ) : null}
                        {item.overlapsPrevious ? (
                          <span className="maintenance-visit-sequence__badge is-warning">
                            {language === "es" ? "Solapa" : "Overlap"}
                          </span>
                        ) : null}
                      </div>
                      <div className="maintenance-history-entry__meta">
                        {language === "es" ? "Ventana" : "Window"}: {formatDateTime(item.visit.scheduled_start_at, language, effectiveTimeZone)}
                        {item.visit.scheduled_end_at
                          ? ` → ${formatDateTime(item.visit.scheduled_end_at, language, effectiveTimeZone)}`
                          : ""}
                      </div>
                      <div className="maintenance-history-entry__meta">
                        {language === "es" ? "Duración" : "Duration"}: {formatDurationMinutes(
                          item.durationMinutes,
                          language
                        )}
                      </div>
                      {item.gapFromPreviousMinutes !== null ? (
                        <div className={`maintenance-history-entry__meta${item.overlapsPrevious ? " text-warning" : ""}`}>
                          {item.overlapsPrevious
                            ? language === "es"
                              ? `Se solapa ${Math.abs(item.gapFromPreviousMinutes)} min con la ventana anterior.`
                              : `It overlaps the previous window by ${Math.abs(item.gapFromPreviousMinutes)} min.`
                            : language === "es"
                              ? `Queda ${item.gapFromPreviousMinutes} min después de la visita anterior.`
                              : `It starts ${item.gapFromPreviousMinutes} min after the previous visit.`}
                        </div>
                      ) : null}
                    </div>
                    <div className="maintenance-visit-sequence__actions">
                      <button
                        className="btn btn-sm btn-outline-primary"
                        type="button"
                        onClick={() => startFollowUpFromVisit(item.visit)}
                      >
                        {language === "es" ? "Crear seguimiento" : "Create follow-up"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {form ? (
            <div className="panel-card border-0 bg-light-subtle mb-3">
              <div className="panel-card__header pb-2">
                <div>
                  <h3 className="panel-card__title mb-1">
                    {editingVisitId
                      ? language === "es"
                        ? "Editar visita"
                        : "Edit visit"
                      : language === "es"
                        ? "Nueva visita"
                        : "New visit"}
                  </h3>
                  <p className="panel-card__subtitle mb-0">
                    {language === "es"
                      ? "Usa atajos para copiar ventana/responsables de la OT o registrar rápidamente salida y cierre en terreno."
                      : "Use shortcuts to copy the work order window/assignees or quickly register field start and closure."}
                  </p>
                </div>
              </div>
              <div className="panel-card__body pt-0">
                <div className="maintenance-visit-quick-actions mb-3">
                  <div className="maintenance-visit-quick-actions__title">
                    {language === "es" ? "Atajos de coordinación" : "Coordination shortcuts"}
                  </div>
                  <div className="maintenance-visit-quick-actions__buttons">
                    <button
                      className="btn btn-sm btn-outline-primary"
                      type="button"
                      onClick={applyWorkOrderWindowPreset}
                      disabled={!workOrder?.scheduled_for}
                    >
                      {language === "es" ? "Usar ventana OT" : "Use work order window"}
                    </button>
                    <button className="btn btn-sm btn-outline-primary" type="button" onClick={applyWorkOrderAssigneePreset}>
                      {language === "es" ? "Copiar grupo/líder OT" : "Copy work order group/leader"}
                    </button>
                    <button className="btn btn-sm btn-outline-primary" type="button" onClick={markVisitInProgressNow}>
                      {language === "es" ? "Marcar salida ahora" : "Mark departure now"}
                    </button>
                    <button className="btn btn-sm btn-outline-primary" type="button" onClick={markVisitCompletedNow}>
                      {language === "es" ? "Cerrar ahora" : "Close now"}
                    </button>
                  </div>
                </div>
                {editingVisitId ? (
                  <div className="maintenance-visit-chain-panel mb-3">
                    <div className="maintenance-visit-chain-panel__title">
                      {language === "es" ? "Alinear siguientes visitas" : "Align following visits"}
                    </div>
                    <div className="maintenance-history-entry__meta">
                      {visitChainPlan.updates.length > 0
                        ? language === "es"
                          ? `Si cambias esta ventana, puedes reencadenar ${visitChainPlan.updates.length} visita(s) programada(s) posterior(es) preservando sus duraciones y separaciones.`
                          : `If you change this window, you can realign ${visitChainPlan.updates.length} following scheduled visit(s) while preserving their durations and gaps.`
                        : visitChainPlan.reason === "missing_window"
                          ? language === "es"
                            ? "Define inicio y fin programados para habilitar el reencadenamiento de visitas posteriores."
                            : "Set scheduled start and end to enable chaining of following visits."
                          : visitChainPlan.reason === "missing_duration"
                            ? language === "es"
                              ? "Las visitas programadas siguientes deben tener ventanas completas para recalcular la secuencia automáticamente."
                              : "Following scheduled visits need complete windows to recalculate the sequence automatically."
                            : language === "es"
                              ? "No hay visitas programadas posteriores para reencadenar desde esta ventana."
                              : "There are no following scheduled visits to realign from this window."}
                    </div>
                    {visitChainPlan.updates.length > 0 ? (
                      <>
                        <div className="maintenance-visit-chain-panel__preview">
                          {visitChainPlan.updates.slice(0, 3).map((update) => (
                            <div key={update.visit.id} className="maintenance-visit-chain-panel__item">
                              <strong>#{update.visit.id}</strong>
                              <span>
                                {formatDateTime(update.scheduled_start_at, language, effectiveTimeZone)}
                                {update.scheduled_end_at
                                  ? ` → ${formatDateTime(update.scheduled_end_at, language, effectiveTimeZone)}`
                                  : ""}
                              </span>
                            </div>
                          ))}
                        </div>
                        {visitChainPlan.updates.length > 3 ? (
                          <div className="maintenance-history-entry__meta">
                            {language === "es"
                              ? `+${visitChainPlan.updates.length - 3} visita(s) programada(s) adicional(es) se moverán en cadena.`
                              : `+${visitChainPlan.updates.length - 3} additional scheduled visit(s) will be shifted in sequence.`}
                          </div>
                        ) : null}
                        <div className="form-check mt-1">
                          <input
                            checked={alignFollowingScheduledVisits}
                            className="form-check-input"
                            id="maintenance-align-following-visits"
                            onChange={(event) => setAlignFollowingScheduledVisits(event.target.checked)}
                            type="checkbox"
                          />
                          <label className="form-check-label" htmlFor="maintenance-align-following-visits">
                            {language === "es"
                              ? "Reencadenar automáticamente las siguientes visitas programadas al guardar esta edición."
                              : "Automatically realign following scheduled visits when saving this edit."}
                          </label>
                        </div>
                      </>
                    ) : null}
                  </div>
                ) : null}
                <div className="row g-3">
                  <div className="col-12 col-md-6">
                    <label className="form-label">{language === "es" ? "Estado" : "Status"}</label>
                    <select
                      className="form-select"
                      value={form.visit_status}
                      onChange={(event) =>
                        setForm((current) =>
                          current
                            ? {
                                ...current,
                                visit_status: event.target.value,
                              }
                            : current
                        )
                      }
                    >
                      <option value="scheduled">{language === "es" ? "Programada" : "Scheduled"}</option>
                      <option value="in_progress">{language === "es" ? "En curso" : "In progress"}</option>
                      <option value="completed">{language === "es" ? "Completada" : "Completed"}</option>
                      <option value="cancelled">{language === "es" ? "Anulada" : "Cancelled"}</option>
                    </select>
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">
                      {language === "es" ? "Grupo/líder" : "Group/leader"}
                    </label>
                    <select
                      className="form-select"
                      value={form.assigned_work_group_id}
                      onChange={(event) =>
                        setForm((current) =>
                          current
                            ? {
                                ...current,
                                assigned_work_group_id: event.target.value,
                                assigned_tenant_user_id: "",
                              }
                            : current
                        )
                      }
                    >
                      <option value="">{language === "es" ? "Sin grupo" : "No group"}</option>
                      {workGroups.map((group) => (
                        <option key={group.id} value={group.id}>
                          {group.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">
                      {language === "es" ? "Inicio programado" : "Scheduled start"}
                    </label>
                    <input
                      className="form-control"
                      type="datetime-local"
                      value={form.scheduled_start_at}
                      onChange={(event) =>
                        setForm((current) =>
                          current
                            ? {
                                ...current,
                                scheduled_start_at: event.target.value,
                              }
                            : current
                        )
                      }
                    />
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">
                      {language === "es" ? "Fin programado" : "Scheduled end"}
                    </label>
                    <input
                      className="form-control"
                      type="datetime-local"
                      value={form.scheduled_end_at}
                      onChange={(event) =>
                        setForm((current) =>
                          current
                            ? {
                                ...current,
                                scheduled_end_at: event.target.value,
                              }
                            : current
                        )
                      }
                    />
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">
                      {language === "es" ? "Líder responsable" : "Responsible leader"}
                    </label>
                    <select
                      className="form-select"
                      value={form.assigned_tenant_user_id}
                      onChange={(event) =>
                        setForm((current) =>
                          current
                            ? {
                                ...current,
                                assigned_tenant_user_id: event.target.value,
                              }
                            : current
                        )
                      }
                    >
                      <option value="">{language === "es" ? "Sin técnico" : "No technician"}</option>
                      {selectableTechnicians.map((item) => (
                        <option key={item.id} value={item.id}>
                          {getTechnicianOptionLabel(item.id)}
                        </option>
                      ))}
                    </select>
                    {requiresFunctionalProfile && taskTypeLabel ? (
                      <div className="form-text text-muted">
                        {allowedFunctionProfileNames.length > 0
                          ? language === "es"
                            ? `Esta mantención usa el tipo de tarea ${taskTypeLabel}; la visita solo permite perfiles compatibles: ${allowedFunctionProfileNames.join(", ")}.`
                            : `This work order uses task type ${taskTypeLabel}; the visit only allows compatible profiles: ${allowedFunctionProfileNames.join(", ")}.`
                          : language === "es"
                            ? `Esta mantención usa el tipo de tarea ${taskTypeLabel}; la visita solo permite técnicos con perfil funcional declarado en el grupo.`
                            : `This work order uses task type ${taskTypeLabel}; the visit only allows technicians with a declared functional profile in the group.`}
                      </div>
                    ) : null}
                    {form.assigned_work_group_id && selectableTechnicians.length === 0 ? (
                      <div className="form-text text-warning">
                        {allowedFunctionProfileNames.length > 0
                          ? language === "es"
                            ? `Este grupo no tiene técnicos activos compatibles con: ${allowedFunctionProfileNames.join(", ")}.`
                            : `This group has no active technicians compatible with: ${allowedFunctionProfileNames.join(", ")}.`
                          : requiresFunctionalProfile
                          ? language === "es"
                            ? "Este grupo no tiene técnicos con membresía activa y perfil funcional declarado para este tipo de tarea."
                            : "This group has no technicians with an active membership and declared functional profile for this task type."
                          : language === "es"
                            ? "Este grupo no tiene técnicos con membresía activa para esta visita."
                            : "This group has no technicians with an active membership for this visit."}
                      </div>
                    ) : null}
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">
                      {language === "es" ? "Inicio real" : "Actual start"}
                    </label>
                    <input
                      className="form-control"
                      type="datetime-local"
                      value={form.actual_start_at}
                      onChange={(event) =>
                        setForm((current) =>
                          current
                            ? {
                                ...current,
                                actual_start_at: event.target.value,
                              }
                            : current
                        )
                      }
                    />
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">
                      {language === "es" ? "Fin real" : "Actual end"}
                    </label>
                    <input
                      className="form-control"
                      type="datetime-local"
                      value={form.actual_end_at}
                      onChange={(event) =>
                        setForm((current) =>
                          current
                            ? {
                                ...current,
                                actual_end_at: event.target.value,
                              }
                            : current
                        )
                      }
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label">{language === "es" ? "Notas" : "Notes"}</label>
                    <textarea
                      className="form-control"
                      rows={3}
                      placeholder={
                        language === "es"
                          ? "Ej.: ventana confirmada con cliente, acceso restringido, repuesto pendiente"
                          : "E.g. window confirmed with client, restricted access, pending spare part"
                      }
                      value={form.notes}
                      onChange={(event) =>
                        setForm((current) =>
                          current
                            ? {
                                ...current,
                                notes: event.target.value,
                              }
                            : current
                        )
                      }
                    />
                  </div>
                </div>
                <div className="maintenance-form__actions mt-3">
                  <button className="btn btn-outline-secondary" type="button" onClick={resetForm}>
                    {language === "es" ? "Cancelar" : "Cancel"}
                  </button>
                  <button className="btn btn-primary" type="button" onClick={() => void handleSubmit()} disabled={isSubmitting}>
                    {isSubmitting
                      ? language === "es"
                        ? "Guardando..."
                        : "Saving..."
                      : editingVisitId
                        ? language === "es"
                          ? "Guardar visita"
                          : "Save visit"
                        : language === "es"
                          ? "Crear visita"
                          : "Create visit"}
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {isLoading ? (
            <LoadingBlock label={language === "es" ? "Cargando visitas..." : "Loading visits..."} />
          ) : (
            <div className="d-grid gap-3">
              {visits.length === 0 ? (
                <div className="maintenance-history-entry__meta">
                  {language === "es"
                    ? "Aún no hay visitas registradas para esta OT."
                    : "There are no visits recorded for this work order yet."}
                </div>
              ) : (
                visits.map((visit) => (
                  <div key={visit.id} className="maintenance-history-entry">
                    <div className="d-flex flex-wrap justify-content-between gap-3 align-items-start">
                      <div>
                        <div className="maintenance-history-entry__title">
                          {getVisitStatusLabel(visit.visit_status, language)}
                        </div>
                        <div className="maintenance-history-entry__meta">
                          {language === "es" ? "Ventana" : "Window"}: {formatDateTime(visit.scheduled_start_at, language, effectiveTimeZone)}
                          {visit.scheduled_end_at
                            ? ` → ${formatDateTime(visit.scheduled_end_at, language, effectiveTimeZone)}`
                            : ""}
                        </div>
                        <div className="maintenance-history-entry__meta">
                          {language === "es" ? "Grupo" : "Group"}: {workGroupById.get(visit.assigned_work_group_id ?? -1) ?? (language === "es" ? "Sin grupo" : "No group")}
                        </div>
                        <div className="maintenance-history-entry__meta">
                          {language === "es" ? "Técnico" : "Technician"}: {technicianById.get(visit.assigned_tenant_user_id ?? -1) ?? (language === "es" ? "Sin técnico" : "No technician")}
                        </div>
                        {visit.actual_start_at || visit.actual_end_at ? (
                          <div className="maintenance-history-entry__meta">
                            {language === "es" ? "Ejecución" : "Execution"}: {formatDateTime(visit.actual_start_at, language, effectiveTimeZone)}
                            {visit.actual_end_at
                              ? ` → ${formatDateTime(visit.actual_end_at, language, effectiveTimeZone)}`
                              : ""}
                          </div>
                        ) : null}
                        {stripLegacyVisibleText(visit.notes) ? (
                          <div className="maintenance-history-entry__meta mt-1">
                            {stripLegacyVisibleText(visit.notes)}
                          </div>
                        ) : null}
                      </div>
                      <div className="d-flex flex-wrap gap-2">
                        <button
                          className="btn btn-sm btn-outline-primary"
                          type="button"
                          onClick={() => startEdit(visit)}
                        >
                          {language === "es" ? "Editar" : "Edit"}
                        </button>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          type="button"
                          onClick={() => void handleDelete(visit)}
                          disabled={isSubmitting}
                        >
                          {language === "es" ? "Eliminar" : "Delete"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
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
  ) : null;
}