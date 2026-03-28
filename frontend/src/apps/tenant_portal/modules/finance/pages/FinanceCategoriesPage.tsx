import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "../../../../../components/common/PageHeader";
import { PanelCard } from "../../../../../components/common/PanelCard";
import { DataTableCard } from "../../../../../components/data-display/DataTableCard";
import { AppBadge } from "../../../../../design-system/AppBadge";
import { AppToolbar } from "../../../../../design-system/AppLayout";
import { ErrorState } from "../../../../../components/feedback/ErrorState";
import { LoadingBlock } from "../../../../../components/feedback/LoadingBlock";
import { getApiErrorDisplayMessage } from "../../../../../services/api";
import { useLanguage } from "../../../../../store/language-context";
import { useTenantAuth } from "../../../../../store/tenant-auth-context";
import type { ApiError } from "../../../../../types";
import { FinanceModuleNav } from "../components/common/FinanceModuleNav";
import { CategoryForm } from "../forms/CategoryForm";
import {
  createTenantFinanceCategory,
  getTenantFinanceCategories,
  updateTenantFinanceCategory,
  updateTenantFinanceCategoryStatus,
  type TenantFinanceCategory,
  type TenantFinanceCategoryWriteRequest,
} from "../services/categoriesService";
import {
  getActiveStateLabel,
  getFinanceCategoryTypeLabel,
} from "../utils/presentation";

function buildDefaultForm(): TenantFinanceCategoryWriteRequest {
  return {
    name: "",
    category_type: "expense",
    parent_category_id: null,
    icon: null,
    color: null,
    note: null,
    is_active: true,
    sort_order: 100,
  };
}

export function FinanceCategoriesPage() {
  const { session } = useTenantAuth();
  const { language } = useLanguage();
  const [categories, setCategories] = useState<TenantFinanceCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [form, setForm] = useState<TenantFinanceCategoryWriteRequest>(buildDefaultForm());

  async function loadCategories() {
    if (!session?.accessToken) {
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await getTenantFinanceCategories(session.accessToken);
      setCategories(response.data);
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadCategories();
  }, [session?.accessToken]);

  const categoryById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories]
  );

  function startCreate() {
    setEditingCategoryId(null);
    setError(null);
    setFeedback(null);
    setForm(buildDefaultForm());
  }

  function startEdit(category: TenantFinanceCategory) {
    setEditingCategoryId(category.id);
    setError(null);
    setFeedback(null);
    setForm({
      name: category.name,
      category_type: category.category_type,
      parent_category_id: category.parent_category_id,
      icon: category.icon,
      color: category.color,
      note: category.note,
      is_active: category.is_active,
      sort_order: category.sort_order,
    });
  }

  async function handleSubmit() {
    if (!session?.accessToken) {
      return;
    }
    setIsSubmitting(true);
    setError(null);
    setFeedback(null);
    try {
      const response = editingCategoryId
        ? await updateTenantFinanceCategory(session.accessToken, editingCategoryId, form)
        : await createTenantFinanceCategory(session.accessToken, form);
      setFeedback(response.message);
      startCreate();
      await loadCategories();
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleToggle(category: TenantFinanceCategory) {
    if (!session?.accessToken) {
      return;
    }
    try {
      setError(null);
      const response = await updateTenantFinanceCategoryStatus(
        session.accessToken,
        category.id,
        !category.is_active
      );
      setFeedback(response.message);
      await loadCategories();
    } catch (rawError) {
      setError(rawError as ApiError);
    }
  }

  return (
    <div className="d-grid gap-4">
      <PageHeader
        eyebrow="Finance"
        icon="categories"
        title={language === "es" ? "Categorías" : "Categories"}
        description={
          language === "es"
            ? "Gestiona categorías jerárquicas para ingresos, egresos y transferencias."
            : "Manage hierarchical categories for income, expenses, and transfers."
        }
        actions={
          <AppToolbar compact>
            <button className="btn btn-outline-secondary" type="button" onClick={() => void loadCategories()}>
              {language === "es" ? "Recargar" : "Reload"}
            </button>
            <button className="btn btn-primary" type="button" onClick={startCreate}>
              {language === "es" ? "Nueva categoría" : "New category"}
            </button>
          </AppToolbar>
        }
      />
      <FinanceModuleNav />

      {feedback ? <div className="alert alert-success mb-0">{feedback}</div> : null}
      {error ? (
        <ErrorState
          title={
            language === "es"
              ? "No se pudieron cargar las categorías"
              : "Categories could not be loaded"
          }
          detail={getApiErrorDisplayMessage(error)}
          requestId={error.payload?.request_id}
        />
      ) : null}
      {isLoading ? (
        <LoadingBlock
          label={
            language === "es"
              ? "Cargando categorías financieras..."
              : "Loading financial categories..."
          }
        />
      ) : null}

      <div className="finance-catalog-layout">
        <PanelCard
          title={
            editingCategoryId
              ? language === "es"
                ? "Editar categoría"
                : "Edit category"
              : language === "es"
                ? "Nueva categoría"
                : "New category"
          }
          subtitle={
            language === "es"
              ? "Mantén la jerarquía y el tipo de cada categoría."
              : "Maintain the hierarchy and type of each category."
          }
        >
          <CategoryForm
            value={form}
            categories={categories.filter((category) => category.id !== editingCategoryId)}
            submitLabel={
              editingCategoryId
                ? language === "es"
                  ? "Guardar cambios"
                  : "Save changes"
                : language === "es"
                  ? "Crear categoría"
                  : "Create category"
            }
            isSubmitting={isSubmitting}
            onChange={setForm}
            onSubmit={handleSubmit}
            onCancel={editingCategoryId ? startCreate : undefined}
          />
        </PanelCard>

        <DataTableCard
          title={language === "es" ? "Catálogo de categorías" : "Categories catalog"}
          subtitle={
            language === "es"
              ? "Vista consolidada de categorías y relaciones padre-hijo."
              : "Consolidated view of categories and parent-child relationships."
          }
          rows={categories}
          columns={[
            {
              key: "name",
              header: language === "es" ? "Categoría" : "Category",
              render: (category) => (
                <div>
                  <div className="fw-semibold">{category.name}</div>
                  <div className="text-secondary small">
                    {categoryById.get(category.parent_category_id ?? 0)?.name ||
                      (language === "es" ? "sin padre" : "no parent")}
                  </div>
                </div>
              ),
            },
            {
              key: "type",
              header: language === "es" ? "Tipo" : "Type",
              render: (category) =>
                getFinanceCategoryTypeLabel(category.category_type, language),
            },
            {
              key: "status",
              header: language === "es" ? "Estado" : "Status",
              render: (category) => (
                <AppBadge tone={category.is_active ? "success" : "warning"}>
                  {getActiveStateLabel(category.is_active, language)}
                </AppBadge>
              ),
            },
            {
              key: "actions",
              header: language === "es" ? "Acciones" : "Actions",
              render: (category) => (
                <AppToolbar compact>
                  <button
                    className="btn btn-sm btn-outline-primary"
                    type="button"
                    onClick={() => startEdit(category)}
                  >
                    {language === "es" ? "Editar" : "Edit"}
                  </button>
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    type="button"
                    onClick={() => void handleToggle(category)}
                  >
                    {category.is_active
                      ? language === "es"
                        ? "Desactivar"
                        : "Deactivate"
                      : language === "es"
                        ? "Activar"
                        : "Activate"}
                  </button>
                </AppToolbar>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}
