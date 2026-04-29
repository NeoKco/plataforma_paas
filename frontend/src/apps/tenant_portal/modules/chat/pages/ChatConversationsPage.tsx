import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "../../../../../components/common/PageHeader";
import { PanelCard } from "../../../../../components/common/PanelCard";
import { ErrorState } from "../../../../../components/feedback/ErrorState";
import { LoadingBlock } from "../../../../../components/feedback/LoadingBlock";
import { AppToolbar } from "../../../../../design-system/AppLayout";
import { getApiErrorDisplayMessage } from "../../../../../services/api";
import { getTenantUsers } from "../../../../../services/tenant-api";
import { useLanguage } from "../../../../../store/language-context";
import { useTenantAuth } from "../../../../../store/tenant-auth-context";
import type { ApiError, TenantUsersItem } from "../../../../../types";
import { getTenantBusinessClients, type TenantBusinessClient } from "../../business_core/services/clientsService";
import {
  getTenantBusinessOrganizations,
  type TenantBusinessOrganization,
} from "../../business_core/services/organizationsService";
import { ChatModuleNav } from "../components/common/ChatModuleNav";
import {
  createChatConversation,
  getChatConversationDetail,
  getChatConversations,
  markChatConversationRead,
  sendChatMessage,
  setChatConversationArchived,
  type ChatConversation,
  type ChatConversationCreateRequest,
  type ChatConversationDetail,
} from "../services/chatService";
import { getCRMOpportunities, type CRMOpportunity } from "../../crm/services/crmService";
import {
  getTenantMaintenanceWorkOrders,
  type TenantMaintenanceWorkOrder,
} from "../../maintenance/services/workOrdersService";
import { getTaskOpsTasks, type TaskOpsTask } from "../../taskops/services/taskopsService";
import { hasTenantPermission } from "../../../utils/tenant-permissions";

type ContextType = "general" | "client" | "opportunity" | "work_order" | "task";

