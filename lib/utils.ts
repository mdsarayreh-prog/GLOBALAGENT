import { AgentId, Message, Thread } from "@/types/chat";
import { getAgentById } from "@/lib/agents";

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function createId(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 9);
  return `${prefix}_${Date.now()}_${random}`;
}

export function getThreadTitleFromText(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) {
    return "Untitled chat";
  }

  if (trimmed.length <= 46) {
    return trimmed;
  }

  return `${trimmed.slice(0, 43)}...`;
}

export function buildAssistantReply(agentId: AgentId, prompt: string): string {
  const agent = getAgentById(agentId);
  const cleanPrompt = prompt.trim();
  const domainActionMap: Record<AgentId, string[]> = {
    global: [
      "Frame the request into cross-functional workstreams.",
      "Assign accountable owners and target dates.",
      "Escalate only high-risk blockers with business impact.",
    ],
    hr: [
      "Validate the policy clause and audience scope.",
      "Prepare a clear communication template for stakeholders.",
      "Track exception approvals and required compliance records.",
    ],
    it: [
      "Capture incident scope, affected services, and severity.",
      "Run first-line diagnostics and isolate likely failure points.",
      "Create a remediation checklist with rollback criteria.",
    ],
    ops: [
      "Map the current process and identify bottlenecks.",
      "Set SLA, KPI, and owner accountability for each stage.",
      "Publish an execution cadence with review checkpoints.",
    ],
    supply: [
      "Review inventory risk and lead-time constraints.",
      "Prioritize supplier actions by continuity impact.",
      "Define procurement and logistics fallback paths.",
    ],
    academy: [
      "Define role-specific skill gaps and required outcomes.",
      "Build a practical learning path with measurable checkpoints.",
      "Align enablement content to operating priorities.",
    ],
  };

  const actions = domainActionMap[agentId];

  return [
    `${agent.name} response`,
    `Business request reviewed: \"${cleanPrompt}\".`,
    "",
    "Recommended execution plan:",
    `1. ${actions[0]}`,
    `2. ${actions[1]}`,
    `3. ${actions[2]}`,
    "",
    "Reply with \"convert to checklist\" if you want this as a task-ready workflow.",
  ].join("\n");
}

export function createAssistantMessage(agentId: AgentId, content: string): Message {
  return {
    id: createId("msg"),
    role: "assistant",
    content,
    createdAt: new Date().toISOString(),
    agentId,
    status: "complete",
  };
}

export function createUserMessage(agentId: AgentId, content: string): Message {
  return {
    id: createId("msg"),
    role: "user",
    content,
    createdAt: new Date().toISOString(),
    agentId,
    status: "complete",
  };
}

export function createNewThread(agentId: AgentId): Thread {
  const agent = getAgentById(agentId);
  const now = new Date().toISOString();

  return {
    id: createId("thread"),
    title: `${agent.name} thread`,
    createdAt: now,
    agentId,
    messages: [
      {
        id: createId("msg"),
        role: "assistant",
        content: agent.greeting,
        createdAt: now,
        agentId,
        status: "complete",
      },
    ],
  };
}

export function buildUserThreads(): Thread[] {
  const thread = createNewThread("global");
  thread.id = "thread_user_global_1";
  thread.title = "Global agent workspace";

  return [thread];
}

export function buildMockThreads(): Thread[] {
  const threadA = createNewThread("global");
  const threadB = createNewThread("it");
  const threadC = createNewThread("hr");

  threadA.id = "thread_global_1";
  threadA.title = "Q3 execution governance plan";
  threadA.messages.push(
    {
      id: createId("msg"),
      role: "user",
      content: "Draft a cross-functional execution plan for Q3 operational priorities.",
      createdAt: new Date().toISOString(),
      agentId: "global",
      status: "complete",
    },
    {
      id: createId("msg"),
      role: "assistant",
      content:
        "Confirmed. I will structure workstreams, accountable owners, and milestone governance for Q3.",
      createdAt: new Date().toISOString(),
      agentId: "global",
      status: "complete",
    }
  );

  threadB.id = "thread_it_1";
  threadB.title = "Service incident: VPN access failure";
  threadB.messages.push(
    {
      id: createId("msg"),
      role: "user",
      content: "Remote operations teams cannot connect to VPN after the latest client update.",
      createdAt: new Date().toISOString(),
      agentId: "it",
      status: "complete",
    },
    {
      id: createId("msg"),
      role: "assistant",
      content:
        "Initial triage: validate auth service health, certificate trust chain, and client profile compatibility.",
      createdAt: new Date().toISOString(),
      agentId: "it",
      status: "complete",
    }
  );

  threadC.id = "thread_hr_1";
  threadC.title = "Policy-aligned onboarding checklist";

  return [threadA, threadB, threadC];
}

export function formatMessageTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}
