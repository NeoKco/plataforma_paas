import type {
  TenantMaintenanceVisit,
  TenantMaintenanceVisitWriteRequest,
} from "./visitsService";

export type RescheduleVisitSummary = {
  total: number;
  openCount: number;
  completedCount: number;
  nextVisit: TenantMaintenanceVisit | null;
  syncCandidate: TenantMaintenanceVisit | null;
  remainingOpenVisits: TenantMaintenanceVisit[];
};

function toTimestamp(value: string | null | undefined): number | null {
  if (!value) {
    return null;
  }
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

function toLocalMinuteValue(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  const hours = String(value.getHours()).padStart(2, "0");
  const minutes = String(value.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function buildShiftedEnd(start: string | null, end: string | null, nextStart: string | null) {
  if (!start || !end || !nextStart) {
    return null;
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
    return null;
  }
  return toLocalMinuteValue(new Date(nextStartTimestamp + (endTimestamp - startTimestamp)));
}

export function getRescheduleVisitSummary(
  visits: TenantMaintenanceVisit[]
): RescheduleVisitSummary {
  const openVisits = visits.filter(
    (visit) => visit.visit_status === "scheduled" || visit.visit_status === "in_progress"
  );
  const completedVisits = visits.filter((visit) => visit.visit_status === "completed");
  const orderedOpenVisits = [...openVisits].sort((left, right) => {
    const leftTimestamp =
      toTimestamp(left.scheduled_start_at) ?? toTimestamp(left.created_at) ?? Number.POSITIVE_INFINITY;
    const rightTimestamp =
      toTimestamp(right.scheduled_start_at) ??
      toTimestamp(right.created_at) ??
      Number.POSITIVE_INFINITY;
    return leftTimestamp - rightTimestamp;
  });

  return {
    total: visits.length,
    openCount: openVisits.length,
    completedCount: completedVisits.length,
    nextVisit: orderedOpenVisits[0] ?? null,
    syncCandidate: orderedOpenVisits[0] ?? null,
    remainingOpenVisits: orderedOpenVisits.slice(1),
  };
}

export function buildRescheduleVisitSyncPayload(
  visit: TenantMaintenanceVisit,
  options: {
    scheduledFor: string | null;
    assignedWorkGroupId: number | null;
    assignedTenantUserId: number | null;
  }
): TenantMaintenanceVisitWriteRequest {
  const scheduledStartAt = options.scheduledFor;
  return {
    work_order_id: visit.work_order_id,
    visit_type: visit.visit_type,
    visit_status: visit.visit_status,
    scheduled_start_at: scheduledStartAt,
    scheduled_end_at: buildShiftedEnd(
      visit.scheduled_start_at,
      visit.scheduled_end_at,
      scheduledStartAt
    ),
    actual_start_at: visit.actual_start_at,
    actual_end_at: visit.actual_end_at,
    assigned_work_group_id: options.assignedWorkGroupId,
    assigned_tenant_user_id: options.assignedTenantUserId,
    assigned_group_label: null,
    notes: visit.notes,
  };
}