function formatDateTime(value: string | null, language: "es" | "en") {
  if (!value) return "—";
  return new Intl.DateTimeFormat(language === "es" ? "es-CL" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function ChatConversationsPage() {
  const { session, tenantUser } = useTenantAuth();
  const { language } = useLanguage();
  const canReadUsers = hasTenantPermission(tenantUser, "tenant.users.read");
  const canReadBusinessCore = hasTenantPermission(tenantUser, "tenant.business_core.read");
  const canReadCRM = hasTenantPermission(tenantUser, "tenant.crm.read");
  const canReadMaintenance = hasTenantPermission(tenantUser, "tenant.maintenance.read");
  const canReadTaskOps = hasTenantPermission(tenantUser, "tenant.taskops.read");
  const [rows, setRows] = useState<ChatConversation[]>([]);
  const [detail, setDetail] = useState<ChatConversationDetail | null>(null);
  const [users, setUsers] = useState<TenantUsersItem[]>([]);
  const [clients, setClients] = useState<TenantBusinessClient[]>([]);
  const [organizations, setOrganizations] = useState<TenantBusinessOrganization[]>([]);
  const [opportunities, setOpportunities] = useState<CRMOpportunity[]>([]);
  const [workOrders, setWorkOrders] = useState<TenantMaintenanceWorkOrder[]>([]);
  const [tasks, setTasks] = useState<TaskOpsTask[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [search, setSearch] = useState("");
  const [messageDraft, setMessageDraft] = useState("");
  const [formMode, setFormMode] = useState<"direct" | "context">("direct");
  const [targetUserId, setTargetUserId] = useState<number | null>(null);
  const [participantUserIds, setParticipantUserIds] = useState<number[]>([]);
  const [contextType, setContextType] = useState<ContextType>("general");
  const [contextRefId, setContextRefId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const organizationNameMap = useMemo(
    () => new Map(organizations.map((item) => [item.id, item.name])),
    [organizations]
  );

  const clientOptions = useMemo(
    () =>
      clients.map((item) => ({
        id: item.id,
        label: organizationNameMap.get(item.organization_id) || `Cliente #${item.id}`,
      })),
    [clients, organizationNameMap]
  );

  const selectedConversation = useMemo(
    () => rows.find((item) => item.id === selectedConversationId) || null,
    [rows, selectedConversationId]
  );

  const availableUsers = useMemo(
    () => users.filter((item) => item.is_active && item.id !== session?.userId),
    [users, session?.userId]
  );

  useEffect(() => {
    async function load() {
      if (!session?.accessToken) return;
      setIsLoading(true);
      setError(null);
      try {
        const [
          conversationResponse,
          userResponse,
          clientResponse,
          organizationResponse,
          opportunityResponse,
          workOrderResponse,
          taskResponse,
        ] = await Promise.all([
          getChatConversations(session.accessToken, {
            includeArchived,
            q: search || undefined,
          }),
          canReadUsers
            ? getTenantUsers(session.accessToken)
            : Promise.resolve({ data: [] as TenantUsersItem[] }),
          canReadBusinessCore
            ? getTenantBusinessClients(session.accessToken, { includeInactive: false })
            : Promise.resolve({ data: [] as TenantBusinessClient[] }),
          canReadBusinessCore
            ? getTenantBusinessOrganizations(session.accessToken, { includeInactive: false })
            : Promise.resolve({ data: [] as TenantBusinessOrganization[] }),
          canReadCRM
            ? getCRMOpportunities(session.accessToken)
            : Promise.resolve({ data: [] as CRMOpportunity[] }),
          canReadMaintenance
            ? getTenantMaintenanceWorkOrders(session.accessToken)
            : Promise.resolve({ data: [] as TenantMaintenanceWorkOrder[] }),
          canReadTaskOps
            ? getTaskOpsTasks(session.accessToken, {
                includeInactive: false,
                includeClosed: false,
              })
            : Promise.resolve({ data: [] as TaskOpsTask[] }),
        ]);
        setRows(conversationResponse.data);
        setUsers(userResponse.data);
        setClients(clientResponse.data);
        setOrganizations(organizationResponse.data);
        setOpportunities(opportunityResponse.data);
        setWorkOrders(workOrderResponse.data);
        setTasks(taskResponse.data);
        setSelectedConversationId((current) => {
          if (current && conversationResponse.data.some((item) => item.id === current)) {
            return current;
          }
          return conversationResponse.data[0]?.id ?? null;
        });
      } catch (rawError) {
        setError(rawError as ApiError);
        setRows([]);
        setDetail(null);
      } finally {
        setIsLoading(false);
      }
    }
    void load();
  }, [includeArchived, search, session?.accessToken]);

  useEffect(() => {
    async function loadDetail() {
      if (!session?.accessToken || !selectedConversationId) {
        setDetail(null);
        return;
      }
      setIsDetailLoading(true);
      try {
        const response = await getChatConversationDetail(session.accessToken, selectedConversationId);
        if (response.data.conversation.unread_count > 0 && response.data.messages.length > 0) {
          const lastMessageId = response.data.messages[response.data.messages.length - 1]?.id;
          const marked = await markChatConversationRead(
            session.accessToken,
            selectedConversationId,
            lastMessageId
          );
          setDetail(marked.data);
          setRows((current) =>
            current.map((item) =>
              item.id === selectedConversationId
                ? { ...marked.data.conversation }
                : item
            )
          );
        } else {
          setDetail(response.data);
        }
      } catch (rawError) {
        setError(rawError as ApiError);
        setDetail(null);
      } finally {
        setIsDetailLoading(false);
      }
    }
    void loadDetail();
  }, [selectedConversationId, session?.accessToken]);

  async function refreshConversations(preferredConversationId?: number | null) {
    if (!session?.accessToken) return;
    const response = await getChatConversations(session.accessToken, {
      includeArchived,
      q: search || undefined,
    });
    setRows(response.data);
    const nextId =
      preferredConversationId && response.data.some((item) => item.id === preferredConversationId)
        ? preferredConversationId
        : response.data[0]?.id ?? null;
    setSelectedConversationId(nextId);
  }

  function resetCreateForm() {
    setFormMode("direct");
    setTargetUserId(null);
    setParticipantUserIds([]);
    setContextType("general");
    setContextRefId(null);
    setTitle("");
    setDescription("");
  }

  async function handleCreateConversation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.accessToken) return;
    setIsSubmitting(true);
    setError(null);
    const payload: ChatConversationCreateRequest = {
      conversation_kind: formMode,
      target_user_id: formMode === "direct" ? targetUserId : null,
      participant_user_ids: formMode === "context" ? participantUserIds : [],
      context_type: formMode === "context" ? contextType : "general",
      client_id: formMode === "context" && contextType === "client" ? contextRefId : null,
      opportunity_id:
        formMode === "context" && contextType === "opportunity" ? contextRefId : null,
      work_order_id:
        formMode === "context" && contextType === "work_order" ? contextRefId : null,
      task_id: formMode === "context" && contextType === "task" ? contextRefId : null,
      title: formMode === "context" ? title || null : null,
      description: description || null,
    };
    try {
      const response = await createChatConversation(session.accessToken, payload);
      resetCreateForm();
      await refreshConversations(response.data.id);
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.accessToken || !selectedConversationId || !messageDraft.trim()) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await sendChatMessage(
        session.accessToken,
        selectedConversationId,
        messageDraft.trim()
      );
      setDetail(response.detail);
      setMessageDraft("");
      await refreshConversations(selectedConversationId);
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleArchiveToggle() {
    if (!session?.accessToken || !selectedConversation) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await setChatConversationArchived(
        session.accessToken,
        selectedConversation.id,
        !selectedConversation.is_archived
      );
      await refreshConversations(selectedConversation.id);
    } catch (rawError) {
      setError(rawError as ApiError);
    } finally {
      setIsSubmitting(false);
    }
  }

  function toggleParticipant(userId: number) {
    setParticipantUserIds((current) =>
      current.includes(userId)
        ? current.filter((item) => item !== userId)
        : [...current, userId]
    );
  }

  const contextOptions = useMemo(() => {
    switch (contextType) {
      case "client":
        return clientOptions;
      case "opportunity":
        return opportunities.map((item) => ({ id: item.id, label: item.title }));
      case "work_order":
        return workOrders.map((item) => ({ id: item.id, label: item.title }));
      case "task":
        return tasks.map((item) => ({ id: item.id, label: item.title }));
      default:
        return [];
    }
  }, [clientOptions, contextType, opportunities, tasks, workOrders]);

  if (isLoading) {
    return <LoadingBlock label={language === "es" ? "Cargando chat..." : "Loading chat..."} />;
  }

  if (error && rows.length === 0 && !detail) {
    return (
      <ErrorState
        title={language === "es" ? "No pudimos cargar el chat" : "Could not load chat"}
        detail={getApiErrorDisplayMessage(error)}
      />
    );
  }

  return (
    <div className="chat-page">
      <PageHeader
        eyebrow={language === "es" ? "CHAT INTERNO" : "INTERNAL CHAT"}
        title={language === "es" ? "Conversaciones" : "Conversations"}
        description={
          language === "es"
            ? "Gestiona chats directos y hilos ligados a CRM, OT, clientes o tareas."
            : "Manage direct chats and threads linked to CRM, work orders, clients or tasks."
        }
        icon="chat"
      />

      <AppToolbar>
        <ChatModuleNav />
      </AppToolbar>

      {error ? (
        <div className="chat-inline-error">{getApiErrorDisplayMessage(error)}</div>
      ) : null}

      <div className="chat-layout">
        <div className="chat-layout__sidebar">
          <PanelCard title={language === "es" ? "Nuevo hilo" : "New thread"}>
            <form className="chat-form-grid" onSubmit={(event) => void handleCreateConversation(event)}>
              <label>
                <span>{language === "es" ? "Modo" : "Mode"}</span>
                <select
                  value={formMode}
                  onChange={(event) => setFormMode(event.target.value as "direct" | "context")}
                >
                  <option value="direct">{language === "es" ? "Directo" : "Direct"}</option>
                  <option value="context">{language === "es" ? "Por contexto" : "Context thread"}</option>
                </select>
              </label>

              {formMode === "direct" ? (
                <label>
                  <span>{language === "es" ? "Usuario destino" : "Target user"}</span>
                  <select
                    value={targetUserId ?? ""}
                    onChange={(event) =>
                      setTargetUserId(event.target.value ? Number(event.target.value) : null)
                    }
                  >
                    <option value="">{language === "es" ? "Selecciona usuario" : "Select user"}</option>
                    {availableUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.full_name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <>
                  <label>
                    <span>{language === "es" ? "Título" : "Title"}</span>
                    <input
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      placeholder={language === "es" ? "Ej: Seguimiento OT 128" : "Ex: Work order 128 follow-up"}
                    />
                  </label>
                  <label>
                    <span>{language === "es" ? "Contexto" : "Context"}</span>
                    <select
                      value={contextType}
                      onChange={(event) => {
                        setContextType(event.target.value as ContextType);
                        setContextRefId(null);
                      }}
                    >
                      <option value="general">{language === "es" ? "General" : "General"}</option>
                      <option value="client">{language === "es" ? "Cliente" : "Client"}</option>
                      <option value="opportunity">{language === "es" ? "Oportunidad CRM" : "CRM opportunity"}</option>
                      <option value="work_order">{language === "es" ? "OT mantención" : "Maintenance work order"}</option>
                      <option value="task">{language === "es" ? "Tarea TaskOps" : "TaskOps task"}</option>
                    </select>
                  </label>
                  {contextType !== "general" ? (
                    <label>
                      <span>{language === "es" ? "Referencia" : "Reference"}</span>
                      <select
                        value={contextRefId ?? ""}
                        onChange={(event) =>
                          setContextRefId(event.target.value ? Number(event.target.value) : null)
                        }
                      >
                        <option value="">{language === "es" ? "Selecciona referencia" : "Select reference"}</option>
                        {contextOptions.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                  <div className="chat-form-grid__full">
                    <span className="chat-form-grid__label">
                      {language === "es" ? "Participantes" : "Participants"}
                    </span>
                    <div className="chat-check-grid">
                      {availableUsers.map((user) => (
                        <label key={user.id} className="chat-inline-check">
                          <input
                            type="checkbox"
                            checked={participantUserIds.includes(user.id)}
                            onChange={() => toggleParticipant(user.id)}
                          />
                          <span>{user.full_name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <label className="chat-form-grid__full">
                <span>{language === "es" ? "Descripción" : "Description"}</span>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder={
                    language === "es"
                      ? "Contexto breve del hilo"
                      : "Short thread context"
                  }
                />
              </label>

              <div className="chat-form-actions">
                <button type="submit" disabled={isSubmitting}>
                  {language === "es" ? "Crear conversación" : "Create conversation"}
                </button>
              </div>
            </form>
          </PanelCard>

          <PanelCard title={language === "es" ? "Listado" : "Thread list"}>
            <div className="chat-list-toolbar">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={language === "es" ? "Buscar conversación" : "Search conversation"}
              />
              <label className="chat-inline-check">
                <input
                  type="checkbox"
                  checked={includeArchived}
                  onChange={(event) => setIncludeArchived(event.target.checked)}
                />
                <span>{language === "es" ? "Ver archivadas" : "Show archived"}</span>
              </label>
            </div>
            <div className="chat-thread-list">
              {rows.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`chat-thread-card${selectedConversationId === item.id ? " is-active" : ""}`}
                  onClick={() => setSelectedConversationId(item.id)}
                >
                  <div className="chat-thread-card__header">
                    <strong>{item.title}</strong>
                    {item.unread_count > 0 ? (
                      <span className="chat-thread-card__badge">{item.unread_count}</span>
                    ) : null}
                  </div>
                  <div className="chat-thread-card__meta">
                    {item.conversation_kind} · {item.context_type}
                  </div>
                  <div className="chat-thread-card__preview">{item.last_message_preview || "—"}</div>
                  <div className="chat-thread-card__footer">
                    {formatDateTime(item.last_message_at, language)}
                  </div>
                </button>
              ))}
              {rows.length === 0 ? (
                <div className="chat-empty">
                  {language === "es"
                    ? "No hay conversaciones para este filtro."
                    : "There are no conversations for this filter."}
                </div>
              ) : null}
            </div>
          </PanelCard>
        </div>

        <div className="chat-layout__detail">
          {isDetailLoading ? (
            <LoadingBlock
              label={language === "es" ? "Cargando conversación..." : "Loading conversation..."}
            />
          ) : detail ? (
            <>
              <PanelCard title={detail.conversation.title}>
                <div className="chat-detail-meta">
                  <span>{detail.conversation.conversation_kind}</span>
                  <span>{detail.conversation.context_type}</span>
                  {detail.conversation.client_display_name ? (
                    <span>{detail.conversation.client_display_name}</span>
                  ) : null}
                  {detail.conversation.opportunity_title ? (
                    <span>{detail.conversation.opportunity_title}</span>
                  ) : null}
                  {detail.conversation.work_order_title ? (
                    <span>{detail.conversation.work_order_title}</span>
                  ) : null}
                  {detail.conversation.task_title ? (
                    <span>{detail.conversation.task_title}</span>
                  ) : null}
                </div>
                {detail.conversation.description ? (
                  <p className="chat-detail-description">{detail.conversation.description}</p>
                ) : null}
                <div className="chat-chip-list">
                  {detail.participants.map((item) => (
                    <span key={item.id} className="chat-chip">
                      {item.user_display_name || item.user_email || `User #${item.user_id}`}
                    </span>
                  ))}
                </div>
                <div className="chat-form-actions">
                  <button type="button" onClick={() => void handleArchiveToggle()} disabled={isSubmitting}>
                    {detail.conversation.is_archived
                      ? language === "es"
                        ? "Desarchivar"
                        : "Unarchive"
                      : language === "es"
                        ? "Archivar"
                        : "Archive"}
                  </button>
                </div>
              </PanelCard>

              <PanelCard title={language === "es" ? "Mensajes" : "Messages"}>
                <div className="chat-message-list">
                  {detail.messages.map((item) => (
                    <div
                      key={item.id}
                      className={`chat-message-bubble${item.is_own ? " is-own" : ""}`}
                    >
                      <div className="chat-message-bubble__author">
                        {item.sender_display_name || "—"}
                      </div>
                      <div className="chat-message-bubble__body">{item.body}</div>
                      <div className="chat-message-bubble__time">
                        {formatDateTime(item.created_at, language)}
                      </div>
                    </div>
                  ))}
                  {detail.messages.length === 0 ? (
                    <div className="chat-empty">
                      {language === "es" ? "Aún no hay mensajes." : "There are no messages yet."}
                    </div>
                  ) : null}
                </div>
                <form className="chat-compose" onSubmit={(event) => void handleSendMessage(event)}>
                  <textarea
                    rows={3}
                    value={messageDraft}
                    onChange={(event) => setMessageDraft(event.target.value)}
                    placeholder={
                      language === "es"
                        ? "Escribe un mensaje al equipo"
                        : "Write a message to the team"
                    }
                  />
                  <div className="chat-form-actions">
                    <button type="submit" disabled={isSubmitting || !messageDraft.trim()}>
                      {language === "es" ? "Enviar" : "Send"}
                    </button>
                  </div>
                </form>
              </PanelCard>
            </>
          ) : (
            <PanelCard title={language === "es" ? "Sin conversación seleccionada" : "No conversation selected"}>
              <div className="chat-empty">
                {language === "es"
                  ? "Selecciona un hilo a la izquierda o crea uno nuevo."
                  : "Select a thread on the left or create a new one."}
              </div>
            </PanelCard>
          )}
        </div>
      </div>
    </div>
  );
}
