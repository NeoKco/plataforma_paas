import { apiRequest } from "../../../../../services/api";

export type ChatRequestedBy = {
  user_id: number;
  email: string;
  role: string;
  tenant_slug: string;
  token_scope: string;
};

export type ChatConversation = {
  id: number;
  conversation_kind: string;
  context_type: string;
  title: string;
  description: string | null;
  client_id: number | null;
  client_display_name: string | null;
  opportunity_id: number | null;
  opportunity_title: string | null;
  work_order_id: number | null;
  work_order_title: string | null;
  task_id: number | null;
  task_title: string | null;
  created_by_user_id: number | null;
  created_by_display_name: string | null;
  participant_count: number;
  participant_display_names: string[];
  last_message_preview: string | null;
  last_message_at: string | null;
  last_sender_display_name: string | null;
  unread_count: number;
  is_archived: boolean;
  last_read_message_id: number | null;
  last_read_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type ChatParticipant = {
  id: number;
  conversation_id: number;
  user_id: number;
  user_display_name: string | null;
  user_email: string | null;
  participant_role: string;
  is_archived: boolean;
  last_read_message_id: number | null;
  last_read_at: string | null;
  joined_at: string | null;
};

export type ChatMessage = {
  id: number;
  conversation_id: number;
  sender_user_id: number | null;
  sender_display_name: string | null;
  message_kind: string;
  body: string;
  is_own: boolean;
  created_at: string | null;
  edited_at: string | null;
};

export type ChatConversationDetail = {
  conversation: ChatConversation;
  participants: ChatParticipant[];
  messages: ChatMessage[];
};

export type ChatActivityItem = {
  conversation_id: number;
  conversation_title: string;
  conversation_kind: string;
  context_type: string;
  message_id: number;
  sender_user_id: number | null;
  sender_display_name: string | null;
  body: string;
  created_at: string | null;
};

export type ChatConversationCreateRequest = {
  conversation_kind: string;
  target_user_id: number | null;
  participant_user_ids: number[];
  context_type: string;
  client_id: number | null;
  opportunity_id: number | null;
  work_order_id: number | null;
  task_id: number | null;
  title: string | null;
  description: string | null;
};

type ChatOverviewResponse = {
  success: boolean;
  message: string;
  requested_by: ChatRequestedBy;
  metrics: {
    conversation_total: number;
    direct_total: number;
    context_total: number;
    unread_conversation_total: number;
    unread_message_total: number;
  };
  recent_conversations: ChatConversation[];
  recent_messages: ChatActivityItem[];
};

type ChatConversationsResponse = {
  success: boolean;
  message: string;
  requested_by: ChatRequestedBy;
  total: number;
  data: ChatConversation[];
};

type ChatConversationMutationResponse = {
  success: boolean;
  message: string;
  requested_by: ChatRequestedBy;
  data: ChatConversation;
};

type ChatConversationDetailResponse = {
  success: boolean;
  message: string;
  requested_by: ChatRequestedBy;
  data: ChatConversationDetail;
};

type ChatMessagesResponse = {
  success: boolean;
  message: string;
  requested_by: ChatRequestedBy;
  total: number;
  data: ChatMessage[];
};

type ChatMessageMutationResponse = {
  success: boolean;
  message: string;
  requested_by: ChatRequestedBy;
  detail: ChatConversationDetail;
};

type ChatActivityResponse = {
  success: boolean;
  message: string;
  requested_by: ChatRequestedBy;
  total: number;
  data: ChatActivityItem[];
};

export function getChatOverview(accessToken: string) {
  return apiRequest<ChatOverviewResponse>("/tenant/chat/overview", {
    token: accessToken,
  });
}

export function getChatConversations(
  accessToken: string,
  options: { includeArchived?: boolean; q?: string } = {}
) {
  const params = new URLSearchParams();
  if (options.includeArchived) {
    params.set("include_archived", "true");
  }
  if (options.q?.trim()) {
    params.set("q", options.q.trim());
  }
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return apiRequest<ChatConversationsResponse>(`/tenant/chat/conversations${suffix}`, {
    token: accessToken,
  });
}

export function createChatConversation(
  accessToken: string,
  payload: ChatConversationCreateRequest
) {
  return apiRequest<ChatConversationMutationResponse>("/tenant/chat/conversations", {
    method: "POST",
    token: accessToken,
    body: payload,
  });
}

export function getChatConversationDetail(accessToken: string, conversationId: number) {
  return apiRequest<ChatConversationDetailResponse>(
    `/tenant/chat/conversations/${conversationId}`,
    { token: accessToken }
  );
}

export function getChatConversationMessages(
  accessToken: string,
  conversationId: number,
  limit = 120
) {
  return apiRequest<ChatMessagesResponse>(
    `/tenant/chat/conversations/${conversationId}/messages?limit=${limit}`,
    { token: accessToken }
  );
}

export function sendChatMessage(
  accessToken: string,
  conversationId: number,
  body: string
) {
  return apiRequest<ChatMessageMutationResponse>(
    `/tenant/chat/conversations/${conversationId}/messages`,
    {
      method: "POST",
      token: accessToken,
      body: { body },
    }
  );
}

export function markChatConversationRead(
  accessToken: string,
  conversationId: number,
  lastMessageId?: number | null
) {
  return apiRequest<ChatConversationDetailResponse>(
    `/tenant/chat/conversations/${conversationId}/read`,
    {
      method: "POST",
      token: accessToken,
      body: { last_message_id: lastMessageId ?? null },
    }
  );
}

export function setChatConversationArchived(
  accessToken: string,
  conversationId: number,
  isArchived: boolean
) {
  return apiRequest<ChatConversationMutationResponse>(
    `/tenant/chat/conversations/${conversationId}/archive`,
    {
      method: "PATCH",
      token: accessToken,
      body: { is_archived: isArchived },
    }
  );
}

export function getChatActivity(accessToken: string, q?: string) {
  const params = new URLSearchParams();
  if (q?.trim()) {
    params.set("q", q.trim());
  }
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return apiRequest<ChatActivityResponse>(`/tenant/chat/activity${suffix}`, {
    token: accessToken,
  });
}
