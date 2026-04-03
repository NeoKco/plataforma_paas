import { useEffect, useState } from "react";
import { AppBadge } from "../../../../../design-system/AppBadge";
import { AppToolbar } from "../../../../../design-system/AppLayout";
import { useLanguage } from "../../../../../store/language-context";
import { useTenantAuth } from "../../../../../store/tenant-auth-context";
import type { ApiError } from "../../../../../types";
import { BusinessCoreCatalogPage } from "../components/common/BusinessCoreCatalogPage";
import {
  createTenantBusinessWorkGroup,
  deleteTenantBusinessWorkGroup,
  getTenantBusinessWorkGroups,
  updateTenantBusinessWorkGroup,
  updateTenantBusinessWorkGroupStatus,
  type TenantBusinessWorkGroup,
  type TenantBusinessWorkGroupWriteRequest,
} from "../services/workGroupsService";
import { buildInternalTaxonomyCode, stripLegacyVisibleText } from "../utils/taxonomyUi";

function buildDefaultForm(): TenantBusinessWorkGroupWriteRequest {
  return {
    code: null,
    name: "",
    description: null,
    group_kind: "operations",
    is_active: true,
    sort_order: 100,
  };
}

function normalizeNullable(value: string | null): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : null;
}

export function BusinessCoreWorkGroupsPage() {
  const { session } = useTenantAuth();
  const { language } = useLanguage();
  const [items, setItems] = useState<TenantBusinessWorkGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [form, setForm] = useState<TenantBusinessWorkGroupWriteRequest>(buildDefaultForm());

  async function loadItems() {
    if (!session?.accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await getTenantBusinessWorkGroups(session.accessToken);
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

  function startEdit(item: TenantBusinessWorkGroup) {
    setEditingId(item.id);
    setFeedback(null);
    setError(null);
    setForm({
      code: item.code,
      name: item.name,
      description: stripLegacyVisibleText(item.description),
      group_kind: item.group_kind,
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
          ? normalizeNullable(form.code ?? null) || buildInternalTaxonomyCode("group", form.name, editingId)
          : buildInternalTaxonomyCode("group", form.name),
      name: form.name.trim(),
      description: stripLegacyVisibleText(normalizeNullable(form.description)),
    };
    setIsSubmitting(true);
    setError(null);
    try {
      const response = editingId
        ? await updateTenantBusinessWorkGroup(session.accessToken, editingId, payload)
        : await createTenantBusinessWorkGroup(session.accessToken, payload);
      setFeedback(response.message);
      startCreate();
      await loadItems();
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleToggle(item: TenantBusinessWorkGroup) {
    if (!session?.accessToken) return;
    try {
      const response = await updateTenantBusinessWorkGroupStatus(
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

  async function handleDelete(item: TenantBusinessWorkGroup) {
    if (!session?.accessToken) return;
    const confirmed = window.confirm(
      language === "es"
        ? `Eliminar "${item.name}" quitará este grupo base del dominio compartido. ¿Continuar?`
        : `Deleting "${item.name}" will remove this base group from the shared domain. Continue?`
    );
    if (!confirmed) return;
    try {
      const response = await deleteTenantBusinessWorkGroup(session.accessToken, item.id);
      if (editingId === item.id) startCreate();
      setFeedback(response.message);
      await loadItems();
    } catch (rawError) {
      setError(rawError as ApiError);
    }
  }

  return (
    <BusinessCoreCatalogPage
      titleEs="Grupos de trabajo"
      titleEn="Work groups"
      descriptionEs="Equipos reutilizables para mantenciones, proyectos y coordinación operativa."
      descriptionEn="Reusable teams for maintenance, projects, and operational coordination."
      helpEs="Empieza por definir el grupo como contenedor reusable. La membresía vendrá después; no la incrustes todavía en cada módulo operativo."
      helpEn="Start by defining the group as a reusable container. Membership comes later; do not embed it in each operational module yet."
      loadingLabelEs="Cargando grupos de trabajo..."
      loadingLabelEn="Loading work groups..."
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
        { key: "name", labelEs: "Nombre", labelEn: "Name", placeholderEs: "Ej: Terreno Norte", placeholderEn: "Ex: North Field" },
        {
          key: "group_kind",
          labelEs: "Tipo de grupo",
          labelEn: "Group kind",
          type: "select",
          options: [
            { value: "operations", label: language === "es" ? "Operaciones" : "Operations" },
            { value: "field", label: language === "es" ? "Terreno" : "Field" },
            { value: "sales", label: language === "es" ? "Ventas" : "Sales" },
            { value: "support", label: language === "es" ? "Soporte" : "Support" },
          ],
        },
        { key: "is_active", labelEs: "Activo", labelEn: "Active", type: "checkbox" },
        { key: "description", labelEs: "Descripción", labelEn: "Description", type: "textarea" },
      ]}
      columns={[
        {
          key: "group",
          headerEs: "Grupo",
          headerEn: "Group",
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
          key: "kind",
          headerEs: "Tipo",
          headerEn: "Kind",
          render: (item, currentLanguage) =>
            item.group_kind === "field"
              ? currentLanguage === "es" ? "Terreno" : "Field"
              : item.group_kind === "sales"
                ? currentLanguage === "es" ? "Ventas" : "Sales"
                : item.group_kind === "support"
                  ? currentLanguage === "es" ? "Soporte" : "Support"
                  : currentLanguage === "es" ? "Operaciones" : "Operations",
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
