import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { PageHeader } from "../../../../../components/common/PageHeader";
import { PanelCard } from "../../../../../components/common/PanelCard";
import { DataTableCard } from "../../../../../components/data-display/DataTableCard";
import { ErrorState } from "../../../../../components/feedback/ErrorState";
import { LoadingBlock } from "../../../../../components/feedback/LoadingBlock";
import { AppToolbar } from "../../../../../design-system/AppLayout";
import { getApiErrorDisplayMessage } from "../../../../../services/api";
import { getTenantUsers } from "../../../../../services/tenant-api";
import { useLanguage } from "../../../../../store/language-context";
import { useTenantAuth } from "../../../../../store/tenant-auth-context";
import type { ApiError, TenantUsersItem } from "../../../../../types";
import { getTenantBusinessClients } from "../../business_core/services/clientsService";
import { getTenantBusinessOrganizations } from "../../business_core/services/organizationsService";
import { getTenantBusinessSites } from "../../business_core/services/sitesService";
import { getCRMOpportunities, type CRMOpportunity } from "../../crm/services/crmService";
import {
  getTenantMaintenanceInstallations,
  type TenantMaintenanceInstallation,
} from "../../maintenance/services/installationsService";
import {
  getTenantMaintenanceWorkOrders,
  type TenantMaintenanceWorkOrder,
} from "../../maintenance/services/workOrdersService";
import { getTaskOpsTasks, type TaskOpsTask } from "../../taskops/services/taskopsService";
import { TechDocsModuleNav } from "../components/common/TechDocsModuleNav";
import {
  createTechDocsDossier,
  createTechDocsMeasurement,
  createTechDocsSection,
  deleteTechDocsDossier,
  deleteTechDocsEvidence,
  deleteTechDocsMeasurement,
  deleteTechDocsSection,
  downloadTechDocsEvidence,
  getTechDocsDossierDetail,
  getTechDocsDossiers,
  updateTechDocsDossier,
  updateTechDocsDossierStatus,
  updateTechDocsMeasurement,
  updateTechDocsSection,
  uploadTechDocsEvidence,
  type TechDocsDossier,
  type TechDocsDossierDetail,
  type TechDocsDossierWriteRequest,
  type TechDocsMeasurement,
  type TechDocsMeasurementWriteRequest,
  type TechDocsSection,
  type TechDocsSectionWriteRequest,
} from "../services/techdocsService";

type DossierFormState = {
  client_id: string;
  site_id: string;
  installation_id: string;
  opportunity_id: string;
  work_order_id: string;
  task_id: string;
  owner_user_id: string;
  title: string;
  dossier_type: string;
  status: string;
  summary: string;
  objective: string;
  scope_notes: string;
  technical_notes: string;
  is_active: boolean;
};

type SectionFormState = {
  section_kind: string;
  title: string;
  notes: string;
  sort_order: string;
};

type MeasurementFormState = {
  section_id: string;
  label: string;
  measured_value: string;
  unit: string;
  expected_range: string;
  notes: string;
  sort_order: string;
};

const DOSSIER_TYPES = [
  "installation",
  "diagnosis",
  "maintenance_support",
  "commercial_support",
  "compliance",
  "custom",
];
const DOSSIER_STATUSES = ["draft", "in_review", "approved", "archived"];
const SECTION_KINDS = ["dc", "ac", "grounding", "inspection", "documents", "custom"];
const EVIDENCE_KINDS = ["photo", "report", "certificate", "plan", "support", "note"];

function emptyDossierForm(): DossierFormState {
  return {
    client_id: "",
    site_id: "",
    installation_id: "",
    opportunity_id: "",
    work_order_id: "",
    task_id: "",
    owner_user_id: "",
    title: "",
    dossier_type: "custom",
    status: "draft",
    summary: "",
    objective: "",
    scope_notes: "",
    technical_notes: "",
    is_active: true,
  };
}

function emptySectionForm(): SectionFormState {
  return {
    section_kind: "custom",
    title: "",
    notes: "",
    sort_order: "100",
  };
}

function emptyMeasurementForm(sectionId = ""): MeasurementFormState {
  return {
    section_id: sectionId,
    label: "",
    measured_value: "",
    unit: "",
    expected_range: "",
    notes: "",
    sort_order: "100",
  };
}

