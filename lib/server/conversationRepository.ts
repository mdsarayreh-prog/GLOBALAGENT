import { getDb } from "@/lib/server/db";
import {
  ConversationContextState,
  ConversationListItem,
  ConversationMessage,
  ConversationRecord,
  PinnedFact,
  TraceEventRecord,
} from "@/types/conversation";
import { AgentId } from "@/types/chat";

interface Scope {
  userId: string;
  tenantId: string;
}

const VALID_AGENT_IDS: AgentId[] = ["global", "hr", "it", "ops", "supply", "academy"];

interface ListConversationOptions {
  limit: number;
  offset: number;
  search?: string;
  includeArchived?: boolean;
}

interface CreateConversationInput {
  id: string;
  title: string;
  ownerUserId: string;
  tenantId: string;
  defaultAgentId: string;
  autoRouteEnabled: boolean;
  nowIso: string;
  isPinned?: boolean;
}

interface UpdateConversationInput {
  title?: string;
  defaultAgentId?: string;
  autoRouteEnabled?: boolean;
  status?: "active" | "archived";
  isPinned?: boolean;
}

interface InsertMessageInput {
  id: string;
  conversationId: string;
  role: "user" | "assistant" | "system" | "tool";
  contentText: string;
  contentBlocks: unknown[];
  createdAt: string;
  agentId: string | null;
  parentMessageId?: string | null;
  attachments?: unknown[];
}

interface ListMessageOptions {
  limit: number;
  offset: number;
}

interface InsertTraceInput {
  id: string;
  conversationId: string;
  messageId: string;
  selectedAgentId: string;
  resolvedAgentId: string;
  routingMode: "manual" | "auto";
  routingReason: string;
  confidence: number | null;
  sourcesUsed: string[];
  toolCalls: string[];
  latencyMs: number;
  perAgentLatency: Record<string, number>;
  errors: string[];
  fallbackState: string | null;
  createdAt: string;
  contextSnapshot: Record<string, unknown>;
}

function parseJsonValue<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string" || !value.trim()) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function toConversationRecord(row: Record<string, unknown>): ConversationRecord {
  return {
    id: String(row.id),
    title: String(row.title),
    ownerUserId: String(row.owner_user_id),
    tenantId: String(row.tenant_id),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    defaultAgentId: String(row.default_agent_id) as ConversationRecord["defaultAgentId"],
    autoRouteEnabled: Number(row.auto_route_enabled) === 1,
    status: String(row.status) as ConversationRecord["status"],
    lastMessageAt: String(row.last_message_at),
    archivedAt: row.archived_at ? String(row.archived_at) : null,
    deletedAt: row.deleted_at ? String(row.deleted_at) : null,
    isPinned: Number(row.is_pinned) === 1,
  };
}

function toConversationListItem(row: Record<string, unknown>): ConversationListItem {
  return {
    ...toConversationRecord(row),
    previewText: typeof row.preview_text === "string" ? row.preview_text : "",
    messageCount: typeof row.message_count === "number" ? row.message_count : Number(row.message_count ?? 0),
  };
}

function toMessageRecord(row: Record<string, unknown>): ConversationMessage {
  const rawAgentId = row.agent_id ? String(row.agent_id) : null;
  const agentId = rawAgentId && VALID_AGENT_IDS.includes(rawAgentId as AgentId) ? (rawAgentId as AgentId) : null;

  return {
    id: String(row.id),
    conversationId: String(row.conversation_id),
    role: String(row.role) as ConversationMessage["role"],
    contentText: typeof row.content_text === "string" ? row.content_text : "",
    contentBlocks: parseJsonValue(row.content_blocks_json, []),
    createdAt: String(row.created_at),
    agentId,
    parentMessageId: row.parent_message_id ? String(row.parent_message_id) : null,
    attachments: parseJsonValue(row.attachments_json, []),
  };
}

function toTraceRecord(row: Record<string, unknown>): TraceEventRecord {
  return {
    id: String(row.id),
    conversationId: String(row.conversation_id),
    messageId: String(row.message_id),
    selectedAgentId: String(row.selected_agent_id) as TraceEventRecord["selectedAgentId"],
    resolvedAgentId: String(row.resolved_agent_id) as TraceEventRecord["resolvedAgentId"],
    routingMode: String(row.routing_mode) as TraceEventRecord["routingMode"],
    routingReason: String(row.routing_reason),
    confidence: row.confidence === null || row.confidence === undefined ? null : Number(row.confidence),
    sourcesUsed: parseJsonValue(row.sources_used_json, []),
    toolCalls: parseJsonValue(row.tool_calls_json, []),
    latency: {
      overallMs: Number(row.latency_ms ?? 0),
      perAgentMs: parseJsonValue(row.per_agent_latency_json, {}),
    },
    errors: parseJsonValue(row.errors_json, []),
    fallbackState: row.fallback_state ? String(row.fallback_state) : null,
    createdAt: String(row.created_at),
  };
}

