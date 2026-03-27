import { useEffect, useState } from "react";
import { PageHeader } from "../../../../../components/common/PageHeader";
import { PanelCard } from "../../../../../components/common/PanelCard";
import { DataTableCard } from "../../../../../components/data-display/DataTableCard";
import { ErrorState } from "../../../../../components/feedback/ErrorState";
import { LoadingBlock } from "../../../../../components/feedback/LoadingBlock";
import { getApiErrorDisplayMessage } from "../../../../../services/api";
import { useTenantAuth } from "../../../../../store/tenant-auth-context";
import type { ApiError } from "../../../../../types";
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

type ToolTab = "beneficiaries" | "people" | "projects" | "tags";

export function FinanceToolsPage() {
  const { session } = useTenantAuth();
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
        title="Catálogos auxiliares"
        description="Administra beneficiarios, personas, proyectos y etiquetas reutilizables."
        actions={
          <>
            <button className="btn btn-outline-secondary" type="button" onClick={() => void loadData()}>
              Recargar
            </button>
            <button className="btn btn-primary" type="button" onClick={resetForm}>
              Nuevo registro
            </button>
          </>
        }
      />
      <FinanceModuleNav />
      {feedback ? <div className="alert alert-success mb-0">{feedback}</div> : null}
      {error ? (
        <ErrorState
          title="No se pudieron cargar los catálogos auxiliares"
          detail={getApiErrorDisplayMessage(error)}
          requestId={error.payload?.request_id}
        />
      ) : null}
      {isLoading ? <LoadingBlock label="Cargando catálogos auxiliares..." /> : null}

      <div className="finance-tab-strip">
        {[
          ["beneficiaries", "Beneficiarios"],
          ["people", "Personas"],
          ["projects", "Proyectos"],
          ["tags", "Etiquetas"],
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
          title={editingId ? "Editar registro" : "Nuevo registro"}
          subtitle="Cada catálogo alimenta filtros y asociaciones futuras de transacciones."
        >
          {activeTab === "beneficiaries" ? (
            <BeneficiaryForm
              value={beneficiaryForm}
              submitLabel={editingId ? "Guardar cambios" : "Crear beneficiario"}
              isSubmitting={isSubmitting}
              onChange={setBeneficiaryForm}
              onSubmit={submitCurrent}
              onCancel={editingId ? resetForm : undefined}
            />
          ) : activeTab === "people" ? (
            <PersonForm
              value={personForm}
              submitLabel={editingId ? "Guardar cambios" : "Crear persona"}
              isSubmitting={isSubmitting}
              onChange={setPersonForm}
              onSubmit={submitCurrent}
              onCancel={editingId ? resetForm : undefined}
            />
          ) : activeTab === "projects" ? (
            <ProjectForm
              value={projectForm}
              submitLabel={editingId ? "Guardar cambios" : "Crear proyecto"}
              isSubmitting={isSubmitting}
              onChange={setProjectForm}
              onSubmit={submitCurrent}
              onCancel={editingId ? resetForm : undefined}
            />
          ) : (
            <TagForm
              value={tagForm}
              submitLabel={editingId ? "Guardar cambios" : "Crear etiqueta"}
              isSubmitting={isSubmitting}
              onChange={setTagForm}
              onSubmit={submitCurrent}
              onCancel={editingId ? resetForm : undefined}
            />
          )}
        </PanelCard>

        {activeTab === "beneficiaries" ? (
          <DataTableCard
            title="Registros"
            subtitle="Beneficiarios o terceros para futuras transacciones."
            rows={beneficiaries}
            columns={[
              {
                key: "name",
                header: "Nombre",
                render: (item: TenantFinanceBeneficiary) => (
                  <span className="fw-semibold">{item.name}</span>
                ),
              },
              {
                key: "secondary",
                header: "Detalle",
                render: (item: TenantFinanceBeneficiary) => item.note || item.icon || "—",
              },
              {
                key: "status",
                header: "Estado",
                render: (item: TenantFinanceBeneficiary) => (
                  <span
                    className={`finance-status-pill${item.is_active ? " is-active" : " is-inactive"}`}
                  >
                    {item.is_active ? "activo" : "inactivo"}
                  </span>
                ),
              },
              {
                key: "actions",
                header: "Acciones",
                render: (item: TenantFinanceBeneficiary) => (
                  <div className="d-flex gap-2">
                    <button
                      className="btn btn-sm btn-outline-primary"
                      type="button"
                      onClick={() => startEdit(item)}
                    >
                      Editar
                    </button>
                    <button
                      className="btn btn-sm btn-outline-secondary"
                      type="button"
                      onClick={() => void toggleCurrent(item.id, item.is_active)}
                    >
                      {item.is_active ? "Desactivar" : "Activar"}
                    </button>
                  </div>
                ),
              },
            ]}
          />
        ) : null}

        {activeTab === "people" ? (
          <DataTableCard
            title="Registros"
            subtitle="Personas relacionadas con movimientos o reportes."
            rows={people}
            columns={[
              {
                key: "name",
                header: "Nombre",
                render: (item: TenantFinancePerson) => <span className="fw-semibold">{item.name}</span>,
              },
              {
                key: "secondary",
                header: "Detalle",
                render: (item: TenantFinancePerson) => item.note || item.icon || "—",
              },
              {
                key: "status",
                header: "Estado",
                render: (item: TenantFinancePerson) => (
                  <span
                    className={`finance-status-pill${item.is_active ? " is-active" : " is-inactive"}`}
                  >
                    {item.is_active ? "activo" : "inactivo"}
                  </span>
                ),
              },
              {
                key: "actions",
                header: "Acciones",
                render: (item: TenantFinancePerson) => (
                  <div className="d-flex gap-2">
                    <button
                      className="btn btn-sm btn-outline-primary"
                      type="button"
                      onClick={() => startEdit(item)}
                    >
                      Editar
                    </button>
                    <button
                      className="btn btn-sm btn-outline-secondary"
                      type="button"
                      onClick={() => void toggleCurrent(item.id, item.is_active)}
                    >
                      {item.is_active ? "Desactivar" : "Activar"}
                    </button>
                  </div>
                ),
              },
            ]}
          />
        ) : null}

        {activeTab === "projects" ? (
          <DataTableCard
            title="Registros"
            subtitle="Proyectos o centros de costo reutilizables."
            rows={projects}
            columns={[
              {
                key: "name",
                header: "Nombre",
                render: (item: TenantFinanceProject) => <span className="fw-semibold">{item.name}</span>,
              },
              {
                key: "secondary",
                header: "Detalle",
                render: (item: TenantFinanceProject) => item.code || item.note || "—",
              },
              {
                key: "status",
                header: "Estado",
                render: (item: TenantFinanceProject) => (
                  <span
                    className={`finance-status-pill${item.is_active ? " is-active" : " is-inactive"}`}
                  >
                    {item.is_active ? "activo" : "inactivo"}
                  </span>
                ),
              },
              {
                key: "actions",
                header: "Acciones",
                render: (item: TenantFinanceProject) => (
                  <div className="d-flex gap-2">
                    <button
                      className="btn btn-sm btn-outline-primary"
                      type="button"
                      onClick={() => startEdit(item)}
                    >
                      Editar
                    </button>
                    <button
                      className="btn btn-sm btn-outline-secondary"
                      type="button"
                      onClick={() => void toggleCurrent(item.id, item.is_active)}
                    >
                      {item.is_active ? "Desactivar" : "Activar"}
                    </button>
                  </div>
                ),
              },
            ]}
          />
        ) : null}

        {activeTab === "tags" ? (
          <DataTableCard
            title="Registros"
            subtitle="Etiquetas simples para clasificación futura."
            rows={tags}
            columns={[
              {
                key: "name",
                header: "Nombre",
                render: (item: TenantFinanceTag) => <span className="fw-semibold">{item.name}</span>,
              },
              {
                key: "secondary",
                header: "Detalle",
                render: (item: TenantFinanceTag) => item.color || "—",
              },
              {
                key: "status",
                header: "Estado",
                render: (item: TenantFinanceTag) => (
                  <span
                    className={`finance-status-pill${item.is_active ? " is-active" : " is-inactive"}`}
                  >
                    {item.is_active ? "activo" : "inactivo"}
                  </span>
                ),
              },
              {
                key: "actions",
                header: "Acciones",
                render: (item: TenantFinanceTag) => (
                  <div className="d-flex gap-2">
                    <button
                      className="btn btn-sm btn-outline-primary"
                      type="button"
                      onClick={() => startEdit(item)}
                    >
                      Editar
                    </button>
                    <button
                      className="btn btn-sm btn-outline-secondary"
                      type="button"
                      onClick={() => void toggleCurrent(item.id, item.is_active)}
                    >
                      {item.is_active ? "Desactivar" : "Activar"}
                    </button>
                  </div>
                ),
              },
            ]}
          />
        ) : null}
      </div>
    </div>
  );
}
