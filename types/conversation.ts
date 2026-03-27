import { AgentId } from "@/types/chat";

export type ConversationStatus = "active" | "archived";

export type StoredMessageRole = "user" | "assistant" | "system" | "tool";

export interface ContentBlock {
  type: string;
  text?: string;
  data?: Record<string, unknown>;
}

export interface AttachmentMetadata {
  id?: string;
  name: string;
  mimeType?: string;
  sizeBytes?: number;
  sourceUrl?: string;
}

export interface ConversationRecord {
  id: string;
  title: string;
  ownerUserId: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
  defaultAgentId: AgentId;
  autoRouteEnabled: boolean;
  status: ConversationStatus;
  lastMessageAt: string;
  archivedAt: string | null;
  deletedAt: string | null;
  isPinned: boolean;
}

export interface ConversationListItem extends ConversationRecord {
  previewText: string;
  messageCount: number;
}

export interface ConversationMessage {
  id: string;
  conversationId: string;
  role: StoredMessageRole;
  contentText: string;
  contentBlocks: ContentBlock[];
  createdAt: string;
  agentId: AgentId | null;
  parentMessageId: string | null;
  attachments: AttachmentMetadata[];
}

export interface LatencyBreakdown {
  overallMs: number;
  perAgentMs: Record<string, number>;
}

export interface TraceEventRecord {
  id: string;
  conversationId: string;
  messageId: string;
  selectedAgentId: AgentId;
  resolvedAgentId: AgentId;
  routingMode: "manual" | "auto";
  routingReason: string;
  confidence: number | null;
  sourcesUsed: string[];
  toolCalls: string[];
  latency: LatencyBreakdown;
  errors: string[];
  fallbackState: string | null;
  createdAt: string;
}

export interface PinnedFact {
  id: string;
  kind: "decision" | "identifier" | "preference";
  value: string;
  sourceMessageId: string;
  createdAt: string;
}

export interface ConversationContextState {
  conversationId: string;
  summary: string;
  pinnedFacts: PinnedFact[];
  updatedAt: string;
}

export interface ContextBuildLog {
  packedPrompt: string;
  recentMessagesUsed: number;
  summaryChars: number;
  pinnedFactsUsed: number;
  truncated: boolean;
}
