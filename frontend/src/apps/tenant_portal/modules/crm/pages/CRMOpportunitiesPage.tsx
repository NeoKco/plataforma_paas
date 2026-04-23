import { useEffect, useState } from "react";
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
  createCRMOpportunity,
  deleteCRMOpportunity,
  getCRMOpportunities,
  updateCRMOpportunity,
  updateCRMOpportunityStatus,
  type CRMOpportunity,
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

export function CRMOpportunitiesPage() {
  const { session } = useTenantAuth();
  const { language } = useLanguage();
  const [rows, setRows] = useState<CRMOpportunity[]>([]);
  const [clients, setClients] = useState<TenantBusinessClient[]>([]);
  const [organizations, setOrganizations] = useState<TenantBusinessOrganization[]>([]);
  const [form, setForm] = useState<CRMOpportunityWriteRequest>(buildDefaultForm());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function loadRows() {
    if (!session?.accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const [opportunitiesResponse, clientsResponse, organizationsResponse] = await Promise.all([
        getCRMOpportunities(session.accessToken),
        getTenantBusinessClients(session.accessToken, { includeInactive: false }),
        getTenantBusinessOrganizations(session.accessToken, { includeInactive: false }),
      ]);
      setRows(opportunitiesResponse.data);
      setClients(clientsResponse.data);
      setOrganizations(organizationsResponse.data);
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadRows();
  }, [session?.accessToken]);

  const organizationById = new Map(organizations.map((item) => [item.id, item]));

  function startNew() {
    setEditingId(null);
    setForm(buildDefaultForm());
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
      startNew();
      await loadRows();
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
      }
      await loadRows();
    } catch (rawError) {
      setError(rawError as ApiError);
    }
  }

  return (
    <div className="d-grid gap-4">
      <PageHeader
        eyebrow={language === "es" ? "CRM comercial" : "Commercial CRM"}
        icon="pipeline"
        title={language === "es" ? "Oportunidades" : "Opportunities"}
        description={
          language === "es"
            ? "Pipeline comercial inicial conectado a clientes del core."
            : "Initial commercial pipeline connected to business-core clients."
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
          title={language === "es" ? "No se pudo cargar oportunidades" : "Could not load opportunities"}
          detail={getApiErrorDisplayMessage(error)}
          requestId={error.payload?.request_id}
        />
      ) : null}
      {isLoading ? <LoadingBlock label={language === "es" ? "Cargando pipeline..." : "Loading pipeline..."} /> : null}

      <PanelCard
        title={editingId ? (language === "es" ? "Editar oportunidad" : "Edit opportunity") : (language === "es" ? "Nueva oportunidad" : "New opportunity")}
        subtitle={
          language === "es"
            ? "Este slice deja el pipeline básico antes de abrir notas, actividades y archivos."
            : "This slice leaves the basic pipeline ready before notes, activities, and files."
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
          { key: "title", header: language === "es" ? "Oportunidad" : "Opportunity", render: (row) => <div><strong>{row.title}</strong><div className="text-muted small">{row.client_display_name || "—"}</div></div> },
          { key: "stage", header: language === "es" ? "Etapa" : "Stage", render: (row) => row.stage },
          { key: "value", header: language === "es" ? "Valor" : "Value", render: (row) => (row.expected_value || 0).toLocaleString() },
          { key: "probability", header: language === "es" ? "Prob." : "Prob.", render: (row) => `${row.probability_percent}%` },
          {
            key: "actions",
            header: language === "es" ? "Acciones" : "Actions",
            render: (row) => (
              <div className="d-flex gap-2 flex-wrap">
                <button className="btn btn-outline-secondary btn-sm" type="button" onClick={() => startEdit(row)}>
                  {language === "es" ? "Editar" : "Edit"}
                </button>
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
    </div>
  );
}
