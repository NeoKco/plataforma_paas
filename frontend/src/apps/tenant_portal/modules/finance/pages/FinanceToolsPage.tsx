import { useEffect, useState } from "react";
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
import { FinanceIcon } from "../components/common/FinanceIcon";
import { FinanceModuleNav } from "../components/common/FinanceModuleNav";
import { BeneficiaryForm } from "../forms/BeneficiaryForm";
import { PersonForm } from "../forms/PersonForm";
import { ProjectForm } from "../forms/ProjectForm";
import { TagForm } from "../forms/TagForm";
import {
  createTenantFinanceBeneficiary,
  getTenantFinanceBeneficiaries,
  updateTenantFinanceBeneficiary,
  updateTenantFinanceBeneficiaryStatus,
  type TenantFinanceBeneficiary,
  type TenantFinanceBeneficiaryWriteRequest,
} from "../services/beneficiariesService";
import {
  createTenantFinancePerson,
  getTenantFinancePeople,
  updateTenantFinancePerson,
  updateTenantFinancePersonStatus,
  type TenantFinancePerson,
  type TenantFinancePersonWriteRequest,
} from "../services/peopleService";
import {
  createTenantFinanceProject,
  getTenantFinanceProjects,
  updateTenantFinanceProject,
  updateTenantFinanceProjectStatus,
  type TenantFinanceProject,
  type TenantFinanceProjectWriteRequest,
} from "../services/projectsService";
import {
  createTenantFinanceTag,
  getTenantFinanceTags,
  updateTenantFinanceTag,
  updateTenantFinanceTagStatus,
  type TenantFinanceTag,
  type TenantFinanceTagWriteRequest,
} from "../services/tagsService";
import {
  getFinanceEntityIconLabel,
  getFinanceEntityIconName,
} from "../utils/entityIcons";
import { getActiveStateLabel } from "../utils/presentation";

type ToolTab = "beneficiaries" | "people" | "projects" | "tags";

