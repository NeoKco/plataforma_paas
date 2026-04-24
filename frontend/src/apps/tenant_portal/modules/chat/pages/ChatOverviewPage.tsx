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
import { ChatModuleNav } from "../components/common/ChatModuleNav";
import {
  getChatOverview,
  type ChatActivityItem,
  type ChatConversation,
} from "../services/chatService";

function formatDateTime(value: string | null, language: "es" | "en") {
  if (!value) return "—";
  return new Intl.DateTimeFormat(language === "es" ? "es-CL" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function ChatOverviewPage() {
  const { session } = useTenantAuth();
  const { language } = useLanguage();
  const [data, setData] = useState<Awaited<ReturnType<typeof getChatOverview>> | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!session?.accessToken) return;
      setIsLoading(true);
      setError(null);
      try {
        setData(await getChatOverview(session.accessToken));
      } catch (rawError) {
        setError(rawError as ApiError);
        setData(null);
      } finally {
        setIsLoading(false);
      }
    }
    void load();
  }, [session?.accessToken]);

  if (isLoading) {
    return <LoadingBlock label={language === "es" ? "Cargando chat..." : "Loading chat..."} />;
  }

  if (error || !data) {
    return (
      <ErrorState
        title={language === "es" ? "No pudimos cargar el chat" : "Could not load chat"}
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
    <div className="chat-page">
      <PageHeader
        eyebrow={language === "es" ? "CHAT INTERNO" : "INTERNAL CHAT"}
        title={language === "es" ? "Chat interno" : "Internal chat"}
        description={
          language === "es"
            ? "Conversa entre usuarios tenant y ordena hilos directos o por contexto operativo."
            : "Chat between tenant users and organize direct or context-based threads."
        }
        icon="chat"
      />

      <AppToolbar>
        <ChatModuleNav />
      </AppToolbar>

      <div className="chat-metric-grid">
        <PanelCard title={language === "es" ? "Conversaciones" : "Conversations"}>
          <div className="chat-metric">{data.metrics.conversation_total}</div>
          <div className="chat-metric__caption">
            {language === "es" ? "Hilos visibles para el usuario actual." : "Threads visible to the current user."}
          </div>
        </PanelCard>
        <PanelCard title={language === "es" ? "No leídas" : "Unread"}>
          <div className="chat-metric">{data.metrics.unread_conversation_total}</div>
          <div className="chat-metric__caption">
            {language === "es" ? "Conversaciones con mensajes pendientes." : "Conversations with pending messages."}
          </div>
        </PanelCard>
        <PanelCard title={language === "es" ? "Mensajes pendientes" : "Unread messages"}>
          <div className="chat-metric">{data.metrics.unread_message_total}</div>
          <div className="chat-metric__caption">
            {language === "es" ? "Mensajes no leídos acumulados." : "Accumulated unread messages."}
          </div>
        </PanelCard>
        <PanelCard title={language === "es" ? "Hilos por contexto" : "Context threads"}>
          <div className="chat-metric">{data.metrics.context_total}</div>
          <div className="chat-metric__caption">
            {language === "es" ? "Vinculados a clientes, CRM, OT o tareas." : "Linked to clients, CRM, work orders or tasks."}
          </div>
        </PanelCard>
      </div>

      <DataTableCard<ChatConversation>
        title={language === "es" ? "Conversaciones recientes" : "Recent conversations"}
        subtitle={
          language === "es"
            ? "Últimos hilos con actividad para el usuario actual."
            : "Latest threads with activity for the current user."
        }
        rows={data.recent_conversations}
        columns={[
          {
            key: "title",
            header: language === "es" ? "Conversación" : "Conversation",
            render: (row) => (
              <div>
                <strong>{row.title}</strong>
                <div className="text-muted small">{row.last_message_preview || "—"}</div>
              </div>
            ),
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
            key: "participants",
            header: language === "es" ? "Participantes" : "Participants",
            render: (row) => <div className="small">{row.participant_display_names.join(" · ") || "—"}</div>,
          },
          {
            key: "unread",
            header: language === "es" ? "No leídos" : "Unread",
            render: (row) => <div className="small">{row.unread_count}</div>,
          },
          {
            key: "last",
            header: language === "es" ? "Último mensaje" : "Last message",
            render: (row) => <div className="small">{formatDateTime(row.last_message_at, language)}</div>,
          },
        ]}
      />

      <DataTableCard<ChatActivityItem>
        title={language === "es" ? "Mensajes recientes" : "Recent messages"}
        subtitle={
          language === "es"
            ? "Pulso rápido de la actividad reciente del módulo."
            : "Quick pulse of recent module activity."
        }
        rows={data.recent_messages}
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
            key: "sender",
            header: language === "es" ? "Autor" : "Author",
            render: (row) => <div className="small">{row.sender_display_name || "—"}</div>,
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
