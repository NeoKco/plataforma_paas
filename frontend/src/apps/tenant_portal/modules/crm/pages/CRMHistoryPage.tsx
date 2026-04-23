import { useEffect, useState } from "react";
import { PageHeader } from "../../../../../components/common/PageHeader";
import { DataTableCard } from "../../../../../components/data-display/DataTableCard";
import { ErrorState } from "../../../../../components/feedback/ErrorState";
import { LoadingBlock } from "../../../../../components/feedback/LoadingBlock";
import { AppToolbar } from "../../../../../design-system/AppLayout";
import { getApiErrorDisplayMessage } from "../../../../../services/api";
import { useLanguage } from "../../../../../store/language-context";
import { useTenantAuth } from "../../../../../store/tenant-auth-context";
import type { ApiError } from "../../../../../types";
import { CRMModuleNav } from "../components/common/CRMModuleNav";
import {
  getCRMHistoricalOpportunities,
  type CRMOpportunity,
} from "../services/crmService";

function formatDateTime(value: string | null, language: "es" | "en") {
  if (!value) return "—";
  return new Intl.DateTimeFormat(language === "es" ? "es-CL" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function CRMHistoryPage() {
  const { session } = useTenantAuth();
  const { language } = useLanguage();
  const [rows, setRows] = useState<CRMOpportunity[]>([]);
  const [error, setError] = useState<ApiError | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function loadRows() {
    if (!session?.accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await getCRMHistoricalOpportunities(session.accessToken);
      setRows(response.data);
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadRows();
  }, [session?.accessToken]);

  return (
    <div className="d-grid gap-4">
      <PageHeader
        eyebrow={language === "es" ? "CRM comercial" : "Commercial CRM"}
        icon="tenant-history"
        title={language === "es" ? "Histórico CRM" : "CRM history"}
        description={
          language === "es"
            ? "Oportunidades cerradas con lectura de resultado y motivo."
            : "Closed opportunities with result and reason visibility."
        }
        actions={
          <AppToolbar compact>
            <button className="btn btn-outline-secondary" type="button" onClick={() => void loadRows()}>
              {language === "es" ? "Recargar" : "Reload"}
            </button>
          </AppToolbar>
        }
      />
      <CRMModuleNav />
      {error ? (
        <ErrorState
          title={language === "es" ? "No se pudo cargar histórico CRM" : "Could not load CRM history"}
          detail={getApiErrorDisplayMessage(error)}
          requestId={error.payload?.request_id}
        />
      ) : null}
      {isLoading ? <LoadingBlock label={language === "es" ? "Cargando histórico..." : "Loading history..."} /> : null}

      <DataTableCard
        title={language === "es" ? "Oportunidades cerradas" : "Closed opportunities"}
        subtitle={
          language === "es"
            ? "Lectura consolidada de ganado/perdido."
            : "Consolidated won/lost reading."
        }
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
          {
            key: "result",
            header: language === "es" ? "Resultado" : "Result",
            render: (row) => row.stage,
          },
          {
            key: "reason",
            header: language === "es" ? "Motivo" : "Reason",
            render: (row) => row.close_reason || row.close_notes || "—",
          },
          {
            key: "closed_at",
            header: language === "es" ? "Cierre" : "Closed at",
            render: (row) => formatDateTime(row.closed_at, language),
          },
        ]}
      />
    </div>
  );
}
