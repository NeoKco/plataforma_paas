import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "../../../../../components/common/PageHeader";
import { PanelCard } from "../../../../../components/common/PanelCard";
import { DataTableCard } from "../../../../../components/data-display/DataTableCard";
import { ErrorState } from "../../../../../components/feedback/ErrorState";
import { LoadingBlock } from "../../../../../components/feedback/LoadingBlock";
import { AppBadge } from "../../../../../design-system/AppBadge";
import { AppToolbar } from "../../../../../design-system/AppLayout";
import { getApiErrorDisplayMessage } from "../../../../../services/api";
import { pickLocalizedText, useLanguage } from "../../../../../store/language-context";
import { useTenantAuth } from "../../../../../store/tenant-auth-context";
import { formatDateTimeInTimeZone } from "../../../../../utils/dateTimeLocal";
import type { ApiError } from "../../../../../types";
import { MaintenanceHelpBubble } from "../components/common/MaintenanceHelpBubble";
import { MaintenanceModuleNav } from "../components/common/MaintenanceModuleNav";
import {
  createTenantMaintenanceCostTemplate,
  getTenantMaintenanceCostTemplates,
  type TenantMaintenanceCostTemplate,
  type TenantMaintenanceCostTemplateLineWriteItem,
  type TenantMaintenanceCostTemplateWriteRequest,
  updateTenantMaintenanceCostTemplate,
  updateTenantMaintenanceCostTemplateStatus,
} from "../services/costTemplatesService";
import {
  getTenantBusinessTaskTypes,
  type TenantBusinessTaskType,
} from "../../business_core/services/taskTypesService";

type CostTemplateForm = TenantMaintenanceCostTemplateWriteRequest;

function buildBlankLine(): TenantMaintenanceCostTemplateLineWriteItem {
  return {
    line_type: "material",
    description: null,
    quantity: 1,
    unit_cost: 0,
    notes: null,
  };
}

function buildDefaultForm(): CostTemplateForm {
  return {
    name: "",
    description: null,
    task_type_id: null,
    estimate_target_margin_percent: 0,
    estimate_notes: null,
    is_active: true,
    lines: [buildBlankLine()],
  };
}

function normalizeNullable(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : null;
}

function sortTemplates(items: TenantMaintenanceCostTemplate[]): TenantMaintenanceCostTemplate[] {
  return [...items].sort((left, right) => {
    if (left.is_active !== right.is_active) {
      return left.is_active ? -1 : 1;
    }
    const nameCompare = left.name.localeCompare(right.name);
    if (nameCompare !== 0) {
      return nameCompare;
    }
    return left.id - right.id;
  });
}

function getTemplateBaseTotal(template: Pick<CostTemplateForm, "lines">): number {
  return template.lines.reduce(
    (sum, line) => sum + Number(line.quantity || 0) * Number(line.unit_cost || 0),
    0
  );
}

function formatDateTime(value: string, language: "es" | "en", timeZone?: string | null) {
  return formatDateTimeInTimeZone(value, language, timeZone);
}

