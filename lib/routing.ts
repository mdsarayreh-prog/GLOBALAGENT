import { AgentId, RouteDecision } from "@/types/chat";

interface RouteInput {
  input: string;
  selectedAgentId: AgentId;
  autoRoute: boolean;
}

const AGENT_MENTION_MAP: Record<string, AgentId> = {
  global: "global",
  ga: "global",
  hr: "hr",
  it: "it",
  ops: "ops",
  operations: "ops",
  supply: "supply",
  sc: "supply",
  academy: "academy",
  training: "academy",
};


const AGENT_SOURCE_MAP: Record<AgentId, string[]> = {
  global: ["Enterprise Operations Playbook", "Approved Knowledge Base"],
  hr: ["HR Policy Repository", "Employee Lifecycle SOP"],
  it: ["IT Service Catalog", "Incident Response Runbook"],
  ops: ["Operations Governance Handbook", "Execution KPI Baselines"],
  supply: ["Procurement Policy Library", "Supply Risk Dashboard"],
  academy: ["Learning Governance Framework", "Role Enablement Matrix"],
};

function getLatency(): number {
  return Math.floor(65 + Math.random() * 140);
}

export function extractMentionedAgent(input: string): AgentId | null {
  const mentionRegex = /@([a-z]+)/gi;
  const matches = input.matchAll(mentionRegex);

  for (const match of matches) {
    const key = match[1]?.toLowerCase();
    if (key && AGENT_MENTION_MAP[key]) {
      return AGENT_MENTION_MAP[key];
    }
  }

  return null;
}

export function stripAgentMentions(input: string): string {
  return input.replace(/@[a-z]+/gi, "").replace(/\s{2,}/g, " ").trim();
}

export function resolveRoute({ input, selectedAgentId, autoRoute }: RouteInput): RouteDecision {
  if (selectedAgentId === "global") {
    return {
      selectedAgentId,
      resolvedAgentId: "hr",
      autoRouted: true,
      decisionType: "delegated",
      reason: "Global Orchestrator is configured to delegate all user requests to the connected HR agent.",
      latencyMs: getLatency(),
      confidence: 0.99,
      contextSignals: ["global-to-hr-delegation"],
      sourcesUsed: AGENT_SOURCE_MAP.hr,
      toolsCalled: ["global-route-policy", "policy-guardrails"],
      fallbackState: "none",
    };
  }

  const mentionedAgentId = extractMentionedAgent(input);
  if (mentionedAgentId) {
    return {
      selectedAgentId,
      resolvedAgentId: mentionedAgentId,
      autoRouted: mentionedAgentId !== selectedAgentId,
      decisionType: "mention",
      reason: `Explicit agent mention detected (@${mentionedAgentId}); honoring directed routing.`,
      latencyMs: getLatency(),
      confidence: 0.99,
      contextSignals: [`mention:${mentionedAgentId}`],
      sourcesUsed: AGENT_SOURCE_MAP[mentionedAgentId],
      toolsCalled: ["mention-parser", "policy-guardrails"],
      fallbackState: "none",
    };
  }

  if (!autoRoute) {
    return {
      selectedAgentId,
      resolvedAgentId: selectedAgentId,
      autoRouted: false,
      decisionType: "manual",
      reason: "Auto-route disabled; honoring manually selected agent.",
      latencyMs: getLatency(),
      confidence: 0.98,
      contextSignals: ["manual-selection"],
      sourcesUsed: AGENT_SOURCE_MAP[selectedAgentId],
      toolsCalled: ["manual-selection"],
      fallbackState: "none",
    };
  }

  return {
    selectedAgentId,
    resolvedAgentId: selectedAgentId,
    autoRouted: false,
    decisionType: "manual",
    reason: "Specialist locked by user selection while auto-route remains enabled.",
    latencyMs: getLatency(),
    confidence: 0.96,
    contextSignals: ["manual-specialist-lock"],
    sourcesUsed: AGENT_SOURCE_MAP[selectedAgentId],
    toolsCalled: ["specialist-lock-check"],
    fallbackState: "manual_lock",
  };
}