function toContextState(row: Record<string, unknown>): ConversationContextState {
  return {
    conversationId: String(row.conversation_id),
    summary: typeof row.summary_text === "string" ? row.summary_text : "",
    pinnedFacts: parseJsonValue<PinnedFact[]>(row.pinned_facts_json, []),
    updatedAt: String(row.updated_at),
  };
}

function normalizeLikeSearch(search: string): string {
  const escaped = search.replace(/[%_]/g, "\\$&");
  return `%${escaped}%`;
}

export function createConversation(input: CreateConversationInput): ConversationRecord {
  const db = getDb();
  db.prepare(
    `
      INSERT INTO conversations (
        id,
        title,
        owner_user_id,
        tenant_id,
        created_at,
        updated_at,
        default_agent_id,
        auto_route_enabled,
        status,
        last_message_at,
        is_pinned
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
    `
  ).run(
    input.id,
    input.title,
    input.ownerUserId,
    input.tenantId,
    input.nowIso,
    input.nowIso,
    input.defaultAgentId,
    input.autoRouteEnabled ? 1 : 0,
    input.nowIso,
    input.isPinned ? 1 : 0
  );

  db.prepare(
    `
      INSERT INTO conversation_context (conversation_id, summary_text, pinned_facts_json, updated_at)
      VALUES (?, '', '[]', ?)
    `
  ).run(input.id, input.nowIso);

  const row = db.prepare("SELECT * FROM conversations WHERE id = ? LIMIT 1").get(input.id) as Record<string, unknown>;
  return toConversationRecord(row);
}

export function listConversations(scope: Scope, options: ListConversationOptions): { total: number; items: ConversationListItem[] } {
  const db = getDb();
  const search = options.search?.trim() ?? "";
  const includeArchived = options.includeArchived ?? true;

  const params: Array<string | number | null> = [scope.userId, scope.tenantId];
  let whereClause = "c.owner_user_id = ? AND c.tenant_id = ? AND c.deleted_at IS NULL";

  if (!includeArchived) {
    whereClause += " AND c.status = 'active'";
  }

  if (search) {
    const likeValue = normalizeLikeSearch(search);
    whereClause += `
      AND (
        c.title LIKE ? ESCAPE '\\'
        OR EXISTS (
          SELECT 1 FROM messages sm
          WHERE sm.conversation_id = c.id
            AND sm.content_text LIKE ? ESCAPE '\\'
        )
      )
    `;
    params.push(likeValue, likeValue);
  }

  const totalRow = db
    .prepare(
      `
        SELECT COUNT(*) AS count
        FROM conversations c
        WHERE ${whereClause}
      `
    )
    .get(...params) as { count: number };

  const rows = db
    .prepare(
      `
        SELECT
          c.*,
          COALESCE(
            (
              SELECT m.content_text
              FROM messages m
              WHERE m.conversation_id = c.id
              ORDER BY m.created_at DESC
              LIMIT 1
            ),
            ''
          ) AS preview_text,
          (
            SELECT COUNT(*)
            FROM messages m2
            WHERE m2.conversation_id = c.id
          ) AS message_count
        FROM conversations c
        WHERE ${whereClause}
        ORDER BY c.is_pinned DESC, c.last_message_at DESC
        LIMIT ? OFFSET ?
      `
    )
    .all(...params, options.limit, options.offset) as Record<string, unknown>[];

  return {
    total: Number(totalRow?.count ?? 0),
    items: rows.map(toConversationListItem),
  };
}

export function getConversationById(scope: Scope, conversationId: string): ConversationRecord | null {
  const db = getDb();
  const row = db
    .prepare(
      `
        SELECT *
        FROM conversations
        WHERE id = ?
          AND owner_user_id = ?
          AND tenant_id = ?
          AND deleted_at IS NULL
        LIMIT 1
      `
    )
    .get(conversationId, scope.userId, scope.tenantId) as Record<string, unknown> | undefined;

  if (!row) {
    return null;
  }

  return toConversationRecord(row);
}

