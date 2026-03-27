import { Agent, AgentId } from "@/types/chat";

export const AGENT_REGISTRY: Agent[] = [
  {
    id: "global",
    name: "Global Orchestrator",
    description: "Coordinates specialist agents and returns governed, business-ready outcomes",
    avatar: "GA",
    systemPrompt:
      "You orchestrate specialist departments, enforce enterprise guardrails, and respond with accountable actions.",
    capabilities: ["cross-department orchestration", "decision routing", "executive summaries", "risk triage"],
    enabled: true,
    placeholder: "Describe the business objective, incident, or request for cross-functional execution...",
    greeting:
      "Global Orchestrator online. I can answer directly or delegate to the right specialist with full traceability.",
    accentClass: "bg-sky-500/15 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300",
  },
  {
    id: "hr",
    name: "HR & Policy Agent",
    description: "Employee policy, onboarding, compliance communication, and workforce guidance",
    avatar: "HR",
    systemPrompt:
      "You provide policy-grounded HR guidance, including onboarding, workforce actions, and compliance communication.",
    capabilities: ["policy interpretation", "onboarding plans", "employee case support", "compliance messaging"],
    enabled: true,
    placeholder: "Ask about policies, onboarding workflows, employee requests, or HR compliance...",
    greeting:
      "HR & Policy Agent ready. Share the workforce scenario and I will provide policy-aligned guidance.",
    accentClass: "bg-rose-500/15 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300",
  },
  {
    id: "it",
    name: "IT Service Agent",
    description: "Troubleshooting, system access, incident triage, and technical service execution",
    avatar: "IT",
    systemPrompt:
      "You are the IT service desk specialist focused on diagnostics, root-cause hints, and clear remediation steps.",
    capabilities: ["incident triage", "access restoration", "service diagnostics", "change readiness"],
    enabled: true,
    placeholder: "Report incidents, access failures, system errors, or technical service requests...",
    greeting:
      "IT Service Agent active. Provide the incident context and I will structure a clear triage path.",
    accentClass: "bg-indigo-500/15 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300",
  },
  {
    id: "ops",
    name: "Operations Execution Agent",
    description: "Process design, SLA control, execution planning, and operating cadence support",
    avatar: "OP",
    systemPrompt:
      "You optimize operating workflows, define SLAs, and convert strategic goals into execution plans.",
    capabilities: ["SOP optimization", "SLA/KPI planning", "execution sequencing", "operational risk control"],
    enabled: true,
    placeholder: "Ask for execution plans, workflow design, SLA targets, or operating model improvements...",
    greeting:
      "Operations Execution Agent engaged. I can turn objectives into measurable workflows and owners.",
    accentClass: "bg-amber-500/15 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  },
  {
    id: "supply",
    name: "Supply Chain Agent",
    description: "Procurement, inventory risk, supplier coordination, and logistics visibility",
    avatar: "SC",
    systemPrompt:
      "You support sourcing, stock control, supplier management, and logistics decisions with practical constraints.",
    capabilities: ["procurement guidance", "inventory risk checks", "supplier escalation", "logistics planning"],
    enabled: true,
    placeholder: "Request procurement support, inventory analysis, supplier coordination, or logistics planning...",
    greeting:
      "Supply Chain Agent ready. Share demand, stock, or supplier context to get actionable recommendations.",
    accentClass: "bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
  },
  {
    id: "academy",
    name: "Academy & Training Agent",
    description: "Skill development, enablement plans, role-based training, and learning governance",
    avatar: "AC",
    systemPrompt:
      "You create role-based learning plans, enablement pathways, and measurable training outcomes.",
    capabilities: ["learning pathways", "role enablement", "assessment planning", "training governance"],
    enabled: true,
    placeholder: "Ask for training plans, skill-gap mapping, role enablement, or curriculum structure...",
    greeting:
      "Academy & Training Agent online. I can design practical learning plans tied to business outcomes.",
    accentClass: "bg-violet-500/15 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300",
  },
];

export const AGENT_MAP: Record<AgentId, Agent> = AGENT_REGISTRY.reduce((acc, agent) => {
  acc[agent.id] = agent;
  return acc;
}, {} as Record<AgentId, Agent>);

export function getAgentById(agentId: AgentId): Agent {
  return AGENT_MAP[agentId] ?? AGENT_MAP.global;
}

export function getEnabledAgents(): Agent[] {
  return AGENT_REGISTRY.filter((agent) => agent.enabled);
}

