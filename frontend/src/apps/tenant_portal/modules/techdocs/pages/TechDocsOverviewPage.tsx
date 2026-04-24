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
import { TechDocsModuleNav } from "../components/common/TechDocsModuleNav";
import {
  getTechDocsOverview,
  type TechDocsDossier,
  type TechDocsEvidence,
} from "../services/techdocsService";

function formatDateTime(value: string | null, language: "es" | "en") {
  if (!value) return "—";
  return new Intl.DateTimeFormat(language === "es" ? "es-CL" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function TechDocsOverviewPage() {
  const { session } = useTenantAuth();
  const { language } = useLanguage();
  const [data, setData] = useState<Awaited<ReturnType<typeof getTechDocsOverview>> | null>(
    null
  );
  const [error, setError] = useState<ApiError | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function loadOverview() {
    if (!session?.accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      setData(await getTechDocsOverview(session.accessToken));
    } catch (rawError) {
      setError(rawError as ApiError);
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadOverview();
  }, [session?.accessToken]);

  if (isLoading) {
    return (
      <LoadingBlock
        label={language === "es" ? "Cargando expediente técnico..." : "Loading technical dossier..."}
      />
    );
  }

  if (error || !data) {
    return (
      <ErrorState
        title={
          language === "es"
            ? "No se pudo cargar expediente técnico"
            : "Could not load technical dossier"
        }
        detail={
          error
            ? getApiErrorDisplayMessage(error)
            : language === "es"
              ? "Sin respuesta del servidor."
              : "No response from server."
        }
      />
    );
  }

  return (
    <div className="techdocs-page">
      <PageHeader
        eyebrow={language === "es" ? "EXPEDIENTE TÉCNICO" : "TECHNICAL DOSSIER"}
        title={language === "es" ? "Expediente técnico" : "Technical dossier"}
        description={
          language === "es"
            ? "Centraliza dossier base, mediciones, evidencias y auditoría conectada con clientes, mantenciones, CRM y TaskOps."
            : "Centralize dossier base, measurements, evidences and audit connected to clients, maintenance, CRM and TaskOps."
        }
        icon="techdocs"
      />

      <AppToolbar>
        <TechDocsModuleNav />
      </AppToolbar>

      <div className="techdocs-metric-grid">
        <PanelCard title={language === "es" ? "Activos" : "Active"}>
          <div className="techdocs-metric">{data.metrics.active_total}</div>
          <div className="techdocs-metric__caption">
            {language === "es" ? "Expedientes operativos vigentes." : "Operational active dossiers."}
          </div>
        </PanelCard>
        <PanelCard title={language === "es" ? "En revisión" : "In review"}>
          <div className="techdocs-metric">{data.metrics.review_total}</div>
          <div className="techdocs-metric__caption">
            {language === "es" ? "Pendientes de aprobación técnica." : "Pending technical approval."}
          </div>
        </PanelCard>
        <PanelCard title={language === "es" ? "Aprobados" : "Approved"}>
          <div className="techdocs-metric">{data.metrics.approved_total}</div>
          <div className="techdocs-metric__caption">
            {language === "es" ? "Con validación formal cerrada." : "With formal approval closed."}
          </div>
        </PanelCard>
        <PanelCard title={language === "es" ? "Evidencias" : "Evidences"}>
          <div className="techdocs-metric">{data.metrics.evidence_total}</div>
          <div className="techdocs-metric__caption">
            {language === "es" ? "Archivos técnicos almacenados." : "Stored technical files."}
          </div>
        </PanelCard>
      </div>

      <DataTableCard<TechDocsDossier>
        title={language === "es" ? "Expedientes recientes" : "Recent dossiers"}
        subtitle={
          language === "es"
            ? "Últimos expedientes creados o actualizados en el tenant."
            : "Latest dossiers created or updated in the tenant."
        }
        rows={data.recent_dossiers}
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
                {row.installation_display_name || row.opportunity_title || row.task_title || "—"}
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
            key: "owner",
            header: language === "es" ? "Responsable" : "Owner",
            render: (row) => (
              <div className="small">{row.owner_user_display_name || "—"}</div>
            ),
          },
          {
            key: "updated",
            header: language === "es" ? "Actualizado" : "Updated",
            render: (row) => (
              <div className="small">{formatDateTime(row.updated_at, language)}</div>
            ),
          },
        ]}
      />

      <DataTableCard<TechDocsEvidence>
        title={language === "es" ? "Evidencias recientes" : "Recent evidences"}
        subtitle={
          language === "es"
            ? "Últimos archivos técnicos subidos al carril."
            : "Latest technical files uploaded to the lane."
        }
        rows={data.recent_evidences}
        columns={[
          {
            key: "file_name",
            header: language === "es" ? "Archivo" : "File",
            render: (row) => (
              <div>
                <strong>{row.file_name}</strong>
                <div className="text-muted small">{row.description || "—"}</div>
              </div>
            ),
          },
          {
            key: "kind",
            header: language === "es" ? "Tipo" : "Kind",
            render: (row) => <div className="small">{row.evidence_kind}</div>,
          },
          {
            key: "uploaded_by",
            header: language === "es" ? "Subido por" : "Uploaded by",
            render: (row) => <div className="small">{row.uploaded_by_display_name || "—"}</div>,
          },
          {
            key: "created_at",
            header: language === "es" ? "Fecha" : "Date",
            render: (row) => <div className="small">{formatDateTime(row.created_at, language)}</div>,
          },
        ]}
      />
    </div>
  );
}