export function updateConversation(scope: Scope, conversationId: string, input: UpdateConversationInput, nowIso: string) {
  const conversation = getConversationById(scope, conversationId);
  if (!conversation) {
    return null;
  }

  const nextTitle = input.title ?? conversation.title;
  const nextDefaultAgentId = input.defaultAgentId ?? conversation.defaultAgentId;
  const nextAutoRoute = typeof input.autoRouteEnabled === "boolean" ? input.autoRouteEnabled : conversation.autoRouteEnabled;
  const nextStatus = input.status ?? conversation.status;
  const nextPinned = typeof input.isPinned === "boolean" ? input.isPinned : conversation.isPinned;

  const nextArchivedAt = nextStatus === "archived" ? conversation.archivedAt ?? nowIso : null;

  const db = getDb();
  db.prepare(
    `
      UPDATE conversations
      SET
        title = ?,
        default_agent_id = ?,
        auto_route_enabled = ?,
        status = ?,
        archived_at = ?,
        is_pinned = ?,
        updated_at = ?
      WHERE id = ?
        AND owner_user_id = ?
        AND tenant_id = ?
    `
  ).run(
    nextTitle,
    nextDefaultAgentId,
    nextAutoRoute ? 1 : 0,
    nextStatus,
    nextArchivedAt,
    nextPinned ? 1 : 0,
    nowIso,
    conversationId,
    scope.userId,
    scope.tenantId
  );

  return getConversationById(scope, conversationId);
}

export function softDeleteConversation(scope: Scope, conversationId: string, nowIso: string): boolean {
  const db = getDb();
  const result = db
    .prepare(
      `
        UPDATE conversations
        SET
          status = 'archived',
          archived_at = COALESCE(archived_at, ?),
          deleted_at = ?,
          updated_at = ?
        WHERE id = ?
          AND owner_user_id = ?
          AND tenant_id = ?
          AND deleted_at IS NULL
      `
    )
    .run(nowIso, nowIso, nowIso, conversationId, scope.userId, scope.tenantId);

  return Number(result?.changes ?? 0) > 0;
}