function formatDateTime(value: string | null, language: "es" | "en") {
  if (!value) return "—";
  return new Intl.DateTimeFormat(language === "es" ? "es-CL" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function toNullableNumber(value: string) {
  const normalized = value.trim();
  return normalized ? Number(normalized) : null;
}

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export function TechDocsDossiersPage() {
  const { session } = useTenantAuth();
  const { language } = useLanguage();
  const [rows, setRows] = useState<TechDocsDossier[]>([]);
  const [detail, setDetail] = useState<TechDocsDossierDetail | null>(null);
  const [selectedDossierId, setSelectedDossierId] = useState<number | null>(null);
  const [users, setUsers] = useState<TenantUsersItem[]>([]);
  const [clients, setClients] = useState<Array<{ id: number; label: string }>>([]);
  const [sites, setSites] = useState<Array<{ id: number; label: string }>>([]);
  const [installations, setInstallations] = useState<TenantMaintenanceInstallation[]>([]);
  const [workOrders, setWorkOrders] = useState<TenantMaintenanceWorkOrder[]>([]);
  const [opportunities, setOpportunities] = useState<CRMOpportunity[]>([]);
  const [tasks, setTasks] = useState<TaskOpsTask[]>([]);
  const [dossierForm, setDossierForm] = useState<DossierFormState>(emptyDossierForm);
  const [sectionForm, setSectionForm] = useState<SectionFormState>(emptySectionForm);
  const [measurementForm, setMeasurementForm] = useState<MeasurementFormState>(emptyMeasurementForm());
  const [editingSectionId, setEditingSectionId] = useState<number | null>(null);
  const [editingMeasurementId, setEditingMeasurementId] = useState<number | null>(null);
  const [statusNotes, setStatusNotes] = useState("");
  const [evidenceKind, setEvidenceKind] = useState("photo");
  const [evidenceDescription, setEvidenceDescription] = useState("");
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<ApiError | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function loadBase() {
    if (!session?.accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const [
        dossiersResponse,
        usersResponse,
        clientsResponse,
        organizationsResponse,
        sitesResponse,
        installationsResponse,
        workOrdersResponse,
        opportunitiesResponse,
        tasksResponse,
      ] = await Promise.all([
        getTechDocsDossiers(session.accessToken, {
          includeInactive: true,
          includeArchived: true,
          q: query,
        }),
        getTenantUsers(session.accessToken),
        getTenantBusinessClients(session.accessToken, { includeInactive: true }),
        getTenantBusinessOrganizations(session.accessToken, { includeInactive: true }),
        getTenantBusinessSites(session.accessToken, { includeInactive: true }),
        getTenantMaintenanceInstallations(session.accessToken, { includeInactive: true }),
        getTenantMaintenanceWorkOrders(session.accessToken),
        getCRMOpportunities(session.accessToken),
        getTaskOpsTasks(session.accessToken, { includeInactive: true, includeClosed: true }),
      ]);

      const organizationMap = new Map(
        organizationsResponse.data.map((item) => [item.id, item.legal_name || item.name])
      );
      setRows(dossiersResponse.data);
      setUsers(usersResponse.data);
      setClients(
        clientsResponse.data.map((item) => ({
          id: item.id,
          label:
            organizationMap.get(item.organization_id) ||
            (language === "es" ? `Cliente #${item.id}` : `Client #${item.id}`),
        }))
      );
      setSites(
        sitesResponse.data.map((item) => ({
          id: item.id,
          label: item.name || item.address_line || `Site #${item.id}`,
        }))
      );
      setInstallations(installationsResponse.data);
      setWorkOrders(workOrdersResponse.data);
      setOpportunities(opportunitiesResponse.data);
      setTasks(tasksResponse.data);
    } catch (rawError) {
      setError(rawError as ApiError);
      setRows([]);
      setUsers([]);
      setClients([]);
      setSites([]);
      setInstallations([]);
      setWorkOrders([]);
      setOpportunities([]);
      setTasks([]);
    } finally {
      setIsLoading(false);
    }
  }

  async function loadDetail(dossierId: number, preserveMessage = false) {
    if (!session?.accessToken) return;
    try {
      const response = await getTechDocsDossierDetail(session.accessToken, dossierId);
      setDetail(response.data);
      setSelectedDossierId(dossierId);
      setDossierForm({
        client_id: response.data.dossier.client_id ? String(response.data.dossier.client_id) : "",
        site_id: response.data.dossier.site_id ? String(response.data.dossier.site_id) : "",
        installation_id: response.data.dossier.installation_id
          ? String(response.data.dossier.installation_id)
          : "",
        opportunity_id: response.data.dossier.opportunity_id
          ? String(response.data.dossier.opportunity_id)
          : "",
        work_order_id: response.data.dossier.work_order_id ? String(response.data.dossier.work_order_id) : "",
        task_id: response.data.dossier.task_id ? String(response.data.dossier.task_id) : "",
        owner_user_id: response.data.dossier.owner_user_id
          ? String(response.data.dossier.owner_user_id)
          : "",
        title: response.data.dossier.title,
        dossier_type: response.data.dossier.dossier_type,
        status: response.data.dossier.status,
        summary: response.data.dossier.summary || "",
        objective: response.data.dossier.objective || "",
        scope_notes: response.data.dossier.scope_notes || "",
        technical_notes: response.data.dossier.technical_notes || "",
        is_active: response.data.dossier.is_active,
      });
      setSectionForm(emptySectionForm());
      setMeasurementForm(
        emptyMeasurementForm(
          response.data.sections.length > 0 ? String(response.data.sections[0].id) : ""
        )
      );
      setEditingSectionId(null);
      setEditingMeasurementId(null);
      if (!preserveMessage) {
        setFeedback(null);
      }
    } catch (rawError) {
      setError(rawError as ApiError);
    }
  }

  useEffect(() => {
    void loadBase();
  }, [session?.accessToken]);

  async function refreshRowsAndDetail(preserveSelection = true) {
    await loadBase();
    if (preserveSelection && selectedDossierId) {
      await loadDetail(selectedDossierId, true);
    }
  }

  function buildDossierPayload(): TechDocsDossierWriteRequest {
    return {
      client_id: toNullableNumber(dossierForm.client_id),
      site_id: toNullableNumber(dossierForm.site_id),
      installation_id: toNullableNumber(dossierForm.installation_id),
      opportunity_id: toNullableNumber(dossierForm.opportunity_id),
      work_order_id: toNullableNumber(dossierForm.work_order_id),
      task_id: toNullableNumber(dossierForm.task_id),
      owner_user_id: toNullableNumber(dossierForm.owner_user_id),
      title: dossierForm.title.trim(),
      dossier_type: dossierForm.dossier_type,
      status: dossierForm.status,
      summary: dossierForm.summary.trim() || null,
      objective: dossierForm.objective.trim() || null,
      scope_notes: dossierForm.scope_notes.trim() || null,
      technical_notes: dossierForm.technical_notes.trim() || null,
      is_active: dossierForm.is_active,
    };
  }

  async function handleSubmitDossier(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.accessToken || isSubmitting) return;
    setIsSubmitting(true);
    setFeedback(null);
    setError(null);
    try {
      const payload = buildDossierPayload();
      const response = selectedDossierId
        ? await updateTechDocsDossier(session.accessToken, selectedDossierId, payload)
        : await createTechDocsDossier(session.accessToken, payload);
      setFeedback(response.message);
      await loadBase();
      await loadDetail(response.data.id, true);
      if (!selectedDossierId) {
        setDossierForm(emptyDossierForm());
      }
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleArchiveDossier() {
    if (!session?.accessToken || !selectedDossierId || isSubmitting) return;
    setIsSubmitting(true);
    setFeedback(null);
    setError(null);
    try {
      const response = await deleteTechDocsDossier(session.accessToken, selectedDossierId);
      setFeedback(response.message);
      await refreshRowsAndDetail();
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleStatusUpdate() {
    if (!session?.accessToken || !selectedDossierId || isSubmitting) return;
    setIsSubmitting(true);
    setFeedback(null);
    setError(null);
    try {
      const response = await updateTechDocsDossierStatus(
        session.accessToken,
        selectedDossierId,
        dossierForm.status,
        statusNotes.trim() || null
      );
      setFeedback(response.message);
      setStatusNotes("");
      await refreshRowsAndDetail();
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSubmitSection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.accessToken || !selectedDossierId || isSubmitting) return;
    setIsSubmitting(true);
    setFeedback(null);
    setError(null);
    try {
      const payload: TechDocsSectionWriteRequest = {
        section_kind: sectionForm.section_kind,
        title: sectionForm.title.trim(),
        notes: sectionForm.notes.trim() || null,
        sort_order: Number(sectionForm.sort_order || "100"),
      };
      const response = editingSectionId
        ? await updateTechDocsSection(session.accessToken, editingSectionId, payload)
        : await createTechDocsSection(session.accessToken, selectedDossierId, payload);
      setDetail(response.detail);
      setFeedback(response.message);
      setSectionForm(emptySectionForm());
      setEditingSectionId(null);
      setMeasurementForm(
        emptyMeasurementForm(
          response.detail.sections.length > 0 ? String(response.detail.sections[0].id) : ""
        )
      );
      await loadBase();
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteSection(sectionId: number) {
    if (!session?.accessToken || isSubmitting) return;
    setIsSubmitting(true);
    setFeedback(null);
    setError(null);
    try {
      const response = await deleteTechDocsSection(session.accessToken, sectionId);
      setDetail(response.detail);
      setFeedback(response.message);
      setSectionForm(emptySectionForm());
      setEditingSectionId(null);
      setMeasurementForm(
        emptyMeasurementForm(
          response.detail.sections.length > 0 ? String(response.detail.sections[0].id) : ""
        )
      );
      await loadBase();
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSubmitMeasurement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.accessToken || isSubmitting) return;
    setIsSubmitting(true);
    setFeedback(null);
    setError(null);
    try {
      const payload: TechDocsMeasurementWriteRequest = {
        label: measurementForm.label.trim(),
        measured_value: measurementForm.measured_value.trim() || null,
        unit: measurementForm.unit.trim() || null,
        expected_range: measurementForm.expected_range.trim() || null,
        notes: measurementForm.notes.trim() || null,
        sort_order: Number(measurementForm.sort_order || "100"),
      };
      const response = editingMeasurementId
        ? await updateTechDocsMeasurement(session.accessToken, editingMeasurementId, payload)
        : await createTechDocsMeasurement(
            session.accessToken,
            Number(measurementForm.section_id),
            payload
          );
      setDetail(response.detail);
      setFeedback(response.message);
      setMeasurementForm(
        emptyMeasurementForm(
          response.detail.sections.length > 0 ? String(response.detail.sections[0].id) : ""
        )
      );
      setEditingMeasurementId(null);
      await loadBase();
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteMeasurement(measurementId: number) {
    if (!session?.accessToken || isSubmitting) return;
    setIsSubmitting(true);
    setFeedback(null);
    setError(null);
    try {
      const response = await deleteTechDocsMeasurement(session.accessToken, measurementId);
      setDetail(response.detail);
      setFeedback(response.message);
      setMeasurementForm(
        emptyMeasurementForm(
          response.detail.sections.length > 0 ? String(response.detail.sections[0].id) : ""
        )
      );
      setEditingMeasurementId(null);
      await loadBase();
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleUploadEvidence(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.accessToken || !selectedDossierId || !evidenceFile || isSubmitting) return;
    setIsSubmitting(true);
    setFeedback(null);
    setError(null);
    try {
      const response = await uploadTechDocsEvidence(session.accessToken, selectedDossierId, {
        file: evidenceFile,
        evidenceKind,
        description: evidenceDescription.trim() || null,
      });
      setDetail(response.detail);
      setFeedback(response.message);
      setEvidenceFile(null);
      setEvidenceDescription("");
      setEvidenceKind("photo");
      await loadBase();
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteEvidence(evidenceId: number) {
    if (!session?.accessToken || !selectedDossierId || isSubmitting) return;
    setIsSubmitting(true);
    setFeedback(null);
    setError(null);
    try {
      const response = await deleteTechDocsEvidence(
        session.accessToken,
        selectedDossierId,
        evidenceId
      );
      setDetail(response.detail);
      setFeedback(response.message);
      await loadBase();
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsSubmitting(false);
    }
  }

  function startSectionEdit(section: TechDocsSection) {
    setEditingSectionId(section.id);
    setSectionForm({
      section_kind: section.section_kind,
      title: section.title,
      notes: section.notes || "",
      sort_order: String(section.sort_order),
    });
  }

  function startMeasurementEdit(measurement: TechDocsMeasurement) {
    setEditingMeasurementId(measurement.id);
    setMeasurementForm({
      section_id: String(measurement.section_id),
      label: measurement.label,
      measured_value: measurement.measured_value || "",
      unit: measurement.unit || "",
      expected_range: measurement.expected_range || "",
      notes: measurement.notes || "",
      sort_order: String(measurement.sort_order),
    });
  }

  const installationOptions = useMemo(
    () =>
      installations.map((item) => ({
        id: item.id,
        label: item.name || `Instalación #${item.id}`,
      })),
    [installations]
  );
  const workOrderOptions = useMemo(
    () =>
      workOrders.map((item) => ({
        id: item.id,
        label: item.title || `OT #${item.id}`,
      })),
    [workOrders]
  );
  const opportunityOptions = useMemo(
    () =>
      opportunities.map((item) => ({
        id: item.id,
        label: item.title || `Oportunidad #${item.id}`,
      })),
    [opportunities]
  );
  const taskOptions = useMemo(
    () =>
      tasks.map((item) => ({
        id: item.id,
        label: item.title || `Task #${item.id}`,
      })),
    [tasks]
  );

  if (isLoading) {
    return (
      <LoadingBlock
        label={language === "es" ? "Cargando expedientes técnicos..." : "Loading technical dossiers..."}
      />
    );
  }

  if (error && rows.length === 0) {
    return (
      <ErrorState
        title={
          language === "es"
            ? "No se pudo cargar expediente técnico"
            : "Could not load technical dossier"
        }
        detail={getApiErrorDisplayMessage(error)}
      />
    );
  }

  return (
    <div className="techdocs-page">
      <PageHeader
        eyebrow={language === "es" ? "EXPEDIENTE TÉCNICO" : "TECHNICAL DOSSIER"}
        title={language === "es" ? "Expedientes técnicos" : "Technical dossiers"}
        description={
          language === "es"
            ? "Gestiona dossier base, secciones, mediciones, evidencias y auditoría desde un mismo módulo."
            : "Manage dossier base, sections, measurements, evidences and audit from a single module."
        }
        icon="techdocs"
      />

      <AppToolbar>
        <TechDocsModuleNav />
      </AppToolbar>

      {feedback ? <div className="alert alert-success">{feedback}</div> : null}
      {error ? <div className="alert alert-danger">{getApiErrorDisplayMessage(error)}</div> : null}

      <div className="techdocs-filter-grid">
        <label>
          {language === "es" ? "Buscar expedientes" : "Search dossiers"}
          <input
            className="form-control"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={language === "es" ? "título, resumen o notas" : "title, summary or notes"}
          />
        </label>
        <div className="techdocs-filter-actions">
          <button className="btn btn-primary" type="button" onClick={() => void loadBase()}>
            {language === "es" ? "Recargar" : "Reload"}
          </button>
          <button
            className="btn btn-outline-secondary"
            type="button"
            onClick={() => {
              setSelectedDossierId(null);
              setDetail(null);
              setDossierForm(emptyDossierForm());
              setSectionForm(emptySectionForm());
              setMeasurementForm(emptyMeasurementForm());
              setEditingSectionId(null);
              setEditingMeasurementId(null);
            }}
          >
            {language === "es" ? "Nuevo expediente" : "New dossier"}
          </button>
        </div>
      </div>

      <DataTableCard<TechDocsDossier>
        title={language === "es" ? "Expedientes" : "Dossiers"}
        subtitle={
          language === "es"
            ? "Selecciona un expediente para editar su dossier y sus subrecursos."
            : "Select a dossier to edit its base record and subresources."
        }
        rows={rows}
        columns={[
          {
            key: "title",
            header: language === "es" ? "Expediente" : "Dossier",
            render: (row) => (
              <div>
                <strong>{row.title}</strong>
                <div className="text-muted small">{row.summary || "—"}</div>
              </div>
            ),
          },
          {
            key: "links",
            header: language === "es" ? "Relaciones" : "Links",
            render: (row) => (
              <div className="small">
                {row.client_display_name || "—"}
                <br />
                {row.installation_display_name || row.opportunity_title || row.work_order_title || row.task_title || "—"}
              </div>
            ),
          },
          {
            key: "status",
            header: language === "es" ? "Estado" : "Status",
            render: (row) => (
              <div className="small">
                {row.status}
                <br />
                {row.dossier_type}
              </div>
            ),
          },
          {
            key: "updated",
            header: language === "es" ? "Actualizado" : "Updated",
            render: (row) => (
              <div className="small">{formatDateTime(row.updated_at, language)}</div>
            ),
          },
          {
            key: "actions",
            header: language === "es" ? "Acciones" : "Actions",
            render: (row) => (
              <button
                className="btn btn-sm btn-outline-primary"
                type="button"
                onClick={() => void loadDetail(row.id)}
              >
                {language === "es" ? "Abrir" : "Open"}
              </button>
            ),
          },
        ]}
      />

      <div className="techdocs-detail-grid">
        <PanelCard title={selectedDossierId ? (language === "es" ? "Editar expediente" : "Edit dossier") : (language === "es" ? "Nuevo expediente" : "New dossier")}>
          <form className="techdocs-form-grid" onSubmit={(event) => void handleSubmitDossier(event)}>
            <label>
              {language === "es" ? "Título" : "Title"}
              <input
                className="form-control"
                value={dossierForm.title}
                onChange={(event) => setDossierForm((current) => ({ ...current, title: event.target.value }))}
                required
              />
            </label>
            <label>
              {language === "es" ? "Tipo" : "Type"}
              <select
                className="form-select"
                value={dossierForm.dossier_type}
                onChange={(event) =>
                  setDossierForm((current) => ({ ...current, dossier_type: event.target.value }))
                }
              >
                {DOSSIER_TYPES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {language === "es" ? "Estado" : "Status"}
              <select
                className="form-select"
                value={dossierForm.status}
                onChange={(event) =>
                  setDossierForm((current) => ({ ...current, status: event.target.value }))
                }
              >
                {DOSSIER_STATUSES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {language === "es" ? "Responsable" : "Owner"}
              <select
                className="form-select"
                value={dossierForm.owner_user_id}
                onChange={(event) =>
                  setDossierForm((current) => ({ ...current, owner_user_id: event.target.value }))
                }
              >
                <option value="">{language === "es" ? "Sin asignar" : "Unassigned"}</option>
                {users.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.full_name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {language === "es" ? "Cliente" : "Client"}
              <select
                className="form-select"
                value={dossierForm.client_id}
                onChange={(event) =>
                  setDossierForm((current) => ({ ...current, client_id: event.target.value }))
                }
              >
                <option value="">{language === "es" ? "Sin cliente" : "No client"}</option>
                {clients.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {language === "es" ? "Sitio" : "Site"}
              <select
                className="form-select"
                value={dossierForm.site_id}
                onChange={(event) =>
                  setDossierForm((current) => ({ ...current, site_id: event.target.value }))
                }
              >
                <option value="">{language === "es" ? "Sin sitio" : "No site"}</option>
                {sites.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {language === "es" ? "Instalación" : "Installation"}
              <select
                className="form-select"
                value={dossierForm.installation_id}
                onChange={(event) =>
                  setDossierForm((current) => ({ ...current, installation_id: event.target.value }))
                }
              >
                <option value="">{language === "es" ? "Sin instalación" : "No installation"}</option>
                {installationOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {language === "es" ? "OT" : "Work order"}
              <select
                className="form-select"
                value={dossierForm.work_order_id}
                onChange={(event) =>
                  setDossierForm((current) => ({ ...current, work_order_id: event.target.value }))
                }
              >
                <option value="">{language === "es" ? "Sin OT" : "No work order"}</option>
                {workOrderOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {language === "es" ? "Oportunidad CRM" : "CRM opportunity"}
              <select
                className="form-select"
                value={dossierForm.opportunity_id}
                onChange={(event) =>
                  setDossierForm((current) => ({ ...current, opportunity_id: event.target.value }))
                }
              >
                <option value="">{language === "es" ? "Sin oportunidad" : "No opportunity"}</option>
                {opportunityOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {language === "es" ? "TaskOps" : "TaskOps"}
              <select
                className="form-select"
                value={dossierForm.task_id}
                onChange={(event) =>
                  setDossierForm((current) => ({ ...current, task_id: event.target.value }))
                }
              >
                <option value="">{language === "es" ? "Sin tarea" : "No task"}</option>
                {taskOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="techdocs-form-grid__full">
              {language === "es" ? "Resumen" : "Summary"}
              <textarea
                className="form-control"
                rows={3}
                value={dossierForm.summary}
                onChange={(event) =>
                  setDossierForm((current) => ({ ...current, summary: event.target.value }))
                }
              />
            </label>
            <label className="techdocs-form-grid__full">
              {language === "es" ? "Objetivo" : "Objective"}
              <textarea
                className="form-control"
                rows={3}
                value={dossierForm.objective}
                onChange={(event) =>
                  setDossierForm((current) => ({ ...current, objective: event.target.value }))
                }
              />
            </label>
            <label className="techdocs-form-grid__full">
              {language === "es" ? "Alcance" : "Scope notes"}
              <textarea
                className="form-control"
                rows={3}
                value={dossierForm.scope_notes}
                onChange={(event) =>
                  setDossierForm((current) => ({ ...current, scope_notes: event.target.value }))
                }
              />
            </label>
            <label className="techdocs-form-grid__full">
              {language === "es" ? "Notas técnicas" : "Technical notes"}
              <textarea
                className="form-control"
                rows={4}
                value={dossierForm.technical_notes}
                onChange={(event) =>
                  setDossierForm((current) => ({ ...current, technical_notes: event.target.value }))
                }
              />
            </label>
            <label className="techdocs-inline-check">
              <input
                type="checkbox"
                checked={dossierForm.is_active}
                onChange={(event) =>
                  setDossierForm((current) => ({ ...current, is_active: event.target.checked }))
                }
              />
              <span>{language === "es" ? "Expediente activo" : "Active dossier"}</span>
            </label>
            <div className="techdocs-form-actions techdocs-form-grid__full">
              <button className="btn btn-primary" type="submit" disabled={isSubmitting}>
                {selectedDossierId
                  ? language === "es"
                    ? "Guardar expediente"
                    : "Save dossier"
                  : language === "es"
                    ? "Crear expediente"
                    : "Create dossier"}
              </button>
              {selectedDossierId ? (
                <button
                  className="btn btn-outline-danger"
                  type="button"
                  onClick={() => void handleArchiveDossier()}
                  disabled={isSubmitting}
                >
                  {language === "es" ? "Archivar expediente" : "Archive dossier"}
                </button>
              ) : null}
            </div>
          </form>
        </PanelCard>

        <PanelCard title={language === "es" ? "Estado y auditoría inmediata" : "Status and immediate audit"}>
          {detail ? (
            <div className="techdocs-stack">
              <div className="techdocs-detail-meta">
                <strong>{detail.dossier.title}</strong>
                <div className="text-muted small">
                  {detail.dossier.client_display_name || "—"} · {detail.dossier.installation_display_name || detail.dossier.opportunity_title || "—"}
                </div>
                <div className="text-muted small">
                  {language === "es" ? "Versión" : "Version"} {detail.dossier.version} · {language === "es" ? "Aprobado por" : "Approved by"} {detail.dossier.approved_by_display_name || "—"}
                </div>
              </div>
              <div className="techdocs-filter-grid">
                <label>
                  {language === "es" ? "Nuevo estado" : "New status"}
                  <select
                    className="form-select"
                    value={dossierForm.status}
                    onChange={(event) =>
                      setDossierForm((current) => ({ ...current, status: event.target.value }))
                    }
                  >
                    {DOSSIER_STATUSES.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {language === "es" ? "Nota de cambio" : "Change note"}
                  <input
                    className="form-control"
                    value={statusNotes}
                    onChange={(event) => setStatusNotes(event.target.value)}
                  />
                </label>
                <div className="techdocs-filter-actions">
                  <button
                    className="btn btn-outline-primary"
                    type="button"
                    onClick={() => void handleStatusUpdate()}
                    disabled={isSubmitting}
                  >
                    {language === "es" ? "Aplicar estado" : "Apply status"}
                  </button>
                </div>
              </div>
              <div className="techdocs-detail-card">
                <div className="techdocs-detail-card__header">
                  <strong>{language === "es" ? "Últimos eventos" : "Recent events"}</strong>
                </div>
                <div className="techdocs-detail-list">
                  {detail.audit_events.slice(0, 6).map((item) => (
                    <div key={item.id} className="techdocs-detail-list__item">
                      <strong>{item.event_type}</strong>
                      <div className="text-muted small">{item.summary || "—"}</div>
                      <div className="text-muted small">
                        {item.created_by_display_name || "—"} · {formatDateTime(item.created_at, language)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-muted">
              {language === "es"
                ? "Selecciona un expediente para ver detalle, auditoría y subrecursos."
                : "Select a dossier to see detail, audit and subresources."}
            </div>
          )}
        </PanelCard>
      </div>

      {detail ? (
        <>
          <div className="techdocs-detail-grid">
            <PanelCard title={editingSectionId ? (language === "es" ? "Editar sección" : "Edit section") : (language === "es" ? "Agregar sección" : "Add section")}>
              <form className="techdocs-form-grid" onSubmit={(event) => void handleSubmitSection(event)}>
                <label>
                  {language === "es" ? "Tipo de sección" : "Section kind"}
                  <select
                    className="form-select"
                    value={sectionForm.section_kind}
                    onChange={(event) =>
                      setSectionForm((current) => ({ ...current, section_kind: event.target.value }))
                    }
                  >
                    {SECTION_KINDS.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {language === "es" ? "Título" : "Title"}
                  <input
                    className="form-control"
                    value={sectionForm.title}
                    onChange={(event) =>
                      setSectionForm((current) => ({ ...current, title: event.target.value }))
                    }
                    required
                  />
                </label>
                <label>
                  {language === "es" ? "Orden" : "Order"}
                  <input
                    className="form-control"
                    type="number"
                    value={sectionForm.sort_order}
                    onChange={(event) =>
                      setSectionForm((current) => ({ ...current, sort_order: event.target.value }))
                    }
                  />
                </label>
                <label className="techdocs-form-grid__full">
                  {language === "es" ? "Notas" : "Notes"}
                  <textarea
                    className="form-control"
                    rows={3}
                    value={sectionForm.notes}
                    onChange={(event) =>
                      setSectionForm((current) => ({ ...current, notes: event.target.value }))
                    }
                  />
                </label>
                <div className="techdocs-form-actions techdocs-form-grid__full">
                  <button className="btn btn-primary" type="submit" disabled={isSubmitting}>
                    {editingSectionId
                      ? language === "es"
                        ? "Guardar sección"
                        : "Save section"
                      : language === "es"
                        ? "Agregar sección"
                        : "Add section"}
                  </button>
                  {editingSectionId ? (
                    <button
                      className="btn btn-outline-secondary"
                      type="button"
                      onClick={() => {
                        setEditingSectionId(null);
                        setSectionForm(emptySectionForm());
                      }}
                    >
                      {language === "es" ? "Cancelar edición" : "Cancel edit"}
                    </button>
                  ) : null}
                </div>
              </form>
            </PanelCard>

            <PanelCard title={editingMeasurementId ? (language === "es" ? "Editar medición" : "Edit measurement") : (language === "es" ? "Agregar medición" : "Add measurement")}>
              <form className="techdocs-form-grid" onSubmit={(event) => void handleSubmitMeasurement(event)}>
                <label>
                  {language === "es" ? "Sección" : "Section"}
                  <select
                    className="form-select"
                    value={measurementForm.section_id}
                    onChange={(event) =>
                      setMeasurementForm((current) => ({ ...current, section_id: event.target.value }))
                    }
                    required
                  >
                    <option value="">{language === "es" ? "Selecciona sección" : "Select section"}</option>
                    {detail.sections.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {language === "es" ? "Etiqueta" : "Label"}
                  <input
                    className="form-control"
                    value={measurementForm.label}
                    onChange={(event) =>
                      setMeasurementForm((current) => ({ ...current, label: event.target.value }))
                    }
                    required
                  />
                </label>
                <label>
                  {language === "es" ? "Valor" : "Measured value"}
                  <input
                    className="form-control"
                    value={measurementForm.measured_value}
                    onChange={(event) =>
                      setMeasurementForm((current) => ({ ...current, measured_value: event.target.value }))
                    }
                  />
                </label>
                <label>
                  {language === "es" ? "Unidad" : "Unit"}
                  <input
                    className="form-control"
                    value={measurementForm.unit}
                    onChange={(event) =>
                      setMeasurementForm((current) => ({ ...current, unit: event.target.value }))
                    }
                  />
                </label>
                <label>
                  {language === "es" ? "Rango esperado" : "Expected range"}
                  <input
                    className="form-control"
                    value={measurementForm.expected_range}
                    onChange={(event) =>
                      setMeasurementForm((current) => ({ ...current, expected_range: event.target.value }))
                    }
                  />
                </label>
                <label>
                  {language === "es" ? "Orden" : "Order"}
                  <input
                    className="form-control"
                    type="number"
                    value={measurementForm.sort_order}
                    onChange={(event) =>
                      setMeasurementForm((current) => ({ ...current, sort_order: event.target.value }))
                    }
                  />
                </label>
                <label className="techdocs-form-grid__full">
                  {language === "es" ? "Notas" : "Notes"}
                  <textarea
                    className="form-control"
                    rows={3}
                    value={measurementForm.notes}
                    onChange={(event) =>
                      setMeasurementForm((current) => ({ ...current, notes: event.target.value }))
                    }
                  />
                </label>
                <div className="techdocs-form-actions techdocs-form-grid__full">
                  <button className="btn btn-primary" type="submit" disabled={isSubmitting}>
                    {editingMeasurementId
                      ? language === "es"
                        ? "Guardar medición"
                        : "Save measurement"
                      : language === "es"
                        ? "Agregar medición"
                        : "Add measurement"}
                  </button>
                  {editingMeasurementId ? (
                    <button
                      className="btn btn-outline-secondary"
                      type="button"
                      onClick={() => {
                        setEditingMeasurementId(null);
                        setMeasurementForm(emptyMeasurementForm(detail.sections[0]?.id ? String(detail.sections[0].id) : ""));
                      }}
                    >
                      {language === "es" ? "Cancelar edición" : "Cancel edit"}
                    </button>
                  ) : null}
                </div>
              </form>
            </PanelCard>
          </div>

          <div className="techdocs-detail-grid">
            <PanelCard title={language === "es" ? "Secciones y mediciones" : "Sections and measurements"}>
              <div className="techdocs-detail-list">
                {detail.sections.length === 0 ? (
                  <div className="text-muted">
                    {language === "es" ? "Aún no hay secciones cargadas." : "No sections loaded yet."}
                  </div>
                ) : (
                  detail.sections.map((section) => (
                    <div key={section.id} className="techdocs-detail-card techdocs-detail-card--full">
                      <div className="techdocs-detail-card__header">
                        <div>
                          <strong>{section.title}</strong>
                          <div className="text-muted small">
                            {section.section_kind} · {language === "es" ? "Orden" : "Order"} {section.sort_order}
                          </div>
                        </div>
                        <div className="techdocs-form-actions">
                          <button className="btn btn-sm btn-outline-primary" type="button" onClick={() => startSectionEdit(section)}>
                            {language === "es" ? "Editar" : "Edit"}
                          </button>
                          <button className="btn btn-sm btn-outline-danger" type="button" onClick={() => void handleDeleteSection(section.id)}>
                            {language === "es" ? "Eliminar" : "Delete"}
                          </button>
                        </div>
                      </div>
                      <div className="text-muted small">{section.notes || "—"}</div>
                      <div className="techdocs-detail-list">
                        {section.measurements.length === 0 ? (
                          <div className="text-muted small">
                            {language === "es" ? "Sin mediciones." : "No measurements."}
                          </div>
                        ) : (
                          section.measurements.map((measurement) => (
                            <div key={measurement.id} className="techdocs-detail-list__item">
                              <div className="techdocs-detail-card__header">
                                <div>
                                  <strong>{measurement.label}</strong>
                                  <div className="text-muted small">
                                    {measurement.measured_value || "—"} {measurement.unit || ""} · {measurement.expected_range || "—"}
                                  </div>
                                </div>
                                <div className="techdocs-form-actions">
                                  <button className="btn btn-sm btn-outline-primary" type="button" onClick={() => startMeasurementEdit(measurement)}>
                                    {language === "es" ? "Editar" : "Edit"}
                                  </button>
                                  <button className="btn btn-sm btn-outline-danger" type="button" onClick={() => void handleDeleteMeasurement(measurement.id)}>
                                    {language === "es" ? "Eliminar" : "Delete"}
                                  </button>
                                </div>
                              </div>
                              <div className="text-muted small">{measurement.notes || "—"}</div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </PanelCard>

            <PanelCard title={language === "es" ? "Evidencias" : "Evidences"}>
              <form className="techdocs-form-grid" onSubmit={(event) => void handleUploadEvidence(event)}>
                <label>
                  {language === "es" ? "Tipo" : "Kind"}
                  <select
                    className="form-select"
                    value={evidenceKind}
                    onChange={(event) => setEvidenceKind(event.target.value)}
                  >
                    {EVIDENCE_KINDS.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {language === "es" ? "Archivo" : "File"}
                  <input
                    className="form-control"
                    type="file"
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      setEvidenceFile(event.target.files?.[0] || null)
                    }
                    required
                  />
                </label>
                <label className="techdocs-form-grid__full">
                  {language === "es" ? "Descripción" : "Description"}
                  <input
                    className="form-control"
                    value={evidenceDescription}
                    onChange={(event) => setEvidenceDescription(event.target.value)}
                  />
                </label>
                <div className="techdocs-form-actions techdocs-form-grid__full">
                  <button className="btn btn-primary" type="submit" disabled={isSubmitting || !evidenceFile}>
                    {language === "es" ? "Subir evidencia" : "Upload evidence"}
                  </button>
                </div>
              </form>

              <div className="techdocs-detail-list">
                {detail.evidences.length === 0 ? (
                  <div className="text-muted">
                    {language === "es" ? "Sin evidencias aún." : "No evidences yet."}
                  </div>
                ) : (
                  detail.evidences.map((item) => (
                    <div key={item.id} className="techdocs-detail-list__item">
                      <div className="techdocs-detail-card__header">
                        <div>
                          <strong>{item.file_name}</strong>
                          <div className="text-muted small">
                            {item.evidence_kind} · {formatBytes(item.file_size)} · {item.uploaded_by_display_name || "—"}
                          </div>
                        </div>
                        <div className="techdocs-form-actions">
                          <button
                            className="btn btn-sm btn-outline-primary"
                            type="button"
                            onClick={() => void downloadTechDocsEvidence(session!.accessToken, detail.dossier.id, item.id)}
                          >
                            {language === "es" ? "Descargar" : "Download"}
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            type="button"
                            onClick={() => void handleDeleteEvidence(item.id)}
                          >
                            {language === "es" ? "Eliminar" : "Delete"}
                          </button>
                        </div>
                      </div>
                      <div className="text-muted small">{item.description || "—"}</div>
                    </div>
                  ))
                )}
              </div>
            </PanelCard>
          </div>
        </>
      ) : null}
    </div>
  );
}
