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
import { ChatModuleNav } from "../components/common/ChatModuleNav";
import { getChatActivity, type ChatActivityItem } from "../services/chatService";

function formatDateTime(value: string | null, language: "es" | "en") {
  if (!value) return "—";
  return new Intl.DateTimeFormat(language === "es" ? "es-CL" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function ChatActivityPage() {
  const { session } = useTenantAuth();
  const { language } = useLanguage();
  const [rows, setRows] = useState<ChatActivityItem[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<ApiError | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!session?.accessToken) return;
      setIsLoading(true);
      setError(null);
      try {
        const response = await getChatActivity(session.accessToken, search || undefined);
        setRows(response.data);
      } catch (rawError) {
        setError(rawError as ApiError);
        setRows([]);
      } finally {
        setIsLoading(false);
      }
    }
    void load();
  }, [search, session?.accessToken]);

  if (isLoading) {
    return <LoadingBlock label={language === "es" ? "Cargando actividad..." : "Loading activity..."} />;
  }

  if (error) {
    return (
      <ErrorState
        title={language === "es" ? "No pudimos cargar la actividad" : "Could not load activity"}
        detail={getApiErrorDisplayMessage(error)}
      />
    );
  }

  return (
    <div className="chat-page">
      <PageHeader
        eyebrow={language === "es" ? "CHAT INTERNO" : "INTERNAL CHAT"}
        title={language === "es" ? "Actividad" : "Activity"}
        description={
          language === "es"
            ? "Revisa mensajes recientes para soporte, coordinación y seguimiento."
            : "Review recent messages for support, coordination and follow-up."
        }
        icon="activity"
      />
      <AppToolbar>
        <ChatModuleNav />
      </AppToolbar>

      <DataTableCard<ChatActivityItem>
        title={language === "es" ? "Actividad reciente" : "Recent activity"}
        subtitle={
          language === "es"
            ? "Busca por texto visible en los mensajes."
            : "Search by visible text in messages."
        }
        rows={rows}
        actions={
          <div className="d-flex gap-2">
            <input
              className="form-control"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={
                language === "es" ? "Buscar por texto del mensaje" : "Search by message text"
              }
            />
          </div>
        }
        columns={[
          {
            key: "conversation_title",
            header: language === "es" ? "Hilo" : "Thread",
            render: (row) => (
              <div>
                <strong>{row.conversation_title}</strong>
                <div className="text-muted small">{row.body}</div>
              </div>
            ),
          },
          {
            key: "sender_display_name",
            header: language === "es" ? "Autor" : "Author",
            render: (row) => <div className="small">{row.sender_display_name || "—"}</div>,
          },
          {
            key: "kind",
            header: language === "es" ? "Tipo" : "Type",
            render: (row) => (
              <div className="small">
                {row.conversation_kind}
                <br />
                {row.context_type}
              </div>
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
