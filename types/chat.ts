export type AgentId = "global" | "hr" | "it" | "ops" | "supply" | "academy";

export type MessageRole = "user" | "assistant";

export type MessageStatus = "complete" | "streaming";

export type RouteMode = "manual" | "delegated" | "direct" | "mention";

export type FallbackState = "none" | "global_fallback" | "manual_lock" | "stream_error";

export interface Agent {
  id: AgentId;
  name: string;
  description: string;
  avatar: string;
  systemPrompt: string;
  capabilities: string[];
  enabled: boolean;
  placeholder: string;
  greeting: string;
  accentClass: string;
}

export interface MessageMetadata {
  routingLabel?: string;
  routingMode?: RouteMode;
  confidence?: number;
  sources?: string[];
  toolsCalled?: string[];
  approvedSources?: boolean;
  canRetry?: boolean;
  canReroute?: boolean;
  previousUserPrompt?: string;
  error?: string;
}

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: string;
  agentId: AgentId;
  status: MessageStatus;
  metadata?: MessageMetadata;
}

export interface Thread {
  id: string;
  title: string;
  createdAt: string;
  agentId: AgentId;
  messages: Message[];
}

export interface RouteDecision {
  selectedAgentId: AgentId;
  resolvedAgentId: AgentId;
  autoRouted: boolean;
  decisionType: RouteMode;
  reason: string;
  latencyMs: number;
  confidence: number;
  contextSignals: string[];
  sourcesUsed: string[];
  toolsCalled: string[];
  fallbackState: FallbackState;
  error?: string;
}

