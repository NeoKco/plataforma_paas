import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "../../../../../components/common/PageHeader";
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
  getTechDocsAudit,
  getTechDocsDossiers,
  type TechDocsAuditEvent,
  type TechDocsDossier,
} from "../services/techdocsService";

function formatDateTime(value: string | null, language: "es" | "en") {
  if (!value) return "—";
  return new Intl.DateTimeFormat(language === "es" ? "es-CL" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function TechDocsAuditPage() {
  const { session } = useTenantAuth();
  const { language } = useLanguage();
  const [rows, setRows] = useState<TechDocsAuditEvent[]>([]);
  const [dossiers, setDossiers] = useState<TechDocsDossier[]>([]);
  const [selectedDossierId, setSelectedDossierId] = useState("");
  const [query, setQuery] = useState("");
  const [error, setError] = useState<ApiError | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const dossierMap = useMemo(
    () => new Map(dossiers.map((item) => [item.id, item.title])),
    [dossiers]
  );

  async function loadAudit() {
    if (!session?.accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const [auditResponse, dossiersResponse] = await Promise.all([
        getTechDocsAudit(session.accessToken, {
          dossierId: selectedDossierId ? Number(selectedDossierId) : undefined,
          q: query,
        }),
        getTechDocsDossiers(session.accessToken, {
          includeArchived: true,
          includeInactive: true,
        }),
      ]);
      setRows(auditResponse.data);
      setDossiers(dossiersResponse.data);
    } catch (rawError) {
      setError(rawError as ApiError);
      setRows([]);
      setDossiers([]);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadAudit();
  }, [session?.accessToken, selectedDossierId]);

  if (isLoading) {
    return (
      <LoadingBlock
        label={language === "es" ? "Cargando auditoría técnica..." : "Loading technical audit..."}
      />
    );
  }

  if (error) {
    return (
      <ErrorState
        title={language === "es" ? "No se pudo cargar auditoría" : "Could not load audit"}
        detail={getApiErrorDisplayMessage(error)}
      />
    );
  }

  return (
    <div className="techdocs-page">
      <PageHeader
        eyebrow={language === "es" ? "EXPEDIENTE TÉCNICO" : "TECHNICAL DOSSIER"}
        title={language === "es" ? "Auditoría técnica" : "Technical audit"}
        description={
          language === "es"
            ? "Trazabilidad de cambios sobre expedientes, secciones, mediciones y evidencias."
            : "Traceability of changes over dossiers, sections, measurements and evidences."
        }
        icon="activity"
      />

      <AppToolbar>
        <TechDocsModuleNav />
      </AppToolbar>

      <div className="techdocs-filter-grid">
        <label>
          {language === "es" ? "Expediente" : "Dossier"}
          <select
            className="form-select"
            value={selectedDossierId}
            onChange={(event) => setSelectedDossierId(event.target.value)}
          >
            <option value="">{language === "es" ? "Todos" : "All"}</option>
            {dossiers.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
        </label>
        <label>
          {language === "es" ? "Buscar" : "Search"}
          <input
            className="form-control"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={language === "es" ? "evento, resumen o payload" : "event, summary or payload"}
          />
        </label>
        <div className="techdocs-filter-actions">
          <button className="btn btn-primary" type="button" onClick={() => void loadAudit()}>
            {language === "es" ? "Aplicar filtros" : "Apply filters"}
          </button>
        </div>
      </div>

      <DataTableCard<TechDocsAuditEvent>
        title={language === "es" ? "Eventos auditados" : "Audited events"}
        subtitle={
          language === "es"
            ? "Incluye quién ejecutó la acción, expediente afectado y payload resumido."
            : "Includes actor, affected dossier and summarized payload."
        }
        rows={rows}
        columns={[
          {
            key: "event_type",
            header: language === "es" ? "Evento" : "Event",
            render: (row) => (
              <div>
                <strong>{row.event_type}</strong>
                <div className="text-muted small">{row.summary || "—"}</div>
              </div>
            ),
          },
          {
            key: "dossier",
            header: language === "es" ? "Expediente" : "Dossier",
            render: (row) => <div className="small">{dossierMap.get(row.dossier_id) || `#${row.dossier_id}`}</div>,
          },
          {
            key: "actor",
            header: language === "es" ? "Actor" : "Actor",
            render: (row) => <div className="small">{row.created_by_display_name || "—"}</div>,
          },
          {
            key: "payload",
            header: language === "es" ? "Payload" : "Payload",
            render: (row) => (
              <div className="small techdocs-prewrap">{row.payload_json || "—"}</div>
            ),
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
