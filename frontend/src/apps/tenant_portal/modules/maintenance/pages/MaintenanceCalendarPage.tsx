import { useEffect, useMemo, useState } from "react";
import { AppBadge } from "../../../../../design-system/AppBadge";
import { AppToolbar } from "../../../../../design-system/AppLayout";
import { useLanguage } from "../../../../../store/language-context";
import { useTenantAuth } from "../../../../../store/tenant-auth-context";
import type { ApiError } from "../../../../../types";
import { MaintenanceCatalogPage } from "../components/common/MaintenanceCatalogPage";
import {
  createTenantMaintenanceVisit,
  deleteTenantMaintenanceVisit,
  getTenantMaintenanceVisits,
  updateTenantMaintenanceVisit,
  type TenantMaintenanceVisit,
  type TenantMaintenanceVisitWriteRequest,
} from "../services/visitsService";
import {
  getTenantMaintenanceWorkOrders,
  type TenantMaintenanceWorkOrder,
} from "../services/workOrdersService";
import { stripLegacyVisibleText } from "../../../../../utils/legacyVisibleText";

function buildDefaultForm(): TenantMaintenanceVisitWriteRequest {
  return {
    work_order_id: 0,
    visit_status: "scheduled",
    scheduled_start_at: null,
    scheduled_end_at: null,
    actual_start_at: null,
    actual_end_at: null,
    assigned_tenant_user_id: null,
    assigned_group_label: null,
    notes: null,
  };
}

function normalizeNullable(value: string | null): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : null;
}

function formatDateTime(value: string | null, language: "es" | "en"): string {
  if (!value) {
    return language === "es" ? "sin fecha" : "no date";
  }
  return new Date(value).toLocaleString(language === "es" ? "es-CL" : "en-US");
}

