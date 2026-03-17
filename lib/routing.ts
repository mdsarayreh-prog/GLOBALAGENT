import { AgentId, RouteDecision } from "@/types/chat";

interface RouteInput {
  input: string;
  selectedAgentId: AgentId;
  autoRoute: boolean;
}

interface RuleSignal {
  signal: string;
  pattern: RegExp;
}

interface Rule {
  agentId: Exclude<AgentId, "global">;
  reason: string;
  signals: RuleSignal[];
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

const ROUTING_RULES: Rule[] = [
  {
    agentId: "hr",
    reason: "Detected workforce policy and employee lifecycle context",
    signals: [
      { signal: "hiring", pattern: /hiring|recruit/i },
      { signal: "onboarding", pattern: /onboard/i },
      { signal: "policy", pattern: /policy|benefit|pto|leave/i },
      { signal: "employee case", pattern: /employee|performance|disciplinary/i },
    ],
  },
  {
    agentId: "it",
    reason: "Detected technical incident or access support context",
    signals: [
      { signal: "incident", pattern: /error|incident|bug|failure/i },
      { signal: "access", pattern: /login|password|access|permission/i },
      { signal: "infrastructure", pattern: /network|server|endpoint|vpn/i },
      { signal: "systems", pattern: /integration|api|deploy|application/i },
    ],
  },
  {
    agentId: "ops",
    reason: "Detected execution planning and process optimization context",
    signals: [
      { signal: "workflow", pattern: /workflow|process|handoff|cadence/i },
      { signal: "SLA/KPI", pattern: /sla|kpi|throughput|cycle time/i },
      { signal: "operations", pattern: /operations?|execution|playbook/i },
      { signal: "planning", pattern: /roadmap|milestone|owner/i },
    ],
  },
  {
    agentId: "supply",
    reason: "Detected procurement, inventory, or logistics context",
    signals: [
      { signal: "procurement", pattern: /procurement|purchase|rfq|vendor/i },
      { signal: "inventory", pattern: /inventory|stock|shortage|replenish/i },
      { signal: "supplier", pattern: /supplier|lead time|contract/i },
      { signal: "logistics", pattern: /shipping|warehouse|logistics|freight/i },
    ],
  },
  {
    agentId: "academy",
    reason: "Detected learning, enablement, or training context",
    signals: [
      { signal: "training", pattern: /training|enablement|curriculum/i },
      { signal: "learning", pattern: /learning|course|module/i },
      { signal: "upskilling", pattern: /upskill|certification|assessment/i },
      { signal: "role readiness", pattern: /readiness|role-based|academy/i },
    ],
  },
];

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

function clampConfidence(value: number): number {
  return Math.max(0.4, Math.min(0.99, Number(value.toFixed(2))));
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

  if (selectedAgentId !== "global") {
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

  let winningRule: Rule | null = null;
  let winningSignals: string[] = [];

  for (const rule of ROUTING_RULES) {
    const matchedSignals = rule.signals
      .filter((signalRule) => signalRule.pattern.test(input))
      .map((signalRule) => signalRule.signal);

    if (matchedSignals.length === 0) {
      continue;
    }

    if (!winningRule || matchedSignals.length > winningSignals.length) {
      winningRule = rule;
      winningSignals = matchedSignals;
    }
  }

  if (winningRule) {
    const confidence = clampConfidence(0.72 + winningSignals.length * 0.07);

    return {
      selectedAgentId,
      resolvedAgentId: winningRule.agentId,
      autoRouted: true,
      decisionType: "delegated",
      reason: `${winningRule.reason}; delegated by Global Orchestrator.`,
      latencyMs: getLatency(),
      confidence,
      contextSignals: winningSignals,
      sourcesUsed: AGENT_SOURCE_MAP[winningRule.agentId],
      toolsCalled: ["keyword-router", "confidence-scorer", "policy-guardrails"],
      fallbackState: "none",
    };
  }

  return {
    selectedAgentId,
    resolvedAgentId: "global",
    autoRouted: false,
    decisionType: "direct",
    reason: "No specialist rule matched confidently; Global Orchestrator answered directly.",
    latencyMs: getLatency(),
    confidence: 0.58,
    contextSignals: ["no-specialist-match"],
    sourcesUsed: AGENT_SOURCE_MAP.global,
    toolsCalled: ["keyword-router", "fallback-handler"],
    fallbackState: "global_fallback",
  };
}

