import { writeAuditEvent } from "@/lib/server/audit";
import { executeAgentTurn } from "@/lib/server/agentRuntime";
import {
  createConversation,
  exportConversation,
  getContextState,
  getConversationById,
  insertAgentRun,
  insertMessage,
  insertTraceEvent,
  listConversations,
  listMessages,
  listRecentMessages,
  softDeleteConversation,
  listTraceEvents,
  touchConversationMessageTimestamp,
  updateConversation,
  upsertContextState,
} from "@/lib/server/conversationRepository";
import { serverConfig } from "@/lib/server/config";
import { buildPackedContext, updateContextState } from "@/lib/server/contextPacking";
import { applyRetentionPolicy } from "@/lib/server/retention";
import { resolveRoute } from "@/lib/routing";
import { createId, getThreadTitleFromText } from "@/lib/utils";
import { AgentId } from "@/types/chat";
import { AttachmentMetadata, ContentBlock } from "@/types/conversation";

export const VALID_AGENT_IDS: AgentId[] = ["global", "hr", "it", "ops", "supply", "academy"];

const MAX_MESSAGE_CHARS = 12000;
const MAX_TITLE_CHARS = 140;

interface Scope {
  userId: string;
  tenantId: string;
  accessToken?: string;
}

interface CreateConversationPayload {
  title?: string;
  defaultAgentId?: string;
  autoRouteEnabled?: boolean;
}

interface PatchConversationPayload {
  title?: string;
  autoRouteEnabled?: boolean;
  status?: "active" | "archived";
  defaultAgentId?: string;
  isPinned?: boolean;
}

interface PostMessagePayload {
  content: string;
  contentBlocks?: unknown;
  attachments?: unknown;
  parentMessageId?: string | null;
  selectedAgentId?: string;
  autoRouteEnabled?: boolean;
}

function normalizeAgentId(value: unknown, fallback: AgentId = "global"): AgentId {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  return VALID_AGENT_IDS.find((agentId) => agentId === normalized) ?? fallback;
}

function sanitizeTitle(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().replace(/\s+/g, " ");
  if (!normalized) {
    return null;
  }

  return normalized.slice(0, MAX_TITLE_CHARS);
}

function sanitizeMessageContent(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  const normalized = value.trim();
  if (!normalized) {
    return "";
  }

  return normalized.slice(0, MAX_MESSAGE_CHARS);
}

function sanitizeBlocks(value: unknown): ContentBlock[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item) => item && typeof item === "object")
    .map((item) => {
      const asRecord = item as Record<string, unknown>;
      return {
        type: typeof asRecord.type === "string" ? asRecord.type : "text",
        text: typeof asRecord.text === "string" ? asRecord.text : undefined,
        data: asRecord.data && typeof asRecord.data === "object" ? (asRecord.data as Record<string, unknown>) : undefined,
      };
    });
}

function sanitizeAttachments(value: unknown): AttachmentMetadata[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item) => item && typeof item === "object")
    .map((item) => {
      const asRecord = item as Record<string, unknown>;
      return {
        id: typeof asRecord.id === "string" ? asRecord.id : undefined,
        name: typeof asRecord.name === "string" ? asRecord.name.slice(0, 120) : "attachment",
        mimeType: typeof asRecord.mimeType === "string" ? asRecord.mimeType.slice(0, 120) : undefined,
        sizeBytes: typeof asRecord.sizeBytes === "number" ? asRecord.sizeBytes : undefined,
        sourceUrl: typeof asRecord.sourceUrl === "string" ? asRecord.sourceUrl.slice(0, 400) : undefined,
      };
    });
}

export function createConversationForScope(scope: Scope, payload: CreateConversationPayload) {
  applyRetentionPolicy();
  const nowIso = new Date().toISOString();
  const title = sanitizeTitle(payload.title) ?? "New chat";
  const defaultAgentId = normalizeAgentId(payload.defaultAgentId, "global");
  const autoRouteEnabled = payload.autoRouteEnabled ?? true;

  const conversation = createConversation({
    id: createId("conv"),
    title,
    ownerUserId: scope.userId,
    tenantId: scope.tenantId,
    defaultAgentId,
    autoRouteEnabled,
    nowIso,
  });

  writeAuditEvent({
    actorUserId: scope.userId,
    tenantId: scope.tenantId,
    action: "conversation.create",
    resourceType: "conversation",
    resourceId: conversation.id,
    metadata: {
      defaultAgentId,
      autoRouteEnabled,
    },
  });

  return conversation;
}

