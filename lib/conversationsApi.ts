import { AgentId } from "@/types/chat";
import {
  AttachmentMetadata,
  ConversationListItem,
  ConversationMessage,
  ConversationRecord,
  TraceEventRecord,
} from "@/types/conversation";

interface ListConversationsResponse {
  data: ConversationListItem[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

interface ListMessagesResponse {
  data: ConversationMessage[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

interface ListTraceResponse {
  data: TraceEventRecord[];
}

interface MessageTurnResponse {
  data: {
    conversation: ConversationRecord | null;
    userMessage: ConversationMessage;
    assistantMessage: ConversationMessage;
    traceEvent: TraceEventRecord;
  };
  mode: "immediate";
}

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) {
    return {} as T;
  }

  return JSON.parse(text) as T;
}

function resolveErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  const record = payload as Record<string, unknown>;
  return typeof record.error === "string" ? record.error : fallback;
}

async function apiFetch<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const payload = await readJson<T | { error?: string }>(response);
  if (!response.ok) {
    throw new Error(resolveErrorMessage(payload, `Request failed (${response.status})`));
  }

  return payload as T;
}

export async function createConversation(payload?: {
  title?: string;
  defaultAgentId?: AgentId;
  autoRouteEnabled?: boolean;
}): Promise<ConversationRecord> {
  const response = await apiFetch<{ data: ConversationRecord }>("/conversations", {
    method: "POST",
    body: JSON.stringify(payload ?? {}),
  });
  return response.data;
}

export async function listConversations(params?: {
  limit?: number;
  offset?: number;
  search?: string;
}): Promise<ListConversationsResponse> {
  const query = new URLSearchParams();
  if (typeof params?.limit === "number") {
    query.set("limit", String(params.limit));
  }
  if (typeof params?.offset === "number") {
    query.set("offset", String(params.offset));
  }
  if (params?.search) {
    query.set("search", params.search);
  }

  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiFetch<ListConversationsResponse>(`/conversations${suffix}`, {
    method: "GET",
  });
}

export async function getConversation(conversationId: string): Promise<ConversationRecord> {
  const response = await apiFetch<{ data: ConversationRecord }>(`/conversations/${encodeURIComponent(conversationId)}`, {
    method: "GET",
  });
  return response.data;
}

export async function patchConversation(
  conversationId: string,
  patch: {
    title?: string;
    autoRouteEnabled?: boolean;
    status?: "active" | "archived";
    defaultAgentId?: AgentId;
    isPinned?: boolean;
  }
): Promise<ConversationRecord> {
  const response = await apiFetch<{ data: ConversationRecord }>(`/conversations/${encodeURIComponent(conversationId)}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
  return response.data;
}

export async function deleteConversation(conversationId: string): Promise<void> {
  await apiFetch<{ ok: boolean }>(`/conversations/${encodeURIComponent(conversationId)}`, {
    method: "DELETE",
  });
}

export async function listMessages(conversationId: string, params?: { limit?: number; offset?: number }): Promise<ListMessagesResponse> {
  const query = new URLSearchParams();
  if (typeof params?.limit === "number") {
    query.set("limit", String(params.limit));
  }
  if (typeof params?.offset === "number") {
    query.set("offset", String(params.offset));
  }

  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiFetch<ListMessagesResponse>(`/conversations/${encodeURIComponent(conversationId)}/messages${suffix}`, {
    method: "GET",
  });
}

export async function postMessage(
  conversationId: string,
  payload: {
    content: string;
    selectedAgentId: AgentId;
    autoRouteEnabled: boolean;
    attachments?: AttachmentMetadata[];
  }
): Promise<MessageTurnResponse> {
  return apiFetch<MessageTurnResponse>(`/conversations/${encodeURIComponent(conversationId)}/messages`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function listTraceEvents(conversationId: string, messageId?: string): Promise<ListTraceResponse> {
  const query = new URLSearchParams();
  if (messageId) {
    query.set("message_id", messageId);
  }

  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiFetch<ListTraceResponse>(`/conversations/${encodeURIComponent(conversationId)}/trace${suffix}`, {
    method: "GET",
  });
}
