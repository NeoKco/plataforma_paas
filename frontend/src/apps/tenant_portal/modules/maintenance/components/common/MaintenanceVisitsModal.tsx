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

function normalizeNullable(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function toLocalInput(value: string | null | undefined): string {
  if (!value) {
    return "";
  }
  return value.replace(" ", "T").slice(0, 16);
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
        .filter((member) => !requiresFunctionalProfile || member.function_profile_id !== null)
        .map((member) => member.tenant_user_id)
    );
    return technicians.filter((item) => allowedIds.has(item.id));
  }, [form?.assigned_work_group_id, requiresFunctionalProfile, technicians, workGroupMembers]);

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
    setForm(buildFormState(workOrder));
    setError(null);
  }

  function startEdit(visit: TenantMaintenanceVisit) {
    if (!workOrder) {
      return;
    }
    setEditingVisitId(visit.id);
    setForm(buildFormState(workOrder, visit));
    setError(null);
  }

  function resetForm() {
    setEditingVisitId(null);
    setForm(null);
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
      if (editingVisitId) {
        await updateTenantMaintenanceVisit(accessToken, editingVisitId, payload);
        onFeedback?.(
          language === "es" ? "Visita actualizada correctamente." : "Visit updated successfully."
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

          {form ? (
            <div className="panel-card border-0 bg-light-subtle mb-3">
              <div className="panel-card__header pb-2">
                <h3 className="panel-card__title mb-0">
                  {editingVisitId
                    ? language === "es"
                      ? "Editar visita"
                      : "Edit visit"
                    : language === "es"
                      ? "Nueva visita"
                      : "New visit"}
                </h3>
              </div>
              <div className="panel-card__body pt-0">
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
                      {language === "es" ? "Grupo responsable" : "Responsible group"}
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
                      {language === "es" ? "Técnico responsable" : "Assigned technician"}
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
                        {language === "es"
                          ? `Esta mantención usa el tipo de tarea ${taskTypeLabel}; la visita solo permite técnicos con perfil funcional declarado en el grupo.`
                          : `This work order uses task type ${taskTypeLabel}; the visit only allows technicians with a declared functional profile in the group.`}
                      </div>
                    ) : null}
                    {form.assigned_work_group_id && selectableTechnicians.length === 0 ? (
                      <div className="form-text text-warning">
                        {requiresFunctionalProfile
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