export function insertMessage(input: InsertMessageInput): ConversationMessage {
  const db = getDb();
  db.prepare(
    `
      INSERT INTO messages (
        id,
        conversation_id,
        role,
        content_text,
        content_blocks_json,
        created_at,
        agent_id,
        parent_message_id,
        attachments_json
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
  ).run(
    input.id,
    input.conversationId,
    input.role,
    input.contentText,
    JSON.stringify(input.contentBlocks ?? []),
    input.createdAt,
    input.agentId,
    input.parentMessageId ?? null,
    JSON.stringify(input.attachments ?? [])
  );

  const row = db.prepare("SELECT * FROM messages WHERE id = ? LIMIT 1").get(input.id) as Record<string, unknown>;
  return toMessageRecord(row);
}

export function listMessages(scope: Scope, conversationId: string, options: ListMessageOptions) {
  const conversation = getConversationById(scope, conversationId);
  if (!conversation) {
    return null;
  }

  const db = getDb();
  const totalRow = db
    .prepare("SELECT COUNT(*) AS count FROM messages WHERE conversation_id = ?")
    .get(conversationId) as { count: number };

  const rows = db
    .prepare(
      `
        SELECT *
        FROM messages
        WHERE conversation_id = ?
        ORDER BY created_at ASC
        LIMIT ? OFFSET ?
      `
    )
    .all(conversationId, options.limit, options.offset) as Record<string, unknown>[];

  return {
    total: Number(totalRow?.count ?? 0),
    items: rows.map(toMessageRecord),
  };
}

export function listRecentMessages(conversationId: string, limit: number): ConversationMessage[] {
  const db = getDb();
  const rows = db
    .prepare(
      `
        SELECT *
        FROM messages
        WHERE conversation_id = ?
        ORDER BY created_at DESC
        LIMIT ?
      `
    )
    .all(conversationId, limit) as Record<string, unknown>[];

  return rows.map(toMessageRecord).reverse();
}

export function touchConversationMessageTimestamp(scope: Scope, conversationId: string, nowIso: string, nextTitle?: string) {
  const db = getDb();
  if (nextTitle) {
    db.prepare(
      `
        UPDATE conversations
        SET
          title = ?,
          last_message_at = ?,
          updated_at = ?
        WHERE id = ?
          AND owner_user_id = ?
          AND tenant_id = ?
      `
    ).run(nextTitle, nowIso, nowIso, conversationId, scope.userId, scope.tenantId);
    return;
  }

  db.prepare(
    `
      UPDATE conversations
      SET
        last_message_at = ?,
        updated_at = ?
      WHERE id = ?
        AND owner_user_id = ?
        AND tenant_id = ?
    `
  ).run(nowIso, nowIso, conversationId, scope.userId, scope.tenantId);
}

export function insertTraceEvent(input: InsertTraceInput): TraceEventRecord {
  const db = getDb();
  db.prepare(
    `
      INSERT INTO trace_events (
        id,
        conversation_id,
        message_id,
        selected_agent_id,
        resolved_agent_id,
        routing_mode,
        routing_reason,
        confidence,
        sources_used_json,
        tool_calls_json,
        latency_ms,
        per_agent_latency_json,
        errors_json,
        fallback_state,
        created_at,
        context_snapshot_json
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
  ).run(
    input.id,
    input.conversationId,
    input.messageId,
    input.selectedAgentId,
    input.resolvedAgentId,
    input.routingMode,
    input.routingReason,
    input.confidence,
    JSON.stringify(input.sourcesUsed),
    JSON.stringify(input.toolCalls),
    input.latencyMs,
    JSON.stringify(input.perAgentLatency),
    JSON.stringify(input.errors),
    input.fallbackState,
    input.createdAt,
    JSON.stringify(input.contextSnapshot)
  );

  const row = db.prepare("SELECT * FROM trace_events WHERE id = ? LIMIT 1").get(input.id) as Record<string, unknown>;
  return toTraceRecord(row);
}

export function listTraceEvents(scope: Scope, conversationId: string, messageId?: string | null, limit = 30) {
  const conversation = getConversationById(scope, conversationId);
  if (!conversation) {
    return null;
  }

  const db = getDb();

  if (messageId) {
    const rows = db
      .prepare(
        `
          SELECT *
          FROM trace_events
          WHERE conversation_id = ?
            AND message_id = ?
          ORDER BY created_at DESC
          LIMIT ?
        `
      )
      .all(conversationId, messageId, limit) as Record<string, unknown>[];

    return rows.map(toTraceRecord);
  }

  const rows = db
    .prepare(
      `
        SELECT *
        FROM trace_events
        WHERE conversation_id = ?
        ORDER BY created_at DESC
        LIMIT ?
      `
    )
    .all(conversationId, limit) as Record<string, unknown>[];

  return rows.map(toTraceRecord);
}

export function getContextState(conversationId: string): ConversationContextState | null {
  const db = getDb();
  const row = db
    .prepare(
      `
        SELECT *
        FROM conversation_context
        WHERE conversation_id = ?
        LIMIT 1
      `
    )
    .get(conversationId) as Record<string, unknown> | undefined;

  if (!row) {
    return null;
  }

  return toContextState(row);
}

export function upsertContextState(contextState: ConversationContextState) {
  const db = getDb();
  db.prepare(
    `
      INSERT INTO conversation_context (conversation_id, summary_text, pinned_facts_json, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(conversation_id) DO UPDATE SET
        summary_text = excluded.summary_text,
        pinned_facts_json = excluded.pinned_facts_json,
        updated_at = excluded.updated_at
    `
  ).run(
    contextState.conversationId,
    contextState.summary,
    JSON.stringify(contextState.pinnedFacts),
    contextState.updatedAt
  );
}

export function insertAgentRun(input: {
  id: string;
  conversationId: string;
  messageId: string;
  agentId: string;
  status: "success" | "error";
  inputExcerpt: string;
  outputExcerpt: string;
  startedAt: string;
  completedAt: string | null;
  latencyMs: number | null;
  errorText: string | null;
}) {
  const db = getDb();
  db.prepare(
    `
      INSERT INTO agent_runs (
        id,
        conversation_id,
        message_id,
        agent_id,
        status,
        input_excerpt,
        output_excerpt,
        started_at,
        completed_at,
        latency_ms,
        error_text
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
  ).run(
    input.id,
    input.conversationId,
    input.messageId,
    input.agentId,
    input.status,
    input.inputExcerpt,
    input.outputExcerpt,
    input.startedAt,
    input.completedAt,
    input.latencyMs,
    input.errorText
  );
}

export function exportConversation(scope: Scope, conversationId: string) {
  const conversation = getConversationById(scope, conversationId);
  if (!conversation) {
    return null;
  }

  const db = getDb();
  const messages = db
    .prepare("SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC")
    .all(conversationId) as Record<string, unknown>[];
  const traces = db
    .prepare("SELECT * FROM trace_events WHERE conversation_id = ? ORDER BY created_at ASC")
    .all(conversationId) as Record<string, unknown>[];
  const context = getContextState(conversationId);

  return {
    conversation,
    messages: messages.map(toMessageRecord),
    traceEvents: traces.map(toTraceRecord),
    context,
  };
}
