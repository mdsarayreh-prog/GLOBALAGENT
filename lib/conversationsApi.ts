import { AgentId } from "@/types/chat";
import {
  AttachmentMetadata,
  ConversationListItem,
  ConversationMessage,
  ConversationRecord,
  TraceEventRecord,
} from "@/types/conversation";

export interface ClientRequestContextHeaders {
  "x-app-session"?: string;
  "x-user-id"?: string;
  "x-tenant-id"?: string;
}

const API_REQUEST_TIMEOUT_MS = 70000;

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

async function apiFetch<T>(input: string, init?: RequestInit, contextHeaders?: ClientRequestContextHeaders): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_REQUEST_TIMEOUT_MS);

  const response = await fetch(input, {
    ...init,
    credentials: "include",
    signal: controller.signal,
    headers: {
      "Content-Type": "application/json",
      ...(contextHeaders ?? {}),
      ...(init?.headers ?? {}),
    },
  }).finally(() => clearTimeout(timeoutId)).catch((error: unknown) => {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(`Request timed out after ${API_REQUEST_TIMEOUT_MS}ms`);
    }

    throw error;
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
}, contextHeaders?: ClientRequestContextHeaders): Promise<ConversationRecord> {
  const response = await apiFetch<{ data: ConversationRecord }>("/conversations", {
    method: "POST",
    body: JSON.stringify(payload ?? {}),
  }, contextHeaders);
  return response.data;
}

export async function listConversations(params?: {
  limit?: number;
  offset?: number;
  search?: string;
}, contextHeaders?: ClientRequestContextHeaders): Promise<ListConversationsResponse> {
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
  }, contextHeaders);
}

export async function getConversation(conversationId: string, contextHeaders?: ClientRequestContextHeaders): Promise<ConversationRecord> {
  const response = await apiFetch<{ data: ConversationRecord }>(`/conversations/${encodeURIComponent(conversationId)}`, {
    method: "GET",
  }, contextHeaders);
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
  },
  contextHeaders?: ClientRequestContextHeaders
): Promise<ConversationRecord> {
  const response = await apiFetch<{ data: ConversationRecord }>(`/conversations/${encodeURIComponent(conversationId)}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  }, contextHeaders);
  return response.data;
}

export async function deleteConversation(conversationId: string, contextHeaders?: ClientRequestContextHeaders): Promise<void> {
  await apiFetch<{ ok: boolean }>(`/conversations/${encodeURIComponent(conversationId)}`, {
    method: "DELETE",
  }, contextHeaders);
}

export async function listMessages(
  conversationId: string,
  params?: { limit?: number; offset?: number },
  contextHeaders?: ClientRequestContextHeaders
): Promise<ListMessagesResponse> {
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
  }, contextHeaders);
}

export async function postMessage(
  conversationId: string,
  payload: {
    content: string;
    selectedAgentId: AgentId;
    autoRouteEnabled: boolean;
    attachments?: AttachmentMetadata[];
  },
  contextHeaders?: ClientRequestContextHeaders
): Promise<MessageTurnResponse> {
  return apiFetch<MessageTurnResponse>(`/conversations/${encodeURIComponent(conversationId)}/messages`, {
    method: "POST",
    body: JSON.stringify(payload),
  }, contextHeaders);
}

export async function listTraceEvents(
  conversationId: string,
  messageId?: string,
  contextHeaders?: ClientRequestContextHeaders
): Promise<ListTraceResponse> {
  const query = new URLSearchParams();
  if (messageId) {
    query.set("message_id", messageId);
  }

  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiFetch<ListTraceResponse>(`/conversations/${encodeURIComponent(conversationId)}/trace${suffix}`, {
    method: "GET",
  }, contextHeaders);
}