export function listConversationsForScope(scope: Scope, options: { limit: number; offset: number; search?: string }) {
  applyRetentionPolicy();
  const search = options.search?.trim().slice(0, 120);
  return listConversations(scope, {
    limit: options.limit,
    offset: options.offset,
    search,
    includeArchived: false,
  });
}

export function getConversationForScope(scope: Scope, conversationId: string) {
  return getConversationById(scope, conversationId);
}

export function patchConversationForScope(scope: Scope, conversationId: string, payload: PatchConversationPayload) {
  const nowIso = new Date().toISOString();
  const title = payload.title === undefined ? undefined : sanitizeTitle(payload.title);

  const updated = updateConversation(
    scope,
    conversationId,
    {
      title: title ?? undefined,
      autoRouteEnabled: payload.autoRouteEnabled,
      status: payload.status,
      defaultAgentId: payload.defaultAgentId ? normalizeAgentId(payload.defaultAgentId) : undefined,
      isPinned: payload.isPinned,
    },
    nowIso
  );

  if (updated) {
    writeAuditEvent({
      actorUserId: scope.userId,
      tenantId: scope.tenantId,
      action: "conversation.update",
      resourceType: "conversation",
      resourceId: conversationId,
      metadata: payload as Record<string, unknown>,
    });
  }

  return updated;
}

export function deleteConversationForScope(scope: Scope, conversationId: string) {
  const nowIso = new Date().toISOString();
  const deleted = softDeleteConversation(scope, conversationId, nowIso);

  if (deleted) {
    writeAuditEvent({
      actorUserId: scope.userId,
      tenantId: scope.tenantId,
      action: "conversation.delete",
      resourceType: "conversation",
      resourceId: conversationId,
    });
  }

  return deleted;
}

export function getMessagesForScope(scope: Scope, conversationId: string, options: { limit: number; offset: number }) {
  return listMessages(scope, conversationId, options);
}

