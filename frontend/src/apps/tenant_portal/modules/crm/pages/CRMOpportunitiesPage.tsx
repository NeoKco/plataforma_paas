import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "../../../../../components/common/PageHeader";
import { PanelCard } from "../../../../../components/common/PanelCard";
import { DataTableCard } from "../../../../../components/data-display/DataTableCard";
import { ErrorState } from "../../../../../components/feedback/ErrorState";
import { LoadingBlock } from "../../../../../components/feedback/LoadingBlock";
import { AppToolbar } from "../../../../../design-system/AppLayout";
import { getApiErrorDisplayMessage } from "../../../../../services/api";
import { useLanguage } from "../../../../../store/language-context";
import { useTenantAuth } from "../../../../../store/tenant-auth-context";
import type { ApiError } from "../../../../../types";
import { getTenantBusinessClients, type TenantBusinessClient } from "../../business_core/services/clientsService";
import {
  getTenantBusinessOrganizations,
  type TenantBusinessOrganization,
} from "../../business_core/services/organizationsService";
import { CRMModuleNav } from "../components/common/CRMModuleNav";
import {
  closeCRMOpportunity,
  createCRMOpportunity,
  createCRMOpportunityActivity,
  createCRMOpportunityContact,
  createCRMOpportunityNote,
  deleteCRMOpportunity,
  deleteCRMOpportunityActivity,
  deleteCRMOpportunityAttachment,
  deleteCRMOpportunityContact,
  deleteCRMOpportunityNote,
  downloadCRMOpportunityAttachment,
  getCRMOpportunityDetail,
  getCRMOpportunityKanban,
  getCRMOpportunities,
  updateCRMOpportunity,
  updateCRMOpportunityActivity,
  updateCRMOpportunityActivityStatus,
  updateCRMOpportunityContact,
  updateCRMOpportunityNote,
  updateCRMOpportunityStatus,
  uploadCRMOpportunityAttachment,
  type CRMOpportunity,
  type CRMOpportunityActivity,
  type CRMOpportunityActivityWriteRequest,
  type CRMOpportunityCloseRequest,
  type CRMOpportunityContact,
  type CRMOpportunityContactWriteRequest,
  type CRMOpportunityDetail,
  type CRMOpportunityKanbanColumn,
  type CRMOpportunityNote,
  type CRMOpportunityNoteWriteRequest,
  type CRMOpportunityWriteRequest,
} from "../services/crmService";

function buildDefaultForm(): CRMOpportunityWriteRequest {
  return {
    client_id: null,
    title: "",
    stage: "lead",
    owner_user_id: null,
    expected_value: null,
    probability_percent: 0,
    expected_close_at: null,
    source_channel: null,
    summary: null,
    next_step: null,
    is_active: true,
    sort_order: 100,
  };
}

function buildDefaultContactForm(): CRMOpportunityContactWriteRequest {
  return {
    full_name: "",
    role: null,
    email: null,
    phone: null,
    notes: null,
    sort_order: 100,
  };
}

function buildDefaultNoteForm(): CRMOpportunityNoteWriteRequest {
  return { note: "" };
}

function buildDefaultActivityForm(): CRMOpportunityActivityWriteRequest {
  return {
    activity_type: "call",
    description: null,
    scheduled_at: null,
    status: "scheduled",
  };
}

function buildDefaultCloseForm(): CRMOpportunityCloseRequest {
  return {
    final_stage: "won",
    close_reason: null,
    close_notes: null,
  };
}