export function MaintenanceCostTemplatesPage() {
  const { session, effectiveTimeZone } = useTenantAuth();
  const { language } = useLanguage();
  const t = (es: string, en: string) => pickLocalizedText(language, { es, en });
  const [rows, setRows] = useState<TenantMaintenanceCostTemplate[]>([]);
  const [taskTypes, setTaskTypes] = useState<TenantBusinessTaskType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [taskTypeFilter, setTaskTypeFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [form, setForm] = useState<CostTemplateForm>(buildDefaultForm());

  const taskTypeById = useMemo(
    () => new Map(taskTypes.map((item) => [item.id, item])),
    [taskTypes]
  );

  const filteredRows = useMemo(
    () =>
      rows.filter((item) => {
        if (taskTypeFilter && String(item.task_type_id ?? "") !== taskTypeFilter) {
          return false;
        }
        if (statusFilter === "active" && !item.is_active) {
          return false;
        }
        if (statusFilter === "inactive" && item.is_active) {
          return false;
        }
        return true;
      }),
    [rows, statusFilter, taskTypeFilter]
  );

  async function loadData() {
    if (!session?.accessToken) {
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const [templatesResponse, taskTypesResponse] = await Promise.all([
        getTenantMaintenanceCostTemplates(session.accessToken, { includeInactive: true }),
        getTenantBusinessTaskTypes(session.accessToken, { includeInactive: true }),
      ]);
      setRows(sortTemplates(templatesResponse.data));
      setTaskTypes(taskTypesResponse.data);
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [session?.accessToken]);

  function openCreate() {
    setEditingId(null);
    setFeedback(null);
    setError(null);
    setForm(buildDefaultForm());
    setIsFormOpen(true);
  }

  function openEdit(template: TenantMaintenanceCostTemplate) {
    setEditingId(template.id);
    setFeedback(null);
    setError(null);
    setForm({
      name: template.name,
      description: template.description,
      task_type_id: template.task_type_id,
      estimate_target_margin_percent: template.estimate_target_margin_percent,
      estimate_notes: template.estimate_notes,
      is_active: template.is_active,
      lines: template.lines.map((line) => ({
        id: line.id,
        line_type: line.line_type,
        description: line.description,
        quantity: line.quantity,
        unit_cost: line.unit_cost,
        notes: line.notes,
      })),
    });
    setIsFormOpen(true);
  }

  function closeForm() {
    if (isSubmitting) {
      return;
    }
    setIsFormOpen(false);
    setEditingId(null);
    setForm(buildDefaultForm());
  }

  function updateLine(
    index: number,
    key: keyof TenantMaintenanceCostTemplateLineWriteItem,
    value: string | number | null
  ) {
    setForm((current) => ({
      ...current,
      lines: current.lines.map((line, lineIndex) =>
        lineIndex === index ? { ...line, [key]: value } : line
      ),
    }));
  }

  function addLine() {
    setForm((current) => ({
      ...current,
      lines: [...current.lines, buildBlankLine()],
    }));
  }

  function removeLine(index: number) {
    setForm((current) => ({
      ...current,
      lines:
        current.lines.length <= 1
          ? [buildBlankLine()]
          : current.lines.filter((_, lineIndex) => lineIndex !== index),
    }));
  }

  async function handleSubmit() {
    if (!session?.accessToken) {
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const payload: CostTemplateForm = {
        name: form.name.trim(),
        description: normalizeNullable(form.description),
        task_type_id: form.task_type_id,
        estimate_target_margin_percent: Number(form.estimate_target_margin_percent || 0),
        estimate_notes: normalizeNullable(form.estimate_notes),
        is_active: form.is_active,
        lines: form.lines.map((line) => ({
          id: line.id ?? null,
          line_type: line.line_type,
          description: normalizeNullable(line.description),
          quantity: Number(line.quantity || 0),
          unit_cost: Number(line.unit_cost || 0),
          notes: normalizeNullable(line.notes),
        })),
      };
      const response = editingId
        ? await updateTenantMaintenanceCostTemplate(session.accessToken, editingId, payload)
        : await createTenantMaintenanceCostTemplate(session.accessToken, payload);
      setFeedback(response.message);
      setRows((current) =>
        sortTemplates(
          editingId
            ? current.map((item) => (item.id === response.data.id ? response.data : item))
            : [...current, response.data]
        )
      );
      closeForm();
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleToggle(template: TenantMaintenanceCostTemplate) {
    if (!session?.accessToken) {
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await updateTenantMaintenanceCostTemplateStatus(
        session.accessToken,
        template.id,
        !template.is_active
      );
      setRows((current) =>
        sortTemplates(current.map((item) => (item.id === response.data.id ? response.data : item)))
      );
      setFeedback(response.message);
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsSubmitting(false);
    }
  }

  const columns = [
    {
      key: "template",
      header: t("Plantilla", "Template"),
      render: (item: TenantMaintenanceCostTemplate) => {
        const taskTypeName =
          taskTypeById.get(item.task_type_id ?? -1)?.name ??
          t("General", "General");
        return (
          <div>
            <div className="maintenance-cell__title">{item.name}</div>
            <div className="maintenance-cell__meta">
              {taskTypeName}
              {item.description ? ` · ${item.description}` : ""}
            </div>
          </div>
        );
      },
    },
    {
      key: "summary",
      header: t("Resumen", "Summary"),
      render: (item: TenantMaintenanceCostTemplate) => (
        <div>
          <div>
            {item.lines.length} {t("líneas", "lines")}
          </div>
          <div className="maintenance-cell__meta">
            {t("Base", "Base")}: ${getTemplateBaseTotal(item).toFixed(2)}
          </div>
          <div className="maintenance-cell__meta">
            {item.usage_count} {t("usos", "uses")}
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: t("Estado", "Status"),
      render: (item: TenantMaintenanceCostTemplate) => (
        <AppBadge tone={item.is_active ? "success" : "neutral"}>
          {item.is_active ? t("Activa", "Active") : t("Archivada", "Archived")}
        </AppBadge>
      ),
    },
    {
      key: "updated",
      header: t("Actualizada", "Updated"),
      render: (item: TenantMaintenanceCostTemplate) => (
        <span>{formatDateTime(item.updated_at, language, effectiveTimeZone)}</span>
      ),
    },
    {
      key: "actions",
      header: t("Acciones", "Actions"),
      render: (item: TenantMaintenanceCostTemplate) => (
        <AppToolbar compact>
          <button className="btn btn-sm btn-outline-primary" type="button" onClick={() => openEdit(item)}>
            {t("Editar", "Edit")}
          </button>
          <button className="btn btn-sm btn-outline-secondary" type="button" onClick={() => void handleToggle(item)}>
            {item.is_active ? t("Archivar", "Archive") : t("Reactivar", "Reactivate")}
          </button>
        </AppToolbar>
      ),
    },
  ];

  return (
    <div className="d-grid gap-4">
      <PageHeader
        eyebrow={t("Mantenciones", "Maintenance")}
        icon="maintenance"
        title={t("Costos de mantenciones", "Maintenance costs")}
        description={
          t(
            "Slice dedicado para definir, editar y archivar costos base reutilizables para las mantenciones.",
            "Dedicated slice to define, edit, and archive reusable base costs for maintenance work."
          )
        }
        actions={
          <AppToolbar compact>
            <MaintenanceHelpBubble
              label={t("Ayuda", "Help")}
              helpText={
                t(
                  "Usa esta vista para definir el costo base por tipo de mantención: mano de obra, traslado, materiales, servicios o indirectos. Ese costo se reutiliza luego en el costeo estimado y en el cierre.",
                  "Use this view to define the base cost by maintenance type: labor, travel, materials, services, or overhead. That cost is then reused in estimated costing and closure."
                )
              }
            />
            <button className="btn btn-outline-secondary" type="button" onClick={() => void loadData()}>
              {t("Recargar", "Reload")}
            </button>
            <button className="btn btn-primary" type="button" onClick={openCreate}>
              {t("Nuevo costo base", "New base cost")}
            </button>
          </AppToolbar>
        }
      />
      <MaintenanceModuleNav />

      {feedback ? <div className="alert alert-success mb-0">{feedback}</div> : null}
      {error ? (
        <ErrorState
          title={t("No se pudo cargar la vista", "The view could not be loaded")}
          detail={getApiErrorDisplayMessage(error)}
          requestId={error.payload?.request_id}
        />
      ) : null}
      {isLoading ? (
        <LoadingBlock label={t("Cargando costos...", "Loading costs...")} />
      ) : null}

      <PanelCard
        title={t("Filtros", "Filters")}
        subtitle={
          t(
            `Mostrando ${filteredRows.length} de ${rows.length} costos base.`,
            `Showing ${filteredRows.length} of ${rows.length} base costs.`
          )
        }
      >
        <div className="row g-3 align-items-end">
          <div className="col-12 col-md-6">
            <label className="form-label">{t("Tipo de mantención", "Task type")}</label>
            <select className="form-select" value={taskTypeFilter} onChange={(event) => setTaskTypeFilter(event.target.value)}>
              <option value="">{t("Todos", "All")}</option>
              {taskTypes.map((taskType) => (
                <option key={taskType.id} value={String(taskType.id)}>
                  {taskType.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-12 col-md-4">
            <label className="form-label">{t("Estado", "Status")}</label>
            <select className="form-select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "all" | "active" | "inactive")}>
              <option value="all">{t("Todas", "All")}</option>
              <option value="active">{t("Activas", "Active")}</option>
              <option value="inactive">{t("Archivadas", "Archived")}</option>
            </select>
          </div>
          <div className="col-12 col-md-2 d-grid">
            <button className="btn btn-outline-secondary" type="button" onClick={() => {
              setTaskTypeFilter("");
              setStatusFilter("all");
            }}>
              {t("Limpiar", "Clear")}
            </button>
          </div>
        </div>
      </PanelCard>

      <DataTableCard
        title={t("Costos base disponibles", "Available base costs")}
        subtitle={
          t(
            "Catálogo exclusivo de Mantenciones para reutilizar costos base en el estimado y en el cierre real.",
            "Maintenance-only catalog to reuse base costs in estimate and actual closure."
          )
        }
        rows={filteredRows}
        columns={columns}
      />

      {isFormOpen ? (
        <div className="maintenance-form-backdrop" role="presentation" onClick={closeForm}>
          <div
            className="maintenance-form-modal"
            role="dialog"
            aria-modal="true"
            aria-label={t("Costo de mantención", "Maintenance cost")}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="maintenance-form-modal__eyebrow">
              {editingId ? t("Edición puntual", "Targeted edit") : t("Alta bajo demanda", "On-demand creation")}
            </div>
            <PanelCard
              title={editingId ? t("Editar costo base", "Edit base cost") : t("Nuevo costo base", "New base cost")}
              subtitle={
                t(
                  "Define un costo base reutilizable sin mezclar este catálogo con otros módulos del tenant.",
                  "Define a reusable base cost without turning this catalog into a shared tenant-wide module."
                )
              }
            >
              <form className="maintenance-form" onSubmit={(event) => {
                event.preventDefault();
                void handleSubmit();
              }}>
                <div className="row g-3">
                  <div className="col-12 col-md-6">
                    <label className="form-label">{t("Nombre", "Name")}</label>
                    <input className="form-control" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label">{t("Tipo de mantención", "Task type")}</label>
                    <select
                      className="form-select"
                      value={form.task_type_id ?? ""}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          task_type_id: event.target.value ? Number(event.target.value) : null,
                        }))
                      }
                    >
                      <option value="">{t("General", "General")}</option>
                      {taskTypes.map((taskType) => (
                        <option key={taskType.id} value={taskType.id}>
                          {taskType.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-12 col-md-4">
                    <label className="form-label">{t("Margen objetivo %", "Target margin %")}</label>
                    <input
                      className="form-control"
                      type="number"
                      min={0}
                      step="0.01"
                      value={form.estimate_target_margin_percent}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          estimate_target_margin_percent: Number(event.target.value || 0),
                        }))
                      }
                    />
                  </div>
                  <div className="col-12 col-md-4">
                    <label className="form-label">{t("Estado", "Status")}</label>
                    <select
                      className="form-select"
                      value={form.is_active ? "active" : "inactive"}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          is_active: event.target.value === "active",
                        }))
                      }
                    >
                      <option value="active">{t("Activa", "Active")}</option>
                      <option value="inactive">{t("Archivada", "Archived")}</option>
                    </select>
                  </div>
                  <div className="col-12 col-md-4">
                    <label className="form-label">{t("Total base", "Base total")}</label>
                    <input className="form-control" value={`$${getTemplateBaseTotal(form).toFixed(2)}`} disabled />
                  </div>
                  <div className="col-12">
                    <label className="form-label">{t("Descripción", "Description")}</label>
                    <textarea
                      className="form-control"
                      rows={3}
                      value={form.description ?? ""}
                      onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label">{t("Notas de costeo", "Costing notes")}</label>
                    <textarea
                      className="form-control"
                      rows={3}
                      value={form.estimate_notes ?? ""}
                      onChange={(event) => setForm((current) => ({ ...current, estimate_notes: event.target.value }))}
                    />
                  </div>
                  <div className="col-12">
                    <div className="d-flex justify-content-between align-items-center gap-2 mb-2">
                      <div>
                        <div className="panel-card__title h6 mb-1">
                          {t("Líneas base", "Base lines")}
                        </div>
                        <div className="maintenance-cell__meta">
                          {t(
                            "Estas líneas se reutilizan automáticamente en el costeo estimado y en el cierre real de la mantención.",
                            "These lines are automatically reused in estimated costing and in the actual maintenance closure."
                          )}
                        </div>
                      </div>
                      <button className="btn btn-sm btn-outline-primary" type="button" onClick={addLine}>
                        {t("Agregar línea", "Add line")}
                      </button>
                    </div>
                    <div className="d-grid gap-3">
                      {form.lines.map((line, index) => (
                        <div key={`${line.id ?? "new"}-${index}`} className="maintenance-cost-lines__item">
                          <div className="row g-3 align-items-end">
                            <div className="col-12 col-md-2">
                              <label className="form-label">{t("Tipo", "Type")}</label>
                              <select
                                className="form-select"
                                value={line.line_type}
                                onChange={(event) => updateLine(index, "line_type", event.target.value)}
                              >
                                <option value="labor">{t("Mano de obra", "Labor")}</option>
                                <option value="travel">{t("Traslado", "Travel")}</option>
                                <option value="material">{t("Material", "Material")}</option>
                                <option value="service">{t("Servicio externo", "External service")}</option>
                                <option value="overhead">{t("Indirecto", "Overhead")}</option>
                              </select>
                            </div>
                            <div className="col-12 col-md-3">
                              <label className="form-label">{t("Descripción", "Description")}</label>
                              <input
                                className="form-control"
                                value={line.description ?? ""}
                                onChange={(event) => updateLine(index, "description", event.target.value)}
                              />
                            </div>
                            <div className="col-6 col-md-2">
                              <label className="form-label">{t("Cantidad", "Quantity")}</label>
                              <input
                                className="form-control"
                                type="number"
                                min={0}
                                step="0.01"
                                value={line.quantity}
                                onChange={(event) => updateLine(index, "quantity", Number(event.target.value || 0))}
                              />
                            </div>
                            <div className="col-6 col-md-2">
                              <label className="form-label">{t("Costo unit.", "Unit cost")}</label>
                              <input
                                className="form-control"
                                type="number"
                                min={0}
                                step="0.01"
                                value={line.unit_cost}
                                onChange={(event) => updateLine(index, "unit_cost", Number(event.target.value || 0))}
                              />
                            </div>
                            <div className="col-12 col-md-2">
                              <label className="form-label">{t("Total", "Total")}</label>
                              <input
                                className="form-control"
                                value={`$${(Number(line.quantity || 0) * Number(line.unit_cost || 0)).toFixed(2)}`}
                                disabled
                              />
                            </div>
                            <div className="col-12 col-md-1 d-grid">
                              <button className="btn btn-outline-danger" type="button" onClick={() => removeLine(index)}>
                                {t("Quitar", "Remove")}
                              </button>
                            </div>
                            <div className="col-12">
                              <label className="form-label">{t("Notas", "Notes")}</label>
                              <input
                                className="form-control"
                                value={line.notes ?? ""}
                                onChange={(event) => updateLine(index, "notes", event.target.value)}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="maintenance-form__actions">
                  <button className="btn btn-outline-secondary" type="button" onClick={closeForm}>
                    {t("Cancelar", "Cancel")}
                  </button>
                  <button className="btn btn-primary" type="submit" disabled={isSubmitting}>
                    {isSubmitting
                      ? t("Guardando...", "Saving...")
                      : editingId
                        ? t("Guardar cambios", "Save changes")
                        : t("Crear plantilla", "Create template")}
                  </button>
                </div>
              </form>
            </PanelCard>
          </div>
        </div>
      ) : null}
    </div>
  );
}