export async function appendUserMessageForScope(scope: Scope, conversationId: string, payload: PostMessagePayload) {
  const conversation = getConversationById(scope, conversationId);
  if (!conversation) {
    return { error: "not_found" as const };
  }

  if (conversation.status === "archived") {
    return { error: "archived" as const };
  }

  const content = sanitizeMessageContent(payload.content);
  if (!content) {
    return { error: "invalid_message" as const };
  }

  const contentBlocks = sanitizeBlocks(payload.contentBlocks);
  const attachments = sanitizeAttachments(payload.attachments);
  const nowIso = new Date().toISOString();
  const selectedAgentId = normalizeAgentId(payload.selectedAgentId, conversation.defaultAgentId);
  const autoRouteEnabled =
    typeof payload.autoRouteEnabled === "boolean" ? payload.autoRouteEnabled : conversation.autoRouteEnabled;

  const userMessage = insertMessage({
    id: createId("msg"),
    conversationId,
    role: "user",
    contentText: content,
    contentBlocks,
    createdAt: nowIso,
    agentId: selectedAgentId,
    parentMessageId: payload.parentMessageId ?? null,
    attachments,
  });

  const routingDecision = resolveRoute({
    input: content,
    selectedAgentId,
    autoRoute: autoRouteEnabled,
  });

  const recentMessages = listRecentMessages(conversationId, serverConfig.contextRecentTurns * 2);
  const existingContext = getContextState(conversationId);
  const contextBuild = buildPackedContext({
    summary: existingContext?.summary ?? "",
    pinnedFacts: existingContext?.pinnedFacts ?? [],
    recentMessages,
    userPrompt: content,
  });

  console.info(
    `[context-builder] conversation=${conversationId} user=${scope.userId} recent=${contextBuild.recentMessagesUsed} summaryChars=${contextBuild.summaryChars} pinned=${contextBuild.pinnedFactsUsed} packedChars=${contextBuild.packedPrompt.length} truncated=${contextBuild.truncated}`
  );
  console.info(`[context-builder] packed-preview=${contextBuild.packedPrompt.slice(0, 500)}`);

  const runStartedAt = new Date().toISOString();
  const turnStart = Date.now();
  const agentTurn = await executeAgentTurn({
    resolvedAgentId: routingDecision.resolvedAgentId,
    userPrompt: content,
    packedContext: contextBuild.packedPrompt,
    accessToken: scope.accessToken,
  });
  const turnLatency = Date.now() - turnStart;
  const turnFinishedAt = new Date().toISOString();

  const assistantMessage = insertMessage({
    id: createId("msg"),
    conversationId,
    role: "assistant",
    contentText: agentTurn.content,
    contentBlocks: [],
    createdAt: turnFinishedAt,
    agentId: routingDecision.resolvedAgentId,
    parentMessageId: userMessage.id,
    attachments: [],
  });

  const contextState = updateContextState({
    current: existingContext,
    userMessage,
    assistantMessage,
  });
  upsertContextState(contextState);

  const shouldRetitle = conversation.title.toLowerCase() === "new chat";
  const nextTitle = shouldRetitle ? getThreadTitleFromText(content) : undefined;
  touchConversationMessageTimestamp(scope, conversationId, turnFinishedAt, nextTitle);

  const traceEvent = insertTraceEvent({
    id: createId("trace"),
    conversationId,
    messageId: userMessage.id,
    selectedAgentId,
    resolvedAgentId: routingDecision.resolvedAgentId,
    routingMode: routingDecision.autoRouted ? "auto" : "manual",
    routingReason: routingDecision.reason,
    confidence: routingDecision.confidence ?? null,
    sourcesUsed: routingDecision.sourcesUsed,
    toolCalls: routingDecision.toolsCalled,
    latencyMs: turnLatency,
    perAgentLatency: {
      [routingDecision.resolvedAgentId]: turnLatency,
    },
    errors: agentTurn.errors,
    fallbackState: agentTurn.fallbackState ?? (routingDecision.fallbackState === "none" ? null : routingDecision.fallbackState),
    createdAt: turnFinishedAt,
    contextSnapshot: {
      packedChars: contextBuild.packedPrompt.length,
      summaryChars: contextBuild.summaryChars,
      pinnedFactsUsed: contextBuild.pinnedFactsUsed,
      recentMessagesUsed: contextBuild.recentMessagesUsed,
      truncated: contextBuild.truncated,
      transport: agentTurn.transport,
    },
  });

  insertAgentRun({
    id: createId("run"),
    conversationId,
    messageId: userMessage.id,
    agentId: routingDecision.resolvedAgentId,
    status: agentTurn.errors.length > 0 ? "error" : "success",
    inputExcerpt: contextBuild.packedPrompt.slice(0, 600),
    outputExcerpt: agentTurn.content.slice(0, 600),
    startedAt: runStartedAt,
    completedAt: turnFinishedAt,
    latencyMs: turnLatency,
    errorText: agentTurn.errors[0] ?? null,
  });

  writeAuditEvent({
    actorUserId: scope.userId,
    tenantId: scope.tenantId,
    action: "message.append",
    resourceType: "conversation",
    resourceId: conversationId,
    metadata: {
      messageId: userMessage.id,
      selectedAgentId,
      resolvedAgentId: routingDecision.resolvedAgentId,
      routingMode: traceEvent.routingMode,
      latencyMs: turnLatency,
    },
  });

  const updatedConversation = getConversationById(scope, conversationId);
  return {
    conversation: updatedConversation,
    userMessage,
    assistantMessage,
    traceEvent,
    context: {
      summary: contextState.summary,
      pinnedFacts: contextState.pinnedFacts,
      contextBuild,
    },
  };
}

export function getTraceEventsForScope(scope: Scope, conversationId: string, messageId?: string | null, limit = 30) {
  return listTraceEvents(scope, conversationId, messageId, limit);
}

export function exportConversationForScope(scope: Scope, conversationId: string) {
  const data = exportConversation(scope, conversationId);
  if (!data) {
    return null;
  }

  writeAuditEvent({
    actorUserId: scope.userId,
    tenantId: scope.tenantId,
    action: "conversation.export",
    resourceType: "conversation",
    resourceId: conversationId,
  });

  return data;
}