export function FinanceToolsPage() {
  const { session } = useTenantAuth();
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState<ToolTab>("beneficiaries");
  const [beneficiaries, setBeneficiaries] = useState<TenantFinanceBeneficiary[]>([]);
  const [people, setPeople] = useState<TenantFinancePerson[]>([]);
  const [projects, setProjects] = useState<TenantFinanceProject[]>([]);
  const [tags, setTags] = useState<TenantFinanceTag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [beneficiaryForm, setBeneficiaryForm] = useState<TenantFinanceBeneficiaryWriteRequest>({
    name: "",
    icon: null,
    note: null,
    is_active: true,
    sort_order: 100,
  });
  const [personForm, setPersonForm] = useState<TenantFinancePersonWriteRequest>({
    name: "",
    icon: null,
    note: null,
    is_active: true,
    sort_order: 100,
  });
  const [projectForm, setProjectForm] = useState<TenantFinanceProjectWriteRequest>({
    name: "",
    code: null,
    note: null,
    is_active: true,
    sort_order: 100,
  });
  const [tagForm, setTagForm] = useState<TenantFinanceTagWriteRequest>({
    name: "",
    color: null,
    is_active: true,
    sort_order: 100,
  });

  async function loadData() {
    if (!session?.accessToken) {
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const [beneficiariesResponse, peopleResponse, projectsResponse, tagsResponse] =
        await Promise.all([
          getTenantFinanceBeneficiaries(session.accessToken),
          getTenantFinancePeople(session.accessToken),
          getTenantFinanceProjects(session.accessToken),
          getTenantFinanceTags(session.accessToken),
        ]);
      setBeneficiaries(beneficiariesResponse.data);
      setPeople(peopleResponse.data);
      setProjects(projectsResponse.data);
      setTags(tagsResponse.data);
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [session?.accessToken]);

  function resetForm() {
    setEditingId(null);
    setError(null);
    setBeneficiaryForm({ name: "", icon: null, note: null, is_active: true, sort_order: 100 });
    setPersonForm({ name: "", icon: null, note: null, is_active: true, sort_order: 100 });
    setProjectForm({ name: "", code: null, note: null, is_active: true, sort_order: 100 });
    setTagForm({ name: "", color: null, is_active: true, sort_order: 100 });
  }

  async function submitCurrent() {
    if (!session?.accessToken) {
      return;
    }
    setIsSubmitting(true);
    setError(null);
    setFeedback(null);
    try {
      let message = "";
      if (activeTab === "beneficiaries") {
        message = editingId
          ? (await updateTenantFinanceBeneficiary(session.accessToken, editingId, beneficiaryForm)).message
          : (await createTenantFinanceBeneficiary(session.accessToken, beneficiaryForm)).message;
      } else if (activeTab === "people") {
        message = editingId
          ? (await updateTenantFinancePerson(session.accessToken, editingId, personForm)).message
          : (await createTenantFinancePerson(session.accessToken, personForm)).message;
      } else if (activeTab === "projects") {
        message = editingId
          ? (await updateTenantFinanceProject(session.accessToken, editingId, projectForm)).message
          : (await createTenantFinanceProject(session.accessToken, projectForm)).message;
      } else {
        message = editingId
          ? (await updateTenantFinanceTag(session.accessToken, editingId, tagForm)).message
          : (await createTenantFinanceTag(session.accessToken, tagForm)).message;
      }
      setFeedback(message);
      resetForm();
      await loadData();
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function toggleCurrent(itemId: number, isActive: boolean) {
    if (!session?.accessToken) {
      return;
    }
    try {
      setError(null);
      let message = "";
      if (activeTab === "beneficiaries") {
        message = (
          await updateTenantFinanceBeneficiaryStatus(session.accessToken, itemId, !isActive)
        ).message;
      } else if (activeTab === "people") {
        message = (await updateTenantFinancePersonStatus(session.accessToken, itemId, !isActive)).message;
      } else if (activeTab === "projects") {
        message = (
          await updateTenantFinanceProjectStatus(session.accessToken, itemId, !isActive)
        ).message;
      } else {
        message = (await updateTenantFinanceTagStatus(session.accessToken, itemId, !isActive)).message;
      }
      setFeedback(message);
      await loadData();
    } catch (rawError) {
      setError(rawError as ApiError);
    }
  }

  function startEdit(item: TenantFinanceBeneficiary | TenantFinancePerson | TenantFinanceProject | TenantFinanceTag) {
    setEditingId(item.id);
    setError(null);
    setFeedback(null);
    if (activeTab === "beneficiaries") {
      const current = item as TenantFinanceBeneficiary;
      setBeneficiaryForm({
        name: current.name,
        icon: current.icon,
        note: current.note,
        is_active: current.is_active,
        sort_order: current.sort_order,
      });
    } else if (activeTab === "people") {
      const current = item as TenantFinancePerson;
      setPersonForm({
        name: current.name,
        icon: current.icon,
        note: current.note,
        is_active: current.is_active,
        sort_order: current.sort_order,
      });
    } else if (activeTab === "projects") {
      const current = item as TenantFinanceProject;
      setProjectForm({
        name: current.name,
        code: current.code,
        note: current.note,
        is_active: current.is_active,
        sort_order: current.sort_order,
      });
    } else {
      const current = item as TenantFinanceTag;
      setTagForm({
        name: current.name,
        color: current.color,
        is_active: current.is_active,
        sort_order: current.sort_order,
      });
    }
  }

  return (
    <div className="d-grid gap-4">
      <PageHeader
        eyebrow="Finance"
        icon="catalogs"
        title={language === "es" ? "Catálogos auxiliares" : "Supporting catalogs"}
        description={
          language === "es"
            ? "Administra beneficiarios, personas, proyectos y etiquetas reutilizables."
            : "Manage reusable beneficiaries, people, projects, and tags."
        }
        actions={
          <AppToolbar compact>
            <button className="btn btn-outline-secondary" type="button" onClick={() => void loadData()}>
              {language === "es" ? "Recargar" : "Reload"}
            </button>
            <button className="btn btn-primary" type="button" onClick={resetForm}>
              {language === "es" ? "Nuevo registro" : "New record"}
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
              ? "No se pudieron cargar los catálogos auxiliares"
              : "Supporting catalogs could not be loaded"
          }
          detail={getApiErrorDisplayMessage(error)}
          requestId={error.payload?.request_id}
        />
      ) : null}
      {isLoading ? (
        <LoadingBlock label={language === "es" ? "Cargando catálogos auxiliares..." : "Loading supporting catalogs..."} />
      ) : null}

      <div className="finance-tab-strip">
        {[
          ["beneficiaries", language === "es" ? "Beneficiarios" : "Beneficiaries"],
          ["people", language === "es" ? "Personas" : "People"],
          ["projects", language === "es" ? "Proyectos" : "Projects"],
          ["tags", language === "es" ? "Etiquetas" : "Tags"],
        ].map(([key, label]) => (
          <button
            key={key}
            className={`btn btn-sm ${activeTab === key ? "btn-primary" : "btn-outline-primary"}`}
            type="button"
            onClick={() => {
              setActiveTab(key as ToolTab);
              resetForm();
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="finance-catalog-layout">
        <PanelCard
          title={editingId ? (language === "es" ? "Editar registro" : "Edit record") : (language === "es" ? "Nuevo registro" : "New record")}
          subtitle={
            language === "es"
              ? "Cada catálogo alimenta filtros y asociaciones futuras de transacciones."
              : "Each catalog feeds future transaction filters and associations."
          }
        >
          {activeTab === "beneficiaries" ? (
            <BeneficiaryForm
              value={beneficiaryForm}
              submitLabel={editingId ? (language === "es" ? "Guardar cambios" : "Save changes") : (language === "es" ? "Crear beneficiario" : "Create beneficiary")}
              isSubmitting={isSubmitting}
              onChange={setBeneficiaryForm}
              onSubmit={submitCurrent}
              onCancel={editingId ? resetForm : undefined}
            />
          ) : activeTab === "people" ? (
            <PersonForm
              value={personForm}
              submitLabel={editingId ? (language === "es" ? "Guardar cambios" : "Save changes") : (language === "es" ? "Crear persona" : "Create person")}
              isSubmitting={isSubmitting}
              onChange={setPersonForm}
              onSubmit={submitCurrent}
              onCancel={editingId ? resetForm : undefined}
            />
          ) : activeTab === "projects" ? (
            <ProjectForm
              value={projectForm}
              submitLabel={editingId ? (language === "es" ? "Guardar cambios" : "Save changes") : (language === "es" ? "Crear proyecto" : "Create project")}
              isSubmitting={isSubmitting}
              onChange={setProjectForm}
              onSubmit={submitCurrent}
              onCancel={editingId ? resetForm : undefined}
            />
          ) : (
            <TagForm
              value={tagForm}
              submitLabel={editingId ? (language === "es" ? "Guardar cambios" : "Save changes") : (language === "es" ? "Crear etiqueta" : "Create tag")}
              isSubmitting={isSubmitting}
              onChange={setTagForm}
              onSubmit={submitCurrent}
              onCancel={editingId ? resetForm : undefined}
            />
          )}
        </PanelCard>

        {activeTab === "beneficiaries" ? (
          <DataTableCard
            title={language === "es" ? "Registros" : "Records"}
            subtitle={language === "es" ? "Beneficiarios o terceros para futuras transacciones." : "Beneficiaries or third parties for future transactions."}
            rows={beneficiaries}
            columns={[
              {
                key: "name",
                header: language === "es" ? "Nombre" : "Name",
                render: (item: TenantFinanceBeneficiary) => (
                  <div className="finance-category-row">
                    <span
                      className="finance-category-row__icon"
                      title={getFinanceEntityIconLabel(item.icon, language)}
                    >
                      <FinanceIcon
                        name={getFinanceEntityIconName(item.icon)}
                        size={18}
                      />
                    </span>
                    <span className="fw-semibold">{item.name}</span>
                  </div>
                ),
              },
              {
                key: "secondary",
                header: language === "es" ? "Detalle" : "Detail",
                render: (item: TenantFinanceBeneficiary) =>
                  item.note || getFinanceEntityIconLabel(item.icon, language) || "—",
              },
              {
                key: "status",
                header: language === "es" ? "Estado" : "Status",
                render: (item: TenantFinanceBeneficiary) => (
                  <AppBadge tone={item.is_active ? "success" : "warning"}>
                    {getActiveStateLabel(item.is_active, language)}
                  </AppBadge>
                ),
              },
              {
                key: "actions",
                header: language === "es" ? "Acciones" : "Actions",
                render: (item: TenantFinanceBeneficiary) => (
                  <AppToolbar compact>
                    <button
                      className="btn btn-sm btn-outline-primary"
                      type="button"
                      onClick={() => startEdit(item)}
                    >
                      {language === "es" ? "Editar" : "Edit"}
                    </button>
                    <button
                      className="btn btn-sm btn-outline-secondary"
                      type="button"
                      onClick={() => void toggleCurrent(item.id, item.is_active)}
                    >
                      {item.is_active
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
        ) : null}

        {activeTab === "people" ? (
          <DataTableCard
            title={language === "es" ? "Registros" : "Records"}
            subtitle={language === "es" ? "Personas relacionadas con movimientos o reportes." : "People linked to transactions or reports."}
            rows={people}
            columns={[
              {
                key: "name",
                header: language === "es" ? "Nombre" : "Name",
                render: (item: TenantFinancePerson) => (
                  <div className="finance-category-row">
                    <span
                      className="finance-category-row__icon"
                      title={getFinanceEntityIconLabel(item.icon, language)}
                    >
                      <FinanceIcon
                        name={getFinanceEntityIconName(item.icon)}
                        size={18}
                      />
                    </span>
                    <span className="fw-semibold">{item.name}</span>
                  </div>
                ),
              },
              {
                key: "secondary",
                header: language === "es" ? "Detalle" : "Detail",
                render: (item: TenantFinancePerson) =>
                  item.note || getFinanceEntityIconLabel(item.icon, language) || "—",
              },
              {
                key: "status",
                header: language === "es" ? "Estado" : "Status",
                render: (item: TenantFinancePerson) => (
                  <AppBadge tone={item.is_active ? "success" : "warning"}>
                    {getActiveStateLabel(item.is_active, language)}
                  </AppBadge>
                ),
              },
              {
                key: "actions",
                header: language === "es" ? "Acciones" : "Actions",
                render: (item: TenantFinancePerson) => (
                  <AppToolbar compact>
                    <button
                      className="btn btn-sm btn-outline-primary"
                      type="button"
                      onClick={() => startEdit(item)}
                    >
                      {language === "es" ? "Editar" : "Edit"}
                    </button>
                    <button
                      className="btn btn-sm btn-outline-secondary"
                      type="button"
                      onClick={() => void toggleCurrent(item.id, item.is_active)}
                    >
                      {item.is_active
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
        ) : null}

        {activeTab === "projects" ? (
          <DataTableCard
            title={language === "es" ? "Registros" : "Records"}
            subtitle={language === "es" ? "Proyectos o centros de costo reutilizables." : "Reusable projects or cost centers."}
            rows={projects}
            columns={[
              {
                key: "name",
                header: language === "es" ? "Nombre" : "Name",
                render: (item: TenantFinanceProject) => <span className="fw-semibold">{item.name}</span>,
              },
              {
                key: "secondary",
                header: language === "es" ? "Detalle" : "Detail",
                render: (item: TenantFinanceProject) => item.code || item.note || "—",
              },
              {
                key: "status",
                header: language === "es" ? "Estado" : "Status",
                render: (item: TenantFinanceProject) => (
                  <AppBadge tone={item.is_active ? "success" : "warning"}>
                    {getActiveStateLabel(item.is_active, language)}
                  </AppBadge>
                ),
              },
              {
                key: "actions",
                header: language === "es" ? "Acciones" : "Actions",
                render: (item: TenantFinanceProject) => (
                  <AppToolbar compact>
                    <button
                      className="btn btn-sm btn-outline-primary"
                      type="button"
                      onClick={() => startEdit(item)}
                    >
                      {language === "es" ? "Editar" : "Edit"}
                    </button>
                    <button
                      className="btn btn-sm btn-outline-secondary"
                      type="button"
                      onClick={() => void toggleCurrent(item.id, item.is_active)}
                    >
                      {item.is_active
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
        ) : null}

        {activeTab === "tags" ? (
          <DataTableCard
            title={language === "es" ? "Registros" : "Records"}
            subtitle={language === "es" ? "Etiquetas simples para clasificación futura." : "Simple tags for future classification."}
            rows={tags}
            columns={[
              {
                key: "name",
                header: language === "es" ? "Nombre" : "Name",
                render: (item: TenantFinanceTag) => <span className="fw-semibold">{item.name}</span>,
              },
              {
                key: "secondary",
                header: language === "es" ? "Detalle" : "Detail",
                render: (item: TenantFinanceTag) => item.color || "—",
              },
              {
                key: "status",
                header: language === "es" ? "Estado" : "Status",
                render: (item: TenantFinanceTag) => (
                  <AppBadge tone={item.is_active ? "success" : "warning"}>
                    {getActiveStateLabel(item.is_active, language)}
                  </AppBadge>
                ),
              },
              {
                key: "actions",
                header: language === "es" ? "Acciones" : "Actions",
                render: (item: TenantFinanceTag) => (
                  <AppToolbar compact>
                    <button
                      className="btn btn-sm btn-outline-primary"
                      type="button"
                      onClick={() => startEdit(item)}
                    >
                      {language === "es" ? "Editar" : "Edit"}
                    </button>
                    <button
                      className="btn btn-sm btn-outline-secondary"
                      type="button"
                      onClick={() => void toggleCurrent(item.id, item.is_active)}
                    >
                      {item.is_active
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
        ) : null}
      </div>
    </div>
  );
}
