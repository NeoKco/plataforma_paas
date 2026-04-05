import { useEffect, useState } from "react";
import { AppBadge } from "../../../../../design-system/AppBadge";
import { AppToolbar } from "../../../../../design-system/AppLayout";
import { useLanguage } from "../../../../../store/language-context";
import { useTenantAuth } from "../../../../../store/tenant-auth-context";
import type { ApiError } from "../../../../../types";
import { BusinessCoreCatalogPage } from "../components/common/BusinessCoreCatalogPage";
import {
  createTenantBusinessTaskType,
  deleteTenantBusinessTaskType,
  getTenantBusinessTaskTypes,
  updateTenantBusinessTaskType,
  updateTenantBusinessTaskTypeStatus,
  type TenantBusinessTaskType,
  type TenantBusinessTaskTypeWriteRequest,
} from "../services/taskTypesService";
import {
  getTenantBusinessFunctionProfiles,
  type TenantBusinessFunctionProfile,
} from "../services/functionProfilesService";
import { buildInternalTaxonomyCode, stripLegacyVisibleText } from "../utils/taxonomyUi";
import {
  buildTaskTypeDescriptionWithAllowedProfiles,
  getTaskTypeAllowedProfileNames,
  stripTaskTypeAllowedProfilesMetadata,
} from "../../maintenance/services/assignmentCapability";

function buildDefaultForm(): TenantBusinessTaskTypeWriteRequest {
  return {
    code: null,
    name: "",
    description: null,
    color: "#2563eb",
    icon: "calendar",
    is_active: true,
    sort_order: 100,
  };
}

function normalizeNullable(value: string | null): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : null;
}

