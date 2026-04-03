import { useEffect, useState } from "react";
import { AppBadge } from "../../../../../design-system/AppBadge";
import { AppToolbar } from "../../../../../design-system/AppLayout";
import { useLanguage } from "../../../../../store/language-context";
import { useTenantAuth } from "../../../../../store/tenant-auth-context";
import type { ApiError } from "../../../../../types";
import { BusinessCoreCatalogPage } from "../components/common/BusinessCoreCatalogPage";
import {
  createTenantBusinessFunctionProfile,
  deleteTenantBusinessFunctionProfile,
  getTenantBusinessFunctionProfiles,
  updateTenantBusinessFunctionProfile,
  updateTenantBusinessFunctionProfileStatus,
  type TenantBusinessFunctionProfile,
  type TenantBusinessFunctionProfileWriteRequest,
} from "../services/functionProfilesService";
import { buildInternalTaxonomyCode, stripLegacyVisibleText } from "../utils/taxonomyUi";

function buildDefaultForm(): TenantBusinessFunctionProfileWriteRequest {
  return {
    code: null,
    name: "",
    description: null,
    is_active: true,
    sort_order: 100,
  };
}

function normalizeNullable(value: string | null): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : null;
}

export function BusinessCoreFunctionProfilesPage() {
  const { session } = useTenantAuth();
  const { language } = useLanguage();
  const [items, setItems] = useState<TenantBusinessFunctionProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [form, setForm] = useState<TenantBusinessFunctionProfileWriteRequest>(buildDefaultForm());

  async function loadItems() {
    if (!session?.accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await getTenantBusinessFunctionProfiles(session.accessToken);
      setItems(response.data);
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
  }

  function startEdit(item: TenantBusinessFunctionProfile) {
    setEditingId(item.id);
    setFeedback(null);
    setError(null);
    setForm({
      code: item.code,
      name: item.name,
      description: stripLegacyVisibleText(item.description),
      is_active: item.is_active,
      sort_order: item.sort_order,
    });
  }

  async function handleSubmit() {
    if (!session?.accessToken) return;
    const payload = {
      ...form,
      code:
        editingId !== null
          ? (form.code?.trim() ?? "") || buildInternalTaxonomyCode("profile", form.name, editingId)
          : buildInternalTaxonomyCode("profile", form.name),
      name: form.name.trim(),
      description: stripLegacyVisibleText(normalizeNullable(form.description)),
    };
    setIsSubmitting(true);
    setError(null);
    try {
      const response = editingId
        ? await updateTenantBusinessFunctionProfile(session.accessToken, editingId, payload)
        : await createTenantBusinessFunctionProfile(session.accessToken, payload);
      setFeedback(response.message);
      startCreate();
      await loadItems();
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleToggle(item: TenantBusinessFunctionProfile) {
    if (!session?.accessToken) return;
    try {
      const response = await updateTenantBusinessFunctionProfileStatus(
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

  async function handleDelete(item: TenantBusinessFunctionProfile) {
    if (!session?.accessToken) return;
    const confirmed = window.confirm(
      language === "es"
        ? `Eliminar "${item.name}" quitará este perfil funcional del catálogo compartido. ¿Continuar?`
        : `Deleting "${item.name}" will remove this functional profile from the shared catalog. Continue?`
    );
    if (!confirmed) return;
    try {
      const response = await deleteTenantBusinessFunctionProfile(session.accessToken, item.id);
      if (editingId === item.id) startCreate();
      setFeedback(response.message);
      await loadItems();
    } catch (rawError) {
      setError(rawError as ApiError);
    }
  }

  return (
    <BusinessCoreCatalogPage
      titleEs="Perfiles funcionales"
      titleEn="Functional profiles"
      descriptionEs="Roles funcionales compartidos por grupos, mantenciones, proyectos y futuros módulos."
      descriptionEn="Functional roles shared by groups, maintenance, projects, and future modules."
      helpEs="Estos perfiles no reemplazan permisos del sistema. Sirven para clasificar trabajo: técnico, supervisor, coordinador o vendedor."
      helpEn="These profiles do not replace system permissions. They classify work: technician, supervisor, coordinator, or salesperson."
      loadingLabelEs="Cargando perfiles funcionales..."
      loadingLabelEn="Loading functional profiles..."
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
      fields={[
        { key: "name", labelEs: "Nombre", labelEn: "Name", placeholderEs: "Ej: Técnico", placeholderEn: "Ex: Technician" },
        { key: "is_active", labelEs: "Activo", labelEn: "Active", type: "checkbox" },
        { key: "description", labelEs: "Descripción", labelEn: "Description", type: "textarea" },
      ]}
      columns={[
        {
          key: "profile",
          headerEs: "Perfil",
          headerEn: "Profile",
          render: (item) => (
            <div>
              <div className="business-core-cell__title">{item.name}</div>
              <div className="business-core-cell__meta">
                {stripLegacyVisibleText(item.description) || "—"}
              </div>
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