function formatMoney(value: number | null, language: "es" | "en") {
  return new Intl.NumberFormat(language === "es" ? "es-CL" : "en-US", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatDateTime(value: string | null, language: "es" | "en") {
  if (!value) return "—";
  return new Intl.DateTimeFormat(language === "es" ? "es-CL" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function normalizeOpportunityToWrite(item: CRMOpportunity): CRMOpportunityWriteRequest {
  return {
    client_id: item.client_id,
    title: item.title,
    stage: item.stage,
    owner_user_id: item.owner_user_id,
    expected_value: item.expected_value,
    probability_percent: item.probability_percent,
    expected_close_at: item.expected_close_at,
    source_channel: item.source_channel,
    summary: item.summary,
    next_step: item.next_step,
    is_active: item.is_active,
    sort_order: item.sort_order,
  };
}

function downloadBlobFile(blob: Blob, filename: string, mimeType: string) {
  const nextBlob = new Blob([blob], { type: mimeType });
  const blobUrl = URL.createObjectURL(nextBlob);
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(blobUrl);
}

export function CRMOpportunitiesPage() {
  const { session } = useTenantAuth();
  const { language } = useLanguage();
  const [rows, setRows] = useState<CRMOpportunity[]>([]);
  const [kanban, setKanban] = useState<CRMOpportunityKanbanColumn[]>([]);
  const [clients, setClients] = useState<TenantBusinessClient[]>([]);
  const [organizations, setOrganizations] = useState<TenantBusinessOrganization[]>([]);
  const [detail, setDetail] = useState<CRMOpportunityDetail | null>(null);
  const [selectedOpportunityId, setSelectedOpportunityId] = useState<number | null>(null);
  const [form, setForm] = useState<CRMOpportunityWriteRequest>(buildDefaultForm());
  const [contactForm, setContactForm] = useState<CRMOpportunityContactWriteRequest>(buildDefaultContactForm());
  const [noteForm, setNoteForm] = useState<CRMOpportunityNoteWriteRequest>(buildDefaultNoteForm());
  const [activityForm, setActivityForm] = useState<CRMOpportunityActivityWriteRequest>(buildDefaultActivityForm());
  const [closeForm, setCloseForm] = useState<CRMOpportunityCloseRequest>(buildDefaultCloseForm());
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentNotes, setAttachmentNotes] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingContactId, setEditingContactId] = useState<number | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [editingActivityId, setEditingActivityId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const organizationById = useMemo(
    () => new Map(organizations.map((item) => [item.id, item])),
    [organizations]
  );

  async function loadRows() {
    if (!session?.accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const [opportunitiesResponse, kanbanResponse, clientsResponse, organizationsResponse] = await Promise.all([
        getCRMOpportunities(session.accessToken),
        getCRMOpportunityKanban(session.accessToken),
        getTenantBusinessClients(session.accessToken, { includeInactive: false }),
        getTenantBusinessOrganizations(session.accessToken, { includeInactive: false }),
      ]);
      setRows(opportunitiesResponse.data);
      setKanban(kanbanResponse.columns);
      setClients(clientsResponse.data);
      setOrganizations(organizationsResponse.data);
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsLoading(false);
    }
  }

  async function loadDetail(opportunityId: number) {
    if (!session?.accessToken) return;
    setIsDetailLoading(true);
    try {
      const response = await getCRMOpportunityDetail(session.accessToken, opportunityId);
      setDetail(response.data);
      setSelectedOpportunityId(opportunityId);
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsDetailLoading(false);
    }
  }

  useEffect(() => {
    void loadRows();
  }, [session?.accessToken]);

  function resetSubresourceForms() {
    setContactForm(buildDefaultContactForm());
    setNoteForm(buildDefaultNoteForm());
    setActivityForm(buildDefaultActivityForm());
    setCloseForm(buildDefaultCloseForm());
    setAttachmentFile(null);
    setAttachmentNotes("");
    setEditingContactId(null);
    setEditingNoteId(null);
    setEditingActivityId(null);
  }

  function startNew() {
    setEditingId(null);
    setForm(buildDefaultForm());
    resetSubresourceForms();
    setDetail(null);
    setSelectedOpportunityId(null);
    setFeedback(null);
  }

  function startEdit(item: CRMOpportunity) {
    setEditingId(item.id);
    setForm({
      client_id: item.client_id,
      title: item.title,
      stage: item.stage,
      owner_user_id: item.owner_user_id,
      expected_value: item.expected_value,
      probability_percent: item.probability_percent,
      expected_close_at: item.expected_close_at ? item.expected_close_at.slice(0, 16) : null,
      source_channel: item.source_channel,
      summary: item.summary,
      next_step: item.next_step,
      is_active: item.is_active,
      sort_order: item.sort_order,
    });
    setCloseForm({
      final_stage: item.stage === "lost" ? "lost" : "won",
      close_reason: item.close_reason,
      close_notes: item.close_notes,
    });
    resetSubresourceForms();
    void loadDetail(item.id);
    setFeedback(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.accessToken) return;
    setIsSubmitting(true);
    setError(null);
    setFeedback(null);
    try {
      const payload = {
        ...form,
        expected_close_at: form.expected_close_at ? new Date(form.expected_close_at).toISOString() : null,
      };
      const response = editingId
        ? await updateCRMOpportunity(session.accessToken, editingId, payload)
        : await createCRMOpportunity(session.accessToken, payload);
      setFeedback(response.message);
      await loadRows();
      startEdit(response.data);
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleToggle(item: CRMOpportunity) {
    if (!session?.accessToken) return;
    try {
      const response = await updateCRMOpportunityStatus(session.accessToken, item.id, !item.is_active);
      setFeedback(response.message);
      await loadRows();
      if (selectedOpportunityId === item.id) {
        await loadDetail(item.id);
      }
    } catch (rawError) {
      setError(rawError as ApiError);
    }
  }

  async function moveStage(item: CRMOpportunity, nextStage: string) {
    if (!session?.accessToken) return;
    try {
      const response = await updateCRMOpportunity(
        session.accessToken,
        item.id,
        {
          ...normalizeOpportunityToWrite(item),
          stage: nextStage,
        }
      );
      setFeedback(response.message);
      await loadRows();
      await loadDetail(item.id);
    } catch (rawError) {
      setError(rawError as ApiError);
    }
  }

  async function handleCloseOpportunity() {
    if (!session?.accessToken || selectedOpportunityId == null) return;
    try {
      const response = await closeCRMOpportunity(session.accessToken, selectedOpportunityId, closeForm);
      setFeedback(response.message);
      await loadRows();
      await loadDetail(response.data.id);
    } catch (rawError) {
      setError(rawError as ApiError);
    }
  }

  async function handleDelete(item: CRMOpportunity) {
    if (!session?.accessToken) return;
    if (!window.confirm(language === "es" ? `Eliminar "${item.title}"?` : `Delete "${item.title}"?`)) return;
    try {
      const response = await deleteCRMOpportunity(session.accessToken, item.id);
      setFeedback(response.message);
      if (editingId === item.id) {
        startNew();
      } else {
        await loadRows();
      }
    } catch (rawError) {
      setError(rawError as ApiError);
    }
  }

  async function handleContactSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.accessToken || selectedOpportunityId == null) return;
    try {
      const response = editingContactId
        ? await updateCRMOpportunityContact(session.accessToken, selectedOpportunityId, editingContactId, contactForm)
        : await createCRMOpportunityContact(session.accessToken, selectedOpportunityId, contactForm);
      setFeedback(response.message);
      setContactForm(buildDefaultContactForm());
      setEditingContactId(null);
      await loadDetail(selectedOpportunityId);
    } catch (rawError) {
      setError(rawError as ApiError);
    }
  }

  async function handleNoteSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.accessToken || selectedOpportunityId == null) return;
    try {
      const response = editingNoteId
        ? await updateCRMOpportunityNote(session.accessToken, selectedOpportunityId, editingNoteId, noteForm)
        : await createCRMOpportunityNote(session.accessToken, selectedOpportunityId, noteForm);
      setFeedback(response.message);
      setNoteForm(buildDefaultNoteForm());
      setEditingNoteId(null);
      await loadDetail(selectedOpportunityId);
    } catch (rawError) {
      setError(rawError as ApiError);
    }
  }

  async function handleActivitySubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.accessToken || selectedOpportunityId == null) return;
    try {
      const payload = {
        ...activityForm,
        scheduled_at: activityForm.scheduled_at ? new Date(activityForm.scheduled_at).toISOString() : null,
      };
      const response = editingActivityId
        ? await updateCRMOpportunityActivity(session.accessToken, selectedOpportunityId, editingActivityId, payload)
        : await createCRMOpportunityActivity(session.accessToken, selectedOpportunityId, payload);
      setFeedback(response.message);
      setActivityForm(buildDefaultActivityForm());
      setEditingActivityId(null);
      await loadDetail(selectedOpportunityId);
    } catch (rawError) {
      setError(rawError as ApiError);
    }
  }

  async function handleAttachmentSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.accessToken || selectedOpportunityId == null || !attachmentFile) return;
    try {
      const response = await uploadCRMOpportunityAttachment(
        session.accessToken,
        selectedOpportunityId,
        attachmentFile,
        attachmentNotes
      );
      setFeedback(response.message);
      setAttachmentFile(null);
      setAttachmentNotes("");
      await loadDetail(selectedOpportunityId);
    } catch (rawError) {
      setError(rawError as ApiError);
    }
  }

  async function handleAttachmentDownload(attachmentId: number, fileName: string, contentType: string | null) {
    if (!session?.accessToken || selectedOpportunityId == null) return;
    try {
      const response = await downloadCRMOpportunityAttachment(session.accessToken, selectedOpportunityId, attachmentId);
      downloadBlobFile(
        response.blob,
        response.fileName || fileName,
        response.contentType || contentType || "application/octet-stream"
      );
    } catch (rawError) {
      setError(rawError as ApiError);
    }
  }

  async function handleAttachmentDelete(attachmentId: number) {
    if (!session?.accessToken || selectedOpportunityId == null) return;
    try {
      const response = await deleteCRMOpportunityAttachment(session.accessToken, selectedOpportunityId, attachmentId);
      setFeedback(response.message);
      await loadDetail(selectedOpportunityId);
    } catch (rawError) {
      setError(rawError as ApiError);
    }
  }

  async function handleContactDelete(contactId: number) {
    if (!session?.accessToken || selectedOpportunityId == null) return;
    try {
      const response = await deleteCRMOpportunityContact(session.accessToken, selectedOpportunityId, contactId);
      setFeedback(response.message);
      await loadDetail(selectedOpportunityId);
    } catch (rawError) {
      setError(rawError as ApiError);
    }
  }

  async function handleNoteDelete(noteId: number) {
    if (!session?.accessToken || selectedOpportunityId == null) return;
    try {
      const response = await deleteCRMOpportunityNote(session.accessToken, selectedOpportunityId, noteId);
      setFeedback(response.message);
      await loadDetail(selectedOpportunityId);
    } catch (rawError) {
      setError(rawError as ApiError);
    }
  }

  async function handleActivityDelete(activityId: number) {
    if (!session?.accessToken || selectedOpportunityId == null) return;
    try {
      const response = await deleteCRMOpportunityActivity(session.accessToken, selectedOpportunityId, activityId);
      setFeedback(response.message);
      await loadDetail(selectedOpportunityId);
    } catch (rawError) {
      setError(rawError as ApiError);
    }
  }

  async function handleActivityStatus(activityId: number, status: string) {
    if (!session?.accessToken || selectedOpportunityId == null) return;
    try {
      const response = await updateCRMOpportunityActivityStatus(session.accessToken, selectedOpportunityId, activityId, status);
      setFeedback(response.message);
      await loadDetail(selectedOpportunityId);
    } catch (rawError) {
      setError(rawError as ApiError);
    }
  }

  return (
    <div className="d-grid gap-4">
      <PageHeader
        eyebrow={language === "es" ? "CRM comercial" : "Commercial CRM"}
        icon="pipeline"
        title={language === "es" ? "Oportunidades y pipeline" : "Opportunities and pipeline"}
        description={
          language === "es"
            ? "Pipeline con detalle comercial, seguimiento, actividades y adjuntos."
            : "Pipeline with commercial detail, follow-up, activities, and attachments."
        }
        actions={
          <AppToolbar compact>
            <button className="btn btn-outline-secondary" type="button" onClick={() => void loadRows()}>
              {language === "es" ? "Recargar" : "Reload"}
            </button>
            <button className="btn btn-primary" type="button" onClick={startNew}>
              {language === "es" ? "Nueva oportunidad" : "New opportunity"}
            </button>
          </AppToolbar>
        }
      />
      <CRMModuleNav />
      {feedback ? <div className="alert alert-success mb-0">{feedback}</div> : null}
      {error ? (
        <ErrorState
          title={language === "es" ? "No se pudo cargar CRM" : "Could not load CRM"}
          detail={getApiErrorDisplayMessage(error)}
          requestId={error.payload?.request_id}
        />
      ) : null}
      {isLoading ? <LoadingBlock label={language === "es" ? "Cargando pipeline..." : "Loading pipeline..."} /> : null}

      <PanelCard
        title={language === "es" ? "Kanban CRM" : "CRM kanban"}
        subtitle={
          language === "es"
            ? "Lectura rápida del pipeline activo antes de entrar al detalle."
            : "Quick read of the active pipeline before going into detail."
        }
      >
        <div className="crm-kanban-board">
          {kanban.map((column) => (
            <div key={column.stage} className="crm-kanban-column">
              <div className="crm-kanban-column__header">
                <strong>{column.stage}</strong>
                <span className="text-muted small">
                  {column.total} · {formatMoney(column.stage_value, language)}
                </span>
              </div>
              <div className="crm-kanban-column__items">
                {column.items.map((item) => (
                  <button
                    key={item.id}
                    className="crm-kanban-card"
                    type="button"
                    onClick={() => startEdit(item)}
                  >
                    <strong>{item.title}</strong>
                    <span>{item.client_display_name || "—"}</span>
                    <span>{formatMoney(item.expected_value, language)}</span>
                  </button>
                ))}
                {column.items.length === 0 ? (
                  <div className="crm-kanban-empty">
                    {language === "es" ? "Sin oportunidades" : "No opportunities"}
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </PanelCard>

      <PanelCard
        title={editingId ? (language === "es" ? "Editar oportunidad" : "Edit opportunity") : (language === "es" ? "Nueva oportunidad" : "New opportunity")}
        subtitle={
          language === "es"
            ? "Puedes crear, mover etapa, cerrar y luego profundizar el detalle comercial."
            : "You can create, move stage, close, and then deepen the commercial detail."
        }
      >
        <form className="crm-form-grid" onSubmit={(event) => void handleSubmit(event)}>
          <label>
            <span>{language === "es" ? "Título" : "Title"}</span>
            <input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} required />
          </label>
          <label>
            <span>{language === "es" ? "Cliente" : "Client"}</span>
            <select value={form.client_id || ""} onChange={(event) => setForm((current) => ({ ...current, client_id: event.target.value ? Number(event.target.value) : null }))}>
              <option value="">{language === "es" ? "Sin cliente" : "No client"}</option>
              {clients.map((item) => (
                <option key={item.id} value={item.id}>
                  {organizationById.get(item.organization_id)?.name || item.client_code || `#${item.id}`}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>{language === "es" ? "Etapa" : "Stage"}</span>
            <select value={form.stage} onChange={(event) => setForm((current) => ({ ...current, stage: event.target.value }))}>
              <option value="lead">lead</option>
              <option value="qualified">qualified</option>
              <option value="proposal">proposal</option>
              <option value="negotiation">negotiation</option>
              <option value="won">won</option>
              <option value="lost">lost</option>
            </select>
          </label>
          <label>
            <span>{language === "es" ? "Valor esperado" : "Expected value"}</span>
            <input type="number" min="0" step="0.01" value={form.expected_value || ""} onChange={(event) => setForm((current) => ({ ...current, expected_value: event.target.value ? Number(event.target.value) : null }))} />
          </label>
          <label>
            <span>{language === "es" ? "Probabilidad %" : "Probability %"}</span>
            <input type="number" min="0" max="100" value={form.probability_percent} onChange={(event) => setForm((current) => ({ ...current, probability_percent: Number(event.target.value) || 0 }))} />
          </label>
          <label>
            <span>{language === "es" ? "Cierre esperado" : "Expected close"}</span>
            <input type="datetime-local" value={form.expected_close_at || ""} onChange={(event) => setForm((current) => ({ ...current, expected_close_at: event.target.value || null }))} />
          </label>
          <label>
            <span>{language === "es" ? "Canal origen" : "Source channel"}</span>
            <input value={form.source_channel || ""} onChange={(event) => setForm((current) => ({ ...current, source_channel: event.target.value || null }))} />
          </label>
          <label>
            <span>{language === "es" ? "Orden" : "Order"}</span>
            <input type="number" min="0" value={form.sort_order} onChange={(event) => setForm((current) => ({ ...current, sort_order: Number(event.target.value) || 0 }))} />
          </label>
          <label className="crm-form-grid__full">
            <span>{language === "es" ? "Resumen" : "Summary"}</span>
            <textarea value={form.summary || ""} onChange={(event) => setForm((current) => ({ ...current, summary: event.target.value || null }))} rows={3} />
          </label>
          <label className="crm-form-grid__full">
            <span>{language === "es" ? "Próximo paso" : "Next step"}</span>
            <textarea value={form.next_step || ""} onChange={(event) => setForm((current) => ({ ...current, next_step: event.target.value || null }))} rows={2} />
          </label>
          <label className="crm-inline-check">
            <input type="checkbox" checked={form.is_active} onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.checked }))} />
            <span>{language === "es" ? "Activa" : "Active"}</span>
          </label>
          <div className="crm-form-actions">
            {editingId ? (
              <button className="btn btn-outline-secondary" type="button" onClick={startNew}>
                {language === "es" ? "Cancelar edición" : "Cancel edit"}
              </button>
            ) : null}
            <button className="btn btn-primary" disabled={isSubmitting} type="submit">
              {editingId
                ? language === "es"
                  ? "Guardar cambios"
                  : "Save changes"
                : language === "es"
                  ? "Crear oportunidad"
                  : "Create opportunity"}
            </button>
          </div>
        </form>
      </PanelCard>

      <DataTableCard
        title={language === "es" ? "Pipeline activo" : "Active pipeline"}
        subtitle={language === "es" ? "Oportunidades visibles del tenant." : "Visible tenant opportunities."}
        rows={rows}
        columns={[
          {
            key: "title",
            header: language === "es" ? "Oportunidad" : "Opportunity",
            render: (row) => (
              <div>
                <strong>{row.title}</strong>
                <div className="text-muted small">{row.client_display_name || "—"}</div>
              </div>
            ),
          },
          { key: "stage", header: language === "es" ? "Etapa" : "Stage", render: (row) => row.stage },
          { key: "value", header: language === "es" ? "Valor" : "Value", render: (row) => formatMoney(row.expected_value, language) },
          {
            key: "actions",
            header: language === "es" ? "Acciones" : "Actions",
            render: (row) => (
              <div className="d-flex gap-2 flex-wrap">
                <button className="btn btn-outline-secondary btn-sm" type="button" onClick={() => startEdit(row)}>
                  {language === "es" ? "Ver / editar" : "View / edit"}
                </button>
                {row.stage !== "negotiation" ? (
                  <button className="btn btn-outline-secondary btn-sm" type="button" onClick={() => void moveStage(row, nextStageFor(row.stage))}>
                    {language === "es" ? "Avanzar etapa" : "Advance stage"}
                  </button>
                ) : null}
                <button className="btn btn-outline-secondary btn-sm" type="button" onClick={() => void handleToggle(row)}>
                  {row.is_active ? (language === "es" ? "Desactivar" : "Deactivate") : (language === "es" ? "Activar" : "Activate")}
                </button>
                <button className="btn btn-outline-danger btn-sm" type="button" onClick={() => void handleDelete(row)}>
                  {language === "es" ? "Eliminar" : "Delete"}
                </button>
              </div>
            ),
          },
        ]}
      />

      {selectedOpportunityId != null ? (
        <div className="d-grid gap-4">
          <PanelCard
            title={language === "es" ? "Detalle comercial" : "Commercial detail"}
            subtitle={
              detail?.opportunity
                ? `${detail.opportunity.title} · ${detail.opportunity.client_display_name || "—"}`
                : language === "es"
                  ? "Cargando detalle..."
                  : "Loading detail..."
            }
          >
            {isDetailLoading || !detail ? (
              <LoadingBlock label={language === "es" ? "Cargando detalle..." : "Loading detail..."} />
            ) : (
              <div className="crm-detail-grid">
                <div className="crm-detail-card">
                  <div className="crm-detail-card__header">
                    <strong>{language === "es" ? "Cierre guiado" : "Guided close"}</strong>
                  </div>
                  <div className="crm-form-grid">
                    <label>
                      <span>{language === "es" ? "Resultado final" : "Final result"}</span>
                      <select value={closeForm.final_stage} onChange={(event) => setCloseForm((current) => ({ ...current, final_stage: event.target.value }))}>
                        <option value="won">won</option>
                        <option value="lost">lost</option>
                      </select>
                    </label>
                    <label>
                      <span>{language === "es" ? "Motivo" : "Reason"}</span>
                      <input value={closeForm.close_reason || ""} onChange={(event) => setCloseForm((current) => ({ ...current, close_reason: event.target.value || null }))} />
                    </label>
                    <label className="crm-form-grid__full">
                      <span>{language === "es" ? "Notas de cierre" : "Close notes"}</span>
                      <textarea value={closeForm.close_notes || ""} onChange={(event) => setCloseForm((current) => ({ ...current, close_notes: event.target.value || null }))} rows={2} />
                    </label>
                  </div>
                  <div className="crm-form-actions">
                    <button className="btn btn-primary" type="button" onClick={() => void handleCloseOpportunity()}>
                      {language === "es" ? "Cerrar oportunidad" : "Close opportunity"}
                    </button>
                  </div>
                </div>

                <div className="crm-detail-card">
                  <div className="crm-detail-card__header">
                    <strong>{language === "es" ? "Contactos" : "Contacts"}</strong>
                  </div>
                  <form className="crm-form-grid" onSubmit={(event) => void handleContactSubmit(event)}>
                    <label>
                      <span>{language === "es" ? "Nombre" : "Name"}</span>
                      <input value={contactForm.full_name} onChange={(event) => setContactForm((current) => ({ ...current, full_name: event.target.value }))} required />
                    </label>
                    <label>
                      <span>{language === "es" ? "Cargo" : "Role"}</span>
                      <input value={contactForm.role || ""} onChange={(event) => setContactForm((current) => ({ ...current, role: event.target.value || null }))} />
                    </label>
                    <label>
                      <span>Email</span>
                      <input value={contactForm.email || ""} onChange={(event) => setContactForm((current) => ({ ...current, email: event.target.value || null }))} />
                    </label>
                    <label>
                      <span>{language === "es" ? "Teléfono" : "Phone"}</span>
                      <input value={contactForm.phone || ""} onChange={(event) => setContactForm((current) => ({ ...current, phone: event.target.value || null }))} />
                    </label>
                    <div className="crm-form-actions">
                      <button className="btn btn-primary btn-sm" type="submit">
                        {editingContactId ? (language === "es" ? "Actualizar contacto" : "Update contact") : (language === "es" ? "Agregar contacto" : "Add contact")}
                      </button>
                    </div>
                  </form>
                  <div className="crm-detail-list">
                    {detail.contacts.map((item: CRMOpportunityContact) => (
                      <div key={item.id} className="crm-detail-list__item">
                        <div>
                          <strong>{item.full_name}</strong>
                          <div className="text-muted small">{[item.role, item.email, item.phone].filter(Boolean).join(" · ") || "—"}</div>
                        </div>
                        <div className="d-flex gap-2">
                          <button className="btn btn-outline-secondary btn-sm" type="button" onClick={() => {
                            setEditingContactId(item.id);
                            setContactForm({
                              full_name: item.full_name,
                              role: item.role,
                              email: item.email,
                              phone: item.phone,
                              notes: item.notes,
                              sort_order: item.sort_order,
                            });
                          }}>
                            {language === "es" ? "Editar" : "Edit"}
                          </button>
                          <button className="btn btn-outline-danger btn-sm" type="button" onClick={() => void handleContactDelete(item.id)}>
                            {language === "es" ? "Eliminar" : "Delete"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="crm-detail-card">
                  <div className="crm-detail-card__header">
                    <strong>{language === "es" ? "Notas" : "Notes"}</strong>
                  </div>
                  <form className="crm-form-grid" onSubmit={(event) => void handleNoteSubmit(event)}>
                    <label className="crm-form-grid__full">
                      <span>{language === "es" ? "Nota de seguimiento" : "Follow-up note"}</span>
                      <textarea value={noteForm.note} onChange={(event) => setNoteForm({ note: event.target.value })} rows={3} required />
                    </label>
                    <div className="crm-form-actions">
                      <button className="btn btn-primary btn-sm" type="submit">
                        {editingNoteId ? (language === "es" ? "Actualizar nota" : "Update note") : (language === "es" ? "Agregar nota" : "Add note")}
                      </button>
                    </div>
                  </form>
                  <div className="crm-detail-list">
                    {detail.notes.map((item: CRMOpportunityNote) => (
                      <div key={item.id} className="crm-detail-list__item">
                        <div>
                          <div>{item.note}</div>
                          <div className="text-muted small">{formatDateTime(item.created_at, language)}</div>
                        </div>
                        <div className="d-flex gap-2">
                          <button className="btn btn-outline-secondary btn-sm" type="button" onClick={() => {
                            setEditingNoteId(item.id);
                            setNoteForm({ note: item.note });
                          }}>
                            {language === "es" ? "Editar" : "Edit"}
                          </button>
                          <button className="btn btn-outline-danger btn-sm" type="button" onClick={() => void handleNoteDelete(item.id)}>
                            {language === "es" ? "Eliminar" : "Delete"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="crm-detail-card">
                  <div className="crm-detail-card__header">
                    <strong>{language === "es" ? "Actividades" : "Activities"}</strong>
                  </div>
                  <form className="crm-form-grid" onSubmit={(event) => void handleActivitySubmit(event)}>
                    <label>
                      <span>{language === "es" ? "Tipo" : "Type"}</span>
                      <select value={activityForm.activity_type} onChange={(event) => setActivityForm((current) => ({ ...current, activity_type: event.target.value }))}>
                        <option value="call">call</option>
                        <option value="email">email</option>
                        <option value="meeting">meeting</option>
                        <option value="task">task</option>
                        <option value="other">other</option>
                      </select>
                    </label>
                    <label>
                      <span>{language === "es" ? "Estado" : "Status"}</span>
                      <select value={activityForm.status} onChange={(event) => setActivityForm((current) => ({ ...current, status: event.target.value }))}>
                        <option value="scheduled">scheduled</option>
                        <option value="completed">completed</option>
                        <option value="cancelled">cancelled</option>
                      </select>
                    </label>
                    <label>
                      <span>{language === "es" ? "Fecha" : "Date"}</span>
                      <input type="datetime-local" value={activityForm.scheduled_at || ""} onChange={(event) => setActivityForm((current) => ({ ...current, scheduled_at: event.target.value || null }))} />
                    </label>
                    <label className="crm-form-grid__full">
                      <span>{language === "es" ? "Descripción" : "Description"}</span>
                      <textarea value={activityForm.description || ""} onChange={(event) => setActivityForm((current) => ({ ...current, description: event.target.value || null }))} rows={2} />
                    </label>
                    <div className="crm-form-actions">
                      <button className="btn btn-primary btn-sm" type="submit">
                        {editingActivityId ? (language === "es" ? "Actualizar actividad" : "Update activity") : (language === "es" ? "Agregar actividad" : "Add activity")}
                      </button>
                    </div>
                  </form>
                  <div className="crm-detail-list">
                    {detail.activities.map((item: CRMOpportunityActivity) => (
                      <div key={item.id} className="crm-detail-list__item">
                        <div>
                          <strong>{item.activity_type}</strong>
                          <div className="text-muted small">{formatDateTime(item.scheduled_at, language)} · {item.status}</div>
                          {item.description ? <div>{item.description}</div> : null}
                        </div>
                        <div className="d-flex gap-2 flex-wrap">
                          <button className="btn btn-outline-secondary btn-sm" type="button" onClick={() => {
                            setEditingActivityId(item.id);
                            setActivityForm({
                              activity_type: item.activity_type,
                              description: item.description,
                              scheduled_at: item.scheduled_at ? item.scheduled_at.slice(0, 16) : null,
                              status: item.status,
                            });
                          }}>
                            {language === "es" ? "Editar" : "Edit"}
                          </button>
                          {item.status !== "completed" ? (
                            <button className="btn btn-outline-secondary btn-sm" type="button" onClick={() => void handleActivityStatus(item.id, "completed")}>
                              {language === "es" ? "Completar" : "Complete"}
                            </button>
                          ) : null}
                          {item.status !== "cancelled" ? (
                            <button className="btn btn-outline-secondary btn-sm" type="button" onClick={() => void handleActivityStatus(item.id, "cancelled")}>
                              {language === "es" ? "Cancelar" : "Cancel"}
                            </button>
                          ) : null}
                          <button className="btn btn-outline-danger btn-sm" type="button" onClick={() => void handleActivityDelete(item.id)}>
                            {language === "es" ? "Eliminar" : "Delete"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="crm-detail-card">
                  <div className="crm-detail-card__header">
                    <strong>{language === "es" ? "Adjuntos" : "Attachments"}</strong>
                  </div>
                  <form className="crm-form-grid" onSubmit={(event) => void handleAttachmentSubmit(event)}>
                    <label>
                      <span>{language === "es" ? "Archivo" : "File"}</span>
                      <input type="file" onChange={(event) => setAttachmentFile(event.target.files?.[0] || null)} />
                    </label>
                    <label className="crm-form-grid__full">
                      <span>{language === "es" ? "Notas" : "Notes"}</span>
                      <textarea value={attachmentNotes} onChange={(event) => setAttachmentNotes(event.target.value)} rows={2} />
                    </label>
                    <div className="crm-form-actions">
                      <button className="btn btn-primary btn-sm" disabled={!attachmentFile} type="submit">
                        {language === "es" ? "Subir adjunto" : "Upload attachment"}
                      </button>
                    </div>
                  </form>
                  <div className="crm-detail-list">
                    {detail.attachments.map((item) => (
                      <div key={item.id} className="crm-detail-list__item">
                        <div>
                          <strong>{item.file_name}</strong>
                          <div className="text-muted small">
                            {item.content_type || "file"} · {Math.round(item.file_size / 1024)} KB · {formatDateTime(item.created_at, language)}
                          </div>
                          {item.notes ? <div>{item.notes}</div> : null}
                        </div>
                        <div className="d-flex gap-2">
                          <button className="btn btn-outline-secondary btn-sm" type="button" onClick={() => void handleAttachmentDownload(item.id, item.file_name, item.content_type)}>
                            {language === "es" ? "Descargar" : "Download"}
                          </button>
                          <button className="btn btn-outline-danger btn-sm" type="button" onClick={() => void handleAttachmentDelete(item.id)}>
                            {language === "es" ? "Eliminar" : "Delete"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="crm-detail-card crm-detail-card--full">
                  <div className="crm-detail-card__header">
                    <strong>{language === "es" ? "Historial de etapa" : "Stage history"}</strong>
                  </div>
                  <div className="crm-detail-list">
                    {detail.stage_events.map((item) => (
                      <div key={item.id} className="crm-detail-list__item">
                        <div>
                          <strong>{item.summary || item.event_type}</strong>
                          <div className="text-muted small">
                            {[item.from_stage, item.to_stage].filter(Boolean).join(" -> ") || item.event_type}
                          </div>
                          {item.notes ? <div>{item.notes}</div> : null}
                        </div>
                        <div className="text-muted small">{formatDateTime(item.created_at, language)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </PanelCard>
        </div>
      ) : null}
    </div>
  );
}

function nextStageFor(stage: string) {
  switch (stage) {
    case "lead":
      return "qualified";
    case "qualified":
      return "proposal";
    case "proposal":
      return "negotiation";
    default:
      return "negotiation";
  }
}