export function BusinessCoreTaskTypesPage() {
  const { session } = useTenantAuth();
  const { language } = useLanguage();
  const [items, setItems] = useState<TenantBusinessTaskType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [form, setForm] = useState<TenantBusinessTaskTypeWriteRequest>(buildDefaultForm());
  const [functionProfiles, setFunctionProfiles] = useState<TenantBusinessFunctionProfile[]>([]);
  const [compatibleProfileNames, setCompatibleProfileNames] = useState<string[]>([]);

  async function loadItems() {
    if (!session?.accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const [taskTypesResponse, functionProfilesResponse] = await Promise.all([
        getTenantBusinessTaskTypes(session.accessToken),
        getTenantBusinessFunctionProfiles(session.accessToken, { includeInactive: false }),
      ]);
      setItems(taskTypesResponse.data);
      setFunctionProfiles(functionProfilesResponse.data);
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadItems();
  }, [session?.accessToken]);

  function startCreate() {
    setEditingId(null);
    setFeedback(null);
    setError(null);
    setForm(buildDefaultForm());
    setCompatibleProfileNames([]);
  }

  function startEdit(item: TenantBusinessTaskType) {
    setEditingId(item.id);
    setFeedback(null);
    setError(null);
    setForm({
      code: item.code,
      name: item.name,
      description: stripLegacyVisibleText(stripTaskTypeAllowedProfilesMetadata(item.description)),
      color: item.color,
      icon: item.icon,
      is_active: item.is_active,
      sort_order: item.sort_order,
    });
    setCompatibleProfileNames(getTaskTypeAllowedProfileNames(item));
  }

  async function handleSubmit() {
    if (!session?.accessToken) return;
    const payload = {
      ...form,
      code:
        editingId !== null
          ? (form.code?.trim() ?? "") || buildInternalTaxonomyCode("task", form.name, editingId)
          : buildInternalTaxonomyCode("task", form.name),
      name: form.name.trim(),
      description: stripLegacyVisibleText(
        buildTaskTypeDescriptionWithAllowedProfiles(
          normalizeNullable(form.description),
          compatibleProfileNames
        )
      ),
      color: normalizeNullable(form.color),
      icon: normalizeNullable(form.icon),
    };
    setIsSubmitting(true);
    setError(null);
    try {
      const response = editingId
        ? await updateTenantBusinessTaskType(session.accessToken, editingId, payload)
        : await createTenantBusinessTaskType(session.accessToken, payload);
      setFeedback(response.message);
      startCreate();
      await loadItems();
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleToggle(item: TenantBusinessTaskType) {
    if (!session?.accessToken) return;
    try {
      const response = await updateTenantBusinessTaskTypeStatus(
        session.accessToken,
        item.id,
        !item.is_active
      );
      setFeedback(response.message);
      await loadItems();
    } catch (rawError) {
      setError(rawError as ApiError);
    }
  }

  async function handleDelete(item: TenantBusinessTaskType) {
    if (!session?.accessToken) return;
    const confirmed = window.confirm(
      language === "es"
        ? `Eliminar "${item.name}" quitará este tipo de tarea del catálogo compartido. ¿Continuar?`
        : `Deleting "${item.name}" will remove this task type from the shared catalog. Continue?`
    );
    if (!confirmed) return;
    try {
      const response = await deleteTenantBusinessTaskType(session.accessToken, item.id);
      if (editingId === item.id) startCreate();
      setFeedback(response.message);
      await loadItems();
    } catch (rawError) {
      setError(rawError as ApiError);
    }
  }

  return (
    <BusinessCoreCatalogPage
      titleEs="Tipos de tarea"
      titleEn="Task types"
      descriptionEs="Taxonomía compartida para mantenciones, proyectos y futura automatización operativa."
      descriptionEn="Shared taxonomy for maintenance, projects, and future operational automation."
      helpEs="Define tipos reutilizables antes de abrir flujos operativos. También puedes marcar perfiles funcionales compatibles para que Mantenciones, Agenda, Pendientes y Visitas filtren responsables elegibles sin tocar migraciones."
      helpEn="Define reusable types before opening operational flows. You can also mark compatible functional profiles so Maintenance, Calendar, Due items, and Visits filter eligible assignees without requiring migrations."
      loadingLabelEs="Cargando tipos de tarea..."
      loadingLabelEn="Loading task types..."
      isLoading={isLoading}
      isSubmitting={isSubmitting}
      rows={items}
      error={error}
      feedback={feedback}
      editingId={editingId}
      form={form}
      onFormChange={setForm}
      onSubmit={handleSubmit}
      onCancel={startCreate}
      onReload={loadItems}
      onNew={startCreate}
      renderEditorExtra={() => (
        <div className="d-grid gap-2">
          <div>
            <label className="form-label mb-1">
              {language === "es" ? "Perfiles compatibles" : "Compatible profiles"}
            </label>
            <div className="form-text mt-0">
              {language === "es"
                ? "Si seleccionas perfiles, las OT preventivas de este tipo solo podrán asignarse a esos perfiles funcionales dentro del grupo responsable."
                : "If you select profiles, preventive work orders of this type will only be assignable to those functional profiles inside the responsible group."}
            </div>
          </div>
          <div className="row g-2">
            {functionProfiles.length === 0 ? (
              <div className="col-12">
                <div className="alert alert-secondary mb-0">
                  {language === "es"
                    ? "No hay perfiles funcionales activos. Crea perfiles primero si quieres usar compatibilidad fina."
                    : "There are no active functional profiles. Create profiles first if you want finer compatibility."}
                </div>
              </div>
            ) : (
              functionProfiles.map((profile) => {
                const checked = compatibleProfileNames.includes(profile.name);
                return (
                  <div className="col-12 col-md-6" key={profile.id}>
                    <label className="form-check border rounded px-3 py-2 h-100">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        checked={checked}
                        onChange={(event) =>
                          setCompatibleProfileNames((current) =>
                            event.target.checked
                              ? [...current, profile.name]
                              : current.filter((item) => item !== profile.name)
                          )
                        }
                      />
                      <span className="form-check-label ms-2 d-inline-flex flex-column gap-1">
                        <span>{profile.name}</span>
                        <small className="text-muted">{stripLegacyVisibleText(profile.description) || profile.code}</small>
                      </span>
                    </label>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
      fields={[
        { key: "name", labelEs: "Nombre", labelEn: "Name", placeholderEs: "Ej: Mantención preventiva", placeholderEn: "Ex: Preventive maintenance" },
        { key: "color", labelEs: "Color", labelEn: "Color", placeholderEs: "#2563eb", placeholderEn: "#2563eb" },
        { key: "icon", labelEs: "Icono", labelEn: "Icon", placeholderEs: "calendar", placeholderEn: "calendar" },
        { key: "is_active", labelEs: "Activo", labelEn: "Active", type: "checkbox" },
        { key: "description", labelEs: "Descripción", labelEn: "Description", type: "textarea" },
      ]}
      columns={[
        {
          key: "task_type",
          headerEs: "Tipo",
          headerEn: "Type",
          render: (item) => (
            <div>
              <div className="business-core-cell__title">{item.name}</div>
              <div className="business-core-cell__meta">
                {stripLegacyVisibleText(stripTaskTypeAllowedProfilesMetadata(item.description)) || "—"}
              </div>
              <div className="d-flex flex-wrap gap-1 mt-2">
                {getTaskTypeAllowedProfileNames(item).length > 0 ? (
                  getTaskTypeAllowedProfileNames(item).map((profileName) => (
                    <AppBadge key={profileName} tone="info">
                      {profileName}
                    </AppBadge>
                  ))
                ) : (
                  <AppBadge tone="neutral">
                    {language === "es" ? "Cualquier perfil declarado" : "Any declared profile"}
                  </AppBadge>
                )}
              </div>
            </div>
          ),
        },
        {
          key: "color",
          headerEs: "Color",
          headerEn: "Color",
          render: (item) => (
            <div className="d-flex align-items-center gap-2">
              <span
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: "999px",
                  background: item.color ?? "#94a3b8",
                  display: "inline-block",
                }}
              />
              <span>{item.color ?? "sin color"}</span>
            </div>
          ),
        },
        {
          key: "status",
          headerEs: "Estado",
          headerEn: "Status",
          render: (item, currentLanguage) => (
            <AppBadge tone={item.is_active ? "success" : "warning"}>
              {item.is_active
                ? currentLanguage === "es" ? "activo" : "active"
                : currentLanguage === "es" ? "inactivo" : "inactive"}
            </AppBadge>
          ),
        },
        {
          key: "actions",
          headerEs: "Acciones",
          headerEn: "Actions",
          render: (item, currentLanguage) => (
            <AppToolbar compact>
              <button className="btn btn-sm btn-outline-primary" type="button" onClick={() => startEdit(item)}>
                {currentLanguage === "es" ? "Editar" : "Edit"}
              </button>
              <button className="btn btn-sm btn-outline-secondary" type="button" onClick={() => void handleToggle(item)}>
                {item.is_active
                  ? currentLanguage === "es" ? "Desactivar" : "Deactivate"
                  : currentLanguage === "es" ? "Activar" : "Activate"}
              </button>
              <button className="btn btn-sm btn-outline-danger" type="button" onClick={() => void handleDelete(item)}>
                {currentLanguage === "es" ? "Eliminar" : "Delete"}
              </button>
            </AppToolbar>
          ),
        },
      ]}
    />
  );
}