function getStatusLabel(status: string, language: "es" | "en"): string {
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

function getStatusTone(status: string): "success" | "danger" | "warning" | "info" | "neutral" {
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

export function MaintenanceCalendarPage() {
  const { session } = useTenantAuth();
  const { language } = useLanguage();
  const [rows, setRows] = useState<TenantMaintenanceVisit[]>([]);
  const [workOrders, setWorkOrders] = useState<TenantMaintenanceWorkOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [form, setForm] = useState<TenantMaintenanceVisitWriteRequest>(buildDefaultForm());

  const workOrderById = useMemo(
    () => new Map(workOrders.map((item) => [item.id, item])),
    [workOrders]
  );

  async function loadData() {
    if (!session?.accessToken) {
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const [visitsResponse, workOrdersResponse] = await Promise.all([
        getTenantMaintenanceVisits(session.accessToken),
        getTenantMaintenanceWorkOrders(session.accessToken),
      ]);
      setRows(visitsResponse.data);
      setWorkOrders(workOrdersResponse.data);
      setForm((current) => ({
        ...current,
        work_order_id: current.work_order_id || workOrdersResponse.data[0]?.id || 0,
      }));
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [session?.accessToken]);

  function startCreate() {
    setEditingId(null);
    setFeedback(null);
    setError(null);
    setForm({
      ...buildDefaultForm(),
      work_order_id: workOrders[0]?.id || 0,
    });
  }

  function startEdit(item: TenantMaintenanceVisit) {
    setEditingId(item.id);
    setFeedback(null);
    setError(null);
    setForm({
      work_order_id: item.work_order_id,
      visit_status: item.visit_status,
      scheduled_start_at: item.scheduled_start_at,
      scheduled_end_at: item.scheduled_end_at,
      actual_start_at: item.actual_start_at,
      actual_end_at: item.actual_end_at,
      assigned_tenant_user_id: item.assigned_tenant_user_id,
      assigned_group_label: item.assigned_group_label,
      notes: stripLegacyVisibleText(item.notes),
    });
  }

  async function handleSubmit() {
    if (!session?.accessToken) {
      return;
    }
    setIsSubmitting(true);
    setError(null);
    const payload: TenantMaintenanceVisitWriteRequest = {
      work_order_id: Number(form.work_order_id),
      visit_status: form.visit_status.trim().toLowerCase() || "scheduled",
      scheduled_start_at: normalizeNullable(form.scheduled_start_at),
      scheduled_end_at: normalizeNullable(form.scheduled_end_at),
      actual_start_at: normalizeNullable(form.actual_start_at),
      actual_end_at: normalizeNullable(form.actual_end_at),
      assigned_tenant_user_id: form.assigned_tenant_user_id
        ? Number(form.assigned_tenant_user_id)
        : null,
      assigned_group_label: normalizeNullable(form.assigned_group_label),
      notes: stripLegacyVisibleText(normalizeNullable(form.notes)),
    };
    try {
      const response = editingId
        ? await updateTenantMaintenanceVisit(session.accessToken, editingId, payload)
        : await createTenantMaintenanceVisit(session.accessToken, payload);
      setFeedback(response.message);
      startCreate();
      await loadData();
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(item: TenantMaintenanceVisit) {
    if (!session?.accessToken) {
      return;
    }
    const confirmed = window.confirm(
      language === "es"
        ? "Eliminar la visita programada. ¿Continuar?"
        : "Delete the scheduled visit. Continue?"
    );
    if (!confirmed) {
      return;
    }
    try {
      const response = await deleteTenantMaintenanceVisit(session.accessToken, item.id);
      if (editingId === item.id) {
        startCreate();
      }
      setFeedback(response.message);
      await loadData();
    } catch (rawError) {
      setError(rawError as ApiError);
    }
  }

  return (
    <MaintenanceCatalogPage
      titleEs="Agenda técnica"
      titleEn="Technical calendar"
      descriptionEs="Programación ligera de visitas sobre órdenes de trabajo activas, sin llegar todavía al calendario visual con conflictos."
      descriptionEn="Lightweight visit scheduling on active work orders, without the full visual conflict calendar yet."
      helpEs="Este bloque sirve para programar visitas reales de terreno. La agenda visual y los conflictos horarios vendrán después; aquí importa dejar orden, hora y responsable."
      helpEn="This block is for scheduling real field visits. The visual calendar and time conflicts will come later; here the important thing is leaving order, time, and owner recorded."
      loadingLabelEs="Cargando visitas..."
      loadingLabelEn="Loading visits..."
      isLoading={isLoading}
      isSubmitting={isSubmitting}
      rows={rows}
      error={error}
      feedback={feedback}
      editingId={editingId}
      form={form}
      onFormChange={(next) =>
        setForm({
          ...next,
          work_order_id: Number(next.work_order_id),
        })
      }
      onSubmit={handleSubmit}
      onCancel={startCreate}
      onReload={loadData}
      onNew={startCreate}
      fields={[
        {
          key: "work_order_id",
          labelEs: "Orden de trabajo",
          labelEn: "Work order",
          type: "select",
          options: workOrders.map((item) => ({
            value: String(item.id),
            label: item.external_reference
              ? `${item.external_reference} · ${item.title}`
              : item.title,
          })),
        },
        {
          key: "visit_status",
          labelEs: "Estado visita",
          labelEn: "Visit status",
          type: "select",
          options: [
            { value: "scheduled", label: language === "es" ? "Programada" : "Scheduled" },
            { value: "in_progress", label: language === "es" ? "En curso" : "In progress" },
            { value: "completed", label: language === "es" ? "Completada" : "Completed" },
            { value: "cancelled", label: language === "es" ? "Anulada" : "Cancelled" },
          ],
        },
        {
          key: "scheduled_start_at",
          labelEs: "Inicio programado",
          labelEn: "Scheduled start",
          type: "datetime-local",
        },
        {
          key: "scheduled_end_at",
          labelEs: "Fin programado",
          labelEn: "Scheduled end",
          type: "datetime-local",
        },
        {
          key: "actual_start_at",
          labelEs: "Inicio real",
          labelEn: "Actual start",
          type: "datetime-local",
        },
        {
          key: "actual_end_at",
          labelEs: "Fin real",
          labelEn: "Actual end",
          type: "datetime-local",
        },
        {
          key: "assigned_group_label",
          labelEs: "Grupo responsable",
          labelEn: "Assigned group",
        },
        {
          key: "notes",
          labelEs: "Notas",
          labelEn: "Notes",
          type: "textarea",
        },
      ]}
      columns={[
        {
          key: "visit",
          headerEs: "Visita",
          headerEn: "Visit",
          render: (item) => {
            const workOrder = workOrderById.get(item.work_order_id);
            return (
              <div>
                <div className="maintenance-cell__title">
                  {workOrder?.title || `#${item.work_order_id}`}
                </div>
                <div className="maintenance-cell__meta">
                  {workOrder?.external_reference || getStatusLabel(item.visit_status, language)}
                </div>
              </div>
            );
          },
        },
        {
          key: "window",
          headerEs: "Ventana",
          headerEn: "Window",
          render: (item) => (
            <div>
              <div>{formatDateTime(item.scheduled_start_at, language)}</div>
              <div className="maintenance-cell__meta">
                {formatDateTime(item.scheduled_end_at, language)}
              </div>
            </div>
          ),
        },
        {
          key: "status",
          headerEs: "Estado",
          headerEn: "Status",
          render: (item) => (
            <AppBadge tone={getStatusTone(item.visit_status)}>
              {getStatusLabel(item.visit_status, language)}
            </AppBadge>
          ),
        },
        {
          key: "assignment",
          headerEs: "Responsable",
          headerEn: "Owner",
          render: (item, currentLanguage) =>
            item.assigned_group_label ||
            (currentLanguage === "es" ? "sin grupo" : "no group"),
        },
        {
          key: "actions",
          headerEs: "Acciones",
          headerEn: "Actions",
          render: (item, currentLanguage) => (
            <AppToolbar compact>
              <button
                className="btn btn-sm btn-outline-primary"
                type="button"
                onClick={() => startEdit(item)}
              >
                {currentLanguage === "es" ? "Editar" : "Edit"}
              </button>
              <button
                className="btn btn-sm btn-outline-danger"
                type="button"
                onClick={() => void handleDelete(item)}
              >
                {currentLanguage === "es" ? "Eliminar" : "Delete"}
              </button>
            </AppToolbar>
          ),
        },
      ]}
    />
  );
}
